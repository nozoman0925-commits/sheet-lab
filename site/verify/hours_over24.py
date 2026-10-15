"""記事『勤務時間の合計が24時間を超えたとき』の式をLibreOfficeで再計算して期待値と照合する。
使い方: python3 site/verify/hours_over24.py   (soffice が必要。不一致なら終了コード1)"""
import subprocess, sys, tempfile, os, random
from openpyxl import Workbook, load_workbook

def mins(t): h,m=t.split(":"); return int(h)*60+int(m)
def hm(m): return f"{m//60}:{m%60:02d}"

# 日ごとの勤務時間の並び(h:mm)。合計の表示を比べる
SETS = [["8:00"]*3, ["8:00"]*5, ["7:45","8:15","8:30","8:00","7:30"], ["8:00"]*20+["7:30"],
        ["12:00","12:00"], ["12:00","12:01"], ["1:00"]*25, ["23:59","23:59"], ["8:00"]]
def run(wb):
    d = tempfile.mkdtemp(); src = os.path.join(d, "t.xlsx"); wb.save(src)
    out = os.path.join(d, "out"); os.mkdir(out)
    subprocess.run(["soffice","--headless","--convert-to","xlsx","--outdir",out,src], check=True, capture_output=True)
    return load_workbook(os.path.join(out,"t.xlsx"), data_only=True).active

def main():
    ng = 0
    random.seed(7)
    sets = SETS + [[hm(random.randint(0,720)) for _ in range(random.randint(2,31))] for _ in range(40)]
    wb = Workbook(); ws = wb.active
    # 各行: A.. = 時刻値, 33列目以降に結果
    for r,items in enumerate(sets,1):
        for c,t in enumerate(items,1):
            h,m=t.split(":"); ws.cell(r,c,f"=TIME({h},{m},0)")
        last = ws.cell(r,len(items)).column_letter
        ws.cell(r,40,f"=SUM(A{r}:{last}{r})")
        ws.cell(r,41,f'=TEXT(AN{r},"[h]:mm")')      # 24時間を超えて表示
        ws.cell(r,42,f'=TEXT(AN{r},"h:mm")')        # 24時間で戻る表示
        ws.cell(r,43,f"=ROUND(AN{r}*24,2)")         # 小数の時間
        ws.cell(r,44,f"=INT(ROUND(AN{r}*1440,0)/60)")  # 時間の部分
        ws.cell(r,45,f"=MOD(ROUND(AN{r}*1440,0),60)")  # 分の部分
        ws.cell(r,46,f"=ROUND(AN{r}*1440,0)")       # 合計の分(整数)
    res = run(wb)
    for r,items in enumerate(sets,1):
        tot = sum(mins(t) for t in items)
        got = [res.cell(r,c).value for c in range(41,47)]
        exp = [hm(tot), hm(tot%1440), round(tot/60+1e-12,2), tot//60, tot%60, tot]
        ok = got[0]==exp[0] and got[1]==exp[1] and abs(got[2]-exp[2])<1e-9 and got[3:]==exp[3:]
        ng += not ok
        tag = f"{len(items)}件" if len(items)>6 else str(items)
        print(("OK " if ok else "NG ")+f"{tag}: [h]:mm={got[0]!r} h:mm={got[1]!r} 小数={got[2]} 分={got[5]} (期待 {exp})")
    # 文字列の時刻はSUMされない/数値扱いを確認
    wb = Workbook(); ws = wb.active
    ws["A1"] = "8:00"; ws["A1"].number_format = "@"   # 文字列
    ws["A2"] = "=TIME(8,0,0)"
    ws["B1"] = "=SUM(A1:A2)"; ws["B2"] = "=ISTEXT(A1)"; ws["B3"] = "=TIMEVALUE(A1)*24"; ws["B4"] = "=SUM(A1:A2)*24"
    ws["B5"] = "=SUM(TIMEVALUE(A1),A2)*24"
    for k in range(1,6): ws.cell(k,2).number_format = "0.000000"
    res = run(wb)
    vals = [res["B1"].value, res["B2"].value, res["B3"].value, res["B4"].value, res["B5"].value]
    exp = [1/3, True, 8.0, 8.0, 16.0]
    ok = abs(vals[0]-exp[0])<1e-9 and vals[1] in (True, 1) and all(abs(a-b)<1e-9 for a,b in zip(vals[2:],exp[2:]))
    ng += not ok
    print(("OK " if ok else "NG ")+f"文字列の8:00: SUM={vals[0]} ISTEXT={vals[1]} TIMEVALUE*24={vals[2]} SUM*24={vals[3]} SUM(TIMEVALUE,..)*24={vals[4]}")
    print("不一致", ng, "件"); sys.exit(1 if ng else 0)
main()
