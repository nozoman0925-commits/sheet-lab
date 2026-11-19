/* テスト用：業務管理アプリを「共有モードのまね」で開く（本番の Supabase にはつながない）
   使い方：const open = require('./_open'); const p = await open(browser, { seed, viewport });
   前提：リポジトリの最上位で  python3 -m http.server 8765 --bind 127.0.0.1  を動かしておく */
const fs = require('fs'); const path = require('path');
const BASE = process.env.OUBI_BASE || 'http://127.0.0.1:8765/oubi/index.html';
const MOCK = fs.readFileSync(path.join(__dirname, 'mock-supa.js'), 'utf8');
const ME = { id: 'u_tester', isOwner: true, name: 'テスト太郎' };
function defaultSeed() {
  return { staff: { u_tester: { name: 'テスト太郎', kana: 'てすとたろう', at: new Date().toISOString() } }, settings: { main: { targetRate: 25, company: { name: '株式会社桜美建設', addr: '東京都町田市森野4-15-12 寺田ビルA-211号', tel: '042-794-7290' } } } };
}
module.exports = async function open(browser, opts) {
  opts = opts || {};
  const ctx = opts.context || await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.route(/supa\.js(\?.*)?$/, r => r.fulfill({ contentType: 'text/javascript', body: 'window.MOCK_ME=' + JSON.stringify(opts.me || ME) + ';\n' + MOCK }));
  await p.route(/jsdelivr|googleapis|gstatic|cloudflare|gsi\.go\.jp|open-meteo/, r => r.abort());
  if (opts.seed !== false && !opts.keep) {
    await p.goto(BASE.replace(/index\.html.*/, 'manifest.webmanifest'));
    await p.evaluate(s => { localStorage.clear(); localStorage.setItem('mock.db', JSON.stringify(s)); }, Object.assign(defaultSeed(), opts.seed || {}));
  }
  await p.goto(BASE + (opts.hash || ''));
  await p.waitForTimeout(opts.wait || 1500);
  return p;
};
module.exports.BASE = BASE;
