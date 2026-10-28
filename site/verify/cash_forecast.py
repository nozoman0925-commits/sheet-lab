"""記事『請求書の入金予定を月ごとに集計するExcelの式(来月・再来月にいくら入るか)』をLibreOfficeで再計算して期待値(Python)と照合する。
使い方: python3 site/verify/cash_forecast.py   (soffice が必要。不一致なら終了コード1)"""
import subprocess, sys, tempfile, os, random, datetime as dt
from openpyxl import Workbook, load_workbook

N = 1000
G = ('=IF(A{r}&B{r}&C{r}&D{r}&E{r}="","",IF(A{r}="","請求番号が空欄",IF(COUNTIF($A$2:$A${n},A{r})>1,"請求番号が重複",'
     'IF(C{r}="","請求額が空欄",IF(NOT(ISNUMBER(C{r})),"請求額が数字でない",IF(OR(C{r}<1,C{r}<>INT(C{r})),"請求額は1以上の整数",'
     'IF(D{r}="","入金予定日が空欄",IF(NOT(ISNUMBER(D{r})),"入金予定日が日付でない",IF(OR(D{r}<1,D{r}<>INT(D{r})),"入金予定日が日付でない",'
     'IF(E{r}="","",IF(NOT(ISNUMBER(E{r})),"入金日が日付でない",IF(OR(E{r}<1,E{r}<>INT(E{r})),"入金日が日付でない",""))))))))))))')
F = ('=IF(OR(G{r}<>"",A{r}&B{r}&C{r}&D{r}&E{r}=""),"",IF(E{r}<>"","入金済",'
     'IF(NOT(ISNUMBER($K$2)),"基準日を入力",IF(D{r}<$K$2,"期限超過","入金待ち"))))')
H = '=IF(F{r}="入金待ち",DATE(YEAR(D{r}),MONTH(D{r}),1),"")'
SUM = {"K5": '=COUNTIF($F$2:$F${n},"期限超過")', "K6": '=SUMIF($F$2:$F${n},"期限超過",$C$2:$C${n})',
       "K7": '=SUMIF($F$2:$F${n},"入金待ち",$C$2:$C${n})', "K8": '=SUMPRODUCT(--(LEN($G$2:$G${n})>0))'}

BASE = dt.date(2026, 10, 15)
def d(n): return BASE + dt.timedelta(days=n)   # 基準日のn日後

def build(rows, base):
    wb = Workbook(); ws = wb.active; ws.title = "入金予定"
    for i, h in enumerate(["請求番号", "取引先", "請求額", "入金予定日", "入金日", "状態", "チェック", "予定月"], 1): ws.cell(1, i, h)
    ws["J2"] = "基準日"; ws["K2"] = base
    for r, row in enumerate(rows, 2):
        for c, v in enumerate(row, 1): ws.cell(r, c, v)
        ws.cell(r, 7, G.format(r=r, n=N)); ws.cell(r, 6, F.format(r=r))
        ws.cell(r, 8, H.format(r=r)).number_format = "yyyy/mm/dd"
    for k, f in SUM.items(): ws[k] = f.format(n=N)
    ws["L2"] = '=IF(ISNUMBER($K$2),DATE(YEAR($K$2),MONTH($K$2),1),"")'
    for r in range(3, 14): ws[f"L{r}"] = f'=IF(L{r-1}="","",EDATE(L{r-1},1))'
    for r in range(2, 14):
        ws[f"L{r}"].number_format = "yyyy/mm/dd"
        ws[f"M{r}"] = f'=IF(L{r}="","",COUNTIF($H$2:$H${N},L{r}))'
        ws[f"N{r}"] = f'=IF(L{r}="","",SUMIFS($C$2:$C${N},$H$2:$H${N},L{r}))'
    ws["M14"] = '=IF(L2="","",SUM(M2:M13))'; ws["N14"] = '=IF(L2="","",SUM(N2:N13))'
    ws["M15"] = f'=IF(L2="","",COUNTIF($F$2:$F${N},"入金待ち")-M14)'
    return wb

def run_lo(wb):
    t = tempfile.mkdtemp(); src = os.path.join(t, "t.xlsx"); wb.save(src)
    out = os.path.join(t, "out"); os.mkdir(out)
    subprocess.run(["soffice", "--headless", "--convert-to", "xlsx", "--outdir", out, src], check=True, capture_output=True)
    return load_workbook(os.path.join(out, "t.xlsx"), data_only=True)

num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
isdate = lambda v: isinstance(v, dt.date) and not (isinstance(v, dt.datetime) and (v.hour or v.minute or v.second))
empty = lambda v: v in (None, "")
key = lambda v: v.lower() if isinstance(v, str) else v
ser = lambda v: v.toordinal()
def m1(v): return dt.date(v.year, v.month, 1)
def addm(v, k):
    y, m = divmod(v.year * 12 + v.month - 1 + k, 12); return dt.date(y, m + 1, 1)

def expect(rows, base):
    out = []
    for a, b, c, dd, e in rows:
        if all(empty(x) for x in (a, b, c, dd, e)): out.append(("", "")); continue
        err = None
        if empty(a): err = "請求番号が空欄"
        elif sum(1 for x in rows if not empty(x[0]) and key(x[0]) == key(a)) > 1: err = "請求番号が重複"
        elif empty(c): err = "請求額が空欄"
        elif not num(c): err = "請求額が数字でない"
        elif c < 1 or c != int(c): err = "請求額は1以上の整数"
        elif empty(dd): err = "入金予定日が空欄"
        elif not isdate(dd): err = "入金予定日が日付でない"
        elif not empty(e) and not isdate(e): err = "入金日が日付でない"
        if err: out.append(("", err)); continue
        if not empty(e): out.append(("入金済", "")); continue
        if not isdate(base): out.append(("基準日を入力", "")); continue
        out.append(("期限超過" if ser(dd) < ser(base) else "入金待ち", ""))
    return out

def exp_sum(rows, ex, base):
    over = [r for r, x in zip(rows, ex) if x[0] == "期限超過"]
    wait = [r for r, x in zip(rows, ex) if x[0] == "入金待ち"]
    summ = (len(over), sum(r[2] for r in over), sum(r[2] for r in wait), sum(1 for x in ex if x[1]))
    if not isdate(base): return summ, None
    months = [addm(base, k) for k in range(12)]
    tbl = [(sum(1 for r in wait if m1(r[3]) == m), sum(r[2] for r in wait if m1(r[3]) == m)) for m in months]
    cnt = sum(t[0] for t in tbl)
    return summ, (months, tbl, cnt, sum(t[1] for t in tbl), len(wait) - cnt)

def cv(v):
    if isinstance(v, dt.datetime): return v.date()
    return "" if v is None else v

def read(wb, n):
    ws = wb["入金予定"]
    res = [tuple(cv(ws.cell(r, c).value) for c in (6, 7)) for r in range(2, n + 2)]
    summ = tuple(cv(ws[k].value) for k in ("K5", "K6", "K7", "K8"))
    if cv(ws["L2"].value) == "": return res, summ, None
    months = [cv(ws[f"L{r}"].value) for r in range(2, 14)]
    tbl = [(cv(ws[f"M{r}"].value), cv(ws[f"N{r}"].value)) for r in range(2, 14)]
    return res, summ, (months, tbl, cv(ws["M14"].value), cv(ws["N14"].value), cv(ws["M15"].value))

def check(rows, base):
    e = expect(rows, base); es, et = exp_sum(rows, e, base)
    g, gs, gt = read(run_lo(build(rows, base)), len(rows))
    return g == e and gs == es and gt == et, g, e, (gs, gt), (es, et)

S = lambda name, rows, base=BASE: (name, rows, base)
SCEN = [
 S("入金予定日が基準日と同じ日(入金待ち)", [("S-001", "山田邸", 800000, d(0), None)]),
 S("入金予定日が基準日の前日(期限超過)", [("S-001", "山田邸", 800000, d(-1), None)]),
 S("入金予定日が基準日の翌日(入金待ち)", [("S-001", "山田邸", 800000, d(1), None)]),
 S("入金済(入金日あり)", [("S-001", "山田邸", 800000, d(-20), d(-18))]),
 S("入金済で入金予定日が先(早めに入金)", [("S-001", "山田邸", 800000, d(20), d(-1))]),
 S("入金予定日が月末(10/31)", [("S-001", "山田邸", 100000, dt.date(2026, 10, 31), None)]),
 S("入金予定日が月初(11/1)", [("S-001", "山田邸", 100000, dt.date(2026, 11, 1), None)]),
 S("基準日の月の最終日と翌月初が別の月に入る", [("S-001", "山田邸", 100000, dt.date(2026, 10, 31), None), ("S-002", "佐藤邸", 200000, dt.date(2026, 11, 1), None)]),
 S("12か月目の最後の日(2027/09/30)", [("S-001", "山田邸", 100000, dt.date(2027, 9, 30), None)]),
 S("13か月目の初日(2027/10/01=表の外)", [("S-001", "山田邸", 100000, dt.date(2027, 10, 1), None)]),
 S("年またぎ(基準日2026/12/20、翌年1月)", [("S-001", "山田邸", 100000, dt.date(2027, 1, 5), None)], dt.date(2026, 12, 20)),
 S("うるう日(基準日2028/02/10、2028/02/29)", [("S-001", "山田邸", 100000, dt.date(2028, 2, 29), None)], dt.date(2028, 2, 10)),
 S("請求番号が空欄", [(None, "山田邸", 800000, d(5), None)]),
 S("請求番号が重複(大文字小文字違い)", [("S-001", "山田邸", 800000, d(5), None), ("s-001", "佐藤邸", 300000, d(9), None)]),
 S("請求額が空欄", [("S-001", "山田邸", None, d(5), None)]),
 S("請求額が文字『80万』", [("S-001", "山田邸", "80万", d(5), None)]),
 S("請求額が全角『８００，０００』", [("S-001", "山田邸", "８００，０００", d(5), None)]),
 S("請求額が0", [("S-001", "山田邸", 0, d(5), None)]),
 S("請求額が小数", [("S-001", "山田邸", 1000.5, d(5), None)]),
 S("請求額がマイナス", [("S-001", "山田邸", -5000, d(5), None)]),
 S("入金予定日が空欄", [("S-001", "山田邸", 800000, None, None)]),
 S("入金予定日が全角の文字『２０２６/１０/２０』", [("S-001", "山田邸", 800000, "２０２６/１０/２０", None)]),
 S("入金予定日が0", [("S-001", "山田邸", 800000, 0, None)]),
 S("入金予定日に時刻つき", [("S-001", "山田邸", 800000, dt.datetime(2026, 10, 20, 12, 0), None)]),
 S("入金日が文字『済』", [("S-001", "山田邸", 800000, d(5), "済")]),
 S("入金日が空欄で入金予定日も空欄の行は止める", [("S-001", "山田邸", 800000, None, d(1))]),
 S("基準日が空欄(未入金の行は『基準日を入力』、月別表は空)", [("S-001", "山田邸", 800000, d(5), None), ("S-002", "佐藤邸", 300000, d(-5), d(-3))], None),
 S("基準日が文字", [("S-001", "山田邸", 800000, d(5), None)], "今日"),
 S("集計(期限超過2件・今月2件・翌月1件・入金済1件・表の外1件)", [("S-001", "山田邸", 800000, d(-30), None), ("S-002", "佐藤邸", 300000, d(-2), None), ("S-003", "鈴木邸", 150000, d(3), None), ("S-004", "高橋邸", 500000, d(10), None), ("S-005", "田中邸", 200000, d(30), None), ("S-006", "中村邸", 700000, d(-10), d(-9)), ("S-007", "小林邸", 90000, d(500), None)]),
 S("空行をはさむ", [(None, None, None, None, None), ("S-001", "山田邸", 800000, d(8), None)]),
]

def main():
    ng = 0
    for name, rows, base in SCEN:
        ok, g, e, gg, ee = check(rows, base); ng += not ok
        print(("OK " if ok else "NG ") + f"{name}: {g}")
        if not ok: print("   期待", e, ee, "\n   実際", gg)
    rnd = random.Random(20261029); rows = []
    for i in range(500):
        dd = d(rnd.randint(-60, 420)); e = rnd.choice([None, None, d(rnd.randint(-60, 5))])
        a = f"S-{i:03d}"; b = f"邸{i}"; c = rnd.randint(1, 300) * 10000; x = rnd.random()
        if x < 0.02: a = None
        elif x < 0.04: a = rows[i - 1][0] if i else a
        elif x < 0.06: dd = rnd.choice(["２０２６/１０/２０", "未定", 0, None, dt.datetime(2026, 10, 20, 9, 0)])
        elif x < 0.08: e = rnd.choice(["済", "２０２６/１０/５", 0])
        elif x < 0.10: c = rnd.choice([None, "80万", 0, 1000.5, -5])
        rows.append((a, b, c, dd, e))
    ok, g, e, gg, ee = check(rows, BASE); ng += not ok
    print(("OK " if ok else "NG ") + f"ランダム照合: {len(rows)}行 全項目一致={ok} 集計={gg}")
    if not ok:
        for i, (x, y) in enumerate(zip(g, e)):
            if x != y: print("  行", i + 2, rows[i], x, y); break
        print("  集計", gg, ee)
    print("不一致あり" if ng else "全件一致")
    sys.exit(1 if ng else 0)

if __name__ == "__main__":
    main()
