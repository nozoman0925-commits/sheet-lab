/*
 * 桜ミツ版（桜ミツの構成のまま業務管理の機能を入れたもの・この端末だけ）の確認
 *   node oubi/tools/build-web.js .web-test   （リポジトリの最上位に作る）
 *   python3 -m http.server 8765 --bind 127.0.0.1
 *   node oubi/tests/web.js
 */
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path'); const fs = require('fs');
const openWeb = require('./_web');
const OUT = path.join(__dirname, '..', 'screenshots') + '/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ok = (c, m) => { assert.ok(c, m); console.log('✓ ' + m); };
  const watch = p => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); }); };
  const go = async (p, h, t) => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(t || 1500); };
  const F = p => p.frames().find(f => /oubi\.html/.test(f.url()));

  // ---- 構成は桜ミツのまま ----
  let p = await openWeb(b, { wait: 3500 }); watch(p);
  const nav = await p.$$eval('.nav-item', a => a.map(x => x.textContent.trim()));
  ok(nav.join('|') === 'ホーム|工事|見積|予定|経営|設定', '左のメニューは6つ（営業はない）');
  ok((await p.$$eval('#view .widget', w => w.length)) === 6 && (await p.$$('#view .widget[data-type="kpi"]')).length === 3, 'ホームは桜ミツのウィジェット式（はじめは6つ：数字3つ・今日のボード・今日やること・最近の見積）');
  await p.screenshot({ path: OUT + 'web-home.png' });

  // ---- 工事（業務管理）→ 顧客（桜ミツ）に出る ----
  await go(p, '#/o/list', 2000);
  ok(await p.evaluate(() => document.body.classList.contains('ob-on') && !!document.getElementById('ob-frame').contentWindow.OUBI), '「工事」で工事の一覧（業務管理の画面）が桜ミツの中に開く');
  await p.evaluate(() => { const o = OUBI_LINK.frame().contentWindow.OUBI; const c = o.makeCase({ customer: '山田 太郎', tel: '090-1111-2222', addr: '東京都町田市森野1-1-1' }); c.work.title = '山田様邸 外壁塗装工事'; c.quote.items = [{ name: '外壁塗装（シリコン）', qty: 100, unit: '㎡', price: 2500 }]; o.touch(c); });
  await p.waitForTimeout(1500);
  await go(p, '#/clients', 1500);
  ok(/山田 太郎/.test(await p.textContent('#view')), '業務管理で登録した工事のお客様が、桜ミツの「顧客」に出る');

  // ---- 工事の「見積と利益」→ 桜ミツの見積 → 工事へ戻る ----
  const cid = await p.evaluate(() => OUBI_LINK.frame().contentWindow.OUBI.cases()[0].id);
  await go(p, '#/o/case/' + cid + '/quote', 2000);
  let f = F(p);
  await f.click('[data-mnew]'); await p.waitForTimeout(2000);
  ok(/^#\/edit\//.test(await p.evaluate(() => location.hash)) && !(await p.evaluate(() => document.body.classList.contains('ob-on'))), '工事の「見積を作る」で桜ミツの見積の画面が開く（前の明細を読み込む）');
  const q = await p.$('[data-line] input.qty'); await q.fill('120'); await q.press('Tab'); await p.click('#btn-save'); await p.waitForTimeout(1500);
  const quote = await p.evaluate(id => OUBI_LINK.frame().contentWindow.OUBI.cases().find(c => c.id === id).quote, cid);
  ok(quote.amount === 300000 && quote.mitsuDocId, '保存すると工事の見積金額に入る（120㎡ → 300,000円）');
  await go(p, '#/o/case/' + cid + '/quote', 2000); f = F(p);
  ok((await f.$$('.mq-row')).length === 1, '工事の画面に戻ると、その見積が並ぶ');
  await p.screenshot({ path: OUT + 'web-case.png' });

  // ---- 地図は新しいタブで開き、枠は業務管理のまま ----
  const pop = p.context().waitForEvent('page', { timeout: 5000 }).catch(() => null);
  await f.click('text=地図'); const np = await pop; await p.waitForTimeout(800);
  ok(!!np && /oubi\.html/.test(F(p).url()), '「地図」は新しいタブで開き、桜ミツの中の画面はそのまま');
  if (np) await np.close();
  // ---- 写真（この端末に保存） ----
  await go(p, '#/o/case/' + cid + '/work', 2000); f = F(p);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAH0lEQVR4nGP8z8BQz0AEYBxVSF+FjOMKRxWOKiSgEAAzrB8P+wnQSQAAAABJRU5ErkJggg==', 'base64');
  const fi = await f.$('input[type=file][accept^="image"]');
  if (fi) {
    await fi.setInputFiles({ name: 'genba.png', mimeType: 'image/png', buffer: png }); await p.waitForTimeout(2500);
    ok(await f.evaluate(() => [...document.querySelectorAll('img')].some(i => /^blob:/.test(i.src))), '工事の写真をこの端末に保存して表示できる');
  } else console.log('（写真の入力欄が見つからない：省略）');

  // ---- メニュー・ウィジェット・検索 ----
  for (const [h, t] of [['#/o/cal', 'カレンダー'], ['#/o/wb', 'あしたの予定']]) { await go(p, h, 1800); ok((await p.textContent('#title')) === t, h + ' で「' + t + '」'); }
  await p.screenshot({ path: OUT + 'web-wb.png' });
  await go(p, '#/home', 1500);
  await p.click('[data-act="w-edit"]'); await p.waitForTimeout(400); await p.click('[data-act="w-add"]'); await p.waitForTimeout(400);
  ok(!!(await p.$('.w-lib [data-add="today"]')) && !(await p.$('.w-lib [data-add="salesgo"]')), 'ウィジェットの一覧に「今日のボード」があり、「営業に出る」はない');
  await p.click('.w-lib [data-add="today"]'); await p.waitForTimeout(500); await p.click('[data-act="w-done"]'); await p.waitForTimeout(500);
  ok(/現地調査/.test(await p.textContent('.widget[data-type="today"]')), '今日のボードのウィジェットに工事・現地調査・予定の数');
  ok(!/再訪問/.test(await p.textContent('.widget[data-type="today"]')), '今日のボードに再訪問は出ない');
  await p.keyboard.press('Control+k'); await p.waitForTimeout(300); await p.keyboard.type('ホワイトボード'); await p.waitForTimeout(300);
  await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  ok(/#\/o\/wb/.test(p.url()), '全機能検索（Ctrl+K）で業務管理の機能へ');

  // ---- 再読み込みしても残る ----
  await p.goto(openWeb.BASE + '?splash=off#/home'); await p.waitForTimeout(3500);
  ok(await p.evaluate(() => EE.S.documents.length === 1 && OUBI_LINK.frame().contentWindow.OUBI.cases().length === 1), '再読み込みしても工事と見積が残る');

  // ---- バックアップ → 消す → 戻す ----
  await go(p, '#/settings/data', 1500);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-bk="save"]')]);
  const file = await dl.path(); const bk = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok(bk.app === 'oumitsu' && Object.keys(bk.localStorage).some(k => /^oubi\.ldb\.cases/.test(k)) && bk.files.length >= (fi ? 1 : 0), 'バックアップに工事・見積・写真が入る');
  await p.evaluate(() => { Object.keys(localStorage).filter(k => /^oubi\./.test(k)).forEach(k => localStorage.removeItem(k)); });
  await p.reload(); await p.waitForTimeout(3500);
  ok(await p.evaluate(() => OUBI_LINK.frame().contentWindow.OUBI.cases().length === 0), '（記録を消した状態）');
  await go(p, '#/settings/data', 1500);
  await p.setInputFiles('[data-bk="load"]', file); await p.waitForTimeout(500);
  await p.click('.overlay [data-ok], .overlay .btn.danger, .overlay .btn.primary').catch(() => {}); await p.waitForTimeout(4500);
  ok(await p.evaluate(() => OUBI_LINK.frame().contentWindow.OUBI.cases().length === 1 && EE.S.documents.length === 1), 'バックアップから戻すと工事・見積が戻る');
  await p.close();

  // ---- 前の桜ミツのデータを引き継ぐ ----
  p = await openWeb(b, { old: true, wait: 4500 }); watch(p);
  const mg = await p.evaluate(() => { const cs = OUBI_LINK.frame().contentWindow.OUBI.cases(); return { cases: cs.length, docs: EE.S.documents.length, orphan: EE.S.documents.filter(d => !cs.some(c => c.id === d.projectId)).length, cust: EE.S.customers.length }; });
  ok(mg.cases === 10 && mg.docs === 12 && mg.orphan === 0 && mg.cust === 3, '前の桜ミツの見積12通・顧客3・案件10を、工事10件として引き継ぐ（見積はすべて工事に結び付く）');
  await p.close();

  // ---- スマホ幅 ----
  p = await openWeb(b, { viewport: { width: 390, height: 844 }, wait: 3500 }); watch(p);
  for (const h of ['#/home', '#/o/list', '#/o/cal', '#/o/wb']) {
    await go(p, h, 1800);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'スマホ幅で横にはみ出さない ' + h);
  }
  await go(p, '#/home', 1500); await p.screenshot({ path: OUT + 'web-mobile-home.png' });

  console.log(errs.length ? 'ERRORS: ' + errs.join(' / ') : 'web: ok'); await b.close();
  if (errs.length) process.exit(1);
})();
