/*
 * 送信前チェック（この製品の目玉）
 *
 * PDFを出す前に、金額の再計算・宛先・日付・有効期限・明細の抜け漏れなどを自動で調べ、
 * 怪しい箇所を一覧で返す。書類は一切書き換えない（指摘だけする）。
 *
 * 返り値: [{ level:'error'|'warn'|'info', code, title, detail, target }]
 *   target: { area:'header'|'lines'|'company'|'summary', field?, lineId? } 画面のどこを直すか
 */
(function (root) {
  'use strict';

  var engine = (typeof module !== 'undefined' && module.exports)
    ? require('./engine.js')
    : root.EE.engine;

  var DAY = 86400000;

  function parseDate(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var p = s.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    return (d.getMonth() === p[1] - 1) ? d : null;
  }

  function diffDays(a, b) { return Math.round((b - a) / DAY); }

  function yen(n) { return '¥' + Number(n).toLocaleString('ja-JP'); }

  /**
   * @param {object} doc
   * @param {object} ctx { items, customers, projects, documents, company, settings, today:'YYYY-MM-DD' }
   */
  function run(doc, ctx) {
    var out = [];
    function add(level, code, title, detail, target) {
      out.push({ level: level, code: code, title: title, detail: detail || '', target: target || { area: 'header' } });
    }

    var settings = ctx.settings || {};
    var company = ctx.company || {};
    var itemsById = {};
    (ctx.items || []).forEach(function (it) { itemsById[it.id] = it; });
    var today = parseDate(ctx.today) || new Date();
    var lines = doc.lines || [];

    // ---- 1. 金額の再計算 ----
    var result = engine.calc(doc, settings);
    if (!result.valid) {
      add('error', 'calc-invalid', '計算できない明細があります', '数量または単価が数値になっていません。', { area: 'lines' });
    }
    if (doc.totals) {
      var t = doc.totals;
      if (t.subtotal !== result.subtotal || t.tax !== result.tax || t.total !== result.total) {
        add('error', 'calc-mismatch', '保存時の金額と再計算の結果が一致しません',
          '保存時 合計 ' + yen(t.total) + ' → 再計算 ' + yen(result.total) +
          '。計算ルール（端数処理・税率）が保存後に変わった可能性があります。保存し直すと最新ルールで確定します。',
          { area: 'summary' });
      }
    } else {
      add('warn', 'not-saved', 'まだ保存されていません', '保存すると金額が確定し、再計算との突き合わせができます。', { area: 'summary' });
    }
    if (result.total <= 0 && lines.length) {
      add('error', 'total-zero', '合計金額が0円以下です', '値引きや数量を確認してください。', { area: 'summary' });
    }

    // ---- 2. 宛先 ----
    var cust = (ctx.customers || []).filter(function (c) { return c.id === doc.customerId; })[0];
    if (!doc.customerId) {
      add('error', 'no-customer', '宛先（顧客）が選ばれていません', '', { area: 'header', field: 'customerId' });
    } else if (!cust) {
      add('error', 'customer-missing', '宛先の顧客データが見つかりません', '顧客が削除された可能性があります。', { area: 'header', field: 'customerId' });
    } else {
      if (!cust.honorific) add('warn', 'no-honorific', '宛名の敬称（御中／様）が未設定です', cust.name, { area: 'header', field: 'customerId' });
      if (cust.kind === 'corp' && cust.honorific === '様' && !cust.contact) {
        add('warn', 'honorific-mismatch', '法人宛てなのに敬称が「様」になっています', '担当者名がない法人宛ては「御中」が一般的です。', { area: 'header', field: 'customerId' });
      }
      if (!cust.address) add('info', 'no-address', '顧客の住所が未登録です', '郵送する場合は登録してください。', { area: 'header', field: 'customerId' });
    }
    if (doc.projectId) {
      var pj = (ctx.projects || []).filter(function (p) { return p.id === doc.projectId; })[0];
      if (!pj) add('warn', 'project-missing', '案件データが見つかりません', '', { area: 'header', field: 'projectId' });
      else if (pj.customerId && pj.customerId !== doc.customerId) {
        add('error', 'project-customer', '案件と宛先の顧客が一致しません', '案件「' + pj.name + '」は別の顧客に紐づいています。', { area: 'header', field: 'projectId' });
      }
    }
    if (!doc.title || !String(doc.title).trim()) {
      add('warn', 'no-title', '件名が空です', '何の見積かが相手に伝わりません。', { area: 'header', field: 'title' });
    }

    // ---- 3. 日付・有効期限 ----
    var issue = parseDate(doc.issueDate);
    var valid = parseDate(doc.validUntil);
    if (!issue) {
      add('error', 'no-issue-date', '発行日が入っていません', '', { area: 'header', field: 'issueDate' });
    } else {
      var d1 = diffDays(today, issue);
      if (d1 > 7) add('warn', 'issue-future', '発行日が' + d1 + '日先になっています', '日付の打ち間違いがないか確認してください。', { area: 'header', field: 'issueDate' });
      if (d1 < -30) add('warn', 'issue-old', '発行日が' + (-d1) + '日前です', '古い日付のまま送ろうとしていないか確認してください。', { area: 'header', field: 'issueDate' });
    }
    if (!valid) {
      add('error', 'no-valid-until', '有効期限が入っていません', '', { area: 'header', field: 'validUntil' });
    } else {
      if (issue && valid < issue) add('error', 'valid-before-issue', '有効期限が発行日より前です', '', { area: 'header', field: 'validUntil' });
      else if (valid < today) add('error', 'expired', '有効期限がすでに切れています', doc.validUntil + ' 期限', { area: 'header', field: 'validUntil' });
      else if (diffDays(today, valid) < 7) add('warn', 'expiring', '有効期限まで' + diffDays(today, valid) + '日しかありません', '相手の検討期間が足りるか確認してください。', { area: 'header', field: 'validUntil' });
      if (issue && diffDays(issue, valid) > 180) add('warn', 'valid-long', '有効期限が発行日から' + diffDays(issue, valid) + '日後です', '資材価格の変動リスクがあります。', { area: 'header', field: 'validUntil' });
    }

    // ---- 4. 明細の抜け漏れ ----
    if (!lines.length) {
      add('error', 'no-lines', '明細が1行もありません', '', { area: 'lines' });
    }
    var seen = {};
    var hasConstruction = false;
    lines.forEach(function (ln, i) {
      var no = (i + 1) + '行目「' + (ln.name || '?') + '」';
      var it = itemsById[ln.itemId];
      var target = { area: 'lines', lineId: ln.lineId };
      if (!ln.itemId) add('error', 'line-no-item', no + 'がマスタに紐づいていません', '', target);
      else if (!it) add('error', 'line-item-deleted', no + 'のマスタが削除されています', '別の品目に差し替えてください。', target);
      else {
        if (it.active === false) add('warn', 'line-item-inactive', no + 'は使用停止中のマスタです', '', target);
        if (it.unitPrice !== ln.unitPrice) {
          add('warn', 'price-changed', no + 'の単価がマスタと違います',
            '明細 ' + yen(ln.unitPrice) + ' ／ 現在のマスタ ' + yen(it.unitPrice) + '。意図した単価か確認してください（明細の「最新単価に更新」で反映できます）。', target);
        }
      }
      var q = Number(ln.qty);
      if (!isFinite(q) || q === 0) add('error', 'qty-zero', no + 'の数量が0または空です', '', target);
      else if (q < 0 && (ln.unitPrice || 0) >= 0) add('warn', 'qty-negative', no + 'の数量がマイナスです', '値引きならマスタに値引き品目を登録して使うのが安全です。', target);
      if (q > 0 && q !== Math.round(q * 100) / 100) add('warn', 'qty-decimals', no + 'の数量の小数が3桁以上です', '小数2桁で計算されます。', target);
      if ((ln.unitPrice || 0) > 0 && (ln.unitCost || 0) > ln.unitPrice) {
        add('warn', 'below-cost', no + 'が原価割れしています', '単価 ' + yen(ln.unitPrice) + ' ＜ 原価 ' + yen(ln.unitCost), target);
      }
      if (ln.itemId && seen[ln.itemId]) add('info', 'dup-line', no + 'は' + seen[ln.itemId] + '行目と同じ品目です', '重複入力でないか確認してください。', target);
      else if (ln.itemId) seen[ln.itemId] = i + 1;
      if (ln.kind === 'construction' || ln.kind === 'labor') hasConstruction = true;
    });

    // ---- 5. 粗利 ----
    var minMargin = typeof settings.minMargin === 'number' ? settings.minMargin : 0.15;
    if (result.marginRate !== null && result.marginRate < minMargin && lines.length) {
      add('warn', 'low-margin', '粗利率が' + (result.marginRate * 100).toFixed(1) + '%です',
        '設定の下限 ' + Math.round(minMargin * 100) + '% を下回っています（粗利 ' + yen(result.grossProfit) + '）。', { area: 'summary' });
    }

    // ---- 6. 法令まわり ----
    var reg = String(company.invoiceRegNo || '').trim();
    if (!reg) add('warn', 'no-reg-no', '適格請求書発行事業者の登録番号が未設定です', '設定・マスタ → 自社情報 で登録できます（見積書には必須ではありませんが、請求書では必須です）。', { area: 'company' });
    else if (!/^T\d{13}$/.test(reg)) add('error', 'bad-reg-no', '登録番号の形式が正しくありません', '「T」＋数字13桁です（現在: ' + reg + '）。', { area: 'company' });
    if (!company.name) add('error', 'no-company', '自社名が未設定です', '', { area: 'company' });

    if (hasConstruction) {
      var b = result.breakdown;
      if (b.material === 0 && b.labor === 0) {
        add('warn', 'kensetsu-20', '工事の見積ですが材料費・労務費の内訳がありません',
          '改正建設業法第20条により、材料費・労務費などの内訳を明示する見積が求められます。マスタの「原価区分」を確認してください。', { area: 'lines' });
      } else if (b.labor === 0) {
        add('info', 'kensetsu-20-labor', '労務費が0円になっています', '改正建設業法第20条：工事の見積では労務費の明示が求められます。', { area: 'lines' });
      }
    }

    // ---- 7. 書類番号 ----
    if (!doc.no) add('error', 'no-number', '見積番号がありません', '', { area: 'header' });
    else {
      var dup = (ctx.documents || []).filter(function (d) { return d.id !== doc.id && d.no === doc.no; });
      if (dup.length) add('error', 'dup-number', '見積番号「' + doc.no + '」が他の書類と重複しています', '', { area: 'header' });
    }

    var order = { error: 0, warn: 1, info: 2 };
    out.sort(function (a, b) { return order[a.level] - order[b.level]; });
    return out;
  }

  function summary(list) {
    var s = { error: 0, warn: 0, info: 0 };
    list.forEach(function (x) { s[x.level]++; });
    return s;
  }

  var api = { run: run, summary: summary, parseDate: parseDate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.EE = root.EE || {}; root.EE.check = api; }
})(this);
