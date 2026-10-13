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


def _legacy(root, md_to_html, n_articles, n_tools):
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
    return (f"<style>{EXTRA_CSS}</style><div class=\"st\">"
            f"{today}<h2>現在の数字</h2>{nums}{summ}{prods}<h2>あなたへのお願い</h2>{nxt_html}"
            f"<h2>依頼の状況</h2><h3>受付中</h3>{''.join(pend) or '<p>なし</p>'}<h3>完了</h3>{''.join(done) or '<p>なし</p>'}"
            f"<h2>作業の記録</h2>{_timeline()}</div>{form}")


# ---------------------------------------------------------------- こども向けの表示
CRON_HOURS = [0, 3, 6, 9, 12, 15, 18, 21]  # 毎日0:53から3時間おき(JST)
KIND_ICON = {"記事": "📝", "ツール": "🛠️", "商品": "📦", "note": "✍️", "X": "🐦", "分析": "🔍", "ルール": "📋", "その他": "🤖"}
KIND_LABEL = {"記事": "きじ", "ツール": "ツール", "商品": "しょうひん", "note": "note", "X": "X", "分析": "しらべもの", "ルール": "ルール", "その他": "そのほか"}
EASY = [("既存5商品の商品名と説明文の冒頭を改善案に貼り替える", "いまの5この商品の名前と説明を、よくした案にはりかえる"),
        ("既存", "いまある"), ("冒頭", "はじめの部分"), ("商品名と説明文", "名前と説明"), ("ショップ情報編集", "お店の情報のへんしゅう画面"),
        ("開設し", "つくり"), ("開設", "つくる"), ("設定する", "せっていする"), ("出品", "お店にならべる"),
        ("改善案", "よくした案"), ("貼り替える", "はりかえる"), ("貼る", "はる"), ("判断する", "きめる"),
        ("プロフィール", "じこしょうかい"), ("固定ポスト", "いちばん上のポスト"), ("測定ID", "数える番号"),
        ("サムネイル", "商品のかおの絵"), ("差し替える", "とりかえる"), ("予約投稿", "じかんを決めて投稿"),
        ("有効にする", "つかえるようにする"), ("伝える", "ロボットに教える")]


def _next_run(now):
    for d in (0, 1):
        for h in CRON_HOURS:
            t = (now + timedelta(days=d)).replace(hour=h, minute=53, second=0, microsecond=0)
            if t > now:
                return t
    return now


def _git_added_today(root, today):
    """今日(JST)に新しく追加されたファイルのパス一覧。取得できなければ None。"""
    try:
        r = subprocess.run(["git", "log", "--diff-filter=A", "--name-only", "--date=iso-strict", "--pretty=format:@@%cd"],
                           capture_output=True, text=True, encoding="utf-8", timeout=30, cwd=root.parent)
        if r.returncode != 0:
            return None
    except Exception:
        return None
    out, cur = set(), False
    for line in r.stdout.splitlines():
        if line.startswith("@@"):
            try:
                cur = datetime.fromisoformat(line[2:]).astimezone(JST).strftime("%Y-%m-%d") == today
            except ValueError:
                cur = False
        elif cur and line.strip():
            out.add(line.strip())
    return out


def _notes_on_pc(inbox):
    """INBOX.md の最新の「オーナーPCにnote無料記事N本(未投稿)」の N。無ければ 0。"""
    ms = re.findall(r"オーナーPCにnote無料記事\s*(\d+)\s*本", inbox)
    return int(ms[-1]) if ms else 0


def _x_posts(xdir):
    """Xの投稿の本数 = 日付ファイル内の「## N本目」見出しの数(profile/pinned/REACTIONS は数えない)。"""
    n = 0
    for f in sorted(xdir.glob("20*.md")):
        n += len(re.findall(r"(?m)^##\s*\d+\s*本目", f.read_text(encoding="utf-8")))
    return n


def _counts(root, pd, prod_txt, inbox, today):
    arts = sorted((root / "content").glob("*.md"))
    tools = [d for d in sorted((root / "tools").glob("*")) if d.is_dir()]
    rows = [l for l in prod_txt.splitlines() if re.match(r"\|\s*\d+\s*\|", l)]
    sell_n = len([l for l in rows if re.match(r"\|\s*\d+\s*\|\s*selling", l)])
    built_n = len([l for l in rows if re.match(r"\|\s*\d+\s*\|\s*built", l)])
    spec_slugs = [re.search(r"slug:\s*([\w-]+)", l).group(1) for l in rows
                  if re.match(r"\|\s*\d+\s*\|\s*spec_ready", l) and re.search(r"slug:\s*([\w-]+)", l)]
    pdirs = {d.name for d in (pd / "deliverables" / "products").glob("*") if d.is_dir()} if (pd / "deliverables" / "products").exists() else set()
    spec_n = len([s for s in spec_slugs if s in pdirs])  # 設計図のフォルダがあり、まだ作っていない商品
    notes = sorted((pd / "deliverables" / "outreach" / "note").glob("*.md"))
    note_pc = _notes_on_pc(inbox)
    xdir = pd / "deliverables" / "outreach" / "x"
    added = _git_added_today(root, today)

    def tdy(prefix, pred=lambda p: True):
        if added is None:
            return None
        return len({p for p in added if p.startswith(prefix) and pred(p)})
    return {
        "art": (len(arts), tdy("site/content/", lambda p: p.endswith(".md")), ""),
        "tool": (len(tools) + 1, (lambda v: v)(None if added is None else len({p.split("/")[2] for p in added if p.startswith("site/tools/")})), ""),
        "sell": (sell_n, None, ""),
        "built": (built_n, None, ""),
        "spec": (spec_n, None, ""),
        "note": (len(notes) + note_pc, tdy("pdca/deliverables/outreach/note/"),
                 f"パソコンに{note_pc}本＋サイトに{len(notes)}本" if note_pc else ""),
        "x": (_x_posts(xdir), None, ""),
    }


def _metric_int(metrics, channel, col):
    """METRICSの週次表から、チャネル名に channel を含む行の列(0始まり)の数字の合計。数字が1つも無ければ None。"""
    tot, seen = 0, False
    for l in metrics.splitlines():
        c = [x.strip() for x in l.strip().strip("|").split("|")]
        if len(c) >= 9 and channel in c[1]:
            m = re.match(r"(\d[\d,]*)", c[col])
            if m:
                tot += int(m.group(1).replace(",", ""))
                seen = True
    return tot if seen else None


def _kind_of(text, tag=""):
    t = tag or ""
    for k in KIND_ICON:
        if t and t.lower() == k.lower():
            return k
    if re.search(r"note|ノート", text):
        return "note"
    if re.search(r"(^|[^A-Za-z])X(の|原稿|投稿)|ツイート|Xの", text):
        return "X"
    if re.search(r"ツール", text):
        return "ツール"
    if re.search(r"記事", text):
        return "記事"
    if re.search(r"商品|仕様|テンプレ|シート", text):
        return "商品"
    if re.search(r"分析|計測|数字|調査|実測", text):
        return "分析"
    if re.search(r"ルール|憲章|方針|CHARTER|整理", text):
        return "ルール"
    return "その他"


def _parse_log(log):
    """LOG.md を {日付: [(時刻, 種類, 文)]} にする。新形式 `- HH:MM [種類] 文` と従来の自由書式の両方を読む。"""
    days = {}
    for m in re.finditer(r"(?ms)^## (\d{4}-\d{2}-\d{2})([^\n]*)\n(.*?)(?=^## |\Z)", log):
        date, title, body = m.group(1), m.group(2).strip(), m.group(3)
        hint = re.search(r"(\d{1,2})時台", title)
        tm_default = f"{int(hint.group(1)):02d}時ごろ" if hint else ""
        for line in body.splitlines():
            line = line.strip()
            if not line.startswith("- "):
                continue
            line = line[2:].strip()
            nf = re.match(r"(\d{1,2}):(\d{2})\s*\[([^\]]+)\]\s*(.+)", line)
            if nf:
                days.setdefault(date, []).append((f"{int(nf.group(1)):02d}:{nf.group(2)}", _kind_of(nf.group(4), nf.group(3).strip()), nf.group(4)))
                continue
            line = re.sub(r"^\(\d\)\s*", "", line)
            line = re.sub(r"^(Do|Plan|Check|Act|学び|対応|次の一手)[::]\s*", "", line)
            if not line or re.match(r"(次の一手|build_site)", line) or "実行結果は下記コミット" in line or re.match(r"外部(投稿|送信)", line):
                continue
            if line.startswith("解釈"):  # むずかしい判断メモは日記に出さない(上限の判定にだけ使う)
                days.setdefault(date, []).append((tm_default, "メモ", line))
                continue
            days.setdefault(date, []).append((tm_default, _kind_of(line), line))
    return days


def _title_of(path, key="title"):
    """記事は先頭の front matter の title、ツールは meta.json の title。【】の部分と () の補足は省く。"""
    try:
        if path.suffix == ".json":
            t = json.loads(path.read_text(encoding="utf-8")).get(key, "")
        else:
            m = re.search(r'(?m)^title:\s*"?(.*?)"?\s*$', path.read_text(encoding="utf-8"))
            t = m.group(1) if m else ""
    except Exception:
        return ""
    t = re.sub(r"【[^】]*】", "", t).replace("「", "『").replace("」", "』")
    t = re.sub(r"[(（][^)）]*[)）]", "", t)
    return t.strip(" 　|｜")


def _kids_sentence(root, pd, kind, text):
    """LOG の1行を、小学生にも分かる1文にする。戻り値 (文, 太字の題名, 種類)。
    確認作業は ("CHECK", "", ...)、はっきり言いかえられない行は ("", "", ...) で日記に出さない(元の文は「くわしい記録」に残る)。"""
    t = re.sub(r"`|\*\*", "", text).strip()
    if re.match(r"(次回|仮説|解釈|アイデア登録|外部|人間への依頼)", t) or re.search(r"のためなし|再記録|反映済み", t):
        return ("", "", kind)
    if re.match(r"(site/)?(quality_check|build_site|tools_test)|検証スクリプト|Do/Check", t):
        return ("CHECK", "", kind)
    if re.search(r"進捗ページ", t) and not re.search(r"再生成|pip", t):
        return ("このページ(進捗ページ)を、見やすくつくりなおしたよ。", "", "ルール")
    if re.search(r"CHARTER|PLAN_1M|HUMAN_TASKS|RUNBOOK|PORTFOLIO", t) and re.search(r"追記|更新|統一|整理|新規|新方針|反映", t) \
            and not re.search(r"完了欄|INBOX/STATE", t):
        return ("お店のきまりを、えらい版に書きなおしたよ。", "", "ルール")
    if re.search(r"手数料|受取額", t):
        return ("商品のねだんの計算を、見なおしたよ。", "", "商品")
    if re.search(r"文体|フランク", t):
        return ("文章を、読みやすいことばに書きなおしたよ。", "", "記事")
    if re.search(r"改善案|booth-improve", t):
        return ("商品の名前や説明を、よくする案をかいたよ。", "", "商品")
    if re.search(r"オーナー報告", t):
        return ("オーナーからのおしらせを、ノートに書きとめたよ。", "", "その他")
    if re.search(r"/about/|運営者情報", t):
        return ("お店の人の紹介ページを、あたらしくしたよ。", "", "その他")
    m = re.match(r"記事:.*?公開[(（]([a-z0-9-]+)[)）]", t)
    if m:
        for f in (root / "content").glob(f"*-{m.group(1)}.md"):
            ti = _title_of(f)
            if ti:
                return ("の記事をかいたよ。", ti, "記事")
        return ("あたらしい記事をかいたよ。", "", "記事")
    m = re.match(r"無料ツール:\s*/tools/([a-z0-9-]+)/", t)
    if m:
        ti = _title_of(root / "tools" / m.group(1) / "meta.json")
        return ("をつくったよ(無料ツール)。", ti, "ツール") if ti else ("あたらしい無料ツールをつくったよ。", "", "ツール")
    m = re.match(r"仕様:.*?#(\d+)", t)
    if m:
        for l in _read(pd, "PRODUCTS.md").splitlines():
            c = [x.strip() for x in l.split("|")]
            if len(c) > 3 and c[1] == m.group(1):
                return ("の設計図をかいたよ。", re.sub(r"【[^】]*】", "", re.split(r"[(（]", c[3])[0]).strip(), "商品")
        return ("あたらしい商品の設計図をかいたよ。", "", "商品")
    if re.search(r"quality_check|build_site|tools_test|直リンク", t):
        return ("CHECK", "", kind)
    if re.match(r"note原稿", t):
        return ("noteにのせる文章を1本かいたよ。", "", "note")
    if re.match(r"X(の)?原稿", t):
        return ("Xにのせる文章をかいたよ。", "", "X")
    if re.match(r"(分析|数字)", t):
        return ("お店の数字をしらべたよ。", "", "分析")
    return ("", "", kind)


def _short(text, n=78):  # 互換用(「くわしい記録」側の表示)
    text = re.sub(r"`|\*\*", "", text)
    first = re.split(r"(?<=。)", text)[0]
    return first[:n].rstrip("、,") + "…" if len(first) > n else first


def _sort_key(t):
    m = re.match(r"(\d+):(\d+)", t or "")
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))
    m = re.match(r"(\d+)時", t or "")
    return int(m.group(1)) * 60 if m else -1


def _diary_items(root, pd, ents):
    """日記の <li> 用タプル [(時刻, 種類, 文HTML)]。新しい順、時刻なしは最後に「きょう」。確認作業は1行にまとめる。"""
    out, check_t, seen = [], None, set()
    for t, k, x in ents:
        a, ti, k = _kids_sentence(root, pd, k, x)
        if a == "CHECK":
            if check_t is None or _sort_key(t) > _sort_key(check_t):
                check_t = t
            continue
        if not a:
            continue
        body = (f"「{E(ti)}」" if ti else "") + E(a)
        if body in seen:
            continue
        seen.add(body)
        out.append((t, k, body))
    timed = sorted([o for o in out if _sort_key(o[0]) >= 0], key=lambda o: _sort_key(o[0]), reverse=True)
    untimed = [o for o in out if _sort_key(o[0]) < 0]
    chk = [(check_t or "", "分析", "ちゃんと動くかたしかめたよ✅")] if check_t is not None else []
    if chk and _sort_key(check_t) >= 0:
        timed = sorted(timed + chk, key=lambda o: _sort_key(o[0]), reverse=True)
        chk = []
    return timed + untimed + chk


def _easy(t):
    for a, b in EASY:
        t = t.replace(a, b)
    return t


def _svg_shop():
    return """<svg viewBox="0 0 360 200" role="img" aria-label="お店の前でロボットの店員が手をふっているイラスト" class="hero-svg">
<rect x="0" y="168" width="360" height="32" fill="#bfe3c4"/><circle cx="318" cy="38" r="20" fill="#ffe27a"/>
<g fill="#fff"><ellipse cx="60" cy="40" rx="26" ry="11"/><ellipse cx="82" cy="34" rx="18" ry="10"/><ellipse cx="240" cy="28" rx="22" ry="9"/></g>
<rect x="40" y="82" width="170" height="90" fill="#ffd9c9" stroke="#e8a58b" stroke-width="3"/>
<path d="M28 84 L125 38 L222 84 Z" fill="#ff9fb2" stroke="#e0728a" stroke-width="3"/>
<path d="M40 84 h170 v20 q-14 14 -28 0 q-14 14 -28 0 q-14 14 -28 0 q-14 14 -28 0 q-14 14 -28 0 q-14 14 -30 0z" fill="#fff" stroke="#e0728a" stroke-width="2"/>
<rect x="104" y="118" width="42" height="54" rx="4" fill="#8fd3f4" stroke="#4aa3cf" stroke-width="3"/>
<rect x="54" y="116" width="36" height="30" rx="4" fill="#fff6c9" stroke="#e5b93c" stroke-width="3"/>
<rect x="160" y="116" width="36" height="30" rx="4" fill="#fff6c9" stroke="#e5b93c" stroke-width="3"/>
<rect x="76" y="58" width="98" height="22" rx="6" fill="#fff" stroke="#e0728a" stroke-width="2"/>
<text x="125" y="74" text-anchor="middle" font-size="13" font-weight="700" fill="#b8506a">シート実務ラボ</text>
<g class="robot"><rect x="258" y="96" width="54" height="64" rx="12" fill="#a8d8ff" stroke="#5aa5dc" stroke-width="3"/>
<rect x="266" y="62" width="38" height="34" rx="10" fill="#d3ecff" stroke="#5aa5dc" stroke-width="3"/>
<line x1="285" y1="62" x2="285" y2="50" stroke="#5aa5dc" stroke-width="3"/><circle cx="285" cy="47" r="5" fill="#ff8aa1"/>
<circle cx="276" cy="78" r="5" fill="#2a4a66"/><circle cx="294" cy="78" r="5" fill="#2a4a66"/>
<path d="M277 88 q8 6 16 0" fill="none" stroke="#2a4a66" stroke-width="3" stroke-linecap="round"/>
<rect x="274" y="112" width="22" height="16" rx="4" fill="#fff6c9" stroke="#e5b93c" stroke-width="2"/>
<path d="M258 112 q-18 -14 -20 -34" fill="none" stroke="#5aa5dc" stroke-width="7" stroke-linecap="round"/>
<path d="M312 118 q14 8 20 22" fill="none" stroke="#5aa5dc" stroke-width="7" stroke-linecap="round"/>
<rect x="268" y="160" width="12" height="10" fill="#5aa5dc"/><rect x="290" y="160" width="12" height="10" fill="#5aa5dc"/></g></svg>"""


def _svg_pig(pct):
    return f"""<svg viewBox="0 0 160 120" role="img" aria-label="ぶたの貯金箱" class="pig-svg">
<ellipse cx="80" cy="112" rx="58" ry="6" fill="#00000018"/>
<ellipse cx="78" cy="68" rx="56" ry="40" fill="#ffb7c5" stroke="#e58aa0" stroke-width="3"/>
<polygon points="40,36 52,14 66,34" fill="#ffb7c5" stroke="#e58aa0" stroke-width="3" stroke-linejoin="round"/>
<ellipse cx="128" cy="70" rx="14" ry="16" fill="#ff9fb2" stroke="#e58aa0" stroke-width="3"/>
<circle cx="124" cy="68" r="2.5" fill="#8a3a50"/><circle cx="132" cy="68" r="2.5" fill="#8a3a50"/>
<circle cx="108" cy="54" r="4" fill="#4a2a36"/><rect x="62" y="38" width="30" height="6" rx="3" fill="#8a3a50"/>
<rect x="44" y="96" width="14" height="16" rx="5" fill="#ffb7c5" stroke="#e58aa0" stroke-width="3"/><rect x="92" y="96" width="14" height="16" rx="5" fill="#ffb7c5" stroke="#e58aa0" stroke-width="3"/>
<circle cx="77" cy="14" r="9" fill="#ffd84a" stroke="#d2a817" stroke-width="2"/><text x="77" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#8a6a00">円</text></svg>"""


CSS = """
body{background:#fff8e8;color:#3a3226}
.kd{font-size:18px;line-height:1.8;max-width:100%;overflow-wrap:anywhere}
.kd h1,.kd h2,.kd h3{border:0;padding:0;margin:0}
.kd section{margin:28px 0}.kd h2{font-size:1.35rem;margin-bottom:12px}
.kd .band{background:#d9f0ff;border-radius:24px;padding:14px;text-align:center;border:3px solid #a8d8ff}
.kd .hero-svg{width:100%;max-width:420px;height:auto}.kd .band h1{font-size:1.6rem;margin:4px 0}
.kd .pill{display:inline-block;background:#fff;border-radius:999px;padding:4px 14px;margin:4px 0;font-size:1rem}
.kd .card{background:#fff;border:3px solid #ffe08a;border-radius:22px;padding:14px 16px}
.kd .one{background:#fff3b8;border-color:#ffd84a;font-size:1.25rem;font-weight:700}
.kd .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.kd .stat{background:#fff;border-radius:20px;padding:10px 12px;text-align:center;border:3px solid var(--c,#cfe9ff)}
.kd .stat .ic{font-size:2rem;line-height:1.2}.kd .stat b{display:block;font-size:2.1rem;line-height:1.2}
.kd .grid .stat:last-child:nth-child(odd){grid-column:1/-1}.kd .stat .lb{font-size:1rem}.kd .stat .pl{font-size:.95rem;color:#7a6a50}
.kd .meter{display:flex;gap:12px;align-items:center}.kd .pig-svg{width:110px;flex:none}
.kd .yen{font-size:2.2rem;font-weight:800}.kd .bar{background:#f0e6d0;border-radius:999px;height:22px;overflow:hidden;margin:6px 0}
.kd .bar i{display:block;height:100%;background:linear-gradient(90deg,#8fd3f4,#7be0a8);border-radius:999px;min-width:6px}
.kd .stairs{list-style:none;padding:0;margin:14px 0 0;display:grid;gap:8px}
.kd .stairs li{border-radius:16px;padding:8px 12px;background:#fff;border:3px solid #eadfc6;margin-left:calc(var(--i)*12px)}
.kd .stairs li.now{border-color:#ff8aa1;background:#ffe6ec}.kd .stairs li.ok{border-color:#7be0a8;background:#e4f9ec}
.kd .here{display:inline-block;background:#ff6f8e;color:#fff;border-radius:999px;padding:0 10px;font-size:.9rem;margin-left:6px}
.kd .path{display:grid;gap:8px}.kd .step{display:flex;gap:12px;align-items:center;background:#fff;border-radius:20px;padding:10px 14px;border:3px solid #cfe9ff}
.kd .step .big{font-size:2.2rem}.kd .light{width:22px;height:22px;border-radius:50%;flex:none;border:3px solid #0003}
.kd .l-blue{background:#4aa3ff}.kd .l-yellow{background:#ffd23f}.kd .l-red{background:#ff5d5d}
.kd .arrow{text-align:center;font-size:1.4rem;line-height:1}
.kd .todo{display:flex;gap:12px;align-items:flex-start;background:#fff;border:3px solid #ffc9d6;border-radius:20px;padding:12px 14px;margin:10px 0}
.kd .box3{width:30px;height:30px;border:4px solid #ff8aa1;border-radius:8px;flex:none;margin-top:4px;background:#fff}
.kd .clock{display:inline-block;background:#fff3b8;border-radius:999px;padding:0 10px;font-size:.95rem;white-space:nowrap}
.kd .tl{list-style:none;padding:0;margin:0;border-left:5px solid #cfe9ff;margin-left:10px}
.kd .tl li{position:relative;margin:0 0 12px;padding:2px 0 2px 18px}
.kd .tl li:before{content:"";position:absolute;left:-12px;top:12px;width:14px;height:14px;border-radius:50%;background:#8fd3f4;border:3px solid #fff8e8}
.kd .tm{display:inline-block;background:#d9f0ff;border-radius:10px;padding:0 8px;font-size:.95rem;margin-right:6px}
.kd .cal{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.kd .day{background:#fff;border-radius:18px;border:3px solid #cfe9ff;overflow:hidden}
.kd .day .hd{background:#8fd3f4;color:#10304a;font-weight:700;padding:4px 10px}.kd .day .bd{padding:8px 10px}
.kd details.adult{background:#fff;border:3px solid #eadfc6;border-radius:20px;padding:10px 16px}
.kd details.adult>summary{font-weight:700;cursor:pointer;font-size:1.1rem}
.kd details.adult{font-size:16px}
.kd .robot{transform-origin:285px 165px;animation:sway 4s ease-in-out infinite}
@keyframes sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
@media(prefers-reduced-motion:reduce){.kd .robot{animation:none}}
@media(prefers-color-scheme:dark){
body{background:#1b1710;color:#f2ead8}
.kd .band{background:#1f3347;border-color:#3b5d7d}.kd .pill{background:#2a2418}
.kd .card,.kd .stat,.kd .step,.kd .todo,.kd .day,.kd details.adult,.kd .stairs li{background:#2a2418;color:#f2ead8}
.kd .one{background:#4a3f12;border-color:#a88a1a}.kd .stat .pl{color:#cbbd9f}
.kd .stairs li.now{background:#4a2530}.kd .stairs li.ok{background:#1f4030}
.kd .bar{background:#3a3220}.kd .box3{background:#2a2418}.kd .clock{background:#4a3f12}
.kd .tm{background:#27455f}.kd .tl li:before{border-color:#1b1710}.kd .day .hd{background:#2f5f7f;color:#fff}
}
@media(max-width:420px){.kd .grid{gap:8px}.kd .stat b{font-size:1.8rem}.kd .meter{flex-direction:column;text-align:center}}
"""


def build_status(root, md_to_html, n_articles, n_tools):
    pd = root.parent / "pdca"
    state, prod, human = _read(pd, "STATE.md"), _read(pd, "PRODUCTS.md"), _read(pd, "HUMAN_TASKS.md")
    metrics, log, inbox = _read(pd, "METRICS.md"), _read(pd, "LOG.md"), _read(pd, "INBOX.md")
    now = datetime.now(JST)
    today = now.strftime("%Y-%m-%d")
    nxt_run = _next_run(now)
    cnt = _counts(root, pd, prod, inbox, today)
    # 売上(実測): STATE.md の「売上○円」。無ければ0円
    m = re.search(r"売上\s*([\d,]+)\s*円", state)
    yen = int(m.group(1).replace(",", "")) if m else 0
    sold = _metric_int(metrics, "BOOTH", 5)
    sold_n = sold if sold is not None else 0
    views = _metric_int(metrics, "サイト", 2)
    clicks = _metric_int(metrics, "サイト", 3)

    # 1 あいさつ
    hero = (f'<section class="band"><div>{_svg_shop()}</div><h1>シート実務ラボのいま</h1>'
            f'<div class="pill">🕒 さいごに更新: {now:%Y年%-m月%-d日 %H:%M}</div><br>'
            f'<div class="pill">🤖 ロボット(AI)はいまもはたらいています。つぎは {nxt_run:%-d日 %-H時%M分}ごろ</div></section>')

    # 2 ひとこと
    sell_c, built_c = cnt["sell"][0], cnt["built"][0]
    if yen > 0 or sold_n > 0:
        sale_s = f"{sold_n if sold_n else 1}こ売れて、売上は{yen:,}円になったよ。"
    else:
        sale_s = "まだ売れていないよ。"
    wait_s = f"、できあがって並べるのを待っている商品が{built_c}こ" if built_c else ""
    one = (f'<section><h2>🏪 お店のいま、ひとことで</h2><div class="card one">お店に並んでいる商品は{sell_c}こ{wait_s}。{sale_s}'
           f'いまはお客さんに見つけてもらう準備をしているよ。</div></section>')

    # 3 できたもの
    def stat(ic, label, key, c):
        n, t, sub = cnt[key]
        pl = sub or (f"きょう +{t}" if t is not None else "")
        return (f'<div class="stat" style="--c:{c}"><div class="ic">{ic}</div><div class="lb">{label}</div>'
                f'<b>{n}</b>' + (f'<div class="pl">{pl}</div>' if pl else "") + '</div>')
    made_html = ('<section><h2>🎁 できたもの</h2><div class="grid">'
                 + stat("📝", "記事(本)", "art", "#cfe9ff") + stat("🛠️", "無料ツール(こ)", "tool", "#d6f5df")
                 + stat("🛍️", "売っている商品(こ)", "sell", "#ffe08a") + stat("📦", "できあがって、ならべるのを待っている商品(こ)", "built", "#ffc9d6")
                 + stat("📐", "設計図ができた商品(こ・まだ作っていない)", "spec", "#f6e3c4")
                 + stat("✍️", "noteの原稿(本)", "note", "#e6dcff") + stat("🐦", "Xの原稿(本)", "x", "#cfe9ff")
                 + '</div><p class="meta">「ならべるのを待っている商品」は、できあがってExcelで確かめ終わったけれど、まだお店にならんでいない商品です(ならべるのは人間のしごと)。「設計図ができた商品」は、まだ作っていない商品です。</p></section>')

    # 4 お金のメーター
    goals = [("① はじめの1こが売れる", 1), ("② 月に1万円", 10000), ("③ 月に10万円", 100000), ("④ 月に100万円(長い目でのゴール)", 1000000)]
    cur = 0
    for i, (_, g) in enumerate(goals):
        if (i == 0 and (sold_n >= 1 or yen > 0)) or (i > 0 and yen >= g):
            cur = i + 1
    cur = min(cur, 3)
    tgt = goals[cur][1]
    pct = min(100, int((max(yen, 1 if cur == 0 and sold_n else 0)) * 100 / tgt)) if tgt else 0
    steps = ""
    for i, (nm, g) in enumerate(goals):
        cls = "ok" if i < cur else ("now" if i == cur else "")
        mark = "✅ " if i < cur else ""
        here = '<span class="here">📍 いまここ</span>' if i == cur else ""
        steps += f'<li class="{cls}" style="--i:{i}">{mark}{nm}{here}</li>'
    money = (f'<section><h2>🐷 お金のメーター</h2><div class="card"><div class="meter">{_svg_pig(pct)}'
             f'<div><div>いままでの売上</div><div class="yen">{yen:,}円</div><div>つぎの目標: {goals[cur][0]}</div></div></div>'
             f'<div class="bar" role="img" aria-label="つぎの目標まで {pct}%"><i style="width:{pct}%"></i></div>'
             f'<ul class="stairs">{steps}</ul>'
             f'<p class="meta">売上は実際に確かめた数字だけです。いちばん上は、長い目でめざすゴールだよ。まずは①からひとつずつ。</p></div></section>')

    # 5 買うまでの道
    def light(v, kind):
        if v is None:
            return "yellow", "まだ数えはじめたところ"
        if v == 0:
            return "red", "いまは0"
        return "blue", f"{v:,}"
    sv_l, sv_t = light(views, "v")
    cl_l, cl_t = light(clicks, "c")
    bu_l, bu_t = light(sold_n if (sold is not None or yen > 0 or True) else None, "b")
    bu_t = f"{sold_n}こ" if sold_n else "まだ0こ"
    if sold_n > 0:
        bu_l = "blue"
    pairs = [("🚪", "① 見つけてもらう", "お店(サイト)に来てくれた回数", sv_l, sv_t if views is None else f"{views:,}回"),
             ("👀", "② 商品をのぞく", "商品のページを見に行ったクリック", cl_l, cl_t if clicks is None else f"{clicks:,}回"),
             ("🛒", "③ 買う", "売れた数", bu_l, bu_t)]
    stuck = next((p for p in pairs if p[3] != "blue"), None)
    path = '<div class="arrow">⬇️</div>'.join(
        f'<div class="step"><div class="big">{ic}</div><div style="flex:1"><b>{t}</b><br><span class="meta">{d}</span><br><b>{v}</b></div>'
        f'<span class="light l-{lc}" role="img" aria-label="{ {"blue":"あおはうまくいっている","yellow":"きいろはまだ分からない","red":"あかはとまっている"}[lc] }"></span></div>'
        for ic, t, d, lc, v in pairs)
    why = (f'<p><b>いま気をつけたいところ:</b> {stuck[1]}(' + {"yellow": "まだ数が分からないので、数えるじゅんびをしているよ", "red": "まだ数字が出ていないよ"}[stuck[3]] + ')</p>') if stuck else "<p>どのステップも数字が出ています。</p>"
    path_html = (f'<section><h2>🛤️ お客さんが買うまでの道</h2><div class="path">{path}</div>{why}'
                 '<p class="meta">🔵あお=うまくいっている ・ 🟡きいろ=まだ分からない ・ 🔴あか=止まっている</p></section>')

    # 6 おてつだい
    secs = re.search(r"(?ms)^### 2週間チェックリスト[^\n]*\n(.*?)(?=^###? |\Z)", human)
    items = [x.strip() for x in (secs.group(1) if secs else "").splitlines() if re.match(r"\s*- \[[ xX]\]", x)]
    total = len(items)
    donen = len([x for x in items if re.match(r"- \[[xX]\]", x)])
    open_items = [x for x in items if x.startswith("- [ ]")][:3]
    cards = ""
    for x in open_items:
        t = re.sub(r"\*\*", "", x[6:])
        mm = re.match(r"(.*?)[::]\s*(.*)", t)
        day, body = (mm.group(1), mm.group(2)) if mm else ("", t)
        title = re.split(r"[(（]", body)[0].strip()
        dm = re.search(r"[(（](?:各)?(\d+)分", body)
        mins = dm.group(1) + "分" if dm else ""
        if not mins:  # 本文に時間が無ければ HUMAN_TASKS 全体から同じ題名の行を探す
            for hl in human.splitlines():
                if title[:12] and title[:12] in hl and re.search(r"(\d+)分", hl):
                    mins = re.search(r"(\d+)分", hl).group(1) + "分"
                    break
        if mins and re.search(r"[(（]各\d+分", body):
            mins = "1つ" + mins
        title = _easy(title)
        cards += (f'<div class="todo"><div class="box3" aria-hidden="true"></div><div><b>{E(title)}</b><br>'
                  + (f'<span class="clock">🕒 {mins}</span> ' if mins else "") + (f'<span class="meta">{E(re.sub(r"[(（]", " ", day).rstrip(")）"))}</span>' if day else "") + '</div></div>')
    pct_h = int(donen * 100 / total) if total else 0
    help_html = (f'<section><h2>🙋 きょうのおてつだい(人間がやること)</h2>'
                 + (cards or '<div class="card">いまお願いしたいことはありません。</div>')
                 + f'<div class="card"><b>{total}こ中 {donen}こ できた</b><div class="bar" role="img" aria-label="{pct_h}%"><i style="width:{pct_h}%"></i></div></div></section>')

    # 7 ロボットの日記
    days = _parse_log(log)
    shown_day = today if today in days else (max(days) if days else today)
    allents = days.get(shown_day, [])
    ents = [e for e in allents if e[1] != "メモ"]
    items_d = _diary_items(root, pd, ents)[:20]
    lis = "".join(f'<li><span class="tm">{E(t) if _sort_key(t) >= 0 else "きょう"}</span>{KIND_ICON[k]} {body}</li>' for t, k, body in items_d)
    note = ""
    if re.search(r"上限", " ".join(x for _, _, x in allents)):
        note = '<div class="card"><b>🌙 きょうの記事は、ぜんぶ書いたよ。つぎはあしたやるよ。</b><br><span class="meta">ひとつの日に出せる記事とツールの数は決めてあります(品質をたもつため)。そのあとは、noteやXの文章や、商品の設計図を作っています。</span></div>'
    head7 = "きょうやったこと" if shown_day == today else f"さいごに記録されたひ({shown_day})のこと"
    diary = (f'<section><h2>📓 ロボットの日記({head7})</h2>{note}'
             + (f'<ul class="tl">{lis}</ul>' if lis else '<div class="card">まだきょうの記録はありません。つぎの実行でここに出ます。</div>')
             + '<p class="meta">📝きじ 🛠️ツール 📦しょうひん ✍️note 🐦X 🔍しらべもの 📋ルール</p></section>')

    # 8 予定
    tom = now + timedelta(days=1)
    wd = "月火水木金土日"
    sun = now + timedelta(days=(6 - now.weekday()) % 7 or 7)
    cal = (f'<section><h2>🗓️ これからの予定</h2><div class="cal">'
           f'<div class="day"><div class="hd">{tom.month}/{tom.day}({wd[tom.weekday()]}) 0:53</div><div class="bd">🔍 きのうの数字をしらべる</div></div>'
           f'<div class="day"><div class="hd">{tom.month}/{tom.day}({wd[tom.weekday()]}) 10時</div><div class="bd">📦 あたらしい商品をつくる</div></div>'
           f'<div class="day"><div class="hd">{sun.month}/{sun.day}(日)</div><div class="bd">🔁 1しゅうかんのふりかえり</div></div>'
           '</div><p class="meta">ロボットは3時間ごとに動いて、そのたびに日記を書きます。</p></section>')

    legacy = _legacy(root, md_to_html, n_articles, n_tools)
    raw = "".join(f'<li>{E(t) if t else "きょう"} [{E(k)}] {E(x)}</li>' for t, k, x in allents)
    raw_html = f'<h2>ロボットの日記の元の文({shown_day})</h2><ul>{raw}</ul>' if raw else ""
    adult = f'<section><details class="adult"><summary>🔧 くわしい記録(大人向け)</summary>{legacy}{raw_html}</details></section>'
    return f'<style>{CSS}</style><div class="kd">{hero}{one}{made_html}{money}{path_html}{help_html}{diary}{cal}{adult}</div>'
