const { chromium } = require('playwright'); const openWeb = require('./_web');
const AXE = require('fs').readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); let tot = 0;
  // 営業の画面は昼・夜で明るさが変わるので、両方で測る（sun：1＝外で見やすい明るい画面、0＝暗い画面）
  for (const sun of ['0', '1']) for (const bg of ['#04060d', '#1e2a52']) for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const p = await openWeb(b, { viewport: vp, wait: 3500 });
    await p.evaluate(v => localStorage.setItem('oubi.slsun', v), sun); await p.reload(); await p.waitForTimeout(3500);
    await p.evaluate(() => { const o = OUBI_LINK.frame().contentWindow.OUBI; const c = o.makeCase({ customer: '山田 太郎', tel: '090' }); c.work.title = '山田様邸'; o.touch(c); }); await p.waitForTimeout(1200);
    const cid = await p.evaluate(() => OUBI_LINK.frame().contentWindow.OUBI.cases()[0].id);
    for (const h of ['#/o/sales', '#/o/sales/rv', '#/o/sales/rank', '#/o/wb', '#/o/board', '#/o/cal', '#/o/list', '#/o/case/' + cid, '#/o/dash', '#/o/settings', '#/o/staff']) {
      await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(1800);
      const f = p.frames().find(f => /oubi\.html/.test(f.url()));
      const r = await f.evaluate(async ([src, bg]) => {
        if (!window.axe) eval(src);
        // 後ろの桜ミツの地（オーロラ）の色を、測るときだけ枠の地に置く
        const st = document.createElement('style'); st.textContent = 'html:root:not(.x){background:' + bg + ' !important}'; document.head.appendChild(st);
        const res = await axe.run(document, { runOnly: ['color-contrast'], resultTypes: ['violations'] }); st.remove();
        return (res.violations[0] || { nodes: [] }).nodes.map(n => n.target.join(' ') + ' :: ' + ((n.any[0] || {}).message || '').slice(0, 120));
      }, [AXE, bg]);
      tot += r.length; if (r.length) { console.log('sun=' + sun, bg, vp.width, h.replace(cid, 'id'), r.length); r.slice(0, 4).forEach(x => console.log('   ', x)); }
    }
    await p.close();
  }
  console.log('合計', tot); await b.close();
  process.exit(tot ? 1 : 0);
})();
