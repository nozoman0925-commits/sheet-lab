// 実行: node easy-estimate/tests/docparse.test.js
const assert = require('assert');
const D = require('../js/docparse.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const items = [
  { id: 'i1', code: 'GK-10', name: 'フェンス施工', synonyms: ['フェンス設置'], unit: 'm', active: true },
  { id: 'i2', code: 'GK-09', name: 'フェンス材料', spec: 'H1800', synonyms: ['フェンス'], unit: 'm', active: true },
  { id: 'i3', code: 'TS-04', name: '下地補修', synonyms: ['補修'], unit: '式', active: true },
];
const L = arr => arr.map((x, i) => (Array.isArray(x) ? { text: x.join(' '), cells: x.map(t => ({ text: t })), page: 1 } : { text: x, page: 1 }));

t('和暦・西暦の日付', () => {
  assert.strictEqual(D.date('発行日 令和8年11月18日'), '2026-11-18');
  assert.strictEqual(D.date('2026/1/5'), '2026-01-05');
  assert.strictEqual(D.date('13月40日'), null);
});

t('明細行の読み方（右から 金額→単価→単位→数量）', () => {
  assert.deepStrictEqual(D.readItemRow(['1', 'フェンス施工', '10', 'm', '4,500', '45,000']), { name: 'フェンス施工', qty: 10, unit: 'm', unitPrice: 4500, amount: 45000 });
  assert.deepStrictEqual(D.readItemRow(['養生費', '1式', '15,000', '15,000', '10%']), { name: '養生費', qty: 1, unit: '式', unitPrice: 15000, amount: 15000 });
  assert.strictEqual(D.readItemRow(['小計', '60,000']), null);
  assert.deepStrictEqual(D.readItemRow(['残土処分', '1', 'm³', '12.000', '12,000']), { name: '残土処分', qty: 1, unit: 'm³', unitPrice: 12000, amount: 12000 });  // OCRの点区切り
  assert.deepStrictEqual(D.readItemRow(['ウッドデッキ補修', '1', 'RK', '45,000', '45,000']), { name: 'ウッドデッキ補修', qty: 1, unit: '', unitPrice: 45000, amount: 45000, unitUnsure: 'RK' });
});

t('書類全体：項目・明細・合計・照合', () => {
  const r = D.parseDoc(L([
    '御見積書', 'No. Q-2026-0042', '発行日 2026年11月10日',
    '山田 太郎 様', ['件名：境界フェンス工事', '株式会社テスト外構'], 'TEL 03-1111-2222', '東京都品川区大井1-2-3',
    ['1', 'フェンス設置', '10', 'm', '4,500', '45,000'],
    ['2', 'フェンス H1800', '10', 'm', '16,000', '170,000'],
    ['3', 'ウッドデッキ補修', '1', '式', '30,000', '30,000'],
    'ここに説明文',
    ['小計', '245,000'], ['消費税', '24,500'], ['合計', '269,500'],
  ]), { items, customers: [{ id: 'c1', name: '山田 太郎' }] });
  assert.strictEqual(r.docType, 'estimate');
  assert.strictEqual(r.fields.number, 'Q-2026-0042');
  assert.strictEqual(r.fields.issueDate, '2026-11-10');
  assert.strictEqual(r.fields.customerName, '山田 太郎');
  assert.strictEqual(r.customerId, 'c1');
  assert.strictEqual(r.fields.title, '境界フェンス工事');
  assert.strictEqual(r.fields.phone, '03-1111-2222');
  assert.deepStrictEqual(r.totals, { subtotal: 245000, tax: 24500, total: 269500 });
  assert.strictEqual(r.rows.length, 3);
  assert.strictEqual(r.rows[0].itemId, 'i1');           // 同義語で照合
  assert.strictEqual(r.rows[1].itemId, 'i2');
  assert.strictEqual(r.rows[1].mismatch, true);        // 10×16,000 ≠ 170,000 → 直さず印だけ
  assert.strictEqual(r.rows[1].amount, 170000);
  assert.strictEqual(r.rows[2].match, 'none');         // 「補修」だけの一致では結び付けない
  assert.deepStrictEqual(r.rows[2].alternatives, ['i3']);   // 候補としては出す
  assert.strictEqual(r.sumMatches, true);
  assert.deepStrictEqual(r.others.map(o => o.text), ['御見積書', 'ここに説明文']);
});

t('位置つき文字片を行とセルにまとめる', () => {
  const lines = D.groupLines([
    { text: 'フェンス', x: 10, y: 100, w: 40, h: 10, page: 1 }, { text: '施工', x: 52, y: 101, w: 20, h: 10, page: 1 },
    { text: '10', x: 200, y: 100, w: 12, h: 10, page: 1 }, { text: '4,500', x: 300, y: 99, w: 30, h: 10, page: 1 },
    { text: '次の行', x: 10, y: 130, w: 30, h: 10, page: 1 },
  ]);
  assert.strictEqual(lines.length, 2);
  assert.deepStrictEqual(lines[0].cells.map(c => c.text), ['フェンス施工', '10', '4,500']);
});
console.log(`\n${n} tests passed`);
