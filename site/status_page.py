"""進捗ページ /status/ の本文を生成する(build_site.py から呼ぶ)。"""
import html, json, re, subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

E = html.escape
JST = timezone(timedelta(hours=9))
SKIP_WORDS = ("自動マージ", "dist再生成", "dist を再生成", "distを再生成")
EXTRA_CSS = """
.st ul{padding-left:1.2em}.st .num{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.st .num div{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 12px}
.st .num b{display:block;font-size:1.2rem}.st .tl li{margin:2px 0}
.st label{display:block;margin-top:12px;font-weight:600}
.st input[type=text],.st select,.st textarea{width:100%;font:inherit;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg)}
.st button{margin-top:14px;font:inherit;font-weight:700;padding:12px 18px;border:0;border-radius:10px;background:var(--acc);color:#fff;width:100%}
.st .req{border-bottom:1px solid var(--line);padding:8px 0}.st .tag{font-size:.8rem;border-radius:6px;padding:1px 7px;background:var(--card);border:1px solid var(--line)}
"""


def _read(pd, name):
    f = pd / name
    return f.read_text(encoding="utf-8") if f.exists() else ""


def _field(txt, key):
    m = re.search(r"(?m)^- " + key + r":\s*(.*)$", txt)
    return m.group(1).strip() if m else ""


def _requests(d, done):
    out = []
    for f in sorted(d.glob("*.md"), reverse=True)[:10] if d.exists() else []:
        t = f.read_text(encoding="utf-8")
        res = re.split(r"(?m)^## 対応結果.*$", t, maxsplit=1)
        result = res[1].strip() if len(res) > 1 else ""
        theme = _field(t, "テーマ") or f.stem
        out.append(f'<div class="req"><span class="tag">{"完了" if done else "受付中"}</span> '
                   f'<b>{E(theme)}</b><br><span class="meta">受付 {E(_field(t, "受付") or f.stem)} / 種類 {E(_field(t, "種類"))}'
                   f'{" / 急ぎ" if _field(t, "急ぎ") == "はい" else ""}</span>'
                   + (f'<br>対応: {E(result)}' if done and result else "") + "</div>")
    return out


def _timeline():
    try:
        r = subprocess.run(["git", "log", "-n", "80", "--date=iso-strict", "--pretty=format:%cd%x09%s"],
                           capture_output=True, text=True, encoding="utf-8", timeout=30,
                           cwd=Path(__file__).parent.parent)
        if r.returncode != 0 or not r.stdout.strip():
            raise RuntimeError("git log failed")
    except Exception:
        return "<p>記録を取得できませんでした。</p>"
    days, n = {}, 0
    for line in r.stdout.splitlines():
        ts, _, msg = line.partition("\t")
        if any(w in msg for w in SKIP_WORDS):
            continue
        try:
            dt = datetime.fromisoformat(ts).astimezone(JST)
        except ValueError:
            continue
        if n >= 50:
            break
        n += 1
        days.setdefault(dt.strftime("%Y-%m-%d"), []).append(f"<li>{dt:%H:%M} {E(msg)}</li>")
    if not days:
        return "<p>記録を取得できませんでした。</p>"
    return "".join(f"<h3>{d}</h3><ul class=\"tl\">{''.join(v)}</ul>" for d, v in days.items())


def build_status(root, md_to_html, n_articles, n_tools):
    pd = root.parent / "pdca"
    state, prod, human = _read(pd, "STATE.md"), _read(pd, "PRODUCTS.md"), _read(pd, "HUMAN_TASKS.md")
    m = re.search(r"売上\s*([\d,]+)\s*円", state)
    sales = (m.group(1) + "円") if m else "0円"
    sell = [l for l in prod.splitlines() if re.match(r"\|\s*\d+\s*\|\s*selling", l)]
    links = []
    try:
        meta = json.loads((root / "products_meta.json").read_text(encoding="utf-8"))
    except Exception:
        meta = {}
    for l in sell:
        cells = [c.strip() for c in l.split("|")]
        u = re.search(r"https?://[A-Za-z0-9._~:/?#@!$&*+=%-]+", l)
        name = cells[6] if len(cells) > 6 and cells[6] else ""  # 公開名の列(無い商品は表示しない)
        if u and name:
            # 価格は products_meta.json(商品ID別)を優先し、無ければ状態の列(cells[1])の「○円」を使う
            mid = re.search(r"/items/(\d+)", u.group(0))
            mp = str((meta.get(mid.group(1), {}) if mid else {}).get("price", "")).replace(",", "")
            if not mp:
                pm = re.search(r"(\d[\d,]*)円", cells[1])
                mp = pm.group(1).replace(",", "") if pm else ""
            price = f"{int(mp):,}円" if mp.isdigit() and mp != "0" else ("無料" if mp == "0" else "価格未設定")
            slug = (meta.get(mid.group(1), {}) if mid else {}).get("slug", "")
            href = f"/go/{slug}/?from=status" if slug else u.group(0)
            links.append(f'<li><a href="{E(href)}">{E(name)}</a>({price})</li>')
    nums = (f'<div class="num"><div>売上<b>{E(sales)}</b></div><div>販売中の商品<b>{len(sell)}点</b></div>'
            f'<div>公開中の記事<b>{n_articles}本</b></div><div>無料ツール<b>{n_tools}個</b></div></div>')
    # 今日のまとめ: STATE.md の最新の日付の最後のエントリから最大6行
    secs = re.findall(r"(?ms)^## (\d{4}-\d{2}-\d{2})[^\n]*\n(.*?)(?=^## |\Z)", state)
    summ = ""
    if secs:
        latest = max(d for d, _ in secs)
        body = [d_b for d, d_b in secs if d == latest][-1]
        lines = [x.strip()[2:] for x in body.splitlines() if x.strip().startswith("- ")][:6]
        if lines:
            summ = f"<h2>今日のまとめ({latest})</h2><ul>" + "".join(f"<li>{E(x)}</li>" for x in lines) + "</ul>"
    prods = ("<h2>販売中の商品</h2><ul>" + "".join(links) + "</ul>") if links else ""
    nxt = re.search(r"(?ms)^## 次の依頼\s*\n(.*?)(?=^## |\Z)", human)
    nxt_html = md_to_html(nxt.group(1).strip()) if nxt and nxt.group(1).strip() else "<p>いまお願いしたいことはありません。</p>"
    sec = nxt.group(1) if nxt else ""
    chk = re.search(r"(?ms)^### 2週間チェックリスト[^\n]*\n(.*?)(?=^###? |\Z)", sec)
    bl = [re.sub(r"\*\*", "", x.strip()[6:]) for x in (chk.group(1) if chk else sec).splitlines()
          if x.strip().startswith("- [ ] ")][:3]
    today = ('<h2>今日の10分(オーナーがやること)</h2>'
             + ("<p class=\"meta\">2週間チェックリストの未完了の先頭3件:</p><ul>" + "".join(f"<li>{E(x)}</li>" for x in bl) + "</ul>"
                if bl else "<p>いまお願いしたいことはありません。</p>"))
    pend = _requests(pd / "requests", False)
    done = _requests(pd / "requests" / "done", True)
    now = datetime.now(JST)
    js = (root / "status_form.js").read_text(encoding="utf-8")
    form = f"""<h2>作業を依頼する</h2>
<form id="rq" class="st" onsubmit="return false">
<label>種類<select id="rk"><option>記事</option><option>無料ツール</option><option>商品</option><option>サイトの修正</option><option>その他</option></select></label>
<label>テーマ(1行)<input type="text" id="rt" maxlength="120"></label>
<label>詳しい内容(任意)<textarea id="rd" rows="5"></textarea></label>
<label><input type="checkbox" id="ru"> 急ぎ</label>
<button type="button" id="rb">GitHubで依頼を送る</button>
<p class="meta" id="rm"></p></form>
<p class="meta">GitHubの画面が開いたら、下の『Commit changes』を押すと送信されます。GitHubにログインしている必要があります。依頼は3時間ごとの自動運営で、ほかの作業より優先して対応します。品質のルール(記事は検証できたものだけ、1日2本まで等)は依頼でも変わりません。入力内容は外部へ送信されません(GitHubの画面を開くだけです)。</p>
<script>{js}
document.getElementById("rb").addEventListener("click",function(){{
var t=document.getElementById("rt").value.replace(/\\s+/g," ").trim();
if(!t){{document.getElementById("rm").textContent="テーマを入力してください。";return;}}
var r=buildRequest(document.getElementById("rk").value,t,document.getElementById("rd").value,document.getElementById("ru").checked,new Date());
document.getElementById("rm").textContent="";
window.open(r.url,"_blank","noopener");}});
</script>"""
    return (f"<style>{EXTRA_CSS}</style><div class=\"st\"><h1>運営の進捗</h1>"
            f"<p class=\"meta\">最終更新: {now:%Y-%m-%d %H:%M} JST</p>"
            f"{today}<h2>現在の数字</h2>{nums}{summ}{prods}<h2>あなたへのお願い</h2>{nxt_html}"
            f"<h2>依頼の状況</h2><h3>受付中</h3>{''.join(pend) or '<p>なし</p>'}<h3>完了</h3>{''.join(done) or '<p>なし</p>'}"
            f"<h2>作業の記録</h2>{_timeline()}</div>{form}")
