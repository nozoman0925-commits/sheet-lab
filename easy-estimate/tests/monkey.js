/*
 * ブラウザでランダム操作（モンキーテスト）
 *   node easy-estimate/tests/monkey.js [合計の操作回数=10000] [並列=4] [seed=7]
 * クリック・入力・選択・キー操作・画面移動をランダムに行い、操作ごとに次を確認する：
 *   例外・コンソールエラー／画面上の「NaN」「undefined」「[object Object]」「Infinity」／画面の横はみ出し
 * 失敗は種類ごとにまとめ、直前の操作の流れ（再現手順）を残す。
 */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const signedIn = require('./_signed-in');
const TOTAL = Number(process.argv[2]) || 10000, PAR = Number(process.argv[3]) || 4, SEED = Number(process.argv[4]) || 7;
const BASE = 'file://' + path.join(__dirname, '..', 'index.html') + '?splash=off';
const ROUTES = ['#/home', '#/docs', '#/docs/draft', '#/new', '#/new/edit', '#/new/text', '#/new/past', '#/new/template', '#/clients', '#/settings/items', '#/settings/packages', '#/settings/formulas', '#/settings/snippets', '#/settings/company', '#/settings/rules', '#/settings/members', '#/settings/data'];
const TEXTS = ['', '0', '-1', '1.5', '99999999999', 'abc', '外壁塗装 100平米', '<b>x</b>', '\'"', '１２３', 'テスト株式会社', ' ', 'a'.repeat(200), '2026-02-30', '1e5', 'フェンス 10m 撤去'];
// 押さないもの：サインアウト（セッションが切れる）、全データ削除、ファイル選択、外部リンク
const SKIP = '[data-u=signout], [data-act=reset], [data-act=clear-all], [data-act=wipe], input[type=file], a[target=_blank], a[href^=http]';
const CLICKABLE = 'button:not([disabled]), a[href^="#"], [data-act], [data-href], [data-pick], [data-go], .nav-item, tr.clickable, .heat-cell, .flow-node, [data-cid], [data-hm], [data-sort], summary, input[type=checkbox]';
const FILLABLE = 'input:not([type=file]):not([type=checkbox]):not([type=radio]):not([disabled]):not([readonly]), textarea';

(async () => {
  const b = await chromium.launch(); const per = Math.ceil(TOTAL / PAR);
  const failures = new Map(); let done = 0; const t0 = Date.now();
  async function worker(w) {
    let s = SEED * 1000 + w; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const pick = a => a[Math.floor(rnd() * a.length)];
    const vp = [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }, { width: 700, height: 860 }][w % 4];
    const ctx = await b.newContext({ viewport: vp, acceptDownloads: true });
    const p = signedIn(await ctx.newPage()); ctx.on('page', np => { if (np !== p) np.close().catch(() => {}); });
    const trail = []; let pending = [];
    p.on('pageerror', e => pending.push('例外: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') pending.push('コンソール: ' + m.text().slice(0, 160)); });
    p.on('dialog', d => d.dismiss().catch(() => {}));
    await p.goto(BASE + '#/home'); await p.waitForTimeout(800);
    for (let i = 0; i < per; i++) {
      let act = '';
      try {
        const r = rnd();
        if (r < 0.08) { const to = pick(ROUTES); act = 'goto ' + to; await p.evaluate(h => { location.hash = h; }, to); await p.waitForTimeout(120); }
        else if (r < 0.10) { act = 'reload'; await p.reload(); await p.waitForTimeout(700); }
        else if (r < 0.16) { const k = pick(['Escape', 'Enter', 'Tab', 'ArrowDown', 'Alt+2', 'Alt+3', 'Control+z']); act = 'key ' + k; await p.keyboard.press(k); await p.waitForTimeout(40); }
        else {
          const kind = r < 0.70 ? 'click' : r < 0.88 ? 'fill' : 'select';
          const sel = kind === 'click' ? CLICKABLE : kind === 'fill' ? FILLABLE : 'select:not([disabled])';
          // 見えている候補を一度に集める（要素ごとに問い合わせると遅いため）
          const n = await p.evaluate(([sel, skip]) => {
            const vis = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest(skip) && !e.closest('[hidden]'); });
            document.querySelectorAll('[data-monkey]').forEach(e => e.removeAttribute('data-monkey'));
            vis.slice(0, 80).forEach((e, i) => e.setAttribute('data-monkey', i));
            return Math.min(vis.length, 80);
          }, [sel, SKIP]);
          if (!n) { act = 'none（押せる物が無い）→ Escape'; await p.keyboard.press('Escape'); }
          else {
          const h = p.locator('[data-monkey="' + Math.floor(rnd() * n) + '"]').first();
          const desc = await h.evaluate(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.dataset.act ? '[act=' + e.dataset.act + ']' : '') + ' ' + (e.textContent || e.name || e.placeholder || '').trim().slice(0, 20), null, { timeout: 1000 }).catch(() => '?');
          if (kind === 'click') { act = 'click ' + desc; await h.click({ timeout: 1500 }).catch(() => {}); }
          else if (kind === 'fill') { const v = pick(TEXTS); act = 'fill ' + desc + ' = ' + JSON.stringify(v).slice(0, 30); await h.fill(v, { timeout: 1500 }).catch(() => {}); }
          else { const opts = await h.evaluate(e => [...e.options].map(o => o.value), null, { timeout: 1000 }).catch(() => []); if (opts.length) { const v = pick(opts); act = 'select ' + desc + ' = ' + v; await h.selectOption(v, { timeout: 1500 }).catch(() => {}); } }
          await p.waitForTimeout(50);
          }
        }
      } catch (e) { act += ' (操作失敗: ' + e.message.split('\n')[0].slice(0, 80) + ')'; }
      trail.push(act); if (trail.length > 8) trail.shift();
      // 画面の確認
      const st = await p.evaluate(() => {
        const txt = (document.body.innerText || '');
        const bad = (txt.match(/NaN|undefined|\[object Object\]|Infinity/g) || []);
        const over = document.documentElement.scrollWidth > window.innerWidth + 2;
        return { bad: [...new Set(bad)], over, hash: location.hash };
      }).catch(() => null);
      if (st) {
        const where = st.hash.split('/').slice(0, 3).join('/').replace(/doc_\w+|prj_\w+|mem_\w+/, 'id');
        st.bad.forEach(x => pending.push('画面に「' + x + '」が表示 @' + where));
        if (st.over) pending.push('画面が横にはみ出す @' + where + ' (幅' + vp.width + ')');
      }
      pending.forEach(msg => { const key = msg.replace(/\d+/g, '#'); if (!failures.has(key)) failures.set(key, { msg, n: 0, trail: trail.slice(), worker: w, width: vp.width, step: i }); failures.get(key).n++; });
      pending = [];
      done++; if (done % 1000 === 0) console.log(`  ${done} 回 (${Math.round((Date.now() - t0) / 1000)}秒) 失敗の種類 ${failures.size}`);
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
