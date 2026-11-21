/*
 * 見積を「次へ」で進めて作る（#/w）の確認（node oubi/tests/web-wizard.js）
 *   ホームの大きなボタン → 1 新しい工事（名前だけ）→ 2 テンプレート → 3 数量を ＋ → 4 できあがり
 *   文章からも作れる／左のメニューは7項目だけ・細かい画面は見出しの下のタブ
 */
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
const openWeb = require('./_web');
const OUT = path.join(__dirname, '..', 'screenshots') + '/';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ok = (c, m) => { assert.ok(c, m); console.log('✓ ' + m); };
  const watch = p => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); }); };

  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const sp = vp.width < 500, tag = sp ? '（スマホ）' : '';
    const p = await openWeb(b, { viewport: vp, wait: 3500 }); watch(p);
    // ホーム
    ok((await p.$eval('.launch .lt-main b', b => b.textContent)) === (sp ? '営業に出る' : '見積を作る') && (await p.$$('.launch .launch-btn2')).length === 3, 'ホームの主役は1つ（' + (sp ? 'スマホ＝営業に出る' : 'パソコン＝見積を作る') + '）、ほかの3つは普通のボタン' + tag);
    if (!sp) {
      ok((await p.$$('.nav-child')).length === 0 && (await p.$$('.nav-item')).length === 7, '左のメニューは7項目だけ（細かい項目は出さない）');
      await p.click('.nav-item[data-nav="settings"]'); await p.waitForTimeout(1500);
      ok((await p.$$eval('#sectabs a', a => a.map(x => x.textContent))).length >= 8 && !(await p.isVisible('#set-tabs')), '設定を開くと、細かい画面は見出しの下のタブに（中のタブと二重にしない）');
      await p.click('#sectabs a:has-text("計算式")'); await p.waitForTimeout(1200);
      ok(/#\/settings\/formulas/.test(p.url()) && /計算式/.test(await p.textContent('#sectabs a.on')), 'タブで画面が変わり、今いる所が光る');
      await p.evaluate(() => { location.hash = '#/home'; }); await p.waitForTimeout(1200);
      ok(await p.$eval('#sectabs', e => e.hidden), 'ホームにはタブを出さない');
    }
    // 1 工事
    await p.click('.launch .lt-est'); await p.waitForTimeout(1200);
    ok(/#\/w$/.test(p.url()) && /どの工事の見積ですか/.test(await p.textContent('#view')), '「見積を作る」→ ステップ1「どの工事の見積ですか？」' + tag);
    ok(await p.$eval('[data-wz="next"]', b => b.disabled), '選ぶまでは「次へ」を押せない');
    await p.fill('#wz-cust', '山田 太郎'); await p.fill('#wz-title', '外壁塗装');
    await p.click('[data-wz="next"]'); await p.waitForTimeout(2500);
    ok(/#\/w\/2/.test(p.url()), '名前を入れて「次へ」で、工事を作ってステップ2へ');
    const pj = await p.evaluate(() => EE.S.projects.find(x => x.name === '外壁塗装'));
    ok(!!pj && await p.evaluate(() => OUBI_LINK.frame().contentWindow.OUBI.cases().some(c => c.lead.customer === '山田 太郎')), '工事は業務管理の工事としても登録される');
    // 2 中身
    await p.click('[data-mode="tpl"]'); await p.waitForTimeout(500);
    await p.click('[data-tpl]'); await p.waitForTimeout(500);
    await p.click('[data-wz="next"]'); await p.waitForTimeout(1500);
    ok(/#\/w\/3/.test(p.url()) && (await p.$$('.wz-table tbody tr')).length >= 1, 'テンプレートを選んで「明細を作る」→ ステップ3に明細が並ぶ');
    // 3 金額
    const t0 = await p.evaluate(() => EE.ui.calcDoc(EE.S.documents[EE.S.documents.length - 1]).total);
    const q0 = await p.$eval('.wz-table tbody tr [data-qty]', e => Number(e.value));
    await p.click('.wz-table tbody tr [data-q="1"]'); await p.waitForTimeout(600);
    const q1 = await p.$eval('.wz-table tbody tr [data-qty]', e => Number(e.value));
    const t1 = await p.evaluate(() => EE.ui.calcDoc(EE.S.documents[EE.S.documents.length - 1]).total);
    ok(q1 === q0 + 1 && t1 > t0 && /合計（税込）/.test(await p.textContent('.wz-sum')), '＋で数量が増え、合計も計算し直される（' + t0 + ' → ' + t1 + '）');
    if (!sp) await p.screenshot({ path: OUT + 'web-wizard-3.png' });
    await p.click('[data-wz="next"]'); await p.waitForTimeout(1200);
    ok(/できあがりました/.test(await p.textContent('#view')) && await p.isVisible('[data-wz="pdf"]'), 'ステップ4「できあがり」：PDF・くわしく編集・一覧');
    if (sp) await p.screenshot({ path: OUT + 'web-wizard-4-mobile.png' });
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), '横にはみ出さない' + tag);
    // 文章から（もう1つ作る）
    if (!sp) {
      await p.click('[data-wz="again"]'); await p.waitForTimeout(1200);
      await p.click('[data-pj]'); await p.waitForTimeout(400); await p.click('[data-wz="next"]'); await p.waitForTimeout(1000);
      await p.click('[data-mode="text"]'); await p.waitForTimeout(400);
      await p.fill('#wz-text', '外壁塗装 延床30坪。足場、高圧洗浄、シリコン上塗り'); await p.click('[data-wz="next"]'); await p.waitForTimeout(1500);
      ok((await p.$$('.wz-table tbody tr')).length >= 2, '文章で書いても、明細ができる（' + (await p.$$('.wz-table tbody tr')).length + ' 行）');
      await p.click('[data-wz="next"]'); await p.waitForTimeout(800);
      await p.click('[data-wz="pdf"]'); await p.waitForTimeout(2200);
      ok(/#\/edit\//.test(p.url()) && await p.isVisible('.overlay'), '「送る前のチェックをしてPDFを出す」で、いつもの送る前のチェックが開く');
    }
    await p.close();
  }
  console.log(errs.length ? 'ERRORS: ' + errs.join(' / ') : 'web-wizard: ok'); await b.close();
  if (errs.length) process.exit(1);
})();
