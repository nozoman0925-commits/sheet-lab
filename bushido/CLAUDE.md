# 武士道 BUSHIDO（bushido/）

男性向けの自己鍛錬アプリ。claude.ai の Artifact として公開している1ファイルの HTML アプリと、そのオフライン版（PWA）。

## 必ず守ること

- 返答・資料はすべて日本語。実行していない作業を完了と報告しない（テストを回していなければ「未確認」と書く）。
- **既存機能を勝手に削除しない。** 削除や統合は、利用者の了承を得てから。
- **既存の稽古データを消さない。** 保存形式（`S.main` / `S.days`）を変えるときは、古いデータを読み替える処理を必ず入れる。
- **EXP の計算式を変えない。** 例外は第24版の設計書で認めた上限だけ（掟は一日10・休み明けの扱い・事前準備）。
- **入門の処理を全面的に書き換えない。** 序章（`PROLOGUE`）は入門の前に置いた独立の部品で、入門の本体（`flowX`）とは別に動く。
- **写真の扱い**
  - 写真は個人の記録として扱い、外部への公開や AI への自動送信をしない。
  - 師範の写真はアプリの中だけで使い、無断で外部に公開しない。
  - 本人の写真を無断で表情変更・加工しない。
  - 写真を外部に送る処理（fetch・送信）を新たに足してはいけない。
- 序章では、通常の演出に赤色を使わない。
- 外部のスキルやパッケージは公式の配布元からだけ入れる。

## ファイルの構成

| 場所 | 中身 |
|---|---|
| `src/` | **編集するのはここ。** 部品を `src/manifest.txt` の順につなぐと本体になる |
| `src/style.css` | 見た目のすべて（テーマは `:root` と `[data-theme=haku|sumi]` の変数） |
| `src/js/02-data-basics.js` | 分野 `CATS`・徳目・能力・掟 `OKITE` |
| `src/js/03-data-missions.js` | 一太刀の課題 `MISSIONS_RAW`、課題ごとの実行手順 `MDATA`、目的 `MPURPOSE` |
| `src/js/04-engine.js` | 型の課題 `OPP_M`、課題選び `missionPlan`、EXP `expEvents`、段位 |
| `src/js/05-data-questions-types.js` | 入門の章 `CHAPTERS`、16タイプ `AXES` `TYPES` `TEMP_Q` |
| `src/js/06-master.js` | 師範 `MOTIVES`・台詞 `ML`・写真 |
| `src/js/07-data-quotes.js` | 今日の言葉 `QUOTES`（370通り） |
| `src/js/08-features.js` | 言葉の選び方 `quoteOfDay` など |
| `src/js/09-prologue.js` | 入門の序章（7幕・`PL_T` の時間） |
| `src/js/10-screens.js` | 各画面の描画 `render` |
| `src/js/11-actions.js` | 操作 `A`（`data-act` から呼ばれる） |
| `src/js/12-tutorial-boot.js` | チュートリアル `TUT`・初回の案内 `HINTS`・起動 |
| `bushido.html` | 組み立て済みの本体（`python3 build.py` で作る。**直接編集しない**） |
| `pwa/` | オフライン版（`python3 tools/make_pwa.py` で作る） |
| `img/` | 16タイプの絵（webp） |
| `tests/` | Playwright のテスト。`tests/fixtures/` は写真のテスト用素材 |
| `sim/sim.js` | 1万人分の擬似データで、計算と表示の食い違いを探す |
| `docs/` | 試験運用の計画・実機確認・レビュー用の表・法務の下書き |

部品の境目は `const 名前=` の宣言の直前で切ってある。部品をまたいで宣言を動かすときは、`manifest.txt` の順番（＝読み込み順）に気をつける（`const` は宣言より前で使えない）。

## 作業の流れ

1. `src/` を編集する。
2. `./run_tests.sh` を回す（組み立て → オフライン版 → 全17本のテスト）。計算に触れたら `./run_tests.sh --sim` も回す。
3. すべて合格してから claude.ai の Artifact に公開する（`bushido.html` を公開する）。
4. 公開した版の番号と変更点を `CHANGELOG.md` に書く。

テストの画面写しは `tests/out/` に出る（Git には入れない）。

## 起動の決まり（「読み込み中」で止めない）

- claude.ai の保存領域の `data()` は**凍結されている**。読んだら必ず写し（`clone`）を作ってから変更する。
- 読み込んだ記録は必ず `normState()` を通してから使う（起動・控えからの復元とも）。新しい項目を `S.main` に足したら、`blankMain()` に初期値を書く（型の整え直しに使われる）。
- 起動の描画は `safeRender()` を通す。失敗したら `__bootFail()` が原因と次の手を見せる。見張りのスクリプトは `src/markup.html` の先頭（`</style>` の後）にある。
- 起動を変えたら `node tests/boot10k.js bushido.html tests/fixtures/seed_user.json 10000 8` で1万回起動を確かめる（約15分）。

## 入門の儀（チュートリアル）の案内

- 案内のカードは、実際の高さを測ってから置く（`placeTut`）。目標が画面外ならスクロールし、画像の読み込みなどで位置がずれたら置き直す。画面を変えたら `./run_tests.sh t30` で、案内がはみ出さず最後まで進めるかを確かめる。

## 主なデータの形

- 保存先：claude.ai 上では Artifact の `db`（`data/users/<id>/main`・`main/days`・`main/photos`）、それ以外の場所ではブラウザの `localStorage`（`bushido.v1`・`bushido.photo.*`・自動控え `bushido.backup`）。
- `S.main`：入門の答え `obAns`、診断 `profile`、師範 `master`、段位の最高 `rankMax`（下げない）、見た目 `look`、序章 `prologue {act, done}` など。
- `S.days[YYYY-MM-DD]`：その日の一太刀 `mission`、体調 `cond`、省察 `reflection`、衝動 `urges` など。
- EXP は記録から毎回計算し直す（保存しない）。

## デザインの決まり

- 色は CSS の変数で持ち、テーマは「黒・白・墨」の3つ。通常の演出に赤は使わない。
- 文字の大きさは `calc(Npx*var(--fz,1))` で、文字サイズ設定に従う。
- 動きを減らす設定（`prefers-reduced-motion`・アプリ内の「動き：切」）では、すぐに表示する。
- 初めて見た人に「何のアプリで、今何をすればいいか」が一目で分かること。用語（一太刀・修行・省察）には必ず平易な言い換えを添える。
- 一つの画面に詰め込まない。道場で開いて見せるのは「今日の稽古（番号つきの手順）→ ①一太刀 → ②毎日の修行 → ③夜のふり返り → 今日の言葉」。必須・推奨・任意は帯の小さな印で示し、同じ項目を二度描かない。一度やれば済む案内は「整えること」に、毎日でなくてよい稽古は「ほかの稽古」にたたむ（消さない）。
- 背景は `#scene` の**静止画**（動かさない）。既定は写真「雨の縁側」（`img/bg-engawa.webp` を CSS に埋め込み）。外観の「背景」で 写真／絵（SVGの雨の森）／無地。区画はすりガラス（`--glass`）で背景が透ける。
- 金色の大きなボタンは、一画面に一つ（今やるべきこと）だけ。
