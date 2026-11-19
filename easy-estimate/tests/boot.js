/*
 * 起動シーケンスの確認（Playwright が必要）
 *   node easy-estimate/tests/boot.js
 * - 各時点のスクリーンショットを screenshots/boot-*.png に保存
 * - 着地の瞬間のロゴ（複製）とサイドバーのロゴの位置・大きさが一致するか
 * - クリック・キーでスキップできるか、移動中に操作できるか、画面遷移では出ないか
 */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs'); const assert = require('assert');
const OUT = path.join(__dirname, '..', 'screenshots') + '/'; fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.join(__dirname, '..', 'index.html') + '#/home';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  require('./_signed-in')(p);   // サインイン済みの状態で開く
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { window.__t0 = performance.now(); });
  await p.goto(URL);
  for (const [t, name] of [[120, 'a-start'], [700, 'b-logo'], [1300, 'c-move'], [2400, 'd-done']]) {
    await p.evaluate(t => new Promise(r => { const w = () => { if (performance.now() - __t0 >= t) r(); else requestAnimationFrame(w); }; w(); }), t);
    await p.screenshot({ path: OUT + 'boot-' + name + '.png' });
  }
  assert.ok(!(await p.$('.boot')), '終了後にオーバーレイが残っていない');

  await p.reload(); await p.waitForTimeout(50);
  const land = await p.evaluate(() => new Promise(r => {
    const fl = document.querySelectorAll('.boot-fly');
    document.getAnimations().filter(a => a.effect.target && a.effect.target.classList.contains('boot-fly')).forEach(a => { a.pause(); a.currentTime = 1619.9; });
    requestAnimationFrame(() => { const rr = e => { const q = e.getBoundingClientRect(); return [q.x, q.y, q.width, q.height].map(v => Math.round(v * 10) / 10); };
      r([rr(fl[0]), rr(document.querySelector('#brand-crest svg')), rr(fl[1]), rr(document.querySelector('.brand .brand-text'))]); });
  }));
  console.log('着地（家紋）', land[0], '本物', land[1]); console.log('着地（文字）', land[2], '本物', land[3]);
  land[0].forEach((v, i) => assert.ok(Math.abs(v - land[1][i]) < 0.6)); land[2].forEach((v, i) => assert.ok(Math.abs(v - land[3][i]) < 0.6));
  assert.ok(land[1][0] >= 20 && land[1][0] <= 24 && land[1][1] >= 18 && land[1][1] <= 24 && land[1][2] >= 32 && land[1][2] <= 36, '定位置：左20〜24・上18〜24・32〜36px');

  await p.reload(); await p.waitForTimeout(300); await p.keyboard.press('Space'); await p.waitForTimeout(30);
  assert.ok(!(await p.$('.boot')), 'キーでスキップ');
  await p.reload(); await p.waitForTimeout(300); await p.mouse.click(700, 400); await p.waitForTimeout(30);
  assert.ok(!(await p.$('.boot')), 'クリックでスキップ');
  await p.reload(); await p.waitForTimeout(1300); await p.click('a[href="#/docs"].nav-item'); await p.waitForTimeout(500);
  assert.ok(p.url().endsWith('#/docs'), '移動中でもメニューを押せる');
  await p.waitForTimeout(1200); await p.click('a[href="#/home"].nav-item'); await p.waitForTimeout(80);
  assert.ok(!(await p.$('.boot')), '画面遷移では出ない');
  // 狭い画面・サインイン前：サイドバーは隠れているので、ロゴはログインカード上部に着地する（消えない）
  const n = await b.newPage({ viewport: { width: 700, height: 860 } });
  n.on('pageerror', e => errs.push(e.message));
  await n.goto(URL); await n.waitForTimeout(50);
  const nl = await n.evaluate(() => new Promise(r => {
    document.getAnimations().filter(a => a.effect.target && a.effect.target.classList && a.effect.target.classList.contains('boot-fly')).forEach(a => { a.pause(); a.currentTime = 1619.9; });
    requestAnimationFrame(() => { const rr = e => { const q = e.getBoundingClientRect(); return [q.x, q.y, q.width].map(Math.round); };
      const fl = document.querySelectorAll('.boot-fly');
      r([rr(fl[0]), rr(document.querySelector('.auth-brand svg')), getComputedStyle(fl[0]).opacity, rr(fl[1]), rr(document.querySelector('.auth-brand .brand-text'))]); });
  }));
  console.log('狭い画面の着地', nl);
  assert.deepStrictEqual(nl[0], nl[1], '家紋がログインカードのロゴ位置に着地'); assert.deepStrictEqual(nl[3], nl[4], '文字も着地'); assert.strictEqual(nl[2], '1');
  await n.waitForTimeout(1800); await n.screenshot({ path: OUT + 'boot-e-narrow-login.png' });
  assert.ok(!(await n.$('.boot')) && await n.isVisible('.auth-brand svg'), '着地後もロゴが残る');

  console.log(errs.length ? 'ERRORS: ' + errs.join(' / ') : 'boot: ok'); await b.close();
  if (errs.length) process.exit(1);
})();
