/*
 * ホーム＝OUMITSU CONTROL（ウィジェット式の操作盤）
 *  - ウィジェットを追加・削除・並べ替え（ドラッグ、または ← → ボタン）・サイズ（小・中・大）・表示/非表示・色と透明度
 *  - 経営者用・営業用・工事用・事務用のホームを最初から用意。名前を付けて保存でき、時間帯で自動的に切り替えられる
 *  - ウィジェットを押すと該当の画面へ直接移動
 *  - 「よく使う機能」は画面を開いた回数から自動で並べる（提案だけ。勝手に配置は変えない）
 * 保存先：EE.S.homes[担当者ID] = { active, auto, layouts: [{ key, name, time, widgets: [{ id, type, size, color, alpha, hidden, metric }] }] }
 * 天気・地図は外部サービスが必要なので、ライブラリに「準備中」として出すだけ。
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var editing = false, clockTimer = null;

  /* ---------- 数字（KPI）の種類 ---------- */
  var METRICS = {
    active: { label: '進行中の工事', icon: 'site', href: '#/sites', fmt: 'int', foot: '受注〜請求の工事' },
    today: { label: '今日の予定', icon: 'calendar', href: '#/schedule', fmt: 'int', foot: '期限・受注・着工など' },
    drafts: { label: '未対応の見積', icon: 'edit', href: '#/docs/draft', fmt: 'int', foot: '下書きのまま' },
    waiting: { label: '回答待ち', icon: 'clock', href: '#/docs/issued', fmt: 'int', foot: '確定して受注前' },
    unpaid: { label: '入金確認待ち', icon: 'yen', href: '#/finance', fmt: 'int', foot: '請求済みの工事' },
    overdue: { label: '期限切れの見積', icon: 'bell', href: '#/schedule', fmt: 'int', foot: '再見積・確認が必要', warn: true },
    monthEst: { label: '今月の見積額', icon: 'docs', href: '#/finance', fmt: 'yen', foot: '発行日ベース・税込' },
    monthOrder: { label: '今月の受注額', icon: 'check', href: '#/finance', fmt: 'yen', foot: '受注した見積・税込' },
    monthPaid: { label: '今月の入金額', icon: 'yen', href: '#/finance', fmt: 'yen', foot: '入金にした工事' },
    margin: { label: '今月の平均粗利率', icon: 'chart', href: '#/finance', fmt: 'pct', foot: '税抜ベース' },
    lowMargin: { label: '粗利の下限割れ', icon: 'bell', href: '#/finance', fmt: 'int', foot: '下書きの見積', warn: true },
    customers: { label: '顧客', icon: 'users', href: '#/clients', fmt: 'int', foot: '登録している顧客' },
    monthBilled: { label: '今月の請求額', icon: 'yen', href: '#/finance', fmt: 'yen', foot: '発行した請求・税込' }
  };
  /* ---------- 月ごとの数字（前月比・小さな折れ線・月別の折れ線） ---------- */
  var MONTHLY = { monthBilled: 'billed', monthOrder: 'order', monthEst: 'estimate', monthPaid: 'paid' };
  function ymAdd(ym, k) { var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1 + k; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + String(m + 1).padStart(2, '0'); }
  function thisYm() { return EE.data.today().slice(0, 7); }
  function monthVal(kind, ym) {
    var S = EE.S, sum = 0;
    if (kind === 'billed') {
      // 請求額：工事の「入金」に入っている請求（請求日がその月）。業務管理が無いときは桜ミツで作った請求書
      var o = linkO(), cs = o && o.cases ? o.cases() : null;
      if (cs) cs.forEach(function (c) { if (c.archived) return; (c.payments || []).forEach(function (p) { if (String(p.billDate || '').slice(0, 7) === ym) sum += Number(p.bill) || 0; }); });
      else (S.invoices || []).forEach(function (v) { if (String(v.issueDate || '').slice(0, 7) === ym) sum += v.amount || 0; });
      return sum;
    }
    if (kind === 'estimate' || kind === 'issued') {
      S.documents.forEach(function (d) { if (kind === 'issued' && d.status !== 'issued') return; if ((d.issueDate || '').slice(0, 7) === ym) sum += U.calcDoc(d).total; });
      return sum;
    }
    S.projects.forEach(function (p) {
      var d = p.acceptedDocId && U.findDoc(p.acceptedDocId); if (!d) return;
      if (((kind === 'order' ? p.orderedOn : p.paidOn) || '').slice(0, 7) === ym) sum += U.calcDoc(d).total;
    });
    return sum;
  }
  function series(kind, n) { var ym = thisYm(), out = []; for (var i = n - 1; i >= 0; i--) { var k = ymAdd(ym, -i); out.push({ ym: k, label: Number(k.slice(5)) + '月', value: monthVal(kind, k) }); } return out; }
  /** 前月比のバッジ：良い変化＝ミント緑、悪い変化＝淡い赤のピル（原色は使わない） */
  function deltaHTML(v, prev, fmt) {
    if (!prev && !v) return '<span class="delta flat">先月も ' + EE.fx.fmt(0, fmt) + '</span>';
    if (!prev) return '<span class="delta up">先月 ' + EE.fx.fmt(0, fmt) + ' から</span>';
    var pc = Math.round((v - prev) / Math.abs(prev) * 100);
    if (pc === 0) return '<span class="delta flat">先月と同じ</span>';
    return '<span class="delta ' + (pc > 0 ? 'up' : 'down') + '" title="先月 ' + EE.fx.fmt(prev, fmt) + '">' + (pc > 0 ? '↑ ' : '↓ ') + Math.abs(pc) + '%<small>先月比</small></span>';
  }
  /** 小さな折れ線（直近6か月）。線だけ、ほのかに光らせる */
  function sparkHTML(pts) {
    var W = 320, H = 96, max = Math.max(1, Math.max.apply(null, pts.map(function (p) { return p.value; })));
    var x = function (i) { return 2 + i * (W - 4) / Math.max(1, pts.length - 1); }, y = function (v) { return H - 4 - v / max * (H - 10); };
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p.value).toFixed(1); }).join('');
    return '<svg class="kpi-spark" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="直近' + pts.length + 'か月の推移：' + pts.map(function (p) { return p.label + ' ' + EE.fx.fmt(p.value, 'yen'); }).join('、') + '">' +
      '<path class="spark-line" d="' + d + '" pathLength="1"/><circle class="spark-dot" cx="' + x(pts.length - 1).toFixed(1) + '" cy="' + y(pts[pts.length - 1].value).toFixed(1) + '" r="3"/></svg>';
  }
  function metricValue(key) {
    var S = EE.S, cs = EE.insight.cases(), M = EE.views.finance.monthStats(), minM = S.settings.minMargin || 0;
    switch (key) {
      case 'active': return cs.filter(function (c) { return c.project.id && c.stage >= 1 && c.stage <= 4; }).length;
      case 'today': return EE.views.schedule.upcoming(0).length;
      case 'drafts': return S.documents.filter(function (d) { return d.status !== 'issued'; }).length;
      case 'waiting': return S.documents.filter(function (d) { var p = d.projectId && U.findProject(d.projectId); return d.status === 'issued' && (!p || EE.data.stageIndex(p.stage || 'estimate') === 0); }).length;
      case 'unpaid': return S.projects.filter(function (p) { return p.stage === 'invoice'; }).length;
      case 'overdue': return EE.views.schedule.overdue().length;
      case 'monthEst': return M.estimate;
      case 'monthOrder': return M.ordered;
      case 'monthPaid': return M.paid;
      case 'margin': return Math.round(M.margin * 1000) / 10;
      case 'lowMargin': return S.documents.filter(function (d) { if (d.status === 'issued') return false; var r = U.calcDoc(d); return r.subtotal > 0 && r.marginRate < minM; }).length;
      case 'customers': return S.customers.length;
      case 'monthBilled': return monthVal('billed', thisYm());
    }
    return 0;
  }

  /* ---------- ウィジェットの種類 ---------- */
  // cat：ライブラリでの分類、sizes：選べる大きさ（s=小 m=中 l=大）
  var TYPES = {
    clock: { name: '時計・日付・次の予定', cat: '時間', sizes: ['m', 'l', 's'], icon: 'clock', href: '#/schedule' },
    kpi: { name: '数字', cat: '業務', sizes: ['s', 'm'], icon: 'chart', metric: true },
    todo: { name: '今日やること', cat: '業務', sizes: ['m', 'l'], icon: 'check', href: '#/sites' },
    quick: { name: 'クイック操作', cat: 'お気に入り', sizes: ['m', 'l'], icon: 'grid' },
    events: { name: '今後の予定', cat: '時間', sizes: ['m', 'l'], icon: 'calendar', href: '#/schedule' },
    flow: { name: '工事フロー', cat: '工事', sizes: ['l', 'm'], icon: 'site', href: '#/sites' },
    bars: { name: '月別の見積・受注・入金', cat: 'お金', sizes: ['l', 'm'], icon: 'trend', href: '#/finance' },
    rings: { name: '入金と粗利', cat: 'お金', sizes: ['m', 'l'], icon: 'yen', href: '#/finance' },
    recent: { name: '最近の書類', cat: '見積', sizes: ['m', 'l'], icon: 'docs', href: '#/docs' },
    attention: { name: '注意（要修正・期限切れ）', cat: '注意', sizes: ['m', 'l'], icon: 'bell', href: '#/docs/draft' },
    members: { name: '担当者のファイル', cat: '人員', sizes: ['l', 'm'], icon: 'users' },
    favorites: { name: 'お気に入りの工事', cat: 'お気に入り', sizes: ['m', 's', 'l'], icon: 'star', href: '#/sites' },
    usage: { name: 'よく使う機能', cat: 'お気に入り', sizes: ['m', 's'], icon: 'spark' },
    trend: { name: '月別の見積の発行額', cat: 'お金', sizes: ['s', 'm', 'l'], icon: 'trend', href: '#/docs/issued' },
    // 桜ミツ版（業務管理の機能を入れたもの）だけ
    today: { name: '今日のボード（工事・現調・予定）', cat: '時間', sizes: ['m', 'l', 's'], icon: 'calendar', href: '#/o/cal', link: true }
  };
  function linkO() { try { var f = root.OUBI_LINK && root.OUBI_LINK.frame(); return f && f.contentWindow && f.contentWindow.OUBI; } catch (e) { return null; } }
  var PLANNED_WIDGETS = [['天気・雨予報', '天候', '外部の天気サービスとの連携が必要（第9期）'], ['地図・訪問ルート', '工事', '地図サービスとの連携が必要（第9期）'],
    ['発注・納品待ち', '発注', '資材・発注の機能と一緒に追加（第4期）'], ['出勤状況・作業予定', '人員', '工程・人員の機能と一緒に追加（第4期）']];
  var COLORS = { blue: ['青', '#3b82f6'], teal: ['青緑', '#14b8a6'], violet: ['紫', '#8b5cf6'], amber: ['琥珀', '#f59e0b'], rose: ['桜', '#f472b6'], slate: ['灰', '#94a3b8'] };

  /* ---------- 役割別の初期ホーム ---------- */
  var n = 0; function w(type, size, extra) { n++; return Object.assign({ id: 'w' + n + Math.random().toString(36).slice(2, 6), type: type, size: size, color: 'blue', alpha: 70, hidden: false }, extra || {}); }
  function preset(role) {
    switch (role) {
      // 桜ミツ版の標準：今日のこと → 数字 → やること → 書類・流れ・お金
      // 桜ミツ版：1画面（1920×1080）に収まる3段。1段目 時計・今日・数字2つ／2段目 数字2つ・今日やること／3段目 最近の見積・工事の流れ
      // 桜ミツ版：はじめに出すのは6つだけ（1段目 数字3つ／2段目 今日のボード・今日やること・最近の見積）。ほかは「並べ替え・追加」から
      // 2026-11-26：主役は「今月の請求額」1つ（大きく・前月比・直近6か月の小さな折れ線）。残りの数字は小さく＋前月比。下段に月別の折れ線
      case 'link': return [w('kpi', 'm', { metric: 'monthBilled', hero: true }), w('kpi', 's', { metric: 'monthOrder' }), w('kpi', 's', { metric: 'monthEst' }),
        w('trend', 's', { range: 6 }), w('todo', 's'), w('recent', 's')];
      case 'sales': return [w('clock', 'm'), w('kpi', 's', { metric: 'drafts' }), w('kpi', 's', { metric: 'waiting', color: 'violet' }), w('todo', 'm'), w('quick', 'm'), w('recent', 'l'), w('kpi', 's', { metric: 'overdue', color: 'amber' }), w('kpi', 's', { metric: 'customers', color: 'teal' }), w('usage', 'm')];
      case 'site': return [w('clock', 'm'), w('kpi', 's', { metric: 'active', color: 'teal' }), w('kpi', 's', { metric: 'today' }), w('todo', 'm'), w('quick', 'm'), w('events', 'l'), w('favorites', 'm')];
      case 'office': return [w('clock', 'm'), w('kpi', 's', { metric: 'unpaid', color: 'violet' }), w('kpi', 's', { metric: 'waiting' }), w('attention', 'm'), w('quick', 'm'), w('recent', 'l'), w('members', 'l')];
      default: return [w('clock', 'm'), w('kpi', 's', { metric: 'active', color: 'teal' }), w('kpi', 's', { metric: 'today' }), w('kpi', 's', { metric: 'drafts', color: 'violet' }), w('kpi', 's', { metric: 'unpaid', color: 'amber' }),
        w('todo', 'm'), w('quick', 'm'), w('flow', 'l'), w('rings', 'm'), w('kpi', 's', { metric: 'monthOrder' }), w('kpi', 's', { metric: 'margin', color: 'teal' }), w('bars', 'l'), w('members', 'l')];
    }
  }
  var ROLE_NAMES = { owner: '経営者用', sales: '営業用', site: '工事用', office: '事務用' };
  var TIMES = { '': '指定なし', morning: '朝（5〜11時）', day: '昼（11〜17時）', night: '夜（17〜5時）' };
  function timeNow() { var h = new Date().getHours(); return h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 17 ? 'day' : 'night'; }
  function roleOf(m) { var r = (m && m.role) || ''; return /営業/.test(r) ? 'sales' : /工事|職人|工事/.test(r) ? 'site' : /事務|経理/.test(r) ? 'office' : 'owner'; }

  function home() {
    var S = EE.S, me = U.me(); S.homes = S.homes || {};
    var h = S.homes[me.id];
    // 桜ミツ版：ホームは標準の1型だけ（役割の型・時間帯の切り替えは出さない。並べ替え・追加は「ホームを並べ替え」から）
    if (EE.link) {
      if (!h || !h.layouts.some(function (l) { return l.key === 'main'; })) {
        h = S.homes[me.id] = { active: 'main', auto: false, layouts: [{ key: 'main', name: 'ホーム', time: '', widgets: preset('link') }] };
        U.commit();
      }
      h.active = 'main'; h.auto = false;
      // 前の標準（縦に長い並び）のままなら、1画面に収まる新しい標準へ
      var mainL = h.layouts.filter(function (l) { return l.key === 'main'; })[0];
      var was = mainL && mainL.widgets.map(function (x) { return x.type; }).join(',');
      var wasM = mainL && mainL.widgets.map(function (x) { return x.type + (x.metric ? ':' + x.metric : ''); }).join(',');
      if (was === 'clock,today,kpi,kpi,kpi,kpi,todo,recent,flow,bars' || was === 'clock,today,kpi,kpi,kpi,kpi,todo,recent,flow' ||
          wasM === 'kpi:monthOrder,kpi:drafts,kpi:active,today,todo,recent') { mainL.widgets = preset('link'); U.commit(); }   // 前の標準のままなら、新しい標準へ
      return h;
    }
    if (!h) {
      h = S.homes[me.id] = { active: roleOf(me), auto: false, layouts: Object.keys(ROLE_NAMES).map(function (k) { return { key: k, name: ROLE_NAMES[k], time: '', widgets: preset(k) }; }) };
      U.commit();
    }
    return h;
  }
  function layout() {
    var h = home();
    if (h.auto) { var t = timeNow(), hit = h.layouts.filter(function (l) { return l.time === t; })[0]; if (hit) return hit; }
    return h.layouts.filter(function (l) { return l.key === h.active; })[0] || h.layouts[0];
  }

  /* ---------- 使った回数（よく使う機能） ---------- */
  var ROUTE_NAMES = { home: 'ホーム', clients: '顧客', sites: '工事', site: '工事ワークスペース', new: '見積を作る', edit: '見積の編集', schedule: 'スケジュール', finance: '経営・会計', docs: '書類', analysis: '分析', settings: '設定' };
  var ROUTE_HREF = { clients: '#/clients', sites: '#/sites', new: '#/new', schedule: '#/schedule', finance: '#/finance', docs: '#/docs', analysis: '#/analysis', settings: '#/settings/items' };
  function track(hash) {
    var k = (hash || '').replace(/^#\/?/, '').split(/[/?]/)[0] || 'home';
    if (!ROUTE_HREF[k]) return;
    var ui = EE.features.settings(); ui.usage = ui.usage || {}; ui.usage[k] = (ui.usage[k] || 0) + 1;
  }
  function topUsed(n) {
    var u = (EE.features.settings().usage) || {};
    return Object.keys(u).sort(function (a, b) { return u[b] - u[a]; }).slice(0, n).map(function (k) { return { key: k, name: ROUTE_NAMES[k], href: ROUTE_HREF[k], n: u[k] }; });
  }

  /* ---------- 各ウィジェットの中身 ---------- */
  function greet() { var h = new Date().getHours(); return h < 5 ? 'お疲れさまです' : h < 11 ? 'おはようございます' : h < 17 ? 'こんにちは' : 'お疲れさまです'; }
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  function body(wd) {
    var S = EE.S;
    switch (wd.type) {
      case 'clock': {
        var d = new Date(), next = EE.views.schedule.upcoming(30)[0];
        return '<div class="w-clock"><div class="w-date">' + (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WD[d.getDay()] + '）</div>' +
          '<div class="w-time num" data-clock>' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + '</div>' +
          '<div class="w-greet">' + greet() + '、' + esc(U.me().name) + 'さん</div>' +
          (next ? '<a class="w-next" href="' + next.href + '"><span class="label">次の予定</span><span>' + U.jdate(next.date) + '　' + esc(next.label) + '・' + esc(next.title) + '</span></a>' : '<a class="w-next" href="' + (EE.link ? '#/o/cal' : '#/schedule') + '"><span class="label">次の予定</span><span>まだありません　予定を開く ›</span></a>') + '</div>';
      }
      case 'kpi': {
        var m = METRICS[wd.metric] || METRICS.active, v = metricValue(wd.metric), mk = MONTHLY[wd.metric];
        var prev = mk ? monthVal(mk, ymAdd(thisYm(), -1)) : 0, hero = wd.hero && mk;
        // 今月の数字：開いた瞬間に 0 → 実数へ 0.8秒（止まる瞬間に小さく弾む）。今月の数字以外は今までどおり
        var cnt = mk ? ' data-count-ms="' + (hero ? 900 : 700) + '" data-bounce' : '';
        var flag = hero && v > prev && prev > 0 ? '<span class="beat-flag" title="先月 ' + EE.fx.fmt(prev, m.fmt) + '">' + I.flag + '先月超え</span>' : '';
        return '<a class="w-kpi' + (m.warn && v ? ' warn' : '') + (hero ? ' hero' : '') + '" href="' + m.href + '"><div class="w-kpi-label">' + I[m.icon] + esc(m.label) + flag + '</div>' +
          '<div class="w-kpi-row"><div class="w-kpi-value num" data-count="' + v + '" data-count-key="home-' + wd.metric + '" data-format="' + m.fmt + '"' + cnt + '>' + EE.fx.fmt(0, m.fmt) + '</div>' + (hero ? sparkHTML(series(mk, 6)) : '') + '</div>' +
          '<div class="w-kpi-foot">' + (mk ? deltaHTML(v, prev, m.fmt) : '') + '<span>' + esc(m.foot) + '</span></div></a>';
      }
      case 'trend': {
        var rg = wd.range === 12 ? 12 : 6;
        return '<div class="w-trend"><div class="seg sm trend-seg" role="group" aria-label="期間">' + [6, 12].map(function (k) { return '<button type="button" data-trend-range="' + k + '" class="' + (rg === k ? 'on' : '') + '" aria-pressed="' + (rg === k) + '">' + k + 'か月</button>'; }).join('') + '</div>' +
          '<div class="trend-chart" data-trend="' + rg + '"></div></div>';
      }
      case 'todo': {
        var items = EE.link && EE.linkTodo ? EE.linkTodo() : [];   // 桜ミツ版：期限が近い見積・入金待ち・バックアップ
        EE.views.schedule.overdue().slice(0, 3).forEach(function (e) {
          if (items.some(function (x) { return x.href === e.href; })) return;   // 同じ見積を2回出さない
          var dd = U.findDoc((e.href.match(/#\/edit\/(.+)$/) || [])[1]);
          items.push({ warn: true, alert: true, t: e.title, s: '有効期限切れ（' + U.jdate(e.date) + '）' + (dd ? '・' + U.yen(U.calcDoc(dd).total) : ''), href: e.href });
        });
        EE.views.schedule.upcoming(0).forEach(function (e) { items.push({ t: e.title, s: '今日・' + e.label, href: e.href }); });
        EE.insight.cases().filter(function (c) { return c.project.id && c.stage < 5; }).sort(function (a, b) { return (b.warn ? 1 : 0) - (a.warn ? 1 : 0); }).slice(0, 6).forEach(function (c) {
          items.push({ warn: c.warn, t: c.project.name, s: c.next, href: '#/site/' + c.project.id });
        });
        items = items.slice(0, wd.size === 'l' ? 8 : 5);
        return '<div class="w-list">' + (items.length ? items.map(function (x) {
          return '<a class="w-item' + (x.alert ? ' alert' : x.warn ? ' warn' : '') + '" href="' + x.href + '"><span class="w-dot"></span><span><b>' + esc(x.t) + '</b><small>' + esc(x.s) + '</small></span></a>';
        }).join('') : U.empty({ small: 1, text: '今日やることはありません', btn: '工事の一覧を開く', href: EE.link ? '#/o/list' : '#/sites' })) + '</div>';
      }
      case 'quick': {
        var Q = [['見積', '#/new', 'calc'], ['顧客', '#/clients', 'users'], ['工事', '#/sites', 'site'], ['予定', '#/schedule', 'calendar'], ['計算式', '#/settings/formulas', 'calc'], ['書類', '#/docs', 'docs'], ['検索', '#palette', 'search'], ['その他', '#/settings/features', 'grid']];
        return '<div class="w-quick">' + Q.map(function (q) { return '<a href="' + q[1] + '"' + (q[1] === '#palette' ? ' data-palette' : '') + '>' + I[q[2]] + '<span>' + q[0] + '</span></a>'; }).join('') + '</div>';
      }
      case 'events': {
        var ev = EE.views.schedule.upcoming(14).slice(0, wd.size === 'l' ? 8 : 5);
        return '<div class="w-list">' + (ev.length ? ev.map(function (e) { return '<a class="w-item' + (e.warn ? ' warn' : '') + '" href="' + e.href + '"><span class="w-date-chip num">' + e.date.slice(5).replace('-', '/') + '</span><span><b>' + esc(e.title) + '</b><small>' + esc(e.label) + '</small></span></a>'; }).join('') : U.empty({ small: 1, text: '今後14日の予定はまだありません', btn: '予定を開く', href: EE.link ? '#/o/cal' : '#/schedule' })) + '</div>';
      }
      case 'flow': return '<div class="w-flow" data-go="#/sites">' + EE.views.sites.flowSVG(EE.views.sites.filteredCases()) + '</div>';
      case 'bars': return '<div class="w-bars" data-bars></div>';
      case 'rings': {
        var R = EE.insight.rates();
        return '<div class="rings w-rings">' + EE.charts.ring(R.paid, '入金率', U.yen(R.paidAmt), '#4a7ff0') + EE.charts.ring(R.margin, '粗利率', '見積（税抜）', '#10a0a4') + EE.charts.ring(R.unpaid, '未入金', U.yen(R.unpaidAmt), '#a070f0') + '</div>';
      }
      case 'recent': {
        var docs = S.documents.slice().sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); }).slice(0, wd.size === 'l' ? 6 : 4);
        return '<div class="w-list">' + (docs.length ? docs.map(function (d) { var c = U.docCustomer(d);
          return '<a class="w-item" href="#/edit/' + d.id + '"><span class="w-dot"></span><span><b>' + esc(d.title || '（件名なし）') + '</b><small>' + esc(c.name || '宛先未設定') + '　' + U.yen(U.calcDoc(d).total) + '</small></span>' + U.statusBadge(d) + '</a>'; }).join('') : U.empty({ small: 1, text: 'まだ見積がありません', btn: '見積を作る', href: EE.link ? '#/w' : '#/new' })) + '</div>';
      }
      case 'attention': {
        var at = S.documents.filter(function (d) { return d.status !== 'issued'; }).map(function (d) { return { d: d, s: EE.check.summary(U.checkDoc(d)) }; }).filter(function (x) { return x.s.error || x.s.warn; }).slice(0, 5);
        return '<div class="w-list">' + (at.length ? at.map(function (x) {
          return '<a class="w-item' + (x.s.error ? ' warn' : '') + '" href="#/edit/' + x.d.id + '"><span class="w-dot"></span><span><b>' + esc(x.d.title || '（件名なし）') + '</b><small>' + (x.s.error ? '要修正 ' + x.s.error + ' 件　' : '') + (x.s.warn ? '注意 ' + x.s.warn + ' 件' : '') + '</small></span></a>';
        }).join('') : '<div class="check-ok">' + I.check + '<div>下書きはすべてチェックを通過しています</div></div>') + '</div>';
      }
      case 'members': return '<div class="w-members">' + EE.views.folders.homeSection().replace(/data-st/g, '') + '</div>';
      case 'favorites': {
        var pins = (EE.features.settings().pins || []).map(function (id) { return U.findProject(id); }).filter(Boolean);
        return '<div class="w-list">' + (pins.length ? pins.map(function (p) { return '<a class="w-item" href="#/site/' + p.id + '">' + I.star + '<span><b>' + esc(p.name) + '</b><small>' + esc((EE.data.STAGES[EE.data.stageIndex(p.stage || 'estimate')] || {}).label || '') + '</small></span></a>'; }).join('') :
          '<p class="hint">工事ワークスペースの ☆ を押すと、ここに並びます</p>') + '</div>';
      }
      case 'today': {
        var o = linkO(), c = o && o.todayCounts ? o.todayCounts() : null;
        if (!c) return '<p class="hint">読み込んでいます…</p>';
        var cell = function (l, v, h) { return '<a class="w-item" href="' + h + '"><span class="w-dot"></span><span><b>' + l + '</b><small>今日</small></span><b class="num" style="margin-left:auto;font-size:22px">' + v + '</b></a>'; };
        return '<div class="w-list">' + cell('工事', c.work, '#/o/cal') + cell('現地調査', c.sv, '#/o/cal') + cell('予定（ホワイトボード）', c.wb, '#/o/wb') + '</div>';
      }
      case 'usage': {
        var top = topUsed(wd.size === 's' ? 3 : 6);
        return '<div class="w-list">' + (top.length ? top.map(function (x) { return '<a class="w-item" href="' + x.href + '"><span class="w-dot"></span><span><b>' + esc(x.name) + '</b><small>' + x.n + ' 回</small></span></a>'; }).join('') : '<p class="hint">使うほど、よく開く画面がここに並びます</p>') + '</div>';
      }
    }
    return '';
  }

  function widgetHTML(wd, i, n) {
    var T = TYPES[wd.type]; if (!T) return '';
    var col = (COLORS[wd.color] || COLORS.blue)[1];
    var title = wd.type === 'kpi' ? '' : '<div class="w-head">' + (T.href ? '<a href="' + T.href + '" class="w-title">' + I[T.icon] + esc(T.name) + '</a>' : '<span class="w-title">' + I[T.icon] + esc(T.name) + '</span>') + '</div>';
    var ctl = editing ? '<div class="w-ctl" role="toolbar" aria-label="' + esc(T.name) + 'の編集">' +
      '<span class="w-handle" title="ドラッグで移動" aria-hidden="true">' + I.drag + '</span>' +
      '<button type="button" data-w="left" aria-label="前へ移動"' + (i === 0 ? ' disabled' : '') + '>‹</button><button type="button" data-w="right" aria-label="後ろへ移動"' + (i === n - 1 ? ' disabled' : '') + '>›</button>' +
      T.sizes.slice().sort().reverse().map(function (s) { return '<button type="button" data-w="size" data-v="' + s + '" class="' + (wd.size === s ? 'on' : '') + '" aria-label="大きさ ' + { s: '小', m: '中', l: '大' }[s] + '">' + { s: '小', m: '中', l: '大' }[s] + '</button>'; }).join('') +
      '<button type="button" data-w="opts" aria-label="色・透明度' + (T.metric ? '・数字の種類' : '') + '">' + I.gear + '</button>' +
      '<button type="button" data-w="hide" aria-label="' + (wd.hidden ? '表示する' : '隠す') + '" aria-pressed="' + (wd.hidden ? 'true' : 'false') + '">' + I.eye + '</button>' +
      '<button type="button" data-w="del" aria-label="削除">' + I.x + '</button></div>' : '';
    return '<section class="widget size-' + wd.size + (wd.hidden ? ' is-hidden' : '') + '" data-wid="' + wd.id + '" data-type="' + wd.type + '"' + (wd.hero ? ' data-hero' : '') + ' style="--w-accent:' + col + ';--w-alpha:' + (wd.alpha / 100) + '"' +
      (editing ? ' draggable="true"' : '') + ' data-st>' + ctl + title + '<div class="w-body">' + body(wd) + '</div></section>';
  }

  /* 桜ミツ版：ホームの一番上に、よく使う3つのボタン（主役は見積を作る） */
  function launchHTML() {
    var o = linkO(), c = o && o.todayCounts ? o.todayCounts() : { work: 0, sv: 0 }, nToday = (c.work || 0) + (c.sv || 0);
    var A = {
      site: ['site', '#/o/new', I.site, '工事を登録する', '名前だけでOK', '工事を登録'],
      est: ['est', '#/w', I.calc, '見積を作る', '「次へ」で進むだけ', '見積を作る'],
      cal: ['cal', '#/o/cal', I.calendar, '今日の予定を見る', '今日 ' + nToday + ' 件', '今日の予定']
    };
    // 主役は「見積を作る」1つ（パソコンもスマホも）。残りの2つは普通の大きさのボタン（営業の機能はなくした）
    var main = 'est', rest = ['site', 'cal'];
    var m = A[main];
    return '<nav class="launch" aria-label="よく使うこと" data-st>' +
      '<a class="launch-tile lt-main lt-' + m[0] + '" href="' + m[1] + '"><span class="lt-ic">' + m[2] + '</span><span class="lt-tx"><b>' + m[3] + '</b><small>' + esc(m[4]) + '</small></span><span class="lt-go" aria-hidden="true">›</span></a>' +
      '<div class="launch-sub">' + rest.map(function (k) { var x = A[k]; return '<a class="btn launch-btn2 lt-' + x[0] + '" href="' + x[1] + '" title="' + esc(x[4]) + '">' + x[2] + '<span class="lb-l">' + x[3] + '</span><span class="lb-s" aria-hidden="true">' + x[5] + '</span></a>'; }).join('') + '</div></nav>';
  }

  function setupHTML() {
    if (EE.link) return (EE.linkNameBanner ? EE.linkNameBanner() : '') + (EE.linkBackupBanner ? EE.linkBackupBanner() : '');   // 桜ミツ版：名前がまだ無いときだけ「名前を入れてください」
    if (EE.host) return '';   // 業務管理の中では、自社情報・顧客は業務管理の設定と工事から入る
    var S = EE.S, steps = [
      [!!(S.company.name && S.company.address), '自社情報（会社名・住所・登録番号）を入れる', '#/settings/company', '見積書に載ります'],
      [S.customers.length > 0, '顧客を登録する', '#/clients', '宛先として選べるようになります'],
      [S.documents.length > 0, '最初の見積を作る', '#/new', '文章からでも、マスタから選んでも作れます']
    ];
    if (steps.every(function (x) { return x[0]; })) return '';
    return '<section class="panel setup" data-st style="margin-bottom:18px"><div class="panel-h"><h2>はじめに</h2><span class="sub">3つそろえると見積を送れます</span></div><div class="panel-b"><ol class="setup-list">' +
      steps.map(function (x) { return '<li class="' + (x[0] ? 'done' : '') + '"><span class="setup-mark" aria-hidden="true">' + (x[0] ? I.check : '') + '</span>' + (x[0] ? '<span>' + x[1] + '<span class="sr-only">（済み）</span></span>' : '<a href="' + x[2] + '">' + x[1] + '</a>') + '<span class="hint">' + x[3] + '</span></li>'; }).join('') + '</ol></div></section>';
  }

  function render() {
    if (/[?&]edit/.test(location.hash)) editing = true;
    var h = home(), L = layout(), ws = L.widgets.filter(function (x) { return (editing || !x.hidden) && TYPES[x.type]; });   // なくした種類（営業に出る など）は出さない
    var bar = '<div class="control-bar" data-st>' +
      '<div class="grow"><div class="hint">' + esc(EE.S.company.name || '桜ミツ') + '　金額はマスタと固定の計算エンジンだけで決まります（AIは使いません）</div></div>' +
      (EE.link ? '' : '<label class="hint" for="home-layout">ホーム</label><select class="input" id="home-layout" style="width:auto">' + h.layouts.map(function (l) { return U.opt(l.key, l.name + (l.time ? '（' + TIMES[l.time].replace(/（.*/, '') + '）' : ''), L.key); }).join('') + '</select>') +
      (editing ? '<button class="btn" data-act="w-add">' + I.plus + 'ウィジェットを追加</button>' + (EE.link ? '<button class="btn ghost" data-act="w-reset">' + I.refresh + '標準に戻す</button>' : '<button class="btn" data-act="w-more">' + I.gear + 'このホーム</button>') + '<button class="btn primary" data-act="w-done">' + I.check + '完了</button>'
        : (EE.link ? '<button class="btn ghost sm" data-act="w-edit">' + I.grid + '並べ替え・追加</button>' : '<button class="btn" data-act="w-edit">' + I.grid + 'ホームを編集</button>')) + '</div>';
    var hint = editing ? '<p class="hint control-hint" data-st>ウィジェットをドラッグするか ‹ › で並べ替え、小・中・大で大きさ、目のボタンで表示／非表示、歯車で色・透明度を変えられます。変更はすぐ保存されます。</p>' : '';
    var auto = h.auto ? '<p class="hint" data-st style="margin:-6px 0 12px">時間帯で切り替え中：いまは「' + esc(L.name) + '」</p>' : '';
    var html = setupHTML() + (EE.link && !editing && EE.plus ? EE.plus.nextHTML() : '') + (EE.link && !editing ? launchHTML() : '') + bar + hint + auto + '<div class="widgets' + (editing ? ' editing' : '') + '" id="widgets">' + ws.map(function (x, i) { return widgetHTML(x, i, ws.length); }).join('') + '</div>' +
      (ws.length ? '' : '<div class="empty">' + I.grid + 'ウィジェットがありません。「ホームを編集」→「ウィジェットを追加」で置けます</div>');
    return { title: 'ホーム', crumb: 'OUMITSU CONTROL', html: html, mount: mount };
  }

  function save() { U.commit(); }
  function find(id) { var L = layout(); for (var i = 0; i < L.widgets.length; i++) if (L.widgets[i].id === id) return { L: L, i: i, w: L.widgets[i] }; return null; }
  function rerender() { EE.app.rerender(); }
  function flip(movedId) {
    var before = {};
    document.querySelectorAll('[data-wid]').forEach(function (el) { before[el.dataset.wid] = el.getBoundingClientRect(); });
    rerender();
    document.querySelectorAll('[data-wid]').forEach(function (el) {
      var b = before[el.dataset.wid]; if (!b) return; var a = el.getBoundingClientRect(), dx = b.left - a.left, dy = b.top - a.top;
      if (!dx && !dy) return;
      EE.fx.anim(el, el.dataset.wid === movedId
        ? [{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.02)' }, { transform: 'scale(1.02)', offset: .8 }, { transform: 'none' }]   // 動かしたパネルは浮いたまま運ばれ、最後にカチッと収まる
        : [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: EE.fx.T.change, fill: 'none' });
    });
  }

  function library() {
    var cats = {};
    Object.keys(TYPES).forEach(function (k) { var t = TYPES[k]; if (t.link && !EE.link) return; (cats[t.cat] = cats[t.cat] || []).push(k); });
    var mt = Object.keys(METRICS);
    U.modal({
      title: 'ウィジェットを追加', wide: true,
      body: '<div class="w-lib">' + Object.keys(cats).map(function (c) {
        return '<div class="w-lib-cat"><div class="label">' + esc(c) + '</div>' + cats[c].map(function (k) {
          var t = TYPES[k];
          if (k === 'kpi') return mt.map(function (m) { return '<button class="w-lib-item" data-add="kpi" data-metric="' + m + '">' + I[METRICS[m].icon] + '<span>数字：' + esc(METRICS[m].label) + '</span></button>'; }).join('');
          return '<button class="w-lib-item" data-add="' + k + '">' + I[t.icon] + '<span>' + esc(t.name) + '</span></button>';
        }).join('') + '</div>';
      }).join('') +
      '<div class="w-lib-cat"><div class="label">準備中</div>' + PLANNED_WIDGETS.map(function (p) { return '<div class="w-lib-item disabled" title="' + esc(p[2]) + '"><span>' + esc(p[0]) + '</span><small>' + esc(p[2]) + '</small></div>'; }).join('') + '</div></div>',
      onMount: function (el, api) {
        el.addEventListener('click', function (e) {
          var b = e.target.closest('[data-add]'); if (!b) return;
          var t = TYPES[b.dataset.add], L = layout();
          L.widgets.push(w(b.dataset.add, t.sizes[0], b.dataset.metric ? { metric: b.dataset.metric } : {}));
          save(); api.close(); EE.fx.toast('「' + (b.dataset.metric ? METRICS[b.dataset.metric].label : t.name) + '」を追加しました'); rerender();
        });
      }
    });
  }

  function options(id) {
    var f = find(id); if (!f) return; var wd = f.w, T = TYPES[wd.type];
    U.modal({
      title: T.name + 'の設定',
      body: (T.metric ? '<div class="field"><label for="wo-metric">表示する数字</label><select class="input" id="wo-metric">' + Object.keys(METRICS).map(function (m) { return U.opt(m, METRICS[m].label, wd.metric); }).join('') + '</select></div>' : '') +
        '<div class="field" style="margin-top:12px"><span class="label">色</span><div class="w-colors" role="radiogroup" aria-label="色">' + Object.keys(COLORS).map(function (c) {
          return '<button type="button" role="radio" aria-checked="' + (wd.color === c) + '" data-color="' + c + '" class="' + (wd.color === c ? 'on' : '') + '" style="--c:' + COLORS[c][1] + '" aria-label="' + COLORS[c][0] + '"></button>'; }).join('') + '</div></div>' +
        '<div class="field" style="margin-top:12px"><label for="wo-alpha">透明度（不透明さ）<span class="num" id="wo-alpha-v">' + wd.alpha + '%</span></label><input type="range" id="wo-alpha" min="20" max="100" step="5" value="' + wd.alpha + '"></div>',
      foot: '<button class="btn primary" data-s>' + I.check + '閉じる</button>',
      onMount: function (el, api) {
        el.querySelector('[data-s]').onclick = function () { api.close(); };
        el.addEventListener('click', function (e) { var c = e.target.closest('[data-color]'); if (!c) return; wd.color = c.dataset.color; el.querySelectorAll('[data-color]').forEach(function (b) { b.classList.toggle('on', b === c); b.setAttribute('aria-checked', b === c); }); save(); apply(); });
        el.addEventListener('input', function (e) { if (e.target.id === 'wo-alpha') { wd.alpha = Number(e.target.value); el.querySelector('#wo-alpha-v').textContent = wd.alpha + '%'; save(); apply(); } });
        el.addEventListener('change', function (e) { if (e.target.id === 'wo-metric') { wd.metric = e.target.value; save(); } });
      },
      onClose: function () { rerender(); }
    });
    function apply() { var sec = document.querySelector('[data-wid="' + id + '"]'); if (sec) { sec.style.setProperty('--w-accent', COLORS[wd.color][1]); sec.style.setProperty('--w-alpha', wd.alpha / 100); } }
  }

  function more() {
    var h = home(), L = layout();
    U.modal({
      title: 'このホーム（' + L.name + '）',
      body: '<div class="form-grid">' +
        '<div class="field c6"><label for="hm-name">名前</label><input class="input" id="hm-name" value="' + esc(L.name) + '"></div>' +
        '<div class="field c6"><label for="hm-time">使う時間帯</label><select class="input" id="hm-time">' + Object.keys(TIMES).map(function (k) { return U.opt(k, TIMES[k], L.time || ''); }).join('') + '</select></div>' +
        '<div class="field c12"><label class="chk"><input type="checkbox" id="hm-auto"' + (h.auto ? ' checked' : '') + '> 時間帯に合わせてホームを自動で切り替える</label><span class="hint">時間帯を指定したホームがあると、その時間はそのホームを出します。</span></div></div>',
      foot: '<button class="btn ghost" data-r>役割の初期配置に戻す</button><button class="btn" data-dup>' + I.copy + '別の名前で保存</button>' + (h.layouts.length > 1 ? '<button class="btn danger" data-del>削除</button>' : '') + '<button class="btn primary" data-s>' + I.check + '保存</button>',
      onMount: function (el, api) {
        el.querySelector('[data-s]').onclick = function () {
          L.name = el.querySelector('#hm-name').value.trim() || L.name; L.time = el.querySelector('#hm-time').value; h.auto = el.querySelector('#hm-auto').checked;
          save(); api.close(); EE.fx.toast('保存しました'); rerender();
        };
        el.querySelector('[data-dup]').onclick = function () {
          var nl = { key: 'h' + Date.now().toString(36), name: (el.querySelector('#hm-name').value.trim() || L.name) + '（コピー）', time: '', widgets: JSON.parse(JSON.stringify(L.widgets)).map(function (x) { x.id = w(x.type, x.size).id; return x; }) };
          h.layouts.push(nl); h.active = nl.key; h.auto = false; save(); api.close(); EE.fx.toast('「' + nl.name + '」として保存しました'); rerender();
        };
        el.querySelector('[data-r]').onclick = async function () {
          var role = ROLE_NAMES[L.key] ? L.key : roleOf(U.me());
          if (!(await U.confirmBox('「' + L.name + '」を「' + ROLE_NAMES[role] + '」の初期配置に戻しますか？', '戻す', { danger: true }))) return;
          L.widgets = preset(role); save(); api.close(); rerender();
        };
        var d = el.querySelector('[data-del]');
        if (d) d.onclick = async function () {
          if (!(await U.confirmBox('ホーム「' + L.name + '」を削除しますか？', '削除する', { danger: true }))) return;
          h.layouts = h.layouts.filter(function (x) { return x !== L; }); h.active = h.layouts[0].key; save(); api.close(); rerender();
        };
      }
    });
  }

  function drawTrend(el, animate) {
    var rg = Number(el.dataset.trend) || 6, pts = series('issued', rg);
    EE.charts.area(el, pts, { title: '月別の見積の発行額（確定した見積・税込）', unit: '発行額', fmt: 'yen', height: Math.max(120, Math.min(260, (el.clientHeight || 160) - 4)), draw: animate !== false, glow: true });
  }
  function mount(view) {
    EE.fx.countAll(view);
    view.querySelectorAll('[data-trend]').forEach(function (el) { drawTrend(el); });
    view.querySelectorAll('.spark-line').forEach(function (l) { EE.fx.anim(l, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: EE.fx.T.page, delay: 200, fill: 'both' }); });
    view.addEventListener('click', function (e) {
      var b = e.target.closest('[data-trend-range]'); if (!b || editing) return;
      var sec = b.closest('[data-wid]'), f = sec && find(sec.dataset.wid); if (!f) return;
      f.w.range = Number(b.dataset.trendRange); save();
      sec.querySelectorAll('[data-trend-range]').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      var ch = sec.querySelector('[data-trend]'); ch.dataset.trend = f.w.range; drawTrend(ch);   // 期間を変えたら描き直す（線が左から伸びる）
    });
    var bars = view.querySelector('[data-bars]'); if (bars) EE.views.finance.drawBars(bars);
    view.querySelectorAll('.w-rings .ring').forEach(function (r, i) { var v = r.querySelector('.ring-val'); EE.fx.anim(v, [{ strokeDashoffset: r.style.getPropertyValue('--len') }, { strokeDashoffset: r.style.getPropertyValue('--off') }], { duration: 900, delay: 150 + i * 80, fill: 'both' }); });
    // 時計は1秒ごと（画面を離れたら止める）
    clearInterval(clockTimer);
    clockTimer = setInterval(function () {
      var c = document.querySelector('[data-clock]'); if (!c) { clearInterval(clockTimer); return; }
      var d = new Date(); c.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }, 1000);

    view.addEventListener('change', function (e) {
      if (e.target.id === 'home-layout') { var h = home(); h.active = e.target.value; h.auto = false; save(); rerender(); }
    });
    view.addEventListener('click', function (e) {
      var pal = e.target.closest('[data-palette]'); if (pal) { e.preventDefault(); EE.palette.open(); return; }
      var a = e.target.closest('[data-act]');
      if (a) {
        if (a.dataset.act === 'w-edit') { editing = true; rerender(); return; }
        if (a.dataset.act === 'w-done') { editing = false; if (/\?edit/.test(location.hash)) EE.app.replaceRoute('#/home'); rerender(); return; }
        if (a.dataset.act === 'w-add') { library(); return; }
        if (a.dataset.act === 'w-more') { more(); return; }
        if (a.dataset.act === 'w-reset') { (async function () { if (!(await U.confirmBox('ホームを標準の並びに戻しますか？', '戻す', { danger: true }))) return; layout().widgets = preset('link'); save(); rerender(); })(); return; }
      }
      var b = e.target.closest('[data-w]');
      if (b) {
        var sec = b.closest('[data-wid]'), f = find(sec.dataset.wid); if (!f) return;
        switch (b.dataset.w) {
          case 'left': if (f.i > 0) { f.L.widgets.splice(f.i - 1, 0, f.L.widgets.splice(f.i, 1)[0]); } break;
          case 'right': if (f.i < f.L.widgets.length - 1) { f.L.widgets.splice(f.i + 1, 0, f.L.widgets.splice(f.i, 1)[0]); } break;
          case 'size': f.w.size = b.dataset.v; break;
          case 'hide': f.w.hidden = !f.w.hidden; break;
          case 'opts': options(f.w.id); return;
          case 'del': f.L.widgets.splice(f.i, 1); EE.fx.toast('削除しました', { action: { label: '元に戻す', run: function () { f.L.widgets.splice(f.i, 0, f.w); save(); rerender(); } } }); break;
        }
        save(); if (b.dataset.w === 'left' || b.dataset.w === 'right') flip(f.w.id); else rerender();
        var again = document.querySelector('[data-wid="' + f.w.id + '"] [data-w="' + b.dataset.w + '"]' + (b.dataset.v ? '[data-v="' + b.dataset.v + '"]' : '')); if (again && !again.disabled) again.focus();
        return;
      }
      var go = e.target.closest('[data-go]'); if (go && !editing) { location.hash = go.dataset.go; }
    });
    // 編集中：ドラッグで並べ替え
    if (editing) {
      var grid = view.querySelector('#widgets'), dragId = null;
      grid.addEventListener('dragstart', function (e) { var s = e.target.closest('[data-wid]'); if (!s) return; dragId = s.dataset.wid; s.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch (x) {} });
      grid.addEventListener('dragend', function (e) { var s = e.target.closest('[data-wid]'); if (s) s.classList.remove('dragging'); grid.querySelectorAll('.drop-before').forEach(function (x) { x.classList.remove('drop-before'); }); });
      grid.addEventListener('dragover', function (e) {
        if (!dragId) return; e.preventDefault();
        var t = e.target.closest('[data-wid]'); grid.querySelectorAll('.drop-before').forEach(function (x) { x.classList.remove('drop-before'); });
        if (t && t.dataset.wid !== dragId) t.classList.add('drop-before');
      });
      grid.addEventListener('drop', function (e) {
        e.preventDefault(); var t = e.target.closest('[data-wid]'); if (!dragId || !t || t.dataset.wid === dragId) return;
        var L = layout(), from = find(dragId), to = find(t.dataset.wid);
        var item = L.widgets.splice(from.i, 1)[0]; var ti = L.widgets.indexOf(to.w); L.widgets.splice(ti, 0, item);
        var moved = dragId; dragId = null; save(); flip(moved);
      });
    }
  }

  // ホームを開くたびに、今月の数字はもう一度 0 から数え上げる（ホームの中で描き直すときは動かさない）
  root.addEventListener('hashchange', function () { if (/^#\/(home)?$/.test(location.hash || '#/')) EE.fx.countForget('home-month'); });
  EE.views = EE.views || {};
  EE.views.control = { render: render, track: track, TYPES: TYPES, METRICS: METRICS, metricValue: metricValue, preset: preset };
})(this);
