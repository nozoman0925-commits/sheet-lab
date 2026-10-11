# 単機能ツール候補(上から着手)
状態: done / todo。公開前に tools_test.js へ照合テストを追加すること。
| # | 状態 | slug | 内容 | 照合の方法 |
|---|---|---|---|---|
| 1 | done | wareki | 和暦⇔西暦変換 | Intl(ja-JP-u-ca-japanese)と全日付照合 |
| 2 | done | tax | 消費税計算(10%/8%・端数選択) | BigIntの独立実装と全件照合 |
| 3 | done | charcount | 文字数カウント | 手計算ケース |
| 4 | done | wareki-table | 和暦早見表 | Intlと全行照合 |
| 5 | done | tax-table | 消費税早見表 | 独立計算と全行照合 |
| 6 | done | age | 年齢・満年齢の計算(基準日指定) | 独立実装+境界日(誕生日前後・うるう日) |
| 7 | todo | date-diff | 日数計算(○日後・営業日は祝日データ要出典のため除く) | Dateの独立計算 |
| 8 | todo | csv-clean | CSVの空行・重複・前後空白の整理 | ケース照合 |
| 9 | todo | zenkaku | 全角⇔半角変換(英数・カナ・記号を個別選択) | NFKCと個別ケース |
| 10 | todo | percent | 割合・増減率・ポイント計算 | 独立実装 |
| 11 | todo | unit-time | 時間計算(時分の合計・勤務時間の差) | 独立実装 |
