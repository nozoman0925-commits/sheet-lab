/* 設定・マスタ：マスタ / 工事パッケージ / 自社情報 / 計算ルール / データ */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;
  var K = EE.engine.ITEM_KINDS, TC = EE.engine.TAX_CATEGORIES, CT = EE.engine.COST_TYPES;
  var TABS = [['members', '担当者'], ['items', '工事項目・単価マスター'], ['packages', '工事テンプレート'], ['formulas', '計算式'], ['snippets', '定型文'], ['company', '自社情報'], ['rules', '計算ルール'], ['features', '機能ライブラリ'], ['data', 'データ・拡張']];
  var mf = { kind: 'all', q: '', cat: '', showInactive: true };

  /* ---------- マスタ ---------- */
  function itemRows() {
    var nq = U.norm(mf.q);
    var list = EE.S.items.filter(function (it) {
      if (mf.kind !== 'all' && it.kind !== mf.kind) return false;
      if (mf.cat && it.category !== mf.cat) return false;
      if (!nq) return true;
      return U.norm(it.code + it.name + it.spec + (it.synonyms || []).join(' ')).indexOf(nq) >= 0;
    }).sort(function (a, b) { return a.code.localeCompare(b.code); });
    if (!list.length) return '<div class="empty">' + I.box + '該当するマスタがありません</div>';
    return '<div class="table-scroll"><table class="table"><thead><tr><th>コード</th><th>区分</th><th>品名 / 規格 / 同義語</th><th>単位</th><th class="r">単価</th><th class="r">原価（仕入）</th><th class="r">粗利率</th><th>税</th><th>原価区分</th><th>状態</th><th></th></tr></thead><tbody>' +
      list.map(function (it) {
        var m = it.unitPrice ? (it.unitPrice - it.unitCost) / it.unitPrice : null;
        return '<tr class="clickable" data-iid="' + it.id + '" data-st style="' + (it.active === false ? 'opacity:.5' : '') + '">' +
          '<td class="num">' + esc(it.code) + '</td><td><span class="badge">' + K[it.kind] + '</span></td>' +
          '<td>' + esc(it.name) + '<span class="cell-sub">' + esc(it.spec || '') + (it.category ? '　［' + esc(EE.settingsExtra.catName(it.category)) + '］' : '') + '</span>' + ((it.synonyms || []).length ? '<span class="cell-sub" style="color:var(--dim)">同義語：' + esc(it.synonyms.slice(0, 5).join('、')) + (it.synonyms.length > 5 ? ' ほか' : '') + '</span>' : '') + '</td><td class="muted">' + esc(it.unit) + '</td>' +
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
        '<div class="search grow" style="min-width:220px">' + I.search + '<input class="input" id="m-q" placeholder="コード・品名・規格・同義語で検索" value="' + esc(mf.q) + '"></div>' +
        '<select class="input" id="m-cat" style="width:auto"><option value="">工事カテゴリー：すべて</option>' + (EE.S.categories || []).map(function (c) { return U.opt(c.id, c.name, mf.cat); }).join('') + '</select>' +
        '<div class="seg" id="m-kind">' + [['all', 'すべて']].concat(Object.keys(K).map(function (k) { return [k, K[k]]; })).map(function (k) {
          return '<button data-kind="' + k[0] + '" class="' + (mf.kind === k[0] ? 'on' : '') + '">' + k[1] + '</button>'; }).join('') + '</div>' +
        '<button class="btn" data-act="csv-out">' + I.download + 'CSVで書き出す</button>' +
        '<label class="btn">' + I.upload + 'CSV取り込み<input type="file" accept=".csv,text/csv" id="csv-in" hidden></label>' +
        '<button class="btn primary" data-act="new-item">' + I.plus + 'マスタに登録する</button>' +
      '</div><div id="m-table">' + itemRows() + '</div></div></section>' +
      '<p class="hint" data-st style="margin-top:12px">単価を変えても、作成済みの見積の単価は変わりません。送信前チェックで「マスタ単価と違う」と知らせるので、必要な見積だけ「最新単価に更新」してください。<br>使っている品目は削除せず「使用停止」にすると、過去の見積を壊さずに検索候補から外せます。</p>';
  }

  function itemForm(it) {
    var isNew = !it;
    it = it || { id: EE.data.uid('itm'), code: '', kind: 'material', category: mf.cat || '', name: '', spec: '', unit: '式', unitPrice: 0, unitCost: 0, taxCategory: 'std10', costType: 'material', active: true,
      synonyms: [], stdQty: 1, description: '', supplier: '', contractor: '', note: '', priceHistory: [] };
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
        '<div class="field c4"><label>工事カテゴリー</label><select class="input" name="category"><option value="">（なし）</option>' + (EE.S.categories || []).map(function (c) { return U.opt(c.id, c.name, it.category); }).join('') + '</select></div>' +
        '<div class="field c4"><label>標準数量</label><input class="input num" type="number" step="0.01" name="stdQty" value="' + (it.stdQty != null ? it.stdQty : 1) + '"></div>' +
        '<div class="field c4"><label>仕入先</label><input class="input" name="supplier" value="' + esc(it.supplier || '') + '"></div>' +
        '<div class="field c12"><label>同義語（読点・カンマ区切り）— 文章・音声・PDFからの照合に使います</label><input class="input" name="synonyms" value="' + esc((it.synonyms || []).join('、')) + '" placeholder="例：フェンス設置、フェンス取付"></div>' +
        '<div class="field c6"><label>施工業者</label><input class="input" name="contractor" value="' + esc(it.contractor || '') + '"></div>' +
        '<div class="field c6"><label>説明・備考</label><input class="input" name="description" value="' + esc(it.description || '') + '"></div>' +
      '</div>' +
      ((it.priceHistory || []).length ? '<div class="label" style="margin:14px 0 6px">価格の履歴（過去の見積の単価は変わりません）</div>' +
        '<table class="table"><tbody>' + it.priceHistory.slice().reverse().slice(0, 8).map(function (h) {
          return '<tr><td class="num muted">' + esc(h.from) + ' から</td><td class="r num">単価 ' + U.yen(h.unitPrice) + '</td><td class="r num muted">原価 ' + U.yen(h.unitCost) + '</td></tr>'; }).join('') + '</tbody></table>' : '') + (used ? '<p class="hint" style="margin-top:12px">この品目は見積で使われています。削除の代わりに「使用中」のチェックを外すと検索候補から外れます。</p>' : ''),
      foot: (isNew || used ? '' : '<button class="btn danger" data-del>' + I.trash + '削除する</button>') + '<div class="spacer"></div>' +
        '<button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-s>' + I.save + '保存する</button>',
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
          // 書類で使っている品目を消すと、過去の書類（発行済みも）がマスタを失うので消さない
          var used = EE.S.documents.filter(function (d) { return d.lines.some(function (l) { return l.itemId === it.id; }); }).length;
          if (used) { EE.fx.toast('「' + it.name + '」は ' + used + ' 件の書類で使っているため削除できません。「使用中」を外すと、新しい見積の候補に出なくなります', { warn: true, ms: 6000 }); return; }
          if (!(await U.confirmBox('「' + it.name + '」を削除しますか？', '削除する', { danger: true }))) return;
          var undo = U.undoable('「' + it.name + '」を削除しました', ['items', 'packages']);
          EE.S.items.splice(EE.S.items.indexOf(it), 1);
          EE.S.packages.forEach(function (p) { p.lines = p.lines.filter(function (l) { return l.itemId !== it.id; }); });
          U.commit(); api.close(); refreshItems(); undo();
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
          v.synonyms = EE.settingsExtra.splitList(v.synonyms);
          if (v.stdQty == null || !(v.stdQty > 0)) v.stdQty = 1;
          var changed = isNew || v.unitPrice !== it.unitPrice || v.unitCost !== it.unitCost;
          Object.assign(it, v, { updatedAt: EE.data.today() });
          if (changed) {
            it.priceHistory = (it.priceHistory || []).filter(function (h) { return h.from !== EE.data.today(); });
            it.priceHistory.push({ from: EE.data.today(), unitPrice: it.unitPrice, unitCost: it.unitCost });
          }
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

  /* ---------- 機能ライブラリ ---------- */
  // メニューに出す・出さないを選べる。隠してもデータは消さない。準備中の機能は「第N期で追加」と並べる
  function featuresTab() {
    var F = EE.features, hid = F.settings().navHidden, ready = F.FEATURES.filter(function (f) { return f.status === 'ready'; }).length;
    return '<section class="panel" data-st style="max-width:980px"><div class="panel-h"><h2>機能ライブラリ</h2><span class="sub">使える機能 ' + ready + ' / ' + F.FEATURES.length + '</span></div><div class="panel-b">' +
      '<p class="hint" style="margin-top:0">左のメニューに出すまとまりを選べます。隠してもデータは消えず、Ctrl+K の検索からはいつでも開けます。準備中の機能は、構想の順番（第N期）で追加していきます。</p>' +
      '<div class="lib">' + F.SECTIONS.map(function (s) {
        var list = F.FEATURES.filter(function (f) { return f.section === s.key; }), lock = s.key === 'home' || s.key === 'settings';
        return '<div class="lib-sec' + (s.planned ? ' planned' : '') + '"><div class="lib-head">' + I[s.icon] + '<b>' + esc(s.label) + '</b><span class="hint">' + esc(s.note) + '</span><div class="spacer"></div>' +
          (s.planned ? '<span class="badge">準備中（第' + s.planned + '期）</span>' :
            lock ? '<span class="hint">常に表示</span>' : '<label class="chk"><input type="checkbox" data-nav-show="' + s.key + '"' + (hid[s.key] ? '' : ' checked') + '> メニューに出す</label>') + '</div>' +
          '<ul class="lib-list">' + list.map(function (f) {
            return '<li class="' + f.status + '">' + (f.status === 'ready' ? '<a href="' + f.href + '">' + esc(f.name) + '</a>' : '<span>' + esc(f.name) + '</span><span class="badge">第' + f.phase + '期</span>') + '</li>';
          }).join('') + '</ul></div>';
      }).join('') + '</div></div></section>';
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
      f('c3', 'tel', '電話') + f('c3', 'fax', 'FAX') + f('c6', 'email', 'メール') + f('c6', 'rep', '代表者') +
      f('c6', 'license', '建設業許可番号', '例：東京都知事許可（般-6）第000000号') + f('c6', 'bank', '振込先（請求書で使用予定）') +
      '</div><div style="margin-top:18px;display:flex;justify-content:flex-end"><button class="btn primary" data-act="save-co">' + I.save + '保存</button></div></div></section>' +
      // 会社ロゴ・会社印（角印）
      '<section class="panel" data-st style="max-width:920px;margin-top:18px"><div class="panel-h"><h2>会社ロゴ・会社印</h2><span class="sub">見積書（PDF）の発行元の欄に入ります</span></div><div class="panel-b"><div class="brand-assets">' +
        '<div class="asset"><div class="label">会社ロゴ（横長・推奨 360×120px）</div><div class="asset-box logo">' + logoPreview(c) + '</div>' +
          '<div class="asset-actions"><label class="btn sm">' + I.upload + '画像を選ぶ<input type="file" accept="image/png,image/jpeg,image/webp" id="up-logo" hidden></label>' +
          (c.logo ? '<button class="btn sm ghost" data-act="del-logo">家紋＋会社名に戻す</button>' : '') + '</div>' +
          '<label class="chk"><input type="checkbox" id="show-logo"' + (c.showLogo !== false ? ' checked' : '') + '> 見積書にロゴを入れる</label>' +
          '<span class="hint">画像を選ばないときは、家紋と会社名でロゴを作ります。</span></div>' +
        '<div class="asset"><div class="label">会社印・角印（正方形・推奨 500×500px）</div><div class="asset-box seal">' + (c.seal ? '<img src="' + c.seal + '" alt="登録した会社印">' : '<span class="hint">未登録</span>') + '</div>' +
          '<div class="asset-actions"><label class="btn sm">' + I.upload + '画像を選ぶ<input type="file" accept="image/png,image/jpeg,image/webp" id="up-seal" hidden></label>' +
          (c.seal ? '<button class="btn sm ghost" data-act="del-seal">削除する</button>' : '') + '</div>' +
          '<label class="chk"><input type="checkbox" id="show-seal"' + (c.showSeal !== false ? ' checked' : '') + '> 見積書に角印を押す（会社名の上に重ねる）</label>' +
          '<span class="hint">背景が透明か白の画像がきれいに出ます。画像はこのブラウザの中にだけ保存されます。</span></div>' +
      '</div></div></section>';
  }
  /** ロゴの見本：画像があればそれ、無ければ家紋＋会社名 */
  function logoPreview(c) {
    if (c.logo) return '<img src="' + c.logo + '" alt="登録した会社ロゴ">';
    return '<span class="crest-logo">' + EE.crest.svg({ id: 'colog', className: 'brand-crest', fieldR: 106 }) + '<b>' + esc(c.name || '会社名') + '</b></span>';
  }
  /** 画像を読み込み、長辺を縮めて PNG にする（保存の容量を抑える） */
  function loadImage(file, maxW, maxH, done) {
    if (!file || !/^image\//.test(file.type)) { EE.fx.toast('画像ファイル（PNG・JPEG）を選んでください', { warn: true }); return; }
    if (file.size > 8 * 1024 * 1024) { EE.fx.toast('画像が大きすぎます（8MBまで）', { warn: true }); return; }
    var rd = new FileReader();
    rd.onload = function () {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, maxW / img.width, maxH / img.height), w = Math.round(img.width * k), h = Math.round(img.height * k);
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        done(cv.toDataURL('image/png'));
      };
      img.onerror = function () { EE.fx.toast('画像を読み込めませんでした', { warn: true }); };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  }

  /* ---------- 計算ルール ---------- */
  function rulesTab() {
    var s = EE.S.settings;
    var seg = function (name, val) {
      return '<div class="seg" data-rule="' + name + '">' + [['floor', '切り捨て'], ['round', '四捨五入'], ['ceil', '切り上げ']].map(function (m) {
        return '<button data-v="' + m[0] + '" class="' + (val === m[0] ? 'on' : '') + '">' + m[1] + '</button>'; }).join('') + '</div>';
    };
    return '<section class="panel" data-st style="max-width:920px"><div class="panel-h"><h2>計算ルール</h2><span class="sub">金額はすべてこのルールと登録マスタだけで決まります</span></div><div class="panel-b"><div class="form-grid">' +
      '<div class="field c6"><label>明細金額（数量×単価）の端数</label>' + seg('lineRounding', s.lineRounding) + '<span class="hint">1.5人工×¥26,001 などで1円未満が出たときの扱い</span></div>' +
      '<div class="field c6"><label>消費税の端数</label>' + seg('taxRounding', s.taxRounding) + '<span class="hint">インボイス制度に合わせ、1書類につき税率ごとに1回だけ端数処理します</span></div>' +
      '<div class="field c6"><label>諸経費（率）の端数</label>' + seg('overheadRounding', s.overheadRounding || 'floor') + '</div>' +
      '<div class="field c6"><label>値引き（率）の端数</label>' + seg('discountRounding', s.discountRounding || 'ceil') + '<span class="hint">計算順序：明細 → 諸経費 → 値引き → 端数調整 → 消費税</span></div>' +
      '<div class="field c4"><label>粗利率の下限（%）</label><input class="input num" type="number" id="r-margin" value="' + Math.round(s.minMargin * 100) + '" min="0" max="100"><span class="hint">下回ると送信前チェックで注意を出します</span></div>' +
      '<div class="field c4"><label>有効期限の既定（日）</label><input class="input num" type="number" id="r-days" value="' + s.validDays + '" min="1"></div>' +
      '<div class="field c4"><label>見積番号の頭文字</label><input class="input num" id="r-prefix" value="' + esc(s.numberPrefix) + '"><span class="hint">例：EST-202611-001</span></div>' +
      '<div class="field c12"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="r-autosave"' + (EE.S.autoSave !== false ? ' checked' : '') + '> 入力途中の見積を自動保存する（保存済みの下書きは1.5秒ごとに上書き、新規は端末に一時保存）</label></div>' +
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
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn danger" data-act="wipe">' + I.trash + 'すべて削除</button></div></div></section>' +
      '<section class="panel" data-st><div class="panel-h"><h2>起動アニメーション</h2></div><div class="panel-b">' +
        '<p class="hint" style="margin-top:0">初回はフル演出、2回目以降は短縮版で表示します。どこかをクリックするか、キーを押すと飛ばせます。</p>' +
        '<button class="btn" data-act="replay-splash">' + I.spark + '起動アニメーションをもう一度見る</button></div></section>' +
      '<section class="panel" data-st><div class="panel-h"><span class="kpi-icon">' + I.spark + '</span><h2>入力補助オプション</h2><div class="spacer"></div><span class="badge">未導入</span></div><div class="panel-b">' +
        '<p class="hint" style="margin-top:0">音声入力・写真読取などは後から追加できる有料オプションの枠です。導入しても、AIが出すのは「どのマスタを何個使うか」の候補だけで、<b style="color:var(--text-2)">金額は必ずマスタと計算エンジンが決めます</b>。</p>' +
        '<div class="hint">登録済みの拡張：' + (EE.plugins.inputAssist.length ? EE.plugins.inputAssist.map(function (p) { return esc(p.name); }).join('、') : 'なし') + '</div></div></section>' +
    '</div>';
  }

  function render(tab) {
    tab = tab || 'items';
    var X = EE.settingsExtra;
    var body = { members: EE.views.folders.membersTab, items: itemsTab, packages: X.templatesTab, formulas: X.formulasTab, snippets: X.snippetsTab, company: companyTab, rules: rulesTab, features: featuresTab, data: dataTab }[tab] || itemsTab;
    // 業務管理の中では、担当者（社員の名簿は業務管理）・データ（全員の共有データの消去）・機能ライブラリ（メニューは業務管理）は出さない
    // 桜ミツ版（EE.link）では、担当者は業務管理の「社員」、データは端末全体のバックアップ（EE.linkBackup）
    var HIDE = EE.host ? ['members', 'data', 'features'] : EE.link ? ['members'] : [];
    var tabs = TABS.filter(function (t) { return HIDE.indexOf(t[0]) < 0; }).map(function (t) { return EE.link && t[0] === 'data' ? ['data', '自分の名前・バックアップ'] : t; });
    if (HIDE.indexOf(tab) >= 0) { tab = 'items'; body = itemsTab; }
    if (EE.link && tab === 'data' && EE.linkBackup) body = EE.linkBackup.html;
    if (EE.link && tab === 'actual' && EE.linkActual) body = function () { return EE.linkActual.html(); };   // 実績から原価を見直す（桜ミツ版は別のタブ）
    var html = '<div class="seg" data-st id="set-tabs" style="margin-bottom:18px' + (EE.link ? ';display:none' : '') + '">' + tabs.map(function (t) {
      return '<button data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div id="set-body">' + body() + '</div>';
    return { title: '設定', crumb: ((tabs.filter(function (t) { return t[0] === tab; })[0] || TABS.filter(function (t) { return t[0] === tab; })[0]) || [0, '実績から原価を見直す'])[1], html: html, mount: function (v) { mount(v, tab); } };
  }

  function mount(view, tab) {
    if (EE.link && tab === 'data' && EE.linkBackup) EE.linkBackup.mount(view);
    if (EE.link && tab === 'actual' && EE.linkActual) EE.linkActual.mount(view);
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
        case 'new-member': EE.views.folders.memberForm(null, function () { EE.app.rerender(); }); break;
        case 'edit-member': EE.views.folders.memberForm(U.findMember(a.dataset.id), function () { EE.app.rerender(); }); break;
        case 'new-pkg': case 'edit-pkg': case 'cats': case 'new-f': case 'edit-f': case 'new-snip': case 'edit-snip':
          EE.settingsExtra.handle(a.dataset.act, a); break;
        case 'save-co':
          var v = U.readForm(document.getElementById('co-form'));
          if (!v.name) { var n = view.querySelector('[name=name]'); n.classList.add('flag-err'); EE.fx.shake(n); return; }
          if (v.invoiceRegNo && !/^T\d{13}$/.test(v.invoiceRegNo)) { var r = view.querySelector('[name=invoiceRegNo]'); r.classList.add('flag-err'); EE.fx.shake(r); EE.fx.toast('登録番号は「T」＋数字13桁です', { warn: true }); return; }
          Object.assign(S.company, v); U.commit(); EE.fx.success(a, '保存しました'); break;
        case 'del-logo': var undoLogo = U.undoable('ロゴを家紋＋会社名に戻しました', ['company']); S.company.logo = ''; U.commit(); undoLogo(); EE.app.rerender(); break;
        case 'del-seal':
          if (!(await U.confirmBox('登録した会社印を削除しますか？', '削除する', { danger: true }))) return;
          var undoSeal = U.undoable('会社印を削除しました', ['company']); S.company.seal = ''; U.commit(); undoSeal(); EE.app.rerender(); break;
        case 'save-rules':
          var on = function (n) { return view.querySelector('[data-rule="' + n + '"] .on').dataset.v; };
          var m = Number(document.getElementById('r-margin').value), d = Number(document.getElementById('r-days').value);
          if (!(m >= 0 && m <= 100) || !(d >= 1)) { EE.fx.toast('数値を確認してください', { warn: true }); return; }
          S.autoSave = document.getElementById('r-autosave').checked;
          Object.assign(S.settings, { lineRounding: on('lineRounding'), taxRounding: on('taxRounding'), overheadRounding: on('overheadRounding'), discountRounding: on('discountRounding'), minMargin: m / 100, validDays: Math.round(d),
            numberPrefix: document.getElementById('r-prefix').value.trim() || 'EST' });
          U.commit(); EE.fx.success(a, '保存しました'); break;
        case 'replay-splash': EE.splash.play({ replay: true, onReveal: EE.app.intro }); break;
        case 'export':
          U.download('easy-estimate_backup_' + EE.data.today() + '.json', JSON.stringify(S, null, 2));
          EE.fx.success(a, '書き出しました'); break;
        case 'wipe':
          var keptDocs = S.documents.filter(function (d) { return d.status === 'issued' || (d.history || []).some(function (h) { return /PDF出力/.test(h.action); }); });
          if (!(await U.confirmBox('マスタ・顧客・下書きの書類をすべて削除します。元に戻せません。' + (keptDocs.length ? '\n\n確定済み・PDFを出した書類 ' + keptDocs.length + ' 件は、電子帳簿保存法の保存のため残します。' : ''), 'すべて削除', { danger: true }))) return;
          // 残す書類は、宛名などを確定時の写しに持たせてから残す（顧客を消しても PDF が同じになるように）
          keptDocs.forEach(function (d) { if (!d.snap) d.snap = EE.data.snapOf(S, d); if (d.status !== 'issued') { d.status = 'issued'; d.issuedAt = d.issuedAt || new Date().toISOString(); d.totals = d.totals || EE.engine.snapshot(EE.engine.calc(d, S.settings)); } d.customerId = ''; d.projectId = ''; });
          var keep = { company: S.company, settings: S.settings, documents: keptDocs, seq: S.seq };
          EE.S = EE.data.migrate(Object.assign(EE.data.defaultState(), keep));
          if (EE.auth && EE.auth.current()) EE.app.linkMember(EE.auth.current());
          U.commit(); EE.fx.toast('すべて削除しました'); EE.app.rerender(); EE.app.renderUser(); break;
      }
    });
    view.addEventListener('input', function (e) {
      if (e.target.id === 'm-q') { mf.q = e.target.value; refreshItems(); }
      if (e.target.id === 'm-cat') { mf.cat = e.target.value; refreshItems(); }
      if (e.target.name === 'invoiceRegNo') {
        var ok = !e.target.value || /^T\d{13}$/.test(e.target.value.trim());
        e.target.classList.toggle('flag-err', !ok);
        document.getElementById('reg-hint').textContent = ok ? '「T」＋数字13桁' : '形式が違います：「T」＋数字13桁（今 ' + e.target.value.trim().length + '文字）';
      }
    });
    view.addEventListener('change', function (e) {
      // 会社ロゴ・会社印：選んだら縮めてすぐ保存
      if ((e.target.id === 'up-logo' || e.target.id === 'up-seal') && e.target.files[0]) {
        var isLogo = e.target.id === 'up-logo';
        loadImage(e.target.files[0], isLogo ? 720 : 500, isLogo ? 240 : 500, function (url) {
          EE.S.company[isLogo ? 'logo' : 'seal'] = url; U.commit();
          EE.fx.toast(isLogo ? '会社ロゴを登録しました' : '会社印を登録しました'); EE.app.rerender();
        });
        e.target.value = ''; return;
      }
      if (e.target.dataset.navShow) {
        var ui = EE.features.settings(); ui.navHidden[e.target.dataset.navShow] = !e.target.checked; U.commit(); EE.app.renderNav();
        EE.fx.toast(e.target.checked ? 'メニューに出しました' : 'メニューから隠しました（データは残っています）'); return;
      }
      if (e.target.id === 'show-logo' || e.target.id === 'show-seal') {
        EE.S.company[e.target.id === 'show-logo' ? 'showLogo' : 'showSeal'] = e.target.checked; U.commit(); EE.fx.toast('保存しました'); return;
      }
      if (e.target.id === 'csv-in' && e.target.files[0]) { csvIn(e.target.files[0]); e.target.value = ''; }
      if (e.target.id === 'json-in' && e.target.files[0]) {
        var rd = new FileReader();
        rd.onload = async function () {
          try {
            var s = JSON.parse(rd.result);
            if (!s || (s.schema !== 1 && s.schema !== 2) || !Array.isArray(s.items) || !Array.isArray(s.documents)) throw new Error('形式が違います');
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
