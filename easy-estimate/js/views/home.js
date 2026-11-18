/* ホーム：今月の見積の状況と、送る前に確認が必要な書類。分析グラフは作らない */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;

  function render() {
    var S = EE.S;
    var ym = EE.data.today().slice(0, 7);
    var docs = S.documents.slice().sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
    var month = docs.filter(function (d) { return (d.issueDate || '').slice(0, 7) === ym; });
    var sumTotal = 0, sumSub = 0, sumProfit = 0;
    month.forEach(function (d) { var r = U.calcDoc(d); sumTotal += r.total; sumSub += r.subtotal; sumProfit += r.grossProfit; });
    var avgMargin = sumSub ? sumProfit / sumSub * 100 : 0;
    var expiring = docs.filter(function (d) { var x = U.daysFromToday(d.validUntil); return x != null && x >= 0 && x <= 7; });
    var drafts = docs.filter(function (d) { return d.status === 'draft'; });
    var attention = drafts.map(function (d) { return { d: d, s: EE.check.summary(U.checkDoc(d)) }; })
      .filter(function (x) { return x.s.error || x.s.warn; });

    function kpi(icon, label, value, fmt, foot, ratio) {
      return '<div class="panel kpi" data-st><div class="kpi-label"><span class="kpi-icon">' + icon + '</span>' + label + '</div>' +
        '<div class="kpi-value num" data-count="' + value + '" data-format="' + fmt + '">0</div>' +
        '<div class="kpi-foot">' + foot + '</div><div class="spark"><i style="width:' + Math.round(Math.max(0.04, Math.min(1, ratio)) * 100) + '%"></i></div></div>';
    }

    var flow = [['見積', 1], ['修正見積', 1], ['注文書', 0], ['契約書', 0], ['納品・完了報告', 0], ['請求', 0], ['領収書', 0]];

    var html =
      '<div class="toolbar" data-st style="margin-bottom:22px"><div class="grow"><div style="font-size:22px;font-weight:650">' + esc(S.company.name || 'EASY ESTIMATE') + '</div>' +
        '<div class="hint">' + U.jdate(EE.data.today()) + '　金額はマスタと固定の計算エンジンだけで決まります（AIは金額を決めません）</div></div>' +
        '<a class="btn" href="#/settings/items">' + I.box + 'マスタ ' + S.items.length + '件</a>' +
        '<a class="btn primary" href="#/new">' + I.plus + '新しい見積を作る</a></div>' +
      '<div class="grid kpis">' +
        kpi(I.docs, '今月の見積', month.length, 'int', '件（発行日ベース）', month.length / 10) +
        kpi(I.yen, '今月の見積総額', sumTotal, 'yen', '税込の合計', sumTotal / 5000000) +
        kpi(I.chart, '平均粗利率', Math.round(avgMargin * 10) / 10, 'pct', '今月分・税抜ベース', avgMargin / 50) +
        kpi(I.clock, '期限まで7日以内', expiring.length, 'int', '件　フォローの目安', expiring.length / 5) +
      '</div>' +
      '<div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);margin-top:18px">' +
        '<section class="panel" data-st><div class="panel-h"><h2>最近の書類</h2><div class="spacer"></div><a class="btn ghost sm" href="#/docs">すべて見る</a></div>' +
          '<div class="panel-b" style="padding-top:8px">' + (docs.length ? '<table class="table"><tbody>' + docs.slice(0, 6).map(function (d) {
            var c = U.findCustomer(d.customerId) || {};
            return '<tr class="clickable" data-href="#/edit/' + d.id + '" data-st><td><span class="num">' + esc(d.no) + '</span><span class="cell-sub">' + U.jdate(d.issueDate) + '</span></td>' +
              '<td>' + esc(d.title || '（件名なし）') + '<span class="cell-sub">' + esc(c.name || '宛先未設定') + '</span></td>' +
              '<td class="r num">' + U.yen(U.calcDoc(d).total) + '</td><td>' + U.statusBadge(d) + '</td></tr>';
          }).join('') + '</tbody></table>' : '<div class="empty">' + I.docs + 'まだ書類がありません</div>') + '</div></section>' +
        '<section class="panel" data-st><div class="panel-h"><h2>送る前に確認が必要</h2><span class="sub">下書きの送信前チェック</span></div>' +
          '<div class="panel-b"><div class="checks">' + (attention.length ? attention.map(function (x) {
            return '<a class="check ' + (x.s.error ? 'error' : 'warn') + '" href="#/edit/' + x.d.id + '" style="text-decoration:none;color:inherit" data-st>' +
              '<span class="ic">!</span><div><div class="t">' + esc(x.d.title || x.d.no) + '</div><div class="d">' +
              (x.s.error ? '要修正 ' + x.s.error + ' 件　' : '') + (x.s.warn ? '注意 ' + x.s.warn + ' 件' : '') + '</div></div><span class="hint">開く →</span></a>';
          }).join('') : '<div class="check-ok">' + I.check + '<div>下書きはすべてチェックを通過しています</div></div>') + '</div></div></section>' +
      '</div>' +
      '<section class="panel" data-st style="margin-top:18px"><div class="panel-h"><h2>書類の流れ</h2><span class="sub">Phase 1 は見積まで。請求・入金管理は次の段階で追加します</span></div>' +
        '<div class="panel-b" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' + flow.map(function (f, i) {
          return (i ? '<span style="color:var(--dim)">→</span>' : '') + '<span class="badge ' + (f[1] ? 'blue' : '') + '" style="padding:5px 12px;' + (f[1] ? '' : 'opacity:.55') + '">' + f[0] + (f[1] ? '' : '　（予定）') + '</span>';
        }).join('') + '</div></section>';

    return {
      title: 'ホーム', crumb: 'ダッシュボード', html: html,
      mount: function (view) {
        EE.fx.countAll(view);
        view.querySelectorAll('.spark i').forEach(function (el, i) {
          EE.fx.anim(el, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 400, delay: 120 + i * 60 });
        });
      }
    };
  }

  EE.views = EE.views || {};
  EE.views.home = { render: render };
})(this);
