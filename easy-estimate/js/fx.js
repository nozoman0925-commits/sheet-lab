/*
 * マイクロインタラクション（Web Animations API。外部ライブラリ不要・オフライン動作）
 * - 動きの文法：時間は 0.15秒（反応）／0.25秒（画面内の変化）／0.4秒（画面の切り替え）の3つだけ。
 *   曲線は cubic-bezier(0.2, 0, 0, 1)（速く出て、すっと止まる）の1つだけ。例外は起動の演出と数字のカウントアップ（0.6秒まで）。
 * - 動かすのは「状態が変わったもの」だけ。動きの途中でも次の操作を受け付ける（待たせない）。
 * - transform / opacity だけを動かして 60fps を保つ
 * - 連続操作で遅れないよう、同じ要素の古いアニメーションは止めてから新しく動かす
 * - OS の「視差効果を減らす」設定では動きを止める
 */
(function (root) {
  'use strict';
  var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 検証モード：?motion=off か localStorage「oumitsu:motion」= off で、動きを一括で切る（ランダム操作のテストなど）
  try { if (/[?&]motion=off/.test(location.search) || localStorage.getItem('oumitsu:motion') === 'off') { reduce = true; document.documentElement.classList.add('no-motion'); } } catch (e) {}
  var EASE = 'cubic-bezier(0.2, 0, 0, 1)';
  var T = { react: 150, change: 250, page: 400 };
  function snap(d) { return d <= 200 ? T.react : d <= 325 ? T.change : T.page; }
  function mv() { return root.innerWidth <= 760 ? 4 : 8; }   // 動く量：スマホは半分

  function anim(el, frames, opts) {
    if (!el || reduce || !el.animate) return null;
    if (el._eeAnim) { try { el._eeAnim.cancel(); } catch (e) {} }
    var o = Object.assign({ duration: T.change, easing: EASE, fill: 'backwards' }, opts, { easing: EASE });
    o.duration = snap(o.duration);                                          // 秒数は 0.15／0.25／0.4 のどれかに寄せる
    if (o.delay) o.delay = Math.min(160, Math.round(o.delay / 40) * 40);   // 時間差は 40ms 刻み、全体で 0.4秒以内
    el._eeAnim = el.animate(frames, o);
    return el._eeAnim;
  }

  /** 子要素 [data-st] を時間差で順番に出す */
  function stagger(scope, opts) {
    opts = opts || {};
    var els = (scope || document).querySelectorAll('[data-st]');
    // 40ms 刻み。全体で 0.4秒以内（遅れて出るものも 0.15秒で始め、0.25秒で終える）
    var step = 40, max = 3;
    els.forEach(function (el, i) {
      anim(el, [
        { opacity: 0, transform: 'translateY(' + mv() + 'px)' },
        { opacity: 1, transform: 'none' }
      ], { duration: T.change, delay: Math.min(i, max) * step });
    });
  }

  /** 画面遷移：前の画面を軽く消し、新しい画面をスライド＋フェードで入れる */
  function pageIn(el, dir, quick) {
    anim(el, [
      { opacity: 0, transform: 'translateX(' + (dir < 0 ? -mv() : mv()) + 'px)' },
      { opacity: 1, transform: 'none' }
    ], { duration: quick ? T.change : T.page });   // タブの切り替えは 0.25秒、画面の切り替えは 0.4秒
  }
  function pageOut(el, done) {
    if (reduce || !el.animate) return done();
    var a = el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(-' + (mv() / 2) + 'px)' }], { duration: T.react, easing: EASE, fill: 'forwards' });
    var called = false, fin = function () { if (called) return; called = true; done(); };
    a.onfinish = function () { a.cancel(); fin(); };
    setTimeout(fin, 180);   // 描画が重い瞬間でも切り替えが止まらないように
  }

  /** 数字のカウントアップ（data-count / data-format="yen|int|pct"） */
  function fmt(v, f) {
    if (f === 'yen') return '¥' + Math.round(v).toLocaleString('ja-JP');
    if (f === 'pct') return (v).toFixed(1) + '%';
    return Math.round(v).toLocaleString('ja-JP');
  }
  function countUp(el, to, f, from, dur) {
    f = f || el.dataset.format || 'int';
    from = from == null ? 0 : from;
    if (el._eeRaf) cancelAnimationFrame(el._eeRaf);
    if (reduce || from === to) { el.textContent = fmt(to, f); el._eeVal = to; return; }
    dur = Math.min(dur || T.change, 600);   // カウントアップは例外（0.6秒まで）
    var t0 = performance.now();
    function tick(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      var v = from + (to - from) * e;
      el.textContent = fmt(v, f);
      if (p < 1) el._eeRaf = requestAnimationFrame(tick);
      else { el.textContent = fmt(to, f); el._eeVal = to; }
    }
    el._eeRaf = requestAnimationFrame(tick);
  }
  // 大きな数字は、その数字を初めて見せるときだけカウントアップ（同じ数字の再表示では動かさない）
  var counted = {};
  function countAll(scope) {
    (scope || document).querySelectorAll('[data-count]').forEach(function (el) {
      var key = el.dataset.countKey || '', to = Number(el.dataset.count);
      if (key && counted[key] === to) { el.textContent = fmt(to, el.dataset.format); el._eeVal = to; return; }
      if (key) counted[key] = to;
      countUp(el, to, el.dataset.format, 0, 600);
    });
  }
  /** 値が変わったときだけ、今の値から新しい値へ短く動かす（入力に遅れず付いてくる） */
  function retarget(el, to) {
    if (!el) return;
    var from = el._eeVal == null ? to : el._eeVal;
    if (from === to) { el.textContent = fmt(to, el.dataset.format); el._eeVal = to; return; }
    countUp(el, to, el.dataset.format, from, T.change);   // 前後の差分だけ 0.25秒でロール
    anim(el, [{ color: '#8ab8ff' }, { color: '' }], { duration: T.change, fill: 'none' });
  }

  /** クリックの手応え：押した位置から光の波紋 */
  function ripple(e) {
    var b = e.target.closest('.btn, .pkg');
    if (!b || reduce) return;
    var r = b.getBoundingClientRect();
    var s = Math.max(r.width, r.height) * 1.6;
    var d = document.createElement('span');
    d.className = 'ripple';
    d.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
    if (!b.classList.contains('btn')) return;
    b.appendChild(d);
    var a = d.animate([{ transform: 'scale(0)', opacity: .5 }, { transform: 'scale(1)', opacity: 0 }], { duration: T.react, easing: EASE });
    a.onfinish = function () { d.remove(); };
  }

  /** 成功の合図：押したボタンの文字が一瞬だけ「✓ 保存しました」などに変わって戻る（知らせと二重にしない） */
  function success(btn, label) {
    if (!btn) return;
    if (btn._eeTimer) clearTimeout(btn._eeTimer);
    if (btn._eeHtml == null) { btn._eeHtml = btn.innerHTML; btn._eeMinW = btn.style.minWidth; btn.style.minWidth = btn.getBoundingClientRect().width + 'px'; }
    btn.classList.add('done');
    btn.innerHTML = '<span class="done-t">✓ ' + String(label || 'できました').replace(/[<&]/g, '') + '</span>';
    anim(btn, [{ transform: 'scale(.97)' }, { transform: 'none' }], { duration: T.react, fill: 'none' });
    btn._eeTimer = setTimeout(function () {
      btn.classList.remove('done'); btn.innerHTML = btn._eeHtml; btn._eeHtml = null; btn.style.minWidth = btn._eeMinW || '';
    }, 1300);
  }
  // 「〜しました」を、ボタンに入る短い言葉に
  function doneLabel(msg) {
    var m = String(msg || '');
    var k = [['保存', '保存しました'], ['登録', '登録しました'], ['書き出', '書き出しました'], ['書き', '書きました'], ['送', '送りました'], ['反映', '反映しました'], ['追加', '追加しました'], ['コピー', 'コピーしました'], ['画像', '画像にしました'], ['確定', '確定しました'], ['複製', '複製しました'], ['変え', '変えました'], ['入れ', '入れました']];
    for (var i = 0; i < k.length; i++) if (m.indexOf(k[i][0]) >= 0) return k[i][1];
    return 'できました';
  }
  // 最後に押したボタン（2秒以内なら、成功の知らせはそのボタンの中に出す）
  var lastBtn = null, lastAt = 0;
  document.addEventListener('pointerdown', function (e) { var b = e.target.closest && e.target.closest('.btn, button'); if (b) { lastBtn = b; lastAt = Date.now(); } }, true);
  document.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.btn, button')) { lastBtn = e.target.closest('.btn, button'); lastAt = Date.now(); } }, true);
  function recentBtn() {
    if (!lastBtn || Date.now() - lastAt > 2000 || !lastBtn.isConnected) return null;
    var r = lastBtn.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? lastBtn : null;
  }

  function pop(el) { anim(el, [{ transform: 'scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: T.change }); }
  function shake(el) { anim(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: T.change, fill: 'none' }); }
  function pulse(el) { anim(el, [{ boxShadow: '0 0 0 0 rgba(77,141,255,.55)' }, { boxShadow: '0 0 0 10px rgba(77,141,255,0)' }], { duration: T.change, fill: 'none' }); }

  /** 時間のかかる操作：0.3秒をこえたら、押したボタンに「処理中」の印を出す（すぐ終わるときは何も出さない） */
  function busy(btn, fn) {
    // 0.3秒をこえたら：ボタンに回る印、そのボタンのパネルだけ薄く脈打つ（全体は止めない）
    var pane = btn && btn.closest && btn.closest('.panel, .widget, .overlay .modal, .wz-card');
    var t = setTimeout(function () { if (btn) { btn.classList.add('is-busy'); btn.setAttribute('aria-busy', 'true'); } if (pane) pane.classList.add('is-loading'); }, 300);
    var done = function () { clearTimeout(t); if (btn) { btn.classList.remove('is-busy'); btn.removeAttribute('aria-busy'); } if (pane) pane.classList.remove('is-loading'); };
    return Promise.resolve().then(fn).then(function (v) { done(); return v; }, function (e) { done(); throw e; });
  }

  /** トースト（右下）。action を渡すと「元に戻す」などのボタンが付く。直してほしい知らせ（〜ください・できませんでした）は自動で「！」の形に */
  var WARN_RE = /^⚠|できません|ませんでした|ください|ありません。|必要です|すぎます/;
  function toast(msg, opts) {
    opts = opts || {};
    if (opts.warn == null && WARN_RE.test(msg)) opts.warn = true;
    if (!opts.warn && !opts.action && !opts.force && /しました/.test(msg)) { var rb = opts.btn || recentBtn(); if (rb) { success(rb, doneLabel(msg)); return; } }
    var box = document.querySelector('.toasts');
    var t = document.createElement('div');
    t.className = 'toast' + (opts.warn ? ' warn' : '');
    t.innerHTML = '<span class="ck">' + (opts.warn
      ? '<b>!</b>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>') +
      '</span><span></span>';
    t.lastChild.textContent = msg;
    if (opts.action) {
      var b = document.createElement('button');
      b.className = 'btn sm'; b.textContent = opts.action.label;
      b.onclick = function () { opts.action.run(); close(); };
      t.appendChild(b);
    }
    if (opts.warn) t.setAttribute('role', 'alert');
    box.appendChild(t);
    anim(t, [{ opacity: 0, transform: 'translateY(' + mv() + 'px)' }, { opacity: 1, transform: 'none' }], { duration: T.change });
    var ms = opts.ms || (opts.action ? 8000 : 2200), timer = setTimeout(close, ms);
    // カーソルが乗っている間・フォーカスがある間は消さない（「元に戻す」を押せるように）
    var hold = function () { clearTimeout(timer); }, resume = function () { if (!t.matches(':hover') && !t.contains(document.activeElement)) { clearTimeout(timer); timer = setTimeout(close, 2500); } };
    t.addEventListener('mouseenter', hold); t.addEventListener('focusin', hold);
    t.addEventListener('mouseleave', resume); t.addEventListener('focusout', function () { setTimeout(resume, 0); });
    function close() {
      clearTimeout(timer);
      if (!t.isConnected) return;
      if (reduce || !t.animate) return t.remove();
      var a = t.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(' + mv() + 'px)' }], { duration: T.react, easing: EASE, fill: 'forwards' });
      a.onfinish = function () { t.remove(); };
    }
  }

  /* ===== カーソル・クリックのアクション ===== */
  var CLICKABLE = 'button, a[href], .clickable, [data-href], .folder-tile, .pkg, .nav-child, .check[data-doc], .check[data-tpl], label.btn, [role=menuitem], input[type=checkbox], .seg button';

  /** 押した手応え：ボタンは CSS の :active で沈み、中に波紋。ボタン以外の押せるもの（カード・タイル）は 0.15秒だけ沈む */
  function burst(e) {
    if (reduce || e.button > 0) return;
    var t = e.target.closest(CLICKABLE);
    if (!t || t.disabled) return;
    if (t.matches('.btn')) return ripple(e);
    var target = t.closest('.folder-tile, .quick-card, .pkg, .kpi, .nav-child, .check, .launch-tile, .w-item, .wz-opt, .wz-mode, .seg button');
    if (target && target.animate) target.animate([{ transform: 'scale(1)' }, { transform: 'scale(.97)' }, { transform: 'scale(1)' }], { duration: T.react, easing: EASE });
  }

  /** ガラスのパネル：カーソルの位置を光が追いかける／カードは少し傾く */
  var lit = null, tiltEl = null, raf = 0, lastEv = null;
  function track(e) {
    lastEv = e;
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var ev = lastEv, p = ev.target.closest && ev.target.closest('.panel');
      if (lit && lit !== p) lit.classList.remove('lit');
      if (p) {
        var r = p.getBoundingClientRect();
        p.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
        p.style.setProperty('--my', (ev.clientY - r.top) + 'px');
        if (!p.classList.contains('lit')) p.classList.add('lit');
      }
      lit = p;
      var c = null;   // カードの傾きはやめた（ホバーは少し浮くだけ）
      if (tiltEl && tiltEl !== c) { tiltEl.style.removeProperty('--tx'); tiltEl.style.removeProperty('--ty'); }
      if (c) {
        var rc = c.getBoundingClientRect();
        var px = (ev.clientX - rc.left) / rc.width - 0.5, py = (ev.clientY - rc.top) / rc.height - 0.5;
        c.style.setProperty('--ty', (px * 6).toFixed(2) + 'deg');
        c.style.setProperty('--tx', (-py * 6).toFixed(2) + 'deg');
      }
      tiltEl = c || null;
    });
  }
  function bindAmbient() {
    document.addEventListener('pointerdown', burst);
    document.addEventListener('pointermove', track, { passive: true });
    document.addEventListener('pointerleave', function () { if (lit) lit.classList.remove('lit'); lit = null; });
  }

  root.EE = root.EE || {};
  root.EE.fx = { bindAmbient: bindAmbient, burst: burst, anim: anim, stagger: stagger, pageIn: pageIn, pageOut: pageOut, countUp: countUp, countAll: countAll,
    retarget: retarget, ripple: ripple, success: success, pop: pop, shake: shake, pulse: pulse, toast: toast, busy: busy, fmt: fmt, reduce: reduce, T: T, EASE: EASE, mv: mv, snap: snap, doneLabel: doneLabel, recentBtn: recentBtn };
})(this);
