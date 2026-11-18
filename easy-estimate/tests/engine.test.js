// 実行: node easy-estimate/tests/engine.test.js
const assert = require('assert');
const E = require('../js/engine.js');
const C = require('../js/check.js');
let n = 0;
function t(name, fn) { fn(); n++; console.log('ok', name); }

t('roundDiv 各モード', () => {
  assert.strictEqual(E.roundDiv(250, 100, 'floor'), 2);
  assert.strictEqual(E.roundDiv(250, 100, 'round'), 3);
  assert.strictEqual(E.roundDiv(249, 100, 'round'), 2);
  assert.strictEqual(E.roundDiv(201, 100, 'ceil'), 3);
  assert.strictEqual(E.roundDiv(-250, 100, 'floor'), -2); // 切り捨ては0方向
  assert.strictEqual(E.roundDiv(-250, 100, 'round'), -3);
});

t('小数数量でも浮動小数誤差が出ない', () => {
  assert.strictEqual(E.lineAmount(0.1 + 0.2, 1000, 'floor'), 300);
  assert.strictEqual(E.lineAmount(1.15, 100, 'floor'), 115);
  assert.strictEqual(E.lineAmount(0.5, 26001, 'round'), 13001);
  assert.strictEqual(E.lineAmount(0.5, 26001, 'floor'), 13000);
});

t('消費税は税率ごとに1回だけ端数処理（インボイス）', () => {
  const doc = { lines: [
    { qty: 1, unitPrice: 105, taxCategory: 'std10' },
    { qty: 1, unitPrice: 105, taxCategory: 'std10' },
    { qty: 1, unitPrice: 999, taxCategory: 'red8' },
    { qty: 1, unitPrice: 500, taxCategory: 'exempt' },
  ]};
  const r = E.calc(doc, { taxRounding: 'floor' });
  assert.strictEqual(r.byRate.std10.base, 210);
  assert.strictEqual(r.byRate.std10.tax, 21);     // 行ごとなら 10+10=20 になる
  assert.strictEqual(r.byRate.red8.tax, 79);      // 79.92 → 79
  assert.strictEqual(r.byRate.exempt.tax, 0);
  assert.strictEqual(r.subtotal, 1709);
  assert.strictEqual(r.tax, 100);
  assert.strictEqual(r.total, 1809);
});

t('粗利・粗利率・建設業法の内訳', () => {
  const r = E.calc({ lines: [
    { qty: 10, unitPrice: 1200, unitCost: 450, costType: 'material' },
    { qty: 10, unitPrice: 900, unitCost: 600, costType: 'labor' },
    { qty: 1, unitPrice: 25000, unitCost: 18000, costType: 'expense' },
  ]}, {});
  assert.strictEqual(r.subtotal, 46000);
  assert.strictEqual(r.costTotal, 28500);
  assert.strictEqual(r.grossProfit, 17500);
  assert.ok(Math.abs(r.marginRate - 17500 / 46000) < 1e-12);
  assert.deepStrictEqual(r.breakdown, { material: 12000, labor: 9000, subcontract: 0, expense: 25000, other: 0, discount: 0 });
});

t('空の書類', () => {
  const r = E.calc({ lines: [] }, {});
  assert.strictEqual(r.total, 0);
  assert.strictEqual(r.marginRate, null);
});

t('不正な数量は invalid', () => {
  const r = E.calc({ lines: [{ qty: 'abc', unitPrice: 100 }] }, {});
  assert.strictEqual(r.valid, false);
});

const item = { id: 'i1', code: 'K-1', name: '施工', unitPrice: 1000, unitCost: 600, active: true };
const base = () => ({
  id: 'd1', no: 'EST-1', customerId: 'c1', title: '件名', issueDate: '2026-11-18', validUntil: '2026-12-18',
  lines: [{ lineId: 'l1', itemId: 'i1', name: '施工', qty: 2, unitPrice: 1000, unitCost: 600, kind: 'construction', costType: 'labor' }],
});
const ctx = (o = {}) => Object.assign({
  items: [item], customers: [{ id: 'c1', name: 'A社', honorific: '御中', kind: 'corp', address: 'x' }],
  projects: [], documents: [], company: { name: '自社', invoiceRegNo: 'T1234567890123' }, settings: { minMargin: 0.15 }, today: '2026-11-18',
}, o);
const codes = (doc, c) => C.run(doc, c || ctx()).map(x => x.code);

t('問題のない書類は error/warn なし（未保存の注意のみ）', () => {
  const doc = base();
  doc.totals = E.snapshot(E.calc(doc, {}));
  assert.deepStrictEqual(C.run(doc, ctx()).filter(x => x.level !== 'info'), []);
});

t('送信前チェックが各種の怪しい箇所を拾う', () => {
  const doc = base();
  doc.customerId = '';
  doc.validUntil = '2026-11-01';
  doc.lines.push({ lineId: 'l2', itemId: 'gone', name: '消えた', qty: 0, unitPrice: 5, unitCost: 9 });
  doc.lines[0].unitPrice = 900;
  doc.totals = { subtotal: 1, tax: 0, total: 1 };
  const c = codes(doc, ctx({ company: { name: '自社', invoiceRegNo: 'T123' } }));
  ['no-customer', 'valid-before-issue', 'line-item-deleted', 'qty-zero', 'price-changed', 'calc-mismatch', 'bad-reg-no', 'below-cost']
    .forEach(code => assert.ok(c.includes(code), code + ' が出ていない: ' + c));
});

t('有効期限切れ', () => {
  const doc = base(); doc.issueDate = '2026-10-01'; doc.validUntil = '2026-11-01';
  assert.ok(codes(doc).includes('expired'));
});

t('有効期限が発行日より前', () => {
  const doc = base(); doc.validUntil = '2026-11-10';
  assert.ok(codes(doc).includes('valid-before-issue'));
});

t('粗利率の下限', () => {
  const doc = base(); doc.lines[0].unitCost = 950;
  assert.ok(codes(doc).includes('low-margin'));
});

t('チェックは書類を書き換えない', () => {
  const doc = base(); const before = JSON.stringify(doc);
  C.run(doc, ctx());
  assert.strictEqual(JSON.stringify(doc), before);
});

t('建設業法20条：工事なのに材料費・労務費がない', () => {
  const doc = base(); doc.lines[0].costType = 'expense';
  assert.ok(codes(doc).includes('kensetsu-20'));
});


t('諸経費（率・税率区分ごと・切り捨て）', () => {
  const r = E.calc({ lines: [{ lineId: 'a', qty: 1, unitPrice: 1000005, taxCategory: 'std10' }],
    adjustments: [{ id: 'o', type: 'overhead', mode: 'rate', rateBp: 800, scope: 'all' }] }, {});
  assert.strictEqual(r.adjustments[0].amount, 80000);
  assert.strictEqual(r.subtotal, 1080005);
  assert.strictEqual(r.breakdown.expense, 80000);
});

t('定率値引きは税率区分ごと・諸経費込みの額にかかる（切り上げ）', () => {
  const r = E.calc({ lines: [
    { lineId: 'a', qty: 1, unitPrice: 10001, taxCategory: 'std10' },
    { lineId: 'b', qty: 1, unitPrice: 999, taxCategory: 'red8' }],
    adjustments: [{ id: 'd', type: 'discount', mode: 'rate', rateBp: 500, scope: 'all' }] }, { taxRounding: 'floor' });
  assert.strictEqual(r.adjustments[0].byCat.std10, -501);   // 500.05 → 501
  assert.strictEqual(r.adjustments[0].byCat.red8, -50);     // 49.95 → 50
  assert.strictEqual(r.byRate.std10.base, 9500);
  assert.strictEqual(r.byRate.red8.base, 949);
  assert.strictEqual(r.byRate.std10.tax, 950);
  assert.strictEqual(r.byRate.red8.tax, 75);                // 75.92 → 75
});

t('選択した明細だけに値引き', () => {
  const r = E.calc({ lines: [
    { lineId: 'a', qty: 1, unitPrice: 10000 }, { lineId: 'b', qty: 1, unitPrice: 20000 }],
    adjustments: [{ id: 'd', type: 'discount', mode: 'rate', rateBp: 1000, scope: ['b'] }] }, {});
  assert.strictEqual(r.subtotal, 28000);
});

t('定額値引き・千円未満切り捨て・原価は変わらない', () => {
  const r = E.calc({ lines: [{ lineId: 'a', qty: 1, unitPrice: 1234567, unitCost: 800000 }],
    adjustments: [{ id: 'r', type: 'roundoff', unit: 1000 }, { id: 'd', type: 'discount', mode: 'amount', amount: 10000, taxCategory: 'std10' }] }, {});
  // 値引き → 端数調整 の順（配列の順番に関係なく固定）
  assert.strictEqual(r.adjustments[0].type, 'discount');
  assert.strictEqual(r.subtotal, 1224000);
  assert.strictEqual(r.costTotal, 800000);
  assert.strictEqual(r.grossProfit, 424000);
  assert.strictEqual(r.tax, 122400);
});

console.log(`\n${n} tests passed`);
