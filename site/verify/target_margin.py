"""記事『目標の粗利率から工事の売値(見積額)を逆算する式』をLibreOfficeで再計算して期待値(Python・分数で厳密に計算)と照合する。
使い方: python3 site/verify/target_margin.py   (soffice が必要。不一致なら終了コード1)"""
import subprocess, sys, tempfile, os, random, math
from fractions import Fraction
from openpyxl import Workbook, load_workbook

N = 2000

def build(rows):
    """rows: [(工事名, 原価(セルの値そのまま), 目標粗利率(セルの値そのまま))]"""
    wb = Workbook(); ws = wb.active; ws.title = "売値"
    for i, h in enumerate(["工事名", "原価(税抜)", "目標粗利率", "売値(税抜・100円単位切り上げ)", "粗利額", "実際の粗利率", "掛け率", "チェック"], 1):
        ws.cell(1, i, h)
    for r, (nm, c, g) in enumerate(rows, 2):
        ws.cell(r, 1, nm); ws.cell(r, 2, c); ws.cell(r, 3, g)
        ws.cell(r, 8, (f'=IF(AND(B{r}="",C{r}=""),"",IF(NOT(ISNUMBER(B{r})),"原価が数値でない",'
                       f'IF(B{r}<=0,"原価が0以下",IF(NOT(ISNUMBER(C{r})),"粗利率が空欄か数値でない",'
                       f'IF(OR(C{r}<0,C{r}>=1),"粗利率は0以上1未満で入力","")))))'))
        ws.cell(r, 4, f'=IF(AND(B{r}="",C{r}=""),"",IF(H{r}<>"","",ROUNDUP(ROUND(B{r}/(1-C{r}),4)/100,0)*100))')
        ws.cell(r, 5, f'=IF(D{r}="","",D{r}-B{r})')
        ws.cell(r, 6, f'=IF(D{r}="","",E{r}/D{r})')
        ws.cell(r, 7, f'=IF(D{r}="","",D{r}/B{r})')
    return wb

def run_lo(wb):
    d = tempfile.mkdtemp(); src = os.path.join(d, "t.xlsx"); wb.save(src)
    out = os.path.join(d, "out"); os.mkdir(out)
    subprocess.run(["soffice", "--headless", "--convert-to", "xlsx", "--outdir", out, src], check=True, capture_output=True)
    return load_workbook(os.path.join(out, "t.xlsx"), data_only=True)

def expected(rows):
    res = []
    for nm, c, g in rows:
        if c in (None, "") and g in (None, ""): res.append(("", "", "", "", "")); continue
        num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
        if not num(c): res.append(("", "", "", "", "原価が数値でない")); continue
        if c <= 0: res.append(("", "", "", "", "原価が0以下")); continue
        if not num(g): res.append(("", "", "", "", "粗利率が空欄か数値でない")); continue
        if g < 0 or g >= 1: res.append(("", "", "", "", "粗利率は0以上1未満で入力")); continue
        price = Fraction(c) / (1 - Fraction(str(g)))
        p = math.ceil(price / 100) * 100
        res.append((p, p - c, Fraction(p - c, p), Fraction(p, c), ""))
    return res

def same(got, exp):
    if len(got) != len(exp): return False
    for a, b in zip(got, exp):
        for x, y in zip(a, b):
            if isinstance(y, Fraction):
                if not isinstance(x, (int, float)) or abs(x - float(y)) > 1e-9: return False
            elif (x if x is not None else "") != y: return False
    return True

def read(res, n):
    ws = res["売値"]
    return [tuple((ws.cell(r, c).value if ws.cell(r, c).value is not None else "") for c in (4, 5, 6, 7, 8)) for r in range(2, n + 2)]

SCEN = [
 ("粗利率20%で割り切れる(原価80万)", 800000, 0.2),
 ("粗利率30%で割り切れない(原価100万)", 1000000, 0.3),
 ("浮動小数点の誤差が出やすい(原価120万・粗利率25%)", 1200000, 0.25),
 ("粗利率0%(原価のまま)", 500000, 0),
 ("粗利率を小数点以下まで指定(22.5%)", 1000000, 0.225),
 ("原価が小さい(原価1,234円・20%)", 1234, 0.2),
 ("掛け率の感覚で1.2と入力(粗利率は100%以上扱い)", 800000, 1.2),
 ("20%を『20』と入力", 800000, 20),
 ("粗利率がちょうど100%", 800000, 1),
 ("粗利率がマイナス", 800000, -0.1),
 ("粗利率が空欄", 800000, None),
 ("原価が空欄で粗利率だけ入力", None, 0.2),
 ("原価がマイナス", -100000, 0.2),
 ("原価が0", 0, 0.2),
 ("原価が全角数字の文字列", "８００，０００", 0.2),
 ("粗利率が文字『2割』", 800000, "2割"),
 ("行が空欄", None, None),
]

def main():
    ng = 0
    for name, c, g in SCEN:
        rows = [("t", c, g)]
        got = read(run_lo(build(rows)), 1); exp = expected(rows)
        ok = same(got, exp); ng += not ok
        print(("OK " if ok else "NG ") + f"{name}: 売値/粗利額/粗利率/掛け率/チェック={got[0]}")
        if not ok: print("   期待", exp)
    rnd = random.Random(20261022)
    rows = []
    for i in range(1000):
        t = rnd.random(); c = rnd.randint(1, 3000) * 1000 + rnd.choice([0, 0, 123, 500, 999]); g = rnd.randint(0, 120) / 200  # 0〜60%, 0.5%刻み
        if t < 0.04: g = rnd.choice([1, 1.2, 20, -0.1, None, "2割"])
        elif t < 0.07: c = rnd.choice([0, -5000, None, "八十万"])
        rows.append((f"工事{i}", c, g))
    got = read(run_lo(build(rows)), len(rows)); exp = expected(rows)
    ok = same(got, exp); ng += not ok
    print(("OK " if ok else "NG ") + f"ランダム照合: 1000行 全項目一致={ok}")
    print("不一致あり" if ng else "全件一致")
    sys.exit(1 if ng else 0)

if __name__ == "__main__":
    main()
