/*
 * 仮想ユーザーでの総合テスト
 *   node easy-estimate/tests/vusers.js [人数=10000] [並列=4] [seed=11]
 * 役割・画面幅・初回/常用・動きを減らす設定・入力のゆらぎ（打ち間違い・入れ忘れ）の違う利用者を作り、
 * 1人1つの仕事を本物の画面で行う（tests/_vu-driver.js）。結果は計算エンジンで採点し、
 * 仕事・役割・画面幅ごとの成功率・所要時間・操作数・つまずきを集計する。
 * ※ 仮想ユーザーは機械的なシナリオで、人の感想（満足度）は測らない。
 */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const signedIn = require('./_signed-in');
const N = Number(process.argv[2]) || 10000, PAR = Number(process.argv[3]) || 4; let seed = Number(process.argv[4]) || 11;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff, pick = a => a[Math.floor(rnd() * a.length)];
const BASE = 'file://' + path.join(__dirname, '..', 'index.html') + '?splash=off';

const SEI = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '松本', '井上'];
const MEI = ['誠', '美和', '健太', '陽子', '大輔', '真由美', '翔', 'さくら', '浩二', '恵'];
const CO = ['株式会社', '有限会社', '合同会社', ''];
const WORK = ['外壁塗装 120平米 足場 高圧洗浄', 'トイレ交換 1台 内装 クロス 10m²', 'フェンス 10m 撤去 残土処分', '屋根 カバー工法 80平米', 'キッチン交換', '浴室 ユニットバス 交換 1式', 'フローリング 12平米 クロス張替え 40平米', '雨樋 15000mm 交換', '土間コンクリート 10坪', 'ベランダ防水 8平米', 'よくわからない工事', '太陽光 パネル 1式'];
const PERSONAS = [
  // [役割, 割合, 画面幅の候補, 仕事の候補（重み付き）]
  ['社長・見積担当（机のPC）', 0.45, [1440, 1280], ['estimate', 'estimate', 'estimate', 'estimate', 'master', 'advance', 'advance', 'pattern', 'pattern', 'find']],
  ['現場担当（スマホ）', 0.25, [390, 700], ['quick', 'quick', 'quick', 'estimate', 'find', 'customer']],
  ['事務（PC・入力が多い）', 0.25, [1024, 1440], ['customer', 'customer', 'find', 'find', 'estimate', 'master']],
  ['初めて使う人', 0.05, [1440, 390, 1024], ['signup']]
];

const users = [];
for (let i = 0; i < N; i++) {
  let r = rnd(), P = PERSONAS[0];
  for (const p of PERSONAS) { if (r < p[1]) { P = p; break; } r -= p[1]; }
  const name = pick(SEI) + ' ' + pick(MEI);
  users.push({
    id: i, persona: P[0], width: pick(P[2]), reduce: rnd() < 0.1, task: pick(P[3]), seed: Math.floor(rnd() * 1e9),
    name, email: 'user' + i + '@example.com', password: 'pw-' + Math.floor(rnd() * 1e8), typo: rnd() < 0.2,
    title: pick(SEI) + '様邸 ' + pick(['外壁塗装', '浴室改修', 'トイレ交換', 'フェンス工事', '内装改修']) + '工事 #' + i,
    qtys: [pick([1, 2, 3.5, 10, 12.5, 40]), pick([1, 5, 0.5, 100]), pick([2, 8, 15])],
    text: pick(WORK), company: pick(CO) + pick(SEI) + pick(['工務店', '不動産', '建設', '']) + i, memo: pick(['', '支払いは月末締め翌月末', '見積は郵送希望']),
    skipName: rnd() < 0.15, code: 'VU-' + i, itemName: pick(['手すり取付', '網戸張替え', '床下点検', '換気扇交換']) + i, unit: pick(['箇所', 'm', '式', '台']), price: Math.floor(rnd() * 200) * 500 + 500,
    pattern: pick(['B案', 'C案（安い方）', '床はそのまま'])
  });
}

// VU_TASK=signup のように指定すると、その仕事の人だけを流す（同じ乱数で作った同じ人たち）
if (process.env.VU_TASK) { const keep = users.filter(u => u.task === process.env.VU_TASK); users.length = 0; users.push(...keep); }

(async () => {
  const b = await chromium.launch(); const results = []; const t0 = Date.now();
  // 画面幅ごとにまとめて、各タブで順に流す
  const queues = Array.from({ length: PAR }, () => []);
  users.slice().sort((a, b) => a.width - b.width || a.id - b.id).forEach((u, i) => queues[i % PAR].push(u));
  async function worker(q, w) {
    const ctx = await b.newContext({ viewport: { width: q[0].width, height: 860 } });
    const p = signedIn(await ctx.newPage()); p.on('dialog', d => d.dismiss().catch(() => {}));
    let pageErrs = [];   // file:// では画面内の error イベントに中身が出ないため、ブラウザ側で受け取る
    p.on('pageerror', e => pageErrs.push((e.message || '') + ' @' + (e.stack || '').split('\n').slice(1, 4).map(s => s.trim().replace(/.*easy-estimate\//, '')).join(' < ')));
    await p.goto(BASE + '#/home'); await p.waitForTimeout(800);
    await p.addScriptTag({ path: path.join(__dirname, '_vu-driver.js') });
    let width = q[0].width;
    for (const u of q) {
      if (u.width !== width) { width = u.width; await p.setViewportSize({ width, height: 860 }); }
      await p.emulateMedia({ reducedMotion: u.reduce ? 'reduce' : 'no-preference' });
      let r;
      try { r = await p.evaluate(u => window.VU.run(u), u); }
      catch (e) {   // ページごと壊れたときは開き直す
        r = { id: u.id, task: u.task, ok: false, error: 'ページが応答しない: ' + e.message.split('\n')[0], jsErrors: [], bad: [], steps: 0, ms: 0, stumbles: [] };
        await p.goto(BASE + '#/home').catch(() => {}); await p.waitForTimeout(800); await p.addScriptTag({ path: path.join(__dirname, '_vu-driver.js') }).catch(() => {});
      }
      if (pageErrs.length) { r.jsErrors = pageErrs.slice(0, 3); r.ok = false; }
      else r.jsErrors = (r.jsErrors || []).filter(m => m !== 'Script error.');
      if (!r.error && !r.jsErrors.length && !(r.bad || []).length) r.ok = true;
      pageErrs = [];
      results.push(Object.assign(r, { persona: u.persona, width: u.width, reduce: u.reduce }));
      if (results.length % 1000 === 0) console.log(`  ${results.length}人 (${Math.round((Date.now() - t0) / 1000)}秒) 失敗 ${results.filter(x => !x.ok).length}`);
    }
    await ctx.close();
  }
  await Promise.all(queues.map(worker)); await b.close();

  // 集計
  const group = (key) => { const g = {}; results.forEach(r => { const k = r[key]; g[k] = g[k] || []; g[k].push(r); }); return g; };
  const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const line = (k, a) => `${String(k).padEnd(18)} ${String(a.length).padStart(5)}人  成功 ${(100 * a.filter(r => r.ok).length / a.length).toFixed(1).padStart(5)}%  中央値 ${med(a.map(r => r.ms))}ms・${med(a.map(r => r.steps))}操作`;
  console.log(`\n仮想ユーザー ${results.length}人・${Math.round((Date.now() - t0) / 1000)}秒`);
  for (const key of ['task', 'persona', 'width']) { console.log(`\n[${key}]`); Object.entries(group(key)).forEach(([k, a]) => console.log('  ' + line(k, a))); }
  const fails = {}; results.filter(r => !r.ok).forEach(r => { const k = (r.error || '') + (r.jsErrors[0] ? ' / JS: ' + r.jsErrors[0] : '') + (r.bad[0] ? ' / 画面に' + r.bad[0] : ''); (fails[k] = fails[k] || []).push(r); });
  console.log('\n[失敗の内容]'); Object.entries(fails).sort((a, b) => b[1].length - a[1].length).forEach(([k, a]) => console.log(`  ${a.length}人: ${k}  (例: user ${a[0].id}・${a[0].task}・幅${a[0].width})`));
  const st = {}; results.forEach(r => r.stumbles.forEach(s => { st[s] = (st[s] || 0) + 1; }));
  console.log('\n[つまずき・気づき]'); Object.entries(st).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, n]) => console.log(`  ${n}人: ${k}`));
  console.log(`\n画面の横はみ出し: ${results.filter(r => r.over).length}人（${[...new Set(results.filter(r => r.over).map(r => r.task + '@' + r.width))].slice(0, 8).join(', ')}）`);
  fs.mkdirSync(path.join(__dirname, '..', 'screenshots'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'screenshots', 'vusers-report.json'), JSON.stringify({ n: results.length, results }, null, 0));
  process.exit(0);
})();
