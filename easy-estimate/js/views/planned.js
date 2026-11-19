/*
 * 準備中のまとまり（例：資材・発注）を開いたとき：これから作る機能と、何期で作るかを見せる
 * メニューには出していないが、検索やリンクから来た人が迷わないように。
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, esc = U.esc;
  function render(key) {
    var sec = EE.features.sectionOf(key) || { label: '準備中', note: '' };
    var list = EE.features.FEATURES.filter(function (f) { return f.section === key; });
    var html = '<section class="panel" data-st style="max-width:760px"><div class="panel-h"><h2>' + esc(sec.label) + 'は準備中です</h2></div><div class="panel-b">' +
      '<p style="margin-top:0;color:var(--text-2)">' + esc(sec.note) + 'の機能は、構想の第' + (sec.planned || '') + '期で追加します。今は次の機能を予定しています。</p>' +
      '<ul class="planned-list">' + list.map(function (f) { return '<li>' + esc(f.name) + (f.phase ? '<span class="badge">第' + f.phase + '期</span>' : '') + '</li>'; }).join('') + '</ul>' +
      '<a class="btn" href="#/settings/features">機能ライブラリを見る</a></div></section>';
    return { title: sec.label, crumb: '準備中', html: html };
  }
  EE.views = EE.views || {};
  EE.views.planned = { render: render };
})(this);
