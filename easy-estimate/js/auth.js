/*
 * 認証（いまは「この端末内だけ」の仮認証）
 *
 * 画面（js/login.js）はここの signIn / signUp / signOut / current だけを呼ぶ。
 * サーバー（例：Supabase）が決まったら、同じ形の provider を作って EE.auth.use(provider) で差し替える。
 *
 * local provider：
 *  - アカウントはこのブラウザの localStorage（'oumitsu:auth:v1'）だけに保存。外部には送らない
 *  - パスワードは保存しない。PBKDF2-SHA256（210,000回・ランダムな16バイトのソルト）で導いた値だけを持つ
 *  - サインイン状態は sessionStorage（タブ・ブラウザを閉じると消える＝起動のたびにサインイン）
 *  - 5回続けて失敗すると30秒待たせる
 *  - 注意：これは「この端末を使う人の入口」であり、端末内の見積データそのものを暗号化するものではない
 */
(function (root) {
  'use strict';
  var KEY = 'oumitsu:auth:v1', SKEY = 'oumitsu:session', ITER = 210000;

  function AuthError(field, message) { this.field = field; this.message = message; }

  function store() { try { return JSON.parse(root.localStorage.getItem(KEY)) || { users: [] }; } catch (e) { return { users: [] }; } }
  function save(s) { root.localStorage.setItem(KEY, JSON.stringify(s)); }
  function normEmail(v) { return String(v || '').trim().toLowerCase(); }
  function b64(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))); }
  function unb64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function rid(p) { var a = new Uint8Array(8); crypto.getRandomValues(a); return p + Array.from(a, function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }

  async function derive(password, salt, iter) {
    if (!root.crypto || !crypto.subtle) throw new AuthError('', 'このブラウザでは安全な暗号機能が使えないため、サインインできません');
    var key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iter }, key, 256));
  }
  function same(a, b) { if (a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

  // 続けて失敗した回数とロック解除の時刻は、再読み込みで消えないよう保存する
  var LKEY = 'oumitsu:auth:lock';
  function lockState() { try { return JSON.parse(root.localStorage.getItem(LKEY)) || { fails: 0, until: 0 }; } catch (e) { return { fails: 0, until: 0 }; } }
  function setLock(v) { try { root.localStorage.setItem(LKEY, JSON.stringify(v)); } catch (e) {} }

  var local = {
    name: 'local',
    current: function () {
      try {
        var s = JSON.parse(root.sessionStorage.getItem(SKEY)); if (!s) return null;
        var u = store().users.filter(function (x) { return x.id === s.uid; })[0];
        return u ? { id: u.id, name: u.name, email: u.email } : null;
      } catch (e) { return null; }
    },
    signIn: async function (v) {
      var lk = lockState();
      if (Date.now() < lk.until) throw new AuthError('', '続けて失敗したため、' + Math.ceil((lk.until - Date.now()) / 1000) + ' 秒待ってからもう一度お試しください');
      var u = store().users.filter(function (x) { return x.email === normEmail(v.email); })[0];
      // アカウントが無いときも同じだけ計算して、どちらが違ったか分からないようにする
      var h = await derive(v.password, u ? unb64(u.salt) : new Uint8Array(16), u ? u.iter : ITER);
      if (!u || !same(h, u.hash)) {
        lk.fails = (lk.fails || 0) + 1;
        if (lk.fails >= 5) { lk.fails = 0; lk.until = Date.now() + 30000; }
        setLock(lk);
        throw new AuthError('', 'メールアドレスかパスワードが違います');
      }
      setLock({ fails: 0, until: 0 });
      root.sessionStorage.setItem(SKEY, JSON.stringify({ uid: u.id, at: new Date().toISOString() }));
      return { id: u.id, name: u.name, email: u.email };
    },
    signUp: async function (v) {
      var s = store(), email = normEmail(v.email);
      if (s.users.some(function (x) { return x.email === email; })) throw new AuthError('email', 'このメールアドレスはすでに登録されています。サインインしてください');
      var salt = new Uint8Array(16); crypto.getRandomValues(salt);
      var u = { id: rid('usr_'), name: String(v.name).trim(), email: email, salt: b64(salt), iter: ITER, hash: await derive(v.password, salt, ITER), createdAt: new Date().toISOString() };
      s.users.push(u); save(s);
      root.sessionStorage.setItem(SKEY, JSON.stringify({ uid: u.id, at: u.createdAt }));
      return { id: u.id, name: u.name, email: u.email };
    },
    signOut: async function () { root.sessionStorage.removeItem(SKEY); },
    hasAccounts: function () { return store().users.length > 0; }
  };

  var provider = local;
  root.EE = root.EE || {};
  root.EE.auth = {
    AuthError: AuthError,
    use: function (p) { provider = p; },
    providerName: function () { return provider.name; },
    current: function () { return provider.current(); },
    signIn: function (v) { return provider.signIn(v); },
    signUp: function (v) { return provider.signUp(v); },
    signOut: function () { return provider.signOut(); },
    hasAccounts: function () { return provider.hasAccounts ? provider.hasAccounts() : true; }
  };
})(this);
