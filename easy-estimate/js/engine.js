/*
 * EASY ESTIMATE 計算エンジン（固定ルール・AI非依存）
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
      breakdown: { material: 0, labor: 0, subcontract: 0, expense: 0, other: 0 },
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
      out.breakdown[ct] += amount;
    });

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
