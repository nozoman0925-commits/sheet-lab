/*
 * スマホで「1画面で完結」：画面に入りきらないときは、まとまりごとにページへ分け、上のタブで切り替える（桜ミツ版）
 *   OUBI_PAGER(root, scroller, key)
 *     root     … まとまりが子として並ぶ要素（.view-inner や main）
 *     scroller … 画面の高さの基準になる要素（#view や window）
 *     key      … 画面ごとの名前（開いていたページを覚える）
 *   1つのまとまりだけで画面より高いときは、そのまとまりの中だけ動く（一覧と同じ）。パソコン（幅761px以上）では何もしない。
 */
(function (root) {
  'use strict';
  var PHONE = 760, mem = {};
  function visible(e) { return e.nodeType === 1 && !e.hidden && e.getAttribute('aria-hidden') !== 'true' && getComputedStyle(e).display !== 'none' && e.tagName !== 'SCRIPT' && e.tagName !== 'STYLE'; }
  function label(page, i) {
    for (var k = 0; k < page.length; k++) { var t0 = label1(page[k]); if (t0) return t0.slice(0, 12); }
    return 'ページ' + (i + 1);
  }
  function label1(e) {
    var h = e.matches && e.matches('h1, h2, h3') ? e : e.querySelector('h1, h2, h3, .w-title, .panel-h h2, .kpi-label, legend, summary, b, strong');
    var t = ((h && h.textContent) || '').replace(/\s+/g, ' ').trim();
    if (!t && e.classList.contains('launch')) t = 'よく使うこと';
    return t;
  }
  function clear(box) {
    var bar = box.querySelector(':scope > .pg-bar'); if (bar) bar.remove();
    [].forEach.call(box.children, function (c) { c.classList.remove('pg-off'); c.style.removeProperty('max-height'); c.classList.remove('pg-own'); });
    box.classList.remove('pg-on');
  }
  // 子が1つだけの入れ物は、その中のまとまりで分ける
  function target(el) {
    var box = el, n = 0;
    while (n++ < 4) {
      var vs = [].filter.call(box.children, function (c) { return visible(c) && !c.classList.contains('pg-bar'); });
      if (vs.length === 1 && vs[0].children.length >= 2) box = vs[0]; else break;
    }
    return box;
  }
  root.OUBI_PAGER = function (el, scroller, key) {
    if (!el) return;
    var prev = el.querySelectorAll('.pg-on'); [].forEach.call(prev, clear); clear(el);
    if (root.innerWidth > PHONE) return;
    var box = target(el);
    if (box.hasAttribute('data-nopager') || box.querySelector(':scope > [data-nopager]')) return;   // 自分で1画面に収める画面（見積を作る など）
    var H = scroller === root ? root.innerHeight : scroller.clientHeight;
    var cs = scroller === root ? null : getComputedStyle(scroller);
    var pad = cs ? parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) : 0;
    var above = box.getBoundingClientRect().top - (scroller === root ? 0 : scroller.getBoundingClientRect().top) - (cs ? parseFloat(cs.paddingTop) : 0);
    var BAR = 56, avail = H - pad - Math.max(0, above) - 14;
    var total = (scroller === root ? document.scrollingElement.scrollHeight : scroller.scrollHeight);
    if (total <= H + 2) return;
    avail -= BAR;
    var kids = [].filter.call(box.children, visible), pages = [], cur = [], used = 0, gap = parseFloat(getComputedStyle(box).rowGap) || 0;
    kids.forEach(function (c) {
      var st = getComputedStyle(c), m = (parseFloat(st.marginTop) || 0) + (parseFloat(st.marginBottom) || 0);
      var h = c.scrollHeight + m, g = cur.length ? gap : 0;
      // 残りの高さいっぱいに伸びて、中だけ動くまとまり（一覧など）：残りが十分あれば同じページに入れる
      if (parseFloat(st.flexGrow) > 0 && h > avail - used - g) {
        if (cur.length && avail - used - g < 220) { pages.push(cur); cur = []; used = 0; g = 0; }
        c.classList.add('pg-own'); c.style.maxHeight = Math.max(160, avail - used - g - m) + 'px'; cur.push(c); pages.push(cur); cur = []; used = 0; return;
      }
      if (h > avail - used - g) {
        // 大きいまとまり：見出しなど小さいものが前にあれば一緒に。そのまとまりの中だけ動く
        if (cur.length && used > avail * 0.4) { pages.push(cur); cur = []; used = 0; g = 0; }
        if (h > avail - used - g) { c.classList.add('pg-own'); c.style.maxHeight = Math.max(160, avail - used - g - m) + 'px'; cur.push(c); pages.push(cur); cur = []; used = 0; return; }
      }
      cur.push(c); used += h + g;
    });
    if (cur.length) pages.push(cur);
    if (pages.length < 2) return;
    var k = key || location.hash, at = Math.min(mem[k] || 0, pages.length - 1);
    var bar = document.createElement('nav'); bar.className = 'pg-bar'; bar.setAttribute('aria-label', 'この画面のページ');
    bar.innerHTML = pages.map(function (p, i) { return '<button type="button" data-pg="' + i + '"' + (i === at ? ' class="on" aria-current="true"' : '') + '>' + (i + 1) + ' ' + label(p, i).replace(/[<&]/g, '') + '</button>'; }).join('');
    box.insertBefore(bar, box.firstChild); box.classList.add('pg-on');
    function show(i) {
      at = i; mem[k] = i;
      pages.forEach(function (p, j) { p.forEach(function (c) { c.classList.toggle('pg-off', j !== i); }); });
      [].forEach.call(bar.children, function (b, j) { b.classList.toggle('on', j === i); if (j === i) { b.setAttribute('aria-current', 'true'); if (b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'center' }); } else b.removeAttribute('aria-current'); });
    }
    bar.addEventListener('click', function (e) { var b = e.target.closest('[data-pg]'); if (b) show(Number(b.dataset.pg)); });
    show(at);
  };
})(this);
