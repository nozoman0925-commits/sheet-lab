#!/usr/bin/env python3
"""記事の品質ゲート。1つでもNGなら公開しない(build_site.pyが除外する)。
使い方: python3 quality_check.py [content_dir]   -> 終了コード 0=全OK, 1=NGあり
"""
import json, re, sys, difflib
from pathlib import Path
import yaml

ROOT = Path(__file__).parent
CFG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
Q = CFG["quality"]

# 禁止・要注意表現(薬機法/景表法/断定表現の一部)。網羅ではなく、法適合の保証でもない。
BANNED = ["治る", "完治", "必ず稼げる", "絶対に稼げる", "誰でも簡単に稼げる", "100%保証", "業界No.1", "日本一", "世界一",
          "最強", "奇跡", "放置で稼げる", "確実に儲かる", "不労所得が確実"]
REQUIRED_FIELDS = ["title", "description", "date", "category", "slug", "sources", "verified"]


def split_front_matter(text):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        return None, text
    return yaml.safe_load(m.group(1)) or {}, m.group(2)


def plain(body):
    body = re.sub(r"```.*?```", "", body, flags=re.S)
    body = re.sub(r"[#>*`|\-\[\]()]", "", body)
    return re.sub(r"\s+", "", body)


def check_all(content_dir):
    files = sorted(Path(content_dir).glob("*.md"))
    results, bodies = {}, {}
    for f in files:
        errs = []
        fm, body = split_front_matter(f.read_text(encoding="utf-8"))
        if fm is None:
            results[f.name] = ["front matterがありません"]
            continue
        for k in REQUIRED_FIELDS:
            if k not in fm or fm[k] in (None, "", []):
                errs.append(f"必須項目なし: {k}")
        if errs:
            results[f.name] = errs
            continue
        text = plain(body)
        if len(text) < Q["min_chars"]:
            errs.append(f"文字数不足: {len(text)} < {Q['min_chars']}")
        srcs = [s for s in fm["sources"] if isinstance(s, str) and s.startswith("http")]
        # 外部URLがない場合は、存在する検証スクリプト(site/verify/*.py)への参照があれば可(CHARTER 2026-10-13)
        scripts = [m for s in fm["sources"] if isinstance(s, str) for m in re.findall(r"site/verify/[\w\-]+\.py", s)]
        if len(srcs) < Q["min_sources"] and not any((ROOT.parent / m).exists() for m in scripts):
            errs.append("出典URLが不足(または参照先の検証スクリプトが存在しない)")
        if Q["require_verified"] and fm.get("verified") is not True:
            errs.append("verified: true ではない(数式・手順の実機確認が未了)")
        if Q["require_verified"] and fm.get("verified") is True and not fm.get("verification_note"):
            errs.append("verification_note(何をどう確認したか)がない")
        if not (15 <= len(str(fm["title"])) <= 70):
            errs.append(f"タイトルは15〜70字: 現在{len(str(fm['title']))}")
        if not (50 <= len(str(fm["description"])) <= 160):
            errs.append(f"descriptionは50〜160字: 現在{len(str(fm['description']))}")
        if not re.search(r"^## ", body, re.M):
            errs.append("見出し(##)がない")
        for w in BANNED:
            if w in body or w in str(fm["title"]):
                errs.append(f"要注意表現: {w}")
        if re.search(r"https?://[^\s)]*(amzn|a8\.net|rakuten|valuecommerce|moshimo|afi)", body) and "広告" not in body:
            errs.append("アフィリエイトらしきリンクがあるが『広告』『PR』の明示がない(ステマ規制)")
        if re.search(r"lorem ipsum|ここに(.*)を入れ|TODO|XXX", body, re.I):
            errs.append("未完成の記述が残っている")
        results[f.name] = errs
        bodies[f.name] = text
    # 重複・類似チェック
    names = list(bodies)
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = bodies[names[i]], bodies[names[j]]
            r = difflib.SequenceMatcher(None, a[:3000], b[:3000]).quick_ratio()
            if r > Q["max_similarity"] and difflib.SequenceMatcher(None, a[:3000], b[:3000]).ratio() > Q["max_similarity"]:
                results[names[j]] = results.get(names[j], []) + [f"{names[i]} と内容が類似({r:.2f})"]
    return results


if __name__ == "__main__":
    d = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "content")
    res = check_all(d)
    bad = {k: v for k, v in res.items() if v}
    for k, v in res.items():
        print(("NG " if v else "OK ") + k)
        for e in v:
            print("   -", e)
    print(f"\n合計 {len(res)} 本 / OK {len(res)-len(bad)} 本 / NG {len(bad)} 本")
    sys.exit(1 if bad else 0)
