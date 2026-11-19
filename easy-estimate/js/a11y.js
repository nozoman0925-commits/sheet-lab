/*
 * 読み上げ・キーボード操作の補い（画面を描くたびに app.js から呼ぶ）
 *  - 名前の無い入力欄：同じ .field の見出し（label）か placeholder を aria-label にする
 *  - アイコンだけのボタン：title か操作の種類（data-act）から aria-label を付ける
 *  - クリックで開く行（data-href）：Tab で止まり、Enter で開けるようにする
 *  - 切り替えボタン（.seg）：選択中を aria-pressed で伝える
 */
(function (root) {
  'use strict';
  var ACT = { 'edit-item': '編集', 'edit-pkg': '編集', 'edit-f': '編集', 'edit-snip': '編集', 'edit-member': '編集', 'edit-p': '案件を編集', 'edit-c': '顧客を編集',
    'del-c': '顧客を削除', del: '削除', 'del-adj': '調整を削除', up: '上へ移動', down: '下へ移動', dup: '複製', rev: '修正見積を作る', duplicate: '複製', 'del-item': '削除' };

  function nameOf(el) {
    if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return true;
    if (el.id && document.querySelector('label[for="' + el.id + '"]')) return true;
    return !!el.closest('label');
  }
  function labelText(el) {
    var f = el.closest('.field, .auth-field');
    var l = f && f.querySelector('label, .label');
    var t = l ? l.textContent.replace(/\s+/g, ' ').trim() : '';
    return t || el.getAttribute('placeholder') || el.getAttribute('title') || '';
  }
  function rowName(el) {
    var tr = el.closest('tr'); if (!tr) return '';
    var c = tr.querySelector('td:nth-child(2), td'); return c ? c.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
  }

  function enhance(scope) {
    scope = scope || document;
    scope.querySelectorAll('input:not([type=hidden]), select, textarea').forEach(function (el) {
      if (nameOf(el)) return;
      var t = labelText(el);
      if (!t && el.type === 'checkbox') { var r = rowName(el); t = r ? '「' + r + '」を選ぶ' : '選ぶ'; }
      if (t) el.setAttribute('aria-label', t);
    });
    scope.querySelectorAll('button, a.btn').forEach(function (b) {
      if (b.getAttribute('aria-label') || b.textContent.trim()) return;
      var t = b.getAttribute('title') || ACT[b.dataset.act] || '';
      if (!t) return;
      var r = rowName(b); b.setAttribute('aria-label', r && /編集|削除|移動|複製/.test(t) ? '「' + r + '」を' + t : t);
    });
    scope.querySelectorAll('[data-href]').forEach(function (r) {
      if (!r.hasAttribute('tabindex')) r.setAttribute('tabindex', '0');
      if (!r.getAttribute('role')) r.setAttribute('role', 'link');
    });
    syncPressed(scope);
  }
  function syncPressed(scope) {
    (scope || document).querySelectorAll('.seg button').forEach(function (b) { b.setAttribute('aria-pressed', b.classList.contains('on') ? 'true' : 'false'); });
  }

  // 切り替えボタンは押すと class が変わるだけなので、変化を見て aria-pressed を合わせる
  if (root.MutationObserver) {
    new MutationObserver(function (list) {
      list.forEach(function (m) { var t = m.target; if (t.matches && t.matches('.seg button')) t.setAttribute('aria-pressed', t.classList.contains('on') ? 'true' : 'false'); });
    }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  // Enter / Space で data-href の行を開く
  document.addEventListener('keydown', function (e) {
    if ((e.key !== 'Enter' && e.key !== ' ') || !e.target.matches || !e.target.matches('[data-href]')) return;
    e.preventDefault(); location.hash = e.target.getAttribute('data-href');
  });

  root.EE = root.EE || {};
  root.EE.a11y = { enhance: enhance };
})(this);
