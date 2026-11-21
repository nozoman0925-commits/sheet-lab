/*
 * 数値合わせ（node oubi/tests/web-metrics.js [幅x高さ]）
 *   桜ミツ側（親の画面）と業務管理側（枠の中）で、次の値がそろっているかを全画面で測る。
 *     パネル：角丸・内側の余白（上・左）／見出し：h1・h2・h3 の大きさと太さ／文章：行間（文字の大きさに対する倍率）／ボタン：高さ
 *   角丸は 22px（パネル）と 14px（小さい部品）の2種類だけ。丸ごと（カプセル・円）は形なので数えない。
 *   出力：項目ごとに、両側で使われている値と、片側にしかない値（＝差分）の数。差分0・角丸の種類2が完了条件。
 */
const { chromium } = require('playwright'); const openWeb = require('./_web');
const { ROUTES } = require('./web-scroll');
const size = (process.argv[2] || '1920x1080').split('x').map(Number);
function measure() {
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('.aurora, svg, .modal, .overlay, #sheet, .toasts, nav.tabs, .sidebar, .mnav, .pg-bar, .heat, .chart, .flow, .bars, [data-bars]'); };
  const out = { radius: {}, panelPad: {}, h1: {}, h2: {}, h3: {}, lh: {}, btnH: {} };
  const add = (k, v, ex) => { (out[k][v] = out[k][v] || []).push(ex); };
  const name = e => e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 2).join('.');
  document.querySelectorAll('body *').forEach(e => {
    if (!vis(e)) return; const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    const rad = parseFloat(cs.borderTopLeftRadius);
    const bg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) > 0;
    if (rad > 0 && bg && !/%/.test(cs.borderTopLeftRadius) && rad < Math.min(r.height, r.width) / 2 - 1 && rad >= 4) add('radius', Math.round(rad) + 'px', name(e));
    if (e.matches('.panel, section.grp, .widget, .wz-card, .case-card, .sec, .launch-tile') && r.width > 200) add('panelPad', Math.round(parseFloat(cs.paddingTop)) + '/' + Math.round(parseFloat(cs.paddingLeft)), name(e));
    if (e.matches('.panel > .panel-b') && r.width > 200) add('panelPad', Math.round(parseFloat(cs.paddingTop)) + '/' + Math.round(parseFloat(cs.paddingLeft)), name(e.parentElement));
    if (/^H[123]$/.test(e.tagName)) add(e.tagName.toLowerCase(), Math.round(parseFloat(cs.fontSize)) + 'px/' + cs.fontWeight, (e.textContent || '').trim().slice(0, 10));
    if (e.matches('p, .sub, .hint, .wz-help') && (e.textContent || '').trim().length > 20) add('lh', (parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) || 0).toFixed(2), (e.textContent || '').trim().slice(0, 10));
    if (e.matches('button, a.btn, .btn') && !e.matches('input, select, label') && !e.closest('.cal, .mcal, .seg, .wbseg, .chips, .sl-cards, .sl-nav, .launch, .quick-card, .w-quick, .wz-opt, .wz-mode, .big4, .alert, .wk, .gs-i, .sectabs, .check, .staff-card, .ag-ev, .ev, .dn, .sl-card')) add('btnH', Math.round(r.height) + 'px', name(e) + ' ' + (e.innerText || '').trim().slice(0, 8));
  });
  return out;
}
(async () => {
  const b = await chromium.launch(); const p = await openWeb(b, { viewport: { width: size[0], height: size[1] }, wait: 3500, old: true }); await p.waitForTimeout(2500);
  const ids = await p.evaluate(() => { const o = OUBI_LINK.frame().contentWindow.OUBI; const c = o.cases()[0]; const d = EE.S.documents.find(x => x.lines.length > 3) || EE.S.documents[0]; return { c: c && c.id, d: d && d.id }; });
  const side = { P: {}, F: {} };
  for (const r0 of ROUTES) {
    const r = r0.replace('C', ids.c).replace('/D', '/' + ids.d);
    await p.evaluate(h => { location.hash = h; }, r); await p.waitForTimeout(1600);
    const inF = await p.evaluate(() => document.body.classList.contains('ob-on'));
    const fr = p.frames().find(f => /oubi\.html/.test(f.url()));
    const m = inF ? await fr.evaluate(measure) : await p.evaluate(measure);
    const S = side[inF ? 'F' : 'P'];
    Object.keys(m).forEach(k => { S[k] = S[k] || {}; Object.keys(m[k]).forEach(v => { S[k][v] = (S[k][v] || []).concat(m[k][v].map(x => r0 + ' ' + x)); }); });
  }
  let diff = 0;
  // そろえる値（両側共通）。これ以外の値が使われていたら差分
  const TOK = { radius: ['22px', '14px'], panelPad: ['16/20', '0/0'], h1: ['22px/700'], h2: ['16px/700'], h3: ['14px/700'], lh: ['1.70'], btnH: ['36px', '48px', '52px'] };
  const LBL = { radius: '角丸', panelPad: 'パネルの余白（上/左）', h1: '見出し1', h2: '見出し2', h3: '見出し3', lh: '文章の行間', btnH: 'ボタンの高さ' };
  Object.keys(LBL).forEach(k => {
    const P = Object.keys(side.P[k] || {}), F = Object.keys(side.F[k] || {});
    const bad = [...new Set(P.concat(F))].filter(v => !TOK[k].includes(v));
    const n = bad.reduce((t, v) => t + ((side.P[k] || {})[v] || []).length + ((side.F[k] || {})[v] || []).length, 0);
    diff += n;
    console.log('## ' + LBL[k] + '（' + TOK[k].join('・') + '）：外れ ' + n + '箇所　（桜ミツ側 ' + P.join(' ') + '　｜　業務管理側 ' + F.join(' ') + '）');
    bad.slice(0, 10).forEach(v => { const ex = ((side.P[k] || {})[v] || []).concat((side.F[k] || {})[v] || []); console.log('    ' + v + '：' + ex.length + '箇所　例 ' + [...new Set(ex)].slice(0, 4).join(' / ')); });
  });
  console.log('そろえる値から外れている箇所の合計：' + diff);
  await b.close();
})();
