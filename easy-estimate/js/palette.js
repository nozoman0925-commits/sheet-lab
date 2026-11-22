/*
 * 全機能検索（コマンドパレット）：Ctrl+K（Mac は ⌘K）で開く
 *  - 機能（準備中のものは「第N期で追加」と表示）・顧客・工事・書類・工事項目を横断して探す
 *  - 業務の言葉（未入金・期限切れ・今日の予定・新しい見積…）からも、該当の画面へ直接移動
 *  - ↑↓ で選び、Enter で開く。Esc で閉じる
 * 検索は文字の一致だけ（AIは使わない）。
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var norm = function (s) { return String(s || '').normalize('NFKC').toLowerCase().replace(/[\s・、。]/g, ''); };

  /* 業務の言葉 → 画面（機能一覧にない、よく使う操作） */
  var LINK_ACTIONS = [
    ['工事の一覧（9工程）', '#/o/list', '工事 既存 一覧 工程 進み具合'],
    ['新しい工事を登録（問い合わせ）', '#/o/new', '問い合わせ 新規 工事 登録'], ['カレンダー（工事・現地調査・予定）', '#/o/cal', 'カレンダー 予定 現地調査 工事日'],
    ['ホワイトボード（あしたの予定）', '#/o/wb', 'ホワイトボード あした 明日 予定'], ['タイムライン（社内の投稿）', '#/o/board', 'タイムライン 投稿 掲示板'],
    ['工事の経営（進行中・入金待ち）', '#/o/dash', '経営 入金待ち 要対応'], ['社員', '#/o/staff', '社員 職人 名簿'], ['業務の設定（目標の粗利率など）', '#/o/settings', '目標 粗利率 設定'],
    ['自分の名前・この端末の記録のバックアップ', '#/settings/data', '名前 自分 バックアップ 保存 戻す 復元 機種変更']
  ];
  var ACTIONS = [
    ['新しい見積を作る', '#/new', '見積 作成 新規 つくる'],
    ['外構の見積を作る（文章から）', '#/new/text', '外構 フェンス 文章'],
    ['未入金の工事を見る', '#/finance', '未入金 入金待ち 請求済み 督促'],
    ['期限切れの見積を見る', '#/schedule', '期限切れ 有効期限 期限'],
    ['今日の予定を見る', '#/schedule', '今日 予定 スケジュール'],
    ['下書きの見積を見る', '#/docs/draft', '下書き 未確定 未対応'],
    ['確定済み（送った）見積を見る', '#/docs/issued', '確定 送った 発行済み 回答待ち'],
    ['顧客を登録する', '#/clients', '顧客 登録 新規'],
    ['ホームを編集する', '#/home?edit', 'ホーム ウィジェット 編集 カスタマイズ'],
    ['現場写真を登録する（工事を開いて「写真」）', '#/sites', '写真 現場写真 撮影'],
    ['先月の売上・粗利を見る', '#/finance', '先月 売上 粗利 月別'],
    ['自社情報・会社印を変える', '#/settings/company', '会社 自社 角印 ロゴ']
  ];

  function score(q, text) {
    var t = norm(text); if (!q) return 1;
    if (t.indexOf(q) === 0) return 3;
    if (t.indexOf(q) >= 0) return 2;
    // 語ごとの一致（「先月 未入金」など）
    var parts = q.split(/\s+/).filter(Boolean);
    return parts.length > 1 && parts.every(function (p) { return t.indexOf(norm(p)) >= 0; }) ? 1 : 0;
  }

  function search(qRaw) {
    var q = norm(qRaw), out = [], S = EE.S;
    function add(group, label, sub, href, extra, text) { var s = score(q, (text || '') + ' ' + label + ' ' + (sub || '')); if (s) out.push(Object.assign({ group: group, label: label, sub: sub, href: href, s: s }, extra || {})); }
    ACTIONS.forEach(function (a) { add('操作', a[0], '', a[1], { icon: 'spark' }, a[2]); });
    // 桜ミツ版：業務管理の機能
    if (EE.link) LINK_ACTIONS.forEach(function (a) { add('操作', a[0], '', a[1], { icon: 'spark' }, a[2]); });
    EE.features.FEATURES.forEach(function (f) {
      var sec = EE.features.sectionOf(f.section) || {};
      add('機能', f.name, sec.label + (f.status === 'planned' ? '・準備中（第' + f.phase + '期で追加）' : ''), f.href, { icon: f.status === 'planned' ? 'clock' : (sec.icon || 'grid'), planned: f.status === 'planned' }, f.words);
    });
    if (q) {
      S.customers.forEach(function (c) { add('顧客', c.name + ' ' + (c.honorific || ''), c.address || c.tel || '', '#/clients', { icon: 'users', cid: c.id }, c.contact + ' ' + c.tel + ' ' + (c.memo || '')); });
      S.projects.forEach(function (p) { add('工事', p.name, (U.findCustomer(p.customerId) || {}).name || '', '#/site/' + p.id, { icon: 'site' }, p.site + ' ' + (p.note || '')); });
      S.documents.forEach(function (d) { add('書類', (d.title || '（件名なし）') + (d.patternLabel ? '（' + d.patternLabel + '）' : ''), (d.no || '') + '　' + U.yen(U.calcDoc(d).total), '#/edit/' + d.id, { icon: 'docs' }, d.no + ' ' + (U.docCustomer(d).name || '')); });
      S.items.forEach(function (it) { add('工事項目', it.name, it.code + '　' + U.yen(it.unitPrice) + '/' + it.unit, '#/settings/items', { icon: 'box' }, it.code + ' ' + (it.synonyms || []).join(' ')); });
    }
    var order = { '操作': 0, '機能': 1, '工事': 2, '顧客': 3, '書類': 4, '工事項目': 5 };
    out.sort(function (a, b) { return (b.s - a.s) || (a.planned ? 1 : 0) - (b.planned ? 1 : 0) || order[a.group] - order[b.group]; });
    return out.slice(0, q ? 40 : 14);
  }

  var api = null;
  function open() {
    if (api) return;
    var sel = 0, items = [];
    api = U.modal({
      title: 'すべての機能を検索', wide: true,
      body: '<div class="pal"><div class="search pal-in">' + I.search + '<input class="input" id="pal-q" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" autocomplete="off" placeholder="例：現場写真・発注書・未入金・工程表・保証期限・顧客名・見積番号" autofocus></div>' +
        '<div class="pal-list" id="pal-list" role="listbox" aria-label="検索結果"></div><div class="hint pal-foot">↑↓ で選ぶ　Enter で開く　Esc で閉じる　（準備中の機能は「第N期で追加」と表示）</div></div>',
      onMount: function (el, m) {
        var inp = el.querySelector('#pal-q'), list = el.querySelector('#pal-list');
        function draw() {
          items = search(inp.value); sel = Math.min(sel, Math.max(0, items.length - 1));
          var g = '';
          list.innerHTML = items.length ? items.map(function (x, i) {
            var head = x.group !== g ? '<div class="pal-group">' + esc(x.group) + '</div>' : ''; g = x.group;
            return head + '<div class="pal-item' + (i === sel ? ' on' : '') + (x.planned ? ' planned' : '') + '" role="option" id="pal-o' + i + '" aria-selected="' + (i === sel) + '" data-i="' + i + '">' + (I[x.icon] || '') +
              '<span><b>' + esc(x.label) + '</b>' + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</span>' + (x.planned ? '<span class="badge">準備中</span>' : '<span class="hint">開く</span>') + '</div>';
          }).join('') : '<p class="hint" style="padding:12px">見つかりませんでした。別の言い方でも探してみてください</p>';
          inp.setAttribute('aria-activedescendant', items.length ? 'pal-o' + sel : '');
          var on = list.querySelector('.pal-item.on'); if (on) on.scrollIntoView({ block: 'nearest' });
        }
        function go(i) {
          var x = items[i]; if (!x) return;
          if (x.planned || !x.href) { EE.fx.toast('「' + x.label + '」は' + (x.sub || '準備中') + 'です', { ms: 3500 }); return; }
          m.close(); location.hash = x.href;
        }
        inp.addEventListener('input', function () { sel = 0; draw(); });
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); draw(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
          else if (e.key === 'Enter') { e.preventDefault(); go(sel); }
        });
        list.addEventListener('click', function (e) { var it = e.target.closest('[data-i]'); if (it) go(Number(it.dataset.i)); });
        draw();
      },
      onClose: function () { api = null; }
    });
  }

  // Ctrl+K / ⌘K（入力中でも開ける）
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      if (!EE.S || document.getElementById('auth')) return;   // サインイン前は開かない
      e.preventDefault(); open();
    }
  });

  EE.palette = { open: open, search: search };
})(this);
