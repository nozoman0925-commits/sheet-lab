/*
 * 桜ミツ（OUMITSU）計算エンジン（固定ルール・AI非依存）
 *
 * - 金額はすべて「円の整数」で扱う。数量は小数2桁まで（1.5人工など）。
 * - 明細金額 = 数量 × 単価 を、設定の端数処理（lineRounding）で円に丸める。
 * - 消費税はインボイス制度のルールどおり「1書類につき、税率ごとに1回だけ」端数処理する。
 * - 粗利 = 税抜小計 − 原価合計。
 * - 建設業法第20条用に、原価区分（材料費・労務費・経費・外注費）ごとの税抜金額を集計する。
 *
 * ブラウザでは window.EE.engine、Node では module.exports として使える。
 */
(function (root) {
  'use strict';

  var TAX_CATEGORIES = {
    std10: { label: '10%', rate: 10, taxable: true },
    red8: { label: '8%（軽減）', rate: 8, taxable: true, reduced: true },
    exempt: { label: '非課税', rate: 0, taxable: false },
    outside: { label: '対象外', rate: 0, taxable: false }
  };

  var COST_TYPES = {
    material: '材料費',
    labor: '労務費',
    subcontract: '外注費',
    expense: '経費',
    other: 'その他'
  };

  var ITEM_KINDS = {
    product: '商品',
    construction: '工事単価',
    labor: '人工',
    material: '仕入材料'
  };

  /** n / d を整数に丸める（n, d は整数。符号は保ったまま絶対値で丸める） */
  function roundDiv(n, d, mode) {
    if (d === 0) throw new Error('division by zero');
    var sign = (n < 0) !== (d < 0) ? -1 : 1;
    var a = Math.abs(n), b = Math.abs(d);
    var q = Math.floor(a / b), r = a - q * b;
    if (r !== 0) {
      if (mode === 'ceil') q += 1;
      else if (mode === 'round') { if (r * 2 >= b) q += 1; }
      // floor（切り捨て）はそのまま
    }
    return sign * q;
  }

  /** 数量を 1/100 単位の整数にする（浮動小数の誤差を避ける） */
  function qtyToCenti(qty) {
    var n = Number(qty);
    if (!isFinite(n)) return NaN;
    return Math.round(n * 100);
  }

  function lineAmount(qty, unitPrice, mode) {
    var c = qtyToCenti(qty);
    if (!isFinite(c) || !isFinite(unitPrice)) return NaN;
    return roundDiv(c * Math.round(unitPrice), 100, mode || 'round');
  }

  /**
   * 書類を計算する。
   * @param {object} doc   { lines:[{qty, unitPrice, unitCost, taxCategory, costType}] }
   * @param {object} rules { lineRounding:'floor'|'round'|'ceil', taxRounding:'floor'|'round'|'ceil' }
   */
  function calc(doc, rules) {
    rules = rules || {};
    var lineMode = rules.lineRounding || 'round';
    var taxMode = rules.taxRounding || 'floor';
    var lines = (doc && doc.lines) || [];

    var out = {
      lines: [],
      byRate: {},       // { std10: { base, tax, rate, label } }
      subtotal: 0,
      tax: 0,
      total: 0,
      costTotal: 0,
      grossProfit: 0,
      marginRate: null, // 0〜1。小計0のときは null
      costMissing: 0,   // 金額があるのに原価が入っていない行の数（粗利率が実際より高く見えるので、画面では粗利率を出さない）
      breakdown: { material: 0, labor: 0, subcontract: 0, expense: 0, other: 0, discount: 0 },
      adjustments: [],  // 諸経費・値引き・端数調整の結果 [{ id, type, label, amount, byCat }]
      valid: true
    };

    lines.forEach(function (ln) {
      var amount = lineAmount(ln.qty, ln.unitPrice, lineMode);
      var cost = lineAmount(ln.qty, ln.unitCost || 0, lineMode);
      var cat = TAX_CATEGORIES[ln.taxCategory] ? ln.taxCategory : 'std10';
      var ct = COST_TYPES[ln.costType] ? ln.costType : 'other';
      if (!isFinite(amount) || !isFinite(cost)) {
        out.valid = false;
        out.lines.push({ lineId: ln.lineId, amount: 0, cost: 0, profit: 0, invalid: true });
        return;
      }
      out.lines.push({ lineId: ln.lineId, amount: amount, cost: cost, profit: amount - cost });
      if (!out.byRate[cat]) {
        out.byRate[cat] = { base: 0, tax: 0, rate: TAX_CATEGORIES[cat].rate, label: TAX_CATEGORIES[cat].label };
      }
      out.byRate[cat].base += amount;
      out.subtotal += amount;
      out.costTotal += cost;
      if (amount > 0 && !(Number(ln.unitCost) > 0)) out.costMissing++;
      out.breakdown[ct] += amount;
    });

    applyAdjustments(doc, rules, out);

    Object.keys(out.byRate).forEach(function (cat) {
      var r = out.byRate[cat];
      r.tax = TAX_CATEGORIES[cat].taxable ? roundDiv(r.base * r.rate, 100, taxMode) : 0;
      out.tax += r.tax;
    });

    out.total = out.subtotal + out.tax;
    out.grossProfit = out.subtotal - out.costTotal;
    out.marginRate = out.subtotal !== 0 ? out.grossProfit / out.subtotal : null;
    return out;
  }

  function ensureCat(out, cat) {
    if (!out.byRate[cat]) out.byRate[cat] = { base: 0, tax: 0, rate: TAX_CATEGORIES[cat].rate, label: TAX_CATEGORIES[cat].label };
    return out.byRate[cat];
  }

  /**
   * 諸経費・値引き・端数調整（doc.adjustments）
   * 計算順序（システム全体で固定）：
   *   ① 明細 → ② 諸経費（率×対象額、税率区分ごと）→ ③ 値引き（率は税率区分ごと／額は指定区分から）
   *   → ④ 端数調整（税抜合計を 100/1,000/10,000 円未満切り捨て。差額は金額が最大の税率区分から引く）
   *   → ⑤ 消費税（税率区分ごとに1回）
   * 率は「万分率」の整数 rateBp（800 = 8.00%）で持ち、浮動小数を使わない。
   * adj: { id, type:'overhead'|'discount'|'roundoff', label, mode:'rate'|'amount', rateBp, amount, taxCategory, scope:'all'|[lineId], unit }
   */
  function applyAdjustments(doc, rules, out) {
    var adjs = (doc && doc.adjustments) || [];
    if (!adjs.length) return;
    var ohMode = rules.overheadRounding || 'floor';
    var dcMode = rules.discountRounding || 'ceil';
    var lines = doc.lines || [];
    // 範囲（scope）に入る明細の、税率区分ごとの合計
    function baseOf(scope, includeOverheads) {
      var by = {};
      lines.forEach(function (ln, i) {
        if (scope !== 'all' && Array.isArray(scope) && scope.indexOf(ln.lineId) < 0) return;
        var r = out.lines[i]; if (!r || r.invalid) return;
        var cat = TAX_CATEGORIES[ln.taxCategory] ? ln.taxCategory : 'std10';
        by[cat] = (by[cat] || 0) + r.amount;
      });
      if (includeOverheads) out.adjustments.forEach(function (a) {
        if (a.type !== 'overhead') return;
        Object.keys(a.byCat).forEach(function (c) { by[c] = (by[c] || 0) + a.byCat[c]; });
      });
      return by;
    }
    function book(a, byCat, sign) {
      var total = 0;
      Object.keys(byCat).forEach(function (c) {
        var v = byCat[c] * sign;
        ensureCat(out, c).base += v;
        out.subtotal += v;
        total += v;
        byCat[c] = v;
      });
      if (a.type === 'overhead') out.breakdown.expense += total;
      else out.breakdown.discount += total;
      out.adjustments.push({ id: a.id, type: a.type, label: a.label || '', amount: total, byCat: byCat });
    }
    var order = { overhead: 0, discount: 1, roundoff: 2 };
    adjs.slice().sort(function (x, y) { return order[x.type] - order[y.type]; }).forEach(function (a) {
      var byCat = {};
      if (a.type === 'overhead' || a.type === 'discount') {
        var mode = a.type === 'overhead' ? ohMode : dcMode;
        if (a.mode === 'amount') {
          var cat = TAX_CATEGORIES[a.taxCategory] ? a.taxCategory : 'std10';
          byCat[cat] = Math.round(Math.abs(Number(a.amount) || 0));
        } else {
          var bp = Math.round(Number(a.rateBp) || 0);
          var base = baseOf(a.scope || 'all', a.type === 'discount' && (a.scope || 'all') === 'all');
          Object.keys(base).forEach(function (c) { byCat[c] = roundDiv(base[c] * bp, 10000, mode); });
        }
        book(a, byCat, a.type === 'overhead' ? 1 : -1);
      } else if (a.type === 'roundoff') {
        var unit = [100, 1000, 10000].indexOf(Number(a.unit)) >= 0 ? Number(a.unit) : 1000;
        var cut = out.subtotal > 0 ? out.subtotal % unit : 0;
        if (cut) {
          // 差額は金額が大きい税率区分から順に引く。1つの区分を0円未満にはしない（税がマイナスにならないように）
          var left = cut;
          Object.keys(out.byRate).sort(function (x, y) { return out.byRate[y].base - out.byRate[x].base; }).forEach(function (c) {
            if (!left) return;
            var take = Math.min(left, Math.max(0, out.byRate[c].base));
            if (take) { byCat[c] = take; left -= take; }
          });
          book(a, byCat, -1);
        } else {
          out.adjustments.push({ id: a.id, type: a.type, label: a.label || '', amount: 0, byCat: {} });
        }
      }
    });
  }

  /** 保存用の合計スナップショット（送信前チェックで再計算と突き合わせる） */
  function snapshot(result) {
    var byRate = {};
    Object.keys(result.byRate).forEach(function (k) {
      byRate[k] = { base: result.byRate[k].base, tax: result.byRate[k].tax };
    });
    return {
      subtotal: result.subtotal,
      tax: result.tax,
      total: result.total,
      costTotal: result.costTotal,
      byRate: byRate
    };
  }

  var api = {
    TAX_CATEGORIES: TAX_CATEGORIES,
    COST_TYPES: COST_TYPES,
    ITEM_KINDS: ITEM_KINDS,
    roundDiv: roundDiv,
    lineAmount: lineAmount,
    calc: calc,
    snapshot: snapshot
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.EE = root.EE || {}; root.EE.engine = api; }
})(this);
