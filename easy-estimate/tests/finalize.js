/*
 * 送った見積を固定する（PDF出力＝確定）の確認（Playwright が必要）
 *   node easy-estimate/tests/finalize.js
 */
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
const signedIn = require('./_signed-in');
const BASE = 'file://' + path.join(__dirname, '..', 'index.html') + '?splash=off';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = signedIn(await b.newPage({ viewport: { width: 1440, height: 900 } }));
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const ok = (c, m) => { assert.ok(c, m); console.log('✓ ' + m); };
  await p.goto(BASE + '#/home'); await p.waitForTimeout(900);
  await p.evaluate(() => { window.__prints = 0; window.print = () => { window.__prints++; }; });

  // 1) 下書き → PDF → 「確定してPDFとして保存」→ 確定される
  const draftId = await p.evaluate(() => EE.S.documents.find(d => d.status !== 'issued' && d.title.includes('トイレ') && d.patternLabel === 'A案').id);
  await p.evaluate(id => location.hash = '#/edit/' + id, draftId); await p.waitForTimeout(800);
  await p.evaluate(() => { const d = EE.ui.findDoc(location.hash.split('/').pop()); d.validUntil = EE.data.addDays(EE.data.today(), 30); EE.ui.commit(); }); // 期限切れの指摘を消す
  await p.reload(); await p.evaluate(() => { window.__prints = 0; window.print = () => { window.__prints++; }; }); await p.waitForTimeout(900);
  await p.click('[data-act="pdf"]'); await p.waitForTimeout(500);
  const go = await p.$('.modal [data-go]'); if (go) { await go.click(); await p.waitForTimeout(600); }
  const label = await p.textContent('.modal [data-print]');
  ok(/確定してPDF/.test(label), '下書きのプレビューのボタンは「確定してPDFとして保存」');
  await p.click('.modal [data-print]'); await p.waitForTimeout(400);
  await p.click('.modal [data-ok]'); await p.waitForTimeout(800);
  const st = await p.evaluate(id => { const d = EE.ui.findDoc(id); return { status: d.status, snap: !!d.snap, name: d.snap && d.snap.customer.name, hist: d.history.map(h => h.action), prints: window.__prints }; }, draftId);
  ok(st.status === 'issued' && st.snap, 'PDFを出すと確定され、宛名などの写しが残る');
  ok(st.prints === 1 && st.hist.includes('発行確定') && st.hist.includes('PDF出力'), '確定のあとに印刷され、履歴に残る');

  // 2) 確定後に顧客名・自社住所を変えても、PDF は送ったときのまま
  const before = await p.evaluate(id => EE.print.sheetHTML(EE.ui.findDoc(id)), draftId);
  await p.evaluate(id => { const d = EE.ui.findDoc(id); const c = EE.ui.findCustomer(d.customerId); c.name = '別の名前に変更'; EE.S.company.address = '別の住所に変更'; EE.ui.commit(); }, draftId);
  const after = await p.evaluate(id => EE.print.sheetHTML(EE.ui.findDoc(id)), draftId);
  ok(after === before && !after.includes('別の名前に変更') && !after.includes('別の住所に変更'), '確定後に顧客・自社情報を変えても、PDFは変わらない');
  const draftHtml = await p.evaluate(() => EE.print.sheetHTML(EE.S.documents.find(d => d.status !== 'issued' && d.customerId)));
  ok(draftHtml.includes('別の住所に変更'), '下書きのPDFは今の自社情報で作る');

  // 3) 要修正のある下書きは確定できない
  const r3 = await p.evaluate(() => { const d = EE.data.newEstimate(EE.S, { title: '宛先なし' }); d.lines = [EE.data.lineFromItem(EE.S.items[0], 1)]; EE.S.documents.push(d); const r = EE.app.finalizeDoc(d); return { r, status: d.status }; });
  ok(!r3.r.ok && r3.status !== 'issued', '要修正（宛先なし）の下書きは確定できない');

  // 4) PDFを出したことのある書類は削除できない（以前の版のデータ）
  await p.evaluate(() => { const d = EE.S.documents.find(x => x.title === '宛先なし'); d.history.push({ at: new Date().toISOString(), action: 'PDF出力' }); EE.ui.commit(); });
  await p.evaluate(() => location.hash = '#/docs'); await p.waitForTimeout(800);
  const n0 = await p.evaluate(() => EE.S.documents.length);
  await p.evaluate(() => { const d = EE.S.documents.find(x => x.title === '宛先なし'); const b = document.querySelector('[data-act="del"][data-id="' + d.id + '"]'); if (b) b.click(); });
  await p.waitForTimeout(500);
  ok((await p.evaluate(() => EE.S.documents.length)) === n0, 'PDFを出したことのある書類は削除できない');

  // 5) すべて削除しても、確定済みの書類は残り、PDFは写しで作れる
  const issued0 = await p.evaluate(() => EE.S.documents.filter(d => d.status === 'issued').length);
  await p.evaluate(() => location.hash = '#/settings/data'); await p.waitForTimeout(800);
  await p.click('[data-act="wipe"]'); await p.waitForTimeout(400); await p.click('.modal [data-ok]'); await p.waitForTimeout(800);
  const w = await p.evaluate(id => ({ n: EE.S.documents.length, issued: EE.S.documents.every(d => d.status === 'issued'), cust: EE.S.customers.length, html: EE.print.sheetHTML(EE.ui.findDoc(id)) }), draftId);
  ok(w.n >= issued0 && w.issued && w.cust === 0, 'すべて削除しても確定済み・PDFを出した書類は残る（顧客は消える）');
  ok(w.html === before, '顧客を消した後も、確定した書類のPDFは送ったときと同じ');
  await p.evaluate(() => location.hash = '#/docs'); await p.waitForTimeout(800);
  const rowTxt = await p.evaluate(id => (document.querySelector('tr[data-pick="' + id + '"]') || {}).textContent || '', draftId);
  ok(/山田/.test(rowTxt), '書類一覧でも確定時の宛名が出る');

  console.log(errs.length ? 'ERRORS: ' + errs.join(' / ') : 'finalize: ok'); await b.close();
  if (errs.length) process.exit(1);
})();
