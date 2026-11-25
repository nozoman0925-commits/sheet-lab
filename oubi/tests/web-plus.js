/*
 * 桜ミツ版の12の追加（2026-11-25）を、画面を実際に操作して確かめる
 *   node oubi/tools/build-web.js .web-test && node oubi/tests/web-plus.js
 */
const { chromium } = require('playwright'); const openWeb = require('./_web'); const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, '..', 'screenshots', 'plus'); fs.mkdirSync(OUT, { recursive: true });
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const go = async (p, h, ms) => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(ms || 1500); };
const O = 'OUBI_LINK.frame().contentWindow.OUBI';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await openWeb(b, { context: ctx, wait: 3500, old: true }); await p.waitForTimeout(1500);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|net::/.test(m.text())) errs.push(m.text()); });
  await p.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; window.__printHTML = document.getElementById('print-root').innerHTML; }; });
  // 見積の段階の工事に、確定した見積を1通ずつ（提出・請求・発注用と、失注用）
  const ids = await p.evaluate(o => {
    const x = eval(o), S = EE.S, mk = (name) => { const c = x.makeCase({ customer: name + ' 太郎', tel: '090-0000-0000', addr: '町田市森野1-1' }); c.work.title = name + '様邸 外構工事'; x.touch(c); return c.id; };
    const c1 = mk('宮本'), c2 = mk('佐藤');
    const it = S.items.filter(i => i.unitCost > 0).slice(0, 4);
    const doc = (cid, title) => { const d = EE.data.newEstimate(S, { projectId: cid, customerId: 'cus_' + cid, title, category: 'gaikou' }); it.forEach((i, k) => d.lines.push(EE.data.lineFromItem(i, k + 2))); S.documents.push(d); return d; };
    const d1 = doc(c1, '宮本様邸 外構工事'), d2 = doc(c2, '佐藤様邸 外構工事');
    [d1, d2].forEach(d => { d.status = 'issued'; d.issuedAt = new Date(Date.now() - 3 * 864e5).toISOString(); d.rules = { lineRounding: S.settings.lineRounding, taxRounding: S.settings.taxRounding }; d.snap = EE.data.snapOf(S, d); });
    EE.ui.commit(); return { c1, c2, d1: d1.id, d2: d2.id };
  }, O);
  await p.waitForTimeout(2500);

  // ---- 1 次の一手 ----
  await go(p, '#/home', 2000);
  ok(await p.isVisible('.nextup'), '1 ホームの一番上に「次の一手」');
  ok(/提出の記録なし|返事待ち|入金待ち|見積作成中/.test(await p.textContent('.nextup')), '1 次の一手に、いちばん急ぐ1件とその理由（' + (await p.textContent('.nextup .nx-tag')) + '）');

  // ---- 2 提出の記録 ----
  await go(p, '#/edit/' + ids.d1, 2000);
  ok(await p.isVisible('.plus-bar'), '2 確定した見積に「提出を記録・請求書・発注書・失注」の帯');
  await p.click('.plus-bar [data-plus="sent"]'); await p.waitForTimeout(400);
  await p.click('#sent-via [data-v="メール"]'); await p.click('.modal [data-ok]'); await p.waitForTimeout(1200);
  const sent = await p.evaluate(id => EE.S.documents.find(d => d.id === id).sent, ids.d1);
  ok(sent && sent.length === 1 && sent[0].via === 'メール', '2 提出した日と方法（メール）が見積に残る');
  ok(/提出 \d+\/\d+・メール/.test(await p.textContent('.plus-bar')), '2 帯に「提出 月/日・メール」');
  await p.evaluate(id => { const d = EE.S.documents.find(d => d.id === id); d.sent[0].date = EE.data.addDays(EE.data.today(), -8); EE.ui.commit(); }, ids.d1);
  await go(p, '#/home', 2000);
  const todo = await p.textContent('.widget[data-type="todo"]');
  ok(/提出から 8 日、返事待ち/.test(todo), '2 提出から3日たつと「今日やること」に返事待ち（8日）');
  ok(/返事待ち|提出の記録なし/.test(await p.textContent('.nextup')), '2 次の一手にも返事待ち・提出の記録なしが上がる');
  await p.screenshot({ path: path.join(OUT, 'home-next.png') });

  // ---- 3 請求書 ----
  await go(p, '#/edit/' + ids.d1, 2000);
  await p.click('.plus-bar [data-plus="invoice"]'); await p.waitForTimeout(500);
  await p.click('#inv-split [data-s="3"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(OUT, 'invoice-modal.png') });
  await p.click('.modal [data-ok]'); await p.waitForTimeout(1500);
  const inv = await p.evaluate(([id, o, cid]) => { const d = EE.S.documents.find(d => d.id === id), v = (EE.S.invoices || []).filter(v => v.docId === id), c = eval(o).cases().find(c => c.id === cid);
    return { n: v.length, sum: v.reduce((s, x) => s + x.amount, 0), total: EE.ui.calcDoc(d).total, labels: v.map(x => x.label + x.ratio).join(','), pays: (c.payments || []).filter(p => p.invId).length, printed: window.__printed, html: /御請求書/.test(window.__printHTML || '') }; }, [ids.d1, O, ids.c1]);
  ok(inv.n === 3 && inv.labels === '着手金30,中間金40,残金30', '3 着手金・中間金・残金の3枚（' + inv.labels + '）');
  ok(inv.sum === inv.total, '3 3枚の合計が見積の合計と1円もずれない（' + inv.sum + ' = ' + inv.total + '）');
  ok(inv.pays === 3, '3 工事の「入金」にも3行入る（入金待ち・遅延の知らせが効く）');
  ok(inv.printed >= 1 && inv.html, '3 請求書をPDFにする（御請求書）');

  // ---- 7 発注書 ----
  await p.evaluate(() => { EE.S.items.filter(i => i.unitCost > 0).slice(0, 2).forEach(i => { i.supplier = '町田建材'; }); EE.ui.commit(); });
  await go(p, '#/edit/' + ids.d1, 1800);
  await p.click('.plus-bar [data-plus="order"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, 'order-modal.png') });
  await p.evaluate(() => document.querySelectorAll('.modal [data-g]').forEach(x => { x.checked = true; }));
  await p.click('.modal [data-ok]'); await p.waitForTimeout(1200);
  const po = await p.evaluate(id => { const d = EE.S.documents.find(d => d.id === id), os = (EE.S.orders || []).filter(o => o.docId === id);
    const cost = d.lines.reduce((s, l) => s + Math.round(l.unitCost * l.qty), 0); return { n: os.length, sup: os.map(o => o.supplier).join(','), sum: os.reduce((s, o) => s + o.total, 0), cost, html: /発注書/.test(window.__printHTML || '') && !/御見積金額/.test(window.__printHTML || '') }; }, ids.d1);
  ok(po.n >= 2 && /町田建材/.test(po.sup), '7 仕入先ごとに発注書（' + po.sup + '）');
  ok(po.sum === po.cost && po.html, '7 発注書の金額は原価の合計と同じ・売値は載らない');

  // ---- 4 失注 ----
  await go(p, '#/edit/' + ids.d2, 1800);
  await p.click('.plus-bar [data-plus="lost"]'); await p.waitForTimeout(400);
  ok(!(await p.isEnabled('.modal [data-ok]')), '4 理由を選ぶまで「失注にする」は押せない');
  await p.click('.lost-reasons [data-r="金額が高い"]'); await p.click('.modal [data-ok]'); await p.waitForTimeout(1500);
  const lost = await p.evaluate(([o, cid]) => { const c = eval(o).cases().find(c => c.id === cid); return c.result; }, [O, ids.c2]);
  ok(lost.status === 'lost' && lost.reason === '金額が高い' && lost.lostDate, '4 工事が「見送り」になり、理由と日付が残る');
  const st = await p.evaluate(() => EE.plus.lostStats());
  ok(st.some(x => x[0] === '金額が高い' && x[1] >= 1), '4 失注の理由の傾向に入る（' + st.map(x => x.join(' ')).join('・') + '）');
  await go(p, '#/finance', 1800);
  ok(/失注の理由/.test(await p.textContent('#view')), '4 経営の画面に「失注の理由」');

  // ---- 6 工事の種類ごとの下限 ----
  await go(p, '#/settings/rules', 1500);
  await p.fill('[data-cat-margin="gaikou"]', '60'); await p.click('[data-act="save-rules"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => EE.S.settings.minMarginByCat.gaikou === 0.6), '6 設定に工事の種類ごとの下限（外構 60%）');
  const d3 = await p.evaluate(() => { const S = EE.S, d = EE.data.newEstimate(S, { title: '外構の下書き', category: 'gaikou' }); S.items.filter(i => i.category === 'gaikou').slice(0, 3).forEach(i => d.lines.push(EE.data.lineFromItem(i, 3))); S.documents.push(d); EE.ui.commit(); return d.id; });
  await go(p, '#/edit/' + d3, 1800);
  ok(/下限 60%（外構工事の下限）/.test(await p.textContent('#min-margin-hint')), '6 見積の画面で、外構の下限60%で判定');
  ok(await p.evaluate(id => EE.ui.checkDoc(EE.S.documents.find(d => d.id === id)).some(c => /下限 60%/.test(c.msg || c.text || JSON.stringify(c))), d3), '6 送信前チェックも外構の下限で注意');

  // ---- 9 数量ごとの検索入力 ----
  const code = await p.evaluate(() => EE.S.items.find(i => i.active !== false).code);
  const n0 = await p.evaluate(id => EE.S.documents.find(d => d.id === id).lines.length, d3);
  await p.evaluate(() => { const b = document.querySelector('.ed-pane [data-pane="lines"]'); if (b) b.click(); });
  await p.click('#pick'); await p.keyboard.type(code + ' 12'); await p.waitForTimeout(300);
  ok(/数量 12 で追加/.test(await p.textContent('#pick-pop')), '9 検索欄の終わりの数字を数量として読む（「' + code + ' 12」）');
  await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  const last = await p.evaluate(() => { const d = EE.views.editor.current(); return { n: d.lines.length, q: d.lines[d.lines.length - 1].qty, focus: document.activeElement.id }; });
  ok(last.n === n0 + 1 && last.q === 12 && last.focus === 'pick', '9 Enter で数量12の行が入り、検索欄のまま次を打てる');

  // ---- 8 寸法 ----
  await p.click('[data-line] [data-act="calc"]'); await p.waitForTimeout(400);
  await p.selectOption('#ct-f', 'f_fence'); await p.waitForTimeout(200);
  for (const [k, v] of [['a', '5'], ['b', '3'], ['c', '0'], ['d', '0']]) await p.fill('[data-in="' + k + '"]', v);
  await p.waitForTimeout(200); await p.click('.modal [data-ok]'); await p.waitForTimeout(500);
  const dm = await p.evaluate(() => { const d = EE.views.editor.current(); return { dims: d.dims, q: d.lines[0].qty, calc: d.lines[0].calc }; });
  ok(dm.q === 8 && dm.dims && dm.dims.a === 5 && dm.calc && dm.calc.f === 'f_fence', '8 計算で入れた寸法が見積に残る（区間1 5m＋区間2 3m＝8m）');
  await p.click('[data-plus="dims"]'); await p.waitForTimeout(400);
  await p.fill('[data-dim="a"]', '7'); await p.click('.modal [data-ok]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => EE.views.editor.current().lines[0].qty) === 10, '8 寸法を直して「計算し直す」と数量が変わる（8m → 10m）');

  // ---- 10 写真付き ----
  const png = path.join(OUT, '_sample.png');
  await p.screenshot({ path: png, clip: { x: 300, y: 200, width: 400, height: 300 } });
  await p.evaluate(([id, cid]) => { const d = EE.views.editor.current(); d.projectId = cid; d.customerId = 'cus_' + cid; }, [d3, ids.c1]);
  await p.click('[data-plus="photos"]'); await p.waitForTimeout(500);
  await p.setInputFiles('#ph-in', png); await p.waitForTimeout(1800);
  await p.fill('[data-cap="0"]', '施工前・南側'); await p.click('.modal [data-ok]'); await p.waitForTimeout(400);
  await p.click('[data-act="save"]'); await p.waitForTimeout(800);
  const ph = await p.evaluate(id => (EE.S.documents.find(d => d.id === id).photos || []), d3);
  ok(ph.length === 1 && ph[0].caption === '施工前・南側', '10 写真と説明が見積に付く');
  ok(await p.evaluate(([o, cid]) => (eval(o).cases().find(c => c.id === cid).photos || []).some(x => x.cat === '見積用'), [O, ids.c1]), '10 足した写真は工事の写真にも入る');
  const pv = await p.evaluate(async id => { const d = EE.S.documents.find(d => d.id === id); await EE.plus.preparePhotos([d]); return EE.print.sheetHTML(d); }, d3);
  ok(/photo-sheet/.test(pv) && /blob:/.test(pv) && /施工前・南側/.test(pv), '10 見積書PDFの最後のページに写真と説明');

  // ---- 5 まとめて改定 ----
  const before = await p.evaluate(() => { const it = EE.S.items.find(i => /フェンス/.test(i.name) && i.active !== false); return { id: it.id, p: it.unitPrice, c: it.unitCost }; });
  await go(p, '#/settings/items', 1500);
  await p.click('[data-plus="reprice"]'); await p.waitForTimeout(500);
  await p.fill('.modal [data-k="q"]', 'フェンス'); await p.fill('.modal [data-k="pct"]', '10'); await p.waitForTimeout(300);
  ok(/下書きの見積（\d+件/.test(await p.textContent('#rp-draft-t')), '5 影響する下書きの見積の件数が出る');
  await p.screenshot({ path: path.join(OUT, 'reprice-modal.png') });
  await p.click('.modal [data-ok]'); await p.waitForTimeout(800);
  const after = await p.evaluate(id => { const it = EE.S.items.find(i => i.id === id); return { p: it.unitPrice, c: it.unitCost, h: (it.priceHistory || []).slice(-1)[0] }; }, before.id);
  ok(after.p === Math.round(before.p * 1.1 / 10) * 10 && after.c === Math.round(before.c * 1.1 / 10) * 10 && after.h && after.h.from === await p.evaluate(() => EE.data.today()), '5 単価・原価が10%上がり（10円単位）、価格の履歴に残る（' + before.p + ' → ' + after.p + '）');
  ok(await p.evaluate(([id, pr]) => EE.S.documents.filter(d => d.status !== 'issued').some(d => d.lines.some(l => l.itemId === id && l.unitPrice === pr)), [before.id, after.p]), '5 下書きの見積の単価も新しくなる');
  ok(await p.evaluate(([id, pr]) => EE.S.documents.filter(d => d.status === 'issued').every(d => d.lines.every(l => l.itemId !== id || l.unitPrice !== pr)), [before.id, after.p]), '5 確定した見積の単価は変わらない');

  // ---- 11 バックアップの週1の声かけ ----
  await p.evaluate(() => { localStorage.setItem('oubi.backup.at', new Date(Date.now() - 9 * 864e5).toISOString()); localStorage.removeItem('oumitsu:backup-ask'); });
  await p.reload(); await p.waitForTimeout(9000);
  ok(/バックアップをしましょう/.test(await p.textContent('body')) && /最後のバックアップから 9 日/.test(await p.textContent('.modal')), '11 7日たつと、開いたときに声かけ（9日）');
  await p.click('.modal [data-c]'); await p.waitForTimeout(300);
  await go(p, '#/home', 1500);
  ok(await p.isVisible('[data-bk-now]'), '11 ホームの知らせのボタンから1押しで保存できる');

  console.log(errs.length ? 'ERRORS: ' + errs.join(' / ') : 'エラーなし');
  console.log(fail ? 'web-plus: ' + fail + ' 件失敗' : 'web-plus: ok'); await b.close();
  if (fail || errs.length) process.exit(1);
})();
