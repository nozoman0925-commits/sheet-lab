/* =========================================================
   サインイン ⇔ 新規登録 の切替カード（依存なし・素の JS）

   使い方：
     AuthCard.mount(document.querySelector(".ac-card"), {
       onSignIn: async (data, form) => ({ ok: true, message: "..." }),   // 既存の認証処理をここで呼ぶ
       onSignUp: async (data, form) => ({ ok: true, message: "..." }),
       validate: true,       // false にすると、このカードの入力チェックを使わず既存の処理に任せる
     });
   送信の決まり：
     1) onSignIn / onSignUp があれば、それを呼ぶ（既存の認証・送信先をそのまま使える）
     2) なければ <form action="..."> に POST する（返り値は JSON {ok, message} を期待）
     3) どちらもなければ見本として成功扱いにする
   ========================================================= */
(function (global) {
  "use strict";

  const reduceMQ = global.matchMedia ? global.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  const narrowMQ = global.matchMedia ? global.matchMedia("(max-width: 640px)") : { matches: false };

  const MSG = {
    required: "入力してください。",
    email: "メールアドレスの形で入力してください（例：name@example.com）。",
    minlength: n => n + "文字以上で入力してください。",
    match: "上のパスワードと同じものを入力してください。",
    agree: "利用規約への同意が必要です。",
    fail: "送信できませんでした。通信を確かめて、もう一度お試しください。",
  };

  function mount(card, opts) {
    opts = Object.assign({ validate: true, duration: null }, opts || {});
    const blade = card.querySelector(".ac-blade");
    const inner = card.querySelector(".ac-blade-inner");
    const slot = card.querySelector(".ac-slot");
    const forms = { signin: card.querySelector('[data-form="signin"]'), signup: card.querySelector('[data-form="signup"]') };
    const live = card.querySelector(".ac-live");
    const texts = {
      signin: { h: inner.querySelector("h2").textContent, p: inner.querySelector("p").textContent, b: inner.querySelector(".ac-toggle").textContent },
      signup: JSON.parse(card.getAttribute("data-signup-panel") || "{}"),
    };
    let mode = card.classList.contains("is-signup") ? "signup" : "signin";
    let busy = false;

    // ---- ブレードの位置：見えている半分（濃色パネルの区画）に合わせる。px で測るので縦横どちらでも同じ考え方 ----
    function rest() {
      // カードの枠線の内側（ブレードの基準）で測る。左右（上下）どちら側かは中心で判断する
      const W = card.clientWidth, H = card.clientHeight;
      const sx = slot.offsetLeft, sy = slot.offsetTop, sw = slot.offsetWidth, sh = slot.offsetHeight;
      if (narrowMQ.matches) return { x: 0, y: (sy + sh / 2 < H / 2) ? -(H - sh) : sy };
      return { x: (sx + sw / 2 < W / 2) ? -(W - sw) : sx, y: 0 };
    }
    const tf = p => "translate3d(" + p.x + "px," + p.y + "px,0)";
    function place() { if (busy) return; const p = rest(); blade.style.transform = tf(p); }

    function setPanelText(m) {
      const t = m === "signin" ? texts.signin : texts.signup;
      inner.querySelector("h2").textContent = t.h;
      inner.querySelector("p").textContent = t.p;
      inner.querySelector(".ac-toggle").textContent = t.b;
      inner.querySelector(".ac-toggle").setAttribute("aria-label", t.b + "の画面に切り替える");
    }

    // 覆っている間に、下の状態を入れ替える（ここは目に見えない）
    function swapUnder(next) {
      const from = forms[mode], to = forms[next];
      carryOver(from, to);
      card.classList.toggle("is-signup", next === "signup");
      from.dataset.active = "false"; from.setAttribute("inert", ""); from.setAttribute("aria-hidden", "true");
      to.dataset.active = "true"; to.removeAttribute("inert"); to.removeAttribute("aria-hidden");
      setPanelText(next);
      mode = next;
    }

    // 入力途中の内容は、同じ名前の欄に引き継ぐ
    function carryOver(from, to) {
      from.querySelectorAll("input[name]").forEach(a => {
        if (a.type === "checkbox" || a.type === "hidden" || a.type === "submit") return;
        const b = to.querySelector('input[name="' + a.name + '"]');
        if (b && a.value && !b.value) b.value = a.value;
        else if (b && a.value) b.value = a.value;
      });
    }

    function focusFirst() {
      const el = forms[mode].querySelector("input:not([type=hidden]):not([disabled])");
      if (el) el.focus({ preventScroll: true });
    }

    async function toggle() {
      if (busy) return;
      const next = mode === "signin" ? "signup" : "signin";
      const reduce = reduceMQ.matches || !blade.animate;
      if (reduce) {                                   // 視差効果を減らす：動かさず、すぐに切り替える
        swapUnder(next); place(); finish(next); return;
      }
      busy = true;
      card.setAttribute("aria-busy", "true");
      const dur = opts.duration || parseFloat(getComputedStyle(card).getPropertyValue("--ac-dur")) || 620;
      const a = rest();
      inner.dataset.hide = "true";                    // 中の文字は覆う途中で消し、反対側で出し直す（opacity のみ）
      // 前半：滑ってカード全体を覆う
      const cover = blade.animate([{ transform: tf(a) }, { transform: "translate3d(0,0,0)" }], { duration: dur / 2, easing: "cubic-bezier(.55,0,.75,.2)", fill: "forwards" });
      await cover.finished;
      blade.style.transform = "translate3d(0,0,0)";
      cover.cancel();
      swapUnder(next);                                // 完全に覆われた瞬間に入れ替える
      const b = rest();
      // 後半：反対側へ滑り、新しいフォームを見せる
      const reveal = blade.animate([{ transform: "translate3d(0,0,0)" }, { transform: tf(b) }], { duration: dur / 2, easing: "cubic-bezier(.25,.8,.45,1)", fill: "forwards" });
      setTimeout(() => { inner.dataset.hide = "false"; }, dur * 0.18);
      await reveal.finished;
      blade.style.transform = tf(b);
      reveal.cancel();
      busy = false;
      card.removeAttribute("aria-busy");
      finish(next);
    }

    function finish(next) {
      inner.dataset.hide = "false";
      focusFirst();
      if (live) live.textContent = (next === "signup" ? "新規登録" : "サインイン") + "の画面に切り替えました。";
      card.dispatchEvent(new CustomEvent("authcard:switch", { detail: { mode: next } }));
    }

    // ---------------- 入力チェック ----------------
    function fieldError(input) {
      const v = input.type === "checkbox" ? input.checked : input.value.trim();
      if (input.required && !v) return input.type === "checkbox" ? MSG.agree : MSG.required;
      if (input.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return MSG.email;
      const min = +input.getAttribute("minlength") || 0;
      if (min && v && v.length < min) return MSG.minlength(min);
      const m = input.getAttribute("data-match");
      if (m && v) { const o = input.form.querySelector('[name="' + m + '"]'); if (o && o.value !== input.value) return MSG.match; }
      return "";
    }
    function show(input, msg) {
      const id = input.getAttribute("aria-describedby"); const err = id && input.form ? input.form.querySelector("#" + CSS.escape(id)) : null;
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg;
    }
    function check(form) {
      let first = null;
      form.querySelectorAll("input[name]").forEach(i => { if (i.type === "hidden") return; const e = fieldError(i); show(i, e); if (e && !first) first = i; });
      return first;
    }
    Object.values(forms).forEach(form => {
      form.noValidate = true;
      form.querySelectorAll("input[name]").forEach(i => {
        i.addEventListener("blur", () => { if (opts.validate && (i.value || i.dataset.touched)) show(i, fieldError(i)); i.dataset.touched = "1"; });
        i.addEventListener("input", () => { if (opts.validate && i.getAttribute("aria-invalid") === "true") show(i, fieldError(i)); });
      });
      form.addEventListener("submit", async ev => {
        ev.preventDefault();
        const alertEl = form.querySelector(".ac-alert");
        const btn = form.querySelector(".ac-submit");
        if (btn.getAttribute("aria-busy") === "true") return;
        if (opts.validate) { const bad = check(form); if (bad) { bad.focus(); alertEl.dataset.kind = "error"; alertEl.textContent = "入力に誤りがあります。赤い欄を直してください。"; return; } }
        const data = Object.fromEntries(new FormData(form).entries());
        const which = form.dataset.form;
        const handler = which === "signin" ? opts.onSignIn : opts.onSignUp;
        btn.setAttribute("aria-busy", "true"); btn.disabled = true; alertEl.textContent = ""; alertEl.removeAttribute("data-kind");
        const label = btn.textContent; btn.textContent = "送信中…";
        try {
          let res;
          if (handler) res = await handler(data, form);
          else if (form.getAttribute("action")) {
            const r = await fetch(form.action, { method: (form.method || "POST").toUpperCase(), body: new FormData(form), credentials: "same-origin" });
            res = await r.json().catch(() => ({ ok: r.ok }));
          } else {
            await new Promise(r => setTimeout(r, 700));
            res = { ok: true, message: (which === "signin" ? "サインインしました" : "登録しました") + "（見本：送信先は未設定）" };
          }
          res = res || {};
          alertEl.dataset.kind = res.ok ? "ok" : "error";
          alertEl.textContent = res.message || (res.ok ? "送信しました。" : MSG.fail);
          if (!res.ok && res.fields) Object.keys(res.fields).forEach(n => { const i = form.querySelector('[name="' + n + '"]'); if (i) show(i, res.fields[n]); });
          card.dispatchEvent(new CustomEvent("authcard:submit", { detail: { mode: which, ok: !!res.ok, data } }));
        } catch (e) {
          alertEl.dataset.kind = "error"; alertEl.textContent = MSG.fail;
        } finally {
          btn.removeAttribute("aria-busy"); btn.disabled = false; btn.textContent = label;
        }
      });
    });

    // 初期状態
    forms.signin.dataset.active = String(mode === "signin");
    forms.signup.dataset.active = String(mode === "signup");
    forms[mode === "signin" ? "signup" : "signin"].setAttribute("inert", "");
    forms[mode === "signin" ? "signup" : "signin"].setAttribute("aria-hidden", "true");
    if (mode === "signup") setPanelText("signup");
    card.querySelector(".ac-toggle").addEventListener("click", toggle);
    place();
    if (global.ResizeObserver) new ResizeObserver(place).observe(card); else global.addEventListener("resize", place);
    if (narrowMQ.addEventListener) narrowMQ.addEventListener("change", place);

    return { toggle, get mode() { return mode; }, set: m => { if (m !== mode) toggle(); } };
  }

  global.AuthCard = { mount };
})(window);
