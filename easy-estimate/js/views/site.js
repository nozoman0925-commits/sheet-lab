/*
 * 工事ワークスペース：工事を開けば全部そろう（概要・見積・写真・書類・原価・メモと履歴）
 * 見積タブ：1つの工事に作った見積をパターン別（A案・B案…）に並べ、比べる
 * - 修正見積（同じ見積の新しい版）とは別物。パターンはそれぞれ独立した見積書
 * - 比較表：明細の行をマスタ品目でそろえ、パターンごとの数量・金額の違いを色で示す
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var picked = {};   // 比較に入れるパターン（工事ごと）

  function docsOf(projectId) {
    return EE.S.documents.filter(function (d) { return d.projectId === projectId; })
      .sort(function (a, b) {   // パターン名のある見積を名前順に先、名前なしは作成順で後ろ
        if (!!a.patternLabel !== !!b.patternLabel) return a.patternLabel ? -1 : 1;
        return (a.patternLabel || '').localeCompare(b.patternLabel || '', 'ja') || (a.createdAt || '').localeCompare(b.createdAt || '');
      });
  }

  /** 次のパターン名（使われていない最初の「〇案」） */
  function nextLabel(projectId, exceptId) {
    var used = docsOf(projectId).filter(function (d) { return d.id !== exceptId; }).map(function (d) { return (d.patternLabel || '').charAt(0); });
    for (var i = 0; i < LETTERS.length; i++) if (used.indexOf(LETTERS[i]) < 0) return LETTERS[i] + '案';
    return '別案';
  }

  /** 見積から、同じ工事の別パターンを作る（明細は最新のマスタ単価で写す） */
  function newPattern(srcId) {
    var src = U.findDoc(srcId);
    if (!src) return;
    var siblings = docsOf(src.projectId);
    // 元の見積にまだパターン名が無く下書きなら「A案」を付ける（発行済みは書き換えない）
    if (src.projectId && !src.patternLabel && src.status === 'draft') { src.patternLabel = nextLabel(src.projectId, src.id); U.commit(); }
    var label = src.projectId ? nextLabel(src.projectId) : 'B案';
    var d = EE.data.newEstimate(EE.S, { noNumber: true, customerId: src.customerId, projectId: src.projectId, title: src.title, ownerId: src.ownerId, category: src.category });
    ['deliveryPlace', 'deliveryTerm', 'paymentTerms', 'notes'].forEach(function (k) { d[k] = src[k]; });
    d.lines = src.lines.map(function (l) { var it = U.findItem(l.itemId); if (!it) { var c = JSON.parse(JSON.stringify(l)); c.lineId = EE.data.uid('ln'); return c; } return EE.data.lineFromItem(it, l.qty); });
    d.adjustments = (src.adjustments || []).filter(function (a) { return !Array.isArray(a.scope); }).map(function (a) { return Object.assign({}, a, { id: EE.data.uid('adj') }); });
    d.patternLabel = label;
    d.patternOf = src.id;
    d.sourceLabel = (src.patternLabel || src.no) + ' をもとに ' + label + ' を作成';
    EE.app.newWith(d);
    EE.fx.toast('「' + label + '」を作りました。明細を変えて保存してください（工事の見積 ' + (siblings.length + 1) + ' 件目）');
  }

  function patternBadge(d) {
    return d.patternLabel ? '<span class="badge pattern">' + esc(d.patternLabel) + '</span>' : '';
  }

  /** 比較表 */
  function compareHTML(docs) {
    if (docs.length < 2) return '<p class="hint">2つ以上のパターンにチェックを入れると、ここで並べて比べられます。</p>';
    var rs = docs.map(function (d) { return U.calcDoc(d); });
    var keys = [], rowsBy = {};
    docs.forEach(function (d, di) {
      d.lines.forEach(function (l, li) {
        var k = l.itemId || ('x' + l.name);
        if (!rowsBy[k]) { rowsBy[k] = { name: l.name, spec: l.spec, unit: l.unit, cells: [] }; keys.push(k); }
        var c = rowsBy[k].cells[di] || { qty: 0, amount: 0 };
        c.qty += Number(l.qty) || 0; c.amount += rs[di].lines[li] ? rs[di].lines[li].amount : 0;
        rowsBy[k].cells[di] = c;
      });
    });
    var head = '<tr><th>明細</th>' + docs.map(function (d) { return '<th class="r">' + patternBadge(d) + '<span class="cell-sub num">' + esc(d.no || '（未保存）') + '</span></th>'; }).join('') + '</tr>';
    var body = keys.map(function (k) {
      var r = rowsBy[k];
      var vals = docs.map(function (d, i) { return r.cells[i] ? r.cells[i].amount : null; });
      var same = vals.every(function (v) { return v === vals[0]; });
      return '<tr' + (same ? '' : ' class="diff"') + '><td>' + esc(r.name) + (r.spec ? '<span class="cell-sub">' + esc(r.spec) + '</span>' : '') + '</td>' + docs.map(function (d, i) {
        var c = r.cells[i];
        return c ? '<td class="r num">' + U.yen(c.amount) + '<span class="cell-sub">' + U.num(c.qty) + ' ' + esc(r.unit || '') + '</span></td>' : '<td class="r"><span class="hint">—</span></td>';
      }).join('') + '</tr>';
    }).join('');
    var adjRows = '';
    var adjLabels = {};
    rs.forEach(function (r, i) { r.adjustments.forEach(function (a) { var k = a.label || a.type; (adjLabels[k] = adjLabels[k] || [])[i] = a.amount; }); });
    Object.keys(adjLabels).forEach(function (k) {
      adjRows += '<tr><td class="muted">' + esc(k) + '</td>' + docs.map(function (d, i) { var v = adjLabels[k][i]; return '<td class="r num">' + (v != null ? U.yen(v) : '<span class="hint">—</span>') + '</td>'; }).join('') + '</tr>';
    });
    var minTotal = Math.min.apply(null, rs.map(function (r) { return r.total; }));
    var foot = '<tr class="sum"><td>小計（税抜）</td>' + rs.map(function (r) { return '<td class="r num">' + U.yen(r.subtotal) + '</td>'; }).join('') + '</tr>' +
      '<tr class="sum"><td>消費税</td>' + rs.map(function (r) { return '<td class="r num">' + U.yen(r.tax) + '</td>'; }).join('') + '</tr>' +
      '<tr class="sum big"><td>合計（税込）</td>' + rs.map(function (r) { return '<td class="r num">' + U.yen(r.total) + (r.total !== minTotal ? '<span class="cell-sub">差 +' + U.yen(r.total - minTotal) + '</span>' : '<span class="cell-sub" style="color:var(--ok)">いちばん安い</span>') + '</td>'; }).join('') + '</tr>' +
      '<tr class="sum internal"><td>粗利率</td>' + rs.map(function (r) { return '<td class="r num">' + U.pct(r.marginRate) + '</td>'; }).join('') + '</tr>';
    return '<div class="table-scroll"><table class="table compare"><thead>' + head + '</thead><tbody>' + body + adjRows + foot + '</tbody></table></div>' +
      '<p class="hint" style="margin-top:8px">色の付いた行は、パターンによって数量や金額が違う明細です。</p>';
  }

  /* ================= 工事ワークスペース ================= */
  var TABS = [['overview', '概要'], ['estimate', '見積'], ['photos', '写真'], ['docs', '書類'], ['cost', '原価'], ['notes', 'メモ・履歴']];
  var PHASES = { before: '施工前', during: '施工中', after: '施工後', survey: '現地調査', '': 'その他' };

  /** 注意事項（決まったルールで出す。AIは使わない） */
  function cautions(p, c, docs, photoCount) {
    var out = [], ST = EE.data.STAGES, si = c ? c.stage : 0, minM = EE.S.settings.minMargin || 0;
    if (!p.site) out.push(['warn', '現場住所が未登録です', '工事を編集から入れると、見積書の工事場所に入ります']);
    if (!p.ownerId) out.push(['warn', '担当者が決まっていません', '工事を編集から選べます']);
    docs.filter(function (d) { return d.status !== 'issued'; }).forEach(function (d) {
      var s = EE.check.summary(U.checkDoc(d)); if (s.error) out.push(['error', '「' + (d.title || '見積') + (d.patternLabel ? '（' + d.patternLabel + '）' : '') + '」に要修正 ' + s.error + ' 件', '見積を開いて送信前チェックを確認してください']);
      var r = U.calcDoc(d); if (r.subtotal > 0 && r.marginRate < minM) out.push(['warn', '「' + (d.title || '見積') + '」の粗利率が下限（' + Math.round(minM * 100) + '%）を下回っています', '粗利率 ' + U.pct(r.marginRate)]);
    });
    if (si === 0 && c && c.days != null && c.days < 0) out.push(['error', '見積の有効期限が切れています', '再見積を出すか、お客様に確認してください']);
    if (si >= 1 && p.acceptedDocId) { var a = U.findDoc(p.acceptedDocId); if (a && a.status !== 'issued') out.push(['warn', '受注した見積がまだ確定されていません', 'PDFを出す（確定する）と、送った内容が固定されます']); }
    if (si >= 2 && !photoCount) out.push(['info', '着工後の写真がまだありません', '「写真」タブから施工前・施工中・施工後の写真を残せます']);
    return out;
  }

  function header(p, c, docs) {
    var cu = U.findCustomer(p.customerId) || {}, owner = U.findMember(p.ownerId), ST = EE.data.STAGES, si = c ? c.stage : EE.data.stageIndex(p.stage || 'estimate');
    var pins = EE.features.settings().pins || [], pinned = pins.indexOf(p.id) >= 0;
    var amt = c ? c.amount : 0, rate = c ? c.margin : null, prog = Math.round(si / (ST.length - 1) * 100);
    return '<section class="panel ws-head" data-st><div class="panel-b">' +
      '<div class="ws-title"><span class="kpi-icon" style="width:48px;height:48px">' + I.site + '</span><div style="flex:1;min-width:220px">' +
        '<div class="ws-name">' + esc(p.name) + '</div>' +
        '<div class="hint">' + esc(cu.name || '') + ' ' + esc(cu.honorific || '') + (p.site ? '　' + esc(p.site) : '') + (owner ? '　担当：' + esc(owner.name) : '') + '</div></div>' +
        '' + U.stageBadge(si) + '' +
        '<button class="btn icon ghost' + (pinned ? ' pinned' : '') + '" data-act="pin" aria-pressed="' + pinned + '" title="' + (pinned ? 'お気に入りから外す' : 'お気に入りに追加（ホームの「お気に入りの工事」に出ます）') + '" aria-label="お気に入り">' + I.star + '</button>' +
        '<button class="btn sm" data-act="edit-p">' + I.edit + '工事を編集</button></div>' +
      '<div class="ws-stats">' +
        '<div><small>' + (si >= 1 ? '受注金額' : '見積金額') + '（税込）</small><b class="num" data-count="' + amt + '" data-format="yen">¥0</b></div>' +
        '<div><small>予定粗利率</small><b class="num">' + (rate != null ? U.pct(rate) : '—') + '</b></div>' +
        '<div><small>進捗</small><b class="num">' + prog + '%</b><span class="ws-bar"><i style="width:' + prog + '%"></i></span></div>' +
        '<div><small>見積</small><b class="num">' + docs.length + ' 件</b></div></div>' +
      '<ol class="ws-steps">' + ST.map(function (s, i) { return '<li class="' + (i < si ? 'done' : i === si ? 'here' : '') + '">' + esc(s.label) + '</li>'; }).join('') + '</ol>' +
      '</div></section>';
  }

  function tabsHTML(p, tab) {
    return '<nav class="ws-tabs" data-st role="tablist" aria-label="工事の情報">' + TABS.map(function (t) {
      return '<a role="tab" aria-selected="' + (t[0] === tab) + '" class="' + (t[0] === tab ? 'on' : '') + '" href="#/site/' + p.id + '/' + t[0] + '">' + esc(t[1]) + '</a>';
    }).join('') + '</nav>';
  }

  function overviewTab(p, c, docs) {
    var ST = EE.data.STAGES, si = c ? c.stage : 0, next = ST[si + 1];
    return '<div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)">' +
      '<section class="panel" data-st><div class="panel-h"><h2>この工事の注意事項</h2></div><div class="panel-b"><div class="checks" id="ws-cautions"><p class="hint">確認中…</p></div></div></section>' +
      '<section class="panel" data-st><div class="panel-h"><h2>次の行動</h2></div><div class="panel-b">' +
        '<div class="next-action' + (c && c.warn ? ' warn' : '') + '"><div>' + esc(c ? c.next : '見積を作る') + '</div></div>' +
        '<div class="flow-detail-actions" style="margin-top:12px">' +
          (next && docs.length ? '<button class="btn primary" data-act="advance">' + I.check + esc(next.label) + 'にする</button>' : '') +
          '<button class="btn" data-act="pattern-blank">' + I.plus + '見積を作る</button>' +
          '<a class="btn" href="#/site/' + p.id + '/photos">' + I.camera + '写真を追加</a></div>' +
        (p.note ? '<div class="sep"></div><div class="label">メモ</div><div style="white-space:pre-wrap">' + esc(p.note) + '</div>' : '') +
      '</div></section></div>' +
      '<p class="hint" data-st style="margin-top:12px">工程・発注・安全品質のタブは、その機能を追加したときに現れます（設定 →「機能ライブラリ」）。</p>';
  }

  function estimateTab(p, docs) {
    var sel = picked[p.id] || (picked[p.id] = {});
    if (!Object.keys(sel).length) {
      // 最初は「パターン名が付いた見積どうし」を比べる（同じ工事の別工事は外しておく）
      var labeled = docs.filter(function (d) { return d.patternLabel; });
      (labeled.length >= 2 ? labeled : docs).slice(0, 4).forEach(function (d) { sel[d.id] = true; });
    }
    var chosen = docs.filter(function (d) { return sel[d.id]; });
    var cards = docs.map(function (d) {
      var r = U.calcDoc(d), acc = p.acceptedDocId === d.id;
      return '<div class="panel pattern-card' + (sel[d.id] ? ' on' : '') + '" data-st data-doc="' + d.id + '"><div class="panel-b">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' + (patternBadge(d) || '<span class="badge">パターン名なし</span>') + U.statusBadge(d) + (acc ? U.stBadge('fixed', '受注') : '') +
          '<label class="hint" style="margin-left:auto;display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" data-pick="' + d.id + '"' + (sel[d.id] ? ' checked' : '') + '>比較</label></div>' +
        '<div style="font-weight:600">' + esc(d.title || '（件名なし）') + '</div><div class="hint num">' + esc(d.no || '（未保存）') + '　' + U.jdate(d.issueDate) + '　明細 ' + d.lines.length + '行</div>' +
        '<div class="pattern-total num">' + U.yen(r.total) + '<small>税込<span class="internal">　粗利率 ' + U.pct(r.marginRate) + '</span></small></div>' +
        '<div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">' +
          (EE.data.stageIndex(p.stage || 'estimate') >= 1 && !acc ? '<button class="btn sm ghost" data-act="accept" data-id="' + d.id + '">この見積で受注</button>' : '') +
          '<a class="btn sm" href="#/edit/' + d.id + '">' + I.edit + '開く</a><button class="btn sm" data-act="pattern-from" data-id="' + d.id + '">' + I.copy + 'これをもとに別パターン</button></div>' +
      '</div></div>';
    }).join('');
    return '<div class="toolbar" data-st><div class="grow hint">同じ工事に、条件や仕様を変えた見積をパターン（A案・B案…）として何枚でも作れます。それぞれ独立した見積書です。</div>' +
        '<button class="btn" data-act="pattern-blank">' + I.plus + '空のパターンを作る</button>' +
        (docs.length ? '<button class="btn primary" data-act="pattern-from" data-id="' + docs[docs.length - 1].id + '">' + I.copy + '最新の見積をもとに別パターン</button>' : '') + '</div>' +
      (docs.length ? '<div class="pattern-grid">' + cards + '</div>' : '<section class="panel" data-st style="margin-top:18px"><div class="empty">' + I.docs + 'この工事の見積はまだありません</div></section>') +
      (docs.length > 1 ? '<section class="panel" data-st style="margin-top:18px"><div class="panel-h"><h2>パターンの比較</h2><span class="sub">' + chosen.length + '件を比較中</span></div><div class="panel-b" id="cmp">' + compareHTML(chosen) + '</div></section>' : '');
  }

  function photosTab(p) {
    return '<section class="panel" data-st><div class="panel-h"><h2>現場写真</h2><span class="sub">このブラウザの中に保存します</span><div class="spacer"></div>' +
      '<select class="input" id="ph-phase" style="width:auto" aria-label="写真の区分">' + Object.keys(PHASES).map(function (k) { return U.opt(k, PHASES[k], 'before'); }).join('') + '</select>' +
      '<label class="btn primary">' + I.camera + '写真を追加<input type="file" id="ph-file" accept="image/*" multiple hidden></label></div>' +
      '<div class="panel-b"><div class="seg" id="ph-filter" style="margin-bottom:12px"><button data-v="all" class="on">すべて</button>' + Object.keys(PHASES).map(function (k) { return '<button data-v="' + k + '">' + PHASES[k] + '</button>'; }).join('') + '</div>' +
      '<div class="photo-grid" id="ph-grid"><p class="hint">読み込み中…</p></div></div></section>';
  }

  function docsTab(p, docs) {
    if (!docs.length) return '<section class="panel" data-st><div class="empty">' + I.docs + 'この工事の書類はまだありません</div></section>';
    return '<section class="panel" data-st><div class="panel-h"><h2>この工事の書類</h2><span class="sub">' + docs.length + ' 件</span></div><div class="panel-b table-scroll"><table class="table"><thead><tr><th>番号</th><th>件名</th><th>発行日</th><th class="r">金額（税込）</th><th>状態</th><th>PDF</th></tr></thead><tbody>' +
      docs.map(function (d) {
        var pdf = (d.history || []).filter(function (h) { return /PDF出力/.test(h.action); }).length;
        return '<tr class="clickable" data-href="#/edit/' + d.id + '"><td class="num">' + esc(d.no || '（未保存）') + '</td><td>' + patternBadge(d) + ' ' + esc(d.title || '') + '</td><td class="num">' + U.jdate(d.issueDate) + '</td><td class="r num">' + U.yen(U.calcDoc(d).total) + '</td><td>' + U.statusBadge(d) + '</td><td class="num">' + (pdf ? pdf + '回' : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div></section>';
  }

  function costTab(p, c) {
    var d = (p.acceptedDocId && U.findDoc(p.acceptedDocId)) || (c && c.main);
    if (!d) return '<section class="panel" data-st><div class="empty">' + I.yen + '見積を作ると、ここに原価と粗利が出ます</div></section>';
    var r = U.calcDoc(d), CT = EE.engine.COST_TYPES, b = r.breakdown;
    var rows = Object.keys(CT).filter(function (k) { return b[k]; }).map(function (k) { return [CT[k], b[k]]; });
    if (b.discount) rows.push(['値引き・端数調整', b.discount]);
    return '<div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">' +
      '<section class="panel" data-st><div class="panel-h"><h2>工事費の内訳</h2><span class="sub">' + (p.acceptedDocId ? '受注した見積' : '最新の見積') + '（税抜）</span></div><div class="panel-b">' +
        rows.map(function (x) { return '<div class="sum-row"><span>' + esc(x[0]) + '</span><span class="num">' + U.yen(x[1]) + '</span></div>'; }).join('') +
        '<div class="sep"></div><div class="sum-row"><b>小計</b><b class="num">' + U.yen(r.subtotal) + '</b></div></div></section>' +
      '<section class="panel" data-st><div class="panel-h"><h2>原価と粗利</h2><span class="sub">見積上の計算</span></div><div class="panel-b">' +
        '<div class="sum-row"><span>小計（税抜）</span><span class="num">' + U.yen(r.subtotal) + '</span></div>' +
        '<div class="sum-row"><span>原価合計</span><span class="num">' + U.yen(r.costTotal) + '</span></div>' +
        '<div class="sum-row"><span>粗利</span><span class="num">' + U.yen(r.grossProfit) + '</span></div>' +
        '<div class="sum-row internal"><span>粗利率</span><span class="num">' + U.pct(r.marginRate) + '</span></div>' +
        '<p class="hint" style="margin-top:12px">ここは見積上の原価です。実際にかかった原価（発注・外注・人件費）と最終利益は、第5期の「実行予算・実績原価」で追加します。</p></div></section></div>';
  }

  function notesTab(p, docs) {
    var ST = EE.data.STAGES, ev = [];
    (p.stageHistory || []).forEach(function (h) { ev.push({ at: h.at, t: '段階を「' + ((ST[EE.data.stageIndex(h.to)] || {}).label || h.to) + '」にした' }); });
    docs.forEach(function (d) { (d.history || []).forEach(function (h) { ev.push({ at: h.at, t: (d.title || d.no || '見積') + (d.patternLabel ? '（' + d.patternLabel + '）' : '') + '：' + h.action }); }); });
    (p.notes || []).forEach(function (n) { ev.push({ at: n.at, t: n.text, memo: true, who: n.who }); });
    ev.sort(function (a, b) { return (b.at || '').localeCompare(a.at || ''); });
    return '<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.3fr)">' +
      '<section class="panel" data-st><div class="panel-h"><h2>メモを残す</h2></div><div class="panel-b">' +
        '<textarea class="input" id="ws-note" placeholder="例：駐車は前面道路不可。近くのコインパーキングを使う" aria-label="工事のメモ"></textarea>' +
        '<div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn primary" data-act="add-note">' + I.save + '記録する</button></div></div></section>' +
      '<section class="panel" data-st><div class="panel-h"><h2>履歴</h2><span class="sub">' + ev.length + ' 件</span></div><div class="panel-b"><ol class="timeline">' +
        (ev.length ? ev.slice(0, 60).map(function (e) { return '<li class="' + (e.memo ? 'memo' : '') + '"><span class="num hint">' + (e.at ? U.jdate(e.at.slice(0, 10)) + ' ' + e.at.slice(11, 16) : '') + '</span><span>' + (e.memo ? '<b>メモ</b>' + (e.who ? '（' + esc(e.who) + '）' : '') + '：' : '') + esc(e.t) + '</span></li>'; }).join('') : '<li class="hint">まだ履歴はありません</li>') +
      '</ol></div></section></div>';
  }

  function render(projectId, tab) {
    var p = U.findProject(projectId);
    if (!p) return { title: '見つかりません', html: '<div class="panel panel-b empty">工事が見つかりません。</div>' };
    tab = TABS.some(function (t) { return t[0] === tab; }) ? tab : 'overview';
    var docs = docsOf(p.id);
    var c = EE.insight.cases().filter(function (x) { return x.project.id === p.id; })[0];
    var body = tab === 'estimate' ? estimateTab(p, docs) : tab === 'photos' ? photosTab(p) : tab === 'docs' ? docsTab(p, docs) : tab === 'cost' ? costTab(p, c) : tab === 'notes' ? notesTab(p, docs) : overviewTab(p, c, docs);
    var html = header(p, c, docs) + tabsHTML(p, tab) + '<div class="ws-body">' + body + '</div>';
    return {
      title: p.name, crumb: '工事ワークスペース', html: html,
      mount: function (view) {
        EE.fx.countAll(view);
        var phFilter = 'all';
        function drawPhotos() {
          var g = view.querySelector('#ph-grid'); if (!g) return;
          EE.filestore.photos(p.id).then(function (list) {
            var l = list.filter(function (r) { return phFilter === 'all' || (r.phase || '') === phFilter; });
            g.innerHTML = l.length ? l.map(function (r) {
              return '<figure class="photo"><img src="' + r.thumb + '" alt="' + esc(r.name) + '"><figcaption><span class="badge">' + esc(PHASES[r.phase || ''] || 'その他') + '</span><span class="hint num">' + U.jdate((r.createdAt || '').slice(0, 10)) + '</span>' +
                '<button class="btn ghost icon sm" data-ph-open="' + r.id + '" aria-label="大きく見る">' + I.eye + '</button><button class="btn ghost icon sm danger" data-ph-del="' + r.id + '" aria-label="写真を削除">' + I.trash + '</button></figcaption></figure>';
            }).join('') : '<p class="hint">写真はまだありません。「写真を追加」から選んでください（スマホではカメラで撮れます）。</p>';
          }).catch(function (e) { g.innerHTML = '<p class="hint">' + esc(e.message) + '</p>'; });
        }
        function overviewCautions() {
          var box = view.querySelector('#ws-cautions'); if (!box) return;
          EE.filestore.photos(p.id).then(function (l) { return l.length; }).catch(function () { return 0; }).then(function (n) {
            var list = cautions(p, c, docs, n);
            box.innerHTML = list.length ? list.map(function (x) { return '<div class="check ' + x[0] + '"><span class="ic">!</span><div><div class="t">' + esc(x[1]) + '</div><div class="d">' + esc(x[2]) + '</div></div></div>'; }).join('') :
              '<div class="check-ok">' + I.check + '<div>いま気をつけることはありません</div></div>';
          });
        }
        drawPhotos(); overviewCautions();
        view.addEventListener('change', function (e) {
          var k = e.target.dataset.pick;
          if (k) {
            var sel = picked[p.id]; sel[k] = e.target.checked;
            e.target.closest('.pattern-card').classList.toggle('on', e.target.checked);
            var cmp = document.getElementById('cmp');
            if (cmp) { cmp.innerHTML = compareHTML(docsOf(p.id).filter(function (d) { return sel[d.id]; })); EE.fx.stagger(cmp, { step: 10 }); }
            var sub = cmp && cmp.closest('.panel').querySelector('.sub'); if (sub) sub.textContent = Object.keys(sel).filter(function (x) { return sel[x]; }).length + '件を比較中';
            return;
          }
          if (e.target.id === 'ph-file' && e.target.files.length) {
            var phase = view.querySelector('#ph-phase').value, files = Array.prototype.slice.call(e.target.files);
            Promise.all(files.map(function (f) { return savePhoto(p.id, f, phase); })).then(function (ids) {
              EE.fx.toast(ids.filter(Boolean).length + '枚の写真を保存しました'); drawPhotos();
              p.notes = p.notes || []; U.commit();
            }).catch(function (err) { EE.fx.toast('写真を保存できませんでした：' + err.message, { warn: true, ms: 4000 }); });
            e.target.value = '';
          }
        });
        view.addEventListener('click', async function (e) {
          var f = e.target.closest('#ph-filter [data-v]');
          if (f) { phFilter = f.dataset.v; f.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === f); }); drawPhotos(); return; }
          var po = e.target.closest('[data-ph-open]'); if (po) { EE.filestore.openOriginal(po.dataset.phOpen).catch(function (err) { EE.fx.toast(err.message, { warn: true }); }); return; }
          var pd = e.target.closest('[data-ph-del]');
          if (pd) { if (!(await U.confirmBox('この写真を削除しますか？', '削除する', { danger: true }))) return; await EE.filestore.remove(pd.dataset.phDel); drawPhotos(); EE.fx.toast('削除しました'); return; }
          var a = e.target.closest('[data-act]'); if (!a) return;
          switch (a.dataset.act) {
            case 'pattern-from': newPattern(a.dataset.id); break;
            case 'pattern-blank': EE.app.newWith({ customerId: p.customerId, projectId: p.id, title: p.name, ownerId: p.ownerId || '', patternLabel: docs.length ? nextLabel(p.id) : '' }); break;
            case 'advance': EE.views.sites.advance(p.id); break;
            case 'accept':
              if (!(await U.confirmBox('受注した見積を「' + (U.findDoc(a.dataset.id).patternLabel || U.findDoc(a.dataset.id).no) + '」に変えますか？', '変える'))) return;
              p.acceptedDocId = a.dataset.id; U.commit(); EE.fx.toast('受注した見積を変えました'); EE.app.rerender(); break;
            case 'edit-p': EE.views.clients.projectForm(p, p.customerId, function () { EE.app.rerender(); }); break;
            case 'pin':
              var ui = EE.features.settings(); ui.pins = ui.pins || [];
              var i = ui.pins.indexOf(p.id); if (i >= 0) ui.pins.splice(i, 1); else ui.pins.push(p.id);
              U.commit(); EE.fx.toast(i >= 0 ? 'お気に入りから外しました' : 'お気に入りに追加しました（ホームの「お気に入りの工事」）'); EE.app.rerender(); break;
            case 'add-note':
              var t = view.querySelector('#ws-note').value.trim(); if (!t) { EE.fx.shake(view.querySelector('#ws-note')); return; }
              p.notes = (p.notes || []).concat([{ at: new Date().toISOString(), text: t, who: U.me().name }]); U.commit(); EE.fx.toast('記録しました'); EE.app.rerender(); break;
          }
        });
      }
    };
  }

  /** 写真を縮めて保存（長辺 1600px の JPEG と、一覧用の 360px） */
  function savePhoto(projectId, file, phase) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) return resolve(null);
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        function shrink(max, q) { var k = Math.min(1, max / Math.max(img.width, img.height)); var cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); return cv; }
        var big = shrink(1600), thumb = shrink(360).toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(url);
        big.toBlob(function (blob) {
          var rec = { id: EE.data.uid('pho'), kind: 'photo', projectId: projectId, phase: phase || '', name: file.name, type: 'image/jpeg', size: blob.size, createdAt: new Date().toISOString(), blob: blob, thumb: thumb };
          EE.filestore.put(rec).then(resolve, reject);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('画像を読み込めませんでした')); };
      img.src = url;
    });
  }

  EE.views = EE.views || {};
  EE.views.site = { render: render, newPattern: newPattern, nextLabel: nextLabel, docsOf: docsOf, patternBadge: patternBadge };
})(this);
