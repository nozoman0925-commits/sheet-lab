# 武士道 BUSHIDO

毎日ひとつの「一太刀」（小さな約束）を斬り、記録し、段位を上げていく自己鍛錬アプリ。

- 公開中：claude.ai の Artifact（第35版）
- オフライン版：`pwa/`（ホーム画面に追加すれば、ネットがなくても動く）

## すぐ使うコマンド

```bash
python3 build.py            # src/ をつないで bushido.html を作る
python3 build.py --check    # 今の bushido.html が src/ と一致するか確かめる
./run_tests.sh              # 組み立て → オフライン版 → 全テスト
./run_tests.sh --sim        # さらに 1万人の擬似データで検査
./run_tests.sh t27          # 序章のテストだけ
node tests/boot10k.js bushido.html tests/fixtures/seed_user.json 10000 8  # 起動の耐久テスト（1万回）
node eval/personas10k.js bushido.html 10000 14 # 1万人の仮想利用者による評価
node eval/ui_audit.js                            # 画面の点検（幅・文字の大きさ・外観）
node tools/export_review.js # 専門家レビュー用の表（docs/review/）を作り直す
```

必要なもの：Python 3、Node.js、Playwright（Chromium）。

## 資料

| 資料 | 中身 |
|---|---|
| [docs/決定事項.md](docs/決定事項.md) | 決めたこと（変えるときは先にここを書き換える） |
| [CLAUDE.md](CLAUDE.md) | 作業の決まり・構成・データの形 |
| [CHANGELOG.md](CHANGELOG.md) | 版ごとの変更 |
| [docs/試験運用_7日間.md](docs/試験運用_7日間.md) | 5〜10人で7日間使ってもらう計画と、測る数字 |
| [docs/iPhone実機チェック.md](docs/iPhone実機チェック.md) | 実機で確かめる項目 |
| [docs/review/](docs/review/) | 課題127件・言葉370件のレビュー用の表と依頼文 |
| [docs/legal/](docs/legal/) | プライバシーポリシー・利用規約の下書きと法務の確認表（**弁護士の確認前**） |
| [docs/security/](docs/security/) | セキュリティ点検の結果と公開範囲の確認 |
