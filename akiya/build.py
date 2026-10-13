#!/usr/bin/env python3
"""実家じまい相談室: akiya/content/*.md → akiya/dist/ の静的サイトを生成する。
品質ゲート(quality_check.py)に通った記事だけを公開する。
使い方: python3 akiya/build.py
"""
import json, html, re, shutil
from datetime import date
from pathlib import Path
import markdown
from quality_check import check_all, split_front_matter

ROOT = Path(__file__).parent
CFG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
CONTENT, DIST = ROOT / "content", ROOT / "dist"
BASE = CFG["base_url"].rstrip("/")
E = html.escape

CSS = """
:root{--bg:#faf8f3;--fg:#1d2a33;--mute:#5d6b74;--line:#e4dfd3;--acc:#1f5a6b;--acc2:#b8862b;--card:#fff;--soft:#f1ede3;--line-green:#06c755}
@media(prefers-color-scheme:dark){:root{--bg:#121718;--fg:#e8ece9;--mute:#9fb0b4;--line:#2a3436;--acc:#6fb7c9;--acc2:#d8ad5c;--card:#182022;--soft:#1c2628}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.9 -apple-system,"Hiragino Sans","Noto Sans JP",Meiryo,sans-serif}
a{color:var(--acc)}.wrap{max-width:720px;margin:0 auto;padding:0 16px}
.pr{background:var(--soft);color:var(--mute);font-size:.78rem;line-height:1.6;padding:6px 0;border-bottom:1px solid var(--line)}
header{padding:16px 0 12px;border-bottom:1px solid var(--line);background:var(--card)}
header a.brand{font-weight:800;font-size:1.2rem;text-decoration:none;color:var(--fg);letter-spacing:.02em}
header .brand span{color:var(--acc2)}header p{margin:2px 0 0;color:var(--mute);font-size:.82rem;line-height:1.5}
nav{margin-top:8px;font-size:.88rem;display:flex;flex-wrap:wrap;gap:4px 16px}
main{padding:22px 16px 40px}
h1{font-size:1.5rem;line-height:1.45;margin:.2em 0 .6em}
h2{font-size:1.22rem;line-height:1.5;margin-top:2.2em;padding:8px 12px;background:var(--soft);border-left:5px solid var(--acc);border-radius:4px}
h3{font-size:1.06rem;margin-top:1.6em}
table{border-collapse:collapse;width:100%;font-size:.92rem;display:block;overflow-x:auto}
th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}th{background:var(--soft);white-space:nowrap}
.meta{color:var(--mute);font-size:.84rem}.crumbs{margin:0 0 6px}
.box{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:1.6em 0;font-size:.93rem}
.summary{border-left:5px solid var(--acc2)}
.cta{background:var(--card);border:2px solid var(--acc);border-radius:14px;padding:18px 16px;margin:2em 0;text-align:center}
.cta b.h{display:block;font-size:1.08rem;margin-bottom:6px}.cta p{margin:.4em 0;font-size:.92rem}
.btn{display:inline-block;margin-top:8px;padding:12px 22px;border-radius:999px;background:var(--line-green);color:#fff;font-weight:700;text-decoration:none;font-size:1rem}
.btn.off{background:var(--mute)}
.list a.item{display:block;padding:16px 0;border-bottom:1px solid var(--line);text-decoration:none;color:var(--fg)}
.list .t{font-weight:700;line-height:1.5}.list .d{color:var(--mute);font-size:.88rem;line-height:1.6;margin-top:4px}
.hero{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 16px;margin-bottom:12px}
.hero ul{margin:.4em 0 0;padding-left:1.2em}
footer{border-top:1px solid var(--line);padding:18px 16px 36px;color:var(--mute);font-size:.8rem;line-height:1.7}
"""


def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace("</", "<\\/") + "</script>"


def cta_html(where):
    line = CFG.get("line_url", "").strip()
    head = '<b class="h">実家・空き家のこと、写真を送るだけで相談できます</b>'
    body = (f'<p>片付け(残置物撤去)、草刈り・清掃、外壁や屋根の傷み、リフォームや解体の目安など。対応地域は{E(CFG["service_area"])}です。</p>'
            '<p class="meta">相談は無料です。見積もり後に依頼するかどうかは、ご自身で決めていただけます。</p>')
    if line:
        btn = f'<a class="btn" href="{E(line)}" rel="noopener" target="_blank" data-from="{E(where)}">LINEで相談する</a>'
    else:
        btn = '<span class="btn off">LINE相談窓口は準備中です</span>'
    return f'<div class="cta">{head}{body}{btn}<p class="meta">{E(CFG["company_name"])}・担当 のぞむ</p></div>'


def layout(title, desc, body, path, jsonld="", noindex=False, og_type="website", crumbs=None):
    url = f"{BASE}{path}"
    if crumbs:
        jsonld += ld({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": f"{BASE}{u}"} for i, (n, u) in enumerate(crumbs)]})
        body = '<p class="meta crumbs">' + " &gt; ".join(
            [f'<a href="{u}">{E(n)}</a>' for n, u in crumbs[:-1]] + [E(crumbs[-1][0])]) + "</p>" + body
    robots = '<meta name="robots" content="noindex">' if noindex else ""
    sc = CFG.get("search_console_verification", "").strip()
    if sc:
        robots += f'<meta name="google-site-verification" content="{E(sc)}">'
    return f"""<!doctype html><html lang="{CFG['language']}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title><meta name="description" content="{E(desc)}">
<link rel="canonical" href="{E(url)}">{robots}
<meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}"><meta property="og:url" content="{E(url)}"><meta property="og:type" content="{og_type}">
<style>{CSS}</style>{jsonld}</head><body>
<div class="pr"><div class="wrap">{E(CFG['pr_notice'])}</div></div>
<header><div class="wrap"><a class="brand" href="/">実家じまい<span>相談室</span></a><p>{E(CFG['tagline'])}</p>
<nav><a href="/">記事一覧</a><a href="/about/">運営者</a><a href="/contact/">相談する</a><a href="/privacy/">プライバシー</a></nav></div></header>
<main class="wrap">{body}</main>
<footer class="wrap"><p>{E(CFG['ai_disclosure'])}</p><p>運営: {E(CFG['author_name'])} ・ <a href="/about/">運営者情報</a></p><p>© {date.today().year} {E(CFG['site_name'])}</p></footer></body></html>"""


def write(path, content):
    p = DIST / path.lstrip("/")
    if path.endswith("/"):
        p = p / "index.html"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def md_to_html(body):
    return markdown.markdown(body, extensions=["tables", "sane_lists", "toc"])


def insert_mid_cta(h, slug):
    """2つ目の見出しの直前に相談窓口を差し込む(記事の途中で離脱する人向け)。"""
    idx = [m.start() for m in re.finditer(r"<h2", h)]
    if len(idx) >= 3:
        return h[:idx[2]] + cta_html(f"{slug}-mid") + h[idx[2]:]
    return h


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
        src = "".join(f'<li><a href="{E(u)}" rel="noopener nofollow" target="_blank">{E(t) if t else E(u)}</a></li>'
                      for u, t in ((s.split(" ", 1)[0], s.split(" ", 1)[1] if " " in s else "") for s in fm["sources"]))
        note = f'<div class="box"><b>確認したこと:</b> {E(str(fm["verification_note"]))}</div>'
        others = [(o["slug"], o["title"]) for o, _ in published if o["slug"] != slug][:4]
        rel = ('<h2>あわせて読みたい</h2><ul>' + "".join(f'<li><a href="/{s}/">{E(t)}</a></li>' for s, t in others) + "</ul>") if others else ""
        art = (f'<article><p class="meta">{E(fm["date"])} 公開 ・ {E(fm["category"])} ・ 書いた人: {E(CFG["author_name"])}</p>'
               f'<h1>{E(fm["title"])}</h1>{insert_mid_cta(md_to_html(body), slug)}{cta_html(slug + "-end")}{note}'
               f'<h2>参考にした情報</h2><ul>{src}</ul>{rel}</article>')
        jsonld = ld({"@context": "https://schema.org", "@type": "Article", "headline": fm["title"], "datePublished": fm["date"],
                     "dateModified": str(fm.get("updated", fm["date"])), "description": fm["description"],
                     "author": {"@type": "Person", "name": "のぞむ", "affiliation": {"@type": "Organization", "name": CFG["company_name"], "url": CFG["company_url"]}},
                     "mainEntityOfPage": f"{BASE}/{slug}/"})
        write(f"/{slug}/", layout(f'{fm["title"]} | {CFG["site_name"]}', fm["description"], art, f"/{slug}/", jsonld,
                                  og_type="article", crumbs=[("ホーム", "/"), (fm["title"], f"/{slug}/")]))

    items = "".join(f'<a class="item" href="/{fm["slug"]}/"><div class="t">{E(fm["title"])}</div><div class="d">{E(fm["description"])}</div>'
                    f'<div class="meta">{E(fm["date"])} ・ {E(fm["category"])}</div></a>' for fm, _ in published) or "<p>記事を準備中です。</p>"
    hero = ('<div class="hero"><h1 style="margin-top:0">相続した実家・空き家、どうしよう?</h1>'
            '<p>こんな困りごとを、順番に整理できるようにまとめています。</p><ul>'
            '<li>放っておくと税金や責任はどうなるの?</li><li>家の中の荷物、どう片付ければいい?</li>'
            '<li>売る・貸す・直す・解体する、どれがいい?</li></ul></div>')
    write("/", layout(f'{CFG["site_name"]}|{CFG["tagline"]}', CFG["tagline"], hero + f'<h2>記事一覧</h2><div class="list">{items}</div>' + cta_html("home"), "/"))

    write("/about/", layout(f'運営者情報 | {CFG["site_name"]}', "このサイトの運営者と、記事の作り方について", f"""
<h1>運営者情報</h1>
<table><tr><th>サイト名</th><td>{E(CFG['site_name'])}</td></tr>
<tr><th>運営者</th><td>{E(CFG['author_name'])}</td></tr>
<tr><th>所属</th><td><a href="{E(CFG['company_url'])}" rel="noopener" target="_blank">{E(CFG['company_name'])}</a></td></tr>
<tr><th>対応地域</th><td>{E(CFG['service_area'])}</td></tr>
<tr><th>運営開始</th><td>2026年10月</td></tr></table>
<p>{E(CFG['author_bio'])}</p>
<h2>このサイトの立場</h2><p>{E(CFG['pr_notice'])}記事の中の情報は、当社への依頼の有無にかかわらず役立つように、国や自治体の公表資料をもとに書いています。他社への相談や、ご自身での対応がよい場合は、そのように書きます。</p>
<h2>記事の作り方</h2><p>{E(CFG['ai_disclosure'])}</p><p>税金や法律の手続きについては、最終的に税務署・自治体・税理士・司法書士などの専門家にご確認ください。当社は建設会社のため、税務や登記の代行は行いません。</p>""", "/about/"))
    write("/contact/", layout(f'相談する | {CFG["site_name"]}', "実家・空き家の片付け、管理、工事の相談窓口", "<h1>相談する</h1>" + cta_html("contact")
          + "<p>記事の誤りのご指摘も、同じ窓口で受け付けています。</p>", "/contact/"))
    write("/privacy/", layout(f'プライバシーポリシー | {CFG["site_name"]}', "個人情報とアクセス情報の取り扱い", """
<h1>プライバシーポリシー</h1><p class="meta">制定: 2026年10月</p>
<h2>ご相談でいただく情報</h2><p>LINEでのご相談でいただいたお名前・ご住所・写真などは、ご相談への回答、現地調査、お見積もり、工事のご連絡のためにのみ使い、法令に基づく場合を除き第三者へ提供しません。</p>
<h2>アクセス状況の把握</h2><p>検索結果での表示状況を把握するため、Google Search Consoleを利用することがあります。このサイトのページには、閲覧者を追跡する広告タグを設置していません。ホスティング(Cloudflare Pages)では、サービス提供に必要な範囲でアクセスログが処理されることがあります。</p>
<h2>外部サイト</h2><p>LINEなど外部サービスへのリンクがあります。リンク先での情報の取り扱いは、各サービスのポリシーに従います。</p>
<h2>免責</h2><p>記事は公表資料をもとに作成していますが、制度は変わることがあります。手続きの前に、必ず各機関の最新情報をご確認ください。</p>""", "/privacy/"))
    write("/404.html", layout(f'ページが見つかりません | {CFG["site_name"]}', "ページが見つかりません",
                              '<h1>ページが見つかりません</h1><p><a href="/">記事一覧へ</a></p>', "/404.html", noindex=True))

    urls = ["/", "/about/", "/contact/", "/privacy/"] + [f"/{fm['slug']}/" for fm, _ in published]
    write("/sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
          + "".join(f"<url><loc>{BASE}{u}</loc></url>" for u in urls) + "</urlset>")
    write("/robots.txt", f"User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml\n")
    print(f"公開 {len(published)} 本 / 除外 {len(skipped)} 本 → {DIST}")
    for name, errs in skipped:
        print(f"  除外 {name}: " + " / ".join(errs))


if __name__ == "__main__":
    main()
