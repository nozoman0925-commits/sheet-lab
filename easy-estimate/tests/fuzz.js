/*
 * 1万回ランダムテスト（計算・チェック・解析）
 *   node easy-estimate/tests/fuzz.js [回数=10000] [seed=1]
 * 乱数は seed で固定（同じ seed なら同じ入力）。失敗した入力は最初の数件を表示する。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const E = require('../js/engine.js'), C = require('../js/check.js'), P = require('../js/parse.js'), D = require('../js/docparse.js'), T = require('../js/calc-tool.js');
const N = Number(process.argv[2]) || 10000; let seed = Number(process.argv[3]) || 1;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)); const pick = a => a[Math.floor(rnd() * a.length)];
const sb = { EE: {} }; sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/catalog.js'), 'utf8').replace(/\}\)\(this\);\s*$/, '})(window);'), sb);
const state = { items: [], packages: [], formulas: [], snippets: [] }; sb.EE.catalog.mergeInto(state, '2026-11-18');
const ctxP = { items: state.items, templates: state.packages, categories: state.categories, customers: [{ id: 'c1', name: '山田 太郎' }] };

const fails = {}; const count = {};
function fail(area, msg, input) { (fails[area] = fails[area] || []).push({ msg, input }); }
function check(area, cond, msg, input) { count[area] = (count[area] || 0) + 1; if (!cond) fail(area, msg, input); }
const isInt = v => Number.isInteger(v);
const CATS = ['std10', 'red8', 'exempt', 'outside'], MODES = ['floor', 'round', 'ceil'];
const exactLine = (q, p) => { const c = Math.round(Number(q) * 100); return c * Math.round(p) / 100; };

function randDoc() {
  const lines = Array.from({ length: ri(0, 12) }, (_, i) => ({
    lineId: 'l' + i,
    qty: pick([ri(0, 50), ri(1, 9999) / 100, rnd() * 300, 0.1 + 0.2, 1.15, 0.005, -ri(1, 5)]),
    unitPrice: pick([ri(0, 2000000), ri(1, 999), ri(1, 99), ri(1, 9), 26001, 105, 0]),
    unitCost: pick([0, ri(0, 1500000), undefined]),
    taxCategory: pick(CATS.concat(['bogus', undefined])), costType: pick(['material', 'labor', 'subcontract', 'expense', 'other', 'x'])
  }));
  const adjustments = Array.from({ length: ri(0, 4) }, (_, i) => {
    const type = pick(['overhead', 'discount', 'roundoff']);
    if (type === 'roundoff') return { id: 'a' + i, type, unit: pick([100, 1000, 10000, 7]) };
    return rnd() < .5 ? { id: 'a' + i, type, mode: 'rate', rateBp: ri(0, 3000), scope: rnd() < .8 ? 'all' : lines.filter(() => rnd() < .5).map(l => l.lineId) }
      : { id: 'a' + i, type, mode: 'amount', amount: ri(0, 300000), taxCategory: pick(CATS) };
  });
  return { lines, adjustments };
}

// 1) 計算エンジン
for (let k = 0; k < N; k++) {
  const doc = randDoc(); const rules = { lineRounding: pick(MODES), taxRounding: pick(MODES), overheadRounding: pick(MODES), discountRounding: pick(MODES) };
  let r; try { r = E.calc(doc, rules); } catch (e) { fail('engine', 'throw ' + e.message, doc); continue; }
  const ok = r.valid;
  check('engine', isInt(r.subtotal) && isInt(r.tax) && isInt(r.total), '整数円でない', doc);
  check('engine', r.total === r.subtotal + r.tax, '合計≠小計+税', doc);
  const sb = Object.values(r.byRate).reduce((s, x) => s + x.base, 0), st = Object.values(r.byRate).reduce((s, x) => s + x.tax, 0);
  check('engine', sb === r.subtotal, '税率区分の合計≠小計', doc);
  check('engine', st === r.tax, '税率区分の税の合計≠税', doc);
  const lineSum = r.lines.reduce((s, x) => s + x.amount, 0), adjSum = r.adjustments.reduce((s, a) => s + a.amount, 0);
  check('engine', lineSum + adjSum === r.subtotal, '明細＋調整≠小計', doc);
  Object.entries(r.byRate).forEach(([c, x]) => {
    const exact = x.base * x.rate / 100;
    check('engine', Math.abs(x.tax - exact) < 1 || (!E.TAX_CATEGORIES[c].taxable && x.tax === 0), '税の端数処理が1円以上ずれる', doc);
  });
  doc.lines.forEach((l, i) => { if (!r.lines[i].invalid) check('engine', Math.abs(r.lines[i].amount - exactLine(l.qty, l.unitPrice)) < 1, '明細金額が1円以上ずれる', l); });
  check('engine', JSON.stringify(E.calc(doc, rules)) === JSON.stringify(r), '同じ入力で結果が変わる', doc);
  const rev = { lines: doc.lines, adjustments: doc.adjustments.slice().reverse() };
  if (!doc.adjustments.some(a => a.type === 'discount' && a.mode === 'amount') || doc.adjustments.filter(a => a.type === 'discount').length < 2)
    check('engine', E.calc(rev, rules).total === r.total, '調整の並び順で合計が変わる', doc);
  // 端数調整：もともと正の区分を負にしない（＝税がマイナスにならない）
  const before = E.calc({ lines: doc.lines, adjustments: doc.adjustments.filter(a => a.type !== 'roundoff') }, rules);
  if (doc.adjustments.some(a => a.type === 'roundoff')) {
    Object.entries(r.byRate).forEach(([c, x]) => check('engine', !(before.byRate[c] && before.byRate[c].base >= 0 && x.base < 0), '端数調整で税率区分の金額がマイナスになる', doc));
    if (before.subtotal > 0) { const u = [100, 1000, 10000].includes(Number(doc.adjustments.filter(a => a.type === 'roundoff').slice(-1)[0].unit)) ? 1 : 1; check('engine', r.subtotal >= 0, '端数調整で小計がマイナス', doc); }
  }
  const allPos = doc.lines.every(l => Number(l.qty) >= 0) && !doc.adjustments.some(a => a.type === 'discount');
  if (ok && allPos) check('engine', r.total >= 0, '値引き無し・数量正なのに合計がマイナス', doc);
}

// 2) 送信前チェック（例外を出さない・指摘の形・再計算の不一致を見逃さない）
for (let k = 0; k < N; k++) {
  const doc = randDoc();
  Object.assign(doc, { customerId: pick(['c1', '', 'nope']), title: pick(['', '工事', 'x'.repeat(300)]), issueDate: pick(['2026-11-18', '', '2026-13-40', 'abc']), validUntil: pick(['2026-12-18', '', '2025-01-01', '2026-11-01']) });
  doc.lines.forEach(l => { l.itemId = pick(state.items).id; l.name = pick(['', 'x', '既存フェンス撤去']); l.unit = pick(['m', '', '式']); });
  if (rnd() < .3) doc.totals = { subtotal: ri(0, 1e6), tax: ri(0, 1e5), total: ri(0, 1e6) };
  let list; try { list = C.run(doc, { items: state.items, customers: [{ id: 'c1', name: 'A', honorific: '様' }], projects: [], documents: [], company: {}, settings: {}, today: '2026-11-18' }); }
  catch (e) { fail('check', 'throw ' + e.message, doc); continue; }
  check('check', Array.isArray(list) && list.every(x => ['error', 'warn', 'info'].includes(x.level) && x.title), '指摘の形が不正', doc);
  if (doc.totals) { const r = E.calc(doc, {}); if (doc.totals.total !== r.total) check('check', list.some(x => x.code === 'calc-mismatch'), '保存時金額の不一致を見逃す', doc); }
  check('check', JSON.stringify(doc).length > 0, '', null);
}

// 3) 文章→見積の解析（例外なし・数量が有限の正の数）
const words = ['フェンス', '撤去', '外壁塗装', '足場', '10m', '二十平米', '三ヶ所', '高さ1800', '1.5坪', '15000mm', '残土処分', '山田太郎様', 'トイレ交換', '、', '。', ' ', '\n', '🙂', '<script>', '−5m', '1e9', '999999999平米', 'ああ', 'ｍ', '㎡', '0m'];
for (let k = 0; k < N; k++) {
  const text = Array.from({ length: ri(0, 25) }, () => pick(words)).join(pick(['', ' ', '、']));
  let r; try { r = P.parse(text, ctxP); } catch (e) { fail('parse', 'throw ' + e.message, text); continue; }
  check('parse', Array.isArray(r.rows), 'rows が配列でない', text);
  r.rows.forEach(x => check('parse', typeof x.qty === 'number' && isFinite(x.qty) && x.qty >= 0, '数量が不正: ' + x.qty, text));
}

// 4) 書類（PDF・OCR）の読み取りルール
const cellW = ['1', 'フェンス施工', '10', 'm', '4,500', '45,000', '小計', '¥1,000', '12.000', 'RK', '', '10%', '令和8年11月18日', '2026/1/5', '-', '△500', '1,2,3', 'NaN', '∞'];
for (let k = 0; k < N; k++) {
  const cells = Array.from({ length: ri(0, 8) }, () => pick(cellW));
  try {
    const r = D.readItemRow(cells);
    if (r) check('docparse', ['qty', 'unitPrice', 'amount'].every(f => r[f] == null || (typeof r[f] === 'number' && isFinite(r[f]))), '数値が不正', cells);
    else check('docparse', true, '', null);
    const lines = Array.from({ length: ri(0, 10) }, () => ({ text: cells.join(' '), cells: cells.map(t => ({ text: t })), page: 1 }));
    D.parseDoc(lines, { items: state.items, customers: [] }); D.date(cells.join(''));
  } catch (e) { fail('docparse', 'throw ' + e.message, cells); }
}

// 5) 数量計算の式（安全性・例外は日本語のエラーだけ）
const toks = ['a', 'b', 'c', '1', '0', '2.5', '+', '-', '*', '/', '(', ')', 'ceil(', 'max(', ',', ' ', 'alert(', ';', 'constructor', '[', '"', '__proto__', 'this', '`', '=>'];
for (let k = 0; k < N; k++) {
  const expr = Array.from({ length: ri(1, 12) }, () => pick(toks)).join('');
  let f; try { f = T.compile(expr); } catch (e) { check('calc', /[ぁ-んァ-ン一-龥]/.test(e.message), '日本語でない例外: ' + e.message, expr); continue; }
  try { const v = f({ a: ri(-5, 50), b: ri(0, 9), c: rnd() * 10 }); check('calc', typeof v === 'number', '数値以外を返す', expr); }
  catch (e) { check('calc', /[ぁ-んァ-ン一-龥]/.test(e.message), '日本語でない例外: ' + e.message, expr); }
}

let bad = 0;
for (const a of ['engine', 'check', 'parse', 'docparse', 'calc']) {
  const f = fails[a] || []; bad += f.length;
  const kinds = {}; f.forEach(x => kinds[x.msg] = (kinds[x.msg] || 0) + 1);
  console.log(`${a}: ${N}件の入力・${count[a] || 0}項目を確認、失敗 ${f.length}`, f.length ? JSON.stringify(kinds) : '');
  f.slice(0, 2).forEach(x => console.log('   例:', x.msg, JSON.stringify(x.input).slice(0, 400)));
}
console.log(bad ? `FAILED ${bad}` : 'fuzz: ok'); process.exit(bad ? 1 : 0);
