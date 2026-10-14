"""記事『シフト表で日ごとの出勤人数をCOUNTIFで数える』をLibreOfficeで再計算して期待値と照合する。
使い方: python3 site/verify/shift_headcount.py"""
import subprocess, sys, tempfile, os, random
from openpyxl import Workbook, load_workbook

# 5人x7日の基本ケース。"出" を数える。"早","遅" は別記号。
BASE = [
 ["出","出","休","出","早","遅","休"],
 ["出","休","出","出","遅","休","休"],
 ["休","出","出","","早","出","出"],
 ["出","出","出","出","出","休","休"],
 ["休","休","出","出","遅","遅","出"],
]
EDGE = [  # 表記ゆれ: 末尾スペース/全角/空欄
 ["出","出 ","出","","休","出","出"],
 ["出","出","出","出","出","出","出"],
 ["休","休","休","休","休","休","休"],
]
def cols(rows): return [[r[c] for r in rows] for c in range(len(rows[0]))]

def build(wb, name, rows, minn):
    ws = wb.create_sheet(name)
    n = len(rows)
    for i, r in enumerate(rows, 2):
        for j, v in enumerate(r, 2):
            if v != "": ws.cell(i, j, v)
    last = n + 1
    for j in range(2, len(rows[0]) + 2):
        L = ws.cell(1, j).column_letter
        rng = f"{L}2:{L}{last}"
        ws.cell(last + 2, j, f'=COUNTIF({rng},"出")')
        ws.cell(last + 3, j, f'=COUNTIFS({rng},"早")+COUNTIFS({rng},"遅")')
        ws.cell(last + 4, j, f'=IF({L}{last+2}<{minn},"不足","")')
        ws.cell(last + 5, j, f'=COUNTA({rng})')

def main():
    wb = Workbook(); wb.remove(wb.active)
    build(wb, "base", BASE, 3); build(wb, "edge", EDGE, 3)
    d = tempfile.mkdtemp(); src = os.path.join(d, "t.xlsx"); wb.save(src)
    out = os.path.join(d, "o"); os.mkdir(out)
    subprocess.run(["soffice","--headless","--convert-to","xlsx","--outdir",out,src], check=True, capture_output=True)
    res = load_workbook(os.path.join(out,"t.xlsx"), data_only=True)
    ng = 0
    for name, rows in (("base", BASE), ("edge", EDGE)):
        ws = res[name]; last = len(rows) + 1
        for j, col in enumerate(cols(rows), 2):
            e_out = sum(1 for v in col if v == "出")
            e_ew = sum(1 for v in col if v in ("早","遅"))
            e_short = "不足" if e_out < 3 else ""
            e_a = sum(1 for v in col if v != "")
            got = (ws.cell(last+2, j).value, ws.cell(last+3, j).value, ws.cell(last+4, j).value or "", ws.cell(last+5, j).value)
            exp = (e_out, e_ew, e_short, e_a)
            ok = got == exp; ng += not ok
            print(("OK " if ok else "NG ") + f"{name} {j-1}日目: 出{got[0]} 早遅{got[1]} 判定'{got[2]}' 入力数{got[3]} (期待 {exp})")
    print("不一致", ng, "件"); sys.exit(1 if ng else 0)
main()
