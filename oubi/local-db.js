/*
 * 業務管理：この端末だけの保存先（桜ミツ版で使う。supa.js の代わり）
 *   業務管理の画面は「共有モード」と同じ作りで動かし、保存先だけをこの端末にする。
 *   ・記録：localStorage（種類ごとに oubi.ldb.<種類>）。同じ端末の別のタブには storage イベントで届く
 *   ・写真・書類：IndexedDB（oubi-local-files）。画面には、その場で作る一時的なアドレスで出す
 *   ・使う人：桜ミツでログインした人（親の画面の EE.auth）。初めての人は社員の名簿に自動で入れる
 *   社員とは共有しない。端末を替えるとき・ブラウザの記録を消すときは、桜ミツの「データ」でバックアップする。
 */
(function () {
  'use strict';
  window.OUBI_SUPA = false;
  window.OUBI_LOCAL = true;
  var PRE = 'oubi.ldb.';
  var NOKEEP = { usage: 1, vitals: 1, errlog: 1, feedback: 1 };
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
          if (NOKEEP[col]) return Promise.resolve();   // 使われ方・速さ・不具合の記録は、この端末では残さない（保存場所を使い切らないように）
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

  /* ---------- 使う人：桜ミツでログインした人 ---------- */
  var meResolve, mePromise = new Promise(function (r) { meResolve = r; });
  function setMe(u) {
    if (!u || !u.id) return;
    var st = read('staff');
    if (!st[u.id]) { st[u.id] = { name: u.name || 'あなた', createdAt: new Date().toISOString(), at: new Date().toISOString() }; write('staff', st); emit('staff'); }
    meResolve({ id: u.id, isOwner: true, name: u.name || '' });
  }
  window.OUBI_LOCAL_SET_ME = setMe;
  try { var cur = window.parent && window.parent !== window && window.parent.EE && window.parent.EE.auth && window.parent.EE.auth.current(); if (cur) setMe(cur); } catch (e) {}
  var user = { me: function () { return mePromise; }, isOwner: function () { return true; }, profiles: function () { return Promise.resolve({}); } };

  var caps = { db: db, user: user, assets: assets };
  window.claude = { use: function (n) { return Promise.resolve(caps[n] || null); } };
  // バックアップ用：写真をまとめて取り出す・戻す（桜ミツの「データ」から使う）
  window.OUBI_LOCAL_FILES = {
    all: function () { return tx('readonly', function (s) { return s.getAll(); }).then(function (vals) { return tx('readonly', function (s) { return s.getAllKeys(); }).then(function (keys) { return keys.map(function (k, i) { return { id: k, rec: vals[i] }; }); }); }); },
    put: function (id, rec) { return tx('readwrite', function (s) { return s.put(rec, id); }); }
  };
})();
