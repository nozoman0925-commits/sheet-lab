/*
 * 見積を「次へ」で進めて作る（#/w）
 *   1 どの工事？ → 2 中身（テンプレート・文章・白紙）→ 3 金額を確かめる → 4 できあがり（PDF）
 *   1画面に1つのことだけ。細かく直したいときは「くわしく編集する」で、いつもの見積の画面へ。
 *   金額はいつもと同じマスタと計算エンジンで決まる（AIは使わない）。
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var STEPS = ['工事を選ぶ', '中身を決める', '金額を確かめる', 'できあがり'];
  var W = fresh();
  function fresh() { return { projectId: '', q: '', mode: '', tpl: '', text: '', docId: '' }; }
  function linkO() { try { var f = root.OUBI_LINK && root.OUBI_LINK.frame(); return f && f.contentWindow && f.contentWindow.OUBI; } catch (e) { return null; } }
  function proj() { return EE.S.projects.filter(function (p) { return p.id === W.projectId; })[0] || null; }
  function doc() { return EE.S.documents.filter(function (d) { return d.id === W.docId; })[0] || null; }

  function stepper(n) {
    return '<ol class="wz-steps" aria-label="見積を作る流れ">' + STEPS.map(function (s, i) {
      return '<li class="' + (i + 1 === n ? 'on' : i + 1 < n ? 'done' : '') + '"' + (i + 1 === n ? ' aria-current="step"' : '') + '><span class="num">' + (i + 1) + '</span>' + s + '</li>';
    }).join('') + '</ol>';
  }
  function foot(n, nextOk, nextLabel) {
    return '<div class="wz-foot">' + (n > 1 ? '<a class="btn" href="#/w/' + (n - 1) + '">‹ 前へ戻る</a>' : '<a class="btn ghost" href="#/new">Excel・CSV・PDF から取り込む</a>') +
      '<div class="spacer"></div>' +
      '<button class="btn primary wz-next" type="button" data-wz="next"' + (nextOk ? '' : ' disabled') + '>' + (nextLabel || '次へ') + ' ›</button></div>';
  }
  function page(n, q, body, nextOk, nextLabel) {
    return '<div class="wz" data-nopager data-step="' + n + '">' + stepper(n) + '<section class="panel wz-card" data-st><h1 class="wz-q">' + q + '</h1>' + body + '</section>' + foot(n, nextOk, nextLabel) + '</div>';
  }

  /* ---------- 1 どの工事？ ---------- */
  function step1() {
    var nq = U.norm(W.q || '');
    var list = EE.S.projects.slice().sort(function (a, b) { return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')); })
      .filter(function (p) { var c = U.findCustomer(p.customerId) || {}; return !nq || U.norm((p.name || '') + (c.name || '')).indexOf(nq) >= 0; }).slice(0, 8);
    // 最近の見積3件は、いつも一番上に（押すと中身ごと複製して、すぐ直せる＝2タップで下書き）
    var recent = EE.S.documents.filter(function (d) { return d.lines && d.lines.length; }).sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); }).slice(0, 3);
    var recentHTML = recent.length ? '<div class="wz-recent"><b>最近の見積から作る（中身ごと複製）</b><div class="wz-recent-row">' + recent.map(function (d) {
      var c = U.docCustomer(d);
      return '<button type="button" class="wz-opt wz-dup" data-dup-recent="' + d.id + '">' + I.copy + '<span><b>' + esc(d.title || '（件名なし）') + '</b><small>' + esc((c.name || '宛先未設定') + '・' + U.yen(U.calcDoc(d).total) + '・' + d.lines.length + '品目') + '</small></span></button>';
    }).join('') + '</div></div>' : '';
    var body = recentHTML + '<p class="wz-help">見積を出す工事を選んでください。まだ登録していない工事は、下でお客様の名前を入れるだけで作れます。</p>' +
      (EE.S.projects.length > 4 ? '<input class="input wz-search" id="wz-q" type="search" placeholder="お客様の名前・工事名で探す" value="' + esc(W.q || '') + '" aria-label="工事を探す">' : '') +
      '<div class="wz-list" role="radiogroup" aria-label="工事">' + (list.length ? list.map(function (p) {
        var c = U.findCustomer(p.customerId) || {}, on = p.id === W.projectId;
        return '<button type="button" class="wz-opt' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-pj="' + p.id + '"><span class="wz-dot"></span><span><b>' + esc(p.name || '（工事名なし）') + '</b><small>' + esc(c.name ? c.name + ' 様' : '') + '</small></span></button>';
      }).join('') : '<p class="hint">' + (nq ? '見つかりません。名前を変えて探すか、下で新しく作ってください。' : 'まだ工事がありません。下で新しく作ってください。') + '</p>') + '</div>' +
      '<div class="wz-new"><b>新しい工事で作る</b><div class="wz-new-row"><input class="input" id="wz-cust" placeholder="お客様の名前（例：山田 太郎）" aria-label="お客様の名前">' +
      '<input class="input" id="wz-title" placeholder="工事名（なくてもよい。例：外壁塗装）" aria-label="工事名"></div></div>';
    return page(1, 'どの工事の見積ですか？', body, !!W.projectId);
  }

  /* ---------- 2 中身 ---------- */
  function step2() {
    if (!proj()) { location.replace('#/w/1'); return page(1, '', '', false); }
    // 作り方の入口（プロワン式の並び）：テンプレート・過去の見積・マイ型・概算・文章・手動。Excel・PDF の取り込みは下のリンクから
    var M = [['tpl', I.box || I.calc, 'テンプレートから', 'よくある工事のひな形から選ぶ'], ['past', I.copy, '過去の見積から', '前に作った見積の明細を写して直す'], ['mine', I.star || I.copy, 'マイ型から', '自分で保存した見積の型（' + ((EE.S.myTypes || []).length) + '）'],
      ['rough', I.yen, '概算で作る', '「だいたいいくら？」に数分で。明細はあとで'], ['text', I.spark || I.edit, '文章で書く', '「外壁塗装 30坪 足場あり」のように書くと明細になります'], ['blank', I.plus, '手動で入れる', '白紙の表に、品目を自分で入れる']];
    var body = '<p class="wz-help">「' + esc(proj().name || '') + '」の見積の中身を、どうやって入れますか？</p>' +
      '<div class="wz-modes" role="radiogroup" aria-label="入れ方">' + M.map(function (m) {
        var on = W.mode === m[0];
        return '<button type="button" class="wz-mode' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-mode="' + m[0] + '"><span class="wz-ic">' + m[1] + '</span><b>' + m[2] + '</b><small>' + m[3] + '</small></button>';
      }).join('') + '</div>';
    if (W.mode === 'tpl') {
      body += '<div class="wz-sub"><b>テンプレートを選んでください</b><div class="wz-tpls">' + EE.S.packages.map(function (p) {
        var on = W.tpl === p.id;
        return '<button type="button" class="wz-opt' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-tpl="' + p.id + '"><span class="wz-dot"></span><span><b>' + esc(p.name) + '</b><small>' + esc(p.category || '') + '・' + p.lines.length + '品目</small></span></button>';
      }).join('') + '</div></div>';
    } else if (W.mode === 'past') {
      var pj = proj(), past = EE.S.documents.filter(function (d) { return d.lines && d.lines.length && d.id !== W.docId; })
        .sort(function (a, b) { var sa = (pj && a.customerId === pj.customerId ? 2 : 0) + (pj && U.catOf(a) === pj.category ? 1 : 0), sb = (pj && b.customerId === pj.customerId ? 2 : 0) + (pj && U.catOf(b) === pj.category ? 1 : 0); return sb - sa || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); }).slice(0, 12);
      body += '<div class="wz-sub"><b>どの見積を写しますか？（同じお客様・同じ種類を先に）</b><div class="wz-tpls">' + past.map(function (d) {
        var on = W.past === d.id, c = U.docCustomer(d);
        return '<button type="button" class="wz-opt' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-past="' + d.id + '"><span class="wz-dot"></span><span><b>' + esc(d.title || '（件名なし）') + '</b><small>' + esc((c.name || '宛先未設定') + '・' + U.yen(U.calcDoc(d).total) + '・' + d.lines.length + '品目') + '</small></span></button>';
      }).join('') + '</div><p class="hint">単価は今のマスタの単価で計算し直します。</p></div>';
    } else if (W.mode === 'mine') {
      var my = EE.S.myTypes || [];
      body += '<div class="wz-sub"><b>マイ型を選んでください</b>' + (my.length ? '<div class="wz-tpls">' + my.map(function (t) {
        var on = W.mine === t.id;
        return '<button type="button" class="wz-opt' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-mine="' + t.id + '"><span class="wz-dot"></span><span><b>' + esc(t.name) + '</b><small>' + t.lines.length + '品目・' + esc(U.jdate((t.at || '').slice(0, 10))) + ' に保存</small></span></button>';
      }).join('') + '</div>' : '<p class="hint">まだマイ型がありません。見積の編集画面の「マイ型に保存」で、作った見積を型にできます。</p>') + '</div>';
    } else if (W.mode === 'rough') {
      body += EE.make ? EE.make.roughFormHTML(W, proj()) : '';
    } else if (W.mode === 'text') {
      body += '<div class="wz-sub"><label for="wz-text"><b>工事の内容を書いてください</b></label><textarea class="input" id="wz-text" rows="4" placeholder="例：外壁塗装 延床30坪。足場、高圧洗浄、シリコン上塗り、付帯部">' + esc(W.text || '') + '</textarea></div>';
    }
    var ok = W.mode === 'blank' || (W.mode === 'tpl' && !!W.tpl) || (W.mode === 'mine' && !!W.mine) || (W.mode === 'past' && !!W.past) || (W.mode === 'rough' && EE.make && EE.make.roughAmount(W) > 0) || (W.mode === 'text' && !!(W.text || '').trim());
    return page(2, '見積の中身はどうやって入れますか？', body, ok, W.mode === 'rough' ? '概算を作る' : '明細を作る');
  }

  /* ---------- 3 金額 ---------- */
  function step3() {
    var d = doc(); if (!d) { location.replace('#/w/2'); return page(2, '', '', false); }
    var r = U.calcDoc(d), am = {}; (r.lines || []).forEach(function (x) { am[x.lineId] = x.amount; });
    var rows = d.lines.map(function (l) {
      return '<tr data-line="' + l.lineId + '"><td><b>' + esc(l.name || '') + '</b>' + (l.spec ? '<div class="hint">' + esc(l.spec) + '</div>' : '') + '</td>' +
        '<td class="r"><div class="wz-qty"><button type="button" class="btn icon sm" data-q="-1" aria-label="' + esc(l.name || '') + 'の数量を減らす">−</button><input class="input num" data-qty value="' + U.num(l.qty) + '" inputmode="decimal" aria-label="' + esc(l.name || '') + 'の数量"><button type="button" class="btn icon sm" data-q="1" aria-label="' + esc(l.name || '') + 'の数量を増やす">＋</button></div></td>' +
        '<td>' + esc(l.unit || '') + '</td><td class="r num">' + U.yen(l.unitPrice) + '</td><td class="r num"><b>' + U.yen(am[l.lineId] || 0) + '</b></td></tr>';
    }).join('');
    var body = '<p class="wz-help">数量は − ＋ で変えられます。単価や品目を変えたいときは「くわしく編集する」へ。</p>' +
      (d.lines.length ? '<div class="table-wrap"><table class="table wz-table"><thead><tr><th>品目</th><th class="r">数量</th><th>単位</th><th class="r">単価</th><th class="r">金額</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : U.empty({ small: 1, text: 'まだ明細がありません', sub: '白紙から始めたときは、くわしい画面で品目を入れます。', btn: 'くわしく編集する', href: '#/edit/' + d.id })) +
      '<div class="wz-sum"><div><span>小計（税抜）</span><b class="num">' + U.yen(r.subtotal) + '</b></div><div><span>消費税</span><b class="num">' + U.yen(r.tax) + '</b></div>' +
      '<div class="wz-total"><span>合計（税込）</span><b class="num">' + U.yen(r.total) + '</b></div><div><span>粗利率</span><b class="num">' + U.pct(r.marginRate) + '</b></div></div>' +
      '<p style="margin:14px 0 0"><a class="btn ghost" href="#/edit/' + d.id + '">' + I.edit + 'くわしく編集する</a></p>';
    return page(3, '金額を確かめましょう', body, d.lines.length > 0);
  }

  /* ---------- 4 できあがり ---------- */
  function step4() {
    var d = doc(); if (!d) { location.replace('#/w/1'); return page(1, '', '', false); }
    var r = U.calcDoc(d), c = U.findCustomer(d.customerId) || {};
    var body = '<div class="wz-done"><span class="wz-ok">' + I.check + '</span><div><b>' + esc(d.title || '見積') + '</b><small>' + esc(c.name ? c.name + ' 様' : '') + '　合計（税込）<b class="num">' + U.yen(r.total) + '</b></small></div></div>' +
      '<p class="wz-help">見積は下書きとして保存しました。お客様に出すときは、送る前のチェックをしてからPDFにします。</p>' +
      '<div class="wz-actions"><button type="button" class="btn primary" data-wz="pdf">' + I.pdf + '送る前のチェックをしてPDFを出す</button>' +
      '<a class="btn" href="#/edit/' + d.id + '">' + I.edit + 'くわしく編集する</a><a class="btn ghost" href="#/docs">見積の一覧を見る</a><button type="button" class="btn ghost" data-wz="again">' + I.plus + 'もう1つ作る</button></div>';
    return '<div class="wz" data-nopager data-step="4">' + stepper(4) + '<section class="panel wz-card" data-st><h1 class="wz-q">できあがりました</h1>' + body + '</section>' +
      '<div class="wz-foot"><a class="btn" href="#/w/3">‹ 前へ戻る</a></div></div>';
  }

  /* ---------- 動き ---------- */
  function makeDoc() {
    var p = proj(); if (!p) return null;
    var rows = [], adj = [], sourceLabel = '';
    if (W.mode === 'tpl') {
      var t = EE.S.packages.filter(function (x) { return x.id === W.tpl; })[0];
      if (t) { rows = t.lines.filter(function (l) { return !l.optional; }).map(function (l) { return { itemId: l.itemId, qty: l.qty }; }); adj = t.adjustments || []; sourceLabel = 'テンプレート「' + t.name + '」から作成'; }
    } else if (W.mode === 'past') {
      var pd = U.findDoc(W.past);
      if (pd) { rows = pd.lines.filter(function (l) { return l.itemId; }).map(function (l) { return { itemId: l.itemId, qty: l.qty, desc: l.desc }; }); adj = pd.adjustments || []; sourceLabel = '過去の見積「' + (pd.title || pd.no) + '」から作成'; }
    } else if (W.mode === 'mine') {
      var mt = (EE.S.myTypes || []).filter(function (x) { return x.id === W.mine; })[0];
      if (mt) { rows = mt.lines.map(function (l) { return { itemId: l.itemId, qty: l.qty, desc: l.desc }; }); adj = mt.adjustments || []; sourceLabel = 'マイ型「' + mt.name + '」から作成'; }
    } else if (W.mode === 'text') {
      var res = EE.parse.parse(W.text, { items: EE.S.items, templates: EE.S.packages, categories: EE.S.categories, customers: EE.S.customers });
      rows = (res.rows || []).filter(function (r) { return r.include !== false; }); adj = (res.adjustments || []).filter(function (a) { return a.include !== false; }); sourceLabel = '文章から作成';
    }
    var d = doc();
    if (!d || d.status === 'issued') { d = EE.data.newEstimate(EE.S, { projectId: p.id, customerId: p.customerId, title: p.name || (EE.make ? EE.make.autoTitle({ customerId: p.customerId, category: p.category }) : ''), ownerId: U.me().id }); EE.S.documents.push(d); W.docId = d.id; }
    d.lines = [];
    rows.forEach(function (r) { var it = U.findItem(r.itemId); if (!it) return; var q = Number(r.qty); if (!isFinite(q) || q <= 0) q = it.stdQty || 1; var ln = EE.data.lineFromItem(it, q); if (r.source) ln.inputSource = r.source; if (r.desc || it.description) ln.desc = r.desc || it.description; d.lines.push(ln); });
    d.rough = false;
    if (W.mode === 'mine' && mt) ['notes', 'excludes', 'premises', 'paymentTerms', 'category'].forEach(function (k) { if (mt[k]) d[k] = mt[k]; });
    if (W.mode === 'rough' && EE.make) EE.make.applyRough(d, W, p);
    d.adjustments = adj.map(function (a) { return { id: EE.data.uid('adj'), type: a.type, label: a.label || (a.type === 'overhead' ? '諸経費' : '値引き'), mode: a.mode || 'rate', rateBp: a.rateBp || 0, amount: a.amount || 0, taxCategory: a.taxCategory || 'std10', scope: 'all', unit: a.unit }; });
    if (sourceLabel) d.sourceLabel = sourceLabel;
    d.updatedAt = new Date().toISOString();
    U.commit();
    return d;
  }
  // 新しい工事：桜ミツ版は業務管理の工事として作り、見積の工事・お客様ができるのを待つ
  function newProject(cust, title, done) {
    var o = linkO();
    if (o && o.makeCase) {
      var c = o.makeCase({ customer: cust }); if (title) c.work.title = title; o.touch(c);
      var tries = 0; (function wait() {
        var p = EE.S.projects.filter(function (x) { return x.id === c.id; })[0];
        if (p) return done(p);
        if (++tries > 60) { EE.fx.toast('工事を作れませんでした。もう一度押してください'); return done(null); }
        setTimeout(wait, 100);
      })();
      return;
    }
    var cu = { id: EE.data.uid('cus'), name: cust, contact: '', address: '', createdAt: new Date().toISOString() }; EE.S.customers.push(cu);
    var pj = { id: EE.data.uid('prj'), customerId: cu.id, name: title || (cust + '様 工事'), stage: 'estimate', createdAt: new Date().toISOString() }; EE.S.projects.push(pj);
    U.commit(); done(pj);
  }
  function go(n) { location.hash = '#/w/' + n; }

  function mount(view) {
    view.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-dup-recent]'))) { EE.app.duplicate(t.dataset.dupRecent); return; }
      if ((t = e.target.closest('[data-pj]'))) { W.projectId = t.dataset.pj; W.docId = ''; EE.app.rerender(); return; }
      if ((t = e.target.closest('[data-mode]'))) { W.mode = t.dataset.mode; EE.app.rerender(); var x = view.querySelector('#wz-text'); if (x) x.focus(); return; }
      if ((t = e.target.closest('[data-tpl]'))) { W.tpl = t.dataset.tpl; EE.app.rerender(); return; }
      if ((t = e.target.closest('[data-past]'))) { W.past = t.dataset.past; EE.app.rerender(); return; }
      if ((t = e.target.closest('[data-mine]'))) { W.mine = t.dataset.mine; EE.app.rerender(); return; }
      if ((t = e.target.closest('[data-q]'))) {
        var tr = t.closest('tr'), d = doc(), l = d && d.lines.filter(function (x) { return x.lineId === tr.dataset.line; })[0]; if (!l) return;
        l.qty = Math.max(0, Math.round((Number(l.qty) + Number(t.dataset.q)) * 100) / 100); d.updatedAt = new Date().toISOString(); U.commit(); EE.app.rerender(); return;
      }
      if ((t = e.target.closest('[data-wz]'))) {
        var a = t.dataset.wz, step = Number(view.querySelector('.wz').dataset.step);
        if (a === 'again') { W = fresh(); go(1); return; }
        if (a === 'pdf') { var id = W.docId; location.hash = '#/edit/' + id; setTimeout(function () { var b = document.querySelector('#view [data-act="pdf"]'); if (b) b.click(); }, 700); return; }
        if (a === 'next') {
          if (step === 1) { if (W.projectId) go(2); return; }
          if (step === 2) { EE.fx.busy(t, function () { var d = makeDoc(); if (d) { EE.fx.toast('明細を ' + d.lines.length + ' 行作りました'); go(3); } }); return; }
          if (step === 3) { go(4); return; }
        }
      }
    });
    view.addEventListener('input', function (e) {
      if (e.target.id === 'wz-q') { W.q = e.target.value; var pos = e.target.selectionStart; EE.app.rerender(); var q = document.getElementById('wz-q'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (er) {} } return; }
      if (e.target.id === 'wz-text') { W.text = e.target.value; var nx = view.querySelector('[data-wz="next"]'); if (nx) nx.disabled = !W.text.trim(); return; }
      if (e.target.dataset && e.target.dataset.rough != null && EE.make) { EE.make.roughInput(W, e.target, view); return; }
      if (e.target.id === 'wz-cust') { var n2 = view.querySelector('[data-wz="next"]'); if (n2) n2.disabled = !(W.projectId || e.target.value.trim()); }
    });
    view.addEventListener('change', function (e) {
      if (!e.target.hasAttribute('data-qty')) return;
      var tr = e.target.closest('tr'), d = doc(), l = d && d.lines.filter(function (x) { return x.lineId === tr.dataset.line; })[0]; if (!l) return;
      var v = Number(String(e.target.value).replace(/[^\d.]/g, '')); if (!isFinite(v) || v < 0) { EE.fx.shake(e.target); return; }
      l.qty = v; d.updatedAt = new Date().toISOString(); U.commit(); EE.app.rerender();
    });
    // 1：名前を入れて「次へ」なら、新しい工事を作ってから進む
    var nx = view.querySelector('.wz[data-step="1"] [data-wz="next"]');
    if (nx) nx.addEventListener('click', function (e) {
      var cu = view.querySelector('#wz-cust'), name = cu && cu.value.trim();
      if (!name) return;
      e.stopImmediatePropagation();
      EE.fx.busy(nx, function () { return new Promise(function (ok) { newProject(name, (view.querySelector('#wz-title').value || '').trim(), function (p) { ok(); if (p) { W.projectId = p.id; W.docId = ''; EE.fx.toast('「' + p.name + '」を登録しました'); go(2); } }); }); });
    }, true);
  }

  function render(n) {
    n = Number(n) || 1;
    var html = n === 2 ? step2() : n === 3 ? step3() : n === 4 ? step4() : step1();
    return { title: '見積を作る', crumb: 'ステップ ' + n + ' / 4　' + STEPS[n - 1], html: html, mount: mount };
  }
  EE.views = EE.views || {};
  EE.views.wizard = { render: render, reset: function () { W = fresh(); } };
})(this);
