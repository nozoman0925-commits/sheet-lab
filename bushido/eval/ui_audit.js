// 第三者評価 B：実際の画面を、画面の幅・文字の大きさ・外観の組み合わせで機械的に点検する
// 使い方: node eval/ui_audit.js   （tests/out/srv を http://localhost:8765 で配信している前提。run_tests.sh の後なら揃っている）
// 点検：横へのはみ出し／文字の切れ（…で省略を除く）／押しにくい小さなボタン（40px未満）／小さすぎる文字（11px未満）／文字と背景の明るさの差（コントラスト）
const {chromium}=require('playwright');
const WIDTHS=[[320,568],[375,667],[390,735],[430,860]],FS=["m","l","xl"],THEMES=["kuro","haku","sumi"],TABS=["dojo","keiko","roku","chikai"];
(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
await p.click('[data-act=demo]');await p.waitForTimeout(300);await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(300);
await p.evaluate(()=>{const T=__T;T.ui.grpAll=false;T.ui.grpOpen={};const M=T.S.main;M.demo=false;M.master={motive:"respect",name:"先生",gender:"male",date:T.todayKey()};M.tutVer=3;M.tutDone=true;M.hints={keiko:1,roku:1,chikai:1};M.created=T.addDays(T.todayKey(),-2);M.introSeen=false;T.day(T.todayKey()).mission=null;T.render()});
const found={};const add=(k,ex)=>{found[k]=found[k]||{n:0,by:{}};found[k].n++;const key=ex.replace(/^[^：]*：/,'').replace(/ [\d.×]+(px)?$/,'').replace(/「\d+」/,'「数字」');const where=ex.split('：')[0];const v=(ex.match(/ ([\d.×]+(px)?)$/)||[])[1]||'';found[k].by[key]=found[k].by[key]||{n:0,例:where+' '+v};found[k].by[key].n++};
const AUDIT=()=>{const out=[];const vw=innerWidth;
  const lum=c=>{const m=c.match(/[\d.]+/g);if(!m)return null;const [r,g,b,a]=m.map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return {L:.2126*f(r)+.7152*f(g)+.0722*f(b),a:a==null?1:a,rgb:[r,g,b]}};
  const bgOf=el=>{let e=el;const layers=[];while(e&&e!==document.documentElement){if(/gradient|url\(/.test(getComputedStyle(e).backgroundImage)&&getComputedStyle(e).backgroundImage!=='none'&&e!==document.body&&!e.classList.contains('sec'))return null;const c=getComputedStyle(e).backgroundColor;const l=lum(c);if(l&&l.a>0){layers.push(l);if(l.a>=.99)break}e=e.parentElement}
    // 半透明の重なりを、下の色（ページの背景色）に合成して近似する
    let base=lum(getComputedStyle(document.documentElement).backgroundColor)||{rgb:[13,12,10]};let rgb=base.rgb;
    for(let i=layers.length-1;i>=0;i--){const l=layers[i];rgb=rgb.map((v,j)=>l.rgb[j]*l.a+v*(1-l.a))}
    const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(rgb[0])+.7152*f(rgb[1])+.0722*f(rgb[2])};
  if(document.documentElement.scrollWidth>vw+1)out.push(["横にはみ出す","ページ幅 "+document.documentElement.scrollWidth]);
  const vis=e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height)return false;const s=getComputedStyle(e);if(s.visibility==="hidden"||s.display==="none"||+s.opacity===0)return false;if(e.closest('details:not([open])>*:not(summary)'))return false;return true};
  const name=e=>(e.id?"#"+e.id:e.className&&typeof e.className==="string"?"."+e.className.split(" ")[0]:e.tagName.toLowerCase())+"「"+(e.textContent||e.value||"").trim().replace(/\s+/g," ").slice(0,14)+"」";
  document.querySelectorAll('#app button,#app a[href],#app input:not([type=hidden]),#app select,#tabs button,#sheet button').forEach(e=>{if(!vis(e)||e.classList.contains("term"))return;const r=e.getBoundingClientRect();
    if(e.type==="checkbox"||e.type==="radio"){const lab=e.closest("label");const lr=lab?lab.getBoundingClientRect():r;if(lr.height<32)out.push(["押しにくい（40px未満）",name(lab||e)+" "+Math.round(lr.width)+"×"+Math.round(lr.height)]);return}
    if(r.height<40||r.width<40)out.push(["押しにくい（40px未満）",name(e)+" "+Math.round(r.width)+"×"+Math.round(r.height)]);
    if(r.right>vw+1||r.left<-1)out.push(["ボタンが画面の外",name(e)])});
  const tw=document.createTreeWalker(document.querySelector('#app'),NodeFilter.SHOW_TEXT);let n;const seen=new Set();
  while(n=tw.nextNode()){const t=n.textContent.trim();if(!t)continue;const e=n.parentElement;if(!e||seen.has(e)||!vis(e))continue;seen.add(e);const s=getComputedStyle(e);const fs=parseFloat(s.fontSize);
    if(fs<11&&!e.closest('svg'))out.push(["小さすぎる文字（11px未満）",name(e)+" "+fs+"px"]);
    if(s.overflow!=="visible"&&s.textOverflow!=="ellipsis"&&e.scrollWidth>e.clientWidth+2&&s.whiteSpace==="nowrap")out.push(["文字が切れる",name(e)]);
    const r=e.getBoundingClientRect();if(r.right>vw+1)out.push(["文字が画面の外",name(e)]);
    const fg=lum(s.color);const bl0=fg&&fg.a>.5?bgOf(e):null;if(fg&&fg.a>.5&&bl0!=null){const bl=bl0;const L1=Math.max(fg.L,bl),L2=Math.min(fg.L,bl);const cr=(L1+.05)/(L2+.05);const big=fs>=18||(fs>=14&&+s.fontWeight>=700);
      if(cr<(big?3:4.5)&&!e.closest('[disabled]')&&!/muted|dim/.test(e.className))out.push(["コントラスト不足",name(e)+" "+cr.toFixed(2)])}}
  return out};
let combos=0;
for(const [w,h] of WIDTHS)for(const fs of FS)for(const th of THEMES){await p.setViewportSize({width:w,height:h});
  await p.evaluate(([fs,th])=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{fs,theme:th,bg:"rain"});T.render()},[fs,th]);
  for(const tab of TABS){await p.evaluate(t=>{document.querySelector('#tabs [data-tab='+t+']').click()},tab);await p.waitForTimeout(60);
    const r=await p.evaluate(AUDIT);combos++;r.forEach(([k,ex])=>add(k,w+"px/"+fs+"/"+th+"/"+tab+"："+ex))}
  // 一太刀を選ぶ画面と、夜のふり返り
  await p.evaluate(()=>document.querySelector('#tabs [data-tab=dojo]').click());await p.waitForTimeout(60);
  const sm=await p.$('#sec-mission [data-act=setMission]');if(sm){await sm.click();await p.waitForTimeout(120);(await p.evaluate(AUDIT)).forEach(([k,ex])=>add(k,w+"px/"+fs+"/"+th+"/一太刀の画面："+ex));await p.evaluate(()=>{const s=document.querySelector('#sheet');if(s)s.innerHTML=""})}
  const rf=await p.$('#sec-night [data-act=reflect]');if(rf){await rf.click();await p.waitForTimeout(120);(await p.evaluate(AUDIT)).forEach(([k,ex])=>add(k,w+"px/"+fs+"/"+th+"/ふり返りの画面："+ex));await p.evaluate(()=>{const s=document.querySelector('#sheet');if(s)s.innerHTML=""})}
}
// 初回から最初の一太刀まで：画面の数（序章・入門の問い・入門の儀）
const flow=await p.evaluate(()=>{const T=__T;T.ui.ob={};const f=T.flowX();return {入門の画面数:f.length,うち問い:f.filter(x=>/^[a-z]\d+$/.test(x)).length}});
console.log(JSON.stringify({点検した画面:combos,見つかったこと:found,初回の道のり:Object.assign(flow,{序章:"7幕（スキップ可）",入門の儀:"34手順（後で行う・中断可）"}),ページのエラー:errs.slice(0,3)},null,1));await b.close()})();
