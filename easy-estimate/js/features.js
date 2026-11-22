/*
 * 機能の一覧（機能ライブラリ）
 * メニュー・設定の「機能ライブラリ」・全機能検索（Ctrl+K）は、ここを見て表示を決める。
 *  - status 'ready'   ：使える。href で開く
 *  - status 'planned' ：これから作る（phase＝構想の第何期で作るか）。メニューには出さず、検索とライブラリに「準備中」として出す
 *  - words            ：検索で拾う言い換え（業務の言葉）
 * AI は使わない（構想の「K. AIアシスタント」は入れない方針）。
 */
(function (root) {
  'use strict';
  var EE = root.EE;

  /* 左のメニュー（業務の目的別）。section は機能のまとまり */
  var SECTIONS = [
    { key: 'home', label: 'ホーム', icon: 'home', href: '#/home', note: '自分専用の操作盤' },
    { key: 'clients', label: '顧客', icon: 'users', href: '#/clients', note: '問い合わせ・営業' },
    { key: 'sites', label: '工事', icon: 'site', href: '#/sites', note: '調査・施工・検査' },
    { key: 'estimate', label: '見積・積算', icon: 'calc', href: '#/new', note: '計算・提案・契約' },
    { key: 'schedule', label: 'スケジュール', icon: 'calendar', href: '#/schedule', note: '工程・人員・予定' },
    { key: 'procure', label: '資材・発注', icon: 'truck', href: '#/procure', note: '材料・業者・在庫', planned: 4 },
    { key: 'finance', label: '経営・会計', icon: 'yen', href: '#/finance', note: '利益・請求・入金' },
    { key: 'docs', label: '書類', icon: 'docs', href: '#/docs', note: 'すべての書類' },
    { key: 'analysis', label: '分析', icon: 'trend', href: '#/analysis', note: '経営・工事データ' },
    { key: 'settings', label: '設定', icon: 'gear', href: '#/settings/items', note: 'マスタ・権限・連携' }
  ];

  // [section, 名前, 状態, href または 期, 言い換え]
  var R = 'ready';
  var LIST = [
    ['home', 'ウィジェット式ホーム', R, '#/home', 'ホーム 操作盤 コントロール ダッシュボード'],
    ['home', 'ホームの編集（ウィジェットの追加・並べ替え）', R, '#/home?edit', 'ウィジェット 追加 配置 カスタマイズ'],
    ['home', '担当者ごとのファイル', R, '#/home', 'フォルダ 担当 ファイル'],
    ['clients', '顧客の登録・一覧', R, '#/clients', '顧客 お客様 取引先 施主'],
    ['clients', '顧客メモ・直近の工事', R, '#/clients', 'メモ 注意点'],
    ['clients', '月別×工事種別ヒートマップ', R, '#/analysis', 'ヒートマップ'],
    ['clients', '問い合わせ受付', 3, '', '問い合わせ 電話 紹介 流入'],
    ['clients', '顧客対応履歴・タイムライン', 3, '', '対応履歴 タイムライン 連絡'],
    ['clients', '追客リマインダー', 3, '', '追客 リマインダー フォロー'],
    ['clients', '顧客の重複検知', 3, '', '重複'],
    ['sites', '工事の一覧・流れ', R, '#/sites', '工事 工事 フロー 進捗 一覧'],
    ['sites', '工事ワークスペース', R, '#/sites', 'ワークスペース 工事カルテ 概要'],
    ['sites', '現場写真', R, '#/sites', '写真 現場写真 施工前 施工後 ビフォーアフター'],
    ['sites', '工事メモ・履歴', R, '#/sites', 'メモ 連絡 履歴'],
    ['sites', '現地調査シート', 3, '', '現地調査 調査 チェックリスト'],
    ['sites', '写真への書き込み・採寸図', 3, '', '書き込み 寸法 採寸'],
    ['sites', '安全・品質・検査', 7, '', 'KY 安全 品質 検査 是正 ヒヤリハット'],
    ['sites', '完了報告・保証・点検', 7, '', '完了報告 保証 点検 アフター'],
    ['estimate', 'かんたん見積もり作成', R, '#/new', '見積 作成 新規 かんたん'],
    ['estimate', '文章から見積', R, '#/new/text', '文章 テキスト'],
    ['estimate', '音声から見積', R, '#/new/voice', '音声 しゃべる'],
    ['estimate', 'PDFから見積', R, '#/new/pdf', 'PDF 取り込み 他社見積'],
    ['estimate', '写真から見積', R, '#/new/photo', '写真 OCR 読み取り'],
    ['estimate', '過去の見積から', R, '#/new/past', '過去 流用 コピー'],
    ['estimate', 'テンプレートから', R, '#/new/template', 'テンプレート パッケージ'],
    ['estimate', '通常入力', R, '#/new/edit', '通常 手入力 マスタから'],
    ['estimate', '数量計算の式', R, '#/settings/formulas', '数量 計算 面積 周長 体積 ロス率'],
    ['estimate', 'A案・B案の比較', R, '#/sites', 'パターン 比較 A案 B案'],
    ['estimate', '工事請負契約書', 6, '', '契約 契約書 請負'],
    ['estimate', '見積承認（管理者）', 6, '', '承認 ワークフロー'],
    ['schedule', '予定・期限カレンダー', R, '#/schedule', 'スケジュール 予定 カレンダー 期限 今日'],
    ['schedule', '工程表・ガントチャート', 4, '', '工程 工程表 ガント'],
    ['schedule', '職人・協力業者の割り当て', 4, '', '職人 割り当て 人員 手配'],
    ['schedule', '作業日報', 4, '', '日報 作業報告'],
    ['procure', '発注書・納品管理', 4, '', '発注 発注書 納品 注文'],
    ['procure', '協力業者台帳', 4, '', '業者 協力会社 外注'],
    ['procure', '在庫管理', 4, '', '在庫 資材 材料'],
    ['finance', '入金・粗利のメーター', R, '#/finance', '入金率 粗利率 未入金'],
    ['finance', '月別の見積・受注・入金', R, '#/finance', '月別 売上 受注額 入金額'],
    ['finance', '工事別の粗利', R, '#/finance', '工事別 損益 粗利 利益'],
    ['finance', '請求書・分割請求', 6, '', '請求 請求書 着手金 中間金'],
    ['finance', '入金消込・未入金通知', 6, '', '入金 消込 未入金 督促'],
    ['finance', '実行予算・実績原価', 5, '', '実行予算 原価 予算超過'],
    ['finance', '支払予定・キャッシュフロー', 6, '', '支払 キャッシュフロー 資金繰り'],
    ['docs', '書類一覧・検索', R, '#/docs', '書類 一覧 検索 電子帳簿保存法'],
    ['docs', '下書き', R, '#/docs/draft', '下書き 未確定'],
    ['docs', '確定済み（送った書類）', R, '#/docs/issued', '確定 発行済み 送付'],
    ['docs', 'まとめてPDF', R, '#/docs', 'PDF 一括 印刷'],
    ['analysis', '件数の推移・工事種別ヒートマップ', R, '#/analysis', '分析 推移 ヒートマップ'],
    ['analysis', '受注率・担当者別・工事種別', R, '#/analysis', '受注率 担当者別 工種別 ランキング'],
    ['analysis', '経営レポート', 8, '', 'レポート 月次 経営'],
    ['settings', '工事項目・単価マスタ', R, '#/settings/items', 'マスタ 単価 品目 工事項目'],
    ['settings', '工事テンプレート', R, '#/settings/packages', 'テンプレート'],
    ['settings', '定型文', R, '#/settings/snippets', '定型文 備考 支払条件'],
    ['settings', '自社情報・ロゴ・会社印', R, '#/settings/company', '会社 自社 ロゴ 角印 登録番号'],
    ['settings', '計算ルール', R, '#/settings/rules', '端数 税 計算ルール'],
    ['settings', '担当者', R, '#/settings/members', '担当者 社員 メンバー'],
    ['settings', 'バックアップ・データ', R, '#/settings/data', 'バックアップ 書き出し 読み込み データ'],
    ['settings', '機能ライブラリ', R, '#/settings/features', '機能 ライブラリ メニュー 表示'],
    ['settings', '外部サービス連携（カレンダー・LINE・会計）', 9, '', '連携 Google LINE 会計 カレンダー'],
    ['settings', 'サーバー・複数端末・権限', 9, '', 'サーバー 共有 権限 同期']
  ];

  var FEATURES = LIST.map(function (x, i) {
    return { id: 'f' + i, section: x[0], name: x[1], status: x[2] === R ? 'ready' : 'planned', href: x[2] === R ? x[3] : '', phase: x[2] === R ? null : x[2], words: x[4] || '' };
  });

  function settings() { var s = EE.S || {}; s.ui = s.ui || {}; s.ui.navHidden = s.ui.navHidden || {}; return s.ui; }
  /** メニューに出す業務のまとまり（準備中のものと、利用者が隠したものは出さない） */
  /* 桜ミツ版（EE.link）：業務管理の機能を入れても、メニューは7つに絞る（同じ種類の画面を2つ並べない）
     顧客・工事の流れ・工事の一覧 → 工事／書類 → 見積／カレンダー・ホワイトボード → 予定／粗利・工事の経営・分析 → 経営 */
  var LINK_SECTIONS = [
    { key: 'home', label: 'ホーム', icon: 'home', href: '#/home', note: '今日のこと・数字' },
    { key: 'sites', label: '工事', icon: 'site', href: '#/o/list', note: 'お客様・9工程・写真・契約・請求' },
    { key: 'estimate', label: '見積', icon: 'calc', href: '#/docs', note: '作る・一覧・確定' },
    { key: 'schedule', label: '予定', icon: 'calendar', href: '#/o/cal', note: 'カレンダー・あしたの予定・タイムライン' },
    { key: 'finance', label: '経営', icon: 'yen', href: '#/finance', note: '粗利・入金・分析' },
    { key: 'settings', label: '設定', icon: 'gear', href: '#/settings/items', note: 'マスタ・自社情報・バックアップ' }
  ];
  function linkSections() { return LINK_SECTIONS; }
  /** 桜ミツ版で、元の画面が属するメニュー（顧客は工事、書類は見積…） */
  var LINK_ALIAS = { clients: 'sites', docs: 'estimate', analysis: 'finance', board: 'schedule' };
  function navKey(k) { return EE.link ? (LINK_ALIAS[k] || k) : k; }
  function allSections() { return EE.link ? linkSections() : SECTIONS; }
  function navSections() {
    var hid = EE.S ? settings().navHidden : {};
    return allSections().filter(function (s) { return !s.planned && !hid[s.key]; });
  }
  function sectionOf(key) { return allSections().filter(function (s) { return s.key === key; })[0]; }

  root.EE.features = { SECTIONS: SECTIONS, FEATURES: FEATURES, navSections: navSections, sectionOf: sectionOf, settings: settings, navKey: navKey };
})(this);
