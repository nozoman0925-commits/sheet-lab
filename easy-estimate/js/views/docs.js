/*
 * 書類一覧
 * 電子帳簿保存法の検索要件（取引年月日・取引金額・取引先）で絞り込めるようにしている
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var F = { q: '', status: 'all', from: '', to: '', min: '', max: '', sort: 'issue-desc' };
  var SEL = {};
  var OWNER = '';   // 担当者で絞り込み（'' = すべて, 'none' = 未割り当て）

  function rows() {
    var q = U.norm(F.q).trim();
    var list = EE.S.documents.map(function (d) {
      var c = U.findCustomer(d.customerId) || {};
      var r = U.calcDoc(d);
      return { d: d, c: c, r: r };
    }).filter(function (x) {
      var d = x.d;
      if (F.status !== 'all' && d.status !== F.status) return false;
      if (OWNER) { var oid = d.ownerId && U.findMember(d.ownerId) ? d.ownerId : 'none'; if (oid !== OWNER) return false; }
      if (F.from && d.issueDate < F.from) return false;
      if (F.to && d.issueDate > F.to) return false;
      if (F.min !== '' && x.r.total < Number(F.min)) return false;
      if (F.max !== '' && x.r.total > Number(F.max)) return false;
      if (q && U.norm(d.no + ' ' + d.title + ' ' + (x.c.name || '')).indexOf(q) < 0) return false;
      return true;
    });
    var sorters = {
      'issue-desc': function (a, b) { return (b.d.issueDate || '').localeCompare(a.d.issueDate || '') || b.d.no.localeCompare(a.d.no); },
      'issue-asc': function (a, b) { return (a.d.issueDate || '').localeCompare(b.d.issueDate || ''); },
      'amount-desc': function (a, b) { return b.r.total - a.r.total; },
      'valid-asc': function (a, b) { return (a.d.validUntil || '').localeCompare(b.d.validUntil || ''); }
    };
    return list.sort(sorters[F.sort]);
  }

  function tableHTML() {
    var list = rows();
    if (!list.length) return '<div class="empty">' + I.search + '条件に合う書類がありません</div>';
    var total = list.reduce(function (s, x) { return s + x.r.total; }, 0);
    return '<div class="table-scroll"><table class="table"><thead><tr><th style="width:28px"><input type="checkbox" id="d-all"></th><th>見積番号</th><th>件名 / 宛先</th><th>担当</th><th>発行日</th><th>有効期限</th><th class="r">金額（税込）</th><th class="r">粗利率</th><th>状態</th><th></th></tr></thead><tbody>' +
      list.map(function (x) {
        var d = x.d;
        var low = x.r.marginRate != null && x.r.marginRate < EE.S.settings.minMargin;
        return '<tr class="clickable" data-href="#/edit/' + d.id + '" data-st>' +
          '<td><input type="checkbox" class="d-sel" data-id="' + d.id + '"' + (SEL[d.id] ? ' checked' : '') + '></td>' +
          '<td class="num">' + esc(d.no) + (d.rev ? ' <span class="badge">第' + d.rev + '版</span>' : '') + '</td>' +
          '<td>' + esc(d.title || '（件名なし）') + '<span class="cell-sub">' + esc(x.c.name || '宛先未設定') + '</span></td>' +
          '<td>' + (function () { var m = U.findMember(d.ownerId); return m ? '<span class="owner-chip">' + U.avatar(m, 22) + esc(m.name.split(/\s+/)[0]) + '</span>' : '<span class="hint">未割り当て</span>'; })() + '</td>' +
          '<td class="num">' + U.jdate(d.issueDate) + '</td>' +
          '<td class="num">' + (d.status === 'issued' ? '<span class="muted">' + U.jdate(d.validUntil) + '</span>' : U.validBadge(d)) + '</td>' +
          '<td class="r num">' + U.yen(x.r.total) + '</td>' +
          '<td class="r num" style="' + (low ? 'color:var(--warn)' : '') + '">' + U.pct(x.r.marginRate) + '</td>' +
          '<td>' + U.statusBadge(d) + '</td>' +
          '<td><div class="row-actions">' +
            '<button class="btn ghost icon sm" data-act="dup" data-id="' + d.id + '" title="複製して新規">' + I.copy + '</button>' +
            (d.status === 'issued' ? '<button class="btn ghost icon sm" data-act="rev" data-id="' + d.id + '" title="修正見積を作成">' + I.branch + '</button>'
              : '<button class="btn ghost icon sm danger" data-act="del" data-id="' + d.id + '" title="削除（下書きのみ）">' + I.trash + '</button>') +
          '</div></td></tr>';
      }).join('') +
      '</tbody><tfoot><tr><td colspan="6" class="muted" style="padding:12px">' + list.length + ' 件</td><td class="r num" style="padding:12px">' + U.yen(total) + '</td><td colspan="3"></td></tr></tfoot></table></div>';
  }

  function render(status) {
    F.status = status === 'draft' || status === 'issued' ? status : 'all';
    var html =
      '<div class="panel" data-st><div class="panel-b">' +
        '<div class="toolbar">' +
          '<div class="search grow" style="min-width:240px">' + I.search + '<input class="input" id="f-q" placeholder="番号・件名・取引先で検索" value="' + esc(F.q) + '"></div>' +
          '<div class="seg" id="f-status">' + [['all', 'すべて'], ['draft', '下書き'], ['issued', '発行済み']].map(function (s) {
            return '<button data-s="' + s[0] + '" class="' + (F.status === s[0] ? 'on' : '') + '">' + s[1] + '</button>';
          }).join('') + '</div>' +
          '<select class="input" id="f-owner" style="width:auto">' + U.opt('', '担当：すべて', OWNER) + U.members().map(function (m) { return U.opt(m.id, '担当：' + m.name, OWNER); }).join('') + U.opt('none', '担当：未割り当て', OWNER) + '</select>' +
          '<select class="input" id="f-sort" style="width:auto">' +
            U.opt('issue-desc', '発行日が新しい順', F.sort) + U.opt('issue-asc', '発行日が古い順', F.sort) + U.opt('amount-desc', '金額が大きい順', F.sort) + U.opt('valid-asc', '有効期限が近い順', F.sort) +
          '</select>' +
          '<button class="btn" id="d-print" disabled>' + I.pdf + '選んだ書類をまとめてPDF</button>' +
          '<a class="btn primary" href="#/new">' + I.plus + '新規見積</a>' +
        '</div>' +
        '<div class="toolbar" style="margin-bottom:6px">' +
          '<span class="label">取引年月日</span><input class="input" type="date" id="f-from" value="' + F.from + '" style="width:160px"><span class="hint">〜</span><input class="input" type="date" id="f-to" value="' + F.to + '" style="width:160px">' +
          '<span class="label" style="margin-left:10px">取引金額</span><input class="input num" type="number" id="f-min" placeholder="下限" value="' + F.min + '" style="width:130px"><span class="hint">〜</span><input class="input num" type="number" id="f-max" placeholder="上限" value="' + F.max + '" style="width:130px">' +
          '<button class="btn ghost sm" id="f-clear">条件をクリア</button>' +
        '</div>' +
      '</div>' +
      '<div id="doc-table" style="padding:0 8px 8px">' + tableHTML() + '</div></div>' +
      '<p class="hint" data-st style="margin-top:12px">発行済みの書類は書き換え・削除ができません（電子帳簿保存法の「訂正削除の防止」）。内容を変えるときは修正見積を作ると、元の版を残したまま新しい版が作られます。</p>';

    return { title: '書類一覧', crumb: EE.S.documents.length + '件', html: html, mount: mount };
  }

  function refresh() {
    var t = document.getElementById('doc-table');
    t.innerHTML = tableHTML();
    EE.fx.stagger(t, { step: 18 });
  }

  function mount(view) {
    var deb;
    view.addEventListener('input', function (e) {
      var map = { 'f-q': 'q', 'f-from': 'from', 'f-to': 'to', 'f-min': 'min', 'f-max': 'max' };
      if (map[e.target.id]) { F[map[e.target.id]] = e.target.value; clearTimeout(deb); deb = setTimeout(refresh, 120); }
    });
    function selCount() {
      var n = Object.keys(SEL).filter(function (k) { return SEL[k] && U.findDoc(k); }).length;
      var b = document.getElementById('d-print'); b.disabled = !n; b.innerHTML = I.pdf + (n ? n + '件をまとめてPDF' : '選んだ書類をまとめてPDF');
    }
    selCount();
    view.addEventListener('change', function (e) {
      if (e.target.id === 'f-sort') { F.sort = e.target.value; refresh(); }
      if (e.target.id === 'f-owner') { OWNER = e.target.value; refresh(); }
      if (e.target.classList.contains('d-sel')) { SEL[e.target.dataset.id] = e.target.checked; selCount(); }
      if (e.target.id === 'd-all') { view.querySelectorAll('.d-sel').forEach(function (c) { c.checked = e.target.checked; SEL[c.dataset.id] = e.target.checked; }); selCount(); }
    });
    view.querySelector('#d-print').onclick = function () {
      var docs = EE.S.documents.filter(function (d) { return SEL[d.id]; });
      if (!docs.length) return;
      var errs = docs.filter(function (d) { return EE.check.summary(U.checkDoc(d)).error; });
      var go = function () { EE.print.printMany(docs); docs.forEach(function (d) { d.history = (d.history || []).concat([{ at: new Date().toISOString(), action: 'PDF出力（一括）' }]).slice(-50); }); U.commit(); };
      if (errs.length) U.confirmBox('要修正の指摘がある書類が ' + errs.length + ' 件あります：\n' + errs.map(function (d) { return '・' + (d.title || d.no); }).join('\n') + '\n\nこのまま出力しますか？', 'このまま出力', { danger: true }).then(function (ok) { if (ok) go(); });
      else go();
    };
    view.addEventListener('click', async function (e) {
      var s = e.target.closest('#f-status [data-s]');
      if (s) { location.hash = s.dataset.s === 'all' ? '#/docs' : '#/docs/' + s.dataset.s; return; }
      if (e.target.closest('#f-clear')) {
        F = { q: '', status: 'all', from: '', to: '', min: '', max: '', sort: F.sort }; OWNER = '';
        EE.app.rerender(); return;
      }
      var a = e.target.closest('[data-act]');
      if (!a) return;
      e.stopPropagation();
      var d = U.findDoc(a.dataset.id);
      if (a.dataset.act === 'dup') EE.app.duplicate(d.id);
      else if (a.dataset.act === 'rev') { var r = EE.app.makeRevision(d); location.hash = '#/edit/' + r.id; }
      else if (a.dataset.act === 'del') {
        var ok = await U.confirmBox('下書き「' + (d.title || d.no) + '」を削除しますか？', '削除する', { danger: true });
        if (!ok) return;
        var idx = EE.S.documents.indexOf(d);
        EE.S.documents.splice(idx, 1);
        U.commit();
        var tr = a.closest('tr');
        var an = EE.fx.anim(tr, [{ opacity: 1 }, { opacity: 0, transform: 'translateX(14px)' }], { duration: 180, fill: 'forwards' });
        var done = function () { document.getElementById('doc-table').innerHTML = tableHTML(); };
        if (an) an.onfinish = done; else done();
        EE.fx.toast('削除しました', { action: { label: '元に戻す', run: function () {
          EE.S.documents.splice(idx, 0, d); U.commit(); refresh();
        } } });
      }
    }, true);
  }

  EE.views = EE.views || {};
  EE.views.docs = { render: render, setOwner: function (id) { OWNER = id || ''; } };
})(this);
