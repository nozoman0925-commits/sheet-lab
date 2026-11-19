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
    else out += splitTop(head, ',').map(scopeSel).join(',') + '{' + body + '}\n';
    i = j + 1;
  }
  return out;
}
let css = '/* 自動生成（oubi/tools/build-mitsu.js）。直すときは easy-estimate/css を直して作り直す */\n';
CSS.forEach(f => { css += '\n/* ---- ' + f + '.css ---- */\n' + scope(fs.readFileSync(path.join(SRC, 'css', f + '.css'), 'utf8')); });
fs.writeFileSync(path.join(OUT, 'mitsu.css'), css);
console.log('mitsu.js', js.length, 'bytes / mitsu.css', css.length, 'bytes');
