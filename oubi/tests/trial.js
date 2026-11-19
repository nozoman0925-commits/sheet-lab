/*
 * 試用モード（Supabase につながらないとき・この端末だけ）でも見積が動くかの確認
 *   node oubi/tests/trial.js
 */
const { chromium } = require('playwright'); const assert = require('assert');
const BASE = process.env.OUBI_BASE || 'http://127.0.0.1:8765/oubi/index.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
  const ok = (c, m) => { assert.ok(c, m); console.log('✓ ' + m); };
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/jsdelivr|googleapis|gstatic|cloudflare|gsi\.go\.jp|open-meteo/, r => r.abort());
  await p.goto(BASE); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2500);
  ok(/試用モード/.test(await p.textContent('#main')), '試用モードで起動');
  await p.evaluate(() => { const c = OUBI.makeCase({ customer: '試用 花子', tel: '090-9999-0000' }); c.work.title = '試用様邸 外構'; OUBI.touch(c); });
  await p.waitForTimeout(1200);
  const id = await p.evaluate(() => OUBI.cases()[0].id);
  await p.evaluate(id => OUBI.openCase(id, 'quote'), id); await p.waitForTimeout(800);
  await p.click('[data-mnew]'); await p.waitForTimeout(1500);
  ok(/^#\/edit\//.test(await p.evaluate(() => location.hash)), '試用モードでも見積を作れる');
  await p.click('#btn-save'); await p.waitForTimeout(1200);
  await p.reload(); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => EE.S.documents.length === 1 && !!JSON.parse(localStorage.getItem('oubi.mitsu.v1')).mitsu_docs), '試用モードの見積はこの端末に残る（oubi.mitsu.v1）');
  console.log(errs.length ? 'ERRORS: ' + errs.join(' / ') : 'trial: ok'); await b.close();
  if (errs.length) process.exit(1);
})();
