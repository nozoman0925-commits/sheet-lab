#!/usr/bin/env python3
"""
動きの文法にそろえる（python3 oubi/tools/motion-grammar.py）
  CSS の transition / animation の秒数を 0.15s（反応）・0.25s（画面内の変化）・0.4s（画面の切り替え）に寄せ、
  曲線を cubic-bezier(0.2, 0, 0, 1) の1つにする。
  例外：オーロラ（aur-）・起動の演出（splash / crest）・数字のカウントアップ。回る印（spin）は 0.4s・等速のまま。
  何度実行しても同じ結果になる（すでにそろっているものは変えない）。
"""
import re, sys, os
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
FILES = ['easy-estimate/css/app.css', 'easy-estimate/css/control.css', 'easy-estimate/css/aurora.css', 'easy-estimate/css/pop.css',
         'easy-estimate/css/voyage.css', 'oubi/web.css', 'oubi/embed.css', 'oubi/index.html', 'oubi/sales.js', 'oubi/features.js', 'oubi/theme-oumitsu.css']
CURVE = 'cubic-bezier(0.2, 0, 0, 1)'
EXCEPT = re.compile(r'aur-|splash|crest|count')
EASE = re.compile(r'ease-in-out|ease-out|ease-in|\bease\b(?!-)|var\(--ease\)|cubic-bezier\([^)]*\)')
TIME = re.compile(r'(?<![\w.-])(\d*\.?\d+)(ms|s)\b')

def snap(sec):
    ms = sec * 1000
    return '.15s' if ms <= 200 else '.25s' if ms <= 325 else '.4s'

def split_parts(v):
    out, depth, cur = [], 0, ''
    for ch in v:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur); cur = ''
        else:
            cur += ch
    out.append(cur)
    return out

def fix_part(part, kind):
    if EXCEPT.search(part):
        return part
    spin = 'spin' in part
    n = [0]
    def t(m):
        n[0] += 1
        sec = float(m.group(1)) / (1000 if m.group(2) == 'ms' else 1)
        if n[0] == 1:
            return '.4s' if spin else snap(sec)
        # 2つ目の時間は「遅れ」：40ms 刻み、0.16秒まで
        d = min(160, round(sec * 1000 / 40) * 40)
        return '0s' if d == 0 else '%gs' % (d / 1000)
    part = TIME.sub(t, part)
    if not spin:
        if EASE.search(part):
            part = EASE.sub(CURVE, part)
        elif kind == 'transition' and n[0] >= 1 and 'linear' not in part and 'steps(' not in part:
            part = part.rstrip() + ' ' + CURVE
        elif kind == 'transition' and 'linear' in part:
            part = part.replace('linear', CURVE)
    return part

DECL = re.compile(r'(transition|animation)(-duration|-timing-function|-delay)?(\s*:\s*)([^;}"`]+)')
def fix_css(css):
    def repl(m):
        prop, sub, sep, val = m.group(1), m.group(2) or '', m.group(3), m.group(4)
        if sub == '-timing-function':
            return m.group(0) if EXCEPT.search(val) or 'linear' in val and prop == 'animation' else prop + sub + sep + EASE.sub(CURVE, val)
        if sub == '-delay':
            return m.group(0)
        if val.strip() in ('none', 'inherit', 'initial', 'unset') or 'var(--' in val and not EASE.search(val) and not TIME.search(val):
            return m.group(0)
        if sub == '-duration':
            return prop + sub + sep + ', '.join(snap(float(x.group(1)) / (1000 if x.group(2) == 'ms' else 1)) for x in TIME.finditer(val)) if TIME.search(val) else m.group(0)
        return prop + sep + ','.join(fix_part(p, prop) for p in split_parts(val))
    return DECL.sub(repl, css)

changed = 0
for f in FILES:
    p = os.path.join(ROOT, f)
    s = open(p, encoding='utf-8').read()
    if f.endswith('.html'):
        n = re.sub(r'(<style[^>]*>)(.*?)(</style>)', lambda m: m.group(1) + fix_css(m.group(2)) + m.group(3), s, flags=re.S)
    elif f.endswith('.js'):
        # JS の中の CSS（文字列）だけ：transition: / animation: の宣言
        n = fix_css(s)
    else:
        n = fix_css(s)
    if n != s:
        open(p, 'w', encoding='utf-8').write(n); changed += 1
        print('そろえた：', f)
print('ファイル', changed, '件を変更')
