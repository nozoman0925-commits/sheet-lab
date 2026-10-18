"""記事『工事ごとの粗利を費目別に見る式』をLibreOfficeで再計算して期待値(Python)と照合する。
使い方: python3 site/verify/job_margin.py   (soffice が必要。不一致なら終了コード1)"""
import subprocess, sys, tempfile, os, random
from openpyxl import Workbook, load_workbook

N = 2000

CATS = ["材料", "外注", "経費"]
TARGET = 0.2  # 目標粗利率(台帳 K1)

def build(projects, costs):
    """projects: [(番号, 契約金額)], costs: [(番号(セルの値そのまま), 費目, 原価額)]"""
    wb = Workbook(); led = wb.active; led.title = "台帳"; cs = wb.create_sheet("原価")
    for i, h in enumerate(["工事番号", "契約金額(税抜)", "材料費", "外注費", "経費", "原価合計", "粗利", "粗利率", "状態"], 1): led.cell(1, i, h)
    for i, h in enumerate(["工事番号", "費目", "原価額(税抜)", "整えた番号", "チェック"], 1): cs.cell(1, i, h)
    for r, (no, amt) in enumerate(projects, 2):
        led.cell(r, 1, no); led.cell(r, 2, amt)
        for j, cat in enumerate(CATS):
            col = "CDE"[j]
            led.cell(r, 3 + j, f'=IF($A{r}="","",SUMIFS(原価!$C$2:$C${N},原価!$D$2:$D${N},$A{r},原価!$B$2:$B${N},{col}$1))')
        led.cell(r, 6, f'=IF(A{r}="","",SUM(C{r}:E{r}))')
        led.cell(r, 7, f'=IF(A{r}="","",B{r}-F{r})')
        led.cell(r, 8, f'=IF(A{r}="","",IF(B{r}=0,"",G{r}/B{r}))')
        led.cell(r, 9, f'=IF(A{r}="","",IF(B{r}=0,"契約金額が0",IF(F{r}=0,"原価未入力",IF(G{r}<0,"赤字",IF(H{r}<$L$1,"目標未達","")))))')
    led["C1"], led["D1"], led["E1"] = "材料", "外注", "経費"
    for r, (no, cat, amt) in enumerate(costs, 2):
        cs.cell(r, 1, no); cs.cell(r, 2, cat); cs.cell(r, 3, amt)
        cs.cell(r, 4, f'=ASC(TRIM(A{r}))')
        cs.cell(r, 5, (f'=IF(AND(A{r}="",C{r}=""),"",IF(A{r}="","工事番号が空欄",IF(ISNA(MATCH(D{r},台帳!$A$2:$A${N},0)),"工事番号なし",'
                       f'IF(ISNA(MATCH(B{r},台帳!$C$1:$E$1,0)),"費目が不明",""))))'))
    led["K1"], led["L1"] = "目標粗利率", TARGET
    led["K2"], led["L2"] = "未集計の原価", f'=SUM(原価!C2:C{N})-SUM(F2:F{N})'
    return wb

def run_lo(wb):
    d = tempfile.mkdtemp(); src = os.path.join(d, "t.xlsx"); wb.save(src)
    out = os.path.join(d, "out"); os.mkdir(out)
    subprocess.run(["soffice", "--headless", "--convert-to", "xlsx", "--outdir", out, src], check=True, capture_output=True)
    return load_workbook(os.path.join(out, "t.xlsx"), data_only=True)

def fw(s):
    return "".join("－" if c == "-" else chr(ord(c) + 0xFEE0) if "!" <= c <= "~" else c for c in s)

def norm(v):
    if v is None: return ""
    return "".join(chr(ord(c) - 0xFEE0) if "！" <= c <= "～" else ("-" if c == "－" else c) for c in str(v).replace("　", " ").strip())

def expected(projects, costs):
    keys = {no: amt for no, amt in projects}
    cat = {k: {c: 0 for c in CATS} for k in keys}; flags = []; unl = 0
    for no, c, amt in costs:
        k = norm(no); amt = amt or 0
        if no in (None, "") and amt == 0: flags.append(""); continue
        if no in (None, ""): flags.append("工事番号が空欄"); unl += amt; continue
        if k not in keys: flags.append("工事番号なし"); unl += amt; continue
        if c not in CATS: flags.append("費目が不明"); unl += amt; continue
        cat[k][c] += amt; flags.append("")
    rows = {}
    for no, amt in projects:
        tot = sum(cat[no].values()); g = amt - tot
        rate = None if amt == 0 else g / amt
        st = "契約金額が0" if amt == 0 else "原価未入力" if tot == 0 else "赤字" if g < 0 else "目標未達" if rate < TARGET else ""
        rows[no] = (tuple(cat[no][c] for c in CATS), tot, g, rate, st)
    return rows, flags, unl

def check(res, projects, costs):
    led, cs = res["台帳"], res["原価"]
    rows, flags, unl = expected(projects, costs)
    ok = True; shown = []
    for r, (no, amt) in enumerate(projects, 2):
        cats, tot, g, rate, st = rows[no]
        got = (tuple(led.cell(r, c).value for c in (3, 4, 5)), led.cell(r, 6).value, led.cell(r, 7).value)
        gr, gs = led.cell(r, 8).value, (led.cell(r, 9).value or "")
        good = got == (cats, tot, g) and gs == st and ((rate is None and gr in (None, "")) or (rate is not None and gr not in (None, "") and abs(gr - rate) < 1e-9))
        ok &= good; shown.append((no, cats, tot, g, None if gr in (None, "") else round(gr, 4), gs))
    gf = [(cs.cell(r, 5).value or "") for r in range(2, len(costs) + 2)]
    ok &= gf == flags and led["L2"].value == unl
    return ok, shown, gf, led["L2"].value

D = None
SCEN = [
 ("通常(材料・外注・経費)", [("K-001", 1000000)], [("K-001","材料",400000),("K-001","外注",250000),("K-001","経費",50000)]),
 ("赤字", [("K-002", 500000)], [("K-002","材料",400000),("K-002","外注",200000)]),
 ("目標未達(粗利率15%)", [("K-003", 1000000)], [("K-003","材料",850000)]),
 ("ちょうど目標(粗利率20%)", [("K-004", 1000000)], [("K-004","材料",800000)]),
 ("原価未入力", [("K-005", 800000)], []),
 ("契約金額0(0除算)", [("K-006", 0)], [("K-006","材料",50000)]),
 ("存在しない工事番号", [("K-007", 800000)], [("K-070","材料",100000)]),
 ("工事番号が空欄", [("K-008", 800000)], [(None,"材料",100000)]),
 ("費目の書き間違い(材量)", [("K-009", 800000)], [("K-009","材量",100000),("K-009","材料",30000)]),
 ("全角・前後スペース", [("K-010", 800000)], [("Ｋ－010","材料",100000),(" K-010 ","外注",50000)]),
 ("端数の粗利率", [("K-011", 3000000)], [("K-011","材料",1234567)]),
]

def main():
    ng = 0
    for name, projects, costs in SCEN:
        ok, shown, gf, unl = check(run_lo(build(projects, costs)), projects, costs)
        ng += not ok
        print(("OK " if ok else "NG ") + f"{name}: {shown} チェック{gf} 未集計{unl}")
    rnd = random.Random(20261019)
    projects = [(f"K-{i:03d}", rnd.choice([0] + [rnd.randint(1, 500) * 10000] * 40)) for i in range(1, 301)]
    costs = []
    for _ in range(1000):
        t = rnd.random(); p = rnd.choice(projects); amt = rnd.randint(1, 60) * 10000; c = rnd.choice(CATS)
        if t < .76: costs.append((p[0], c, amt))
        elif t < .82: costs.append(("K-9%02d" % rnd.randint(0, 99), c, amt))
        elif t < .87: costs.append((None, c, amt))
        elif t < .91: costs.append((fw(p[0]), c, amt))
        elif t < .95: costs.append((" " + p[0] + " ", c, amt))
        else: costs.append((p[0], rnd.choice(["材量", "", "その他"]) or None, amt))
    ok, _, _, _ = check(run_lo(build(projects, costs)), projects, costs)
    ng += not ok
    print(("OK " if ok else "NG ") + f"ランダム照合: 工事300件・原価1000行 一致={ok}")
    print("不一致あり" if ng else "全件一致"); sys.exit(1 if ng else 0)

if __name__ == "__main__":
    main()
