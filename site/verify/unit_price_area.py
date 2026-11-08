"""記事『工事金額と面積から㎡単価・坪単価を出す式』をLibreOfficeで再計算し、Python(Fraction)の厳密計算と照合する。
使い方: python3 site/verify/unit_price_area.py   (soffice が必要。不一致なら終了コード1)"""
import subprocess, sys, tempfile, os, random
from fractions import Fraction
from openpyxl import Workbook, load_workbook

def build(rows):
    wb = Workbook(); ws = wb.active; ws.title = "単価"
    for i, h in enumerate(["工事名", "契約金額", "施工面積㎡", "チェック", "㎡単価", "坪数", "坪単価"], 1): ws.cell(1, i, h)
    for r, (k, a, m) in enumerate(rows, 2):
        ws.cell(r, 1, k); ws.cell(r, 2, a); ws.cell(r, 3, m)
        ws.cell(r, 4, f'=IF(AND(B{r}="",C{r}=""),"",IF(NOT(ISNUMBER(B{r})),"金額が数字でない",IF(NOT(ISNUMBER(C{r})),"面積が数字でない",IF(B{r}<0,"金額がマイナス",IF(C{r}<=0,"面積は0より大きく","")))))')
        ws.cell(r, 5, f'=IF(OR(D{r}<>"",C{r}=""),"",ROUND(B{r}/C{r},0))')
        ws.cell(r, 6, f'=IF(OR(D{r}<>"",C{r}=""),"",ROUND(C{r}*121/400,2))')
        ws.cell(r, 7, f'=IF(OR(D{r}<>"",C{r}=""),"",ROUND(B{r}*400/(C{r}*121),0))')
    return wb

def run_lo(wb):
    d = tempfile.mkdtemp(); src = os.path.join(d, "t.xlsx"); wb.save(src)
    out = os.path.join(d, "out"); os.mkdir(out)
    subprocess.run(["soffice", "--headless", "--convert-to", "xlsx", "--outdir", out, src], check=True, capture_output=True)
    return load_workbook(os.path.join(out, "t.xlsx"), data_only=True)

def isnum(v): return isinstance(v, (int, float)) and not isinstance(v, bool)
def rhu(x): return int((x * 1 + Fraction(1, 2)) // 1) if x >= 0 else -int((-x + Fraction(1, 2)) // 1)
def rnd2(x): return Fraction(rhu(x * 100), 100)

def expected(row):
    k, a, m = row
    if a is None and m is None: return ("", None)
    if not isnum(a): return ("金額が数字でない", None)
    if not isnum(m): return ("面積が数字でない", None)
    if a < 0: return ("金額がマイナス", None)
    if m <= 0: return ("面積は0より大きく", None)
    A, M = Fraction(str(a)), Fraction(str(m))
    return ("", (rhu(A / M), rnd2(M * 121 / 400), rhu(A * 400 / (M * 121))))

def check(rows, label):
    ws = run_lo(build(rows))["単価"]; bad = 0
    for r, row in enumerate(rows, 2):
        chk, vals = expected(row)
        gc = ws.cell(r, 4).value or ""
        g = tuple(ws.cell(r, c).value for c in (5, 6, 7))
        if gc != chk: ok = False
        elif vals is None: ok = all(x in (None, "") for x in g)
        else: ok = g[0] == vals[0] and abs(g[1] - float(vals[1])) < 1e-9 and g[2] == vals[2]
        if not ok: bad += 1; print("NG", label, r, row, "->", gc, g, "期待", chk, vals)
    return bad, len(rows)

CASES = [
 ("内装改修", 1500000, 50), ("水まわり", 2380000, 12.5), ("外壁塗装", 1980000, 132.6),
 ("全面改装", 18500000, 99.17), ("小さな補修", 85000, 3), ("金額0", 0, 20),
 ("面積が文字(全角)", 1200000, "５０"), ("金額が文字", "120万", 50), ("面積が0", 500000, 0),
 ("面積が負", 500000, -5), ("金額が負(値引き超過)", -100000, 20), ("面積が空欄", 500000, None),
 ("金額が空欄", None, 30), (None, None, None), ("端数が出る", 1000000, 33),
]
if __name__ == "__main__":
    total = bad = 0
    b, n = check(CASES, "固定"); bad += b; total += n
    random.seed(11)
    rows = [(f"r{i}", random.randint(0, 30000000), round(random.uniform(0.5, 400), random.choice([0, 1, 2]))) for i in range(500)]
    b, n = check(rows, "乱数"); bad += b; total += n
    print(f"{total}行を照合 NG={bad}")
    sys.exit(1 if bad else 0)
