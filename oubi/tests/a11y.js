/*
 * 見た目の基準の確認：文字と背景の差（axe の color-contrast）と、14px 未満の文字
 *   npm i axe-core（どこかに入れて NODE_PATH を通す）
 *   node oubi/tests/a11y.js            … 暗い画面・明るい画面の両方、パソコン幅とスマホ幅
 * スクリーンショットは screenshots/th-*.png
 */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const open = require('./_open');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const OUT = path.join(__dirname, '..', 'screenshots') + '/'; fs.mkdirSync(OUT, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
const seed = { cases: { c1: { id: 'c1', no: 'OB-202611-001', createdAt: new Date().toISOString(), createdBy: 'u_tester',
  lead: { date: today, customer: '山田 太郎', tel: '090-1111-2222', addr: '東京都町田市森野1-1-1', owner: 'u_tester', contacts: [] },
  work: { title: '山田様邸 外壁塗装工事', types: ['外壁塗装工事'] }, plan: {}, quote: { files: [], items: [{ name: '外壁塗装（シリコン）', qty: 100, unit: '㎡', price: 2500 }] },
  result: {}, schedule: { steps: [], prep: {}, changes: [] }, contract: { files: [] }, complete: { checks: {} }, invoice: { files: [] }, payments: [], vendors: [], reports: [], photos: [], actual: {}, log: [] } } };
const SCREENS = [['home', null], ['list', 'list'], ['case', 'case'], ['cal', 'cal'], ['dash', 'dash'], ['settings', 'settings'], ['docs', '#/docs'], ['edit', 'edit'], ['finance', '#/finance'], ['items', '#/settings/items']];
(async () => {
  const b = await chromium.launch(); const only = process.argv[2]; let total = 0; const sum = [];
  for (const theme of ['dark', 'light']) for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const p = await open(b, { seed, viewport: vp, wait: 2500 });
    await p.evaluate(t => { localStorage.setItem('oubi.theme', t); }, theme); await p.reload(); await p.waitForTimeout(2500);
    for (const [name, how] of SCREENS) {
      if (only && name !== only) continue;
      if (how === 'case') await p.evaluate(() => OUBI.openCase('c1', 'quote'));
      else if (how === 'edit') { await p.evaluate(() => OUBI.openCase('c1', 'quote')); await p.waitForTimeout(500); await p.click('[data-mnew]'); }
      else if (how && how[0] === '#') await p.evaluate(h => { location.hash = h; }, how);
      else if (how) await p.evaluate(t => OUBI.setTab(t), how);
      await p.waitForTimeout(1300);
      await p.screenshot({ path: OUT + 'th-' + theme + '-' + vp.width + '-' + name + '.png' });
      const r = await p.evaluate(async src => {
        if (!window.axe) eval(src);
        const res = await axe.run(document, { runOnly: ['color-contrast'], resultTypes: ['violations'] });
        const nodes = (res.violations[0] || { nodes: [] }).nodes.map(n => n.target.join(' ') + ' :: ' + (n.any[0] || {}).message);
        // 見えている文字で 14px 未満のもの
        const small = [];
        document.querySelectorAll('body *').forEach(el => {
          if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
          const cs = getComputedStyle(el), rc = el.getBoundingClientRect();
          if (rc.width && rc.height && cs.visibility !== 'hidden' && parseFloat(cs.fontSize) < 13.9 && !el.closest('svg,[aria-hidden="true"],.sheet,.paper')) small.push(el.tagName.toLowerCase() + '.' + [...el.classList].join('.') + ' ' + cs.fontSize + ' 「' + el.textContent.trim().slice(0, 12) + '」');
        });
        return { nodes, small: [...new Set(small)] };
      }, AXE);
      total += r.nodes.length + r.small.length;
      sum.push(`${theme} ${vp.width} ${name}: 濃さ不足 ${r.nodes.length}・14px未満 ${r.small.length}`);
      if (process.env.V) { r.nodes.slice(0, 12).forEach(x => console.log('   C ' + x.slice(0, 220))); r.small.slice(0, 12).forEach(x => console.log('   S ' + x)); }
    }
    await p.close();
  }
  console.log(sum.join('\n')); console.log('合計', total); await b.close();
  process.exit(total ? 1 : 0);
})();
