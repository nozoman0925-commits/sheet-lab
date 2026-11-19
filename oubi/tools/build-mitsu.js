/*
 * 桜ミツ（easy-estimate）を業務管理に入れるための部品を作る
 *   node oubi/tools/build-mitsu.js
 * 作るもの：
 *   oubi/mitsu.js  … 桜ミツのプログラムを1つにまとめたもの（読み込みを1回にして、起動を軽く）
 *   oubi/mitsu.css … 桜ミツの見た目。すべて「.ee の中だけ」に効くように書き換える
 *                    （業務管理の .btn や .chip などと名前がぶつかっても、互いに影響しない）
 * 桜ミツ側を直したら、これを実行し直す。
 */
const fs = require('fs'); const path = require('path');
const SRC = path.join(__dirname, '..', '..', 'easy-estimate');
const OUT = path.join(__dirname, '..');

// 業務管理の中では使わないもの：起動の演出（splash）・ログイン（auth・login）。ログインは業務管理の合言葉を使う
const JS = ['crest', 'engine', 'parse', 'docparse', 'filestore', 'check', 'catalog', 'data', 'fx', 'ui', 'a11y', 'features', 'print', 'charts', 'insight',
  'views/sites', 'views/finance', 'views/analysis', 'views/schedule', 'views/planned', 'views/control', 'views/docs', 'views/editor', 'calc-tool',
  'views/quick', 'views/importer', 'views/clients', 'views/folders', 'views/site', 'views/settings-extra', 'views/settings', 'app', 'palette'];
const CSS = ['app', 'sheet', 'aurora', 'pop', 'voyage', 'control'];

let js = '/* 自動生成（oubi/tools/build-mitsu.js）。直すときは easy-estimate/js を直して作り直す */\n';
JS.forEach(f => { js += '\n/* ---- ' + f + '.js ---- */\n' + fs.readFileSync(path.join(SRC, 'js', f + '.js'), 'utf8') + '\n'; });
fs.writeFileSync(path.join(OUT, 'mitsu.js'), js);

/* ---- CSS を .ee の中だけに効くようにする ---- */
function splitTop(s, sep) { // かっこの中の区切りは無視して分ける
  const out = []; let d = 0, cur = '';
  for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === sep && d === 0) { out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur); return out;
}
function scopeSel(sel) {
  sel = sel.trim(); if (!sel) return sel;
  if (/^(:root|html|body)$/.test(sel)) return '.ee';
  if (/^body::(before|after)$/.test(sel)) return '.ee-host' + sel.slice(4);   // 背景の飾りは見積の画面の台紙だけ
  let m;
  if ((m = /^(?:html\s+)?(?::root|html|body)([.:[#].*)?$/.exec(sel)) && !/\s/.test(m[1] || '')) return '.ee' + (m[1] || '');
  if ((m = /^(?:html|body|:root)\s+(.*)$/.exec(sel))) return '.ee ' + m[1];
  return '.ee ' + sel;
}
// 業務管理の基準（本文16px以上・14pxは例外・14px未満は使わない）に合わせて、文字の大きさを直す
function sizes(head, body) {
  if (/^body$/.test(head.trim())) body = body.replace(/font-size:\s*14px/, 'font-size: 16px');
  return body.replace(/font-size:\s*(\d+(?:\.\d+)?)px/g, (m, n) => Number(n) < 14 ? 'font-size: 14px' : m);
}
function scope(css) {
  let out = '', i = 0;
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  while (i < css.length) {
    const open = css.indexOf('{', i); if (open < 0) { out += css.slice(i); break; }
    const head = css.slice(i, open).trim();
    // 対応する } を探す
    let d = 0, j = open;
    for (; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}') { d--; if (d === 0) break; } }
    const body = css.slice(open + 1, j);
    if (/^@(media|supports|container|layer)/.test(head)) out += head + '{' + scope(body) + '}\n';
    else if (/^@/.test(head)) out += head + '{' + body + '}\n';   // @keyframes・@font-face・@page はそのまま
    else if (/^html\s*,\s*body$/.test(head)) { /* html, body { height:100% } は業務管理の画面を崩すので入れない */ }
    else out += splitTop(head, ',').map(scopeSel).join(',') + '{' + sizes(head, body) + '}\n';
    i = j + 1;
  }
  return out;
}
/* ---- 明るい画面（html[data-theme=light]）のとき：桜ミツの暗い色を明るい色に置き換える上書きを作る ----
   桜ミツは暗い画面だけで作ってあるため、色を直接書いている所（すりガラスの板の地・薄い文字色など）を機械的に入れ替える */
const LIGHT_TEXT = { 'a7b3c9': '#34415a', 'e0f2fe': '#1e3a8a', '93c5fd': '#2350c4', 'bfdbfe': '#2350c4', '9cc3ff': '#2350c4', '60a5fa': '#2350c4', 'd4bd8c': '#6e4f0c', 'f9c74f': '#7d5100', '6b7280': '#46536b' };
function lightVal(prop, v, sel) {
  let o = v;
  if (/^background/.test(prop)) {
    if (/\.overlay\b/.test(sel)) return 'rgba(15,26,46,.38)';
    o = o.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g, (m, r, g, b2, al) => {
      r = +r; g = +g; b2 = +b2; al = +al;
      if (r < 70 && g < 70 && b2 < 70) return 'rgba(255,255,255,' + Math.min(1, Math.max(al, .9)) + ')';
      if (r > 240 && g > 240 && b2 > 240) return 'rgba(15,26,46,' + Math.min(.08, al) + ')';
      return m;
    });
    o = o.replace(/#(0[0-9a-f]{5}|1[0-9a-f]{5}|04060d|0a0e18)\b/gi, '#ffffff');
  } else if (prop === 'color') {
    o = o.replace(/#([0-9a-fA-F]{6})\b/g, (m, h) => LIGHT_TEXT[h.toLowerCase()] || m);
  } else if (prop === 'text-shadow') o = 'none';
  else if (/^border(-color)?$/.test(prop)) o = o.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([\d.]+)\s*\)/g, (m, al) => 'rgba(15,26,46,' + Math.min(.2, +al + .08) + ')');
  return o === v ? null : o;
}
function lightOf(css) {
  let out = '', i = 0;
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  while (i < css.length) {
    const open = css.indexOf('{', i); if (open < 0) break;
    const head = css.slice(i, open).trim(); let d = 0, j = open;
    for (; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}') { d--; if (d === 0) break; } }
    const body = css.slice(open + 1, j); i = j + 1;
    if (/^@media/.test(head) && !/print/.test(head)) { const inner = lightOf(body); if (inner) out += head + '{' + inner + '}\n'; continue; }
    if (/^@/.test(head) || /^html\s*,\s*body$/.test(head)) continue;
    const decls = [];
    body.split(';').forEach(dcl => { const k = dcl.indexOf(':'); if (k < 0) return; const prop = dcl.slice(0, k).trim().toLowerCase(), val = dcl.slice(k + 1).trim().replace(/\s*!important$/, '');
      const nv = lightVal(prop, val, head); if (nv) decls.push(prop + ':' + nv + ' !important'); });
    if (decls.length) out += splitTop(head, ',').map(x => ':root[data-theme="light"] ' + scopeSel(x)).join(',') + '{' + decls.join(';') + '}\n';
  }
  return out;
}
let css = '/* 自動生成（oubi/tools/build-mitsu.js）。直すときは easy-estimate/css を直して作り直す */\n';
CSS.forEach(f => { css += '\n/* ---- ' + f + '.css ---- */\n' + scope(fs.readFileSync(path.join(SRC, 'css', f + '.css'), 'utf8')); });
css += '\n/* ---- 明るい画面の上書き（自動） ---- */\n';
CSS.filter(f => f !== 'sheet').forEach(f => { css += lightOf(fs.readFileSync(path.join(SRC, 'css', f + '.css'), 'utf8')); });
fs.writeFileSync(path.join(OUT, 'mitsu.css'), css);
console.log('mitsu.js', js.length, 'bytes / mitsu.css', css.length, 'bytes');
