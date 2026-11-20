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

  /* メニュー：業務の目的別（js/features.js の SECTIONS）。準備中・利用者が隠したものは出さない。子メニューは開くと滑らかに展開する */
  var CHILDREN = {
    estimate: [['#/new', 'かんたん作成'], ['#/new/text', '文章から'], ['#/new/voice', '音声から'], ['#/new/pdf', 'PDFから'],
      ['#/new/photo', '写真から'], ['#/new/past', '過去の見積から'], ['#/new/template', 'テンプレートから'], ['#/new/edit', '通常入力']],
    docs: [['#/docs', 'すべて'], ['#/docs/draft', '下書き'], ['#/docs/issued', '確定済み']],
    settings: [['#/settings/members', '担当者'], ['#/settings/items', '工事項目・単価'], ['#/settings/packages', '工事テンプレート'], ['#/settings/formulas', '計算式'],
      ['#/settings/snippets', '定型文'], ['#/settings/company', '自社情報'], ['#/settings/rules', '計算ルール'], ['#/settings/features', '機能ライブラリ'], ['#/settings/data', 'データ・拡張']]
  };
  // 桜ミツ版（業務管理の機能を入れたもの）の子メニュー
  var LINK_CHILDREN = {
    // 桜ミツ版：左のメニューには出さず、開いた画面の上にタブで並べる（営業は営業の下のボタン、見積は一覧の中の絞り込みを使う）
    sites: [['#/o/list', '工事の一覧'], ['#/sites', '流れ（見積→入金）'], ['#/clients', 'お客様']],
    schedule: [['#/o/cal', 'カレンダー'], ['#/o/wb', 'あしたの予定'], ['#/o/board', 'タイムライン']],
    finance: [['#/finance', '粗利・会計'], ['#/o/dash', '工事の進み・入金'], ['#/analysis', '分析']],
    settings: [['#/settings/items', '工事項目・単価'], ['#/settings/packages', 'テンプレート'], ['#/settings/formulas', '計算式'], ['#/settings/snippets', '定型文'],
      ['#/settings/company', '自社情報'], ['#/settings/rules', '計算ルール'], ['#/o/settings', '目標の粗利率'], ['#/o/staff', '社員'], ['#/settings/data', '自分の名前・バックアップ']]
  };
  var NAV = [];
  function buildNav() {
    NAV = EE.features.navSections().map(function (s) { return { key: s.key, label: s.label, icon: I[s.icon], href: s.href, children: (EE.link && LINK_CHILDREN[s.key]) || CHILDREN[s.key] }; });
    return NAV;
  }
  function navOrder(key) { var i = -1; EE.features.navSections().forEach(function (s, k) { if (s.key === key) i = k; }); return i; }
  var CHEV = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7 9.8 5 4.8 5-4.8"/></svg>';
  var OPEN_KEY = 'oumitsu:nav-open';

  var current = null, currentNav = 'home', skipNext = false, lastHash = '', prefill = null;

  function parse(hash) {
    var p = (hash || '').replace(/^#\/?/, '').split('?')[0].split('/');
    switch (p[0]) {
      case 'docs': return { nav: 'docs', view: function () { return EE.views.docs.render(p[1]); } };
      case 'new': return { nav: 'estimate', view: function () { return p[1] === 'edit' ? EE.views.editor.render(null) : EE.views.quick.render(p[1]); } };
      case 'edit': return { nav: 'docs', view: function () { return EE.views.editor.render(p[1]); } };
      case 'clients': return { nav: 'clients', view: function () { return EE.views.clients.render(); } };
      case 'sites': return { nav: 'sites', view: function () { return EE.views.sites.render(); } };
      case 'site': if (EE.link && root.OUBI_LINK) return root.OUBI_LINK.route(['case', p[1], p[2]]); return { nav: 'sites', view: function () { return EE.views.site.render(p[1], p[2]); } };
      case 'schedule': return { nav: 'schedule', view: function () { return EE.views.schedule.render(); } };
      case 'finance': return { nav: 'finance', view: function () { return EE.views.finance.render(); } };
      case 'analysis': return { nav: 'analysis', view: function () { return EE.views.analysis.render(); } };
      case 'procure': return { nav: 'home', view: function () { return EE.views.planned.render('procure'); } };
      case 'folder': return { nav: 'home', view: function () { return EE.views.folders.render(p[1]); } };
      case 'settings': return { nav: 'settings', view: function () { return EE.views.settings.render(p[1]); } };
      // 桜ミツ版：業務管理の画面（枠の中に出す。#/o/<画面>[/<工事ID など>]）
      case 'o': if (EE.link && root.OUBI_LINK) return root.OUBI_LINK.route(p.slice(1)); return { nav: 'home', view: function () { return EE.views.control.render(); } };
      default: return { nav: 'home', view: function () { return EE.views.control.render(); } };
    }
  }

  function readOpen() { try { return JSON.parse(root.localStorage.getItem(OPEN_KEY) || '{}'); } catch (e) { return {}; } }
  function writeOpen(o) { try { root.localStorage.setItem(OPEN_KEY, JSON.stringify(o)); } catch (e) {} }

  function renderNav() {
    var nav = document.getElementById('nav');
    var open = readOpen();
    buildNav();
    nav.innerHTML = NAV.map(function (n, i) {
      var kids = EE.link ? [] : (n.children || []);   // 桜ミツ版：左は7項目だけ
      return '<div class="nav-group' + (kids.length && open[n.key] ? ' open' : '') + '" data-g="' + n.key + '" data-st>' +
        '<div class="nav-row">' +
          '<a class="nav-item" href="' + n.href + '" data-nav="' + n.key + '" title="' + n.label + (i < 9 ? '（Alt+' + (i + 1) + '）' : '') + '">' + n.icon + '<span>' + n.label + '</span></a>' +
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

  /* 桜ミツ版：今いるメニューの細かい画面を、見出しの下にタブで並べる */
  function secTabs(nv) {
    var bar = document.getElementById('sectabs');
    if (!bar) { bar = document.createElement('nav'); bar.id = 'sectabs'; bar.className = 'sectabs'; bar.setAttribute('aria-label', 'この中の画面'); var tb = document.querySelector('.topbar'); tb.parentNode.insertBefore(bar, tb.nextSibling); }
    var kids = (nv && nv.children) || [], h = location.hash || '#/home';
    if (!kids.length) { bar.hidden = true; bar.innerHTML = ''; return; }
    var on = kids.filter(function (c) { return h === c[0] || h.indexOf(c[0] + '/') === 0; })[0] || (/^#\/(o\/case|site)\//.test(h) ? kids[0] : null);
    bar.hidden = false;
    bar.innerHTML = kids.map(function (c) { return '<a href="' + c[0] + '"' + (c === on ? ' class="on" aria-current="page"' : '') + '>' + c[1] + '</a>'; }).join('');
    var a = bar.querySelector('.on'); if (a && a.scrollIntoView && bar.scrollWidth > bar.clientWidth) a.scrollIntoView({ block: 'nearest', inline: 'center' });
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
    i = EE.features.navKey(i);   // 桜ミツ版：顧客は「工事」、書類は「見積」などに
    document.querySelectorAll('.nav-item').forEach(function (a) { var on = a.dataset.nav === i; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var h = location.hash || '#/home';
    var best = null;
    document.querySelectorAll('.nav-child').forEach(function (c) {
      var href = c.getAttribute('href');
      var hit = h === href || (href === '#/docs' && h === '#/docs/all');
      c.classList.toggle('active', hit);
      if (hit) best = c;
    });
    // 今いる画面の親メニューは開いておく
    var nv = NAV.filter(function (n) { return n.key === i; })[0];
    if (nv && nv.children) toggleGroup(nv.key, true);
    if (EE.link) secTabs(nv);
    void best;
  }

  /* サイドバー下部のユーザー表示（いま使っている担当者） */
  function renderUser() {
    var u = U.me();
    var el = document.getElementById('side-user');
    // 桜ミツ版：ログインはない。左下は「自分の名前」（押すと設定の「自分の名前」へ）
    if (EE.link) {
      var nm = (root.OUBI_LINK && root.OUBI_LINK.me().name) || '';
      el.innerHTML = '<a class="side-user-btn" href="#/settings/data" title="自分の名前を変える">' + U.avatar({ name: nm || '？', hue: u ? u.hue : 217 }) +
        '<span class="who"><b>' + U.esc(nm || '名前を入れてください') + '</b><small>自分の名前（押して変える）</small></span></a>';
      return;
    }
    var others = U.members().filter(function (m) { return m.id !== u.id; });
    el.innerHTML = '<button class="side-user-btn" type="button" id="user-btn" aria-haspopup="menu" title="' + U.esc(u.name) + '">' +
        U.avatar(u).replace('</span>', '<i class="presence"></i></span>') +
        '<span class="who"><b>' + U.esc(u.name) + '</b><small>' + U.esc(u.role || '') + '</small></span>' +
        '<span class="more">' + CHEV + '</span></button>' +
      '<div class="user-pop" id="user-pop" hidden role="menu">' +
        '<div class="user-pop-h"><span class="dot"></span>このPCに保存中<br><span id="foot-count"></span></div>' +
        '<a role="menuitem" href="#/folder/' + u.id + '">' + I.docs + '自分のファイル</a>' +
        '<button role="menuitem" data-u="profile">' + I.edit + 'プロフィールを編集</button>' +
        (others.length ? '<div class="user-pop-label">担当者を切り替え</div>' + others.map(function (m) {
          return '<button role="menuitem" data-u="switch" data-id="' + m.id + '">' + U.avatar(m, 20) + U.esc(m.name) + '<small>' + U.esc(m.role || '') + '</small></button>';
        }).join('') : '') +
        '<a role="menuitem" href="#/settings/members">' + I.users + '担当者を管理</a>' +
        '<a role="menuitem" href="#/settings/data">' + I.download + 'バックアップ</a>' +
        '<button role="menuitem" data-u="splash">' + I.spark + '起動アニメーションを見る</button>' +
        (EE.auth && EE.auth.current() ? '<button role="menuitem" data-u="signout">' + I.lock + 'サインアウト<small>' + U.esc(EE.auth.current().email) + '</small></button>' : '') +
      '</div>';
    updateCount();
  }
  function updateCount() {
    var f = document.getElementById('foot-count');
    if (f) f.textContent = 'マスタ ' + EE.S.items.length + '・顧客 ' + EE.S.customers.length + '・書類 ' + EE.S.documents.length;
  }
  function bindUser() {
    document.getElementById('side-user').addEventListener('click', function (e) {
      if (EE.link) return;
      var pop = document.getElementById('user-pop');
      if (e.target.closest('#user-btn')) { toggleUserPop(!pop.hidden ? false : true); return; }
      var b = e.target.closest('[data-u]');
      if (b && b.dataset.u === 'profile') { toggleUserPop(false); EE.views.folders.memberForm(U.me(), function () { renderUser(); EE.fx.pop(document.querySelector('#side-user .avatar')); }); }
      if (b && b.dataset.u === 'switch') {
        toggleUserPop(false);
        EE.S.currentMemberId = b.dataset.id; U.commit(); renderUser();
        EE.fx.pop(document.querySelector('#side-user .avatar'));
        EE.fx.toast(U.me().name + ' として使います（新しく作る見積の担当者になります）');
        if (/^#\/(home)?$/.test(location.hash || '#/home')) show();
      }
      if (b && b.dataset.u === 'signout') {
        toggleUserPop(false);
        var out = function () { EE.auth.signOut().then(function () { location.reload(); }); };
        if (EE.views.editor.isDirty()) U.confirmBox('保存していない変更があります。サインアウトしますか？', 'サインアウト', { danger: true }).then(function (ok) { if (ok) out(); });
        else out();
        return;
      }
      if (b && b.dataset.u === 'splash') { toggleUserPop(false); EE.splash.play({ replay: true, onReveal: intro }); }
      if (e.target.closest('a[role=menuitem]')) toggleUserPop(false);
    });
    document.addEventListener('mousedown', function (e) { if (!e.target.closest('#side-user')) toggleUserPop(false); });
  }
  function toggleUserPop(show) {
    var pop = document.getElementById('user-pop'); if (!pop) return;
    if (show === !pop.hidden) return;
    document.getElementById('side-user').classList.toggle('on', show);
    var ub = document.getElementById('user-btn'); if (ub) ub.setAttribute('aria-expanded', show ? 'true' : 'false');
    if (show) { pop.hidden = false; updateCount(); var fi = pop.querySelector('a, button'); if (fi) setTimeout(function () { fi.focus(); }, 0); EE.fx.anim(pop, [{ opacity: 0, transform: 'translateY(6px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 200 }); }
    else pop.hidden = true;
  }

  var navSeq = 0;
  function show(animate) {
    var r = parse(location.hash);
    var dir = navOrder(r.nav) >= navOrder(currentNav) ? 1 : -1;
    var view = document.getElementById('view');
    var token = ++navSeq;
    var go = function () {
      if (token !== navSeq) return;          // 続けて切り替えたときは最後の画面だけ表示する
      if (EE.views.control) EE.views.control.track(location.hash);   // よく使う機能（ホームのウィジェット）
      view = document.getElementById('view'); // 切り替えの途中で差し替わっていても今の要素を使う
      current = r.view();
      document.body.classList.toggle('ob-on', !!current.oubi);   // 桜ミツ版：業務管理の枠を出す画面
      currentNav = r.nav;
      setActive(r.nav);
      document.getElementById('title').textContent = current.title;
      document.getElementById('crumb').textContent = current.crumb || '';
      document.getElementById('actions').innerHTML = current.actions || '';
      document.title = current.title + (EE.host ? ' — 桜美建設' : ' — 桜ミツ');
      // 画面ごとにリスナーを付け直すため、view 要素ごと差し替える
      var fresh = view.cloneNode(false);
      fresh.innerHTML = '<div class="view-inner">' + current.html + '</div>';
      view.parentNode.replaceChild(fresh, view);
      fresh.scrollTop = 0;
      document.getElementById('actions').onclick = null;
      if (current.mount) current.mount(fresh.firstChild);
      if (EE.a11y) { EE.a11y.enhance(fresh); EE.a11y.enhance(document.getElementById('actions')); }
      // 画面を切り替えた後にフォーカスが行き場を失ったら、画面の見出しへ（読み上げで移動が分かる）
      if (animate !== false && (!document.activeElement || document.activeElement === document.body)) {
        var h1 = document.getElementById('title'); h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true });
      }
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
  /**
   * 書類を確定する（発行確定）。要修正の指摘があれば確定しない。
   * 確定すると編集・削除できず、PDF は確定時の写し（宛名・自社情報）で作る。
   * @return {object} { ok, errors }
   */
  function finalizeDoc(doc) {
    if (doc.status === 'issued') return { ok: true, errors: 0 };
    var errs = EE.check.summary(U.checkDoc(doc)).error;
    if (errs) return { ok: false, errors: errs };
    var now = new Date().toISOString(), st = EE.S.settings;
    if (!doc.no) doc.no = EE.data.nextNumber(EE.S, doc.issueDate);
    doc.status = 'issued';
    doc.issuedAt = now;
    doc.rules = { lineRounding: st.lineRounding, taxRounding: st.taxRounding, overheadRounding: st.overheadRounding, discountRounding: st.discountRounding };
    doc.totals = EE.engine.snapshot(EE.engine.calc(doc, doc.rules));
    doc.snap = EE.data.snapOf(EE.S, doc);
    doc.history = (doc.history || []).concat([{ at: now, action: '発行確定' }]).slice(-50);
    return { ok: true, errors: 0 };
  }

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
    d.issuedAt = null; d.rules = null; delete d.snap;   // 新しい版は下書き。確定時の写しは持たない
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
    var d = EE.data.newEstimate(EE.S, { noNumber: true, customerId: src.customerId, projectId: src.projectId, title: src.title, ownerId: src.ownerId });
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
  var booted = false, introWaiting = false;
  function intro() {
    if (!booted) { introWaiting = true; return; }   // まだ読み込み中：終わったらすぐ展開する（それまではスケルトン）
    var v = document.getElementById('view');
    EE.fx.pageIn(v.firstChild, 1);
    EE.fx.stagger(v);
    EE.fx.stagger(document.getElementById('nav'), { step: 40 });   // メニューを上から 0.04 秒ずつ
    EE.fx.anim(document.getElementById('side-user'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: 260 });
    EE.fx.countAll(v);
  }

  /**
   * サインインした人を担当者名簿につなぐ。
   * そのアカウントの担当者がいればその人。いなければ、最初に自動で作られた仮の担当者（「利用者」）を引き継ぐか、新しく追加する。
   * 名前が同じというだけでは、他の人の担当者には紐づけない（なりすまし防止）。
   */
  function linkMember(user) {
    var ms = EE.S.members || (EE.S.members = []);
    var m = ms.filter(function (x) { return x.accountId === user.id; })[0];
    if (!m) { m = ms.filter(function (x) { return !x.accountId && x.placeholder; })[0]; if (m) { m.name = user.name; delete m.placeholder; } }
    if (!m) { m = { id: EE.data.uid('mem'), name: user.name, role: ms.length ? '担当' : '管理者', hue: 200 + (ms.length * 47) % 160 }; ms.push(m); }
    m.accountId = user.id;
    EE.S.currentMemberId = m.id;
    EE.data.save(EE.S);
  }

  function boot(opts) {
    opts = opts || {};
    EE.S = EE.data.load();
    if (opts.user) linkMember(opts.user);
    renderNav();
    var slot = document.getElementById('brand-crest');
    if (!slot.firstChild) slot.innerHTML = EE.crest.svg({ id: 'brand', className: 'brand-crest', fieldR: 106 });
    // 業務管理の中で動くとき（EE.host）：画面の切り替えは業務管理側（mitsu-bridge.js）が route() を呼ぶ
    if (!opts.host) {
      if (!location.hash) replaceRoute('#/home');
      show(false);
    }
    booted = true;
    if (!opts.host && (!opts.deferIntro || introWaiting)) { introWaiting = false; intro(); }

    if (!opts.host) root.addEventListener('hashchange', onHash);
    // 押したときの波紋：業務管理の中では、見積の画面（.ee）の中のボタンだけ（業務管理のボタンの形を崩さない）
    document.addEventListener('pointerdown', function (e) { if (!opts.host || (e.target.closest && e.target.closest('.ee'))) EE.fx.ripple(e); });
    if (!opts.host) EE.fx.bindAmbient();   // カーソルを追う光・カードの傾き・クリックの波紋と粒
    document.addEventListener('click', function (e) {
      var tr = e.target.closest('[data-href]');
      if (tr && !e.target.closest('button, a, input, select')) location.hash = tr.dataset.href;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var m = U.topModal(); if (m) { m.close(); return; }
        var up = document.getElementById('user-pop'); if (up && !up.hidden) { toggleUserPop(false); var ub2 = document.getElementById('user-btn'); if (ub2) ub2.focus(); return; }
      }
      // Alt（Mac は Option）＋1〜5。Mac では e.key が記号になるので e.code で見る。入力中は横取りしない
      var dg = /^Digit([1-9])$/.exec(e.code || '');
      if (e.altKey && dg && NAV[Number(dg[1]) - 1] && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); location.hash = NAV[Number(dg[1]) - 1].href; return; }
      if (current && current.mount && EE.views.editor && /^#\/(new\/edit|edit)/.test(location.hash)) EE.views.editor.onKey(e);
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { /* 一覧画面での印刷はブラウザ既定のまま */ }
    });
    root.addEventListener('beforeunload', function (e) {
      if (EE.views.editor.isDirty()) { e.preventDefault(); e.returnValue = ''; }
    });
    U.members();
    renderUser(); bindUser();
    document.getElementById('open-palette').addEventListener('click', function () { EE.palette.open(); });
    if (EE.a11y && document.querySelector('.sidebar')) EE.a11y.enhance(document.querySelector('.sidebar'));
    // 別のタブで保存されたら、この画面からは保存せず再読み込みを促す（上書きで相手の変更を消さない）
    if (!opts.host) root.addEventListener('storage', function (e) {
      if (e.key !== EE.data.KEY || !EE.data.markStale(e.newValue)) return;
      if (document.getElementById('stale-box')) return;
      U.modal({ title: '別のタブで更新されました', body: '<p id="stale-box" style="margin:0;color:var(--text-2)">このアプリを別のタブ（またはウィンドウ）でも開いていて、そちらで内容が保存されました。<br>この画面のまま保存すると、そちらの変更を消してしまうため、ここからは保存しません。再読み込みして最新の内容を開いてください。</p>',
        foot: '<button class="btn primary" data-rl>再読み込み</button>', onMount: function (el) { el.querySelector('[data-rl]').onclick = function () { location.reload(); }; } });
    });
    // 保存データが読めなかったとき（壊れていた等）：元のデータは退避してある
    var li = EE.data.loadIssue();
    if (li) U.modal({ title: '保存データを読めませんでした', body: '<p style="margin:0;color:var(--text-2)">このブラウザに保存されていたデータが壊れていたため、読み込めませんでした。' +
      (li.key ? '元のデータは消さずに退避しています（保存名：' + U.esc(li.key) + '）。設定・マスタ →「データ」のバックアップと合わせて、復元をご相談ください。' : '退避もできなかったため、この画面からは保存しません。ブラウザの空き容量を確認してください。') + '</p>' });
    // ブラウザの判断でデータが消されにくくする（対応ブラウザのみ）
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    U.onCommit(updateCount);
  }

  EE.app = { renderNav: function () { var nav = document.getElementById('nav'); var fresh = nav.cloneNode(false); nav.parentNode.replaceChild(fresh, nav); renderNav(); setActive(currentNav); }, renderUser: function () { renderUser(); }, boot: boot, linkMember: linkMember, intro: intro, rerender: function () { show(); }, replaceRoute: replaceRoute, makeRevision: makeRevision,
    duplicate: duplicate, finalizeDoc: finalizeDoc, newWith: newWith, takePrefill: takePrefill,
    // 業務管理の中で動くときに使う
    setNav: function (k) { currentNav = k; setActive(k); },
    route: function (force) { if (!force && lastHash === location.hash && current) return; onHash(); }, lastHash: function () { return lastHash; },
    discardCurrent: function () { if (current && current.discard) current.discard(); if (current) current.guard = null; } };
})(this);
