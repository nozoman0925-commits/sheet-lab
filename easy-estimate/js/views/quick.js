/*
 * かんたん見積もり作成
 * どの入り口（文章・音声・PDF・写真・過去の見積・テンプレート・通常入力）から始めても、
 * 最後は同じ見積データ（マスタID＋数量＋単価）にして見積エディタで開く。
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;

  var METHODS = [
    { key: 'text', title: '文章から', desc: '「フェンス10m、高さ1800、独立基礎…」のように書くと、辞書とテンプレートで明細にします', icon: I.edit },
    { key: 'voice', title: '音声から', desc: 'スマホやPCの音声入力で話した内容を文字にして、文章と同じように明細にします', icon: 'mic' },
    { key: 'pdf', title: 'PDFから', desc: '他社や過去の見積書・請求書のPDFを読み取り、自社の見積書に変換します', icon: I.file },
    { key: 'photo', title: '写真から', desc: '紙の見積書や手書きメモを撮影し、文字を読み取って明細にします', icon: 'camera' },
    { key: 'past', title: '過去の見積から', desc: '似た工事の見積を探して、必要な明細だけ流用します', icon: I.copy },
    { key: 'template', title: 'テンプレートから', desc: '工事の種類を選び、標準の明細から必要なものに印を付けます', icon: I.box },
    { key: 'edit', title: '通常入力', desc: '空の見積書から、マスタを検索して明細を追加します', icon: I.plus }
  ];
  var MIC = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8.6" y="3.2" width="6.8" height="11" rx="3.4"/><path d="M5.5 11.2a6.5 6.5 0 0 0 13 0M12 17.7v2.8"/></svg>';
  var CAM = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 7.5h.8a1.5 1.5 0 0 0 1.3-.8l.6-1.1a1.5 1.5 0 0 1 1.3-.8h3a1.5 1.5 0 0 1 1.3.8l.6 1.1a1.5 1.5 0 0 0 1.3.8h.8a3 3 0 0 1 3 3V16a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3v-5.5a3 3 0 0 1 3-3z"/><circle cx="12" cy="13" r="3.2"/></svg>';
  function icon(m) { return m.icon === 'mic' ? MIC : m.icon === 'camera' ? CAM : m.icon; }

  function catName(id) { var c = (EE.S.categories || []).filter(function (x) { return x.id === id; })[0]; return c ? c.name : ''; }

  /** 候補行 → 見積の下書き（エディタへ） */
  function openDraft(o) {
    var lines = [];
    (o.rows || []).forEach(function (r) {
      if (r.include === false) return;
      var it = U.findItem(r.itemId);
      if (!it) return;
      var q = Number(r.qty);
      if (!isFinite(q) || q === 0) q = it.stdQty || 1;
      var ln = EE.data.lineFromItem(it, q);
      if (r.unitPrice != null && r.unitPrice !== it.unitPrice) {   // 取り込み元や過去見積の単価を使う場合は出どころを残す
        ln.unitPrice = r.unitPrice; ln.unitCost = r.unitCost != null ? r.unitCost : ln.unitCost;
        ln.priceSource = r.priceSource || null; ln.priceDate = r.priceDate || ln.priceDate;
      }
      if (r.source) ln.inputSource = r.source;
      lines.push(ln);
    });
    var adjustments = (o.adjustments || []).filter(function (a) { return a.include !== false; }).map(function (a) {
      return { id: EE.data.uid('adj'), type: a.type, label: a.label || (a.type === 'overhead' ? '諸経費' : '値引き'), mode: a.mode || 'rate',
        rateBp: a.rateBp || 0, amount: a.amount || 0, taxCategory: a.taxCategory || 'std10', scope: 'all', unit: a.unit };
    });
    var pre = { lines: lines, adjustments: adjustments, category: o.category || '', title: o.title || '', customerId: o.customerId || '',
      projectId: o.projectId || '', notes: o.notes || '', importInfo: o.importInfo || null, sourceLabel: o.sourceLabel || '' };
    ['paymentTerms', 'deliveryTerm', 'deliveryPlace'].forEach(function (k) { if (o[k]) pre[k] = o[k]; });
    EE.app.newWith(pre);
  }

  /* ================ ハブ ================ */
  function hub() {
    var html = '<div class="hint" data-st style="margin-bottom:16px">どの方法で始めても、最後は同じ見積書の画面で確認・修正できます。金額はすべてマスタと計算エンジンで決まります。</div>' +
      '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">' +
      METHODS.map(function (m) {
        return '<a class="panel kpi quick-card" data-st href="#/new/' + m.key + '"><div class="kpi-label"><span class="kpi-icon">' + icon(m) + '</span><b style="color:var(--text);font-size:15px">' + m.title + '</b></div>' +
          '<div class="hint" style="margin-top:10px;line-height:1.7">' + m.desc + '</div></a>';
      }).join('') + '</div>';
    return { title: EE.link ? '見積を作る' : 'かんたん見積もり作成', crumb: '作り方を選ぶ', html: html };
  }

  /* ================ 文章・音声 ================ */
  var lastText = '';
  var EXAMPLES = [
    'フェンス工事の見積もりを作成。既存フェンス撤去、新規フェンス10メートル、高さ1800、独立基礎、残土処分込み。',
    '外壁塗装 延床30坪。足場、高圧洗浄、シーラー、シリコン上塗り、付帯部、廃材処分',
    'ユニットバス交換、既存撤去、給排水、電気、下地補強'
  ];

  function textView(voice) {
    var cust = '<option value="">（文章から自動で探す）</option>' + EE.S.customers.map(function (c) { return U.opt(c.id, c.name + ' ' + c.honorific, ''); }).join('');
    var html = '<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);align-items:start">' +
      '<section class="panel" data-st><div class="panel-h"><h2>' + (voice ? '話した内容' : '工事の内容を文章で') + '</h2></div><div class="panel-b">' +
        (voice ? '<div class="check info" style="margin-bottom:12px;grid-template-columns:22px 1fr"><span class="ic">i</span><div><div class="t">端末の音声入力を使います</div>' +
          '<div class="d">下の欄を押してから、スマホはキーボードのマイク、Windows は <kbd>Win</kbd>+<kbd>H</kbd>、Mac は <kbd>fn</kbd> を2回押して話してください。このアプリ自体は録音・送信をしません（音声を文字にする処理は端末・OSの設定に従います）。</div></div></div>' : '') +
        '<textarea class="input" id="q-text" rows="8" placeholder="例：' + esc(EXAMPLES[0]) + '" style="min-height:180px;font-size:15px">' + esc(lastText) + '</textarea>' +
        '<div class="form-grid" style="margin-top:12px"><div class="field c6"><label>宛先</label><select class="input" id="q-cust">' + cust + '</select></div>' +
          '<div class="field c6"><label>&nbsp;</label><button class="btn primary" id="q-parse">' + I.spark + '明細にする</button></div></div>' +
        '<div class="label" style="margin:16px 0 8px">例文（クリックで入力）</div><div class="pkg-list">' +
          EXAMPLES.map(function (e, i) { return '<button class="pkg" data-ex="' + i + '">' + esc(e.slice(0, 18)) + '…</button>'; }).join('') + '</div>' +
        '<p class="hint" style="margin-top:14px">読み取りは「工事項目マスターの名前・同義語」と「工事テンプレート」との照合で行います。読めなかった語句は推測せず、右に一覧で出します。</p>' +
      '</div></section>' +
      '<section class="panel" data-st><div class="panel-h"><h2>読み取り結果</h2><div class="spacer"></div><span class="sub" id="q-meta"></span></div><div class="panel-b" id="q-result">' +
        '<div class="empty">' + I.spark + '左に工事の内容を入れて「明細にする」を押してください</div></div></section></div>';
    return { title: voice ? '音声から見積もり作成' : '文章から見積もり作成', crumb: 'かんたん見積もり作成', html: html, mount: function (v) { mountText(v); } };
  }

  var R = null; // 解析結果（画面で編集する）

  function itemOptions(sel, prefer) {
    var list = EE.S.items.filter(function (it) { return it.active !== false || it.id === sel; });
    if (prefer && prefer.length) list = prefer.map(U.findItem).filter(Boolean);
    return list.map(function (it) { return U.opt(it.id, it.code + '　' + it.name + (it.spec ? '（' + it.spec + '）' : ''), sel); }).join('');
  }

  var SRC = { text: ['blue', '文章'], linked: ['warn', '引用'], template: ['warn', 'テンプレート'], standard: ['warn', '標準数量'] };

  function resultHTML() {
    if (!R) return '';
    var rows = R.rows;
    var tbl = '<div class="table-scroll"><table class="table"><thead><tr><th style="width:34px"></th><th>品目</th><th class="r" style="width:110px">数量</th><th>単位</th><th class="r">単価</th><th>根拠</th></tr></thead><tbody>' +
      rows.map(function (r, i) {
        var it = U.findItem(r.itemId) || {};
        var src = r.source === 'template' ? SRC.template : SRC[r.qtySource] || SRC.text;
        return '<tr data-i="' + i + '" style="' + (r.include ? '' : 'opacity:.5') + '">' +
          '<td><input type="checkbox" data-k="include"' + (r.include ? ' checked' : '') + '></td>' +
          '<td>' + (r.alternatives && r.alternatives.length > 1
            ? '<select class="input" data-k="itemId" style="height:32px">' + itemOptions(r.itemId, r.alternatives) + '</select>'
            : esc(it.name) + (it.spec ? ' <span class="hint">' + esc(it.spec) + '</span>' : '')) +
            (r.phrase ? '<span class="cell-sub">「' + esc(r.phrase) + '」</span>' : r.source === 'template' ? '<span class="cell-sub">' + (r.optional ? 'テンプレートの参考候補' : '文章に無い項目（テンプレートの標準）') + '</span>' : '') +
            (r.notes || []).map(function (n) { return '<span class="cell-sub" style="color:var(--warn)">' + esc(n) + '</span>'; }).join('') + '</td>' +
          '<td class="r"><input class="input num" data-k="qty" type="number" step="0.01" value="' + esc(r.qty) + '" style="height:32px;text-align:right"></td>' +
          '<td class="muted">' + esc(it.unit || '') + '</td>' +
          '<td class="r num muted">' + U.yen(it.unitPrice) + '</td>' +
          '<td><span class="badge ' + src[0] + '">' + src[1] + '</span></td></tr>';
      }).join('') + '</tbody></table></div>';
    var unknown = R.unknown.length ? '<div class="sep"></div><div class="label" style="margin-bottom:8px">辞書に無い語句（' + R.unknown.length + '）— 推測では埋めていません</div>' +
      R.unknown.map(function (u, i) {
        return '<div class="check warn" style="grid-template-columns:22px 1fr auto;margin-bottom:6px" data-u="' + i + '"><span class="ic">?</span><div><div class="t">「' + esc(u) + '」</div>' +
          '<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap"><select class="input" data-k="map" style="height:32px;max-width:320px"><option value="">品目を選ぶ…</option>' + itemOptions('') + '</select>' +
          '<label class="hint" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-k="learn" checked>この語句を同義語として登録</label></div></div>' +
          '<button class="btn sm" data-act="map-unknown">追加</button></div>';
      }).join('') : '';
    var adj = R.adjustments.length ? '<div class="sep"></div><div class="label" style="margin-bottom:8px">テンプレートの諸経費・値引き</div>' +
      R.adjustments.map(function (a, i) {
        return '<label style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><input type="checkbox" data-adj="' + i + '"' + (a.include !== false ? ' checked' : '') + '>' + esc(a.label || '諸経費') + '　' + (a.mode === 'rate' ? (a.rateBp / 100) + '%' : U.yen(a.amount)) + '</label>';
      }).join('') : '';
    var n = rows.filter(function (r) { return r.include; }).length;
    return tbl + unknown + adj +
      '<div class="toolbar" style="margin:16px 0 0"><div class="grow hint">「テンプレート」「標準数量」「引用」の行は文章に書かれていない数量です。確認してから作成してください。</div>' +
      '<button class="btn primary" data-act="make">' + I.check + n + '行で見積の下書きを作る</button></div>';
  }

  function renderResult() {
    var box = document.getElementById('q-result');
    if (!R) return;
    document.getElementById('q-meta').textContent = (R.template ? 'テンプレート：' + R.template.name : 'テンプレート：該当なし') + (R.category ? '　カテゴリー：' + catName(R.category) : '');
    box.innerHTML = resultHTML();
    EE.fx.stagger(box, { step: 15 });
    box.querySelectorAll('tbody tr').forEach(function (tr, i) { EE.fx.anim(tr, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: tr.style.opacity || 1, transform: 'none' }], { duration: 220, delay: i * 18 }); });
  }

  function mountText(view) {
    var ta = view.querySelector('#q-text');
    setTimeout(function () { ta.focus(); }, 60);
    function run() {
      lastText = ta.value;
      if (!ta.value.trim()) { EE.fx.shake(ta); return; }
      var res = EE.parse.parse(ta.value, { items: EE.S.items, templates: EE.S.packages, categories: EE.S.categories, customers: EE.S.customers });
      R = res;
      var cs = view.querySelector('#q-cust');
      if (!cs.value && res.customerId) cs.value = res.customerId;
      renderResult();
    }
    view.querySelector('#q-parse').onclick = run;
    ta.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } });
    view.addEventListener('click', function (e) {
      var ex = e.target.closest('[data-ex]');
      if (ex) { ta.value = EXAMPLES[ex.dataset.ex]; EE.fx.pulse(ta); run(); return; }
      var a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'map-unknown') {
        var box = a.closest('[data-u]'); var idx = Number(box.dataset.u);
        var id = box.querySelector('[data-k="map"]').value;
        if (!id) { EE.fx.shake(box.querySelector('[data-k="map"]')); return; }
        var phrase = R.unknown[idx];
        if (box.querySelector('[data-k="learn"]').checked) {
          var it = U.findItem(id);
          var w = phrase.replace(/[\d.]+\s*(mm|cm|m³|m²|m|坪|箇所|枚|台|本|個|式|人工)?/g, '').trim();
          if (w && (it.synonyms || []).indexOf(w) < 0) { it.synonyms = (it.synonyms || []).concat([w]); U.commit(); EE.fx.toast('「' + w + '」を「' + it.name + '」の同義語に登録しました'); }
        }
        R.unknown.splice(idx, 1);
        // 数量も読めれば使う
        var m = /(\d+(?:\.\d+)?)/.exec(EE.parse.normalize(phrase));
        R.rows.push({ itemId: id, qty: m ? Number(m[1]) : (U.findItem(id).stdQty || 1), source: 'text', qtySource: m ? 'text' : 'standard', include: true, phrase: phrase, notes: [], alternatives: [] });
        renderResult();
      } else if (a.dataset.act === 'make') {
        var cs = view.querySelector('#q-cust').value || R.customerId;
        openDraft({ rows: R.rows, adjustments: R.adjustments, category: R.category, customerId: cs,
          title: R.template ? R.template.name : '', notes: '', sourceLabel: '文章から作成' });
      }
    });
    view.addEventListener('change', function (e) {
      var tr = e.target.closest('tr[data-i]');
      if (tr) {
        var r = R.rows[tr.dataset.i]; var k = e.target.dataset.k;
        if (k === 'include') { r.include = e.target.checked; tr.style.opacity = r.include ? '' : '.5'; updateMake(); }
        if (k === 'qty') { r.qty = Number(e.target.value); r.qtySource = 'text'; }
        if (k === 'itemId') { r.itemId = e.target.value; r.notes = []; renderResult(); }
      }
      if (e.target.dataset.adj != null) R.adjustments[e.target.dataset.adj].include = e.target.checked;
    });
    function updateMake() {
      var b = view.querySelector('[data-act="make"]');
      if (b) b.innerHTML = I.check + R.rows.filter(function (r) { return r.include; }).length + '行で見積の下書きを作る';
    }
    if (R && lastText) renderResult();
  }

  /* ================ テンプレート ================ */
  var tplSel = null, tplCat = 'all';
  function templateView() {
    var cats = [['all', 'すべて']].concat((EE.S.categories || []).map(function (c) { return [c.id, c.name]; }));
    var list = EE.S.packages.filter(function (p) { return tplCat === 'all' || p.category === tplCat; });
    var html = '<div class="seg" data-st id="t-cat" style="margin-bottom:16px;flex-wrap:wrap">' + cats.map(function (c) {
        return '<button data-c="' + c[0] + '" class="' + (tplCat === c[0] ? 'on' : '') + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>' +
      '<div class="grid" style="grid-template-columns:minmax(260px,360px) minmax(0,1fr);align-items:start">' +
        '<section class="panel" data-st><div class="panel-b"><div class="checks">' + (list.length ? list.map(function (p) {
          return '<button class="check info" data-tpl="' + p.id + '" style="grid-template-columns:22px 1fr;text-align:left;cursor:pointer;color:inherit;' + (tplSel === p.id ? 'border-color:var(--accent)' : '') + '"><span class="ic">' + p.lines.length + '</span>' +
            '<div><div class="t">' + esc(p.name) + '</div><div class="d">' + esc(catName(p.category)) + (p.note ? '　' + esc(p.note) : '') + '</div></div></button>';
        }).join('') : '<div class="empty">テンプレートがありません</div>') + '</div>' +
        '<a class="btn ghost" style="width:100%;margin-top:10px" href="#/settings/packages">' + I.edit + 'テンプレートを編集する</a></div></section>' +
        '<section class="panel" data-st><div class="panel-b" id="t-detail"><div class="empty">' + I.box + '左からテンプレートを選んでください</div></div></section></div>';
    return { title: 'テンプレートから見積もり作成', crumb: 'かんたん見積もり作成', html: html, mount: mountTemplate };
  }
  var TR = null;
  function tplDetail() {
    var p = EE.S.packages.filter(function (x) { return x.id === tplSel; })[0];
    if (!p) return '';
    TR = { rows: p.lines.map(function (l) { return { itemId: l.itemId, qty: l.qty, include: !l.optional, optional: l.optional, source: 'template', qtySource: 'template' }; }),
      adjustments: (p.adjustments || []).map(function (a) { return Object.assign({ include: true }, a); }), template: p };
    return '<div class="panel-h" style="padding:0 0 12px"><h2>' + esc(p.name) + '</h2><span class="sub">チェックを付けた明細で見積を作ります。数量は「計算」でも出せます</span></div>' +
      '<table class="table"><thead><tr><th style="width:34px"></th><th>品目</th><th class="r" style="width:120px">数量</th><th>単位</th><th class="r">単価</th><th></th></tr></thead><tbody>' +
      TR.rows.map(function (r, i) {
        var it = U.findItem(r.itemId) || { name: '（削除された品目）' };
        return '<tr data-i="' + i + '" style="' + (r.include ? '' : 'opacity:.5') + '"><td><input type="checkbox" data-k="include"' + (r.include ? ' checked' : '') + '></td>' +
          '<td>' + esc(it.name) + (it.spec ? ' <span class="hint">' + esc(it.spec) + '</span>' : '') + (r.optional ? '<span class="cell-sub">参考候補</span>' : '') + '</td>' +
          '<td class="r"><input class="input num" data-k="qty" type="number" step="0.01" value="' + r.qty + '" style="height:32px;text-align:right"></td>' +
          '<td class="muted">' + esc(it.unit || '') + '</td><td class="r num muted">' + U.yen(it.unitPrice) + '</td>' +
          '<td><button class="btn ghost sm" data-act="calc">計算</button></td></tr>';
      }).join('') + '</tbody></table>' +
      (TR.adjustments.length ? '<div style="margin-top:12px">' + TR.adjustments.map(function (a, i) {
        return '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-adj="' + i + '" checked>' + esc(a.label) + '　' + (a.mode === 'rate' ? a.rateBp / 100 + '%' : U.yen(a.amount)) + '</label>'; }).join('') + '</div>' : '') +
      '<div class="form-grid" style="margin-top:16px"><div class="field c6"><label>宛先</label><select class="input" id="t-cust"><option value="">（あとで選ぶ）</option>' +
        EE.S.customers.map(function (c) { return U.opt(c.id, c.name + ' ' + c.honorific, ''); }).join('') + '</select></div>' +
      '<div class="field c6"><label>&nbsp;</label><button class="btn primary" data-act="make">' + I.check + '見積の下書きを作る</button></div></div>';
  }
  function mountTemplate(view) {
    function show() { var d = view.querySelector('#t-detail'); d.innerHTML = tplDetail() || d.innerHTML; EE.fx.stagger(d, { step: 12 }); }
    if (tplSel) show();
    view.addEventListener('click', function (e) {
      var c = e.target.closest('[data-c]'); if (c) { tplCat = c.dataset.c; EE.app.rerender(); return; }
      var t = e.target.closest('[data-tpl]');
      if (t) { tplSel = t.dataset.tpl; view.querySelectorAll('[data-tpl]').forEach(function (b) { b.style.borderColor = b === t ? 'var(--accent)' : ''; }); show(); return; }
      var a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'calc') {
        var tr = a.closest('tr'); var r = TR.rows[tr.dataset.i];
        EE.calcTool.open({ unit: (U.findItem(r.itemId) || {}).unit, onApply: function (q) { r.qty = q; tr.querySelector('[data-k="qty"]').value = q; EE.fx.pulse(tr.querySelector('[data-k="qty"]')); } });
      }
      if (a.dataset.act === 'make') {
        openDraft({ rows: TR.rows, adjustments: TR.adjustments, category: TR.template.category, title: TR.template.name,
          customerId: view.querySelector('#t-cust').value, sourceLabel: 'テンプレート「' + TR.template.name + '」から作成' });
      }
    });
    view.addEventListener('change', function (e) {
      var tr = e.target.closest('tr[data-i]');
      if (tr) { var r = TR.rows[tr.dataset.i];
        if (e.target.dataset.k === 'include') { r.include = e.target.checked; tr.style.opacity = r.include ? '' : '.5'; }
        if (e.target.dataset.k === 'qty') r.qty = Number(e.target.value); }
      if (e.target.dataset.adj != null) TR.adjustments[e.target.dataset.adj].include = e.target.checked;
    });
  }

  /* ================ 過去の見積 ================ */
  var PF = { q: '', cat: '', from: '', to: '', min: '', max: '' }, pastSel = null;
  function pastList() {
    var q = U.norm(PF.q).trim();
    return EE.S.documents.filter(function (d) {
      var c = U.docCustomer(d); var pj = U.findProject(d.projectId) || {};
      var hay = U.norm([d.no, d.title, c.name, c.address, pj.site, d.lines.map(function (l) { return l.name + ' ' + (l.spec || ''); }).join(' ')].join(' '));
      if (q && q.split(/\s+/).some(function (w) { return hay.indexOf(w) < 0; })) return false;
      if (PF.cat && d.category !== PF.cat && !d.lines.some(function (l) { var it = U.findItem(l.itemId); return it && it.category === PF.cat; })) return false;
      if (PF.from && d.issueDate < PF.from) return false;
      if (PF.to && d.issueDate > PF.to) return false;
      var tot = U.calcDoc(d).total;
      if (PF.min !== '' && tot < Number(PF.min)) return false;
      if (PF.max !== '' && tot > Number(PF.max)) return false;
      return true;
    }).sort(function (a, b) { return (b.issueDate || '').localeCompare(a.issueDate || ''); });
  }
  function pastView() {
    var html = '<section class="panel" data-st style="margin-bottom:18px"><div class="panel-b"><div class="toolbar" style="margin:0">' +
      '<div class="search grow" style="min-width:240px">' + I.search + '<input class="input" id="p-q" placeholder="顧客名・住所・件名・品名で検索" value="' + esc(PF.q) + '"></div>' +
      '<select class="input" id="p-cat" style="width:auto"><option value="">工事カテゴリー：すべて</option>' + (EE.S.categories || []).map(function (c) { return U.opt(c.id, c.name, PF.cat); }).join('') + '</select>' +
      '<input class="input" type="date" id="p-from" value="' + PF.from + '" style="width:150px"><span class="hint">〜</span><input class="input" type="date" id="p-to" value="' + PF.to + '" style="width:150px">' +
      '<input class="input num" type="number" id="p-min" placeholder="金額 下限" value="' + PF.min + '" style="width:120px"><input class="input num" type="number" id="p-max" placeholder="上限" value="' + PF.max + '" style="width:120px">' +
      '</div></div></section>' +
      '<div class="grid" style="grid-template-columns:minmax(280px,420px) minmax(0,1fr);align-items:start">' +
        '<section class="panel" data-st><div class="panel-b" id="p-list"></div></section>' +
        '<section class="panel" data-st><div class="panel-b" id="p-detail"><div class="empty">' + I.copy + '左から流用する見積を選んでください</div></div></section></div>';
    return { title: '過去の見積から作成', crumb: 'かんたん見積もり作成', html: html, mount: mountPast };
  }
  function pastListHTML() {
    var list = pastList();
    if (!list.length) return '<div class="empty">条件に合う見積がありません</div>';
    return '<div class="checks">' + list.map(function (d) {
      var c = U.docCustomer(d);
      return '<button class="check info" data-doc="' + d.id + '" style="grid-template-columns:1fr auto;text-align:left;cursor:pointer;color:inherit;' + (pastSel === d.id ? 'border-color:var(--accent)' : '') + '">' +
        '<div><div class="t">' + esc(d.title || d.no) + '</div><div class="d">' + esc(c.name || '') + '　' + U.jdate(d.issueDate) + '　' + d.lines.length + '行</div></div>' +
        '<span class="num">' + U.yen(U.calcDoc(d).total) + '</span></button>';
    }).join('') + '</div>';
  }
  var PR = null;
  function pastDetailHTML() {
    var d = U.findDoc(pastSel); if (!d) return '';
    PR = { doc: d, sel: d.lines.map(function () { return true; }), qty: true, price: 'current', notes: false, adj: true };
    var cats = {};
    d.lines.forEach(function (l, i) { var it = U.findItem(l.itemId); var c = (it && it.category) || 'other'; (cats[c] = cats[c] || []).push(i); });
    var age = U.daysFromToday(d.issueDate);
    return '<div class="panel-h" style="padding:0 0 10px"><h2>' + esc(d.title || d.no) + '</h2><span class="sub">' + U.jdate(d.issueDate) + ' の見積（' + (-age) + '日前）</span></div>' +
      '<div class="toolbar" style="margin-bottom:10px"><span class="label">選択：</span><button class="btn sm" data-act="all">すべて</button><button class="btn sm" data-act="none">なし</button>' +
      Object.keys(cats).map(function (c) { return '<button class="btn sm" data-catsel="' + c + '">' + esc(catName(c) || 'その他') + 'だけ</button>'; }).join('') + '</div>' +
      '<table class="table"><thead><tr><th style="width:34px"></th><th>品目</th><th class="r">数量</th><th class="r">当時の単価</th><th class="r">現在のマスタ</th></tr></thead><tbody>' +
      d.lines.map(function (l, i) {
        var it = U.findItem(l.itemId);
        var diff = it && it.unitPrice !== l.unitPrice;
        return '<tr data-i="' + i + '"><td><input type="checkbox" data-k="sel" checked></td><td>' + esc(l.name) + (l.spec ? ' <span class="hint">' + esc(l.spec) + '</span>' : '') +
          (!it ? '<span class="cell-sub" style="color:var(--err)">マスタが削除されています（流用できません）</span>' : '') + '</td>' +
          '<td class="r num">' + U.num(l.qty) + ' ' + esc(l.unit) + '</td><td class="r num">' + U.yen(l.unitPrice) + '<span class="cell-sub">' + esc(l.priceDate || d.issueDate) + '</span></td>' +
          '<td class="r num" style="' + (diff ? 'color:var(--warn)' : '') + '">' + (it ? U.yen(it.unitPrice) + (diff ? '<span class="cell-sub">差 ' + U.yen(it.unitPrice - l.unitPrice) + '</span>' : '') : '—') + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="form-grid" style="margin-top:14px">' +
        '<label class="field c6" style="flex-direction:row;gap:8px;align-items:center"><input type="checkbox" id="p-oqty" checked> 数量も引き継ぐ</label>' +
        '<label class="field c6" style="flex-direction:row;gap:8px;align-items:center"><input type="checkbox" id="p-oadj" checked> 諸経費・値引きも引き継ぐ</label>' +
        '<label class="field c6" style="flex-direction:row;gap:8px;align-items:center"><input type="checkbox" id="p-onotes"> 備考・条件も引き継ぐ</label>' +
        '<div class="field c6"><label>単価</label><select class="input" id="p-oprice">' + U.opt('current', '現在のマスタ単価を使う（推奨）', 'current') + U.opt('old', '当時の単価を使う（送信前チェックで注意が出ます）', '') + '</select></div>' +
        '<div class="field c6"><label>宛先</label><select class="input" id="p-cust">' + U.opt('', '（あとで選ぶ）', '') + EE.S.customers.map(function (c) { return U.opt(c.id, c.name + ' ' + c.honorific, ''); }).join('') + '</select></div>' +
        '<div class="field c6"><label>&nbsp;</label><button class="btn primary" data-act="make">' + I.copy + '選んだ明細で見積を作る</button></div></div>';
  }
  function mountPast(view) {
    function refresh() { var l = view.querySelector('#p-list'); if (l) l.innerHTML = pastListHTML(); }
    refresh();
    var deb;
    view.addEventListener('input', function (e) {
      var map = { 'p-q': 'q', 'p-from': 'from', 'p-to': 'to', 'p-min': 'min', 'p-max': 'max', 'p-cat': 'cat' };
      if (map[e.target.id]) { PF[map[e.target.id]] = e.target.value; clearTimeout(deb); deb = setTimeout(refresh, 120); }
    });
    view.addEventListener('change', function (e) { if (e.target.id === 'p-cat') { PF.cat = e.target.value; refresh(); } });
    view.addEventListener('click', function (e) {
      var b = e.target.closest('[data-doc]');
      if (b) { pastSel = b.dataset.doc; refresh(); var det = view.querySelector('#p-detail'); det.innerHTML = pastDetailHTML(); EE.fx.stagger(det, { step: 12 }); return; }
      var det2 = view.querySelector('#p-detail');
      var setAll = function (fn) { det2.querySelectorAll('tbody tr').forEach(function (tr, i) { tr.querySelector('[data-k="sel"]').checked = fn(i); }); };
      var cs = e.target.closest('[data-catsel]');
      if (cs) {
        setAll(function (i) { var it = U.findItem(PR.doc.lines[i].itemId); return ((it && it.category) || 'other') === cs.dataset.catsel; }); return;
      }
      var a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'all') setAll(function () { return true; });
      if (a.dataset.act === 'none') setAll(function () { return false; });
      if (a.dataset.act === 'make') {
        var d = PR.doc, useQty = det2.querySelector('#p-oqty').checked, old = det2.querySelector('#p-oprice').value === 'old';
        var rows = [];
        det2.querySelectorAll('tbody tr').forEach(function (tr, i) {
          if (!tr.querySelector('[data-k="sel"]').checked) return;
          var l = d.lines[i], it = U.findItem(l.itemId); if (!it) return;
          var r = { itemId: l.itemId, qty: useQty ? l.qty : (it.stdQty || 1), include: true, source: 'past' };
          if (old) { r.unitPrice = l.unitPrice; r.unitCost = l.unitCost; r.priceDate = l.priceDate || d.issueDate; r.priceSource = { type: 'past', docId: d.id }; }
          rows.push(r);
        });
        if (!rows.length) { EE.fx.toast('明細を1行以上選んでください', { warn: true }); return; }
        var o = { rows: rows, category: d.category, title: d.title, customerId: det2.querySelector('#p-cust').value,
          adjustments: det2.querySelector('#p-oadj').checked ? (d.adjustments || []).filter(function (x) { return !Array.isArray(x.scope); }) : [],
          sourceLabel: '過去の見積 ' + d.no + ' から作成' };
        if (det2.querySelector('#p-onotes').checked) { o.notes = d.notes; o.paymentTerms = d.paymentTerms; o.deliveryTerm = d.deliveryTerm; }
        openDraft(o);
      }
    });
  }

  function render(sub) {
    switch (sub) {
      case 'text': return textView(false);
      case 'voice': return textView(true);
      case 'template': return templateView();
      case 'past': return pastView();
      case 'pdf': return EE.views.importer.render('pdf');
      case 'photo': return EE.views.importer.render('photo');
      default: return hub();
    }
  }

  EE.views = EE.views || {};
  EE.views.quick = { render: render, openDraft: openDraft, setText: function (t) { lastText = t; R = null; } };
})(this);
