/*
 * テスト用：最初にページを開いたときに「サインイン済み」の状態を作り、開き直す。
 * （addInitScript は使わない。file:// で毎回ストレージを触ると、リロード時に保存内容が消えることがあるため）
 * 本物のアカウント処理（js/auth.js）は tests/login.js で確かめる。
 */
module.exports = function signedIn(page) {
  const goto = page.goto.bind(page); let done = false;
  page.goto = async (url, opts) => {
    const r = await goto(url, opts);
    if (!done) {
      done = true;
      await page.evaluate(() => {
        if (!localStorage.getItem('oumitsu:auth:v1')) localStorage.setItem('oumitsu:auth:v1', JSON.stringify({ users: [{ id: 'usr_test', name: '青木 誠', email: 'test@example.com', salt: 'AAAAAAAAAAAAAAAAAAAAAA==', iter: 1, hash: '-', createdAt: '' }] }));
        const u = JSON.parse(localStorage.getItem('oumitsu:auth:v1')).users[0];
        sessionStorage.setItem('oumitsu:session', JSON.stringify({ uid: u.id, at: '' }));
      });
      return page.reload(opts);   // 同じURL（#付き）への goto は読み込み直さないため reload
    }
    return r;
  };
  return page;
};
