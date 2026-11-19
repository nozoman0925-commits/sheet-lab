/*
 * 業務管理 × 見積（桜ミツ）のつなぎの確認（Playwright が必要）
 *   python3 -m http.server 8765 --bind 127.0.0.1   （リポジトリの最上位で）
 *   node oubi/tests/integration.js
 * 本番の Supabase にはつながない（tests/mock-supa.js のまねを使う）。
 */
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path'); const fs = require('fs');
const open = require('./_open');
const OUT = path.join(__dirname, '..', 'screenshots') + '/'; fs.mkdirSync(OUT, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
function aCase(id, over) {
  return Object.assign({ id, no: 'OB-202611-00' + id.slice(-1), createdAt: new Date().toISOString(), createdBy: 'u_tester',
    lead: { date: today, customer: '山田 太郎', tel: '090-1111-2222', addr: '東京都町田市森野1-1-1', owner: 'u_tester', priority: '中', contacts: [] },
    work: { title: '山田様邸 外壁塗装工事', types: ['外壁塗装工事'] }, plan: {}, quote: { files: [], items: [{ name: '外壁塗装（シリコン）', qty: 100, unit: '㎡', price: 2500 }] },
    result: {}, schedule: { steps: [], prep: {}, changes: [] }, contract: { files: [] }, complete: { checks: {} }, invoice: { files: [] },
    payments: [], vendors: [], reports: [], photos: [], actual: {}, log: [] }, over || {});
}
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ok = (c, m) => { assert.ok(c, m); console.log('✓ ' + m); };
  const seed = { cases: { c1: aCase('c1'), c2: aCase('c2', { lead: { date: today, customer: '山田 太郎', tel: '090-1111-2222', addr: '東京都町田市森野1-1-1', owner: 'u_tester' }, work: { title: '山田様邸 屋根工事', types: ['屋根工事'] }, quote: { files: [] } }),
    c3: aCase('c3', { lead: { date: today, customer: '佐藤 花子', tel: '090-3333-4444', addr: '相模原市', owner: 'u_tester' }, work: { title: '佐藤様邸 内装', types: ['内装リフォーム工事'] }, quote: { files: [] } }) } };
  const p = await open(b, { seed, wait: 2500 });
  p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' '))); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  const db = () => p.evaluate(() => JSON.parse(localStorage.getItem('mock.db')));

  // 顧客・現場は工事から
  const st = await p.evaluate(() => ({ cu: EE.S.customers.map(c => c.name), pj: EE.S.projects.map(x => x.id + ':' + x.name), me: EE.S.currentMemberId, members: EE.S.members.map(m => m.name) }));
  ok(st.cu.length === 2 && st.cu.includes('山田 太郎') && st.cu.includes('佐藤 花子'), '顧客は工事から作る（同じ名前・電話の工事は1人にまとめる）');
  ok(st.pj.length === 3, '現場（案件）は工事1件ずつ');
  ok(st.me === 'u_tester' && st.members.includes('テスト太郎'), '担当者は業務管理の社員と同じ');

  // 工事の「見積と利益」から見積を作る（前の明細を読み込む）
  await p.evaluate(() => OUBI.openCase('c1', 'quote')); await p.waitForTimeout(600);
  ok(/前に入れた明細/.test(await p.textContent('#main')), '見積がまだ無い工事には「見積を作る」の案内');
  await p.screenshot({ path: OUT + 'int-case-quote.png', fullPage: true });
  await p.click('[data-mnew]'); await p.waitForTimeout(1500);
  ok(/^#\/edit\//.test(await p.evaluate(() => location.hash)) && !(await p.evaluate(() => document.getElementById('ee-host').hidden)), '見積の編集画面が業務管理の中で開く');
  const doc = await p.evaluate(() => { const id = location.hash.split('/')[2]; return EE.S.documents.find(d => d.id === id); });
  ok(doc.projectId === 'c1' && doc.lines.length === 1 && doc.lines[0].unitPrice === 2500 && doc.lines[0].qty === 100, '前の明細（外壁塗装 100㎡ × 2,500円）を読み込む');
  await p.screenshot({ path: OUT + 'int-editor.png' });
  // 数量を変えて保存
  const qty = await p.$('[data-line] input.qty');
  if (!qty) { console.log(await p.evaluate(() => (document.querySelector('.editor tbody tr') || {}).outerHTML || 'no row')); }
  await qty.fill('120'); await qty.press('Tab'); await p.waitForTimeout(300);
  await p.click('#btn-save'); await p.waitForTimeout(1500);
  let d = await db();
  ok(Object.keys(d.mitsu_docs || {}).length === 1, '見積は共有の保存先に1通ずつ入る（mitsu_docs）');
  ok(d.mitsu && d.mitsu.master && d.mitsu.master.items.length > 10, '品目マスタなどは mitsu/master に入る');
  const c1 = d.cases.c1;
  ok(c1.quote.amount === 300000 && c1.quote.items[0].qty === 120 && c1.quote.mitsuDocId === doc.id, '保存すると工事の見積金額・明細に入る（120㎡ → 300,000円）');
  ok(c1.plan.estimate === 300000, '収支書の予定見積金額にも入る');

  // 工事の画面に戻ると見積が並ぶ
  await p.click('#tabs [data-tab="list"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => document.getElementById('ee-host').hidden && location.hash === ''), 'メニューで業務管理の画面に戻れる');
  await p.evaluate(() => OUBI.openCase('c1', 'quote')); await p.waitForTimeout(800);
  ok((await p.$$('.mq-row')).length === 1 && /300,000/.test(await p.textContent('#main')), '工事の「見積と利益」に見積と金額が出る');

  // 再読み込みしても残る
  await p.reload(); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => EE.S && EE.S.documents.length === 1), '再読み込みしても見積は残る');

  // 見積の画面で新しい顧客を作ると、工事（問い合わせ）ができる
  await p.evaluate(() => { location.hash = '#/clients'; }); await p.waitForTimeout(1200);
  const nb = await p.$('[data-act="new-c"]');
  if (nb) {
    await nb.click(); await p.waitForTimeout(500);
    await p.fill('.overlay [name="name"]', '鈴木 一郎'); await p.click('.overlay [data-s]'); await p.waitForTimeout(1500);
    d = await db();
    ok(Object.values(d.cases).some(c => ((c.lead || {}).company || (c.lead || {}).customer) === '鈴木 一郎'), '見積の画面で登録した顧客は、業務管理の工事（問い合わせ）になる');
  }

  // スマホ幅
  await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => { location.hash = '#/docs'; }); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + 'int-mobile-docs.png' });
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'スマホ幅でも横にはみ出さない（見積の一覧）');

  console.log(errs.length ? 'ERRORS: ' + errs.join(' / ') : 'integration: ok'); await b.close();
  if (errs.length) process.exit(1);
})();
