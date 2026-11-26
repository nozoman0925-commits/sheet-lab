/*
 * 集計（ホームのフロー図・月別比較・ゲージ、書類一覧の推移、顧客のヒートマップ）
 * 金額はすべて計算エンジン（U.calcDoc）の結果を足し合わせるだけ。推計はしない。
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui;

  function z(n) { return (n < 10 ? '0' : '') + n; }
  /** 直近 n か月（古い順）[{ key:'2026-06', label:'6月', short:'6', y }] */
  function months(n) {
    var t = EE.data.today().split('-').map(Number), out = [];
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(t[0], t[1] - 1 - i, 1);
      out.push({ key: d.getFullYear() + '-' + z(d.getMonth() + 1), label: (d.getMonth() + 1) + '月', short: String(d.getMonth() + 1), y: d.getFullYear() });
    }
    return out;
  }

  /** 書類の工事カテゴリー（書類に無ければ明細のマスタのうち金額の大きいカテゴリー） */
  function docCategory(d) {
    if (d.category) return d.category;
    var by = {}, r = U.calcDoc(d);
    d.lines.forEach(function (l, i) { var it = U.findItem(l.itemId); var c = (it && it.category) || 'other'; by[c] = (by[c] || 0) + (r.lines[i] ? r.lines[i].amount : 0); });
    var best = 'other', v = -1; Object.keys(by).forEach(function (k) { if (by[k] > v) { v = by[k]; best = k; } });
    return best;
  }

  /** 工事ごとの状況。工事に属さない見積は1件ずつ「見積」段階の工事として扱う */
  function cases() {
    var S = EE.S, out = [];
    S.projects.forEach(function (p) {
      var docs = S.documents.filter(function (d) { return d.projectId === p.id; });
      if (!docs.length && (p.stage || 'estimate') === 'estimate') return;   // 見積の無い登録だけの工事は出さない
      out.push(build(p, docs));
    });
    S.documents.filter(function (d) { return !d.projectId || !U.findProject(d.projectId); }).forEach(function (d) {
      out.push(build({ id: '', name: d.title || d.no, customerId: d.customerId, ownerId: d.ownerId, stage: 'estimate', loose: d.id }, [d]));
    });
    return out;
  }
  function build(p, docs) {
    var si = EE.data.stageIndex(p.stage || 'estimate');
    var acc = p.acceptedDocId && docs.filter(function (d) { return d.id === p.acceptedDocId; })[0];
    var latest = docs.slice().sort(function (a, b) { return (b.issueDate || '').localeCompare(a.issueDate || ''); })[0];
    var main = acc || latest;
    var r = main ? U.calcDoc(main) : null;
    var drafts = docs.filter(function (d) { return d.status === 'draft'; });
    var issuedDocs = docs.filter(function (d) { return d.status === 'issued'; });
    var valid = issuedDocs.map(function (d) { return d.validUntil; }).filter(Boolean).sort().pop() || '';   // 有効期限は確定した見積だけ（下書きの期限は数えない）
    var days = valid ? U.daysFromToday(valid) : null;
    var lastDate = [p.paidOn, p.invoicedOn, p.doneOn, p.startedOn, p.orderedOn].concat(docs.map(function (d) { return d.issueDate; })).filter(Boolean).sort().pop() || '';
    var next = EE.data.STAGES[si].next, warn = false;
    if (si === 0) {
      var errs = drafts.reduce(function (n, d) { return n + EE.check.summary(U.checkDoc(d)).error; }, 0);
      if (!docs.some(function (d) { return d.status === 'issued'; }) && errs) { next = '送信前チェックの要修正 ' + errs + ' 件を直してから送る'; warn = true; }
      else if (days != null && days < 0) { next = '有効期限が切れています。再見積を出すか確認する'; warn = true; }
      else if (docs.some(function (d) { return d.status === 'issued'; })) next = 'お客様の返事を確認する（受注なら「受注にする」）';
    }
    return {
      project: p, id: p.id || ('doc:' + p.loose), docs: docs, main: main, amount: r ? r.total : 0, margin: r ? r.marginRate : null,
      stage: si, category: main ? docCategory(main) : 'other', valid: valid, days: days, lastDate: lastDate, next: next, warn: warn,
      owner: U.findMember(p.ownerId || (main && main.ownerId))
    };
  }

  /** 月別：見積額（発行日）・受注額（受注日）・入金額（入金日）・件数・粗利 */
  function monthly(n) {
    var ms = months(n), idx = {};
    ms.forEach(function (m, i) { idx[m.key] = i; m.values = { estimate: 0, order: 0, paid: 0 }; m.count = 0; m.profit = 0; });
    EE.S.documents.forEach(function (d) {
      var i = idx[(d.issueDate || '').slice(0, 7)]; if (i == null) return;
      var r = U.calcDoc(d); ms[i].values.estimate += r.total; ms[i].count++; ms[i].profit += r.grossProfit;
    });
    EE.S.projects.forEach(function (p) {
      var doc = p.acceptedDocId && U.findDoc(p.acceptedDocId); if (!doc) return;
      var amt = U.calcDoc(doc).total;
      var io = idx[(p.orderedOn || '').slice(0, 7)]; if (io != null) ms[io].values.order += amt;
      var ip = idx[(p.paidOn || '').slice(0, 7)]; if (ip != null) ms[ip].values.paid += amt;
    });
    return ms;
  }

  /** 入金率・粗利率・未入金割合（0〜1） */
  function rates() {
    var ordered = 0, paid = 0, billed = 0, unpaid = 0, sub = 0, prof = 0;
    EE.S.projects.forEach(function (p) {
      var doc = p.acceptedDocId && U.findDoc(p.acceptedDocId); if (!doc) return;
      var amt = U.calcDoc(doc).total, si = EE.data.stageIndex(p.stage);
      ordered += amt;
      if (si >= EE.data.stageIndex('paid')) paid += amt;
      if (si >= EE.data.stageIndex('invoice')) { billed += amt; if (si < EE.data.stageIndex('paid')) unpaid += amt; }
    });
    EE.S.documents.forEach(function (d) { var r = U.calcDoc(d); sub += r.subtotal; prof += r.grossProfit; });
    return { paid: ordered ? paid / ordered : 0, margin: sub ? prof / sub : 0, unpaid: billed ? unpaid / billed : 0,
      orderedAmt: ordered, paidAmt: paid, billedAmt: billed, unpaidAmt: unpaid };
  }

  EE.insight = { months: months, cases: cases, monthly: monthly, rates: rates, docCategory: docCategory };
})(this);
