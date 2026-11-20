/*
 * 桜ミツ版：桜ミツの中に業務管理（営業・工事・カレンダー・ホワイトボード）を入れる
 *   桜ミツの画面の構成（左のメニュー・上の帯・ウィジェットのホーム）はそのまま。
 *   業務管理の画面は oubi.html を枠（iframe）で読み込み、#/o/<画面> のときだけ見せる。
 *   記録はこの端末の中だけ（oubi.html の local-db.js）。見積とのつなぎは mitsu-bridge.js（link モード）。
 * 読む順：桜ミツのプログラム → このファイル → mitsu-bridge.js → 起動
 */
(function (root) {
  'use strict';
  root.OUBI_LINK_MODE = true;
  var EE = root.EE, U = EE.ui;
  var frame = null;
  // 枠の中が万一よそのページに移っていても止まらない（読めないときは null）
  function W() { try { var w = frame && frame.contentWindow; return w && w.location.href && w; } catch (e) { return null; } }
  function O() { try { var w = W(); return w && w.OUBI; } catch (e) { return null; } }

  // 業務管理の画面ごとの見出し・メニューの位置
  var PAGES = {
    sales: ['営業', '訪問の記録・再訪問・ランキング', 'sales'], list: ['工事の一覧', '9工程・進み具合', 'sites'], case: ['工事', '問い合わせから入金・支払いまで', 'sites'],
    new: ['新しい工事', '問い合わせを登録', 'sites'], quick: ['新しい工事', '問い合わせを登録', 'sites'], docs: ['工事の書類', '見積書・契約書・請求書', 'sites'],
    cal: ['カレンダー', '工事・現地調査・再訪問・予定', 'schedule'], wb: ['あしたの予定', 'ホワイトボード', 'schedule'], board: ['タイムライン', '社内の投稿', 'schedule'],
    dash: ['工事の進み・入金', '進行中・要対応・入金待ち', 'finance'], person: ['担当者の数字', '', 'finance'],
    settings: ['目標の粗利率', '工事の利益の判定に使う', 'settings'], staff: ['社員', '名前・電話・写真', 'settings'], profile: ['社員', 'プロフィール', 'settings'],
    setup: ['社員', '登録', 'settings'], help: ['使い方', 'よくある質問', 'settings']
  };
  function page(tab) { return PAGES[tab] || ['業務管理', '', 'home']; }
  var SEC = { estimate: 'quote', cost: 'quote', docs: 'quote', photos: 'invoice', notes: 'log' };

  function whenFrame(fn, tries) {
    var o = O();
    if (o && o.booted && o.booted()) { fn(o); return; }
    if ((tries || 0) > 150) { U && EE.fx.toast('業務管理の画面を読み込めませんでした。再読み込みしてください', { warn: true, ms: 5000 }); return; }
    setTimeout(function () { whenFrame(fn, (tries || 0) + 1); }, 100);
  }
  var lastSent = '', goAt = 0;
  function go(parts) {
    var tab = parts[0] || 'list'; goAt = Date.now();
    whenFrame(function (o) {
      lastSent = tab; goAt = Date.now();
      if (tab === 'case' && parts[1]) o.openCase(parts[1], SEC[parts[2]] || parts[2] || undefined);
      else if (tab === 'new') o.newQuick();
      else if (tab === 'sales') o.go(parts[1] ? 'sales:' + parts[1] : 'sales');
      else o.setTab(tab);
    });
  }

  root.OUBI_LINK = {
    /** app.js の parse() から：#/o/<画面>/... */
    route: function (parts) {
      goAt = Date.now(); lastSent = parts[0] || 'list';   // 切り替えを始めた時から、業務管理の「ホームを描いた」の知らせは無視する
      var pg = page(parts[0] || 'list');
      return { nav: pg[2], view: function () { return { title: pg[0], crumb: pg[1], html: '', oubi: true, mount: function () { go(parts); } }; } };
    },
    /** 業務管理の画面が描かれるたびに（embed.js から） */
    onTab: function (tab, cur) {
      if (!/^#\/o\//.test(location.hash)) return;            // 桜ミツの画面にいるときは、うしろの業務管理の動きで画面を変えない
      // 開いた直後に届く「ホームを描いた」は、業務管理の最初の画面なので無視する（こちらから画面を指定している途中）
      if (tab === 'home' && lastSent !== 'home' && Date.now() - goAt < 2000) return;
      if (tab === 'home') { document.body.classList.remove('ob-on'); location.hash = '#/home'; return; }   // 業務管理の「ホーム」は桜ミツのホーム（ウィジェット）。枠はすぐ隠す
      var h = tab === 'case' && cur && cur.caseId ? '#/o/case/' + cur.caseId : '#/o/' + tab;
      if (h.split('/').slice(0, 3).join('/') !== location.hash.split('/').slice(0, 3).join('/') || (tab === 'case' && h !== location.hash)) {
        EE.app.replaceRoute(h);
        var pg = page(tab);
        var t = document.getElementById('title'), c = document.getElementById('crumb');
        if (t) t.textContent = pg[0]; if (c) c.textContent = pg[1];
        document.title = pg[0] + ' — 桜ミツ';
        EE.app.setNav(pg[2]);
      }
    },
    frame: function () { return frame; },
    /** 起動：業務管理の画面が読み込まれ、見積とのつなぎが整ったら cb（ログインはない） */
    start: function (cb) {
      function begin() {
        var w = W();
        if (!w || !w.OUBI_LOCAL_ME || !w.OUBI) { setTimeout(begin, 60); return; }
        root.OUBI_HOST.start(w.OUBI);
        root.OUBI_HOST.whenReady(cb);
      }
      begin();
    },
    /** 自分（この端末の使う人） */
    me: function () { var w = W(); return w && w.OUBI_LOCAL_ME ? w.OUBI_LOCAL_ME.get() : { id: '', name: '' }; },
    setMyName: function (name) {
      var w = W(); if (!w || !w.OUBI_LOCAL_ME) return;
      w.OUBI_LOCAL_ME.setName(name);
      setTimeout(function () { root.OUBI_HOST.casesChanged(); if (EE.app && EE.app.renderUser) EE.app.renderUser(); }, 300);
    }
  };

  // 枠は最初に作っておく（起動の演出の間に読み込む）。見せるのは #/o/… のときだけ
  function mountFrame() {
    var main = document.querySelector('.main'); if (!main || frame) return;
    frame = document.createElement('iframe');
    frame.id = 'ob-frame'; frame.src = 'oubi.html'; frame.title = '業務管理'; frame.setAttribute('allow', 'geolocation; clipboard-write');
    main.appendChild(frame);
    // 枠の中がよそのページ（地図など）に移ったら、業務管理の画面に戻す
    frame.addEventListener('load', function () {
      var ok = false; try { ok = /oubi\.html/.test(frame.contentWindow.location.href); } catch (e) {}
      if (!ok) location.reload();   // 見積とのつなぎも含めて、まとめて読み込み直す（記録はこの端末に保存済み）
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountFrame); else mountFrame();

  /* ---------- バックアップ（設定 →「バックアップ」）：この端末の記録・見積・写真をまとめて1つのファイルに ---------- */
  var KEYS = /^(oubi\.|easy-estimate|oumitsu:)/;
  function b64(blob) { return new Promise(function (ok) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.readAsDataURL(blob); }); }
  function unb64(s, type) { var bin = atob(s), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: type || '' }); }
  async function make() {
    var ls = {};
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (KEYS.test(k) && !/:corrupt:|:prev$/.test(k)) ls[k] = localStorage.getItem(k); }
    var files = [], w = W();
    if (w && w.OUBI_LOCAL_FILES) {
      var all = await w.OUBI_LOCAL_FILES.all().catch(function () { return []; });
      for (var j = 0; j < all.length; j++) { var r = all[j].rec || {}; if (r.blob) files.push({ id: all[j].id, type: r.type, name: r.name, size: r.size, at: r.at, data: await b64(r.blob) }); }
    }
    return { app: 'oumitsu', kind: 'backup', version: 1, at: new Date().toISOString(), localStorage: ls, files: files };
  }
  async function saveFile(name, text) {
    var dl = root.claude && root.claude.use ? await root.claude.use('downloads').catch(function () { return null; }) : null;
    if (dl) { await dl.save({ filename: name, data: text }); return; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }
  /* 自分の名前の保存（設定の欄と、ホームの「名前を入れてください」の両方） */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-myname-save]'); if (!b) return;
    var box = b.closest('section, .myname'), inp = box && box.querySelector('#my-name, [data-myname]');
    var v = inp ? inp.value.trim() : '';
    if (!v) { if (inp) { inp.classList.add('flag-err'); EE.fx.shake(inp); inp.focus(); } return; }
    root.OUBI_LINK.setMyName(v); EE.fx.toast('名前を「' + v + '」にしました');
    if (b.closest('.myname')) setTimeout(function () { EE.app.rerender(); }, 400);
  });
  /** ホームの上：名前がまだ無いときだけ、小さく出す（ほかの操作は止めない） */
  EE.linkNameBanner = function () {
    if (root.OUBI_LINK.me().name) return '';
    return '<div class="panel myname" data-st style="margin-bottom:14px;padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
      '<span style="color:var(--text-2)">名前を入れてください（工事や記録の「だれ」に入ります）</span>' +
      '<input class="input" data-myname placeholder="例：青木 誠" style="max-width:220px;height:36px" aria-label="自分の名前">' +
      '<button class="btn sm primary" data-myname-save>保存</button></div>';
  };
  EE.linkBackup = {
    html: function () {
      var me = root.OUBI_LINK.me();
      return '<section class="panel" data-st style="margin-bottom:18px"><div class="panel-h"><h2>自分の名前</h2></div><div class="panel-b">' +
        '<p style="margin:0 0 12px;color:var(--text-2);line-height:1.7">工事の作成者・担当・営業の記録・投稿の「だれ」に入ります。いつでも変えられます。</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><input class="input" id="my-name" value="' + U.esc(me.name) + '" placeholder="例：青木 誠" style="max-width:320px" aria-label="自分の名前">' +
        '<button class="btn primary" data-myname-save>' + U.I.save + '保存</button></div></div></section>' +
        '<section class="panel" data-st><div class="panel-h"><h2>この端末の記録のバックアップ</h2></div><div class="panel-b">' +
        '<p style="margin:0 0 12px;color:var(--text-2);line-height:1.7">この版は、記録をこの端末（このブラウザ）の中だけに保存します。社員とは共有されません。<br>' +
        'ブラウザの記録を消す・端末を替える・別のブラウザで開くと、記録は見えなくなります。ときどき、ここでバックアップを保存してください。<br>' +
        '入るもの：工事・営業の記録・ホワイトボード・カレンダーの予定・見積・品目マスタ・自分の名前・工事の写真。</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-bk="save">' + U.I.download + 'バックアップを保存</button>' +
        '<label class="btn">' + U.I.upload + 'バックアップから戻す<input type="file" accept=".json,application/json" data-bk="load" hidden></label></div>' +
        '<p class="hint" id="bk-msg" role="status" style="margin-top:12px"></p></div></section>';
    },
    mount: function (view) {
      var msg = function (t) { var m = view.querySelector('#bk-msg'); if (m) m.textContent = t; };
      view.addEventListener('click', async function (e) {
        var b = e.target.closest('[data-bk="save"]'); if (!b) return;
        b.disabled = true; msg('まとめています…');
        try {
          var data = JSON.stringify(await make());
          await saveFile('桜ミツ_バックアップ_' + EE.data.today() + '.json', data);
          msg('保存しました（' + Math.round(data.length / 1024) + 'KB）');
        } catch (err) { msg(err && err.code === 'declined' ? '保存をやめました' : '保存できませんでした（' + ((err && (err.message || err.code)) || '不明') + '）'); }
        b.disabled = false;
      });
      view.addEventListener('change', async function (e) {
        var inp = e.target.closest('[data-bk="load"]'); if (!inp || !inp.files[0]) return;
        try {
          var o = JSON.parse(await inp.files[0].text());
          if (!o || o.app !== 'oumitsu' || o.kind !== 'backup' || !o.localStorage) throw new Error('桜ミツのバックアップではありません');
          if (!(await U.confirmBox('バックアップ（' + String(o.at || '').slice(0, 10) + '）の内容で、この端末の記録を置き換えますか？\n今の記録は消えます。', '置き換える', { danger: true }))) { inp.value = ''; return; }
          Object.keys(localStorage).filter(function (k) { return KEYS.test(k); }).forEach(function (k) { localStorage.removeItem(k); });
          Object.keys(o.localStorage).forEach(function (k) { if (KEYS.test(k)) localStorage.setItem(k, o.localStorage[k]); });
          var w = W();
          if (w && w.OUBI_LOCAL_FILES) for (var i = 0; i < (o.files || []).length; i++) { var f = o.files[i]; await w.OUBI_LOCAL_FILES.put(f.id, { blob: unb64(f.data, f.type), type: f.type, name: f.name, size: f.size, at: f.at }); }
          msg('戻しました。読み込み直します…'); setTimeout(function () { location.reload(); }, 600);
        } catch (err) { msg('戻せませんでした：' + (err.message || err)); inp.value = ''; }
      });
    }
  };
})(this);
