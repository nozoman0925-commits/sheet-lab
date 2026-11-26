/*
 * プロワン式の見直し（2026-11-26）を、画面を実際に操作して確かめる
 *   明細を表のまま直す・手入力の行・行を広げて細かいもの・全画面・合計のバー・消費税の切り替え・
 *   工事の工程の帯と収支・見積の作り方の入口（過去の見積から）・件名の自動作成
 *   node oubi/tools/build-web.js .web-test --artifact && node oubi/tests/web-sheet.js
 */
const { chromium } = require('playwright'); const openWeb = require('./_web'); const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, '..', 'screenshots', 'sheet'); fs.mkdirSync(OUT, { recursive: true });
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const go = async (p, h, ms) => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(ms || 1500); };
const O = 'OUBI_LINK.frame().contentWindow.OUBI';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await openWeb(b, { context: ctx, wait: 3500, old: true }); await p.waitForTimeout(1500);
  p.on('pageerror', e => errs.push(e.message));
  const ids = await p.evaluate(o => {
    const x = eval(o), S = EE.S, c = x.makeCase({ customer: '宮本 太郎', tel: '090-0000-0000' }); c.work.title = '宮本様邸 外構工事'; x.touch(c);
    const it = S.items.filter(i => i.category === 'gaikou' && i.unitCost > 0).slice(0, 3);
    const d = EE.data.newEstimate(S, { projectId: c.id, customerId: 'cus_' + c.id, title: '宮本様邸 外構工事', category: 'gaikou' });
    it.forEach((i, k) => d.lines.push(EE.data.lineFromItem(i, k + 1))); S.documents.push(d); EE.ui.commit(); return { c: c.id, d: d.id };
  }, O);
  await p.waitForTimeout(2000);
  await go(p, '#/edit/' + ids.d, 2000);

  /* 表のまま直す */
  const r0 = await p.evaluate(() => EE.ui.calcDoc(EE.views.editor.current()).subtotal);
  const price = await p.$('#line-body tr.ln .c-price');
  await price.click({ clickCount: 3 }); await p.keyboard.type('20000'); await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({ l: EE.views.editor.current().lines[0], amt: document.querySelector('#line-body tr.ln [data-amt]').textContent, sb: document.querySelector('[data-sb="subtotal"]').textContent }));
  ok(after.l.unitPrice === 20000 && /¥20,000|¥[\d,]+/.test(after.amt) && after.sb !== '¥' + r0.toLocaleString(), '表のまま単価を直すと、その行の金額と下の合計がすぐ変わる（' + after.amt + '）');
  await p.keyboard.press('Tab'); await p.waitForTimeout(200);
  ok(/20,000/.test(await p.inputValue('#line-body tr.ln .c-price')), '単価の欄は離れると 3桁区切り（20,000）');
  ok(/マスタ単価 .* と違います/.test(await p.textContent('#line-body tr.ln')), 'マスタと違う単価にした行には印（マスタの単価に戻せる）');
  const cost = await p.$('#line-body tr.ln .c-cost'); await cost.click({ clickCount: 3 }); await p.keyboard.type('5000'); await p.waitForTimeout(300);
  const prof = await p.textContent('#line-body tr.ln [data-prof]');
  ok(/¥15,000/.test(prof) && /75%/.test(prof), '原価を直すと、その行の粗利と粗利率が出る（' + prof + '）');
  // Enter で下の行の同じ列へ
  await p.focus('#line-body tr.ln .c-price'); await p.keyboard.press('Enter');
  ok(await p.evaluate(() => document.activeElement === document.querySelectorAll('#line-body tr.ln .c-price')[1]), 'Enter で下の行の同じ列へ（表計算のように）');
  // 手入力の行
  await p.click('[data-act="add-manual"]'); await p.waitForTimeout(300);
  await p.keyboard.type('既存物置の移設'); await p.waitForTimeout(100);
  const man = await p.evaluate(() => { const L = EE.views.editor.current().lines, l = L[L.length - 1]; return { name: l.name, manual: l.manual, err: EE.ui.checkDoc(EE.views.editor.current()).some(x => x.code === 'line-no-item') }; });
  ok(man.name === '既存物置の移設' && man.manual && !man.err, '表の下から手入力の行を足せる（マスタになくても要修正にしない）');
  // 行を広げる
  await p.click('#line-body tr.ln [data-act="open"]'); await p.waitForTimeout(300);
  await p.fill('[data-detail] .d-memo', '搬入は午前中'); await p.dispatchEvent('[data-detail] .d-memo', 'input');
  await p.fill('[data-detail] .d-supplier', '〇〇エクステリア'); await p.dispatchEvent('[data-detail] .d-supplier', 'input');
  const det = await p.evaluate(() => EE.views.editor.current().lines[0]);
  ok(det.memo === '搬入は午前中' && det.supplier === '〇〇エクステリア', '行を広げて、規格・税・お客様向けの説明・社内メモ・発注先を直せる');
  const sheet0 = await p.evaluate(() => EE.print.sheetHTML(EE.views.editor.current()));
  ok(!/搬入は午前中/.test(sheet0), '社内メモは PDF に載らない');
  // 合計のバー
  const sb = await p.evaluate(() => ['subtotal', 'tax', 'discount', 'total', 'cost', 'profit'].map(k => document.querySelector('[data-sb="' + k + '"]').textContent));
  ok(sb.every(Boolean) && await p.isVisible('.ed-sumbar'), '表の下に、小計・消費税・値引き・合計・原価・粗利のバー（' + sb.join(' / ') + '）');
  // 全画面
  await p.click('[data-act="full"]'); await p.waitForTimeout(300);
  const full = await p.evaluate(() => ({ on: document.body.classList.contains('ed-full'), side: getComputedStyle(document.querySelector('.sidebar')).display, w: document.querySelector('.sheet-lines').getBoundingClientRect().width }));
  ok(full.on && full.side === 'none' && full.w > 1500, '全画面で編集：明細が画面いっぱい（' + Math.round(full.w) + 'px）');
  await p.screenshot({ path: path.join(OUT, 'full.png') });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  if (await p.evaluate(() => document.body.classList.contains('ed-full'))) await p.click('[data-act="full"]');
  ok(!(await p.evaluate(() => document.body.classList.contains('ed-full'))), '全画面を戻せる');
  const noScroll = await p.evaluate(() => { const t = document.querySelector('#sec-lines .table-scroll'); return t.scrollWidth <= t.clientWidth + 2; });
  ok(noScroll, '1920 の画面で、明細の表に横スクロールが出ない');
  await p.screenshot({ path: path.join(OUT, 'sheet.png') });

  /* 消費税の切り替え */
  await p.evaluate(() => { const b = document.querySelector('.ed-pane [data-pane="header"]'); if (b) b.click(); }); await p.waitForTimeout(300);
  await p.click('[data-taxmode="incl"]'); await p.waitForTimeout(300);
  const inc = await p.evaluate(() => { const r = EE.ui.calcDoc(EE.views.editor.current()), sum = EE.views.editor.current().lines.reduce((s, l) => s + Math.round(l.qty * l.unitPrice), 0); return { total: r.total, sum, mode: document.querySelector('[data-sb="mode"]').textContent }; });
  ok(inc.total === inc.sum && /内税/.test(inc.mode), '税込で入れる（内税）：合計＝明細の合計（' + inc.total + '）');
  await p.click('[data-taxmode="none"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => EE.ui.calcDoc(EE.views.editor.current()).tax === 0), '消費税なし：消費税 0');
  ok(/消費税はかかりません/.test(await p.evaluate(() => EE.print.sheetHTML(EE.views.editor.current()))), '消費税なしは PDF にも書く');
  await p.click('[data-taxmode="excl"]'); await p.waitForTimeout(200);
  // 件名の自動作成
  await p.click('[data-act="auto-title"]'); await p.waitForTimeout(200);
  const ti = await p.inputValue('[data-f="title"]');
  ok(/宮本 太郎 様／外構工事／$|宮本 太郎 様／.*／$/.test(ti), '件名を「お客様／工事の種類／」で作る（' + ti + '）');
  await p.click('[data-act="save"]'); await p.waitForTimeout(800);

  /* 工事の工程の帯と収支 */
  await go(p, '#/o/case/' + ids.c, 2500);
  const fr = p.frames().find(f => /oubi\.html/.test(f.url()));
  const band = await fr.evaluate(() => { const b = document.querySelector('.case-band'); return b && { steps: [...b.querySelectorAll('.cb-step b')].map(x => x.textContent).join('→'), done: b.querySelectorAll('.cb-step.done').length, now: (b.querySelector('.cb-step.now b') || {}).textContent, money: b.querySelector('.cb-money').textContent }; });
  ok(band && /受付→現地調査→見積作成→見積提出→受注→発注・手配→施工→完了→請求→入金/.test(band.steps), '工事の上に工程の帯（受付→…→入金）');
  ok(band && band.now === '見積提出', '今の段（見積を作ったので、次は「見積提出」）');
  ok(band && /見積（税抜）/.test(band.money) && /粗利率/.test(band.money), '工事の収支（見積・請求・入金・原価・粗利・粗利率）を集めて出す');
  await p.screenshot({ path: path.join(OUT, 'case-band.png') });
  await fr.evaluate(() => { const o = window.OUBI, c = o.cases().find(x => x.id === C.id); c.result = { status: 'lost', reason: '金額が高い' }; o.touch(c); render(); }); await p.waitForTimeout(600);
  ok(await fr.evaluate(() => /失注/.test(document.querySelector('.case-band .cb-step.lost').textContent)), '見送りにした工事は、その段で「失注」と止まる');

  /* 見積の作り方の入口 */
  await go(p, '#/w/1', 1200);
  await p.evaluate(() => EE.views.wizard.reset()); await go(p, '#/w/1', 800);
  await p.click('[data-pj="' + ids.c + '"]'); await p.waitForTimeout(300); await p.click('[data-wz="next"]'); await p.waitForTimeout(1000);
  const modes = await p.$$eval('[data-mode] b', els => els.map(e => e.textContent).join('・'));
  ok(modes === 'テンプレートから・過去の見積から・マイ型から・概算で作る・文章で書く・手動で入れる', '作り方の入口：' + modes);
  await p.click('[data-mode="past"]'); await p.waitForTimeout(300); await p.click('[data-past]'); await p.waitForTimeout(300);
  await p.click('[data-wz="next"]'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => EE.S.documents.some(d => /過去の見積/.test(d.sourceLabel || '') && d.lines.length > 0)), '過去の見積から：明細を写して新しい見積を作る');
  await p.screenshot({ path: path.join(OUT, 'wizard-past.png') });

  /* スマホ */
  const m = await openWeb(b, { viewport: { width: 390, height: 844 }, old: true, wait: 3500 });
  m.on('pageerror', e => errs.push('スマホ: ' + e.message));
  const did = await m.evaluate(() => EE.S.documents.find(x => x.status !== 'issued' && x.lines.length > 2).id);
  await m.evaluate(h => { location.hash = h; }, '#/edit/' + did); await m.waitForTimeout(2000);
  const mrow = await m.evaluate(() => { const tr = document.querySelector('#line-body tr.ln'), n = tr.querySelector('.c-name').getBoundingClientRect(), a = tr.querySelector('[data-amt]').getBoundingClientRect(); return { nw: n.width, aw: a.width, right: a.right <= innerWidth }; });
  ok(mrow.nw > 150 && mrow.aw > 40 && mrow.right, 'スマホ：1行を2段に（項目は広く、数量と金額は下の段）');
  await m.click('#line-body tr.ln [data-act="open"]'); await m.waitForTimeout(300);
  ok(await m.isVisible('[data-detail] .c-price'), 'スマホ：行を広げて単価・原価を直す');
  await m.screenshot({ path: path.join(OUT, 'sheet-mobile.png') });

  ok(!errs.length, 'エラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  await b.close();
  console.log(fail ? '\nweb-sheet: ' + fail + ' 件失敗' : '\nweb-sheet: ok'); process.exit(fail ? 1 : 0);
})();
