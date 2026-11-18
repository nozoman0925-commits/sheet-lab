// 実行: node easy-estimate/tests/calc.test.js
const assert = require('assert');
const C = require('../js/calc-tool.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
t('四則演算と関数', () => {
  assert.strictEqual(C.compile('(a + b) * 2 - c / 4')({ a: 1, b: 2, c: 8 }), 4);
  assert.strictEqual(C.compile('ceil(len / 0.4) * dan')({ len: 10.1, dan: 3 }), 78);
  assert.strictEqual(C.compile('max(a, b, 3)')({ a: 1, b: 2 }), 3);
  assert.strictEqual(C.compile('a + b + c + d')({ a: 1, b: 2, c: 3, d: 4 }), 10);   // 3項以上の連続
  assert.strictEqual(C.compile('a * b / c * d - a - b')({ a: 2, b: 3, c: 6, d: 4 }), -1);
});
t('危険な式は受け付けない', () => {
  assert.throws(() => C.compile('alert(1)'), /使えない関数/);
  assert.throws(() => C.compile('a; b'), /使えない文字/);
  assert.throws(() => C.compile('constructor.constructor("x")'), /使えない文字|使えない関数|正しくありません/);
  assert.throws(() => C.compile('a / b')({ a: 1, b: 0 }), /0で割って/);
});
t('単位換算とロス率・切り上げ', () => {
  const f = { expr: 'w * d', inputs: [{ key: 'w', unit: 'm' }, { key: 'd', unit: 'm' }], lossPct: 10, round: 'decimal' };
  assert.deepStrictEqual(C.evaluate(f, { w: 3640, d: 2.73 }, { w: 'mm' }), { raw: 9.937, withLoss: 10.931, qty: 10.93 });
  const b = { expr: 'ceil(len / 0.4) * dan', inputs: [{ key: 'len', unit: 'm' }, { key: 'dan', unit: '段' }], lossPct: 3, round: 'ceil' };
  assert.strictEqual(C.evaluate(b, { len: 10, dan: 4 }).qty, 103);   // 100個 ×1.03
});
console.log(`\n${n} tests passed`);
