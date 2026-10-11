#!/usr/bin/env python3
"""早見表ページを計算で生成する(出典不要な計算結果のみ)。生成後 verify/tables_test.js で標準機能と突き合わせる。"""
import json
from pathlib import Path
R = Path(__file__).parent.parent
ERAS = [("令和", 2019, 5, 1), ("平成", 1989, 1, 8), ("昭和", 1926, 12, 25), ("大正", 1912, 7, 30)]

def era_of(y, m=1, d=1):
    for n, ey, em, ed in ERAS:
        if (y, m, d) >= (ey, em, ed):
            return n, y - ey + 1
    return None

rows = []
for y in range(2030, 1912, -1):
    # 年の初日と末日の元号が違う年は「年の途中で改元」
    a, b = era_of(y, 1, 1), era_of(y, 12, 31)
    def s(e): return f"{e[0]}{'元' if e[1]==1 else e[1]}年"
    cell = s(a) if a == b else f"{s(a)}(〜改元)/{s(b)}"
    rows.append(f"<tr><td>{y}年</td><td>{cell}</td></tr>")
body = ("<h1>和暦・西暦 早見表(1913年〜2030年)</h1>"
        "<p>西暦と和暦の対応表です。<b>年の途中で改元があった年</b>(1926年・1989年・2019年)は、改元の前後で元号が変わるため、2つの表記を並べています。"
        "日付ごとの変換は<a href=\"/tools/wareki/\">和暦・西暦 変換ツール</a>を使ってください。</p>"
        "<table><tr><th>西暦</th><th>和暦</th></tr>" + "".join(rows) + "</table>"
        "<p class=\"meta\">改元の日: 令和は2019年5月1日、平成は1989年1月8日、昭和は1926年12月25日、大正は1912年7月30日から。1912年は明治45年(〜7月29日)と大正元年(7月30日〜)です。</p>")
d = R / "tools" / "wareki-table"; d.mkdir(exist_ok=True)
(d / "body.html").write_text(body, encoding="utf-8")
(d / "meta.json").write_text(json.dumps({"title": "和暦・西暦 早見表(1913〜2030年)", "description": "西暦と和暦の対応表。年の途中で改元があった1926年・1989年・2019年も、前後の元号を並べて表示します。計算で作成し、検証済みです。"}, ensure_ascii=False), encoding="utf-8")

# 消費税の早見表(税抜→税込、10%/8%、切り捨て)
tr = "".join(f"<tr><td>{a:,}円</td><td>{a + a*10//100:,}円</td><td>{a + a*8//100:,}円</td></tr>" for a in list(range(100, 1001, 100)) + [1500, 2000, 3000, 5000, 10000])
body2 = ("<h1>消費税 早見表(税抜→税込・10%と8%)</h1>"
         "<p>税抜の金額から、税込の金額を、端数を切り捨てて求めた表です。他の金額や、端数の処理を変えたい場合は<a href=\"/tools/tax/\">消費税 計算ツール</a>を使ってください。</p>"
         "<table><tr><th>税抜</th><th>税込(10%)</th><th>税込(8%)</th></tr>" + tr + "</table>"
         "<p class=\"meta\">端数は切り捨てです。請求書の端数処理は、取引の取り決めに合わせてください。</p>")
d = R / "tools" / "tax-table"; d.mkdir(exist_ok=True)
(d / "body.html").write_text(body2, encoding="utf-8")
(d / "meta.json").write_text(json.dumps({"title": "消費税 早見表(税抜→税込・10%/8%)", "description": "100円〜10,000円の税抜金額に対する税込金額の早見表(10%と8%、端数切り捨て)。計算ツールで検算済みです。"}, ensure_ascii=False), encoding="utf-8")
print("ok")
