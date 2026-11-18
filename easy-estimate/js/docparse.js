/*
 * 読み取った書類（PDFの文字情報・OCRの結果）→ 見積データの候補
 *
 * 入力：行の配列 [{ text, cells:[{ text, x0, x1, conf }], page, box, conf }]
 *   （PDFは文字の位置、OCRは単語の位置から、同じ高さの文字を1行・離れた文字を別のセルにまとめたもの）
 * 出力：書類の種類、宛先・発行日・番号などの項目、明細行、書類に書かれた小計・消費税・合計
 *
 * ルール：
 *  - 数字は「書かれているとおり」に読む。明細金額が 数量×単価 と合わなくても直さず、印を付けるだけ
 *  - 読めなかった項目は空のまま（推測で補わない）
 *  - 明細として解釈できなかった行は「その他の行」として残し、ユーザーが明細に追加できるようにする
 */
(function (root) {
  'use strict';

  var P = (typeof module !== 'undefined' && module.exports) ? require('./parse.js') : root.EE.parse;

  var UNITS = ['m²', 'm³', 'mm', 'cm', 'm', 'kg', 't', '式', '個', '本', '枚', '台', '箇所', '人工', '日', 'セット', '組', '基', '坪', '缶', '袋', '巻', '箱', 'ケース', '時間', 'L', 'ℓ', '回', '件', '面', '窓', '戸', '室', '棟', '着', '足'];
  var UNIT_RE = new RegExp('^(' + UNITS.map(function (u) { return u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')$');
  var NUM_ONLY = /^[¥￥]?\s*-?[\d,]+(\.\d+)?\s*(円)?$/;
  var QTY_UNIT = new RegExp('^(-?\\d+(?:\\.\\d+)?)\\s*(' + UNITS.join('|') + ')$');
  var SUMMARY = /(小計|合計|総計|消費税|税込|税抜|御見積金額|お見積金額|見積金額|請求金額|ご請求額|値引|端数|内税|対象)/;

  function clean(s) {
    return String(s || '').normalize('NFKC').replace(/[　]/g, ' ').replace(/(平方メートル|平米|㎡|m2)/g, 'm²').replace(/(立方メートル|立米|㎥|m3)/g, 'm³')
      .replace(/(ヶ所|か所|カ所|ケ所|ヵ所)/g, '箇所').trim();
  }
  /** 金額：OCRで「17.500」のように3桁区切りが点で読まれたものはカンマとみなす */
  function money(s) {
    var t = String(s).replace(/[¥￥円\s]/g, '');
    if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    return num(t);
  }
  function num(s) {
    var t = String(s).replace(/[¥￥円,\s]/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
    return Number(t);
  }

  /** 和暦・西暦の日付を YYYY-MM-DD に。読めなければ null */
  function date(s) {
    s = clean(s);
    var m = /(令和|R)\s*(\d{1,2}|元)\s*[年.\/-]\s*(\d{1,2})\s*[月.\/-]\s*(\d{1,2})/.exec(s);
    var y, mo, d;
    if (m) { y = 2018 + (m[2] === '元' ? 1 : Number(m[2])); mo = Number(m[3]); d = Number(m[4]); }
    else {
      m = /(20\d{2})\s*[年.\/-]\s*(\d{1,2})\s*[月.\/-]\s*(\d{1,2})/.exec(s);
      if (!m) return null;
      y = Number(m[1]); mo = Number(m[2]); d = Number(m[3]);
    }
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return y + '-' + (mo < 10 ? '0' : '') + mo + '-' + (d < 10 ? '0' : '') + d;
  }

  /** セルが無い（または1つの）行は空白で分ける */
  function cellsOf(line) {
    var cells = (line.cells && line.cells.length > 1) ? line.cells.map(function (c) { return clean(c.text); }) : clean(line.text).split(/\s+/);
    return cells.filter(function (c) { return c !== ''; });
  }

  /** 1行を明細として読む。読めなければ null */
  function readItemRow(cells) {
    // セルの中の空白でも区切る（OCRで品名と数量が1つのセルにまとまることがあるため）。品名は後で空白でつなぎ直す
    var c = [];
    cells.forEach(function (x) { String(x).split(/\s+/).forEach(function (y) { if (y) c.push(y); }); });
    if (c.length < 2) return null;
    // 先頭の行番号（1, 2, …）は除く
    if (/^\d{1,3}$/.test(c[0]) && c.length > 3 && !/^\d/.test(c[1])) c.shift();
    // 右から：金額 → 単価 → 単位 → 数量
    var nums = [];
    var i = c.length - 1;
    // 末尾の税率表示（10% / 8%※ / ※）は飛ばす
    while (i >= 0 && /^(\d{1,2}%|※|\*|軽)$/.test(c[i])) i--;
    var amount = null, price = null, qty = null, unit = '';
    if (i >= 0 && money(c[i]) != null) { amount = money(c[i]); i--; } else return null;
    if (i >= 0 && money(c[i]) != null) { price = money(c[i]); i--; }
    if (i >= 0 && UNIT_RE.test(c[i])) { unit = c[i]; i--; if (i >= 0 && num(c[i]) != null) { qty = num(c[i]); i--; } }
    else if (i >= 0 && QTY_UNIT.test(c[i])) { var m = QTY_UNIT.exec(c[i]); qty = Number(m[1]); unit = m[2]; i--; }
    else if (i >= 0 && num(c[i]) != null && price != null) { qty = num(c[i]); i--; if (i >= 0 && UNIT_RE.test(c[i])) { unit = c[i]; i--; } }
    else if (i >= 1 && /^[A-Za-z|!\]\[]{1,3}$/.test(c[i]) && num(c[i - 1]) != null) {
      // OCRで単位が読めなかった（例：「式」→「RK」）。数量は使い、単位は空にして確認してもらう
      var unsure = c[i]; qty = num(c[i - 1]); i -= 2; unit = ''; var unitUnsure = unsure;
    }
    // 単価が無く「数量 単位 金額」の形（例：一式 1 式 50,000）
    if (price != null && qty == null && unit) { qty = 1; }
    var name = c.slice(0, i + 1).join(' ').trim();
    if (!name || SUMMARY.test(name) || /^[\d\s.,¥]+$/.test(name)) return null;
    if (qty == null && price != null) { qty = price; price = null; } // 「名前 数量 金額」の形
    var row = { name: name, qty: qty, unit: unit, unitPrice: price, amount: amount };
    if (unitUnsure) row.unitUnsure = unitUnsure;
    return row;
  }

  function parseDoc(lines, ctx) {
    ctx = ctx || {};
    var text = lines.map(function (l) { return clean(l.text); }).join('\n');
    var out = {
      docType: /請求書/.test(text) ? 'invoice' : /注文請書/.test(text) ? 'order-ack' : /(発注書|注文書)/.test(text) ? 'order' : /契約書/.test(text) ? 'contract' : /見積/.test(text) ? 'estimate' : 'other',
      fields: { customerName: '', issuer: '', issueDate: '', number: '', title: '', phone: '', address: '' },
      totals: { subtotal: null, tax: null, total: null },
      rows: [], others: []
    };
    var F = out.fields;
    lines.forEach(function (l, idx) {
      var t = clean(l.text);
      var before = JSON.stringify(F);
      // 項目（件名・宛名・番号など）は、まずセル単位で探す（右側の別の欄が混ざらないように）
      if (l.cells && l.cells.length > 1) {
        l.cells.forEach(function (c) {
          var ct = clean(c.text);
          if (!F.title) { var ti0 = /^(件名|工事名|案件名|工事件名)\s*[:：]?\s*(.+)$/.exec(ct); if (ti0) F.title = ti0[2].trim(); }
          if (!F.customerName) { var cm0 = /^(.+?)\s*(御中|様)$/.exec(ct); if (cm0 && cm0[1].length <= 40 && !/(見積|請求|下記)/.test(cm0[1])) { F.customerName = cm0[1].trim(); F.honorific = cm0[2]; } }
          if (!F.issuer) { var co0 = /^((株式会社|有限会社|合同会社)\s*\S+|\S+\s*(株式会社|有限会社|合同会社))$/.exec(ct); if (co0 && !/(御中|様)/.test(ct)) F.issuer = co0[1].trim(); }
        });
      }
      // 宛名（最初に出てくる「〜 御中／様」）
      if (!F.customerName) {
        var m = /^(.+?)\s*(御中|様)(\s|$)/.exec(t);
        if (m && m[1].length <= 40 && !/(見積|請求|下記)/.test(m[1])) { F.customerName = m[1].replace(/^(宛先|お客様名?)[:：]?\s*/, '').trim(); F.honorific = m[2]; }
      }
      if (!F.issueDate && /(発行日|見積日|作成日|請求日|日付|年月日)/.test(t)) F.issueDate = date(t) || '';
      if (!F.number) { var n = /(No\.?|NO\.?|番号|見積番号|請求番号|伝票番号)\s*[:：]?\s*([A-Za-z0-9][A-Za-z0-9\-_\/]{2,})/.exec(t); if (n) F.number = n[2]; }
      if (!F.title) { var ti = /(件名|工事名|案件名|工事件名)\s*[:：]?\s*(.+)$/.exec(t); if (ti) F.title = ti[2].trim(); }
      if (!F.phone) { var ph = /(TEL|Tel|tel|電話)\s*[:：]?\s*(0\d{1,4}-?\d{1,4}-?\d{3,4})/.exec(t); if (ph) F.phone = ph[2]; }
      if (!F.address) { var ad = /((東京都|北海道|(京都|大阪)府|.{2,3}県).{2,}?(市|区|町|村).*)$/.exec(t); if (ad && !/(御中|様)/.test(t)) F.address = ad[1].trim(); }
      if (!F.issuer && !(l.cells && l.cells.length > 1)) { var co = /((株式会社|有限会社|合同会社)\s*\S+|\S+\s*(株式会社|有限会社|合同会社))/.exec(t); if (co && !/(御中|様)/.test(t)) F.issuer = co[1].trim(); }
      // 合計類（同じ行の最後の金額）
      var cells = cellsOf(l);
      var lastNum = null;
      for (var k = cells.length - 1; k >= 0; k--) { if (money(cells[k]) != null) { lastNum = money(cells[k]); break; } }
      var joined = cells.join('');
      if (lastNum != null) {
        if (/小計/.test(joined) && out.totals.subtotal == null) { out.totals.subtotal = lastNum; return; }
        if (/消費税/.test(joined) && !/(込|対象)/.test(joined) && out.totals.tax == null) { out.totals.tax = lastNum; return; }
        if (/(御見積金額|お見積金額|見積金額|ご請求額|請求金額|総合計|合計)/.test(joined) && !/小計/.test(joined)) { out.totals.total = lastNum; return; }
      }
      var row = readItemRow(cells);
      if (row) {
        row.source = { line: idx, page: l.page, box: l.box };
        row.conf = l.conf != null ? l.conf : null;
        if (row.qty != null && row.unitPrice != null && row.amount != null) {
          var exp = row.qty * row.unitPrice;
          row.mismatch = Math.abs(exp - row.amount) > Math.max(1, Math.abs(row.amount) * 0.001);
        } else row.mismatch = false;
        out.rows.push(row);
      } else if (t && !SUMMARY.test(t) && JSON.stringify(F) === before) {   // 宛先・日付などに使った行は除く
        out.others.push({ text: t, line: idx, page: l.page, box: l.box });
      }
    });
    // 宛名がタイトル行（「御見積書」など）と同じ行に来た場合などの保険
    if (F.customerName && /(見積書|請求書)$/.test(F.customerName)) F.customerName = '';

    // マスタとの照合（コード一致 → 名前・同義語の一致）
    if (ctx.items) {
      var codes = {}; ctx.items.forEach(function (it) { codes[P.key(it.code)] = it; });
      out.rows.forEach(function (r) {
        var nk = P.key(r.name);
        var codeHit = null;
        Object.keys(codes).forEach(function (k) { if (k.length >= 3 && nk.indexOf(k) === 0) codeHit = codes[k]; });
        if (codeHit) { r.itemId = codeHit.id; r.match = 'code'; return; }
        var res = P.parse(r.name, { items: ctx.items, templates: [], categories: [], customers: [] });
        var hit = res.rows.filter(function (x) { return x.source === 'text'; })[0];
        var nameLen = P.key(r.name.replace(/[\d.]+\s*(mm|cm|m|H|W)?/g, '')).length || 1;
        if (hit && (hit.termLen || 0) / nameLen >= 0.5) {
          var it = ctx.items.filter(function (x) { return x.id === hit.itemId; })[0];
          r.itemId = it.id; r.match = P.key(it.name) === nk ? 'exact' : 'similar';
          r.alternatives = hit.alternatives;
        } else if (hit) {
          // 一部の語だけ一致（例：「ウッドデッキ補修」と「補修」）→ 自動では結び付けず候補として示す
          r.itemId = ''; r.match = 'none'; r.alternatives = [hit.itemId].concat(hit.alternatives || []).filter(function (v, i, a) { return a.indexOf(v) === i; });
        } else { r.itemId = ''; r.match = 'none'; }
      });
    }
    if (ctx.customers && F.customerName) {
      var ck = P.key(F.customerName);
      var cu = ctx.customers.filter(function (c) { return P.key(c.name) === ck || (ck.length >= 3 && P.key(c.name).indexOf(ck) >= 0); })[0];
      if (cu) out.customerId = cu.id;
    }
    var sum = out.rows.reduce(function (s, r) { return s + (r.amount || 0); }, 0);
    out.rowsSum = sum;
    out.sumMatches = out.totals.subtotal != null ? sum === out.totals.subtotal : null;
    return out;
  }

  /** 位置つきの文字片（PDF・OCR）を行とセルにまとめる */
  function groupLines(pieces, opts) {
    opts = opts || {};
    var ps = pieces.filter(function (p) { return String(p.text || '').trim() !== ''; }).slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var lines = [];
    ps.forEach(function (p) {
      var h = p.h || 10;
      var ln = lines.filter(function (l) { return l.page === p.page && Math.abs(l.cy - (p.y + h / 2)) < Math.max(l.h, h) * 0.55; })[0];
      if (!ln) { ln = { page: p.page, cy: p.y + h / 2, h: h, pieces: [] }; lines.push(ln); }
      ln.pieces.push(p);
    });
    return lines.map(function (l) {
      l.pieces.sort(function (a, b) { return a.x - b.x; });
      var cells = [], cur = null;
      var ch = l.h || 10;
      l.pieces.forEach(function (p) {
        var gap = cur ? p.x - cur.x1 : Infinity;
        if (cur && gap < ch * (opts.gapRatio || 0.9)) { cur.text += (gap > ch * 0.25 && /[A-Za-z0-9]$/.test(cur.text) && /^[A-Za-z0-9]/.test(p.text) ? ' ' : '') + p.text; cur.x1 = p.x + p.w; cur.confs.push(p.conf); }
        else { cur = { text: p.text, x0: p.x, x1: p.x + p.w, confs: [p.conf] }; cells.push(cur); }
      });
      var confs = l.pieces.map(function (p) { return p.conf; }).filter(function (c) { return c != null; });
      var x0 = Math.min.apply(null, l.pieces.map(function (p) { return p.x; }));
      var x1 = Math.max.apply(null, l.pieces.map(function (p) { return p.x + p.w; }));
      var y0 = Math.min.apply(null, l.pieces.map(function (p) { return p.y; }));
      var y1 = Math.max.apply(null, l.pieces.map(function (p) { return p.y + (p.h || 10); }));
      return {
        page: l.page, text: cells.map(function (c) { return c.text; }).join(' '),
        cells: cells.map(function (c) { var cs = c.confs.filter(function (x) { return x != null; }); return { text: c.text, x0: c.x0, x1: c.x1, conf: cs.length ? Math.min.apply(null, cs) : null }; }),
        box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, conf: confs.length ? Math.min.apply(null, confs) : null
      };
    });
  }

  var api = { parseDoc: parseDoc, groupLines: groupLines, readItemRow: readItemRow, date: date, clean: clean };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.EE = root.EE || {}; root.EE.docparse = api; }
})(this);
