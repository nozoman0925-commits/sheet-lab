/*
 * 初期カタログ：工事カテゴリー・工事項目マスター（同義語つき）・工事テンプレート・計算式・定型文
 * 単価はサンプル値。設定・マスタ画面で自由に追加・編集できる。
 * 既存データには「同じコード／IDが無いものだけ」追加する（上書きしない）。
 */
(function (root) {
  'use strict';

  var categories = [
    { id: 'gaikou', name: '外構工事', keywords: ['外構', 'フェンス', '門扉', 'ブロック塀', '土間', 'カーポート', 'エクステリア'] },
    { id: 'tosou', name: '外壁塗装', keywords: ['外壁塗装', '外壁', '塗装', '塗り替え', 'ペンキ'] },
    { id: 'naisou', name: '内装工事', keywords: ['内装', 'クロス', '壁紙', 'フローリング', '床', '原状回復', '洋室', '和室'] },
    { id: 'yane', name: '屋根工事', keywords: ['屋根', 'カバー工法', '葺き替え', '雨漏り', '雨樋'] },
    { id: 'mizumawari', name: '水回り工事', keywords: ['水回り', 'キッチン', 'トイレ', '浴室', 'ユニットバス', '洗面', '給湯'] },
    { id: 'taiyoukou', name: '太陽光・蓄電池', keywords: ['太陽光', 'ソーラー', '蓄電池', 'パワコン'] },
    { id: 'other', name: 'その他', keywords: [] }
  ];

  // [code, category, kind, name, spec, unit, 販売単価, 原価, 原価区分, 同義語, 標準数量]
  var I = [
    // 外構
    ['GK-01', 'gaikou', 'construction', '既存フェンス撤去', '', 'm', 2500, 1500, 'labor', 'フェンス撤去,既存フェンス解体,フェンス解体', 10],
    ['GK-02', 'gaikou', 'construction', '既存ブロック撤去', '', 'm', 4000, 2500, 'labor', 'ブロック撤去,ブロック解体,ブロック塀撤去', 10],
    ['GK-03', 'gaikou', 'construction', '掘削工事', '', 'm³', 8000, 5000, 'labor', '掘削,根切り,すき取り', 1],
    ['GK-04', 'gaikou', 'construction', '残土処分', '', 'm³', 12000, 8000, 'expense', '残土,残土搬出,残土処理', 1],
    ['GK-05', 'gaikou', 'construction', '独立基礎', 'フェンス柱用', '箇所', 3500, 2000, 'labor', 'フェンス基礎,基礎ブロック,独立基礎', 6],
    ['GK-06', 'gaikou', 'construction', 'ブロック積み', 'CB120', 'm²', 14000, 9000, 'labor', 'ブロック工事,ブロック積,ブロック塀', 5],
    ['GK-07', 'gaikou', 'material', 'フェンス材料', 'アルミ形材 H800', 'm', 8000, 5200, 'material', 'フェンス,フェンス材', 10],
    ['GK-08', 'gaikou', 'material', 'フェンス材料', 'アルミ形材 H1200', 'm', 11000, 7200, 'material', 'フェンス,フェンス材', 10],
    ['GK-09', 'gaikou', 'material', 'フェンス材料', 'アルミ形材 H1800', 'm', 16000, 10500, 'material', 'フェンス,フェンス材,目隠しフェンス', 10],
    ['GK-10', 'gaikou', 'construction', 'フェンス施工', '', 'm', 4500, 3000, 'labor', 'フェンス設置,フェンス取付,フェンス取り付け,フェンス施工,フェンス工事', 10],
    ['GK-11', 'gaikou', 'product', '門扉', 'アルミ 両開き', '台', 85000, 55000, 'material', '門扉本体', 1],
    ['GK-12', 'gaikou', 'construction', '門扉設置', '', '箇所', 25000, 16000, 'labor', '門扉取付,門扉取り付け,門扉施工', 1],
    ['GK-13', 'gaikou', 'construction', '土間コンクリート', 't100 ワイヤーメッシュ', 'm²', 9500, 6000, 'subcontract', '土間コン,土間,コンクリート打設,駐車場コンクリート', 15],
    ['GK-14', 'gaikou', 'construction', '砂利敷き', 't50', 'm²', 1800, 900, 'material', '砂利,砂利敷,砂利敷設', 10],
    ['GK-15', 'gaikou', 'construction', '防草シート', '', 'm²', 1500, 700, 'material', '防草シート敷き,雑草対策,草対策', 10],
    ['GK-16', 'gaikou', 'construction', '運搬費', '', '式', 15000, 9000, 'expense', '運搬,搬入費,運搬費', 1],
    // 外壁塗装
    ['TS-01', 'tosou', 'construction', '足場設置', '飛散防止ネット込み', 'm²', 800, 550, 'subcontract', '足場,足場組立,足場架設,仮設足場', 200],
    ['TS-02', 'tosou', 'construction', '高圧洗浄', '', 'm²', 250, 150, 'labor', '洗浄,高圧水洗浄,バイオ洗浄', 150],
    ['TS-03', 'tosou', 'construction', '養生', '窓・土間・植栽', 'm²', 300, 150, 'labor', '養生,マスキング', 150],
    ['TS-04', 'tosou', 'construction', '下地補修', 'クラック・欠損', '式', 30000, 18000, 'labor', '下地補修,クラック補修,ひび割れ補修,補修', 1],
    ['TS-05', 'tosou', 'construction', '下塗り', 'シーラー', 'm²', 700, 350, 'labor', '下塗,シーラー,プライマー', 150],
    ['TS-06', 'tosou', 'construction', '中塗り', 'シリコン', 'm²', 900, 450, 'labor', '中塗', 150],
    ['TS-07', 'tosou', 'construction', '上塗り', 'シリコン', 'm²', 900, 450, 'labor', '上塗,仕上げ塗り,仕上塗り', 150],
    ['TS-08', 'tosou', 'construction', '付帯部塗装', '破風・軒天・雨樋', '式', 60000, 35000, 'labor', '付帯部,付帯塗装,破風塗装,軒天塗装,雨樋塗装', 1],
    ['TS-09', 'tosou', 'construction', '清掃', '', '式', 10000, 5000, 'labor', '清掃,クリーニング,片付け', 1],
    ['TS-10', 'tosou', 'construction', '足場撤去', '', 'm²', 300, 200, 'subcontract', '足場解体,足場撤去', 200],
    ['TS-11', 'tosou', 'construction', '廃材処分', '', '式', 15000, 10000, 'expense', '廃材処分,ゴミ処分,産廃処分', 1],
    // 内装
    ['NS-01', 'naisou', 'construction', '下地調整', 'パテ処理', 'm²', 600, 300, 'labor', '下地調整,パテ,下地処理', 20],
    ['NS-02', 'naisou', 'construction', 'ボード工事', '石膏ボード張り', 'm²', 3800, 2500, 'labor', 'ボード張り,プラスターボード,石膏ボード工事', 10],
    ['NS-03', 'naisou', 'construction', '建具交換', '室内ドア', '箇所', 65000, 42000, 'labor', '建具,ドア交換,扉交換', 1],
    ['NS-04', 'naisou', 'construction', '設備工事', 'コンセント・照明移設', '式', 50000, 30000, 'subcontract', '設備,電気設備', 1],
    // 屋根
    ['YN-01', 'yane', 'construction', '既存屋根材撤去', '', 'm²', 2500, 1600, 'labor', '屋根撤去,既存屋根撤去,瓦撤去,スレート撤去', 80],
    ['YN-02', 'yane', 'construction', '防水シート', 'ルーフィング', 'm²', 1200, 700, 'material', 'ルーフィング,防水シート,下葺き', 80],
    ['YN-03', 'yane', 'construction', '下地工事', '野地板 構造用合板', 'm²', 2800, 1800, 'labor', '野地板,下地合板,屋根下地', 80],
    ['YN-04', 'yane', 'construction', '屋根材施工', 'ガルバリウム鋼板', 'm²', 6500, 4300, 'labor', '屋根材,屋根葺き,ガルバリウム,屋根施工', 80],
    ['YN-05', 'yane', 'construction', '棟板金', '', 'm', 4500, 2800, 'labor', '棟,棟包み,棟板金交換', 12],
    ['YN-06', 'yane', 'construction', '雨樋工事', '', 'm', 5000, 3200, 'labor', '雨樋,樋交換,雨どい', 20],
    // 水回り
    ['MZ-01', 'mizumawari', 'construction', '既存設備撤去', '', '式', 20000, 12000, 'labor', '既存撤去,撤去,解体撤去', 1],
    ['MZ-02', 'mizumawari', 'construction', '配管工事', '給排水', '式', 35000, 22000, 'subcontract', '配管,給排水,給排水工事', 1],
    ['MZ-03', 'mizumawari', 'construction', '電気工事', '', '式', 25000, 16000, 'subcontract', '電気,電気配線', 1],
    ['MZ-04', 'mizumawari', 'construction', '下地工事', '', '式', 30000, 18000, 'labor', '下地,下地補強', 1],
    ['MZ-05', 'mizumawari', 'product', 'システムキッチン', 'I型 2550', '台', 650000, 450000, 'material', 'キッチン,システムキッチン本体', 1],
    ['MZ-06', 'mizumawari', 'product', 'ユニットバス', '1616サイズ', '台', 780000, 540000, 'material', 'ユニットバス本体,浴室,お風呂,UB', 1],
    ['MZ-07', 'mizumawari', 'construction', '取付施工', '', '式', 60000, 38000, 'labor', '取付,取り付け,設置工事,組立', 1],
    ['MZ-08', 'mizumawari', 'construction', '接続工事', '', '式', 15000, 9000, 'labor', '接続', 1],
    ['MZ-09', 'mizumawari', 'construction', '試運転', '', '式', 5000, 0, 'labor', '試運転,動作確認', 1],
    // 太陽光・蓄電池
    ['TY-01', 'taiyoukou', 'product', '太陽光モジュール', '410W', '枚', 38000, 26000, 'material', '太陽光パネル,ソーラーパネル,パネル,モジュール', 12],
    ['TY-02', 'taiyoukou', 'product', 'パワーコンディショナ', '5.5kW', '台', 220000, 150000, 'material', 'パワコン,PCS', 1],
    ['TY-03', 'taiyoukou', 'product', '蓄電池', '7kWh', '台', 1100000, 800000, 'material', '蓄電池本体,バッテリー', 1],
    ['TY-04', 'taiyoukou', 'material', '架台', '', '式', 120000, 80000, 'material', '架台,取付金具', 1],
    ['TY-05', 'taiyoukou', 'construction', '配線', '', '式', 40000, 25000, 'labor', '配線工事,ケーブル', 1],
    ['TY-06', 'taiyoukou', 'construction', '電気工事', '', '式', 80000, 50000, 'subcontract', '電気工事', 1],
    ['TY-07', 'taiyoukou', 'construction', '設置工事', '', '式', 150000, 100000, 'labor', '設置,据付', 1],
    ['TY-08', 'taiyoukou', 'construction', '電力申請', '系統連系', '式', 50000, 30000, 'expense', '電力申請,系統連系申請,申請', 1],
    ['TY-09', 'taiyoukou', 'construction', '試運転', '', '式', 10000, 0, 'labor', '試運転,動作確認', 1]
  ];

  // 既存のサンプル品目（内装・水回り）に付けるカテゴリーと同義語
  var existing = {
    'M-001': ['naisou', 'クロス,壁紙,ビニールクロス'], 'M-002': ['naisou', '石膏ボード,プラスターボード'],
    'M-003': ['naisou', 'フローリング,床材'], 'M-004': ['mizumawari', 'CF,クッションフロア'],
    'P-001': ['naisou', 'ダウンライト,LED照明'], 'P-002': ['mizumawari', 'トイレ,便器,洋式トイレ'], 'P-003': ['mizumawari', '換気扇'],
    'K-001': ['naisou', 'クロス張替え,クロス施工,クロス貼り,壁紙張替え'], 'K-002': ['naisou', '床撤去,既存材撤去,床材撤去'],
    'K-003': ['naisou', 'フローリング張り,床材施工,フローリング施工'], 'K-004': ['mizumawari', 'トイレ交換,便器交換'],
    'K-005': ['naisou', '電気配線'], 'L-001': ['naisou', '大工'], 'L-002': ['naisou', '電気工'], 'L-003': ['naisou', '内装工'],
    'E-001': ['naisou', '産廃処分,廃材処分,処分費'], 'E-002': ['naisou', '養生,清掃,養生清掃'], 'E-003': ['other', '現場管理費,管理費']
  };

  function code2id(c) { return 'itm_' + c.toLowerCase().replace('-', ''); }

  function items(today) {
    return I.map(function (x) {
      return { id: code2id(x[0]), code: x[0], category: x[1], kind: x[2], name: x[3], spec: x[4], unit: x[5],
        unitPrice: x[6], unitCost: x[7], costType: x[8], taxCategory: 'std10', active: true,
        synonyms: x[9] ? x[9].split(',') : [], stdQty: x[10] || 1, description: '', supplier: '', contractor: '', note: '',
        updatedAt: today, priceHistory: [{ from: today, unitPrice: x[6], unitCost: x[7] }] };
    });
  }

  // 工事テンプレート（optional=true は「参考候補」：初期状態で外しておく）
  var T = [
    { id: 'tpl_fence', name: 'フェンス工事', category: 'gaikou', keywords: ['フェンス'], note: '延長10m想定',
      lines: [['GK-01', 10, true], ['GK-03', 1], ['GK-05', 6], ['GK-04', 1, true], ['GK-08', 10], ['GK-10', 10], ['GK-16', 1]],
      adjustments: [{ type: 'overhead', label: '諸経費', mode: 'rate', rateBp: 500 }] },
    { id: 'tpl_gaikou', name: '外構工事 一式', category: 'gaikou', keywords: ['外構'], note: '撤去〜土間・砂利まで',
      lines: [['GK-02', 5, true], ['GK-03', 3], ['GK-04', 3], ['GK-06', 5, true], ['GK-08', 10, true], ['GK-10', 10, true], ['GK-11', 1, true], ['GK-12', 1, true],
        ['GK-13', 15], ['GK-14', 10, true], ['GK-15', 10, true], ['GK-16', 1]],
      adjustments: [{ type: 'overhead', label: '諸経費', mode: 'rate', rateBp: 500 }] },
    { id: 'tpl_tosou', name: '外壁塗装（30坪目安）', category: 'tosou', keywords: ['外壁塗装', '塗装'], note: '塗装面積150m²・足場200m²',
      lines: [['TS-01', 200], ['TS-02', 150], ['TS-03', 150], ['TS-04', 1], ['TS-05', 150], ['TS-06', 150], ['TS-07', 150], ['TS-08', 1], ['TS-09', 1], ['TS-10', 200], ['TS-11', 1]],
      adjustments: [{ type: 'overhead', label: '諸経費', mode: 'rate', rateBp: 500 }] },
    { id: 'tpl_naisou', name: '内装工事（洋室）', category: 'naisou', keywords: ['内装', '洋室'], note: '',
      lines: [['E-002', 1], ['K-002', 13, true], ['NS-01', 20], ['NS-02', 10, true], ['M-001', 40], ['K-001', 40], ['K-003', 13, true], ['M-003', 13, true], ['NS-03', 1, true], ['NS-04', 1, true], ['E-001', 1]] },
    { id: 'tpl_yane', name: '屋根カバー・葺き替え', category: 'yane', keywords: ['屋根'], note: '屋根面積80m²',
      lines: [['TS-01', 200], ['YN-01', 80, true], ['YN-03', 80], ['YN-02', 80], ['YN-04', 80], ['YN-05', 12], ['YN-06', 20, true], ['TS-10', 200], ['TS-11', 1]],
      adjustments: [{ type: 'overhead', label: '諸経費', mode: 'rate', rateBp: 500 }] },
    { id: 'tpl_kitchen', name: 'キッチン交換', category: 'mizumawari', keywords: ['キッチン'], note: '',
      lines: [['MZ-01', 1], ['MZ-02', 1], ['MZ-03', 1], ['MZ-04', 1, true], ['MZ-05', 1], ['MZ-07', 1], ['MZ-08', 1], ['MZ-09', 1], ['E-002', 1], ['E-001', 1]] },
    { id: 'tpl_bath', name: 'ユニットバス交換', category: 'mizumawari', keywords: ['ユニットバス', '浴室', 'お風呂'], note: '',
      lines: [['MZ-01', 1], ['MZ-02', 1], ['MZ-03', 1], ['MZ-04', 1], ['MZ-06', 1], ['MZ-07', 1], ['MZ-08', 1], ['MZ-09', 1], ['E-002', 1], ['E-001', 1]] },
    { id: 'tpl_solar', name: '太陽光発電（5kW）', category: 'taiyoukou', keywords: ['太陽光', 'ソーラー'], note: '',
      lines: [['TY-01', 12], ['TY-02', 1], ['TY-03', 1, true], ['TY-04', 1], ['TY-05', 1], ['TY-06', 1], ['TY-07', 1], ['TY-08', 1], ['TY-09', 1]],
      adjustments: [{ type: 'overhead', label: '諸経費', mode: 'rate', rateBp: 300 }] }
  ];

  function templates() {
    return T.map(function (t) {
      return { id: t.id, name: t.name, category: t.category, keywords: t.keywords.slice(), note: t.note || '',
        lines: t.lines.map(function (l) { return { itemId: code2id(l[0]), qty: l[1], optional: !!l[2] }; }),
        adjustments: (t.adjustments || []).map(function (a) { return Object.assign({}, a); }) };
    });
  }

  // 数量計算式（式は四則演算と ceil/floor/round/min/max だけを解釈する。eval は使わない）
  var formulas = [
    { id: 'f_fence', name: 'フェンス延長', unit: 'm', expr: 'a + b + c + d', lossPct: 0, round: 'decimal',
      inputs: [{ key: 'a', label: '区間1', unit: 'm' }, { key: 'b', label: '区間2', unit: 'm' }, { key: 'c', label: '区間3', unit: 'm' }, { key: 'd', label: '区間4', unit: 'm' }] },
    { id: 'f_area', name: '面積（縦×横）', unit: 'm²', expr: 'w * d', lossPct: 0, round: 'decimal',
      inputs: [{ key: 'w', label: '縦', unit: 'm' }, { key: 'd', label: '横', unit: 'm' }] },
    { id: 'f_doma', name: '土間面積（2区画）', unit: 'm²', expr: 'w1 * d1 + w2 * d2', lossPct: 0, round: 'decimal',
      inputs: [{ key: 'w1', label: '区画1 縦', unit: 'm' }, { key: 'd1', label: '区画1 横', unit: 'm' }, { key: 'w2', label: '区画2 縦', unit: 'm' }, { key: 'd2', label: '区画2 横', unit: 'm' }] },
    { id: 'f_volume', name: '体積（縦×横×高さ）', unit: 'm³', expr: 'w * d * h', lossPct: 0, round: 'decimal',
      inputs: [{ key: 'w', label: '縦', unit: 'm' }, { key: 'd', label: '横', unit: 'm' }, { key: 'h', label: '高さ・深さ', unit: 'm' }] },
    { id: 'f_block', name: 'ブロック数量（CB 390mm）', unit: '個', expr: 'ceil(len / 0.4) * dan', lossPct: 3, round: 'ceil',
      inputs: [{ key: 'len', label: '延長', unit: 'm' }, { key: 'dan', label: '段数', unit: '段' }] },
    { id: 'f_cloth', name: 'クロス面積（壁＋天井）', unit: 'm²', expr: '(w + d) * 2 * h - open + w * d', lossPct: 10, round: 'ceil',
      inputs: [{ key: 'w', label: '部屋の縦', unit: 'm' }, { key: 'd', label: '部屋の横', unit: 'm' }, { key: 'h', label: '天井高', unit: 'm' }, { key: 'open', label: '開口部（窓・ドア）', unit: 'm²' }] },
    { id: 'f_paint', name: '外壁塗装面積（延床×係数）', unit: 'm²', expr: 'floor_area * k', lossPct: 0, round: 'ceil',
      inputs: [{ key: 'floor_area', label: '延床面積', unit: 'm²' }, { key: 'k', label: '係数（目安1.2〜1.4）', unit: '', default: 1.3 }] },
    { id: 'f_gravel', name: '砂利必要量', unit: 'm³', expr: 'area * t / 100', lossPct: 10, round: 'decimal',
      inputs: [{ key: 'area', label: '面積', unit: 'm²' }, { key: 't', label: '厚み', unit: 'cm' }] },
    { id: 'f_material', name: '材料数量（面積÷1単位の施工面積）', unit: '', expr: 'area / per', lossPct: 5, round: 'ceil',
      inputs: [{ key: 'area', label: '施工面積', unit: 'm²' }, { key: 'per', label: '1単位あたりの施工面積', unit: 'm²' }] }
  ];

  var SNIPPET_KINDS = { conditions: '施工条件', caution: '注意事項', validity: '見積有効期限', payment: '支払条件', warranty: '工事保証条件', extra: '追加工事について', disclaimer: '免責事項', notes: '備考',
    term: '工期', cancel: 'キャンセル', exclude: 'この見積に含まれないもの', premise: '前提条件' };
  var snippets = [
    ['payment', '月末締め翌月末払い', '工事完了月末締め 翌月末日 銀行振込'],
    ['payment', '着手金30%・完了70%', '着手時 30%、工事完了時 70% を銀行振込にてお支払いください'],
    ['validity', '30日', '本見積書の有効期限は発行日より30日間です。'],
    ['conditions', '作業時間', '作業時間は平日 8:30〜17:30 とします（土日祝は事前協議）。'],
    ['conditions', '電気・水道', '工事中の電気・水道は現場のものを使用させていただきます。'],
    ['caution', '騒音', '工事中は騒音・振動・臭気が発生します。近隣へのご挨拶は当社にて行います。'],
    ['warranty', '施工1年', '施工部分は引渡し後1年間保証いたします。製品はメーカー保証に準じます。'],
    ['extra', '追加工事', '見積範囲外の工事が必要となった場合は、事前にお見積りのうえ協議させていただきます。'],
    ['disclaimer', '既存部分', '既存部分の経年劣化や、解体後に判明した隠れた不具合は本見積の対象外です。'],
    ['notes', '天候', '天候により工期が変更となる場合があります。'],
    // 2026-11-26：条件の言い回しライブラリ（選ぶだけで入る。言い回しのブレと書き忘れを防ぐ）
    ['term', '着工から約◯日', '工期は着工から約◯日を予定しています（天候・資材の入荷により前後します）。'],
    ['term', '日程は協議', '着工日・完了日は、ご契約後に日程を協議のうえ決定します。'],
    ['cancel', 'キャンセル料', 'ご契約後のキャンセルは、それまでに発生した費用（発注済みの資材・加工費など）をご負担いただきます。'],
    ['cancel', '着工前の変更', '着工前の内容変更は、差額のお見積りのうえ承ります。'],
    ['warranty', '防水5年', '防水工事は引渡し後5年間、雨漏りについて保証いたします。'],
    ['payment', '完了後一括', '工事完了後、請求書発行日から30日以内に銀行振込にてお支払いください。'],
    ['exclude', '既存物の処分', '既存の設備・家具・植栽の移設・処分は含みません（ご希望の場合は別途お見積り）。'],
    ['exclude', '電気・設備工事', '電気・給排水などの設備工事は含みません。'],
    ['exclude', '申請費用', '確認申請・道路使用許可などの申請費用は含みません。'],
    ['premise', '駐車スペース', '工事車両の駐車スペース（1台分）をお借りできることを前提としています。'],
    ['premise', '電気・水道の使用', '工事中、現場の電気・水道を使わせていただくことを前提としています。'],
    ['premise', '現地調査の範囲', '現地調査で確認できた範囲の金額です。解体後に判明した不具合は別途ご相談となります。']
  ].map(function (s, i) { return { id: 'snp_' + (i + 1), kind: s[0], title: s[1], body: s[2] }; });

  /** 足りないものだけを state に追加する（既存は上書きしない） */
  function mergeInto(state, today) {
    var added = { items: 0, templates: 0, formulas: 0, snippets: 0 };
    state.categories = state.categories || [];
    categories.forEach(function (c) { if (!state.categories.some(function (x) { return x.id === c.id; })) state.categories.push(JSON.parse(JSON.stringify(c))); });
    state.items.forEach(function (it) {
      var e = existing[it.code];
      if (!it.category) it.category = e ? e[0] : 'other';
      if (!it.synonyms) it.synonyms = e ? e[1].split(',') : [];
      if (it.stdQty == null) it.stdQty = 1;
      if (!it.priceHistory) it.priceHistory = [{ from: it.updatedAt || today, unitPrice: it.unitPrice, unitCost: it.unitCost }];
      ['description', 'supplier', 'contractor', 'note'].forEach(function (k) { if (it[k] == null) it[k] = ''; });
    });
    items(today).forEach(function (it) {
      if (!state.items.some(function (x) { return x.code === it.code || x.id === it.id; })) { state.items.push(it); added.items++; }
    });
    state.packages = state.packages || [];
    state.packages.forEach(function (p) {
      if (!p.category) p.category = 'naisou';
      if (!p.keywords) p.keywords = [];
      p.lines.forEach(function (l) { if (l.optional == null) l.optional = false; });
      if (!p.adjustments) p.adjustments = [];
    });
    templates().forEach(function (t) {
      if (!state.packages.some(function (x) { return x.id === t.id; })) { state.packages.push(t); added.templates++; }
    });
    state.formulas = state.formulas || [];
    formulas.forEach(function (f) { if (!state.formulas.some(function (x) { return x.id === f.id; })) { state.formulas.push(JSON.parse(JSON.stringify(f))); added.formulas++; } });
    state.snippets = state.snippets || [];
    snippets.forEach(function (s) { if (!state.snippets.some(function (x) { return x.id === s.id; })) { state.snippets.push(Object.assign({}, s)); added.snippets++; } });
    return added;
  }

  root.EE = root.EE || {};
  root.EE.catalog = { categories: categories, formulas: formulas, SNIPPET_KINDS: SNIPPET_KINDS, mergeInto: mergeInto, code2id: code2id };
})(this);
