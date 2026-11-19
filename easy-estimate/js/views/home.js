/*
 * ホーム（Voyage型の構成）
 * 1. 中央に大きな「案件フロー図」：見積 → 受注 → 着工 → 完了 → 請求 → 入金。線が左から右へ流れ、
 *    進行中の案件が今どこにいるかを点で示す。上のフィルター（期間・工事種別・段階）で絞り込み、
 *    1件選ぶとその案件だけが拡大・強調され、右に詳細（金額・期限・次の行動）が出る
 * 2. KPI と円形ゲージ（入金率・粗利率・未入金割合）
 * 3. 月別の見積額・受注額・入金額の比較（月順・金額順・粗利順・件数順で並び替え）
 * 4. 担当者のファイル・かんたん見積もり作成・最近の書類・送る前の確認（既存）
 * 分析機能（ファネル・コホートなど）は作らない。
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var F = { period: '6m', cat: '', stage: '' };
  var selId = null, sortKey = 'month';

  /* ---------- 案件フロー図 ---------- */
  var VB_W = 1000, VB_H = 360, NODE_Y = 180;
  function nodeX(i) { return 80 + i * 168; }
  function nodeY(i) { return NODE_Y + (i % 2 ? -22 : 22); }   // ゆるい波形

  function filteredCases() {
    var all = EE.insight.cases();
    var t = EE.data.today(), from = '';
    if (F.period === '3m') from = EE.data.addDays(t, -92);
    if (F.period === '6m') from = EE.data.addDays(t, -183);
    if (F.period === 'year') from = t.slice(0, 4) + '-01-01';
    return all.filter(function (c) {
      if (from && c.lastDate && c.lastDate < from) return false;
      if (F.cat && c.category !== F.cat) return false;
      if (F.stage !== '' && String(c.stage) !== F.stage) return false;
      return true;
    });
  }

  function flowSVG(list) {
    var ST = EE.data.STAGES;
    var segs = '', flows = '';
    for (var i = 0; i < ST.length - 1; i++) {
      var x1 = nodeX(i), y1 = nodeY(i), x2 = nodeX(i + 1), y2 = nodeY(i + 1), mx = (x1 + x2) / 2;
      var d = 'M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2;
      segs += '<path class="flow-seg" data-seg="' + i + '" d="' + d + '"/>';
      flows += '<path class="flow-run" data-seg="' + i + '" d="' + d + '" style="animation-delay:' + (-i * 0.6) + 's"/>';
    }
    var byStage = ST.map(function () { return []; });
    list.forEach(function (c) { byStage[c.stage].push(c); });
    var nodes = ST.map(function (s, i) {
      var cs = byStage[i], amt = cs.reduce(function (a, c) { return a + c.amount; }, 0);
      var up = i % 2 === 1;   // 波の上側にある節は、ラベルを上に・案件の点を下に置く
      return '<g class="flow-node" data-stage="' + i + '">' +
        '<circle cx="' + nodeX(i) + '" cy="' + nodeY(i) + '" r="27" class="flow-ring"/>' +
        '<circle cx="' + nodeX(i) + '" cy="' + nodeY(i) + '" r="18" class="flow-core"/>' +
        '<text x="' + nodeX(i) + '" y="' + (nodeY(i) + 5) + '" text-anchor="middle" class="flow-count">' + cs.length + '</text>' +
        '<text x="' + nodeX(i) + '" y="' + (nodeY(i) + (up ? -48 : 56)) + '" text-anchor="middle" class="flow-label">' + esc(s.label) + '</text>' +
        '<text x="' + nodeX(i) + '" y="' + (nodeY(i) + (up ? -31 : 74)) + '" text-anchor="middle" class="flow-amt">' + (amt ? EE.charts.short(amt) + '円' : '') + '</text></g>';
    }).join('');
    var dots = '';
    byStage.forEach(function (cs, i) {
      var up = i % 2 === 1;
      cs.slice(0, 9).forEach(function (c, k) {
        var col = k % 3, row = Math.floor(k / 3);
        var x = nodeX(i) - 30 + col * 30, y = nodeY(i) + (up ? 74 + row * 30 : -78 - row * 30);
        var hue = c.owner ? c.owner.hue : 220;
        dots += '<g class="flow-case' + (c.warn ? ' warn' : '') + '" data-case="' + esc(c.id) + '" tabindex="0" role="button" aria-label="' + esc(c.project.name) + '">' +
          '<line x1="' + nodeX(i) + '" y1="' + nodeY(i) + '" x2="' + x + '" y2="' + y + '" class="flow-tether"/>' +
          '<circle cx="' + x + '" cy="' + y + '" r="17" class="flow-case-hit"/>' +
          '<circle cx="' + x + '" cy="' + y + '" r="10.5" class="flow-case-dot" style="fill:hsl(' + hue + ' 85% 62%)"/></g>';
      });
      if (cs.length > 9) dots += '<text x="' + nodeX(i) + '" y="' + (nodeY(i) + (up ? 166 : -152)) + '" text-anchor="middle" class="flow-amt">ほか ' + (cs.length - 9) + ' 件</text>';
    });
    return '<svg class="flow" viewBox="0 0 ' + VB_W + ' ' + VB_H + '" role="img" aria-label="案件フロー：見積から入金まで">' +
      segs + flows + nodes + dots + '</svg>';
  }

  function detailHTML(list) {
    var c = list.filter(function (x) { return x.id === selId; })[0];
    var ST = EE.data.STAGES;
    if (!c) {
      var total = list.reduce(function (a, x) { return a + x.amount; }, 0);
      return '<div class="label">表示中の案件</div><div class="kpi-value num" data-count="' + list.length + '" data-format="int">0</div>' +
        '<div class="hint">合計 ' + U.yen(total) + '（受注前は最新の見積、受注後は受注した見積の金額）</div><div class="sep"></div>' +
        ST.map(function (s, i) { var n = list.filter(function (x) { return x.stage === i; }).length;
          return '<div class="sum-row"><span>' + esc(s.label) + '</span><span class="num">' + n + ' 件</span></div>'; }).join('') +
        '<p class="hint" style="margin-top:12px">図の点をクリックすると、その案件が拡大されてここに詳細が出ます。点の色は担当者の色です。</p>';
    }
    var p = c.project, cu = U.findCustomer(p.customerId) || {};
    var daysTxt = c.days == null ? '' : c.days < 0 ? '期限切れ（' + (-c.days) + '日前）' : 'あと ' + c.days + ' 日';
    var nextStage = c.stage < ST.length - 1 ? ST[c.stage + 1] : null;
    return '<div class="flow-detail-head"><span class="badge blue">' + esc(ST[c.stage].label) + '</span>' + (c.owner ? '<span class="owner-chip">' + U.avatar(c.owner, 22) + esc(c.owner.name) + '</span>' : '') +
        '<button class="btn ghost icon sm" data-act="flow-clear" title="選択を解除" style="margin-left:auto">' + I.x + '</button></div>' +
      '<div class="flow-detail-title">' + esc(p.name) + '</div><div class="hint">' + esc(cu.name || '') + ' ' + esc(cu.honorific || '') + '</div>' +
      '<div class="flow-amount num" data-count="' + c.amount + '" data-format="yen">¥0</div><div class="hint">税込' + (c.margin != null ? '　粗利率 ' + U.pct(c.margin) : '') + (c.main ? '　' + esc(c.main.no || '') : '') + '</div>' +
      '<div class="sep"></div>' +
      '<div class="sum-row"><span>有効期限</span><span class="num" style="' + (c.days != null && c.days < 7 && c.stage === 0 ? 'color:var(--warn)' : '') + '">' + (c.valid ? U.jdate(c.valid) + '　' + daysTxt : '—') + '</span></div>' +
      '<div class="sum-row"><span>見積の数</span><span class="num">' + c.docs.length + ' 件</span></div>' +
      '<div class="next-action' + (c.warn ? ' warn' : '') + '"><div class="label">次の行動</div><div>' + esc(c.next) + '</div></div>' +
      '<div class="flow-detail-actions">' +
        (p.id ? '<a class="btn sm" href="#/site/' + p.id + '">' + I.home + '現場ページ</a>' : '') +
        (c.main ? '<a class="btn sm" href="#/edit/' + c.main.id + '">' + I.edit + '見積を開く</a>' : '') +
        (p.id && nextStage ? '<button class="btn sm primary" data-act="flow-advance" data-id="' + p.id + '">' + I.check + nextStage.label + 'にする</button>' : '') +
      '</div>';
  }

  /** 段階を1つ進める（受注のときは、どの見積で受注したかを記録） */
  async function advance(projectId) {
    var p = U.findProject(projectId); if (!p) return;
    var ST = EE.data.STAGES, si = EE.data.stageIndex(p.stage), next = ST[si + 1]; if (!next) return;
    var docs = EE.S.documents.filter(function (d) { return d.projectId === p.id; });
    if (next.key === 'order') {
      if (!docs.length) { EE.fx.toast('この現場には見積がありません', { warn: true }); return; }
      var issued = docs.filter(function (d) { return d.status === 'issued'; });
      var pick = (issued.length ? issued : docs).sort(function (a, b) { return (b.issueDate || '').localeCompare(a.issueDate || ''); });
      var ok = await U.confirmBox('「' + p.name + '」を受注にします。\n受注した見積：' + (pick[0].patternLabel ? pick[0].patternLabel + '　' : '') + (pick[0].no || '') + '（' + U.yen(U.calcDoc(pick[0]).total) + '）' +
        (pick.length > 1 ? '\n※別の見積で受注した場合は、現場ページで選び直せます。' : ''), '受注にする');
      if (!ok) return;
      p.acceptedDocId = pick[0].id; p.orderedOn = EE.data.today();
    } else {
      if (!(await U.confirmBox('「' + p.name + '」を「' + next.label + '」に進めますか？', next.label + 'にする'))) return;
      p[{ start: 'startedOn', done: 'doneOn', invoice: 'invoicedOn', paid: 'paidOn' }[next.key]] = EE.data.today();
    }
    p.stage = next.key;
    p.stageHistory = (p.stageHistory || []).concat([{ at: new Date().toISOString(), to: next.key }]);
    U.commit();
    EE.fx.toast('「' + p.name + '」を ' + next.label + ' にしました');
    EE.app.rerender();
  }

  /* ---------- 月別比較 ---------- */
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

  /* ---------- 画面 ---------- */
  function render() {
    var S = EE.S;
    var ym = EE.data.today().slice(0, 7);
    var docs = S.documents.slice().sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
    var month = docs.filter(function (d) { return (d.issueDate || '').slice(0, 7) === ym; });
    var sumTotal = 0, sumSub = 0, sumProfit = 0;
    month.forEach(function (d) { var r = U.calcDoc(d); sumTotal += r.total; sumSub += r.subtotal; sumProfit += r.grossProfit; });
    var avgMargin = sumSub ? sumProfit / sumSub * 100 : 0;
    var drafts = docs.filter(function (d) { return d.status === 'draft'; });
    var expiring = drafts.filter(function (d) { var x = U.daysFromToday(d.validUntil); return x != null && x >= 0 && x <= 7; });
    var attention = drafts.map(function (d) { return { d: d, s: EE.check.summary(U.checkDoc(d)) }; }).filter(function (x) { return x.s.error || x.s.warn; });
    var R = EE.insight.rates();
    var list = filteredCases();
    if (selId && !list.some(function (c) { return c.id === selId; })) selId = null;

    function kpi(icon, label, value, fmt, foot) {
      return '<div class="panel kpi" data-st><div class="kpi-label"><span class="kpi-icon">' + icon + '</span>' + label + '</div>' +
        '<div class="kpi-value num" data-count="' + value + '" data-format="' + fmt + '">0</div><div class="kpi-foot">' + foot + '</div></div>';
    }
    var periods = [['3m', '3か月'], ['6m', '6か月'], ['year', '今年'], ['all', 'すべて']];
    /* はじめに：自社情報・顧客・最初の見積がそろうまで、やることを順に出す */
    function setupHTML() {
      var steps = [
        [!!(S.company.name && S.company.address), '自社情報（会社名・住所・登録番号）を入れる', '#/settings/company', '見積書に載ります'],
        [S.customers.length > 0, '顧客を登録する', '#/clients', '宛先として選べるようになります'],
        [S.documents.length > 0, '最初の見積を作る', '#/new', '文章からでも、マスタから選んでも作れます']
      ];
      if (steps.every(function (x) { return x[0]; })) return '';
      return '<section class="panel setup" data-st style="margin-bottom:18px"><div class="panel-h"><h2>はじめに</h2><span class="sub">3つそろえると見積を送れます</span></div><div class="panel-b"><ol class="setup-list">' +
        steps.map(function (x) {
          return '<li class="' + (x[0] ? 'done' : '') + '"><span class="setup-mark" aria-hidden="true">' + (x[0] ? I.check : '') + '</span>' +
            (x[0] ? '<span>' + x[1] + '<span class="sr-only">（済み）</span></span>' : '<a href="' + x[2] + '">' + x[1] + '</a>') + '<span class="hint">' + x[3] + '</span></li>';
        }).join('') + '</ol></div></section>';
    }

    var html =
      '<div class="toolbar" data-st style="margin-bottom:18px"><div class="grow"><div style="font-size:22px;font-weight:650">' + esc(S.company.name || '桜ミツ') + '</div>' +
        '<div class="hint">' + U.jdate(EE.data.today()) + '　金額はマスタと固定の計算エンジンだけで決まります（AIは金額を決めません）</div></div>' +
        '<a class="btn" href="#/settings/items">' + I.box + 'マスタ ' + S.items.length + '件</a>' +
        '<a class="btn primary" href="#/new">' + I.spark + 'かんたん見積もり作成</a></div>' +
      setupHTML() +
      /* 1. 案件フロー */
      '<div class="flow-filters" data-st>' +
        '<div class="seg" id="f-period">' + periods.map(function (p) { return '<button data-v="' + p[0] + '" class="' + (F.period === p[0] ? 'on' : '') + '">' + p[1] + '</button>'; }).join('') + '</div>' +
        '<select class="input" id="f-cat" style="width:auto">' + U.opt('', '工事種別：すべて', F.cat) + (S.categories || []).map(function (c) { return U.opt(c.id, c.name, F.cat); }).join('') + '</select>' +
        '<select class="input" id="f-stage" style="width:auto">' + U.opt('', '段階：すべて', F.stage) + EE.data.STAGES.map(function (s, i) { return U.opt(String(i), s.label, F.stage); }).join('') + '</select>' +
        '<span class="hint" style="margin-left:auto">' + list.length + ' 件の案件</span></div>' +
      '<div class="flow-grid">' +
        '<section class="panel flow-panel" data-st><div class="panel-h"><h2>案件フロー</h2><span class="sub">見積 → 受注 → 着工 → 完了 → 請求 → 入金</span></div>' +
          '<div class="panel-b"><div id="flow-wrap">' + flowSVG(list) + '</div></div></section>' +
        '<section class="panel" data-st><div class="panel-h"><h2>詳細</h2></div><div class="panel-b" id="flow-detail">' + detailHTML(list) + '</div></section>' +
      '</div>' +
      /* 2. KPI ＋ 円形ゲージ ＋ 月別比較 */
      '<div class="grid kpis" style="margin-top:18px">' +
        kpi(I.docs, '今月の見積', month.length, 'int', '件（発行日ベース）') +
        kpi(I.yen, '今月の見積総額', sumTotal, 'yen', '税込の合計') +
        kpi(I.chart, '今月の平均粗利率', Math.round(avgMargin * 10) / 10, 'pct', '税抜ベース') +
        kpi(I.clock, '期限まで7日以内', expiring.length, 'int', '件の下書き　フォローの目安') +
      '</div>' +
      '<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.7fr);margin-top:18px">' +
        '<section class="panel" data-st><div class="panel-h"><h2>入金と粗利</h2><span class="sub">受注した案件の金額から計算</span></div><div class="panel-b"><div class="rings">' +
          EE.charts.ring(R.paid, '入金率', U.yen(R.paidAmt) + ' / ' + U.yen(R.orderedAmt), '#3987e5') +
          EE.charts.ring(R.margin, '粗利率', 'すべての見積（税抜）', '#199e70') +
          EE.charts.ring(R.unpaid, '未入金の割合', '請求済みのうち ' + U.yen(R.unpaidAmt), '#9085e9') +
        '</div></div></section>' +
        '<section class="panel" data-st><div class="panel-h"><h2>月別の比較</h2><span class="sub">直近6か月</span><div class="spacer"></div>' +
          '<div class="seg" id="bar-sort">' + [['month', '月順'], ['amount', '金額順'], ['profit', '粗利順'], ['count', '件数順']].map(function (s) { return '<button data-v="' + s[0] + '" class="' + (sortKey === s[0] ? 'on' : '') + '">' + s[1] + '</button>'; }).join('') + '</div></div>' +
          '<div class="panel-b"><div id="bars"></div></div></section>' +
      '</div>' +
      EE.views.folders.homeSection() +
      '<section class="panel" data-st style="margin-top:18px"><div class="panel-h"><h2>かんたん見積もり作成</h2><span class="sub">手入力を減らす7つの入り口。どれから始めても同じ見積書になります</span></div>' +
        '<div class="panel-b"><div class="quick-row">' +
        [['text', '文章から'], ['voice', '音声から'], ['pdf', 'PDFから'], ['photo', '写真から'], ['past', '過去の見積から'], ['template', 'テンプレートから'], ['edit', '通常入力']].map(function (m) {
          return '<a class="pkg" href="#/new/' + m[0] + '">' + (m[0] === 'edit' ? I.plus : I.spark) + m[1] + '</a>';
        }).join('') + '</div></div></section>' +
      '<div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);margin-top:18px">' +
        '<section class="panel" data-st><div class="panel-h"><h2>最近の書類</h2><div class="spacer"></div><a class="btn ghost sm" href="#/docs">すべて見る</a></div>' +
          '<div class="panel-b" style="padding-top:8px">' + (docs.length ? '<table class="table"><tbody>' + docs.slice(0, 6).map(function (d) {
            var c = U.docCustomer(d);
            return '<tr class="clickable" data-href="#/edit/' + d.id + '"><td><span class="num">' + esc(d.no) + '</span><span class="cell-sub">' + U.jdate(d.issueDate) + '</span></td>' +
              '<td>' + EE.views.site.patternBadge(d) + ' ' + esc(d.title || '（件名なし）') + '<span class="cell-sub">' + esc(c.name || '宛先未設定') + '</span></td>' +
              '<td class="r num">' + U.yen(U.calcDoc(d).total) + '</td><td>' + U.statusBadge(d) + '</td></tr>';
          }).join('') + '</tbody></table>' : '<div class="empty">' + I.docs + 'まだ書類がありません</div>') + '</div></section>' +
        '<section class="panel" data-st><div class="panel-h"><h2>送る前に確認が必要</h2><span class="sub">下書きの送信前チェック</span></div>' +
          '<div class="panel-b"><div class="checks">' + (attention.length ? attention.map(function (x) {
            return '<a class="check ' + (x.s.error ? 'error' : 'warn') + '" href="#/edit/' + x.d.id + '" style="text-decoration:none;color:inherit">' +
              '<span class="ic">!</span><div><div class="t">' + esc(x.d.title || x.d.no) + '</div><div class="d">' +
              (x.s.error ? '要修正 ' + x.s.error + ' 件　' : '') + (x.s.warn ? '注意 ' + x.s.warn + ' 件' : '') + '</div></div><span class="hint">開く →</span></a>';
          }).join('') : '<div class="check-ok">' + I.check + '<div>下書きはすべてチェックを通過しています</div></div>') + '</div></div></section>' +
      '</div>';

    return { title: 'ホーム', crumb: 'ダッシュボード', html: html, mount: mount };
  }

  function select(view, id) {
    selId = selId === id ? null : id;
    var list = filteredCases();
    var c = list.filter(function (x) { return x.id === selId; })[0];
    view.querySelector('#flow-wrap').classList.toggle('focus', !!c);
    view.querySelectorAll('.flow-case').forEach(function (g) { g.classList.toggle('sel', !!c && g.dataset.case === selId); });
    view.querySelectorAll('.flow-seg, .flow-run').forEach(function (s) { s.classList.toggle('reached', !!c && Number(s.dataset.seg) < c.stage); });
    view.querySelectorAll('.flow-node').forEach(function (n) { n.classList.toggle('reached', !!c && Number(n.dataset.stage) <= c.stage); n.classList.toggle('here', !!c && Number(n.dataset.stage) === c.stage); });
    var det = view.querySelector('#flow-detail');
    det.innerHTML = detailHTML(list);
    EE.fx.anim(det, [{ opacity: 0, transform: 'translateX(10px)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
    EE.fx.countAll(det);
  }

  function mount(view) {
    EE.fx.countAll(view);
    drawBars(view.querySelector('#bars'));
    view.querySelectorAll('.ring').forEach(function (r, i) {
      var v = r.querySelector('.ring-val');
      EE.fx.anim(v, [{ strokeDashoffset: r.style.getPropertyValue('--len') }, { strokeDashoffset: r.style.getPropertyValue('--off') }], { duration: 900, delay: 150 + i * 80, fill: 'both' });
    });
    if (selId) { var keep = selId; selId = null; select(view, keep); }
    view.addEventListener('click', function (e) {
      var cs = e.target.closest('.flow-case'); if (cs) { select(view, cs.dataset.case); return; }
      var a = e.target.closest('[data-act]');
      if (a && a.dataset.act === 'flow-clear') { select(view, selId); return; }
      if (a && a.dataset.act === 'flow-advance') { advance(a.dataset.id); return; }
      var pb = e.target.closest('#f-period [data-v]'); if (pb) { F.period = pb.dataset.v; EE.app.rerender(); return; }
      var sb = e.target.closest('#bar-sort [data-v]');
      if (sb) { sortKey = sb.dataset.v; sb.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === sb); }); drawBars(view.querySelector('#bars')); }
    });
    view.addEventListener('keydown', function (e) { var cs = e.target.closest && e.target.closest('.flow-case'); if (cs && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(view, cs.dataset.case); } });
    view.addEventListener('change', function (e) {
      if (e.target.id === 'f-cat') { F.cat = e.target.value; EE.app.rerender(); }
      if (e.target.id === 'f-stage') { F.stage = e.target.value; EE.app.rerender(); }
    });
    // 点にカーソル：案件名と金額
    var cases = filteredCases();
    view.querySelectorAll('.flow-case').forEach(function (g) {
      g.addEventListener('pointermove', function (e) {
        var c = cases.filter(function (x) { return x.id === g.dataset.case; })[0]; if (!c) return;
        EE.charts.tip('<b>' + esc(c.project.name) + '</b><div class="row">金額<span>' + U.yen(c.amount) + '</span></div><div class="row">担当<span>' + esc(c.owner ? c.owner.name : '未割り当て') + '</span></div>', e.clientX, e.clientY);
      });
      g.addEventListener('pointerleave', function () { EE.charts.hideTip(); });
    });
  }

  EE.views = EE.views || {};
  EE.views.home = { render: render, advance: advance };
})(this);
