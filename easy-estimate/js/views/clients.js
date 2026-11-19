/* 顧客・案件 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var sel = null, q = '';

  /** 顧客ごとの直近の案件（書類の発行日が新しい順） */
  function recentProject(c) {
    var best = null, bd = '';
    EE.S.projects.forEach(function (p) {
      if (p.customerId !== c.id) return;
      var d = EE.S.documents.filter(function (x) { return x.projectId === p.id; }).map(function (x) { return x.issueDate || ''; }).sort().pop() || '';
      if (!best || d > bd) { best = p; bd = d; }
    });
    return best ? { p: best, date: bd } : null;
  }

  function customerForm(c, onSaved) {
    var isNew = !c;
    c = c || { id: EE.data.uid('cus'), kind: 'corp', name: '', honorific: '御中', contact: '', zip: '', address: '', tel: '', email: '', memo: '' };
    U.modal({
      title: isNew ? '顧客を登録' : '顧客を編集',
      body: '<div class="form-grid">' +
        '<div class="field c4"><label>区分</label><select class="input" name="kind">' + U.opt('corp', '法人', c.kind) + U.opt('person', '個人', c.kind) + '</select></div>' +
        '<div class="field c8"><label class="req">名称</label><input class="input" name="name" value="' + esc(c.name) + '" autofocus></div>' +
        '<div class="field c4"><label class="req">敬称</label><select class="input" name="honorific">' + U.opt('御中', '御中', c.honorific) + U.opt('様', '様', c.honorific) + U.opt('', '（なし）', c.honorific) + '</select></div>' +
        '<div class="field c8"><label>担当者</label><input class="input" name="contact" value="' + esc(c.contact) + '" placeholder="例：工務部 佐藤様"></div>' +
        '<div class="field c4"><label>郵便番号</label><input class="input" name="zip" value="' + esc(c.zip) + '"></div>' +
        '<div class="field c8"><label>住所</label><input class="input" name="address" value="' + esc(c.address) + '"></div>' +
        '<div class="field c6"><label>電話</label><input class="input" name="tel" value="' + esc(c.tel) + '"></div>' +
        '<div class="field c6"><label>メール</label><input class="input" name="email" value="' + esc(c.email) + '"></div>' +
        '<div class="field c12"><label>メモ（一覧にも出ます）</label><textarea class="input" name="memo" placeholder="例：見積は紙でも郵送希望。支払いは月末締め翌月末">' + esc(c.memo || '') + '</textarea></div>' +
      '</div>',
      foot: '<button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-s>' + I.save + '保存</button>',
      onMount: function (el, api) {
        var kind = el.querySelector('[name=kind]'), hon = el.querySelector('[name=honorific]');
        kind.onchange = function () { hon.value = kind.value === 'corp' ? '御中' : '様'; EE.fx.pulse(hon); };
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-s]').onclick = function () {
          var v = U.readForm(el);
          if (!v.name) { var n = el.querySelector('[name=name]'); n.classList.add('flag-err'); EE.fx.shake(n); n.focus(); return; }
          Object.assign(c, v);
          if (isNew) EE.S.customers.push(c);
          U.commit();
          api.close();
                EE.fx.toast(isNew ? '顧客を登録しました' : '保存しました');
          if (onSaved) onSaved(c);
        };
      }
    });
  }

  function projectForm(p, customerId, onSaved) {
    var isNew = !p;
    p = p || { id: EE.data.uid('prj'), customerId: customerId || '', name: '', site: '', note: '', ownerId: EE.S.currentMemberId || '' };
    U.modal({
      title: isNew ? '案件を登録' : '案件を編集',
      body: '<div class="form-grid">' +
        '<div class="field c12"><label class="req">顧客</label><select class="input" name="customerId">' + EE.S.customers.map(function (c) { return U.opt(c.id, c.name, p.customerId); }).join('') + '</select></div>' +
        '<div class="field c12"><label class="req">案件名</label><input class="input" name="name" value="' + esc(p.name) + '" autofocus></div>' +
        '<div class="field c12"><label>担当者（この現場の担当）</label><select class="input" name="ownerId">' + U.memberOptions(p.ownerId || '', '（未割り当て）') + '</select></div>' +
        '<div class="field c12"><label>現場住所（工事場所）</label><input class="input" name="site" value="' + esc(p.site) + '"></div>' +
        '<div class="field c12"><label>メモ</label><textarea class="input" name="note">' + esc(p.note) + '</textarea></div></div>',
      foot: '<button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-s>' + I.save + '保存</button>',
      onMount: function (el, api) {
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-s]').onclick = function () {
          var v = U.readForm(el);
          if (!v.name) { var n = el.querySelector('[name=name]'); n.classList.add('flag-err'); EE.fx.shake(n); return; }
          Object.assign(p, v);
          if (isNew) EE.S.projects.push(p);
          U.commit(); api.close();
          EE.fx.toast(isNew ? '案件を登録しました' : '保存しました');
          if (onSaved) onSaved(p);
        };
      }
    });
  }

  function listHTML() {
    var nq = U.norm(q);
    var list = EE.S.customers.filter(function (c) { return !nq || U.norm(c.name + c.contact + c.address).indexOf(nq) >= 0; });
    if (!list.length) return '<div class="empty">' + I.users + '顧客がいません</div>';
    return '<table class="table"><tbody>' + list.map(function (c) {
      var n = EE.S.documents.filter(function (d) { return d.customerId === c.id; }).length;
      var rp = recentProject(c);
      return '<tr class="clickable' + (sel === c.id ? ' sel' : '') + '" data-cid="' + c.id + '" data-st style="' + (sel === c.id ? 'background:rgba(77,141,255,.1);box-shadow:inset 2px 0 0 var(--accent)' : '') + '">' +
        '<td>' + esc(c.name) + ' <span class="muted">' + esc(c.honorific) + '</span><span class="cell-sub">' + esc(c.address || '住所未登録') + '</span>' +
          (rp ? '<span class="cust-recent">' + I.clock + '直近：' + esc(rp.p.name) + (rp.date ? '<em>' + U.jdate(rp.date) + '</em>' : '') + '</span>' : '') +
          (c.memo ? '<span class="cust-memo">' + esc(c.memo) + '</span>' : '') + '</td>' +
        '<td class="r"><span class="badge">' + (c.kind === 'corp' ? '法人' : '個人') + '</span></td><td class="r muted num">' + n + '件</td></tr>';
    }).join('') + '</tbody></table>';
  }

  function detailHTML() {
    var c = U.findCustomer(sel);
    if (!c) return '<div class="empty">' + I.users + '左の一覧から顧客を選んでください</div>';
    var pjs = EE.S.projects.filter(function (p) { return p.customerId === c.id; });
    var docs = EE.S.documents.filter(function (d) { return d.customerId === c.id; }).sort(function (a, b) { return (b.issueDate || '').localeCompare(a.issueDate || ''); });
    return '<div class="panel-h" style="padding:0 0 12px"><h2 style="font-size:17px">' + esc(c.name) + ' <span class="muted">' + esc(c.honorific) + '</span></h2><div class="spacer"></div>' +
        '<button class="btn sm" data-act="edit-c">' + I.edit + '編集</button>' +
        '<button class="btn sm danger" data-act="del-c">' + I.trash + '</button>' +
        '<button class="btn sm primary" data-act="new-doc">' + I.plus + 'この顧客で見積</button></div>' +
      '<div class="form-grid" style="margin-bottom:18px">' +
        [['担当者', c.contact], ['住所', (c.zip ? '〒' + c.zip + ' ' : '') + c.address], ['電話', c.tel], ['メール', c.email]].map(function (x) {
          return '<div class="field c6"><span class="label">' + x[0] + '</span><span>' + (esc(x[1]) || '<span class="hint">—</span>') + '</span></div>';
        }).join('') +
        '<div class="field c12"><span class="label">メモ</span><span style="white-space:pre-wrap">' + (esc(c.memo || '') || '<span class="hint">—（編集から書けます）</span>') + '</span></div></div>' +
      '<div class="panel-h" style="padding:0 0 8px"><h3>案件</h3><div class="spacer"></div><button class="btn sm" data-act="new-p">' + I.plus + '案件を追加</button></div>' +
      (pjs.length ? '<table class="table" style="margin-bottom:18px"><tbody>' + pjs.map(function (p) {
        var pm = U.findMember(p.ownerId);
        var pc = EE.views.site.docsOf(p.id).length;
        return '<tr class="clickable" data-href="#/site/' + p.id + '" data-st><td>' + esc(p.name) + (pc ? ' <span class="badge">見積 ' + pc + '件</span>' : '') + '<span class="cell-sub">' + esc(p.site || '') + (pm ? '　担当：' + esc(pm.name) : '') + '</span></td><td class="r"><div class="row-actions">' +
          '<button class="btn ghost sm" data-act="p-doc" data-pid="' + p.id + '">' + I.plus + '見積</button>' +
          '<button class="btn ghost icon sm" data-act="edit-p" data-pid="' + p.id + '">' + I.edit + '</button></div></td></tr>';
      }).join('') + '</tbody></table>' : '<p class="hint" style="margin:0 0 18px">案件はまだありません</p>') +
      '<div class="panel-h" style="padding:0 0 8px"><h3>この顧客の書類</h3></div>' +
      (docs.length ? '<table class="table"><tbody>' + docs.map(function (d) {
        return '<tr class="clickable" data-href="#/edit/' + d.id + '" data-st><td class="num">' + esc(d.no) + '</td><td>' + esc(d.title) + '</td><td class="num muted">' + U.jdate(d.issueDate) + '</td><td class="r num">' + U.yen(U.calcDoc(d).total) + '</td><td>' + U.statusBadge(d) + '</td></tr>';
      }).join('') + '</tbody></table>' : '<p class="hint">まだ書類はありません</p>');
  }

  function render() {
    if (!sel && EE.S.customers[0]) sel = EE.S.customers[0].id;
    var html = '<div class="grid" style="grid-template-columns:minmax(280px,380px) minmax(0,1fr)">' +
      '<section class="panel" data-st><div class="panel-h"><h2>顧客</h2><span class="sub">' + EE.S.customers.length + '件</span><div class="spacer"></div>' +
        '<button class="btn sm primary" data-act="new-c">' + I.plus + '登録</button></div>' +
        '<div class="panel-b"><div class="search" style="margin-bottom:10px">' + I.search + '<input class="input" id="c-q" placeholder="名称・住所で検索" value="' + esc(q) + '"></div><div id="c-list">' + listHTML() + '</div></div></section>' +
      '<section class="panel" data-st><div class="panel-b" id="c-detail">' + detailHTML() + '</div></section></div>';
    return { title: '顧客', crumb: '問い合わせ・営業', html: html, mount: mount };
  }

  function refresh(detailOnly) {
    var l = document.getElementById('c-list'), d = document.getElementById('c-detail');
    if (!d) return;   // 別の画面へ移った後に呼ばれたとき
    if (!detailOnly && l) l.innerHTML = listHTML();
    d.innerHTML = detailHTML();
    EE.fx.stagger(d, { step: 25 });
  }

  function mount(view) {
    view.addEventListener('input', function (e) { if (e.target.id === 'c-q') { q = e.target.value; document.getElementById('c-list').innerHTML = listHTML(); } });
    view.addEventListener('click', async function (e) {
      var row = e.target.closest('[data-cid]');
      if (row) { sel = row.dataset.cid; refresh(); return; }
      var a = e.target.closest('[data-act]');
      if (!a) return;
      var c = U.findCustomer(sel);
      switch (a.dataset.act) {
        case 'new-c': customerForm(null, function (n) { sel = n.id; refresh(); }); break;
        case 'edit-c': customerForm(c, function () { refresh(); }); break;
        case 'del-c':
          if (EE.S.documents.some(function (d) { return d.customerId === c.id; })) {
            EE.fx.toast('書類がある顧客は削除できません（書類の宛先が消えるため）', { warn: true, ms: 3500 }); return;
          }
          if (!(await U.confirmBox('「' + c.name + '」と、その案件を削除しますか？', '削除する', { danger: true }))) return;
          EE.S.customers.splice(EE.S.customers.indexOf(c), 1);
          EE.S.projects = EE.S.projects.filter(function (p) { return p.customerId !== c.id; });
          U.commit(); sel = null; EE.app.rerender(); break;
        case 'new-p': projectForm(null, sel, function () { refresh(true); }); break;
        case 'edit-p': projectForm(U.findProject(a.dataset.pid), sel, function () { refresh(true); }); break;
        case 'new-doc': EE.app.newWith({ customerId: sel }); break;
        case 'p-doc': var p = U.findProject(a.dataset.pid); EE.app.newWith({ customerId: p.customerId, projectId: p.id, title: p.name }); break;
      }
    });
  }

  EE.views = EE.views || {};
  EE.views.clients = { render: render, customerForm: customerForm, projectForm: projectForm };
})(this);
