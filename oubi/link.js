/*
 * 桜ミツ版：桜ミツの中に業務管理（営業・工事・カレンダー・ホワイトボード）を入れる
 *   桜ミツの画面の構成（左のメニュー・上の帯・ウィジェットのホーム）はそのまま。
 *   業務管理の画面は oubi.html を枠（iframe）で読み込み、#/o/<画面> のときだけ見せる。
 *   記録はこの端末の中だけ（oubi.html の local-db.js）。見積とのつなぎは mitsu-bridge.js（link モード）。
 * 読む順：桜ミツのプログラム → このファイル → mitsu-bridge.js → 起動
 */
(function (root) {
  'use strict';
  root.OUBI_LINK_MODE = true;
  var EE = root.EE, U = EE.ui;
  var frame = null;
  // 枠の中が万一よそのページに移っていても止まらない（読めないときは null）
  function W() { try { var w = frame && frame.contentWindow; return w && w.location.href && w; } catch (e) { return null; } }
  function O() { try { var w = W(); return w && w.OUBI; } catch (e) { return null; } }

  // 業務管理の画面ごとの見出し・メニューの位置
  var PAGES = {
    sales: ['営業', '訪問の記録・再訪問・ランキング', 'sales'], list: ['工事の一覧', '9工程・進み具合', 'sites'], case: ['工事', '問い合わせから入金・支払いまで', 'sites'],
    new: ['新しい工事', '問い合わせを登録', 'sites'], quick: ['新しい工事', '問い合わせを登録', 'sites'], docs: ['工事の書類', '見積書・契約書・請求書', 'sites'],
    cal: ['カレンダー', '工事・現地調査・再訪問・予定', 'schedule'], wb: ['あしたの予定', 'ホワイトボード', 'schedule'], board: ['タイムライン', '社内の投稿', 'schedule'],
    dash: ['工事の進み・入金', '進行中・要対応・入金待ち', 'finance'], person: ['担当者の数字', '', 'finance'],
    settings: ['目標の粗利率', '工事の利益の判定に使う', 'settings'], staff: ['社員', '名前・電話・写真', 'settings'], profile: ['社員', 'プロフィール', 'settings'],
    setup: ['社員', '登録', 'settings'], help: ['使い方', 'よくある質問', 'settings']
  };
  function page(tab) { return PAGES[tab] || ['業務管理', '', 'home']; }
  var SEC = { estimate: 'quote', cost: 'quote', docs: 'quote', photos: 'invoice', notes: 'log' };

  function whenFrame(fn, tries) {
    var o = O();
    if (o && o.booted && o.booted()) { fn(o); return; }
    if ((tries || 0) > 150) { U && EE.fx.toast('業務管理の画面を読み込めませんでした。再読み込みしてください', { warn: true, ms: 5000 }); return; }
    setTimeout(function () { whenFrame(fn, (tries || 0) + 1); }, 100);
  }
  var lastSent = '', goAt = 0, arrived = false, rvT = null;   // arrived：指定した画面が一度描かれたか
  function go(parts) {
    var tab = parts[0] || 'list'; goAt = Date.now();
    whenFrame(function (o) {
      lastSent = tab; goAt = Date.now();
      if (tab === 'case' && parts[1]) o.openCase(parts[1], SEC[parts[2]] || parts[2] || undefined);
      else if (tab === 'new') o.newQuick();
      else if (tab === 'sales') o.go(parts[1] ? 'sales:' + parts[1] : 'sales');
      else o.setTab(tab);
    });
  }

  root.OUBI_LINK = {
    /** app.js の parse() から：#/o/<画面>/... */
    route: function (parts) {
      goAt = Date.now(); lastSent = parts[0] || 'list'; arrived = false;   // 切り替えを始めた時から、業務管理の「ホームを描いた」の知らせは無視する
      var pg = page(parts[0] || 'list');
      return { nav: pg[2], view: function () { return { title: pg[0], crumb: pg[1], html: '', oubi: true, mount: function () { go(parts); } }; } };
    },
    /** 業務管理の画面が描かれるたびに（embed.js から） */
    onTab: function (tab, cur) {
      if (!/^#\/o\//.test(location.hash)) return;            // 桜ミツの画面にいるときは、うしろの業務管理の動きで画面を変えない
      // 開いた直後に届く「ホームを描いた」は、業務管理の最初の画面なので無視する（こちらから画面を指定している途中）
      if (tab === lastSent || (lastSent === 'case' && tab === 'case')) arrived = true;
      if (tab === 'home' && lastSent !== 'home' && !arrived && Date.now() - goAt < 3000) return;
      if (tab === 'home') { document.body.classList.remove('ob-on'); location.hash = '#/home'; return; }   // 業務管理の「ホーム」は桜ミツのホーム（ウィジェット）。枠はすぐ隠す
      var h = tab === 'case' && cur && cur.caseId ? '#/o/case/' + cur.caseId : '#/o/' + tab;
      if (h.split('/').slice(0, 3).join('/') !== location.hash.split('/').slice(0, 3).join('/') || (tab === 'case' && h !== location.hash)) {
        EE.app.replaceRoute(h);
        var pg = page(tab);
        var t = document.getElementById('title'), c = document.getElementById('crumb');
        if (t) t.textContent = pg[0]; if (c) c.textContent = pg[1];
        document.title = pg[0] + ' — 桜ミツ';
        EE.app.setNav(pg[2]);
      }
    },
    frame: function () { return frame; },
    /** 起動：業務管理の画面が読み込まれ、見積とのつなぎが整ったら cb（ログインはない） */
    start: function (cb) {
      function begin() {
        var w = W();
        if (!w || !w.OUBI_LOCAL_ME || !w.OUBI) { setTimeout(begin, 60); return; }
        root.OUBI_HOST.start(w.OUBI);
        root.OUBI_HOST.whenReady(function () {
          cb();
          // 期限が近い見積・入金待ちを、営業の再訪問へ（起動のときと、記録が変わったとき）
          setTimeout(syncRevisits, 1500);
          U.onCommit(function () { clearTimeout(rvT); rvT = setTimeout(syncRevisits, 1500); });
        });
      }
      begin();
    },
    /** 自分（この端末の使う人） */
    me: function () { var w = W(); return w && w.OUBI_LOCAL_ME ? w.OUBI_LOCAL_ME.get() : { id: '', name: '' }; },
    setMyName: function (name) {
      var w = W(); if (!w || !w.OUBI_LOCAL_ME) return;
      w.OUBI_LOCAL_ME.setName(name);
      setTimeout(function () { root.OUBI_HOST.casesChanged(); if (EE.app && EE.app.renderUser) EE.app.renderUser(); }, 300);
    }
  };

  // 枠は最初に作っておく（起動の演出の間に読み込む）。見せるのは #/o/… のときだけ
  function mountFrame() {
    var main = document.querySelector('.main'); if (!main || frame) return;
    frame = document.createElement('iframe');
    frame.id = 'ob-frame'; frame.src = 'oubi.html'; frame.title = '業務管理'; frame.setAttribute('allow', 'geolocation; clipboard-write');
    main.appendChild(frame);
    // 枠の中がよそのページ（地図など）に移ったら、業務管理の画面に戻す
    frame.addEventListener('load', function () {
      var ok = false; try { ok = /oubi\.html/.test(frame.contentWindow.location.href); } catch (e) {}
      if (!ok) location.reload();   // 見積とのつなぎも含めて、まとめて読み込み直す（記録はこの端末に保存済み）
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountFrame); else mountFrame();

  /* ---------- スマホの下のボタン（全画面）：ホーム・営業・工事・見積・予定・その他 ----------
     スマホ幅では左の列をしまい、親指で届く下にまとめる。営業の画面だけは、営業専用の下のボタン（記録・地図…）を使う */
  var MNAV = [['home', '#/home', 'home', 'ホーム'], ['sales', '#/o/sales', 'walk', '営業'], ['sites', '#/o/list', 'site', '工事'], ['estimate', '#/docs', 'calc', '見積'], ['schedule', '#/o/cal', 'calendar', '予定']];
  function mountMnav() {
    if (document.getElementById('mnav')) return;
    document.body.classList.add('ee-link');
    var nav = document.createElement('nav'); nav.id = 'mnav'; nav.className = 'mnav'; nav.setAttribute('aria-label', 'メニュー');
    nav.innerHTML = MNAV.map(function (x) { return '<a href="' + x[1] + '" data-mnav="' + x[0] + '">' + U.I[x[2]] + '<span>' + x[3] + '</span></a>'; }).join('') +
      '<button type="button" data-mnav="more" aria-haspopup="true" aria-expanded="false">' + U.I.grid + '<span>その他</span></button>' +
      '<div class="mnav-more" id="mnav-more" hidden>' +
        '<a href="#/finance">' + U.I.yen + '経営（粗利・入金・分析）</a><a href="#/settings/items">' + U.I.gear + '設定（マスタ・自社情報）</a>' +
        '<a href="#/settings/data">' + U.I.users + '自分の名前・バックアップ</a><button type="button" data-mnav-search>' + U.I.search + 'すべての機能を検索</button></div>';
    document.body.appendChild(nav);
    var more = nav.querySelector('#mnav-more'), mb = nav.querySelector('[data-mnav="more"]');
    function close() { more.hidden = true; mb.setAttribute('aria-expanded', 'false'); }
    nav.addEventListener('click', function (e) {
      if (e.target.closest('[data-mnav="more"]')) { more.hidden = !more.hidden; mb.setAttribute('aria-expanded', String(!more.hidden)); return; }
      if (e.target.closest('[data-mnav-search]')) { close(); EE.palette.open(); return; }
      if (e.target.closest('a')) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    // 今いる場所：左のメニューで選ばれている項目に合わせる
    function sync() {
      var act = document.querySelector('.nav-item.active'), k = act ? act.dataset.nav : 'home';
      nav.querySelectorAll('[data-mnav]').forEach(function (a) { var on = a.dataset.mnav === k || (a.dataset.mnav === 'more' && ['finance', 'settings'].indexOf(k) >= 0); a.classList.toggle('on', on); if (a.tagName === 'A') { if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); } });
      document.body.classList.toggle('mnav-sales', /^#\/o\/sales/.test(location.hash));
    }
    var navEl = document.getElementById('nav');
    new MutationObserver(sync).observe(document.querySelector('.sidebar') || document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('hashchange', function () { setTimeout(sync, 50); });
    sync(); void navEl;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountMnav); else mountMnav();

  /* ======================================================================
   * 足りなかった機能（桜ミツ版）
   * ====================================================================== */
  function N(v) { var n = Number(String(v == null ? '' : v).replace(/[,，円\s]/g, '')); return isFinite(n) ? n : 0; }
  function proj(id) { return (EE.S && EE.S.projects || []).filter(function (p) { return p.id === id; })[0]; }
  function docsOf(pid) {
    var list = (EE.S && EE.S.documents || []).filter(function (d) { return d.projectId === pid && d.type !== 'invoice'; });
    var parents = {}; list.forEach(function (d) { if (d.parentId) parents[d.parentId] = 1; });
    return list.filter(function (d) { return !parents[d.id]; });   // 修正前の古い版は除く
  }
  function daysTo(d) { return Math.round((new Date(d + 'T00:00:00') - new Date(EE.data.today() + 'T00:00:00')) / 864e5); }

  /* ---- 1) 期限が近い見積・入金待ちを「今日やること」と、営業の再訪問に ---- */
  function dueItems() {
    var out = [], S = EE.S; if (!S) return out;
    S.projects.forEach(function (p) {
      if (p.lost) return;
      if (p.stage === 'estimate') docsOf(p.id).forEach(function (d) {
        if (!d.validUntil || d.status === 'void') return;
        var n = daysTo(d.validUntil);
        if (n <= 7 && n >= -7) out.push({ kind: 'quote', id: d.id, p: p, d: d, n: n, warn: n <= 2, t: (p.name || d.title || '見積'), s: n < 0 ? '見積の期限が ' + (-n) + ' 日過ぎています（' + (d.no || '下書き') + '）' : '見積の期限まで あと ' + n + ' 日（' + (d.no || '下書き') + '）', href: '#/edit/' + d.id });
      });
      if (p.stage === 'invoice') out.push({ kind: 'pay', id: p.id, p: p, warn: true, t: p.name, s: '入金待ち（請求 ' + (p.invoicedOn ? U.jdate(p.invoicedOn) : '済み') + '）', href: '#/o/case/' + p.id + '/payin' });
    });
    return out.sort(function (a, b) { return (b.warn ? 1 : 0) - (a.warn ? 1 : 0) || (a.n || 0) - (b.n || 0); });
  }
  EE.linkTodo = function () {
    var items = dueItems().slice(0, 6);
    var bk = backupAge(); if (bk.need) items.unshift({ warn: true, t: 'この端末の記録のバックアップ', s: bk.text, href: '#/settings/data' });
    return items;
  };
  // 営業の再訪問の一覧へ（同じものは1回だけ。済んだもの・消したものは作り直さない）
  var rvBusy = false;
  function syncRevisits() {
    var o = O(); if (rvBusy || !o || !o.db || o.mode() !== 'db') return;
    rvBusy = true;
    try {
      var me = root.OUBI_LINK.me(), seen = JSON.parse(localStorage.getItem('oubi.autorv') || '{}'), changed = false;
      dueItems().forEach(function (x) {
        var key = x.kind + ':' + x.id; if (seen[key]) return;
        var c = (o.cases() || []).filter(function (k) { return k.id === x.p.id; })[0] || {}, L = c.lead || {};
        var day = x.kind === 'quote' ? (x.n > 3 ? EE.data.addDays(x.d.validUntil, -3) : EE.data.today()) : EE.data.today();
        var v = { id: 'auto_' + x.kind + '_' + x.id, by: me.id, at: new Date().toISOString(), day: '', r: '自動', auto: x.kind, caseId: x.p.id,
          addr: L.siteAddr || L.addr || '', name: L.company || L.customer || '', tel: L.tel || '', rv: day,
          memo: x.kind === 'quote' ? '見積の期限が近い：' + (x.d.no || '下書き') + '（' + U.jdate(x.d.validUntil) + 'まで）。返事を聞きに行く' : '入金の確認（' + (x.p.name || '') + '）' };
        o.db().doc('visits/' + v.id).set(v); seen[key] = new Date().toISOString(); changed = true;
      });
      if (changed) localStorage.setItem('oubi.autorv', JSON.stringify(seen));
    } catch (e) { /* 次の機会に */ }
    rvBusy = false;
  }
  root.OUBI_LINK.syncRevisits = syncRevisits;

  /* ---- 2) バックアップの知らせ（7日たったら） ---- */
  var BK_KEY = 'oubi.backup.at';
  function backupAge() {
    var hasData = false; try { hasData = Object.keys(JSON.parse(localStorage.getItem('oubi.ldb.cases') || '{}')).length > 0 || Object.keys(JSON.parse(localStorage.getItem('oubi.ldb.mitsu_docs') || '{}')).length > 0; } catch (e) {}
    var at = localStorage.getItem(BK_KEY);
    if (!hasData) return { need: false };
    if (!at) return { need: true, text: 'まだ一度もバックアップしていません。端末を替えると記録が消えます', days: null };
    var d = Math.floor((Date.now() - new Date(at)) / 864e5);
    return { need: d >= 7, days: d, text: '最後のバックアップから ' + d + ' 日たちました' };
  }
  EE.linkBackupBanner = function () {
    var b = backupAge(); if (!b.need) return '';
    return '<div class="panel" data-st style="margin-bottom:14px;padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-color:rgba(242,189,92,.35)">' +
      '<span style="color:var(--warn)">' + U.I.bell + '</span><span style="color:var(--text-2);flex:1;min-width:200px">' + U.esc(b.text) + '。ときどき保存してください。</span>' +
      '<a class="btn sm primary" href="#/settings/data">' + U.I.download + 'バックアップする</a></div>';
  };
  setTimeout(function () { var b = backupAge(); if (b.need && EE.fx) EE.fx.toast(b.text + '（設定 → 自分の名前・バックアップ）', { warn: true, ms: 6000 }); }, 6000);

  /* ---- 3) 実績原価を単価マスタへ（完工した工事の実際の原価から、品目の原価を見直す） ---- */
  var ACT_TYPE = function (t) { return t === 'other' ? 'expense' : t; };
  function actualSuggest() {
    var o = O(); if (!o || !EE.S) return [];
    var byItem = {};
    (o.cases() || []).forEach(function (c) {
      if (c.archived) return;
      var p = proj(c.id); if (!p || ['done', 'invoice', 'paid'].indexOf(p.stage) < 0) return;
      var doc = (EE.S.documents || []).filter(function (d) { return d.id === (c.quote || {}).mitsuDocId; })[0]; if (!doc) return;
      var a = c.actual || {}, act = { material: N(a.material), labor: N(a.labor), subcontract: (c.vendors || []).reduce(function (s, v) { return s + N(v.amount); }, 0), expense: N(a.other) };
      var r = U.calcDoc(doc), plan = {};
      doc.lines.forEach(function (ln, i) { var t = ACT_TYPE(ln.costType); plan[t] = (plan[t] || 0) + ((r.lines[i] || {}).cost || 0); });
      doc.lines.forEach(function (ln) {
        var t = ACT_TYPE(ln.costType); if (!ln.itemId || !plan[t] || !act[t] || !(N(ln.unitCost) > 0)) return;
        var q = N(ln.qty) || 1, e = byItem[ln.itemId] = byItem[ln.itemId] || { sum: 0, qty: 0, cases: {} };
        e.sum += N(ln.unitCost) * (act[t] / plan[t]) * q; e.qty += q; e.cases[c.id] = p.name;
      });
    });
    return Object.keys(byItem).map(function (id) {
      var it = U.findItem(id); if (!it) return null; var e = byItem[id], sug = Math.round(e.sum / e.qty);
      return { item: it, now: N(it.unitCost), sug: sug, n: Object.keys(e.cases).length, names: Object.keys(e.cases).map(function (k) { return e.cases[k]; }) };
    }).filter(function (x) { return x && x.sug > 0 && Math.abs(x.sug - x.now) >= 1; }).sort(function (a, b) { return Math.abs(b.sug - b.now) / (b.now || 1) - Math.abs(a.sug - a.now) / (a.now || 1); });
  }
  EE.linkActual = {
    html: function () {
      var list = actualSuggest();
      return '<section class="panel" data-st style="margin-top:18px"><div class="panel-h"><h2>実績から原価を見直す</h2><span class="sub">完工した工事の実際の原価（材料費・労務費・外注・その他）から</span></div><div class="panel-b">' +
        (list.length ? '<div class="table-scroll"><table class="table"><thead><tr><th></th><th>品目</th><th class="r">今の原価</th><th class="r">実績の原価</th><th class="r">差</th><th>もとにした工事</th></tr></thead><tbody>' +
          list.map(function (x, i) { var d = x.sug - x.now; return '<tr><td><input type="checkbox" data-act-pick="' + i + '" checked aria-label="' + U.esc(x.item.name) + 'を反映"></td><td>' + U.esc(x.item.name) + '<div class="hint">' + U.esc(x.item.unit || '') + '</div></td><td class="r num">' + U.yen(x.now) + '</td><td class="r num"><b>' + U.yen(x.sug) + '</b></td><td class="r num" style="color:' + (d > 0 ? 'var(--err)' : 'var(--ok)') + '">' + (d > 0 ? '+' : '') + U.yen(d).replace('¥', '¥') + '</td><td class="hint">' + U.esc(x.names.slice(0, 3).join('、')) + (x.n > 3 ? ' ほか' : '') + '（' + x.n + '件）</td></tr>'; }).join('') +
          '</tbody></table></div><div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn primary" data-act-apply>' + U.I.check + '選んだ品目の原価をマスタに反映</button><span class="hint">次の見積から、この原価で粗利を計算します。前の原価は品目の履歴に残します。</span></div>'
          : '<p class="hint" style="margin:0">まだ見直せる品目がありません。工事を「完了」まで進め、工事の画面の「利益」に実際の原価（材料費・労務費・その他）と業者への支払いを入れると、ここに出ます。</p>') +
        '</div></section>';
    },
    mount: function (view) {
      view.addEventListener('click', function (e) {
        if (!e.target.closest('[data-act-apply]')) return;
        var list = actualSuggest(), n = 0;
        view.querySelectorAll('[data-act-pick]').forEach(function (cb) {
          var x = list[Number(cb.dataset.actPick)]; if (!cb.checked || !x) return;
          var it = x.item; it.costHistory = (it.costHistory || []).concat([{ at: new Date().toISOString(), from: it.unitCost, to: x.sug, by: '実績', cases: x.n }]);
          it.unitCost = x.sug; n++;
        });
        if (!n) { EE.fx.toast('反映する品目を選んでください', { warn: true }); return; }
        U.commit(); EE.fx.toast(n + ' 件の品目の原価を実績にそろえました'); EE.app.rerender();
      });
    }
  };

  /* ---- 4) お客様向けの松竹梅の比較表（同じ工事の別案を1枚に） ---- */
  function compareHTML(pid) {
    var p = proj(pid), list = docsOf(pid); if (!p || list.length < 2) return '';
    list.sort(function (a, b) { return U.calcDoc(a).total - U.calcDoc(b).total; });
    var co = EE.S.company || {}, cu = U.findCustomer(p.customerId) || {};
    var col = list.map(function (d) { var r = U.calcDoc(d); return { d: d, r: r, label: d.patternLabel || d.title || d.no || '案' }; });
    var top = function (d) { return d.lines.slice(0, 7).map(function (ln) { return '<li>' + U.esc(ln.name) + (ln.spec ? ' <small>' + U.esc(ln.spec) + '</small>' : '') + '</li>'; }).join('') + (d.lines.length > 7 ? '<li><small>ほか ' + (d.lines.length - 7) + ' 項目</small></li>' : ''); };
    var cell = 'border:1px solid #c9ced8;padding:10px 12px;vertical-align:top';
    return '<div class="cmp-sheet" style="background:#fff;color:#111;width:1000px;padding:36px 40px;font-family:\'Hiragino Sans\',\'Noto Sans JP\',sans-serif;font-size:14px;line-height:1.6">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1f3f8f;padding-bottom:10px;margin-bottom:18px"><div><div style="font-size:24px;font-weight:800;letter-spacing:.1em">お見積りプランの比較</div>' +
      '<div style="font-size:16px;margin-top:6px">' + U.esc(cu.name || '') + ' ' + U.esc(cu.honorific || '様') + '　' + U.esc(p.name || '') + '</div></div>' +
      '<div style="text-align:right;font-size:13px">' + U.esc(co.name || '') + '<br>' + U.esc(co.tel ? 'TEL ' + co.tel : '') + '<br>' + U.jdate(EE.data.today()) + '</div></div>' +
      '<table style="width:100%;border-collapse:collapse"><thead><tr><th style="' + cell + ';width:150px;background:#f3f5f9"></th>' + col.map(function (c) { return '<th style="' + cell + ';background:#1f3f8f;color:#fff;font-size:17px">' + U.esc(c.label) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      '<tr><th style="' + cell + ';background:#f3f5f9;text-align:left">お支払い総額<br><small>（税込）</small></th>' + col.map(function (c) { return '<td style="' + cell + ';text-align:center;font-size:22px;font-weight:800;color:#1f3f8f">' + U.yen(c.r.total) + '</td>'; }).join('') + '</tr>' +
      '<tr><th style="' + cell + ';background:#f3f5f9;text-align:left">工事代金（税抜）</th>' + col.map(function (c) { return '<td style="' + cell + ';text-align:center">' + U.yen(c.r.subtotal) + '</td>'; }).join('') + '</tr>' +
      '<tr><th style="' + cell + ';background:#f3f5f9;text-align:left">消費税</th>' + col.map(function (c) { return '<td style="' + cell + ';text-align:center">' + U.yen(c.r.tax) + '</td>'; }).join('') + '</tr>' +
      '<tr><th style="' + cell + ';background:#f3f5f9;text-align:left">主な内容</th>' + col.map(function (c) { return '<td style="' + cell + '"><ul style="margin:0;padding-left:18px">' + top(c.d) + '</ul></td>'; }).join('') + '</tr>' +
      '<tr><th style="' + cell + ';background:#f3f5f9;text-align:left">見積番号・有効期限</th>' + col.map(function (c) { return '<td style="' + cell + ';text-align:center;font-size:13px">' + U.esc(c.d.no || '（確定前）') + '<br>' + (c.d.validUntil ? U.jdate(c.d.validUntil) + 'まで' : '') + '</td>'; }).join('') + '</tr>' +
      '</tbody></table><p style="font-size:12px;color:#555;margin-top:14px">各プランの詳しい明細は、それぞれの見積書をご覧ください。金額は消費税10%を含みます。</p></div>';
  }
  function loadH2C() { return root.html2canvas ? Promise.resolve() : new Promise(function (ok, ng) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; s.crossOrigin = 'anonymous'; s.onload = ok; s.onerror = ng; document.head.appendChild(s); }); }
  EE.linkCompare = {
    can: function (pid) { return docsOf(pid).length >= 2; },
    open: function (pid) {
      var html = compareHTML(pid);
      if (!html) { EE.fx.toast('比べる案が2つ以上ありません。見積の「この見積をもとに別パターン」で別の案を作ってください', { warn: true, ms: 5000 }); return; }
      U.modal({ title: 'お客様向けの比較表', wide: true,
        body: '<div style="overflow:auto;max-height:60vh;border-radius:12px"><div style="transform-origin:0 0">' + html + '</div></div>',
        foot: '<button class="btn" data-cmp-print>' + U.I.pdf + 'PDFとして保存・印刷</button><button class="btn primary" data-cmp-img>' + U.I.download + '画像で保存（LINEで送る）</button>',
        onMount: function (el, api) {
          el.querySelector('[data-cmp-print]').onclick = function () {
            var pr = document.getElementById('print-root'); pr.innerHTML = html;
            setTimeout(function () { root.print(); pr.innerHTML = ''; }, 50);
          };
          el.querySelector('[data-cmp-img]').onclick = async function () {
            var btn = this; btn.disabled = true;
            try {
              await loadH2C();
              var box = document.createElement('div'); box.style.cssText = 'position:fixed;left:-10000px;top:0'; box.innerHTML = html; document.body.appendChild(box);
              var cv = await root.html2canvas(box.firstChild, { scale: 2, backgroundColor: '#ffffff' }); box.remove();
              var blob = await new Promise(function (ok) { cv.toBlob(ok, 'image/png'); });
              var name = '比較表_' + ((proj(pid) || {}).name || '') + '.png';
              var dl = root.claude && root.claude.use ? await root.claude.use('downloads').catch(function () { return null; }) : null;
              if (dl) await dl.save({ filename: name, data: blob });
              else { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
              EE.fx.toast('比較表を画像にしました');
            } catch (err) { if (!err || err.code !== 'declined') EE.fx.toast('画像にできませんでした（' + ((err && (err.message || err.code)) || '通信') + '）', { warn: true }); }
            btn.disabled = false;
          };
        } });
    }
  };

  /* ---------- バックアップ（設定 →「バックアップ」）：この端末の記録・見積・写真をまとめて1つのファイルに ---------- */
  var KEYS = /^(oubi\.|easy-estimate|oumitsu:)/;
  function b64(blob) { return new Promise(function (ok) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.readAsDataURL(blob); }); }
  function unb64(s, type) { var bin = atob(s), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: type || '' }); }
  async function make() {
    var ls = {};
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (KEYS.test(k) && !/:corrupt:|:prev$/.test(k)) ls[k] = localStorage.getItem(k); }
    var files = [], w = W();
    if (w && w.OUBI_LOCAL_FILES) {
      var all = await w.OUBI_LOCAL_FILES.all().catch(function () { return []; });
      for (var j = 0; j < all.length; j++) { var r = all[j].rec || {}; if (r.blob) files.push({ id: all[j].id, type: r.type, name: r.name, size: r.size, at: r.at, data: await b64(r.blob) }); }
    }
    return { app: 'oumitsu', kind: 'backup', version: 1, at: new Date().toISOString(), localStorage: ls, files: files };
  }
  async function saveFile(name, text) {
    var dl = root.claude && root.claude.use ? await root.claude.use('downloads').catch(function () { return null; }) : null;
    if (dl) { await dl.save({ filename: name, data: text }); return; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }
  /* 自分の名前の保存（設定の欄と、ホームの「名前を入れてください」の両方） */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-myname-save]'); if (!b) return;
    var box = b.closest('section, .myname'), inp = box && box.querySelector('#my-name, [data-myname]');
    var v = inp ? inp.value.trim() : '';
    if (!v) { if (inp) { inp.classList.add('flag-err'); EE.fx.shake(inp); inp.focus(); } return; }
    root.OUBI_LINK.setMyName(v); EE.fx.toast('名前を「' + v + '」にしました');
    if (b.closest('.myname')) setTimeout(function () { EE.app.rerender(); }, 400);
  });
  /** ホームの上：名前がまだ無いときだけ、小さく出す（ほかの操作は止めない） */
  EE.linkNameBanner = function () {
    if (root.OUBI_LINK.me().name) return '';
    return '<div class="panel myname" data-st style="margin-bottom:14px;padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
      '<span style="color:var(--text-2)">名前を入れてください（工事や記録の「だれ」に入ります）</span>' +
      '<input class="input" data-myname placeholder="例：青木 誠" style="max-width:220px;height:36px" aria-label="自分の名前">' +
      '<button class="btn sm primary" data-myname-save>保存</button></div>';
  };
  EE.linkBackup = {
    html: function () {
      var me = root.OUBI_LINK.me();
      return '<section class="panel" data-st style="margin-bottom:18px"><div class="panel-h"><h2>自分の名前</h2></div><div class="panel-b">' +
        '<p style="margin:0 0 12px;color:var(--text-2);line-height:1.7">工事の作成者・担当・営業の記録・投稿の「だれ」に入ります。いつでも変えられます。</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><input class="input" id="my-name" value="' + U.esc(me.name) + '" placeholder="例：青木 誠" style="max-width:320px" aria-label="自分の名前">' +
        '<button class="btn primary" data-myname-save>' + U.I.save + '保存</button></div></div></section>' +
        '<section class="panel" data-st><div class="panel-h"><h2>この端末の記録のバックアップ</h2></div><div class="panel-b">' +
        '<p style="margin:0 0 12px;color:var(--text-2);line-height:1.7">この版は、記録をこの端末（このブラウザ）の中だけに保存します。社員とは共有されません。<br>' +
        'ブラウザの記録を消す・端末を替える・別のブラウザで開くと、記録は見えなくなります。ときどき、ここでバックアップを保存してください。<br>' +
        '入るもの：工事・営業の記録・ホワイトボード・カレンダーの予定・見積・品目マスタ・自分の名前・工事の写真。</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-bk="save">' + U.I.download + 'バックアップを保存</button>' +
        '<label class="btn">' + U.I.upload + 'バックアップから戻す<input type="file" accept=".json,application/json" data-bk="load" hidden></label></div>' +
        '<p class="hint" id="bk-msg" role="status" style="margin-top:12px"></p></div></section>';
    },
    mount: function (view) {
      var msg = function (t) { var m = view.querySelector('#bk-msg'); if (m) m.textContent = t; };
      view.addEventListener('click', async function (e) {
        var b = e.target.closest('[data-bk="save"]'); if (!b) return;
        b.disabled = true; msg('まとめています…');
        try {
          var data = JSON.stringify(await make());
          await saveFile('桜ミツ_バックアップ_' + EE.data.today() + '.json', data);
          try { localStorage.setItem(BK_KEY, new Date().toISOString()); } catch (e2) {}
          msg('保存しました（' + Math.round(data.length / 1024) + 'KB）');
        } catch (err) { msg(err && err.code === 'declined' ? '保存をやめました' : '保存できませんでした（' + ((err && (err.message || err.code)) || '不明') + '）'); }
        b.disabled = false;
      });
      view.addEventListener('change', async function (e) {
        var inp = e.target.closest('[data-bk="load"]'); if (!inp || !inp.files[0]) return;
        try {
          var o = JSON.parse(await inp.files[0].text());
          if (!o || o.app !== 'oumitsu' || o.kind !== 'backup' || !o.localStorage) throw new Error('桜ミツのバックアップではありません');
          if (!(await U.confirmBox('バックアップ（' + String(o.at || '').slice(0, 10) + '）の内容で、この端末の記録を置き換えますか？\n今の記録は消えます。', '置き換える', { danger: true }))) { inp.value = ''; return; }
          Object.keys(localStorage).filter(function (k) { return KEYS.test(k); }).forEach(function (k) { localStorage.removeItem(k); });
          Object.keys(o.localStorage).forEach(function (k) { if (KEYS.test(k)) localStorage.setItem(k, o.localStorage[k]); });
          var w = W();
          if (w && w.OUBI_LOCAL_FILES) for (var i = 0; i < (o.files || []).length; i++) { var f = o.files[i]; await w.OUBI_LOCAL_FILES.put(f.id, { blob: unb64(f.data, f.type), type: f.type, name: f.name, size: f.size, at: f.at }); }
          msg('戻しました。読み込み直します…'); setTimeout(function () { location.reload(); }, 600);
        } catch (err) { msg('戻せませんでした：' + (err.message || err)); inp.value = ''; }
      });
    }
  };
})(this);
