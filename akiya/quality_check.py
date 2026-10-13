#!/usr/bin/env python3
"""実家じまい相談室の品質ゲート。1つでもNGがある記事は公開しない(build.py が除外する)。
使い方: python3 akiya/quality_check.py  -> 終了コード 0=全OK, 1=NGあり
"""
import json, re, sys, difflib
from pathlib import Path
import yaml

ROOT = Path(__file__).parent
CFG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
Q = CFG["quality"]

# 断定・誇大・誤認を招く表現(景表法・ステマ規制・不動産広告の注意)。網羅ではなく、法適合の保証でもない。
BANNED = ["必ず売れる", "絶対に売れる", "確実に売れる", "必ず安くなる", "絶対に安い", "最安値", "業界最安", "日本一", "業界No.1",
          "No.1", "地域一番", "完全無料で何でも", "補助金が必ずもらえる", "必ず補助金", "100%", "誰でも必ず", "損しない方法はこれだけ",
          "最強", "奇跡"]
REQUIRED_FIELDS = ["title", "description", "date", "category", "slug", "sources", "verified", "verification_note"]


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
    results, bodies = {}, {}
    for f in sorted(Path(content_dir).glob("*.md")):
        fm, body = split_front_matter(f.read_text(encoding="utf-8"))
        if fm is None:
            results[f.name] = ["front matterがありません"]
            continue
        errs = [f"必須項目なし: {k}" for k in REQUIRED_FIELDS if k not in fm or fm[k] in (None, "", [])]
        if errs:
            results[f.name] = errs
            continue
        text = plain(body)
        if len(text) < Q["min_chars"]:
            errs.append(f"文字数不足: {len(text)} < {Q['min_chars']}")
        srcs = [s for s in fm["sources"] if isinstance(s, str) and s.startswith("http")]
        if len(srcs) < Q["min_sources"]:
            errs.append(f"出典URLが{Q['min_sources']}件未満")
        if not any(re.search(r"(go\.jp|lg\.jp|metro\.tokyo|city\.|pref\.)", s) for s in srcs):
            errs.append("公的機関(go.jp・自治体)の出典が1件もない")
        if fm.get("verified") is not True:
            errs.append("verified: true ではない(公的資料との照合が未了)")
        if not (15 <= len(str(fm["title"])) <= 60):
            errs.append(f"タイトルは15〜60字: 現在{len(str(fm['title']))}")
        if not (50 <= len(str(fm["description"])) <= 160):
            errs.append(f"descriptionは50〜160字: 現在{len(str(fm['description']))}")
        if len(re.findall(r"^## ", body, re.M)) < 3:
            errs.append("見出し(##)が3つ未満")
        for w in BANNED:
            if w in body or w in str(fm["title"]):
                errs.append(f"要注意表現: {w}")
        if re.search(r"lorem ipsum|TODO|XXX|ここに.{0,10}を入れ", body, re.I):
            errs.append("未完成の記述が残っている")
        results[f.name] = errs
        bodies[f.name] = text
    names = list(bodies)
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = bodies[names[i]][:3000], bodies[names[j]][:3000]
            if difflib.SequenceMatcher(None, a, b).ratio() > Q["max_similarity"]:
                results[names[j]] = results.get(names[j], []) + [f"{names[i]} と内容が類似"]
    return results


if __name__ == "__main__":
    res = check_all(ROOT / "content")
    bad = {k: v for k, v in res.items() if v}
    for k, v in res.items():
        print(("NG " if v else "OK ") + k)
        for e in v:
            print("   -", e)
    print(f"\n合計 {len(res)} 本 / OK {len(res) - len(bad)} 本 / NG {len(bad)} 本")
    sys.exit(1 if bad else 0)
