/*
 * 統合したアプリ（業務管理 × 見積）のランダム操作（モンキーテスト）
 *   python3 -m http.server 8765 --bind 127.0.0.1   （リポジトリの最上位で）
 *   node oubi/tests/monkey.js [合計の操作回数=10000] [並列=3] [seed=7]
 * クリック・入力・選択・キー操作・画面移動（業務管理のメニューと見積の画面の両方）・再読み込みをランダムに行い、操作ごとに確かめる：
 *   例外・コンソールエラー／画面上の「NaN」「undefined」「[object Object]」「Infinity」／画面の横はみ出し
 * 本番の Supabase にはつながない（tests/mock-supa.js）。失敗は種類ごとにまとめ、直前の操作の流れを残す。
 */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const open = require('./_open');
const TOTAL = Number(process.argv[2]) || 10000, PAR = Number(process.argv[3]) || 3, SEED = Number(process.argv[4]) || 7;
const TABS = ['home', 'list', 'mitsu', 'wb', 'cal', 'dash', 'settings', 'staff', 'board', 'sales', 'help', 'docs'];
const HASHES = ['#/docs', '#/new', '#/new/edit', '#/new/text', '#/new/past', '#/new/template', '#/clients', '#/sites', '#/finance', '#/analysis',
  '#/settings/items', '#/settings/packages', '#/settings/formulas', '#/settings/snippets', '#/settings/rules', '#/settings/company', '#/settings/data', '#/schedule', '#/site/c1', '#/home'];
const TEXTS = ['', '0', '-1', '1.5', '99999999999', 'abc', '外壁塗装 100平米', '<b>x</b>', '\'"', '１２３', 'テスト株式会社', ' ', 'a'.repeat(200), '2026-02-30', '1e5', 'フェンス 10m 撤去', '090-1234-5678'];
const SKIP = '[data-logout], [data-u=signout], [data-act=reset], [data-act=clear-all], [data-act=wipe], input[type=file], a[target=_blank], a[href^=http], a[href^="tel:"], a[href^="mailto:"]';
const CLICKABLE = 'button:not([disabled]), a[href^="#"], [data-act], [data-href], [data-open], [data-tab], [data-sec], tr.clickable, summary, input[type=checkbox], input[type=radio]';
const FILLABLE = 'input:not([type=file]):not([type=checkbox]):not([type=radio]):not([disabled]):not([readonly]), textarea';
const today = new Date().toISOString().slice(0, 10);
function aCase(id, name, title, extra) {
  return Object.assign({ id, no: 'OB-202611-0' + id.slice(1).padStart(2, '0'), createdAt: new Date().toISOString(), createdBy: 'u_tester',
    lead: { date: today, customer: name, tel: '090-0000-00' + id.slice(1).padStart(2, '0'), addr: '東京都町田市森野' + id.slice(1) + '-1', owner: 'u_tester', priority: '中', contacts: [] },
    work: { title, types: ['外壁塗装工事'] }, plan: {}, quote: { files: [], items: [{ name: '外壁塗装（シリコン）', qty: 100, unit: '㎡', price: 2500 }] },
    result: {}, schedule: { steps: [], prep: {}, changes: [] }, contract: { files: [] }, complete: { checks: {} }, invoice: { files: [] },
    payments: [], vendors: [], reports: [], photos: [], actual: {}, log: [] }, extra || {});
}
const seed = { cases: {
  c1: aCase('c1', '山田 太郎', '山田様邸 外壁塗装工事'),
  c2: aCase('c2', '佐藤 花子', '佐藤様邸 屋根工事', { result: { status: 'won', wonDate: today, amount: 800000 }, schedule: { start: today, end: today, steps: [], prep: {}, changes: [] } }),
  c3: aCase('c3', '鈴木 一郎', '鈴木様邸 内装', { result: { status: 'lost', reason: '金額が高い' } }) } };

(async () => {
  const b = await chromium.launch(); const per = Math.ceil(TOTAL / PAR);
  const failures = new Map(); let done = 0; const t0 = Date.now();
  async function worker(w) {
    let s = SEED * 1000 + w; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const pick = a => a[Math.floor(rnd() * a.length)];
    const vp = [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 1024, height: 768 }][w % 3];
    const ctx = await b.newContext({ viewport: vp, acceptDownloads: true });
    const p = await open(b, { context: ctx, seed, wait: 2500 });
    ctx.on('page', np => { if (np !== p) np.close().catch(() => {}); });
    const trail = []; let pending = [];
    p.on('pageerror', e => pending.push('例外: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_ABORTED|Failed to load resource/.test(m.text())) pending.push('コンソール: ' + m.text().slice(0, 160)); });
    p.on('dialog', d => d.dismiss().catch(() => {}));
    if (w === 1) await p.evaluate(() => localStorage.setItem('oubi.theme', 'light'));
    for (let i = 0; i < per; i++) {
      let act = '';
      try {
        const r = rnd();
        if (r < 0.05) { const t = pick(TABS); act = 'tab ' + t; await p.evaluate(t => window.OUBI && OUBI.setTab(t), t); await p.waitForTimeout(150); }
        else if (r < 0.09) { const h = pick(HASHES); act = 'goto ' + h; await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(200); }
        else if (r < 0.10) { act = 'open case'; await p.evaluate(id => window.OUBI && OUBI.openCase(id, 'quote'), pick(['c1', 'c2', 'c3'])); await p.waitForTimeout(150); }
        else if (r < 0.11) { act = 'reload'; await p.reload(); await p.waitForTimeout(1800); }
        else if (r < 0.16) { const k = pick(['Escape', 'Enter', 'Tab', 'ArrowDown', 'Alt+2', 'Control+z', 'Control+k', 'Control+s']); act = 'key ' + k; await p.keyboard.press(k); await p.waitForTimeout(40); }
        else {
          const kind = r < 0.70 ? 'click' : r < 0.88 ? 'fill' : 'select';
          const sel = kind === 'click' ? CLICKABLE : kind === 'fill' ? FILLABLE : 'select:not([disabled])';
          const n = await p.evaluate(([sel, skip]) => {
            const vis = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest(skip) && !e.closest('[hidden]') && !e.closest('[inert]'); });
            document.querySelectorAll('[data-monkey]').forEach(e => e.removeAttribute('data-monkey'));
            vis.slice(0, 80).forEach((e, i) => e.setAttribute('data-monkey', i));
            return Math.min(vis.length, 80);
          }, [sel, SKIP]);
          if (!n) { act = 'none → Escape'; await p.keyboard.press('Escape'); }
          else {
            const h = p.locator('[data-monkey="' + Math.floor(rnd() * n) + '"]').first();
            const desc = await h.evaluate(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[act=' + e.dataset.act + ']' : '') + (e.dataset.tab ? '[tab=' + e.dataset.tab + ']' : '') + ' ' + (e.textContent || e.name || e.placeholder || '').trim().slice(0, 20), null, { timeout: 1000 }).catch(() => '?');
            if (kind === 'click') { act = 'click ' + desc; await h.click({ timeout: 1500 }).catch(() => {}); }
            else if (kind === 'fill') { const v = pick(TEXTS); act = 'fill ' + desc + ' = ' + JSON.stringify(v).slice(0, 30); await h.fill(v, { timeout: 1500 }).catch(() => {}); }
            else { const opts = await h.evaluate(e => [...e.options].map(o => o.value), null, { timeout: 1000 }).catch(() => []); if (opts.length) { const v = pick(opts); act = 'select ' + desc + ' = ' + v; await h.selectOption(v, { timeout: 1500 }).catch(() => {}); } }
            await p.waitForTimeout(60);
          }
        }
      } catch (e) { act += ' (操作失敗: ' + e.message.split('\n')[0].slice(0, 80) + ')'; }
      trail.push(act); if (trail.length > 12) trail.shift();
      // アプリの外（エラー画面・別のページ）へ移ってしまったら記録して戻る
      if (!p.url().startsWith(open.BASE)) {
        pending.push('アプリの外へ移動: ' + p.url().slice(0, 80));
        await p.goto(open.BASE).catch(() => {}); await p.waitForTimeout(2000);
      }
      const st = await p.evaluate(() => {
        const txt = (document.body.innerText || '');
        const bad = (txt.match(/NaN|undefined|\[object Object\]|Infinity/g) || []);
        const over = document.documentElement.scrollWidth > window.innerWidth + 2;
        let culprit = '';
        if (over) { const W = innerWidth; for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.right > W + 2 && r.width) { culprit = e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + (e.id ? '#' + e.id : ''); break; } } }
        const where = location.hash ? location.hash.split('/').slice(0, 3).join('/') : 'tab:' + ((document.querySelector('#tabs [aria-current="page"]') || {}).dataset || {}).tab;
        return { bad: [...new Set(bad)], over, where, culprit };
      }).catch(() => null);
      if (st) {
        const where = st.where.replace(/doc_\w+|c\d+\b/, 'id');
        st.bad.forEach(x => pending.push('画面に「' + x + '」が表示 @' + where));
        if (st.over) pending.push('画面が横にはみ出す @' + where + ' (幅' + vp.width + ') ' + st.culprit);
      }
      pending.forEach(msg => { const key = msg.replace(/\d+/g, '#'); if (!failures.has(key)) { failures.set(key, { msg, n: 0, trail: trail.slice(), worker: w, width: vp.width, step: i }); console.log('  ★ 新しい失敗: ' + msg + '\n     ' + trail.join('\n     ')); } failures.get(key).n++; });
      pending = [];
      done++; if (done % 500 === 0) console.log(`  ${done} 回 (${Math.round((Date.now() - t0) / 1000)}秒) 失敗の種類 ${failures.size}`);
    }
    await ctx.close();
  }
  await Promise.all(Array.from({ length: PAR }, (_, w) => worker(w)));
  await b.close();
  console.log(`\n操作 ${done} 回・失敗の種類 ${failures.size}`);
  const out = [...failures.values()].sort((a, b) => b.n - a.n);
  out.forEach(f => { console.log(`\n[${f.n}回] ${f.msg}\n  再現（幅${f.width}・tab${f.worker} の ${f.step} 回目まで）:\n    ` + f.trail.join('\n    ')); });
  fs.mkdirSync(path.join(__dirname, '..', 'screenshots'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'screenshots', 'monkey-report.json'), JSON.stringify(out, null, 1));
  process.exit(out.length ? 1 : 0);
})();
