/*
 * 経営・会計
 *  - 今月の数字（見積・受注・入金・粗利率）
 *  - 入金率・粗利率・未入金割合のメーター
 *  - 月別の見積額・受注額・入金額（月順・金額順・粗利順・件数順）
 *  - 工事別の粗利（受注した見積で計算）
 * 金額はすべて計算エンジンの結果を足すだけ。請求書・入金消込・実行予算は構想の第5〜6期で追加する。
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var sortKey = 'month';

  function sortedGroups() {
    var ms = EE.insight.monthly(6).map(function (m) { return { key: m.key, label: m.label, values: m.values, count: m.count, profit: m.profit, note: '見積 ' + m.count + '件・粗利 ' + U.yen(m.profit) }; });
    if (sortKey === 'amount') ms.sort(function (a, b) { return b.values.estimate - a.values.estimate; });
    if (sortKey === 'profit') ms.sort(function (a, b) { return b.profit - a.profit; });
    if (sortKey === 'count') ms.sort(function (a, b) { return b.count - a.count; });
    return ms;
  }
  function drawBars(el) {
    EE.charts.bars(el, { title: '月別の見積額・受注額・入金額', groups: sortedGroups(),
      series: [{ key: 'estimate', label: '見積額' }, { key: 'order', label: '受注額' }, { key: 'paid', label: '入金額' }], height: 220 });
  }

  /** 今月の数字（ホームのウィジェットでも使う） */
  function monthStats() {
    var ym = EE.data.today().slice(0, 7), S = EE.S;
    var est = 0, cnt = 0, sub = 0, prof = 0, ordered = 0, paid = 0;
    S.documents.forEach(function (d) {
      if ((d.issueDate || '').slice(0, 7) !== ym) return;
      var r = U.calcDoc(d); est += r.total; cnt++; sub += r.subtotal; prof += r.grossProfit;
    });
    S.projects.forEach(function (p) {
      var d = p.acceptedDocId && U.findDoc(p.acceptedDocId); if (!d) return;
      var t = U.calcDoc(d).total;
      if ((p.orderedOn || '').slice(0, 7) === ym) ordered += t;
      if ((p.paidOn || '').slice(0, 7) === ym) paid += t;
    });
    return { estimate: est, count: cnt, margin: sub ? prof / sub : 0, ordered: ordered, paid: paid };
  }

  function rows() {
    return EE.S.projects.map(function (p) {
      var d = p.acceptedDocId && U.findDoc(p.acceptedDocId); if (!d) return null;
      var r = U.calcDoc(d);
      return { p: p, d: d, total: r.total, sub: r.subtotal, cost: r.costTotal, profit: r.grossProfit, rate: r.marginRate, stage: EE.data.stageIndex(p.stage) };
    }).filter(Boolean).sort(function (a, b) { return (b.p.orderedOn || '').localeCompare(a.p.orderedOn || ''); });
  }

  function render() {
    var M = monthStats(), R = EE.insight.rates(), list = rows(), ST = EE.data.STAGES, minM = EE.S.settings.minMargin || 0;
    function kpi(icon, label, value, fmt, foot) {
      return '<div class="panel kpi" data-st><div class="kpi-label"><span class="kpi-icon">' + icon + '</span>' + label + '</div>' +
        '<div class="kpi-value num" data-count="' + value + '" data-format="' + fmt + '">0</div><div class="kpi-foot">' + foot + '</div></div>';
    }
    var html =
      '<div class="grid kpis">' +
        kpi(I.docs, '今月の見積総額', M.estimate, 'yen', M.count + ' 件（発行日）') +
        kpi(I.check, '今月の受注額', M.ordered, 'yen', '受注した見積の税込') +
        kpi(I.yen, '今月の入金額', M.paid, 'yen', '入金にした工事') +
        kpi(I.chart, '今月の平均粗利率', Math.round(M.margin * 1000) / 10, 'pct', '税抜ベース') +
      '</div>' +
      '<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.7fr);margin-top:18px">' +
        '<section class="panel" data-st><div class="panel-h"><h2>入金と粗利</h2><span class="sub">受注した工事の金額から計算</span></div><div class="panel-b"><div class="rings">' +
          EE.charts.ring(R.paid, '入金率', U.yen(R.paidAmt) + ' / ' + U.yen(R.orderedAmt), '#4a7ff0') +
          EE.charts.ring(R.margin, '粗利率', 'すべての見積（税抜）', '#10a0a4') +
          EE.charts.ring(R.unpaid, '未入金の割合', '請求済みのうち ' + U.yen(R.unpaidAmt), '#a070f0') +
        '</div></div></section>' +
        '<section class="panel" data-st><div class="panel-h"><h2>月別の比較</h2><span class="sub">直近6か月</span><div class="spacer"></div>' +
          '<div class="seg" id="bar-sort">' + [['month', '月順'], ['amount', '金額順'], ['profit', '粗利順'], ['count', '件数順']].map(function (s) { return '<button data-v="' + s[0] + '" class="' + (sortKey === s[0] ? 'on' : '') + '">' + s[1] + '</button>'; }).join('') + '</div></div>' +
          '<div class="panel-b"><div id="bars"></div></div></section>' +
      '</div>' +
      '<section class="panel" data-st style="margin-top:18px"><div class="panel-h"><h2>工事別の粗利</h2><span class="sub">受注した見積で計算（見積上の粗利。実際の原価は第5期の「実績原価」で追加）</span></div>' +
        '<div class="panel-b">' + (list.length ? '<div class="table-scroll"><table class="table"><thead><tr><th>工事</th><th>段階</th><th class="r">受注額（税込）</th><th class="r">原価</th><th class="r">粗利</th><th class="r">粗利率</th></tr></thead><tbody>' +
          list.map(function (x) {
            var low = x.rate != null && x.rate < minM;
            return '<tr class="clickable" data-href="#/site/' + x.p.id + '"><td>' + esc(x.p.name) + '<span class="cell-sub">受注 ' + U.jdate(x.p.orderedOn) + '</span></td>' +
              '<td>' + U.stageBadge(x.stage) + '</td><td class="r num">' + U.yen(x.total) + '</td><td class="r num">' + U.yen(x.cost) + '</td>' +
              '<td class="r num">' + U.yen(x.profit) + '</td><td class="r num"' + (low ? ' style="color:var(--warn)" title="粗利の下限を下回っています"' : '') + '>' + U.pct(x.rate) + '</td></tr>';
          }).join('') + '</tbody></table></div>' : U.empty({ icon: I.yen, text: 'まだ受注した工事がありません', sub: '工事で「受注にする」と、ここに出ます。', btn: '工事の一覧を開く', href: EE.link ? '#/o/list' : '#/sites' })) + '</div></section>' +
      '<p class="hint" data-st style="margin-top:12px">請求書・分割請求・入金消込・支払予定・実行予算は、これから追加します（設定 →「機能ライブラリ」）。</p>';
    return { title: '経営・会計', crumb: '利益・請求・入金', html: html, mount: mount };
  }

  function mount(view) {
    EE.fx.countAll(view);
    drawBars(view.querySelector('#bars'));
    view.querySelectorAll('.ring').forEach(function (r, i) {
      var v = r.querySelector('.ring-val');
      EE.fx.anim(v, [{ strokeDashoffset: r.style.getPropertyValue('--len') }, { strokeDashoffset: r.style.getPropertyValue('--off') }], { duration: 900, delay: 150 + i * 80, fill: 'both' });
    });
    view.addEventListener('click', function (e) {
      var sb = e.target.closest('#bar-sort [data-v]');
      if (sb) { sortKey = sb.dataset.v; sb.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === sb); }); drawBars(view.querySelector('#bars')); }
    });
  }

  EE.views = EE.views || {};
  EE.views.finance = { render: render, monthStats: monthStats, drawBars: drawBars };
})(this);
