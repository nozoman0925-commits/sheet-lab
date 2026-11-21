/*
 * 画面ごとの「スクロールの量」を測る（node oubi/tests/web-scroll.js [幅x高さ ...]）
 *   データの入った状態で各画面を開き、画面全体の縦の長さが、見えている高さの何倍かを出す（1.00＝スクロールなし）。
 *   一覧の中だけが動く（枠の中のスクロール）ものは、画面全体のスクロールには数えない。
 */
const { chromium } = require('playwright'); const openWeb = require('./_web');
const SIZES = (process.argv.slice(2).length ? process.argv.slice(2) : ['1920x1080', '1366x768']).map(s => { const [w, h] = s.split('x').map(Number); return { width: w, height: h }; });
const ROUTES = ['#/home', '#/o/sales', '#/o/sales/rv', '#/o/sales/rank', '#/o/list', '#/o/case/C', '#/sites', '#/clients', '#/docs', '#/new', '#/w', '#/edit/D',
  '#/o/cal', '#/o/wb', '#/o/board', '#/finance', '#/o/dash', '#/o/dash/nums', '#/analysis',
  '#/settings/items', '#/settings/actual', '#/settings/packages', '#/settings/formulas', '#/settings/snippets', '#/settings/company', '#/settings/rules', '#/o/settings', '#/o/staff', '#/settings/data'];
module.exports = { ROUTES };
if (require.main === module) (async () => {
  const b = await chromium.launch(); const res = {};
  for (const vp of SIZES) {
    const p = await openWeb(b, { viewport: vp, wait: 3500, old: true });
    await p.waitForTimeout(2500);
    const ids = await p.evaluate(() => { const o = OUBI_LINK.frame().contentWindow.OUBI; const c = o.cases()[0]; const d = EE.S.documents.find(x => x.lines.length > 3) || EE.S.documents[0]; return { c: c && c.id, d: d && d.id }; });
    for (const r0 of ROUTES) {
      const r = r0.replace('C', ids.c).replace('/D', '/' + ids.d);
      await p.evaluate(h => { location.hash = h; }, r); await p.waitForTimeout(1700);
      const inFrame = await p.evaluate(() => document.body.classList.contains('ob-on'));
      let ratio;
      if (inFrame) {
        const fr = p.frames().find(f => /oubi\.html/.test(f.url()));
        ratio = await fr.evaluate(() => { const s = document.scrollingElement; return s.scrollHeight / innerHeight; });
      } else {
        ratio = await p.evaluate(() => { const v = document.getElementById('view'); const s = document.scrollingElement; return Math.max(v.scrollHeight / v.clientHeight, s.scrollHeight / innerHeight); });
      }
      (res[r0] = res[r0] || {})[vp.width + 'x' + vp.height] = Math.round(ratio * 100) / 100;
    }
    await p.close();
  }
  const keys = SIZES.map(v => v.width + 'x' + v.height);
  console.log('画面'.padEnd(22) + keys.join('  '));
  let over = 0;
  Object.keys(res).forEach(r => { const v = keys.map(k => res[r][k]); if (v.some(x => x > 1.02)) over++; console.log(r.padEnd(22) + v.map(x => (x > 1.02 ? '×' : '○') + x.toFixed(2).padStart(6)).join('  ')); });
  console.log('スクロールが出る画面：' + over + ' / ' + Object.keys(res).length);
  await b.close();
})();
