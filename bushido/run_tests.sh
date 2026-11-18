#!/usr/bin/env bash
# 武士道：一つのコマンドで、組み立て → 一致確認 → 全テスト（→ 1万人シミュレーション）
#   ./run_tests.sh          … 組み立てと全テスト
#   ./run_tests.sh --sim    … さらに 1万人の擬似データで検査（数分かかる）
#   ./run_tests.sh t27      … 指定したテストだけ
set -u
cd "$(dirname "$0")"
ROOT=$(pwd); OUT=$ROOT/tests/out
python3 build.py || exit 1
python3 tools/make_pwa.py >/dev/null || exit 1
rm -rf "$OUT"; mkdir -p "$OUT/look"
cp bushido.html "$OUT/"; cp tests/fixtures/* "$OUT/"; cp -r pwa "$OUT/pwa"
node tools/mksrv.js bushido.html "$OUT/srv"
python3 -m http.server 8765 -d "$OUT/srv" >/dev/null 2>&1 & P1=$!
python3 -m http.server 8766 -d "$OUT/pwa" >/dev/null 2>&1 & P2=$!
trap 'kill $P1 $P2 2>/dev/null' EXIT
sleep 1
TESTS="t6 t7 t13 t15 t15b t18 t19 t21 t22 t23 t24 t25 t26 t27 t28 t29"
SIM=0; SEL=""
for a in "$@"; do [ "$a" = "--sim" ] && SIM=1 || SEL="$SEL $a"; done
[ -n "$SEL" ] && TESTS=$SEL
pass=0; fail=0; bad=""
for t in $TESTS; do
  out=$(cd "$OUT" && timeout 600 node "$ROOT/tests/$t.js" 2>&1)
  p=$(grep -c '^PASS' <<<"$out"); f=$(grep -cE '^(FAIL|CRASH)' <<<"$out")
  e=$(grep -E '^errors' <<<"$out" | tail -1)
  if [ "$f" -gt 0 ] || { [ -n "$e" ] && [ "$e" != "errors []" ]; }; then fail=$((fail+1)); bad="$bad $t"; echo "✗ $t  合格$p 不合格$f  $e"; grep -E '^(FAIL|CRASH)' <<<"$out" | sed 's/^/    /'
  else pass=$((pass+1)); echo "✓ $t  合格$p  ${e:-}"; fi
done
if [ $SIM = 1 ]; then echo "… 1万人シミュレーション"; (cd "$OUT" && node "$ROOT/sim/sim.js" bushido.html 10000) | tail -15; fi
echo "----"; echo "テスト $pass 本合格 / $fail 本不合格${bad:+（$bad ）}"; echo "画面の写し: tests/out/"
[ $fail = 0 ]
