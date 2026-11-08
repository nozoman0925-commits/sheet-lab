"""記事『工期の完了予定日を休工日(日曜・お盆など)を除いて出す式』をLibreOfficeで再計算し、Pythonの日数計算と照合する。
使い方: python3 site/verify/work_end_date.py   (soffice が必要。不一致なら終了コード1)"""
import subprocess, sys, tempfile, os, random, datetime
from openpyxl import Workbook, load_workbook
D = datetime.date
H0 = 2  # 休工日リストの開始行
HN = 40

def build(rows, holidays):
    wb = Workbook(); ws = wb.active; ws.title = "工期"; hs = wb.create_sheet("休工日")
    hs.cell(1, 1, "休工日(日曜以外)")
    for i, h in enumerate(holidays, H0): hs.cell(i, 1, h)
    for i, h in enumerate(["工種", "開始日", "作業日数", "チェック", "完了予定日"], 1): ws.cell(1, i, h)
    ws["H1"] = "休工日リストの確認"
    ws["I1"] = f'=IF(COUNTA(休工日!$A${H0}:$A${HN})>COUNT(休工日!$A${H0}:$A${HN}),"休工日に日付でないものがある","")'
    for r, (k, s, n) in enumerate(rows, 2):
        ws.cell(r, 1, k); ws.cell(r, 2, s); ws.cell(r, 3, n)
        ws.cell(r, 4, (f'=IF(AND(B{r}="",C{r}=""),"",IF(NOT(ISNUMBER(B{r})),"開始日が日付でない",IF(NOT(ISNUMBER(C{r})),"作業日数が数字でない",'
                       f'IF(OR(C{r}<1,C{r}<>INT(C{r})),"作業日数は1以上の整数",IF($I$1<>"","休工日リストを直す","")))))'))
        ws.cell(r, 5, f'=IF(OR(D{r}<>"",AND(B{r}="",C{r}="")),"",WORKDAY.INTL(B{r}-1,C{r},11,休工日!$A${H0}:$A${HN}))')
        ws.cell(r, 5).number_format = "yyyy/m/d"
    return wb

def run_lo(wb):
    d = tempfile.mkdtemp(); src = os.path.join(d, "t.xlsx"); wb.save(src)
    out = os.path.join(d, "out"); os.mkdir(out)
    subprocess.run(["soffice", "--headless", "--convert-to", "xlsx", "--outdir", out, src], check=True, capture_output=True)
    return load_workbook(os.path.join(out, "t.xlsx"), data_only=True)

def isd(v): return isinstance(v, D) and not isinstance(v, datetime.datetime)
def isnum(v): return isinstance(v, (int, float)) and not isinstance(v, bool)

def expected(row, holidays):
    k, s, n = row
    if s is None and n is None: return ("", None)
    if not isd(s): return ("開始日が日付でない", None)
    if not isnum(n): return ("作業日数が数字でない", None)
    if n < 1 or n != int(n): return ("作業日数は1以上の整数", None)
    if any(h is not None and not isd(h) for h in holidays): return ("休工日リストを直す", None)
    hs = {h for h in holidays if isd(h)}
    d = s - datetime.timedelta(days=1); cnt = 0
    while cnt < n:
        d += datetime.timedelta(days=1)
        if d.weekday() != 6 and d not in hs: cnt += 1
    return ("", d)

def check(rows, holidays, label):
    # 休工日リストに文字が入っているケースは1件目の行で確認(リスト全体の状態)
    ws = run_lo(build(rows, holidays))["工期"]
    bad = 0
    for r, row in enumerate(rows, 2):
        chk, fin = expected(row, holidays)
        gc = ws.cell(r, 4).value or ""
        gf = ws.cell(r, 5).value
        gf = gf.date() if isinstance(gf, datetime.datetime) else gf
        if gc != chk or (gf if fin else None) != fin and not (fin is None and gf in (None, "")):
            bad += 1; print("NG", label, r, row, "->", gc, gf, "期待", chk, fin)
    return bad, len(rows)

CASES = [
 ("基礎", D(2026,11,2), 5), ("日曜をまたぐ", D(2026,11,4), 6), ("日曜から開始", D(2026,11,8), 1),
 ("1日だけ", D(2026,11,10), 1), ("休工日(祝日)をまたぐ", D(2026,11,20), 5),
 ("お盆休みをまたぐ", D(2027,8,10), 6), ("年末年始をまたぐ", D(2026,12,26), 6),
 ("土曜は作業日", D(2026,11,6), 2), ("30日", D(2026,11,2), 30),
 ("開始日が文字", "11月2日", 5), ("開始日が空欄", None, 5), ("日数が空欄", D(2026,11,2), None),
 ("日数が文字", D(2026,11,2), "5日"), ("日数が0", D(2026,11,2), 0), ("日数が負", D(2026,11,2), -3),
 ("日数が小数", D(2026,11,2), 2.5), (None, None, None),
]
HOLS = [D(2026,11,3), D(2026,11,23), D(2026,12,29), D(2026,12,30), D(2026,12,31), D(2027,1,1), D(2027,1,2), D(2027,8,13), D(2027,8,14), D(2027,8,15)]

if __name__ == "__main__":
    total = bad = 0
    b, n = check(CASES, HOLS, "固定"); bad += b; total += n
    # 休工日に文字が混ざった場合
    b, n = check(CASES[:3], HOLS + ["お盆"], "休工日に文字"); bad += b; total += n
    # 休工日なし
    b, n = check(CASES[:9], [], "休工日なし"); bad += b; total += n
    random.seed(7)
    rows = []
    for i in range(500):
        s = D(2026,1,1) + datetime.timedelta(days=random.randint(0, 700))
        rows.append((f"r{i}", s, random.randint(1, 60)))
    hol = sorted({D(2026,1,1) + datetime.timedelta(days=random.randint(0, 800)) for _ in range(30)})
    b, n = check(rows, hol, "乱数"); bad += b; total += n
    print(f"{total}行を照合 NG={bad}")
    sys.exit(1 if bad else 0)
