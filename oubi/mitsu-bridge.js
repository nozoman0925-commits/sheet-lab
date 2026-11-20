/*
 * 桜ミツ（見積）を業務管理の中で動かすための「つなぎ」
 *
 * ■ 保存先
 *   共有モード：業務管理と同じ保存先（Supabase の docs 表）に、種類を分けて入れる
 *     mitsu/master        … 品目マスタ・テンプレート・計算式・定型文・ルール・自社情報（ロゴ・印などの追加分）
 *     mitsu_docs/<書類ID> … 見積書1通ずつ（同時に別の見積を直しても、互いに上書きしない）
 *     mitsu_home/<社員ID> … その人のホームのウィジェット・お気に入りなど（人ごと）
 *   試用モード：この端末の localStorage（oubi.mitsu.v1）
 *
 * ■ 顧客・工事は業務管理の「工事」から作る（二重入力しない）
 *   工事＝工事1件。顧客＝工事の顧客名・電話番号が同じものを1人にまとめる。
 *   桜ミツの画面で顧客や工事を新しく作ると、業務管理に工事（問い合わせ）を1件作る。
 *   桜ミツだけの項目（採用した見積・工事メモ）は 工事.mitsu に入れる。
 *
 * ■ 見積の金額は工事へ戻す
 *   工事の「採用した見積」（無ければ、その工事でいちばん新しく直した見積）の明細・金額・日付・番号を
 *   工事の「見積と利益」に書き戻す。契約書・請求書・利益の計算は、今までどおり工事の値で動く。
 */
(function () {
  'use strict';
  var EE = window.EE, U = EE.ui;
  // 2つの使い方：
  //  host … 業務管理の中に桜ミツを入れる（業務管理版）。EE.host
  //  link … 桜ミツの中に業務管理を枠で入れる（桜ミツ版）。EE.link。画面の切り替えは桜ミツが自分で行う
  var LINK = !!window.OUBI_LINK_MODE;
  if (LINK) EE.link = true; else EE.host = true;
  var migrating = false;
  var O = null;                // 業務管理（window.OUBI）
  var LSK = 'oubi.mitsu.v1';
  var raw = { master: null, docs: {}, homes: {} };
  var got = { master: false, docs: false, homes: false };
  var last = { master: '', docs: {}, homes: {}, projects: {}, customers: {} };
  var started = false, ready = false, booted = false;
  var waiters = [];

  /* ---------- 保存先（共有モードは業務管理の db、試用モードは localStorage） ---------- */
  function local() { try { return JSON.parse(localStorage.getItem(LSK)) || {}; } catch (e) { return {}; } }
  function localPut(col, id, data) {
    var o = local(); o[col] = o[col] || {};
    if (data == null) delete o[col][id]; else o[col][id] = data;
    try { localStorage.setItem(LSK, JSON.stringify(o)); return true; } catch (e) { return false; }
  }
  var failT = 0;
  function failed(e) {
    if (Date.now() - failT < 8000) return; failT = Date.now();
    var perm = e && e.code === 'invalid_argument';
    O.toast(perm ? '見積を保存できませんでした（保存先の許可がありません）。管理者に知らせてください' : '電波が弱いため、見積をまだ送れていません。つながったら自動で送り直します');
  }
  var pending = {}, retryT = null;
  function put(col, id, data) {
    if (O.mode() !== 'db') { if (!localPut(col, id, data)) O.toast('この端末に保存できませんでした（容量不足の可能性）'); return; }
    var key = col + '/' + id; pending[key] = data;
    var ref = O.db().doc(key);
    (data == null ? ref.delete() : ref.set(data)).then(function () { if (pending[key] === data) delete pending[key]; })
      .catch(function (e) { failed(e); clearTimeout(retryT); retryT = setTimeout(resend, 15000); });
  }
  function resend() { Object.keys(pending).forEach(function (k) { var i = k.indexOf('/'); put(k.slice(0, i), k.slice(i + 1), pending[k]); }); }
  window.addEventListener('online', resend);

  function listen(col, cb) {
    if (O.mode() !== 'db') { var o = local()[col] || {}; setTimeout(function () { cb(Object.keys(o).map(function (id) { return { id: id, data: o[id] }; })); }, 0); return; }
    O.db().collection(col).onSnapshot(function (s) { cb(s.docs.map(function (x) { return { id: x.id, data: x.data() }; })); }, function () {});
  }

  /* ---------- 工事 → 顧客・工事 ---------- */
  function N(v) { var n = Number(String(v == null ? '' : v).replace(/[,，円\s]/g, '')); return isFinite(n) ? n : 0; }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function custName(c) { var L = c.lead || {}; return (L.company || L.customer || '').trim(); }
  function custKey(c) { var L = c.lead || {}; var n = custName(c).replace(/\s+/g, ''); return n ? n + '|' + digits(L.tel) : 'case|' + c.id; }
  function hue(id) { var h = 0; String(id).split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) % 360; }); return h; }

  function stageOf(c) {
    var r = c.result || {}, s = c.schedule || {}, t = EE.data.today(), x = O.calc(c);
    if (r.status !== 'won') return 'estimate';
    if (x.billed > 0 && x.unreceived <= 0) return 'paid';
    if (O.approved(c, 'invoice') || (c.invoice || {}).date) return 'invoice';
    if (s.end && s.end < t) return 'done';
    if (s.start && s.start <= t) return 'start';
    return 'order';
  }
  function paidOn(c) { var ps = (c.payments || []).map(function (p) { return p.date || ''; }).filter(Boolean).sort(); return ps[ps.length - 1] || ''; }

  function fromCases() {
    var custs = {}, cmap = {}, projects = [];
    O.cases().filter(function (c) { return !c.archived; }).slice().sort(function (a, b) { return String(a.createdAt || '').localeCompare(String(b.createdAt || '')); }).forEach(function (c) {
      var L = c.lead || {}, k = custKey(c), cu = custs[k];
      if (!cu) {
        cu = custs[k] = { id: 'cus_' + c.id, name: custName(c) || '（お客様の名前が未入力）', honorific: L.company ? '御中' : '様', kind: L.company ? 'corp' : 'person',
          contact: L.company ? (L.customer || '') : '', tel: L.tel || '', email: L.email || '', zip: '', address: L.addr || '', memo: L.note || '', fromCase: c.id };
      }
      cmap[c.id] = cu.id;
      var m = c.mitsu || {}, st = stageOf(c), r = c.result || {}, s = c.schedule || {};
      projects.push({
        id: c.id, customerId: cu.id, caseNo: c.no, name: (c.work || {}).title || ((cu.name || '') + ' 様 工事'),
        site: L.siteAddr || L.addr || '', note: (c.work || {}).summary || '', ownerId: O.canon(L.owner) || L.owner || '',
        category: ((c.work || {}).types || [])[0] || '', stage: st, lost: r.status === 'lost',
        orderedOn: r.wonDate || '', startedOn: st !== 'estimate' && st !== 'order' ? (s.start || '') : '',
        doneOn: ['done', 'invoice', 'paid'].indexOf(st) >= 0 ? (s.end || '') : '', invoicedOn: ['invoice', 'paid'].indexOf(st) >= 0 ? ((c.invoice || {}).date || '') : '',
        paidOn: st === 'paid' ? paidOn(c) : '', createdAt: c.createdAt || '',
        acceptedDocId: m.acceptedDocId || null, notes: m.notes || [], stageHistory: m.stageHistory || []
      });
    });
    return { customers: Object.keys(custs).map(function (k) { return custs[k]; }), projects: projects, cmap: cmap };
  }

  function people() {
    var list = O.people().map(function (p) { return { id: p.id, accountId: p.id, name: p.name, role: p.kind === 'login' ? '社員' : '職人・社員', hue: hue(p.id) }; });
    var me = O.me();
    if (me && me.id && !list.some(function (m) { return m.id === (O.canon(me.id) || me.id); })) list.unshift({ id: O.canon(me.id) || me.id, accountId: O.canon(me.id) || me.id, name: O.whoName(me.id), role: '社員', hue: hue(me.id) });
    if (!list.length) list.push({ id: 'local', name: 'あなた', role: '管理者', hue: 217 });
    return list;
  }
  function meId() { var me = O.me(); return (me && (O.canon(me.id) || me.id)) || 'local'; }

  /* ---------- 自社情報：名前・住所・電話などは業務管理の設定と同じものを使う ---------- */
  var CO_MAP = [['name', 'name'], ['rep', 'rep'], ['address', 'addr'], ['tel', 'tel'], ['invoiceRegNo', 'regNo'], ['bank', 'bank']];
  function mergeCompany(co) {
    var oc = (O.settings() || {}).company || {};
    CO_MAP.forEach(function (x) { if (oc[x[1]]) co[x[0]] = oc[x[1]]; });
    return co;
  }

  /* ---------- 読み込み（EE.data.load の代わり） ---------- */
  var MASTER_SKIP = { customers: 1, projects: 1, documents: 1, members: 1, currentMemberId: 1, homes: 1, ui: 1 };
  function masterOf(s) { var m = {}; Object.keys(s).forEach(function (k) { if (!MASTER_SKIP[k]) m[k] = s[k]; }); return m; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /** 桜ミツ版：前の桜ミツ（この端末の easy-estimate:v1）の見積・顧客・工事を引き継ぐ（最初の1回だけ。元のデータは消さない） */
  function oldState() {
    if (!LINK) return null;
    try { var raw0 = localStorage.getItem('easy-estimate:v1'); if (!raw0) return null; var o = JSON.parse(raw0); return o && (o.schema === 1 || o.schema === 2) ? EE.data.migrate(o) : null; }
    catch (e) { return null; }
  }
  function build() {
    var old = !raw.master ? oldState() : null;
    var s = raw.master ? clone(raw.master) : old ? clone(masterOf(old)) : EE.data.initialState();
    var fresh = !raw.master;
    s.sampleCleanup = 'done'; s.companyPreset = s.companyPreset || '';
    var fc = fromCases();
    s.customers = fc.customers; s.projects = fc.projects;
    s.documents = Object.keys(raw.docs).map(function (id) { return clone(raw.docs[id]); });
    s.members = people(); s.currentMemberId = meId();
    var h = raw.homes[s.currentMemberId] || {};
    s.homes = {}; if (h.home) s.homes[s.currentMemberId] = clone(h.home);
    s.ui = h.ui ? clone(h.ui) : {};
    if (old) {
      // 顧客・工事は工事として作り直す（保存のときに adoptNew が工事を作り、見積の宛先を付け替える）
      migrating = true;
      s.customers = s.customers.concat(old.customers || []);
      s.projects = s.projects.concat((old.projects || []).map(function (p) { var x = clone(p); x.oldStage = true; return x; }));
      s.documents = s.documents.concat(old.documents || []);
      var om = (old.members || []).filter(function (m) { return m.accountId === s.currentMemberId; })[0];
      if (om && old.homes && old.homes[om.id]) s.homes[s.currentMemberId] = clone(old.homes[om.id]);
      if (old.ui) s.ui = clone(old.ui);
    }
    s = EE.data.migrate(s);
    s.members = people(); s.currentMemberId = meId();
    mergeCompany(s.company);
    remember(s, fresh);
    return s;
  }
  // 「今の内容」を覚える（次の保存で、変わったものだけ送るため）
  function remember(s, freshMaster) {
    last.master = freshMaster ? '' : JSON.stringify(masterOf(s));
    last.docs = {}; s.documents.forEach(function (d) { last.docs[d.id] = JSON.stringify(d); });
    last.home = JSON.stringify({ home: (s.homes || {})[s.currentMemberId] || null, ui: s.ui || {} });
    last.projects = {}; s.projects.forEach(function (p) { last.projects[p.id] = projSig(p); });
    last.customers = {}; s.customers.forEach(function (c) { last.customers[c.id] = custSig(c); });
    last.company = JSON.stringify(coSig(s.company));
  }
  function projSig(p) { return JSON.stringify([p.name, p.site, p.ownerId, p.customerId, p.acceptedDocId || null, p.notes || [], p.stageHistory || [], p.note]); }
  function custSig(c) { return JSON.stringify([c.name, c.contact, c.tel, c.email, c.address, c.memo, c.kind]); }
  function coSig(co) { var o = {}; CO_MAP.forEach(function (x) { o[x[1]] = co[x[0]] || ''; }); return o; }

  /* ---------- 保存（EE.data.save の代わり） ---------- */
  var saveT = null, saving = false;
  function save(state) {
    if (!ready) return false;
    clearTimeout(saveT); saveT = setTimeout(function () { flush(state); }, 250);
    return true;
  }
  function flush(s) {
    if (saving) return; saving = true;
    try {
      // 1) 桜ミツで新しく作った顧客・工事 → 工事を作る（ID を工事のものに付け替える）
      adoptNew(s);
      // 2) 見積書（1通ずつ）
      var seen = {};
      s.documents.forEach(function (d) {
        seen[d.id] = 1; var j = JSON.stringify(d);
        if (last.docs[d.id] !== j) { last.docs[d.id] = j; put('mitsu_docs', d.id, JSON.parse(j)); raw.docs[d.id] = JSON.parse(j); }
      });
      Object.keys(last.docs).forEach(function (id) { if (!seen[id]) { delete last.docs[id]; delete raw.docs[id]; put('mitsu_docs', id, null); } });
      // 3) マスタ（品目・テンプレート・ルールなど）
      var m = masterOf(s), mj = JSON.stringify(m);
      if (mj !== last.master) { last.master = mj; raw.master = JSON.parse(mj); put('mitsu', 'master', raw.master); }
      // 4) その人のホーム・お気に入り
      var me = s.currentMemberId, hj = JSON.stringify({ home: (s.homes || {})[me] || null, ui: s.ui || {} });
      if (hj !== last.home) { last.home = hj; raw.homes[me] = JSON.parse(hj); put('mitsu_home', me, raw.homes[me]); }
      // 5) 自社情報の名前・住所・電話など → 業務管理の設定にも
      var cj = JSON.stringify(coSig(s.company));
      if (cj !== last.company) { last.company = cj; O.setCompany(JSON.parse(cj)); }
      // 6) 顧客・工事の変更 → 工事へ、見積の金額 → 工事の「見積と利益」へ
      writeCases(s);
    } finally { saving = false; }
  }

  function caseOf(id) { return O.cases().filter(function (c) { return c.id === id; })[0]; }

  function adoptNew(s) {
    var known = {}; O.cases().forEach(function (c) { known[c.id] = 1; });
    var remap = {};
    // 新しい顧客（工事が無い）→ 工事（問い合わせ）を1件作る
    s.customers.forEach(function (cu) {
      if (cu.fromCase && known[cu.fromCase]) return;
      if (/^cus_/.test(cu.id) && known[cu.id.slice(4)]) return;
      var c = O.makeCase({ customer: cu.kind === 'corp' ? (cu.contact || cu.name) : cu.name, company: cu.kind === 'corp' ? cu.name : '', tel: cu.tel || '', email: cu.email || '', addr: cu.address || '', note: cu.memo || '' });
      O.addLog(c, '見積（桜ミツ）から顧客を登録');
      remap[cu.id] = { cust: 'cus_' + c.id, caseId: c.id, used: false };
      cu.fromCase = c.id; known[c.id] = 1;
    });
    // 新しい工事（工事が無い）→ 工事を作る。顧客の工事がまだ工事に使われていなければ、それを工事にする
    s.projects.forEach(function (p) {
      if (known[p.id] && !remap[p.customerId]) return;
      if (known[p.id]) return;
      var rc = remap[p.customerId], c;
      if (rc && !rc.used) { c = caseOf(rc.caseId); rc.used = true; }
      else {
        var base = caseOf(String(p.customerId || '').replace(/^cus_/, '')) || caseOf((rc || {}).caseId), L = (base && base.lead) || {};
        c = O.makeCase({ customer: L.customer || '', company: L.company || '', tel: L.tel || '', email: L.email || '', addr: L.addr || '' });
        O.addLog(c, '見積（桜ミツ）から工事を登録');
      }
      c.work = c.work || {}; c.work.title = p.name || c.work.title || '';
      if (p.site) c.lead.siteAddr = p.site; if (p.ownerId) c.lead.owner = p.ownerId;
      c.mitsu = Object.assign({}, c.mitsu, { acceptedDocId: p.acceptedDocId || null, notes: p.notes || [] });
      if (p.oldStage) stageToCase(c, p, s);
      O.touch(c);
      remap['prj:' + p.id] = c.id;
    });
    // 書類の宛先・工事を、作った工事に付け替える
    var changed = false;
    s.documents.forEach(function (d) {
      if (d.status === 'issued' && !migrating) return;   // 確定した見積は付け替えない（前の桜ミツから引き継ぐときだけは、工事に結び付ける）
      if (remap['prj:' + d.projectId]) { d.projectId = remap['prj:' + d.projectId]; changed = true; }
      var rc = remap[d.customerId];
      if (rc) { d.customerId = rc.cust; if (!d.projectId || !known[d.projectId]) d.projectId = rc.caseId; changed = true; }
    });
    if (Object.keys(remap).length) {
      // 工事から作り直す（桜ミツの顧客・工事の一覧を、工事のものにそろえる）
      var fc = fromCases(); s.customers = fc.customers; s.projects = fc.projects;
      s.projects.forEach(function (p) { last.projects[p.id] = projSig(p); });
      s.customers.forEach(function (c) { last.customers[c.id] = custSig(c); });
      if (changed) s.documents.forEach(function (d) { var j = JSON.stringify(d); if (last.docs[d.id] !== j) { last.docs[d.id] = j; raw.docs[d.id] = JSON.parse(j); put('mitsu_docs', d.id, JSON.parse(j)); } });
      refreshSoon();
    }
  }

  /** 前の桜ミツの工事の段階（受注・着工・完了・請求・入金）を、工事の記録に写す */
  function stageToCase(c, p, s) {
    var si = EE.data.stageIndex(p.stage || 'estimate');
    if (p.note) c.work.summary = p.note;
    if (si >= 1) c.result = Object.assign({}, c.result, { status: 'won', wonDate: p.orderedOn || '' });
    c.schedule = c.schedule || { steps: [], prep: {}, changes: [] };
    if (p.startedOn) c.schedule.start = p.startedOn;
    if (p.doneOn) c.schedule.end = p.doneOn;
    if (p.invoicedOn) c.invoice = Object.assign({ files: [] }, c.invoice, { date: p.invoicedOn });
    if (si >= 5) {
      var acc = (s.documents || []).filter(function (d) { return d.id === p.acceptedDocId; })[0], amt = acc ? U.calcDoc(acc).total : 0;
      if (amt) c.payments = [{ kind: '残金', bill: amt, billDate: p.invoicedOn || '', date: p.paidOn || '', amount: amt }];
    }
    O.addLog(c, '前の桜ミツの工事から引き継ぎ（段階：' + ((EE.data.STAGES[si] || {}).label || '見積') + '）');
  }
  function writeCases(s) {
    var touched = {};
    // 顧客の変更 → その顧客の工事すべての顧客情報へ
    s.customers.forEach(function (cu) {
      var sig = custSig(cu); if (last.customers[cu.id] === sig) return; last.customers[cu.id] = sig;
      O.cases().forEach(function (c) {
        if ('cus_' + c.id !== cu.id && custKeyOfId(cu.id) !== custKey(c)) return;
        var L = c.lead = c.lead || {};
        if (cu.kind === 'corp') { L.company = cu.name; L.customer = cu.contact || L.customer || cu.name; } else { L.customer = cu.name; }
        L.tel = cu.tel || ''; L.email = cu.email || ''; L.addr = cu.address || ''; if (cu.memo != null) L.note = cu.memo;
        touched[c.id] = c;
      });
    });
    // 工事の変更 → 工事名・現場住所・担当・桜ミツの項目
    s.projects.forEach(function (p) {
      var sig = projSig(p); if (last.projects[p.id] === sig) return; last.projects[p.id] = sig;
      var c = caseOf(p.id); if (!c) return;
      c.work = c.work || {}; c.lead = c.lead || {};
      if (p.name) c.work.title = p.name;
      c.lead.siteAddr = p.site || ''; if (p.ownerId) c.lead.owner = p.ownerId;
      if (p.note != null) c.work.summary = p.note;
      c.mitsu = Object.assign({}, c.mitsu, { acceptedDocId: p.acceptedDocId || null, notes: p.notes || [], stageHistory: p.stageHistory || [] });
      touched[c.id] = c;
    });
    // 見積の金額 → 工事の「見積と利益」
    var byCase = {};
    s.documents.forEach(function (d) { if (d.projectId && d.type !== 'invoice') (byCase[d.projectId] = byCase[d.projectId] || []).push(d); });
    Object.keys(byCase).forEach(function (cid) {
      var c = caseOf(cid); if (!c) return;
      var p = s.projects.filter(function (x) { return x.id === cid; })[0] || {};
      var d = mainDoc(byCase[cid], p.acceptedDocId);
      if (d && quoteFrom(c, d)) touched[c.id] = c;
    });
    Object.keys(touched).forEach(function (id) { O.touch(touched[id]); });
    if (Object.keys(touched).length) O.softRender();
  }
  function custKeyOfId(cid) { var c = caseOf(String(cid).replace(/^cus_/, '')); return c ? custKey(c) : ''; }

  /** その工事の「代表の見積」：採用した見積 → 無ければ、いちばん新しく直した見積（修正前の古い版は除く） */
  function mainDoc(list, acceptedId) {
    var acc = acceptedId && list.filter(function (d) { return d.id === acceptedId; })[0];
    if (acc) return acc;
    var parents = {}; list.forEach(function (d) { if (d.parentId) parents[d.parentId] = 1; });
    return list.filter(function (d) { return !parents[d.id]; }).sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); })[0];
  }

  /* 原価の種類（桜ミツ）→ 収支書の原価の欄（業務管理） */
  var COST_TO_PLAN = { material: 'material', labor: 'labor', subcontract: 'outsource', expense: 'otherExp', other: 'otherExp' };

  /** 見積書 → 工事の「見積と利益」。変わったら true */
  function quoteFrom(c, d) {
    var r = U.calcDoc(d), q = c.quote = c.quote || { files: [] };
    var before = JSON.stringify([q.items, q.amount, q.date, q.validUntil, q.no, q.who, q.note, q.mitsuDocId, q.mitsuIssued, c.plan]);
    var items = d.lines.map(function (ln, i) {
      var amt = (r.lines[i] || {}).amount || 0, qty = Number(ln.qty) || 0, price = Number(ln.unitPrice) || 0;
      var it = { name: [ln.name, ln.spec].filter(Boolean).join(' '), qty: qty, unit: ln.unit || '', price: price };
      if (Math.round(qty * price) !== amt) { it.qty = 1; it.unit = '式'; it.price = amt; it.name += '（' + qty + (ln.unit || '') + '）'; }
      if (ln.note) it.note = ln.note;
      return it;
    });
    r.adjustments.forEach(function (a) { if (a.amount) items.push({ name: a.label || ({ overhead: '諸経費', discount: '値引き', roundoff: '端数調整' }[a.type] || '調整'), qty: 1, unit: '式', price: a.amount }); });
    q.items = items; q.amount = r.subtotal;
    q.date = d.issueDate || q.date || ''; q.validUntil = d.validUntil || ''; q.no = d.no || q.no || '';
    if (d.ownerId) q.who = d.ownerId;
    q.note = d.notes || ''; q.mitsuDocId = d.id; q.mitsuIssued = d.status === 'issued' ? d.no : '';
    q.madeBy = q.madeBy || d.ownerId || ''; q.madeAt = q.madeAt || d.createdAt || '';
    // 収支書：見積の金額と、明細の原価（種類ごと）を入れる。値引きは「値引予定額」へ
    var pl = c.plan = c.plan || {}, cost = {};
    d.lines.forEach(function (ln, i) { var k = COST_TO_PLAN[ln.costType] || 'otherExp'; cost[k] = (cost[k] || 0) + ((r.lines[i] || {}).cost || 0); });
    var disc = 0, oh = 0; r.adjustments.forEach(function (a) { if (a.amount < 0) disc -= a.amount; else oh += a.amount; });
    pl.estimate = r.subtotal + disc; pl.discount = disc || '';
    // 原価は、見積に原価が入っているときだけ入れる（入っていなければ、収支書に手で入れた原価をそのまま残す）
    if (r.costTotal > 0) ['material', 'labor', 'outsource', 'otherExp'].forEach(function (k) { pl[k] = cost[k] || ''; });
    pl.fromMitsu = d.id;
    var after = JSON.stringify([q.items, q.amount, q.date, q.validUntil, q.no, q.who, q.note, q.mitsuDocId, q.mitsuIssued, c.plan]);
    if (before !== after) { O.addLog(c, '見積を更新（' + (d.no || '下書き') + '・' + U.yen(r.subtotal) + '）'); return true; }
    return false;
  }

  /* ---------- 他の人の変更を受け取る ---------- */
  var refreshT = null;
  function refreshSoon() {
    clearTimeout(refreshT);
    refreshT = setTimeout(function () {
      if (!booted) return;
      var a = document.activeElement;
      if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.closest('.ee')) { refreshSoon(); return; }
      if (U.topModal && U.topModal()) { refreshSoon(); return; }
      merge();
      if (LINK) { if (!editing() && !/^#\/o\//.test(location.hash)) EE.app.rerender(); }
      else if (active()) { if (!editing()) EE.app.rerender(); }
      else if (homeMounted()) mountHome();
    }, 400);
  }
  function editing() { return /^#\/(edit|new\/)/.test(location.hash) && EE.views.editor && EE.views.editor.isDirty && EE.views.editor.isDirty(); }
  // 受け取った内容を今の状態に入れる（見積は1通ずつ。編集中の見積は手元を優先）
  function merge() {
    var s = EE.S; if (!s) return;
    var openId = (/^#\/edit\/([^/?]+)/.exec(location.hash) || [])[1];
    var map = {}; s.documents.forEach(function (d) { map[d.id] = d; });
    var docs = [];
    Object.keys(raw.docs).forEach(function (id) {
      if (id === openId && editing()) { if (map[id]) docs.push(map[id]); return; }
      var d = clone(raw.docs[id]); docs.push(d); last.docs[id] = JSON.stringify(d);
    });
    s.documents = docs;
    if (raw.master) {
      var keep = { customers: s.customers, projects: s.projects, documents: s.documents, members: s.members, currentMemberId: s.currentMemberId, homes: s.homes, ui: s.ui };
      var m = clone(raw.master);
      Object.keys(s).forEach(function (k) { if (!MASTER_SKIP[k]) delete s[k]; });
      Object.assign(s, m, keep); last.master = JSON.stringify(masterOf(s));
    }
    var fc = fromCases(); s.customers = fc.customers; s.projects = fc.projects;
    s.projects.forEach(function (p) { last.projects[p.id] = projSig(p); });
    s.customers.forEach(function (c) { last.customers[c.id] = custSig(c); });
    s.members = people(); s.currentMemberId = meId();
    mergeCompany(s.company); last.company = JSON.stringify(coSig(s.company));
  }

  /* ---------- 画面の切り替え（#/… は桜ミツ、それ以外は業務管理） ---------- */
  var host, view;
  function isEE(h) { return /^#\/./.test(h || '') && !/^#\/(home)?$/.test(h); }
  function active() { return host && !host.hidden; }
  function showHost(on) {
    if (!host) return;
    host.hidden = !on;
    document.getElementById('main').hidden = on;
    document.body.classList.toggle('ee-on', on);
    O.markTab(on ? 'mitsu' : null);
  }
  // 桜ミツの画面のうち、業務管理の画面で置き換えるもの
  function redirect(h) {
    var m;
    if ((m = /^#\/site\/([^/?]+)(?:\/([a-z]+))?/.exec(h))) { var tab = m[2]; leaveTo(function () { O.openCase(m[1], tab === 'estimate' || tab === 'cost' || tab === 'docs' ? 'quote' : tab === 'photos' ? 'invoice' : undefined); }); return true; }
    if (/^#\/schedule/.test(h)) { leaveTo(function () { O.setTab('cal'); }); return true; }
    if (/^#\/(home)?$/.test(h)) { leaveTo(function () { O.setTab('home'); }); return true; }
    if (/^#\/settings\/(members|data)/.test(h)) { location.replace('#/settings/items'); return true; }
    return false;
  }
  function route() {
    var h = location.hash;
    if (!ready) return;
    if (!isEE(h)) { if (active()) showHost(false); return; }
    if (redirect(h)) return;
    var was = active();
    if (!was) { showHost(true); window.scrollTo(0, 0); }
    EE.app.route(!was);
    subNav();
  }
  var SUB = [['#/docs', '見積の一覧', /^#\/(docs|edit)/], ['#/new', '新しい見積', /^#\/new/], ['#/clients', '顧客', /^#\/clients/], ['#/sites', '工事の流れ', /^#\/sites/],
    ['#/finance', '粗利・会計', /^#\/finance/], ['#/analysis', '分析', /^#\/analysis/], ['#/settings/items', '品目・見積の設定', /^#\/(settings|folder)/]];
  function subNav() {
    var el = document.getElementById('ee-sub'); if (!el) return;
    var h = location.hash;
    el.innerHTML = SUB.map(function (x) { var on = x[2].test(h); return '<a href="' + x[0] + '"' + (on ? ' aria-current="page" class="on"' : '') + '>' + x[1] + '</a>'; }).join('');
  }
  /** 業務管理の画面へ移る前に呼ぶ（見積を編集中で未保存なら確かめる） */
  async function leaveTo(cb) {
    if (active() && editing()) {
      var ok = await U.confirmBox('保存していない変更があります。破棄して移動しますか？', '破棄して移動', { danger: true });
      if (!ok) { if (!isEE(location.hash)) history.replaceState(null, '', EE.app.lastHash() || '#/docs'); return; }
      EE.app.discardCurrent();
    }
    if (isEE(location.hash) || /^#\//.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    showHost(false);
    cb && cb();
  }

  /* ---------- ホームのウィジェット（業務管理のホームの下に入れる） ---------- */
  function homeMounted() { var el = document.getElementById('ee-widgets'); return !!(el && el.isConnected); }
  function mountHome() {
    var el = document.getElementById('ee-widgets'); if (!el || !ready || !EE.S) return;
    try {
      var v = EE.views.control.render();
      el.innerHTML = '<div class="ee-home-h"><h2>ウィジェット</h2><div class="ee-home-actions">' + (v.actions || '') + '</div></div><div class="view-inner">' + v.html + '</div>';
      var acts = el.querySelector('.ee-home-actions');
      if (v.mount) v.mount(el.querySelector('.view-inner'), acts);
      if (EE.a11y) EE.a11y.enhance(el);
    } catch (e) { el.innerHTML = ''; console.error(e); }
  }

  /* ---------- 起動 ---------- */
  function whenReady(fn) { if (ready) fn(); else waiters.push(fn); }
  function check() {
    if (ready || !got.master || !got.docs || !got.homes || !O.booted()) return;
    ready = true;
    EE.S = build();
    if (!raw.master) { save(EE.S); }
    if (LINK) { booted = true; waiters.splice(0).forEach(function (f) { f(); }); return; }   // 桜ミツ版：起動は桜ミツの側（whenReady で待つ）
    EE.app.boot({ host: true });
    // 業務管理のホームに入れたウィジェットは、描き直しのときもそこへ
    var rer = EE.app.rerender;
    EE.app.rerender = function () { if (active()) rer(); else if (homeMounted()) mountHome(); };
    booted = true;
    waiters.splice(0).forEach(function (f) { f(); });
    route();
    if (homeMounted()) mountHome();
  }
  function start(o) {
    if (started) return; started = true;
    O = o || window.OUBI;
    host = document.getElementById('ee-host');
    EE.data.load = function () { return EE.S || build(); };
    EE.data.save = save;
    EE.data.isStale = function () { return false; };
    // 見積番号は、今ある見積の番号の続きから（2人が同時に作っても、なるべく重ならないように）
    var nextNumber = EE.data.nextNumber;
    EE.data.nextNumber = function (state, dateStr) {
      var ym = (dateStr || EE.data.today()).slice(0, 7).replace('-', ''), pre = (state.settings.numberPrefix || 'EST') + '-' + ym + '-', max = 0;
      (state.documents || []).forEach(function (d) { if (d.no && d.no.indexOf(pre) === 0) { var n = parseInt(d.no.slice(pre.length), 10); if (n > max) max = n; } });
      state.seq.estimate[ym] = Math.max(state.seq.estimate[ym] || 0, max);
      return nextNumber(state, dateStr);
    };
    listen('mitsu', function (rows) { var m = rows.filter(function (r) { return r.id === 'master'; })[0]; raw.master = m ? m.data : raw.master; got.master = true; if (ready && m) refreshSoon(); check(); });
    listen('mitsu_docs', function (rows) { var d = {}; rows.forEach(function (r) { d[r.id] = r.data; }); raw.docs = d; got.docs = true; if (ready) refreshSoon(); check(); });
    listen('mitsu_home', function (rows) { rows.forEach(function (r) { raw.homes[r.id] = r.data; }); got.homes = true; check(); });
    if (!LINK) window.addEventListener('hashchange', route);
  }

  window.OUBI_HOST = {
    start: start,
    /** 業務管理の工事が変わったとき（他の人の変更を含む） */
    casesChanged: function () { if (ready) refreshSoon(); else check(); },
    booted: function () { check(); },
    whenReady: whenReady,
    active: active,
    leaveTo: leaveTo,
    mountHome: function () { whenReady(mountHome); },
    isEE: isEE,
    /** 工事の「見積と利益」から：この工事の見積の一覧 */
    docsOf: function (caseId) { return ready ? EE.S.documents.filter(function (d) { return d.projectId === caseId; }) : []; },
    calc: function (d) { return U.calcDoc(d); },
    ready: function () { return ready; },
    /** 工事から新しい見積を作る（今の明細があれば、それを読み込む） */
    newForCase: function (caseId) {
      whenReady(function () {
        var c = caseOf(caseId); if (!c) return;
        var s = EE.S, p = s.projects.filter(function (x) { return x.id === caseId; })[0];
        var d = EE.data.newEstimate(s, { customerId: p ? p.customerId : '', projectId: caseId, title: (c.work || {}).title || '', category: p ? p.category : '', ownerId: meId() });
        var q = c.quote || {};
        (q.items || []).forEach(function (it) {
          if (!it || !(it.name || N(it.price))) return;
          var hit = s.items.filter(function (x) { return x.name === it.name; })[0];
          var ln = hit ? EE.data.lineFromItem(hit, N(it.qty) || 1) : { lineId: EE.data.uid('ln'), itemId: null, qty: N(it.qty) || 1, unitPrice: N(it.price), unitCost: 0, name: it.name || '', spec: '', unit: it.unit || '式', kind: 'material', taxCategory: 'std10', costType: 'other', priceDate: EE.data.today() };
          ln.unitPrice = N(it.price); if (it.note) ln.note = it.note;
          d.lines.push(ln);
        });
        if (q.note) d.notes = q.note;
        s.documents.push(d); U.commit();
        location.hash = '#/edit/' + d.id;
      });
    },
    open: function (hash) { whenReady(function () { if (location.hash === hash) route(); else location.hash = hash; }); }
  };
  if (window.OUBI_WANT && !LINK) start();
})();
