// 実行: node easy-estimate/tests/data.test.js
// 保存データまわり：初回は空・以前のサンプルの片付け・壊れたデータの退避・別タブ更新の検知・前の世代を残す
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
function boot(stored) {
  const ls = new Map(Object.entries(stored || {}));
  const localStorage = { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) };
  const sb = { EE: {}, localStorage, console }; sb.window = sb; vm.createContext(sb);
  for (const f of ['engine.js', 'catalog.js', 'data.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', f), 'utf8').replace(/\}\)\(this\);\s*$/, '})(window);'), sb);
  return { EE: sb.EE, ls };
}
const eq = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('初めて開くと、顧客・案件・書類は空。自社情報は桜美建設、マスタ・テンプレートはある', () => {
  const { EE } = boot();
  const s = EE.data.load();
  assert.strictEqual(s.customers.length, 0); assert.strictEqual(s.projects.length, 0); assert.strictEqual(s.documents.length, 0);
  assert.strictEqual(s.company.name, '株式会社桜美建設'); assert.strictEqual(s.company.zip, '194-0022');
  assert.strictEqual(s.company.address, '東京都町田市森野4-15-12 寺田ビルA-211号'); assert.strictEqual(s.company.tel, '042-794-7290'); assert.strictEqual(s.company.fax, '042-794-7291');
  assert.strictEqual(s.company.invoiceRegNo, '');   // 登録番号は画面に無かったので空のまま（送信前チェックで指摘される）
  assert.ok(s.items.length > 50); assert.ok(s.packages.length > 0);
  assert.strictEqual(s.members.length, 1); assert.ok(s.members[0].placeholder);   // サインインした人が引き継ぐ仮の担当者
});

t('以前の保存データ：サンプルだけ消え、自分で作った顧客・書類・マスタは残る', () => {
  const { EE } = boot(); const old = EE.data.sampleState(); delete old.sampleCleanup; delete old.companyPreset;   // 以前の版の保存データ（片付け・会社情報の印が無い）
  old.customers.push({ id: 'cus_mine', name: '自分の顧客', honorific: '様' });
  const mine = EE.data.newEstimate(old, { customerId: 'cus_mine', title: '自分の見積', ownerId: 'mem_aoki' }); old.documents.push(mine);
  old.items.push({ id: 'itm_mine', code: 'MY-1', name: '自分の品目', unit: '式', unitPrice: 1000 });
  old.members.find(m => m.id === 'mem_aoki').accountId = 'usr_me';   // アカウントに紐づいた担当者は残す
  old.company.tel = '03-0000-9999';                                   // 自分で書き換えた自社情報は残す
  const b = boot({ 'easy-estimate:v1': JSON.stringify(old) }); const s = b.EE.data.load();
  eq(s.customers.map(c => c.id), ['cus_mine']);
  eq(s.documents.map(d => d.title), ['自分の見積']);
  assert.strictEqual(s.projects.length, 0);
  assert.ok(s.items.some(i => i.id === 'itm_mine'));
  eq(s.members.map(m => m.id), ['mem_aoki']);
  assert.strictEqual(s.company.name, '株式会社桜美建設');      // サンプルの会社名は消え、自社の会社名が入る
  assert.strictEqual(s.company.tel, '03-0000-9999');             // 自分で入れた電話番号は上書きしない
  assert.strictEqual(s.sampleCleanup, 'done');
  // 2回目は何も消さない（片付けは一度だけ）
  s.customers.push({ id: 'cus_sample', name: '同じIDでも自分で作ったもの' });
  assert.strictEqual(b.EE.data.migrate(JSON.parse(JSON.stringify(s))).customers.length, 2);
});

t('壊れた保存データは退避してから空で起動し、上書きしない', () => {
  const { EE, ls } = boot({ 'easy-estimate:v1': '{"schema":2,"items":[' });
  const s = EE.data.load();
  assert.strictEqual(s.documents.length, 0);
  const issue = EE.data.loadIssue(); assert.ok(issue && issue.key);
  assert.strictEqual(ls.get(issue.key), '{"schema":2,"items":[');
});

t('保存のたびに直前の世代を1つ残す。別のタブが保存したら、この画面からは保存しない', () => {
  const { EE, ls } = boot(); const s = EE.data.load();
  assert.ok(EE.data.save(s)); const first = ls.get('easy-estimate:v1');
  s.customers.push({ id: 'c1', name: 'A' }); assert.ok(EE.data.save(s));
  assert.strictEqual(ls.get('easy-estimate:v1:prev'), first);
  assert.strictEqual(EE.data.markStale(ls.get('easy-estimate:v1')), false);   // 自分の書き込み
  assert.strictEqual(EE.data.markStale('{"from":"other tab"}'), true);
  s.customers.push({ id: 'c2', name: 'B' }); assert.strictEqual(EE.data.save(s), false);
  assert.ok(!ls.get('easy-estimate:v1').includes('"c2"'));
});

t('自社情報は空の項目にだけ一度入れる（自分で消した・変えた項目は、次から上書きしない）', () => {
  const b = boot(); const s = b.EE.data.load();
  s.company.fax = ''; s.company.address = '別の住所';
  const again = b.EE.data.migrate(JSON.parse(JSON.stringify(s)));
  assert.strictEqual(again.company.fax, ''); assert.strictEqual(again.company.address, '別の住所');
});

console.log(`\n${n} tests passed`);
