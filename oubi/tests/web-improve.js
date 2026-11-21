/*
 * 桜ミツ版の改善の確認（node oubi/tests/web-improve.js）
 *   スマホの下のボタン／ホームは標準1型／見積の入口は1つ／期限が近い見積・入金待ち → 今日やること・営業の再訪問
 *   バックアップの知らせ／実績から原価を見直す／お客様向けの比較表
 */
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path'); const fs = require('fs');
const openWeb = require('./_web');
const OUT = path.join(__dirname, '..', 'screenshots') + '/';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ok = (c, m) => { assert.ok(c, m); console.log('✓ ' + m); };
  const watch = p => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); }); };
  const go = async (p, h, t) => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(t || 1500); };
  const O = 'OUBI_LINK.frame().contentWindow.OUBI';
  const today = new Date().toISOString().slice(0, 10), add = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

  // ---- スマホの下のボタン ----
  let p = await openWeb(b, { viewport: { width: 390, height: 844 }, wait: 3500 }); watch(p);
  ok(!(await p.isVisible('.sidebar')) && await p.isVisible('#mnav'), 'スマホでは左の列をしまい、下にボタン');
  ok((await p.$$eval('#mnav > a, #mnav > button', a => a.map(x => x.textContent.trim()))).join('|') === 'ホーム|営業|工事|見積|予定|その他', '下のボタンは ホーム・営業・工事・見積・予定・その他');
  await p.click('#mnav [data-mnav="sites"]'); await p.waitForTimeout(1800);
  ok(/#\/o\/list/.test(p.url()) && await p.$eval('#mnav [data-mnav="sites"]', a => a.classList.contains('on')), '「工事」を押すと工事の一覧、下のボタンも「工事」が光る');
  await p.click('#mnav [data-mnav="more"]'); await p.waitForTimeout(300);
  ok(await p.isVisible('#mnav-more') && /経営/.test(await p.textContent('#mnav-more')), '「その他」で経営・設定・自分の名前・検索');
  await p.click('#mnav-more a[href="#/finance"]'); await p.waitForTimeout(1500);
  ok(/#\/finance/.test(p.url()), '「その他 → 経営」で経営へ');
  await go(p, '#/o/sales', 2000);
  ok(!(await p.isVisible('#mnav')), '営業の画面は、営業専用の下のボタンを使う（桜ミツの下のボタンは隠す）');
  await go(p, '#/home', 1500); await p.screenshot({ path: OUT + 'web-mobile-home.png' });
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'スマホのホームで横にはみ出さない');
  await p.close();

  // ---- ホーム・見積の入口 ----
  p = await openWeb(b, { wait: 3500 }); watch(p);
  ok(!(await p.$('#home-layout')) && await p.isVisible('[data-act="w-edit"]'), 'ホームは標準の1型（型の切り替えは出さない）。並べ替え・追加は控えめなボタン');
  ok(/営業に出る/.test(await p.textContent('.launch')) && (await p.$$eval('#view .widget', w => w.map(x => x.dataset.type))).slice(0, 2).join(',') === 'clock,today', '標準のホーム：上に大きなボタン（営業に出る など）、その下に時計・今日のボード');
  ok((await p.$$eval('.nav-item[data-nav="estimate"] ~ .nav-sub a, .nav-group[data-key="estimate"] .nav-child', a => a.map(x => x.textContent.trim()))).join('|').indexOf('かんたん作成') < 0, '見積の子メニューに作り方を並べない（入口は「＋ 見積を作る」の1つ）');
  await go(p, '#/new', 1500);
  ok((await p.textContent('#title')) === '見積を作る' && (await p.$$('#view .quick-card')).length >= 7, '「見積を作る」の中で作り方を選ぶ');

  // ---- 期限が近い見積・入金待ち → 今日やること・営業の再訪問 ----
  await p.evaluate(([o, t3]) => {
    const x = eval(o);
    const c = x.makeCase({ customer: '山田 太郎', tel: '090-1111-2222', addr: '町田市森野1-1-1' }); c.work.title = '山田様邸 外壁'; x.touch(c);
    const c2 = x.makeCase({ customer: '佐藤 花子', addr: '町田市原町田2-2' }); c2.work.title = '佐藤様邸 屋根'; c2.result = { status: 'won', wonDate: t3 }; c2.invoice = { files: [], date: t3 }; x.touch(c2);
    window.__c = c.id; window.__c2 = c2.id;
  }, [O, today]); await p.waitForTimeout(1500);
  await p.evaluate(([cid, vu]) => { const s = EE.S, d = EE.data.newEstimate(s, { projectId: cid, customerId: 'cus_' + cid, title: '山田様邸 外壁' }); d.validUntil = vu; s.documents.push(d); EE.ui.commit(); }, [await p.evaluate(() => window.__c), add(3)]);
  await p.waitForTimeout(3500);
  await go(p, '#/home', 1500);
  const todo = await p.textContent('.widget[data-type="todo"]');
  ok(/見積の期限まで あと 3 日/.test(todo), '期限が近い見積が「今日やること」に出る');
  ok(/入金待ち/.test(todo), '入金待ちの工事も「今日やること」に出る');
  const rv = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('oubi.ldb.visits') || '{}')).filter(v => v.auto));
  ok(rv.some(v => v.auto === 'quote' && /見積の期限が近い/.test(v.memo)) && rv.some(v => v.auto === 'pay'), '営業の再訪問の一覧にも自動で入る（見積の返事・入金の確認）');
  await go(p, '#/o/sales/rv', 2000);
  const f = p.frames().find(x => /oubi\.html/.test(x.url()));
  ok(/山田/.test(await f.textContent('body')), '営業の「再訪問」の画面に出る');

  // ---- バックアップの知らせ ----
  await go(p, '#/home', 1500);
  ok(/まだ一度もバックアップしていません/.test(await p.textContent('#view')), '記録があってバックアップが無いと、ホームの上に知らせ');
  await go(p, '#/settings/data', 1500);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-bk="save"]')]); await dl.path();
  await go(p, '#/home', 1500);
  ok(!/まだ一度もバックアップしていません/.test(await p.textContent('#view')), 'バックアップすると知らせが消える');

  // ---- 実績から原価を見直す ----
  const itemId = await p.evaluate(() => EE.S.items.find(i => i.unitCost > 0 && i.costType === 'material').id);
  const before = await p.evaluate(id => EE.S.items.find(i => i.id === id).unitCost, itemId);
  await p.evaluate(([o, id, past]) => {
    const x = eval(o), it = EE.S.items.find(i => i.id === id);
    const c = x.makeCase({ customer: '鈴木 一郎' }); c.work.title = '鈴木様邸 完工'; x.touch(c);
    const d = EE.data.newEstimate(EE.S, { projectId: c.id, customerId: 'cus_' + c.id, title: '鈴木様邸' }); const ln = EE.data.lineFromItem(it, 10); d.lines.push(ln); EE.S.documents.push(d); EE.ui.commit();
    window.__c3 = c.id; window.__d3 = d.id; window.__plan = it.unitCost * 10;
  }, [O, itemId, add(-10)]); await p.waitForTimeout(2500);
  await p.evaluate(([o, past]) => { const x = eval(o), c = x.cases().find(k => k.id === window.__c3); c.result = { status: 'won', wonDate: past }; c.schedule = { start: past, end: past, steps: [], prep: {}, changes: [] }; c.actual = { material: Math.round(window.__plan * 1.2) }; x.touch(c); }, [O, add(-10)]);
  await p.waitForTimeout(2500);
  await go(p, '#/settings/actual', 1800);
  ok(/実績から原価を見直す/.test(await p.textContent('#view')) && (await p.$$('[data-act-pick]')).length >= 1, '設定の品目に「実績から原価を見直す」（完工した工事の実際の原価から）');
  await p.click('[data-act-apply]'); await p.waitForTimeout(1200);
  const after = await p.evaluate(id => EE.S.items.find(i => i.id === id), itemId);
  ok(after.unitCost === Math.round(before * 1.2) && after.costHistory && after.costHistory.length === 1, '反映すると品目の原価が実績にそろう（' + before + ' → ' + after.unitCost + '円、前の原価は履歴に）');

  // ---- お客様向けの比較表 ----
  const cid = await p.evaluate(() => window.__c);
  await p.evaluate(cid => { const s = EE.S, base = s.documents.find(d => d.projectId === cid); base.patternLabel = '松'; base.lines.push(EE.data.lineFromItem(s.items[0], 10)); const d2 = JSON.parse(JSON.stringify(base)); d2.id = EE.data.uid('doc'); d2.no = ''; d2.patternLabel = '竹'; d2.lines = [EE.data.lineFromItem(s.items[1], 5)]; s.documents.push(d2); EE.ui.commit(); }, cid);
  await p.waitForTimeout(1500);
  const did = await p.evaluate(cid => EE.S.documents.find(d => d.projectId === cid && d.patternLabel === '松').id, cid);
  await go(p, '#/edit/' + did, 2000);
  await p.click('.ed-pane [data-pane="header"]'); await p.waitForTimeout(300);   // 比較表は「宛先・日付・条件」のタブの「この工事の見積」の横
  ok(await p.isVisible('[data-act="cmp-sheet"]'), '見積の画面に「お客様向けの比較表」（同じ工事に別案があるとき）');
  await p.click('[data-act="cmp-sheet"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => { const t = document.querySelector('.overlay .cmp-sheet'); return !!t && /松/.test(t.textContent) && /竹/.test(t.textContent) && /お支払い総額/.test(t.textContent); }), '比較表に松・竹の案と金額が並ぶ');
  await p.screenshot({ path: OUT + 'web-compare.png' });
  await p.keyboard.press('Escape');
  await go(p, '#/o/case/' + cid + '/quote', 2000);
  const f2 = p.frames().find(x => /oubi\.html/.test(x.url()));
  ok(!!(await f2.$('[data-mcompare]')), '工事の「見積と利益」からも比較表を開ける');
  await p.close();

  console.log(errs.length ? 'ERRORS: ' + errs.join(' / ') : 'web-improve: ok'); await b.close();
  if (errs.length) process.exit(1);
})();
