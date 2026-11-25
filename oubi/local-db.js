/*
 * 業務管理：この端末だけの保存先（桜ミツ版で使う。supa.js の代わり）
 *   業務管理の画面は「共有モード」と同じ作りで動かし、保存先だけをこの端末にする。
 *   ・記録：localStorage（種類ごとに oubi.ldb.<種類>）。同じ端末の別のタブには storage イベントで届く
 *   ・写真・書類：IndexedDB（oubi-local-files）。画面には、その場で作る一時的なアドレスで出す
 *   ・使う人：この端末の「自分」（ログインはない）。名前は桜ミツの設定で変える
 *   社員とは共有しない。端末を替えるとき・ブラウザの記録を消すときは、桜ミツの「データ」でバックアップする。
 */
(function () {
  'use strict';
  window.OUBI_SUPA = false;
  window.OUBI_LOCAL = true;
  var PRE = 'oubi.ldb.';
  var NOKEEP = { usage: 1, vitals: 1, errlog: 1, feedback: 1 };
  /* 営業の機能は桜ミツ版からなくした（2026-11-22）。営業の記録（訪問・再訪問・下書き・地図の控えなど）は
     読み込むたびにこの端末から消し、新しくも保存しない（前のバックアップから戻しても、次の読み込みで消える） */
  var GONE_COL = { visits: 1 };
  function purgeSales() {
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k === PRE + 'visits' || /^oubi\.(visits\.v1|slout\.v1|slpostout\.v1|slsun|autorv|muni\.v1)$/.test(k) || /^oubi\.(sldraft|wonSeen)\./.test(k)) localStorage.removeItem(k);
      });
      var pd = JSON.parse(localStorage.getItem('oubi.pendel.v1') || 'null');
      if (Array.isArray(pd) && pd.some(function (x) { return x && x.col === 'visits'; })) localStorage.setItem('oubi.pendel.v1', JSON.stringify(pd.filter(function (x) { return !x || x.col !== 'visits'; })));
    } catch (e) {}
  }
  purgeSales();
  window.OUBI_PURGE_SALES = purgeSales;
  function read(col) { try { return JSON.parse(localStorage.getItem(PRE + col)) || {}; } catch (e) { return {}; } }
  function write(col, o) {
    try { localStorage.setItem(PRE + col, JSON.stringify(o)); return true; }
    catch (e) { if (window.toast) window.toast('この端末の保存場所がいっぱいです。古い写真やいらない記録を消すか、「データ」でバックアップしてから整理してください'); return false; }
  }
  var listeners = [];
  function emit(col) { listeners.forEach(function (l) { if (!col || l.col === col) l.run(); }); }
  window.addEventListener('storage', function (e) { if (e.key && e.key.indexOf(PRE) === 0) emit(e.key.slice(PRE.length)); });

  function query(col, order, limit) {
    return {
      orderBy: function (f, dir) { return query(col, [f, dir || 'asc'], limit); },
      limit: function (n) { return query(col, order, n); },
      onSnapshot: function (cb) {
        var run = function () {
          var o = read(col), list = Object.keys(o).map(function (id) { return { id: id, data: o[id] }; });
          if (order) list.sort(function (a, b) { return String((a.data || {})[order[0]] || '').localeCompare(String((b.data || {})[order[0]] || '')) * (order[1] === 'desc' ? -1 : 1); });
          if (limit) list = list.slice(0, limit);
          try { cb({ docs: list.map(function (r) { return { id: r.id, data: function () { return r.data; } }; }) }); } catch (e) { console.error(e); }
        };
        var l = { col: col, run: run }; listeners.push(l); setTimeout(run, 0);
        return function () { listeners = listeners.filter(function (x) { return x !== l; }); };
      }
    };
  }
  var db = {
    collection: function (col) { return query(col); },
    doc: function (path) {
      var i = path.indexOf('/'), col = path.slice(0, i), id = path.slice(i + 1);
      return {
        set: function (data) {
          if (NOKEEP[col] || GONE_COL[col]) return Promise.resolve();   // 営業の記録は保存しない   // 使われ方・速さ・不具合の記録は、この端末では残さない（保存場所を使い切らないように）
          var o = read(col); o[id] = JSON.parse(JSON.stringify(data));
          if (!write(col, o)) return Promise.reject({ code: 'quota', message: 'storage full' });
          setTimeout(function () { emit(col); }, 0); return Promise.resolve();
        },
        delete: function () { var o = read(col); delete o[id]; write(col, o); setTimeout(function () { emit(col); }, 0); return Promise.resolve(); },
        onSnapshot: function (cb) {
          var run = function () { var r = read(col)[id]; cb({ exists: r != null, id: id, data: function () { return r; } }); };
          var l = { col: col, run: run }; listeners.push(l); setTimeout(run, 0);
          return function () { listeners = listeners.filter(function (x) { return x !== l; }); };
        }
      };
    }
  };

  /* ---------- 写真・書類（IndexedDB） ---------- */
  var dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise(function (ok, ng) {
      if (!window.indexedDB) { ng(new Error('no indexedDB')); return; }
      var r = indexedDB.open('oubi-local-files', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('files'); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { ng(r.error); };
    });
    return dbp;
  }
  function tx(mode, fn) { return idb().then(function (d) { return new Promise(function (ok, ng) { var t = d.transaction('files', mode), s = t.objectStore('files'), q = fn(s); t.oncomplete = function () { ok(q && q.result); }; t.onerror = function () { ng(t.error); }; }); }); }
  var OK_TYPE = /^(application\/pdf|image\/)/;
  var assets = {
    upload: function (file) {
      if (!OK_TYPE.test(file.type || '')) return Promise.reject({ code: 'unsupported_type' });
      if (file.size > 20 * 1024 * 1024) return Promise.reject({ code: 'too_large' });
      var ext = (String(file.name || '').match(/\.[A-Za-z0-9]{1,6}$/) || [''])[0].toLowerCase();
      var id = new Date().toISOString().slice(0, 7) + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + ext;
      return tx('readwrite', function (s) { return s.put({ blob: file, type: file.type, name: file.name || '', size: file.size, at: new Date().toISOString() }, id); })
        .then(function () { return { id: id, url: '', sizeBytes: file.size, contentType: file.type }; })
        .catch(function () { return Promise.reject({ code: 'network', message: 'この端末に写真を保存できませんでした' }); });
    }
  };
  // 画面の <img src> などは、置き場所の印を入れておき、あとで一時的なアドレスに差し替える
  var urls = {}, PH = 'about:blank#oubi-local:';
  window.SUPA_BLOB = function (id) { return urls[id] || PH + encodeURIComponent(id); };
  function fill() {
    var els = [].slice.call(document.querySelectorAll('[src^="' + PH + '"],[href^="' + PH + '"]'));
    els.forEach(function (e) {
      var attr = e.hasAttribute('src') ? 'src' : 'href', id = decodeURIComponent(e.getAttribute(attr).slice(PH.length));
      if (urls[id]) { e.setAttribute(attr, urls[id]); return; }
      tx('readonly', function (s) { return s.get(id); }).then(function (r) {
        if (!r || !r.blob) return; urls[id] = urls[id] || URL.createObjectURL(r.blob);
        document.querySelectorAll('[' + attr + '="' + PH + encodeURIComponent(id) + '"]').forEach(function (x) { x.setAttribute(attr, urls[id]); });
      }).catch(function () {});
    });
  }
  var fillT = null;
  new MutationObserver(function () { clearTimeout(fillT); fillT = setTimeout(fill, 30); }).observe(document.documentElement, { subtree: true, childList: true });

  /* ---------- 使う人：この端末の「自分」（ログインはない） ----------
     自分＝社員の名簿の1人（id は oubi.local.me に覚える）。名前は 設定 → 自分の名前 でいつでも変えられる。
     決め方（最初の1回）：①前の桜ミツのアカウントがあれば、その人（id と名前をそのまま引き継ぐ。ほかのアカウントも社員に入れる）
                          ②社員の名簿があれば、その先頭の1人 ③どちらも無ければ、名前の空いた「自分」を作る
     ①のあと、アカウントの保存データ（パスワードのハッシュなど）は消す。工事・見積の記録には触らない。 */
  var ME_KEY = 'oubi.local.me', AUTH_KEYS = ['oumitsu:auth:v1', 'oumitsu:auth:lock', 'oumitsu:keep', 'oumitsu:lock'];
  function lsJson(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function ensureStaff(id, name) {
    var st = read('staff');
    if (!st[id]) { st[id] = { name: name || '', createdAt: new Date().toISOString(), at: new Date().toISOString() }; write('staff', st); return true; }
    if (!st[id].name && name) { st[id].name = name; write('staff', st); return true; }
    return false;
  }
  function resolveMe() {
    var saved = lsJson(ME_KEY);
    if (saved && saved.id) { ensureStaff(saved.id, ''); return saved.id; }
    var id = null, auth = lsJson('oumitsu:auth:v1');
    if (auth && auth.users && auth.users.length) {
      var sid = ((lsJson('oumitsu:keep') || {}).uid) || (function () { try { return (JSON.parse(sessionStorage.getItem('oumitsu:session')) || {}).uid; } catch (e) { return null; } })();
      var u = auth.users.filter(function (x) { return x.id === sid; })[0] || auth.users[0];
      auth.users.forEach(function (x) { ensureStaff(x.id, x.name); });
      id = u.id;
    } else {
      var st = read('staff'), ids = Object.keys(st).sort(function (a, b) { return String(st[a].createdAt || '').localeCompare(String(st[b].createdAt || '')); });
      id = ids[0] || ('me_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
      ensureStaff(id, '');
    }
    try { localStorage.setItem(ME_KEY, JSON.stringify({ id: id })); } catch (e) {}
    // アカウントの保存データは、引き継いだあと消す
    AUTH_KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    try { sessionStorage.removeItem('oumitsu:session'); } catch (e) {}
    return id;
  }
  var meId = resolveMe();
  function meObj() { var st = read('staff'); return { id: meId, isOwner: true, name: (st[meId] || {}).name || '' }; }
  var user = { me: function () { return Promise.resolve(meObj()); }, isOwner: function () { return true; }, profiles: function () { return Promise.resolve({}); } };
  /** 桜ミツの設定から：自分の名前・自分をだれにするか */
  window.OUBI_LOCAL_ME = {
    get: meObj,
    setName: function (name) { var st = read('staff'); st[meId] = Object.assign({ createdAt: new Date().toISOString() }, st[meId], { name: String(name || '').trim(), at: new Date().toISOString() }); write('staff', st); emit('staff'); },
    choose: function (id) { if (!id || id === meId) return; meId = id; try { localStorage.setItem(ME_KEY, JSON.stringify({ id: id })); } catch (e) {} ensureStaff(id, ''); }
  };
  window.OUBI_LOCAL_SET_ME = function () {};   // 以前の呼び出し（ログインした人を渡す）は使わない

  var caps = { db: db, user: user, assets: assets };
  window.claude = { use: function (n) { return Promise.resolve(caps[n] || null); } };
  // バックアップ用：写真をまとめて取り出す・戻す（桜ミツの「データ」から使う）
  window.OUBI_LOCAL_FILES = {
    all: function () { return tx('readonly', function (s) { return s.getAll(); }).then(function (vals) { return tx('readonly', function (s) { return s.getAllKeys(); }).then(function (keys) { return keys.map(function (k, i) { return { id: k, rec: vals[i] }; }); }); }); },
    put: function (id, rec) { return tx('readwrite', function (s) { return s.put(rec, id); }); },
    get: function (id) { return tx('readonly', function (s) { return s.get(id); }); }
  };
})();
