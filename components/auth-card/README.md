# サインイン ⇔ 新規登録 の切替カード

カード1枚の中に「サインイン」と「新規登録」を入れ、濃色パネル（ブレード）が横に滑ってカード全体を覆った瞬間に、下のフォームを鏡像の状態へ入れ替える部品。依存ライブラリなし（素の HTML・CSS・JS）。

| ファイル | 中身 |
|---|---|
| `auth-card.css` | 見た目。配色は `data-theme`（`estimate`＝ダーク＋ブルー、`golden`＝黒＋金） |
| `auth-card.js` | 切替の動き・入力チェック・送信 |
| `index.html` | 見本（上のボタンで2つの配色を切り替えられる） |
| `test.js` | 検査（`node test.js`。Playwright が要る） |

## 動きの仕組み

1. ブレードはカードと同じ大きさで、普段は半分だけがカードの中に見えている（残りはカードの角丸の外で切り取られる）。
2. 切替ボタンを押すと、ブレードが `transform: translate` で滑り、カード全体を覆う（前半）。
3. 覆った瞬間に、下のフォームを鏡像の状態（左右反転）へ入れ替える。覆われているので入れ替わりは見えない。
4. ブレードは反対側へ滑り、新しいフォームを見せる（後半）。全体で約0.6秒。
5. 動かすのは `transform` と `opacity` だけ。OS の「視差効果を減らす」が有効なら、動かさずに即切り替える。

狭い画面（640px 以下）では上下に並べ、ブレードは縦に滑る。

## 既存の認証に組み込む

見た目と切替の動きだけを差し替え、認証処理・入力チェック・送信先はそのまま使える。

```html
<link rel="stylesheet" href="auth-card.css">
<body class="ac-theme" data-theme="golden">  <!-- または estimate -->
  …（index.html の .ac-card の中身。input の name は既存のものに合わせてよい）…
<script src="auth-card.js"></script>
<script>
  AuthCard.mount(document.querySelector(".ac-card"), {
    // 既存のサインイン処理を呼ぶ。返り値 {ok, message, fields?}
    onSignIn: async (data, form) => {
      const r = await existingSignIn(data.email, data.password);   // ← 既存の関数
      return r.ok ? { ok: true } : { ok: false, message: r.error, fields: { password: r.error } };
    },
    onSignUp: async (data, form) => existingSignUp(data),
    validate: true,   // 既存の入力チェックに任せるなら false
  });
</script>
```

送信の決まり：

1. `onSignIn` / `onSignUp` があれば、それを呼ぶ。
2. 無ければ `<form action="…" method="post">` の送信先へ `fetch` で POST する（返り値は JSON `{ok, message}` を期待）。
3. どちらも無ければ見本として成功扱いにする（`index.html` はこの状態）。

イベント：切替の後に `authcard:switch`（`detail.mode`）、送信の後に `authcard:submit`（`detail.mode`・`detail.ok`）がカードに届く。

## 守っていること

- 切り替えた後、フォーカスは新しいフォームの最初の入力欄へ移る。
- 入力途中の内容は、同じ `name` の欄に引き継ぐ（メールアドレス・パスワード）。
- 隠れている方のフォームは `inert` にして、キーボードでも触れないようにする。
- 入力の誤りは欄の下に出し、`aria-invalid` と `aria-describedby` で読み上げにも伝える。送信中は二重送信できない。
- 有料の素材・ライブラリは使っていない。

## 検査（`node test.js`）

21項目。主なもの：

- 入れ替わりはブレードが全体を覆った瞬間（x=0）か
- 動きの長さは0.5〜0.7秒か
- フレームの間隔はおよそ16.7ms（60fps）か
- 動かしているのは transform と opacity だけか
- 鏡像の配置になっているか
- フォーカスは新しいフォームの最初の欄に移るか
- 入力を引き継ぐか
- 入力チェックと送信は動くか
- 既存の認証処理（onSignIn）を呼べるか
- 連打しても状態とパネルの位置が食い違わないか
- 視差効果を減らす設定ですぐ切り替わるか
- 375px 幅ではみ出さないか
