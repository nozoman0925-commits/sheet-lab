/*
 * 桜ミツ版：業務管理の画面を、桜ミツの中の枠（iframe）として動かすための受け渡し
 *   ・見出しの帯・下のメニューは桜ミツのものを使う（業務管理の側は隠す）
 *   ・見積（桜ミツ）とのつなぎ（OUBI_HOST）は、親の桜ミツの画面にあるものを使う
 *   ・画面が変わったら、親に知らせて左のメニューと見出しを合わせる
 */
(function () {
  'use strict';
  var P = window.parent !== window ? window.parent : null;
  window.OUBI_EMBED = true;
  document.documentElement.setAttribute('data-theme', 'dark');   // 桜ミツは暗い画面だけ
  function H() { return (P && P.OUBI_HOST) || null; }
  window.OUBI_HOST = {
    start: function () {}, mountHome: function () {},
    booted: function () { var h = H(); if (h) h.booted(); },
    casesChanged: function () { var h = H(); if (h) h.casesChanged(); },
    active: function () { return false; },
    leaveTo: function (cb) { if (cb) cb(); },
    isEE: function () { return false; },
    ready: function () { var h = H(); return !!(h && h.ready()); },
    docsOf: function (id) { var h = H(); return h ? h.docsOf(id) : []; },
    calc: function (d) { var h = H(); return h ? h.calc(d) : { subtotal: 0, total: 0, marginRate: null }; },
    newForCase: function (id) { var h = H(); if (h) h.newForCase(id); },
    open: function (hash) { var h = H(); if (h) h.open(hash); },
    compare: function (id) { var P2 = P && P.EE; if (P2 && P2.linkCompare) P2.linkCompare.open(id); }
  };
  // 知らせは桜ミツ側の1か所（右下・スマホは下のボタンの上）にまとめて出す。形も同じ（✓＝できた／！＝確かめてほしい）
  var WARN = /^⚠|できません|ませんでした|ください|ありません|切れています|止まりました|だけが使えます|外せません|変えられません/;
  // 押した手応え（桜ミツと同じ）：押すと 0.15秒だけ沈み、ボタンの中に波紋
  var lastBtn = null, lastAt = 0;
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('button, .btn, label.btn'); if (!b || b.disabled) return;
    lastBtn = b; lastAt = Date.now();
    var fx = P && P.EE && P.EE.fx; if (!fx || fx.reduce || !b.animate || b.closest('nav')) return;   // 下のメニューなどは波紋なし（沈むだけ）
    var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 1.6, d = document.createElement('span');
    d.className = 'ob-ripple'; d.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.appendChild(d);
    d.animate([{ transform: 'scale(0)', opacity: .45 }, { transform: 'scale(1)', opacity: 0 }], { duration: fx.T.react, easing: fx.EASE }).onfinish = function () { d.remove(); };
  }, true);
  document.addEventListener('DOMContentLoaded', function () {
    var orig = window.toast; if (typeof orig !== 'function') return;
    window.toast = function (m, undo) {
      var fx = P && P.EE && P.EE.fx;
      if (!fx || !P.document.querySelector('.toasts')) return orig(m, undo);
      // 成功（元に戻すなし・注意でない）は、押したボタンの中に「✓ 〜しました」（知らせと二重にしない）
      if (!undo && !WARN.test(m) && /しました|書きました/.test(m) && lastBtn && Date.now() - lastAt < 2000 && lastBtn.isConnected && lastBtn.getBoundingClientRect().width) {
        fx.success(lastBtn, fx.doneLabel(m)); return;
      }
      orig.undo = null; var el = document.getElementById('toast'); if (el) el.hidden = true;
      var msg = String(m).replace(/^⚠\s*/, '');
      fx.toast(msg, { warn: WARN.test(m), action: undo ? { label: '元に戻す', run: undo } : null });
    };
    window.toast.undo = null;
  });
  // スマホ：入りきらない画面は、まとまりごとのページに分ける（pager.js）
  var pgT = null;
  function pageIt() { clearTimeout(pgT); pgT = setTimeout(function () { if (window.OUBI_PAGER) window.OUBI_PAGER(document.querySelector('main'), window, document.body.getAttribute('data-obtab') + ':' + (document.body.getAttribute('data-dpart') || '')); }, 120); }
  window.addEventListener('resize', pageIt);
  // ===== 動き（桜ミツと同じ文法：0.15／0.25／0.4秒、曲線1つ。状態が変わったものだけ動かす） =====
  var M = { tab: null, pipe: {} };
  function FX() { return P && P.EE && P.EE.fx; }
  function go(el, frames, ms) { var fx = FX(); if (!fx || fx.reduce || !el || !el.animate) return; el.animate(frames, { duration: ms, easing: fx.EASE }); }
  function motionAfter(tab) {
    var fx = FX(); if (!fx) return;
    var T = fx.T, mv = fx.mv();
    // タブが変わったとき：中身が 0.25秒で横に数px滑って入れ替わる
    // （左から入る：右へ動かすと、動いている 0.25秒だけ画面の幅をこえて横にはみ出すため）
    if (M.tab && M.tab !== tab) go(document.querySelector('main'), [{ opacity: 0, transform: 'translateX(-' + mv + 'px)' }, { opacity: 1, transform: 'none' }], T.change);
    M.tab = tab;
    // 工事の段階が進んだとき：新しく点いた段階の線が 0.4秒で伸びる（戻ったときは逆向き）
    var cur = window.OUBI && window.OUBI.cur ? window.OUBI.cur() : {}, spans = document.querySelectorAll('.stepnav .pipe span');
    if (cur.caseId && spans.length) {
      var lit = [].filter.call(spans, function (x) { return x.classList.contains('done'); }).length, pv = M.pipe[cur.caseId];
      if (pv != null && lit !== pv) {
        var k = Math.min(lit, pv), el = spans[lit > pv ? lit - 1 : k];
        if (el) { el.style.transformOrigin = lit > pv ? 'left center' : 'right center'; go(el, lit > pv ? [{ transform: 'scaleX(0)' }, { transform: 'none' }] : [{ transform: 'scaleX(1)', opacity: 1 }, { transform: 'scaleX(.2)', opacity: .4 }, { transform: 'none', opacity: 1 }], T.page); }
      }
      M.pipe[cur.caseId] = lit;
    }
  }
  window.SUPA_AFTER_RENDER = function (tab) {
    pageIt();
    try { motionAfter(tab); } catch (e) {}
    document.body.setAttribute('data-obtab', tab);   // 業務管理のホームは描かない（桜ミツのホームに替わる）
    try { if (P && P.OUBI_LINK) P.OUBI_LINK.onTab(tab, window.OUBI && window.OUBI.cur ? window.OUBI.cur() : { tab: tab }); } catch (e) {}
  };
})();
