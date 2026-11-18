/*
 * PDF・写真の読み込み → 確認画面 → 自社の見積書へ変換
 *
 * - テキスト型PDF：PDFに入っている文字と位置をそのまま取り出す（pdf.js）
 * - 画像型PDF・写真・スキャン：端末内でOCR（tesseract.js、日本語＋英数字）。信頼度の低い箇所に印を付ける
 * - どちらも「行とセル」にまとめ、docparse.js のルールで明細・宛先・合計を読む
 * - 読み取り結果は元の書類と並べて確認・修正してから見積にする。推測で埋めない
 * - 原本と読み取り結果はこの端末（IndexedDB）に保存。外部には一切送らない
 * ライブラリは vendor/ に同梱（オフラインで動く）。
 */
(function (root) {
  'use strict';
  var EE = root.EE, U = EE.ui, I = U.I, esc = U.esc;

  var MAX_PDF = 30 * 1024 * 1024, MAX_IMG = 25 * 1024 * 1024, MAX_PAGES = 10;
  var abs = function (p) { return new URL(p, location.href).href; };

  /* ---------- ライブラリの読み込み（必要になったときだけ） ---------- */
  var loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = src; s.onload = resolve;
      s.onerror = function () { delete loaded[src]; reject(new Error('部品（' + src + '）を読み込めませんでした')); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  function ensurePdf() {
    // ワーカーをメインスレッドで動かす（file:// で開いた場合も動くように）
    return loadScript('vendor/pdfjs/pdf.worker.min.js').then(function () { return loadScript('vendor/pdfjs/pdf.min.js'); }).then(function () {
      root.pdfjsLib.GlobalWorkerOptions.workerSrc = abs('vendor/pdfjs/pdf.worker.min.js');
      return root.pdfjsLib;
    });
  }
  var ocrWorker = null;
  function ensureOcr(onProgress) {
    if (location.protocol === 'file:') {
      return Promise.reject(new Error('文字の読み取り（OCR）は、アプリをサーバー経由（http:// または https://）で開いたときに使えます。いまはファイルを直接開いているため使えません。README の「起動のしかた」を見てください。'));
    }
    if (ocrWorker) return Promise.resolve(ocrWorker);
    return loadScript('vendor/tesseract/tesseract.min.js').then(function () {
      return root.Tesseract.createWorker(['jpn', 'eng'], 1, {
        workerPath: abs('vendor/tesseract/worker.min.js'),
        corePath: abs('vendor/tesseract/core'),
        langPath: abs('vendor/tesseract/lang'),
        gzip: true,
        logger: function (m) { if (onProgress && m && m.progress != null) onProgress(m); }
      });
    }).then(function (w) { ocrWorker = w; return w; });
  }

  /* ---------- 状態 ---------- */
  var ST = null;  // { kind:'pdf'|'photo', file, pages:[{canvas, w, h}], lines, result, rows, method, importId }

  function sniff(buf) {
    var b = new Uint8Array(buf.slice(0, 12));
    var s = String.fromCharCode.apply(null, b);
    if (s.indexOf('%PDF-') === 0) return 'pdf';
    if (b[0] === 0xFF && b[1] === 0xD8) return 'jpeg';
    if (b[0] === 0x89 && s.slice(1, 4) === 'PNG') return 'png';
    if (s.slice(4, 8) === 'ftyp') return 'heic';
    if (s.slice(0, 2) === 'II' || s.slice(0, 2) === 'MM') return 'tiff';
    if (s.slice(0, 4) === 'RIFF') return 'webp';
    return '';
  }

  /* ---------- 画面 ---------- */
  function render(kind) {
    var isPdf = kind === 'pdf';
    var html =
      '<div id="imp-root">' +
      '<section class="panel" data-st><div class="panel-b">' +
        '<label class="drop" id="drop">' +
          '<input type="file" id="imp-file" hidden accept="' + (isPdf ? 'application/pdf,.pdf' : 'image/*,.heic,.heif,.tif,.tiff') + '"' + (isPdf ? '' : ' multiple') + '>' +
          '<span class="kpi-icon" style="width:46px;height:46px;border-radius:14px">' + (isPdf ? I.file : I.upload) + '</span>' +
          '<b style="font-size:16px">' + (isPdf ? 'PDFをここにドロップ、またはクリックして選択' : '写真・画像をドロップ、またはクリックして選択') + '</b>' +
          '<span class="hint">' + (isPdf ? '見積書・請求書・発注書・注文請書・契約書・カタログ・明細書など（30MBまで・先頭' + MAX_PAGES + 'ページ）'
            : 'JPEG / PNG / HEIC（Safari）/ TIFF（対応ブラウザのみ）。複数枚まとめて選べます。手書きメモも読めますが精度に限りがあります') + '</span>' +
        '</label>' +
        (isPdf ? '' : '<div style="display:flex;gap:10px;justify-content:center;margin-top:12px"><label class="btn primary">' + I.upload + 'カメラで撮影<input type="file" id="imp-cam" hidden accept="image/*" capture="environment"></label></div>') +
        '<p class="hint" style="text-align:center;margin:14px 0 0">読み込んだファイルと読み取り結果はこの端末の中だけに保存されます。外部のサービスには送りません。</p>' +
      '</div></section>' +
      '<section class="panel" data-st style="margin-top:18px"><div class="panel-h"><h2>保存した原本</h2><span class="sub">取り込んだPDF・画像と、そのときの読み取り結果</span></div><div class="panel-b" id="imp-list"><div class="sk" style="height:60px"></div></div></section>' +
      '</div>';
    return { title: isPdf ? 'PDFから見積もり作成' : '写真から見積もり作成', crumb: 'かんたん見積もり作成', html: html, mount: function (v) { mount(v, kind); } };
  }

  function listHTML(list) {
    if (!list.length) return '<div class="hint">まだありません</div>';
    return '<table class="table"><tbody>' + list.map(function (r) {
      return '<tr data-imp="' + r.id + '"><td>' + esc(r.name) + '<span class="cell-sub">' + U.jdate((r.createdAt || '').slice(0, 10)) + '　' + ({ 'pdf-text': 'PDFの文字', 'pdf-ocr': 'PDF＋OCR', 'image-ocr': '画像＋OCR' }[r.method] || '') + '　明細 ' + r.rows + '行' + (r.docIds.length ? '　見積 ' + r.docIds.length + '件に使用' : '') + '</span></td>' +
        '<td class="r"><div class="row-actions" style="opacity:1"><button class="btn ghost sm" data-act="imp-view">原本</button><button class="btn sm" data-act="imp-reopen">結果を開く</button><button class="btn ghost icon sm danger" data-act="imp-del">' + I.trash + '</button></div></td></tr>';
    }).join('') + '</tbody></table>';
  }

  function mount(view, kind) {
    var rootEl = view.querySelector('#imp-root');
    function refreshList() {
      EE.filestore.list().then(function (l) { var el = view.querySelector('#imp-list'); if (el) el.innerHTML = listHTML(l.filter(function (r) { return kind === 'pdf' ? r.type === 'application/pdf' : r.type !== 'application/pdf'; })); })
        .catch(function (e) { var el = view.querySelector('#imp-list'); if (el) el.innerHTML = '<div class="hint">' + esc(e.message) + '</div>'; });
    }
    refreshList();
    var drop = view.querySelector('#drop');
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer.files.length) start(Array.prototype.slice.call(e.dataTransfer.files), kind, rootEl); });
    view.addEventListener('change', function (e) {
      if ((e.target.id === 'imp-file' || e.target.id === 'imp-cam') && e.target.files.length) { start(Array.prototype.slice.call(e.target.files), kind, rootEl); e.target.value = ''; }
    });
    view.addEventListener('click', function (e) {
      var a = e.target.closest('[data-act]'); if (!a) return;
      var tr = a.closest('[data-imp]'); var id = tr && tr.dataset.imp;
      if (a.dataset.act === 'imp-view') EE.filestore.openOriginal(id).catch(function (err) { EE.fx.toast(err.message, { warn: true }); });
      if (a.dataset.act === 'imp-del') U.confirmBox('この原本と読み取り結果を削除しますか？（作成済みの見積は消えません）', '削除する', { danger: true }).then(function (ok) { if (ok) EE.filestore.remove(id).then(refreshList); });
      if (a.dataset.act === 'imp-reopen') EE.filestore.get(id).then(function (r) { reopen(r, rootEl); });
    });
  }

  /* ---------- 読み込み処理 ---------- */
  function progressHTML(msg) {
    return '<section class="panel"><div class="panel-b" style="text-align:center;padding:40px 20px">' +
      '<div class="sk" style="height:6px;max-width:420px;margin:0 auto 18px;border-radius:6px"><div id="imp-bar" style="height:100%;width:0;background:linear-gradient(90deg,var(--accent-deep),var(--accent-2));border-radius:6px;transition:width .25s"></div></div>' +
      '<b id="imp-msg">' + esc(msg) + '</b><div class="hint" id="imp-sub" style="margin-top:6px"></div></div></section>';
  }
  function progress(p, msg, sub) {
    var b = document.getElementById('imp-bar'); if (b && p != null) b.style.width = Math.round(p * 100) + '%';
    var m = document.getElementById('imp-msg'); if (m && msg) m.textContent = msg;
    var s = document.getElementById('imp-sub'); if (s && sub != null) s.textContent = sub;
  }

  function fail(rootEl, err, kind) {
    rootEl.innerHTML = '<section class="panel"><div class="panel-b"><div class="check error" style="grid-template-columns:22px 1fr"><span class="ic">!</span><div><div class="t">読み込めませんでした</div><div class="d">' + esc(err.message || String(err)) + '</div></div></div>' +
      '<div class="toolbar" style="margin-top:14px"><a class="btn" href="#/new/' + kind + '">' + I.refresh + 'やり直す</a><a class="btn" href="#/new/text">' + I.edit + '文章で入力する</a><a class="btn" href="#/new/edit">' + I.plus + '通常入力で作る</a></div></div></section>';
  }

  async function start(files, kind, rootEl) {
    try {
      var f = files[0];
      var buf = await f.arrayBuffer();
      var type = sniff(buf);
      if (kind === 'pdf') {
        if (type !== 'pdf') throw new Error('PDFファイルではありません（中身がPDFの形式になっていません）');
        if (f.size > MAX_PDF) throw new Error('ファイルが大きすぎます（30MBまで）');
        rootEl.innerHTML = progressHTML('PDFを開いています…');
        await readPdf(f, buf, rootEl);
      } else {
        var imgs = [];
        for (var i = 0; i < files.length; i++) {
          var b2 = i === 0 ? buf : await files[i].arrayBuffer();
          var t2 = sniff(b2);
          if (!t2 || t2 === 'pdf') throw new Error('「' + files[i].name + '」は画像ファイルではありません');
          if (files[i].size > MAX_IMG) throw new Error('「' + files[i].name + '」が大きすぎます（25MBまで）');
          var bmp;
          try { bmp = await createImageBitmap(files[i]); }
          catch (e) {
            throw new Error('「' + files[i].name + '」をこのブラウザでは表示できません' + (t2 === 'heic' ? '（HEIC形式。iPhoneなら Safari で開くか、設定 → カメラ → フォーマット →「互換性優先」で撮影してください）' : t2 === 'tiff' ? '（TIFF形式。JPEG/PNGに変換してください）' : ''));
          }
          imgs.push({ file: files[i], bmp: bmp });
        }
        ST = { kind: 'photo', file: files[0], files: files, imgs: imgs, cur: 0, method: 'image-ocr' };
        imgs.forEach(function (im) { im.adj = { rot: 0, skew: 0, bright: 0, contrast: 15, bw: false, crop: null }; });
        imageEditor(rootEl);
      }
    } catch (err) { fail(rootEl, err, kind); }
  }

  async function readPdf(file, buf, rootEl) {
    var lib = await ensurePdf();
    var doc = await lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, enableXfa: false, cMapUrl: abs('vendor/pdfjs/cmaps/'), cMapPacked: true }).promise;
    var n = Math.min(doc.numPages, MAX_PAGES);
    var pages = [], pieces = [], textChars = 0;
    for (var p = 1; p <= n; p++) {
      progress((p - 1) / n * 0.6, 'ページを読み取っています（' + p + ' / ' + n + '）');
      var page = await doc.getPage(p);
      var vp = page.getViewport({ scale: 2 });
      var canvas = document.createElement('canvas');
      canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
      var ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      var tc = await page.getTextContent();
      var pageChars = 0;
      tc.items.forEach(function (it) {
        if (!it.str || !it.str.trim()) return;
        var t = lib.Util.transform(vp.transform, it.transform);
        var h = Math.hypot(t[2], t[3]);
        pieces.push({ text: it.str, x: t[4], y: t[5] - h, w: it.width * vp.scale, h: h, page: p, conf: null });
        pageChars += it.str.trim().length;
      });
      textChars += pageChars;
      pages.push({ canvas: canvas, w: canvas.width, h: canvas.height, textChars: pageChars });
    }
    ST = { kind: 'pdf', file: file, pages: pages, method: 'pdf-text', numPages: doc.numPages };
    if (textChars < 15 * n) {
      // 画像だけのPDF → OCR
      ST.method = 'pdf-ocr';
      pieces = [];
      for (var q = 0; q < pages.length; q++) {
        var res = await ocrCanvas(pages[q].canvas, q + 1, q / pages.length, 1 / pages.length);
        pieces = pieces.concat(res);
      }
    }
    progress(0.95, '明細を組み立てています…');
    finishRead(pieces, rootEl);
  }

  /**
   * OCRの前処理：拡大 → 白黒（大津の方法でしきい値を自動決定）→ 表の罫線を消す
   * 罫線が残ると文字の区切りを誤りやすいため、長く続く横線・縦線だけを白で塗る
   */
  function prepForOcr(src) {
    var scale = Math.max(1, Math.min(3, 2600 / src.width));
    var c = document.createElement('canvas');
    c.width = Math.round(src.width * scale); c.height = Math.round(src.height * scale);
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
    var W = c.width, H = c.height, d = x.getImageData(0, 0, W, H), px = d.data;
    var g = new Uint8Array(W * H), hist = new Array(256).fill(0);
    for (var i = 0; i < W * H; i++) { var v = Math.round(px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11); g[i] = v; hist[v]++; }
    // 大津のしきい値
    var total = W * H, sum = 0, sumB = 0, wB = 0, best = 0, th = 160;
    for (var t = 0; t < 256; t++) sum += t * hist[t];
    for (t = 0; t < 256; t++) {
      wB += hist[t]; if (!wB) continue; var wF = total - wB; if (!wF) break;
      sumB += t * hist[t]; var mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; th = t; }
    }
    var dark = new Uint8Array(W * H);
    for (i = 0; i < W * H; i++) dark[i] = g[i] <= th ? 1 : 0;
    if (ST.removeLines !== false) {
      var minH = Math.round(W * 0.12), minV = Math.round(H * 0.05), run, k, y, xx;
      for (y = 0; y < H; y++) { run = 0; for (xx = 0; xx <= W; xx++) { if (xx < W && dark[y * W + xx]) run++; else { if (run >= minH) for (k = xx - run; k < xx; k++) dark[y * W + k] = 2; run = 0; } } }
      for (xx = 0; xx < W; xx++) { run = 0; for (y = 0; y <= H; y++) { if (y < H && dark[y * W + xx]) run++; else { if (run >= minV) for (k = y - run; k < y; k++) dark[k * W + xx] = 2; run = 0; } } }
    }
    for (i = 0; i < W * H; i++) { var o = dark[i] === 1 ? 0 : 255; px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = o; px[i * 4 + 3] = 255; }
    x.putImageData(d, 0, 0);
    return { canvas: c, scale: scale };
  }

  async function ocrCanvas(canvas, page, base, span) {
    progress(base, '文字を読み取っています（OCR）', '初回は辞書の読み込みに少し時間がかかります');
    var w = await ensureOcr(function (m) { progress(base + (m.status === 'recognizing text' ? m.progress * span : 0), m.status === 'recognizing text' ? '文字を読み取っています（' + page + 'ページ目）' : '読み取りの準備をしています…'); });
    await w.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
    var prep = prepForOcr(canvas), sc = prep.scale;
    var r = await w.recognize(prep.canvas, {}, { blocks: true, text: true });
    var pieces = [];
    (r.data.blocks || []).forEach(function (b) { (b.paragraphs || []).forEach(function (pg) { (pg.lines || []).forEach(function (ln) { (ln.words || []).forEach(function (wd) {
      if (!wd.text || !wd.text.trim()) return;
      pieces.push({ text: wd.text.replace(/^\|+|\|+$/g, ''), x: wd.bbox.x0 / sc, y: wd.bbox.y0 / sc, w: (wd.bbox.x1 - wd.bbox.x0) / sc, h: (wd.bbox.y1 - wd.bbox.y0) / sc, page: page, conf: Math.round(wd.confidence) });
    }); }); }); });
    return pieces;
  }

  function finishRead(pieces, rootEl) {
    var lines = EE.docparse.groupLines(pieces, { gapRatio: ST.method === 'pdf-text' ? 0.9 : 1.2 });
    var result = EE.docparse.parseDoc(lines, { items: EE.S.items, customers: EE.S.customers });
    ST.lines = lines; ST.result = result;
    ST.rows = result.rows.map(function (r) { return Object.assign({ include: true }, r); });
    ST.priceMode = 'source';
    // 原本と読み取り結果を保存
    var rec = { id: EE.data.uid('imp'), name: ST.file.name, type: ST.file.type || (ST.kind === 'pdf' ? 'application/pdf' : 'image/*'), size: ST.file.size,
      createdAt: new Date().toISOString(), blob: ST.file, method: ST.method, result: { fields: result.fields, totals: result.totals, rows: result.rows, others: result.others, docType: result.docType }, lines: lines, docIds: [] };
    EE.filestore.put(rec).then(function (id) { ST.importId = id; }).catch(function () { ST.importId = null; EE.fx.toast('原本をこの端末に保存できませんでした（容量不足の可能性）', { warn: true }); });
    ST.importId = rec.id;
    review(rootEl);
  }

  /** 保存済みの結果を開き直す */
  async function reopen(rec, rootEl) {
    if (!rec) return;
    try {
      rootEl.innerHTML = progressHTML('原本を開いています…');
      ST = { kind: rec.type === 'application/pdf' ? 'pdf' : 'photo', file: new File([rec.blob], rec.name, { type: rec.type }), method: rec.method, importId: rec.id };
      if (ST.kind === 'pdf') {
        var lib = await ensurePdf();
        var doc = await lib.getDocument({ data: new Uint8Array(await rec.blob.arrayBuffer()), isEvalSupported: false, enableXfa: false }).promise;
        ST.pages = [];
        for (var p = 1; p <= Math.min(doc.numPages, MAX_PAGES); p++) {
          var page = await doc.getPage(p), vp = page.getViewport({ scale: 2 });
          var c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
          var cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height);
          await page.render({ canvasContext: cx, viewport: vp }).promise;
          ST.pages.push({ canvas: c, w: c.width, h: c.height });
        }
      } else {
        var bmp = await createImageBitmap(rec.blob);
        var c2 = document.createElement('canvas'); c2.width = bmp.width; c2.height = bmp.height; c2.getContext('2d').drawImage(bmp, 0, 0);
        ST.pages = [{ canvas: c2, w: c2.width, h: c2.height }];
      }
      ST.lines = rec.lines || [];
      ST.result = EE.docparse.parseDoc(ST.lines, { items: EE.S.items, customers: EE.S.customers });
      ST.rows = ST.result.rows.map(function (r) { return Object.assign({ include: true }, r); });
      ST.priceMode = 'source';
      review(rootEl);
    } catch (err) { fail(rootEl, err, ST.kind === 'pdf' ? 'pdf' : 'photo'); }
  }

  /* ---------- 画像の補正（回転・傾き・明るさ・コントラスト・白黒・切り抜き） ---------- */
  function drawAdjusted(im, maxW) {
    var a = im.adj, bmp = im.bmp;
    var rot = ((a.rot % 360) + 360) % 360;
    var sw = rot % 180 ? bmp.height : bmp.width, sh = rot % 180 ? bmp.width : bmp.height;
    var scale = maxW ? Math.min(1, maxW / sw) : (sw < 1600 ? 2 : sw > 3200 ? 3200 / sw : 1);  // OCR用は小さい画像を拡大
    var c = document.createElement('canvas');
    c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.filter = 'brightness(' + (1 + a.bright / 100) + ') contrast(' + (1 + a.contrast / 100) + ')' + (a.bw ? ' grayscale(1)' : '');
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((rot + a.skew) * Math.PI / 180);
    ctx.drawImage(bmp, -bmp.width * scale / 2, -bmp.height * scale / 2, bmp.width * scale, bmp.height * scale);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none';
    if (a.bw) {   // しきい値で白黒にして文字をくっきり
      var d = ctx.getImageData(0, 0, c.width, c.height), px = d.data;
      for (var i = 0; i < px.length; i += 4) { var v = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11; v = v > 165 ? 255 : 0; px[i] = px[i + 1] = px[i + 2] = v; }
      ctx.putImageData(d, 0, 0);
    }
    if (a.crop) {
      var cr = a.crop, out = document.createElement('canvas');
      out.width = Math.max(1, Math.round(cr.w * c.width)); out.height = Math.max(1, Math.round(cr.h * c.height));
      out.getContext('2d').drawImage(c, cr.x * c.width, cr.y * c.height, cr.w * c.width, cr.h * c.height, 0, 0, out.width, out.height);
      return out;
    }
    return c;
  }

  function imageEditor(rootEl) {
    var n = ST.imgs.length;
    rootEl.innerHTML = '<div class="grid" style="grid-template-columns:minmax(0,1fr) 320px;align-items:start">' +
      '<section class="panel"><div class="panel-h"><h2>読み取る前に整える</h2><span class="sub" id="ie-name"></span><div class="spacer"></div>' +
        (n > 1 ? '<button class="btn sm" data-ie="prev">‹</button><span class="hint" id="ie-pos"></span><button class="btn sm" data-ie="next">›</button>' : '') + '</div>' +
        '<div class="panel-b"><div class="ie-stage" id="ie-stage"><canvas id="ie-canvas"></canvas><div class="ie-crop" id="ie-crop" hidden></div></div>' +
        '<p class="hint" style="margin-top:8px">画像の上をドラッグすると、読み取る範囲を切り抜けます（表の部分だけにすると精度が上がります）。</p></div></section>' +
      '<section class="panel"><div class="panel-b">' +
        '<div class="label">向き</div><div style="display:flex;gap:8px;margin:6px 0 14px"><button class="btn sm" data-ie="rotl">↺ 左へ90°</button><button class="btn sm" data-ie="rotr">↻ 右へ90°</button></div>' +
        slider('skew', '傾き補正', -15, 15, 0.5, '°') + slider('bright', '明るさ', -50, 50, 1, '') + slider('contrast', 'コントラスト', -50, 80, 1, '') +
        '<label style="display:flex;gap:8px;align-items:center;margin:10px 0"><input type="checkbox" id="ie-bw"> プレビューを白黒で見る</label>' +
        '<label style="display:flex;gap:8px;align-items:center;margin:0 0 10px"><input type="checkbox" id="ie-lines" checked> 表の罫線を消してから読む（表の書類におすすめ）</label>' +
        '<button class="btn sm" data-ie="nocrop" style="margin-bottom:14px">切り抜きを解除</button>' +
        '<button class="btn primary" style="width:100%" data-ie="ocr">' + I.spark + (n > 1 ? n + '枚の文字を読み取る' : '文字を読み取る') + '</button>' +
        '<p class="hint" style="margin-top:10px">手書きは読み取りの精度に限りがあります。読めた文字は確認画面で直せます。</p>' +
      '</div></section></div>';
    function slider(k, label, min, max, step, unit) {
      return '<div class="field" style="margin-bottom:10px"><label style="display:flex;justify-content:space-between">' + label + '<span class="num" id="ie-v-' + k + '"></span></label><input type="range" data-adj-ie="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" data-unit="' + unit + '"></div>';
    }
    var canvas = rootEl.querySelector('#ie-canvas'), stage = rootEl.querySelector('#ie-stage'), cropEl = rootEl.querySelector('#ie-crop');
    function im() { return ST.imgs[ST.cur]; }
    function sync() {
      var a = im().adj;
      rootEl.querySelectorAll('[data-adj-ie]').forEach(function (r) { r.value = a[r.dataset.adjIe]; rootEl.querySelector('#ie-v-' + r.dataset.adjIe).textContent = a[r.dataset.adjIe] + r.dataset.unit; });
      rootEl.querySelector('#ie-bw').checked = a.bw;
      rootEl.querySelector('#ie-name').textContent = im().file.name;
      var pos = rootEl.querySelector('#ie-pos'); if (pos) pos.textContent = (ST.cur + 1) + ' / ' + n;
      draw();
    }
    var raf;
    function draw() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var a = im().adj, saved = a.crop; a.crop = null;
        var c = drawAdjusted(im(), stage.clientWidth || 800);
        a.crop = saved;
        canvas.width = c.width; canvas.height = c.height; canvas.getContext('2d').drawImage(c, 0, 0);
        showCrop();
      });
    }
    function showCrop() {
      var cr = im().adj.crop;
      if (!cr) { cropEl.hidden = true; return; }
      cropEl.hidden = false;
      cropEl.style.left = cr.x * 100 + '%'; cropEl.style.top = cr.y * 100 + '%'; cropEl.style.width = cr.w * 100 + '%'; cropEl.style.height = cr.h * 100 + '%';
    }
    rootEl.addEventListener('input', function (e) {
      var k = e.target.dataset.adjIe;
      if (k) { im().adj[k] = Number(e.target.value); rootEl.querySelector('#ie-v-' + k).textContent = e.target.value + e.target.dataset.unit; draw(); }
      if (e.target.id === 'ie-bw') { im().adj.bw = e.target.checked; draw(); }
      if (e.target.id === 'ie-lines') ST.removeLines = e.target.checked;
    });
    // 切り抜き（ドラッグ）
    var dragStart = null;
    canvas.addEventListener('pointerdown', function (e) {
      var r = canvas.getBoundingClientRect();
      dragStart = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragStart) return;
      var r = canvas.getBoundingClientRect();
      var x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      im().adj.crop = { x: Math.min(x, dragStart.x), y: Math.min(y, dragStart.y), w: Math.abs(x - dragStart.x), h: Math.abs(y - dragStart.y) };
      showCrop();
    });
    canvas.addEventListener('pointerup', function () { dragStart = null; var cr = im().adj.crop; if (cr && (cr.w < 0.03 || cr.h < 0.03)) { im().adj.crop = null; showCrop(); } });
    rootEl.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-ie]'); if (!b) return;
      var a = im().adj;
      switch (b.dataset.ie) {
        case 'rotl': a.rot -= 90; a.crop = null; draw(); break;
        case 'rotr': a.rot += 90; a.crop = null; draw(); break;
        case 'nocrop': a.crop = null; showCrop(); break;
        case 'prev': ST.cur = (ST.cur + n - 1) % n; sync(); break;
        case 'next': ST.cur = (ST.cur + 1) % n; sync(); break;
        case 'ocr':
          var pages = ST.imgs.map(function (x) { var c = drawAdjusted(x); return { canvas: c, w: c.width, h: c.height }; });
          ST.pages = pages;
          rootEl.innerHTML = progressHTML('文字を読み取る準備をしています…');
          try {
            var pieces = [];
            for (var i = 0; i < pages.length; i++) pieces = pieces.concat(await ocrCanvas(pages[i].canvas, i + 1, i / pages.length, 1 / pages.length));
            finishRead(pieces, rootEl);
          } catch (err) { fail(rootEl, err, 'photo'); }
          break;
      }
    });
    sync();
  }

  /* ---------- 確認画面 ---------- */
  function matchOptions(r) {
    var opts = '<option value="">（マスタを選ぶ）</option><option value="__new"' + (r.itemId === '__new' ? ' selected' : '') + '>＋ 新しいマスタとして登録</option>';
    var pref = (r.alternatives && r.alternatives.length > 1) ? r.alternatives : [];
    if (pref.length) opts += '<optgroup label="候補">' + pref.map(function (id) { var it = U.findItem(id); return it ? U.opt(id, it.code + '　' + it.name + (it.spec ? '（' + it.spec + '）' : ''), r.itemId) : ''; }).join('') + '</optgroup>';
    opts += (EE.S.categories || []).map(function (c) {
      var xs = EE.S.items.filter(function (it) { return it.category === c.id && it.active !== false; });
      return xs.length ? '<optgroup label="' + esc(c.name) + '">' + xs.map(function (it) { return U.opt(it.id, it.code + '　' + it.name + (it.spec ? '（' + it.spec + '）' : ''), pref.length ? '' : r.itemId); }).join('') + '</optgroup>' : '';
    }).join('');
    return opts;
  }

  function rowsHTML() {
    return ST.rows.map(function (r, i) {
      var low = r.conf != null && r.conf < 70;
      var it = r.itemId && r.itemId !== '__new' ? U.findItem(r.itemId) : null;
      var calcAmt = (Number(r.qty) || 0) * (Number(r.unitPrice) || 0);
      var mism = r.amount != null && r.unitPrice != null && Math.abs(calcAmt - r.amount) > Math.max(1, Math.abs(r.amount) * 0.001);
      return '<tr data-r="' + i + '" class="' + (low ? 'hl' : '') + '" style="' + (r.include ? '' : 'opacity:.45') + '">' +
        '<td><input type="checkbox" data-k="include"' + (r.include ? ' checked' : '') + '></td>' +
        '<td><input class="input" data-k="name" value="' + esc(r.name) + '" style="height:32px;min-width:150px">' +
          (low ? '<span class="cell-sub" style="color:var(--warn)">読み取りの信頼度 ' + r.conf + '%：元の書類と見比べてください</span>' : '') +
          (r.unitUnsure ? '<span class="cell-sub" style="color:var(--warn)">単位が読み取れませんでした（「' + esc(r.unitUnsure) + '」）</span>' : '') + '</td>' +
        '<td><input class="input num" data-k="qty" type="number" step="0.01" value="' + esc(r.qty != null ? r.qty : '') + '" style="height:32px;width:80px;text-align:right"></td>' +
        '<td><input class="input" data-k="unit" value="' + esc(r.unit || '') + '" style="height:32px;width:58px"></td>' +
        '<td><input class="input num" data-k="unitPrice" type="number" step="1" value="' + esc(r.unitPrice != null ? r.unitPrice : '') + '" style="height:32px;width:100px;text-align:right"></td>' +
        '<td class="r num">' + (r.amount != null ? U.yen(r.amount) : '<span class="hint">—</span>') + (mism ? '<span class="cell-sub" style="color:var(--err)">数量×単価 ' + U.yen(calcAmt) + ' と合いません</span>' : '') + '</td>' +
        '<td><select class="input" data-k="itemId" style="height:32px;max-width:230px">' + matchOptions(r) + '</select>' +
          (it ? '<span class="cell-sub">' + (r.match === 'code' ? 'コード一致' : r.match === 'exact' ? '品名一致' : r.match === 'similar' ? '同義語で一致' : '手動で選択') + '　マスタ単価 ' + U.yen(it.unitPrice) + '</span>' : r.itemId === '__new' ? '<span class="cell-sub" style="color:var(--accent-2)">新しいマスタとして登録します</span>' : '<span class="cell-sub" style="color:var(--warn)">マスタに無い品目です</span>') + '</td>' +
        '<td><button class="btn ghost icon sm" data-act="r-locate" title="元の書類で位置を見る">' + I.search + '</button><button class="btn ghost icon sm danger" data-act="r-del" title="この行を除く">' + I.trash + '</button></td></tr>';
    }).join('');
  }

  function review(rootEl) {
    var R = ST.result, F = R.fields;
    var docName = { estimate: '見積書', invoice: '請求書', order: '発注書・注文書', 'order-ack': '注文請書', contract: '契約書', other: '書類' }[R.docType];
    var custOpts = '<option value="">（あとで選ぶ）</option>' + (F.customerName && !R.customerId ? '<option value="__new" selected>＋ 新規登録：' + esc(F.customerName) + ' ' + esc(F.honorific || '') + '</option>' : '') +
      EE.S.customers.map(function (c) { return U.opt(c.id, c.name + ' ' + c.honorific, R.customerId); }).join('');
    var lowN = ST.rows.filter(function (r) { return r.conf != null && r.conf < 70; }).length;
    rootEl.innerHTML =
      '<div class="toolbar" data-st><div class="grow"><b>' + esc(ST.file.name) + '</b>　<span class="badge blue">' + docName + '</span>　<span class="hint">' +
        ({ 'pdf-text': 'PDFの文字情報から読み取り', 'pdf-ocr': '画像のPDFをOCRで読み取り', 'image-ocr': '画像をOCRで読み取り' }[ST.method]) + (ST.numPages > MAX_PAGES ? '（先頭' + MAX_PAGES + 'ページのみ）' : '') + '</span></div>' +
        '<button class="btn ghost" data-act="as-text">' + I.edit + '読み取った文字を文章として使う</button><a class="btn ghost" href="#/new/' + (ST.kind === 'pdf' ? 'pdf' : 'photo') + '">別のファイル</a></div>' +
      '<div class="imp-grid">' +
        '<section class="panel" data-st><div class="panel-h"><h2>元の書類</h2><div class="spacer"></div>' + (ST.pages.length > 1 ? ST.pages.map(function (p, i) { return '<button class="btn sm' + (i ? '' : ' primary') + '" data-page="' + i + '">' + (i + 1) + '</button>'; }).join('') : '') + '</div>' +
          '<div class="panel-b"><div class="imp-viewer" id="imp-viewer"></div><p class="hint" style="margin-top:8px">青い枠：明細として読んだ行　黄色の枠：読み取りの信頼度が低い行</p></div></section>' +
        '<div class="grid" style="gap:18px">' +
          '<section class="panel" data-st><div class="panel-h"><h2>書類の情報</h2><span class="sub">読めなかった項目は空のままです</span></div><div class="panel-b"><div class="form-grid">' +
            '<div class="field c6"><label>宛先（読み取り：' + esc(F.customerName || '—') + '）</label><select class="input" id="r-cust">' + custOpts + '</select></div>' +
            '<div class="field c6"><label>件名</label><input class="input" id="r-title" value="' + esc(F.title || '') + '"></div>' +
            '<div class="field c4"><span class="label">元の書類の番号</span><span class="num">' + esc(F.number || '—') + '</span></div>' +
            '<div class="field c4"><span class="label">元の書類の日付</span><span class="num">' + esc(F.issueDate ? U.jdate(F.issueDate) : '—') + '</span></div>' +
            '<div class="field c4"><span class="label">発行元</span><span>' + esc(F.issuer || '—') + '</span></div>' +
          '</div></div></section>' +
          '<section class="panel" data-st><div class="panel-h"><h2>金額の照合</h2></div><div class="panel-b" id="r-totals"></div></section>' +
        '</div>' +
      '</div>' +
      '<section class="panel" data-st style="margin-top:18px"><div class="panel-h"><h2>明細（' + ST.rows.length + '行を読み取り）</h2>' + (lowN ? '<span class="badge warn">要確認 ' + lowN + '行</span>' : '') + '<div class="spacer"></div>' +
        '<button class="btn sm" data-act="r-add">' + I.plus + '行を追加</button></div>' +
        '<div class="panel-b"><div class="table-scroll"><table class="table"><thead><tr><th style="width:30px"></th><th>品名（書類の表記）</th><th>数量</th><th>単位</th><th>単価</th><th class="r">金額（書類）</th><th>自社マスタとの対応</th><th></th></tr></thead><tbody id="r-rows">' + rowsHTML() + '</tbody></table></div>' +
        (R.others.length ? '<details style="margin-top:14px"><summary class="hint" style="cursor:pointer">明細として読めなかった行（' + R.others.length + '）— 必要なら明細に追加できます</summary><div class="checks" style="margin-top:8px">' + R.others.map(function (o, i) {
          return '<div class="check info" style="grid-template-columns:1fr auto"><div class="t">' + esc(o.text) + '</div><button class="btn ghost sm" data-act="o-add" data-o="' + i + '">明細に追加</button></div>'; }).join('') + '</div></details>' : '') +
        '<div class="sep" style="margin:18px 0"></div>' +
        '<div class="form-grid"><div class="field c8"><label>見積の単価</label><div class="seg" id="r-price">' +
          '<button data-v="source" class="on">元の書類の単価を使う（他社見積の変換）</button><button data-v="master">自社マスタの単価を使う</button></div>' +
          '<span class="hint">元の書類の単価を使った行は、見積の送信前チェックで「取り込み元の単価」と表示されます。</span></div>' +
          '<div class="field c4" style="justify-content:flex-end"><button class="btn primary" data-act="r-make">' + I.check + '見積の下書きを作る</button></div></div>' +
      '</div></section>';
    showPage(0);
    renderTotals();
    bindReview(rootEl);
    EE.fx.stagger(rootEl, { step: 30 });
  }

  var curPage = 0;
  function showPage(i) {
    curPage = i;
    var outer = document.getElementById('imp-viewer'); if (!outer) return;
    var pg = ST.pages[i];
    outer.innerHTML = '<div class="imp-sheet"></div>';
    var v = outer.firstChild;   // 枠の位置は、スクロールする外枠ではなく画像と同じ大きさの内側を基準にする
    var img = document.createElement('canvas'); img.width = pg.w; img.height = pg.h; img.getContext('2d').drawImage(pg.canvas, 0, 0);
    v.appendChild(img);
    ST.rows.forEach(function (r, idx) {
      var s = r.source; if (!s || !s.box || (s.page || 1) !== i + 1) return;
      var b = document.createElement('div');
      b.className = 'imp-box' + (r.conf != null && r.conf < 70 ? ' low' : '');
      b.dataset.r = idx;
      b.style.left = (s.box.x / pg.w * 100) + '%'; b.style.top = (s.box.y / pg.h * 100) + '%';
      b.style.width = (s.box.w / pg.w * 100) + '%'; b.style.height = (s.box.h / pg.h * 100) + '%';
      v.appendChild(b);
    });
    document.querySelectorAll('[data-page]').forEach(function (b) { b.classList.toggle('primary', Number(b.dataset.page) === i); });
  }

  function renderTotals() {
    var el = document.getElementById('r-totals'); if (!el) return;
    var T = ST.result.totals;
    var inc = ST.rows.filter(function (r) { return r.include; });
    var sumAmt = inc.reduce(function (s, r) { return s + (r.amount || 0); }, 0);
    var sumCalc = inc.reduce(function (s, r) { return s + Math.round((Number(r.qty) || 0) * (Number(r.unitPrice) || 0)); }, 0);
    function row(label, v, ok) { return '<div class="sum-row"><span>' + label + '</span><span class="yen">' + (v == null ? '<span class="hint">読み取れず</span>' : U.yen(v)) + (ok === true ? ' <span class="badge ok">一致</span>' : ok === false ? ' <span class="badge err">不一致</span>' : '') + '</span></div>'; }
    el.innerHTML = row('書類の小計', T.subtotal) + row('書類の消費税', T.tax) + row('書類の合計', T.total) + '<div class="sep"></div>' +
      row('選んだ明細の金額（書類の表記）の合計', sumAmt, T.subtotal != null ? sumAmt === T.subtotal : null) +
      row('数量×単価で計算した合計', sumCalc, T.subtotal != null ? sumCalc === T.subtotal : null) +
      '<p class="hint" style="margin:8px 0 0">一致しない場合は、読み取り漏れ・値引き行・税込表記などがないか、元の書類と見比べてください。自動では直しません。</p>';
  }

  function bindReview(rootEl) {
    rootEl.addEventListener('change', function (e) {
      var tr = e.target.closest('tr[data-r]'); if (!tr) return;
      var r = ST.rows[tr.dataset.r], k = e.target.dataset.k;
      if (k === 'include') { r.include = e.target.checked; tr.style.opacity = r.include ? '' : '.45'; }
      else if (k === 'itemId') { r.itemId = e.target.value; r.match = 'manual'; refreshRows(); }
      renderTotals();
    });
    rootEl.addEventListener('input', function (e) {
      var tr = e.target.closest('tr[data-r]'); if (!tr) return;
      var r = ST.rows[tr.dataset.r], k = e.target.dataset.k;
      if (k === 'qty' || k === 'unitPrice') r[k] = e.target.value === '' ? null : Number(e.target.value);
      else if (k === 'name' || k === 'unit') r[k] = e.target.value;
      renderTotals();
    });
    rootEl.addEventListener('mouseover', function (e) {
      var tr = e.target.closest('tr[data-r]'); if (!tr) return;
      document.querySelectorAll('.imp-box').forEach(function (b) { b.classList.toggle('on', b.dataset.r === tr.dataset.r); });
    });
    rootEl.addEventListener('click', function (e) {
      var pg = e.target.closest('[data-page]'); if (pg) { showPage(Number(pg.dataset.page)); return; }
      var box = e.target.closest('.imp-box');
      if (box) { var row = document.querySelector('tr[data-r="' + box.dataset.r + '"]'); if (row) { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); EE.fx.pulse(row); } return; }
      var sp = e.target.closest('#r-price [data-v]');
      if (sp) { ST.priceMode = sp.dataset.v; sp.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === sp); }); return; }
      var a = e.target.closest('[data-act]'); if (!a) return;
      var tr = a.closest('tr[data-r]');
      switch (a.dataset.act) {
        case 'r-locate':
          var s = ST.rows[tr.dataset.r].source;
          if (!s || !s.box) { EE.fx.toast('この行は手で追加した行です', { warn: true }); return; }
          if ((s.page || 1) - 1 !== curPage) showPage((s.page || 1) - 1);
          var b = document.querySelector('.imp-box[data-r="' + tr.dataset.r + '"]');
          if (b) { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); document.querySelectorAll('.imp-box').forEach(function (x) { x.classList.toggle('on', x === b); }); EE.fx.pulse(b); }
          break;
        case 'r-del': ST.rows.splice(Number(tr.dataset.r), 1); refreshRows(); renderTotals(); break;
        case 'r-add': ST.rows.push({ name: '', qty: 1, unit: '式', unitPrice: null, amount: null, include: true, itemId: '', match: 'none' }); refreshRows(); break;
        case 'o-add':
          var o = ST.result.others[a.dataset.o];
          ST.rows.push({ name: o.text, qty: 1, unit: '式', unitPrice: null, amount: null, include: true, itemId: '', match: 'none', source: { page: o.page, box: o.box } });
          refreshRows(); showPage(curPage); a.disabled = true; EE.fx.toast('明細に追加しました。数量と単価を入れてください'); break;
        case 'as-text':
          var text = (ST.lines || []).map(function (l) { return l.text; }).join('\n');
          EE.views.quick.setText(text); location.hash = '#/new/text'; break;
        case 'r-make': make(rootEl); break;
      }
    });
  }
  function refreshRows() { var tb = document.getElementById('r-rows'); if (tb) tb.innerHTML = rowsHTML(); showPage(curPage); }

  function make(rootEl) {
    var inc = ST.rows.filter(function (r) { return r.include; });
    if (!inc.length) { EE.fx.toast('明細を1行以上選んでください', { warn: true }); return; }
    var bad = inc.filter(function (r) { return !r.itemId || !(Number(r.qty) > 0) || (r.itemId === '__new' && !(r.name || '').trim()); });
    if (bad.length) {
      EE.fx.toast(bad.length + '行の「自社マスタとの対応」または数量が未設定です', { warn: true, ms: 3500 });
      var tr = document.querySelector('tr[data-r="' + ST.rows.indexOf(bad[0]) + '"]'); if (tr) { tr.scrollIntoView({ block: 'center', behavior: 'smooth' }); EE.fx.shake(tr); }
      return;
    }
    var newItems = 0;
    var rows = inc.map(function (r) {
      var itemId = r.itemId;
      if (itemId === '__new') {
        var it = { id: EE.data.uid('itm'), code: 'IMP-' + String(EE.S.items.filter(function (x) { return /^IMP-/.test(x.code); }).length + 1).padStart(3, '0'),
          category: 'other', kind: 'construction', name: r.name.trim(), spec: '', unit: r.unit || '式', unitPrice: Math.round(Number(r.unitPrice) || 0), unitCost: 0,
          taxCategory: 'std10', costType: 'other', active: true, synonyms: [], stdQty: 1, description: '取り込み：' + ST.file.name, supplier: '', contractor: '', note: '原価未登録',
          updatedAt: EE.data.today(), priceHistory: [{ from: EE.data.today(), unitPrice: Math.round(Number(r.unitPrice) || 0), unitCost: 0 }] };
        EE.S.items.push(it); itemId = it.id; newItems++;
      } else if (r.name && P_key(r.name) !== P_key(U.findItem(itemId).name)) {
        // 書類の表記を同義語として覚える（次回からその表記でも照合できる）
        var m = U.findItem(itemId);
        if ((m.synonyms || []).indexOf(r.name.trim()) < 0 && r.name.trim().length <= 30) m.synonyms = (m.synonyms || []).concat([r.name.trim()]);
      }
      var row = { itemId: itemId, qty: Number(r.qty), include: true, source: 'import' };
      if (ST.priceMode === 'source' && r.unitPrice != null) { row.unitPrice = Math.round(Number(r.unitPrice)); row.priceSource = { type: 'import', importId: ST.importId }; row.priceDate = EE.data.today(); }
      return row;
    });
    var custId = document.getElementById('r-cust').value;
    if (custId === '__new') {
      var F = ST.result.fields;
      var c = { id: EE.data.uid('cus'), kind: /(株式会社|有限会社|合同会社|御中)/.test(F.customerName + (F.honorific || '')) ? 'corp' : 'person', name: F.customerName, honorific: F.honorific || '様', contact: '', zip: '', address: '', tel: '', email: '' };
      EE.S.customers.push(c); custId = c.id;
    }
    U.commit();
    if (ST.importId) EE.filestore.get(ST.importId).then(function (rec) { if (rec) { rec.pendingDoc = true; EE.filestore.put(rec); } }).catch(function () {});
    var T = ST.result.totals;
    EE.views.quick.openDraft({ rows: rows, customerId: custId, title: document.getElementById('r-title').value,
      importInfo: { importId: ST.importId, fileName: ST.file.name, docType: ST.result.docType, statedSubtotal: ST.priceMode === 'source' ? T.subtotal : null, statedTotal: T.total, number: ST.result.fields.number },
      notes: '', sourceLabel: '取り込み「' + ST.file.name + '」から作成（' + ({ 'pdf-text': 'PDFの文字', 'pdf-ocr': 'PDF・OCR', 'image-ocr': '画像・OCR' }[ST.method]) + '）' });
    if (newItems) EE.fx.toast(newItems + '件を新しいマスタ（IMP-）として登録しました。原価は未登録です', { ms: 4000 });
  }
  function P_key(s) { return EE.parse.key(s); }

  EE.views = EE.views || {};
  EE.views.importer = { render: render, sniff: sniff };
})(this);
