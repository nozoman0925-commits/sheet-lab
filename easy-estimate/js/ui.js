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

  /*
   * アイコン：ポップで丸いシルエット（太めの線・丸い線端と角・角丸の図形）。色は currentColor のまま
   */
  var P = function (d) { return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  var I = {
    home: P('<path d="M4 11.4 10.9 5.5a1.7 1.7 0 0 1 2.2 0L20 11.4"/><path d="M6 10.2v8.1A2.2 2.2 0 0 0 8.2 20.5h7.6a2.2 2.2 0 0 0 2.2-2.2v-8.1"/><path d="M10 20.5v-3.7a2 2 0 0 1 4 0v3.7"/>'),
    docs: P('<path d="M8 3.5h5.3a2 2 0 0 1 1.4.6l3.7 3.7a2 2 0 0 1 .6 1.4v8.8a2.5 2.5 0 0 1-2.5 2.5H8a2.5 2.5 0 0 1-2.5-2.5V6A2.5 2.5 0 0 1 8 3.5z"/><path d="M13.5 3.8v2.7a2 2 0 0 0 2 2h2.7"/><path d="M9 13h5.5M9 16.5h3.5"/>'),
    plus: P('<path d="M12 6.2v11.6M6.2 12h11.6"/>'),
    users: P('<circle cx="9" cy="8.5" r="3.6"/><path d="M3.2 19.4c.5-3.2 2.9-5.2 5.8-5.2s5.3 2 5.8 5.2"/><path d="M15.8 5.2a3.4 3.4 0 0 1 0 6.6"/><path d="M17.6 14.6c1.8.6 3 2.2 3.3 4.8"/>'),
    gear: P('<circle cx="12" cy="12" r="5.6"/><circle cx="12" cy="12" r="2.2"/><path d="M12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M5.6 18.4l1.1-1.1M17.3 6.7l1.1-1.1"/>'),
    search: P('<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.6 15.6 4.2 4.2"/>'),
    save: P('<path d="M7 4h8.2a2 2 0 0 1 1.4.6l2.8 2.8a2 2 0 0 1 .6 1.4V17a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"/><path d="M8.5 4.2v2.6a1.2 1.2 0 0 0 1.2 1.2h4.1a1.2 1.2 0 0 0 1.2-1.2V4.2"/><circle cx="12" cy="14.3" r="2.4"/>'),
    check: P('<path d="M12 3.6c2.4 1.5 4.6 2.2 6.6 2.4a.9.9 0 0 1 .8.9v4.6c0 4.4-2.9 7.6-7 8.9-4.1-1.3-7-4.5-7-8.9V6.9a.9.9 0 0 1 .8-.9c2-.2 4.2-.9 6.8-2.4z"/><path d="m9.2 12 2 2 3.8-3.9"/>'),
    pdf: P('<path d="M7 8.5V6a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 17 6v2.5"/><path d="M7 17H6a3 3 0 0 1-3-3v-2.5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3V14a3 3 0 0 1-3 3h-1"/><rect x="7" y="14" width="10" height="6.5" rx="2"/>'),
    lock: P('<rect x="5" y="10.5" width="14" height="10" rx="3.5"/><path d="M8.3 10.5V8.2a3.7 3.7 0 0 1 7.4 0v2.3"/><circle cx="12" cy="15.5" r="1.1"/>'),
    trash: P('<path d="M4.5 7.2h15"/><path d="M9.3 7.2V6a2 2 0 0 1 2-2h1.4a2 2 0 0 1 2 2v1.2"/><path d="m6.5 7.2.8 10.9a2.6 2.6 0 0 0 2.6 2.4h4.2a2.6 2.6 0 0 0 2.6-2.4l.8-10.9"/><path d="M10.4 11.2v4.8M13.6 11.2v4.8"/>'),
    up: P('<path d="m6.5 14.5 5.5-5.2 5.5 5.2"/>'),
    down: P('<path d="m6.5 9.5 5.5 5.2 5.5-5.2"/>'),
    copy: P('<rect x="8.5" y="8.5" width="12" height="12" rx="3.2"/><path d="M15.5 8.5V7a3.5 3.5 0 0 0-3.5-3.5H7A3.5 3.5 0 0 0 3.5 7v5A3.5 3.5 0 0 0 7 15.5h1.5"/>'),
    edit: P('<path d="M5 19l.9-3.6a2 2 0 0 1 .5-.9l9-9a2.2 2.2 0 0 1 3.1 3.1l-9 9a2 2 0 0 1-.9.5z"/><path d="m14 7.2 2.8 2.8"/>'),
    refresh: P('<path d="M19.6 12.4a7.6 7.6 0 1 1-2.4-6"/><path d="M19.6 4.6v3.9h-3.9"/>'),
    box: P('<path d="M10.9 3.8a2.3 2.3 0 0 1 2.2 0l5.6 3a2.3 2.3 0 0 1 1.2 2v6.4a2.3 2.3 0 0 1-1.2 2l-5.6 3a2.3 2.3 0 0 1-2.2 0l-5.6-3a2.3 2.3 0 0 1-1.2-2V8.8a2.3 2.3 0 0 1 1.2-2z"/><path d="M4.6 7.8 12 12l7.4-4.2M12 12v8.6"/>'),
    yen: P('<path d="m7.2 4.8 4.8 6.6 4.8-6.6M12 11.4v8M8.3 12.6h7.4M8.3 16.2h7.4"/>'),
    clock: P('<circle cx="12" cy="12" r="8.4"/><path d="M12 7.6V12l2.9 1.9"/>'),
    chart: P('<rect x="4" y="11.5" width="4.2" height="8.5" rx="2.1"/><rect x="9.9" y="4.5" width="4.2" height="15.5" rx="2.1"/><rect x="15.8" y="14" width="4.2" height="6" rx="2.1"/>'),
    file: P('<path d="M8 3.5h5.3a2 2 0 0 1 1.4.6l3.7 3.7a2 2 0 0 1 .6 1.4v8.8a2.5 2.5 0 0 1-2.5 2.5H8a2.5 2.5 0 0 1-2.5-2.5V6A2.5 2.5 0 0 1 8 3.5z"/><path d="M13.5 3.8v2.7a2 2 0 0 0 2 2h2.7"/>'),
    stamp: P('<path d="M12 3.6a3.2 3.2 0 0 0-3.2 3.2c0 1.9 1.5 2.9 1.5 4.8H8.2a3 3 0 0 0-3 3v1.1a1 1 0 0 0 1 1h11.6a1 1 0 0 0 1-1v-1.1a3 3 0 0 0-3-3h-2.1c0-1.9 1.5-2.9 1.5-4.8A3.2 3.2 0 0 0 12 3.6z"/><path d="M6 20.3h12"/>'),
    branch: P('<circle cx="6.5" cy="6" r="2.6"/><circle cx="6.5" cy="18" r="2.6"/><circle cx="17.5" cy="8" r="2.6"/><path d="M6.5 8.6v6.8M17.5 10.6c0 3.6-4.4 3.4-9 5.8"/>'),
    download: P('<path d="M12 4.2v10.3M7.6 10.5 12 14.9l4.4-4.4"/><path d="M5 19.8h14"/>'),
    upload: P('<path d="M12 19.8V9.5M7.6 13.5 12 9.1l4.4 4.4"/><path d="M5 4.2h14"/>'),
    spark: P('<path d="M12 3.8c.7 4 2.5 6.3 7.6 8.2-5.1 1.9-6.9 4.2-7.6 8.2-.7-4-2.5-6.3-7.6-8.2 5.1-1.9 6.9-4.2 7.6-8.2z"/>'),
    x: P('<path d="m7.2 7.2 9.6 9.6M16.8 7.2l-9.6 9.6"/>'),
    // 業務別メニュー・ウィジェット用
    site: P('<path d="M3.5 20.5h17"/><path d="M5.5 20.5V10l6.5-5 6.5 5v10.5"/><path d="M10 20.5v-5h4v5"/><path d="M15.5 6.4V3.6h2.2v4.5"/>'),
    calendar: P('<rect x="3.8" y="5.2" width="16.4" height="15" rx="3"/><path d="M3.8 9.8h16.4M8.3 3.4v3.4M15.7 3.4v3.4"/><circle cx="8.6" cy="14" r=".6"/><circle cx="12" cy="14" r=".6"/><circle cx="15.4" cy="14" r=".6"/>'),
    trend: P('<path d="M4 19.5h16"/><path d="m5.5 15 4-4.2 3.3 3 5.7-6.3"/><path d="M14.6 7.4h3.9v3.9"/>'),
    camera: P('<path d="M4.5 8.6a2 2 0 0 1 2-2h1.8l1.3-1.9h4.8l1.3 1.9h1.8a2 2 0 0 1 2 2v8.7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.8" r="3.3"/>'),
    grid: P('<rect x="4" y="4" width="7" height="7" rx="2.2"/><rect x="13" y="4" width="7" height="7" rx="2.2"/><rect x="4" y="13" width="7" height="7" rx="2.2"/><rect x="13" y="13" width="7" height="7" rx="2.2"/>'),
    star: P('<path d="m12 4.3 2.3 4.7 5.1.7-3.7 3.6.9 5.1L12 16l-4.6 2.4.9-5.1-3.7-3.6 5.1-.7z"/>'),
    bell: P('<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.4 1.6H5.1z"/><path d="M10 19.6a2.1 2.1 0 0 0 4 0"/>'),
    drag: P('<circle cx="9" cy="6.5" r=".9"/><circle cx="15" cy="6.5" r=".9"/><circle cx="9" cy="12" r=".9"/><circle cx="15" cy="12" r=".9"/><circle cx="9" cy="17.5" r=".9"/><circle cx="15" cy="17.5" r=".9"/>'),
    eye: P('<path d="M2.8 12s3.4-6.3 9.2-6.3S21.2 12 21.2 12s-3.4 6.3-9.2 6.3S2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.8"/>'),
    calc: P('<rect x="5.5" y="3.5" width="13" height="17" rx="2.6"/><path d="M8.6 7.6h6.8"/><circle cx="9" cy="12.2" r=".7"/><circle cx="12" cy="12.2" r=".7"/><circle cx="15" cy="12.2" r=".7"/><circle cx="9" cy="16.2" r=".7"/><circle cx="12" cy="16.2" r=".7"/><circle cx="15" cy="16.2" r=".7"/>'),
    truck: P('<path d="M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h8.5v10H3.5z"/><path d="M13.5 9.5h3.6l3.4 3.6V16h-7"/><circle cx="7.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>'),
    note: P('<path d="M6.5 3.8h11a2 2 0 0 1 2 2v8.5l-5.7 5.9H6.5a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2z"/><path d="M13.6 20.1v-3.8a2 2 0 0 1 2-2h3.8"/><path d="M8.5 8.5h7M8.5 12h4.5"/>'),
    walk: P('<circle cx="13" cy="4.6" r="1.8"/><path d="m9.5 21 2.2-6.2M14.6 21l-1.4-5.4-2-2.6 1-4.3-3.7 1.6-1.2 3.5"/><path d="m12.2 8.7 2.4 3.3 3.1 1"/>'),
    board: P('<rect x="3.5" y="4" width="17" height="12" rx="1.6"/><path d="M7.5 8h6M7.5 11.5h9M9 20l1.8-4M15 20l-1.8-4"/>')
  };

  /* ---- 状態 ---- */
  var listeners = [];
  /** 画面の上に重ねるもの（確認の窓・知らせ）を入れる場所。業務管理の中では、桜ミツの見た目が効く #ee-layer */
  /** 確認の窓の背面（操作・フォーカスできなくするもの）。業務管理の中では、重ねる場所（#ee-layer）以外の画面全体 */
  function backdrop() {
    if (!EE.host) { var a = document.querySelector('.app'); return a ? [a] : []; }
    return Array.prototype.filter.call(document.body.children, function (x) { return !x.classList.contains('ee-layer') && !/^(SCRIPT|STYLE|LINK)$/.test(x.tagName); });
  }
  function layer() { return (EE.host && document.getElementById('ee-layer')) || document.body; }
  function commit() {
    var ok = EE.data.save(EE.S);
    if (!ok && EE.data.isStale()) EE.fx.toast('別のタブで内容が更新されたため、この画面からは保存していません。再読み込みしてください', { warn: true, ms: 6000 });
    else if (!ok) EE.fx.toast('ブラウザに保存できませんでした（容量不足の可能性）', { warn: true, ms: 4000 });
    listeners.forEach(function (f) { f(); });
    return ok;
  }
  function onCommit(f) { listeners.push(f); }

  function findItem(id) { return EE.S.items.filter(function (x) { return x.id === id; })[0]; }
  function findCustomer(id) { return EE.S.customers.filter(function (x) { return x.id === id; })[0]; }
  /** 書類の宛名：顧客がいなければ確定時の写しを使う（顧客を削除した後の確定済み書類） */
  function docCustomer(d) { return findCustomer(d.customerId) || (d.snap && d.snap.customer) || {}; }
  function findProject(id) { return EE.S.projects.filter(function (x) { return x.id === id; })[0]; }
  /* 担当者 */
  function members() { if (!EE.S.members || !EE.S.members.length) EE.data.ensureMembers(EE.S); return EE.S.members; }
  function me() { var ms = members(); return ms.filter(function (m) { return m.id === EE.S.currentMemberId; })[0] || ms[0]; }
  function findMember(id) { return members().filter(function (m) { return m.id === id; })[0]; }
  function initial(name) { var t = String(name || '').trim().replace(/\s+/g, ''); return t ? t[0] : '？'; }
  function avatar(m, size) {
    m = m || { name: '？', hue: 220 };
    return '<span class="avatar" style="--hue:' + (m.hue != null ? m.hue : 217) + (size ? ';width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.42) + 'px' : '') + '">' + esc(initial(m.name)) + '</span>';
  }
  function memberOptions(sel, emptyLabel) {
    return (emptyLabel != null ? opt('', emptyLabel, sel) : '') + members().map(function (m) { return opt(m.id, m.name + '（' + (m.role || '') + '）', sel); }).join('');
  }

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
  var stack = [], mid = 0;
  function modal(o) {
    var ov = document.createElement('div'), hid = 'mdl-t' + (++mid);
    var opener = document.activeElement;   // 閉じたらここへフォーカスを戻す
    ov.className = 'overlay';
    ov.innerHTML = '<div class="panel modal' + (o.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="' + hid + '">' +
      '<div class="panel-h"><h2 id="' + hid + '">' + esc(o.title) + '</h2><div class="spacer"></div>' +
      '<button class="btn ghost icon sm" data-x title="閉じる (Esc)" aria-label="閉じる">' + I.x + '</button></div>' +
      '<div class="panel-b">' + (o.body || '') + '</div>' +
      (o.foot ? '<div class="modal-f">' + o.foot + '</div>' : '') + '</div>';
    layer().appendChild(ov);
    var m = ov.firstChild;
    EE.fx.anim(ov, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    EE.fx.anim(m, [{ opacity: 0, transform: 'translateY(12px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
    var api = {
      el: m,
      close: function (v) {
        var i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
        if (o.onClose) o.onClose(v);
        if (!stack.length) backdrop().forEach(function (x) { x.inert = false; });
        if (opener && opener.isConnected && opener.focus) setTimeout(function () { opener.focus({ preventScroll: true }); }, 0);
        if (EE.fx.reduce || !ov.animate) return ov.remove();
        var a = ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' });
        a.onfinish = function () { ov.remove(); };
      }
    };
    stack.push(api);
    backdrop().forEach(function (x) { x.inert = true; });   // 背面を操作・フォーカスできなくする
    // Tab をダイアログの中で回す
    m.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var fs = Array.prototype.filter.call(m.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!fs.length) return;
      var first = fs[0], last = fs[fs.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
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
        foot: '<button class="btn ghost" data-no>キャンセル</button><button class="btn ' + (opts.danger ? 'danger' : 'primary') + '" data-ok>' + esc(ok || 'OK') + '</button>',
        onClose: function () { if (!done) resolve(false); },
        onMount: function (el, api) {
          el.querySelector('[data-no]').onclick = function () { api.close(); };
          el.querySelector('[data-ok]').onclick = function () { done = true; resolve(true); api.close(); };
          // 危険な操作（削除など）は「キャンセル」を既定にする（Enter で即実行しない）
          setTimeout(function () { el.querySelector(opts.danger ? '[data-no]' : '[data-ok]').focus(); }, 40);
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
    // claude.ai の Artifact の中では、ファイルの保存は「downloads」の仕組みを通す（確認の窓が出る）
    if (root.claude && root.claude.use) {
      root.claude.use('downloads').then(function (dl) {
        if (dl) return dl.save({ filename: name, data: blob }).catch(function (e) { if (e && e.code !== 'declined') EE.fx.toast('保存できませんでした（' + (e.message || e.code) + '）', { warn: true }); });
        plain();
      }).catch(plain);
      return;
    }
    plain();
    function plain() {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }
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

  // 空の画面：「まだ○○がありません」＋次に押すボタン1つ（o = {icon, text, sub, btn, href | act, small}）
  function empty(o) {
    var b = !o.btn ? '' : o.href ? '<a class="btn primary sm" href="' + o.href + '">' + esc(o.btn) + '</a>'
      : '<button class="btn primary sm" type="button" data-act="' + o.act + '">' + esc(o.btn) + '</button>';
    return '<div class="empty' + (o.small ? ' sm' : '') + '">' + (o.icon || '') + '<p class="empty-t">' + esc(o.text) + '</p>' + (o.sub ? '<p class="empty-s">' + esc(o.sub) + '</p>' : '') + b + '</div>';
  }

  /** 消す・まとめて変えるなどの前に呼ぶ：S の keys を控えておき、終わったら返り値を呼ぶと「元に戻す」付きの知らせを出す */
  function undoable(msg, keys) {
    var snap = {}; keys.forEach(function (k) { snap[k] = JSON.parse(JSON.stringify(EE.S[k])); });
    return function () {
      EE.fx.toast(msg, { action: { label: '元に戻す', run: function () {
        keys.forEach(function (k) {   // 同じ入れ物の中身を戻す（ほかの画面が持っている参照もそのまま使える）
          var cur = EE.S[k], v = snap[k];
          if (Array.isArray(cur)) cur.splice.apply(cur, [0, cur.length].concat(v));
          else if (cur && typeof cur === 'object') { Object.keys(cur).forEach(function (x) { delete cur[x]; }); Object.assign(cur, v); }
          else EE.S[k] = v;
        }); commit(); if (EE.app && EE.app.rerender) EE.app.rerender(); EE.fx.toast('元に戻しました');
      } } });
    };
  }

  EE.ui = { empty: empty, undoable: undoable, esc: esc, yen: yen, num: num, pct: pct, jdate: jdate, norm: norm, daysFromToday: daysFromToday, I: I,
    commit: commit, layer: layer, onCommit: onCommit, members: members, me: me, findMember: findMember, initial: initial, avatar: avatar, memberOptions: memberOptions, findItem: findItem, findCustomer: findCustomer, docCustomer: docCustomer, findProject: findProject, findDoc: findDoc,
    rulesFor: rulesFor, calcDoc: calcDoc, checkDoc: checkDoc, modal: modal, topModal: topModal, confirmBox: confirmBox,
    readForm: readForm, opt: opt, options: options, download: download, statusBadge: statusBadge, validBadge: validBadge };
})(this);
