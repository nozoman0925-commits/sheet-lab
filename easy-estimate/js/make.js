/*
 * 見積を作りやすくする工夫（2026-11-26「見積の作りやすさ中心・改訂版」）
 *   見積の役割：A 速く正確に作れる／B お客様に伝わる／C 利益を守れる／D 作った後が追える
 *   1-2 マイ型（自分の見積を型に保存）      1-3 概算モード（だいたいいくら？に数分で）   1-4 案件メモの引き継ぎ表示
 *   2-1 坪⇔㎡（editor の検索欄・寸法の計算） 2-2 寸法から数量の小さな計算機             2-3 数量の刻み（＋−・よく使う数量）
 *   2-4 検索を速く（最近使った順・カテゴリのピン留め・ひらがなでも当たる）              2-5 工事の種類ごとのチェックリスト
 *   2-6 単価の異常値（前の単価の2倍・半分）     3-1 お客様向けの説明                      3-3 条件の言い回しライブラリ（まとめて選ぶ）
 *   3-6 似た見積との金額の比べ                 4-1 提出日・有効期限・残日数の一目表示
 * 金額はすべてマスタと固定の計算エンジンで決まる（AIは使わない）。
 */
(function (root) {
  'use strict';
  var EE = root.EE; if (!EE || !EE.ui) return;
  var U = EE.ui, I = U.I, esc = U.esc;
  var TSUBO = 3.30579;
  function S() { return EE.S; }
  function feat() { return EE.features.settings(); }
  function commit() { U.commit(); }
  function ed() { return EE.views.editor; }
  function cur() { return ed() && ed().current && ed().current(); }
  function linkO() { try { var f = root.OUBI_LINK && root.OUBI_LINK.frame(); return f && f.contentWindow && f.contentWindow.OUBI; } catch (e) { return null; } }

  /* ===== 2-4 検索：ひらがな→カタカナ、最近使った順、カテゴリのピン留め ===== */
  // 読み仮名：工事でよく使う漢字の言葉（「どま」「あしば」で当たるように）。品目マスタの kana 欄があればそれも使う
  var READ = { 土間: 'ドマ', 足場: 'アシバ', 撤去: 'テッキョ', 塗装: 'トソウ', 養生: 'ヨウジョウ', 処分: 'ショブン', 残土: 'ザンド', 掘削: 'クッサク', 門扉: 'モンピ', 防草: 'ボウソウ', 砂利: 'ジャリ',
    基礎: 'キソ', 独立: 'ドクリツ', 洗浄: 'センジョウ', 高圧: 'コウアツ', 下塗: 'シタヌリ', 中塗: 'ナカヌリ', 上塗: 'ウワヌリ', 付帯: 'フタイ', 清掃: 'セイソウ', 廃材: 'ハイザイ', 屋根: 'ヤネ', 下地: 'シタジ',
    野地板: 'ノジイタ', 運搬: 'ウンパン', 建具: 'タテグ', 設備: 'セツビ', 床: 'ユカ', 壁: 'カベ', 天井: 'テンジョウ', 解体: 'カイタイ', 浴室: 'ヨクシツ', 内装: 'ナイソウ', 外壁: 'ガイヘキ', 交換: 'コウカン',
    工事: 'コウジ', 施工: 'セコウ', 設置: 'セッチ', 補修: 'ホシュウ', 防水: 'ボウスイ', 材料: 'ザイリョウ', 積: 'ヅミ', 張替: 'ハリカエ', 産業廃棄物: 'サンギョウハイキブツ', 便座: 'ベンザ', 洗面: 'センメン',
    換気扇: 'カンキセン', 給湯器: 'キュウトウキ', 雨樋: 'アマドイ', 破風: 'ハフ', 軒天: 'ノキテン', 鋼板: 'コウハン', 諸経費: 'ショケイヒ', 人工: 'ニンク', 電気: 'デンキ' };
  function reading(s) { var t = String(s || ''), out = []; Object.keys(READ).forEach(function (k) { if (t.indexOf(k) >= 0) out.push(READ[k]); }); return out.join(' '); }
  function kana(s) { return String(s || '').replace(/[ぁ-ゖ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) + 0x60); }); }
  function usage() { var f = feat(); return f.itemUse || (f.itemUse = {}); }
  function used(id) { var u = usage(), x = u[id] || (u[id] = { n: 0 }); x.n++; x.at = new Date().toISOString(); }
  function pinnedCat() { return feat().pinCat || ''; }
  function catChips() {
    var cats = S().categories || [], on = pinnedCat();
    if (!cats.length) return '';
    return '<div class="pick-cats" role="group" aria-label="カテゴリでしぼる（選んだものは次も残る）">' +
      '<button type="button" data-pincat="" class="' + (on ? '' : 'on') + '">すべて</button>' +
      cats.map(function (c) { return '<button type="button" data-pincat="' + esc(c.id) + '" class="' + (on === c.id ? 'on' : '') + '">' + esc(c.name) + (on === c.id ? '（固定）' : '') + '</button>'; }).join('') + '</div>';
  }
  document.addEventListener('mousedown', function (e) {
    var b = e.target.closest && e.target.closest('[data-pincat]'); if (!b) return;
    e.preventDefault();   // 検索欄からフォーカスを外さない
    feat().pinCat = b.dataset.pincat; commit();
    var p = document.getElementById('pick'); if (p) p.dispatchEvent(new Event('input', { bubbles: true }));
  }, true);

  /* ===== 2-3 数量の刻みとよく使う数量（datalist：入力欄を押すと候補が出る） ===== */
  var PRESETS = { area: [10, 20, 30, 50, 100], len: [5, 10, 20, 30, 50], vol: [1, 2, 5, 10], cnt: [1, 2, 3, 4, 5, 10], x: [1, 2, 5, 10] };
  function presetKey(unit) {
    var u = String(unit || '');
    if (/㎡|m2|m²|平米/.test(u)) return 'area';
    if (/m3|m³|立米/.test(u)) return 'vol';
    if (/^(m|ｍ|メートル)$/.test(u)) return 'len';
    if (/式|台|箇所|個|枚|本|段|人工|日|回|基|組|ヶ所|カ所/.test(u)) return 'cnt';
    return 'x';
  }
  function stepOf(unit, qty) { var k = presetKey(unit); return k === 'vol' ? 0.5 : 1; }
  function ensureLists() {
    if (document.getElementById('qp-area')) return;
    var box = document.createElement('div'); box.hidden = true; box.id = 'qty-presets';
    box.innerHTML = Object.keys(PRESETS).map(function (k) { return '<datalist id="qp-' + k + '">' + PRESETS[k].map(function (v) { return '<option value="' + v + '">'; }).join('') + '</datalist>'; }).join('');
    document.body.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureLists); else ensureLists();

  /* ===== 2-6 単価の異常値：前の単価（価格の履歴）の2倍以上・半分以下 ===== */
  function anomaly(l, it) {
    if (!it || !(l.unitPrice > 0)) return null;
    var hist = (it.priceHistory || []).filter(function (h) { return h.unitPrice > 0; });
    var base = hist.length >= 2 ? hist[hist.length - 2].unitPrice : (it.stdPrice || 0);
    if (!(base > 0)) return null;
    var r = l.unitPrice / base;
    return r >= 2 ? { base: base, r: r, msg: '前の単価 ' + U.yen(base) + ' の ' + r.toFixed(1) + ' 倍です' } : r <= 0.5 ? { base: base, r: r, msg: '前の単価 ' + U.yen(base) + ' の半分以下です' } : null;
  }
  function lineNote(l, it) { var a = anomaly(l, it); return a ? '<span class="cell-sub price-odd" role="note">単価の確認：' + esc(a.msg) + '（桁の打ち間違いはないですか）</span>' : ''; }

  /* ===== 3-1 お客様向けの説明（明細の下に平たい言葉で。PDF にも出る） ===== */
  function editDesc(line, done) {
    var it = U.findItem(line.itemId);
    U.modal({
      title: 'お客様向けの説明 — ' + (line.name || ''),
      body: '<p class="hint" style="margin-top:0">専門用語の下に、お客様に伝わる言葉で一言。PDF の品名の下に小さく出ます。</p>' +
        '<textarea class="input" id="ld-text" rows="3" placeholder="例：外壁を洗い、ひび割れを埋めてから塗ることで、塗装が長持ちします">' + esc(line.desc || (it && it.description) || '') + '</textarea>' +
        (it ? '<label class="chk" style="margin-top:10px"><input type="checkbox" id="ld-master"> 品目マスタにも入れる（次からこの品目に自動で付く）</label>' : ''),
      foot: '<button class="btn ghost" data-c>やめる</button><button class="btn primary" data-ok>' + I.check + '説明を入れる</button>',
      onMount: function (el, api) {
        var ta = el.querySelector('#ld-text'); ta.focus();
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-ok]').onclick = function () {
          line.desc = ta.value.trim();
          var m = el.querySelector('#ld-master'); if (m && m.checked && it) { it.description = line.desc; commit(); }
          api.close(); done(); EE.fx.toast(line.desc ? 'お客様向けの説明を入れました' : '説明を消しました', { force: true });
        };
      }
    });
  }

  /* ===== 2-5 工事の種類ごとのチェックリスト（入れ忘れ＝利益の漏れ） ===== */
  var DEF_CHECK = {
    gaikou: ['養生', '撤去|解体', '廃材処分|産廃', '残土', '運搬', '諸経費'],
    tosou: ['足場設置|足場', '高圧洗浄|洗浄', '養生', '下地補修|補修', '清掃', '廃材処分', '諸経費'],
    naisou: ['養生', '下地', '廃材処分|産廃', '清掃', '諸経費'],
    yane: ['足場', '撤去', '防水シート|ルーフィング', '廃材処分|産廃', '諸経費'],
    _: ['養生', '廃材処分|処分', '清掃', '諸経費']
  };
  function checkWords(doc) {
    var s = S().settings, by = s.checklists || DEF_CHECK, k = U.catOf(doc) || '_';
    return by[k] || by._ || DEF_CHECK._;
  }
  function checklistOf(doc) {
    var names = (doc.lines || []).map(function (l) { return U.norm(l.name + ' ' + (l.spec || '')); }).concat((doc.adjustments || []).map(function (a) { return U.norm(a.label || (a.type === 'overhead' ? '諸経費' : '')); }));
    var skip = doc.checkSkip || {};
    return checkWords(doc).map(function (w) {
      var alts = String(w).split('|').map(U.norm), label = String(w).split('|')[0];
      var has = names.some(function (n) { return alts.some(function (a) { return n.indexOf(a) >= 0; }); });
      return { w: w, label: label, has: has, skip: !!skip[w] };
    });
  }
  function checklistModal(doc) {
    function body() {
      var L = checklistOf(doc), miss = L.filter(function (x) { return !x.has && !x.skip; }).length;
      return '<p class="hint" style="margin-top:0">「' + esc(EE.settingsExtra && EE.settingsExtra.catName ? EE.settingsExtra.catName(U.catOf(doc)) || 'この工事' : 'この工事') + '」で入れ忘れやすいものです。抜け漏れは、そのまま利益の漏れになります。</p>' +
        '<div class="ck-list">' + L.map(function (x) {
          return '<div class="ck-row ' + (x.has ? 'has' : x.skip ? 'skip' : 'miss') + '"><span class="ck-mark" aria-hidden="true">' + (x.has ? I.check : x.skip ? '−' : '!') + '</span><b>' + esc(x.label) + '</b>' +
            '<span class="ck-st">' + (x.has ? '入っています' : x.skip ? '今回は不要' : '入っていません') + '</span>' +
            (x.has ? '' : x.skip ? '<button type="button" class="btn ghost sm" data-ck-unskip="' + esc(x.w) + '">もどす</button>' :
              '<button type="button" class="btn sm" data-ck-add="' + esc(x.w) + '">' + I.plus + '足す</button><button type="button" class="btn ghost sm" data-ck-skip="' + esc(x.w) + '">今回は不要</button>') + '</div>';
        }).join('') + '</div>' + (miss ? '' : '<div class="check-ok" style="margin-top:12px">' + I.check + '<div>入れ忘れやすいものは、すべて確かめました</div></div>');
    }
    U.modal({
      title: '仕上げのチェックリスト', body: '<div id="ck-body">' + body() + '</div>',
      foot: '<a class="btn ghost" href="#/settings/rules">項目を変える</a><div class="spacer"></div><button class="btn primary" data-c>' + I.check + '閉じる</button>',
      onMount: function (el, api) {
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.addEventListener('click', function (e) {
          var b = e.target.closest('[data-ck-add],[data-ck-skip],[data-ck-unskip]'); if (!b) return;
          if (b.dataset.ckAdd) {
            var alts = b.dataset.ckAdd.split('|'), it = null;
            alts.some(function (a) { it = S().items.filter(function (x) { return x.active !== false && x.name.indexOf(a) >= 0 && (!U.catOf(doc) || x.category === U.catOf(doc)); })[0] || S().items.filter(function (x) { return x.active !== false && x.name.indexOf(a) >= 0; })[0]; return !!it; });
            if (/諸経費/.test(b.dataset.ckAdd) && !it) {
              doc.adjustments = doc.adjustments || []; doc.adjustments.push({ id: EE.data.uid('adj'), type: 'overhead', label: '諸経費', mode: 'rate', rateBp: 500, scope: 'all' });
              ed().mark(); ed().lines(); EE.fx.toast('諸経費（5%）を足しました', { force: true });
            } else if (it) { ed().addItems([{ itemId: it.id, qty: it.stdQty || 1 }]); EE.fx.toast('「' + it.name + '」を足しました（数量は直してください）', { force: true }); }
            else { EE.fx.toast('品目マスタに「' + alts[0] + '」が見つかりません。設定 → 品目で登録してください', { warn: true }); return; }
          }
          doc.checkSkip = doc.checkSkip || {};
          if (b.dataset.ckSkip) { doc.checkSkip[b.dataset.ckSkip] = true; ed().mark(); }
          if (b.dataset.ckUnskip) { delete doc.checkSkip[b.dataset.ckUnskip]; ed().mark(); }
          el.querySelector('#ck-body').innerHTML = body();
          if (ed().refreshChecks) ed().refreshChecks();
        });
      }
    });
  }

  /* ===== 1-2 マイ型（作った見積を型として保存・次回そのまま呼び出す） ===== */
  function myTypes() { return S().myTypes || (S().myTypes = []); }
  function saveMyType(doc) {
    if (!doc.lines.length) { EE.fx.toast('明細が1行もありません。明細を入れてから型にしてください', { warn: true }); return; }
    U.modal({
      title: 'マイ型に保存',
      body: '<p class="hint" style="margin-top:0">この見積の明細（' + doc.lines.length + '行）・諸経費・条件を型にします。次からは「見積を作る」→「マイ型から」で呼び出せます。金額はそのときのマスタの単価で計算し直します。</p>' +
        '<div class="field"><label for="mt-name">型の名前</label><input class="input" id="mt-name" value="' + esc((doc.title || '').replace(/^.*?様邸\s*/, '') || '自分の型') + '"></div>',
      foot: '<button class="btn ghost" data-c>やめる</button><button class="btn primary" data-ok>' + I.star + 'マイ型に保存する</button>',
      onMount: function (el, api) {
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-ok]').onclick = function () {
          var name = el.querySelector('#mt-name').value.trim() || '自分の型';
          myTypes().unshift({ id: EE.data.uid('myt'), name: name, at: new Date().toISOString(), category: U.catOf(doc) || '',
            lines: doc.lines.filter(function (l) { return l.itemId; }).map(function (l) { return { itemId: l.itemId, qty: l.qty, desc: l.desc || '' }; }),
            adjustments: (doc.adjustments || []).map(function (a) { var c = JSON.parse(JSON.stringify(a)); delete c.id; c.scope = 'all'; return c; }),
            notes: doc.notes || '', excludes: doc.excludes || '', premises: doc.premises || '', paymentTerms: doc.paymentTerms || '' });
          commit(); api.close(); EE.fx.toast('マイ型「' + name + '」に保存しました', { force: true });
        };
      }
    });
  }

  /* ===== 1-3 概算モード ===== */
  var ROUGH_RATE = { gaikou: 18000, tosou: 4000, naisou: 12000, yane: 15000, _: 10000 };   // 1㎡あたりの目安（税抜）。設定で直せる
  function roughRate(cat) { var r = (S().settings.roughRates || {}); return r[cat] || r._ || ROUGH_RATE[cat] || ROUGH_RATE._; }
  function roughAmount(W) {
    var R = W.rough || {}; if (R.direct) return Math.round(Number(R.amount) || 0);
    var a = Number(R.area) || 0; if (R.unit === '坪') a = a * TSUBO;
    return Math.round(a * (Number(R.rate) || 0) / 100) * 100;
  }
  function roughFormHTML(W, p) {
    var cat = (p && p.category) || (S().categories[0] || {}).id || '';
    W.rough = W.rough || { cat: cat, unit: '㎡', rate: roughRate(cat), area: '', direct: false, amount: '' };
    var R = W.rough, amt = roughAmount(W);
    return '<div class="wz-sub rough-form"><b>概算の出し方</b>' +
      '<div class="rough-grid"><label>工事の種類<select class="input" data-rough="cat">' + (S().categories || []).map(function (c) { return U.opt(c.id, c.name, R.cat); }).join('') + '</select></label>' +
      '<label>広さ<span class="rough-in"><input class="input num" data-rough="area" inputmode="decimal" value="' + esc(R.area) + '" placeholder="30"><select class="input" data-rough="unit">' + ['㎡', '坪'].map(function (u) { return U.opt(u, u, R.unit); }).join('') + '</select></span></label>' +
      '<label>1㎡あたりの目安（税抜）<input class="input num" data-rough="rate" inputmode="numeric" value="' + esc(R.rate) + '"></label>' +
      '<label class="chk"><input type="checkbox" data-rough="direct"' + (R.direct ? ' checked' : '') + '> 金額をじかに入れる</label>' +
      (R.direct ? '<label>概算の金額（税抜）<input class="input num" data-rough="amount" inputmode="numeric" value="' + esc(R.amount) + '"></label>' : '') + '</div>' +
      '<div class="rough-total" role="status">概算 <b class="num" id="rough-amt">' + U.yen(amt) + '</b><small>（税抜）' + (R.unit === '坪' && R.area ? '　' + U.num(R.area) + '坪＝' + U.num(Math.round(R.area * TSUBO * 100) / 100) + '㎡' : '') + '</small></div>' +
      '<p class="hint">明細はあとで「明細にする」から。概算の金額は、明細を入れたあとも比べられるように残ります。</p></div>';
  }
  function roughInput(W, t, view) {
    var R = W.rough = W.rough || {}, k = t.dataset.rough;
    R[k] = t.type === 'checkbox' ? t.checked : t.value;
    if (k === 'cat') R.rate = roughRate(R.cat);
    if (k === 'cat' || k === 'direct') { EE.app.rerender(); return; }
    var a = view.querySelector('#rough-amt'); if (a) a.textContent = U.yen(roughAmount(W));
    var nx = view.querySelector('[data-wz="next"]'); if (nx) nx.disabled = !(roughAmount(W) > 0);
  }
  function applyRough(d, W, p) {
    var R = W.rough || {}, amt = roughAmount(W), cname = String((S().categories.filter(function (c) { return c.id === R.cat; })[0] || {}).name || '').replace(/工事$/, '');
    var area = Number(R.area) || 0;
    d.rough = true; d.roughAmount = amt; d.category = R.cat || d.category;
    d.title = d.title || p.name;
    d.lines = [{ lineId: EE.data.uid('ln'), itemId: '', code: '概算', name: cname + '工事 一式（概算）', spec: area ? (U.num(area) + R.unit + (R.direct ? '' : '・1㎡あたり ' + U.yen(Number(R.rate) || 0))) : '', qty: 1, unit: '式',
      unitPrice: amt, unitCost: 0, kind: 'construction', costType: 'other', taxCategory: 'std10', inputSource: 'rough', manual: true }];
    d.adjustments = [];
    d.sourceLabel = '概算で作成';
  }
  /** 概算 → 明細にする：テンプレートかマイ型を選んで明細を入れ、概算の金額との差を出す */
  function detailize(doc) {
    var opts = (S().packages || []).map(function (p) { return { k: 'p:' + p.id, n: 'テンプレート：' + p.name, lines: p.lines.filter(function (l) { return !l.optional; }), adj: p.adjustments || [], cat: p.category }; })
      .concat(myTypes().map(function (t) { return { k: 'm:' + t.id, n: 'マイ型：' + t.name, lines: t.lines, adj: t.adjustments || [], cat: t.category }; }));
    var cat = doc.category;
    opts.sort(function (a, b) { return (b.cat === cat) - (a.cat === cat); });
    U.modal({
      title: '概算を明細にする',
      body: '<p class="hint" style="margin-top:0">概算 ' + U.yen(doc.roughAmount || 0) + '（税抜）の行を、選んだ型の明細に置き換えます。置き換えたあとも、概算との差が右に出ます。</p>' +
        '<div class="wz-tpls">' + opts.map(function (o) { return '<button type="button" class="wz-opt" data-dt="' + esc(o.k) + '"><span class="wz-dot"></span><span><b>' + esc(o.n) + '</b><small>' + o.lines.length + '品目</small></span></button>'; }).join('') + '</div>' +
        '<p class="hint">型を使わずに入れるときは「白紙で明細を入れる」。</p>',
      foot: '<button class="btn ghost" data-c>やめる</button><button class="btn" data-blank>白紙で明細を入れる</button>',
      onMount: function (el, api) {
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        function go(o) {
          doc.lines = doc.lines.filter(function (l) { return l.inputSource !== 'rough'; });
          doc.rough = false; api.close();
          if (o) {
            ed().addItems(o.lines.map(function (l) { return { itemId: l.itemId, qty: l.qty }; }));
            (o.adj || []).forEach(function (a) { if (!(doc.adjustments || []).some(function (x) { return x.type === a.type && x.label === a.label; })) { doc.adjustments = doc.adjustments || []; doc.adjustments.push(Object.assign({ id: EE.data.uid('adj'), scope: 'all' }, a)); } });
          }
          // 描き直さずに、その場で入れ替える（保存前の変更を消さない）
          ed().mark(); ed().lines();
          var rn = document.querySelector('.rough-note'); if (rn) { var g0 = U.calcDoc(doc).subtotal - (doc.roughAmount || 0); rn.outerHTML = '<p class="rough-gap">はじめの概算 ' + U.yen(doc.roughAmount || 0) + ' との差：<b class="num">' + (g0 >= 0 ? '+' : '−') + U.yen(Math.abs(g0)) + '</b>（税抜）</p>'; }
          if (ed().refreshChecks) ed().refreshChecks();
          EE.fx.toast('明細にしました。概算 ' + U.yen(doc.roughAmount || 0) + ' との差は右に出ます', { force: true });
        }
        el.querySelector('[data-blank]').onclick = function () { go(null); };
        el.addEventListener('click', function (e) { var b = e.target.closest('[data-dt]'); if (!b) return; go(opts.filter(function (o) { return o.k === b.dataset.dt; })[0]); });
      }
    });
  }

  /* ===== 2-2 寸法から数量（長さ×幅・家の周り・体積・坪） ===== */
  var DIM_MODES = [['area', '面積（長さ×幅）', ['長さ', '幅'], 'm', function (v) { return v[0] * v[1]; }, '㎡'],
    ['perim', '周りの長さ（(縦＋横)×2）', ['縦', '横'], 'm', function (v) { return (v[0] + v[1]) * 2; }, 'm'],
    ['wall', '壁の面積（周りの長さ×高さ）', ['周りの長さ', '高さ'], 'm', function (v) { return v[0] * v[1]; }, '㎡'],
    ['vol', '体積（長さ×幅×深さ）', ['長さ', '幅', '深さ'], 'm', function (v) { return v[0] * v[1] * v[2]; }, '㎥'],
    ['tsubo', '坪 → ㎡', ['坪'], '坪', function (v) { return v[0] * TSUBO; }, '㎡']];
  function dimsCalc(doc) {
    var mode = 'area';
    function body() {
      var M = DIM_MODES.filter(function (m) { return m[0] === mode; })[0];
      return '<div class="seg" id="dc-mode">' + DIM_MODES.map(function (m) { return '<button type="button" data-dc="' + m[0] + '" class="' + (m[0] === mode ? 'on' : '') + '">' + esc(m[1]) + '</button>'; }).join('') + '</div>' +
        '<div class="dc-in">' + M[2].map(function (n, i) { return '<label>' + esc(n) + '<span class="rough-in"><input class="input num" data-dv="' + i + '" inputmode="decimal" placeholder="0"><span class="hint">' + M[3] + '</span></span></label>'; }).join('') + '</div>' +
        '<div class="rough-total" role="status">＝ <b class="num" id="dc-out">0</b> ' + M[5] + '</div>' +
        '<div class="field"><label for="dc-line">この数量を入れる行</label><select class="input" id="dc-line">' + doc.lines.map(function (l, i) { return '<option value="' + l.lineId + '"' + (i === doc.lines.length - 1 ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(l.name) + '（' + esc(l.unit) + '）</option>'; }).join('') + '</select></div>';
    }
    U.modal({
      title: '寸法から数量を出す', body: '<div id="dc-body">' + body() + '</div>',
      foot: '<button class="btn ghost" data-c>閉じる</button><button class="btn primary" data-ok' + (doc.lines.length ? '' : ' disabled') + '>' + I.check + 'この行の数量にする</button>',
      onMount: function (el, api) {
        var val = 0;
        function calc() { var M = DIM_MODES.filter(function (m) { return m[0] === mode; })[0], v = [].map.call(el.querySelectorAll('[data-dv]'), function (i) { return Number(i.value) || 0; }); val = Math.round(M[4](v) * 100) / 100; el.querySelector('#dc-out').textContent = U.num(val); }
        el.addEventListener('input', calc);
        el.addEventListener('click', function (e) { var b = e.target.closest('[data-dc]'); if (!b) return; mode = b.dataset.dc; el.querySelector('#dc-body').innerHTML = body(); calc(); var f = el.querySelector('[data-dv]'); if (f) f.focus(); });
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.querySelector('[data-ok]').onclick = function () {
          var id = el.querySelector('#dc-line') && el.querySelector('#dc-line').value, ln = doc.lines.filter(function (l) { return l.lineId === id; })[0];
          if (!ln || !(val > 0)) { EE.fx.shake(el.querySelector('#dc-out')); return; }
          ln.qty = val; api.close(); ed().mark(); ed().lines(ln.lineId); EE.fx.toast('「' + ln.name + '」の数量を ' + U.num(val) + ' ' + ln.unit + ' にしました', { force: true });
        };
        var f = el.querySelector('[data-dv]'); if (f) f.focus();
      }
    });
  }

  /* ===== 3-3 条件の言い回しライブラリ：まとめて選んで入れる ===== */
  function conditions(cb) {
    var K = EE.catalog.SNIPPET_KINDS, ORDER = ['term', 'payment', 'warranty', 'cancel', 'conditions', 'extra', 'caution', 'disclaimer', 'validity', 'notes'];
    var list = (S().snippets || []).filter(function (x) { return x.kind !== 'exclude' && x.kind !== 'premise'; });
    U.modal({
      title: '条件をまとめて選ぶ', wide: true,
      body: '<p class="hint" style="margin-top:0">工期・支払い・保証・キャンセルなど、いつもの言い回しを選ぶだけで入ります（備考・条件の欄の最後に足します）。</p>' +
        ORDER.filter(function (k) { return list.some(function (x) { return x.kind === k; }); }).map(function (k) {
          return '<div class="cond-grp"><div class="label">' + esc(K[k] || k) + '</div>' + list.filter(function (x) { return x.kind === k; }).map(function (x) {
            return '<label class="cond-row"><input type="checkbox" data-cond="' + x.id + '"><span><b>' + esc(x.title) + '</b><small>' + esc(x.body) + '</small></span></label>'; }).join('') + '</div>';
        }).join(''),
      foot: '<a class="btn ghost" href="#/settings/snippets">言い回しを登録する</a><div class="spacer"></div><button class="btn ghost" data-c>やめる</button><button class="btn primary" data-ok disabled>' + I.check + '選んだ条件を入れる</button>',
      onMount: function (el, api) {
        el.querySelector('[data-c]').onclick = function () { api.close(); };
        el.addEventListener('change', function () { var n = el.querySelectorAll('[data-cond]:checked').length, b = el.querySelector('[data-ok]'); b.disabled = !n; b.lastChild.textContent = n ? '選んだ ' + n + ' 件を入れる' : '選んだ条件を入れる'; });
        el.querySelector('[data-ok]').onclick = function () {
          var ids = [].map.call(el.querySelectorAll('[data-cond]:checked'), function (c) { return c.dataset.cond; });
          var txt = list.filter(function (x) { return ids.indexOf(x.id) >= 0; }).map(function (x) { return x.body; }).join('\n');
          api.close(); cb(txt); EE.fx.toast('条件を ' + ids.length + ' 件入れました', { force: true });
        };
      }
    });
  }

  /* ===== 右の列：案件メモ（1-4）・概算（1-3）・似た見積（3-6）・提出と期限（4-1） ===== */
  function caseMemo(doc) {
    var o = linkO(), c = o && doc.projectId ? (o.cases() || []).filter(function (x) { return x.id === doc.projectId; })[0] : null;
    if (!c) return '';
    var w = c.work || {}, L = c.lead || {}, rows = [];
    var wish = w.wishPeriod || (w.wishFrom || w.wishTo ? (w.wishFrom ? U.jdate(w.wishFrom) : '') + '〜' + (w.wishTo ? U.jdate(w.wishTo) : '') : '');
    if (wish) rows.push(['希望の時期', wish]);
    if (Number(w.budget) > 0) rows.push(['予算感', U.yen(Number(w.budget)) + '（税抜）']);
    if (w.places) rows.push(['施工箇所', w.places]);
    if (L.inquiry) rows.push(['依頼の内容', L.inquiry]);
    if (w.summary) rows.push(['工事の概要', w.summary]);
    if (w.material) rows.push(['使う予定の材料', w.material]);
    if (L.note) rows.push(['メモ', L.note]);
    if (w.route) rows.push(['搬入経路', w.route]);
    var budgetGap = Number(w.budget) > 0 ? U.calcDoc(doc).subtotal - Number(w.budget) : null;
    return '<section class="panel case-memo" data-st><div class="panel-h"><h2>お客様の条件</h2><span class="sub">工事の記録から</span><div class="spacer"></div><a class="btn ghost sm" href="#/o/case/' + esc(c.id) + '">工事を開く</a></div><div class="panel-b">' +
      (rows.length ? '<dl class="memo-dl">' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' : '<p class="hint" style="margin:0">希望の時期・予算感・依頼の内容は、工事の「問い合わせ・現地調査」に書くと、ここに出ます。</p>') +
      (budgetGap != null ? '<p class="budget-gap ' + (budgetGap > 0 ? 'over' : 'in') + '">予算感まで ' + (budgetGap > 0 ? U.yen(budgetGap) + ' 多い' : 'あと ' + U.yen(-budgetGap)) + '（税抜で比べています）</p>' : '') + '</div></section>';
  }
  function similar(doc) {
    var cat = U.catOf(doc), me = U.calcDoc(doc);
    if (!cat || !(me.subtotal > 0) || doc.rough) return null;
    var xs = S().documents.filter(function (d) { return d.id !== doc.id && U.catOf(d) === cat && d.lines && d.lines.length; }).map(function (d) { return U.calcDoc(d).subtotal; }).filter(function (v) { return v > 0; }).sort(function (a, b) { return a - b; });
    if (xs.length < 2) return null;
    var med = xs[Math.floor(xs.length / 2)], diff = Math.round((me.subtotal - med) / med * 100);
    return { n: xs.length, med: med, lo: xs[0], hi: xs[xs.length - 1], diff: diff };
  }
  function sideHTML(doc) {
    var out = caseMemo(doc);
    if (doc.rough) out += '<section class="panel rough-note" data-st><div class="panel-b"><b>概算の見積です</b><p class="hint" style="margin:6px 0 10px">「だいたいいくら？」に答えるための見積です。PDF は「概算御見積書」になります。</p>' +
      (EE.views.editor.isLocked && EE.views.editor.isLocked() ? '' : '<button class="btn primary sm" type="button" data-mk2="detail">' + I.edit + '明細にする</button>') + '</div></section>';
    else if (doc.roughAmount > 0) { var r0 = U.calcDoc(doc).subtotal, g = r0 - doc.roughAmount; out += '<p class="rough-gap">はじめの概算 ' + U.yen(doc.roughAmount) + ' との差：<b class="num">' + (g >= 0 ? '+' : '−') + U.yen(Math.abs(g)) + '</b>（税抜）</p>'; }
    var sm = similar(doc);
    if (sm) out += '<p class="similar internal" title="同じ種類の見積 ' + sm.n + ' 件：' + U.yen(sm.lo) + '〜' + U.yen(sm.hi) + '">同じ種類の見積 ' + sm.n + ' 件の真ん中 ' + U.yen(sm.med) + '（税抜）と比べて <b class="num ' + (Math.abs(sm.diff) >= 50 ? 'far' : '') + '">' + (sm.diff >= 0 ? '+' : '−') + Math.abs(sm.diff) + '%</b>' + (Math.abs(sm.diff) >= 50 ? '　桁や数量を確かめてください' : '') + '</p>';
    return out;
  }
  /** 4-1 提出日・有効期限・残日数を一目で（確定した見積の帯・一覧） */
  function dueText(d) {
    if (d.status !== 'issued' || !d.validUntil) return '';
    var n = U.daysFromToday(d.validUntil), s = (d.sent || [])[(d.sent || []).length - 1];
    return (s ? '提出 ' + U.jdate(s.date).slice(5) + '・' : '') + '期限 ' + U.jdate(d.validUntil).slice(5) + '（' + (n < 0 ? (-n) + '日過ぎ' : n === 0 ? '今日まで' : '残り ' + n + '日') + '）';
  }

  /* ===== 明細のツール（寸法・チェックリスト・マイ型） ===== */
  function toolsHTML(d) {
    return '<button class="btn sm" type="button" data-mk2="dims">' + I.calc + '寸法から数量を出す</button>' +
      '<button class="btn sm" type="button" data-mk2="check" data-n="' + checklistOf(d).filter(function (x) { return !x.has && !x.skip; }).length + '">' + I.check + '入れ忘れを確かめる</button>' +
      '<button class="btn sm" type="button" data-mk2="mytype">' + I.star + 'マイ型に保存</button>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-mk2]'); if (!b) return;
    var doc = cur(); if (!doc) return;
    var a = b.dataset.mk2;
    if (a === 'dims') dimsCalc(doc);
    else if (a === 'check') checklistModal(doc);
    else if (a === 'mytype') saveMyType(doc);
    else if (a === 'detail') detailize(doc);
  });

  /* ===== 設定 → 計算ルール：チェックリストの項目・概算の目安単価 ===== */
  function settingsHTML() {
    var st = S().settings, by = st.checklists || DEF_CHECK, rr = st.roughRates || {};
    return '<div class="field c12" id="mk2-set"><label>入れ忘れのチェックリスト（工事の種類ごと。「|」で言いかえ、「、」で区切る）と、概算の1㎡あたりの目安（税抜）</label><div class="ck-set">' +
      (S().categories || []).map(function (c) {
        return '<div class="ck-set-row"><b>' + esc(c.name) + '</b><input class="input" data-ckw="' + esc(c.id) + '" value="' + esc((by[c.id] || DEF_CHECK[c.id] || DEF_CHECK._).join('、')) + '" aria-label="' + esc(c.name) + 'のチェックリスト">' +
          '<span class="rough-in"><input class="input num" data-rr="' + esc(c.id) + '" value="' + esc(rr[c.id] || ROUGH_RATE[c.id] || ROUGH_RATE._) + '" aria-label="' + esc(c.name) + 'の概算の目安"><span class="hint">円/㎡</span></span></div>';
      }).join('') + '</div><div style="display:flex;justify-content:flex-end;margin-top:8px"><button type="button" class="btn sm" data-mk2s>' + I.save + 'チェックリストと目安を保存</button></div></div>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-mk2s]'); if (!b) return;
    var st = S().settings, by = {}, rr = {};
    document.querySelectorAll('[data-ckw]').forEach(function (i) { by[i.dataset.ckw] = i.value.split(/[、,，]/).map(function (x) { return x.trim(); }).filter(Boolean); });
    document.querySelectorAll('[data-rr]').forEach(function (i) { var v = Number(i.value); if (v > 0) rr[i.dataset.rr] = Math.round(v); });
    by._ = (st.checklists || DEF_CHECK)._ || DEF_CHECK._;
    st.checklists = by; st.roughRates = rr; commit(); EE.fx.success(b, '保存しました');
  });

  /** 件名の自動作成（プロワン式）：「顧客名 様／工事の種類／」 */
  function autoTitle(doc) {
    var c = U.findCustomer(doc.customerId) || {}, cat = U.catOf(doc) || doc.category, cn = (S().categories.filter(function (x) { return x.id === cat; })[0] || {}).name || '';
    return [(c.name ? c.name + ' ' + (c.honorific || '様') : ''), cn].filter(Boolean).join('／') + '／';
  }

  EE.make = { autoTitle: autoTitle, settingsHTML: settingsHTML, kana: kana, reading: reading, used: used, usage: usage, pinnedCat: pinnedCat, catChips: catChips, presetKey: presetKey, stepOf: stepOf, lineNote: lineNote, anomaly: anomaly,
    editDesc: editDesc, checklistOf: checklistOf, checkWords: checkWords, DEF_CHECK: DEF_CHECK, saveMyType: saveMyType, roughFormHTML: roughFormHTML, roughInput: roughInput, roughAmount: roughAmount,
    applyRough: applyRough, detailize: detailize, dimsCalc: dimsCalc, conditions: conditions, sideHTML: sideHTML, similar: similar, dueText: dueText, toolsHTML: toolsHTML, TSUBO: TSUBO };
})(this);
