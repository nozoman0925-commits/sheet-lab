"""記事『請求書番号の抜けと重複をExcelで見つける式』をLibreOfficeで再計算し、Pythonの総当たりと照合する。
使い方: python3 site/verify/invoice_number_gap.py   (soffice が必要。不一致なら終了コード1)"""
import subprocess, sys, tempfile, os, random
from openpyxl import Workbook, load_workbook

N = 50  # 記事の式の範囲(2〜50行目)

def build(rows):
    wb = Workbook(); ws = wb.active; ws.title = "請求"
    for i, h in enumerate(["請求番号", "入力チェック", "番号", "初出", "判定", "直前の欠番"], 1): ws.cell(1, i, h)
    ws.cell(1, 8, "集計"); ws.cell(2, 8, "欠番の合計")
    ws["I2"] = f'=IF(COUNT(C2:C{N})=0,"",MAX(C2:C{N})-MIN(C2:C{N})+1-SUM(D2:D{N}))'
    for r, v in enumerate(rows, 2):
        ws.cell(r, 1, v)
    for r in range(2, N + 1):
        ws.cell(r, 2, f'=IF(A{r}="","",IF(AND(LEN(A{r})=6,EXACT(LEFT(A{r},2),"R-"),SUMPRODUCT(--ISNUMBER(FIND(MID(A{r},{{3,4,5,6}},1),"0123456789")))=4),"","形式が違う"))')
        ws.cell(r, 3, f'=IF(OR(A{r}="",B{r}<>""),"",VALUE(MID(A{r},3,4)))')
        ws.cell(r, 4, f'=IF(C{r}="","",IF(COUNTIF(C$2:C{r},C{r})=1,1,0))')
        ws.cell(r, 6, f'=IF(C{r}="","",IFERROR(C{r}-LARGE($C$2:$C${N},COUNTIF($C$2:$C${N},">="&C{r})+1)-1,0))')
        ws.cell(r, 5, f'=IF(A{r}="","",IF(B{r}<>"",B{r},IF(COUNTIF($C$2:$C${N},C{r})>1,"重複("&COUNTIF($C$2:$C${N},C{r})&"件)",IF(F{r}>0,"直前に欠番"&F{r}&"件","OK"))))')
    return wb

def run_lo(wb):
    d = tempfile.mkdtemp(); src = os.path.join(d, "t.xlsx"); wb.save(src)
    out = os.path.join(d, "out"); os.mkdir(out)
    subprocess.run(["soffice", "--headless", "--convert-to", "xlsx", "--outdir", out, src], check=True, capture_output=True)
    return load_workbook(os.path.join(out, "t.xlsx"), data_only=True)

def valid(v):
    return isinstance(v, str) and len(v) == 6 and v[:2] == "R-" and all(c in "0123456789" for c in v[2:])

def expected(rows):
    nums = [int(v[2:]) if valid(v) else None for v in rows]
    good = sorted(set(n for n in nums if n is not None))
    res = []
    for v, n in zip(rows, nums):
        if v in (None, ""): res.append(""); continue
        if n is None: res.append("形式が違う"); continue
        c = nums.count(n)
        if c > 1: res.append(f"重複({c}件)"); continue
        prev = [g for g in good if g < n]
        gap = n - max(prev) - 1 if prev else 0
        res.append(f"直前に欠番{gap}件" if gap > 0 else "OK")
    total = (max(good) - min(good) + 1 - len(good)) if good else ""
    return res, total

def check(rows, label):
    ws = run_lo(build(rows))["請求"]; bad = 0
    exp, total = expected(rows)
    for r, (row, ex) in enumerate(zip(rows, exp), 2):
        g = ws.cell(r, 5).value or ""
        if g != ex: bad += 1; print("NG", label, r, repr(row), "->", repr(g), "期待", repr(ex))
    t = ws["I2"].value
    t = "" if t is None else t
    if t != total: bad += 1; print("NG合計", label, "->", repr(t), "期待", repr(total))
    return bad, len(rows) + 1

CASES = ["R-0001", "R-0002", "R-0003", "R-0005", "R-0005", "R-0008", "R-0007", "R-0010", None,
         "R-０００９", "r-0011", "R-0012 ", "R-12", "R-00A3", "Ｒ-0013", "R-0020"]
if __name__ == "__main__":
    total = bad = 0
    b, n = check(CASES, "固定"); bad += b; total += n
    b, n = check([None, None], "空のみ"); bad += b; total += n
    b, n = check(["R-0100"], "1件のみ"); bad += b; total += n
    b, n = check(["R-0003", "R-0002", "R-0001"], "逆順で欠番なし"); bad += b; total += n
    random.seed(11)
    for t in range(10):
        rows = []
        for i in range(36):
            roll = random.random()
            if roll < 0.05: v = None
            elif roll < 0.10: v = random.choice(["R-12", "r-0005", "R-0007 ", "R-０００８", "X-0001", "R-00A1"])
            else: v = "R-%04d" % random.choice([random.randint(1, 60), random.randint(1, 12)])
            rows.append(v)
        b, n = check(rows, f"乱数{t}"); bad += b; total += n
    print(f"{total}行を照合 NG={bad}")
    sys.exit(1 if bad else 0)
