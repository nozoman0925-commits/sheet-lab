/*
 * 現場ページ：1つの現場（案件）に作った見積をパターン別（A案・B案…）に並べ、比べる
 * - 修正見積（同じ見積の新しい版）とは別物。パターンはそれぞれ独立した見積書
 * - 比較表：明細の行をマスタ品目でそろえ、パターンごとの数量・金額の違いを色で示す
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var picked = {};   // 比較に入れるパターン（現場ごと）

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

  /** 見積から、同じ現場の別パターンを作る（明細は最新のマスタ単価で写す） */
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
    EE.fx.toast('「' + label + '」を作りました。明細を変えて保存してください（現場の見積 ' + (siblings.length + 1) + ' 件目）');
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
      '<tr class="sum"><td>粗利率</td>' + rs.map(function (r) { return '<td class="r num">' + U.pct(r.marginRate) + '</td>'; }).join('') + '</tr>';
    return '<div class="table-scroll"><table class="table compare"><thead>' + head + '</thead><tbody>' + body + adjRows + foot + '</tbody></table></div>' +
      '<p class="hint" style="margin-top:8px">色の付いた行は、パターンによって数量や金額が違う明細です。</p>';
  }

  function render(projectId) {
    var p = U.findProject(projectId);
    if (!p) return { title: '見つかりません', html: '<div class="panel panel-b empty">現場（案件）が見つかりません。</div>' };
    var c = U.findCustomer(p.customerId) || {};
    var owner = U.findMember(p.ownerId);
    var docs = docsOf(p.id);
    var sel = picked[p.id] || (picked[p.id] = {});
    if (!Object.keys(sel).length) {
      // 最初は「パターン名が付いた見積どうし」を比べる（同じ現場の別工事は外しておく）
      var labeled = docs.filter(function (d) { return d.patternLabel; });
      (labeled.length >= 2 ? labeled : docs).slice(0, 4).forEach(function (d) { sel[d.id] = true; });
    }
    var chosen = docs.filter(function (d) { return sel[d.id]; });
    var cards = docs.map(function (d) {
      var r = U.calcDoc(d);
      return '<div class="panel pattern-card' + (sel[d.id] ? ' on' : '') + '" data-st data-doc="' + d.id + '"><div class="panel-b">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' + (patternBadge(d) || '<span class="badge">パターン名なし</span>') + U.statusBadge(d) +
          '<label class="hint" style="margin-left:auto;display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" data-pick="' + d.id + '"' + (sel[d.id] ? ' checked' : '') + '>比較</label></div>' +
        '<div style="font-weight:600">' + esc(d.title || '（件名なし）') + '</div><div class="hint num">' + esc(d.no || '（未保存）') + '　' + U.jdate(d.issueDate) + '　明細 ' + d.lines.length + '行</div>' +
        '<div class="pattern-total num">' + U.yen(r.total) + '<small>税込　粗利率 ' + U.pct(r.marginRate) + '</small></div>' +
        '<div style="display:flex;gap:6px;justify-content:flex-end"><a class="btn sm" href="#/edit/' + d.id + '">' + I.edit + '開く</a><button class="btn sm" data-act="pattern-from" data-id="' + d.id + '">' + I.copy + 'これをもとに別パターン</button></div>' +
      '</div></div>';
    }).join('');
    var html = '<section class="panel" data-st><div class="panel-b folder-head">' +
        '<span class="kpi-icon" style="width:48px;height:48px">' + I.home + '</span>' +
        '<div style="flex:1;min-width:220px"><div style="font-size:20px;font-weight:650">' + esc(p.name) + '</div>' +
          '<div class="hint">' + esc(c.name || '') + ' ' + esc(c.honorific || '') + (p.site ? '　現場：' + esc(p.site) : '') + (owner ? '　担当：' + esc(owner.name) : '') + '</div></div>' +
        '<div class="folder-stats"><div><small>この現場の見積</small><b class="num" data-count="' + docs.length + '" data-format="int">0</b></div>' +
          '<div><small>発行済み</small><b class="num" data-count="' + docs.filter(function (d) { return d.status === 'issued'; }).length + '" data-format="int">0</b></div></div>' +
      '</div></section>' +
      '<div class="toolbar" data-st style="margin:18px 0 0"><div class="grow hint">同じ現場に、条件や仕様を変えた見積をパターン（A案・B案…）として何枚でも作れます。それぞれ独立した見積書として保存・PDF出力できます。</div>' +
        '<button class="btn" data-act="pattern-blank">' + I.plus + '空のパターンを作る</button>' +
        (docs.length ? '<button class="btn primary" data-act="pattern-from" data-id="' + docs[docs.length - 1].id + '">' + I.copy + '最新の見積をもとに別パターン</button>' : '') + '</div>' +
      (docs.length ? '<div class="pattern-grid">' + cards + '</div>' : '<section class="panel" data-st style="margin-top:18px"><div class="empty">' + I.docs + 'この現場の見積はまだありません</div></section>') +
      (docs.length > 1 ? '<section class="panel" data-st style="margin-top:18px"><div class="panel-h"><h2>パターンの比較</h2><span class="sub">' + chosen.length + '件を比較中</span></div><div class="panel-b" id="cmp">' + compareHTML(chosen) + '</div></section>' : '');
    return {
      title: p.name, crumb: '現場ページ', html: html,
      mount: function (view) {
        EE.fx.countAll(view);
        view.addEventListener('change', function (e) {
          var k = e.target.dataset.pick; if (!k) return;
          sel[k] = e.target.checked;
          e.target.closest('.pattern-card').classList.toggle('on', e.target.checked);
          var cmp = document.getElementById('cmp');
          if (cmp) { cmp.innerHTML = compareHTML(docsOf(p.id).filter(function (d) { return sel[d.id]; })); EE.fx.stagger(cmp, { step: 10 }); }
          var sub = cmp && cmp.closest('.panel').querySelector('.sub'); if (sub) sub.textContent = Object.keys(sel).filter(function (x) { return sel[x]; }).length + '件を比較中';
        });
        view.addEventListener('click', function (e) {
          var a = e.target.closest('[data-act]'); if (!a) return;
          if (a.dataset.act === 'pattern-from') newPattern(a.dataset.id);
          if (a.dataset.act === 'pattern-blank') EE.app.newWith({ customerId: p.customerId, projectId: p.id, title: p.name, ownerId: p.ownerId || '', patternLabel: docs.length ? nextLabel(p.id) : '' });
        });
      }
    };
  }

  EE.views = EE.views || {};
  EE.views.site = { render: render, newPattern: newPattern, nextLabel: nextLabel, docsOf: docsOf, patternBadge: patternBadge };
})(this);
