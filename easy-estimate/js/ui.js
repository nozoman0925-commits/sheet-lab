/* 画面共通の部品：アイコン・書式・モーダル・確認ダイアログ・状態アクセス */
(function (root) {
  'use strict';
  var EE = root.EE;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function yen(n) { var v = Math.round(Number(n) || 0); return (v < 0 ? '−¥' : '¥') + Math.abs(v).toLocaleString('ja-JP'); }
  function num(n) { return (Number(n) || 0).toLocaleString('ja-JP', { maximumFractionDigits: 2 }); }
  function pct(r) { return r == null ? '—' : (r * 100).toFixed(1) + '%'; }
  function jdate(s) { return s ? s.replace(/-/g, '/') : '—'; }
  function norm(s) { return String(s || '').normalize('NFKC').toLowerCase(); }
  function daysFromToday(s) {
    var d = EE.check.parseDate(s); if (!d) return null;
    var t = EE.check.parseDate(EE.data.today());
    return Math.round((d - t) / 86400000);
  }

  var P = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  var I = {
    home: P('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/>'),
    docs: P('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>'),
    plus: P('<path d="M12 5v14M5 12h14"/>'),
    users: P('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.5 5.2"/>'),
    gear: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    search: P('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    save: P('<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>'),
    check: P('<path d="M9 11.5 11.5 14 16 9"/><path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6z"/>'),
    pdf: P('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>'),
    lock: P('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    trash: P('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    up: P('<path d="m6 15 6-6 6 6"/>'),
    down: P('<path d="m6 9 6 6 6-6"/>'),
    copy: P('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'),
    edit: P('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
    refresh: P('<path d="M20 11a8 8 0 0 0-14.7-4.3L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.7 4.3L21 15"/><path d="M21 20v-5h-5"/>'),
    box: P('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
    yen: P('<path d="m6 3 6 8 6-8M12 11v10M7 12h10M7 16h10"/>'),
    clock: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    chart: P('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    file: P('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
    stamp: P('<path d="M12 3a3 3 0 0 0-3 3c0 2 1.5 3 1.5 5H8a3 3 0 0 0-3 3v2h14v-2a3 3 0 0 0-3-3h-2.5c0-2 1.5-3 1.5-5a3 3 0 0 0-3-3z"/><path d="M5 20h14"/>'),
    branch: P('<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M6 8.5v7M18 10.5c0 4-6 3-10.5 6"/>'),
    download: P('<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>'),
    upload: P('<path d="M12 20V9M7 14l5-5 5 5M4 4h16"/>'),
    spark: P('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
    x: P('<path d="M6 6l12 12M18 6 6 18"/>')
  };

  /* ---- 状態 ---- */
  var listeners = [];
  function commit() {
    var ok = EE.data.save(EE.S);
    if (!ok) EE.fx.toast('ブラウザに保存できませんでした（容量不足の可能性）', { warn: true, ms: 4000 });
    listeners.forEach(function (f) { f(); });
    return ok;
  }
  function onCommit(f) { listeners.push(f); }

  function findItem(id) { return EE.S.items.filter(function (x) { return x.id === id; })[0]; }
  function findCustomer(id) { return EE.S.customers.filter(function (x) { return x.id === id; })[0]; }
  function findProject(id) { return EE.S.projects.filter(function (x) { return x.id === id; })[0]; }
  function findDoc(id) { return EE.S.documents.filter(function (x) { return x.id === id; })[0]; }

  /** 計算ルール：発行済みは発行時のルールで固定、下書きは現在の設定 */
  function rulesFor(doc) { return (doc.status === 'issued' && doc.rules) ? doc.rules : EE.S.settings; }
  function calcDoc(doc) { return EE.engine.calc(doc, rulesFor(doc)); }
  function checkDoc(doc) {
    return EE.check.run(doc, {
      items: EE.S.items, customers: EE.S.customers, projects: EE.S.projects, documents: EE.S.documents,
      company: EE.S.company, settings: Object.assign({}, EE.S.settings, rulesFor(doc)), today: EE.data.today()
    });
  }

  /* ---- モーダル ---- */
  var stack = [];
  function modal(o) {
    var ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = '<div class="panel modal' + (o.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' +
      '<div class="panel-h"><h2>' + esc(o.title) + '</h2><div class="spacer"></div>' +
      '<button class="btn ghost icon sm" data-x title="閉じる (Esc)">' + I.x + '</button></div>' +
      '<div class="panel-b">' + (o.body || '') + '</div>' +
      (o.foot ? '<div class="modal-f">' + o.foot + '</div>' : '') + '</div>';
    document.body.appendChild(ov);
    var m = ov.firstChild;
    EE.fx.anim(ov, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    EE.fx.anim(m, [{ opacity: 0, transform: 'translateY(12px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
    var api = {
      el: m,
      close: function (v) {
        var i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
        if (o.onClose) o.onClose(v);
        if (EE.fx.reduce || !ov.animate) return ov.remove();
        var a = ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' });
        a.onfinish = function () { ov.remove(); };
      }
    };
    stack.push(api);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) api.close(); });
    m.querySelector('[data-x]').onclick = function () { api.close(); };
    if (o.onMount) o.onMount(m, api);
    var f = m.querySelector('[autofocus], .panel-b .input');
    if (f) setTimeout(function () { f.focus(); }, 30);
    return api;
  }
  function topModal() { return stack[stack.length - 1]; }

  function confirmBox(msg, ok, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var done = false;
      var m = modal({
        title: opts.title || '確認',
        body: '<div style="white-space:pre-wrap;color:var(--text-2)">' + esc(msg) + '</div>',
        foot: '<button class="btn ghost" data-no>キャンセル</button><button class="btn ' + (opts.danger ? 'danger' : 'primary') + '" data-ok autofocus>' + esc(ok || 'OK') + '</button>',
        onClose: function () { if (!done) resolve(false); },
        onMount: function (el, api) {
          el.querySelector('[data-no]').onclick = function () { api.close(); };
          el.querySelector('[data-ok]').onclick = function () { done = true; resolve(true); api.close(); };
          setTimeout(function () { el.querySelector('[data-ok]').focus(); }, 30);
        }
      });
    });
  }

  /** フォームの値をまとめて読む（name 属性） */
  function readForm(el) {
    var o = {};
    el.querySelectorAll('[name]').forEach(function (f) {
      if (f.type === 'checkbox') o[f.name] = f.checked;
      else if (f.type === 'number') o[f.name] = f.value === '' ? null : Number(f.value);
      else o[f.name] = f.value.trim();
    });
    return o;
  }

  function opt(v, label, sel) { return '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function options(map, sel) { return Object.keys(map).map(function (k) { return opt(k, typeof map[k] === 'string' ? map[k] : map[k].label, sel); }).join(''); }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function statusBadge(doc) {
    if (doc.status === 'issued') return '<span class="badge blue"><span class="d"></span>発行済み</span>';
    return '<span class="badge"><span class="d" style="background:var(--muted);box-shadow:none"></span>下書き</span>';
  }
  function validBadge(doc) {
    var d = daysFromToday(doc.validUntil);
    if (d == null) return '<span class="badge err">未設定</span>';
    if (d < 0) return '<span class="badge err">期限切れ</span>';
    if (d <= 7) return '<span class="badge warn">あと' + d + '日</span>';
    return '<span class="muted">' + jdate(doc.validUntil) + '</span>';
  }

  EE.ui = { esc: esc, yen: yen, num: num, pct: pct, jdate: jdate, norm: norm, daysFromToday: daysFromToday, I: I,
    commit: commit, onCommit: onCommit, findItem: findItem, findCustomer: findCustomer, findProject: findProject, findDoc: findDoc,
    rulesFor: rulesFor, calcDoc: calcDoc, checkDoc: checkDoc, modal: modal, topModal: topModal, confirmBox: confirmBox,
    readForm: readForm, opt: opt, options: options, download: download, statusBadge: statusBadge, validBadge: validBadge };
})(this);
