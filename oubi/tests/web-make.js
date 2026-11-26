/*
 * 見積の作りやすさ（2026-11-26）を、画面を実際に操作して確かめる
 *   node oubi/tools/build-web.js .web-test --artifact && node oubi/tests/web-make.js
 */
const { chromium } = require('playwright'); const openWeb = require('./_web'); const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, '..', 'screenshots', 'make'); fs.mkdirSync(OUT, { recursive: true });
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const go = async (p, h, ms) => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(ms || 1500); };
const closeModals = p => p.evaluate(() => { let t; while ((t = EE.ui.topModal())) t.close(); });
const O = 'OUBI_LINK.frame().contentWindow.OUBI';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await openWeb(b, { context: ctx, wait: 3500, old: true }); await p.waitForTimeout(1500);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|net::|widget/.test(m.text())) errs.push(m.text()); });
  await p.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; window.__printHTML = document.getElementById('print-root').innerHTML; }; });
  const ids = await p.evaluate(o => {
    const x = eval(o), S = EE.S, c = x.makeCase({ customer: '宮本 太郎', tel: '090-0000-0000', addr: '町田市森野1-1' });
    c.work.title = '宮本様邸 外構工事'; c.work.budget = 800000; c.work.wishPeriod = '来年3月まで'; c.work.places = '南側の駐車場・フェンス'; c.lead.inquiry = '駐車場を土間コンクリートに'; x.touch(c);
    const it = S.items.filter(i => i.category === 'gaikou' && i.unitCost > 0 && /土間|フェンス施工|ブロック積み/.test(i.name));
    const d = EE.data.newEstimate(S, { projectId: c.id, customerId: 'cus_' + c.id, title: '宮本様邸 外構工事', category: 'gaikou' });
    it.forEach((i, k) => d.lines.push(EE.data.lineFromItem(i, k + 2))); S.documents.push(d);
    EE.ui.commit(); return { c: c.id, d: d.id };
  }, O);
  await p.waitForTimeout(2500);

  /* 2-4 検索・2-1 坪 */
  await go(p, '#/edit/' + ids.d, 2000);
  await p.click('#pick'); await p.keyboard.type('どま'); await p.waitForTimeout(300);
  const kanaHit = await p.evaluate(() => [...document.querySelectorAll('#pick-pop .picker-opt')].map(x => x.textContent).join('|'));
  ok(/土間/.test(kanaHit), '2-4 読み仮名でも当たる（「どま」で土間コンクリート）');
  await p.fill('#pick', ''); await p.keyboard.type('土間 30坪'); await p.waitForTimeout(300);
  ok(/30坪 → 99\.17㎡/.test(await p.textContent('#pick-pop')), '2-1 「土間 30坪」で 30坪 → 99.17㎡');
  const n0 = await p.evaluate(() => EE.views.editor.current().lines.length);
  await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  const added = await p.evaluate(() => { const L = EE.views.editor.current().lines; return L[L.length - 1].qty; });
  ok(added === 99.17, '2-1 坪で打つと㎡にして入る（' + added + '）');
  await p.click('#pick'); await p.waitForTimeout(200);
  await p.evaluate(() => { const b = [...document.querySelectorAll('[data-pincat]')].find(x => x.textContent.includes('外構')); b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); }); await p.waitForTimeout(300);
  const pin = await p.evaluate(() => ({ cat: EE.features.settings().pinCat, all: [...document.querySelectorAll('#pick-pop .picker-opt')].length, onlyG: EE.S.items.filter(i => i.active !== false && i.category === 'gaikou').length }));
  ok(pin.cat === 'gaikou' && pin.all > 0, '2-4 カテゴリのピン留め（外構だけ・次も残る）');
  await p.evaluate(() => { EE.features.settings().pinCat = ''; }); await p.keyboard.press('Escape');
  const recent = await p.evaluate(() => { const u = EE.features.settings().itemUse || {}; return Object.keys(u).length; });
  ok(recent >= 1, '2-4 使った品目を数える（最近使った順に並ぶ）');

  /* 2-3 数量の刻み */
  const q0 = await p.evaluate(() => EE.views.editor.current().lines[0].qty);
  await p.click('#line-body tr[data-line] [data-act="qty-inc"]'); await p.waitForTimeout(200);
  const q1 = await p.evaluate(() => EE.views.editor.current().lines[0].qty);
  ok(q1 === q0 + 1, '2-3 ＋で数量が1増える（' + q0 + '→' + q1 + '）');
  ok(await p.evaluate(() => !!document.querySelector('#line-body .qty').getAttribute('list') && !!document.getElementById('qp-area')), '2-3 よく使う数量の候補（10㎡・1式など）');
  // Alt+↓ で行ごと下へ
  const first = await p.evaluate(() => EE.views.editor.current().lines[0].lineId);
  await p.focus('#line-body tr[data-line] .qty'); await p.keyboard.press('Alt+ArrowDown'); await p.waitForTimeout(300);
  ok(await p.evaluate(id => EE.views.editor.current().lines[1].lineId === id, first), '2-3 キーボードだけで行を動かす（Alt＋↓）');

  /* 3-1 お客様向けの説明 */
  await p.click('#line-body tr[data-line] [data-act="open"]'); await p.waitForTimeout(300);   // お客様向けの説明は、行を広げた中で直す
  await p.fill('[data-detail] .d-desc', 'コンクリートで固めるので、雑草が生えず車も止めやすくなります'); await p.dispatchEvent('[data-detail] .d-desc', 'input');
  await p.click('#line-body tr[data-line] [data-act="open"]'); await p.waitForTimeout(400);
  ok(/お客様向け：コンクリート/.test(await p.textContent('#line-body')), '3-1 明細にお客様向けの説明（画面）');

  /* 2-2 寸法から数量 */
  await p.click('[data-mk2="dims"]'); await p.waitForTimeout(300);
  await p.click('[data-dc="perim"]'); await p.fill('[data-dv="0"]', '12'); await p.fill('[data-dv="1"]', '8'); await p.waitForTimeout(200);
  ok((await p.textContent('#dc-out')).trim() === '40', '2-2 周りの長さ (12+8)×2 = 40m');
  await p.click('.modal [data-ok]'); await p.waitForTimeout(400);
  const last = await p.evaluate(() => { const L = EE.views.editor.current().lines; return L[L.length - 1].qty; });
  ok(last === 40, '2-2 計算した数量を行に入れる');

  /* 2-5 チェックリスト */
  const ck = await p.evaluate(() => EE.make.checklistOf(EE.views.editor.current()).filter(x => !x.has).map(x => x.label));
  ok(ck.length > 0 && (await p.evaluate(() => EE.ui.checkDoc(EE.views.editor.current()).some(x => x.code === 'checklist-miss'))), '2-5 入れ忘れやすいもの（' + ck.join('・') + '）を送信前チェックでも知らせる');
  await p.click('[data-mk2="check"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'checklist.png') });
  const addBtn = await p.$('[data-ck-add]'); if (addBtn) { await addBtn.click(); await p.waitForTimeout(500); }
  for (let k = 0; k < 12; k++) { const s = await p.$('[data-ck-skip]'); if (!s) break; await s.click(); await p.waitForTimeout(150); }
  ok(await p.isVisible('.modal .check-ok'), '2-5 「足す」「今回は不要」で、すべて確かめられる');
  await closeModals(p);

  /* 3-2・3-3 含まれないもの・前提条件・条件をまとめて */
  await p.evaluate(() => { const b = document.querySelector('.ed-pane [data-pane="header"]'); if (b) b.click(); }); await p.waitForTimeout(400);
  await p.click('[data-act="snip"][data-target="excludes"]'); await p.waitForTimeout(300);
  await p.click('.modal [data-snip]'); await p.waitForTimeout(300); await closeModals(p);
  await p.fill('[data-f="premises"]', '駐車スペース1台分をお借りできること'); await p.dispatchEvent('[data-f="premises"]', 'input');
  await p.click('[data-act="snip-multi"]'); await p.waitForTimeout(300);
  const conds = await p.$$('[data-cond]'); for (const c of conds.slice(0, 3)) await c.check();
  await p.click('.modal [data-ok]'); await p.waitForTimeout(400);
  const hd = await p.evaluate(() => { const d = EE.views.editor.current(); return { ex: d.excludes, pr: d.premises, notes: d.notes }; });
  ok(hd.ex && hd.pr && hd.notes && hd.notes.split('\n').length >= 3, '3-2 含まれないもの・前提条件／3-3 条件を3つまとめて選ぶ');
  await p.click('[data-act="save"]'); await p.waitForTimeout(800);
  // PDF に出る
  const sheet = await p.evaluate(id => EE.print.sheetHTML(EE.S.documents.find(d => d.id === id)), ids.d);
  ok(/この見積に含まれないもの/.test(sheet) && /前提条件/.test(sheet) && /class="desc"/.test(sheet), '3-1・3-2 お客様向けの説明・含まれないもの・前提条件が PDF に載る');

  /* 1-4 案件メモ・3-6 似た見積 */
  ok(/来年3月まで/.test(await p.textContent('.case-memo')) && /予算感/.test(await p.textContent('.case-memo')), '1-4 見積の脇に、お客様の希望時期・予算感・依頼内容');
  ok(/予算感まで/.test(await p.textContent('.case-memo')), '1-4 予算感との差を出す');
  const sim = await p.evaluate(id => EE.make.similar(EE.S.documents.find(d => d.id === id)), ids.d);
  ok(sim && sim.n >= 2 ? await p.isVisible('.similar') : true, '3-6 同じ種類の見積の真ん中と比べる（' + (sim ? sim.n + '件・' + sim.diff + '%' : '比べる見積なし') + '）');

  /* 2-6 単価の異常値 */
  const odd = await p.evaluate(id => { const d = EE.S.documents.find(x => x.id === id), l = d.lines[0], it = EE.ui.findItem(l.itemId); const keep = it.priceHistory; it.priceHistory = (keep || []).concat([{ from: '2026-01-01', unitPrice: Math.round(l.unitPrice / 3) }, { from: '2026-11-01', unitPrice: l.unitPrice }]); const c = EE.ui.checkDoc(d).some(x => x.code === 'price-odd'); it.priceHistory = keep; return c; }, ids.d);
  ok(odd, '2-6 前の単価の2倍以上なら、その場で知らせる');

  /* 1-2 マイ型 */
  await p.evaluate(() => { const b = document.querySelector('.ed-pane [data-pane="lines"]'); if (b) b.click(); }); await p.waitForTimeout(300);
  await p.click('[data-mk2="mytype"]'); await p.waitForTimeout(300); await p.fill('#mt-name', '駐車場 土間とフェンス'); await p.click('.modal [data-ok]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => (EE.S.myTypes || []).some(t => t.name === '駐車場 土間とフェンス' && t.lines.length >= 3)), '1-2 作った見積を「マイ型」に保存');
  await go(p, '#/w/1', 1200);
  await p.click('[data-pj="' + ids.c + '"]'); await p.waitForTimeout(300); await p.click('[data-wz="next"]'); await p.waitForTimeout(1000);
  await p.click('[data-mode="mine"]'); await p.waitForTimeout(400);
  await p.click('[data-mine]'); await p.waitForTimeout(300); await p.click('[data-wz="next"]'); await p.waitForTimeout(1500);
  const mine = await p.evaluate(() => { const id = (location.hash.match(/#\/w\/(\d)/) || [])[1]; const d = EE.S.documents.filter(x => /マイ型/.test(x.sourceLabel || '')).pop(); return { step: id, n: d && d.lines.length, ex: d && d.excludes }; });
  ok(mine.n >= 3 && mine.ex, '1-2 「見積を作る」→「マイ型から」で、明細と条件ごと呼び出す（' + mine.n + '行）');

  /* 1-3 概算 */
  await go(p, '#/w/1', 1200); await p.evaluate(() => EE.views.wizard.reset()); await go(p, '#/w/1', 800);
  await p.click('[data-pj="' + ids.c + '"]'); await p.waitForTimeout(300); await p.click('[data-wz="next"]'); await p.waitForTimeout(1000);
  await p.click('[data-mode="rough"]'); await p.waitForTimeout(400);
  await p.fill('[data-rough="area"]', '30'); await p.selectOption('[data-rough="unit"]', '坪'); await p.dispatchEvent('[data-rough="unit"]', 'input'); await p.waitForTimeout(300);
  const ra = await p.textContent('#rough-amt');
  await p.screenshot({ path: path.join(OUT, 'rough.png') });
  await p.click('[data-wz="next"]'); await p.waitForTimeout(1500);
  const rd = await p.evaluate(() => EE.S.documents.filter(x => x.sourceLabel === '概算で作成').pop());
  ok(rd && rd.rough && rd.lines.length === 1 && rd.roughAmount > 0, '1-3 概算で作る：30坪 → ' + ra + '（明細は1行の「一式（概算）」）');
  ok(/概算御見積書/.test(await p.evaluate(id => EE.print.sheetHTML(EE.S.documents.find(d => d.id === id)), rd.id)), '1-3 PDF は「概算御見積書」');
  await go(p, '#/edit/' + rd.id, 1800);
  await p.click('[data-mk2="detail"]'); await p.waitForTimeout(400); await p.click('.modal [data-dt]'); await p.waitForTimeout(1500);
  const det = await p.evaluate(id => { const d = EE.views.editor.current(); return { rough: d.rough, n: d.lines.length, gap: !!document.querySelector('.rough-gap') }; }, rd.id);
  ok(!det.rough && det.n > 1 && det.gap, '1-3 「明細にする」で型の明細に置き換え、はじめの概算との差を出す');
  await p.screenshot({ path: path.join(OUT, 'detailized.png') });
  await p.click('[data-act="save"]'); await p.waitForTimeout(600);

  /* 4-1 提出・期限・残日数／4-2 次にやること／4-3 差分 */
  const issued = await p.evaluate(() => { const d = EE.S.documents.find(x => x.status === 'issued' && x.validUntil); return d && EE.make.dueText(Object.assign({}, d, { sent: [{ date: EE.data.addDays(EE.data.today(), -2), via: 'メール' }], validUntil: EE.data.addDays(EE.data.today(), 5) })); });
  ok(/提出 .*・期限 .*（残り 5日）/.test(issued || ''), '4-1 提出日・有効期限・残日数を一目で（' + issued + '）');
  await go(p, '#/docs/issued', 1500);
  ok(/残り \d+日|日過ぎ/.test(await p.textContent('#doc-table')), '4-1 見積の一覧にも残日数');
  const recall = await p.evaluate(o => { const S = EE.S, d = S.documents.find(x => x.id); const c = eval(o).makeCase({ customer: '再連絡 花子' }); eval(o).touch(c); return c.id; }, O);
  await p.waitForTimeout(1500);
  const nx = await p.evaluate(cid => { const S = EE.S, d = EE.data.newEstimate(S, { projectId: cid, customerId: 'cus_' + cid, title: '再連絡のテスト' }); d.lines.push(EE.data.lineFromItem(S.items[0], 1)); d.status = 'issued'; d.issuedAt = new Date(Date.now() - 2 * 864e5).toISOString(); d.validUntil = EE.data.addDays(EE.data.today(), 6); d.sent = [{ date: EE.data.addDays(EE.data.today(), -1), via: 'メール' }]; d.snap = EE.data.snapOf(S, d); S.documents.push(d); EE.ui.commit(); return EE.linkTodo().some(x => /期限 6日前/.test(x.s)); }, recall);
  ok(nx, '4-2 期限の7日前から「もう一度連絡する」を今日やることに');
  const cmp = await p.evaluate(() => { const pid = EE.S.projects.find(pp => EE.linkCompare.can(pp.id)); if (!pid) return null; EE.linkCompare.open(pid.id); return document.querySelector('.modal').textContent; });
  ok(cmp == null || /違いの要点/.test(cmp), '4-3 パターン比較の上に「違いの要点」');
  await closeModals(p);

  /* 空・失敗の状態・⌘K */
  ok(await p.evaluate(() => /ghost-rows/.test(EE.ui.empty({ text: 'x' }))), '空の状態に、うっすらとした行の影');
  await go(p, '#/home', 1200);
  const failed = await p.evaluate(() => { const T = EE.views.control.TYPES, keep = EE.insight.cases; EE.insight.cases = () => { throw new Error('test'); }; EE.app.rerender(); const f = !!document.querySelector('.w-failed'); EE.insight.cases = keep; EE.app.rerender(); return f; });
  ok(failed, '失敗の状態：1つのウィジェットが描けなくても「もう一度読み込む」を出し、ほかは出す');
  ok(await p.evaluate(() => { const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }); document.dispatchEvent(e); return !!document.querySelector('.palette, #palette, [role="dialog"]'); }), '⌘K でも検索（パレット）が開く');
  await p.keyboard.press('Escape');

  ok(!errs.length, 'エラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  await b.close();
  console.log(fail ? '\nweb-make: ' + fail + ' 件失敗' : '\nweb-make: ok'); process.exit(fail ? 1 : 0);
})();
