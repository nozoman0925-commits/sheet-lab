"""記事『株式会社の前株・後株をそろえる方法』の数式をLibreOfficeで再計算して期待値と照合する。
使い方: python3 site/verify/kabu_position.py   (soffice が必要。不一致なら終了コード1)"""
import subprocess, sys, tempfile, os
from openpyxl import Workbook, load_workbook

# 入力, 位置判定, 前株にそろえる, 後株にそろえる
CASES = [
    ("山田株式会社",         "後株", "株式会社山田", "山田株式会社"),
    ("株式会社山田",         "前株", "株式会社山田", "山田株式会社"),
    ("有限会社山田",         "なし", "有限会社山田", "有限会社山田"),
    ("山田商事",             "なし", "山田商事", "山田商事"),
    ("山田株式会社東京",     "途中", "山田株式会社東京", "山田株式会社東京"),
    ("株式会社山田株式会社", "要確認", "株式会社山田株式会社", "株式会社山田株式会社"),
    ("株式会社",             "前株", "株式会社", "株式会社"),
    ("山田 株式会社",        "後株", "株式会社山田 ", "山田 株式会社"),   # 後株と判定されるが、間のスペースが後ろに残る(想定違いを実測に直した)
    ("山田株式会社 ",        "途中", "山田株式会社 ", "山田株式会社 "),   # 末尾スペースがあると末尾一致せず「途中」になる
    ("",                     "", "", ""),
]
POS = '=IF(A{r}="","",IF(AND(LEFT(A{r},4)="株式会社",RIGHT(A{r},4)="株式会社",LEN(A{r})>4),"要確認",IF(LEFT(A{r},4)="株式会社","前株",IF(RIGHT(A{r},4)="株式会社","後株",IF(ISNUMBER(FIND("株式会社",A{r})),"途中","なし")))))'
FRONT = '=IF(B{r}="後株","株式会社"&LEFT(A{r},LEN(A{r})-4),A{r})'
BACK = '=IF(B{r}="前株",MID(A{r},5,LEN(A{r}))&"株式会社",A{r})'
# スペースを先に取り除く補正式(全角・半角)
CLEAN = '=TRIM(SUBSTITUTE(A{r},"　"," "))'
# 補正した結果に対する位置判定
CASES2 = [("山田 株式会社", "山田 株式会社"), ("山田株式会社 ", "山田株式会社"), ("　株式会社　山田", "株式会社 山田")]

def main():
    wb = Workbook(); ws = wb.active
    for r, (inp, *_) in enumerate(CASES, 1):
        ws.cell(r, 1, inp or None); ws.cell(r, 1).number_format = "@"
        ws.cell(r, 2, POS.format(r=r)); ws.cell(r, 3, FRONT.format(r=r)); ws.cell(r, 4, BACK.format(r=r))
    for i, (inp, _) in enumerate(CASES2):
        r = 20 + i
        ws.cell(r, 1, inp); ws.cell(r, 1).number_format = "@"; ws.cell(r, 2, CLEAN.format(r=r))
    d = tempfile.mkdtemp(); src = os.path.join(d, "t.xlsx"); wb.save(src)
    out = os.path.join(d, "out"); os.mkdir(out)
    subprocess.run(["soffice", "--headless", "--convert-to", "xlsx", "--outdir", out, src], check=True, capture_output=True)
    res = load_workbook(os.path.join(out, "t.xlsx"), data_only=True).active
    ng = 0
    for r, (inp, *exp) in enumerate(CASES, 1):
        for c, e in zip((2, 3, 4), exp):
            got = res.cell(r, c).value or ""
            ok = got == e; ng += not ok
            print(("OK " if ok else "NG ") + f"{inp!r} col{c}: 期待{e!r} 結果{got!r}")
    for i, (inp, e) in enumerate(CASES2):
        got = res.cell(20 + i, 2).value or ""
        ok = got == e; ng += not ok
        print(("OK " if ok else "NG ") + f"補正 {inp!r}: 期待{e!r} 結果{got!r}")
    print("不一致", ng, "件"); sys.exit(1 if ng else 0)

main()
