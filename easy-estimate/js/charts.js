/*
 * 小さなグラフ部品（ライブラリなし・SVG/HTML）
 * dataviz の方法に沿う：1つの軸だけ・細いマーク・角の丸い棒（4px）・棒の間に 2px のすき間・
 * 2系列以上は凡例・ホバーで値（ツールチップ）・文字色は系列色にしない。
 * 色（ダーク面 #0f1626 で検証済み）：見積 #4a7ff0／受注 #10a0a4／入金 #a070f0
 */
(function (root) {
  'use strict';
  var EE = root.EE;
  var SERIES = { estimate: '#4a7ff0', order: '#10a0a4', paid: '#a070f0' };   // 青・水色・紫（緑は「完了」の色なので使わない。色の見分けやすさは検査済み）
  // 量（ヒートマップ）：1色の明暗。暗い面の上で「多いほど明るい」
  var SEQ = ['#1d3a66', '#24548f', '#2f6fc2', '#4b8ce8', '#86b6ff'];   // 単色（青）の濃淡。暗い背景の上で一番薄い段も見えるように

  function esc(s) { return EE.ui.esc(s); }

  /* ---- 共通ツールチップ ---- */
  var tip;
  function showTip(html, x, y) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'viz-tip'; EE.ui.layer().appendChild(tip); }
    tip.innerHTML = html; tip.hidden = false;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.min(window.innerWidth - w - 8, x + 14), top = y - h - 12;
    if (top < 8) top = y + 16;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }

  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function short(v) {
    if (Math.abs(v) >= 1e8) return (v / 1e8).toFixed(1).replace(/\.0$/, '') + '億';
    if (Math.abs(v) >= 1e4) return Math.round(v / 1e4).toLocaleString('ja-JP') + '万';
    return Math.round(v).toLocaleString('ja-JP');
  }
  /** 上の角だけ丸めた棒（基線側は直角） */
  function barPath(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.min(r, w / 2, h);
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
  }

  /**
   * 月別の比較（グループ棒グラフ）
   * opts: { groups:[{ key, label, values:{estimate,order,paid} }], series:[{key,label}], height }
   */
  function bars(el, opts) {
    var W = Math.max(320, Math.round(el.clientWidth || 760)), H = opts.height || 220, padL = 46, padB = 26, padT = 12;   // 置き場所の幅に合わせる（文字が拡大されない）
    var groups = opts.groups, series = opts.series;
    var max = niceMax(Math.max.apply(null, [1].concat(groups.map(function (g) { return Math.max.apply(null, series.map(function (s) { return g.values[s.key] || 0; })); }))));
    var gw = (W - padL - 8) / Math.max(1, groups.length);
    var bw = Math.min(22, (gw - 18) / series.length - 2);
    var plotH = H - padB - padT;
    var y = function (v) { return padT + plotH - (v / max) * plotH; };
    var grid = [0, 0.5, 1].map(function (f) {
      var v = max * f, yy = y(v);
      return '<line x1="' + padL + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" class="viz-grid"/><text x="' + (padL - 8) + '" y="' + (yy + 4) + '" class="viz-axis" text-anchor="end">' + short(v) + '</text>';
    }).join('');
    var marks = groups.map(function (g, gi) {
      var gx = padL + gi * gw + (gw - (bw + 2) * series.length) / 2;
      var bs = series.map(function (s, si) {
        var v = g.values[s.key] || 0, yy = y(v);
        return '<path class="viz-bar" style="--d:' + (gi * 40 + si * 30) + 'ms" d="' + barPath(gx + si * (bw + 2), yy, bw, padT + plotH - yy, 4) + '" fill="' + SERIES[s.key] + '"/>';
      }).join('');
      return '<g class="viz-group" data-g="' + gi + '">' +
        '<rect class="viz-hit" x="' + (padL + gi * gw) + '" y="' + padT + '" width="' + gw + '" height="' + plotH + '"/>' + bs +
        '<text x="' + (padL + gi * gw + gw / 2) + '" y="' + (H - 8) + '" class="viz-axis" text-anchor="middle">' + esc(g.label) + '</text></g>';
    }).join('');
    el.innerHTML = '<div class="viz-legend">' + series.map(function (s) { return '<span><i style="background:' + SERIES[s.key] + '"></i>' + esc(s.label) + '</span>'; }).join('') + '</div>' +
      '<svg class="viz" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title || '月別の比較') + '">' + grid +
      '<line x1="' + padL + '" x2="' + W + '" y1="' + (padT + plotH) + '" y2="' + (padT + plotH) + '" class="viz-base"/>' + marks + '</svg>';
    el.querySelectorAll('.viz-group').forEach(function (g) {
      g.addEventListener('pointermove', function (e) {
        var d = groups[g.dataset.g];
        el.querySelectorAll('.viz-group').forEach(function (o) { o.classList.toggle('dim', o !== g); });
        showTip('<b>' + esc(d.label) + '</b>' + series.map(function (s) {
          return '<div class="row"><i style="background:' + SERIES[s.key] + '"></i>' + esc(s.label) + '<span>' + EE.ui.yen(d.values[s.key] || 0) + '</span></div>'; }).join('') +
          (d.note ? '<div class="note">' + esc(d.note) + '</div>' : ''), e.clientX, e.clientY);
      });
      g.addEventListener('pointerleave', function () { hideTip(); el.querySelectorAll('.viz-group').forEach(function (o) { o.classList.remove('dim'); }); });
    });
  }

  /** 件数の推移（小さなエリアチャート）。points:[{label, value}] */
  function area(el, points, opts) {
    opts = opts || {};
    var W = Math.max(240, Math.round(el.clientWidth || 520)), H = opts.height || 90, pad = 6;
    var max = Math.max(1, Math.max.apply(null, points.map(function (p) { return p.value; })));
    var x = function (i) { return pad + i * (W - pad * 2) / Math.max(1, points.length - 1); };
    var y = function (v) { return H - 18 - (v / max) * (H - 30); };
    var line = points.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p.value).toFixed(1); }).join('');
    var fill = line + 'L' + x(points.length - 1) + ',' + (H - 18) + 'L' + x(0) + ',' + (H - 18) + 'Z';
    el.innerHTML = '<svg class="viz" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title || '件数の推移') + '">' +
      '<defs><linearGradient id="area-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3987e5" stop-opacity=".35"/><stop offset="1" stop-color="#3987e5" stop-opacity="0"/></linearGradient></defs>' +
      '<line x1="0" x2="' + W + '" y1="' + (H - 18) + '" y2="' + (H - 18) + '" class="viz-base"/>' +
      (opts.fmt === 'yen' ? [0.5, 1].map(function (f) { var yy = y(max * f); return '<line x1="0" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" class="viz-grid"/><text x="2" y="' + (yy - 4) + '" class="viz-axis">' + short(max * f) + '</text>'; }).join('') : '') +
      '<path class="viz-fill" d="' + fill + '" fill="url(#area-g)"/><path class="viz-line' + (opts.glow ? ' glow' : '') + '" d="' + line + '" pathLength="1" fill="none" stroke="#3987e5" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      points.map(function (p, i) { return (i % Math.ceil(points.length / 6) === 0 || i === points.length - 1) ? '<text x="' + x(i) + '" y="' + (H - 4) + '" class="viz-axis" text-anchor="middle">' + esc(p.label) + '</text>' : ''; }).join('') +
      '<line class="viz-cross" x1="0" x2="0" y1="4" y2="' + (H - 18) + '" hidden/><circle class="viz-dot" r="4.5" hidden/>' +
      '<rect class="viz-hit" x="0" y="0" width="' + W + '" height="' + H + '"/></svg>';
    var svg = el.querySelector('svg'), cross = svg.querySelector('.viz-cross'), dot = svg.querySelector('.viz-dot');
    svg.querySelector('.viz-hit').addEventListener('pointermove', function (e) {
      var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W;
      var i = Math.max(0, Math.min(points.length - 1, Math.round((px - pad) / ((W - pad * 2) / Math.max(1, points.length - 1)))));
      cross.hidden = false; dot.hidden = false;
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i));
      dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(points[i].value));
      showTip('<b>' + esc(points[i].label) + '</b><div class="row">' + esc(opts.unit || '件数') + '<span>' + (opts.fmt === 'yen' ? EE.ui.yen(points[i].value) : points[i].value.toLocaleString('ja-JP')) + '</span></div>', e.clientX, e.clientY);
    });
    svg.querySelector('.viz-hit').addEventListener('pointerleave', function () { cross.hidden = true; dot.hidden = true; hideTip(); });
    // 描画の動き：線が左から伸び、塗りはその後ろから淡く出る（期間を変えたときも描き直す）
    if (opts.draw && EE.fx) {
      EE.fx.anim(svg.querySelector('.viz-line'), [{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], { duration: EE.fx.T.page, fill: 'none' });
      EE.fx.anim(svg.querySelector('.viz-fill'), [{ opacity: 0 }, { opacity: 1 }], { duration: EE.fx.T.page, delay: 100, fill: 'backwards' });
    }
  }

  /** 円形ゲージ（0〜1）。数字は中央に大きく、リングの太さ 9px */
  function ring(value, label, sub, color) {
    var r = 46, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value || 0));
    return '<div class="ring" style="--len:' + c.toFixed(1) + ';--off:' + (c * (1 - v)).toFixed(1) + '">' +
      '<svg viewBox="0 0 110 110" aria-hidden="true"><circle cx="55" cy="55" r="' + r + '" class="ring-track"/>' +
      '<circle cx="55" cy="55" r="' + r + '" class="ring-val" stroke="' + (color || '#3987e5') + '" stroke-dasharray="' + c.toFixed(1) + '" transform="rotate(-90 55 55)"/></svg>' +
      '<div class="ring-num"><b class="num" data-count="' + Math.round(v * 1000) / 10 + '" data-format="pct">0%</b></div>' +
      '<div class="ring-label">' + esc(label) + '</div>' + (sub ? '<div class="ring-sub">' + esc(sub) + '</div>' : '') + '</div>';
  }

  /** ヒートマップ（行×月）。cells[row][col] = { count, amount } */
  function heatmap(el, rows, cols, cells, mode) {
    var max = 0;
    rows.forEach(function (r, ri) { cols.forEach(function (c, ci) { var v = (cells[ri][ci] || {})[mode] || 0; if (v > max) max = v; }); });
    var level = function (v) { if (!v) return -1; return Math.min(SEQ.length - 1, Math.floor(v / max * SEQ.length - 1e-9)); };
    el.innerHTML = '<div class="heat" style="--cols:' + cols.length + '">' +
      '<span></span>' + cols.map(function (c) { return '<span class="heat-col">' + esc(c.short) + '</span>'; }).join('') +
      rows.map(function (r, ri) {
        return '<span class="heat-row">' + esc(r.label) + '</span>' + cols.map(function (c, ci) {
          var cell = cells[ri][ci] || { count: 0, amount: 0 }, lv = level(cell[mode]);
          return '<i class="heat-cell' + (lv < 0 ? ' zero' : '') + '" data-r="' + ri + '" data-c="' + ci + '" style="' + (lv >= 0 ? 'background:' + SEQ[lv] : '') + ';--d:' + ((ri + ci) * 12) + 'ms"></i>';
        }).join('');
      }).join('') + '</div>' +
      '<div class="heat-scale"><span>少ない</span>' + SEQ.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '<span>多い</span></div>';
    el.querySelectorAll('.heat-cell').forEach(function (cellEl) {
      cellEl.addEventListener('pointermove', function (e) {
        var ri = cellEl.dataset.r, ci = cellEl.dataset.c, cell = cells[ri][ci] || { count: 0, amount: 0 };
        showTip('<b>' + esc(cols[ci].label) + '・' + esc(rows[ri].label) + '</b><div class="row">件数<span>' + cell.count + '件</span></div><div class="row">合計<span>' + EE.ui.yen(cell.amount) + '</span></div>', e.clientX, e.clientY);
      });
      cellEl.addEventListener('pointerleave', hideTip);
    });
  }

  EE.charts = { tip: showTip, bars: bars, area: area, ring: ring, heatmap: heatmap, hideTip: hideTip, SERIES: SERIES, short: short };
})(this);
