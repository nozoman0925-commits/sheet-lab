/*
 * 桜ミツ版だけ：工事の詳細の上に「工程の帯」と「この工事の収支」を出す（2026-11-26 プロワン式）
 *   受付 → 現地調査 → 見積作成 → 見積提出 → 受注 → 発注・手配 → 施工 → 完了 → 請求 → 入金（見送りなら、その段で止まる）
 *   収支：見積（税抜）・請求・入金・原価・粗利・粗利率を、見積（桜ミツ）と工事の記録から集める
 * 業務管理の画面（index.html・v24 と共通）は書き換えない。build-web.js が oubi.html に入れる。
 */
(function () {
  'use strict';
  var STEPS = [['lead', '受付'], ['survey', '現地調査'], ['est', '見積作成'], ['sent', '見積提出'], ['won', '受注'], ['order', '発注・手配'], ['build', '施工'], ['done', '完了'], ['bill', '請求'], ['paid', '入金']];
  function P() { try { return window.parent && window.parent !== window ? window.parent.EE : null; } catch (e) { return null; } }
  function yen(n) { return '¥' + Math.round(Number(n) || 0).toLocaleString('ja-JP'); }
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function docsOf(EE, id) { return EE && EE.S ? EE.S.documents.filter(function (d) { return d.projectId === id && d.status !== 'void'; }) : []; }

  function state(c) {
    var EE = P(), docs = docsOf(EE, c.id), t = today(), w = c.work || {}, s = c.schedule || {}, r = c.result || {}, x = typeof calc === 'function' ? calc(c) : {};
    var issued = docs.filter(function (d) { return d.status === 'issued'; });
    var sentAt = issued.map(function (d) { var z = (d.sent || [])[(d.sent || []).length - 1]; return z ? z.date : ''; }).filter(Boolean).sort().pop() || '';
    var hasOrder = (EE && EE.S && (EE.S.orders || []).some(function (o) { return docs.some(function (d) { return d.id === o.docId; }); })) || (c.vendors || []).length > 0 || (s.steps || []).some(function (z) { return z.partner; });
    var done = {
      lead: true,
      survey: !!w.surveyDate,
      est: docs.length > 0,
      sent: issued.length > 0,
      won: r.status === 'won',
      order: hasOrder,
      build: !!(s.start && s.start <= t),
      done: !!(s.actualEnd || (s.end && s.end < t)),
      bill: !!((c.invoice || {}).date || x.billed > 0),
      paid: x.billed > 0 && x.unreceived <= 0
    };
    var note = { survey: w.surveyDate ? w.surveyDate.slice(5).replace('-', '/') : w.surveyPlan ? '予定 ' + w.surveyPlan.slice(5).replace('-', '/') : '', sent: sentAt ? sentAt.slice(5).replace('-', '/') : issued.length ? '提出の記録なし' : '',
      won: r.wonDate ? r.wonDate.slice(5).replace('-', '/') : '', build: s.start ? s.start.slice(5).replace('-', '/') : '', bill: x.billed ? yen(x.billed) : '', paid: x.received ? yen(x.received) : '' };
    var last = -1; STEPS.forEach(function (st, i) { if (done[st[0]]) last = i; });
    var lost = r.status === 'lost';
    // 見積（税抜）：採用した見積があればそれ、なければいちばん新しい見積
    var U = EE && EE.ui, acc = docs.filter(function (d) { return d.id === (c.mitsu || {}).acceptedDocId; })[0] || docs.slice().sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); })[0];
    var rr = acc && U ? U.calcDoc(acc) : null;
    var sales = x.actSales || (rr ? rr.subtotal : 0) || x.planSales || x.billed || 0;
    var cost = x.actCost || (rr ? rr.costTotal : 0) || x.planCost || 0;
    var gross = sales - cost;
    return { done: done, note: note, last: last, lost: lost, lostReason: r.reason || '', est: rr ? rr.subtotal : 0, billed: x.billed || 0, received: x.received || 0, cost: cost, gross: gross, rate: sales ? gross / sales * 100 : null, sales: sales };
  }

  function bandHTML(c) {
    var s = state(c);
    var steps = STEPS.map(function (st, i) {
      var cls = s.done[st[0]] ? 'done' : (!s.lost && i === s.last + 1 ? 'now' : '');
      if (s.lost && i === s.last + 1) cls = 'lost';
      var label = s.lost && i === s.last + 1 ? '失注' : st[1];
      return '<li class="cb-step ' + cls + '"><span class="cb-dot" aria-hidden="true"></span><b>' + h(label) + '</b><small>' + h(s.lost && i === s.last + 1 ? s.lostReason : s.note[st[0]] || '') + '</small></li>';
    }).join('');
    var money = '<div class="cb-money">' +
      '<span><small>見積（税抜）</small><b>' + yen(s.est) + '</b></span><span><small>請求</small><b>' + yen(s.billed) + '</b></span><span><small>入金</small><b>' + yen(s.received) + '</b></span>' +
      '<span><small>原価</small><b>' + yen(s.cost) + '</b></span><span><small>粗利</small><b class="' + (s.gross < 0 ? 'neg' : '') + '">' + yen(s.gross) + '</b></span><span><small>粗利率</small><b>' + (s.rate == null ? '—' : s.rate.toFixed(1) + '%') + '</b></span></div>';
    return '<section class="case-band" aria-label="この工事の流れと収支"><ol class="cb-steps">' + steps + '</ol>' + money + '</section>';
  }

  var CSS = '.case-band{flex:none;margin:0;padding:10px 16px;border-radius:14px;border:1px solid rgba(186,230,253,.16);background:rgba(13,20,38,.6)}' +
    '.cb-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:4px}' +
    '.cb-step{position:relative;display:grid;justify-items:center;gap:2px;text-align:center;font-size:13px;color:#93a1b8}' +
    '.cb-step::before{content:"";position:absolute;top:7px;left:-50%;right:50%;height:2px;background:rgba(148,163,184,.25)}.cb-step:first-child::before{display:none}' +
    '.cb-step.done::before,.cb-step.now::before{background:#4d8dff}' +
    '.cb-dot{position:relative;z-index:1;width:16px;height:16px;border-radius:999px;border:2px solid rgba(148,163,184,.45);background:#0d1426}' +
    '.cb-step.done .cb-dot{background:#4d8dff;border-color:#4d8dff}.cb-step.now .cb-dot{border-color:#4d8dff;box-shadow:0 0 0 4px rgba(77,141,255,.22)}' +
    '.cb-step.lost .cb-dot{background:#ff8a96;border-color:#ff8a96}.cb-step.lost b{color:#ffb4bd}' +
    '.cb-step b{font-weight:600;color:#dfe6f3;white-space:nowrap}.cb-step.now b{color:#fff}.cb-step small{font-size:11.5px;min-height:1em;white-space:nowrap}' +
    '.cb-money{display:flex;flex-wrap:wrap;gap:6px 22px;justify-content:flex-end;margin-top:6px;padding-top:6px;border-top:1px solid rgba(186,230,253,.12)}' +
    '.cb-money span{display:inline-flex;gap:8px;align-items:baseline}.cb-money small{font-size:12.5px;color:#93a1b8}.cb-money b{font-size:16px;color:#fff;font-variant-numeric:tabular-nums}.cb-money b.neg{color:#ffb4bd}' +
    'body.show-mode .cb-money{display:none}' +
    '@media (min-width:1100px){body[data-obtab="case"] main:has(> .case-band){grid-template-rows:auto auto minmax(0,1fr)}body[data-obtab="case"] main:has(> .case-band) > .case-card,body[data-obtab="case"] main:has(> .case-band) > section.sec{grid-row:3}}' +
    '@media (max-width:760px){.cb-steps{grid-template-columns:repeat(5,minmax(0,1fr));row-gap:10px}.cb-step:nth-child(6)::before{display:none}.cb-money{justify-content:flex-start;gap:4px 14px}}';

  function paint() {
    try {
      var old = document.querySelector('.case-band');
      if (typeof view === 'undefined' || view.tab !== 'case' || typeof C === 'undefined' || !C) { if (old) old.remove(); return; }   // 工事の画面のときだけ
      var main = document.querySelector('main'), card = document.querySelector('.case-card'); if (!main || !card) return;
      var html = bandHTML(C);
      if (old && old.parentElement === main) { var tmp = document.createElement('div'); tmp.innerHTML = html; if (old.innerHTML !== tmp.firstChild.innerHTML) old.innerHTML = tmp.firstChild.innerHTML; return; }
      if (old) old.remove();
      main.insertAdjacentHTML('afterbegin', html);
    } catch (e) {}
  }
  function start() {
    if (!document.getElementById('case-band-css')) { var st = document.createElement('style'); st.id = 'case-band-css'; st.textContent = CSS; document.head.appendChild(st); }
    var tm = 0; new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(paint, 30); }).observe(document.body, { childList: true, subtree: true });
    try { if (window.parent && window.parent.document && window.parent.document.body.classList.contains('show-mode')) document.body.classList.add('show-mode'); } catch (e) {}
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.OUBI_CASEBAND = { state: state, paint: paint };
})();
