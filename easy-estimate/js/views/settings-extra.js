/* 設定・マスタ：工事テンプレート（カテゴリー含む）・計算式・定型文 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;

  function catName(id) { var c = (EE.S.categories || []).filter(function (x) { return x.id === id; })[0]; return c ? c.name : 'その他'; }
  function splitList(s) { return String(s || '').split(/[,、，\n]/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function rerender() { EE.app.rerender(); }
  function bad(el, name) { var f = el.querySelector('[name=' + name + ']'); f.classList.add('flag-err'); EE.fx.shake(f); f.focus(); }

  /* ---------------- 工事テンプレート ---------------- */
  function templatesTab() {
    var S = EE.S;
    var cats = (S.categories || []);
    return '<div class="toolbar" data-st><div class="grow hint">工事の種類ごとの標準明細です。「かんたん見積もり作成」と見積画面から呼び出せます。<br>「参考候補」の明細は最初は外した状態で出ます。キーワードは文章・音声から作るときのテンプレート判定に使います。</div>' +
      '<button class="btn" data-act="cats">' + I.edit + '工事カテゴリーを編集する</button><button class="btn primary" data-act="new-pkg">' + I.plus + 'テンプレートを作成する</button></div>' +
      cats.concat([{ id: '__none', name: 'カテゴリーなし' }]).map(function (c) {
        var list = S.packages.filter(function (p) { return c.id === '__none' ? !cats.some(function (x) { return x.id === p.category; }) : p.category === c.id; });
        if (!list.length) return '';
        return '<div class="label" data-st style="margin:18px 0 10px">' + esc(c.name) + (c.keywords && c.keywords.length ? '　<span class="hint">キーワード：' + esc(c.keywords.join('、')) + '</span>' : '') + '</div>' +
          '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">' + list.map(function (p) {
            var r = EE.engine.calc({ lines: p.lines.filter(function (l) { return !l.optional; }).map(function (l) { var it = U.findItem(l.itemId) || {}; return { lineId: l.itemId, qty: l.qty, unitPrice: it.unitPrice || 0, unitCost: it.unitCost || 0, taxCategory: it.taxCategory }; }),
              adjustments: (p.adjustments || []).map(function (a) { return Object.assign({ scope: 'all' }, a); }) }, S.settings);
            return '<section class="panel kpi" data-st style="padding:0"><div class="panel-h"><span class="kpi-icon">' + I.box + '</span><h3>' + esc(p.name) + '</h3><div class="spacer"></div>' +
              '<button class="btn ghost icon sm" data-act="edit-pkg" data-id="' + p.id + '">' + I.edit + '</button></div>' +
              '<div class="panel-b"><div class="hint" style="margin-bottom:8px">' + esc(p.note || '') + (p.keywords && p.keywords.length ? '　キーワード：' + esc(p.keywords.join('、')) : '') + '</div>' +
              p.lines.map(function (l) { var it = U.findItem(l.itemId);
                return '<div class="sum-row sub" style="padding-left:0;' + (l.optional ? 'opacity:.6' : '') + '"><span>' + (it ? esc(it.name) + (it.spec ? ' <span class="hint">' + esc(it.spec) + '</span>' : '') : '<span style="color:var(--err)">削除済み</span>') + (l.optional ? ' <span class="badge">参考候補</span>' : '') + '</span><span class="num">' + U.num(l.qty) + ' ' + (it ? esc(it.unit) : '') + '</span></div>'; }).join('') +
              (p.adjustments || []).map(function (a) { return '<div class="sum-row sub" style="padding-left:0"><span>' + esc(a.label) + '</span><span class="num">' + (a.mode === 'rate' ? a.rateBp / 100 + '%' : U.yen(a.amount)) + '</span></div>'; }).join('') +
              '<div class="sep"></div><div class="sum-row"><span>小計（税抜・参考候補を除く）</span><span class="yen num">' + U.yen(r.subtotal) + '</span></div>' +
              '<div class="sum-row" style="padding:0"><span class="hint">粗利率</span><span class="hint num">' + U.pct(r.marginRate) + '</span></div></div></section>';
          }).join('') + '</div>';
      }).join('');
  }

  function packageForm(p) {
    var isNew = !p;
    var draft = p ? JSON.parse(JSON.stringify(p)) : { id: EE.data.uid('pkg'), name: '', category: (EE.S.categories[0] || {}).id || '', keywords: [], note: '', lines: [], adjustments: [] };
    draft.adjustments = draft.adjustments || [];
    function itemOpts(sel) {
      var cats = EE.S.categories || [];
      return cats.map(function (c) {
        var xs = EE.S.items.filter(function (it) { return it.category === c.id && (it.active !== false || it.id === sel); });
        return xs.length ? '<optgroup label="' + esc(c.name) + '">' + xs.map(function (it) { return U.opt(it.id, it.code + '　' + it.name + (it.spec ? '（' + it.spec + '）' : '') + '  ' + U.yen(it.unitPrice) + '/' + it.unit, sel); }).join('') + '</optgroup>' : '';
      }).join('');
    }
    function linesHTML() {
      return draft.lines.map(function (l, i) {
        return '<div style="display:grid;grid-template-columns:1fr 100px 92px 34px;gap:8px;margin-bottom:8px;align-items:center" data-i="' + i + '">' +
          '<select class="input" data-k="itemId">' + itemOpts(l.itemId) + '</select>' +
          '<input class="input num" type="number" step="0.01" data-k="qty" value="' + l.qty + '">' +
          '<label class="hint" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-k="optional"' + (l.optional ? ' checked' : '') + '>参考候補</label>' +
          '<button class="btn ghost icon danger" data-rm>' + I.trash + '</button></div>';
      }).join('') || '<p class="hint">明細がありません</p>';
    }
    var oh = draft.adjustments.filter(function (a) { return a.type === 'overhead' && a.mode === 'rate'; })[0];
    U.modal({
      title: isNew ? 'テンプレートを作成' : 'テンプレートを編集', wide: true,
      body: '<div class="form-grid" style="margin-bottom:16px">' +
        '<div class="field c6"><label class="req">名前</label><input class="input" name="name" value="' + esc(draft.name) + '" autofocus></div>' +
        '<div class="field c6"><label>工事カテゴリー</label><select class="input" name="category">' + (EE.S.categories || []).map(function (c) { return U.opt(c.id, c.name, draft.category); }).join('') + '</select></div>' +
        '<div class="field c6"><label>キーワード（読点・カンマ区切り）</label><input class="input" name="keywords" value="' + esc((draft.keywords || []).join('、')) + '" placeholder="例：フェンス、目隠し"></div>' +
        '<div class="field c3"><label>諸経費（%）</label><input class="input num" type="number" step="0.1" name="overhead" value="' + (oh ? oh.rateBp / 100 : '') + '" placeholder="なし"></div>' +
        '<div class="field c3"><label>メモ</label><input class="input" name="note" value="' + esc(draft.note) + '"></div></div>' +
        '<div class="label" style="margin-bottom:8px">明細（マスタ＋標準数量）</div><div id="pl">' + linesHTML() + '</div>' +
        '<button class="btn sm" data-add>' + I.plus + '行を追加</button>',
      foot: (isNew ? '' : '<button class="btn danger" data-del>' + I.trash + '削除</button>') + '<div class="spacer"></div><button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-s>' + I.save + '保存する</button>',
      onMount: function (el, api) {
        var pl = el.querySelector('#pl');
        pl.addEventListener('change', function (e) {
          var row = e.target.closest('[data-i]'); if (!row) return;
          var l = draft.lines[row.dataset.i], k = e.target.dataset.k;
          if (k === 'qty') l.qty = Number(e.target.value); else if (k === 'optional') l.optional = e.target.checked; else l.itemId = e.target.value;
        });
        pl.addEventListener('click', function (e) { if (e.target.closest('[data-rm]')) { draft.lines.splice(e.target.closest('[data-i]').dataset.i, 1); pl.innerHTML = linesHTML(); } });
        el.querySelector('[data-add]').onclick = function () {
          var cat = el.querySelector('[name=category]').value;
          var first = EE.S.items.filter(function (it) { return it.active !== false && it.category === cat; })[0] || EE.S.items[0];
          if (!first) return;
          draft.lines.push({ itemId: first.id, qty: first.stdQty || 1, optional: false }); pl.innerHTML = linesHTML();
          var last = pl.lastElementChild; EE.fx.pop(last); last.querySelector('select').focus();
        };
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        var del = el.querySelector('[data-del]');
        if (del) del.onclick = async function () {
          if (!(await U.confirmBox('「' + p.name + '」を削除しますか？', '削除する', { danger: true }))) return;
          var undo = U.undoable('「' + p.name + '」を削除しました', ['packages']);
          EE.S.packages.splice(EE.S.packages.indexOf(p), 1); U.commit(); api.close(); rerender(); undo();
        };
        el.querySelector('[data-s]').onclick = function () {
          var v = U.readForm(el.querySelector('.form-grid'));
          if (!v.name) return bad(el, 'name');
          draft.name = v.name; draft.note = v.note; draft.category = v.category; draft.keywords = splitList(v.keywords);
          draft.adjustments = draft.adjustments.filter(function (a) { return !(a.type === 'overhead' && a.mode === 'rate'); });
          if (v.overhead) draft.adjustments.unshift({ type: 'overhead', label: '諸経費', mode: 'rate', rateBp: Math.round(v.overhead * 100) });
          draft.lines = draft.lines.filter(function (l) { return l.itemId && isFinite(l.qty) && l.qty !== 0; });
          if (isNew) EE.S.packages.push(draft); else Object.assign(p, draft);
          U.commit(); api.close(); rerender(); EE.fx.toast('テンプレートを保存しました');
        };
      }
    });
  }

  function categoriesForm() {
    var cats = JSON.parse(JSON.stringify(EE.S.categories || []));
    function rows() {
      return cats.map(function (c, i) {
        return '<div style="display:grid;grid-template-columns:200px 1fr 34px;gap:8px;margin-bottom:8px" data-i="' + i + '">' +
          '<input class="input" data-k="name" value="' + esc(c.name) + '"><input class="input" data-k="keywords" value="' + esc((c.keywords || []).join('、')) + '" placeholder="判定用キーワード（読点区切り）">' +
          '<button class="btn ghost icon danger" data-rm>' + I.trash + '</button></div>';
      }).join('');
    }
    U.modal({
      title: '工事カテゴリー', wide: true,
      body: '<p class="hint" style="margin-top:0">文章・音声から見積を作るとき、キーワードでカテゴリーを判定します。工事項目マスターの分類にも使います。</p><div id="cl">' + rows() + '</div><button class="btn sm" data-add>' + I.plus + 'カテゴリーを追加</button>',
      foot: '<button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-s>' + I.save + '保存する</button>',
      onMount: function (el, api) {
        var cl = el.querySelector('#cl');
        cl.addEventListener('input', function (e) { var r = e.target.closest('[data-i]'); var c = cats[r.dataset.i];
          if (e.target.dataset.k === 'name') c.name = e.target.value; else c.keywords = splitList(e.target.value); });
        cl.addEventListener('click', async function (e) {
          if (!e.target.closest('[data-rm]')) return;
          var i = Number(e.target.closest('[data-i]').dataset.i), c = cats[i];
          var used = EE.S.items.some(function (it) { return it.category === c.id; }) || EE.S.packages.some(function (p) { return p.category === c.id; });
          if (used) { EE.fx.toast('「' + c.name + '」は使われているので削除できません', { warn: true }); return; }
          cats.splice(i, 1); cl.innerHTML = rows();
        });
        el.querySelector('[data-add]').onclick = function () { cats.push({ id: EE.data.uid('cat'), name: '新しいカテゴリー', keywords: [] }); cl.innerHTML = rows(); EE.fx.pop(cl.lastElementChild); cl.lastElementChild.querySelector('input').select(); };
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-s]').onclick = function () {
          if (cats.some(function (c) { return !c.name.trim(); })) { EE.fx.toast('名前が空のカテゴリーがあります', { warn: true }); return; }
          EE.S.categories = cats; U.commit(); api.close(); rerender(); EE.fx.toast('工事カテゴリーを保存しました');
        };
      }
    });
  }

  /* ---------------- 計算式 ---------------- */
  function formulasTab() {
    var list = EE.S.formulas || [];
    return '<div class="toolbar" data-st><div class="grow hint">よく使う数量の計算式です。見積の明細の「計算」ボタンから使い、結果を数量に反映します。<br>式に使えるのは 数字・入力名・＋−×÷（+ - * /）・かっこ・ceil（切り上げ）floor round min max です。</div>' +
      '<button class="btn primary" data-act="new-f">' + I.plus + '計算式を作成</button></div>' +
      '<section class="panel" data-st><div class="panel-b"><table class="table"><thead><tr><th>名前</th><th>式</th><th>入力</th><th class="r">ロス率</th><th>結果の単位</th><th></th></tr></thead><tbody>' +
      list.map(function (f) {
        return '<tr class="clickable" data-act="edit-f" data-id="' + f.id + '" data-st><td>' + esc(f.name) + '</td><td><code>' + esc(f.expr) + '</code></td>' +
          '<td class="muted">' + f.inputs.map(function (x) { return esc(x.label); }).join('・') + '</td><td class="r num">' + (f.lossPct || 0) + '%</td><td>' + esc(f.unit || '') + (f.round === 'ceil' ? '（切り上げ）' : '') + '</td>' +
          '<td><div class="row-actions"><button class="btn ghost icon sm" data-act="edit-f" data-id="' + f.id + '">' + I.edit + '</button></div></td></tr>';
      }).join('') + '</tbody></table></div></section>';
  }

  function formulaForm(f) {
    var isNew = !f;
    var d = f ? JSON.parse(JSON.stringify(f)) : { id: EE.data.uid('f'), name: '', unit: 'm²', expr: 'w * d', lossPct: 0, round: 'decimal', inputs: [{ key: 'w', label: '縦', unit: 'm' }, { key: 'd', label: '横', unit: 'm' }] };
    function inputsHTML() {
      return d.inputs.map(function (x, i) {
        return '<div style="display:grid;grid-template-columns:110px 1fr 100px 110px 34px;gap:8px;margin-bottom:8px" data-i="' + i + '">' +
          '<input class="input num" data-k="key" value="' + esc(x.key) + '" placeholder="入力名（英字）">' +
          '<input class="input" data-k="label" value="' + esc(x.label) + '" placeholder="表示名">' +
          '<input class="input" data-k="unit" value="' + esc(x.unit) + '" placeholder="単位" list="f-units">' +
          '<input class="input num" type="number" step="any" data-k="test" placeholder="試しの値" value="' + esc(x.test != null ? x.test : (x.default != null ? x.default : '')) + '">' +
          '<button class="btn ghost icon danger" data-rm>' + I.trash + '</button></div>';
      }).join('');
    }
    U.modal({
      title: isNew ? '計算式を作成' : '計算式を編集', wide: true,
      body: '<div class="form-grid">' +
        '<div class="field c6"><label class="req">名前</label><input class="input" name="name" value="' + esc(d.name) + '" autofocus></div>' +
        '<div class="field c2"><label>結果の単位</label><input class="input" name="unit" value="' + esc(d.unit) + '" list="f-units"></div>' +
        '<div class="field c2"><label>ロス率（%）</label><input class="input num" type="number" step="0.1" name="lossPct" value="' + (d.lossPct || 0) + '"></div>' +
        '<div class="field c2"><label>端数</label><select class="input" name="round">' + U.opt('decimal', '小数2桁', d.round) + U.opt('ceil', '切り上げ', d.round) + '</select></div>' +
        '<div class="field c12"><label class="req">式</label><input class="input num" name="expr" value="' + esc(d.expr) + '"></div></div>' +
        '<datalist id="f-units"><option>m</option><option>mm</option><option>cm</option><option>m²</option><option>m³</option><option>個</option><option>枚</option><option>本</option><option>段</option><option>kg</option><option>t</option></datalist>' +
        '<div class="label" style="margin:14px 0 8px">入力（入力名を式の中で使います。単位が m の入力は、使うときに mm / cm でも入れられます）</div><div id="fi">' + inputsHTML() + '</div>' +
        '<button class="btn sm" data-add>' + I.plus + '入力を追加</button>' +
        '<div class="sum-total" style="margin-top:14px"><div class="label">試しの計算</div><div class="big num" id="f-out" style="font-size:22px">—</div><div class="hint" id="f-err"></div></div>',
      foot: (isNew ? '' : '<button class="btn danger" data-del>' + I.trash + '削除</button>') + '<div class="spacer"></div><button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-s>' + I.save + '保存する</button>',
      onMount: function (el, api) {
        var fi = el.querySelector('#fi');
        function test() {
          var v = U.readForm(el.querySelector('.form-grid'));
          var f2 = { expr: v.expr, inputs: d.inputs, lossPct: v.lossPct, round: v.round };
          var vals = {}; d.inputs.forEach(function (x) { vals[x.key] = x.test; });
          try { var r = EE.calcTool.evaluate(f2, vals); el.querySelector('#f-out').textContent = U.num(r.qty) + ' ' + v.unit; el.querySelector('#f-err').textContent = ''; return true; }
          catch (e) { el.querySelector('#f-out').textContent = '—'; el.querySelector('#f-err').textContent = e.message; el.querySelector('#f-err').style.color = 'var(--err)'; return false; }
        }
        el.addEventListener('input', function (e) {
          var r = e.target.closest('#fi [data-i]');
          if (r) { var x = d.inputs[r.dataset.i]; var k = e.target.dataset.k; if (k === 'test') x.test = e.target.value; else x[k] = e.target.value.trim(); }
          test();
        });
        fi.addEventListener('click', function (e) { if (e.target.closest('[data-rm]')) { d.inputs.splice(e.target.closest('[data-i]').dataset.i, 1); fi.innerHTML = inputsHTML(); test(); } });
        el.querySelector('[data-add]').onclick = function () { d.inputs.push({ key: 'x' + (d.inputs.length + 1), label: '', unit: 'm' }); fi.innerHTML = inputsHTML(); };
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        var del = el.querySelector('[data-del]');
        if (del) del.onclick = function () { EE.S.formulas.splice(EE.S.formulas.indexOf(f), 1); U.commit(); api.close(); rerender(); };
        el.querySelector('[data-s]').onclick = function () {
          var v = U.readForm(el.querySelector('.form-grid'));
          if (!v.name) return bad(el, 'name');
          if (d.inputs.some(function (x) { return !/^[A-Za-z_][A-Za-z0-9_]*$/.test(x.key); })) { EE.fx.toast('入力名は英字で始まる英数字にしてください', { warn: true }); return; }
          try { EE.calcTool.compile(v.expr); } catch (e) { EE.fx.toast(e.message, { warn: true }); return bad(el, 'expr'); }
          Object.assign(d, { name: v.name, unit: v.unit, expr: v.expr, lossPct: v.lossPct || 0, round: v.round });
          d.inputs.forEach(function (x) { delete x.test; if (!x.label) x.label = x.key; });
          if (isNew) EE.S.formulas.push(d); else Object.assign(f, d);
          U.commit(); api.close(); rerender(); EE.fx.toast('計算式を保存しました');
        };
        test();
      }
    });
  }

  /* ---------------- 定型文 ---------------- */
  function snippetsTab() {
    var K = EE.catalog.SNIPPET_KINDS;
    return '<div class="toolbar" data-st><div class="grow hint">見積の「備考・条件」「支払条件」に挿入できる文章です。</div><button class="btn primary" data-act="new-snip">' + I.plus + '定型文を作成</button></div>' +
      Object.keys(K).map(function (k) {
        var xs = (EE.S.snippets || []).filter(function (x) { return x.kind === k; });
        return '<div class="label" data-st style="margin:16px 0 8px">' + K[k] + '</div>' + (xs.length ? '<div class="checks">' + xs.map(function (x) {
          return '<button class="check info" data-st data-act="edit-snip" data-id="' + x.id + '" style="grid-template-columns:1fr auto;text-align:left;cursor:pointer;color:inherit"><div><div class="t">' + esc(x.title) + '</div><div class="d">' + esc(x.body) + '</div></div><span class="hint">編集</span></button>';
        }).join('') + '</div>' : '<p class="hint">なし</p>');
      }).join('');
  }
  function snippetForm(x) {
    var isNew = !x, K = EE.catalog.SNIPPET_KINDS;
    x = x || { id: EE.data.uid('snp'), kind: 'notes', title: '', body: '' };
    U.modal({
      title: isNew ? '定型文を作成' : '定型文を編集',
      body: '<div class="form-grid"><div class="field c6"><label>種類</label><select class="input" name="kind">' + U.options(K, x.kind) + '</select></div>' +
        '<div class="field c6"><label class="req">見出し</label><input class="input" name="title" value="' + esc(x.title) + '" autofocus></div>' +
        '<div class="field c12"><label class="req">本文</label><textarea class="input" name="body" rows="4">' + esc(x.body) + '</textarea></div></div>',
      foot: (isNew ? '' : '<button class="btn danger" data-del>' + I.trash + '削除</button>') + '<div class="spacer"></div><button class="btn ghost" data-c>キャンセル</button><button class="btn primary" data-s>' + I.save + '保存する</button>',
      onMount: function (el, api) {
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        var del = el.querySelector('[data-del]');
        if (del) del.onclick = function () { EE.S.snippets.splice(EE.S.snippets.indexOf(x), 1); U.commit(); api.close(); rerender(); };
        el.querySelector('[data-s]').onclick = function () {
          var v = U.readForm(el);
          if (!v.title) return bad(el, 'title');
          if (!v.body) return bad(el, 'body');
          Object.assign(x, v); if (isNew) EE.S.snippets.push(x);
          U.commit(); api.close(); rerender(); EE.fx.toast('定型文を保存しました');
        };
      }
    });
  }

  /** settings.js から呼ばれるアクション。処理したら true */
  function handle(act, a) {
    var S = EE.S;
    switch (act) {
      case 'new-pkg': packageForm(null); return true;
      case 'edit-pkg': packageForm(S.packages.filter(function (p) { return p.id === a.dataset.id; })[0]); return true;
      case 'cats': categoriesForm(); return true;
      case 'new-f': formulaForm(null); return true;
      case 'edit-f': formulaForm(S.formulas.filter(function (f) { return f.id === a.dataset.id; })[0]); return true;
      case 'new-snip': snippetForm(null); return true;
      case 'edit-snip': snippetForm(S.snippets.filter(function (f) { return f.id === a.dataset.id; })[0]); return true;
    }
    return false;
  }

  EE.settingsExtra = { templatesTab: templatesTab, formulasTab: formulasTab, snippetsTab: snippetsTab, handle: handle, catName: catName, splitList: splitList };
})(this);
