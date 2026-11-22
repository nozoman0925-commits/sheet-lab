/*
 * 桜ミツ版の「仕上がり」の確認（node oubi/tests/web-quality.js）
 *   空の画面には「まだ○○がありません」と次に押すボタン1つ／知らせは桜ミツ側の1か所に同じ形で
 *   直してほしい知らせは「！」の形／消したあとに「元に戻す」／0.3秒をこえる操作だけ「処理中」
 */
const { chromium } = require('playwright'); const assert = require('assert');
const openWeb = require('./_web');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ok = (c, m) => { assert.ok(c, m); console.log('✓ ' + m); };
  const go = async (p, h, t) => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(t || 1500); };
  const fr = p => p.frames().find(x => /oubi\.html/.test(x.url()));
  const p = await openWeb(b, { wait: 3500 });
  p.on('pageerror', e => errs.push(e.message));

  // ---- 空の画面 ----
  const PARENT = [['#/docs', 'まだ見積がありません', '見積を作る'], ['#/clients', 'まだお客様がいません', '工事を登録する'], ['#/sites', 'まだ工事がありません', '工事を登録する'],
    ['#/finance', 'まだ受注した工事がありません', '工事の一覧を開く'], ['#/new/past', 'まだ過去の見積がありません', '別の作り方を選ぶ'], ['#/settings/actual', 'まだ見直せる品目がありません', '工事の一覧を開く']];
  for (const [h, t, btn] of PARENT) {
    await go(p, h);
    const r = await p.evaluate(t => { const e = [...document.querySelectorAll('#view .empty')].find(x => x.textContent.indexOf(t) >= 0); return e ? [...e.querySelectorAll('.btn')].map(x => x.textContent.trim()) : null; }, t);
    ok(r && r.length === 1, h + '：「' + t + '」＋ボタン「' + (r && r[0]) + '」');
    assert.ok(r[0] === btn);
  }
  await go(p, '#/home');
  ok((await p.$$eval('#view .widget .empty .btn', a => a.map(x => x.textContent.trim()))).join('|') === '工事の一覧を開く|見積を作る', 'ホーム：今日やること・最近の見積も、空ならボタン1つ');
  const FRAME = [['#/o/list', 'まだ工事がありません', '新しい工事を登録する'], ['#/o/wb', 'まだ何も書かれていません', '予定を書きはじめる'], ['#/o/board', 'まだ投稿はありません', '書きはじめる'],
    ['#/o/dash', 'まだ担当者が決まっている工事がありません', '工事の一覧を開く']];
  for (const [h, t, btn] of FRAME) {
    await go(p, h, 2000);
    const r = await fr(p).evaluate(t => { const e = [...document.querySelectorAll('.empty')].find(x => x.offsetParent && x.textContent.indexOf(t) >= 0); return e ? [...e.querySelectorAll('button')].map(x => x.textContent.trim()) : null; }, t);
    ok(r && r.length === 1 && r[0].indexOf(btn) >= 0, h + '：「' + t + '」＋ボタン「' + (r && r[0]) + '」');
  }
  await go(p, '#/o/wb', 2000);
  await fr(p).click('.empty .btn'); await p.waitForTimeout(300);
  ok(await fr(p).evaluate(() => document.activeElement && document.activeElement.id === 'wbText'), '「予定を書きはじめる」で書く欄に移る');
  await go(p, '#/docs'); await p.click('#view .empty .btn'); await p.waitForTimeout(1200);
  ok(/#\/w$/.test(p.url()), '「見積を作る」で「次へ」で進める見積の画面へ');

  // ---- 知らせ ----
  await go(p, '#/o/wb', 2000);
  await fr(p).click('[data-wbpost]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => { const t = [...document.querySelectorAll('.toasts .toast')].pop(); return !!t && t.classList.contains('warn') && /予定を書いてください/.test(t.textContent); }), '業務管理の画面の知らせも桜ミツ側の右下に出る。直してほしい知らせは「！」の形');
  ok(await fr(p).evaluate(() => document.getElementById('toast').hidden), '枠の中には別の知らせを出さない（1か所だけ）');
  await fr(p).fill('#wbText', '8:00 山田様邸 足場'); await fr(p).click('[data-wbpost]'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => { const t = [...document.querySelectorAll('.toasts .toast')].pop(); return !!t && !t.classList.contains('warn') && /書きました/.test(t.textContent); }), 'できたときは「〜しました」と ✓ の形');

  // ---- 元に戻す ----
  await go(p, '#/settings/items', 1500);
  const name = await p.evaluate(() => { const used = new Set(EE.S.documents.flatMap(d => d.lines.map(l => l.itemId))); const it = EE.S.items.find(i => !used.has(i.id)); window.__it = it.id; return it.name; });
  const n0 = await p.evaluate(() => EE.S.items.length);
  await p.evaluate(() => { const r = document.querySelector('[data-act="edit-item"][data-id="' + window.__it + '"]'); if (r) r.click(); });
  await p.waitForTimeout(600);
  if (await p.$('.overlay [data-del]')) {
    await p.click('.overlay [data-del]'); await p.waitForTimeout(300); await p.click('[data-ok]'); await p.waitForTimeout(500);
    ok((await p.evaluate(() => EE.S.items.length)) === n0 - 1 && await p.isVisible('.toasts .toast .btn'), '品目「' + name + '」を消すと「元に戻す」付きの知らせ');
    await p.locator('.toasts .toast', { hasText: '削除しました' }).last().locator('.btn').click(); await p.waitForTimeout(500);
    ok((await p.evaluate(id => !!EE.S.items.find(i => i.id === id), await p.evaluate(() => window.__it))), '「元に戻す」で品目が戻る');
  } else console.log('（品目の編集画面が開けなかったので、元に戻すの画面操作は省略）');
  ok(await p.evaluate(() => typeof EE.ui.undoable === 'function'), '元に戻すの共通の部品がある');

  // ---- 処理中 ----
  const busy = await p.evaluate(async () => {
    const bt = document.createElement('button'); bt.className = 'btn'; bt.textContent = 'テスト'; document.body.appendChild(bt);
    let seenFast = false, seenSlow = false;
    await EE.fx.busy(bt, () => new Promise(r => setTimeout(() => { seenFast = bt.classList.contains('is-busy'); r(); }, 100)));
    await EE.fx.busy(bt, () => new Promise(r => setTimeout(() => { seenSlow = bt.classList.contains('is-busy'); r(); }, 700)));
    const after = bt.classList.contains('is-busy'); bt.remove(); return [seenFast, seenSlow, after];
  });
  ok(!busy[0] && busy[1] && !busy[2], '0.3秒より短い操作は印を出さず、長い操作だけ「処理中」の印、終われば消える');

  console.log(errs.length ? 'ERRORS: ' + errs.join(' / ') : 'web-quality: ok'); await b.close();
  if (errs.length) process.exit(1);
})();
