#!/usr/bin/env python3
"""content/*.md → dist/ の静的サイトを生成。品質ゲートに通った記事だけを公開する。
使い方: python3 build_site.py
"""
import json, html, re, shutil, sys
from datetime import date, datetime
from pathlib import Path
import markdown
from status_page import build_status
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

    _em = CFG.get("contact_email", "").strip()
    ABOUT_CONTACT = (f'<a href="mailto:{E(_em).replace("@", "&#64;")}">{E(_em).replace("@", "&#64;")}</a>(返信まで数日かかることがあります。<a href="/contact/">お問い合わせ</a>のページもご覧ください)'
                     if _em else '<a href="/contact/">お問い合わせ</a>のページをご覧ください')
    write("/about/", layout(f'運営者情報 | {CFG["site_name"]}', "運営者とこのサイトの作り方、提供している商品について", f"""
<h1>運営者情報</h1>
<table><tr><th>サイト名</th><td>{E(CFG['site_name'])}</td></tr>
<tr><th>運営者</th><td>{E(CFG['author_name'])}(個人運営)</td></tr>
<tr><th>連絡先</th><td>{ABOUT_CONTACT}</td></tr>
<tr><th>運営開始</th><td>2026年10月</td></tr></table>
<p>{E(CFG['author_bio'])}</p>
<h2>記事の作り方</h2><p>{E(CFG['ai_disclosure'])}</p>
<p>数式や手順は、LibreOfficeなどで実際に再計算して確かめたものだけを載せ、確認できていない点は「未確認」と書きます。出典は、中身を確認した公式ページなどに限ります。</p>
<h2>運営者の商品について</h2><p>運営者は、Excel用テンプレート「<a href="https://nozoman.booth.pm/items/8973300" rel="noopener" target="_blank">名簿クレンジングシート</a>」と「<a href="https://nozoman.booth.pm/items/8977893" rel="noopener" target="_blank">月間家計簿</a>」をBOOTH(<a href="https://nozoman.booth.pm/" rel="noopener" target="_blank">nozoman.booth.pm</a>)で販売しています。関連する記事やツールのページには、運営者自身の商品であることを明記して案内を置くことがあります。</p>
<h2>無料ツールについて</h2><p>/tool/ と /tools/ の無料ツールは、ブラウザの中だけで計算し、入力内容を外部に送信しません。計算結果は、ご自身の環境で必ずご確認のうえお使いください。</p>
<h2>広告について</h2><p>現時点では、広告の掲載やアフィリエイトは行っていません。今後、広告(Google AdSenseなど)やアフィリエイトを導入する場合は、該当する記事に『広告』『PR』と明記し、このページとプライバシーポリシーを更新します。</p>""", "/about/"))
    email = CFG.get("contact_email", "").strip()
    if email:
        em = E(email).replace("@", "&#64;")
        contact_html = (f"<h1>お問い合わせ</h1><p>記事の誤りのご指摘やご連絡は、次のメールアドレスにお送りください。</p>"
                        f'<p><a href="mailto:{em}">{em}</a></p>'
                        "<p>返信まで数日かかることがあります。商品についてのご連絡は、BOOTHのショップ(<a href=\"https://nozoman.booth.pm/\" rel=\"noopener\" target=\"_blank\">nozoman.booth.pm</a>)のお問い合わせ機能からも受け付けています。</p>")
    else:
        contact_html = ("<h1>お問い合わせ</h1><p>お問い合わせ用のメールアドレスは<b>準備中</b>です。準備ができ次第、このページに掲載します。</p>"
                        "<p>記事の誤りや商品についてのご連絡は、BOOTHのショップ(<a href=\"https://nozoman.booth.pm/\" rel=\"noopener\" target=\"_blank\">nozoman.booth.pm</a>)のお問い合わせ機能からも受け付けています。</p>")
    write("/contact/", layout(f'お問い合わせ | {CFG["site_name"]}', "記事の誤りのご指摘、ご連絡はこちら", contact_html, "/contact/"))
    write("/privacy/", layout(f'プライバシーポリシー | {CFG["site_name"]}', "個人情報・Cookie・外部サービスの取り扱い", f"""
<h1>プライバシーポリシー</h1>
<p class="meta">制定: 2026年10月</p>
<h2>無料ツールに入力したデータ</h2><p>当サイトの無料ツールは、入力内容をブラウザの中だけで処理し、当サイトのサーバーを含む外部へ送信しません。入力内容は運営者には届きません。</p>
<h2>アクセス状況の把握</h2><p>運営者は、検索結果での表示状況を把握するために、Google Search Consoleを利用しています。当サイトでは現在、閲覧者の行動を追跡するアクセス解析タグや広告タグは設置していません。公開しているホスティング(Cloudflare Pages)では、サービスの提供に必要な範囲でアクセスログが処理されることがあります。</p>
<h2>先行登録アンケート</h2><p>/waitlist/ から回答できるアンケートはGoogleフォームで運営されています。回答内容(メールアドレスを任意でご記入いただく場合を含む)は、有料ツールの需要の把握と、ご希望された方へのご案内の目的にのみ使い、第三者へ提供しません。回答は任意で、料金は発生しません。回答の削除を希望される場合は、<a href="/contact/">お問い合わせ</a>のページに記載の方法でご連絡ください。</p>
<h2>お問い合わせ</h2><p>お問い合わせでいただいたメールアドレス等は、返信の目的以外には利用しません。</p>
<h2>外部サイトへのリンク</h2><p>BOOTHなど外部サイトへのリンクがあります。リンク先での情報の取り扱いは、各サイトのポリシーに従います。</p>
<h2>今後の変更</h2><p>広告(Google AdSenseなど)を導入する場合は、Cookie等の利用と広告配信事業者による情報の取り扱い、オプトアウトの方法をこのページに追記したうえで開始します。内容を変更したときは、このページで告知します。</p>
<h2>免責</h2><p>記事・ツールの内容は正確さに努めていますが、環境(ソフトのバージョン等)により結果が異なる場合があります。ご利用は自己責任でお願いします。</p>""", "/privacy/"))
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
    status_body = build_status(ROOT, md_to_html, len(published), len(tool_list))
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
