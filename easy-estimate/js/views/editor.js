/*
 * 見積作成・編集画面
 * - 明細はマスタから選ぶだけ。単価は編集できない（マスタで管理）。数量だけ入力する
 * - 右側のパネルで 小計・税・合計・粗利・建設業法の内訳 がリアルタイムに更新される
 * - 送信前チェックは常に裏で走らせ、件数を表示。PDF出力の前に一覧で見せる
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;

  var ED = null; // { doc, dirty, isNew }
  var pick = { q: '', kind: 'all', idx: 0, list: [], open: false };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load(id) {
    if (id) {
      var d = U.findDoc(id);
      if (!d) return null;
      ED = { doc: clone(d), dirty: false, isNew: false };
      if (!ED.doc.adjustments) ED.doc.adjustments = [];
    } else {
      var nd = EE.data.newEstimate(EE.S, { noNumber: true });
      var prefill = EE.app.takePrefill();
      if (prefill) {
        var label = prefill.sourceLabel; delete prefill.sourceLabel;
        Object.keys(prefill).forEach(function (k) { if (prefill[k] !== '' && prefill[k] != null) nd[k] = prefill[k]; });
        if (label) nd.history.push({ at: new Date().toISOString(), action: label });
        if (nd.customerId && !nd.projectId) {
          var pj = EE.S.projects.filter(function (p) { return p.customerId === nd.customerId; });
          if (pj.length === 1 && !nd.title) nd.title = pj[0].name;
        }
      }
      ED = { doc: nd, dirty: !!prefill, isNew: true, recovery: prefill ? null : readRecovery() };
    }
    return ED;
  }

  function locked() { return ED.doc.status === 'issued'; }
  function docForCheck() {
    var d = ED.doc;
    if (!d.no) { d = Object.assign({}, d, { no: EE.data.peekNumber(EE.S, d.issueDate) }); }
    return d;
  }

  var RECOVERY_KEY = 'oumitsu:recovery';
  function hhmm() { var d = new Date(); return d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2); }
  function setState(html) { var s = document.getElementById('save-state'); if (s) s.innerHTML = html; }

  function markDirty() {
    if (!ED.dirty) {
      ED.dirty = true;
      setState('<span class="dirty-dot"></span>未保存の変更');
    }
    scheduleAutosave();
  }

  /* 自動保存：保存済みの下書きはそのまま上書き、新規はこの端末に「入力途中」として一時保存 */
  var asTimer;
  function scheduleAutosave() {
    if (EE.S.autoSave === false || !ED || locked()) return;
    clearTimeout(asTimer);
    asTimer = setTimeout(autosave, 1500);
  }
  function autosave() {
    if (!ED || !ED.dirty || locked()) return;
    if (ED.isNew) {
      try {
        root.localStorage.setItem(RECOVERY_KEY, JSON.stringify(ED.doc));
        setState('<span class="saved-mark">入力途中を一時保存 ' + hhmm() + '</span>');
      } catch (e) { setState('<span style="color:var(--err)">一時保存できませんでした（容量不足の可能性）</span>'); }
    } else {
      save(null, { silent: true });
    }
  }
  function readRecovery() { try { var r = root.localStorage.getItem(RECOVERY_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function clearRecovery() { try { root.localStorage.removeItem(RECOVERY_KEY); } catch (e) {} }

  /* ================= 描画 ================= */
  function render(id) {
    if (!load(id)) return { title: '見つかりません', html: '<div class="panel panel-b empty">書類が見つかりません。</div>' };
    var d = ED.doc, S = EE.S;
    var lk = locked();
    var dis = lk ? ' disabled' : '';

    var custOpts = '<option value="">— 顧客を選ぶ —</option>' + S.customers.map(function (c) {
      return U.opt(c.id, c.name + ' ' + (c.honorific || ''), d.customerId);
    }).join('');

    var banner = lk
      ? '<div class="panel" data-st style="margin-bottom:18px;border-color:rgba(77,141,255,.35)"><div class="panel-b" style="display:flex;gap:14px;align-items:center">' +
        '<span class="kpi-icon">' + I.lock + '</span><div style="flex:1"><b>発行済みの見積書です（' + U.jdate((d.issuedAt || '').slice(0, 10)) + ' 確定）</b>' +
        '<div class="hint">電子帳簿保存法に合わせ、発行済みの書類は書き換えずに保存します。内容を変えるときは修正見積（新しい版）を作ってください。</div></div>' +
        '<button class="btn primary" data-act="revise">' + I.branch + '修正見積を作成</button></div></div>'
      : '';

    if (ED.recovery && ED.recovery.lines && ED.recovery.lines.length) {
      banner += '<div class="panel" data-st id="recovery" style="margin-bottom:18px;border-color:rgba(242,189,92,.4)"><div class="panel-b" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' +
        '<span class="kpi-icon" style="color:var(--warn);background:rgba(242,189,92,.12)">' + I.clock + '</span><div style="flex:1;min-width:220px"><b>入力途中の見積があります</b>' +
        '<div class="hint">「' + esc(ED.recovery.title || '件名なし') + '」' + ED.recovery.lines.length + '行。前回、保存せずに閉じた内容です。</div></div>' +
        '<button class="btn ghost" data-act="discard-recovery">破棄</button><button class="btn primary" data-act="recover">' + I.refresh + '復元する</button></div></div>';
    }
    var html = banner + '<div class="editor">' +
      '<div class="grid" style="gap:18px">' +
        /* 基本情報 */
        '<section class="panel" data-st id="sec-header"><div class="panel-h"><h2>基本情報</h2><span class="sub">宛先・日付・条件</span><div class="spacer"></div>' +
          (d.importInfo && d.importInfo.importId ? '<a href="#" class="badge blue" data-act="open-original" title="取り込み元の原本を開く">' + I.file + esc(d.importInfo.fileName || '原本') + '</a>' : '') +
          '<span class="badge num">' + esc(d.no || EE.data.peekNumber(S, d.issueDate) + '（保存時に採番）') + '</span></div>' +
          '<div class="panel-b"><div class="form-grid">' +
            '<div class="field c6"><label class="req">宛先（顧客）</label><div style="display:flex;gap:8px"><select class="input" data-f="customerId"' + dis + '>' + custOpts + '</select>' +
              (lk ? '' : '<button class="btn icon" data-act="quick-customer" title="顧客を新規登録">' + I.plus + '</button>') + '</div></div>' +
            '<div class="field c6"><label>案件</label><select class="input" data-f="projectId"' + dis + '>' + projectOptions() + '</select></div>' +
            '<div class="field c4"><label>担当者</label><select class="input" data-f="ownerId"' + dis + '>' + U.memberOptions(d.ownerId || '', '（未割り当て）') + '</select></div>' +
            '<div class="field c8"><label class="req">件名</label><input class="input" data-f="title" value="' + esc(d.title) + '" placeholder="例：〇〇様邸 浴室改修工事"' + dis + '></div>' +
            '<div class="field c3"><label class="req">発行日</label><input class="input" type="date" data-f="issueDate" value="' + esc(d.issueDate) + '"' + dis + '></div>' +
            '<div class="field c3"><label class="req">有効期限</label><input class="input" type="date" data-f="validUntil" value="' + esc(d.validUntil) + '"' + dis + '></div>' +
            '<div class="field c6"><label>有効期限（発行日から）</label><div class="seg" id="valid-quick">' +
              [14, 30, 60, 90].map(function (n) { return '<button data-days="' + n + '"' + dis + '>+' + n + '日</button>'; }).join('') + '</div></div>' +
            '<div class="field c4"><label>受渡期日</label><input class="input" data-f="deliveryTerm" value="' + esc(d.deliveryTerm) + '"' + dis + '></div>' +
            '<div class="field c4"><label>受渡場所</label><input class="input" data-f="deliveryPlace" value="' + esc(d.deliveryPlace) + '" placeholder="空欄なら案件の現場住所"' + dis + '></div>' +
            '<div class="field c4"><label style="display:flex;justify-content:space-between">支払条件' + (lk ? '' : '<a href="#" data-act="snip" data-target="paymentTerms" style="color:var(--accent-2)">定型文</a>') + '</label><input class="input" data-f="paymentTerms" value="' + esc(d.paymentTerms) + '"' + dis + '></div>' +
            '<div class="field c12"><label style="display:flex;justify-content:space-between">備考・条件（PDFに載ります）' + (lk ? '' : '<a href="#" data-act="snip" data-target="notes" style="color:var(--accent-2)">定型文を挿入</a>') + '</label><textarea class="input" data-f="notes" rows="2"' + dis + '>' + esc(d.notes) + '</textarea></div>' +
          '</div></div></section>' +
        /* 明細 */
        '<section class="panel" data-st id="sec-lines"><div class="panel-h"><h2>明細</h2><span class="sub">マスタから選んで数量を入れるだけ。単価はマスタで管理します</span><div class="spacer"></div>' +
          '<span class="badge num" id="line-count">' + d.lines.length + '行</span></div>' +
          '<div class="panel-b">' +
            (lk ? '' :
            '<div class="toolbar" style="margin-bottom:12px">' +
              '<div class="picker grow"><div class="search">' + I.search +
                '<input class="input" id="pick" autocomplete="off" placeholder="品名・コードで検索 → Enter で追加（/ キー）"></div>' +
                '<div class="picker-pop" id="pick-pop" hidden></div></div>' +
              '<div class="seg" id="pick-kind">' + [['all', 'すべて']].concat(Object.keys(EE.engine.ITEM_KINDS).map(function (k) { return [k, EE.engine.ITEM_KINDS[k]]; }))
                .map(function (k) { return '<button data-kind="' + k[0] + '" class="' + (pick.kind === k[0] ? 'on' : '') + '">' + k[1] + '</button>'; }).join('') + '</div>' +
            '</div>' +
            '<div class="toolbar" style="margin-bottom:12px">' +
              '<select class="input" id="tpl-add" style="max-width:360px"><option value="">工事テンプレートから追加…</option>' +
              (S.categories || []).map(function (c) {
                var ps = S.packages.filter(function (p) { return p.category === c.id; });
                return ps.length ? '<optgroup label="' + esc(c.name) + '">' + ps.map(function (p) { return U.opt(p.id, p.name + '（' + p.lines.filter(function (l) { return !l.optional; }).length + '行）', ''); }).join('') + '</optgroup>' : '';
              }).join('') + S.packages.filter(function (p) { return !(S.categories || []).some(function (c) { return c.id === p.category; }); }).map(function (p) { return U.opt(p.id, p.name, ''); }).join('') + '</select>' +
              '<div class="grow"></div>' +
              '<button class="btn sm" data-act="add-adj" data-type="overhead">' + I.plus + '諸経費</button>' +
              '<button class="btn sm" data-act="add-adj" data-type="discount">' + I.plus + '値引き</button>' +
              '<button class="btn sm" data-act="add-adj" data-type="roundoff">' + I.plus + '端数調整</button>' +
            '</div>' +
            '<div class="toolbar" id="bulk-bar" hidden style="margin-bottom:10px;padding:8px 10px;border:1px solid rgba(77,141,255,.3);border-radius:10px;background:rgba(77,141,255,.07)">' +
              '<b id="bulk-n">0行を選択</b><div class="grow"></div>' +
              '<button class="btn sm" data-act="bulk-dup">' + I.copy + '複製</button>' +
              '<button class="btn sm" data-act="bulk-refresh">' + I.refresh + '最新単価に更新</button>' +
              '<button class="btn sm" data-act="bulk-discount">選んだ行に値引き</button>' +
              '<button class="btn sm danger" data-act="bulk-del">' + I.trash + '削除</button></div>') +
            '<div class="table-scroll"><table class="table lines"><thead><tr><th style="width:28px">' + (lk ? '' : '<input type="checkbox" id="sel-all" title="すべて選択">') + '</th><th class="no">#</th><th>品名・規格</th><th class="r">数量</th><th>単位</th><th class="r">単価</th><th class="r">金額</th><th>税</th><th></th></tr></thead>' +
            '<tbody id="line-body"></tbody></table></div>' +
            '<div id="adj-list"></div>' +
          '</div></section>' +
      '</div>' +
      /* 右：集計 */
      '<aside class="summary grid" style="gap:18px">' + summaryHTML() + '</aside>' +
    '</div>';

    return {
      title: ED.isNew ? '新規見積' : (lk ? '見積書（発行済み）' : '見積書の編集'),
      crumb: d.no || '新規',
      actions: lk
        ? '<button class="btn" data-act="duplicate">' + I.copy + '複製して新規</button><button class="btn primary" data-act="pdf">' + I.pdf + 'PDF出力</button>'
        : '<span id="save-state" class="hint">' + (ED.dirty ? '<span class="dirty-dot"></span>未保存の変更' : (ED.isNew ? '' : '<span class="saved-mark">保存済み</span>')) + '</span>' +
          '<button class="btn" data-act="save" id="btn-save">' + I.save + '保存 <kbd>Ctrl S</kbd></button>',
      html: html,
      mount: mount,
      guard: function () { return ED && ED.dirty; },
      discard: function () { ED = null; }
    };
  }

  function projectOptions() {
    var d = ED.doc;
    var list = EE.S.projects.filter(function (p) { return !d.customerId || p.customerId === d.customerId; });
    return '<option value="">— なし —</option>' + list.map(function (p) { return U.opt(p.id, p.name, d.projectId); }).join('');
  }

  function summaryHTML() {
    var lk = locked();
    return '<section class="panel" data-st id="sec-summary"><div class="panel-h"><h2>金額</h2><span class="sub">固定ルールで自動計算</span></div><div class="panel-b">' +
        '<div id="sum-adj"></div>' +
        '<div class="sum-row"><span>小計（税抜）</span><span class="yen" data-k="subtotal" data-format="yen">¥0</span></div>' +
        '<div id="sum-rates"></div>' +
        '<div class="sum-total"><div class="label">合計（税込）</div><div class="big yen" data-k="total" data-format="yen">¥0</div></div>' +
        '<div class="sep"></div>' +
        '<div class="sum-row"><span>原価合計</span><span class="yen" data-k="costTotal" data-format="yen">¥0</span></div>' +
        '<div class="sum-row"><span>粗利</span><span class="yen" data-k="grossProfit" data-format="yen">¥0</span></div>' +
        '<div class="sum-row" style="padding-bottom:0"><span>粗利率</span><span class="yen" data-k="margin" data-format="pct">0.0%</span></div>' +
        '<div class="meter" id="margin-meter"><i style="width:0"></i></div>' +
        '<div class="hint" style="margin-top:6px">下限 ' + Math.round(EE.S.settings.minMargin * 100) + '%（設定で変更）</div>' +
        '<div class="sep"></div>' +
        '<div class="label" style="margin-bottom:8px">内訳（建設業法第20条：材料費・労務費等）</div>' +
        '<div class="bd" id="breakdown"></div>' +
      '</div></section>' +
      '<section class="panel" data-st id="sec-check"><div class="panel-h"><h2>送信前チェック</h2><div class="spacer"></div><div class="check-sum" id="check-sum"></div></div>' +
        '<div class="panel-b"><div class="checks" id="check-mini"></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
          '<button class="btn" data-act="check">' + I.check + 'チェック一覧</button>' +
          '<button class="btn primary" data-act="pdf">' + I.pdf + 'PDF出力</button>' +
        '</div>' +
        (lk ? '' : '<button class="btn ghost" style="width:100%;margin-top:8px" data-act="issue">' + I.stamp + '発行確定（以後は編集不可）</button>') +
      '</div></section>';
  }

  var CALC_ICON = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.2" width="14" height="17.6" rx="3.4"/><rect x="8.2" y="6.4" width="7.6" height="3.4" rx="1.4"/><path d="M8.6 13.4h.1M12 13.4h.1M15.4 13.4h.1M8.6 16.8h.1M12 16.8h.1M15.4 16.8h.1"/></svg>';

  function lineRowHTML(l, i, r) {
    var lk = locked();
    var it = U.findItem(l.itemId);
    var stale = it && it.unitPrice !== l.unitPrice;
    var amt = r.lines[i] ? r.lines[i].amount : 0;
    var prof = r.lines[i] ? r.lines[i].profit : 0;
    var tc = l.taxCategory === 'red8' ? '<span class="badge warn">8%</span>' : l.taxCategory === 'std10' ? '<span class="badge">10%</span>' : '<span class="badge">' + esc((EE.engine.TAX_CATEGORIES[l.taxCategory] || {}).label || '') + '</span>';
    return '<tr data-line="' + l.lineId + '"' + (!it ? ' class="hl-err"' : stale ? ' class="hl"' : '') + '>' +
      '<td>' + (lk ? '' : '<input type="checkbox" class="line-sel"' + (ED.sel && ED.sel[l.lineId] ? ' checked' : '') + '>') + '</td>' +
      '<td class="no num">' + (i + 1) + '</td>' +
      '<td>' + esc(l.name) + '<span class="cell-sub"><span class="code">' + esc(l.code) + '</span>' + (l.spec ? '　' + esc(l.spec) : '') + '</span>' +
        (stale && !lk ? '<span class="cell-sub" style="color:var(--warn)">マスタ単価 ' + U.yen(it.unitPrice) + ' と違います　<a href="#" data-act="refresh-price" style="color:var(--accent-2)">最新単価に更新</a></span>' : '') +
        (!it ? '<span class="cell-sub" style="color:var(--err)">マスタが削除されています</span>' : '') + '</td>' +
      '<td class="r"><input class="input qty num" type="number" step="0.01" inputmode="decimal" value="' + esc(l.qty) + '"' + (lk ? ' disabled' : '') + '></td>' +
      '<td class="muted">' + esc(l.unit) + '</td>' +
      '<td class="r price num" title="単価はマスタで管理（ここでは変更できません）">' + I.lock.replace('<svg', '<svg class="lock"') + U.yen(l.unitPrice) + '</td>' +
      '<td class="r num" data-amt>' + U.yen(amt) + '<span class="profit-chip cell-sub' + (prof < 0 ? ' neg' : '') + '" data-prof>粗利 ' + U.yen(prof) + '</span></td>' +
      '<td>' + tc + '</td>' +
      '<td>' + (lk ? '' : '<div class="row-actions"><button class="btn ghost icon sm" data-act="calc" title="数量を計算">' + CALC_ICON + '</button><button class="btn ghost icon sm" data-act="up" title="上へ">' + I.up + '</button><button class="btn ghost icon sm" data-act="down" title="下へ">' + I.down + '</button><button class="btn ghost icon sm danger" data-act="del" title="削除">' + I.trash + '</button></div>') + '</td>' +
    '</tr>';
  }

  function renderLines(flashId) {
    var body = document.getElementById('line-body');
    if (!body) return;
    var r = U.calcDoc(ED.doc);
    if (!ED.doc.lines.length) {
      body.innerHTML = '<tr><td colspan="9"><div class="empty">' + I.box + '明細がまだありません。<br>上の検索欄に品名やコードを入れるか、標準工事パッケージをクリックしてください。</div></td></tr>';
    } else {
      body.innerHTML = ED.doc.lines.map(function (l, i) { return lineRowHTML(l, i, r); }).join('');
    }
    if (flashId) {
      (Array.isArray(flashId) ? flashId : [flashId]).forEach(function (id, k) {
        var tr = body.querySelector('[data-line="' + id + '"]');
        if (tr) { tr.classList.add('added'); EE.fx.anim(tr, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: k * 40 }); }
      });
    }
    document.getElementById('line-count').textContent = ED.doc.lines.length + '行';
    renderAdj();
    updateBulk();
    updateSummary();
  }

  var ADJ_LABEL = { overhead: '諸経費', discount: '値引き', roundoff: '端数調整' };
  function renderAdj() {
    var box = document.getElementById('adj-list');
    if (!box) return;
    var adjs = ED.doc.adjustments || [];
    if (!adjs.length) { box.innerHTML = ''; return; }
    var lk = locked(), dis = lk ? ' disabled' : '';
    box.innerHTML = '<div class="label" style="margin:14px 0 8px">諸経費・値引き・端数調整（計算順：諸経費 → 値引き → 端数調整 → 消費税）</div>' +
      adjs.map(function (a) {
        var scope = Array.isArray(a.scope) ? '選んだ ' + a.scope.length + ' 行' : '全体';
        var body;
        if (a.type === 'roundoff') {
          body = '<select class="input" data-adj-k="unit" style="width:180px"' + dis + '>' + [[100, '100円未満切り捨て'], [1000, '1,000円未満切り捨て'], [10000, '10,000円未満切り捨て']].map(function (u) { return U.opt(u[0], u[1], a.unit || 1000); }).join('') + '</select>';
        } else {
          body = '<input class="input" data-adj-k="label" value="' + esc(a.label || '') + '" style="width:150px"' + dis + '>' +
            '<select class="input" data-adj-k="mode" style="width:90px"' + dis + '>' + U.opt('rate', '率', a.mode) + U.opt('amount', '金額', a.mode) + '</select>' +
            (a.mode === 'amount'
              ? '<input class="input num" type="number" step="1" data-adj-k="amount" value="' + (a.amount || 0) + '" style="width:120px;text-align:right"' + dis + '><span class="hint">円</span>' +
                '<select class="input" data-adj-k="taxCategory" style="width:120px"' + dis + '>' + U.options(EE.engine.TAX_CATEGORIES, a.taxCategory || 'std10') + '</select>'
              : '<input class="input num" type="number" step="0.01" data-adj-k="rate" value="' + ((a.rateBp || 0) / 100) + '" style="width:90px;text-align:right"' + dis + '><span class="hint">%　対象：' + scope + '</span>');
        }
        return '<div class="adj-row" data-adj="' + a.id + '"><span class="badge ' + (a.type === 'discount' || a.type === 'roundoff' ? 'warn' : 'blue') + '">' + ADJ_LABEL[a.type] + '</span>' + body +
          '<span class="grow"></span><b class="num" data-adj-amt>—</b>' + (lk ? '' : '<button class="btn ghost icon sm danger" data-act="del-adj" title="削除">' + I.trash + '</button>') + '</div>';
      }).join('');
  }
  function addAdj(type, extra) {
    var a = Object.assign({ id: EE.data.uid('adj'), type: type, label: ADJ_LABEL[type], mode: 'rate', rateBp: type === 'overhead' ? 500 : 300, amount: 0, taxCategory: 'std10', scope: 'all', unit: 1000 }, extra || {});
    ED.doc.adjustments = (ED.doc.adjustments || []).concat([a]);
    markDirty(); renderAdj(); updateSummary();
    var row = document.querySelector('[data-adj="' + a.id + '"]');
    if (row) { EE.fx.pop(row); var f = row.querySelector('[data-adj-k="rate"], [data-adj-k="unit"]'); if (f) f.focus(); }
  }
  function selectedIds() { return Object.keys(ED.sel || {}).filter(function (k) { return ED.sel[k]; }).filter(function (id) { return ED.doc.lines.some(function (l) { return l.lineId === id; }); }); }
  function updateBulk() {
    var bar = document.getElementById('bulk-bar'); if (!bar) return;
    var n = selectedIds().length;
    if (n && bar.hidden) { bar.hidden = false; EE.fx.pop(bar); } else if (!n) bar.hidden = true;
    document.getElementById('bulk-n').textContent = n + '行を選択';
    var all = document.getElementById('sel-all');
    if (all) { all.checked = n > 0 && n === ED.doc.lines.length; all.indeterminate = n > 0 && n < ED.doc.lines.length; }
  }

  function updateSummary(first) {
    var r = U.calcDoc(ED.doc);
    var set = function (k, v) {
      var el = document.querySelector('[data-k="' + k + '"]');
      if (!el) return;
      if (first) EE.fx.countUp(el, v, el.dataset.format, 0, 620); else EE.fx.retarget(el, v);
    };
    set('subtotal', r.subtotal); set('total', r.total); set('costTotal', r.costTotal); set('grossProfit', r.grossProfit);
    set('margin', r.marginRate == null ? 0 : Math.round(r.marginRate * 1000) / 10);

    var TC = EE.engine.TAX_CATEGORIES;
    var lineSum = r.lines.reduce(function (s2, x) { return s2 + x.amount; }, 0);
    document.getElementById('sum-adj').innerHTML = r.adjustments.length ? '<div class="sum-row sub"><span>明細の合計</span><span class="yen">' + U.yen(lineSum) + '</span></div>' +
      r.adjustments.map(function (a) {
        var src = (ED.doc.adjustments || []).filter(function (x) { return x.id === a.id; })[0] || {};
        var lab = (a.label || ADJ_LABEL[a.type]) + (src.mode === 'rate' && a.type !== 'roundoff' ? '（' + (src.rateBp / 100) + '%）' : '');
        return '<div class="sum-row sub"><span>' + esc(lab) + '</span><span class="yen" style="color:' + (a.amount < 0 ? 'var(--warn)' : 'inherit') + '">' + (a.amount > 0 ? '+' : '') + U.yen(a.amount).replace('¥-', '−¥') + '</span></div>';
      }).join('') : '';
    r.adjustments.forEach(function (a) {
      var el = document.querySelector('[data-adj="' + a.id + '"] [data-adj-amt]');
      if (el) el.textContent = (a.amount > 0 ? '+' : '') + U.yen(a.amount).replace('¥-', '−¥');
    });
    document.getElementById('sum-rates').innerHTML = Object.keys(r.byRate).map(function (k) {
      var x = r.byRate[k];
      return '<div class="sum-row sub"><span>' + esc(TC[k].label) + ' 対象 ' + U.yen(x.base) + '</span><span class="yen">' + (TC[k].taxable ? '税 ' + U.yen(x.tax) : '—') + '</span></div>';
    }).join('') + '<div class="sum-row"><span>消費税</span><span class="yen">' + U.yen(r.tax) + '</span></div>';

    var mm = document.getElementById('margin-meter');
    var mr = r.marginRate == null ? 0 : Math.max(0, Math.min(1, r.marginRate / 0.5));
    mm.firstChild.style.width = (mr * 100) + '%';
    mm.classList.toggle('low', r.marginRate != null && r.marginRate < EE.S.settings.minMargin);

    var CT = Object.assign({}, EE.engine.COST_TYPES, { discount: '値引き' }), b = r.breakdown, tot = Math.max(1, r.subtotal);
    document.getElementById('breakdown').innerHTML = Object.keys(CT).filter(function (k) { return b[k] || k === 'material' || k === 'labor'; }).map(function (k) {
      return '<span>' + CT[k] + '</span><span class="num">' + U.yen(b[k]) + '</span><div class="bar"><i style="width:' + Math.max(0, b[k] / tot * 100) + '%"></i></div>';
    }).join('');

    // 行ごとの金額も更新（数量入力中に表全体を描き直さない）
    ED.doc.lines.forEach(function (l, i) {
      var tr = document.querySelector('[data-line="' + l.lineId + '"]');
      if (!tr || !r.lines[i]) return;
      var a = tr.querySelector('[data-amt]');
      a.firstChild.nodeValue = U.yen(r.lines[i].amount);
      var p = tr.querySelector('[data-prof]');
      p.textContent = '粗利 ' + U.yen(r.lines[i].profit);
      p.classList.toggle('neg', r.lines[i].profit < 0);
    });
    updateChecks();
  }

  var checkTimer;
  function updateChecks() {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(function () {
      var list = U.checkDoc(docForCheck());
      var s = EE.check.summary(list);
      var sum = document.getElementById('check-sum');
      if (!sum) return;
      sum.innerHTML = (s.error ? '<span class="badge err">要修正 ' + s.error + '</span>' : '') + (s.warn ? '<span class="badge warn">注意 ' + s.warn + '</span>' : '') +
        (!s.error && !s.warn ? '<span class="badge ok"><span class="d"></span>問題なし</span>' : '');
      var mini = document.getElementById('check-mini');
      var top = list.filter(function (x) { return x.level !== 'info'; }).slice(0, 4);
      mini.innerHTML = top.length ? top.map(checkItemHTML).join('') +
        (list.length > top.length ? '<div class="hint">ほか ' + (list.length - top.length) + ' 件（参考情報を含む）</div>' : '')
        : '<div class="hint">いまのところ、送る前に直すべき点は見つかっていません。</div>';
      highlightFields(list);
    }, 120);
  }

  function checkItemHTML(c, i) {
    var ic = c.level === 'error' ? '!' : c.level === 'warn' ? '!' : 'i';
    return '<div class="check ' + c.level + '" data-ci="' + (i == null ? '' : i) + '"><span class="ic">' + ic + '</span><div><div class="t">' + esc(c.title) + '</div>' +
      (c.detail ? '<div class="d">' + esc(c.detail) + '</div>' : '') + '</div>' +
      '<button class="btn ghost sm" data-goto=\'' + esc(JSON.stringify(c.target)) + '\'>該当箇所</button></div>';
  }

  function highlightFields(list) {
    document.querySelectorAll('#sec-header .input').forEach(function (el) { el.classList.remove('flag', 'flag-err'); });
    list.forEach(function (c) {
      if (c.target && c.target.field) {
        var el = document.querySelector('[data-f="' + c.target.field + '"]');
        if (el && c.level !== 'info') el.classList.add(c.level === 'error' ? 'flag-err' : 'flag');
      }
    });
  }

  function gotoTarget(t) {
    if (!t) return;
    var el;
    if (t.field) el = document.querySelector('[data-f="' + t.field + '"]');
    else if (t.lineId) el = document.querySelector('[data-line="' + t.lineId + '"]');
    else if (t.area === 'lines') el = document.getElementById('sec-lines');
    else if (t.area === 'summary') el = document.getElementById('sec-summary');
    else if (t.area === 'company') { location.hash = '#/settings/company'; return; }
    else el = document.getElementById('sec-header');
    if (!el) return;
    el.scrollIntoView({ behavior: EE.fx.reduce ? 'auto' : 'smooth', block: 'center' });
    setTimeout(function () {
      EE.fx.pulse(el);
      var f = el.matches('.input') ? el : el.querySelector('.input');
      if (f && !f.disabled) f.focus();
    }, 260);
  }

  /* ================= 明細の追加 ================= */
  function addItems(arr) {
    var ids = [];
    arr.forEach(function (x) {
      var it = U.findItem(x.itemId);
      if (!it) return;
      var ln = EE.data.lineFromItem(it, x.qty);
      ED.doc.lines.push(ln);
      ids.push(ln.lineId);
    });
    if (!ids.length) return;
    markDirty();
    renderLines(ids);
    return ids;
  }

  function filterItems() {
    var q = U.norm(pick.q).trim();
    var words = q.split(/\s+/).filter(Boolean);
    return EE.S.items.filter(function (it) {
      if (it.active === false) return false;
      if (pick.kind !== 'all' && it.kind !== pick.kind) return false;
      if (!words.length) return true;
      var hay = U.norm(it.code + ' ' + it.name + ' ' + it.spec);
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    }).slice(0, 40);
  }

  function hl(text) {
    var t = String(text || '');
    var n = U.norm(t);
    var words = U.norm(pick.q).trim().split(/\s+/).filter(Boolean);
    if (!words.length || n.length !== t.length) return esc(t);
    var on = new Array(t.length).fill(false);
    words.forEach(function (w) {
      var i = n.indexOf(w);
      if (i >= 0) for (var k = i; k < i + w.length; k++) on[k] = true;
    });
    var out = '', open = false;
    for (var k = 0; k < t.length; k++) {
      if (on[k] && !open) { out += '<mark>'; open = true; }
      if (!on[k] && open) { out += '</mark>'; open = false; }
      out += esc(t[k]);
    }
    return out + (open ? '</mark>' : '');
  }

  function renderPick() {
    var pop = document.getElementById('pick-pop');
    if (!pop) return;
    pick.list = filterItems();
    if (pick.idx >= pick.list.length) pick.idx = Math.max(0, pick.list.length - 1);
    var K = EE.engine.ITEM_KINDS;
    pop.innerHTML = (pick.list.length ? pick.list.map(function (it, i) {
      return '<div class="picker-opt' + (i === pick.idx ? ' on' : '') + '" data-pi="' + i + '"><span class="code">' + hl(it.code) + '</span>' +
        '<span>' + hl(it.name) + (it.spec ? ' <span class="hint">' + hl(it.spec) + '</span>' : '') + '</span>' +
        '<span class="badge">' + K[it.kind] + '</span><span class="num" style="min-width:110px;text-align:right">' + U.yen(it.unitPrice) + ' <span class="hint">/' + esc(it.unit) + '</span></span></div>';
    }).join('') : '<div class="empty" style="padding:20px">一致するマスタがありません。<br><a href="#/settings/items" style="color:var(--accent-2)">設定・マスタで登録</a></div>') +
      '<div class="picker-foot"><span><kbd>↑</kbd><kbd>↓</kbd> 選択</span><span><kbd>Enter</kbd> 追加</span><span><kbd>Esc</kbd> 閉じる</span></div>';
    if (!pick.open) {
      pop.hidden = false; pick.open = true;
      EE.fx.anim(pop, [{ opacity: 0, transform: 'translateY(-4px) scale(.99)' }, { opacity: 1, transform: 'none' }], { duration: 180 });
    }
    var on = pop.querySelector('.picker-opt.on');
    if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function closePick() {
    var pop = document.getElementById('pick-pop');
    if (pop) pop.hidden = true;
    pick.open = false;
  }
  function choosePick(i) {
    var it = pick.list[i];
    if (!it) return;
    var ids = addItems([{ itemId: it.id, qty: 1 }]);
    var inp = document.getElementById('pick');
    inp.value = ''; pick.q = ''; closePick();
    // 追加した行の数量欄へ。数量を打って Enter で検索欄に戻れる
    var tr = ids && document.querySelector('[data-line="' + ids[0] + '"] .qty');
    if (tr) { tr.focus(); tr.select(); }
  }

  /* ================= 操作 ================= */
  function save(btn, opts) {
    opts = opts || {};
    if (locked()) return;
    clearTimeout(asTimer);
    var d = ED.doc;
    if (!d.no) d.no = EE.data.nextNumber(EE.S, d.issueDate);
    var r = U.calcDoc(d);
    d.totals = EE.engine.snapshot(r);
    d.updatedAt = new Date().toISOString();
    if (!opts.silent) d.history = (d.history || []).concat([{ at: d.updatedAt, action: '保存' }]).slice(-50);
    var i = EE.S.documents.findIndex(function (x) { return x.id === d.id; });
    if (i >= 0) EE.S.documents[i] = clone(d); else EE.S.documents.push(clone(d));
    var ok = U.commit();
    if (!ok) { setState('<span style="color:var(--err)">保存できませんでした</span>'); return; }
    ED.dirty = false;
    var wasNew = ED.isNew;
    ED.isNew = false;
    if (wasNew) clearRecovery();
    if (d.importInfo && d.importInfo.importId && !d.importInfo.linked && EE.filestore) {
      d.importInfo.linked = true;
      var saved = EE.S.documents.filter(function (x) { return x.id === d.id; })[0]; if (saved) saved.importInfo.linked = true;
      EE.filestore.linkDoc(d.importInfo.importId, d.id).catch(function () {});
    }
    var s = document.getElementById('save-state');
    if (opts.silent) { if (s) s.innerHTML = '<span class="saved-mark">自動保存 ' + hhmm() + '</span>'; }
    else {
      EE.fx.success(btn || document.getElementById('btn-save'), '保存しました');
      if (s) { s.innerHTML = '<span class="saved-mark">保存済み ' + hhmm() + '</span>'; EE.fx.pop(s); }
    }
    var badge = document.querySelector('#sec-header .panel-h .badge');
    if (badge) badge.textContent = d.no;
    document.querySelector('.topbar .crumb').textContent = d.no;
    if (wasNew) EE.app.replaceRoute('#/edit/' + d.id);
    updateChecks();
  }

  function openCheck(forPdf) {
    var list = U.checkDoc(docForCheck());
    var s = EE.check.summary(list);
    var body = list.length
      ? '<div class="check-sum" style="margin-bottom:14px">' +
          '<span class="badge err">要修正 ' + s.error + '</span><span class="badge warn">注意 ' + s.warn + '</span><span class="badge blue">参考 ' + s.info + '</span></div>' +
        '<div class="checks">' + list.map(checkItemHTML).join('') + '</div>' +
        '<p class="hint" style="margin-top:14px">チェックは指摘だけを行い、書類を自動では直しません。「該当箇所」から移動して確認してください。</p>'
      : '<div class="check-ok">' + I.check + '<div><b>送信前チェックをすべて通過しました</b><div class="hint">金額の再計算・宛先・日付・有効期限・明細・登録番号に問題は見つかりませんでした。</div></div></div>';
    var foot = forPdf
      ? '<button class="btn ghost" data-close>修正する</button>' +
        '<button class="btn ' + (s.error ? 'danger' : 'primary') + '" data-go>' + I.pdf + (s.error ? '要修正のままプレビュー' : 'PDFプレビューへ') + '</button>'
      : '<button class="btn primary" data-close>閉じる</button>';
    U.modal({
      title: forPdf ? 'PDF出力の前に：送信前チェック' : '送信前チェック',
      body: body, foot: foot,
      onMount: function (el, api) {
        el.querySelectorAll('.check').forEach(function (c, i) {
          EE.fx.anim(c, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: i * 35 });
        });
        el.addEventListener('click', function (e) {
          var g = e.target.closest('[data-goto]');
          if (g) { api.close(); gotoTarget(JSON.parse(g.dataset.goto)); }
        });
        var c = el.querySelector('[data-close]'); if (c) c.onclick = function () { api.close(); };
        var go = el.querySelector('[data-go]');
        if (go) go.onclick = function () { api.close(); showPreview(); };
      }
    });
  }

  function showPreview() {
    var d = docForCheck();
    EE.print.preview(d, function () {
      var orig = U.findDoc(ED.doc.id);
      if (orig) {
        orig.history = (orig.history || []).concat([{ at: new Date().toISOString(), action: 'PDF出力' }]).slice(-50);
        U.commit();
      }
    });
  }

  async function pdf() {
    if (!locked() && ED.dirty) {
      var ok = await U.confirmBox('未保存の変更があります。保存してからPDFを出力しますか？', '保存して続ける');
      if (!ok) return;
      save();
    }
    if (locked()) return showPreview();
    openCheck(true);
  }

  async function issue() {
    if (ED.dirty) save();
    var list = U.checkDoc(docForCheck());
    var s = EE.check.summary(list);
    if (s.error) {
      EE.fx.toast('要修正が ' + s.error + ' 件あるため発行確定できません', { warn: true, ms: 3000 });
      return openCheck(false);
    }
    var ok = await U.confirmBox('発行確定すると、この見積書は編集・削除できなくなります（電子帳簿保存法に合わせた保存）。\n' +
      (s.warn ? '注意が ' + s.warn + ' 件あります。内容を確認済みであれば確定してください。\n' : '') +
      '\n内容を変える場合は、後から「修正見積」で新しい版を作れます。', '発行確定する');
    if (!ok) return;
    var orig = U.findDoc(ED.doc.id);
    var now = new Date().toISOString();
    orig.status = 'issued';
    orig.issuedAt = now;
    orig.rules = { lineRounding: EE.S.settings.lineRounding, taxRounding: EE.S.settings.taxRounding,
      overheadRounding: EE.S.settings.overheadRounding, discountRounding: EE.S.settings.discountRounding };
    orig.totals = EE.engine.snapshot(EE.engine.calc(orig, orig.rules));
    orig.history.push({ at: now, action: '発行確定' });
    U.commit();
    ED.dirty = false;
    EE.fx.toast('発行確定しました（' + orig.no + '）');
    EE.app.rerender();
  }

  function revise() {
    var src = U.findDoc(ED.doc.id);
    var d = EE.app.makeRevision(src);
    EE.fx.toast('修正見積（第' + d.rev + '版）を作成しました');
    location.hash = '#/edit/' + d.id;
  }

  function quickCustomer() {
    EE.views.clients.customerForm(null, function (c) {
      ED.doc.customerId = c.id;
      ED.doc.projectId = '';
      markDirty();
      var sel = document.querySelector('[data-f="customerId"]');
      sel.insertAdjacentHTML('beforeend', U.opt(c.id, c.name + ' ' + (c.honorific || ''), c.id));
      sel.value = c.id;
      document.querySelector('[data-f="projectId"]').innerHTML = projectOptions();
      EE.fx.pulse(sel);
      updateChecks();
    });
  }

  /* ================= イベント ================= */
  function mount(view) {
    renderLines();
    updateSummary(true);

    view.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.adjK) {
        var row = t.closest('[data-adj]');
        var a = ED.doc.adjustments.filter(function (x) { return x.id === row.dataset.adj; })[0];
        var k = t.dataset.adjK;
        if (k === 'rate') a.rateBp = Math.round((Number(t.value) || 0) * 100);
        else if (k === 'amount') a.amount = Math.round(Math.abs(Number(t.value) || 0));
        else if (k === 'unit') a.unit = Number(t.value);
        else if (k === 'mode') { a.mode = t.value; markDirty(); renderAdj(); updateSummary(); return; }
        else a[k] = t.value;
        markDirty(); updateSummary();
        return;
      }
      if (t.dataset.f) {
        ED.doc[t.dataset.f] = t.value;
        markDirty();
        if (t.dataset.f === 'issueDate' && !ED.doc.no) {
          document.querySelector('#sec-header .panel-h .badge').textContent = EE.data.peekNumber(EE.S, t.value) + '（保存時に採番）';
        }
        updateChecks();
      } else if (t.classList.contains('qty')) {
        var id = t.closest('tr').dataset.line;
        var ln = ED.doc.lines.filter(function (l) { return l.lineId === id; })[0];
        ln.qty = t.value === '' ? 0 : Number(t.value);
        markDirty();
        updateSummary();
      } else if (t.id === 'pick') {
        pick.q = t.value; pick.idx = 0; renderPick();
      }
    });
    view.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'tpl-add' && t.value) {
        var p = EE.S.packages.filter(function (x) { return x.id === t.value; })[0];
        t.value = '';
        if (!p) return;
        var ids = addItems(p.lines.filter(function (l) { return !l.optional; })) || [];
        var addedAdj = [];
        (p.adjustments || []).forEach(function (a) {
          if (ED.doc.adjustments.some(function (x) { return x.type === a.type && x.label === a.label; })) return;
          var na = Object.assign({ id: EE.data.uid('adj'), scope: 'all' }, a); ED.doc.adjustments.push(na); addedAdj.push(na.id);
        });
        if (!ED.doc.title) { ED.doc.title = p.name; var ti = document.querySelector('[data-f="title"]'); if (ti) ti.value = p.name; }
        if (!ED.doc.category) ED.doc.category = p.category;
        renderLines(ids);
        var opt = p.lines.filter(function (l) { return l.optional; }).length;
        EE.fx.toast('「' + p.name + '」から ' + ids.length + ' 行を追加しました' + (opt ? '（参考候補 ' + opt + ' 行は追加していません）' : ''), {
          action: { label: '元に戻す', run: function () {
            ED.doc.lines = ED.doc.lines.filter(function (l) { return ids.indexOf(l.lineId) < 0; });
            ED.doc.adjustments = ED.doc.adjustments.filter(function (a) { return addedAdj.indexOf(a.id) < 0; });
            renderLines();
          } }
        });
        return;
      }
      if (t.classList.contains('line-sel')) {
        ED.sel = ED.sel || {}; ED.sel[t.closest('tr').dataset.line] = t.checked; updateBulk(); return;
      }
      if (t.id === 'sel-all') {
        ED.sel = {}; if (t.checked) ED.doc.lines.forEach(function (l) { ED.sel[l.lineId] = true; });
        view.querySelectorAll('.line-sel').forEach(function (c) { c.checked = t.checked; }); updateBulk(); return;
      }
      if (t.dataset.f === 'customerId') {
        var pj = U.findProject(ED.doc.projectId);
        if (pj && pj.customerId !== t.value) ED.doc.projectId = '';
        document.querySelector('[data-f="projectId"]').innerHTML = projectOptions();
        updateChecks();
      }
      if (t.dataset.f === 'projectId' && t.value) {
        var p = U.findProject(t.value);
        if (p && !ED.doc.title) { ED.doc.title = p.name; document.querySelector('[data-f="title"]').value = p.name; }
        if (p && !ED.doc.customerId) { ED.doc.customerId = p.customerId; document.querySelector('[data-f="customerId"]').value = p.customerId; }
        updateChecks();
      }
    });

    var pk = document.getElementById('pick');
    if (pk) {
      pk.addEventListener('focus', function () { renderPick(); });
      pk.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); pick.idx = Math.min(pick.list.length - 1, pick.idx + 1); renderPick(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); pick.idx = Math.max(0, pick.idx - 1); renderPick(); }
        else if (e.key === 'Enter') { e.preventDefault(); choosePick(pick.idx); }
        else if (e.key === 'Escape') { closePick(); pk.blur(); }
      });
      document.getElementById('pick-pop').addEventListener('mousedown', function (e) {
        var o = e.target.closest('[data-pi]');
        if (o) { e.preventDefault(); choosePick(Number(o.dataset.pi)); }
      });
      pk.addEventListener('blur', function () { setTimeout(closePick, 120); });
    }

    view.addEventListener('keydown', function (e) {
      var t = e.target;
      if (!t.classList.contains('qty')) return;
      var rows = Array.prototype.slice.call(view.querySelectorAll('.qty'));
      var i = rows.indexOf(t);
      if (e.key === 'Enter') { e.preventDefault(); var p = document.getElementById('pick'); if (p) p.focus(); }
      else if (e.key === 'ArrowDown' && rows[i + 1]) { e.preventDefault(); rows[i + 1].focus(); rows[i + 1].select(); }
      else if (e.key === 'ArrowUp' && rows[i - 1]) { e.preventDefault(); rows[i - 1].focus(); rows[i - 1].select(); }
    });

    function onClick(e) {
      var kb = e.target.closest('#pick-kind [data-kind]');
      if (kb) {
        pick.kind = kb.dataset.kind;
        view.querySelectorAll('#pick-kind button').forEach(function (b) { b.classList.toggle('on', b === kb); });
        pick.idx = 0; document.getElementById('pick').focus(); renderPick();
        return;
      }
      var vq = e.target.closest('#valid-quick [data-days]');
      if (vq) {
        var base = ED.doc.issueDate || EE.data.today();
        ED.doc.validUntil = EE.data.addDays(base, Number(vq.dataset.days));
        var vi = document.querySelector('[data-f="validUntil"]');
        vi.value = ED.doc.validUntil; EE.fx.pulse(vi);
        markDirty(); updateChecks();
        return;
      }
      var pkg = e.target.closest('[data-pkg]');
      if (pkg) {
        var p = EE.S.packages.filter(function (x) { return x.id === pkg.dataset.pkg; })[0];
        var ids = addItems(p.lines);
        EE.fx.toast('「' + p.name + '」から ' + (ids ? ids.length : 0) + ' 行を追加しました', {
          action: { label: '元に戻す', run: function () {
            ED.doc.lines = ED.doc.lines.filter(function (l) { return ids.indexOf(l.lineId) < 0; });
            renderLines();
          } }
        });
        return;
      }
      var g = e.target.closest('[data-goto]');
      if (g) { gotoTarget(JSON.parse(g.dataset.goto)); return; }

      var a = e.target.closest('[data-act]');
      if (!a) return;
      var act = a.dataset.act;
      var tr = a.closest('tr[data-line]');
      if (tr) {
        e.preventDefault();
        var idx = ED.doc.lines.findIndex(function (l) { return l.lineId === tr.dataset.line; });
        var L = ED.doc.lines;
        if (act === 'del') {
          var removed = L.splice(idx, 1)[0];
          markDirty();
          var anim = EE.fx.anim(tr, [{ opacity: 1 }, { opacity: 0, transform: 'translateX(12px)' }], { duration: 160, fill: 'forwards' });
          // 動きの終わりを待ちつつ、描画が重いときも 0.22 秒後には必ず表を描き直す
          var doneDel = false, after = function () { if (doneDel) return; doneDel = true; renderLines(); };
          if (anim) { anim.onfinish = after; setTimeout(after, 220); } else after();
          EE.fx.toast('「' + removed.name + '」を削除しました', { action: { label: '元に戻す', run: function () {
            L.splice(Math.min(idx, L.length), 0, removed); renderLines(removed.lineId);
          } } });
        } else if (act === 'up' && idx > 0) {
          L.splice(idx - 1, 0, L.splice(idx, 1)[0]); markDirty(); renderLines(L[idx - 1].lineId);
        } else if (act === 'down' && idx < L.length - 1) {
          L.splice(idx + 1, 0, L.splice(idx, 1)[0]); markDirty(); renderLines(L[idx + 1].lineId);
        } else if (act === 'calc') {
          var ln = L[idx];
          EE.calcTool.open({ unit: ln.unit, onApply: function (q) {
            ln.qty = q; markDirty(); renderLines(ln.lineId);
            EE.fx.toast('「' + ln.name + '」の数量を ' + U.num(q) + ' ' + ln.unit + ' にしました');
          } });
        } else if (act === 'refresh-price') {
          var it = U.findItem(L[idx].itemId);
          if (it) {
            var old = L[idx].unitPrice;
            L[idx].unitPrice = it.unitPrice; L[idx].unitCost = it.unitCost;
            markDirty(); renderLines(L[idx].lineId);
            EE.fx.toast('単価を ' + U.yen(old) + ' → ' + U.yen(it.unitPrice) + ' に更新しました');
          }
        }
        return;
      }
      if (act === 'open-original') { e.preventDefault(); EE.filestore.openOriginal(ED.doc.importInfo.importId).catch(function (err) { EE.fx.toast(err.message, { warn: true }); }); return; }
      if (act === 'add-adj') { addAdj(a.dataset.type); return; }
      if (act === 'del-adj') {
        var aid = a.closest('[data-adj]').dataset.adj;
        var removedA = ED.doc.adjustments.filter(function (x) { return x.id === aid; })[0];
        ED.doc.adjustments = ED.doc.adjustments.filter(function (x) { return x.id !== aid; });
        markDirty(); renderAdj(); updateSummary();
        EE.fx.toast('「' + (removedA.label || ADJ_LABEL[removedA.type]) + '」を削除しました', { action: { label: '元に戻す', run: function () { ED.doc.adjustments.push(removedA); renderAdj(); updateSummary(); } } });
        return;
      }
      if (act === 'bulk-del' || act === 'bulk-dup' || act === 'bulk-refresh' || act === 'bulk-discount') {
        var ids = selectedIds(); if (!ids.length) return;
        var before = clone(ED.doc.lines), beforeAdj = clone(ED.doc.adjustments || []);
        var undo = { label: '元に戻す', run: function () { ED.doc.lines = before; ED.doc.adjustments = beforeAdj; renderLines(); } };
        if (act === 'bulk-del') {
          ED.doc.lines = ED.doc.lines.filter(function (l) { return ids.indexOf(l.lineId) < 0; });
          EE.fx.toast(ids.length + ' 行を削除しました', { action: undo });
          ED.sel = {};
          markDirty(); renderLines();
        } else if (act === 'bulk-dup') {
          var newIds = [];
          ED.doc.lines = ED.doc.lines.reduce(function (acc, l) {
            acc.push(l);
            if (ids.indexOf(l.lineId) >= 0) { var c = clone(l); c.lineId = EE.data.uid('ln'); acc.push(c); newIds.push(c.lineId); }
            return acc;
          }, []);
          EE.fx.toast(ids.length + ' 行を複製しました', { action: undo });
          markDirty(); renderLines(newIds);
        } else if (act === 'bulk-refresh') {
          var n = 0;
          ED.doc.lines.forEach(function (l) {
            if (ids.indexOf(l.lineId) < 0) return;
            var it = U.findItem(l.itemId);
            if (it && (it.unitPrice !== l.unitPrice || it.unitCost !== l.unitCost)) { l.unitPrice = it.unitPrice; l.unitCost = it.unitCost; l.priceDate = EE.data.today(); l.priceSource = null; n++; }
          });
          EE.fx.toast(n ? n + ' 行を最新のマスタ単価に更新しました' : '選んだ行はすべて最新の単価です', n ? { action: undo } : {});
          if (n) { markDirty(); renderLines(ids); }
        } else if (act === 'bulk-discount') {
          addAdj('discount', { label: '値引き（' + ids.length + '行）', scope: ids.slice(), rateBp: 500 });
        }
        return;
      }
      if (act === 'snip') { e.preventDefault(); openSnippets(a.dataset.target); return; }
      if (act === 'recover') {
        var rec = readRecovery(); clearRecovery();
        if (rec) { ['id', 'no', 'history', 'createdAt', 'updatedAt', 'status', 'totals'].forEach(function (k) { delete rec[k]; }); rec.sourceLabel = '入力途中のデータを復元'; EE.app.newWith(rec); }
        return;
      }
      if (act === 'discard-recovery') {
        clearRecovery(); var rb = document.getElementById('recovery');
        if (rb) { var an = EE.fx.anim(rb, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 180, fill: 'forwards' }); if (an) an.onfinish = function () { rb.remove(); }; else rb.remove(); }
        return;
      }
      if (act === 'save') save(a);
      else if (act === 'check') openCheck(false);
      else if (act === 'pdf') pdf();
      else if (act === 'issue') issue();
      else if (act === 'revise') revise();
      else if (act === 'duplicate') EE.app.duplicate(ED.doc.id);
      else if (act === 'quick-customer') quickCustomer();
    }
    view.addEventListener('click', onClick);
    document.getElementById('actions').onclick = onClick;
  }

  /** 定型文の挿入（備考は追記、支払条件は置き換え） */
  function openSnippets(target) {
    var K = EE.catalog.SNIPPET_KINDS;
    var list = (EE.S.snippets || []).filter(function (x) { return target === 'paymentTerms' ? x.kind === 'payment' : true; });
    U.modal({
      title: target === 'paymentTerms' ? '支払条件の定型文' : '定型文を挿入',
      body: list.length ? Object.keys(K).map(function (k) {
        var xs = list.filter(function (x) { return x.kind === k; });
        return xs.length ? '<div class="label" style="margin:10px 0 6px">' + K[k] + '</div><div class="checks">' + xs.map(function (x) {
          return '<button class="check info" data-snip="' + x.id + '" style="grid-template-columns:1fr;text-align:left;cursor:pointer;color:inherit"><div><div class="t">' + esc(x.title) + '</div><div class="d">' + esc(x.body) + '</div></div></button>';
        }).join('') + '</div>' : '';
      }).join('') : '<div class="empty">定型文がありません</div>',
      foot: '<a class="btn ghost" href="#/settings/snippets">定型文を編集</a><div class="spacer"></div><button class="btn primary" data-c>閉じる</button>',
      onMount: function (el, api) {
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.addEventListener('click', function (e) {
          var b = e.target.closest('[data-snip]'); if (!b) return;
          var x = EE.S.snippets.filter(function (y) { return y.id === b.dataset.snip; })[0];
          var f = document.querySelector('[data-f="' + target + '"]');
          if (target === 'notes') ED.doc.notes = (ED.doc.notes ? ED.doc.notes.replace(/\s+$/, '') + '\n' : '') + x.body;
          else ED.doc[target] = x.body;
          f.value = ED.doc[target]; markDirty(); EE.fx.pulse(f);
          if (target !== 'notes') api.close(); else EE.fx.toast('「' + x.title + '」を挿入しました');
        });
      }
    });
  }

  /** キーボード：Ctrl+S 保存、Ctrl+P PDF、/ で明細検索 */
  function onKey(e) {
    if (!ED || U.topModal()) return false;
    var mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); if (!locked()) save(); return true; }
    if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); pdf(); return true; }
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      var p = document.getElementById('pick'); if (p) { e.preventDefault(); p.focus(); return true; }
    }
    return false;
  }

  EE.views = EE.views || {};
  EE.views.editor = { render: render, onKey: onKey, isDirty: function () { return !!(ED && ED.dirty); } };
})(this);
