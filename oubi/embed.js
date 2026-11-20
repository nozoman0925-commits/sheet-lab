/*
 * 桜ミツ版：業務管理の画面を、桜ミツの中の枠（iframe）として動かすための受け渡し
 *   ・見出しの帯・下のメニューは桜ミツのものを使う（業務管理の側は隠す。営業の画面の下のボタンだけ残す）
 *   ・見積（桜ミツ）とのつなぎ（OUBI_HOST）は、親の桜ミツの画面にあるものを使う
 *   ・画面が変わったら、親に知らせて左のメニューと見出しを合わせる
 */
(function () {
  'use strict';
  var P = window.parent !== window ? window.parent : null;
  window.OUBI_EMBED = true;
  document.documentElement.setAttribute('data-theme', 'dark');   // 桜ミツは暗い画面だけ
  // 営業の画面は、昼（6〜18時）は外で見やすい明るい画面に自動で切り替わる（「暗い画面に」を押せばその端末では暗いまま）
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
  document.addEventListener('DOMContentLoaded', function () {
    var orig = window.toast; if (typeof orig !== 'function') return;
    window.toast = function (m, undo) {
      var fx = P && P.EE && P.EE.fx;
      if (!fx || !P.document.querySelector('.toasts')) return orig(m, undo);
      orig.undo = null; var el = document.getElementById('toast'); if (el) el.hidden = true;
      var msg = String(m).replace(/^⚠\s*/, '');
      fx.toast(msg, { warn: WARN.test(m), action: undo ? { label: '元に戻す', run: undo } : null });
    };
    window.toast.undo = null;
  });
  window.SUPA_AFTER_RENDER = function (tab) {
    document.body.setAttribute('data-obtab', tab);   // 業務管理のホームは描かない（桜ミツのホームに替わる）
    try { if (P && P.OUBI_LINK) P.OUBI_LINK.onTab(tab, window.OUBI && window.OUBI.cur ? window.OUBI.cur() : { tab: tab }); } catch (e) {}
  };
})();
