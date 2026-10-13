"""記事『電話番号の先頭の0が消えるときの直し方』の数式・書式をLibreOfficeで再計算して期待値と照合する。
使い方: python3 site/verify/phone_leading_zero.py   (soffice が必要。不一致なら終了コード1)"""
import subprocess, sys, tempfile, os, csv
from openpyxl import Workbook, load_workbook

# 数値として入っているセル(先頭0は既に消えている): (入力, 9・10桁なら0を足す式の期待値, TEXT固定10桁の期待値, TEXT固定11桁の期待値)
NUM = [
    (312345678,   "0312345678",  "0312345678", "00312345678"),   # 03-1234-5678 の0が消えた(9桁)
    (9012345678,  "09012345678", "9012345678", "09012345678"),   # 090-1234-5678 の0が消えた(10桁)
    (1201234567,  "01201234567", "1201234567", "01201234567"),   # 0120-123-4567 の0が消えた(10桁)
    (12345678,    "12345678",    "0012345678", "00012345678"),   # 8桁: 電話番号の想定外。式は触らない
]
# 文字列として入っているセル(0は残っている)
TXT = ["0312345678", "09012345678", "03-1234-5678"]
F_ADD = '=IF(AND(ISNUMBER(A{r}),OR(LEN(A{r})=9,LEN(A{r})=10)),"0"&A{r},A{r})'

def main():
    wb = Workbook(); ws = wb.active
    r = 1
    for inp, *_ in NUM:
        ws.cell(r, 1, inp)
        ws.cell(r, 2, F_ADD.format(r=r)); ws.cell(r, 3, f'=TEXT(A{r},"0000000000")'); ws.cell(r, 4, f'=TEXT(A{r},"00000000000")')
        ws.cell(r, 5, f"=ISNUMBER(B{r})"); r += 1
    for t in TXT:
        ws.cell(r, 1, t); ws.cell(r, 1).number_format = "@"
        ws.cell(r, 2, F_ADD.format(r=r)); ws.cell(r, 5, f"=ISNUMBER(A{r})"); r += 1
    # 表示形式だけで0を見せる(セルの値は数値のまま): 書式 0000000000 を数値セルに設定
    base = r + 1
    for i, (inp, *_ ) in enumerate(NUM[:2]):
        c = ws.cell(base + i, 1, inp); c.number_format = "0000000000"
        ws.cell(base + i, 2, f"=ISNUMBER(A{base+i})"); ws.cell(base + i, 3, f"=A{base+i}")
    d = tempfile.mkdtemp()
    src = os.path.join(d, "t.xlsx"); wb.save(src)
    out = os.path.join(d, "out"); os.mkdir(out)
    subprocess.run(["soffice", "--headless", "--convert-to", "xlsx", "--outdir", out, src], check=True, capture_output=True)
    subprocess.run(["soffice", "--headless", "--convert-to", "csv:Text - txt - csv (StarCalc):44,34,76,1,,0,false,true", "--outdir", out, src], check=True, capture_output=True)
    print(rows_dbg := None) if False else None
    res = load_workbook(os.path.join(out, "t.xlsx"), data_only=True).active
    rows = list(csv.reader(open(os.path.join(out, "t.csv"), encoding="utf-8")))
    ng = 0
    def chk(label, got, exp):
        nonlocal ng
        ok = got == exp; ng += not ok
        print(("OK " if ok else "NG ") + f"{label}: 期待{exp!r} 結果{got!r}")
    r = 1
    for inp, e_add, e10, e11 in NUM:
        chk(f"{inp} 式(9・10桁に0を足す)", str(res.cell(r, 2).value), e_add)
        chk(f"{inp} TEXT固定10桁", str(res.cell(r, 3).value), e10)
        chk(f"{inp} TEXT固定11桁", str(res.cell(r, 4).value), e11)
        r += 1
    for t in TXT:
        chk(f"文字列 {t!r} 式", str(res.cell(r, 2).value), t); r += 1
    chk("式の結果は文字列(ISNUMBER)", res.cell(1, 5).value, False)
    chk("元が文字列のセルはISNUMBER", res.cell(5, 5).value, False)
    # 書式で見せた場合: 表示(CSV)は0つき、値は数値のまま
    for i, (inp, *_ ) in enumerate(NUM[:2]):
        shown = rows[base - 1 + i][0]
        chk(f"{inp} 書式0000000000の表示", shown, "0312345678" if inp == 312345678 else "9012345678")
        chk(f"{inp} 書式設定後もISNUMBER", res.cell(base + i, 2).value, True)
    print("不一致", ng, "件"); sys.exit(1 if ng else 0)

main()
