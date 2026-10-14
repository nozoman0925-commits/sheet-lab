"""記事『エクセルで氏名を姓と名に分ける方法』をLibreOfficeで再計算して期待値と照合する。
使い方: python3 site/verify/name_split.py"""
import subprocess, sys, tempfile, os, re
from openpyxl import Workbook, load_workbook

NBSP = " "
CASES = [
    "山田 太郎",            # 半角スペース
    "山田　太郎",       # 全角スペース
    "山田太郎",             # スペースなし
    " 山田 太郎 ",          # 前後にスペース
    "山田  太郎",           # 半角スペース2個
    "山田 　太郎",      # 半角+全角
    "佐々木 花子",
    "ジョン スミス",
    "ジョン ポール スミス", # スペース2か所
    "",                     # 空欄
    "山田 ",                # 姓だけ+末尾スペース
    "田中" + NBSP + "次郎", # 特殊なスペース(U+00A0)
    "山田",                 # 姓だけ
    "高橋　　一郎",         # 全角2個
]
# 式。A列=元、B列=整えた氏名、C=判定、D=姓、E=名。F=特殊スペースも直す版のB列
FORM_B = '=IF(A{r}="","",TRIM(SUBSTITUTE(A{r},"　"," ")))'
FORM_C = '=IF(A{r}="","",IF(LEN(B{r})-LEN(SUBSTITUTE(B{r}," ",""))=1,"OK","要確認"))'
FORM_D = '=IF(C{r}="OK",LEFT(B{r},FIND(" ",B{r})-1),"")'
FORM_E = '=IF(C{r}="OK",MID(B{r},FIND(" ",B{r})+1,LEN(B{r})),"")'
FORM_F = '=IF(A{r}="","",TRIM(SUBSTITUTE(SUBSTITUTE(A{r},"　"," "),_xlfn.UNICHAR(160)," ")))'

def expected(a, fix_nbsp=False):
    s = a.replace("　", " ")
    if fix_nbsp: s = s.replace(NBSP, " ")
    b = re.sub(r" +", " ", s).strip(" ") if a != "" else ""
    if a == "": return ("", "", "", "")
    ok = b.count(" ") == 1
    if ok:
        sei, mei = b.split(" ")
        return (b, "OK", sei, mei)
    return (b, "要確認", "", "")

def main():
    wb = Workbook(); ws = wb.active
    for i, a in enumerate(CASES, 2):
        if a != "": ws.cell(i, 1, a)
        for col, f in zip("BCDEF", (FORM_B, FORM_C, FORM_D, FORM_E, FORM_F)):
            ws[f"{col}{i}"] = f.format(r=i)
    d = tempfile.mkdtemp(); src = os.path.join(d, "t.xlsx"); wb.save(src)
    out = os.path.join(d, "o"); os.mkdir(out)
    subprocess.run(["soffice", "--headless", "--convert-to", "xlsx", "--outdir", out, src], check=True, capture_output=True)
    ws = load_workbook(os.path.join(out, "t.xlsx"), data_only=True).active
    ng = 0
    for i, a in enumerate(CASES, 2):
        got = tuple((ws.cell(i, c).value or "") for c in (2, 3, 4, 5))
        exp = expected(a)
        gotF = (ws.cell(i, 6).value or "")
        expF = expected(a, True)[0]
        ok = got == exp and gotF == expF
        ng += not ok
        print(("OK " if ok else "NG ") + f"{a!r}: 整形{got[0]!r} 判定{got[1]!r} 姓{got[2]!r} 名{got[3]!r} F列{gotF!r} (期待 {exp} / {expF!r})")
    print("不一致", ng, "件 /", len(CASES), "ケース x 5列 =", len(CASES) * 5, "件")
    sys.exit(1 if ng else 0)
main()
