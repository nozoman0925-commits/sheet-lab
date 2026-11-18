/*
 * 起動シーケンス（起動・リロード時だけ。画面遷移では出さない）
 *
 *  0.00–0.45  ロゴ（既存の家紋＋桜ミツ）が中央にフェードイン、scale 0.92→1.0（ease-out）
 *  0.15–0.60  アプリ名が 0.15 秒遅れてフェードイン
 *  0.60–1.00  一拍置く（静止）
 *  1.00–1.62  ロゴがサイドバー左上の定位置へ移動しながら縮小（ease-in-out）
 *  1.15–1.57  移動に 0.15 秒重ねて背景が消え、メイン画面がフェードイン（メニュー・カードは時間差で）
 *  → 全体 約2.0〜2.2 秒。1.15 秒の時点でもう操作できる
 *
 * 位置の決め方：最初にサイドバーのロゴ（家紋・文字）の実際の位置と大きさを測り、
 * 「最終位置にそのまま置いた要素」に translate＋scale をかけて中央に見せる。
 * 移動はこの変形を外すだけなので、着地位置はサイドバーのロゴとピッタリ一致する。
 * 動かすのは transform と opacity だけ（Web Animations API。合成スレッドで動く）。
 * クリック・キー入力でいつでもスキップできる。データの読み込みとは独立して進む
 * （読み込み中は index.html のスケルトンが見える）。
 */
(function (root) {
  'use strict';

  var T = { in: 450, nameDelay: 150, move: 1000, moveDur: 620, reveal: 1150, revealDur: 420 };
  var EASE_OUT = 'cubic-bezier(.2,.8,.2,1)', EASE_IN_OUT = 'cubic-bezier(.65,0,.35,1)';
  var current = null;

  function rect(el) { var r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }

  /**
   * @param {object} opts { onReveal: function（メイン画面を出し始める時に1回呼ぶ） }
   */
  function play(opts) {
    opts = opts || {};
    if (current) current.finish();
    var reveal = once(opts.onReveal || opts.onDone);
    if (/[?&]splash=off/.test(location.search) && !opts.replay) { reveal(); return null; }
    var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // サイドバーのロゴ（着地点）。家紋がまだ入っていなければ同じデータで入れておく
    var slot = document.getElementById('brand-crest');
    if (slot && !slot.firstChild) slot.innerHTML = root.EE.crest.svg({ id: 'brand', className: 'brand-crest', fieldR: 106 });
    var crestEl = slot && slot.querySelector('svg'), textEl = document.querySelector('.brand-text');
    if (!crestEl || !textEl) { reveal(); return null; }
    var brand = document.querySelector('.brand');

    var el = document.createElement('div');
    el.className = 'boot';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-label', '桜ミツ 起動中');
    el.innerHTML = '<div class="boot-bg"></div>';
    var fc = crestEl.cloneNode(true), ft = textEl.cloneNode(true);
    fc.removeAttribute('id'); fc.classList.add('boot-fly');
    ft.classList.add('boot-fly');
    el.appendChild(fc); el.appendChild(ft);
    document.body.appendChild(el);
    brand.classList.add('boot-hide');

    // 最終位置（サイドバー）に置く
    var rc = rect(crestEl), rt = rect(textEl);
    place(fc, rc); place(ft, rt);

    // 中央の見せ方：家紋 約128px、その下にアプリ名（約2倍）。最終位置からの差分で計算
    var vw = root.innerWidth, vh = root.innerHeight;
    var cs = Math.min(128, vh * 0.2) / rc.w, ts = 2;
    var gap = 22, groupH = rc.h * cs + gap + rt.h * ts;
    var top = vh / 2 - groupH / 2;
    var cC = { x: vw / 2, y: top + rc.h * cs / 2 };
    var tC = { x: vw / 2, y: top + rc.h * cs + gap + rt.h * ts / 2 };
    var cT = 'translate(' + (cC.x - (rc.x + rc.w / 2)) + 'px,' + (cC.y - (rc.y + rc.h / 2)) + 'px) scale(' + cs + ')';
    var tT = 'translate(' + (tC.x - (rt.x + rt.w / 2)) + 'px,' + (tC.y - (rt.y + rt.h / 2)) + 'px) scale(' + ts + ')';
    var cT0 = cT.replace(/scale\(([^)]+)\)/, function (m, s) { return 'scale(' + (s * 0.92) + ')'; });
    var tT0 = tT.replace(/\)$/, '') + ') translateY(4px)';

    var anims = [], timers = [], done = false, revealed = false;
    var k = reduce ? 0 : 1;   // 動きを減らす設定：移動・拡大はせず、短いフェードだけ
    function a(node, frames, o) { var x = node.animate(frames, Object.assign({ fill: 'both' }, o)); anims.push(x); return x; }

    if (k) {
      a(fc, [{ opacity: 0, transform: cT0 }, { opacity: 1, transform: cT }], { duration: T.in, easing: EASE_OUT });
      a(ft, [{ opacity: 0, transform: tT0 }, { opacity: 1, transform: tT }], { duration: T.in, delay: T.nameDelay, easing: EASE_OUT });
      a(fc, [{ transform: cT }, { transform: 'none' }], { duration: T.moveDur, delay: T.move, easing: EASE_IN_OUT, fill: 'forwards' });
      a(ft, [{ transform: tT }, { transform: 'none' }], { duration: T.moveDur, delay: T.move, easing: EASE_IN_OUT, fill: 'forwards' });
      a(el.firstChild, [{ opacity: 1 }, { opacity: 0 }], { duration: T.revealDur, delay: T.reveal, easing: 'ease-out' });
      timers.push(setTimeout(startReveal, T.reveal));
      timers.push(setTimeout(finish, T.move + T.moveDur + 20));
    } else {
      fc.style.opacity = ft.style.opacity = '1';   // 定位置に置いたまま、背景だけ消す
      a(el.firstChild, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 300 });
      timers.push(setTimeout(startReveal, 300));
      timers.push(setTimeout(finish, 520));
    }

    function startReveal() {
      if (revealed) return; revealed = true;
      el.classList.add('passive');   // ここから下の画面を操作できる
      reveal();
    }
    function finish() {
      if (done) return; done = true;
      timers.forEach(clearTimeout);
      anims.forEach(function (x) { try { x.cancel(); } catch (e) {} });
      document.removeEventListener('keydown', onKey, true);
      brand.classList.remove('boot-hide');
      el.remove();
      current = null;
      startReveal();
    }
    function onKey(e) {
      if (!revealed) { e.preventDefault(); e.stopPropagation(); }
      finish();
    }
    el.addEventListener('pointerdown', function (e) { if (!revealed) { e.preventDefault(); finish(); } });
    document.addEventListener('keydown', onKey, true);
    current = { finish: finish };
    return current;
  }

  function place(node, r) {
    node.style.left = r.x + 'px'; node.style.top = r.y + 'px';
    node.style.width = r.w + 'px'; node.style.height = r.h + 'px';
  }
  function once(fn) { var called = false; return function () { if (!called && fn) { called = true; fn(); } }; }

  root.EE = root.EE || {};
  root.EE.splash = { play: play, skip: function () { if (current) current.finish(); } };
})(this);
