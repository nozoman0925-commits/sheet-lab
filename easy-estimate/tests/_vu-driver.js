/*
 * 仮想ユーザーの操作ドライバー（ページ内で動く。tests/vusers.js が読み込む）
 * 本物の画面を DOM のイベント（click / input / change / keydown）で操作し、結果を計算エンジンで採点する。
 */
(function () {
  'use strict';
  var errs = [];
  window.addEventListener('error', function (e) { errs.push(String(e.message)); });
  window.addEventListener('unhandledrejection', function (e) { errs.push('promise: ' + (e.reason && e.reason.message || e.reason)); });

  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  async function waitFor(fn, ms) {
    var t = performance.now();
    while (performance.now() - t < (ms || 2500)) { var v = fn(); if (v) return v; await sleep(25); }
    return null;
  }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var steps = 0, stumbles = [];
  function click(el) { if (!el) throw new Error('押す対象が見つからない'); steps++; el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); }
  function dbl(el) { steps++; el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window })); }
  function type(el, v) {
    if (!el) throw new Error('入力欄が見つからない'); steps++;
    el.focus(); el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function key(el, k, opt) { steps++; (el || document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, opt || {}))); }
  async function go(hash) {
    steps++; location.hash = hash; await sleep(60);
    // 保存していない変更があると「破棄して移動しますか？」が出る（人なら選ぶ）
    var dm = await waitFor(function () { return $$('.modal .btn').filter(function (b) { return /破棄して移動/.test(b.textContent); })[0]; }, 150);
    if (dm) { click(dm); stumbles.push('保存せずに移動しようとして確認が出た'); await sleep(120); }
    await waitFor(function () { return $('#view') && $('#view').children.length; }); await sleep(40);
  }
  function rnd(seed) { var s = seed; return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

  /** 状態を作り直す（サンプルデータ）。ユーザーごとに独立させる */
  async function reset() {
    try { localStorage.removeItem(EE.data.KEY); localStorage.removeItem('oumitsu:recovery'); } catch (e) {}
    EE.S = EE.data.sampleState();   // ユーザーごとに同じサンプル一式から始める
    var u = EE.auth.current(); if (u) { var m = EE.S.members[0]; m.accountId = u.id; EE.S.currentMemberId = m.id; }
    var top, guard = 0; while ((top = EE.ui.topModal && EE.ui.topModal()) && guard++ < 10) top.close();
    $$('.modal-back, .overlay').forEach(function (o) { if (!o.querySelector('#auth')) o.remove(); });
    var old = $('#auth'); if (old) { old.remove(); document.body.classList.remove('auth-locked'); }   // 前の人のログイン画面が残っていたら片付ける
    await go('#/home');
  }

  var T = {};
  /* 初めての人：アカウントを作ってサインイン（ときどき確認用パスワードを打ち間違える） */
  T.signup = async function (u, R) {
    await EE.auth.signOut();
    var ok = false; EE.login.require(function () { ok = true; });
    var card = await waitFor(function () { return $('#auth-card'); }); if (!card) throw new Error('ログイン画面が出ない');
    if (!$('#f-signup') || $('#f-signup').hidden) { click($('#auth [data-go="signup"]:not([inert] *)') || $('.blade-l [data-go=signup]')); await waitFor(function () { return !$('#f-signup').hidden; }, 2000); await sleep(650); }
    var f = $('#f-signup');
    type(f.elements.name, u.name); type(f.elements.email, u.email); type(f.elements.password, u.password);
    type(f.elements.password2, u.typo ? u.password + 'x' : u.password);
    click(f.querySelector('.auth-submit'));
    if (u.typo) {
      var e = await waitFor(function () { return $('#a-signup-password2-err').textContent; }, 1500);
      if (!e) throw new Error('打ち間違いにエラーが出ない'); stumbles.push('確認用パスワードの打ち間違い→エラー表示で気づけた');
      type(f.elements.password2, u.password); click(f.querySelector('.auth-submit'));
    }
    await waitFor(function () { return ok; }, 20000);   // パスワードの変換（PBKDF2）は意図的に重い
    if (!ok) throw new Error('登録できない: ' + ($('#f-signup .auth-alert') || {}).textContent);
    var cur = EE.auth.current(); if (!cur || cur.email !== u.email.toLowerCase()) throw new Error('サインイン状態にならない');
    if (!/(^|\s)/.test(document.body.className) || document.body.classList.contains('auth-locked')) throw new Error('業務画面が出ない');
    EE.app.renderUser();
    return { check: 'アカウント作成→業務画面' };
  };

  /* 見積担当：マスタから明細を選び、数量を入れて保存 */
  T.estimate = async function (u, R) {
    await go('#/new/edit'); var pick = await waitFor(function () { return $('#pick'); }); if (!pick) throw new Error('明細の検索欄が無い');
    var cs = $('[data-f="customerId"]'); var opts = $$('option', cs).filter(function (o) { return o.value; });
    if (opts.length) { cs.value = opts[Math.floor(R() * opts.length)].value; cs.dispatchEvent(new Event('change', { bubbles: true })); steps++; }
    type($('[data-f="title"]'), u.title);
    var items = EE.S.items.filter(function (i) { return i.active !== false; }), want = 1 + Math.floor(R() * 5);
    for (var k = 0; k < want; k++) {
      var it = items[Math.floor(R() * items.length)];
      var p = $('#pick'); type(p, it.name.slice(0, Math.max(2, Math.min(6, it.name.length))));
      await sleep(30); key(p, 'Enter'); await sleep(40);
      var rows = $$('#line-body tr'); var last = rows[rows.length - 1];
      var q = last && last.querySelector('.qty'); if (q) type(q, String(u.qtys[k % u.qtys.length]));
    }
    await sleep(30);
    var before = EE.S.documents.length;
    click($('[data-act="save"]') || $('#btn-save')); await sleep(80);
    var d = await waitFor(function () { return EE.S.documents.filter(function (x) { return x.title === u.title; })[0]; }, 2000);
    if (!d) {
      var flags = $$('.flag-err').map(function (e) { return e.getAttribute('data-f') || e.className; });
      throw new Error('保存できない（未入力の指摘: ' + flags.join(',') + '）');
    }
    var r = EE.engine.calc(d, EE.S.settings || {});
    if (!d.totals || d.totals.total !== r.total) throw new Error('保存された合計が計算エンジンと違う');
    if (!d.lines.every(function (l) { return l.itemId && EE.ui.findItem(l.itemId); })) throw new Error('マスタIDの無い明細がある');
    if (!$('#line-count') || !/\d/.test($('#line-count').textContent)) stumbles.push('明細の行数表示が無い');
    return { check: '見積を保存（' + d.lines.length + '行・' + r.total + '円）', created: EE.S.documents.length - before };
  };

  /* 現場担当：文章から見積の下書き */
  T.quick = async function (u) {
    await go('#/new/text'); var tx = await waitFor(function () { return $('#q-text'); }); if (!tx) throw new Error('文章の入力欄が無い');
    type(tx, u.text); click($('#q-parse')); var mk = await waitFor(function () { return $('[data-act="make"]'); }, 2000);
    if (!mk) { stumbles.push('文章から明細を作れなかった: ' + u.text); return { check: '明細にできない文章（想定内）', soft: true }; }
    click(mk);
    var ok = await waitFor(function () { return /#\/(new\/edit|edit)/.test(location.hash) && $$('#line-body tr').length; }, 2500);
    if (!ok) throw new Error('下書きの編集画面に明細が入らない');
    return { check: '文章→下書き（' + $$('#line-body tr').length + '行）' };
  };

  /* 事務：書類を探してカードを見て、開く */
  T.find = async function (u, R) {
    await go('#/docs'); var q = await waitFor(function () { return $('#f-q'); });
    var docs = EE.S.documents; var target = docs[Math.floor(R() * docs.length)];
    var term = (target.title || target.no).slice(0, 4);
    type(q, term); await sleep(200);
    var row = await waitFor(function () { return $$('#doc-table tr[data-pick]').filter(function (tr) { return tr.dataset.pick === target.id; })[0]; }, 1500);
    if (!row) throw new Error('検索で見つからない: ' + term);
    click(row); var card = await waitFor(function () { return $('#flip'); }, 1500); if (!card) throw new Error('めくるカードが出ない');
    click($('#flip [data-act="flip"]')); await sleep(30); if (!$('#flip').classList.contains('flipped')) throw new Error('カードが裏返らない');
    dbl(row); var opened = await waitFor(function () { return location.hash === '#/edit/' + target.id; }, 1500);
    if (!opened) throw new Error('ダブルクリックで開けない');
    return { check: '検索→カード→裏返す→開く' };
  };

  /* 事務：顧客を登録（メモつき） */
  T.customer = async function (u) {
    await go('#/clients'); click(await waitFor(function () { return $('[data-act="new-c"]'); }));
    var m = await waitFor(function () { return $('.modal [name="name"]'); }); if (!m) throw new Error('登録フォームが出ない');
    var md = m.closest('.modal');
    if (u.skipName) { click($('[data-s]', md)); await sleep(50); if (!m.classList.contains('flag-err')) throw new Error('名称の未入力を指摘しない'); stumbles.push('名称を入れ忘れ→赤枠で気づけた'); }
    type(m, u.company); var memo = $('[name="memo"]', md); if (memo) type(memo, u.memo);
    click($('[data-s]', md)); await sleep(80);
    var c = EE.S.customers.filter(function (x) { return x.name === u.company; })[0]; if (!c) throw new Error('顧客が保存されない');
    if (!$('#c-list') || $('#c-list').textContent.indexOf(u.company) < 0) throw new Error('一覧に出ない');
    return { check: '顧客を登録' };
  };

  /* 社長：マスタに工事項目を追加 */
  T.master = async function (u) {
    await go('#/settings/items'); click(await waitFor(function () { return $('[data-act="new-item"]'); }));
    var md = await waitFor(function () { return $('.modal [name="name"]') && $('.modal'); }); if (!md) throw new Error('マスタ登録フォームが出ない');
    type($('[name="code"]', md), u.code); type($('[name="name"]', md), u.itemName); type($('[name="unit"]', md), u.unit); type($('[name="unitPrice"]', md), String(u.price));
    click($('[data-s]', md) || $('.modal .btn.primary')); await sleep(80);
    var it = EE.S.items.filter(function (x) { return x.code === u.code; })[0];
    if (!it) { var bad = $$('.modal .flag-err').map(function (e) { return e.name; }); throw new Error('マスタに保存されない（指摘: ' + bad.join(',') + '）'); }
    if (it.unitPrice !== u.price) throw new Error('単価が違う: ' + it.unitPrice);
    return { check: 'マスタ追加' };
  };

  /* 社長：ホームの案件フローで段階を進める */
  T.advance = async function (u, R) {
    await go('#/home'); var dots = await waitFor(function () { return $$('.flow-case').length && $$('.flow-case'); }); if (!dots) throw new Error('フロー図に案件が無い');
    var cand = []; for (var i = 0; i < dots.length; i++) cand.push(dots[i]);
    var d = cand[Math.floor(R() * cand.length)]; var id = d.dataset.case; click(d); await sleep(60);
    var btn = await waitFor(function () { return $('[data-act="flow-advance"]'); }, 1200);
    if (!btn) return { check: '最後の段階（入金）または現場の無い見積：進める物なし', soft: true };
    var p = EE.ui.findProject(btn.dataset.id), s0 = EE.data.stageIndex(p.stage || 'estimate');
    click(btn); await sleep(80);
    var cf = $('.modal .btn.primary, .modal [data-ok]'); if (cf) { click(cf); await sleep(80); }
    if (EE.data.stageIndex(p.stage) !== s0 + 1) throw new Error('段階が進まない（' + s0 + '→' + EE.data.stageIndex(p.stage) + '）');
    return { check: '段階を進める' };
  };

  /* 見積担当：同じ現場に別パターン（B案） */
  T.pattern = async function (u, R) {
    var ps = EE.S.projects.filter(function (p) { return EE.S.documents.some(function (d) { return d.projectId === p.id; }); });
    var p = ps[Math.floor(R() * ps.length)]; var n0 = EE.S.documents.filter(function (d) { return d.projectId === p.id; }).length;
    await go('#/site/' + p.id); var b = await waitFor(function () { return $('[data-act="pattern-from"]'); }); if (!b) throw new Error('別パターンのボタンが無い');
    click(b);
    var save = await waitFor(function () { return /#\/(new\/edit|edit)/.test(location.hash) && ($('[data-act="save"]') || $('#btn-save')); }, 2500);
    if (!save) throw new Error('別パターンの編集画面が開かない');
    var lb = $('[data-f="patternLabel"]'); if (lb) type(lb, u.pattern);
    click(save); await sleep(80);
    var n1 = EE.S.documents.filter(function (d) { return d.projectId === p.id; }).length;
    if (n1 !== n0 + 1) throw new Error('パターンが増えない（' + n0 + '→' + n1 + '）');
    return { check: '別パターンを保存' };
  };

  window.VU = {
    run: async function (u) {
      errs = []; steps = 0; stumbles = [];
      var R = rnd(u.seed), t0 = performance.now(), res, error = null;
      try { await reset(); res = await T[u.task](u, R); } catch (e) { error = e.message || String(e); }
      // 画面の健全性：はみ出し・NaN 表示
      var txt = document.body.innerText || '';
      var bad = (txt.match(/NaN|undefined|\[object Object\]/g) || []);
      var over = document.documentElement.scrollWidth > window.innerWidth + 2;
      return { id: u.id, task: u.task, ok: !error && !errs.length && !bad.length, error: error, jsErrors: errs.slice(0, 3), bad: bad.slice(0, 2), over: over,
        ms: Math.round(performance.now() - t0), steps: steps, stumbles: stumbles, check: res && res.check, soft: res && res.soft };
    }
  };
})();
