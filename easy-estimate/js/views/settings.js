/* 設定・マスタ：マスタ / 工事パッケージ / 自社情報 / 計算ルール / データ */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var K = EE.engine.ITEM_KINDS, TC = EE.engine.TAX_CATEGORIES, CT = EE.engine.COST_TYPES;
  var TABS = [['items', 'マスタ'], ['packages', '工事パッケージ'], ['company', '自社情報'], ['rules', '計算ルール'], ['data', 'データ・拡張']];
  var mf = { kind: 'all', q: '', showInactive: true };

  /* ---------- マスタ ---------- */
  function itemRows() {
    var nq = U.norm(mf.q);
    var list = EE.S.items.filter(function (it) {
      if (mf.kind !== 'all' && it.kind !== mf.kind) return false;
      if (!nq) return true;
      return U.norm(it.code + it.name + it.spec).indexOf(nq) >= 0;
    }).sort(function (a, b) { return a.code.localeCompare(b.code); });
    if (!list.length) return '<div class="empty">' + I.box + '該当するマスタがありません</div>';
    return '<div class="table-scroll"><table class="table"><thead><tr><th>コード</th><th>区分</th><th>品名 / 規格</th><th>単位</th><th class="r">単価</th><th class="r">原価（仕入）</th><th class="r">粗利率</th><th>税</th><th>原価区分</th><th>状態</th><th></th></tr></thead><tbody>' +
      list.map(function (it) {
        var m = it.unitPrice ? (it.unitPrice - it.unitCost) / it.unitPrice : null;
        return '<tr class="clickable" data-iid="' + it.id + '" data-st style="' + (it.active === false ? 'opacity:.5' : '') + '">' +
          '<td class="num">' + esc(it.code) + '</td><td><span class="badge">' + K[it.kind] + '</span></td>' +
          '<td>' + esc(it.name) + '<span class="cell-sub">' + esc(it.spec || '') + '</span></td><td class="muted">' + esc(it.unit) + '</td>' +
          '<td class="r num">' + U.yen(it.unitPrice) + '</td><td class="r num muted">' + U.yen(it.unitCost) + '</td>' +
          '<td class="r num" style="' + (m != null && m < EE.S.settings.minMargin ? 'color:var(--warn)' : '') + '">' + U.pct(m) + '</td>' +
          '<td>' + esc(TC[it.taxCategory].label) + '</td><td class="muted">' + CT[it.costType] + '</td>' +
          '<td>' + (it.active === false ? '<span class="badge">停止中</span>' : '<span class="badge ok"><span class="d"></span>使用中</span>') + '</td>' +
          '<td><div class="row-actions"><button class="btn ghost icon sm" data-act="edit-item" data-id="' + it.id + '">' + I.edit + '</button></div></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function itemsTab() {
    return '<section class="panel" data-st><div class="panel-b">' +
      '<div class="toolbar">' +
        '<div class="search grow" style="min-width:220px">' + I.search + '<input class="input" id="m-q" placeholder="コード・品名・規格で検索" value="' + esc(mf.q) + '"></div>' +
        '<div class="seg" id="m-kind">' + [['all', 'すべて']].concat(Object.keys(K).map(function (k) { return [k, K[k]]; })).map(function (k) {
          return '<button data-kind="' + k[0] + '" class="' + (mf.kind === k[0] ? 'on' : '') + '">' + k[1] + '</button>'; }).join('') + '</div>' +
        '<button class="btn" data-act="csv-out">' + I.download + 'CSV書き出し</button>' +
        '<label class="btn">' + I.upload + 'CSV取り込み<input type="file" accept=".csv,text/csv" id="csv-in" hidden></label>' +
        '<button class="btn primary" data-act="new-item">' + I.plus + 'マスタを登録</button>' +
      '</div><div id="m-table">' + itemRows() + '</div></div></section>' +
      '<p class="hint" data-st style="margin-top:12px">単価を変えても、作成済みの見積の単価は変わりません。送信前チェックで「マスタ単価と違う」と知らせるので、必要な見積だけ「最新単価に更新」してください。<br>使っている品目は削除せず「使用停止」にすると、過去の見積を壊さずに検索候補から外せます。</p>';
  }

  function itemForm(it) {
    var isNew = !it;
    it = it || { id: EE.data.uid('itm'), code: '', kind: 'material', name: '', spec: '', unit: '式', unitPrice: 0, unitCost: 0, taxCategory: 'std10', costType: 'material', active: true };
    var used = !isNew && EE.S.documents.some(function (d) { return d.lines.some(function (l) { return l.itemId === it.id; }); });
    U.modal({
      title: isNew ? 'マスタを登録' : 'マスタを編集 — ' + it.code,
      body: '<div class="form-grid">' +
        '<div class="field c4"><label class="req">コード</label><input class="input num" name="code" value="' + esc(it.code) + '" placeholder="例：M-010" autofocus></div>' +
        '<div class="field c4"><label class="req">区分</label><select class="input" name="kind">' + U.options(K, it.kind) + '</select></div>' +
        '<div class="field c4"><label class="req">単位</label><input class="input" name="unit" value="' + esc(it.unit) + '" list="units"><datalist id="units"><option>式</option><option>m²</option><option>m</option><option>枚</option><option>台</option><option>個</option><option>本</option><option>箇所</option><option>人工</option><option>日</option></datalist></div>' +
        '<div class="field c8"><label class="req">品名</label><input class="input" name="name" value="' + esc(it.name) + '"></div>' +
        '<div class="field c4"><label>規格</label><input class="input" name="spec" value="' + esc(it.spec) + '"></div>' +
        '<div class="field c4"><label class="req">単価（税抜・円）</label><input class="input num" type="number" step="1" name="unitPrice" value="' + it.unitPrice + '"></div>' +
        '<div class="field c4"><label>原価・仕入価格（円）</label><input class="input num" type="number" step="1" name="unitCost" value="' + it.unitCost + '"></div>' +
        '<div class="field c4"><label>粗利率</label><div class="input num" id="m-margin" style="display:flex;align-items:center" readonly>—</div></div>' +
        '<div class="field c4"><label>税区分</label><select class="input" name="taxCategory">' + U.options(TC, it.taxCategory) + '</select></div>' +
        '<div class="field c4"><label>原価区分（建設業法20条）</label><select class="input" name="costType">' + U.options(CT, it.costType) + '</select></div>' +
        '<div class="field c4"><label>状態</label><label style="display:flex;gap:8px;align-items:center;height:38px"><input type="checkbox" name="active"' + (it.active !== false ? ' checked' : '') + '> 使用中</label></div>' +
      '</div>' + (used ? '<p class="hint" style="margin-top:12px">この品目は見積で使われています。削除の代わりに「使用中」のチェックを外すと検索候補から外れます。</p>' : ''),
      foot: (isNew || used ? '' : '<button class="btn danger" data-del>' + I.trash + '削除</button>') + '<div class="spacer"></div>' +
        '<button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-s>' + I.save + '保存</button>',
      onMount: function (el, api) {
        function upd() {
          var p = Number(el.querySelector('[name=unitPrice]').value), c = Number(el.querySelector('[name=unitCost]').value);
          var m = p ? (p - c) / p : null;
          var box = el.querySelector('#m-margin');
          box.textContent = U.pct(m) + (p ? '　粗利 ' + U.yen(p - c) : '');
          box.style.color = m != null && m < EE.S.settings.minMargin ? 'var(--warn)' : '';
        }
        upd();
        el.addEventListener('input', upd);
        el.querySelector('[name=kind]').onchange = function (e) {
          var cty = el.querySelector('[name=costType]');
          cty.value = { material: 'material', product: 'material', labor: 'labor', construction: 'labor' }[e.target.value];
          EE.fx.pulse(cty);
        };
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        var del = el.querySelector('[data-del]');
        if (del) del.onclick = async function () {
          if (!(await U.confirmBox('「' + it.name + '」を削除しますか？', '削除する', { danger: true }))) return;
          EE.S.items.splice(EE.S.items.indexOf(it), 1);
          EE.S.packages.forEach(function (p) { p.lines = p.lines.filter(function (l) { return l.itemId !== it.id; }); });
          U.commit(); api.close(); refreshItems(); EE.fx.toast('削除しました');
        };
        el.querySelector('[data-s]').onclick = function () {
          var v = U.readForm(el);
          var bad = null;
          if (!v.code) bad = 'code';
          else if (EE.S.items.some(function (x) { return x.id !== it.id && x.code === v.code; })) { bad = 'code'; EE.fx.toast('コード「' + v.code + '」は既にあります', { warn: true }); }
          else if (!v.name) bad = 'name';
          else if (!v.unit) bad = 'unit';
          else if (v.unitPrice == null || !Number.isInteger(v.unitPrice)) bad = 'unitPrice';
          else if (v.unitCost != null && !Number.isInteger(v.unitCost)) bad = 'unitCost';
          if (bad) { var f = el.querySelector('[name=' + bad + ']'); f.classList.add('flag-err'); EE.fx.shake(f); f.focus(); return; }
          v.unitCost = v.unitCost || 0;
          Object.assign(it, v, { updatedAt: EE.data.today() });
          if (isNew) EE.S.items.push(it);
          U.commit(); api.close(); refreshItems();
          EE.fx.toast(isNew ? 'マスタを登録しました' : 'マスタを更新しました');
        };
      }
    });
  }

  function refreshItems() {
    var t = document.getElementById('m-table');
    if (!t) return;
    t.innerHTML = itemRows();
    EE.fx.stagger(t, { step: 12 });
  }

  var CSV_COLS = ['code', 'kind', 'name', 'spec', 'unit', 'unitPrice', 'unitCost', 'taxCategory', 'costType', 'active'];
  function csvOut() {
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [CSV_COLS.join(',')].concat(EE.S.items.map(function (it) {
      return CSV_COLS.map(function (k) { return q(k === 'active' ? (it.active !== false ? 1 : 0) : it[k]); }).join(',');
    }));
    U.download('master_' + EE.data.today() + '.csv', '﻿' + lines.join('\r\n'), 'text/csv');
    EE.fx.toast('CSVを書き出しました');
  }
  function parseCSV(text) {
    var rows = [], row = [], cur = '', inq = false;
    text = text.replace(/^﻿/, '');
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inq) {
        if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inq = false;
        else cur += ch;
      } else if (ch === '"') inq = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim(); }); });
  }
  function csvIn(file) {
    var rd = new FileReader();
    rd.onload = function () {
      var rows = parseCSV(String(rd.result));
      var head = rows.shift() || [];
      var idx = {}; head.forEach(function (h, i) { idx[h.trim()] = i; });
      if (idx.code == null || idx.name == null || idx.unitPrice == null) {
        EE.fx.toast('CSVの1行目に code, name, unitPrice などの列名が必要です（書き出したCSVを雛形にしてください）', { warn: true, ms: 4500 }); return;
      }
      var add = 0, upd = 0, skip = [];
      rows.forEach(function (r, n) {
        var g = function (k) { return idx[k] == null ? undefined : (r[idx[k]] || '').trim(); };
        var price = Number(g('unitPrice')), cost = Number(g('unitCost') || 0);
        if (!g('code') || !g('name') || !Number.isInteger(price) || !Number.isInteger(cost)) { skip.push(n + 2); return; }
        var v = { code: g('code'), name: g('name'), spec: g('spec') || '', unit: g('unit') || '式', unitPrice: price, unitCost: cost,
          kind: K[g('kind')] ? g('kind') : 'material', taxCategory: TC[g('taxCategory')] ? g('taxCategory') : 'std10',
          costType: CT[g('costType')] ? g('costType') : 'material', active: g('active') !== '0', updatedAt: EE.data.today() };
        var ex = EE.S.items.filter(function (x) { return x.code === v.code; })[0];
        if (ex) { Object.assign(ex, v); upd++; } else { v.id = EE.data.uid('itm'); EE.S.items.push(v); add++; }
      });
      U.commit(); refreshItems();
      EE.fx.toast('取り込み：追加 ' + add + '件・更新 ' + upd + '件' + (skip.length ? '・読めない行 ' + skip.length + '件（' + skip.slice(0, 5).join(', ') + '行目）' : ''), { warn: !!skip.length, ms: 4500 });
    };
    rd.readAsText(file, 'utf-8');
  }

  /* ---------- 工事パッケージ ---------- */
  function packagesTab() {
    var S = EE.S;
    return '<div class="toolbar" data-st><div class="grow hint">よく使う明細のセットです。見積作成画面でクリックすると一括で追加されます（金額はその時点のマスタ単価）。</div>' +
      '<button class="btn primary" data-act="new-pkg">' + I.plus + 'パッケージを作成</button></div>' +
      '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(340px,1fr))">' + (S.packages.length ? S.packages.map(function (p) {
        var r = EE.engine.calc({ lines: p.lines.map(function (l) { var it = U.findItem(l.itemId) || {}; return { qty: l.qty, unitPrice: it.unitPrice || 0, unitCost: it.unitCost || 0, taxCategory: it.taxCategory }; }) }, S.settings);
        return '<section class="panel kpi" data-st style="padding:0"><div class="panel-h"><span class="kpi-icon">' + I.box + '</span><h3>' + esc(p.name) + '</h3><div class="spacer"></div>' +
          '<button class="btn ghost icon sm" data-act="edit-pkg" data-id="' + p.id + '">' + I.edit + '</button></div>' +
          '<div class="panel-b"><div class="hint" style="margin-bottom:8px">' + esc(p.note || '') + '</div>' +
          p.lines.map(function (l) { var it = U.findItem(l.itemId); return '<div class="sum-row sub" style="padding-left:0"><span>' + (it ? esc(it.name) : '<span style="color:var(--err)">削除済み</span>') + '</span><span class="num">' + U.num(l.qty) + ' ' + (it ? esc(it.unit) : '') + '</span></div>'; }).join('') +
          '<div class="sep"></div><div class="sum-row"><span>小計（税抜）</span><span class="yen num">' + U.yen(r.subtotal) + '</span></div>' +
          '<div class="sum-row" style="padding:0"><span class="hint">粗利率</span><span class="hint num">' + U.pct(r.marginRate) + '</span></div></div></section>';
      }).join('') : '<div class="panel empty">' + I.box + 'パッケージがありません</div>') + '</div>';
  }

  function packageForm(p) {
    var isNew = !p;
    var draft = p ? JSON.parse(JSON.stringify(p)) : { id: EE.data.uid('pkg'), name: '', note: '', lines: [] };
    var itemOpts = function (sel) {
      return EE.S.items.filter(function (it) { return it.active !== false || it.id === sel; }).map(function (it) { return U.opt(it.id, it.code + '　' + it.name + '（' + U.yen(it.unitPrice) + '/' + it.unit + '）', sel); }).join('');
    };
    function linesHTML() {
      return draft.lines.map(function (l, i) {
        return '<div style="display:grid;grid-template-columns:1fr 110px 34px;gap:8px;margin-bottom:8px" data-i="' + i + '">' +
          '<select class="input" data-k="itemId">' + itemOpts(l.itemId) + '</select>' +
          '<input class="input num" type="number" step="0.01" data-k="qty" value="' + l.qty + '">' +
          '<button class="btn ghost icon danger" data-rm>' + I.trash + '</button></div>';
      }).join('') || '<p class="hint">明細がありません</p>';
    }
    U.modal({
      title: isNew ? 'パッケージを作成' : 'パッケージを編集',
      body: '<div class="form-grid" style="margin-bottom:16px"><div class="field c6"><label class="req">名前</label><input class="input" name="name" value="' + esc(draft.name) + '" autofocus></div>' +
        '<div class="field c6"><label>メモ</label><input class="input" name="note" value="' + esc(draft.note) + '"></div></div>' +
        '<div class="label" style="margin-bottom:8px">明細（マスタ＋数量）</div><div id="pl">' + linesHTML() + '</div>' +
        '<button class="btn sm" data-add>' + I.plus + '行を追加</button>',
      foot: (isNew ? '' : '<button class="btn danger" data-del>' + I.trash + '削除</button>') + '<div class="spacer"></div><button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-s>' + I.save + '保存</button>',
      onMount: function (el, api) {
        var pl = el.querySelector('#pl');
        pl.addEventListener('change', function (e) {
          var row = e.target.closest('[data-i]'); if (!row) return;
          var l = draft.lines[row.dataset.i];
          if (e.target.dataset.k === 'qty') l.qty = Number(e.target.value); else l.itemId = e.target.value;
        });
        pl.addEventListener('click', function (e) {
          if (e.target.closest('[data-rm]')) { draft.lines.splice(e.target.closest('[data-i]').dataset.i, 1); pl.innerHTML = linesHTML(); }
        });
        el.querySelector('[data-add]').onclick = function () {
          var first = EE.S.items.filter(function (it) { return it.active !== false; })[0];
          if (!first) return;
          draft.lines.push({ itemId: first.id, qty: 1 }); pl.innerHTML = linesHTML();
          var last = pl.lastElementChild; EE.fx.pop(last); last.querySelector('select').focus();
        };
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        var del = el.querySelector('[data-del]');
        if (del) del.onclick = async function () {
          if (!(await U.confirmBox('「' + p.name + '」を削除しますか？', '削除する', { danger: true }))) return;
          EE.S.packages.splice(EE.S.packages.indexOf(p), 1); U.commit(); api.close(); EE.app.rerender();
        };
        el.querySelector('[data-s]').onclick = function () {
          var v = U.readForm(el.querySelector('.form-grid'));
          if (!v.name) { var n = el.querySelector('[name=name]'); n.classList.add('flag-err'); EE.fx.shake(n); return; }
          draft.name = v.name; draft.note = v.note;
          draft.lines = draft.lines.filter(function (l) { return l.itemId && isFinite(l.qty) && l.qty !== 0; });
          if (isNew) EE.S.packages.push(draft); else Object.assign(p, draft);
          U.commit(); api.close(); EE.app.rerender(); EE.fx.toast('パッケージを保存しました');
        };
      }
    });
  }

  /* ---------- 自社情報 ---------- */
  function companyTab() {
    var c = EE.S.company;
    var f = function (cls, name, label, ph, req) {
      return '<div class="field ' + cls + '"><label' + (req ? ' class="req"' : '') + '>' + label + '</label><input class="input" name="' + name + '" value="' + esc(c[name] || '') + '" placeholder="' + (ph || '') + '"></div>';
    };
    return '<section class="panel" data-st style="max-width:920px"><div class="panel-h"><h2>自社情報</h2><span class="sub">見積書・適格請求書の発行者として印字されます</span></div><div class="panel-b" id="co-form"><div class="form-grid">' +
      f('c8', 'name', '会社名・屋号', '', true) +
      '<div class="field c4"><label>適格請求書発行事業者 登録番号</label><input class="input num" name="invoiceRegNo" value="' + esc(c.invoiceRegNo || '') + '" placeholder="T1234567890123"><span class="hint" id="reg-hint">「T」＋数字13桁</span></div>' +
      f('c3', 'zip', '郵便番号') + f('c9', 'address', '住所') +
      f('c4', 'tel', '電話') + f('c4', 'email', 'メール') + f('c4', 'rep', '代表者') +
      f('c6', 'license', '建設業許可番号', '例：東京都知事許可（般-6）第000000号') + f('c6', 'bank', '振込先（請求書で使用予定）') +
      '</div><div style="margin-top:18px;display:flex;justify-content:flex-end"><button class="btn primary" data-act="save-co">' + I.save + '保存</button></div></div></section>';
  }

  /* ---------- 計算ルール ---------- */
  function rulesTab() {
    var s = EE.S.settings;
    var seg = function (name, val) {
      return '<div class="seg" data-rule="' + name + '">' + [['floor', '切り捨て'], ['round', '四捨五入'], ['ceil', '切り上げ']].map(function (m) {
        return '<button data-v="' + m[0] + '" class="' + (val === m[0] ? 'on' : '') + '">' + m[1] + '</button>'; }).join('') + '</div>';
    };
    return '<section class="panel" data-st style="max-width:920px"><div class="panel-h"><h2>計算ルール</h2><span class="sub">金額はすべてこのルールと登録マスタだけで決まります</span></div><div class="panel-b"><div class="form-grid">' +
      '<div class="field c6"><label>明細金額（数量×単価）の端数</label>' + seg('lineRounding', s.lineRounding) + '<span class="hint">1.5人工×26,001円 などで円未満が出たときの扱い</span></div>' +
      '<div class="field c6"><label>消費税の端数</label>' + seg('taxRounding', s.taxRounding) + '<span class="hint">インボイス制度に合わせ、1書類につき税率ごとに1回だけ端数処理します</span></div>' +
      '<div class="field c4"><label>粗利率の下限（%）</label><input class="input num" type="number" id="r-margin" value="' + Math.round(s.minMargin * 100) + '" min="0" max="100"><span class="hint">下回ると送信前チェックで注意を出します</span></div>' +
      '<div class="field c4"><label>有効期限の既定（日）</label><input class="input num" type="number" id="r-days" value="' + s.validDays + '" min="1"></div>' +
      '<div class="field c4"><label>見積番号の頭文字</label><input class="input num" id="r-prefix" value="' + esc(s.numberPrefix) + '"><span class="hint">例：EST-202611-001</span></div>' +
      '</div><div class="sep" style="margin:18px 0"></div>' +
      '<div class="hint">発行確定した見積書は、確定時のルールで固定されます。下書きはルールを変えると再計算され、送信前チェックで「保存時と金額が違う」と知らせます。</div>' +
      '<div style="margin-top:18px;display:flex;justify-content:flex-end"><button class="btn primary" data-act="save-rules">' + I.save + '保存</button></div></div></section>';
  }

  /* ---------- データ・拡張 ---------- */
  function dataTab() {
    var S = EE.S;
    var size = new Blob([JSON.stringify(S)]).size;
    return '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">' +
      '<section class="panel" data-st><div class="panel-h"><h2>バックアップ</h2></div><div class="panel-b">' +
        '<p class="hint" style="margin-top:0">データはこのパソコンのブラウザ内に保存されています（' + Math.ceil(size / 1024) + 'KB）。定期的に書き出して保管してください。</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="export">' + I.download + 'すべて書き出し（JSON）</button>' +
        '<label class="btn">' + I.upload + '読み込み<input type="file" accept=".json,application/json" id="json-in" hidden></label></div></div></section>' +
      '<section class="panel" data-st><div class="panel-h"><h2>初期化</h2></div><div class="panel-b">' +
        '<p class="hint" style="margin-top:0">お試し用のサンプル（マスタ・顧客・見積）に戻すか、すべて空にします。</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="sample">' + I.refresh + 'サンプルに戻す</button><button class="btn danger" data-act="wipe">' + I.trash + 'すべて削除</button></div></div></section>' +
      '<section class="panel" data-st><div class="panel-h"><h2>起動アニメーション</h2></div><div class="panel-b">' +
        '<p class="hint" style="margin-top:0">初回はフル演出、2回目以降は短縮版で表示します。どこかをクリックするか、キーを押すと飛ばせます。</p>' +
        '<button class="btn" data-act="replay-splash">' + I.spark + 'フル演出をもう一度見る</button></div></section>' +
      '<section class="panel" data-st><div class="panel-h"><span class="kpi-icon">' + I.spark + '</span><h2>入力補助オプション</h2><div class="spacer"></div><span class="badge">未導入</span></div><div class="panel-b">' +
        '<p class="hint" style="margin-top:0">音声入力・写真読取などは後から追加できる有料オプションの枠です。導入しても、AIが出すのは「どのマスタを何個使うか」の候補だけで、<b style="color:var(--text-2)">金額は必ずマスタと計算エンジンが決めます</b>。</p>' +
        '<div class="hint">登録済みの拡張：' + (EE.plugins.inputAssist.length ? EE.plugins.inputAssist.map(function (p) { return esc(p.name); }).join('、') : 'なし') + '</div></div></section>' +
    '</div>';
  }

  function render(tab) {
    tab = tab || 'items';
    var body = { items: itemsTab, packages: packagesTab, company: companyTab, rules: rulesTab, data: dataTab }[tab] || itemsTab;
    var html = '<div class="seg" data-st id="set-tabs" style="margin-bottom:18px">' + TABS.map(function (t) {
      return '<button data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div id="set-body">' + body() + '</div>';
    return { title: '設定・マスタ', crumb: TABS.filter(function (t) { return t[0] === tab; })[0][1], html: html, mount: function (v) { mount(v, tab); } };
  }

  function mount(view, tab) {
    view.addEventListener('click', async function (e) {
      var t = e.target.closest('[data-tab]');
      if (t) { location.hash = '#/settings/' + t.dataset.tab; return; }
      var mk = e.target.closest('#m-kind [data-kind]');
      if (mk) { mf.kind = mk.dataset.kind; view.querySelectorAll('#m-kind button').forEach(function (b) { b.classList.toggle('on', b === mk); }); refreshItems(); return; }
      var rs = e.target.closest('[data-rule] [data-v]');
      if (rs) { rs.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === rs); }); return; }
      var row = e.target.closest('[data-iid]');
      var a = e.target.closest('[data-act]');
      if (!a && row) { itemForm(U.findItem(row.dataset.iid)); return; }
      if (!a) return;
      var S = EE.S;
      switch (a.dataset.act) {
        case 'new-item': itemForm(null); break;
        case 'edit-item': itemForm(U.findItem(a.dataset.id)); break;
        case 'csv-out': csvOut(); break;
        case 'new-pkg': packageForm(null); break;
        case 'edit-pkg': packageForm(S.packages.filter(function (p) { return p.id === a.dataset.id; })[0]); break;
        case 'save-co':
          var v = U.readForm(document.getElementById('co-form'));
          if (!v.name) { var n = view.querySelector('[name=name]'); n.classList.add('flag-err'); EE.fx.shake(n); return; }
          if (v.invoiceRegNo && !/^T\d{13}$/.test(v.invoiceRegNo)) { var r = view.querySelector('[name=invoiceRegNo]'); r.classList.add('flag-err'); EE.fx.shake(r); EE.fx.toast('登録番号は「T」＋数字13桁です', { warn: true }); return; }
          Object.assign(S.company, v); U.commit(); EE.fx.success(a); break;
        case 'save-rules':
          var on = function (n) { return view.querySelector('[data-rule="' + n + '"] .on').dataset.v; };
          var m = Number(document.getElementById('r-margin').value), d = Number(document.getElementById('r-days').value);
          if (!(m >= 0 && m <= 100) || !(d >= 1)) { EE.fx.toast('数値を確認してください', { warn: true }); return; }
          Object.assign(S.settings, { lineRounding: on('lineRounding'), taxRounding: on('taxRounding'), minMargin: m / 100, validDays: Math.round(d),
            numberPrefix: document.getElementById('r-prefix').value.trim() || 'EST' });
          U.commit(); EE.fx.success(a); break;
        case 'replay-splash': EE.splash.play({ force: 'full' }); break;
        case 'export':
          U.download('easy-estimate_backup_' + EE.data.today() + '.json', JSON.stringify(S, null, 2));
          EE.fx.success(a, '書き出しました'); break;
        case 'sample':
          if (!(await U.confirmBox('今のデータを消して、サンプルデータに戻しますか？\n（先にバックアップの書き出しをおすすめします）', 'サンプルに戻す', { danger: true }))) return;
          EE.S = EE.data.sampleState(); U.commit(); EE.fx.toast('サンプルデータに戻しました'); EE.app.rerender(); break;
        case 'wipe':
          if (!(await U.confirmBox('マスタ・顧客・書類をすべて削除します。元に戻せません。', 'すべて削除', { danger: true }))) return;
          var keep = { company: S.company, settings: S.settings };
          EE.S = Object.assign(EE.data.defaultState(), keep); U.commit(); EE.fx.toast('すべて削除しました'); EE.app.rerender(); break;
      }
    });
    view.addEventListener('input', function (e) {
      if (e.target.id === 'm-q') { mf.q = e.target.value; refreshItems(); }
      if (e.target.name === 'invoiceRegNo') {
        var ok = !e.target.value || /^T\d{13}$/.test(e.target.value.trim());
        e.target.classList.toggle('flag-err', !ok);
        document.getElementById('reg-hint').textContent = ok ? '「T」＋数字13桁' : '形式が違います：「T」＋数字13桁（今 ' + e.target.value.trim().length + '文字）';
      }
    });
    view.addEventListener('change', function (e) {
      if (e.target.id === 'csv-in' && e.target.files[0]) { csvIn(e.target.files[0]); e.target.value = ''; }
      if (e.target.id === 'json-in' && e.target.files[0]) {
        var rd = new FileReader();
        rd.onload = async function () {
          try {
            var s = JSON.parse(rd.result);
            if (!s || s.schema !== 1 || !Array.isArray(s.items) || !Array.isArray(s.documents)) throw new Error('形式が違います');
            if (!(await U.confirmBox('読み込むと今のデータは置き換わります。続けますか？\n（マスタ ' + s.items.length + '件・書類 ' + s.documents.length + '件）', '読み込む'))) return;
            EE.S = EE.data.migrate(s); U.commit(); EE.fx.toast('読み込みました'); EE.app.rerender();
          } catch (err) { EE.fx.toast('読み込めませんでした：' + err.message, { warn: true, ms: 4000 }); }
        };
        rd.readAsText(e.target.files[0]); e.target.value = '';
      }
    });
  }

  EE.views = EE.views || {};
  EE.views.settings = { render: render, parseCSV: parseCSV };
})(this);
