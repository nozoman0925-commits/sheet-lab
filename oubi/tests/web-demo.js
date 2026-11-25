/*
 * 見せる用の版：開くたびに見本のデータで始まり、入力は再読み込みで元に戻る
 *   node oubi/tools/build-web.js .web-demo --demo && node oubi/tests/web-demo.js
 */
const { chromium } = require('playwright'); const path = require('path');
const BASE = process.env.DEMO_BASE || 'http://127.0.0.1:8765/.web-demo/index.html';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const vp of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
    const p = await b.newPage({ viewport: vp }); p.on('pageerror', e => errs.push(e.message));
    await p.route(/googleapis|gstatic|cloudflare|jsdelivr|open-meteo/, r => r.abort());
    await p.goto(BASE + '?splash=off#/home'); await p.waitForTimeout(6000);
    const tag = vp.width < 500 ? '（スマホ）' : '';
    ok(await p.isVisible('#demo-mark') && /再読み込みで元に戻ります/.test(await p.textContent('#demo-mark')), '「見せる用」の印' + tag);
    ok(/返事待ち 8日/.test(await p.textContent('.nextup')), '次の一手に、見本の返事待ちの見積' + tag);
    const n = await p.evaluate(() => EE.S.documents.length);
    ok(n >= 10, '見本の見積が入っている（' + n + '通）' + tag);
    ok(!(await p.$('.notice-warn')), 'バックアップの知らせは出さない' + tag);
    await p.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'plus', 'demo-' + vp.width + '.png') });
    // 触って、読み込み直すと元に戻る
    await p.evaluate(() => { EE.S.documents.splice(0, 3); EE.ui.commit(); });
    await p.waitForTimeout(800);
    await p.reload(); await p.waitForTimeout(6000);
    ok(await p.evaluate(() => EE.S.documents.length) === n, '消した見積も、読み込み直すと元に戻る' + tag);
    await p.close();
  }
  console.log(errs.length ? 'ERRORS: ' + errs.join(' / ') : 'エラーなし');
  console.log(fail ? 'web-demo: ' + fail + ' 件失敗' : 'web-demo: ok'); await b.close(); if (fail || errs.length) process.exit(1);
})();
