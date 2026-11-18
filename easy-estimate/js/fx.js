/*
 * マイクロインタラクション（Web Animations API。外部ライブラリ不要・オフライン動作）
 * - 1つの動きは 0.2〜0.4 秒。transform / opacity だけを動かして 60fps を保つ
 * - 連続操作で遅れないよう、同じ要素の古いアニメーションは止めてから新しく動かす
 * - OS の「視差効果を減らす」設定では動きを止める
 */
(function (root) {
  'use strict';
  var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(.22,.8,.28,1)';

  function anim(el, frames, opts) {
    if (!el || reduce || !el.animate) return null;
    if (el._eeAnim) { try { el._eeAnim.cancel(); } catch (e) {} }
    el._eeAnim = el.animate(frames, Object.assign({ duration: 280, easing: EASE, fill: 'backwards' }, opts));
    return el._eeAnim;
  }

  /** 子要素 [data-st] を時間差で順番に出す */
  function stagger(scope, opts) {
    opts = opts || {};
    var els = (scope || document).querySelectorAll('[data-st]');
    var step = opts.step || 35, max = opts.max || 14;
    els.forEach(function (el, i) {
      anim(el, [
        { opacity: 0, transform: 'translateY(10px) scale(.985)' },
        { opacity: 1, transform: 'none' }
      ], { duration: 340, delay: Math.min(i, max) * step });
    });
  }

  /** 画面遷移：前の画面を軽く消し、新しい画面をスライド＋フェードで入れる */
  function pageIn(el, dir) {
    anim(el, [
      { opacity: 0, transform: 'translateX(' + (dir < 0 ? -14 : 14) + 'px)' },
      { opacity: 1, transform: 'none' }
    ], { duration: 260 });
  }
  function pageOut(el, done) {
    if (reduce || !el.animate) return done();
    var a = el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(-6px)' }], { duration: 110, easing: 'ease-in', fill: 'forwards' });
    a.onfinish = function () { a.cancel(); done(); };
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
    dur = dur || 520;
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
  function countAll(scope) {
    (scope || document).querySelectorAll('[data-count]').forEach(function (el) {
      countUp(el, Number(el.dataset.count), el.dataset.format, 0, 620);
    });
  }
  /** 値が変わったときだけ、今の値から新しい値へ短く動かす（入力に遅れず付いてくる） */
  function retarget(el, to) {
    if (!el) return;
    var from = el._eeVal == null ? to : el._eeVal;
    if (from === to) { el.textContent = fmt(to, el.dataset.format); el._eeVal = to; return; }
    countUp(el, to, el.dataset.format, from, 260);
    anim(el, [{ color: '#8ab8ff', textShadow: '0 0 18px rgba(77,141,255,.8)' }, { color: '', textShadow: '' }], { duration: 400, fill: 'none' });
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
    var a = d.animate([{ transform: 'scale(0)', opacity: .5 }, { transform: 'scale(1)', opacity: 0 }], { duration: 420, easing: 'ease-out' });
    a.onfinish = function () { d.remove(); };
  }

  /** 成功の合図：ボタンを一瞬だけ緑のチェックに */
  function success(btn, label) {
    if (!btn) return;
    if (btn._eeTimer) clearTimeout(btn._eeTimer);
    if (btn._eeHtml == null) btn._eeHtml = btn.innerHTML;
    btn.classList.add('done');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#5fd0b0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" style="stroke-dasharray:24;stroke-dashoffset:24;animation:draw .3s forwards"/></svg>' + (label || '保存しました');
    anim(btn, [{ boxShadow: '0 0 0 0 rgba(95,208,176,.6)' }, { boxShadow: '0 0 0 8px rgba(95,208,176,0)' }], { duration: 420, fill: 'none' });
    btn._eeTimer = setTimeout(function () {
      btn.classList.remove('done'); btn.innerHTML = btn._eeHtml; btn._eeHtml = null;
    }, 1300);
  }

  function pop(el) { anim(el, [{ transform: 'scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220 }); }
  function shake(el) { anim(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 300, fill: 'none' }); }
  function pulse(el) { anim(el, [{ boxShadow: '0 0 0 0 rgba(77,141,255,.55)' }, { boxShadow: '0 0 0 10px rgba(77,141,255,0)' }], { duration: 500, fill: 'none' }); }

  /** トースト（右下）。action を渡すと「元に戻す」などのボタンが付く */
  function toast(msg, opts) {
    opts = opts || {};
    var box = document.querySelector('.toasts');
    var t = document.createElement('div');
    t.className = 'toast' + (opts.warn ? ' warn' : '');
    t.innerHTML = '<span class="ck">' + (opts.warn
      ? '<b>!</b>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>') +
      '</span><span></span>';
    t.lastChild.textContent = msg;
    if (opts.action) {
      var b = document.createElement('button');
      b.className = 'btn sm'; b.textContent = opts.action.label;
      b.onclick = function () { opts.action.run(); close(); };
      t.appendChild(b);
    }
    box.appendChild(t);
    anim(t, [{ opacity: 0, transform: 'translateY(10px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 240 });
    var timer = setTimeout(close, opts.ms || (opts.action ? 5000 : 2200));
    function close() {
      clearTimeout(timer);
      if (!t.isConnected) return;
      if (reduce || !t.animate) return t.remove();
      var a = t.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(14px)' }], { duration: 180, fill: 'forwards' });
      a.onfinish = function () { t.remove(); };
    }
  }

  root.EE = root.EE || {};
  root.EE.fx = { anim: anim, stagger: stagger, pageIn: pageIn, pageOut: pageOut, countUp: countUp, countAll: countAll,
    retarget: retarget, ripple: ripple, success: success, pop: pop, shake: shake, pulse: pulse, toast: toast, fmt: fmt, reduce: reduce };
})(this);
