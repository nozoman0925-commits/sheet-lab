/*
 * データ構造と保存（ブラウザの localStorage）
 *
 * state = {
 *   schema: 2,
 *   categories: 工事カテゴリー [{ id, name, keywords }]
 *   formulas: 数量計算式 / snippets: 定型文（catalog.js）
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
      schema: 2,
      company: { name: '', invoiceRegNo: '', zip: '', address: '', tel: '', email: '', rep: '', license: '', bank: '' },   // 自社情報は利用者が入れる
      settings: {
        lineRounding: 'round',
        taxRounding: 'floor',
        minMargin: 0.15,
        validDays: 30,
        numberPrefix: 'EST',
        overheadRounding: 'floor',
        discountRounding: 'ceil'
      },
      items: [],
      packages: [],
      customers: [],
      projects: [],
      documents: [],
      seq: { estimate: {} },
      members: [],
      currentMemberId: '',
      categories: [],
      formulas: [],
      snippets: [],
      autoSave: true
    };
  }

  /* 以前の版で最初から入れていたサンプル（架空の会社・顧客・案件・見積・担当者）。保存データから一度だけ取り除くのに使う */
  var SAMPLE_COMPANY = { name: '株式会社サンプル住設', invoiceRegNo: 'T1234567890123', zip: '150-0001', address: '東京都渋谷区神宮前1-2-3 EEビル4F', tel: '03-1234-5678',
    email: 'info@example.jp', rep: '代表取締役 青木 誠', license: '東京都知事許可（般-6）第000000号', bank: '○○銀行 渋谷支店 普通 1234567 カ）サンプルジュウセツ' };
  var SAMPLE_CUS = ['cus_sample', 'cus_yamada', 'cus_midori'], SAMPLE_MEM = ['mem_aoki', 'mem_sakurai', 'mem_tanaka'];
  function isSampleProject(id) { return /^prj_(haitsu|yamada|midori|x\d+)$/.test(id || ''); }

  /**
   * サンプルを取り除く（一度だけ。s.sampleCleanup = 'done' を付ける）
   * 消すもの：決まったIDのサンプル顧客・案件と、それらに付いた書類、アカウントに紐づいていないサンプル担当者、
   *           サンプルのままの自社情報。自分で作った顧客・書類・マスタはそのまま。
   */
  function stripSample(s) {
    if (s.sampleCleanup === 'done') return s;
    var drop = {};
    s.documents = (s.documents || []).filter(function (d) { var x = SAMPLE_CUS.indexOf(d.customerId) >= 0 || isSampleProject(d.projectId); if (x) drop[d.id] = 1; return !x; });
    s.projects = (s.projects || []).filter(function (p) { return !isSampleProject(p.id) && SAMPLE_CUS.indexOf(p.customerId) < 0; });
    s.customers = (s.customers || []).filter(function (c) { return SAMPLE_CUS.indexOf(c.id) < 0; });
    s.members = (s.members || []).filter(function (m) { return SAMPLE_MEM.indexOf(m.id) < 0 || m.accountId; });
    var ids = s.members.map(function (m) { return m.id; });
    s.documents.forEach(function (d) { if (d.ownerId && ids.indexOf(d.ownerId) < 0) d.ownerId = ''; });
    s.projects.forEach(function (p) { if (p.ownerId && ids.indexOf(p.ownerId) < 0) p.ownerId = ''; if (drop[p.acceptedDocId]) delete p.acceptedDocId; });
    if (ids.indexOf(s.currentMemberId) < 0) s.currentMemberId = ids[0] || '';
    var co = s.company || {};
    Object.keys(SAMPLE_COMPANY).forEach(function (k) { if (co[k] === SAMPLE_COMPANY[k]) co[k] = ''; });
    s.sampleCleanup = 'done';
    return s;
  }

  /** 初めて使うときの状態：工事項目・単価マスタ、テンプレート、計算式、定型文だけを入れ、顧客・書類・担当者・自社情報は空 */
  function initialState() {
    var s = sampleState(); s.sampleCleanup = '';
    return ensureMembers(stripSample(s));
  }

  /** サンプル一式（テスト・画面確認用。利用者のデータには入れない） */
  function sampleState() {
    var s = defaultState();
    s.company = Object.assign({}, SAMPLE_COMPANY);
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
      { id: 'cus_sample', kind: 'corp', name: '株式会社サンプル不動産', honorific: '御中', contact: '管理部 佐藤様', zip: '160-0022', address: '東京都新宿区新宿3-4-5', tel: '03-9876-5432', email: '', memo: '原状回復は退去後10日以内の完了が条件。見積はPDFをメールで' },
      { id: 'cus_yamada', kind: 'person', name: '山田 太郎', honorific: '様', contact: '', zip: '181-0013', address: '東京都三鷹市下連雀6-7-8', tel: '090-0000-1111', email: '' },
      { id: 'cus_midori', kind: 'corp', name: '合同会社みどり建設', honorific: '御中', contact: '', zip: '', address: '', tel: '', email: '' }
    ];
    s.members = [
      { id: 'mem_aoki', name: '青木 誠', role: '管理者', hue: 217 },
      { id: 'mem_sakurai', name: '桜井 美和', role: '営業', hue: 199 },
      { id: 'mem_tanaka', name: '田中 健', role: '現場管理', hue: 232 }
    ];
    s.currentMemberId = 'mem_aoki';
    s.projects = [
      { id: 'prj_haitsu', customerId: 'cus_sample', name: 'サンプルハイツ 203号室 原状回復', site: '東京都新宿区新宿3-10-1', note: '', ownerId: 'mem_sakurai' },
      { id: 'prj_yamada', customerId: 'cus_yamada', name: '山田様邸 1階トイレ改修', site: '東京都三鷹市下連雀6-7-8', note: '', ownerId: 'mem_aoki' },
      { id: 'prj_midori', customerId: 'cus_midori', name: 'みどり建設 事務所 照明LED化', site: '東京都杉並区高円寺南2-1-5', note: '', ownerId: 'mem_tanaka' }
    ];

    root.EE.catalog.mergeInto(s, t);

    var byId = {};
    s.items.forEach(function (it) { byId[it.id] = it; });
    function lines(arr) {
      return arr.map(function (x) { return lineFromItem(byId[x[0]], x[1]); });
    }
    var e1 = newEstimate(s, { customerId: 'cus_sample', projectId: 'prj_haitsu', ownerId: 'mem_sakurai', title: 'サンプルハイツ 203号室 原状回復工事',
      issueDate: addDays(t, -12), validUntil: addDays(t, 18) });
    e1.lines = lines([['itm_m001', 42], ['itm_k001', 42], ['itm_k002', 13], ['itm_m003', 13], ['itm_k003', 13], ['itm_l001', 1], ['itm_e001', 1], ['itm_e002', 1]]);
    var e2 = newEstimate(s, { customerId: 'cus_yamada', projectId: 'prj_yamada', title: '1階トイレ改修工事',
      issueDate: addDays(t, -3), validUntil: addDays(t, 4) });
    e2.lines = lines([['itm_p002', 1], ['itm_k004', 1], ['itm_m004', 2], ['itm_l003', 0.5], ['itm_e001', 1]]);
    e2.patternLabel = 'A案';
    // 同じ現場の別パターン（床の張替えなし・最小限の工事）
    var e5 = newEstimate(s, { customerId: 'cus_yamada', projectId: 'prj_yamada', title: '1階トイレ改修工事',
      issueDate: addDays(t, -2), validUntil: addDays(t, 28) });
    e5.lines = lines([['itm_p002', 1], ['itm_k004', 1], ['itm_e001', 1]]);
    e5.patternLabel = 'B案（床はそのまま）';
    var e3 = newEstimate(s, { customerId: 'cus_midori', projectId: 'prj_midori', ownerId: 'mem_tanaka', title: '事務所 照明LED化',
      issueDate: addDays(t, -40), validUntil: addDays(t, -10) });
    e3.lines = lines([['itm_p001', 12], ['itm_k005', 12], ['itm_l002', 1]]);
    e3.lines[0].unitPrice = 4200; // マスタ改定前の単価のまま → 送信前チェックで指摘される例

    var e4 = newEstimate(s, { customerId: 'cus_yamada', projectId: 'prj_yamada', title: '山田様邸 境界フェンス工事',
      issueDate: addDays(t, -95), validUntil: addDays(t, -65) });
    e4.category = 'gaikou';
    e4.lines = lines([['itm_gk01', 12], ['itm_gk05', 7], ['itm_gk09', 12], ['itm_gk10', 12], ['itm_gk16', 1]]);
    e4.lines.forEach(function (l) { l.priceDate = addDays(t, -95); });
    e4.lines[2].unitPrice = 15000; // 当時の単価
    e4.adjustments = [{ id: 'adj_e4', type: 'overhead', label: '諸経費', mode: 'rate', rateBp: 500, scope: 'all' }];

    // 過去半年分の案件（ホームの月別グラフ・フロー図・顧客の月別ヒートマップ用のサンプル）
    var extra = [
      ['過去A', 'cus_sample', 'サンプル不動産 102号室 クロス張替え', 'naisou', 'mem_sakurai', -150, 'paid', [['itm_m001', 36], ['itm_k001', 36], ['itm_e002', 1]]],
      ['過去B', 'cus_midori', 'みどり建設 倉庫 外壁塗装', 'tosou', 'mem_tanaka', -128, 'paid', [['itm_ts01', 180], ['itm_ts02', 140], ['itm_ts05', 140], ['itm_ts06', 140], ['itm_ts07', 140], ['itm_ts10', 180]]],
      ['過去C', 'cus_yamada', '山田様邸 キッチン交換', 'mizumawari', 'mem_aoki', -104, 'invoice', [['itm_mz01', 1], ['itm_mz05', 1], ['itm_mz07', 1], ['itm_mz08', 1]]],
      ['過去D', 'cus_sample', 'サンプルハイツ 305号室 床張替え', 'naisou', 'mem_sakurai', -76, 'done', [['itm_k002', 13], ['itm_m003', 13], ['itm_k003', 13]]],
      ['過去E', 'cus_midori', 'みどり建設 事務所 屋根カバー', 'yane', 'mem_tanaka', -55, 'start', [['itm_ts01', 160], ['itm_yn02', 80], ['itm_yn04', 80], ['itm_yn05', 12]]],
      ['過去F', 'cus_yamada', '山田様邸 浴室交換', 'mizumawari', 'mem_aoki', -33, 'order', [['itm_mz01', 1], ['itm_mz06', 1], ['itm_mz07', 1], ['itm_mz09', 1]]],
      ['過去G', 'cus_sample', 'サンプルハイツ 駐車場 土間', 'gaikou', 'mem_sakurai', -20, 'estimate', [['itm_gk03', 4], ['itm_gk13', 30], ['itm_gk16', 1]]]
    ];
    var extraDocs = [];
    extra.forEach(function (x, k) {
      var pid = 'prj_x' + k;
      var issue = addDays(t, x[5]);
      var stage = x[6];
      var pj = { id: pid, customerId: x[1], name: x[2], site: (s.customers.filter(function (c) { return c.id === x[1]; })[0] || {}).address || '', note: '', ownerId: x[4], stage: stage };
      s.projects.push(pj);
      var d = newEstimate(s, { customerId: x[1], projectId: pid, ownerId: x[4], title: x[2] + '工事', issueDate: issue, validUntil: addDays(issue, 30), category: x[3] });
      d.lines = lines(x[7]);
      d.lines.forEach(function (l) { l.priceDate = issue; });
      if (stage !== 'estimate') {
        d.status = 'issued'; d.issuedAt = new Date(issue + 'T11:00:00').toISOString();
        d.rules = { lineRounding: s.settings.lineRounding, taxRounding: s.settings.taxRounding };
        pj.acceptedDocId = d.id; pj.orderedOn = addDays(issue, 9);
        var si = stageIndex(stage);
        if (si >= stageIndex('start')) pj.startedOn = addDays(issue, 20);
        if (si >= stageIndex('done')) pj.doneOn = addDays(issue, 34);
        if (si >= stageIndex('invoice')) pj.invoicedOn = addDays(issue, 36);
        if (si >= stageIndex('paid')) pj.paidOn = addDays(issue, 66);
      }
      extraDocs.push(d);
    });
    s.projects.forEach(function (p) { if (!p.stage) p.stage = 'estimate'; });
    // 発行済みの見積がある既存サンプル案件の段階
    s.projects.filter(function (p) { return p.id === 'prj_haitsu'; }).forEach(function (p) { p.stage = 'order'; p.acceptedDocId = e1.id; p.orderedOn = addDays(t, -6); });

    var calc = root.EE.engine.calc;
    [e4, e1, e2, e3, e5].concat(extraDocs).forEach(function (d) {
      d.totals = root.EE.engine.snapshot(calc(d, s.settings));
      d.createdAt = d.updatedAt = new Date(d.issueDate + 'T09:00:00').toISOString();
      s.documents.push(d);
    });
    e4.status = 'issued';
    e4.rules = { lineRounding: s.settings.lineRounding, taxRounding: s.settings.taxRounding };
    e4.issuedAt = new Date(e4.issueDate + 'T10:00:00').toISOString();
    e1.status = 'issued';
    e1.rules = { lineRounding: s.settings.lineRounding, taxRounding: s.settings.taxRounding };
    e1.issuedAt = new Date(e1.issueDate + 'T10:30:00').toISOString();
    e1.history.push({ at: e1.issuedAt, action: '発行確定' });
    return s;
  }

  /** 案件の段階（ホームの案件フロー図）。受注以降は「どの見積で受注したか」と日付を持つ */
  var STAGES = [
    { key: 'estimate', label: '見積', next: '送信前チェックを通して、見積を送る' },
    { key: 'order', label: '受注', next: '着工日と職人の手配を決める' },
    { key: 'start', label: '着工', next: '工程を確認し、完了予定日を共有する' },
    { key: 'done', label: '完了', next: '完了報告をして、請求書を出す' },
    { key: 'invoice', label: '請求', next: '入金予定日を確認する' },
    { key: 'paid', label: '入金', next: 'アフターフォローの予定を入れる' }
  ];
  function stageIndex(k) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i].key === k) return i; return 0; }

  function lineFromItem(it, qty) {
    return {
      lineId: uid('ln'),
      itemId: it.id,
      qty: qty == null ? 1 : qty,
      unitPrice: it.unitPrice,
      unitCost: it.unitCost,
      code: it.code, name: it.name, spec: it.spec, unit: it.unit, kind: it.kind,
      taxCategory: it.taxCategory, costType: it.costType, category: it.category || '',
      priceDate: today()
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
      adjustments: [],
      category: init.category || '',
      ownerId: init.ownerId != null ? init.ownerId : (state.currentMemberId || ''),   // 担当者（作成者）
      totals: null,
      createdAt: now,
      updatedAt: now,
      issuedAt: null,
      history: [{ at: now, action: '作成' }]
    };
  }

  /**
   * 読み込み。保存データが読めない（壊れている・形式が違う）ときは、元のデータを別のキーに退避してから
   * サンプルで起動する（黙って上書きしない）。退避したキーは loadIssue に残し、画面で知らせる。
   */
  var loadIssue = null, stale = false, lastWritten = null;
  function load() {
    var raw = null;
    try { raw = root.localStorage.getItem(KEY); } catch (e) { return initialState(); }
    if (raw) {
      try {
        var s = JSON.parse(raw);
        if (s && (s.schema === 1 || s.schema === 2)) { lastWritten = raw; return migrate(s); }
      } catch (e) { /* 下で退避する */ }
      var bk = KEY + ':corrupt:' + new Date().toISOString().replace(/[:.]/g, '-');
      try { root.localStorage.setItem(bk, raw); loadIssue = { key: bk, size: raw.length }; }
      catch (e) { loadIssue = { key: null, size: raw.length }; stale = true; }   // 退避できないときは保存もしない
    }
    return initialState();
  }

  function migrate(s) {
    var d = defaultState();
    Object.keys(d).forEach(function (k) { if (s[k] == null) s[k] = d[k]; });
    Object.keys(d.settings).forEach(function (k) { if (s.settings[k] == null) s.settings[k] = d.settings[k]; });
    stripSample(s);
    ensureMembers(s);
    (s.projects || []).forEach(function (p) { if (!p.stage) p.stage = 'estimate'; });
    if (s.schema === 1) {
      // v1 → v2：カテゴリー・同義語・テンプレート・計算式・定型文を追加（既存データは上書きしない）
      root.EE.catalog.mergeInto(s, today());
      s.documents.forEach(function (doc) { if (!doc.adjustments) doc.adjustments = []; });
      s.schema = 2;
    }
    return s;
  }

  /**
   * 担当者（作成者）の名簿。以前の版の「利用者1人」のデータは、その人を最初の担当者にして
   * 担当者の無い書類・案件をその人に割り当てる（既存データは消さない）
   */
  function ensureMembers(s) {
    if (Array.isArray(s.members) && s.members.length) {
      if (!s.members.some(function (m) { return m.id === s.currentMemberId; })) s.currentMemberId = s.members[0].id;
      return s;
    }
    var u = s.user || {};
    var rep = String((s.company || {}).rep || '').replace(/^(代表取締役|取締役|代表|社長)\s*/, '').trim();
    var m = { id: uid('mem'), name: u.name || rep || '利用者', role: u.role || '管理者', hue: u.hue || 217 };
    if (!u.name && !rep) m.placeholder = true;   // サインインした人が引き継ぐ仮の担当者
    s.members = [m];
    s.currentMemberId = m.id;
    (s.documents || []).forEach(function (d) { if (d.ownerId == null) d.ownerId = m.id; });
    (s.projects || []).forEach(function (p) { if (p.ownerId == null) p.ownerId = m.id; });
    delete s.user;
    return s;
  }

  /**
   * 保存。直前の保存内容を1世代だけ残す（KEY:prev）。別のタブが新しい内容を保存していたら保存しない（stale）
   */
  function save(state) {
    if (stale) return false;
    try {
      var cur = root.localStorage.getItem(KEY), next = JSON.stringify(state);
      if (cur && cur !== next) { try { root.localStorage.setItem(KEY + ':prev', cur); } catch (e) { root.localStorage.removeItem(KEY + ':prev'); } }
      root.localStorage.setItem(KEY, next);
      lastWritten = next;
      return true;
    } catch (e) { return false; }
  }
  /** 別のタブで保存されたとき（storage イベント）に呼ぶ。自分が最後に書いた内容と違えば、以後この画面からは保存しない */
  function markStale(newValue) { if (newValue !== lastWritten) stale = true; return stale; }

  function clear() { try { root.localStorage.removeItem(KEY); } catch (e) {} }

  root.EE = root.EE || {};
  root.EE.data = {
    KEY: KEY, uid: uid, ymd: ymd, addDays: addDays, today: today,
    defaultState: defaultState, sampleState: function () { var s = sampleState(); s.sampleCleanup = 'done'; return s; }, initialState: initialState,
    lineFromItem: lineFromItem, nextNumber: nextNumber, peekNumber: peekNumber, newEstimate: newEstimate,
    load: load, save: save, markStale: markStale, isStale: function () { return stale; }, loadIssue: function () { return loadIssue; }, clear: clear, migrate: migrate, ensureMembers: ensureMembers, STAGES: STAGES, stageIndex: stageIndex
  };
})(this);
