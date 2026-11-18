/*
 * データ構造と保存（ブラウザの localStorage）
 *
 * state = {
 *   schema: 1,
 *   company:  自社情報（適格請求書の記載事項：名称・登録番号・住所など）
 *   settings: 計算ルール（端数処理・粗利下限・有効期限の既定日数・番号の接頭辞）
 *   items:    マスタ（商品・工事単価・人工・仕入材料）
 *             { id, code, kind, name, spec, unit, unitPrice, unitCost, taxCategory, costType, active, updatedAt }
 *   packages: 標準工事パッケージ { id, name, note, lines:[{ itemId, qty }] }
 *   customers:{ id, kind:'corp'|'person', name, honorific, contact, zip, address, tel, email }
 *   projects: 案件 { id, customerId, name, site, note }
 *   documents:書類 { id, type:'estimate', no, rev, parentId, status:'draft'|'issued',
 *                    customerId, projectId, title, issueDate, validUntil,
 *                    deliveryPlace, deliveryTerm, paymentTerms, notes,
 *                    lines:[{ lineId, itemId, qty, unitPrice, unitCost,   ← 構造化データ（マスタID＋数量＋単価）
 *                             code, name, spec, unit, kind, taxCategory, costType }],  ← 発行時点の表示用スナップショット
 *                    totals, createdAt, updatedAt, issuedAt, history:[{at, action}] }
 *   seq: { estimate: { 'YYYYMM': n } }
 * }
 *
 * 明細の金額は保存しない（常に計算エンジンで出す）。totals は再計算との突き合わせ用。
 */
(function (root) {
  'use strict';
  var KEY = 'easy-estimate:v1';

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function ymd(d) {
    var z = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  }
  function addDays(s, n) {
    var p = s.split('-').map(Number);
    return ymd(new Date(p[0], p[1] - 1, p[2] + n));
  }
  function today() { return ymd(new Date()); }

  function defaultState() {
    return {
      schema: 1,
      company: {
        name: '株式会社イージー住設',
        invoiceRegNo: 'T1234567890123',
        zip: '150-0001',
        address: '東京都渋谷区神宮前1-2-3 EEビル4F',
        tel: '03-1234-5678',
        email: 'info@example.jp',
        rep: '代表取締役 青木 誠',
        license: '東京都知事許可（般-6）第000000号',
        bank: '○○銀行 渋谷支店 普通 1234567 カ）イージージュウセツ'
      },
      settings: {
        lineRounding: 'round',
        taxRounding: 'floor',
        minMargin: 0.15,
        validDays: 30,
        numberPrefix: 'EST'
      },
      items: [],
      packages: [],
      customers: [],
      projects: [],
      documents: [],
      seq: { estimate: {} }
    };
  }

  function sampleState() {
    var s = defaultState();
    var t = today();
    function item(code, kind, name, spec, unit, price, cost, costType, tax) {
      var it = { id: 'itm_' + code.toLowerCase().replace('-', ''), code: code, kind: kind, name: name, spec: spec, unit: unit,
        unitPrice: price, unitCost: cost, taxCategory: tax || 'std10', costType: costType, active: true, updatedAt: t };
      s.items.push(it);
      return it;
    }
    item('M-001', 'material', 'ビニールクロス', '量産品・防汚', 'm²', 1200, 450, 'material');
    item('M-002', 'material', '石膏ボード', '9.5mm 910×1820', '枚', 980, 620, 'material');
    item('M-003', 'material', '複合フローリング', '12mm 防音L45', 'm²', 6800, 4200, 'material');
    item('M-004', 'material', 'クッションフロア', '1.8mm 抗菌', 'm²', 2800, 1300, 'material');
    item('P-001', 'product', 'LEDダウンライト', 'φ100 昼白色', '台', 4500, 2600, 'material');
    item('P-002', 'product', '温水洗浄便座一体型トイレ', '節水 床排水', '台', 128000, 86000, 'material');
    item('P-003', 'product', '浴室換気扇', '24時間換気対応', '台', 18000, 11000, 'material');
    item('K-001', 'construction', 'クロス張替え施工', '下地処理込み', 'm²', 900, 600, 'labor');
    item('K-002', 'construction', '既存床材撤去', '', 'm²', 1500, 900, 'labor');
    item('K-003', 'construction', 'フローリング張り施工', '', 'm²', 3200, 2200, 'labor');
    item('K-004', 'construction', 'トイレ交換工事', '既存撤去・給排水接続', '式', 35000, 22000, 'labor');
    item('K-005', 'construction', '電気配線工事', 'ダウンライト1台あたり', '箇所', 6000, 4000, 'subcontract');
    item('L-001', 'labor', '大工', '1人工＝8時間', '人工', 28000, 22000, 'labor');
    item('L-002', 'labor', '電気工', '1人工＝8時間', '人工', 30000, 24000, 'labor');
    item('L-003', 'labor', '内装工', '1人工＝8時間', '人工', 26000, 20000, 'labor');
    item('E-001', 'construction', '産業廃棄物処分費', '2tダンプ1台まで', '式', 25000, 18000, 'expense');
    item('E-002', 'construction', '養生・清掃費', '', '式', 15000, 8000, 'expense');
    item('E-003', 'construction', '現場管理費', '', '式', 30000, 0, 'expense');

    s.packages = [
      { id: 'pkg_cloth6', name: '6畳洋室 クロス張替え', note: '壁・天井 約40m²', lines: [
        { itemId: 'itm_m001', qty: 40 }, { itemId: 'itm_k001', qty: 40 }, { itemId: 'itm_e002', qty: 1 }] },
      { id: 'pkg_toilet', name: 'トイレ交換 標準', note: '床CF張替え込み', lines: [
        { itemId: 'itm_p002', qty: 1 }, { itemId: 'itm_k004', qty: 1 }, { itemId: 'itm_m004', qty: 2 },
        { itemId: 'itm_l003', qty: 0.5 }, { itemId: 'itm_e001', qty: 1 }] },
      { id: 'pkg_floor8', name: '8畳 フローリング張替え', note: '約13m²', lines: [
        { itemId: 'itm_k002', qty: 13 }, { itemId: 'itm_m003', qty: 13 }, { itemId: 'itm_k003', qty: 13 },
        { itemId: 'itm_l001', qty: 1 }, { itemId: 'itm_e001', qty: 1 }, { itemId: 'itm_e002', qty: 1 }] }
    ];

    s.customers = [
      { id: 'cus_sample', kind: 'corp', name: '株式会社サンプル不動産', honorific: '御中', contact: '管理部 佐藤様', zip: '160-0022', address: '東京都新宿区新宿3-4-5', tel: '03-9876-5432', email: '' },
      { id: 'cus_yamada', kind: 'person', name: '山田 太郎', honorific: '様', contact: '', zip: '181-0013', address: '東京都三鷹市下連雀6-7-8', tel: '090-0000-1111', email: '' },
      { id: 'cus_midori', kind: 'corp', name: '合同会社みどり建設', honorific: '御中', contact: '', zip: '', address: '', tel: '', email: '' }
    ];
    s.projects = [
      { id: 'prj_haitsu', customerId: 'cus_sample', name: 'サンプルハイツ 203号室 原状回復', site: '東京都新宿区新宿3-10-1', note: '' },
      { id: 'prj_yamada', customerId: 'cus_yamada', name: '山田様邸 1階トイレ改修', site: '東京都三鷹市下連雀6-7-8', note: '' }
    ];

    var byId = {};
    s.items.forEach(function (it) { byId[it.id] = it; });
    function lines(arr) {
      return arr.map(function (x) { return lineFromItem(byId[x[0]], x[1]); });
    }
    var e1 = newEstimate(s, { customerId: 'cus_sample', projectId: 'prj_haitsu', title: 'サンプルハイツ 203号室 原状回復工事',
      issueDate: addDays(t, -12), validUntil: addDays(t, 18) });
    e1.lines = lines([['itm_m001', 42], ['itm_k001', 42], ['itm_k002', 13], ['itm_m003', 13], ['itm_k003', 13], ['itm_l001', 1], ['itm_e001', 1], ['itm_e002', 1]]);
    var e2 = newEstimate(s, { customerId: 'cus_yamada', projectId: 'prj_yamada', title: '1階トイレ改修工事',
      issueDate: addDays(t, -3), validUntil: addDays(t, 4) });
    e2.lines = lines([['itm_p002', 1], ['itm_k004', 1], ['itm_m004', 2], ['itm_l003', 0.5], ['itm_e001', 1]]);
    var e3 = newEstimate(s, { customerId: 'cus_midori', projectId: '', title: '事務所 照明LED化',
      issueDate: addDays(t, -40), validUntil: addDays(t, -10) });
    e3.lines = lines([['itm_p001', 12], ['itm_k005', 12], ['itm_l002', 1]]);
    e3.lines[0].unitPrice = 4200; // マスタ改定前の単価のまま → 送信前チェックで指摘される例

    var calc = root.EE.engine.calc;
    [e1, e2, e3].forEach(function (d) {
      d.totals = root.EE.engine.snapshot(calc(d, s.settings));
      d.createdAt = d.updatedAt = new Date(d.issueDate + 'T09:00:00').toISOString();
      s.documents.push(d);
    });
    e1.status = 'issued';
    e1.rules = { lineRounding: s.settings.lineRounding, taxRounding: s.settings.taxRounding };
    e1.issuedAt = new Date(e1.issueDate + 'T10:30:00').toISOString();
    e1.history.push({ at: e1.issuedAt, action: '発行確定' });
    return s;
  }

  function lineFromItem(it, qty) {
    return {
      lineId: uid('ln'),
      itemId: it.id,
      qty: qty == null ? 1 : qty,
      unitPrice: it.unitPrice,
      unitCost: it.unitCost,
      code: it.code, name: it.name, spec: it.spec, unit: it.unit, kind: it.kind,
      taxCategory: it.taxCategory, costType: it.costType
    };
  }

  function nextNumber(state, dateStr) {
    var ym = (dateStr || today()).slice(0, 7).replace('-', '');
    var seq = state.seq.estimate;
    seq[ym] = (seq[ym] || 0) + 1;
    var n = String(seq[ym]);
    while (n.length < 3) n = '0' + n;
    return (state.settings.numberPrefix || 'EST') + '-' + ym + '-' + n;
  }

  /** 採番せずに次の番号だけ見る（新規作成画面の表示用） */
  function peekNumber(state, dateStr) {
    var ym = (dateStr || today()).slice(0, 7).replace('-', '');
    var n = String((state.seq.estimate[ym] || 0) + 1);
    while (n.length < 3) n = '0' + n;
    return (state.settings.numberPrefix || 'EST') + '-' + ym + '-' + n;
  }

  function newEstimate(state, init) {
    init = init || {};
    var issue = init.issueDate || today();
    var now = new Date().toISOString();
    return {
      id: uid('doc'),
      type: 'estimate',
      no: init.noNumber ? '' : nextNumber(state, issue),
      rev: 0,
      parentId: null,
      status: 'draft',
      customerId: init.customerId || '',
      projectId: init.projectId || '',
      title: init.title || '',
      issueDate: issue,
      validUntil: init.validUntil || addDays(issue, state.settings.validDays || 30),
      deliveryPlace: '',
      deliveryTerm: '別途協議',
      paymentTerms: '工事完了月末締め 翌月末日 銀行振込',
      notes: '',
      lines: [],
      totals: null,
      createdAt: now,
      updatedAt: now,
      issuedAt: null,
      history: [{ at: now, action: '作成' }]
    };
  }

  function load() {
    try {
      var raw = root.localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.schema === 1) return migrate(s);
      }
    } catch (e) { /* 壊れていたらサンプルで起動 */ }
    return sampleState();
  }

  function migrate(s) {
    var d = defaultState();
    Object.keys(d).forEach(function (k) { if (s[k] == null) s[k] = d[k]; });
    Object.keys(d.settings).forEach(function (k) { if (s.settings[k] == null) s.settings[k] = d.settings[k]; });
    return s;
  }

  function save(state) {
    try { root.localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { return false; }
  }

  function clear() { try { root.localStorage.removeItem(KEY); } catch (e) {} }

  root.EE = root.EE || {};
  root.EE.data = {
    KEY: KEY, uid: uid, ymd: ymd, addDays: addDays, today: today,
    defaultState: defaultState, sampleState: sampleState,
    lineFromItem: lineFromItem, nextNumber: nextNumber, peekNumber: peekNumber, newEstimate: newEstimate,
    load: load, save: save, clear: clear, migrate: migrate
  };
})(this);
