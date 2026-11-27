/*
 * 文字の重なり・はみ出しを探す（node oubi/tests/web-overlap.js [幅x高さ ...]）
 *   各画面（業務管理の画面・スマホのページ分け・見積の行を広げた状態も）を開き、次を数える：
 *   1 文字と文字が重なっている（別々の要素の文字の箱が重なる）
 *   2 輪のグラフ（入金率・粗利率など）の数字が、輪の内側に収まっていない
 *   3 枠からはみ出して切れている文字（「…」で省くと決めたもの・2行で止めるものは除く）
 *   4 横に画面の外へはみ出している文字
 */
const { chromium } = require('playwright'); const openWeb = require('./_web');
const { ROUTES } = require('./web-scroll');
const SIZES = (process.argv.slice(2).length ? process.argv.slice(2) : ['1920x1080', '1440x900', '1366x768', '1280x720', '390x844']).map(s => { const [w, h] = s.split('x').map(Number); return { width: w, height: h }; });
const EXTRA = ['#/w/1', '#/w/2', '#/settings/data', '#/docs/draft', '#/docs/issued'];

function scan() {
  const out = [];
  const vis = el => { if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true })) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const anyHidden = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return true; } return false; };
  const label = el => (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + '「' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24) + '」');
  // 見えている範囲（はみ出しを切る祖先の箱）で切る
  const clipRect = (el, r) => { let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom; for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (/(hidden|auto|scroll|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY)) { const b = e.getBoundingClientRect(); x1 = Math.max(x1, b.left); y1 = Math.max(y1, b.top); x2 = Math.min(x2, b.right); y2 = Math.min(y2, b.bottom); } } return x2 > x1 && y2 > y1 ? { left: x1, top: y1, right: x2, bottom: y2 } : null; };
  // 文字を持つ要素（自分の直下に文字がある）と、その文字の箱
  const items = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; const seen = new Set();
  while ((n = walker.nextNode())) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement; if (!el || seen.has(el) || /^(SCRIPT|STYLE|OPTION|TEXTAREA|NOSCRIPT|TITLE)$/.test(el.tagName)) continue;
    if (el.closest('svg, [aria-hidden="true"], .sr-only, .print-root, #print-root, .toasts, datalist, select')) continue;
    if (!vis(el) || anyHidden(el)) continue;
    seen.add(el);
    const rg = document.createRange(); rg.selectNodeContents(el);
    const rs = [...rg.getClientRects()].filter(r => r.width > 1 && r.height > 1).map(r => clipRect(el, r)).filter(Boolean);
    if (rs.length) items.push({ el, rs });
  }
  // 1 文字と文字の重なり
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    let hit = 0;
    a.rs.forEach(r1 => b.rs.forEach(r2 => { const w = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left), h = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top); if (w > 2 && h > 3) hit = Math.max(hit, w * h); }));
    if (hit > 12) {
      // 上に重ねて出すもの（知らせ・ツールチップ・開いた一覧）と、その下のものは数えない
      const top = e => e.closest('.modal, .overlay, .picker-pop, .viz-tip, .palette, [role="dialog"], [role="listbox"], .mnav-more');
      if (!!top(a.el) !== !!top(b.el)) continue;
      out.push(['重なり', label(a.el) + ' × ' + label(b.el)]);
    }
  }
  // 2 輪のグラフの数字
  document.querySelectorAll('.ring').forEach(r => {
    const svg = r.querySelector('svg'), num = r.querySelector('.ring-num b, .ring-num'); if (!svg || !num || !vis(svg)) return;
    const s = svg.getBoundingClientRect(), c = svg.querySelector('.ring-val') || svg.querySelector('circle');
    const R = Number(c.getAttribute('r')) || 46, sw = parseFloat(getComputedStyle(c).strokeWidth) || 9, vb = (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width) || 110;
    const inner = (R - sw / 2) * 2 * (s.width / vb);   // 輪の内側の直径（画面上の px）
    const rg = document.createRange(); rg.selectNodeContents(num); const t = rg.getBoundingClientRect();
    const cx = s.left + s.width / 2, cy = s.top + s.height / 2;
    const far = Math.max(...[[t.left, t.top], [t.right, t.top], [t.left, t.bottom], [t.right, t.bottom]].map(([x, y]) => Math.hypot(x - cx, y - cy)));
    if (far > inner / 2 - 4) out.push(['輪の数字', label(num) + '：文字の角が輪の線に近すぎる・かかる（内側の半径 ' + Math.round(inner / 2) + 'px・文字の角まで ' + Math.round(far) + 'px）']);
  });
  // 3 切れている文字（…で省く・2行で止めると決めたものは除く）
  items.forEach(({ el }) => {
    const cs = getComputedStyle(el);
    if (cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none')) return;
    if (!/(hidden|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY)) return;
    if (el.clientWidth <= 2 || el.clientHeight <= 2) return;   // 読み上げ用の隠し文字（1×1）
    if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 3) out.push(['切れている', label(el) + '（' + el.scrollWidth + '×' + el.scrollHeight + ' > ' + el.clientWidth + '×' + el.clientHeight + '）']);
  });
  // 5 外側の枠で横に切られている文字（横に動かせる枠・「…」で省くもの・読み上げ用の隠し文字は除く）
  items.forEach(({ el }) => {
    const r = el.getBoundingClientRect(); if (r.width <= 2) return;
    const cs0 = getComputedStyle(el); if (cs0.textOverflow === 'ellipsis' || (cs0.webkitLineClamp && cs0.webkitLineClamp !== 'none')) return;
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (/(auto|scroll)/.test(cs.overflowX)) break;   // 横に動かせる枠（タブの列など）は、見えていなくても切れていない
      if (cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none')) break;
      if (/(hidden|clip)/.test(cs.overflowX)) { const b = e.getBoundingClientRect(); if (r.right > b.right + 2 || r.left < b.left - 2) out.push(['枠で切れている', label(el) + '（文字の右端 ' + Math.round(r.right) + ' > 枠の右端 ' + Math.round(b.right) + '）']); break; }
    }
  });
  // 6 細すぎて1〜2文字ずつ折り返している文字（縦に潰れている）
  items.forEach(({ el, rs }) => {
    const t = (el.textContent || '').trim(), fs = parseFloat(getComputedStyle(el).fontSize) || 14;
    if (t.length < 4 || rs.length < 3) return;
    const lines = new Set(rs.map(r => Math.round(r.top))).size;
    if (lines >= 3 && Math.max(...rs.map(r => r.width)) < fs * 2.6) out.push(['潰れている', label(el) + '（' + lines + '行・幅 ' + Math.round(Math.max(...rs.map(r => r.width))) + 'px）']);
  });
  // 7 見出し・ボタンの短い言葉が途中で折り返している（「月／順」「入金と粗／利」）
  items.forEach(({ el, rs }) => {
    if (!el.closest('button, .btn, h1, h2, h3, .panel-h, .seg, .ring-label, .w-title')) return;
    const t = (el.textContent || '').trim(); if (t.length > 12 || t.length < 2) return;
    // 自分の直下の文字だけで行を数える（アイコンの高さの違いを行と数えない）
    const tops = []; el.childNodes.forEach(c => { if (c.nodeType !== 3 || !c.textContent.trim()) return; const rg = document.createRange(); rg.selectNodeContents(c); [...rg.getClientRects()].forEach(r => { if (r.width > 1) tops.push(r.top); }); });
    tops.sort((x, y) => x - y); let lines = tops.length ? 1 : 0; for (let i = 1; i < tops.length; i++) if (tops[i] - tops[i - 1] > 6) lines++;
    if (lines >= 2) out.push(['短い言葉の折り返し', label(el)]);
  });
  // 4 画面の外へはみ出す文字
  items.forEach(({ el, rs }) => { if (rs.some(r => r.right > innerWidth + 2 || r.left < -2)) out.push(['画面の外', label(el)]); });
  const uniq = {}; out.forEach(x => { uniq[x[0] + x[1]] = x; });
  return Object.values(uniq);
}

(async () => {
  const b = await chromium.launch(); const all = [];
  for (const vp of SIZES) {
    const p = await openWeb(b, { viewport: vp, wait: 3500, old: true }); await p.waitForTimeout(2000);
    const ids = await p.evaluate(() => { const o = OUBI_LINK.frame().contentWindow.OUBI; const c = o.cases()[0]; const d = EE.S.documents.find(x => x.lines.length > 3 && x.status !== 'issued') || EE.S.documents[0]; return { c: c && c.id, d: d && d.id }; });
    const routes = ROUTES.concat(EXTRA).concat(['#/edit/D?open']);
    for (const r0 of routes) {
      const r = r0.replace('C', ids.c).replace('/D', '/' + ids.d).replace('?open', '');
      await p.evaluate(h => { location.hash = h; }, r); await p.waitForTimeout(1600);
      await p.evaluate(() => { let t; while (window.EE && EE.ui && (t = EE.ui.topModal())) t.close(); });
      if (/\?open/.test(r0)) { await p.evaluate(() => { const b = document.querySelector('#line-body tr.ln [data-act="open"]'); if (b) b.click(); }); await p.waitForTimeout(400); }
      const inF = await p.evaluate(() => document.body.classList.contains('ob-on'));
      const fr = p.frames().find(f => /oubi\.html/.test(f.url()));
      const collect = async (tag) => {
        const res = inF && fr ? await fr.evaluate(scan) : await p.evaluate(scan);
        res.forEach(x => all.push({ size: vp.width + 'x' + vp.height, route: r0 + tag, kind: x[0], what: x[1] }));
      };
      // スマホのページ分け（pg-bar）は、ページごとに開いて調べる
      const pages = await (inF && fr ? fr : p).evaluate(() => [...document.querySelectorAll('.pg-bar button')].length);
      if (pages > 1) for (let k = 0; k < pages; k++) { await (inF && fr ? fr : p).evaluate(k => document.querySelectorAll('.pg-bar button')[k].click(), k); await p.waitForTimeout(350); await collect(' p' + (k + 1)); }
      else await collect('');
    }
    await p.close();
  }
  await b.close();
  const by = {}; all.forEach(x => { (by[x.kind] = by[x.kind] || []).push(x); });
  Object.keys(by).forEach(k => { console.log('## ' + k + '：' + by[k].length); by[k].slice(0, 60).forEach(x => console.log('   ' + x.size + ' ' + x.route + '  ' + x.what)); });
  console.log('合計 ' + all.length);
})();
