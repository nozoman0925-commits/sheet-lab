/*
 * 改訂版（2026-11-26）の改善を、画面を実際に操作して確かめる
 *   node oubi/tools/build-web.js .web-test --artifact && node oubi/tests/web-revise.js
 *   第1群：発行前チェック・請求と状態の連動・期限の見出し・原価が空の粗利率・スマホの件名
 *   第2群：数字の動き・ピル・折れ線・並べ替え・主役の数字・アラート
 *   第3〜5群：圏外・見せるモード・最近の3件・バッジ・成約の演出・発行直後・ミスの型
 */
const { chromium } = require('playwright'); const openWeb = require('./_web'); const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, '..', 'screenshots', 'revise'); fs.mkdirSync(OUT, { recursive: true });
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const go = async (p, h, ms) => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(ms || 1500); };
const closeModals = p => p.evaluate(() => { let t; while ((t = EE.ui.topModal())) t.close(); });
const O = 'OUBI_LINK.frame().contentWindow.OUBI';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await openWeb(b, { context: ctx, wait: 3500, old: true }); await p.waitForTimeout(1500);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|net::/.test(m.text())) errs.push(m.text()); });
  await p.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  const ids = await p.evaluate(o => {
    const x = eval(o), S = EE.S, mk = (name) => { const c = x.makeCase({ customer: name + ' 太郎', tel: '090-0000-0000', addr: '町田市森野1-1' }); c.work.title = name + '様邸 外構工事'; x.touch(c); return c.id; };
    const c1 = mk('宮本'), c2 = mk('佐藤');
    const it = S.items.filter(i => i.unitCost > 0 && !/撤去/.test(i.name)).slice(0, 4);
    const doc = (cid, title) => { const d = EE.data.newEstimate(S, { projectId: cid, customerId: 'cus_' + cid, title, category: 'gaikou' }); it.forEach((i, k) => d.lines.push(EE.data.lineFromItem(i, k + 2))); S.documents.push(d); return d; };
    const d1 = doc(c1, '宮本様邸 外構工事'), d2 = doc(c2, '佐藤様邸 外構工事');
    d1.status = 'issued'; d1.issuedAt = new Date(Date.now() - 3 * 864e5).toISOString(); d1.rules = { lineRounding: S.settings.lineRounding, taxRounding: S.settings.taxRounding }; d1.snap = EE.data.snapOf(S, d1);
    d2.updatedAt = new Date(Date.now() - 12 * 864e5).toISOString(); d2.validUntil = EE.data.addDays(EE.data.today(), 2);   // 下書き：期限は近いが「期限」としては扱わない
    EE.ui.commit(); return { c1, c2, d1: d1.id, d2: d2.id };
  }, O);
  await p.waitForTimeout(2500);

  /* ===== 第1群 ===== */
  // 1 発行前チェックに設定の空欄
  const codes = await p.evaluate(id => { const S = EE.S, keep = { bank: S.company.bank, rep: S.company.rep }; S.company.bank = ''; S.company.rep = ''; const c = EE.ui.checkDoc(S.documents.find(d => d.id === id)).map(x => x.code); Object.assign(S.company, keep); return c; }, ids.d2);
  ok(codes.includes('no-bank') && codes.includes('no-rep'), '1 振込先・代表者名が空なら発行前チェックに出る');
  const meCodes = await p.evaluate(id => { const L = OUBI_LINK, me = L.me, was = me(); L.me = () => Object.assign({}, was, { name: '' }); const c = EE.ui.checkDoc(EE.S.documents.find(d => d.id === id)).map(x => x.code); L.me = me; return c; }, ids.d2);
  ok(meCodes.includes('no-me'), '1 自分の名前が空なら発行前チェックに出る');
  // 2 下書きからは請求書を作らない・請求すると工事は受注へ
  const draftInv = await p.evaluate(id => { EE.plus.invoiceModal ? 0 : 0; const b = document.createElement('button'); b.dataset.plus = 'invoice'; b.dataset.doc = id; document.body.appendChild(b); b.click(); b.remove(); return !!EE.ui.topModal(); }, ids.d2);
  ok(!draftInv, '2 下書きの見積からは請求書を作れない（知らせだけ）');
  await go(p, '#/edit/' + ids.d1, 2000);
  await p.click('.plus-bar [data-plus="invoice"]'); await p.waitForTimeout(500);
  ok(/まだ「見積」の段階です/.test(await p.textContent('.modal')), '2 見積の段階の工事なら「受注に進める」と先に知らせる');
  await p.click('.modal [data-ok]'); await p.waitForTimeout(2500);
  const st = await p.evaluate(([o, cid, did]) => { const c = eval(o).cases().find(c => c.id === cid), pj = EE.S.projects.find(x => x.id === cid); return { won: (c.result || {}).status, acc: (c.mitsu || {}).acceptedDocId, stage: pj && pj.stage, pacc: pj && pj.acceptedDocId }; }, [O, ids.c1, ids.d1]);
  ok(st.won === 'won' && st.acc === ids.d1 && st.pacc === ids.d1 && st.stage !== 'estimate', '2 請求書を作ると工事は受注・採用した見積はこの見積（段階 ' + st.stage + '）');
  await p.waitForTimeout(1800);
  ok(!(await p.isVisible('.won-card')), '19 請求書で段階がまとめて進んだときは、お祝いを出さない');
  // 19 成約の演出（見積→受注の瞬間）：佐藤様の工事を「受注」に
  await p.evaluate(([o, cid]) => { const x = eval(o), c = x.cases().find(c => c.id === cid); c.result = { status: 'won', wonDate: EE.data.today() }; x.touch(c); }, [O, ids.c2]);
  await p.waitForTimeout(3500);
  ok(await p.isVisible('.won-card'), '19 受注になった瞬間に、金色の縁のお祝い（紙吹雪なし）');
  await p.screenshot({ path: path.join(OUT, 'won.png') });
  await closeModals(p);
  // 3 期限の見出し
  const ev = await p.evaluate(id => ({ due: EE.views.schedule.upcoming(30).filter(e => e.kind === 'due').some(e => e.href.endsWith(id)), todo: EE.linkTodo().find(x => x.id === id) }), ids.d2);
  ok(!ev.due, '3 下書きの有効期限は「見積期限」に出さない');
  ok(ev.todo && /下書きのまま 12 日止まっています/.test(ev.todo.s), '3 下書きは「止まっている日数」で出す（' + (ev.todo && ev.todo.s) + '）');
  // 4 原価が空の行
  await go(p, '#/edit/' + ids.d2, 2000);
  await p.evaluate(() => { const d = EE.views.editor.current(); d.lines[0].unitCost = 0; });
  await p.evaluate(() => { const q = document.querySelector('#line-body input.qty'); q.value = String(Number(q.value) + 1); q.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.waitForTimeout(600);
  ok((await p.textContent('[data-k="margin"]')).trim() === '—' && await p.isVisible('#cost-missing'), '4 原価が空の行があると粗利率は「—」＋「原価が未入力の行があります」');
  await p.screenshot({ path: path.join(OUT, 'cost-missing.png') });
  // 12 明細のドラッグで並べ替え → 保存と知らせ
  await p.evaluate(() => { const d = EE.views.editor.current(); d.lines[0].unitCost = 100; });
  const before = await p.evaluate(() => EE.views.editor.current().lines.map(l => l.lineId));
  const rows = await p.$$('#line-body tr[data-line]');
  if (rows.length >= 2) {
    const g = await rows[0].$('.line-grip'), t = await rows[rows.length - 1].boundingBox();
    const gb = await g.boundingBox();
    await p.mouse.move(gb.x + 4, gb.y + 4); await p.mouse.down(); await p.mouse.move(t.x + 40, t.y + t.height - 4, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(800);
  }
  const after = await p.evaluate(() => EE.views.editor.current().lines.map(l => l.lineId));
  ok(after[after.length - 1] === before[0] && /並べ替えを保存しました/.test(await p.textContent('body')), '12 行番号の印をドラッグして並べ替え → 保存して「並べ替えを保存しました」');

  // 22 ミスの型
  const mk = await p.evaluate(id => { const d = EE.S.documents.find(d => d.id === id); const n0 = d.lines.length; d.lines.push(EE.data.lineFromItem(EE.S.items.find(i => i.name === '足場設置'), 100)); const c = EE.ui.checkDoc(d).map(x => x.code); d.lines.length = n0; return c; }, ids.d2);
  ok(mk.includes('mistake:mk1'), '22 ミスの型「足場設置があるのに撤去がない」を知らせる');
  await go(p, '#/settings/rules', 1800);
  await p.fill('#mk-a', '雨樋'); await p.fill('#mk-b', '雨樋撤去|既存雨樋'); await p.click('[data-mk="add"]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => EE.S.settings.mistakes.some(m => m.a === '雨樋')), '22 設定 → 計算ルールで、ミスの型を自分で足せる（育てる）');

  /* ===== 第2群 ===== */
  await go(p, '#/home', 300);
  const early = await p.evaluate(() => { const el = document.querySelector('[data-hero] .w-kpi-value') || document.querySelector('.widget[data-type="kpi"] .w-kpi-value'); return el ? el.textContent : ''; });
  await p.waitForTimeout(1500);
  const heroInfo = await p.evaluate(() => { const h = document.querySelector('.widget[data-hero]'); return h && { label: h.querySelector('.w-kpi-label').textContent, ms: h.querySelector('.w-kpi-value').dataset.countMs, spark: !!h.querySelector('.kpi-spark'), delta: !!h.querySelector('.delta') }; });
  ok(heroInfo && /今月の請求額/.test(heroInfo.label) && heroInfo.spark && heroInfo.delta, '13 主役は「今月の請求額」1つ（大きく・前月比・直近6か月の小さな折れ線）');
  ok(heroInfo && Number(heroInfo.ms) >= 600 && Number(heroInfo.ms) <= 900, '7 今月の数字は 0.6〜0.9秒で数え上げ（' + (heroInfo && heroInfo.ms) + 'ms）');
  const deltas = await p.$$eval('.widget[data-type="kpi"] .delta', els => els.map(e => e.className));
  ok(deltas.length >= 3 && deltas.every(c => /up|down|flat/.test(c)), '13 小さい数字にも前月比のバッジ（良い＝ミント・悪い＝淡い赤）');
  const alerts = await p.$$eval('.widget[data-type="todo"] .w-item.alert', els => els.map(e => e.textContent));
  ok(alerts.length >= 1 && alerts.every(t => /期限|粗利率/.test(t) && /¥/.test(t)), '14 期限切れ・粗利割れだけ赤系のアラートカード（金額つき）：' + alerts.length + '件');
  const tr = await p.evaluate(() => { const s = document.querySelector('[data-trend]'); return s && s.querySelectorAll('.viz-axis').length; });
  await p.click('[data-trend-range="12"]'); await p.waitForTimeout(600);
  const tr12 = await p.evaluate(() => { const s = document.querySelector('[data-trend]'); return { r: s.dataset.trend, line: !!s.querySelector('.viz-line') }; });
  ok(tr && tr12.r === '12' && tr12.line, '11 月別の折れ線をホーム下段に。6か月 → 12か月で描き直す');
  await p.screenshot({ path: path.join(OUT, 'home-pc.png') });
  // 10 サイドバーのピル
  const pill1 = await p.evaluate(() => getComputedStyle(document.querySelector('.nav-pill')).transform);
  await go(p, '#/docs', 900);
  const pill2 = await p.evaluate(() => { const pl = document.querySelector('.nav-pill'); return { t: getComputedStyle(pl).transform, tr: getComputedStyle(pl).transitionDuration }; });
  ok(pill1 !== pill2.t && /0\.25s/.test(pill2.tr), '10 選択中のピルが 0.25秒ですべって移る');
  // 18 サイドバーのバッジ
  const badge = await p.evaluate(() => { const b = document.querySelector('.nav-item[data-nav="estimate"] .nav-badge'), c = EE.plus.badgeCounts(); return { t: b && b.textContent, n: c.draft + c.soon }; });
  ok(badge.t && Number(badge.t) === badge.n, '18 「見積」に下書き・期限間近の件数のバッジ（' + badge.t + '）');
  // 16 見せるモード
  await go(p, '#/edit/' + ids.d2, 1800);
  await p.click('#show-mode'); await p.waitForTimeout(400);
  const hid = await p.evaluate(() => ({ on: document.body.classList.contains('show-mode'), cost: getComputedStyle(document.querySelector('[data-k="grossProfit"]').closest('.internal')).display, fin: getComputedStyle(document.querySelector('.nav-item[data-nav="finance"]')).display }));
  ok(hid.on && hid.cost === 'none' && hid.fin === 'none', '16 見せるモード：原価・粗利・経営のメニューをワンタップで隠す');
  await p.screenshot({ path: path.join(OUT, 'show-mode.png') });
  await p.click('#show-mode'); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.body.classList.contains('show-mode'))), '16 もう一度押すと元に戻る');
  // 17 最近の3件から複製（2タップ）
  await go(p, '#/w/1', 1500);
  const rc = await p.$$('[data-dup-recent]');
  ok(rc.length === 3, '17 「見積を作る」の一番上に最近の見積3件');
  if (rc.length) { await rc[0].click(); await p.waitForTimeout(1800); }
  ok(/#\/(new\/edit|edit\/)/.test(await p.evaluate(() => location.hash)) && await p.evaluate(() => EE.views.editor.current().lines.length > 0), '17 押すと中身ごと複製して編集画面（ホームから2タップ）');
  // 20 発行直後の導線（複製した下書きは破棄して移る）
  await go(p, '#/edit/' + ids.d2, 1200);
  if (await p.evaluate(() => !!EE.ui.topModal())) { const dz = await p.$('.modal .btn.danger, .modal [data-ok]'); if (dz) await dz.click(); await p.waitForTimeout(1500); }
  await closeModals(p); await go(p, '#/edit/' + ids.d2, 1800);
  await p.evaluate(() => { const S = EE.S; S.company.bank = S.company.bank || 'テスト銀行'; S.company.rep = S.company.rep || '代表 太郎'; S.company.invoiceRegNo = S.company.invoiceRegNo || 'T1234567890123'; EE.ui.commit(); });
  await p.click('[data-act="issue"]'); await p.waitForTimeout(500);
  const cf = await p.$('.modal [data-ok], .modal .btn.primary'); if (cf) await cf.click(); await p.waitForTimeout(1500);
  ok(await p.isVisible('.issued-hero') && await p.isVisible('.modal [data-send]'), '20 発行した直後に番号を大きく、「お客様へ送る」を大きく');
  await p.screenshot({ path: path.join(OUT, 'issued.png') });
  await closeModals(p);
  // 15 圏外
  await ctx.setOffline(true); await p.waitForTimeout(500);
  ok(await p.isVisible('#net-mark'), '15 圏外になると「見積・保存・PDF はこのまま使えます」のしるし');
  const savedOffline = await p.evaluate(() => { const S = EE.S, d = EE.data.newEstimate(S, { title: '圏外のテスト' }); d.lines.push(EE.data.lineFromItem(S.items[0], 1)); S.documents.push(d); return EE.ui.commit() !== false && JSON.parse(localStorage.getItem('oubi.ldb.mitsu_docs') || '{}')[d.id] != null; });
  await p.waitForTimeout(600);
  const savedOffline2 = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('oubi.ldb.mitsu_docs') || '{}')).some(d => d.title === '圏外のテスト'));
  ok(savedOffline || savedOffline2, '15 圏外でも見積を作って端末に保存できる');
  await ctx.setOffline(false); await p.waitForTimeout(500);
  ok(!(await p.isVisible('#net-mark')), '15 つながると、しるしは消える');

  /* ===== スマホ ===== */
  const m = await openWeb(b, { viewport: { width: 390, height: 844 }, old: true, hash: '#/docs', wait: 3500 });
  m.on('pageerror', e => errs.push('スマホ: ' + e.message));
  const rowOk = await m.evaluate(() => { const tr = document.querySelector('.doc-list tbody tr'); if (!tr) return false; tr.scrollIntoView(); const a = tr.querySelector('.c-amt').getBoundingClientRect(), t = tr.querySelector('.c-tt'), r = tr.getBoundingClientRect(); return a.right <= r.right + 1 && a.width > 0 && getComputedStyle(t).webkitLineClamp === '2'; });
  ok(rowOk, '6 スマホの書類一覧：件名は2行まで折り返し、金額は右に必ず見える');
  await m.screenshot({ path: path.join(OUT, 'docs-mobile.png') });
  await m.evaluate(() => { location.hash = '#/home'; }); await m.waitForTimeout(2500);
  await m.screenshot({ path: path.join(OUT, 'home-mobile.png') });
  ok(await m.evaluate(() => !!document.querySelector('#mnav .nav-badge')), '18 スマホの下のメニューの「見積」にもバッジ');

  ok(!errs.length, 'エラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  await b.close();
  console.log(fail ? '\nweb-revise: ' + fail + ' 件失敗' : '\nweb-revise: ok'); process.exit(fail ? 1 : 0);
})();
