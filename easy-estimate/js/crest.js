/*
 * 桜ミツ（OUMITSU）の家紋 SVG
 *
 * ★ これは「仮」の家紋です。提供される家紋の原本（正式なデザイン）が届いたら、
 *   下の RING / PETALS / CORE / RAYS の path を原本からトレースした輪郭に差し替えてください。
 *   アニメーションは各パーツのクラス名（c-ring / c-petal / c-core / c-rays）にだけ依存しているので、
 *   形を入れ替えても演出はそのまま動きます。
 *
 * 座標系：viewBox="-100 -100 200 200"（中心が 0,0）。
 *  - RING   : 外側の円環。塗りの輪郭（fill-rule: evenodd）で持つので、原本の太さをそのまま再現できる
 *             描画アニメーションは、円環の中心線（RING_R）に沿ったマスクで時計回りに見せる
 *  - PETALS : 花びら5枚。上から時計回りの順（アニメーションの出現順）
 *  - CORE   : 中央の円
 *  - RAYS   : 放射状の線
 */
(function (root) {
  'use strict';

  var PLACEHOLDER = true;           // 原本に差し替えたら false にする
  var RING_R = 91;                  // 円環の中心線の半径（マスク描画用）
  var RING_W = 7;                   // 円環の太さ（マスクの幅はこれより少し太くする）

  function annulus(r1, r2) {
    return 'M0,' + (-r2) + 'A' + r2 + ',' + r2 + ' 0 1,1 0,' + r2 + 'A' + r2 + ',' + r2 + ' 0 1,1 0,' + (-r2) + 'Z' +
           'M0,' + (-r1) + 'A' + r1 + ',' + r1 + ' 0 1,0 0,' + r1 + 'A' + r1 + ',' + r1 + ' 0 1,0 0,' + (-r1) + 'Z';
  }

  var RING = annulus(RING_R - RING_W / 2, RING_R + RING_W / 2);

  // 花びら1枚（真上向き）。先端に桜らしい切れ込み
  var PETAL = 'M0,-17C-15,-22 -34,-40 -31,-60C-29,-73 -19,-80 -9,-79L0,-70L9,-79C19,-80 29,-73 31,-60C34,-40 15,-22 0,-17Z';
  var PETALS = [0, 1, 2, 3, 4].map(function (i) { return { d: PETAL, angle: i * 72 }; });

  var CORE = { cx: 0, cy: 0, r: 9 };
  var RAYS = [0, 1, 2, 3, 4].map(function (i) {
    var a = (i * 72 + 36) * Math.PI / 180;
    var s = Math.sin(a), c = -Math.cos(a);
    return { x1: s * 14, y1: c * 14, x2: s * 30, y2: c * 30, dot: { x: s * 33, y: c * 33, r: 2.6 } };
  });

  /** 家紋の SVG 文字列を返す。opts.animated=false で静止画（サイドバーのアイコン等） */
  function svg(opts) {
    opts = opts || {};
    var id = opts.id || 'crest';
    var cls = opts.className || '';
    var petals = PETALS.map(function (p, i) {
      // --dy：花びらの根元側（中心寄り）に 6 ずらした位置から本来の位置へ収束させる
      return '<g class="c-petal-wrap" transform="rotate(' + p.angle + ')"><path class="c-petal" style="--i:' + i +
        ';--dy:6" d="' + p.d + '"/></g>';
    }).join('');
    var rays = RAYS.map(function (r) {
      return '<line x1="' + r.x1.toFixed(2) + '" y1="' + r.y1.toFixed(2) + '" x2="' + r.x2.toFixed(2) + '" y2="' + r.y2.toFixed(2) + '"/>' +
        '<circle cx="' + r.dot.x.toFixed(2) + '" cy="' + r.dot.y.toFixed(2) + '" r="' + r.dot.r + '"/>';
    }).join('');
    var C = 2 * Math.PI * RING_R;
    return '<svg class="crest ' + cls + '" viewBox="-100 -100 200 200" role="img" aria-label="桜ミツ 家紋"' +
      ' xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<mask id="' + id + '-ring-mask" maskUnits="userSpaceOnUse" x="-100" y="-100" width="200" height="200">' +
          // 12時の位置から時計回りに描くため -90°回転。dashoffset を C → 0 にすると時計回りに伸びる
          '<circle class="c-ring-draw" r="' + RING_R + '" fill="none" stroke="#fff" stroke-width="' + (RING_W + 6) +
          '" transform="rotate(-90)" style="--len:' + C.toFixed(2) + '" stroke-dasharray="' + C.toFixed(2) + '"/>' +
        '</mask>' +
        '<radialGradient id="' + id + '-glow"><stop offset="0" stop-color="#FFF6E2" stop-opacity=".55"/><stop offset=".45" stop-color="#D4BD8C" stop-opacity=".18"/><stop offset="1" stop-color="#D4BD8C" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="' + id + '-sheen" x1="0" x2="1" y1="0" y2="0">' +
          '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#FFF7E6" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
        '<mask id="' + id + '-shape" maskUnits="userSpaceOnUse" x="-100" y="-100" width="200" height="200" style="mask-type:alpha">' +
          '<use href="#' + id + '-art"/></mask>' +
      '</defs>' +
      '<circle class="c-glow" r="60" fill="url(#' + id + '-glow)"/>' +
      '<g id="' + id + '-art" class="c-art">' +
        '<path class="c-ring" fill-rule="evenodd" d="' + RING + '" mask="url(#' + id + '-ring-mask)"/>' +
        '<g class="c-petals">' + petals + '</g>' +
        '<circle class="c-core" cx="' + CORE.cx + '" cy="' + CORE.cy + '" r="' + CORE.r + '"/>' +
        '<g class="c-rays">' + rays + '</g>' +
      '</g>' +
      '<g mask="url(#' + id + '-shape)"><rect class="c-sheen" x="-150" y="-110" width="70" height="220" fill="url(#' + id + '-sheen)" transform="skewX(-18)"/></g>' +
    '</svg>';
  }

  root.EE = root.EE || {};
  root.EE.crest = { svg: svg, PLACEHOLDER: PLACEHOLDER };
})(this);
