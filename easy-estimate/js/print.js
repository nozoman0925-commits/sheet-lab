/*
 * PDF出力：A4 の見積書レイアウトを作り、ブラウザの印刷機能で「PDFとして保存」する。
 * 有料ライブラリ・外部サービスは使わない。日本語フォントは端末のものをそのまま使うので文字化けしない。
 *
 * 記載事項：
 *  - インボイス制度：発行者名・登録番号・取引年月日・内容・税率ごとの対価の合計と消費税額・宛名
 *  - 改正建設業法 第20条：材料費・労務費・その他の経費の内訳
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui;
  var esc = U.esc, yen = U.yen;

  function sheetHTML(doc) {
    var S = EE.S, co = S.company;
    var r = U.calcDoc(doc);
    var cust = U.findCustomer(doc.customerId) || {};
    var pj = U.findProject(doc.projectId) || {};
    var TC = EE.engine.TAX_CATEGORIES, CT = EE.engine.COST_TYPES;
    var hasReduced = doc.lines.some(function (l) { return l.taxCategory === 'red8'; });

    var rows = doc.lines.map(function (l, i) {
      var amt = r.lines[i] ? r.lines[i].amount : 0;
      var mark = l.taxCategory === 'red8' ? ' <span class="mark">※</span>' : '';
      var tl = l.taxCategory === 'std10' ? '10%' : l.taxCategory === 'red8' ? '8%' : TC[l.taxCategory] ? TC[l.taxCategory].label : '';
      return '<tr><td class="c num">' + (i + 1) + '</td>' +
        '<td>' + esc(l.name) + mark + (l.spec ? '<div class="spec">' + esc(l.spec) + '</div>' : '') + '</td>' +
        '<td class="r num">' + U.num(l.qty) + '</td><td class="c">' + esc(l.unit) + '</td>' +
        '<td class="r num">' + yen(l.unitPrice) + '</td><td class="r num">' + yen(amt) + '</td>' +
        '<td class="c num">' + tl + '</td></tr>';
    }).join('');

    var n0 = doc.lines.length;
    rows += (r.adjustments || []).filter(function (a) { return a.amount !== 0; }).map(function (a, k) {
      var src = (doc.adjustments || []).filter(function (x) { return x.id === a.id; })[0] || {};
      var lab = a.label || (a.type === 'overhead' ? '諸経費' : a.type === 'discount' ? '値引き' : '端数調整');
      if (src.mode === 'rate' && a.type !== 'roundoff') lab += '（' + (src.rateBp / 100) + '%）';
      if (a.type === 'roundoff') lab = '端数調整（' + Number(src.unit || 1000).toLocaleString('ja-JP') + '円未満）';
      var cats = Object.keys(a.byCat);
      var tl = cats.length === 1 ? (cats[0] === 'std10' ? '10%' : cats[0] === 'red8' ? '8%' : '') : '各税率';
      return '<tr><td class="c num">' + (n0 + k + 1) + '</td><td>' + esc(lab) + '</td><td class="r num">1</td><td class="c">式</td>' +
        '<td class="r num"></td><td class="r num">' + yen(a.amount).replace('¥-', '−¥') + '</td><td class="c num">' + tl + '</td></tr>';
    }).join('');

    var rateRows = Object.keys(r.byRate).map(function (k) {
      var x = r.byRate[k];
      if (!TC[k].taxable) return '<tr><th>' + esc(TC[k].label) + ' 対象</th><td class="num">' + yen(x.base) + '</td></tr>';
      return '<tr><th>' + x.rate + '%対象（税抜）</th><td class="num">' + yen(x.base) + '</td></tr>' +
        '<tr><th>　消費税（' + x.rate + '%）</th><td class="num">' + yen(x.tax) + '</td></tr>';
    }).join('');

    var b = r.breakdown;
    var bdRows = Object.keys(CT).filter(function (k) { return b[k] !== 0 || k === 'material' || k === 'labor'; }).map(function (k) {
      return '<tr><td>' + CT[k] + '</td><td class="r num">' + yen(b[k]) + '</td></tr>';
    }).join('');

    var title = '御見積書' + (doc.patternLabel ? '（' + doc.patternLabel + '）' : '') + (doc.rev ? '（第' + doc.rev + '版）' : '');
    return '<div class="sheet">' +
      '<div class="head" style="grid-template-columns:1fr"><h1>' + esc(title) + '</h1>' +
      '<div class="meta sans num">No. ' + esc(doc.no) + '<br>発行日 ' + U.jdate(doc.issueDate) + '</div></div>' +
      '<div class="head">' +
        '<div>' +
          '<div class="to">' + esc(cust.name || '（宛先未設定）') + '<small>' + esc(cust.honorific || '') + '</small></div>' +
          (cust.contact ? '<div class="to-sub">' + esc(cust.contact) + '</div>' : '') +
          '<div class="lead">下記のとおり御見積申し上げます。</div>' +
          '<div class="grand"><span class="l">御見積金額</span><span class="v num">' + yen(r.total) + '</span><span class="t">（税込）</span></div>' +
          '<table class="kv">' +
            '<tr><th>件名</th><td>' + esc(doc.title || '') + '</td></tr>' +
            (pj.site ? '<tr><th>工事場所</th><td>' + esc(pj.site) + '</td></tr>' : '') +
            '<tr><th>受渡期日</th><td>' + esc(doc.deliveryTerm || '') + '</td></tr>' +
            (doc.deliveryPlace ? '<tr><th>受渡場所</th><td>' + esc(doc.deliveryPlace) + '</td></tr>' : '') +
            '<tr><th>支払条件</th><td>' + esc(doc.paymentTerms || '') + '</td></tr>' +
            '<tr><th>有効期限</th><td class="num">' + U.jdate(doc.validUntil) + '</td></tr>' +
          '</table>' +
        '</div>' +
        '<div class="from">' +
          '<div class="co">' + esc(co.name || '') + '</div>' +
          (co.zip ? '〒' + esc(co.zip) + '<br>' : '') + esc(co.address || '') + '<br>' +
          (co.tel ? 'TEL ' + esc(co.tel) + '<br>' : '') + (co.email ? esc(co.email) + '<br>' : '') +
          (co.rep ? esc(co.rep) + '<br>' : '') + (co.license ? '<span style="font-size:8pt">' + esc(co.license) + '</span><br>' : '') +
          (co.invoiceRegNo ? '<span class="reg sans num">登録番号 ' + esc(co.invoiceRegNo) + '</span>' : '') +
          '<div class="stamps"><div>承認</div><div>担当</div></div>' +
        '</div>' +
      '</div>' +
      '<table class="items"><thead><tr><th style="width:8mm">No</th><th>品名・規格</th><th style="width:16mm">数量</th><th style="width:12mm">単位</th><th style="width:22mm">単価</th><th style="width:26mm">金額</th><th style="width:12mm">税率</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      (hasReduced ? '<div style="font-size:8pt;margin-top:1mm">※印は軽減税率（8%）対象品目です。</div>' : '') +
      '<div class="bottom">' +
        '<div>' +
          '<div class="box"><h4>工事費の内訳（建設業法第20条）</h4><table class="sans">' + bdRows + '</table></div>' +
          (doc.notes ? '<div class="box"><h4>備考</h4><div class="notes">' + esc(doc.notes) + '</div></div>' : '') +
        '</div>' +
        '<table class="tot sans"><tr><th>小計（税抜）</th><td class="num">' + yen(r.subtotal) + '</td></tr>' + rateRows +
        '<tr class="g"><th>合計（税込）</th><td class="num">' + yen(r.total) + '</td></tr></table>' +
      '</div>' +
      '<div class="foot sans"><span>' + esc(doc.no) + (doc.status === 'issued' ? '　発行確定 ' + U.jdate((doc.issuedAt || '').slice(0, 10)) : '') + '</span><span>消費税は税率ごとに合計して端数処理しています</span></div>' +
    '</div>';
  }

  function printDoc(doc) {
    var pr = document.getElementById('print-root');
    pr.innerHTML = sheetHTML(doc);
    var oldTitle = document.title;
    var cust = U.findCustomer(doc.customerId) || {};
    // 「PDFとして保存」の既定ファイル名になる
    document.title = '見積書_' + doc.no + '_' + (cust.name || '') ;
    setTimeout(function () {
      root.print();
      document.title = oldTitle;
      pr.innerHTML = '';
    }, 50);
  }

  /** プレビュー画面（A4を縮小表示）→「PDFとして保存」 */
  function preview(doc, onPrinted) {
    var m = U.modal({
      title: 'PDFプレビュー — ' + doc.no,
      wide: true,
      body: '<div class="preview-wrap"><div class="sk" style="width:620px;height:820px;margin:0 auto"></div></div>',
      foot: '<span class="hint">印刷画面で送信先を「PDFに保存」にすると、そのまま送れるPDFになります。</span><div class="spacer"></div>' +
        '<button class="btn ghost" data-x2>閉じる</button><button class="btn primary" data-print>' + U.I.pdf + 'PDFとして保存 / 印刷</button>',
      onMount: function (el, api) {
        var wrap = el.querySelector('.preview-wrap');
        // シマーを一瞬見せてから差し替え（描画待ちの空白を作らない）
        requestAnimationFrame(function () {
          setTimeout(function () {
            wrap.innerHTML = sheetHTML(doc);
            var sh = wrap.querySelector('.sheet');
            var scale = Math.min(1, (wrap.clientWidth - 48) / sh.offsetWidth);
            sh.style.transform = 'scale(' + scale + ')';
            sh.style.marginBottom = (-(1 - scale) * sh.offsetHeight) + 'px';
            EE.fx.pop(sh);
          }, 160);
        });
        el.querySelector('[data-x2]').onclick = function () { api.close(); };
        el.querySelector('[data-print]').onclick = function () {
          printDoc(doc);
          if (onPrinted) onPrinted();
        };
      }
    });
    return m;
  }

  /** 複数の書類を1回の印刷（1つのPDF）にまとめる */
  function printMany(docs) {
    var pr = document.getElementById('print-root');
    pr.innerHTML = docs.map(function (d, i) { return '<div style="' + (i ? 'page-break-before:always;break-before:page' : '') + '">' + sheetHTML(d) + '</div>'; }).join('');
    var oldTitle = document.title;
    document.title = '見積書_' + docs.length + '件_' + EE.data.today();
    setTimeout(function () { root.print(); document.title = oldTitle; pr.innerHTML = ''; }, 50);
  }

  EE.print = { sheetHTML: sheetHTML, printDoc: printDoc, preview: preview, printMany: printMany };
})(this);
