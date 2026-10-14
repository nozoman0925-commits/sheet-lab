"""記事『家計簿の費目別合計をSUMIFSで出す』の式をLibreOfficeで再計算して期待値と照合する。
使い方: python3 site/verify/category_sum.py"""
import subprocess, sys, tempfile, os, random
from openpyxl import Workbook, load_workbook

random.seed(11)
CATS = ["食費", "日用品", "交通費", "光熱費", "通信費", "趣味"]
BUDGET = {"食費": 40000, "日用品": 8000, "交通費": 10000, "光熱費": 12000, "通信費": 9000, "趣味": 15000}
# 明細: (費目, 金額)。表記ゆれ「食費 」(末尾スペース)と「食 費」を混ぜる
ROWS = []
for _ in range(30):
    ROWS.append((random.choice(CATS), random.randint(100, 3000)))
ROWS += [("食費 ", 1234), ("食費　", 777), ("食費(外食)", 2500), ("食費(自炊)", 3100), ("", 500)]
N = len(ROWS)

def main():
    wb = Workbook(); ws = wb.active
    ws["A1"], ws["B1"] = "費目", "金額"
    for i, (c, v) in enumerate(ROWS, 2):
        if c != "": ws.cell(i, 1, c)
        ws.cell(i, 2, v)
    last = N + 1
    for k, c in enumerate(CATS):
        r = k + 2
        ws.cell(r, 4, c); ws.cell(r, 5, BUDGET[c])
        ws.cell(r, 6, f'=SUMIFS($B$2:$B${last},$A$2:$A${last},D{r})')              # 完全一致
        ws.cell(r, 7, f'=E{r}-F{r}')                                                 # 予算-実績
        ws.cell(r, 8, f'=IF(F{r}>E{r},"超過","範囲内")')
        ws.cell(r, 9, f'=SUMIFS($B$2:$B${last},$A$2:$A${last},D{r}&"*")')          # 前方一致
        ws.cell(r, 10, f'=SUMPRODUCT((TRIM(SUBSTITUTE($A$2:$A${last},"　"," "))=D{r})*$B$2:$B${last})')  # 空白除去後に完全一致
    t = len(CATS) + 2
    ws.cell(t, 4, "合計"); ws.cell(t, 6, f'=SUM(F2:F{t-1})'); ws.cell(t, 11, f'=SUM(B2:B{last})')
    ws.cell(t, 12, f'=K{t}-F{t}')  # 費目名がどれにも当たらなかった金額
    d = tempfile.mkdtemp(); src = os.path.join(d, "t.xlsx"); wb.save(src)
    out = os.path.join(d, "o"); os.mkdir(out)
    subprocess.run(["soffice", "--headless", "--convert-to", "xlsx", "--outdir", out, src], check=True, capture_output=True)
    res = load_workbook(os.path.join(out, "t.xlsx"), data_only=True).active
    ng = 0; n = 0
    for k, c in enumerate(CATS):
        r = k + 2
        e_exact = sum(v for cc, v in ROWS if cc == c)
        e_pre = sum(v for cc, v in ROWS if cc.startswith(c))
        e_trim = sum(v for cc, v in ROWS if cc.replace("　", " ").strip() == c)
        got = [res.cell(r, col).value for col in (6, 7, 8, 9, 10)]
        exp = [e_exact, BUDGET[c] - e_exact, "超過" if e_exact > BUDGET[c] else "範囲内", e_pre, e_trim]
        for g, e in zip(got, exp):
            n += 1
            if g != e: ng += 1
        print(("OK " if got == exp else "NG ") + f"{c}: 完全一致{got[0]} 予算差{got[1]} {got[2]} 前方一致{got[3]} 空白除去{got[4]} (期待 {exp})")
    tot_exact = sum(v for cc, v in ROWS if cc in CATS)
    allsum = sum(v for _, v in ROWS)
    g_t, g_all, g_gap = res.cell(t, 6).value, res.cell(t, 11).value, res.cell(t, 12).value
    for g, e in ((g_t, tot_exact), (g_all, allsum), (g_gap, allsum - tot_exact)):
        n += 1; ng += g != e
    print(f"費目合計 {g_t}(期待 {tot_exact}) 全明細 {g_all}(期待 {allsum}) 費目に当たらなかった金額 {g_gap}(期待 {allsum-tot_exact})")
    print(f"集計 {n} 件、不一致 {ng} 件"); sys.exit(1 if ng else 0)
main()
