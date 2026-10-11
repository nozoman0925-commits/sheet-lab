#!/usr/bin/env python3
"""content/*.md → dist/ の静的サイトを生成。品質ゲートに通った記事だけを公開する。
使い方: python3 build_site.py
"""
import json, html, re, shutil, sys
from datetime import date, datetime
from pathlib import Path
import markdown
from quality_check import check_all, split_front_matter

ROOT = Path(__file__).parent
CFG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
CONTENT, DIST = ROOT / "content", ROOT.parent / "dist"
BASE = CFG["base_url"].rstrip("/")
E = html.escape

CSS = """
:root{--bg:#fff;--fg:#1c2430;--mute:#5b6675;--line:#e3e8ef;--acc:#0b6e4f;--card:#f6f8fb}
@media(prefers-color-scheme:dark){:root{--bg:#10151c;--fg:#e6ebf2;--mute:#9aa7b8;--line:#263040;--acc:#4cc9a0;--card:#171e28}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.85 -apple-system,"Hiragino Sans","Noto Sans JP",Meiryo,sans-serif}
a{color:var(--acc)}header,main,footer{max-width:760px;margin:0 auto;padding:0 16px}
header{padding-top:20px;padding-bottom:12px;border-bottom:1px solid var(--line)}
header a.brand{font-weight:700;font-size:1.15rem;text-decoration:none;color:var(--fg)}header p{margin:2px 0 0;color:var(--mute);font-size:.85rem}
nav{margin-top:8px;font-size:.9rem}nav a{margin-right:14px}
main{padding-top:24px;padding-bottom:40px}h1{font-size:1.55rem;line-height:1.4}h2{font-size:1.25rem;margin-top:2.2em;border-left:4px solid var(--acc);padding-left:10px}
h3{font-size:1.07rem;margin-top:1.6em}table{border-collapse:collapse;width:100%;font-size:.92rem;display:block;overflow-x:auto}
th,td{border:1px solid var(--line);padding:6px 10px;text-align:left}th{background:var(--card)}
pre,code{font-family:ui-monospace,Menlo,Consolas,monospace}pre{background:var(--card);padding:12px;overflow-x:auto;border-radius:8px;font-size:.88rem}
code{background:var(--card);padding:1px 5px;border-radius:4px}pre code{background:none;padding:0}
.meta{color:var(--mute);font-size:.85rem}.box{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:1.4em 0;font-size:.92rem}
.list a.item{display:block;padding:14px 0;border-bottom:1px solid var(--line);text-decoration:none;color:var(--fg)}.list .t{font-weight:600}.list .d{color:var(--mute);font-size:.88rem}
footer{border-top:1px solid var(--line);padding-top:16px;padding-bottom:30px;color:var(--mute);font-size:.82rem}
"""


def layout(title, desc, body, path, jsonld="", noindex=False):
    url = f"{BASE}{path}"
    ads = ""
    if CFG.get("adsense_publisher_id"):
        ads = f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={E(CFG["adsense_publisher_id"])}" crossorigin="anonymous"></script>'
    robots = '<meta name="robots" content="noindex">' if noindex else ""
    sc_token = CFG.get("search_console_verification", "").strip()
    if sc_token:
        robots += f'<meta name="google-site-verification" content="{E(sc_token)}">'
    return f"""<!doctype html><html lang="{CFG['language']}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title><meta name="description" content="{E(desc)}">
<link rel="canonical" href="{E(url)}"><link rel="alternate" type="application/rss+xml" href="{BASE}/feed.xml">{robots}
<meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}"><meta property="og:type" content="article">
<style>{CSS}</style>{jsonld}{ads}</head><body>
<header><a class="brand" href="/">{E(CFG['site_name'])}</a><p>{E(CFG['tagline'])}</p>
<nav><a href="/">記事一覧</a><a href="/tools/">無料ツール</a><a href="/about/">運営者情報</a><a href="/contact/">お問い合わせ</a><a href="/privacy/">プライバシーポリシー</a></nav></header>
<main>{body}</main>
<footer><p>{E(CFG['ai_disclosure'])}</p><p>© {date.today().year} {E(CFG['site_name'])}</p></footer></body></html>"""


def write(path, content):
    p = DIST / path.lstrip("/")
    if path.endswith("/"):
        p = p / "index.html"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def md_to_html(body):
    return markdown.markdown(body, extensions=["tables", "fenced_code", "toc", "sane_lists"])


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    res = check_all(CONTENT)
    published, skipped = [], []
    for f in sorted(CONTENT.glob("*.md")):
        if res.get(f.name):
            skipped.append((f.name, res[f.name]))
            continue
        fm, body = split_front_matter(f.read_text(encoding="utf-8"))
        fm["date"] = str(fm["date"])
        published.append((fm, body))
    published.sort(key=lambda x: x[0]["date"], reverse=True)

    for fm, body in published:
        slug = fm["slug"]
        notes = ""
        if fm.get("verification_note"):
            notes = f'<div class="box"><b>確認方法:</b> {E(str(fm["verification_note"]))}</div>'
        src = "".join(f'<li><a href="{E(u)}" rel="noopener nofollow" target="_blank">{E(u)}</a></li>' for u in fm["sources"])
        jsonld = '<script type="application/ld+json">' + json.dumps({
            "@context": "https://schema.org", "@type": "Article", "headline": fm["title"],
            "datePublished": fm["date"], "dateModified": str(fm.get("updated", fm["date"])),
            "author": {"@type": "Person", "name": CFG["author_name"]}, "description": fm["description"],
            "mainEntityOfPage": f"{BASE}/{slug}/"}, ensure_ascii=False) + "</script>"
        page = (f'<article><p class="meta">{E(fm["date"])} ・ {E(fm["category"])}</p><h1>{E(fm["title"])}</h1>'
                f'{md_to_html(body)}{notes}<h2>参考にした情報</h2><ul>{src}</ul></article>')
        write(f"/{slug}/", layout(f'{fm["title"]} | {CFG["site_name"]}', fm["description"], page, f"/{slug}/", jsonld))

    items = "".join(f'<a class="item" href="/{fm["slug"]}/"><div class="t">{E(fm["title"])}</div>'
                    f'<div class="d">{E(fm["description"])}</div><div class="meta">{E(fm["date"])} ・ {E(fm["category"])}</div></a>'
                    for fm, _ in published) or "<p>記事を準備中です。</p>"
    write("/", layout(f'{CFG["site_name"]}|{CFG["tagline"]}', CFG["tagline"], f'<h1>{E(CFG["site_name"])}</h1><div class="list">{items}</div>', "/"))

    write("/about/", layout(f'運営者情報 | {CFG["site_name"]}', "運営者とこのサイトの作り方について", f"""
<h1>運営者情報</h1><p>運営者: {E(CFG['author_name'])}</p><p>{E(CFG['author_bio'])}</p>
<h2>記事の作り方</h2><p>{E(CFG['ai_disclosure'])}</p>
<h2>広告について</h2><p>当サイトは、広告(Google AdSenseなど)やアフィリエイトを利用する場合があります。該当する記事には、冒頭などに『広告』『PR』と明記します。</p>""", "/about/"))
    email = CFG.get("contact_email", "").strip()
    if email:
        contact_html = (f"<h1>お問い合わせ</h1><p>記事の誤りのご指摘やご連絡は、次のメールアドレスにお送りください。</p>"
                        f'<p><a href="mailto:{E(email)}">{E(email)}</a></p>')
    else:
        contact_html = "<h1>お問い合わせ</h1><p>お問い合わせ窓口は準備中です。</p>"
    write("/contact/", layout(f'お問い合わせ | {CFG["site_name"]}', "記事の誤りのご指摘、ご連絡はこちら", contact_html, "/contact/"))
    write("/privacy/", layout(f'プライバシーポリシー | {CFG["site_name"]}', "個人情報・Cookie・広告の取り扱い", f"""
<h1>プライバシーポリシー</h1>
<h2>アクセス解析・広告</h2><p>当サイトは、アクセス状況の把握や広告配信のために、Cookie等を利用する第三者のサービス(Google AdSense、Google Search Console等)を利用する場合があります。広告配信事業者は、Cookieを使用して、ユーザーが当サイトや他のサイトに過去にアクセスした情報に基づいて広告を配信することがあります。Googleによる広告でのデータの利用方法は、Googleのポリシーをご確認ください。</p>
<h2>個人情報</h2><p>お問い合わせでいただいたメールアドレス等は、返信の目的以外には利用しません。</p>
<h2>免責</h2><p>記事の内容は正確さに努めていますが、環境(ソフトのバージョン等)により結果が異なる場合があります。ご利用は自己責任でお願いします。</p>""", "/privacy/"))
    tool_body = (ROOT / "tool" / "body.html").read_text(encoding="utf-8")
    write("/tool/", layout(f'日本語データ整形ツール(無料・ブラウザ内処理) | {CFG["site_name"]}', "全角半角・スペース・法人格の表記ゆれを整える無料ツール。入力データは外部に送信されません。", tool_body, "/tool/"))
    # 単機能ツール群: tools/<slug>/{meta.json, body.html} → /tools/<slug>/ と一覧 /tools/
    tool_list = [("/tool/", "日本語データ整形ツール", "全角半角・スペース・法人格・重複・住所分割をまとめて整える")]
    for d in sorted((ROOT / "tools").glob("*/")) if (ROOT / "tools").exists() else []:
        if not (d / "meta.json").exists() or not (d / "body.html").exists():
            continue
        m = json.loads((d / "meta.json").read_text(encoding="utf-8"))
        body = (d / "body.html").read_text(encoding="utf-8")
        body += ('<div class="box">ブラウザの中だけで計算し、入力内容は外部に送信しません。表記ゆれの整形は<a href="/tool/">データ整形ツール</a>、'
                 '要望は<a href="/waitlist/">先行登録アンケート</a>へ。</div>')
        write(f"/tools/{d.name}/", layout(f'{m["title"]} | {CFG["site_name"]}', m["description"], body, f"/tools/{d.name}/"))
        tool_list.append((f"/tools/{d.name}/", m["title"], m["description"]))
    extra_urls = [u for u, _, _ in tool_list if u != "/tool/"]
    items_html = "".join(f'<a class="item" href="{u}"><div class="t">{E(t)}</div><div class="d">{E(dsc)}</div></a>' for u, t, dsc in tool_list)
    write("/tools/", layout(f'無料ツール一覧 | {CFG["site_name"]}', "ブラウザの中だけで動く無料ツールの一覧。入力内容は外部に送信されません。", "<h1>無料ツール一覧</h1><div class=\"list\">" + items_html + "</div>", "/tools/"))
    wl = CFG.get("waitlist_url", "").strip()
    if wl:
        wl_body = (f'<h1>先行登録(有料版の需要調査)</h1><p>現在、有料の<b>ブラウザ版ツールはまだ提供していません</b>(Excel用の有料テンプレート商品は別にあり、<a href="https://nozoman.booth.pm/items/8973300" rel="noopener" target="_blank">BOOTHで販売中</a>です)。住所分割や名寄せなどの高度なデータ整形ツールを作るかどうかを判断するための、アンケート形式の先行登録です。登録しても料金は発生せず、購入の義務もありません。</p>'
                   f'<p><a href="{E(wl)}" rel="noopener" target="_blank">アンケートに回答する</a></p>')
    else:
        wl_body = "<h1>先行登録</h1><p>準備中です。ブラウザ版の有料ツールは現在提供していません。</p>"
    write("/waitlist/", layout(f'先行登録 | {CFG["site_name"]}', "データ整形ツールの有料版に関する需要調査(ブラウザ版の有料ツールは未提供)", wl_body, "/waitlist/"))
    # 進捗ページ(非公開扱い: noindex・サイトマップ非掲載・リンクなし)。スマホで状況を見るため
    PD = ROOT.parent / "pdca"
    def _read(n):
        f = PD / n
        return f.read_text(encoding="utf-8") if f.exists() else ""
    log_txt = _read("LOG.md")
    entries = re.split(r"(?m)^## ", log_txt)[1:]
    recent = "".join("<h3>" + E(e.split("\n", 1)[0]) + "</h3>" + md_to_html(e.split("\n", 1)[1] if "\n" in e else "") for e in reversed(entries[-8:]))
    status_body = ("<h1>運営の進捗</h1><p class=\"meta\">AIの運用記録を自動で表示しています(最新の記録が上)。</p>"
                   "<h2>最近の記録</h2>" + recent +
                   "<h2>現在の状態</h2>" + md_to_html(_read("STATE.md")) +
                   "<h2>あなたへのお願い</h2>" + md_to_html(_read("HUMAN_TASKS.md")))
    write("/status/", layout(f'進捗 | {CFG["site_name"]}', "運営の進捗(非公開扱い)", status_body, "/status/", noindex=True))
    write("/404.html", layout(f'ページが見つかりません | {CFG["site_name"]}', "ページが見つかりません", '<h1>ページが見つかりません</h1><p><a href="/">記事一覧へ</a></p>', "/404.html", noindex=True))

    urls = ["/", "/tools/", "/tool/"] + extra_urls + ["/waitlist/", "/about/", "/contact/", "/privacy/"] + [f"/{fm['slug']}/" for fm, _ in published]
    write("/sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
          + "".join(f"<url><loc>{BASE}{u}</loc></url>" for u in urls) + "</urlset>")
    write("/robots.txt", f"User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml\n")
    write("/feed.xml", '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>'
          f"<title>{E(CFG['site_name'])}</title><link>{BASE}/</link><description>{E(CFG['tagline'])}</description>"
          + "".join(f"<item><title>{E(fm['title'])}</title><link>{BASE}/{fm['slug']}/</link><description>{E(fm['description'])}</description></item>" for fm, _ in published[:20])
          + "</channel></rss>")

    print(f"公開 {len(published)} 本 / 除外 {len(skipped)} 本 → {DIST}")
    for name, errs in skipped:
        print(f"  除外 {name}: " + " / ".join(errs))


if __name__ == "__main__":
    main()
