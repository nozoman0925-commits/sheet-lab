/*
 * 起動アニメーションの制御
 * - 初回：フル演出（約3秒）→ 短い余韻 → クロスフェードでホーム
 * - 2回目以降：短縮版（約1.2秒）
 * - 「視差効果を減らす」設定：完成した家紋とブランド名を静止画で短く表示
 * - クリック・タップ・キー入力・「SKIP」でいつでも飛ばせる
 * - 演出中も裏でアプリは起動済み（待ち時間を延ばさない）
 */
(function (root) {
  'use strict';
  var KEY = 'oumitsu:splash-seen';
  var FULL = 1, SHORT = 0.4;

  function seen() { try { return root.localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function markSeen() { try { root.localStorage.setItem(KEY, '1'); } catch (e) {} }

  /**
   * @param {object} opts { force:'full'|'short'|'static', onDone:function }
   */
  function play(opts) {
    opts = opts || {};
    var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var q = /[?&]splash=(full|short|static|off)/.exec(location.search);
    var mode = opts.force || (q && q[1]) || (reduce ? 'static' : seen() ? 'short' : 'full');
    if (mode === 'off') { if (opts.onDone) opts.onDone(); return; }

    var t = mode === 'short' ? SHORT : FULL;
    var el = document.createElement('div');
    el.className = 'splash' + (mode === 'static' ? ' static' : '');
    el.style.setProperty('--t', t + 's');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '桜ミツ 起動中');
    el.innerHTML =
      (root.EE.crest.PLACEHOLDER ? '<div class="splash-badge">仮の家紋（原本の差し替え待ち）</div>' : '') +
      '<div class="splash-stage">' + root.EE.crest.svg({ id: 'sp' }) +
        '<div class="splash-title">桜ミツ</div>' +
        '<div class="splash-en">OUMITSU</div>' +
        '<div class="splash-sub">RENOVATION WORKS MANAGEMENT</div>' +
        '<div class="splash-msg">SMARTER WORK. BETTER BUILD.</div>' +
      '</div>' +
      '<button class="splash-skip" type="button">SKIP</button>';
    document.body.appendChild(el);

    // 演出の長さ：最後の文字が出終わる 3.24×t ＋ 余韻（静止表示は 0.9 秒だけ見せる）
    var total = mode === 'static' ? 900 : Math.round((3.24 * t + (mode === 'short' ? 0.15 : 0.3)) * 1000);
    var finished = false;
    var timer = setTimeout(finish, total);

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      markSeen();
      document.removeEventListener('keydown', onKey, true);
      el.classList.add('out');               // クロスフェード（0.38秒）
      if (opts.onDone) opts.onDone();         // 下のホーム画面の展開を同時に始める
      setTimeout(function () { el.remove(); }, 420);
    }
    function onKey(e) { e.preventDefault(); e.stopPropagation(); finish(); }

    el.addEventListener('click', finish);
    document.addEventListener('keydown', onKey, true);
    return { finish: finish, mode: mode };
  }

  root.EE = root.EE || {};
  root.EE.splash = { play: play, reset: function () { try { root.localStorage.removeItem(KEY); } catch (e) {} } };
})(this);
