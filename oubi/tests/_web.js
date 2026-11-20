/* テスト用：桜ミツ版（node oubi/tools/build-web.js .web-test で作ったもの）を開く。ログインはない
   opts.old  … 前の桜ミツ（easy-estimate:v1）のデータを入れておく（引き継ぎの確認）
   opts.auth … 前の版のアカウント（[{id,name}]、opts.session でログイン中の人）を入れておく（名前の引き継ぎの確認）
   opts.v8   … 版8で作った記録（工事・営業・見積）を入れておく
   opts.name … 自分の名前（入れておくと「名前を入れてください」を出さない）。既定は「青木 誠」。'' で名前なし */
const BASE = process.env.WEB_BASE || 'http://127.0.0.1:8765/.web-test/index.html';
module.exports = async function openWeb(browser, opts) {
  opts = opts || {};
  const ctx = opts.context || await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.route(/googleapis|gstatic|cloudflare|jsdelivr|gsi\.go\.jp|open-meteo/, r => r.abort());
  await p.goto(BASE + '?splash=off'); await p.waitForTimeout(800);
  if (!opts.keep) {
    await p.evaluate(o => {
      localStorage.clear(); sessionStorage.clear(); indexedDB.deleteDatabase('oubi-local-files');
      if (o.auth) {
        localStorage.setItem('oumitsu:auth:v1', JSON.stringify({ users: o.auth.map(u => ({ id: u.id, name: u.name, email: u.id + '@example.com', salt: 'AAAAAAAAAAAAAAAAAAAAAA==', iter: 1, hash: '-', createdAt: '' })) }));
        if (o.session) sessionStorage.setItem('oumitsu:session', JSON.stringify({ uid: o.session, at: '' }));
      }
      if (o.old) { const s = EE.data.sampleState(); s.members[0].accountId = (o.auth && o.auth[0].id) || 'usr_test'; localStorage.setItem('easy-estimate:v1', JSON.stringify(s)); }
      if (o.v8) Object.keys(o.v8).forEach(k => localStorage.setItem(k, JSON.stringify(o.v8[k])));
      if (!o.auth && !o.v8 && o.name !== '') { localStorage.setItem('oubi.local.me', JSON.stringify({ id: 'usr_test' })); localStorage.setItem('oubi.ldb.staff', JSON.stringify({ usr_test: { name: o.name || '青木 誠', createdAt: '2026-01-01T00:00:00Z' } })); }
    }, { old: !!opts.old, auth: opts.auth || null, session: opts.session || null, v8: opts.v8 || null, name: opts.name });
  }
  await p.goto(BASE + '?splash=off' + (opts.hash || '#/home')); await p.reload(); await p.waitForTimeout(opts.wait || 3000);
  return p;
};
module.exports.BASE = BASE;
