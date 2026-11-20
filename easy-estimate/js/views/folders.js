/*
 * 担当者ごとのファイル
 * - ホームに担当者の人数分のフォルダを並べ、開くとその人の担当工事と書類がまとめて見られる
 * - 担当工事 = 工事の担当者がその人の工事 ＋ その人が担当の書類がある工事
 * - 担当者（作成者）の名簿の登録・編集
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var NONE = 'none';   // 担当者が決まっていない書類のフォルダ

  function ownerOf(d) { return d.ownerId && U.findMember(d.ownerId) ? d.ownerId : NONE; }

  /** 担当者ごとの集計 */
  function statsFor(id) {
    var docs = EE.S.documents.filter(function (d) { return ownerOf(d) === id; });
    var pids = {};
    EE.S.projects.forEach(function (p) { if ((p.ownerId && U.findMember(p.ownerId) ? p.ownerId : NONE) === id) pids[p.id] = true; });
    docs.forEach(function (d) { if (d.projectId && U.findProject(d.projectId)) pids[d.projectId] = true; });
    var ym = EE.data.today().slice(0, 7), month = 0, drafts = 0, soon = 0;
    docs.forEach(function (d) {
      if ((d.issueDate || '').slice(0, 7) === ym) month += U.calcDoc(d).total;
      if (d.status === 'draft') { drafts++; var x = U.daysFromToday(d.validUntil); if (x != null && x >= 0 && x <= 7) soon++; }
    });
    return { docs: docs, projectIds: Object.keys(pids), month: month, drafts: drafts, soon: soon };
  }

  /** フォルダのアイコン（担当者の色・頭文字・中の書類の枚数で紙が見える） */
  function folderIcon(m, papers) {
    var h = m ? (m.hue != null ? m.hue : 217) : 220, sat = m ? 1 : 0.15;
    var n = Math.min(3, papers);
    var paper = '';
    for (var i = 0; i < n; i++) {
      paper += '<rect class="fold-paper" style="--p:' + i + '" x="' + (20 + i * 6) + '" y="' + (16 - i * 4) + '" width="' + (78 - i * 12) + '" height="56" rx="9" fill="#EEF4FF" opacity="' + (0.95 - i * 0.12) + '"/>';
    }
    return '<svg class="fold" viewBox="0 0 120 96" aria-hidden="true">' +
      '<path d="M8 24a12 12 0 0 1 12-12h20a10 10 0 0 1 7.6 3.5l2.8 3.3A8 8 0 0 0 56.5 21H100a12 12 0 0 1 12 12v5H8z" fill="hsl(' + h + ' ' + Math.round(55 * sat) + '% 30%)"/>' +
      '<g class="fold-papers">' + paper + '</g>' +
      '<g class="fold-front"><rect x="6" y="32" width="108" height="58" rx="16" fill="url(#fg-' + h + '-' + (m ? 1 : 0) + ')"/>' +
      '<rect x="6.5" y="32.5" width="107" height="57" rx="15.5" fill="none" stroke="rgba(255,255,255,.22)"/>' +
      '<text x="60" y="70" text-anchor="middle" font-size="24" font-weight="700" fill="#fff" fill-opacity=".92" font-family="Hiragino Sans, Noto Sans JP, sans-serif">' + esc(m ? U.initial(m.name) : '？') + '</text></g>' +
      '<defs><linearGradient id="fg-' + h + '-' + (m ? 1 : 0) + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(' + h + ' ' + Math.round(90 * sat) + '% 62%)"/><stop offset="1" stop-color="hsl(' + (h + 6) + ' ' + Math.round(80 * sat) + '% 42%)"/></linearGradient></defs>' +
    '</svg>';
  }

  /** ホームに置く「担当者のファイル」 */
  function homeSection() {
    var me = U.me();
    var tiles = U.members().map(function (m) {
      var st = statsFor(m.id);
      return '<a class="folder-tile" href="#/folder/' + m.id + '" title="' + esc(m.name) + 'のファイルを開く">' + folderIcon(m, st.docs.length) +
        '<b>' + esc(m.name) + (m.id === me.id ? ' <span class="badge blue">自分</span>' : '') + '</b>' +
        '<small>' + esc(m.role || '') + '　工事 ' + st.projectIds.length + '・書類 ' + st.docs.length + '</small>' +
        (st.soon ? '<span class="badge warn fold-flag">期限間近 ' + st.soon + '</span>' : st.drafts ? '<span class="badge fold-flag">下書き ' + st.drafts + '</span>' : '') + '</a>';
    });
    var none = statsFor(NONE);
    if (none.docs.length) tiles.push('<a class="folder-tile" href="#/folder/' + NONE + '">' + folderIcon(null, none.docs.length) + '<b>未割り当て</b><small>担当者のいない書類 ' + none.docs.length + '</small></a>');
    // 業務管理の中では、社員は業務管理の「社員一覧」で増やす
    if (!EE.host && !EE.link) tiles.push('<a class="folder-tile add" href="#/settings/members" title="担当者を追加">' +
      '<span class="fold-add">' + I.plus + '</span><b>担当者を追加</b><small>設定 → 担当者</small></a>');
    return '<section class="panel" data-st style="margin-top:18px"><div class="panel-h"><h2>担当者のファイル</h2><span class="sub">担当者ごとの工事と書類。クリックでいつでも開けます</span></div>' +
      '<div class="panel-b"><div class="folder-grid">' + tiles.join('') + '</div></div></section>';
  }

  /** フォルダの中身：担当工事ごとの書類 */
  function render(id) {
    var m = id === NONE ? null : U.findMember(id);
    if (id !== NONE && !m) return { title: '見つかりません', html: '<div class="panel panel-b empty">担当者が見つかりません。</div>' };
    var st = statsFor(id);
    var docsBy = {};
    st.docs.forEach(function (d) { var k = d.projectId && U.findProject(d.projectId) ? d.projectId : '_none'; (docsBy[k] = docsBy[k] || []).push(d); });
    var projects = st.projectIds.map(U.findProject).filter(Boolean).sort(function (a, b) {
      var la = (docsBy[a.id] || []).reduce(function (x, d) { return d.issueDate > x ? d.issueDate : x; }, '');
      var lb = (docsBy[b.id] || []).reduce(function (x, d) { return d.issueDate > x ? d.issueDate : x; }, '');
      return lb.localeCompare(la);
    });
    function docRows(list) {
      return list.sort(function (a, b) { return (b.issueDate || '').localeCompare(a.issueDate || ''); }).map(function (d) {
        return '<tr class="clickable" data-href="#/edit/' + d.id + '"><td class="num">' + esc(d.no) + '<span class="cell-sub">' + U.jdate(d.issueDate) + '</span></td>' +
          '<td>' + EE.views.site.patternBadge(d) + ' ' + esc(d.title || '（件名なし）') + '</td><td class="r num">' + U.yen(U.calcDoc(d).total) + '</td><td>' + U.statusBadge(d) + '</td></tr>';
      }).join('');
    }
    var cards = projects.map(function (p) {
      var c = U.findCustomer(p.customerId) || {};
      var list = docsBy[p.id] || [];
      var pOwner = p.ownerId && U.findMember(p.ownerId);
      var note = pOwner && pOwner.id !== id ? '<span class="badge">工事の担当：' + esc(pOwner.name) + '</span>' : '';
      return '<section class="panel site-card" data-st><div class="panel-h"><span class="kpi-icon">' + I.home + '</span><h3><a href="#/site/' + p.id + '" class="site-link">' + esc(p.name) + '</a></h3><div class="spacer"></div>' + note + '<a class="btn ghost sm" href="#/site/' + p.id + '">工事ページ</a></div>' +
        '<div class="panel-b"><div class="hint" style="margin-bottom:10px">' + esc(c.name || '') + ' ' + esc(c.honorific || '') + (p.site ? '　工事：' + esc(p.site) : '') + '</div>' +
        (list.length ? '<table class="table"><tbody>' + docRows(list) + '</tbody></table>' : '<p class="hint">まだ書類はありません</p>') +
        '<div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn sm" data-new-site="' + p.id + '">' + I.plus + 'この工事で見積を作る</button></div></div></section>';
    }).join('');
    if (docsBy._none) {
      cards += '<section class="panel site-card" data-st><div class="panel-h"><span class="kpi-icon">' + I.file + '</span><h3>工事の登録がない書類</h3></div><div class="panel-b">' +
        '<table class="table"><tbody>' + docRows(docsBy._none) + '</tbody></table>' +
        '<p class="hint" style="margin:10px 0 0">見積の「工事」を選ぶと、ここから工事ごとのまとまりに移ります。</p></div></section>';
    }
    var head = '<section class="panel" data-st><div class="panel-b folder-head">' +
        (m ? U.avatar(m, 56) : '<span class="avatar" style="--hue:220;width:56px;height:56px;filter:grayscale(1)">？</span>') +
        '<div style="flex:1;min-width:200px"><div style="font-size:20px;font-weight:650">' + esc(m ? m.name : '未割り当て') + (m && m.id === U.me().id ? ' <span class="badge blue">自分</span>' : '') + '</div>' +
          '<div class="hint">' + esc(m ? (m.role || '') : '担当者が決まっていない書類です。見積の「担当者」を選ぶと、その人のファイルに移ります') + '</div></div>' +
        '<div class="folder-stats">' +
          '<div><small>担当工事</small><b class="num" data-count="' + st.projectIds.length + '" data-format="int">0</b></div>' +
          '<div><small>書類</small><b class="num" data-count="' + st.docs.length + '" data-format="int">0</b></div>' +
          '<div><small>下書き</small><b class="num" data-count="' + st.drafts + '" data-format="int">0</b></div>' +
          '<div><small>今月の見積（税込）</small><b class="num" data-count="' + st.month + '" data-format="yen">¥0</b></div>' +
        '</div></div></section>';
    var html = head +
      '<div class="toolbar" data-st style="margin:18px 0 0">' + '<div class="grow"></div>' +
        (m ? '<button class="btn" data-act="edit-member">' + I.edit + '担当者の情報</button>' : '') +
        '<button class="btn" data-act="docs-list">' + I.docs + '書類一覧で見る</button>' +
        '<button class="btn primary" data-act="new-doc">' + I.plus + (m ? esc(m.name) + 'の担当で見積を作る' : '見積を作る') + '</button></div>' +
      (cards ? '<div class="site-grid">' + cards + '</div>' : '<section class="panel" data-st style="margin-top:18px"><div class="empty">' + I.docs + 'まだ担当の工事・書類はありません</div></section>');
    return {
      title: (m ? m.name : '未割り当て') + 'のファイル', crumb: '担当者のファイル', html: html,
      mount: function (view) {
        EE.fx.countAll(view);
        view.addEventListener('click', function (e) {
          var ns = e.target.closest('[data-new-site]');
          if (ns) { var p = U.findProject(ns.dataset.newSite); EE.app.newWith({ customerId: p.customerId, projectId: p.id, title: p.name, ownerId: m ? m.id : '' }); return; }
          var a = e.target.closest('[data-act]'); if (!a) return;
          if (a.dataset.act === 'new-doc') EE.app.newWith({ ownerId: m ? m.id : '' });
          if (a.dataset.act === 'docs-list') { EE.views.docs.setOwner(id); location.hash = '#/docs'; }
          if (a.dataset.act === 'edit-member') memberForm(m, function () { EE.app.rerender(); EE.app.renderUser(); });
        });
      }
    };
  }

  /* ---------------- 担当者の登録・編集 ---------------- */
  var HUES = [217, 199, 232, 188, 250, 205];
  function memberForm(mem, onSaved) {
    var isNew = !mem;
    var d = mem ? Object.assign({}, mem) : { id: EE.data.uid('mem'), name: '', role: '', hue: HUES[U.members().length % HUES.length] };
    var st = isNew ? null : statsFor(d.id);
    U.modal({
      title: isNew ? '担当者を追加' : '担当者の情報',
      body: '<div class="form-grid"><div class="field c6"><label class="req">名前</label><input class="input" name="name" value="' + esc(d.name) + '" placeholder="例：桜井 美和" autofocus></div>' +
        '<div class="field c6"><label>役割</label><input class="input" name="role" value="' + esc(d.role || '') + '" placeholder="例：営業、事務、工事管理"></div>' +
        '<div class="field c12"><label>アイコンとフォルダの色</label><div style="display:flex;gap:10px;flex-wrap:wrap">' + HUES.map(function (h) {
          return '<label class="hue-pick"><input type="radio" name="hue" value="' + h + '"' + (d.hue === h ? ' checked' : '') + '>' + U.avatar({ name: d.name || '？', hue: h }) + '</label>'; }).join('') + '</div></div></div>' +
        (st ? '<p class="hint" style="margin-top:12px">担当：工事 ' + st.projectIds.length + '・書類 ' + st.docs.length + '</p>' : '') +
        '<p class="hint">この版はログインのない1台用です。担当者は「誰が作った・担当している書類か」を分けるための名簿で、パスワードや権限はありません（設計書の範囲）。</p>',
      foot: (isNew || U.members().length <= 1 ? '' : '<button class="btn danger" data-del>' + I.trash + '削除</button>') + '<div class="spacer"></div>' +
        '<button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-s>' + I.save + '保存する</button>',
      onMount: function (el, api) {
        el.querySelector('[name=name]').addEventListener('input', function (e) {
          el.querySelectorAll('.hue-pick .avatar').forEach(function (a) { a.textContent = U.initial(e.target.value || '？'); });
        });
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        var del = el.querySelector('[data-del]');
        if (del) del.onclick = async function () {
          var s2 = statsFor(d.id);
          if (!(await U.confirmBox('「' + d.name + '」を名簿から削除しますか？\n担当の書類 ' + s2.docs.length + ' 件・工事は消えず、「未割り当て」に移ります。', '削除する', { danger: true }))) return;
          EE.S.members = EE.S.members.filter(function (x) { return x.id !== d.id; });
          EE.S.documents.forEach(function (x) { if (x.ownerId === d.id) x.ownerId = ''; });
          EE.S.projects.forEach(function (x) { if (x.ownerId === d.id) x.ownerId = ''; });
          if (EE.S.currentMemberId === d.id) EE.S.currentMemberId = EE.S.members[0].id;
          U.commit(); api.close(); EE.app.renderUser();
          if (location.hash.indexOf('#/folder/' + d.id) === 0) location.hash = '#/home'; else EE.app.rerender();
          EE.fx.toast('削除しました（書類は「未割り当て」に移りました）');
        };
        el.querySelector('[data-s]').onclick = function () {
          var name = el.querySelector('[name=name]').value.trim();
          if (!name) { var f = el.querySelector('[name=name]'); f.classList.add('flag-err'); EE.fx.shake(f); return; }
          var hue = el.querySelector('[name=hue]:checked');
          d.name = name; d.role = el.querySelector('[name=role]').value.trim(); d.hue = hue ? Number(hue.value) : d.hue;
          if (isNew) EE.S.members.push(d); else Object.assign(mem, d);
          U.commit(); api.close(); EE.app.renderUser();
          EE.fx.toast(isNew ? '担当者を追加しました' : '保存しました');
          if (onSaved) onSaved(d);
        };
      }
    });
  }

  /** 設定・マスタ →「担当者」 */
  function membersTab() {
    var me = U.me();
    return '<div class="toolbar" data-st><div class="grow hint">見積を作る人・工事を担当する人の名簿です。ホームに一人ずつファイル（フォルダ）が並び、担当工事と書類をすぐ開けます。<br>サイドバー下の名前から「担当者を切り替え」ると、新しく作る見積がその人の担当になります。</div>' +
      '<button class="btn primary" data-act="new-member">' + I.plus + '担当者を追加</button></div>' +
      '<section class="panel" data-st><div class="panel-b"><table class="table"><thead><tr><th></th><th>名前</th><th>役割</th><th class="r">担当工事</th><th class="r">書類</th><th></th></tr></thead><tbody>' +
      U.members().map(function (m) {
        var st = statsFor(m.id);
        return '<tr data-st><td style="width:46px">' + U.avatar(m) + '</td><td>' + esc(m.name) + (m.id === me.id ? ' <span class="badge blue">使用中</span>' : '') + '</td><td class="muted">' + esc(m.role || '') + '</td>' +
          '<td class="r num">' + st.projectIds.length + '</td><td class="r num">' + st.docs.length + '</td>' +
          '<td class="r"><div class="row-actions" style="opacity:1"><a class="btn ghost sm" href="#/folder/' + m.id + '">' + I.docs + 'ファイル</a><button class="btn ghost icon sm" data-act="edit-member" data-id="' + m.id + '">' + I.edit + '</button></div></td></tr>';
      }).join('') + '</tbody></table></div></section>';
  }

  EE.views = EE.views || {};
  EE.views.folders = { render: render, homeSection: homeSection, memberForm: memberForm, membersTab: membersTab, statsFor: statsFor, NONE: NONE };
})(this);
