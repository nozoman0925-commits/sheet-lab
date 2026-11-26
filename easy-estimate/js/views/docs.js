/*
 * 書類一覧
 * 電子帳簿保存法の検索要件（取引年月日・取引金額・取引先）で絞り込めるようにしている
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var F = { q: '', status: 'all', from: '', to: '', min: '', max: '', sort: 'issue-desc' };
  var SEL = {};
  var PICK = null;   // めくるカードに出している書類
  var OWNER = '';   // 担当者で絞り込み（'' = すべて, 'none' = 未割り当て）

  function rows() {
    var q = U.norm(F.q).trim();
    var list = EE.S.documents.map(function (d) {
      var c = U.docCustomer(d);
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
    if (!list.length) return EE.S.documents.length ? '<div class="empty">' + I.search + '<p class="empty-t">条件に合う見積がありません</p><button class="btn primary sm" type="button" data-fclear>条件を消す</button></div>'
      : U.empty({ icon: I.docs, text: 'まだ見積がありません', sub: '最初の1枚を作ると、ここに並びます。', btn: '見積を作る', href: EE.link ? '#/w' : '#/new' });
    var total = list.reduce(function (s, x) { return s + x.r.total; }, 0);
    return '<div class="table-scroll"><table class="table doc-list"><thead><tr><th style="width:28px"><input type="checkbox" id="d-all"></th><th>見積番号</th><th>件名 / 宛先</th><th>担当</th><th>発行日</th><th>有効期限</th><th class="r">金額（税込）</th><th class="r internal">粗利率</th><th>状態</th><th></th></tr></thead><tbody>' +
      list.map(function (x) {
        var d = x.d;
        var low = x.r.marginRate != null && x.r.marginRate < U.minMarginOf(d);
        return '<tr class="clickable' + (PICK === d.id ? ' picked' : '') + '" data-pick="' + d.id + '" tabindex="0" title="クリックでカード表示・ダブルクリックで開く" data-st>' +
          '<td class="c-sel"><input type="checkbox" class="d-sel" data-id="' + d.id + '"' + (SEL[d.id] ? ' checked' : '') + '></td>' +
          '<td class="num c-no">' + esc(d.no) + (d.rev ? ' <span class="badge">第' + d.rev + '版</span>' : '') + '</td>' +
          '<td class="c-title"><span class="c-tt">' + EE.views.site.patternBadge(d) + ' ' + esc(d.title || '（件名なし）') + '</span><span class="cell-sub">' + esc(x.c.name || '宛先未設定') + '</span></td>' +
          '<td class="c-owner">' + (function () { var m = U.findMember(d.ownerId); return m ? '<span class="owner-chip">' + U.avatar(m, 22) + esc(m.name.split(/\s+/)[0]) + '</span>' : '<span class="hint">未割り当て</span>'; })() + '</td>' +
          '<td class="num c-issue">' + U.jdate(d.issueDate) + '</td>' +
          '<td class="num c-valid">' + (d.status === 'issued' ? '<span class="muted">' + U.jdate(d.validUntil) + '</span>' + (function () { var n = U.daysFromToday(d.validUntil); return n == null ? '' : '<span class="cell-sub ' + (n < 0 ? 'due-over' : n <= 7 ? 'due-soon' : '') + '">' + (n < 0 ? (-n) + '日過ぎ' : '残り ' + n + '日') + ((d.sent || []).length ? '・提出 ' + U.jdate(d.sent[d.sent.length - 1].date).slice(5) : '') + '</span>'; })() : U.validBadge(d)) + '</td>' +
          '<td class="r num c-amt">' + U.yen(x.r.total) + '</td>' +
          '<td class="r num c-margin" style="' + (low ? 'color:var(--warn)' : '') + '">' + U.pct(x.r.marginRate) + '</td>' +
          '<td class="c-st">' + U.statusBadge(d) + '</td>' +
          '<td class="c-act"><div class="row-actions">' +
            '<button class="btn ghost icon sm" data-act="dup" data-id="' + d.id + '" title="複製して新規">' + I.copy + '</button>' +
            (d.status === 'issued' ? '<button class="btn ghost icon sm" data-act="rev" data-id="' + d.id + '" title="修正見積を作成">' + I.branch + '</button>'
              : '<button class="btn ghost icon sm danger" data-act="del" data-id="' + d.id + '" title="削除（下書きのみ）">' + I.trash + '</button>') +
          '</div></td></tr>';
      }).join('') +
      '</tbody><tfoot><tr><td colspan="6" class="muted" style="padding:12px">' + list.length + ' 件</td><td class="r num" style="padding:12px">' + U.yen(total) + '</td><td colspan="3"></td></tr></tfoot></table></div>';
  }

  function render(status) {
    F.status = status === 'draft' || status === 'issued' ? status : 'all';
    var html = trendHTML() +
      '<div class="docs-layout' + (PICK && U.findDoc(PICK) ? '' : ' nocard') + '" id="docs-layout"><div>' +
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
          '<button class="btn" id="d-print" disabled>' + I.pdf + '選んだ書類をまとめてPDFにする</button>' +
          '<a class="btn primary" href="#/new">' + I.plus + '見積を作る</a>' +
        '</div>' +
        '<div class="toolbar" style="margin-bottom:6px">' +
          '<span class="label">取引年月日</span><input class="input" type="date" id="f-from" value="' + F.from + '" style="width:160px"><span class="hint">〜</span><input class="input" type="date" id="f-to" value="' + F.to + '" style="width:160px">' +
          '<span class="label" style="margin-left:10px">取引金額</span><input class="input num" type="number" id="f-min" placeholder="下限" value="' + F.min + '" style="width:130px"><span class="hint">〜</span><input class="input num" type="number" id="f-max" placeholder="上限" value="' + F.max + '" style="width:130px">' +
          '<button class="btn ghost sm" id="f-clear">条件を消す</button>' +
        '</div>' +
      '</div>' +
      '<div id="doc-table" style="padding:0 8px 8px">' + tableHTML() + '</div></div></div>' +
      '<aside class="flip-wrap" id="flip-aside">' + (PICK && U.findDoc(PICK) ? cardHTML(U.findDoc(PICK)) : '') + '</aside></div>' +
      '<p class="hint" data-st style="margin-top:12px">発行済みの書類は書き換え・削除ができません（電子帳簿保存法の「訂正削除の防止」）。内容を変えるときは修正見積を作ると、元の版を残したまま新しい版が作られます。</p>';

    return { title: '書類一覧', crumb: EE.S.documents.length + '件', html: html, mount: mount };
  }

  /* ---- 件数の推移（直近12か月） ---- */
  function trendHTML() {
    var ms = EE.insight.months(12).map(function (m) { return { key: m.key, label: m.label, value: 0 }; });
    var idx = {}; ms.forEach(function (m, i) { idx[m.key] = i; });
    EE.S.documents.forEach(function (d) { var i = idx[(d.issueDate || '').slice(0, 7)]; if (i != null) ms[i].value++; });
    var cur = ms[ms.length - 1].value, prev = ms[ms.length - 2].value, diff = cur - prev;
    TREND = ms;
    return '<section class="panel" data-st style="margin-bottom:18px"><div class="panel-b trend">' +
      '<div><div class="label">今月の書類</div><div class="big num" data-count="' + cur + '" data-format="int">0</div>' +
        '<div class="hint">先月 ' + prev + ' 件（' + (diff > 0 ? '+' : diff < 0 ? '−' : '±') + Math.abs(diff) + '）</div></div>' +
      '<div><div class="label" style="margin-bottom:4px">月ごとの件数（直近12か月）</div><div id="trend-chart"></div></div></div></section>';
  }
  var TREND = [];

  /* ---- めくるカード：表＝概要、裏＝明細の要点と履歴 ---- */
  function cardHTML(d) {
    var r = U.calcDoc(d), c = U.docCustomer(d), m = U.findMember(d.ownerId), pj = U.findProject(d.projectId);
    var days = U.daysFromToday(d.validUntil);
    var top = d.lines.map(function (l, i) { return { l: l, a: r.lines[i] ? r.lines[i].amount : 0 }; }).sort(function (a, b) { return b.a - a.a; }).slice(0, 5);
    var hist = (d.history || []).slice(-6).reverse();
    return '<div class="flip-tilt" id="flip-tilt"><div class="flip" id="flip" data-doc="' + d.id + '">' +
      '<div class="flip-face panel"><div class="panel-h">' + U.statusBadge(d) + EE.views.site.patternBadge(d) + '<div class="spacer"></div><span class="hint num">' + esc(d.no) + '</span></div>' +
        '<div class="panel-b"><div style="font-size:16px;font-weight:650;line-height:1.45">' + esc(d.title || '（件名なし）') + '</div>' +
          '<div class="hint">' + esc(c.name || '宛先未設定') + ' ' + esc(c.honorific || '') + '</div>' +
          '<div class="flip-total num" data-count="' + r.total + '" data-format="yen">¥0</div><div class="hint">税込　小計 ' + U.yen(r.subtotal) + '<span class="internal">・粗利率 ' + U.pct(r.marginRate) + '</span></div>' +
          '<div class="sep"></div>' +
          '<div class="sum-row"><span>発行日</span><span class="num">' + U.jdate(d.issueDate) + '</span></div>' +
          '<div class="sum-row"><span>有効期限</span><span>' + (d.status === 'issued' ? '<span class="num">' + U.jdate(d.validUntil) + '</span>' : U.validBadge(d)) + '</span></div>' +
          '<div class="sum-row"><span>担当</span><span>' + (m ? '<span class="owner-chip">' + U.avatar(m, 20) + esc(m.name) + '</span>' : '<span class="hint">未割り当て</span>') + '</span></div>' +
          (pj ? '<div class="sum-row"><span>工事</span><a class="site-link" href="#/site/' + pj.id + '">' + esc(pj.name) + '</a></div>' : '') +
          '<div style="display:flex;gap:8px;margin-top:14px"><a class="btn sm primary" href="#/edit/' + d.id + '">' + I.edit + '開く</a><button class="btn sm" data-act="flip">' + I.refresh + '裏を見る</button></div>' +
        '</div><div class="flip-hint">カードをクリックすると裏返して、明細の要点と履歴を表示します</div></div>' +
      '<div class="flip-face flip-back panel"><div class="panel-h"><h3>明細の要点</h3><span class="sub">金額の大きい順</span><div class="spacer"></div><span class="hint">' + d.lines.length + '行</span></div>' +
        '<div class="panel-b">' + top.map(function (x) {
          return '<div class="sum-row"><span>' + esc(x.l.name) + '<span class="cell-sub">' + U.num(x.l.qty) + ' ' + esc(x.l.unit) + ' × ' + U.yen(x.l.unitPrice) + '</span></span><span class="num">' + U.yen(x.a) + '</span></div>';
        }).join('') + (d.lines.length > 5 ? '<div class="hint">ほか ' + (d.lines.length - 5) + ' 行</div>' : '') +
        r.adjustments.map(function (a) { return '<div class="sum-row sub"><span>' + esc(a.label || a.type) + '</span><span class="num">' + U.yen(a.amount) + '</span></div>'; }).join('') +
        '<div class="sep"></div><div class="label" style="margin-bottom:6px">履歴</div>' +
        hist.map(function (h) { return '<div class="sum-row sub" style="padding-left:0"><span>' + esc(h.action) + '</span><span class="num">' + U.jdate((h.at || '').slice(0, 10)) + '</span></div>'; }).join('') +
        '</div><div class="flip-hint">クリックで表に戻る</div></div>' +
    '</div></div>';
  }
  function showCard(view, id) {
    PICK = id;
    view.querySelectorAll('#doc-table tr[data-pick]').forEach(function (tr) { tr.classList.toggle('picked', tr.dataset.pick === id); });
    var lay = view.querySelector('#docs-layout'), aside = view.querySelector('#flip-aside');
    lay.classList.remove('nocard');
    aside.innerHTML = cardHTML(U.findDoc(id));
    EE.fx.anim(aside.firstChild, [{ opacity: 0, transform: 'translateY(10px) rotateY(-12deg)' }, { opacity: 1, transform: 'none' }], { duration: 380 });
    EE.fx.countAll(aside);
  }

  function refresh() {
    var t = document.getElementById('doc-table');
    if (!t) return;   // 入力の直後に別の画面へ移ったとき（遅れて動く更新）は何もしない
    t.innerHTML = tableHTML();
    EE.fx.stagger(t, { step: 18 });
  }

  function mount(view) {
    var deb;
    EE.charts.area(view.querySelector('#trend-chart'), TREND, { title: '月ごとの書類の件数', unit: '件数', height: 90 });
    EE.fx.countAll(view);
    // 行：クリックでカード、ダブルクリック・Enter で開く
    view.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-pick]');
      if (tr && !e.target.closest('button, a, input')) { if (e.detail >= 2) return; lastClick = { id: tr.dataset.pick, t: Date.now() }; showCard(view, tr.dataset.pick); return; }
      var flip = e.target.closest('#flip');
      if (flip && (!e.target.closest('a, button') || e.target.closest('[data-act="flip"]'))) { flip.classList.toggle('flipped'); }
    });
    // 1回目のクリックでカードが開いて表が詰まり、2回目が別の行に当たることがあるため、1回目に押した行を開く
    var lastClick = null;
    view.addEventListener('dblclick', function (e) {
      var tr = e.target.closest('tr[data-pick]'); if (!tr || e.target.closest('button, a, input')) return;
      var id = lastClick && Date.now() - lastClick.t < 800 ? lastClick.id : tr.dataset.pick;
      location.hash = '#/edit/' + id;
    });
    view.addEventListener('keydown', function (e) { var tr = e.target.closest && e.target.closest('tr[data-pick]'); if (tr && e.key === 'Enter') location.hash = '#/edit/' + tr.dataset.pick; if (tr && e.key === ' ') { e.preventDefault(); showCard(view, tr.dataset.pick); } });
    // カード：ホバーで少し傾く（±5°）
    view.addEventListener('pointermove', function (e) {
      var t = e.target.closest && e.target.closest('#flip-tilt'); if (!t || EE.fx.reduce) return;
      var r = t.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      t.style.transform = 'rotateX(' + (-py * 10).toFixed(2) + 'deg) rotateY(' + (px * 10).toFixed(2) + 'deg)';
    });
    view.addEventListener('pointerout', function (e) { var t = e.target.closest && e.target.closest('#flip-tilt'); if (t && !t.contains(e.relatedTarget)) t.style.transform = ''; });
    if (PICK && U.findDoc(PICK)) EE.fx.countAll(view.querySelector('#flip-aside'));
    view.addEventListener('input', function (e) {
      var map = { 'f-q': 'q', 'f-from': 'from', 'f-to': 'to', 'f-min': 'min', 'f-max': 'max' };
      if (map[e.target.id]) { F[map[e.target.id]] = e.target.value; clearTimeout(deb); deb = setTimeout(refresh, 120); }
    });
    function selCount() {
      var n = Object.keys(SEL).filter(function (k) { return SEL[k] && U.findDoc(k); }).length;
      var b = document.getElementById('d-print'); b.disabled = !n; b.innerHTML = I.pdf + (n ? n + '件をまとめてPDFにする' : '選んだ書類をまとめてPDFにする');
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
      // 下書きは確定してから出す。要修正の指摘がある下書きは確定できないので、出さない
      var drafts = docs.filter(function (d) { return d.status !== 'issued'; });
      var errs = drafts.filter(function (d) { return EE.check.summary(U.checkDoc(d)).error; });
      if (errs.length) {
        U.confirmBox('要修正の指摘がある下書きが ' + errs.length + ' 件あるため、PDFを出せません：\n' + errs.map(function (d) { return '・' + (d.title || d.no || '（件名なし）'); }).join('\n') + '\n\n見積を開いて直してから出してください。', 'わかりました');
        return;
      }
      var go = function () {
        drafts.forEach(function (d) { EE.app.finalizeDoc(d); });
        EE.print.printMany(docs);
        docs.forEach(function (d) { d.history = (d.history || []).concat([{ at: new Date().toISOString(), action: 'PDF出力（一括）' }]).slice(-50); });
        U.commit(); refresh();
      };
      if (drafts.length) U.confirmBox('下書き ' + drafts.length + ' 件は、PDFを出すと確定され、以後は変更・削除できません：\n' + drafts.map(function (d) { return '・' + (d.title || '（件名なし）'); }).join('\n'), '確定してPDFを出す').then(function (ok) { if (ok) go(); });
      else go();
    };
    view.addEventListener('click', async function (e) {
      var s = e.target.closest('#f-status [data-s]');
      if (s) { location.hash = s.dataset.s === 'all' ? '#/docs' : '#/docs/' + s.dataset.s; return; }
      if (e.target.closest('#f-clear, [data-fclear]')) {
        F = { q: '', status: 'all', from: '', to: '', min: '', max: '', sort: F.sort }; OWNER = '';
        EE.app.rerender(); return;
      }
      var a = e.target.closest('[data-act]');
      if (!a || a.dataset.act === 'flip') return;   // 裏返しはカード側の処理に任せる
      e.stopPropagation();
      var d = U.findDoc(a.dataset.id);
      if (a.dataset.act === 'dup') EE.app.duplicate(d.id);
      else if (a.dataset.act === 'rev') { var r = EE.app.makeRevision(d); location.hash = '#/edit/' + r.id; }
      else if (a.dataset.act === 'del') {
        // 受注した見積として使われている書類は消さない（受注額の集計から消えてしまうため）
        var acc = EE.S.projects.filter(function (p) { return p.acceptedDocId === d.id; })[0];
        if (acc) { EE.fx.toast('この見積は「' + acc.name + '」の受注見積なので削除できません', { warn: true, ms: 5000 }); return; }
        // 以前の版で、下書きのままPDFを出した書類（相手に送った可能性がある）は消さない
        if ((d.history || []).some(function (h) { return /PDF出力/.test(h.action); })) { EE.fx.toast('PDFを出したことのある書類は削除できません（送った書類として保存します）', { warn: true, ms: 5000 }); return; }
        var ok = await U.confirmBox('下書き「' + (d.title || d.no) + '」を削除しますか？', '削除する', { danger: true });
        if (!ok) return;
        var idx = EE.S.documents.indexOf(d);
        EE.S.documents.splice(idx, 1);
        U.commit();
        var tr = a.closest('tr');
        var an = EE.fx.anim(tr, [{ opacity: 1 }, { opacity: 0, transform: 'translateX(' + EE.fx.mv() * 2 + 'px)' }], { duration: EE.fx.T.change, fill: 'forwards' });
        var fired = false, done = function () { if (fired) return; fired = true; var t = document.getElementById('doc-table'); if (t) t.innerHTML = tableHTML(); };
        if (an) { an.onfinish = done; setTimeout(done, 300); } else done();
        EE.fx.toast('削除しました', { action: { label: '元に戻す', run: function () {
          EE.S.documents.splice(idx, 0, d); U.commit(); refresh();
          setTimeout(function () { var back = document.querySelector('#doc-table tr[data-pick="' + d.id + '"]'); if (back) EE.fx.anim(back.closest('tr') || back, [{ opacity: 0, transform: 'translateX(' + EE.fx.mv() * 2 + 'px)' }, { opacity: 1, transform: 'none' }], { duration: EE.fx.T.change }); }, 60);
        } } });
      }
    }, true);
  }

  EE.views = EE.views || {};
  EE.views.docs = { render: render, setOwner: function (id) { OWNER = id || ''; } };
})(this);
