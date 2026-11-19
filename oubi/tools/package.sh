#!/bin/sh
# 公開用の zip を作る（Netlify の「Deploys」に置くもの）
#   sh oubi/tools/package.sh [出力先.zip]
# 桜ミツ（easy-estimate）から mitsu.js・mitsu.css を作り直し、テスト・道具・画面の写真は入れない。
# vendor/（PDF・画像の読み取りの部品）は実体を入れる。
set -e
cd "$(dirname "$0")/.."
node tools/build-mitsu.js
OUT="${1:-$(pwd)/../oubi-公開用.zip}"
rm -f "$OUT"
zip -qr "$OUT" index.html config.js supa.js sales.js features.js health.js mitsu.js mitsu.css mitsu-bridge.js mitsu-host.css theme-oumitsu.css \
  sw.js manifest.webmanifest icon-180.png icon-192.png icon-512.png logo.jpg logo-s.jpg vendor
echo "作成: $OUT"
