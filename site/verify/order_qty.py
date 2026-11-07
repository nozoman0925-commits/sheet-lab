"""記事『材料の発注数をロス率込みで箱単位に切り上げる式』をLibreOfficeで再計算し、整数(分数)計算の期待値と照合する。
使い方: python3 site/verify/order_qty.py   (soffice が必要。不一致なら終了コード1)"""
import subprocess, sys, tempfile, os, random
from fractions import Fraction
from openpyxl import Workbook, load_workbook
import math

N = 500
def fr(x): return Fraction(str(x))

def build(rows):
    wb = Workbook(); ws = wb.active; ws.title = "発注"
    for i, h in enumerate(["品名", "必要数量", "ロス率", "1箱の入数", "チェック", "発注箱数", "発注数量", "余り", "(比較)ROUNDUPのみ"], 1):
        ws.cell(1, i, h)
    for r, (n, b, l, p) in enumerate(rows, 2):
        ws.cell(r, 1, n); ws.cell(r, 2, b); ws.cell(r, 3, l); ws.cell(r, 4, p)
        ws.cell(r, 5, (f'=IF(AND(A{r}="",B{r}="",D{r}=""),"",IF(OR(NOT(ISNUMBER(B{r})),NOT(ISNUMBER(D{r}))),"数量か入数が数字でない",'
                       f'IF(OR(B{r}<0,D{r}<=0),"数量が負か入数が0以下",IF(AND(C{r}<>"",NOT(ISNUMBER(C{r}))),"ロス率が数字でない",'
                       f'IF(N(C{r})<0,"ロス率が負",IF(N(C{r})>1,"ロス率が100%超",""))))))'))
        ws.cell(r, 6, f'=IF(OR(E{r}<>"",AND(A{r}="",B{r}="",D{r}="")),"",ROUNDUP(ROUND(B{r}*(1+N(C{r}))/D{r},6),0))')
        ws.cell(r, 7, f'=IF(F{r}="","",F{r}*D{r})')
        ws.cell(r, 8, f'=IF(F{r}="","",ROUND(G{r}-B{r},6))')
        ws.cell(r, 9, f'=IF(E{r}<>"","",IF(AND(A{r}="",B{r}="",D{r}=""),"",ROUNDUP(B{r}*(1+N(C{r}))/D{r},0)))')
    return wb

def run_lo(wb):
    d = tempfile.mkdtemp(); src = os.path.join(d, "t.xlsx"); wb.save(src)
    out = os.path.join(d, "out"); os.mkdir(out)
    subprocess.run(["soffice", "--headless", "--convert-to", "xlsx", "--outdir", out, src], check=True, capture_output=True)
    return load_workbook(os.path.join(out, "t.xlsx"), data_only=True)["発注"]

def expected(row):
    n, b, l, p = row
    if n in (None, "") and b is None and p is None: return ("", "", "", "")
    num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
    if not num(b) or not num(p): return ("数量か入数が数字でない", "", "", "")
    if b < 0 or p <= 0: return ("数量が負か入数が0以下", "", "", "")
    if l is not None and not num(l): return ("ロス率が数字でない", "", "", "")
    lv = fr(l) if l is not None else Fraction(0)
    if lv < 0: return ("ロス率が負", "", "", "")
    if lv > 1: return ("ロス率が100%超", "", "", "")
    q = fr(b) * (1 + lv) / fr(p)
    boxes = math.ceil(q)
    return ("", boxes, boxes * fr(p), boxes * fr(p) - fr(b))

CASES = [
 ("床材(1箱1.62㎡)", 20, 0.1, 1.62), ("石こうボード(1枚1.65㎡)", 12, 0.1, 1.65),
 ("端数なし", 50, 0.1, 1), ("ロス率ゼロ・ちょうど割り切れる", 10, 0, 2.5),
 ("ロス率の空欄", 10, None, 2), ("必要数量ゼロ", 0, 0.1, 2),
 ("小さな超過(割り切れず1箱増)", 10, 0.1, 5), ("釘(1箱500本)", 1200, 0.05, 500),
 ("入数ゼロ", 10, 0.1, 0), ("入数が空欄", 10, 0.1, None), ("数量が文字", "約20", 0.1, 2),
 ("ロス率が文字", 10, "1割", 2), ("ロス率を10と入力(10%のつもり)", 10, 10, 2),
 ("ロス率が負", 10, -0.1, 2), ("数量が負", -5, 0.1, 2), ("", None, None, None),
]
if __name__ == "__main__":
    ok = True
    ws = run_lo(build(CASES))
    for i, c in enumerate(CASES, 2):
        e = expected(c)
        g = [ws.cell(i, 5).value or "", ws.cell(i, 6).value if ws.cell(i, 6).value not in (None,) else "", ws.cell(i, 7).value, ws.cell(i, 8).value]
        g = [x if x is not None else "" for x in g]
        def eq(a, b):
            if a == "" or b == "": return a == b
            return isinstance(a, str) == isinstance(b, str) and (a == b if isinstance(a, str) else abs(Fraction(str(a)) - Fraction(b)) < Fraction(1, 10**6))
        good = all(eq(x, y) for x, y in zip(g, e))
        print("OK " if good else "NG ", c[0], "|", g, "| 比較(ROUNDUPのみ):", ws.cell(i, 9).value)
        ok &= good
    random.seed(7)
    rows = []
    for _ in range(N):
        b = random.choice([5, 10, 12, 15, 20, 25, 30, 40, 50, 100, 36.5, 7.2])
        l = random.choice([0, 0.03, 0.05, 0.1, 0.15, 0.2, None])
        p = random.choice([0.5, 1, 1.62, 1.65, 2, 2.5, 3.3, 4, 0.55, 3, 8])
        rows.append(("x", b, l, p))
    ws = run_lo(build(rows)); bad = 0; naive_diff = 0
    for i, c in enumerate(rows, 2):
        e = expected(c)
        if ws.cell(i, 5).value not in (None, "") or ws.cell(i, 6).value != e[1] or abs(Fraction(str(ws.cell(i, 7).value)) - e[2]) > Fraction(1, 10**6): bad += 1
        if ws.cell(i, 9).value != e[1]: naive_diff += 1
    print(f"乱数{N}行: 不一致 {bad} 件 / ROUNDUPのみの式が正解と違った行 {naive_diff} 件")
    ok &= bad == 0
    print("ALL OK" if ok else "FAIL"); sys.exit(0 if ok else 1)
