/* テスト用：supa.js の代わりに読み込む「共有モード」のまね（本番の Supabase には一切つながない）
   記録は localStorage の 'mock.db' に入れ、再読み込みしても残る。
   別タブの変更は storage イベントで届く（Supabase の「すぐ届く」のまね）。 */
(function () {
  'use strict';
  window.OUBI_SUPA = false;
  var KEY = 'mock.db';
  function all() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function put(o) { localStorage.setItem(KEY, JSON.stringify(o)); }
  var listeners = [];
  function emitAll() { listeners.forEach(function (l) { l(); }); }
  window.addEventListener('storage', function (e) { if (e.key === KEY) emitAll(); });
  function rows(col) { var c = all()[col] || {}; return Object.keys(c).map(function (id) { return { id: id, data: c[id] }; }); }
  function query(col, order, limit) {
    return {
      orderBy: function (f, dir) { return query(col, [f, dir || 'asc'], limit); },
      limit: function (n) { return query(col, order, n); },
      onSnapshot: function (cb) {
        var run = function () {
          var list = rows(col);
          if (order) list.sort(function (a, b) { return String((a.data || {})[order[0]] || '').localeCompare(String((b.data || {})[order[0]] || '')) * (order[1] === 'desc' ? -1 : 1); });
          if (limit) list = list.slice(0, limit);
          cb({ docs: list.map(function (r) { return { id: r.id, data: function () { return r.data; } }; }) });
        };
        listeners.push(run); setTimeout(run, 0);
        return function () { listeners = listeners.filter(function (x) { return x !== run; }); };
      }
    };
  }
  var db = {
    collection: function (col) { return query(col); },
    doc: function (path) {
      var i = path.indexOf('/'), col = path.slice(0, i), id = path.slice(i + 1);
      return {
        set: function (data) {
          if (window.MOCK_FAIL) return Promise.reject({ code: 'network', message: 'mock offline' });
          var o = all(); (o[col] = o[col] || {})[id] = JSON.parse(JSON.stringify(data)); put(o);
          setTimeout(emitAll, 0); return Promise.resolve();
        },
        delete: function () { var o = all(); if (o[col]) delete o[col][id]; put(o); setTimeout(emitAll, 0); return Promise.resolve(); },
        onSnapshot: function (cb) {
          var run = function () { var r = (all()[col] || {})[id]; cb({ exists: r != null, id: id, data: function () { return r; } }); };
          listeners.push(run); setTimeout(run, 0);
          return function () { listeners = listeners.filter(function (x) { return x !== run; }); };
        }
      };
    }
  };
  var me = window.MOCK_ME || { id: 'u_tester', isOwner: true, name: 'テスト太郎' };
  var user = { me: function () { return Promise.resolve(me); }, isOwner: function () { return me.isOwner; }, profiles: function () { return Promise.resolve({}); } };
  var assets = {
    upload: function (file) {
      return new Promise(function (ok) {
        var r = new FileReader();
        r.onload = function () { var id = 'mock/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); var o = all(); (o.__files = o.__files || {})[id] = { name: file.name, type: file.type, size: file.size }; put(o); ok({ id: id, url: '', sizeBytes: file.size, contentType: file.type }); };
        r.readAsDataURL(file);
      });
    }
  };
  window.SUPA_BLOB = function () { return 'about:blank'; };
  var caps = { db: db, user: user, assets: assets };
  window.claude = { use: function (n) { return Promise.resolve(caps[n] || null); } };
})();
