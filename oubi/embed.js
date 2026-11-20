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
    open: function (hash) { var h = H(); if (h) h.open(hash); }
  };
  window.SUPA_AFTER_RENDER = function (tab) {
    try { if (P && P.OUBI_LINK) P.OUBI_LINK.onTab(tab, window.OUBI && window.OUBI.cur ? window.OUBI.cur() : { tab: tab }); } catch (e) {}
  };
})();
