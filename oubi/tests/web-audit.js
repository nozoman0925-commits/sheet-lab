/*
 * 桜ミツ版の「仕上がり」を数える（node oubi/tests/web-audit.js [見るもの]）
 *   money … 金額：等幅数字でない／表のセルで右揃えでない／「円」書き（¥ に統一）／小数2桁以上の％
 *   terms … 用語：「案件」が残っている／仕事の単位としての「現場」（場所を指すもの以外）
 *   buttons … 名詞だけのボタン（動詞で終わらない）
 *   empty … データ0件で開いたとき、何も無い・次に押すボタンが無い画面
 *   icons … アイコンの線の太さ（1.5 以外）・24 の格子でないもの
 * 桜ミツの画面と、枠の中の業務管理の画面の両方を見る。結果は数と例を出す。
 */
const { chromium } = require('playwright'); const openWeb = require('./_web');
const WHAT = process.argv[2] || 'all';
const ROUTES = ['#/home', '#/o/list', '#/o/case/C', '#/clients', '#/sites', '#/docs', '#/new', '#/new/text', '#/new/past', '#/new/template', '#/edit/D',
  '#/o/cal', '#/o/wb', '#/o/board', '#/finance', '#/o/dash', '#/analysis', '#/settings/items', '#/settings/packages', '#/settings/formulas', '#/settings/snippets', '#/settings/company', '#/settings/rules', '#/o/settings', '#/o/staff', '#/settings/features', '#/settings/data', '#/o/help'];
// ページの中で数える（document ごと）
function scan(what) {
  const out = { money: [], terms: [], buttons: [], icons: [] };
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden],.sheet,.paper,.cmp-sheet,svg,script,style'); };
  const own = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
  document.querySelectorAll('body *').forEach(e => {
    if (!vis(e)) return; const t = own(e); if (!t) return; const cs = getComputedStyle(e);
    if (/[¥￥]\s?-?[\d,]+|[\d,]{2,}\s?円|−¥/.test(t) && (what === 'money' || what === 'all')) {
      if (!/tabular-nums/.test(cs.fontVariantNumeric)) out.money.push('等幅でない: ' + e.tagName + '.' + [...e.classList].join('.') + ' 「' + t.slice(0, 24) + '」');
      const td = e.closest('td'); if (td && /^\s*[−-]?[¥￥][\d,]+\s*$/.test(t) && getComputedStyle(td).textAlign !== 'right' && getComputedStyle(td).textAlign !== 'end') out.money.push('右揃えでない: ' + td.tagName + ' 「' + t + '」');
      if (/\d\s?円/.test(t) && !/円(未満|以上|単位|ずつ|台)/.test(t)) out.money.push('「円」書き: 「' + t.slice(0, 30) + '」');
    }
    if ((what === 'money' || what === 'all') && /\d+\.\d{2,}\s?%/.test(t)) out.money.push('％の小数が2桁以上: 「' + t.slice(0, 30) + '」');
    if (what === 'terms' || what === 'all') {
      if (/案件/.test(t)) out.terms.push('「案件」: ' + t.slice(0, 40));
      if (/現場/.test(t) && !/現場(住所|の住所|の写真|写真|で|に|の様子|調査|管理費|監督|への|まで|の場所|に入|周辺|のもの)/.test(t) && !/(現地|今日行く現場|あなたの現場)/.test(t)) out.terms.push('「現場」: ' + t.slice(0, 40));
    }
    // 押して実行するボタンだけ（切り替え・絞り込み・タブ・選ぶもの・メニューは数えない）
    const isToggle = e.getAttribute('role') === 'tab' || e.hasAttribute('aria-pressed') || e.hasAttribute('aria-selected') || e.closest('.seg, .wbseg, .scope, .subtabs, .tabs, nav, [role=tablist], [role=group], .chips, .filt, .mnav, .pal-list, .mcal, .cal, .stepnav, .sl-res, .sl-cards, .res-pick, .help-list, .w-lib, .quick-row, .sheet-box, .heat, .ws-tabs, .control-bar select') || e.dataset.tab != null || e.dataset.sec != null || e.dataset.day != null || e.dataset.dayact != null || e.dataset.sort != null || e.dataset.f != null || e.dataset.hcat != null || e.dataset.mv != null || e.classList.contains('chipbtn') || e.classList.contains('dn');
    if ((what === 'buttons' || what === 'all') && !isToggle && (e.tagName === 'BUTTON' || (e.tagName === 'A' && e.classList.contains('btn')))) {
      const lab = (e.innerText || '').trim().replace(/\s+/g, ' ').replace(/\s*(Ctrl|⌘)\s?\S+$/, '').replace(/（[^）]*）$/, '');   // キーの案内・かっこの補足は除く
      if (lab && lab.length > 1 && !/(る|す|く|ぐ|む|ぶ|ぬ|う|つ|へ|に|を|開く|ます|して|する|戻す|消す|出す|入れる|追加|保存|確定|作成|閉じる|検索|一覧へ|次へ|前へ|›|‹|→|←)$/.test(lab) && !/^[\d\s/年月日時分（）()・+＋−\-%％:：.]+$/.test(lab) && lab.length < 16) out.buttons.push(lab);
    }
  });
  if (what === 'icons' || what === 'all') document.querySelectorAll('svg').forEach(s => {
    if (!vis(s.parentElement || s)) return; const vb = s.getAttribute('viewBox') || ''; const sw = s.getAttribute('stroke-width') || getComputedStyle(s).strokeWidth;
    if (s.closest('.crest, .brand-crest, .sheet-crest, .mon, .donut, .ring, .chart, .viz, .flow, [data-bars], .w-rings, .heat, .sparkline, .tdb, .spark, .kpi-spark, .won-crest, .case-band') || /mon/.test(s.innerHTML.slice(0, 40))) return;
    if (vb && vb !== '0 0 24 24') return out.icons.push('格子が24でない: ' + vb);
    if (sw && parseFloat(sw) !== 1.5) out.icons.push('線の太さ ' + sw);
  });
  return out;
}
(async () => {
  const b = await chromium.launch(); const p = await openWeb(b, { wait: 3500 });
  await p.evaluate(() => { const o = OUBI_LINK.frame().contentWindow.OUBI; const c = o.makeCase({ customer: '山田 太郎', tel: '090-1111-2222', addr: '町田市森野1-1' }); c.work.title = '山田様邸 外壁塗装工事'; o.touch(c); });
  await p.waitForTimeout(2000);
  const cid = await p.evaluate(() => OUBI_LINK.frame().contentWindow.OUBI.cases()[0].id);
  const did = await p.evaluate(cid => { const s = EE.S, pj = s.projects.find(x => x.id === cid), d = EE.data.newEstimate(s, { projectId: cid, customerId: pj.customerId, title: pj.name }); d.lines.push(EE.data.lineFromItem(s.items[0], 10)); d.lines.push(EE.data.lineFromItem(s.items[1], 2.5)); s.documents.push(d); EE.ui.commit(); return d.id; }, cid);
  await p.waitForTimeout(2500);
  const total = {}; const ex = {};
  for (const r0 of ROUTES) {
    const r = r0.replace('C', cid).replace('/D', '/' + did);
    await p.evaluate(h => { location.hash = h; }, r); await p.waitForTimeout(1600);
    const inFrame = await p.evaluate(() => document.body.classList.contains('ob-on'));
    const fr = p.frames().find(f => /oubi\.html/.test(f.url()));
    const res = await (inFrame ? fr : p).evaluate(scan, WHAT);
    Object.keys(res).forEach(k => { const v = [...new Set(res[k])]; total[k] = (total[k] || 0) + v.length; if (v.length) (ex[k] = ex[k] || []).push(r0 + '：' + v.slice(0, 6).join(' ｜ ')); });
  }
  Object.keys(total).forEach(k => { console.log('## ' + k + '：' + total[k]); (ex[k] || []).forEach(x => console.log('   ' + x.slice(0, 400))); });
  await b.close();
})();
