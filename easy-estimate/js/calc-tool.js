/*
 * 数量・寸法計算（計算式を登録して使う）
 * - 式は「数字・変数・+ - * / ( )・ceil floor round min max」だけを解釈する小さな計算機。eval は使わない
 * - 入力ごとに mm / cm / m を選べ、式の単位（m）に換算してから計算する
 * - 結果 ×（1＋ロス率）→ 端数（小数2桁 or 切り上げ）→ 明細の数量へ
 */
(function (root) {
  'use strict';

  function own(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }

  /** 式を解析して関数にする（構文エラーは例外） */
  function compile(expr) {
    var toks = [], re = /\s*(\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_]*|[-+*/(),])/y, m, pos = 0;
    expr = String(expr || '');
    while (pos < expr.length) {
      re.lastIndex = pos;
      m = re.exec(expr);
      if (!m) { if (/^\s*$/.test(expr.slice(pos))) break; throw new Error('式に使えない文字があります：' + expr.slice(pos, pos + 5)); }
      toks.push(m[1]); pos = re.lastIndex;
    }
    var i = 0;
    var FN = { ceil: Math.ceil, floor: Math.floor, round: Math.round, min: Math.min, max: Math.max, abs: Math.abs };
    function peek() { return toks[i]; }
    // 演算ごとに新しい関数を作る（ループ変数をクロージャで共有しないため）
    function bin(op, a, r) {
      if (op === '+') return function (v) { return a(v) + r(v); };
      if (op === '-') return function (v) { return a(v) - r(v); };
      if (op === '*') return function (v) { return a(v) * r(v); };
      return function (v) { var d = r(v); if (d === 0) throw new Error('0で割っています'); return a(v) / d; };
    }
    function eat(t) { if (toks[i] !== t) throw new Error('式の書き方が正しくありません（' + t + ' が必要）'); i++; }
    function primary() {
      var t = toks[i++];
      if (t == null) throw new Error('式が途中で終わっています');
      if (t === '(') { var e = expr0(); eat(')'); return e; }
      if (t === '-') { var p = primary(); return function (v) { return -p(v); }; }
      if (/^\d/.test(t)) { var n = Number(t); return function () { return n; }; }
      if (/^[A-Za-z_]/.test(t)) {
        if (peek() === '(') {
          if (!own(FN, t)) throw new Error('使えない関数です：' + t);
          i++; var args = [expr0()];
          while (peek() === ',') { i++; args.push(expr0()); }
          eat(')');
          var f = FN[t];
          return function (v) { return f.apply(null, args.map(function (a) { return a(v); })); };
        }
        // 入力そのものにある名前だけを読む（constructor・toString など、JavaScript の内部の名前は読まない）
        return function (v) {
          if (!own(v, t)) throw new Error('入力「' + t + '」がありません');
          var n = Number(v[t]); if (!isFinite(n)) throw new Error('入力「' + t + '」が数値ではありません');
          return n;
        };
      }
      throw new Error('式の書き方が正しくありません：' + t);
    }
    function term() {
      var l = primary();
      while (peek() === '*' || peek() === '/') { var op = toks[i++]; l = bin(op, l, primary()); }
      return l;
    }
    function expr0() {
      var l = term();
      while (peek() === '+' || peek() === '-') { var op = toks[i++]; l = bin(op, l, term()); }
      return l;
    }
    var fn = expr0();
    if (i < toks.length) throw new Error('式の書き方が正しくありません：' + toks[i]);
    return fn;
  }

  var LEN = { mm: 0.001, cm: 0.01, m: 1 };

  /** 計算式と入力値から数量を出す */
  function evaluate(f, values, units) {
    var v = {};
    (f.inputs || []).forEach(function (inp) {
      var x = Number(values[inp.key]);
      if (!isFinite(x)) x = inp.default != null ? Number(inp.default) : 0;
      var u = units && units[inp.key];
      if (u && LEN[u] != null && LEN[inp.unit] != null) x = x * LEN[u] / LEN[inp.unit];
      v[inp.key] = x;
    });
    var raw = compile(f.expr)(v);
    if (!isFinite(raw)) throw new Error('計算結果が数値になりません');
    var withLoss = raw * (1 + (Number(f.lossPct) || 0) / 100);
    var qty = f.round === 'ceil' ? Math.ceil(Math.round(withLoss * 1e6) / 1e6) : Math.round(withLoss * 100) / 100;
    return { raw: Math.round(raw * 1000) / 1000, withLoss: Math.round(withLoss * 1000) / 1000, qty: qty };
  }

  /** 計算ダイアログ。opts: { unit, onApply(qty) } */
  function open(opts) {
    var EE = root.EE, U = EE.ui, esc = U.esc;
    var list = EE.S.formulas || [];
    var pref = list.filter(function (f) { return f.unit && f.unit === opts.unit; });
    var cur = (pref[0] || list[0] || {}).id;
    var vals = {}, units = {};
    function formHTML() {
      var f = list.filter(function (x) { return x.id === cur; })[0];
      if (!f) return '<div class="empty">計算式がありません。設定・マスタ →「計算式」で登録できます</div>';
      return '<div class="form-grid">' + f.inputs.map(function (inp) {
        var isLen = LEN[inp.unit] != null;
        return '<div class="field c6"><label>' + esc(inp.label) + '</label><div style="display:flex;gap:6px">' +
          '<input class="input num" type="number" step="any" data-in="' + inp.key + '" value="' + esc(vals[inp.key] != null ? vals[inp.key] : (inp.default != null ? inp.default : '')) + '">' +
          (isLen ? '<select class="input" data-unit="' + inp.key + '" style="width:80px">' + ['mm', 'cm', 'm'].map(function (u) { return U.opt(u, u, units[inp.key] || inp.unit); }).join('') + '</select>'
            : '<span class="hint" style="align-self:center;min-width:30px">' + esc(inp.unit) + '</span>') + '</div></div>';
      }).join('') + '</div>' +
      '<div class="sum-total" style="margin-top:16px"><div class="label">計算結果</div><div class="big num" id="ct-out">—</div><div class="hint" id="ct-detail"></div></div>' +
      '<p class="hint" style="margin-top:10px">式：<code>' + esc(f.expr) + '</code>' + (f.lossPct ? '　ロス率 ' + f.lossPct + '%' : '') + (f.round === 'ceil' ? '　切り上げ' : '　小数2桁') + '</p>';
    }
    var result = null;
    var m = U.modal({
      title: '数量を計算',
      body: '<div class="field" style="margin-bottom:14px"><label>計算式</label><select class="input" id="ct-f">' + list.map(function (f) {
          return U.opt(f.id, f.name + (f.unit ? '（' + f.unit + '）' : ''), cur); }).join('') + '</select></div><div id="ct-form">' + formHTML() + '</div>',
      foot: '<a class="btn ghost" href="#/settings/formulas">計算式を編集</a><div class="spacer"></div><button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-ok disabled>数量に反映</button>',
      onMount: function (el, api) {
        function calc() {
          var f = list.filter(function (x) { return x.id === cur; })[0];
          var out = el.querySelector('#ct-out'), det = el.querySelector('#ct-detail'), ok = el.querySelector('[data-ok]');
          if (!f || !out) return;
          try {
            var r = evaluate(f, vals, units);
            result = r.qty;
            EE.fx.retarget(out, 0); out.textContent = U.num(r.qty) + ' ' + (f.unit || '');
            det.textContent = '計算 ' + U.num(r.raw) + (f.lossPct ? ' × ロス' + f.lossPct + '% = ' + U.num(r.withLoss) : '') + (opts.unit && f.unit && opts.unit !== f.unit ? '　※明細の単位は「' + opts.unit + '」です' : '');
            det.style.color = opts.unit && f.unit && opts.unit !== f.unit ? 'var(--warn)' : '';
            ok.disabled = !(r.qty > 0);
          } catch (e) { out.textContent = '—'; det.textContent = e.message; det.style.color = 'var(--err)'; ok.disabled = true; }
        }
        el.querySelector('#ct-f').onchange = function (e) { cur = e.target.value; vals = {}; units = {}; el.querySelector('#ct-form').innerHTML = formHTML(); calc(); };
        el.addEventListener('input', function (e) { if (e.target.dataset.in) { vals[e.target.dataset.in] = e.target.value; calc(); } });
        el.addEventListener('change', function (e) { if (e.target.dataset.unit) { units[e.target.dataset.unit] = e.target.value; calc(); } });
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-ok]').onclick = function () { if (result > 0) { opts.onApply(result); api.close(); } };
        calc();
      }
    });
    return m;
  }

  root.EE = root.EE || {};
  root.EE.calcTool = { compile: compile, evaluate: evaluate, open: open };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.EE.calcTool;
})(typeof window !== 'undefined' ? window : this);
