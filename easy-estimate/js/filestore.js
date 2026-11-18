/*
 * 取り込んだ原本（PDF・画像）と読み取り結果の保存（ブラウザ内の IndexedDB）
 * localStorage は容量が小さいため、ファイル本体はこちらに置く。外部には送らない。
 * record: { id, name, type, size, createdAt, blob, result, method:'pdf-text'|'pdf-ocr'|'image-ocr', docIds:[] }
 */
(function (root) {
  'use strict';
  var DB = 'oumitsu-files', STORE = 'imports';

  function open() {
    return new Promise(function (resolve, reject) {
      if (!root.indexedDB) return reject(new Error('このブラウザではファイルを保存できません'));
      var req = root.indexedDB.open(DB, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE, { keyPath: 'id' }); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode), st = t.objectStore(STORE), out;
        var r = fn(st);
        if (r) r.onsuccess = function () { out = r.result; };
        t.oncomplete = function () { resolve(out); db.close(); };
        t.onerror = function () { reject(t.error); db.close(); };
      });
    });
  }
  function put(rec) { return tx('readwrite', function (st) { return st.put(rec); }).then(function () { return rec.id; }); }
  function get(id) { return tx('readonly', function (st) { return st.get(id); }); }
  function list() {
    return tx('readonly', function (st) { return st.getAll(); }).then(function (all) {
      return (all || []).map(function (r) { return { id: r.id, name: r.name, type: r.type, size: r.size, createdAt: r.createdAt, method: r.method, rows: r.result && r.result.rows ? r.result.rows.length : 0, docIds: r.docIds || [] }; })
        .sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    });
  }
  function remove(id) { return tx('readwrite', function (st) { return st.delete(id); }); }
  function linkDoc(id, docId) {
    return get(id).then(function (r) { if (!r) return; r.docIds = (r.docIds || []).concat([docId]); return put(r); });
  }
  /** 原本を新しいタブで開く（ダウンロードではなく表示） */
  function openOriginal(id) {
    return get(id).then(function (r) {
      if (!r) throw new Error('原本が見つかりません（この端末に保存されていない可能性があります）');
      var url = URL.createObjectURL(r.blob);
      var w = root.open(url, '_blank', 'noopener');
      if (!w) { var a = document.createElement('a'); a.href = url; a.download = r.name; document.body.appendChild(a); a.click(); a.remove(); }
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    });
  }

  root.EE = root.EE || {};
  root.EE.filestore = { put: put, get: get, list: list, remove: remove, linkDoc: linkDoc, openOriginal: openOriginal };
})(this);
