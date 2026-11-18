/*
 * 文章 → 見積の下書き（AIを使わないルール処理）
 *
 * 例：「フェンス工事の見積もりを作成。既存フェンス撤去、新規フェンス10メートル、高さ1800、独立基礎、残土処分込み。」
 *  1. 文字を整える（全角→半角、漢数字→数字、メートル→m などの単位をそろえる）
 *  2. 工事カテゴリーとテンプレートを、登録済みのキーワードで判定
 *  3. 区切り（、。改行など）ごとに、工事項目マスターの名前・同義語と照合（最も長く一致した語を採用）
 *  4. 数量と単位を読み取り、マスターの単位に換算（mm→m、坪→m² など）。換算できない単位は使わない
 *  5. 「高さ1800」「H1800」のような寸法は、直前の項目の規格の選び分けに使う
 *  6. テンプレートの明細を展開し、文章に出てこなかった項目は「不足候補」として示す
 *  7. 読み取れなかった語句はそのまま一覧に残す（推測で埋めない）
 *
 * 単価は一切扱わない。結果は [{ itemId, qty }] の候補で、金額はマスターと計算エンジンが決める。
 */
(function (root) {
  'use strict';

  var KANJI = { '〇': 0, '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
  var KUNIT = { '十': 10, '百': 100, '千': 1000 };

  /** 漢数字の連続（例：二十五、百五十、三千二百）を数字に */
  function kanjiNumber(str) {
    var total = 0, cur = 0, any = false;
    for (var i = 0; i < str.length; i++) {
      var c = str[i];
      if (KANJI[c] != null) { cur = cur * 10 + KANJI[c]; any = true; }
      else if (KUNIT[c]) { total += (cur || 1) * KUNIT[c]; cur = 0; any = true; }
      else if (c === '万') { total = (total + cur) * 10000; cur = 0; }
      else return null;
    }
    return any ? total + cur : null;
  }

  var UNIT_WORDS = [
    [/平方メートル|平米|㎡|m2|ｍ２|平方m/g, 'm²'],
    [/立方メートル|立米|㎥|m3|立方m/g, 'm³'],
    [/ミリメートル|ミリ|㎜/g, 'mm'],
    [/センチメートル|センチ|㎝/g, 'cm'],
    [/メートル|メーター|ｍ/g, 'm'],
    [/ヶ所|か所|カ所|箇所|ケ所|ヵ所/g, '箇所'],
    [/にんく|人工/g, '人工']
  ];

  function normalize(text) {
    var s = String(text || '').normalize('NFKC');
    // 漢数字＋単位・助数詞（例：十メートル、二十枚、三台、一式）
    s = s.replace(/([〇零一二三四五六七八九十百千万]+)(?=\s*(メートル|メーター|ミリ|センチ|平米|平方|立米|立方|m|枚|台|本|個|式|箇所|ヶ所|か所|カ所|人工|段|坪|日|セット|基|組|間))/g, function (m) {
      var n = kanjiNumber(m); return n == null ? m : String(n);
    });
    UNIT_WORDS.forEach(function (u) { s = s.replace(u[0], u[1]); });
    s = s.replace(/(\d),(\d{3})/g, '$1$2');           // 1,000 → 1000
    return s;
  }
  function key(s) { return String(s || '').normalize('NFKC').toLowerCase().replace(/[\s・\-ー()（）]/g, ''); }

  var UNIT_RE = '(mm|cm|m³|m²|m|坪|箇所|枚|台|本|個|式|人工|段|kg|t|セット|基|組)';
  var QTY_RE = new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + UNIT_RE + '?', 'g');
  var ATTR_RE = /(高さ|H|h|幅|W|w|奥行|D|厚み|厚さ|T|t|φ)\s*=?\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)?/g;

  /** 単位換算。換算できなければ null（推測しない） */
  function convert(qty, from, to) {
    if (!from || from === to) return qty;
    var len = { mm: 0.001, cm: 0.01, m: 1 };
    if (len[from] != null && len[to] != null) return Math.round(qty * len[from] / len[to] * 1000) / 1000;
    if (from === '坪' && to === 'm²') return Math.round(qty * 3.30578 * 100) / 100;
    if (from === 'm²' && to === '坪') return Math.round(qty / 3.30578 * 100) / 100;
    if (from === 't' && to === 'kg') return qty * 1000;
    if (from === 'kg' && to === 't') return qty / 1000;
    return null;
  }

  /** 辞書：マスターの名前・規格つき名前・同義語 → 品目 */
  function buildDict(items) {
    var dict = [];
    items.forEach(function (it) {
      if (it.active === false) return;
      var terms = [it.name].concat(it.synonyms || []);
      if (it.spec) terms.push(it.name + it.spec);
      terms.forEach(function (t) { var k = key(t); if (k.length >= 2) dict.push({ term: k, item: it }); });
    });
    dict.sort(function (a, b) { return b.term.length - a.term.length; });
    return dict;
  }

  function findItems(segKey, dict, category) {
    // 最も長く一致した語に紐づく品目すべて（同じ長さで複数あれば候補として返す）
    var best = 0, hits = [];
    for (var i = 0; i < dict.length; i++) {
      var d = dict[i];
      if (d.term.length < best) break;
      if (segKey.indexOf(d.term) >= 0) {
        best = d.term.length;
        if (hits.indexOf(d.item) < 0) hits.push(d.item);
      }
    }
    if (!hits.length) return null;
    // 同じカテゴリーを優先
    if (category) {
      var inCat = hits.filter(function (h) { return h.category === category; });
      if (inCat.length) hits = inCat;
    }
    return { term: best, items: hits };
  }

  function pickByAttr(items, attrs) {
    if (items.length < 2 || !attrs.length) return null;
    for (var i = 0; i < attrs.length; i++) {
      var v = String(attrs[i].value);
      var m = items.filter(function (it) { return new RegExp('(^|[^\\d])' + v + '([^\\d]|$)').test(it.spec || '') || new RegExp('(^|[^\\d])' + v + '([^\\d]|$)').test(it.name); });
      if (m.length === 1) return m[0];
    }
    return null;
  }

  /**
   * @param {string} text
   * @param {object} ctx { items, templates, categories, customers }
   */
  function parse(text, ctx) {
    var norm = normalize(text);
    var nk = key(norm);
    var items = ctx.items || [], templates = ctx.templates || [], categories = ctx.categories || [];
    var byId = {}; items.forEach(function (it) { byId[it.id] = it; });

    // ---- 2. カテゴリー・テンプレート ----
    var catScore = {};
    categories.forEach(function (c) {
      (c.keywords || []).forEach(function (w) { if (nk.indexOf(key(w)) >= 0) catScore[c.id] = (catScore[c.id] || 0) + key(w).length; });
    });
    var bestTpl = null, bestTplScore = 0;
    templates.forEach(function (t) {
      var sc = 0;
      (t.keywords || []).forEach(function (w) { if (nk.indexOf(key(w)) >= 0) sc += key(w).length * 2; });
      if (nk.indexOf(key(t.name)) >= 0) sc += 100;
      sc += catScore[t.category] || 0 ? 1 : 0;
      if (sc > bestTplScore || (sc === bestTplScore && sc > 0 && bestTpl && t.lines.length < bestTpl.lines.length)) { bestTpl = t; bestTplScore = sc; }
    });
    if (bestTplScore < 2) bestTpl = null;
    var category = bestTpl ? bestTpl.category : Object.keys(catScore).sort(function (a, b) { return catScore[b] - catScore[a]; })[0] || '';

    // 顧客名
    var customerId = '';
    (ctx.customers || []).forEach(function (c) { var k = key(c.name); if (k.length >= 2 && nk.indexOf(k) >= 0) customerId = c.id; });

    // ---- 3〜5. 区切りごとに照合 ----
    var dict = buildDict(items);
    var segments = norm.split(/[、。,，\n;；\/]|\.(?!\d)|(?:\s+と\s+)|(?<=[\d²³a-z所枚台本個式工段])と|(?<=[\d²³a-z所枚台本個式工段])\s+(?=[^\d\s])/).map(function (x) { return x.trim(); }).filter(Boolean);
    var found = [], unknown = [];
    var IGNORE = /^(見積|見積もり|見積り|お見積|の?見積.*作成|作成|込み|お願いします|以上|よろしく.*)$/;
    segments.forEach(function (seg) {
      var sk = key(seg);
      var attrs = []; var m;
      ATTR_RE.lastIndex = 0;
      while ((m = ATTR_RE.exec(seg))) attrs.push({ kind: m[1], value: Number(m[2]), unit: m[3] || '' });
      var segNoAttr = seg.replace(ATTR_RE, ' ');
      var hit = findItems(key(segNoAttr), dict, category);
      if (!hit) {
        if (attrs.length && found.length) {
          // 「高さ1800」だけの区切り → 直前の項目の規格選びに使う
          var prev = found[found.length - 1];
          prev.attrs = prev.attrs.concat(attrs);
          var p2 = pickByAttr(prev.candidates, prev.attrs);
          if (p2) { prev.item = p2; prev.ambiguous = false; }
          prev.phrase += '、' + seg;
          return;
        }
        var stripped = sk.replace(/の?見積(もり|り)?(を)?(作成|作って|お願い).*$/, '').replace(/(工事)$/, '');
        if (!IGNORE.test(seg) && stripped.length >= 2 && !(bestTpl && key(bestTpl.name).indexOf(stripped) >= 0) &&
            !categories.some(function (c) { return (c.keywords || []).some(function (w) { return key(w) === stripped; }) || key(c.name) === stripped; }) &&
            !(customerId && sk.indexOf(key((ctx.customers.filter(function (c) { return c.id === customerId; })[0] || {}).name)) >= 0)) {
          unknown.push(seg);
        }
        return;
      }
      // 数量（寸法以外の数字）
      var qty = null, unit = '';
      QTY_RE.lastIndex = 0;
      while ((m = QTY_RE.exec(segNoAttr))) { qty = Number(m[1]); unit = m[2] || ''; }
      var cands = hit.items;
      var item = pickByAttr(cands, attrs) || cands[0];
      found.push({ item: item, candidates: cands, ambiguous: cands.length > 1 && !pickByAttr(cands, attrs), term: hit.term,
        qty: qty, unit: unit, attrs: attrs, phrase: seg });
    });

    // ---- 単位換算・行の組み立て ----
    var rows = [];
    function rowFor(itemId) { return rows.filter(function (r) { return r.itemId === itemId; })[0]; }
    found.forEach(function (f) {
      var it = f.item;
      var r = { itemId: it.id, qty: null, source: 'text', include: true, phrase: f.phrase, notes: [],
        alternatives: f.ambiguous ? f.candidates.map(function (c) { return c.id; }) : [] };
      if (f.qty != null) {
        var q = convert(f.qty, f.unit || it.unit, it.unit);
        if (q == null) { r.notes.push('「' + f.qty + f.unit + '」は単位「' + it.unit + '」に換算できないため使っていません'); }
        else { r.qty = q; if (f.unit && f.unit !== it.unit) r.notes.push(f.qty + f.unit + ' → ' + q + it.unit + ' に換算'); }
      }
      if (f.ambiguous) r.notes.push('同じ呼び名の品目が' + f.candidates.length + '件あります。規格を選んでください');
      var ex = rowFor(it.id);
      if (ex) { if (r.qty != null) ex.qty = (ex.qty || 0) + r.qty; ex.phrase += '／' + r.phrase; return; }
      rows.push(r);
    });

    // 同じ呼び名で始まる・同じ単位の明細へ数量を引き継ぐ（例：フェンス10m → フェンス施工 10m）
    function stem(it) { var k = key(it.name); return k.slice(0, Math.min(4, k.length)); }
    function linkQty(target) {
      var tIt = byId[target.itemId];
      var src = rows.filter(function (r) {
        var s = byId[r.itemId];
        return r !== target && r.source === 'text' && r.qty != null && s.unit === tIt.unit &&
          (key(tIt.name).indexOf(stem(s)) >= 0 || key(s.name).indexOf(stem(tIt)) >= 0);
      })[0];
      return src ? src : null;
    }

    // ---- 6. テンプレート展開 ----
    var adjustments = [];
    if (bestTpl) {
      bestTpl.lines.forEach(function (tl) {
        var it = byId[tl.itemId]; if (!it) return;
        var ex = rowFor(it.id);
        // 規格違い（例：フェンス材料 H1200 と H1800）が文章で指定済みならテンプレートの方は使わない
        if (!ex && rows.some(function (r) { var o = byId[r.itemId]; return o && o.name === it.name && o.id !== it.id; })) return;
        if (ex) { ex.templateQty = tl.qty; return; }
        rows.push({ itemId: it.id, qty: null, templateQty: tl.qty, source: 'template', include: !tl.optional, optional: !!tl.optional, phrase: '', notes: [], alternatives: [] });
      });
      adjustments = (bestTpl.adjustments || []).map(function (a) { return Object.assign({}, a); });
    }
    rows.forEach(function (r) {
      if (r.qty != null) return;
      var src = linkQty(r);
      if (src) { r.qty = src.qty; r.qtySource = 'linked'; r.notes.push('「' + byId[src.itemId].name + '」と同じ数量を仮に入れています'); return; }
      if (r.templateQty != null) { r.qty = r.templateQty; r.qtySource = 'template'; r.notes.push('数量の指定がないためテンプレートの標準数量です'); return; }
      r.qty = byId[r.itemId].stdQty || 1; r.qtySource = 'standard'; r.notes.push('数量の指定がないためマスターの標準数量です');
    });
    rows.forEach(function (r) { if (r.qtySource == null) r.qtySource = 'text'; });

    // 並び順：テンプレートの順 → 文章だけに出た項目
    if (bestTpl) {
      var order = bestTpl.lines.map(function (l) { return l.itemId; });
      rows.sort(function (a, b) {
        var ia = order.indexOf(a.itemId), ib = order.indexOf(b.itemId);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      });
    }

    return {
      normalized: norm,
      category: category,
      template: bestTpl ? { id: bestTpl.id, name: bestTpl.name } : null,
      customerId: customerId,
      rows: rows,
      missing: rows.filter(function (r) { return r.source === 'template'; }).map(function (r) { return r.itemId; }),
      unknown: unknown,
      adjustments: adjustments
    };
  }

  var api = { parse: parse, normalize: normalize, kanjiNumber: kanjiNumber, convert: convert, key: key };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.EE = root.EE || {}; root.EE.parse = api; }
})(this);
