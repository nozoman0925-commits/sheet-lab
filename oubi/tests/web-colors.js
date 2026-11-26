/*
 * 色の監査（node oubi/tests/web-colors.js [幅x高さ]）
 *   色は「意味」だけに使う：飾りに使ってよいのは 青・水色・紫（桜ミツの色）と無彩色だけ。
 *   緑・赤・黄・マゼンタ・ミントは「状態の印」（下書き灰・確定青・要対応赤・完了緑・注意黄）の中だけで使う。
 *   画面ごとに、状態の印の外で使われている緑・赤・黄・マゼンタを数える（文字・背景・線・影・背景の重ね）。
 */
const { chromium } = require('playwright'); const openWeb = require('./_web');
const { ROUTES } = require('./web-scroll');
const size = (process.argv[2] || '1920x1080').split('x').map(Number);
function scan() {
  const STATUS = '.badge, .chip, .toast, .alert, .alerts, .warn, .bad, .err, .ok, .flag, .flag-err, .check-sum, .check-item, .chk, [data-status], .sl-acc, .w-item.warn, .w-kpi.warn, .lockline, .mtr, .meter, .rate, .r-bad, .r-ok, .r-warn, .cell-warn, .warn-text, .neg, .pos, .money-neg, .ring, .rings, .w-rings, .chart, .bars, [data-bars], .flow, .heat, .spark, .tdb, .viz, svg, canvas, #sec-check, .big4 .c2, .notice-warn, .sl-hud, .sl-badge, .sl-bdg, .sl-pl, .lv, .combo, .delta, .soft-warn, .cost-missing, .nav-badge, #net-mark, .beat-flag, .won-card, .due-over, .due-soon, .price-odd, .stale-note';   // 2026-11-26：前月比のバッジ（増＝ミント・減＝淡い赤）・注意の帯・件数のバッジ・圏外のしるしも状態の印
  const out = {};
  const fam = (r, g, b, a) => {
    if (a < 0.12) return null;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510, d = (mx - mn) / 255;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (s < 0.38 || d < 0.16) return null;   // ほぼ無彩色
    let h; const R = r / 255, G = g / 255, B = b / 255, M = mx / 255;
    if (M === R) h = 60 * (((G - B) / d) % 6); else if (M === G) h = 60 * ((B - R) / d + 2); else h = 60 * ((R - G) / d + 4);
    if (h < 0) h += 360;
    if (h >= 185 && h < 290) return null;      // 水色・青・紫（桜ミツの色）
    if (h >= 170 && h < 185) return null;      // 水色寄り
    return h < 18 || h >= 335 ? '赤' : h < 70 ? '黄' : h < 170 ? '緑' : 'マゼンタ';
  };
  const cols = s => {
    const a = (String(s).match(/rgba?\([^)]+\)/g) || []).map(c => c.match(/[\d.]+/g).map(Number));
    (String(s).match(/color\(srgb [^)]+\)/g) || []).forEach(c => { const n = c.match(/-?[\d.]+/g).map(Number); a.push([n[0] * 255, n[1] * 255, n[2] * 255, n[3] == null ? 1 : n[3]]); });
    return a;
  };
  // オーロラ（背景の光）の色も数える
  document.querySelectorAll('.aurora i').forEach(e => { const f = (getComputedStyle(e).backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(c => c.match(/[\d.]+/g).map(Number)).map(c => fam(c[0], c[1], c[2], 1)).find(Boolean); if (f) (out[f + '（オーロラ）'] = out[f + '（オーロラ）'] || []).push('aurora.' + e.className); });
  document.querySelectorAll('body *').forEach(e => {
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return;
    if (e.closest(STATUS)) return;
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const list = [];
    if (own) list.push(['文字', cs.color]);
    if ([...e.children].some(c => c.tagName === 'svg' && !c.closest('.aurora'))) list.push(['アイコン', cs.color]);
    list.push(['背景', cs.backgroundColor], ['背景', cs.backgroundImage], ['線', cs.borderTopColor + ' ' + cs.borderLeftColor], ['影', cs.boxShadow]);
    if (cs.borderTopWidth === '0px' && cs.borderLeftWidth === '0px') list.splice(list.findIndex(x => x[0] === '線'), 1);
    list.forEach(([k, v]) => cols(v).forEach(c => { const f = fam(c[0], c[1], c[2], c[3] == null ? 1 : c[3]); if (f) { const key = f + '（' + k + '）'; (out[key] = out[key] || []).push(e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 2).join('.') + ' ' + ((e.innerText || '').trim().slice(0, 12))); } }));
  });
  return out;
}
(async () => {
  const b = await chromium.launch(); const p = await openWeb(b, { viewport: { width: size[0], height: size[1] }, wait: 3500, old: true }); await p.waitForTimeout(2500);
  const ids = await p.evaluate(() => { const o = OUBI_LINK.frame().contentWindow.OUBI; const c = o.cases()[0]; const d = EE.S.documents.find(x => x.lines.length > 3) || EE.S.documents[0]; return { c: c && c.id, d: d && d.id }; });
  let total = 0;
  for (const r0 of ROUTES) {
    const r = r0.replace('C', ids.c).replace('/D', '/' + ids.d);
    await p.evaluate(h => { location.hash = h; }, r); await p.waitForTimeout(1700);
    const parent = await p.evaluate(scan);
    const inF = await p.evaluate(() => document.body.classList.contains('ob-on'));
    const fr = p.frames().find(f => /oubi\.html/.test(f.url()));
    const frame = inF ? await fr.evaluate(scan) : {};
    const all = {}; [parent, frame].forEach(o => Object.keys(o).forEach(k => { all[k] = (all[k] || []).concat(o[k]); }));
    const n = Object.values(all).reduce((s, v) => s + v.length, 0); total += n;
    if (n) console.log(r0.padEnd(20) + n + '件　' + Object.keys(all).map(k => k + ' ' + all[k].length + '（例 ' + [...new Set(all[k])].slice(0, 2).join(' / ') + '）').join('　'));
  }
  console.log('状態の印の外の 緑・赤・黄・マゼンタ：' + total + ' 件');
  await b.close();
})();
