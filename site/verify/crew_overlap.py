"""記事『同じ職人が同じ日に2つの現場に入っていないかをExcelで調べる式』をLibreOfficeで再計算し、Pythonの総当たりと照合する。
使い方: python3 site/verify/crew_overlap.py   (soffice が必要。不一致なら終了コード1)"""
import subprocess, sys, tempfile, os, random, datetime as dt
from openpyxl import Workbook, load_workbook

N = 40  # 数式の範囲の最終行(照合する行数以上にする)

def build(rows):
    wb = Workbook(); ws = wb.active; ws.title = "配置"
    for i, h in enumerate(["工事名", "担当", "開始日", "終了日", "入力チェック", "有効", "重なり数", "判定"], 1): ws.cell(1, i, h)
    last = len(rows) + 1
    for r, (k, p, s, e) in enumerate(rows, 2):
        ws.cell(r, 1, k); ws.cell(r, 2, p); ws.cell(r, 3, s); ws.cell(r, 4, e)
        for c in (3, 4):
            if isinstance(ws.cell(r, c).value, dt.date): ws.cell(r, c).number_format = "yyyy/m/d"
        ws.cell(r, 5, f'=IF(AND(B{r}="",C{r}="",D{r}=""),"",IF(B{r}="","担当が空欄",IF(NOT(ISNUMBER(C{r})),"開始日が日付でない",IF(NOT(ISNUMBER(D{r})),"終了日が日付でない",IF(D{r}<C{r},"終了日が開始日より前","")))))')
        ws.cell(r, 6, f'=IF(AND(B{r}<>"",E{r}="",NOT(AND(B{r}="",C{r}="",D{r}=""))),1,0)')
        ws.cell(r, 7, f'=IF(F{r}=1,COUNTIFS($B$2:$B${last},B{r},$F$2:$F${last},1,$C$2:$C${last},"<="&D{r},$D$2:$D${last},">="&C{r})-1,"")')
        ws.cell(r, 8, f'=IF(E{r}<>"",E{r},IF(F{r}=0,"",IF(G{r}>0,"重なりあり("&G{r}&"件)","OK")))')
    return wb

def run_lo(wb):
    d = tempfile.mkdtemp(); src = os.path.join(d, "t.xlsx"); wb.save(src)
    out = os.path.join(d, "out"); os.mkdir(out)
    subprocess.run(["soffice", "--headless", "--convert-to", "xlsx", "--outdir", out, src], check=True, capture_output=True)
    return load_workbook(os.path.join(out, "t.xlsx"), data_only=True)

def isd(v): return isinstance(v, dt.date)
def expected(rows):
    res = []
    def chk(row):
        k, p, s, e = row
        if p in (None, "") and s is None and e is None: return ""
        if p in (None, ""): return "担当が空欄"
        if not isd(s): return "開始日が日付でない"
        if not isd(e): return "終了日が日付でない"
        if e < s: return "終了日が開始日より前"
        return ""
    chks = [chk(r) for r in rows]
    for i, row in enumerate(rows):
        if chks[i]: res.append(chks[i]); continue
        if row[1] in (None, "") and row[2] is None and row[3] is None: res.append(""); continue
        n = sum(1 for j, o in enumerate(rows) if j != i and not chks[j] and o[1] == row[1] and o[2] <= row[3] and o[3] >= row[2])
        res.append(f"重なりあり({n}件)" if n else "OK")
    return res

def check(rows, label):
    ws = run_lo(build(rows))["配置"]; bad = 0
    exp = expected(rows)
    for r, (row, ex) in enumerate(zip(rows, exp), 2):
        g = ws.cell(r, 8).value or ""
        if g != ex: bad += 1; print("NG", label, r, row, "->", g, "期待", ex)
    return bad, len(rows)

D = lambda m, d: dt.date(2026, m, d)
CASES = [
 ("A邸 内装", "田中", D(12, 1), D(12, 5)),
 ("B邸 水まわり", "田中", D(12, 5), D(12, 8)),      # A邸と12/5が重なる
 ("C邸 外壁", "田中", D(12, 9), D(12, 12)),          # 重ならない(前日で終了)
 ("D邸 解体", "鈴木", D(12, 1), D(12, 3)),
 ("E邸 解体", "鈴木", D(12, 4), D(12, 6)),           # 日が隣り合うだけ=OK
 ("F邸 大工", "佐藤", D(12, 1), D(12, 20)),
 ("G邸 大工", "佐藤", D(12, 10), D(12, 10)),         # 1日だけの工事がF邸の期間内
 ("H邸 大工", "佐藤", D(12, 10), D(12, 11)),         # F・Gと重なる(2件)
 ("I邸 担当空欄", None, D(12, 1), D(12, 2)),
 ("J邸 開始が文字", "山本", "12月1日", D(12, 2)),
 ("K邸 終了が空欄", "山本", D(12, 1), None),
 ("L邸 日付の逆転", "山本", D(12, 9), D(12, 3)),     # 逆転行は判定に使わない
 ("M邸 山本", "山本", D(12, 1), D(12, 30)),          # 逆転・不正行があっても、有効な行とだけ比べる
 (None, None, None, None),
 ("N邸 全角名", "田中", D(12, 20), D(12, 22)),
 ("O邸 全角スペース", "田中 ", D(12, 20), D(12, 21)), # 「田中 」は別人扱いになる(注意として記事に書く)
]
if __name__ == "__main__":
    total = bad = 0
    b, n = check(CASES, "固定"); bad += b; total += n
    random.seed(5)
    names = ["田中", "鈴木", "佐藤", "山本", "高橋"]
    for t in range(10):
        rows = []
        for i in range(36):
            s = D(12, 1) + dt.timedelta(days=random.randint(0, 40)); e = s + dt.timedelta(days=random.randint(0, 6))
            p = random.choice(names)
            roll = random.random()
            if roll < 0.04: p = None
            elif roll < 0.08: s = "未定"
            elif roll < 0.12: e = None
            elif roll < 0.16: s, e = e, s
            rows.append((f"r{i}", p, s, e))
        b, n = check(rows, f"乱数{t}"); bad += b; total += n
    print(f"{total}行を照合 NG={bad}")
    sys.exit(1 if bad else 0)
