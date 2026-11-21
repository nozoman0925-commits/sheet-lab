/*
 * 動きの文法の監査（node oubi/tests/web-motion.js）
 *   時間は 0.15秒（反応）／0.25秒（画面内の変化）／0.4秒（画面の切り替え）の3つだけ。曲線は cubic-bezier(0.2, 0, 0, 1) の1つだけ。
 *   例外：起動の演出（splash）・背景のオーロラ・数字のカウントアップ。
 *   実際に開いた画面で、使われている CSS の transition / animation と、JS（Element.animate）の秒数・曲線を数える。
 *   画面を順に開き、ボタンを押し、知らせを出し、ページを切り替えて、そのあいだに走った動きを全部集める。
 */
const { chromium } = require('playwright'); const openWeb = require('./_web');
const { ROUTES } = require('./web-scroll');
const OK_MS = [150, 250, 400], CURVE = 'cubic-bezier(0.2, 0, 0, 1)';
const EXCEPT = /aur-|splash|crest|count|sk-shimmer/;   // 例外の名前（オーロラ・起動・数字）
function hook() {
  // JS の動き（Element.animate）を記録する
  if (window.__mot) return; window.__mot = [];
  const A = Element.prototype.animate;
  Element.prototype.animate = function (k, o) {
    const d = typeof o === 'number' ? o : (o && o.duration) || 0, e = (o && o.easing) || 'linear', del = (o && o.delay) || 0;
    window.__mot.push({ src: 'JS', d, e, del, who: this.tagName.toLowerCase() + '.' + [...this.classList].slice(0, 2).join('.'), it: o && o.iterations });
    return A.apply(this, arguments);
  };
}
function cssScan() {
  const out = []; const seen = new Set();
  document.querySelectorAll('*').forEach(el => {
    [null, '::before', '::after'].forEach(ps => {
      const cs = getComputedStyle(el, ps);
      const td = cs.transitionDuration.split(',').map(s => parseFloat(s) * 1000), tf = cs.transitionTimingFunction.split(/,(?![^(]*\))/).map(s => s.trim());
      const tp = cs.transitionProperty;
      if (td.some(x => x > 0)) td.forEach((d, i) => { if (!d) return; const k = 'T|' + d + '|' + (tf[i] || tf[0]); if (seen.has(k + el.className)) return; seen.add(k + el.className); out.push({ src: 'CSS移り変わり', d, e: tf[i] || tf[0], who: el.tagName.toLowerCase() + (ps || '') + '.' + String(el.className || '').split(' ').slice(0, 2).join('.'), prop: tp }); });
      const an = cs.animationName; if (an && an !== 'none') {
        const ad = cs.animationDuration.split(',').map(s => parseFloat(s) * 1000), af = cs.animationTimingFunction.split(/,(?![^(]*\))/).map(s => s.trim());
        an.split(',').map(s => s.trim()).forEach((n, i) => { const k = 'A|' + n + '|' + ad[i]; if (seen.has(k)) return; seen.add(k); out.push({ src: 'CSS動き', name: n, d: ad[i] || ad[0], e: af[i] || af[0], who: el.tagName.toLowerCase() + (ps || '') + '.' + String(el.className || '').split(' ').slice(0, 2).join('.'), it: cs.animationIterationCount }); });
      }
    });
  });
  return out;
}
(async () => {
  const b = await chromium.launch();
  const all = [];
  for (const vp of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
    const ctx = await b.newContext({ viewport: vp }); await ctx.addInitScript(hook);
    const p = await openWeb(b, { context: ctx, wait: 3500, old: true }); await p.waitForTimeout(2000);
    const ids = await p.evaluate(() => { const o = OUBI_LINK.frame().contentWindow.OUBI; const c = o.cases()[0]; const d = EE.S.documents.find(x => x.lines.length > 3 && x.status !== 'issued') || EE.S.documents[0]; return { c: c && c.id, d: d && d.id }; });
    for (const r0 of ROUTES) {
      const r = r0.replace('C', ids.c).replace('/D', '/' + ids.d);
      await p.evaluate(h => { location.hash = h; }, r); await p.waitForTimeout(1300);
      // 押す・乗せる（反応の動きを起こす）
      const btn = await p.$('#view .btn:not([disabled])'); if (btn) { await btn.hover().catch(() => {}); await p.mouse.down().catch(() => {}); await p.mouse.up().catch(() => {}); }
      const inF = await p.evaluate(() => document.body.classList.contains('ob-on'));
      const fr = p.frames().find(f => /oubi\.html/.test(f.url()));
      if (inF && fr) { const fb = await fr.$('main button:not([disabled])'); if (fb) await fb.hover().catch(() => {}); }
      const css = await p.evaluate(cssScan); css.forEach(x => all.push(Object.assign({ where: r0 + ' 桜ミツ側' }, x)));
      if (inF && fr) { const c2 = await fr.evaluate(cssScan); c2.forEach(x => all.push(Object.assign({ where: r0 + ' 業務管理側' }, x))); const j2 = await fr.evaluate(() => (window.__mot || []).splice(0)); j2.forEach(x => all.push(Object.assign({ where: r0 + ' 業務管理側' }, x))); }
      const js = await p.evaluate(() => (window.__mot || []).splice(0)); js.forEach(x => all.push(Object.assign({ where: r0 + ' 桜ミツ側' }, x)));
    }
    // 知らせ・元に戻す（削除）・ページ切り替え
    await p.evaluate(() => EE.fx.toast('テスト')); await p.waitForTimeout(400);
    const js = await p.evaluate(() => (window.__mot || []).splice(0)); js.forEach(x => all.push(Object.assign({ where: '知らせ' }, x)));
    await ctx.close();
  }
  // 集計：秒数・曲線ごと
  const norm = e => String(e || '').replace(/\s+/g, ' ').replace(/cubic-bezier\(([^)]*)\)/, (m, a) => 'cubic-bezier(' + a.split(',').map(x => String(parseFloat(x))).join(', ') + ')');
  const isEx = x => EXCEPT.test(x.name || '') || EXCEPT.test(x.who || '') || /aurora|splash/.test(x.who || '');
  const rows = {}; let bad = 0; const badEx = {};
  all.forEach(x => {
    const d = Math.round(x.d), e = norm(x.e), ex = isEx(x);
    const okD = OK_MS.includes(d) || (x.it === 'infinite' && x.name === 'ee-spin' && d === 400), okE = e === CURVE || e === 'linear' && /spin/.test(x.name || '');
    const k = (ex ? '（例外）' : '') + x.src + '｜' + d + 'ms｜' + e + (x.name ? '｜' + x.name : '');
    rows[k] = (rows[k] || 0) + 1;
    if (!ex && !(okD && okE)) { bad++; (badEx[k] = badEx[k] || new Set()).add(x.who + ' @' + x.where); }
  });
  console.log('## 使われている秒数・曲線（種類ごとの回数）');
  Object.keys(rows).sort().forEach(k => console.log('  ' + (/（例外）/.test(k) ? '例外 ' : (badEx[k] ? '×　 ' : '○　 ')) + k + '：' + rows[k]));
  console.log('## 文法から外れている箇所：' + bad);
  Object.keys(badEx).slice(0, 40).forEach(k => console.log('   ' + k + '　例 ' + [...badEx[k]].slice(0, 3).join(' / ')));
  await b.close();
})();
