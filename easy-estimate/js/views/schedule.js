/*
 * スケジュール（予定・期限カレンダー）
 * 今あるデータから「いつ何があるか」を集める：見積の有効期限・受注／着工／完了／請求／入金の日。
 * 月のカレンダーと、期限切れ・今後14日の一覧。予定を押すと工事か見積を開く。
 * 工程表・職人の割り当て・作業日報は構想の第4期で追加する。
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var cur = null;   // 表示中の月 'YYYY-MM'

  /** 予定の一覧 [{ date, kind, label, title, href, warn }] */
  function events() {
    var out = [], S = EE.S;
    var STAGE_DATE = [['orderedOn', '受注'], ['startedOn', '着工'], ['doneOn', '完了'], ['invoicedOn', '請求'], ['paidOn', '入金']];
    S.projects.forEach(function (p) {
      STAGE_DATE.forEach(function (x) { if (p[x[0]]) out.push({ date: p[x[0]], kind: 'stage', label: x[1], title: p.name, href: '#/site/' + p.id }); });
    });
    // 見積の有効期限（確定してお客様に出した見積で、まだ受注していないもの。下書きの期限は「期限」として扱わない）
    S.documents.forEach(function (d) {
      if (!d.validUntil || d.status !== 'issued') return;
      var p = d.projectId && U.findProject(d.projectId);
      if (p && EE.data.stageIndex(p.stage || 'estimate') > 0) return;
      out.push({ date: d.validUntil, kind: 'due', label: '見積期限', title: (d.title || d.no || '見積') + (d.patternLabel ? '（' + d.patternLabel + '）' : ''), href: '#/edit/' + d.id, warn: d.validUntil < EE.data.today() });
    });
    return out.sort(function (a, b) { return a.date.localeCompare(b.date); });
  }

  /** 今日・これからの予定（ホームのウィジェットでも使う） */
  function upcoming(days) {
    var t = EE.data.today(), end = EE.data.addDays(t, days == null ? 14 : days);   // 0 は「今日だけ」
    return events().filter(function (e) { return e.date >= t && e.date <= end; });
  }
  function overdue() { var t = EE.data.today(); return events().filter(function (e) { return e.kind === 'due' && e.date < t; }); }

  function item(e) {
    return '<a class="ev ' + e.kind + (e.warn ? ' warn' : '') + '" href="' + e.href + '"><span class="ev-label">' + esc(e.label) + '</span><span class="ev-title">' + esc(e.title) + '</span></a>';
  }

  function calendarHTML(ym, evs) {
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7));
    var first = new Date(y, m - 1, 1), start = first.getDay(), days = new Date(y, m, 0).getDate(), t = EE.data.today();
    var by = {}; evs.forEach(function (e) { (by[e.date] = by[e.date] || []).push(e); });
    var cells = '';
    for (var i = 0; i < start; i++) cells += '<div class="cal-cell out"></div>';
    for (var d = 1; d <= days; d++) {
      var key = ym + '-' + (d < 10 ? '0' : '') + d, list = by[key] || [];
      cells += '<div class="cal-cell' + (key === t ? ' today' : '') + '"><div class="cal-day num">' + d + '</div>' +
        list.slice(0, 3).map(item).join('') + (list.length > 3 ? '<div class="hint">ほか ' + (list.length - 3) + ' 件</div>' : '') + '</div>';
    }
    return '<div class="cal"><div class="cal-head">' + ['日', '月', '火', '水', '木', '金', '土'].map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div><div class="cal-grid">' + cells + '</div></div>';
  }

  function render() {
    var t = EE.data.today(); cur = cur || t.slice(0, 7);
    var evs = events(), up = upcoming(14), od = overdue();
    var y = Number(cur.slice(0, 4)), m = Number(cur.slice(5, 7));
    var html =
      '<div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">' +
        '<section class="panel" data-st><div class="panel-h"><h2>' + y + '年' + m + '月</h2><div class="spacer"></div>' +
          '<button class="btn sm ghost" data-mv="-1" aria-label="前の月">‹ 前の月</button><button class="btn sm ghost" data-mv="0">今月</button><button class="btn sm ghost" data-mv="1" aria-label="次の月">次の月 ›</button></div>' +
          '<div class="panel-b">' + calendarHTML(cur, evs) + '</div></section>' +
        '<div style="display:flex;flex-direction:column;gap:18px;min-width:0">' +
          '<section class="panel" data-st><div class="panel-h"><h2>期限切れ</h2><span class="sub">' + od.length + ' 件</span></div><div class="panel-b ev-list">' +
            (od.length ? od.map(function (e) { return '<div class="ev-row"><span class="num">' + U.jdate(e.date) + '</span>' + item(e) + '</div>'; }).join('') : '<p class="hint">ありません</p>') + '</div></section>' +
          '<section class="panel" data-st><div class="panel-h"><h2>今後14日</h2><span class="sub">' + up.length + ' 件</span></div><div class="panel-b ev-list">' +
            (up.length ? up.map(function (e) { return '<div class="ev-row"><span class="num">' + U.jdate(e.date) + '</span>' + item(e) + '</div>'; }).join('') : '<p class="hint">予定はありません</p>') + '</div></section>' +
        '</div>' +
      '</div>' +
      '<p class="hint" data-st style="margin-top:12px">見積の有効期限と、工事の受注・着工・完了・請求・入金の日を表示しています。工程表・職人の割り当て・作業日報はこれから追加します（設定 →「機能ライブラリ」）。</p>';
    return { title: 'スケジュール', crumb: '工程・人員・予定', html: html, mount: mount };
  }

  function mount(view) {
    view.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mv]'); if (!b) return;
      var n = Number(b.dataset.mv);
      if (!n) cur = EE.data.today().slice(0, 7);
      else { var y = Number(cur.slice(0, 4)), m = Number(cur.slice(5, 7)) - 1 + n; var d = new Date(y, m, 1); cur = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
      EE.app.rerender();
    });
  }

  EE.views = EE.views || {};
  EE.views.schedule = { render: render, events: events, upcoming: upcoming, overdue: overdue };
})(this);
