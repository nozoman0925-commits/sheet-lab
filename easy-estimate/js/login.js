/*
 * サインイン ⇔ 新規登録（カード1枚・左右2パネル）
 *
 * 仕組み：
 *  - カードの下地にフォームを置く。サインインはフォームが左、新規登録はフォームが右（鏡像）
 *  - 濃色のブレードはカードの内側（8px 内側のトラック）で translateX だけで動く
 *      サインイン：+50%（右半分を覆う） → 0（全体を覆う） → 新規登録：-50%（左半分を覆う）
 *  - ちょうど全体を覆った瞬間（前半のアニメーションが終わった時）に下のフォームを入れ替える。
 *    入れ替えはブレードの下で起きるので目に見えない。フォームのフェード切り替えはしない
 *  - 動かすのは transform と opacity だけ（前半 0.3 秒 ease-in ＋ 後半 0.3 秒 ease-out ＝ 0.6 秒）
 *  - 狭い画面（1列）では、ブレードは画面外（±100%）からカードを横切る
 *  - 「視差効果を減らす」設定ではアニメーションなしで即座に切り替える
 * 認証そのものは js/auth.js（EE.auth）に任せる。ここは見た目・入力チェック・切り替えだけ。
 */
(function (root) {
  'use strict';
  var EE = root.EE;
  var HALF = 300, EASE_IN = 'cubic-bezier(.55,0,.9,.4)', EASE_OUT = 'cubic-bezier(.1,.6,.45,1)';
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function field(form, name, label, type, ac, extra) {
    var id = 'a-' + form + '-' + name;
    return '<div class="auth-field">' +
      '<label for="' + id + '">' + label + '</label>' +
      '<div class="auth-input-wrap"><input class="input" id="' + id + '" name="' + name + '" type="' + type + '" autocomplete="' + ac + '" aria-describedby="' + id + '-err' + (extra && extra.hint ? ' ' + id + '-hint' : '') + '" required' + (extra && extra.attrs ? ' ' + extra.attrs : '') + '>' +
      (type === 'password' ? '<button type="button" class="auth-peek" data-peek="' + id + '" aria-label="パスワードを表示" aria-pressed="false">表示</button>' : '') + '</div>' +
      (extra && extra.hint ? '<div class="auth-hint" id="' + id + '-hint">' + extra.hint + '</div>' : '') +
      '<div class="auth-err" id="' + id + '-err"></div></div>';
  }

  function html(mode) {
    return '<div class="auth" id="auth">' +
      '<div class="auth-card ' + mode + '" id="auth-card" role="region" aria-label="サインイン">' +
        '<div class="auth-slot">' +
          // 狭い画面ではサイドバーが隠れるので、起動のロゴはここに着地する（広い画面では出さない）
          '<div class="auth-brand" aria-hidden="true">' + EE.crest.svg({ id: 'authcrest', className: 'brand-crest', fieldR: 106 }) +
            '<div class="brand-text"><div class="brand-name">桜ミツ</div><div class="brand-sub">OUMITSU</div></div></div>' +
          '<form class="auth-form" id="f-signin" novalidate' + (mode === 'signin' ? '' : ' hidden') + '>' +
            '<h1 class="auth-title">サインイン</h1><p class="auth-lead">続けるには、サインインしてください</p>' +
            '<div class="auth-alert" role="alert"></div>' +
            field('signin', 'email', 'メールアドレス', 'email', 'username', { attrs: 'inputmode="email" spellcheck="false"' }) +
            field('signin', 'password', 'パスワード', 'password', 'current-password') +
            '<button class="btn primary auth-submit" type="submit"><span>サインイン</span></button>' +
            '<p class="auth-switch">アカウントが無い場合は <button type="button" class="link" data-go="signup">新規登録</button></p>' +
            '<p class="auth-note">アカウントとデータはこのPCのブラウザ内にだけ保存され、外部には送信しません。サインインは使う人の確認で、このPCを操作できる人からデータを隠すものではありません</p>' +
          '</form>' +
          '<form class="auth-form" id="f-signup" novalidate' + (mode === 'signup' ? '' : ' hidden') + '>' +
            '<h1 class="auth-title">アカウントを作成</h1><p class="auth-lead">この端末で使うアカウントを作ります</p>' +
            '<div class="auth-alert" role="alert"></div>' +
            field('signup', 'name', 'お名前', 'text', 'name', { hint: '見積の担当者名として使います' }) +
            field('signup', 'email', 'メールアドレス', 'email', 'username', { attrs: 'inputmode="email" spellcheck="false"' }) +
            field('signup', 'password', 'パスワード', 'password', 'new-password', { hint: '8文字以上' }) +
            field('signup', 'password2', 'パスワード（確認）', 'password', 'new-password') +
            '<button class="btn primary auth-submit" type="submit"><span>アカウントを作成</span></button>' +
            '<p class="auth-switch">アカウントをお持ちの場合は <button type="button" class="link" data-go="signin">サインイン</button></p>' +
            '<p class="auth-note">アカウントとデータはこのPCのブラウザ内にだけ保存され、外部には送信しません。サインインは使う人の確認で、このPCを操作できる人からデータを隠すものではありません</p>' +
          '</form>' +
        '</div>' +
        '<div class="auth-track"><div class="auth-blade" id="auth-blade">' +
          '<div class="blade-half blade-l"><h2>はじめての方へ</h2><p>アカウントを作ると、この端末で見積の作成を始められます。</p>' +
            '<button type="button" class="btn blade-btn" data-go="signup">新規登録</button></div>' +
          '<div class="blade-half blade-r"><h2>おかえりなさい</h2><p>登録したメールアドレスとパスワードでサインインします。</p>' +
            '<button type="button" class="btn blade-btn" data-go="signin">サインイン</button></div>' +
        '</div></div>' +
      '</div></div>';
  }

  /**
   * サインインが済むまでログイン画面を出す。済んでいればすぐ onDone(user)
   * @param {function} onDone
   */
  function require(onDone) {
    var g = gate(onDone); if (g) g.reveal();
  }
  /**
   * ログイン画面を組み立てる（まだ見せない）。起動シーケンスがロゴの着地点を測れるように先に置き、
   * 起動の「画面が開く」タイミングで reveal() する。サインイン済みなら onDone を呼んで null を返す
   */
  function gate(onDone) {
    var user = EE.auth.current();
    if (user) { onDone(user); return null; }
    var hasAccounts = EE.auth.hasAccounts ? EE.auth.hasAccounts() : true;
    return build(hasAccounts ? 'signin' : 'signup', onDone);
  }

  function build(mode, onDone) {
    var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.body.classList.add('auth-locked');
    var wrap = document.createElement('div'); wrap.innerHTML = html(mode);
    var el = wrap.firstChild; document.body.appendChild(el);
    var card = el.querySelector('#auth-card'), blade = el.querySelector('#auth-blade');
    var forms = { signin: el.querySelector('#f-signin'), signup: el.querySelector('#f-signup') };
    // 切り替え中（switching）と送信中（sending）は別に持つ。切り替えの動きが終わる前の送信を黙って捨てないため
    var switching = false, sending = false, tried = { signin: false, signup: false };

    function narrow() { return root.matchMedia('(max-width: 760px)').matches; }
    function off(m) { var n = narrow() ? 100 : 50; return m === 'signin' ? n : -n; }   // その状態でのブレードの位置（%）
    function tx(p) { return 'translateX(' + p + '%)'; }
    function place() {
      var s = document.querySelector('.sidebar'), r = s ? s.getBoundingClientRect() : { right: 0 };
      el.style.left = narrow() ? '0px' : Math.max(0, Math.round(r.right)) + 'px';   // 狭い画面では全面
      blade.style.transform = tx(off(mode));
      fitHeight();
    }
    // 2つの状態でカードの高さが変わらないようにする（入れ替えの瞬間にカードの輪郭が動くと切り替えが見えてしまう）
    function fitHeight() {
      card.style.minHeight = '';
      var slot = card.querySelector('.auth-slot'), h = 0;
      ['signin', 'signup'].forEach(function (k) {
        var f = forms[k], was = f.hidden; f.hidden = false;
        var other = forms[k === 'signin' ? 'signup' : 'signin'], ow = other.hidden; other.hidden = true;
        h = Math.max(h, slot.getBoundingClientRect().height);
        f.hidden = was; other.hidden = ow;
      });
      card.style.minHeight = (h + card.offsetHeight - card.clientHeight) + 'px';   // 枠線ぶんを足す（border-box）
    }
    function halves() {
      var l = blade.querySelector('.blade-l'), r = blade.querySelector('.blade-r');
      l.inert = mode !== 'signin'; r.inert = mode !== 'signup';
      l.style.opacity = mode === 'signin' ? '1' : '0'; r.style.opacity = mode === 'signup' ? '1' : '0';
    }
    place(); halves();
    root.addEventListener('resize', place);

    // 入場：reveal() でカードがフェード＋下から浮き上がる（それまでは見せない）
    card.style.opacity = '0';
    var revealed = false;
    function reveal() {
      if (revealed) return; revealed = true;
      card.style.opacity = '';
      if (!reduce) card.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)' });
      setTimeout(function () { focusFirst(forms[mode]); }, reduce ? 0 : 60);
    }

    function focusFirst(f) { var i = f.querySelector('input'); if (i) i.focus({ preventScroll: true }); }

    /* ---------- 切り替え ---------- */
    function swapForms(to) {
      var from = forms[mode], next = forms[to];
      ['email', 'password'].forEach(function (n) {    // 同じ項目は引き継ぐ
        var a = from.elements[n], b = next.elements[n]; if (a && b) b.value = a.value;
      });
      clearMessages(next);
      from.hidden = true; next.hidden = false;
      card.classList.remove(mode); card.classList.add(to);
      card.setAttribute('aria-label', to === 'signin' ? 'サインイン' : 'アカウントを作成');
      mode = to;
    }
    async function go(to) {
      if (switching || sending || to === mode) return;
      switching = true;
      var lOut = blade.querySelector(mode === 'signin' ? '.blade-l' : '.blade-r');
      var lIn = blade.querySelector(to === 'signin' ? '.blade-l' : '.blade-r');
      if (reduce) {
        swapForms(to); blade.style.transform = tx(off(to)); halves(); focusFirst(forms[to]); switching = false; return;
      }
      lOut.inert = true;
      var a1 = blade.animate([{ transform: tx(off(mode)) }, { transform: tx(0) }], { duration: HALF, easing: EASE_IN, fill: 'forwards' });
      lOut.animate([{ opacity: 1 }, { opacity: 0 }], { duration: HALF * 0.7, easing: 'ease-in', fill: 'forwards' });
      await a1.finished;
      swapForms(to);                                   // カード全体が覆われている瞬間に入れ替える
      lOut.getAnimations().forEach(function (x) { x.cancel(); });
      halves(); lIn.style.opacity = '0';
      var a2 = blade.animate([{ transform: tx(0) }, { transform: tx(off(to)) }], { duration: HALF, easing: EASE_OUT, fill: 'forwards' });
      lIn.animate([{ opacity: 0 }, { opacity: 1 }], { duration: HALF, delay: HALF * 0.3, easing: 'ease-out', fill: 'forwards' });
      a1.cancel();
      focusFirst(forms[to]);
      await a2.finished;
      blade.style.transform = tx(off(to)); a2.cancel();
      lIn.style.opacity = '1'; lIn.getAnimations().forEach(function (x) { x.cancel(); });
      switching = false;
    }
    el.addEventListener('click', function (e) {
      var g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
      var pk = e.target.closest('[data-peek]');
      if (pk) {
        var inp = document.getElementById(pk.dataset.peek), on = inp.type === 'password';
        inp.type = on ? 'text' : 'password';
        pk.textContent = on ? '隠す' : '表示'; pk.setAttribute('aria-pressed', String(on)); pk.setAttribute('aria-label', on ? 'パスワードを隠す' : 'パスワードを表示');
      }
    });

    /* ---------- 入力チェック ---------- */
    function rules(f) {
      var v = function (n) { return f.elements[n] ? f.elements[n].value : ''; };
      var e = {};
      if (f.elements.name && !v('name').trim()) e.name = 'お名前を入力してください';
      if (!v('email').trim()) e.email = 'メールアドレスを入力してください';
      else if (!EMAIL.test(v('email').trim())) e.email = 'メールアドレスの形式が正しくありません（例：name@example.com）';
      if (!v('password')) e.password = 'パスワードを入力してください';
      else if (f === forms.signup && v('password').length < 8) e.password = 'パスワードは8文字以上にしてください';
      if (f.elements.password2) {
        if (!v('password2')) e.password2 = '確認のため、もう一度入力してください';
        else if (v('password2') !== v('password')) e.password2 = 'パスワードが一致しません';
      }
      return e;
    }
    function setErr(f, name, msg) {
      var inp = f.elements[name]; if (!inp) return;
      var box = document.getElementById(inp.id + '-err');
      box.textContent = msg || '';
      inp.classList.toggle('flag-err', !!msg);
      if (msg) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
    }
    function clearMessages(f) {
      Array.prototype.forEach.call(f.querySelectorAll('input'), function (i) { setErr(f, i.name, ''); });
      f.querySelector('.auth-alert').textContent = '';
    }
    function check(f) {
      var e = rules(f);
      Array.prototype.forEach.call(f.querySelectorAll('input'), function (i) { setErr(f, i.name, e[i.name]); });
      return e;
    }
    el.addEventListener('input', function (e) {
      var f = e.target.form; if (!f) return;
      var key = f === forms.signin ? 'signin' : 'signup';
      if (!tried[key]) return;                         // 一度送信を試すまでは、入力中に赤くしない
      var errs = rules(f); setErr(f, e.target.name, errs[e.target.name]);
      if (e.target.name === 'password' && f.elements.password2 && f.elements.password2.value) setErr(f, 'password2', errs.password2);
    });

    /* ---------- 送信 ---------- */
    el.addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, key = f === forms.signin ? 'signin' : 'signup';
      if (sending || f.hidden) return;
      tried[key] = true;
      f.querySelector('.auth-alert').textContent = '';
      var errs = check(f), first = Object.keys(errs)[0];
      if (first) {
        var bad = f.querySelector('[aria-invalid="true"]'); if (bad) bad.focus();
        if (!reduce) EE.fx.shake(f.querySelector('.auth-submit'));
        return;
      }
      var btn = f.querySelector('.auth-submit'), label = btn.firstChild.textContent;
      sending = true; btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.firstChild.textContent = '確認中…';
      try {
        var vals = { email: f.elements.email.value, password: f.elements.password.value };
        if (f.elements.name) vals.name = f.elements.name.value;
        var user = await (key === 'signin' ? EE.auth.signIn(vals) : EE.auth.signUp(vals));
        Array.prototype.forEach.call(el.querySelectorAll('input[type=password], input[name=password]'), function (i) { i.value = ''; });
        leave(user);
      } catch (err) {
        sending = false; btn.disabled = false; btn.removeAttribute('aria-busy'); btn.firstChild.textContent = label;
        var msg = (err && err.message) || 'うまくいきませんでした。もう一度お試しください';
        if (err && err.field && f.elements[err.field]) { setErr(f, err.field, msg); f.elements[err.field].focus(); }
        else { f.querySelector('.auth-alert').textContent = msg; if (f.elements.password) f.elements.password.focus(); }
        if (!reduce) EE.fx.shake(btn);
      }
    });

    function leave(user) {
      root.removeEventListener('resize', place);
      var done = function () {
        el.remove(); document.body.classList.remove('auth-locked');
        // 狭い画面ではサイドバーを隠していたので、ぱっと出さずにフェードで戻す
        var sb = document.querySelector('.sidebar');
        if (sb && narrow() && !reduce) sb.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
        onDone(user);
      };
      if (reduce) { done(); return; }
      var a = card.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.98)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
      a.onfinish = done;
    }
    var brandEl = el.querySelector('.auth-brand');
    return { reveal: reveal, target: function () { return { crest: brandEl.querySelector('svg'), text: brandEl.querySelector('.brand-text') }; } };
  }

  EE.login = { require: require, gate: gate };
})(this);
