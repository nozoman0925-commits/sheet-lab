/*
 * 工事（工事フロー＋工事一覧）
 *  - 上：工事フロー図（見積 → 受注 → 着工 → 完了 → 請求 → 入金）。点＝工事、色＝担当者。
 *    期間・工事種別・段階で絞り込み、1件選ぶとその工事だけが強調され、右に金額・期限・次の行動が出る
 *  - 下：工事一覧（工事名・担当・状態・次の期限だけ）。開くと工事ワークスペース（js/views/site.js）
 * 一覧は判断する場所、ワークスペースは作業する場所（構想 3-④）
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var F = { period: '6m', cat: '', stage: '' };
  var selId = null;

  /* ---------- 工事フロー図 ---------- */
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
      var up = i % 2 === 1;   // 波の上側にある節は、ラベルを上に・工事の点を下に置く
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
    return '<svg class="flow" viewBox="0 0 ' + VB_W + ' ' + VB_H + '" role="img" aria-label="工事フロー：見積から入金まで">' +
      segs + flows + nodes + dots + '</svg>';
  }

  function detailHTML(list) {
    var c = list.filter(function (x) { return x.id === selId; })[0];
    var ST = EE.data.STAGES;
    if (!c) {
      var total = list.reduce(function (a, x) { return a + x.amount; }, 0);
      return '<div class="label">表示中の工事</div><div class="kpi-value num" data-count="' + list.length + '" data-format="int">0</div>' +
        '<div class="hint">合計 ' + U.yen(total) + '（受注前は最新の見積、受注後は受注した見積の金額）</div><div class="sep"></div>' +
        ST.map(function (s, i) { var n = list.filter(function (x) { return x.stage === i; }).length;
          return '<div class="sum-row"><span>' + esc(s.label) + '</span><span class="num">' + n + ' 件</span></div>'; }).join('') +
        '<p class="hint" style="margin-top:12px">図の点をクリックすると、その工事が拡大されてここに詳細が出ます。点の色は担当者の色です。</p>';
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
        (p.id ? '<a class="btn sm" href="#/site/' + p.id + '">' + I.home + '工事ページ</a>' : '') +
        (c.main ? '<a class="btn sm" href="#/edit/' + c.main.id + '">' + I.edit + '見積を開く</a>' : '') +
        (p.id && nextStage ? '<button class="btn sm primary" data-act="flow-advance" data-id="' + p.id + '">' + I.check + nextStage.label + 'にする</button>' : '') +
      '</div>';
  }

  /** 段階を1つ進める（受注のときは、どの見積で受注したかを記録） */
  async function advance(projectId) {
    var p = U.findProject(projectId); if (!p) return;
    // 業務管理の中では、段階（受注・着工・完了・請求・入金）は工事の画面で記録する
    if (EE.host && root.OUBI) { root.OUBI.openCase(p.id); return; }
    if (EE.link) { location.hash = '#/o/case/' + p.id; return; }
    var ST = EE.data.STAGES, si = EE.data.stageIndex(p.stage), next = ST[si + 1]; if (!next) return;
    var docs = EE.S.documents.filter(function (d) { return d.projectId === p.id; });
    if (next.key === 'order') {
      if (!docs.length) { EE.fx.toast('この工事には見積がありません', { warn: true }); return; }
      var issued = docs.filter(function (d) { return d.status === 'issued'; });
      var pick = (issued.length ? issued : docs).sort(function (a, b) { return (b.issueDate || '').localeCompare(a.issueDate || ''); });
      var ok = await U.confirmBox('「' + p.name + '」を受注にします。\n受注した見積：' + (pick[0].patternLabel ? pick[0].patternLabel + '　' : '') + (pick[0].no || '') + '（' + U.yen(U.calcDoc(pick[0]).total) + '）' +
        (pick.length > 1 ? '\n※別の見積で受注した場合は、工事ページで選び直せます。' : ''), '受注にする');
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

  /* ---------- 画面 ---------- */
  function render() {
    var S = EE.S;
    var list = filteredCases();
    if (selId && !list.some(function (c) { return c.id === selId; })) selId = null;

    var periods = [['3m', '3か月'], ['6m', '6か月'], ['year', '今年'], ['all', 'すべて']];
    var sites = list.filter(function (c) { return c.project.id; }).sort(function (a, b) { return (b.lastDate || '').localeCompare(a.lastDate || ''); });
    var ST = EE.data.STAGES;
    var html =
      '<div class="toolbar" data-st style="margin-bottom:14px"><div class="grow"><div class="hint">工事の今の段階と次の行動。工事を開くと、見積・写真・書類・原価・メモがまとまっています</div></div>' +
        '<button class="btn" data-act="new-site">' + I.plus + '工事を登録する</button>' +
        '<a class="btn primary" href="#/new">' + I.spark + 'かんたん見積もり作成</a></div>' +
      '<div class="flow-filters" data-st>' +
        '<div class="seg" id="f-period">' + periods.map(function (p) { return '<button data-v="' + p[0] + '" class="' + (F.period === p[0] ? 'on' : '') + '">' + p[1] + '</button>'; }).join('') + '</div>' +
        '<select class="input" id="f-cat" style="width:auto">' + U.opt('', '工事種別：すべて', F.cat) + (S.categories || []).map(function (c) { return U.opt(c.id, c.name, F.cat); }).join('') + '</select>' +
        '<select class="input" id="f-stage" style="width:auto">' + U.opt('', '段階：すべて', F.stage) + ST.map(function (s, i) { return U.opt(String(i), s.label, F.stage); }).join('') + '</select>' +
        '<span class="hint" style="margin-left:auto">' + list.length + ' 件の工事</span></div>' +
      '<div class="flow-grid">' +
        '<section class="panel flow-panel" data-st><div class="panel-h"><h2>工事フロー</h2><span class="sub">見積 → 受注 → 着工 → 完了 → 請求 → 入金</span></div>' +
          '<div class="panel-b"><div id="flow-wrap">' + flowSVG(list) + '</div></div></section>' +
        '<section class="panel" data-st><div class="panel-h"><h2>詳細</h2></div><div class="panel-b" id="flow-detail">' + detailHTML(list) + '</div></section>' +
      '</div>' +
      '<section class="panel" data-st style="margin-top:18px"><div class="panel-h"><h2>工事一覧</h2><span class="sub">' + sites.length + ' 件</span></div>' +
        '<div class="panel-b" style="padding-top:6px">' + (sites.length ? '<div class="table-scroll"><table class="table site-list"><thead><tr><th>工事名</th><th>担当</th><th>状態</th><th>次の期限・次の行動</th><th class="r">金額（税込）</th></tr></thead><tbody>' +
          sites.map(function (c) {
            var p = c.project, cu = U.findCustomer(p.customerId) || {};
            var due = c.stage === 0 && c.valid ? (c.days < 0 ? '<span class="badge err">期限切れ</span>' : '<span class="num">' + U.jdate(c.valid) + '</span>（あと' + c.days + '日）') : '';
            return '<tr class="clickable" data-href="#/site/' + p.id + '"><td>' + esc(p.name) + '<span class="cell-sub">' + esc(cu.name || '') + '</span></td>' +
              '<td>' + (c.owner ? '<span class="owner-chip">' + U.avatar(c.owner, 20) + esc(c.owner.name) + '</span>' : '<span class="hint">未割り当て</span>') + '</td>' +
              '<td><span class="badge blue">' + esc(ST[c.stage].label) + '</span></td>' +
              '<td>' + due + '<span class="cell-sub' + (c.warn ? ' warn-text' : '') + '">' + esc(c.next || '') + '</span></td>' +
              '<td class="r num">' + U.yen(c.amount) + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<div class="empty">' + I.site + 'まだ工事がありません。「工事を登録」か、見積を作るときに工事を選ぶと工事ができます</div>') + '</div></section>';

    return { title: '工事', crumb: '調査・施工・検査', html: html, mount: mount };
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
    if (selId) { var keep = selId; selId = null; select(view, keep); }
    view.addEventListener('click', function (e) {
      var cs = e.target.closest('.flow-case'); if (cs) { select(view, cs.dataset.case); return; }
      var a = e.target.closest('[data-act]');
      if (a && a.dataset.act === 'flow-clear') { select(view, selId); return; }
      if (a && a.dataset.act === 'flow-advance') { advance(a.dataset.id); return; }
      if (a && a.dataset.act === 'new-site') { EE.views.clients.projectForm(null, '', function (p) { location.hash = '#/site/' + p.id; }); return; }
      var pb = e.target.closest('#f-period [data-v]'); if (pb) { F.period = pb.dataset.v; EE.app.rerender(); return; }
    });
    view.addEventListener('keydown', function (e) { var cs = e.target.closest && e.target.closest('.flow-case'); if (cs && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(view, cs.dataset.case); } });
    view.addEventListener('change', function (e) {
      if (e.target.id === 'f-cat') { F.cat = e.target.value; EE.app.rerender(); }
      if (e.target.id === 'f-stage') { F.stage = e.target.value; EE.app.rerender(); }
    });
    // 点にカーソル：工事名と金額
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
  /** 外から選んで開く（ホームのウィジェットから） */
  function openCase(id) { selId = id; location.hash = '#/sites'; }
  EE.views.sites = { render: render, advance: advance, flowSVG: flowSVG, filteredCases: filteredCases, openCase: openCase };
})(this);
