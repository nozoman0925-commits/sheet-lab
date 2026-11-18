/* 起動・画面切り替え・共通操作 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I;

  /*
   * 入力補助（AI等）の差し込み口。今回は何も登録しない。
   * 拡張は「テキストや写真 → [{ itemId, qty }]」の候補だけを返せる。
   * 単価・金額は受け取らず、追加時に必ずマスタの単価と計算エンジンを通す。
   */
  EE.plugins = {
    inputAssist: [],
    registerInputAssist: function (p) {
      if (!p || typeof p.suggest !== 'function') throw new Error('suggest(input) => [{itemId, qty}] が必要です');
      EE.plugins.inputAssist.push({ name: String(p.name || '拡張'), suggest: p.suggest });
    }
  };

  var NAV = [
    { key: 'home', label: 'ホーム', icon: I.home, href: '#/home' },
    { key: 'docs', label: '書類一覧', icon: I.docs, href: '#/docs' },
    { key: 'new', label: '新規作成', icon: I.plus, href: '#/new' },
    { key: 'clients', label: '顧客・案件', icon: I.users, href: '#/clients' },
    { key: 'settings', label: '設定・マスタ', icon: I.gear, href: '#/settings/items' }
  ];

  var current = null, currentNav = -1, skipNext = false, lastHash = '', prefill = null;

  function parse(hash) {
    var p = (hash || '').replace(/^#\/?/, '').split('/');
    switch (p[0]) {
      case 'docs': return { nav: 1, view: function () { return EE.views.docs.render(); } };
      case 'new': return { nav: 2, view: function () { return p[1] === 'edit' ? EE.views.editor.render(null) : EE.views.quick.render(p[1]); } };
      case 'edit': return { nav: 1, view: function () { return EE.views.editor.render(p[1]); } };
      case 'clients': return { nav: 3, view: function () { return EE.views.clients.render(); } };
      case 'settings': return { nav: 4, view: function () { return EE.views.settings.render(p[1]); } };
      default: return { nav: 0, view: function () { return EE.views.home.render(); } };
    }
  }

  function renderNav() {
    var nav = document.getElementById('nav');
    nav.innerHTML = NAV.map(function (n, i) {
      return '<a class="nav-item" href="' + n.href + '" data-nav="' + i + '">' + n.icon + '<span>' + n.label + '</span><kbd>Alt ' + (i + 1) + '</kbd></a>';
    }).join('');
  }

  function setActive(i) {
    document.querySelectorAll('.nav-item').forEach(function (a) { a.classList.toggle('active', Number(a.dataset.nav) === i); });
  }

  function show(animate) {
    var r = parse(location.hash);
    var dir = r.nav >= currentNav ? 1 : -1;
    var view = document.getElementById('view');
    var go = function () {
      current = r.view();
      currentNav = r.nav;
      setActive(r.nav);
      document.getElementById('title').textContent = current.title;
      document.getElementById('crumb').textContent = current.crumb || '';
      document.getElementById('actions').innerHTML = current.actions || '';
      document.title = current.title + ' — 桜ミツ';
      // 画面ごとにリスナーを付け直すため、view 要素ごと差し替える
      var fresh = view.cloneNode(false);
      fresh.innerHTML = '<div class="view-inner">' + current.html + '</div>';
      view.parentNode.replaceChild(fresh, view);
      fresh.scrollTop = 0;
      document.getElementById('actions').onclick = null;
      if (current.mount) current.mount(fresh.firstChild);
      if (animate !== false) { EE.fx.pageIn(fresh.firstChild, dir); EE.fx.stagger(fresh); }
      lastHash = location.hash;
    };
    if (animate === false || !view.firstChild) go(); else EE.fx.pageOut(view.firstChild, go);
  }

  async function onHash() {
    if (skipNext) { skipNext = false; lastHash = location.hash; return; }
    if (current && current.guard && current.guard()) {
      var target = location.hash;
      skipNext = true;
      history.replaceState(null, '', lastHash);
      skipNext = false;
      var ok = await U.confirmBox('保存していない変更があります。破棄して移動しますか？', '破棄して移動', { danger: true });
      if (!ok) return;
      if (current.discard) current.discard();
      current.guard = null;
      location.hash = target;
      return;
    }
    show();
  }

  function replaceRoute(hash) {
    history.replaceState(null, '', hash);
    lastHash = hash;
  }

  function cloneDoc(src) { return JSON.parse(JSON.stringify(src)); }

  /** 修正見積：元の版は残し、版番号を上げた下書きを作る */
  function makeRevision(src) {
    var S = EE.S;
    var baseNo = src.no.replace(/-R\d+$/, '');
    var maxRev = S.documents.filter(function (d) { return d.no.replace(/-R\d+$/, '') === baseNo; })
      .reduce(function (m, d) { return Math.max(m, d.rev || 0); }, 0);
    var d = cloneDoc(src);
    var now = new Date().toISOString();
    d.id = EE.data.uid('doc');
    d.rev = maxRev + 1;
    d.no = baseNo + '-R' + d.rev;
    d.parentId = src.id;
    d.status = 'draft';
    d.issuedAt = null; d.rules = null;
    d.issueDate = EE.data.today();
    d.validUntil = EE.data.addDays(d.issueDate, S.settings.validDays);
    d.lines.forEach(function (l) { l.lineId = EE.data.uid('ln'); });
    d.createdAt = d.updatedAt = now;
    d.history = [{ at: now, action: '修正見積を作成（元：' + src.no + '）' }];
    d.totals = EE.engine.snapshot(EE.engine.calc(d, S.settings));
    S.documents.push(d);
    U.commit();
    return d;
  }

  /** 複製：新しい番号・今日の日付で、単価は最新のマスタに合わせた下書きにする */
  function duplicate(id) {
    var src = U.findDoc(id);
    var d = EE.data.newEstimate(EE.S, { noNumber: true, customerId: src.customerId, projectId: src.projectId, title: src.title });
    ['deliveryPlace', 'deliveryTerm', 'paymentTerms', 'notes'].forEach(function (k) { d[k] = src[k]; });
    var changed = 0;
    d.lines = src.lines.map(function (l) {
      var it = U.findItem(l.itemId);
      if (!it) { var c = cloneDoc(l); c.lineId = EE.data.uid('ln'); return c; }
      if (it.unitPrice !== l.unitPrice) changed++;
      return EE.data.lineFromItem(it, l.qty);
    });
    prefill = d;
    location.hash = '#/new/edit';
    EE.fx.toast('「' + (src.title || src.no) + '」を複製しました' + (changed ? '（' + changed + '行を最新単価に更新）' : ''));
  }

  function newWith(init) {
    prefill = Object.assign({}, init);
    if (location.hash === '#/new/edit') show(); else location.hash = '#/new/edit';
  }
  function takePrefill() { var p = prefill; prefill = null; return p; }

  /** 画面の展開（時間差で順番に出す・数字のカウントアップ） */
  function intro() {
    var v = document.getElementById('view');
    EE.fx.pageIn(v.firstChild, 1);
    EE.fx.stagger(v);
    EE.fx.stagger(document.getElementById('nav'), { step: 40 });
    EE.fx.countAll(v);
  }

  function boot(opts) {
    opts = opts || {};
    EE.S = EE.data.load();
    renderNav();
    document.getElementById('brand-crest').innerHTML = EE.crest.svg({ id: 'brand', className: 'brand-crest', fieldR: 106 });
    if (!location.hash) replaceRoute('#/home');
    show(false);
    if (!opts.deferIntro) intro();

    root.addEventListener('hashchange', onHash);
    document.addEventListener('pointerdown', EE.fx.ripple);
    document.addEventListener('click', function (e) {
      var tr = e.target.closest('[data-href]');
      if (tr && !e.target.closest('button, a, input, select')) location.hash = tr.dataset.href;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { var m = U.topModal(); if (m) { m.close(); return; } }
      if (e.altKey && /^[1-5]$/.test(e.key)) { e.preventDefault(); location.hash = NAV[Number(e.key) - 1].href; return; }
      if (current && current.mount && EE.views.editor && /^#\/(new\/edit|edit)/.test(location.hash)) EE.views.editor.onKey(e);
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { /* 一覧画面での印刷はブラウザ既定のまま */ }
    });
    root.addEventListener('beforeunload', function (e) {
      if (EE.views.editor.isDirty()) { e.preventDefault(); e.returnValue = ''; }
    });
    var foot = document.getElementById('foot-count');
    var upd = function () { foot.textContent = 'マスタ ' + EE.S.items.length + '・顧客 ' + EE.S.customers.length + '・書類 ' + EE.S.documents.length; };
    upd(); U.onCommit(upd);
  }

  EE.app = { boot: boot, intro: intro, rerender: function () { show(); }, replaceRoute: replaceRoute, makeRevision: makeRevision,
    duplicate: duplicate, newWith: newWith, takePrefill: takePrefill };
})(this);
