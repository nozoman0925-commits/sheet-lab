/*
 * 見積書PDF（帳票）の確認：明細 5・20・40 行の見積を、印刷と同じ形で PDF にする（node oubi/tests/pdf-sheet.js <出力先フォルダ> [名前の頭]）
 *   できた PDF は pdftoppm で画像にして目で確かめる。ページ数・余白・ページ番号の有無も数える。
 */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { execSync } = require('child_process');
const openWeb = require('./_web');
const OUT = process.argv[2] || path.join(__dirname, '..', 'screenshots', 'pdf'); const PRE = process.argv[3] || 'sheet';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await openWeb(b, { wait: 3500 });
  await p.evaluate(() => {
    const o = OUBI_LINK.frame().contentWindow.OUBI; const c = o.makeCase({ customer: '山田 太郎', addr: '東京都町田市森野1-1-1', tel: '090-1111-2222' }); c.work.title = '山田様邸 外壁塗装工事'; c.lead.siteAddr = '東京都町田市森野1-1-1'; o.touch(c);
  });
  await p.waitForTimeout(2500);
  for (const n of [5, 20, 40]) {
    await p.evaluate(n => {
      const s = EE.S, pj = s.projects[0], d = EE.data.newEstimate(s, { projectId: pj.id, customerId: pj.customerId, title: pj.name });
      for (let i = 0; i < n; i++) { const it = s.items[i % s.items.length]; d.lines.push(EE.data.lineFromItem(it, (i % 7) + 1 + (i % 3) * 0.5)); }
      d.adjustments = [{ id: 'a1', type: 'overhead', label: '諸経費', mode: 'rate', rateBp: 500, scope: 'all' }, { id: 'a2', type: 'discount', label: 'お値引き', mode: 'amount', amount: 12000, taxCategory: 'std10' }];
      d.notes = '・工期は約2週間を予定しています。\n・足場の設置期間中は、近隣へご挨拶いたします。';
      const pr = document.getElementById('print-root'); pr.innerHTML = EE.print.sheetHTML(d);
    }, n);
    await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(400);
    const file = path.join(OUT, PRE + '-' + n + '.pdf');
    await p.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
    await p.emulateMedia({ media: 'screen' });
    const info = execSync('pdfinfo "' + file + '"').toString(); const pages = Number((/Pages:\s+(\d+)/.exec(info) || [])[1]);
    execSync('pdftoppm -r 60 -png "' + file + '" "' + path.join(OUT, PRE + '-' + n) + '"');
    const txt = execSync('pdftotext -layout "' + file + '" -').toString();
    console.log(n + '行：' + pages + 'ページ・ページ番号 ' + (/\b1\s*\/\s*\d/.test(txt) ? 'あり' : 'なし') + '・2ページ目の見出し ' + (pages > 1 && txt.split('\f')[1] && /山田/.test(txt.split('\f')[1].slice(0, 300)) ? 'あり' : 'なし'));
  }
  await b.close();
})();
