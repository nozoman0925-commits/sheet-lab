// 画面ごとのスクリーンショットを easy-estimate/screenshots/ に保存する（Playwright が必要）
// 実行: node easy-estimate/tests/screenshots.js
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, '..', 'screenshots') + '/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const url = 'file://' + path.join(__dirname, '..', 'index.html');
  await p.goto(url + '?splash=off#/home'); await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + '1-home.png' });
  await p.goto(url + '?splash=off#/docs'); await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + '2-docs.png' });
  // new estimate
  await p.click('a[href="#/new"].nav-item'); await p.waitForTimeout(600);
  await p.screenshot({ path: OUT + '3a-quick-hub.png' });
  await p.goto(url + '?splash=off#/new/text'); await p.waitForTimeout(500);
  await p.click('[data-ex="0"]'); await p.waitForTimeout(600);
  await p.screenshot({ path: OUT + '3b-quick-text.png' });
  await p.goto(url + '?splash=off#/new/edit'); await p.waitForTimeout(600);
  if (await p.$('.overlay [data-ok]')) { await p.click('.overlay [data-ok]'); await p.waitForTimeout(500); }
  await p.selectOption('[data-f="customerId"]', 'cus_yamada');
  await p.selectOption('[data-f="projectId"]', 'prj_yamada');
  await p.fill('#pick', 'クロス'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '3-picker.png' });
  await p.keyboard.press('Enter');
  await p.keyboard.type('25'); await p.keyboard.press('Enter');
  await p.fill('#pick', 'k-001'); await p.keyboard.press('Enter'); await p.keyboard.type('25');
  await p.selectOption('#tpl-add', 'pkg_toilet'); await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + '4-editor.png', fullPage: false });
  await p.keyboard.press('Control+s'); await p.waitForTimeout(400);
  console.log('hash after save', await p.evaluate(() => location.hash));
  console.log('total text', await p.textContent('[data-k="total"]'));
  await p.click('#sec-check [data-act="check"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '5-check.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.click('#sec-check [data-act="pdf"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '6-precheck.png' });
  await p.click('[data-go]'); await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '7-preview.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // pdf output real
  const id = await p.evaluate(() => location.hash.split('/')[2]);
  await p.evaluate((id) => { const d = EE.ui.findDoc(id); document.getElementById('print-root').innerHTML = EE.print.sheetHTML(d); }, id);
  await p.emulateMedia({ media: 'print' });
  await p.pdf({ path: OUT + 'estimate.pdf', format: 'A4', margin: { top: '12mm', bottom: '14mm', left: '12mm', right: '12mm' } });
  await p.emulateMedia({ media: 'screen' });
  await p.evaluate(() => document.getElementById('print-root').innerHTML = '');
  // issued doc view
  await p.goto(url + '?splash=off#/docs'); await p.waitForTimeout(500);
  await p.click('tr[data-href] >> text=原状回復'); await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + '8-issued.png' });
  // stale price doc
  await p.goto(url + '?splash=off#/docs'); await p.waitForTimeout(400);
  await p.click('tr[data-href] >> text=LED'); await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + '9-stale.png' });
  await p.goto(url + '?splash=off#/clients'); await p.waitForTimeout(600);
  await p.screenshot({ path: OUT + '10-clients.png' });
  for (const t of ['items', 'packages', 'formulas', 'snippets', 'company', 'rules', 'data']) {
    await p.goto(url + '?splash=off#/settings/' + t); await p.waitForTimeout(600);
    await p.screenshot({ path: OUT + '11-settings-' + t + '.png' });
  }
  await p.click('a[href="#/home"]'); await p.waitForTimeout(150);
  await p.screenshot({ path: OUT + '12-midanim.png' });
  // 担当者のファイル
  await p.goto(url + '?splash=off#/home'); await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector('.folder-grid').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '16-folders.png' });
  await p.goto(url + '?splash=off#/folder/mem_aoki'); await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + '17-folder-open.png' });
  // サイドバー：子メニューを開いた状態とユーザーメニュー
  await p.goto(url + '?splash=off#/settings/formulas'); await p.waitForTimeout(600);
  if (!(await p.$('.nav-group[data-g="new"].open'))) { await p.click('[data-toggle="new"]'); await p.waitForTimeout(400); }
  await p.screenshot({ path: OUT + '14-sidebar-open.png' });
  await p.click('#user-btn'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '15-sidebar-user.png' });
  await p.click('#user-btn'); await p.waitForTimeout(200);
  // mobile
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto(url + '?splash=off#/new/edit'); await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + '13-mobile.png' });
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
