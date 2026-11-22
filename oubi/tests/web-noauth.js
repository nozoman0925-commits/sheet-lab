/*
 * 桜ミツ版：サインイン・アカウント作成をなくしたことの確認（node oubi/tests/web-noauth.js）
 *   1) 何もない端末で開くと、名前もログインも無しにホームが使える（名前の欄は小さく出るだけ）
 *   2) 工事の作成者に「自分の名前」が入り、名前を変えると次から新しい名前
 *   3) 版8で作った記録（工事・見積）が、変更後も同じ件数・内容で見える（営業の記録は、営業の機能をなくしたので消える）
 *   4) アカウント・パスワードの保存データが残らない
 *   5) 前の桜ミツ（easy-estimate:v1）＋アカウントからの引き継ぎ
 */
const { chromium } = require('playwright'); const assert = require('assert');
const openWeb = require('./_web');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ok = (c, m) => { assert.ok(c, m); console.log('✓ ' + m); };
  const watch = p => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); }); };
  const O = 'OUBI_LINK.frame().contentWindow.OUBI';
  const authLeft = p => p.evaluate(() => Object.keys(localStorage).filter(k => /^oumitsu:(auth|keep|lock)/.test(k)).concat(sessionStorage.getItem('oumitsu:session') ? ['session'] : []));

  // ---- 1) 何もない端末 ----
  let p = await openWeb(b, { name: '', wait: 3500 }); watch(p);
  ok(!(await p.$('.auth, #auth-card, form#f-signin, [type=password]')), 'ログイン画面・アカウント作成・パスワードの欄が無い');
  ok((await p.$$('#view .widget')).length >= 6, '開くとすぐホーム（ウィジェット）が使える');
  ok(await p.isVisible('.myname'), '名前が未設定なので、ホームの上に「名前を入れてください」が小さく出る');
  await p.click('.nav-item[data-nav="sites"]'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => document.body.classList.contains('ob-on')), '名前を入れなくても、ほかの画面は使える（ブロックしない）');
  await p.evaluate(() => { location.hash = '#/home'; }); await p.waitForTimeout(1500);
  await p.fill('.myname [data-myname]', '佐藤 一郎'); await p.click('.myname [data-myname-save]'); await p.waitForTimeout(1500);
  ok(!(await p.$('.myname')) && /佐藤 一郎/.test(await p.textContent('#side-user')), '名前を入れると欄が消え、左下に「自分の名前」が出る');

  // ---- 2) 作成者に自分の名前、名前を変えると新しい名前 ----
  await p.evaluate(o => { const x = eval(o); const c = x.makeCase({ customer: '山田 太郎' }); c.work.title = '山田様邸'; x.touch(c); }, O); await p.waitForTimeout(1200);
  const who1 = await p.evaluate(o => { const x = eval(o); const c = x.cases()[0]; return x.whoName(c.createdBy); }, O);
  ok(who1 === '佐藤 一郎', '工事を作ると、作成者に「自分の名前」が入る（' + who1 + '）');
  await p.evaluate(() => { location.hash = '#/settings/data'; }); await p.waitForTimeout(1500);
  ok(/自分の名前/.test(await p.textContent('#view')), '設定に「自分の名前」の欄');
  await p.fill('#my-name', '佐藤 一郎（営業）'); await p.click('[data-myname-save]'); await p.waitForTimeout(1500);
  await p.evaluate(o => { const x = eval(o); const c = x.makeCase({ customer: '鈴木 花子' }); c.work.title = '鈴木様邸'; x.touch(c); }, O); await p.waitForTimeout(1200);
  const who2 = await p.evaluate(o => { const x = eval(o); const c = x.cases().find(c => c.lead.customer === '鈴木 花子'); return x.whoName(c.createdBy); }, O);
  ok(who2 === '佐藤 一郎（営業）', '名前を変えると、次の工事から新しい名前（' + who2 + '）');
  ok((await authLeft(p)).length === 0, 'アカウント・パスワードの保存データは無い');
  await p.close();

  // ---- 3)・4) 版8で作った記録（アカウントあり）を引き継ぐ ----
  const t = new Date().toISOString();
  const kase = (id, name) => ({ id, no: 'OB-202611-00' + id.slice(-1), createdAt: t, createdBy: 'usr_v8', updatedBy: 'usr_v8', lead: { date: t.slice(0, 10), customer: name, owner: 'usr_v8', contacts: [] }, work: { title: name + '様邸', types: [] }, plan: {}, quote: { files: [], items: [] }, result: {}, schedule: { steps: [], prep: {}, changes: [] }, contract: { files: [] }, complete: { checks: {} }, invoice: { files: [] }, payments: [], vendors: [], reports: [], photos: [], actual: {}, log: [] });
  const v8 = {
    'oubi.ldb.cases': { c1: kase('c1', '山田'), c2: kase('c2', '佐藤'), c3: kase('c3', '鈴木') },
    'oubi.ldb.visits': { v1: { at: t, day: t.slice(0, 10), by: 'usr_v8', addr: '町田市森野1-1', result: 'absent' }, v2: { at: t, day: t.slice(0, 10), by: 'usr_v8', addr: '町田市森野1-2', result: 'talk' } },
    'oubi.ldb.staff': { usr_v8: { name: '青木 誠', createdAt: t, at: t } },
    'oubi.ldb.mitsu_docs': { d1: { id: 'd1', type: 'estimate', no: 'EST-202611-001', status: 'draft', projectId: 'c1', customerId: 'cus_c1', title: '山田様邸', issueDate: t.slice(0, 10), lines: [], adjustments: [], history: [], createdAt: t, updatedAt: t } }
  };
  const before = { cases: Object.keys(v8['oubi.ldb.cases']).length, visits: Object.keys(v8['oubi.ldb.visits']).length, docs: Object.keys(v8['oubi.ldb.mitsu_docs']).length };
  p = await openWeb(b, { v8, auth: [{ id: 'usr_v8', name: '青木 誠' }, { id: 'usr_v8b', name: '田中 次郎' }], session: 'usr_v8', wait: 4000 }); watch(p);
  const after = await p.evaluate(o => { const x = eval(o); const ls = k => Object.keys(JSON.parse(localStorage.getItem(k) || '{}')).length; return { cases: x.cases().length, visits: ls('oubi.ldb.visits'), docs: EE.S.documents.length, me: OUBI_LINK.me(), titles: x.cases().map(c => c.work.title).sort().join(','), creator: x.whoName(x.cases()[0].createdBy) }; }, O);
  console.log('   引き継ぎ（変更前 → 変更後）：工事 ' + before.cases + ' → ' + after.cases + '・営業の記録 ' + before.visits + ' → ' + after.visits + '・見積 ' + before.docs + ' → ' + after.docs);
  ok(after.cases === before.cases && after.docs === before.docs, '版8の記録（工事・見積）が同じ件数で見える');
  ok(after.visits === 0, '版8の営業の記録は、この端末から消えている（営業の機能はない）');
  ok(after.titles === '佐藤様邸,山田様邸,鈴木様邸' && after.creator === '青木 誠', '内容も同じ（工事名・作成者の名前）');
  ok(after.me.id === 'usr_v8' && after.me.name === '青木 誠', 'ログインしていた人（青木 誠）が「自分の名前」になる');
  ok((await authLeft(p)).length === 0, 'アカウント・パスワードの保存データは、引き継いだあと消えている');
  ok(await p.evaluate(o => eval(o).people().some(x => x.name === '田中 次郎'), O), 'ほかのアカウント（田中 次郎）は社員の名簿に残る');
  await p.reload(); await p.waitForTimeout(3500);
  ok(await p.evaluate(o => eval(o).cases().length === 3 && OUBI_LINK.me().name === '青木 誠', O), '開き直しても同じ（名前も記録もそのまま）');
  await p.close();

  // ---- 5) 前の桜ミツ（easy-estimate:v1）＋アカウント ----
  p = await openWeb(b, { old: true, auth: [{ id: 'usr_test', name: '青木 誠' }], session: 'usr_test', wait: 4500 }); watch(p);
  const mg = await p.evaluate(o => { const cs = eval(o).cases(); return { cases: cs.length, docs: EE.S.documents.length, cust: EE.S.customers.length, orphan: EE.S.documents.filter(d => !cs.some(c => c.id === d.projectId)).length, me: OUBI_LINK.me().name }; }, O);
  console.log('   前の桜ミツから（変更前 → 変更後）：案件 10 → 工事 ' + mg.cases + '・見積 12 → ' + mg.docs + '・顧客 3 → ' + mg.cust);
  ok(mg.cases === 10 && mg.docs === 12 && mg.cust === 3 && mg.orphan === 0 && mg.me === '青木 誠', '前の桜ミツの見積・顧客・案件と、アカウントの名前を引き継ぐ');
  ok((await authLeft(p)).length === 0, '（ここでもアカウントの保存データは残らない）');
  await p.close();

  console.log(errs.length ? 'ERRORS: ' + errs.join(' / ') : 'web-noauth: ok'); await b.close();
  if (errs.length) process.exit(1);
})();
