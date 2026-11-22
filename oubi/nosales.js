/*
 * 桜ミツ版：営業の機能はない（2026-11-22 になくした）
 *   業務管理の画面（index.html・sales.js）は v24 と共通なので、桜ミツ版ではここで営業の入口と表示を止める。
 *   build-web.js が oubi.html の sales.js の直後に入れる（v24 には入らない）。
 *   ・営業の記録は空のまま（記録の削除は local-db.js）
 *   ・経営の「飛び込み営業」、カレンダーの「再訪問」、工事の「だれが見つけたか」は出さない
 *   ・営業の画面へは行かない（行こうとしたらホームへ）。ヘルプの「営業」の質問は出さない
 */
(function () {
  'use strict';
  window.OUBI_NO_SALES = true;
  window.slInit = function () { visits = []; };
  window.slDash = function () { return ''; };
  window.slLeadNote = function () { return ''; };
  window.slOpenRv = function () { return []; };
  window.renderSales = function () { return ''; };
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.setTab === 'function') {
      var st = window.setTab;
      window.setTab = function (t) { return st.apply(this, [t === 'sales' ? 'home' : t].concat([].slice.call(arguments, 1))); };
    }
    try {
      for (var i = HELP.length - 1; i >= 0; i--) if (HELP[i].c === '営業') HELP.splice(i, 1);
      HELP.forEach(function (h) { ['q', 'a', 'k'].forEach(function (f) { if (typeof h[f] === 'string') h[f] = h[f].replace(/・営業の記録/g, ''); }); });
    } catch (e) {}
  });
})();
