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

  /* メニュー：5つの親メニュー。子メニューは開くと滑らかに展開する */
  var NAV = [
    { key: 'home', label: 'ホーム', icon: I.home, href: '#/home' },
    { key: 'docs', label: '書類一覧', icon: I.docs, href: '#/docs', children: [
      ['#/docs', 'すべて'], ['#/docs/draft', '下書き'], ['#/docs/issued', '発行済み']] },
    { key: 'new', label: '新規作成', icon: I.plus, href: '#/new', children: [
      ['#/new', 'かんたん作成'], ['#/new/text', '文章から'], ['#/new/voice', '音声から'], ['#/new/pdf', 'PDFから'],
      ['#/new/photo', '写真から'], ['#/new/past', '過去の見積から'], ['#/new/template', 'テンプレートから'], ['#/new/edit', '通常入力']] },
    { key: 'clients', label: '顧客・案件', icon: I.users, href: '#/clients' },
    { key: 'settings', label: '設定・マスタ', icon: I.gear, href: '#/settings/items', children: [
      ['#/settings/items', '工事項目・単価'], ['#/settings/packages', '工事テンプレート'], ['#/settings/formulas', '計算式'],
      ['#/settings/snippets', '定型文'], ['#/settings/company', '自社情報'], ['#/settings/rules', '計算ルール'], ['#/settings/data', 'データ・拡張']] }
  ];
  var CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  var OPEN_KEY = 'oumitsu:nav-open';

  var current = null, currentNav = -1, skipNext = false, lastHash = '', prefill = null;

  function parse(hash) {
    var p = (hash || '').replace(/^#\/?/, '').split('/');
    switch (p[0]) {
      case 'docs': return { nav: 1, view: function () { return EE.views.docs.render(p[1]); } };
      case 'new': return { nav: 2, view: function () { return p[1] === 'edit' ? EE.views.editor.render(null) : EE.views.quick.render(p[1]); } };
      case 'edit': return { nav: 1, view: function () { return EE.views.editor.render(p[1]); } };
      case 'clients': return { nav: 3, view: function () { return EE.views.clients.render(); } };
      case 'settings': return { nav: 4, view: function () { return EE.views.settings.render(p[1]); } };
      default: return { nav: 0, view: function () { return EE.views.home.render(); } };
    }
  }

  function readOpen() { try { return JSON.parse(root.localStorage.getItem(OPEN_KEY) || '{}'); } catch (e) { return {}; } }
  function writeOpen(o) { try { root.localStorage.setItem(OPEN_KEY, JSON.stringify(o)); } catch (e) {} }

  function renderNav() {
    var nav = document.getElementById('nav');
    var open = readOpen();
    nav.innerHTML = NAV.map(function (n, i) {
      var kids = n.children || [];
      return '<div class="nav-group' + (kids.length && open[n.key] ? ' open' : '') + '" data-g="' + n.key + '" data-st>' +
        '<div class="nav-row">' +
          '<a class="nav-item" href="' + n.href + '" data-nav="' + i + '" title="' + n.label + '（Alt+' + (i + 1) + '）">' + n.icon + '<span>' + n.label + '</span></a>' +
          (kids.length ? '<button class="nav-toggle" type="button" data-toggle="' + n.key + '" aria-expanded="' + (open[n.key] ? 'true' : 'false') + '" aria-label="' + n.label + 'のメニューを開く">' + CHEV + '</button>' : '') +
        '</div>' +
        (kids.length ? '<div class="nav-sub"><div class="nav-sub-inner">' + kids.map(function (c, k) {
          return '<a class="nav-child" href="' + c[0] + '" style="--k:' + k + '"><i></i><span>' + c[1] + '</span></a>';
        }).join('') + '</div></div>' : '') +
      '</div>';
    }).join('');
    nav.addEventListener('click', function (e) {
      var t = e.target.closest('[data-toggle]');
      if (t) { e.preventDefault(); toggleGroup(t.dataset.toggle); return; }
      var a = e.target.closest('.nav-item');
      if (a) { var g = a.closest('.nav-group'); if (g.querySelector('.nav-sub')) toggleGroup(g.dataset.g, true); }
    });
  }

  function toggleGroup(key, forceOpen) {
    var g = document.querySelector('.nav-group[data-g="' + key + '"]');
    if (!g || !g.querySelector('.nav-sub')) return;
    var open = forceOpen === true ? true : !g.classList.contains('open');
    g.classList.toggle('open', open);
    g.querySelector('.nav-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    var o = readOpen(); o[key] = open; writeOpen(o);
  }

  function setActive(i) {
    document.querySelectorAll('.nav-item').forEach(function (a) { a.classList.toggle('active', Number(a.dataset.nav) === i); });
    var h = location.hash || '#/home';
    var best = null;
    document.querySelectorAll('.nav-child').forEach(function (c) {
      var href = c.getAttribute('href');
      var hit = h === href || (href === '#/docs' && h === '#/docs/all');
      c.classList.toggle('active', hit);
      if (hit) best = c;
    });
    // 今いる画面の親メニューは開いておく
    if (NAV[i] && NAV[i].children) toggleGroup(NAV[i].key, true);
    void best;
  }

  /* サイドバー下部のユーザー表示 */
  function renderUser() {
    var u = EE.S.user || {};
    var name = u.name || '利用者';
    var el = document.getElementById('side-user');
    el.innerHTML = '<button class="side-user-btn" type="button" id="user-btn" aria-haspopup="menu" title="' + U.esc(name) + '">' +
        '<span class="avatar" style="--hue:' + (u.hue != null ? u.hue : 215) + '">' + U.esc(initial(name)) + '<i class="presence"></i></span>' +
        '<span class="who"><b>' + U.esc(name) + '</b><small>' + U.esc(u.role || '管理者') + '</small></span>' +
        '<span class="more">' + CHEV + '</span></button>' +
      '<div class="user-pop" id="user-pop" hidden role="menu">' +
        '<div class="user-pop-h"><span class="dot"></span>このPCに保存中<br><span id="foot-count"></span></div>' +
        '<button role="menuitem" data-u="profile">' + I.edit + 'プロフィールを編集</button>' +
        '<a role="menuitem" href="#/settings/company">' + I.stamp + '自社情報</a>' +
        '<a role="menuitem" href="#/settings/data">' + I.download + 'バックアップ</a>' +
        '<button role="menuitem" data-u="splash">' + I.spark + '起動アニメーションを見る</button>' +
      '</div>';
    updateCount();
  }
  function initial(name) { var t = String(name).trim().replace(/\s+/g, ''); return t ? t[0] : '？'; }
  function updateCount() {
    var f = document.getElementById('foot-count');
    if (f) f.textContent = 'マスタ ' + EE.S.items.length + '・顧客 ' + EE.S.customers.length + '・書類 ' + EE.S.documents.length;
  }
  function bindUser() {
    document.getElementById('side-user').addEventListener('click', function (e) {
      var pop = document.getElementById('user-pop');
      if (e.target.closest('#user-btn')) { toggleUserPop(!pop.hidden ? false : true); return; }
      var b = e.target.closest('[data-u]');
      if (b && b.dataset.u === 'profile') { toggleUserPop(false); editProfile(); }
      if (b && b.dataset.u === 'splash') { toggleUserPop(false); EE.splash.play({ force: 'full' }); }
      if (e.target.closest('a[role=menuitem]')) toggleUserPop(false);
    });
    document.addEventListener('mousedown', function (e) { if (!e.target.closest('#side-user')) toggleUserPop(false); });
  }
  function toggleUserPop(show) {
    var pop = document.getElementById('user-pop'); if (!pop) return;
    if (show === !pop.hidden) return;
    document.getElementById('side-user').classList.toggle('on', show);
    if (show) { pop.hidden = false; updateCount(); EE.fx.anim(pop, [{ opacity: 0, transform: 'translateY(6px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 200 }); }
    else pop.hidden = true;
  }
  function editProfile() {
    var u = EE.S.user || {};
    var HUES = [215, 195, 235, 175, 255];
    U.modal({
      title: 'プロフィール',
      body: '<div class="form-grid"><div class="field c6"><label class="req">表示名</label><input class="input" name="name" value="' + U.esc(u.name || '') + '" autofocus></div>' +
        '<div class="field c6"><label>役割</label><input class="input" name="role" value="' + U.esc(u.role || '管理者') + '" placeholder="例：営業、事務、現場管理"></div>' +
        '<div class="field c12"><label>アイコンの色</label><div style="display:flex;gap:10px">' + HUES.map(function (h) {
          return '<label class="hue-pick"><input type="radio" name="hue" value="' + h + '"' + ((u.hue || 215) === h ? ' checked' : '') + '><span class="avatar" style="--hue:' + h + '">' + U.esc(initial(u.name || '？')) + '</span></label>'; }).join('') + '</div></div></div>' +
        '<p class="hint" style="margin-top:12px">この版はログインのない1台用です。表示名はこのPCの中だけで使います（複数人での利用・権限は設計書の範囲です）。</p>',
      foot: '<button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-s>' + I.save + '保存</button>',
      onMount: function (el, api) {
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-s]').onclick = function () {
          var name = el.querySelector('[name=name]').value.trim();
          if (!name) { var f = el.querySelector('[name=name]'); f.classList.add('flag-err'); EE.fx.shake(f); return; }
          var hue = el.querySelector('[name=hue]:checked');
          EE.S.user = { name: name, role: el.querySelector('[name=role]').value.trim() || '管理者', hue: hue ? Number(hue.value) : 215 };
          U.commit(); renderUser(); api.close(); EE.fx.toast('プロフィールを保存しました');
          EE.fx.pop(document.querySelector('#side-user .avatar'));
        };
      }
    });
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
    EE.fx.stagger(document.getElementById('nav'), { step: 40 });   // メニューを上から 0.04 秒ずつ
    EE.fx.anim(document.getElementById('side-user'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: 260 });
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
    if (!EE.S.user) {
      var rep = String((EE.S.company || {}).rep || '').replace(/^(代表取締役|取締役|代表|社長)\s*/, '').trim();
      EE.S.user = { name: rep || '利用者', role: '管理者', hue: 215 };
    }
    renderUser(); bindUser();
    U.onCommit(updateCount);
  }

  EE.app = { boot: boot, intro: intro, rerender: function () { show(); }, replaceRoute: replaceRoute, makeRevision: makeRevision,
    duplicate: duplicate, newWith: newWith, takePrefill: takePrefill };
})(this);
