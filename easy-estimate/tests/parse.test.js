// 実行: node easy-estimate/tests/parse.test.js
const assert = require('assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../js/parse.js');
const sb = { EE: {} }; sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/catalog.js'), 'utf8').replace(/\}\)\(this\);\s*$/, '})(window);'), sb);
const state = { items: [], packages: [], formulas: [], snippets: [] };
sb.EE.catalog.mergeInto(state, '2026-11-18');
const ctx = { items: state.items, templates: state.packages, categories: state.categories, customers: [{ id: 'c1', name: '山田 太郎' }] };
const byId = Object.fromEntries(state.items.map(i => [i.id, i]));
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const row = (r, code) => r.rows.find(x => byId[x.itemId].code === code);

t('漢数字と単位の正規化', () => {
  assert.strictEqual(P.kanjiNumber('二十五'), 25);
  assert.strictEqual(P.kanjiNumber('三千二百'), 3200);
  assert.strictEqual(P.normalize('十メートル、二十平米、三ヶ所'), '10m、20m²、3箇所');
});

t('指示書の例文：フェンス工事', () => {
  const r = P.parse('フェンス工事の見積もりを作成。既存フェンス撤去、新規フェンス10メートル、高さ1800、独立基礎、残土処分込み。', ctx);
  assert.strictEqual(r.template.id, 'tpl_fence');
  assert.strictEqual(r.category, 'gaikou');
  assert.strictEqual(row(r, 'GK-09').qty, 10);            // 高さ1800 → H1800 を選ぶ
  assert.ok(!row(r, 'GK-08'));                            // テンプレートの H1200 は使わない
  assert.strictEqual(row(r, 'GK-10').qty, 10);            // フェンス施工にも 10m を引き継ぐ
  assert.strictEqual(row(r, 'GK-10').qtySource, 'linked');
  assert.strictEqual(row(r, 'GK-01').include, true);       // 文章にあるので任意項目でも採用
  assert.strictEqual(row(r, 'GK-05').source, 'text');
  assert.strictEqual(row(r, 'GK-04').include, true);
  assert.strictEqual(row(r, 'GK-03').source, 'template');  // 文章に無い → 不足候補
  assert.deepStrictEqual(r.unknown, []);
  assert.strictEqual(r.adjustments[0].type, 'overhead');
});

t('単位換算（mm→m、坪→m²）と換算できない単位', () => {
  const r = P.parse('土間コンクリート 10坪、雨樋 15000mm、門扉設置 2m', ctx);
  assert.strictEqual(row(r, 'GK-13').qty, 33.06);
  assert.strictEqual(row(r, 'YN-06').qty, 15);
  assert.strictEqual(row(r, 'GK-12').qty, 1);              // m は 箇所 に換算できない → 標準数量
  assert.ok(row(r, 'GK-12').notes[0].includes('換算できない'));
});

t('同義語で照合し、辞書に無い語句は残す', () => {
  const r = P.parse('外壁塗装、足場、高圧洗浄 150平米、シーラー、ベランダ防水、山田太郎様', ctx);
  assert.strictEqual(r.template.id, 'tpl_tosou');
  assert.strictEqual(row(r, 'TS-01').source, 'text');
  assert.strictEqual(row(r, 'TS-02').qty, 150);
  assert.strictEqual(row(r, 'TS-05').source, 'text');
  assert.deepStrictEqual(r.unknown, ['ベランダ防水']);
  assert.strictEqual(r.customerId, 'c1');
});

t('テンプレートに合わなくても明細を拾い、数量は推測しない', () => {
  const r = P.parse('パワコン 1台\n蓄電池', ctx);
  assert.strictEqual(row(r, 'TY-02').qty, 1);
  assert.strictEqual(row(r, 'TY-03').qtySource, 'standard');   // テンプレートのキーワード（太陽光）が無いので展開しない
  assert.strictEqual(r.category, 'taiyoukou');
  const r2 = P.parse('ガルバリウム 80平米と棟板金', { ...ctx, templates: [] });
  assert.strictEqual(r2.template, null);
  assert.strictEqual(row(r2, 'YN-04').qty, 80);
  assert.strictEqual(row(r2, 'YN-05').qtySource, 'standard');
});

console.log(`\n${n} tests passed`);
