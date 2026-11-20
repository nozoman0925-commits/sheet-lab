/* テスト用：桜ミツ版（node oubi/tools/build-web.js .web-test で作ったもの）を、ログイン済みで開く
   opts.old … 前の桜ミツのデータ（easy-estimate:v1）を入れておく（引き継ぎの確認） */
const BASE = process.env.WEB_BASE || 'http://127.0.0.1:8765/.web-test/index.html';
module.exports = async function openWeb(browser, opts) {
  opts = opts || {};
  const ctx = opts.context || await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.route(/googleapis|gstatic|cloudflare|jsdelivr|gsi\.go\.jp|open-meteo/, r => r.abort());
  await p.goto(BASE + '?splash=off'); await p.waitForTimeout(800);
  if (!opts.keep) {
    await p.evaluate(old => {
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('oumitsu:auth:v1', JSON.stringify({ users: [{ id: 'usr_test', name: '青木 誠', email: 'test@example.com', salt: 'AAAAAAAAAAAAAAAAAAAAAA==', iter: 1, hash: '-', createdAt: '' }] }));
      sessionStorage.setItem('oumitsu:session', JSON.stringify({ uid: 'usr_test', at: '' }));
      if (old) { const s = EE.data.sampleState(); s.members[0].accountId = 'usr_test'; localStorage.setItem('easy-estimate:v1', JSON.stringify(s)); }
      indexedDB.deleteDatabase('oubi-local-files');
    }, !!opts.old);
  }
  await p.goto(BASE + '?splash=off' + (opts.hash || '#/home')); await p.reload(); await p.waitForTimeout(opts.wait || 3000);
  return p;
};
module.exports.BASE = BASE;
