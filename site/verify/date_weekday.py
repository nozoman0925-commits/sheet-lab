"""記事『年と月から日付と曜日を出す』をLibreOfficeで再計算して期待値と照合する。
使い方: python3 site/verify/date_weekday.py"""
import subprocess, sys, tempfile, os, datetime, calendar
from openpyxl import Workbook, load_workbook

YM = [(2024,2),(2023,2),(2026,10),(2026,12),(2025,1),(2100,2),(2000,2),(2026,4),(2027,3),(2028,2)]
WD = "日月火水木金土"
def todate(v):
    if isinstance(v,(int,float)): return datetime.date(1899,12,30)+datetime.timedelta(int(v))
    return v.date() if hasattr(v,'date') else v
def main():
    wb = Workbook(); ws = wb.active
    # A:年 B:月 C:1日 D:月末日 E:日数 F:1日の曜日(TEXT) G:最終日の曜日(CHOOSE+WEEKDAY) H:15日 I:31日目(月に無ければ空)
    for i,(y,m) in enumerate(YM,2):
        ws.cell(i,1,y); ws.cell(i,2,m)
        ws.cell(i,3,f"=DATE(A{i},B{i},1)")
        ws.cell(i,4,f"=EOMONTH(C{i},0)")
        ws.cell(i,5,f"=DAY(D{i})")
        ws.cell(i,6,f'=CHOOSE(WEEKDAY(C{i}),"日","月","火","水","木","金","土")')
        ws.cell(i,7,f'=CHOOSE(WEEKDAY(D{i}),"日","月","火","水","木","金","土")')
        ws.cell(i,8,f"=C{i}+14")
        ws.cell(i,9,f'=IF(DAY(C{i}+30)=31,C{i}+30,"")')
    d = tempfile.mkdtemp(); src = os.path.join(d,"t.xlsx"); wb.save(src)
    out = os.path.join(d,"o"); os.mkdir(out)
    subprocess.run(["soffice","--headless","--convert-to","xlsx","--outdir",out,src],check=True,capture_output=True)
    r = load_workbook(os.path.join(out,"t.xlsx"),data_only=True).active
    ng=0; n=0
    for i,(y,m) in enumerate(YM,2):
        first=datetime.date(y,m,1); nd=calendar.monthrange(y,m)[1]; last=datetime.date(y,m,nd)
        w=lambda d: WD[(d.weekday()+1)%7]
        d31 = datetime.date(y,m,1)+datetime.timedelta(30)
        exp=(first,last,nd,w(first),w(last),first+datetime.timedelta(14), d31 if nd==31 else None)
        g=lambda c:r.cell(i,c).value
        got=(g(3).date() if hasattr(g(3),'date') else g(3), todate(g(4)), g(5), g(6), g(7),
             g(8).date() if hasattr(g(8),'date') else g(8),
             (g(9).date() if hasattr(g(9),'date') else None) if g(9) not in (None,"") else None)
        ok = got==exp; ng+=not ok; n+=7
        print(("OK " if ok else "NG ")+f"{y}年{m}月: 月末{got[1]} {got[2]}日 1日={got[3]} 末日={got[4]} 31日目={got[6]}")
        if not ok: print("  期待",exp)
    print("検証",n,"件 不一致",ng,"月"); sys.exit(1 if ng else 0)
main()
