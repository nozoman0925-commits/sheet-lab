/*
 * PDF取り込み：単価はマスタが基本・新しいマスタは単価/原価/原価区分が必須（Playwright が必要）
 *   node easy-estimate/tests/import.js
 * tests/fixtures/other-text.pdf は、テスト用に作った架空の他社見積（文字のあるPDF）
 */
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
const signedIn = require('./_signed-in');
const BASE = 'file://' + path.join(__dirname, '..', 'index.html') + '?splash=off';
const PDF = path.join(__dirname, 'fixtures', 'other-text.pdf');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ok = (c, m) => { assert.ok(c, m); console.log('✓ ' + m); };
  async function open() {
    const p = signedIn(await b.newPage({ viewport: { width: 1440, height: 1000 } }));
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(BASE + '#/new/pdf'); await p.waitForTimeout(700);
    await p.setInputFiles('#imp-file', PDF);
    await p.waitForSelector('#r-rows', { timeout: 30000 }); await p.waitForTimeout(500);
    return p;
  }

  // 1) 既定は「自社マスタの単価」。明細の単価はマスタと同じ
  let p = await open();
  ok(await p.evaluate(() => document.querySelector('#r-price [data-v="master"]').classList.contains('on')), '単価の既定は「自社マスタの単価を使う」');
  const matched = await p.$$eval('#r-rows tr', rs => rs.filter(r => r.querySelector('[data-k=itemId]').value && r.querySelector('[data-k=itemId]').value !== '__new').length);
  // マスタに無い行は取り込まない（このテストではマスタにある行だけで作る）
  await p.$$eval('#r-rows tr', rs => rs.forEach(r => { if (!r.querySelector('[data-k=itemId]').value) { const c = r.querySelector('[data-k=include], input[type=checkbox]'); if (c && c.checked) c.click(); } }));
  await p.click('[data-act="r-make"]'); await p.waitForTimeout(900);
  await p.keyboard.press('Control+s'); await p.waitForTimeout(600);
  const r1 = await p.evaluate(() => { const d = EE.S.documents.find(x => location.hash.includes(x.id)); return d.lines.map(l => ({ same: l.unitPrice === EE.ui.findItem(l.itemId).unitPrice, src: !!l.priceSource })); });
  ok(matched > 0 && r1.length === matched && r1.every(x => x.same && !x.src), '取り込んだ明細の単価はすべてマスタの単価（読み取った単価は使わない）');
  await p.close();

  // 2) 「元の書類の単価」を選んだときだけ、その単価を使い、注意書きが出る
  p = await open();
  await p.$$eval('#r-rows tr', rs => rs.forEach(r => { if (!r.querySelector('[data-k=itemId]').value) { const c = r.querySelector('[data-k=include], input[type=checkbox]'); if (c && c.checked) c.click(); } }));
  await p.click('#r-price [data-v="source"]'); await p.waitForTimeout(200);
  ok(/注意/.test(await p.textContent('#r-price-note')), '「元の書類の単価」を選ぶと注意書きが出る');
  await p.click('[data-act="r-make"]'); await p.waitForTimeout(900); await p.keyboard.press('Control+s'); await p.waitForTimeout(600);
  const r2 = await p.evaluate(() => { const d = EE.S.documents.find(x => location.hash.includes(x.id)); return { src: d.lines.filter(l => l.priceSource && l.priceSource.type === 'import').length, n: d.lines.length, warn: EE.ui.checkDoc(d).some(c => c.code === 'price-changed') }; });
  ok(r2.src > 0, '選んだときは読み取った単価を使い、取り込み元の単価として記録する');
  await p.close();

  // 3) 新しいマスタとして登録する行は、単価・原価・原価区分を入れないと進めない
  p = await open();
  const n0 = await p.evaluate(() => EE.S.items.length);
  await p.$$eval('#r-rows tr', rs => rs.forEach(r => { const s = r.querySelector('[data-k=itemId]'); if (!s.value) { s.value = '__new'; s.dispatchEvent(new Event('change', { bubbles: true })); } }));
  const fresh = await p.$$eval('#r-rows tr', rs => rs.filter(r => r.querySelector('[data-k=itemId]').value === '__new').length);
  await p.click('[data-act="r-make"]'); await p.waitForTimeout(500);
  ok(fresh > 0 && await p.isVisible('.modal [data-nf="unitCost"]'), '新しいマスタの行があると、単価・原価・原価区分の入力画面が出る');
  await p.click('.modal [data-s]'); await p.waitForTimeout(300);
  ok(await p.isVisible('.modal [data-nf="unitCost"]') && (await p.evaluate(() => EE.S.items.length)) === n0, '未入力のままでは登録しない');
  await p.$$eval('.modal tr[data-n]', trs => trs.forEach((tr, i) => {
    tr.querySelector('[data-nf=unitPrice]').value = tr.querySelector('[data-nf=unitPrice]').value || '10000';
    tr.querySelector('[data-nf=unitCost]').value = String(6000 + i);
    const s = tr.querySelector('[data-nf=costType]'); s.value = 'labor';
  }));
  await p.click('.modal [data-s]'); await p.waitForTimeout(900);
  const r3 = await p.evaluate(n0 => EE.S.items.slice(n0).map(i => ({ cost: i.unitCost, ct: i.costType, price: i.unitPrice })), n0);
  ok(r3.length === fresh && r3.every(x => x.cost >= 6000 && x.ct === 'labor' && x.price > 0), '入力した単価・原価・原価区分でマスタに登録される（原価0円・「その他」で登録しない）');

  console.log(errs.length ? 'ERRORS: ' + errs.join(' / ') : 'import: ok'); await b.close();
  if (errs.length) process.exit(1);
})();
