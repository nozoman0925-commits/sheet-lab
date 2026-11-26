/*
 * 桜ミツ版の12の追加（2026-11-25）
 *   1 ホームの「次の一手」      2 提出の記録と返事待ちの追いかけ   3 見積から請求書（着手金・中間金・残金）
 *   4 失注の理由と傾向          5 単価のまとめて改定と影響の一覧   6 工事の種類ごとの粗利の下限（ui.minMarginOf・設定）
 *   7 原価の行から発注書        8 寸法を覚えて数量を計算し直す     9 数量ごとの検索入力（editor.js）
 *  10 写真付きの見積書         11 バックアップの週1の声かけ      12 見せる用の版（build-web.js --demo）
 * 金額はすべてマスタと固定の計算エンジン（engine.js）から。AI は使わない。
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc, yen = U.yen;
  function T() { return EE.data.today(); }
  function N(v) { var n = Number(String(v == null ? '' : v).replace(/[,，円\s]/g, '')); return isFinite(n) ? n : 0; }
  function O() { try { var f = root.OUBI_LINK && root.OUBI_LINK.frame(); return f && f.contentWindow && f.contentWindow.OUBI; } catch (e) { return null; } }
  function caseOf(id) { var o = O(); return o && id ? (o.cases() || []).filter(function (c) { return c.id === id; })[0] : null; }
  function proj(id) { return id ? (EE.S.projects || []).filter(function (p) { return p.id === id; })[0] : null; }
  function daysSince(d) { return d ? Math.round((new Date(T() + 'T00:00:00') - new Date(String(d).slice(0, 10) + 'T00:00:00')) / 864e5) : null; }
  function daysTo(d) { return -daysSince(d); }
  function md(d) { var p = String(d || '').slice(5, 10).split('-'); return p.length === 2 ? Number(p[0]) + '/' + Number(p[1]) : ''; }
  function commit() { EE.ui.commit(); }
  function rerender() { if (EE.app && EE.app.rerender) EE.app.rerender(); }
  function seqNo(kind, prefix) {
    var S = EE.S, ym = T().slice(0, 7).replace('-', ''); S.seq = S.seq || {}; var q = S.seq[kind] = S.seq[kind] || {};
    q[ym] = (q[ym] || 0) + 1; var n = String(q[ym]); while (n.length < 3) n = '0' + n; return prefix + '-' + ym + '-' + n;
  }
  /** 同じ工事の見積のうち、修正前の古い版を除いたもの */
  function liveDocs() {
    var parents = {}; (EE.S.documents || []).forEach(function (d) { if (d.parentId) parents[d.parentId] = 1; });
    return (EE.S.documents || []).filter(function (d) { return d.type !== 'invoice' && !parents[d.id]; });
  }
  function lastSent(d) { var s = d.sent || []; return s.length ? s[s.length - 1] : null; }
  var VIA = ['手渡し', 'メール', 'LINE', '郵送', 'FAX', 'その他'];
  var LOST = ['金額が高い', '他社で契約', '予算が合わない', '工事時期が合わない', '提案内容が合わない', '顧客都合', '連絡が取れない', '工事自体を中止', 'その他'];   // 業務管理の「見送りの理由」と同じ

  /* =====================================================================
   * 2 提出の記録 ／ 返事待ち
   * ===================================================================== */
  /** 返事を待っている見積（見積の段階の工事で、確定して提出したもの） */
  function waiting() {
    return liveDocs().filter(function (d) {
      if (d.status !== 'issued') return false;
      var p = proj(d.projectId); if (p && (p.lost || (p.stage && p.stage !== 'estimate') || p.acceptedDocId)) return false;
      // 追いかけるのは最近のものだけ（確定から30日以内・提出から60日以内）。前から残っている古い見積で知らせを埋めない
      var s = lastSent(d); return s ? daysSince(s.date) <= 60 : daysSince((d.issuedAt || '').slice(0, 10)) <= 30;
    });
  }
  function recordSent(doc, via, date) {
    var d = EE.S.documents.filter(function (x) { return x.id === doc.id; })[0] || doc;
    d.sent = (d.sent || []).concat([{ date: date || T(), via: via, at: new Date().toISOString() }]);
    d.history = (d.history || []).concat([{ at: new Date().toISOString(), action: '提出を記録（' + via + '）' }]);
    commit();
    var c = caseOf(d.projectId), o = O();
    if (c && o) { o.addLog(c, '見積 ' + (d.no || '') + ' を提出（' + via + '）'); o.touch(c); }
  }
  function sentModal(doc, after) {
    U.modal({
      title: '提出を記録 — ' + (doc.no || ''),
      body: '<p class="hint" style="margin-top:0">お客様に見積を渡した日と方法を残します。3日たっても返事がないと「今日やること」に「返事を聞く」が出ます（7日で目立つ印）。</p>' +
        '<div class="form-grid"><div class="field c4"><label>提出した日</label><input class="input" type="date" id="sent-date" value="' + T() + '"></div>' +
        '<div class="field c8"><label>方法</label><div class="seg" id="sent-via" role="radiogroup">' + VIA.map(function (v, i) { return '<button type="button" role="radio" aria-checked="' + (i === 0) + '" data-v="' + v + '" class="' + (i === 0 ? 'on' : '') + '">' + v + '</button>'; }).join('') + '</div></div></div>',
      foot: '<div class="spacer"></div><button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-ok>' + I.check + '記録する</button>',
      onMount: function (el, api) {
        el.querySelector('#sent-via').addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (!b) return; el.querySelectorAll('#sent-via [data-v]').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); });
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-ok]').onclick = function () {
          var via = (el.querySelector('#sent-via .on') || {}).dataset.v || 'その他', date = el.querySelector('#sent-date').value || T();
          recordSent(doc, via, date); api.close(); EE.fx.toast('提出を記録しました（' + md(date) + '・' + via + '）', { force: true }); if (after) after(); else rerender();
        };
      }
    });
  }

  /* =====================================================================
   * 4 失注（見送り）：理由を1つ選んで工事に記録 ／ 理由の傾向
   * ===================================================================== */
  function lostStats() {
    var o = O(), out = {}; if (!o) return [];
    (o.cases() || []).forEach(function (c) { var r = c.result || {}; if (r.status === 'lost') { var k = r.reason || '未入力'; out[k] = (out[k] || 0) + 1; } });
    return Object.keys(out).map(function (k) { return [k, out[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }
  function trendHTML(list, max) {
    if (!list.length) return '<p class="hint">まだ失注の記録はありません。</p>';
    var top = list[0][1];
    return '<div class="lost-trend">' + list.slice(0, max || 9).map(function (x) {
      return '<div class="lt-row"><span class="lt-k">' + esc(x[0]) + '</span><span class="lt-bar"><i style="width:' + Math.round(x[1] / top * 100) + '%"></i></span><b class="num">' + x[1] + '件</b></div>';
    }).join('') + '</div>';
  }
  function lostModal(doc) {
    var c = caseOf(doc.projectId); if (!c) { EE.fx.toast('工事に結び付いていない見積は、失注を記録できません', { warn: true }); return; }
    var stats = lostStats();
    U.modal({
      title: '失注にする — ' + ((proj(doc.projectId) || {}).name || doc.title || ''),
      body: '<p class="hint" style="margin-top:0">理由を1つ選ぶと、工事が「見送り」になります。理由は経営の数字にたまり、何で取れていないかが分かります。</p>' +
        '<div class="field"><label class="req">失注の理由</label><div class="chips lost-reasons" role="radiogroup">' + LOST.map(function (k) { return '<button type="button" class="chipbtn" role="radio" aria-checked="false" data-r="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') + '</div></div>' +
        '<div class="field" style="margin-top:12px"><label>メモ（任意）</label><input class="input" id="lost-note" placeholder="例：他社が20万円安かった"></div>' +
        '<div class="label" style="margin:16px 0 6px">これまでの失注の理由</div>' + trendHTML(stats, 5),
      foot: '<div class="spacer"></div><button class="btn ghost" data-c>キャンセル</button><button class="btn danger" data-ok disabled>失注にする</button>',
      onMount: function (el, api) {
        var pick = '';
        el.querySelector('.lost-reasons').addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (!b) return; pick = b.dataset.r; el.querySelectorAll('[data-r]').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); el.querySelector('[data-ok]').disabled = false; });
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-ok]').onclick = function () {
          var o = O(); if (!o || !pick) return;
          var before = JSON.parse(JSON.stringify(c.result || {})), note = el.querySelector('#lost-note').value.trim();
          c.result = Object.assign({}, c.result, { status: 'lost', reason: pick, lostDate: T() }); if (note) c.result.lostNote = note;
          o.addLog(c, '見積の画面から見送り（失注）と記録：' + pick + (note ? '（' + note + '）' : '')); o.touch(c);
          api.close();
          EE.fx.toast('失注にしました（' + pick + '）', { action: { label: '元に戻す', run: function () { c.result = before; o.addLog(c, '失注の記録を取り消し'); o.touch(c); setTimeout(rerender, 300); } } });
          setTimeout(rerender, 300);
        };
      }
    });
  }

  /* =====================================================================
   * 3 請求書：見積の金額を、着手金・中間金・残金などに分けて請求書にする
   * ===================================================================== */
  var SPLITS = [['一括', [['請求', 100]]], ['着手金・残金（50%・50%）', [['着手金', 50], ['残金', 50]]], ['着手金・残金（30%・70%）', [['着手金', 30], ['残金', 70]]],
    ['着手金・中間金・残金（30%・40%・30%）', [['着手金', 30], ['中間金', 40], ['残金', 30]]]];
  function invoicesOf(docId) { return (EE.S.invoices || []).filter(function (v) { return v.docId === docId; }); }
  /** 割合で分ける：税率ごとの対象額と税額を割合で分け、最後の1件で端数を合わせる（合計が見積と1円もずれない） */
  function splitAmounts(doc, parts) {
    var r = U.calcDoc(doc), rates = Object.keys(r.byRate), acc = {}, out = [];
    rates.forEach(function (k) { acc[k] = { base: 0, tax: 0 }; });
    parts.forEach(function (p, i) {
      var last = i === parts.length - 1, by = {}, total = 0;
      rates.forEach(function (k) {
        var x = r.byRate[k], base = last ? x.base - acc[k].base : Math.floor(x.base * p.ratio / 100), tax = last ? (x.tax || 0) - acc[k].tax : Math.floor((x.tax || 0) * p.ratio / 100);
        acc[k].base += base; acc[k].tax += tax; by[k] = { rate: x.rate, base: base, tax: tax }; total += base + tax;
      });
      out.push({ label: p.label, ratio: p.ratio, byRate: by, amount: total, due: p.due, date: p.date });
    });
    return out;
  }
  function invoiceModal(doc) {
    // 状態の連動：下書きからは請求書を作らない／見送りの工事は先に取り消す
    if (doc.status !== 'issued') { EE.fx.toast('下書きの見積からは請求書を作れません。先に「発行を確定する」をしてください', { warn: true, ms: 4000 }); return; }
    var pj0 = proj(doc.projectId);
    if (pj0 && pj0.lost) { EE.fx.toast('この工事は「見送り」になっています。工事の画面で見送りを取り消してから請求書を作ってください', { warn: true, ms: 4500 }); return; }
    var other = pj0 && pj0.acceptedDocId && pj0.acceptedDocId !== doc.id ? EE.S.documents.filter(function (x) { return x.id === pj0.acceptedDocId; })[0] : null;
    var stageNote = pj0 && (!pj0.stage || pj0.stage === 'estimate')
      ? '<p class="soft-warn" style="margin:0 0 12px">この工事はまだ「見積」の段階です。請求書を作ると、工事を「受注」に進め、この見積（' + esc(doc.no || '') + '）を採用した見積にします。</p>'
      : (other ? '<p class="soft-warn" style="margin:0 0 12px">この工事で採用した見積は ' + esc(other.no || '別の見積') + ' です。請求書を作ると、採用した見積をこの見積（' + esc(doc.no || '') + '）に変えます。</p>' : '');
    var r = U.calcDoc(doc), done = invoicesOf(doc.id);
    var rows = function (parts) { return parts.map(function (p, i) {
      return '<tr data-row="' + i + '"><td><input class="input" data-k="label" value="' + esc(p[0]) + '" style="width:120px"></td><td><input class="input num" type="number" min="1" max="100" data-k="ratio" value="' + p[1] + '" style="width:80px"> %</td>' +
        '<td class="r num" data-amt>—</td><td><input class="input" type="date" data-k="date" value="' + T() + '"></td><td><input class="input" type="date" data-k="due" value="' + EE.data.addDays(T(), 30) + '"></td></tr>'; }).join(''); };
    U.modal({
      title: '請求書を作る — ' + (doc.no || ''), wide: true,
      body: stageNote + '<p class="hint" style="margin-top:0">見積の合計 ' + yen(r.total) + '（税込）を分けて請求します。税率ごとの金額も同じ割合で分け、最後の1枚で端数を合わせます（合計は見積と同じ）。作った請求は工事の「入金」にも入ります。</p>' +
        (done.length ? '<div class="label" style="margin-bottom:6px">作った請求書</div><table class="table"><tbody>' + done.map(function (v) {
          return '<tr><td class="num">' + esc(v.no) + '</td><td>' + esc(v.label) + '（' + v.ratio + '%）</td><td class="r num">' + yen(v.amount) + '</td><td class="num">支払期限 ' + U.jdate(v.due) + '</td><td class="r"><button class="btn sm" data-reprint="' + v.id + '">' + I.pdf + 'もう一度出す</button></td></tr>'; }).join('') + '</tbody></table><div class="sep" style="margin:14px 0"></div>' : '') +
        '<div class="field"><label>分け方</label><div class="seg" id="inv-split">' + SPLITS.map(function (s, i) { return '<button type="button" data-s="' + i + '" class="' + (i === (done.length ? 0 : 1) ? 'on' : '') + '">' + esc(s[0]) + '</button>'; }).join('') + '</div></div>' +
        '<div class="table-scroll" style="margin-top:12px"><table class="table"><thead><tr><th>名目</th><th>割合</th><th class="r">金額（税込）</th><th>請求日</th><th>支払期限</th></tr></thead><tbody id="inv-rows">' + rows(SPLITS[done.length ? 0 : 1][1]) + '</tbody></table></div>' +
        '<p class="hint" id="inv-sum" role="status"></p>',
      foot: '<div class="spacer"></div><button class="btn ghost" data-c>閉じる</button><button class="btn primary" data-ok>' + I.pdf + '請求書を作ってPDFにする</button>',
      onMount: function (el, api) {
        function parts() { return [].map.call(el.querySelectorAll('#inv-rows tr'), function (tr) { var g = function (k) { return tr.querySelector('[data-k="' + k + '"]').value; }; return { label: g('label').trim() || '請求', ratio: N(g('ratio')), date: g('date') || T(), due: g('due') || '' }; }); }
        function upd() {
          var ps = parts(), sum = ps.reduce(function (s, p) { return s + p.ratio; }, 0), ok = sum === 100 && ps.every(function (p) { return p.ratio > 0; });
          var am = ok ? splitAmounts(doc, ps) : [];
          el.querySelectorAll('#inv-rows [data-amt]').forEach(function (td, i) { td.textContent = am[i] ? yen(am[i].amount) : '—'; });
          var s = el.querySelector('#inv-sum'); s.textContent = ok ? '合計 ' + yen(am.reduce(function (x, a) { return x + a.amount; }, 0)) + '（見積と同じ）' : '割合の合計を100%にしてください（今 ' + sum + '%）'; s.style.color = ok ? '' : 'var(--err)';
          el.querySelector('[data-ok]').disabled = !ok; return ok ? am : null;
        }
        el.querySelector('#inv-split').addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (!b) return; el.querySelectorAll('#inv-split [data-s]').forEach(function (x) { x.classList.toggle('on', x === b); }); el.querySelector('#inv-rows').innerHTML = rows(SPLITS[Number(b.dataset.s)][1]); upd(); });
        el.addEventListener('input', upd);
        el.addEventListener('click', function (e) { var b = e.target.closest('[data-reprint]'); if (!b) return; var v = (EE.S.invoices || []).filter(function (x) { return x.id === b.dataset.reprint; })[0]; if (v) printInvoices([v]); });
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-ok]').onclick = function () {
          var am = upd(); if (!am) return;
          var S = EE.S, snap = doc.snap || EE.data.snapOf(S, doc), made = [];
          S.invoices = S.invoices || [];
          am.forEach(function (a) {
            var v = { id: EE.data.uid('inv'), no: seqNo('invoice', 'INV'), docId: doc.id, docNo: doc.no, projectId: doc.projectId || '', title: doc.title || '', label: a.label, ratio: a.ratio,
              amount: a.amount, byRate: a.byRate, issueDate: a.date, due: a.due, createdAt: new Date().toISOString(), customer: snap.customer, company: JSON.parse(JSON.stringify(S.company || {})), site: snap.site || '' };
            S.invoices.push(v); made.push(v);
          });
          var pj = proj(doc.projectId); if (pj && pj.acceptedDocId !== doc.id) pj.acceptedDocId = doc.id;
          commit();
          // 工事の「入金」に、請求の行を入れる（同じ請求書は2回入れない）
          var c = caseOf(doc.projectId), o = O();
          if (c && o) {
            c.payments = c.payments || [];
            made.forEach(function (v) { if (!c.payments.some(function (p) { return p.invId === v.id; })) c.payments.push({ kind: v.label, bill: v.amount, billDate: v.issueDate, plan: v.due, invId: v.id, invNo: v.no }); });
            c.invoice = Object.assign({ files: [] }, c.invoice, { date: c.invoice && c.invoice.date ? c.invoice.date : made[0].issueDate });
            // 請求した見積＝採用した見積。工事がまだ見積の段階なら受注に進める（請求なのに見積のまま、を作らない）
            if (!c.result || c.result.status !== 'won') { c.result = Object.assign({}, c.result, { status: 'won', wonDate: c.result && c.result.wonDate || made[0].issueDate }); o.addLog(c, '請求書を作ったので受注にした（' + (doc.no || '') + '）'); }
            c.mitsu = Object.assign({}, c.mitsu, { acceptedDocId: doc.id });
            o.addLog(c, '請求書を作成：' + made.map(function (v) { return v.label + ' ' + yen(v.amount); }).join('、')); o.touch(c);
          }
          api.close(); printInvoices(made); setTimeout(rerender, 300);
        };
        upd();
      }
    });
  }
  function invoiceSheet(v) {
    var co = v.company || EE.S.company || {}, cu = v.customer || {}, rates = Object.keys(v.byRate || {});
    var rateRows = rates.map(function (k) { var x = v.byRate[k]; return x.rate ? '<tr><th>' + x.rate + '%対象（税抜）</th><td class="num">' + yen(x.base) + '</td></tr><tr><th>　消費税（' + x.rate + '%）</th><td class="num">' + yen(x.tax) + '</td></tr>' : '<tr><th>対象外</th><td class="num">' + yen(x.base) + '</td></tr>'; }).join('');
    return '<div class="sheet">' +
      '<div class="head" style="grid-template-columns:1fr"><h1>御請求書</h1><div class="meta sans num">No. ' + esc(v.no) + '<br>請求日 ' + U.jdate(v.issueDate) + '</div></div>' +
      '<div class="head"><div>' +
        '<div class="to">' + esc(cu.name || '（宛先未設定）') + '<small>' + esc(cu.honorific || '') + '</small></div>' + (cu.contact ? '<div class="to-sub">' + esc(cu.contact) + '</div>' : '') +
        '<div class="lead">下記のとおり御請求申し上げます。</div>' +
        '<div class="grand"><span class="l">御請求金額</span><span class="v num">' + yen(v.amount) + '</span><span class="t">（税込）</span></div>' +
        '<table class="kv"><tr><th>件名</th><td>' + esc(v.title) + '</td></tr>' + (v.site ? '<tr><th>工事場所</th><td>' + esc(v.site) + '</td></tr>' : '') +
          '<tr><th>お支払期限</th><td class="num">' + (v.due ? U.jdate(v.due) : '') + '</td></tr>' + (co.bank ? '<tr><th>お振込先</th><td>' + esc(co.bank) + '</td></tr>' : '') + '</table></div>' +
        '<div class="from"><div class="co-wrap">' + EE.print.logoHTML(co, v.id) + (co.logo || co.showLogo === false ? '<div class="co">' + esc(co.name || '') + '</div>' : '') + '</div>' +
          (co.zip ? '〒' + esc(co.zip) + '<br>' : '') + esc(co.address || '') + '<br>' + (co.tel ? 'TEL ' + esc(co.tel) + (co.fax ? '　FAX ' + esc(co.fax) : '') + '<br>' : '') +
          (co.invoiceRegNo ? '<span class="reg sans num">登録番号 ' + esc(co.invoiceRegNo) + '</span>' : '') + '</div></div>' +
      '<table class="items"><thead><tr><th style="width:8mm">No</th><th>内容</th><th style="width:30mm">金額（税込）</th></tr></thead><tbody>' +
        '<tr><td class="c num">1</td><td>' + esc(v.title) + '　' + esc(v.label) + '（御見積 ' + esc(v.docNo || '') + ' の ' + v.ratio + '%）</td><td class="r num">' + yen(v.amount) + '</td></tr></tbody></table>' +
      '<div class="bottom"><div></div><table class="tot sans">' + rateRows + '<tr class="g"><th>合計（税込）</th><td class="num">' + yen(v.amount) + '</td></tr></table></div>' +
      '<div class="foot sans"><span>' + esc(v.no) + '</span><span>消費税は税率ごとに合計して端数処理しています</span></div></div>';
  }
  function printInvoices(list) {
    EE.print.printHTML(list.map(function (v, i) { return '<div style="' + (i ? 'page-break-before:always;break-before:page' : '') + '">' + invoiceSheet(v) + '</div>'; }).join(''), '請求書_' + list.map(function (v) { return v.no; }).join('_'));
  }

  /* =====================================================================
   * 7 発注書：原価の行を仕入先ごとにまとめる
   * ===================================================================== */
  function supplierOf(l) { var it = U.findItem(l.itemId) || {}; return String(l.supplier || it.supplier || it.contractor || '').trim() || '仕入先が未設定'; }
  function orderGroups(doc) {
    var g = {};
    doc.lines.forEach(function (l) {
      if (!(N(l.unitCost) > 0)) return;
      var k = supplierOf(l), x = g[k] = g[k] || { supplier: k, lines: [], total: 0 };
      var amt = Math.round(N(l.unitCost) * N(l.qty)); x.lines.push({ name: l.name, spec: l.spec, qty: l.qty, unit: l.unit, cost: N(l.unitCost), amount: amt }); x.total += amt;
    });
    return Object.keys(g).sort(function (a, b) { return (a === '仕入先が未設定') - (b === '仕入先が未設定') || g[b].total - g[a].total; }).map(function (k) { return g[k]; });
  }
  function orderSheet(o) {
    var co = EE.S.company || {}, tax = Math.floor(o.total * 0.1);
    return '<div class="sheet">' +
      '<div class="head" style="grid-template-columns:1fr"><h1>発注書</h1><div class="meta sans num">No. ' + esc(o.no) + '<br>発注日 ' + U.jdate(o.date) + '</div></div>' +
      '<div class="head"><div><div class="to">' + esc(o.supplier) + '<small>御中</small></div><div class="lead">下記のとおり発注いたします。</div>' +
        '<div class="grand"><span class="l">発注金額</span><span class="v num">' + yen(o.total + tax) + '</span><span class="t">（税込）</span></div>' +
        '<table class="kv"><tr><th>工事名</th><td>' + esc(o.title) + '</td></tr>' + (o.site ? '<tr><th>現場</th><td>' + esc(o.site) + '</td></tr>' : '') +
          '<tr><th>納期</th><td>' + esc(o.deliver || '別途協議') + '</td></tr><tr><th>納品場所</th><td>' + esc(o.place || o.site || '別途指定') + '</td></tr></table></div>' +
        '<div class="from"><div class="co-wrap">' + EE.print.logoHTML(co, o.id) + (co.logo || co.showLogo === false ? '<div class="co">' + esc(co.name || '') + '</div>' : '') + '</div>' +
          (co.zip ? '〒' + esc(co.zip) + '<br>' : '') + esc(co.address || '') + '<br>' + (co.tel ? 'TEL ' + esc(co.tel) + (co.fax ? '　FAX ' + esc(co.fax) : '') + '<br>' : '') + '</div></div>' +
      '<table class="items"><thead><tr><th style="width:8mm">No</th><th>品名・規格</th><th style="width:16mm">数量</th><th style="width:12mm">単位</th><th style="width:22mm">単価</th><th style="width:26mm">金額</th></tr></thead><tbody>' +
        o.lines.map(function (l, i) { return '<tr><td class="c num">' + (i + 1) + '</td><td>' + esc(l.name) + (l.spec ? '<div class="spec">' + esc(l.spec) + '</div>' : '') + '</td><td class="r num">' + U.num(l.qty) + '</td><td class="c">' + esc(l.unit) + '</td><td class="r num">' + yen(l.cost) + '</td><td class="r num">' + yen(l.amount) + '</td></tr>'; }).join('') +
      '</tbody></table>' +
      '<div class="bottom"><div>' + (o.note ? '<div class="box"><h4>備考</h4><div class="notes">' + esc(o.note) + '</div></div>' : '') + '</div><table class="tot sans"><tr><th>小計（税抜）</th><td class="num">' + yen(o.total) + '</td></tr><tr><th>消費税（10%）</th><td class="num">' + yen(tax) + '</td></tr><tr class="g"><th>合計（税込）</th><td class="num">' + yen(o.total + tax) + '</td></tr></table></div>' +
      '<div class="foot sans"><span>' + esc(o.no) + '</span><span>単価は税抜です</span></div></div>';
  }
  function orderModal(doc) {
    var gs = orderGroups(doc), pj = proj(doc.projectId) || {}, sn = doc.snap || {};
    if (!gs.length) { EE.fx.toast('原価が入っている行がありません（発注書は原価の行から作ります）', { warn: true }); return; }
    var past = (EE.S.orders || []).filter(function (o) { return o.docId === doc.id; });
    U.modal({
      title: '発注書を作る — ' + (doc.no || ''), wide: true,
      body: '<p class="hint" style="margin-top:0">原価の入っている行を、仕入先ごとにまとめます。仕入先は品目マスタの「仕入先」（無ければ「施工業者」）です。売値は載りません。</p>' +
        '<div class="table-scroll"><table class="table"><thead><tr><th style="width:28px"></th><th>仕入先</th><th class="r">行</th><th class="r">原価の合計（税抜）</th><th>前に出した発注書</th></tr></thead><tbody>' +
        gs.map(function (g, i) { var p = past.filter(function (o) { return o.supplier === g.supplier; }); return '<tr><td><input type="checkbox" data-g="' + i + '"' + (g.supplier === '仕入先が未設定' || p.length ? '' : ' checked') + ' aria-label="' + esc(g.supplier) + '"></td><td>' + esc(g.supplier) + '</td><td class="r num">' + g.lines.length + '</td><td class="r num">' + yen(g.total) + '</td><td class="num">' + (p.length ? p.map(function (o) { return esc(o.no); }).join('、') : '—') + '</td></tr>'; }).join('') +
        '</tbody></table></div>' +
        '<div class="form-grid" style="margin-top:12px"><div class="field c4"><label>納期</label><input class="input" id="po-deliver" placeholder="例：12/10（水）午前"></div>' +
        '<div class="field c8"><label>納品場所</label><input class="input" id="po-place" value="' + esc(sn.site || pj.site || '') + '"></div>' +
        '<div class="field c12"><label>備考</label><input class="input" id="po-note" placeholder="例：現場搬入は8時以降"></div></div>',
      foot: '<div class="spacer"></div><button class="btn ghost" data-c>閉じる</button><button class="btn primary" data-ok>' + I.pdf + '選んだ仕入先の発注書をPDFにする</button>',
      onMount: function (el, api) {
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-ok]').onclick = function () {
          var pick = [].filter.call(el.querySelectorAll('[data-g]'), function (x) { return x.checked; }).map(function (x) { return gs[Number(x.dataset.g)]; });
          if (!pick.length) { EE.fx.toast('発注する仕入先を選んでください', { warn: true }); return; }
          var S = EE.S; S.orders = S.orders || [];
          var made = pick.map(function (g) {
            var o = { id: EE.data.uid('po'), no: seqNo('order', 'PO'), docId: doc.id, docNo: doc.no, projectId: doc.projectId || '', supplier: g.supplier, lines: g.lines, total: g.total, date: T(),
              title: pj.name || doc.title || '', site: sn.site || pj.site || '', deliver: el.querySelector('#po-deliver').value.trim(), place: el.querySelector('#po-place').value.trim(), note: el.querySelector('#po-note').value.trim() };
            S.orders.push(o); return o;
          });
          commit();
          var c = caseOf(doc.projectId), ob = O(); if (c && ob) { ob.addLog(c, '発注書を作成：' + made.map(function (o) { return o.supplier + ' ' + yen(o.total); }).join('、')); ob.touch(c); }
          api.close();
          EE.print.printHTML(made.map(function (o, i) { return '<div style="' + (i ? 'page-break-before:always;break-before:page' : '') + '">' + orderSheet(o) + '</div>'; }).join(''), '発注書_' + made.map(function (o) { return o.no; }).join('_'));
        };
      }
    });
  }

  /* =====================================================================
   * 10 写真付きの見積書：工事の写真から選ぶ／新しく足す。PDF の最後のページに並ぶ
   * ===================================================================== */
  var urlCache = {};
  function frameW() { try { var f = root.OUBI_LINK && root.OUBI_LINK.frame(); return f && f.contentWindow; } catch (e) { return null; } }
  function blobUrl(id) {
    if (urlCache[id]) return Promise.resolve(urlCache[id]);
    var w = frameW(); if (!w || !w.OUBI_LOCAL_FILES || !w.OUBI_LOCAL_FILES.get) return Promise.resolve('');
    return w.OUBI_LOCAL_FILES.get(id).then(function (r) { if (!r || !r.blob) return ''; urlCache[id] = URL.createObjectURL(r.blob); return urlCache[id]; }).catch(function () { return ''; });
  }
  function preparePhotos(docs) { var ids = []; docs.forEach(function (d) { (d.photos || []).forEach(function (p) { ids.push(p.id); }); }); return Promise.all(ids.map(blobUrl)); }
  function photoPage(doc) {
    var ps = (doc.photos || []).filter(function (p) { return urlCache[p.id]; }); if (!ps.length) return '';
    return '<div class="sheet photo-sheet" style="page-break-before:always;break-before:page"><div class="head" style="grid-template-columns:1fr"><h1>写真・イメージ</h1><div class="meta sans num">No. ' + esc(doc.no || '') + '</div></div>' +
      '<div class="ph-grid">' + ps.map(function (p) { return '<figure><img src="' + urlCache[p.id] + '" alt=""><figcaption>' + esc(p.caption || '') + '</figcaption></figure>'; }).join('') + '</div></div>';
  }
  function photoModal(doc) {
    var c = caseOf(doc.projectId), have = (doc.photos || []).slice();
    var casePh = ((c && c.photos) || []).filter(function (p) { return /^image\//.test(p.type || 'image/'); });
    var list = casePh.map(function (p) { var h = have.filter(function (x) { return x.id === p.id; })[0]; return { id: p.id, caption: h ? h.caption : (p.cat ? p.cat + (p.desc ? '：' + p.desc : '') : (p.desc || '')), on: !!h }; });
    have.forEach(function (h) { if (!list.some(function (x) { return x.id === h.id; })) list.push({ id: h.id, caption: h.caption, on: true }); });
    var m = U.modal({
      title: '見積書に付ける写真', wide: true,
      body: '<p class="hint" style="margin-top:0">選んだ写真が、見積書PDFの最後のページに並びます（6枚まで）。施工前の様子や完成のイメージを付けると、お客様に伝わりやすくなります。</p>' +
        '<div class="ph-pick" id="ph-pick">' + (list.length ? '' : '<p class="hint">この工事の写真はまだありません。下の「写真を足す」から入れられます。</p>') + '</div>' +
        '<label class="btn" style="margin-top:12px">' + I.camera + '写真を足す<input type="file" accept="image/*" multiple id="ph-in" hidden></label>' + (c ? '' : '<span class="hint" style="margin-left:10px">工事に結び付いていない見積です。足した写真はこの見積だけに付きます。</span>'),
      foot: '<span class="hint" id="ph-n"></span><div class="spacer"></div><button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-ok>' + I.check + '付ける</button>',
      onMount: function (el, api) {
        function draw() {
          var box = el.querySelector('#ph-pick'); if (!list.length) return;
          box.innerHTML = list.map(function (p, i) { return '<label class="ph-cell' + (p.on ? ' on' : '') + '"><input type="checkbox" data-i="' + i + '"' + (p.on ? ' checked' : '') + ' aria-label="写真' + (i + 1) + 'を付ける"><span class="ph-img" data-img="' + esc(p.id) + '"></span><input class="input" data-cap="' + i + '" value="' + esc(p.caption || '') + '" placeholder="説明（例：施工前・南側）"></label>'; }).join('');
          list.forEach(function (p) { blobUrl(p.id).then(function (u) { var s = box.querySelector('[data-img="' + CSS.escape(p.id) + '"]'); if (s && u) s.style.backgroundImage = 'url(' + u + ')'; }); });
          var n = list.filter(function (p) { return p.on; }).length; el.querySelector('#ph-n').textContent = n + ' 枚を選んでいます（6枚まで）';
        }
        el.addEventListener('change', function (e) {
          var cb = e.target.closest('[data-i]');
          if (cb) { var on = list.filter(function (p) { return p.on; }).length; if (cb.checked && on >= 6) { cb.checked = false; EE.fx.toast('写真は6枚までです', { warn: true }); return; } list[Number(cb.dataset.i)].on = cb.checked; draw(); }
        });
        el.addEventListener('input', function (e) { var t = e.target.closest('[data-cap]'); if (t) list[Number(t.dataset.cap)].caption = t.value; });
        el.querySelector('#ph-in').addEventListener('change', async function (e) {
          var w = frameW(), files = [].slice.call(e.target.files || []); e.target.value = '';
          var assets = w && w.claude && await w.claude.use('assets'); if (!assets) { EE.fx.toast('写真を保存できませんでした', { warn: true }); return; }
          for (var k = 0; k < files.length; k++) {
            try {
              var r = await assets.upload(files[k]);
              if (c) { c.photos = c.photos || []; c.photos.push({ id: r.id, name: files[k].name, type: r.contentType, size: r.sizeBytes, at: new Date().toISOString(), cat: '見積用', date: T(), place: '', desc: '' }); }
              list.push({ id: r.id, caption: '', on: list.filter(function (p) { return p.on; }).length < 6 });
            } catch (err) { EE.fx.toast(files[k].name + '：写真を保存できませんでした', { warn: true }); }
          }
          if (c) { var o = O(); if (o) { o.addLog(c, '見積用の写真を' + files.length + '枚追加'); o.touch(c); } }
          draw();
        });
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-ok]').onclick = function () {
          doc.photos = list.filter(function (p) { return p.on; }).map(function (p) { return { id: p.id, caption: (p.caption || '').trim() }; });
          if (EE.views.editor.mark) EE.views.editor.mark();
          api.close(); EE.fx.toast('写真を ' + doc.photos.length + ' 枚付けました。保存すると見積に残ります', { force: true });
          var b = document.querySelector('[data-plus="photos"]'); if (b) b.dataset.n = doc.photos.length;
        };
        draw();
      }
    });
    return m;
  }
  // PDF の前に写真を読み込んでおく（印刷の画面は同期で作るため）
  var origPreview = EE.print.preview, origMany = EE.print.printMany;
  EE.print.preview = function (doc, a, b) { preparePhotos([doc]).then(function () { origPreview(doc, a, b); }); };
  EE.print.printMany = function (docs) { preparePhotos(docs).then(function () { origMany(docs); }); };

  /* =====================================================================
   * 8 寸法：この見積で測った寸法をまとめて直し、計算した行の数量を計算し直す
   * ===================================================================== */
  function dimLabel(key) {
    var lab = ''; (EE.S.formulas || []).some(function (f) { return (f.inputs || []).some(function (i) { if (i.key === key) { lab = i.label + (i.unit ? '（' + i.unit + '）' : ''); return true; } return false; }); });
    return lab || key;
  }
  function dimsModal(doc) {
    var keys = Object.keys(doc.dims || {}), calcLines = doc.lines.filter(function (l) { return l.calc && l.calc.f; });
    if (!keys.length) { EE.fx.toast('まだ寸法がありません。明細の行の「数量を計算」で寸法を入れると、ここにたまります', { warn: true, ms: 4000 }); return; }
    U.modal({
      title: 'この見積の寸法（現地調査）',
      body: '<p class="hint" style="margin-top:0">現地で測った寸法です。直して「計算し直す」と、計算で数量を出した行（' + calcLines.length + '行）の数量がまとめて変わります。</p>' +
        '<div class="form-grid">' + keys.map(function (k) { return '<div class="field c6"><label>' + esc(dimLabel(k)) + '</label><input class="input num" type="number" step="any" data-dim="' + esc(k) + '" value="' + esc(doc.dims[k]) + '"></div>'; }).join('') + '</div>',
      foot: '<div class="spacer"></div><button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-ok>' + I.calc + '計算し直す</button>',
      onMount: function (el, api) {
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-ok]').onclick = function () {
          el.querySelectorAll('[data-dim]').forEach(function (inp) { if (inp.value !== '') doc.dims[inp.dataset.dim] = Number(inp.value); });
          var changed = [];
          calcLines.forEach(function (l) {
            var f = (EE.S.formulas || []).filter(function (x) { return x.id === l.calc.f; })[0]; if (!f) return;
            var v = Object.assign({}, l.calc.v); Object.keys(v).forEach(function (k) { if (doc.dims[k] != null) v[k] = doc.dims[k]; });
            try { var r = EE.calcTool.evaluate(f, v, l.calc.u || {}); if (r.qty > 0 && r.qty !== l.qty) { l.qty = r.qty; l.calc.v = v; changed.push(l.lineId); } } catch (e) { /* 計算できない行はそのまま */ }
          });
          if (EE.views.editor.mark) EE.views.editor.mark();
          if (EE.views.editor.lines) EE.views.editor.lines(changed);
          api.close(); EE.fx.toast(changed.length ? changed.length + '行の数量を計算し直しました' : '数量の変わる行はありませんでした', { force: true });
        };
      }
    });
  }

  /* =====================================================================
   * 5 単価のまとめて改定
   * ===================================================================== */
  function roundTo(v, u) { return u > 1 ? Math.round(v / u) * u : Math.round(v); }
  function repriceModal() {
    var S = EE.S, K = EE.engine.ITEM_KINDS;
    var st = { cat: '', kind: '', q: '', pct: 5, target: 'both', unit: 10, drafts: true };
    function hits() { var q = U.norm(st.q).trim(); return S.items.filter(function (it) { return it.active !== false && (!st.cat || it.category === st.cat) && (!st.kind || it.kind === st.kind) && (!q || U.norm(it.code + it.name + it.spec + (it.synonyms || []).join(' ')).indexOf(q) >= 0); }); }
    function next(it) { var f = 1 + st.pct / 100; return { p: st.target === 'cost' ? it.unitPrice : roundTo(it.unitPrice * f, st.unit), c: st.target === 'price' ? it.unitCost : roundTo(it.unitCost * f, st.unit) }; }
    function drafts(list) { var ids = {}; list.forEach(function (it) { ids[it.id] = 1; }); return S.documents.filter(function (d) { return d.status !== 'issued' && d.lines.some(function (l) { return ids[l.itemId]; }); }); }
    U.modal({
      title: '単価をまとめて改定', wide: true,
      body: '<div class="form-grid">' +
        '<div class="field c4"><label>工事カテゴリー</label><select class="input" data-k="cat"><option value="">すべて</option>' + (S.categories || []).map(function (c) { return U.opt(c.id, c.name, ''); }).join('') + '</select></div>' +
        '<div class="field c4"><label>区分</label><select class="input" data-k="kind"><option value="">すべて</option>' + Object.keys(K).map(function (k) { return U.opt(k, K[k], ''); }).join('') + '</select></div>' +
        '<div class="field c4"><label>品名・コードで絞る</label><input class="input" data-k="q" placeholder="例：フェンス"></div>' +
        '<div class="field c3"><label>上げ下げ（%）</label><input class="input num" type="number" step="0.1" data-k="pct" value="5"><span class="hint">下げるときは −3 など</span></div>' +
        '<div class="field c5"><label>変えるもの</label><div class="seg" data-seg="target"><button type="button" data-v="both" class="on">単価と原価</button><button type="button" data-v="price">単価だけ</button><button type="button" data-v="cost">原価だけ</button></div></div>' +
        '<div class="field c4"><label>端数</label><div class="seg" data-seg="unit"><button type="button" data-v="1">1円</button><button type="button" data-v="10" class="on">10円</button><button type="button" data-v="100">100円</button></div></div>' +
        '</div><div class="table-scroll reprice-list" style="margin-top:12px"><table class="table"><thead><tr><th>コード</th><th>品名</th><th class="r">単価</th><th class="r">原価</th><th class="r">粗利率</th></tr></thead><tbody id="rp-rows"></tbody></table></div>' +
        '<label style="display:flex;gap:8px;align-items:center;margin-top:12px"><input type="checkbox" id="rp-drafts" checked> <span id="rp-draft-t"></span></label>' +
        '<p class="hint">確定した見積の単価は変わりません（送ったものと同じまま）。品目の価格の履歴に、今日の日付で残ります。</p>',
      foot: '<span class="hint" id="rp-n"></span><div class="spacer"></div><button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-ok>' + I.check + '改定する</button>',
      onMount: function (el, api) {
        function draw() {
          var list = hits(), ds = drafts(list);
          el.querySelector('#rp-rows').innerHTML = list.slice(0, 200).map(function (it) {
            var n = next(it), m = n.p ? (n.p - n.c) / n.p : null;
            return '<tr><td class="num">' + esc(it.code) + '</td><td>' + esc(it.name) + '</td><td class="r num">' + yen(it.unitPrice) + (n.p !== it.unitPrice ? ' → <b>' + yen(n.p) + '</b>' : '') + '</td><td class="r num">' + yen(it.unitCost) + (n.c !== it.unitCost ? ' → <b>' + yen(n.c) + '</b>' : '') + '</td><td class="r num">' + U.pct(m) + '</td></tr>';
          }).join('') || '<tr><td colspan="5" class="hint">当てはまる品目がありません</td></tr>';
          el.querySelector('#rp-n').textContent = list.length + ' 品目';
          el.querySelector('#rp-draft-t').textContent = '下書きの見積（' + ds.length + '件' + (ds.length ? '：' + ds.slice(0, 3).map(function (d) { return d.title || d.no; }).join('、') + (ds.length > 3 ? ' ほか' : '') : '') + '）の単価も新しくする';
          el.querySelector('[data-ok]').disabled = !list.length || !st.pct;
        }
        el.addEventListener('input', function (e) { var k = e.target.dataset.k; if (!k) return; st[k] = k === 'pct' ? N(e.target.value) : e.target.value; draw(); });
        el.addEventListener('change', function (e) { var k = e.target.dataset.k; if (k) { st[k] = k === 'pct' ? N(e.target.value) : e.target.value; draw(); } if (e.target.id === 'rp-drafts') st.drafts = e.target.checked; });
        el.addEventListener('click', function (e) { var b = e.target.closest('[data-seg] [data-v]'); if (!b) return; var seg = b.parentNode; seg.querySelectorAll('[data-v]').forEach(function (x) { x.classList.toggle('on', x === b); }); st[seg.dataset.seg] = seg.dataset.seg === 'unit' ? Number(b.dataset.v) : b.dataset.v; draw(); });
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-ok]').onclick = function () {
          var list = hits(), ds = st.drafts ? drafts(list) : [], map = {};
          list.forEach(function (it) {
            var n = next(it); if (n.p === it.unitPrice && n.c === it.unitCost) return;
            it.unitPrice = n.p; it.unitCost = n.c; it.updatedAt = T();
            it.priceHistory = (it.priceHistory || []).filter(function (h) { return h.from !== T(); }); it.priceHistory.push({ from: T(), unitPrice: n.p, unitCost: n.c });
            map[it.id] = it;
          });
          var nl = 0;
          ds.forEach(function (d) { d.lines.forEach(function (l) { var it = map[l.itemId]; if (it) { l.unitPrice = it.unitPrice; l.unitCost = it.unitCost; l.priceDate = T(); nl++; } }); d.updatedAt = new Date().toISOString(); });
          commit(); api.close();
          EE.fx.toast(Object.keys(map).length + ' 品目を改定しました' + (ds.length ? '（下書き ' + ds.length + '件・' + nl + '行も）' : ''), { force: true });
          rerender();
        };
        draw();
      }
    });
  }

  /* =====================================================================
   * 1 ホームの「次の一手」：いちばん急ぐ1件と、そのままの一手
   * ===================================================================== */
  function nextStep() {
    var cands = [];
    waiting().forEach(function (d) {
      var p = proj(d.projectId) || {}, s = lastSent(d), name = p.name || d.title || d.no;
      var left = d.validUntil ? daysTo(d.validUntil) : null;
      if (s && left != null && left >= 0 && left <= 3) cands.push({ pr: 1, tag: '期限まで あと' + left + '日', t: name, s: '見積 ' + d.no + ' の返事をまだもらっていません', btn: '返事を聞く', href: '#/edit/' + d.id, warn: true });
      else if (s && daysSince(s.date) >= 7) cands.push({ pr: 2, tag: '返事待ち ' + daysSince(s.date) + '日', t: name, s: md(s.date) + 'に' + s.via + 'で提出した見積 ' + d.no, btn: '返事を聞く', href: '#/edit/' + d.id, warn: true });
      else if (!s && daysSince((d.issuedAt || '').slice(0, 10)) >= 1) cands.push({ pr: 4, tag: '提出の記録なし', t: name, s: '確定した見積 ' + d.no + '。お客様に渡したら記録してください', btn: '提出を記録', href: '#/edit/' + d.id, act: 'sent', doc: d });
      else if (s && daysSince(s.date) >= 3) cands.push({ pr: 5, tag: '返事待ち ' + daysSince(s.date) + '日', t: name, s: md(s.date) + 'に' + s.via + 'で提出した見積 ' + d.no, btn: '返事を聞く', href: '#/edit/' + d.id });
    });
    (EE.S.projects || []).forEach(function (p) { if (p.stage === 'invoice' && !p.lost) cands.push({ pr: 3, tag: '入金待ち', t: p.name, s: '請求 ' + (p.invoicedOn ? U.jdate(p.invoicedOn) : '済み') + '。入金を確かめてください', btn: '入金を確認', href: '#/o/case/' + p.id + '/payin', warn: true }); });
    var dr = liveDocs().filter(function (d) { return d.status !== 'issued' && d.lines.length; }).sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); })[0];
    if (dr) cands.push({ pr: 6, tag: '見積作成中', t: (proj(dr.projectId) || {}).name || dr.title || '（件名なし）', s: dr.lines.length + '行・' + yen(U.calcDoc(dr).total) + '（税込）。仕上げて確定すると提出できます', btn: '見積を仕上げる', href: '#/edit/' + dr.id });
    cands.sort(function (a, b) { return a.pr - b.pr; });
    return { top: cands[0] || null, n: cands.length };
  }
  function nextHTML() {
    var x = nextStep(), t = x.top;
    if (!t) return '<section class="nextup" data-st aria-label="次の一手"><span class="nx-tag">次の一手</span><div class="nx-b"><b>急ぎの見積・入金はありません</b><small>新しい見積を作るか、工事を登録しましょう</small></div><a class="btn primary" href="#/w">' + I.calc + '見積を作る</a></section>';
    return '<section class="nextup' + (t.warn ? ' warn' : '') + '" data-st aria-label="次の一手"><span class="nx-tag' + (t.warn ? ' is-warn' : '') + '">' + esc(t.tag) + '</span><div class="nx-b"><b>' + esc(t.t) + '</b><small>' + esc(t.s) + '</small></div>' +
      (x.n > 1 ? '<span class="hint nx-more">ほか ' + (x.n - 1) + ' 件は「今日やること」</span>' : '') +
      (t.act === 'sent' ? '<button class="btn primary" type="button" data-plus="sent" data-doc="' + t.doc.id + '">' + I.check + esc(t.btn) + '</button>' : '<a class="btn primary" href="' + t.href + '">' + esc(t.btn) + ' ›</a>') + '</section>';
  }
  // 「今日やること」にも返事待ち・提出の記録なしを足す（link.js の期限・入金待ちと並べる）
  var origTodo = EE.linkTodo;
  function extraTodo() {
    var out = [];
    waiting().forEach(function (d) {
      var p = proj(d.projectId) || {}, s = lastSent(d), n = s ? daysSince(s.date) : null;
      if (s && n >= 3) out.push({ kind: 'reply', id: 'r' + d.id, p: p, warn: n >= 7, t: p.name || d.title || d.no, s: '提出から ' + n + ' 日、返事待ち（' + d.no + '）', href: '#/edit/' + d.id });
      else if (!s && daysSince((d.issuedAt || '').slice(0, 10)) >= 1) out.push({ kind: 'unsent', id: 'u' + d.id, p: p, warn: false, t: p.name || d.title || d.no, s: '確定したまま、提出の記録がありません（' + d.no + '）', href: '#/edit/' + d.id });
    });
    return out;
  }
  // link.js はこのファイルより後に読むので、全部そろってから包む
  document.addEventListener('DOMContentLoaded', function () {
    origTodo = EE.linkTodo; if (!origTodo) return;
    EE.linkTodo = function () { var a = (origTodo() || []).concat(extraTodo()); return a.sort(function (x, y) { return (y.warn ? 1 : 0) - (x.warn ? 1 : 0); }).slice(0, 6); };
  });

  /* =====================================================================
   * 11 バックアップの週1の声かけ（7日たつと、開いたときに1回だけ。1押しで保存）
   * ===================================================================== */
  var BK_ASK = 'oumitsu:backup-ask';
  function backupAsk() {
    if (!EE.link || !EE.linkBackupNow || root.OUMITSU_DEMO) return;
    var need = EE.linkBackupNeed ? EE.linkBackupNeed() : null; if (!need || !need.need) return;
    // まだ一度もバックアップしていないときは、使い始めて7日たってから（初日から声をかけない）
    var first = ''; try { first = localStorage.getItem('oumitsu:first-seen') || ''; if (!first) localStorage.setItem('oumitsu:first-seen', first = T()); } catch (e) {}
    if (need.days == null && daysSince(first) < 7) return;
    var last = ''; try { last = localStorage.getItem(BK_ASK) || ''; } catch (e) {}
    if (last === T()) return;   // 1日1回まで
    try { localStorage.setItem(BK_ASK, T()); } catch (e) {}
    U.modal({
      title: 'バックアップをしましょう',
      body: '<p style="margin:0;line-height:1.7">' + esc(need.text) + '。<br>記録はこの端末の中だけにあります。ファイルに保存しておくと、端末が壊れても戻せます。</p>',
      foot: '<div class="spacer"></div><button class="btn ghost" data-c>あとで</button><button class="btn primary" data-ok>' + I.download + '今すぐ保存する</button>',
      onMount: function (el, api) {
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-ok]').onclick = function () { var b = el.querySelector('[data-ok]'); EE.linkBackupNow(b).then(function (ok) { if (ok) { api.close(); rerender(); } }); };
      }
    });
  }
  setTimeout(function wait() { if (!EE.S || !document.querySelector('.app')) { setTimeout(wait, 1000); return; } setTimeout(backupAsk, 4000); }, 1500);

  /* =====================================================================
   * 編集画面のボタン（editor.js から呼ばれる）
   * ===================================================================== */
  function caseLive(doc) { var p = proj(doc.projectId); return p && !p.lost && (!p.stage || p.stage === 'estimate'); }
  function issuedBar(d) {
    if (!EE.link) return '';
    var s = lastSent(d), inv = invoicesOf(d.id), ords = (EE.S.orders || []).filter(function (o) { return o.docId === d.id; }), p = proj(d.projectId);
    return '<div class="plus-bar">' +
      (s ? U.stBadge('fixed', '提出 ' + md(s.date) + '・' + s.via) + '<button class="btn ghost sm" type="button" data-plus="sent">もう一度記録する</button>'
         : U.stBadge('draft', '提出の記録なし') + '<button class="btn sm" type="button" data-plus="sent">' + I.check + '提出を記録</button>') +
      '<button class="btn sm" type="button" data-plus="invoice" data-n="' + inv.length + '">' + I.yen + '請求書を作る</button>' +
      '<button class="btn sm" type="button" data-plus="order" data-n="' + ords.length + '">' + I.truck + '発注書を作る</button>' +
      ((d.photos || []).length ? '<span class="hint">写真 ' + d.photos.length + '枚つき</span>' : '') +
      (caseLive(d) ? '<button class="btn ghost sm" type="button" data-plus="lost">失注にする</button>' : (p && p.lost ? U.stBadge('alert', '見送り') : '')) +
    '</div>';
  }
  function draftTools(d) {
    if (!EE.link) return '';
    return '<button class="btn sm" type="button" data-plus="photos" data-n="' + (d.photos || []).length + '">' + I.camera + '写真を付ける</button>' +
      '<button class="btn sm" type="button" data-plus="dims">' + I.calc + '寸法を直す</button>';
  }
  function draftActions(d) { return EE.link && d.id && caseLive(d) && !d.isNew ? '<button class="btn ghost" type="button" data-plus="lost">失注にする</button>' : ''; }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-plus]'); if (!b) return;
    var act = b.dataset.plus;
    if (act === 'reprice') { repriceModal(); return; }
    var doc = b.dataset.doc ? EE.S.documents.filter(function (x) { return x.id === b.dataset.doc; })[0] : (EE.views.editor.current && EE.views.editor.current());
    if (!doc) return;
    var saved = EE.S.documents.filter(function (x) { return x.id === doc.id; })[0] || doc;
    if (act === 'sent') sentModal(saved);
    else if (act === 'invoice') invoiceModal(saved);
    else if (act === 'order') orderModal(saved);
    else if (act === 'lost') lostModal(saved);
    else if (act === 'photos') photoModal(doc);
    else if (act === 'dims') dimsModal(doc);
  });

  EE.plus = { nextHTML: nextHTML, nextStep: nextStep, issuedBar: issuedBar, draftTools: draftTools, draftActions: draftActions, photoPage: photoPage, preparePhotos: preparePhotos,
    lostStats: lostStats, trendHTML: trendHTML, splitAmounts: splitAmounts, orderGroups: orderGroups, recordSent: recordSent, invoiceSheet: invoiceSheet, orderSheet: orderSheet, extraTodo: extraTodo };
})(this);

/* ===== 2026-11-26 改訂版の追加（サイドバーのバッジ・発行直後の導線・成約の演出・ミスの型） ===== */
(function (root) {
  'use strict';
  var EE = root.EE; if (!EE || !EE.ui) return;
  var U = EE.ui;

  /* --- サイドバーの「見積」に件数のバッジ（下書き・期限間近） --- */
  function badgeCounts() {
    var S = EE.S; if (!S) return { draft: 0, soon: 0 };
    var t = EE.data.today(), soonEnd = EE.data.addDays(t, 7), draft = 0, soon = 0;
    S.documents.forEach(function (d) {
      if (d.status === 'void') return;
      if (d.status !== 'issued') { draft++; return; }
      var p = d.projectId && U.findProject(d.projectId);
      if (p && (p.lost || EE.data.stageIndex(p.stage || 'estimate') > 0)) return;
      if (d.validUntil && d.validUntil >= t && d.validUntil <= soonEnd) soon++;
    });
    return { draft: draft, soon: soon };
  }
  function paintBadges() {
    if (!EE.link) return;
    var c = badgeCounts(), n = c.draft + c.soon, label = '下書き ' + c.draft + ' 件・期限まで7日以内 ' + c.soon + ' 件';
    document.querySelectorAll('.nav-item[data-nav="estimate"], #mnav [data-mnav="estimate"], #mnav a[href="#/docs"]').forEach(function (a) {
      var b = a.querySelector('.nav-badge');
      if (!n) { if (b) b.remove(); a.removeAttribute('data-badge-label'); return; }
      if (!b) { b = document.createElement('span'); b.className = 'nav-badge num'; a.appendChild(b); }
      var was = b.textContent; b.textContent = n > 99 ? '99+' : String(n); b.classList.toggle('soon', c.soon > 0);
      b.setAttribute('aria-label', label); b.title = label;
      if (was && was !== b.textContent && EE.fx) EE.fx.pop(b);   // 件数が変わったときだけ、小さく出し直す
    });
  }
  U.onCommit(function () { setTimeout(paintBadges, 0); });
  root.addEventListener('hashchange', function () { setTimeout(paintBadges, 50); });
  setTimeout(function wait() { if (!EE.S || !document.querySelector('.nav-item')) { setTimeout(wait, 500); return; } paintBadges(); }, 800);
  /* --- 発行直後の導線：番号を大きく見せ、そのまま「お客様へ送る」 --- */
  function afterIssue(doc) {
    var r = U.calcDoc(doc), c = U.docCustomer(doc);
    U.modal({
      title: '発行しました',
      body: '<div class="issued-hero"><div class="label">見積番号</div><div class="ih-no num">' + U.esc(doc.no) + '</div>' +
        '<div class="ih-sub">' + U.esc(doc.title || '（件名なし）') + '　' + U.esc((c.name || '宛先未設定') + (c.honorific ? ' ' + c.honorific : '')) + '</div>' +
        '<div class="ih-total num">' + U.yen(r.total) + '<small>税込</small></div></div>' +
        '<p class="hint" style="margin:12px 0 0">この見積はもう書き換えられません（電子帳簿保存法に合わせた保存）。PDFを出して、お客様に渡してください。</p>',
      foot: '<button class="btn ghost" data-later>あとで送る</button><button class="btn" data-plus="sent" data-doc="' + doc.id + '">' + U.I.check + '渡したことを記録する</button>' +
        '<button class="btn primary big" data-send>' + U.I.pdf + 'お客様へ送る（PDFを出す）</button>',
      onMount: function (el, api) {
        var no = el.querySelector('.ih-no'); if (no && EE.fx) EE.fx.anim(no, [{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: EE.fx.T.change });
        el.querySelector('[data-later]').onclick = function () { api.close(); };
        el.querySelector('[data-plus="sent"]').addEventListener('click', function () { api.close(); });
        el.querySelector('[data-send]').onclick = function () { api.close(); EE.print.preview(doc); };
      }
    });
  }
  EE.plus = EE.plus || {}; EE.plus.badgeCounts = badgeCounts; EE.plus.paintBadges = paintBadges; EE.plus.afterIssue = afterIssue;
})(this);

/* ===== ミスの型ライブラリ（送信前チェックを使いながら育てる）・成約の演出 ===== */
(function (root) {
  'use strict';
  var EE = root.EE; if (!EE || !EE.ui) return;
  var U = EE.ui, esc = U.esc;
  function list() { var s = EE.S.settings; if (!Array.isArray(s.mistakes)) s.mistakes = []; s.mistakeHits = s.mistakeHits || {}; return s.mistakes; }
  function mistakesHTML() {
    var L = list(), hits = EE.S.settings.mistakeHits || {};
    return '<div class="field c12" id="mk-box"><label>ミスの型（送信前チェック）— 「A があるのに B がない」を知らせます。B は「|」で区切ると、どれか1つあれば通ります</label>' +
      '<div class="mk-list">' + (L.length ? L.map(function (m) {
        return '<div class="mk-row' + (m.off ? ' off' : '') + '" data-mk-id="' + esc(m.id) + '"><span class="mk-ab"><b>' + esc(m.a) + '</b> があるのに <b>' + esc(m.b) + '</b> がない</span>' +
          '<span class="mk-msg">' + esc(m.msg || '') + '</span><span class="mk-hits num" title="発行・PDFの前に引っかかった回数">' + (hits[m.id] || 0) + ' 回</span>' +
          '<button type="button" class="btn ghost sm" data-mk="toggle">' + (m.off ? '使う' : '止める') + '</button><button type="button" class="btn ghost sm danger" data-mk="del" aria-label="この型を消す">消す</button></div>';
      }).join('') : '<p class="hint">まだありません</p>') + '</div>' +
      '<div class="mk-add"><input class="input" id="mk-a" placeholder="A（例：足場設置）" aria-label="A の言葉"><input class="input" id="mk-b" placeholder="B（例：足場撤去|足場解体）" aria-label="B の言葉"><input class="input" id="mk-msg" placeholder="知らせる言葉（空欄なら自動）" aria-label="知らせる言葉"><button type="button" class="btn sm" data-mk="add">' + U.I.plus + '型を足す</button></div></div>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-mk]'); if (!b) return;
    var L = list(), act = b.dataset.mk;
    if (act === 'add') {
      var a = (document.getElementById('mk-a').value || '').trim(), bb = (document.getElementById('mk-b').value || '').trim(), msg = (document.getElementById('mk-msg').value || '').trim();
      if (!a || !bb) { EE.fx.toast('A と B を入れてください', { warn: true }); return; }
      L.push({ id: 'mk' + Date.now().toString(36), a: a, b: bb, msg: msg }); U.commit(); EE.fx.toast('ミスの型を足しました', { force: true });
    } else {
      var row = b.closest('[data-mk-id]'), i = L.findIndex(function (m) { return m.id === row.dataset.mkId; }); if (i < 0) return;
      if (act === 'toggle') { L[i].off = !L[i].off; U.commit(); }
      if (act === 'del') { var gone = L.splice(i, 1)[0]; U.commit(); EE.fx.toast('「' + gone.a + '」の型を消しました', { action: { label: '元に戻す', run: function () { L.splice(i, 0, gone); U.commit(); var bx = document.getElementById('mk-box'); if (bx) bx.outerHTML = mistakesHTML(); } } }); }
    }
    var box = document.getElementById('mk-box'); if (box) box.outerHTML = mistakesHTML();
  });
  // 発行・PDF の確定のときに、引っかかったミスの型を数える（よく出る型ほど役に立っている）
  function countHits(doc) {
    try {
      var hits = EE.S.settings.mistakeHits = EE.S.settings.mistakeHits || {};
      U.checkDoc(doc).forEach(function (x) { var m = /^mistake:(.+)$/.exec(x.code); if (m) hits[m[1]] = (hits[m[1]] || 0) + 1; });
    } catch (e) {}
  }
  setTimeout(function wrap() {
    if (!EE.app || !EE.app.finalizeDoc) { setTimeout(wrap, 300); return; }
    var orig = EE.app.finalizeDoc;
    EE.app.finalizeDoc = function (doc) { countHits(doc); return orig.apply(this, arguments); };
  }, 0);

  /* --- 成約の演出：工事が「見積」から「受注」に変わった瞬間に、金色に光るひと言 --- */
  var stages = null;
  function watchWon() {
    var S = EE.S; if (!S || !S.projects) return;
    var now = {};
    S.projects.forEach(function (p) { now[p.id] = p.lost ? -1 : EE.data.stageIndex(p.stage || 'estimate'); });
    if (stages) Object.keys(now).forEach(function (id) {
      if (stages[id] === 0 && now[id] >= 1) celebrate(S.projects.filter(function (p) { return p.id === id; })[0]);
    });
    stages = now;
  }
  function celebrate(p) {
    if (!p || document.querySelector('.won-card')) return;
    var d = p.acceptedDocId && U.findDoc(p.acceptedDocId), amt = d ? U.calcDoc(d).total : 0;
    U.modal({
      title: '受注しました',
      body: '<div class="won-card"><div class="won-crest" aria-hidden="true">' + (EE.crest ? EE.crest.svg({ id: 'won', className: 'won-crest-svg', fieldR: 106 }) : '') + '</div>' +
        '<div class="won-name">' + esc(p.name || '工事') + '</div>' + (amt ? '<div class="won-amt num">' + U.yen(amt) + '<small>税込</small></div>' : '') +
        '<p class="won-msg">おめでとうございます。次は契約書と着工日を決めましょう。</p></div>',
      foot: '<button class="btn ghost" data-c>閉じる</button><a class="btn primary" href="#/o/case/' + esc(p.id) + '" data-open>工事を開く</a>',
      onMount: function (el, api) {
        var card = el.querySelector('.won-card'); if (card && EE.fx) EE.fx.anim(card, [{ boxShadow: '0 0 0 0 rgba(191,160,106,0)' }, { boxShadow: '0 0 0 6px rgba(191,160,106,.35)' }, { boxShadow: '0 0 0 1px rgba(191,160,106,.5)' }], { duration: EE.fx.T.page, fill: 'forwards' });
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-open]').addEventListener('click', function () { api.close(); });
      }
    });
  }
  setInterval(watchWon, 1500);
  EE.plus = EE.plus || {}; EE.plus.mistakesHTML = mistakesHTML; EE.plus.celebrate = celebrate; EE.plus.watchWon = watchWon;
})(this);
