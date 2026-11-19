/*
 * 業務OS化（第1期・第2期）の確認（Playwright が必要）
 *   node easy-estimate/tests/control.js
 * メニュー（業務別・機能ライブラリで隠す）／ウィジェット式ホーム（追加・大きさ・非表示・並べ替え・色・ホームの切り替えと保存）／
 * 現場ワークスペース（タブ・お気に入り・メモ・写真）／全機能検索（Ctrl+K）／スケジュール・分析・経営
 * スクリーンショットは screenshots/os-*.png
 */
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path'); const fs = require('fs');
const signedIn = require('./_signed-in');
const BASE = 'file://' + path.join(__dirname, '..', 'index.html') + '?splash=off';
const OUT = path.join(__dirname, '..', 'screenshots') + '/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = signedIn(await b.newPage({ viewport: { width: 1440, height: 900 } }));
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const ok = (c, m) => { assert.ok(c, m); console.log('✓ ' + m); };
  const go = async h => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(700); };
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1200);

  // メニュー
  const nav = await p.$$eval('.nav-item', a => a.map(x => x.textContent.trim()));
  ok(nav.join('|') === 'ホーム|顧客|現場|見積・積算|スケジュール|経営・会計|書類|分析|設定', '左のメニューは業務別（準備中の「資材・発注」は出さない）');
  await go('#/settings/features');
  await p.uncheck('[data-nav-show="analysis"]'); await p.waitForTimeout(300);
  ok(!(await p.$('.nav-item[data-nav="analysis"]')), '機能ライブラリでメニューから隠せる');
  await p.check('[data-nav-show="analysis"]'); await p.waitForTimeout(300);
  ok(!!(await p.$('.nav-item[data-nav="analysis"]')), 'メニューに戻せる（データは消えない）');
  await p.screenshot({ path: OUT + 'os-library.png' });

  // ホーム：ウィジェット
  await go('#/home');
  await p.screenshot({ path: OUT + 'os-home.png' });
  const w0 = await p.$$eval('.widget', w => w.length);
  ok(w0 >= 8 && await p.isVisible('[data-clock]'), '最初から経営者用のホーム（時計・数字・今日やること…）');
  await p.click('.widget[data-type="kpi"] a'); await p.waitForTimeout(600);
  ok(!/#\/home/.test(p.url()), 'ウィジェットを押すと該当の画面へ移動');
  await go('#/home');
  await p.click('[data-act="w-edit"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + 'os-edit.png' });
  await p.click('[data-act="w-add"]'); await p.waitForTimeout(400);
  await p.click('.w-lib [data-add="kpi"][data-metric="overdue"]'); await p.waitForTimeout(600);
  ok((await p.$$eval('.widget', w => w.length)) === w0 + 1, 'ウィジェットを追加できる（数字：期限切れの見積）');
  const last = await p.$eval('.widget:last-child', w => w.dataset.wid);
  await p.click(`[data-wid="${last}"] [data-w="size"][data-v="m"]`); await p.waitForTimeout(400);
  ok(await p.$eval(`[data-wid="${last}"]`, w => w.classList.contains('size-m')), '大きさを変えられる');
  await p.click(`[data-wid="${last}"] [data-w="left"]`); await p.waitForTimeout(400);
  const order1 = await p.$$eval('.widget', w => w.map(x => x.dataset.wid));
  ok(order1.indexOf(last) === order1.length - 2, '‹ で前へ移動できる');
  await p.click(`[data-wid="${last}"] [data-w="hide"]`); await p.waitForTimeout(400);
  ok(await p.$eval(`[data-wid="${last}"]`, w => w.classList.contains('is-hidden')), '隠せる（編集中は薄く表示）');
  await p.click(`[data-wid="${last}"] [data-w="opts"]`); await p.waitForTimeout(400);
  await p.click('.modal [data-color="amber"]'); await p.waitForTimeout(200);
  await p.fill('.modal #wo-alpha', '40'); await p.dispatchEvent('.modal #wo-alpha', 'input'); await p.waitForTimeout(200);
  await p.click('.modal [data-s]'); await p.waitForTimeout(600);
  const style = await p.$eval(`[data-wid="${last}"]`, w => w.getAttribute('style'));
  ok(/#f59e0b/.test(style) && /0\.4/.test(style), '色と透明度を変えられる');
  // ドラッグで並べ替え
  const before = await p.$$eval('.widget', w => w.map(x => x.dataset.wid));
  await p.dragAndDrop(`[data-wid="${before[2]}"]`, `[data-wid="${before[0]}"]`); await p.waitForTimeout(600);
  const after = await p.$$eval('.widget', w => w.map(x => x.dataset.wid));
  ok(after[0] === before[2], 'ドラッグで並べ替えられる');
  await p.click('[data-act="w-done"]'); await p.waitForTimeout(500);
  ok(!(await p.$(`[data-wid="${last}"]`)), '完了すると隠したウィジェットは出ない');
  await p.reload(); await p.waitForTimeout(1200);
  ok((await p.$$eval('.widget', w => w.map(x => x.dataset.wid)))[0] === before[2], '並べ替えは保存されている');
  // ホームの切り替え・別名で保存
  await p.selectOption('#home-layout', 'site'); await p.waitForTimeout(600);
  ok(await p.$eval('#home-layout', s => s.value) === 'site' && (await p.$$eval('.widget', w => w.length)) > 0, '現場用のホームに切り替えられる');
  await p.click('[data-act="w-edit"]'); await p.waitForTimeout(400); await p.click('[data-act="w-more"]'); await p.waitForTimeout(400);
  await p.fill('#hm-name', '朝の確認'); await p.selectOption('#hm-time', 'morning'); await p.click('.modal [data-dup]'); await p.waitForTimeout(600);
  ok((await p.$$eval('#home-layout option', o => o.map(x => x.textContent))).some(t => /朝の確認/.test(t)), '名前を付けて別のホームとして保存できる');
  await p.click('[data-act="w-done"]'); await p.waitForTimeout(400);

  // 現場ワークスペース
  const pid = await p.evaluate(() => EE.S.projects[0].id);
  await go('#/site/' + pid);
  ok((await p.$$eval('.ws-tabs a', a => a.map(x => x.textContent))).join('|') === '概要|見積|写真|書類|原価|メモ・履歴', '現場を開くと6つのタブ（未実装の工程・発注・安全品質は出さない）');
  await p.screenshot({ path: OUT + 'os-workspace.png' });
  await p.click('[data-act="pin"]'); await p.waitForTimeout(500);
  await go('#/site/' + pid + '/notes');
  await p.fill('#ws-note', '駐車は前面道路不可。コインパーキングを使う'); await p.click('[data-act="add-note"]'); await p.waitForTimeout(600);
  ok(/コインパーキング/.test(await p.textContent('.timeline')), 'メモを残すと履歴に並ぶ');
  await go('#/site/' + pid + '/photos'); await p.waitForTimeout(500);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAH0lEQVR4nGP8z8BQz0AEYBxVSF+FjOMKRxWOKiSgEAAzrB8P+wnQSQAAAABJRU5ErkJggg==', 'base64');
  await p.setInputFiles('#ph-file', { name: 'test.png', mimeType: 'image/png', buffer: png }); await p.waitForTimeout(1500);
  ok((await p.$$eval('#ph-grid .photo', f => f.length)) === 1, '写真を追加すると一覧に出る（施工前）');
  await p.screenshot({ path: OUT + 'os-photos.png' });
  await go('#/site/' + pid + '/cost');
  ok(/粗利率/.test(await p.textContent('.ws-body')), '原価タブに内訳と粗利');
  await go('#/home');
  await p.selectOption('#home-layout', 'site'); await p.waitForTimeout(600);
  ok(/サンプルハイツ|山田|みどり/.test(await p.textContent('.widget[data-type="favorites"]')), '☆を押した現場がホームの「お気に入りの現場」に出る');

  // 全機能検索
  await p.keyboard.press('Control+k'); await p.waitForTimeout(400);
  ok(await p.isVisible('#pal-q'), 'Ctrl+K で全機能検索が開く');
  await p.keyboard.type('未入金'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + 'os-palette.png' });
  await p.keyboard.press('Enter'); await p.waitForTimeout(700);
  ok(/#\/finance/.test(p.url()), '「未入金」で経営・会計へ直接移動');
  await p.keyboard.press('Control+k'); await p.waitForTimeout(300); await p.keyboard.type('山田'); await p.waitForTimeout(300);
  ok((await p.$$eval('.pal-group', g => g.map(x => x.textContent))).some(t => /顧客|現場|書類/.test(t)), '顧客・現場・書類も探せる');
  await p.fill('#pal-q', '発注書'); await p.waitForTimeout(300);
  ok(/準備中/.test(await p.textContent('.pal-item.on')), '準備中の機能は「準備中（第N期）」と出る');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  // スケジュール・分析・経営
  await go('#/schedule'); await p.screenshot({ path: OUT + 'os-schedule.png' });
  ok((await p.$$eval('.cal-cell:not(.out)', c => c.length)) >= 28, 'スケジュールに月のカレンダー');
  await p.click('[data-mv="1"]'); await p.waitForTimeout(500);
  ok(/年/.test(await p.textContent('.panel-h h2')), '次の月へ移れる');
  await go('#/analysis'); await p.screenshot({ path: OUT + 'os-analysis.png' });
  ok((await p.$$eval('.heat-cell', c => c.length)) > 0 && /受注率/.test(await p.textContent('#view')), '分析：ヒートマップと受注率');
  await go('#/finance'); await p.screenshot({ path: OUT + 'os-finance.png' });
  ok((await p.$$eval('#bars .viz-group', g => g.length)) > 0, '経営・会計：月別の比較');
  await go('#/sites'); await p.screenshot({ path: OUT + 'os-sites.png' });
  ok((await p.$$eval('.site-list tbody tr', r => r.length)) > 0, '現場一覧（現場名・担当・状態・次の期限）');

  // スマホ幅
  await p.setViewportSize({ width: 390, height: 844 }); await go('#/home'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), 'スマホ幅でも横にはみ出さない');
  await p.screenshot({ path: OUT + 'os-mobile.png' });

  console.log(errs.length ? 'ERRORS: ' + errs.join(' / ') : 'control: ok'); await b.close();
  if (errs.length) process.exit(1);
})();
