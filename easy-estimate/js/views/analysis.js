/*
 * 分析
 *  - 月ごとの見積の件数（直近12か月）
 *  - 月別×工事種別のヒートマップ（件数／金額、カーソルでその月の件数と合計額）と工事種別ごとの合計
 *  - 受注率（見積を出した工事のうち受注した割合）と、担当者別・工事種別の見積・受注
 * 数字はすべて保存データと計算エンジンから集計するだけ（推計はしない）。
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var HM = 'count';

  /** 月別×工事種別のヒートマップ（直近12か月、書類の発行日で数える。金額は計算エンジンの合計） */
  function heatData() {
    var ms = EE.insight.months(12), idx = {};
    ms.forEach(function (m, i) { idx[m.key] = i; });
    var cats = (EE.S.categories && EE.S.categories.length ? EE.S.categories : EE.catalog.categories).map(function (c) { return { id: c.id, label: c.name }; });
    var ci = {}; cats.forEach(function (c, i) { ci[c.id] = i; });
    var cells = cats.map(function () { return ms.map(function () { return { count: 0, amount: 0 }; }); });
    EE.S.documents.forEach(function (d) {
      var mi = idx[(d.issueDate || '').slice(0, 7)]; if (mi == null) return;
      var r = ci[EE.insight.docCategory(d)]; if (r == null) r = ci.other; if (r == null) return;
      cells[r][mi].count++; cells[r][mi].amount += U.calcDoc(d).total;
    });
    return { rows: cats, cols: ms.map(function (m) { return { short: m.short, label: m.y + '年' + m.label }; }), cells: cells };
  }
  function drawHeat(view) {
    var el = view.querySelector('#a-heat'); if (!el) return;
    var h = heatData(); EE.charts.heatmap(el, h.rows, h.cols, h.cells, HM);
    var tot = h.rows.map(function (r, ri) { var t = { label: r.label, count: 0, amount: 0 }; h.cells[ri].forEach(function (c) { t.count += c.count; t.amount += c.amount; }); return t; })
      .filter(function (t) { return t.count; }).sort(function (a, b) { return b[HM] - a[HM]; });
    var max = tot.length ? tot[0][HM] : 0;
    view.querySelector('#a-heat-sum').innerHTML = '<div class="label" style="margin-bottom:10px">工事種別ごとの合計（12か月）</div>' + (tot.length ? tot.map(function (t) {
      return '<div class="hs-row"><span>' + esc(t.label) + '</span><b class="num">' + (HM === 'count' ? t.count + '件' : U.yen(t.amount)) + '</b><i style="--w:' + Math.round(t[HM] / max * 100) + '%"></i></div>';
    }).join('') : U.empty({ small: 1, text: 'まだ見積がありません', btn: '見積を作る', href: EE.link ? '#/w' : '#/new' }));
  }

  /** 受注率：見積がある工事のうち、受注（受注以降の段階）になった割合 */
  function conversion() {
    var cs = EE.insight.cases().filter(function (c) { return c.project.id && c.docs.length; });
    var won = cs.filter(function (c) { return c.stage >= 1; });
    function by(keyFn, labelFn) {
      var g = {};
      cs.forEach(function (c) { var k = keyFn(c); g[k] = g[k] || { label: labelFn(c), n: 0, won: 0, amount: 0 }; g[k].n++; if (c.stage >= 1) { g[k].won++; g[k].amount += c.amount; } });
      return Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return b.amount - a.amount || b.n - a.n; });
    }
    var catName = function (id) { var c = (EE.S.categories || []).filter(function (x) { return x.id === id; })[0]; return c ? c.name : 'その他'; };
    return {
      n: cs.length, won: won.length, rate: cs.length ? won.length / cs.length : 0,
      byOwner: by(function (c) { return c.owner ? c.owner.id : '-'; }, function (c) { return c.owner ? c.owner.name : '未割り当て'; }),
      byCat: by(function (c) { return c.category; }, function (c) { return catName(c.category); })
    };
  }

  function table(rows) {
    if (!rows.length) return U.empty({ small: 1, text: 'まだ集計できる見積がありません', btn: '見積を作る', href: EE.link ? '#/w' : '#/new' });
    return '<table class="table"><thead><tr><th></th><th class="r">見積した工事</th><th class="r">受注</th><th class="r">受注率</th><th class="r">受注額（税込）</th></tr></thead><tbody>' + rows.map(function (r) {
      return '<tr><td>' + esc(r.label) + '</td><td class="r num">' + r.n + '</td><td class="r num">' + r.won + '</td><td class="r num">' + U.pct(r.n ? r.won / r.n : 0) + '</td><td class="r num">' + U.yen(r.amount) + '</td></tr>';
    }).join('') + '</tbody></table>';
  }

  function render() {
    var C = conversion();
    var html =
      '<div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)">' +
        '<section class="panel" data-st><div class="panel-h"><h2>見積の件数</h2><span class="sub">直近12か月・発行日</span></div><div class="panel-b"><div id="a-trend"></div></div></section>' +
        '<section class="panel kpi" data-st><div class="kpi-label"><span class="kpi-icon">' + I.trend + '</span>受注率</div>' +
          '<div class="kpi-value num" data-count="' + Math.round(C.rate * 1000) / 10 + '" data-format="pct">0</div>' +
          '<div class="kpi-foot">見積を出した工事 ' + C.n + ' 件のうち、受注 ' + C.won + ' 件</div></section>' +
      '</div>' +
      '<section class="panel" data-st style="margin-top:18px"><div class="panel-h"><h2>月別 × 工事種別</h2><span class="sub">直近12か月・書類の発行日で集計</span><div class="spacer"></div>' +
        '<div class="seg" id="a-hm">' + [['count', '件数'], ['amount', '金額']].map(function (x) { return '<button class="' + (HM === x[0] ? 'on' : '') + '" data-hm="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="panel-b heat-wrap"><div id="a-heat"></div><div id="a-heat-sum" class="heat-sum"></div></div>' +
        '<div class="panel-b"><p class="hint" style="margin:0">マスにカーソルを合わせると、その月の件数と合計額が出ます。色が濃いほど多い。</p></div></section>' +
      '<div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-top:18px">' +
        '<section class="panel" data-st><div class="panel-h"><h2>担当者別</h2></div><div class="panel-b table-scroll">' + table(C.byOwner) + '</div></section>' +
        '<section class="panel" data-st><div class="panel-h"><h2>工事種別</h2></div><div class="panel-b table-scroll">' + table(C.byCat) + '</div></section>' +
      '</div>';
    return { title: '分析', crumb: '経営・工事データ', html: html, mount: mount };
  }

  function mount(view) {
    EE.fx.countAll(view);
    var ms = EE.insight.months(12), idx = {}; ms.forEach(function (m, i) { idx[m.key] = i; m.v = 0; });
    EE.S.documents.forEach(function (d) { var i = idx[(d.issueDate || '').slice(0, 7)]; if (i != null) ms[i].v++; });
    EE.charts.area(view.querySelector('#a-trend'), ms.map(function (m) { return { label: m.label, value: m.v }; }), { title: '月ごとの見積の件数', unit: '件数', height: 180 });
    drawHeat(view);
    view.addEventListener('click', function (e) {
      var hm = e.target.closest('[data-hm]');
      if (hm) { HM = hm.dataset.hm; view.querySelectorAll('#a-hm button').forEach(function (b) { b.classList.toggle('on', b === hm); }); drawHeat(view); }
    });
  }

  EE.views = EE.views || {};
  EE.views.analysis = { render: render, heatData: heatData };
})(this);
