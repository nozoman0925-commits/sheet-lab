/*
 * サインイン ⇔ 新規登録の確認（Playwright が必要）
 *   node easy-estimate/tests/login.js
 * 入力チェック・エラー表示・送信（この端末内の仮認証）・切り替え時の引き継ぎとフォーカス・
 * 覆った瞬間の入れ替え・カードの高さが変わらないこと・サインアウト・狭い画面・視差効果を減らす設定。
 * スクリーンショットは screenshots/login-*.png
 */
const { chromium } = require('playwright'); const assert = require('assert');
const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, '..', 'screenshots') + '/'; fs.mkdirSync(OUT, { recursive: true });
const BASE = 'file://' + path.join(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const ok = (c, m) => { assert.ok(c, m); console.log('✓ ' + m); };

  // 起動シーケンス → ログイン画面（初回は新規登録から）
  await p.goto(BASE + '#/home'); await p.waitForTimeout(2300);
  await p.screenshot({ path: OUT + 'login-1-after-boot.png' });
  ok(await p.isVisible('#f-signup'), '起動後、アカウントが無ければ新規登録が出る');
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.main')).visibility === 'hidden'), 'サインイン前は業務画面を出さない');
  ok(await p.evaluate(() => document.activeElement.id === 'a-signup-name'), '最初の入力欄にフォーカス');
  const h = () => p.evaluate(() => { const r = document.getElementById('auth-card').getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => Math.round(v * 10) / 10).join(','); });
  const geo = await h();

  await p.click('#f-signup .auth-submit'); await p.waitForTimeout(350);
  ok((await p.$$eval('#f-signup .auth-err', e => e.filter(x => x.textContent).length)) === 4, '空で送信すると4項目にエラー');
  await p.screenshot({ path: OUT + 'login-2-errors.png' });
  await p.fill('#a-signup-name', '青木 誠'); await p.fill('#a-signup-email', 'aoki@example'); await p.click('#f-signup .auth-submit'); await p.waitForTimeout(300);
  ok(/形式/.test(await p.textContent('#a-signup-email-err')), 'メールの形式チェック');
  await p.fill('#a-signup-email', 'aoki@example.com'); await p.fill('#a-signup-password', 'short');
  ok(/8文字/.test(await p.textContent('#a-signup-password-err')), '入力中にもパスワードの長さチェック（送信を試した後）');
  await p.fill('#a-signup-password', 'secret12');

  // 切り替え：覆った瞬間に入れ替わる
  const cover = p.evaluate(() => new Promise(r => {
    const blade = document.getElementById('auth-blade'), card = document.getElementById('auth-card');
    const t0 = performance.now(), log = [];
    (function f() { const br = blade.getBoundingClientRect(), tr = blade.parentNode.getBoundingClientRect();
      log.push({ t: Math.round(performance.now() - t0), cover: Math.abs(br.left - tr.left) < 1 && Math.abs(br.right - tr.right) < 1, signin: !document.getElementById('f-signin').hidden });
      if (performance.now() - t0 < 900) requestAnimationFrame(f); else r(log); })();
  }));
  await p.click('.blade-r [data-go=signin]');
  const log = await cover;
  const firstSignin = log.find(x => x.signin);
  console.log('  frames', JSON.stringify(log.map(x => x.t + (x.cover ? 'C' : '') + (x.signin ? 'S' : '')).join(' ')));
  ok(firstSignin && firstSignin.cover, 'フォームが入れ替わる最初のフレームで、ブレードがカード全体を覆っている');
  ok(await p.isVisible('#f-signin'), 'サインインに切り替わる');
  ok((await p.inputValue('#a-signin-email')) === 'aoki@example.com' && (await p.inputValue('#a-signin-password')) === 'secret12', 'メール・パスワードを引き継ぐ');
  ok(await p.evaluate(() => document.activeElement.id === 'a-signin-email'), '切り替え後は新しいフォームの最初の入力欄にフォーカス');
  ok((await h()) === geo, 'カードの位置・大きさは2つの状態で同じ（入れ替えが見えない）');
  await p.screenshot({ path: OUT + 'login-3-signin.png' });

  await p.click('#f-signin .auth-submit'); await p.waitForTimeout(1500);
  ok(/違います/.test(await p.textContent('#f-signin .auth-alert')), '登録前のサインインは失敗する');
  await p.click('.blade-l [data-go=signup]'); await p.waitForTimeout(800);
  ok((await p.inputValue('#a-signup-name')) === '青木 誠', '新規登録に戻ると名前が残っている');
  await p.fill('#a-signup-password', 'secret12'); await p.fill('#a-signup-password2', 'secret13'); await p.click('#f-signup .auth-submit'); await p.waitForTimeout(300);
  ok(/一致しません/.test(await p.textContent('#a-signup-password2-err')), '確認用パスワードの不一致');
  await p.fill('#a-signup-password2', 'secret12'); await p.click('#f-signup .auth-submit'); await p.waitForTimeout(2500);
  ok(!(await p.$('#auth')) && (await p.textContent('#side-user .who b')) === '青木 誠', '登録するとホームが開き、担当者「青木 誠」として使える');
  await p.screenshot({ path: OUT + 'login-4-home.png' });
  const st = await p.evaluate(() => localStorage.getItem('oumitsu:auth:v1'));
  ok(!st.includes('secret12') && /"hash"/.test(st), 'パスワードそのものは保存しない（PBKDF2 の値だけ）');

  await p.reload(); await p.waitForTimeout(2500);
  ok(!(await p.$('#auth')), '同じタブでのリロードはサインインのまま');
  await p.click('#user-btn'); await p.waitForTimeout(250); await p.click('[data-u=signout]'); await p.waitForTimeout(2500);
  ok(await p.isVisible('#f-signin'), 'サインアウトするとサインイン画面');
  await p.fill('#a-signin-email', 'AOKI@example.com '); await p.fill('#a-signin-password', 'secret12'); await p.keyboard.press('Enter'); await p.waitForTimeout(2200);
  ok(!(await p.$('#auth')), 'Enter で送信してサインインできる（メールの大文字・空白は無視）');
  const p2 = await ctx.newPage(); await p2.goto(BASE + '?splash=off#/home'); await p2.waitForTimeout(800);
  ok(await p2.isVisible('#f-signin'), '新しく開いたとき（起動のたび）はサインインから');

  await p2.setViewportSize({ width: 390, height: 844 }); await p2.waitForTimeout(300);
  await p2.screenshot({ path: OUT + 'login-5-mobile.png' });
  await p2.click('#f-signin [data-go=signup]'); await p2.waitForTimeout(800);
  ok(await p2.isVisible('#f-signup'), '狭い画面でも切り替えられる');

  const c3 = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const p3 = await c3.newPage();
  await p3.goto(BASE + '?splash=off#/home'); await p3.waitForTimeout(500); await p3.click('.blade-r [data-go=signin]');
  ok(await p3.isVisible('#f-signin') && !(await p3.evaluate(() => document.getElementById('auth-blade').getAnimations().length)), '視差効果を減らす設定ではアニメーションなしで即切り替え');

  console.log(errs.length ? 'ERRORS: ' + errs.join(' / ') : 'login: ok'); await b.close();
  if (errs.length) process.exit(1);
})();
