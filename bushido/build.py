#!/usr/bin/env python3
"""src/ の部品を manifest.txt の順につなぎ、bushido.html を作る。
使い方: python3 build.py            → bushido.html を書き出す
        python3 build.py --check    → 書き出さずに、今の bushido.html と一致するか確かめる"""
import sys, os, hashlib
D = os.path.dirname(os.path.abspath(__file__))
names = [l.strip() for l in open(os.path.join(D, "src", "manifest.txt"), encoding="utf-8") if l.strip()]
out = "".join(open(os.path.join(D, "src", n), encoding="utf-8").read() for n in names)
dst = os.path.join(D, "bushido.html")
if "--check" in sys.argv:
    cur = open(dst, encoding="utf-8").read() if os.path.exists(dst) else ""
    print("一致" if cur == out else "不一致（python3 build.py で作り直す）")
    sys.exit(0 if cur == out else 1)
open(dst, "w", encoding="utf-8").write(out)
print("bushido.html", len(out), "文字", hashlib.sha1(out.encode()).hexdigest()[:12])
