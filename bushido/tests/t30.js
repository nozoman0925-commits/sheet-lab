// 入門の儀（チュートリアル）の案内が、どの画面の大きさでも画面内に収まり、最後まで進めるか
const {chromium}=require('playwright');const SIZES=[[375,600],[390,735],[320,520]];
(async()=>{const b=await chromium.launch();const R=[];for(const [W,H] of SIZES){globalThis.__miss=0;const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
await p.click('[data-act=demo]');await p.waitForTimeout(500);
const run=async(label,minSteps)=>{globalThis.__miss=0;const bad=[];
let seen=new Set();for(let i=0;i<90;i++){const s=await p.evaluate(()=>{const c=document.querySelector('.tut-card');if(!c)return null;const r=c.getBoundingClientRect();const t=(document.querySelector('.tut-card h3,.tut-card b,.tut-card p')||{}).textContent||"";const tg=document.querySelector('.tut-target,[data-tut-on]');const tr=tg?tg.getBoundingClientRect():null;return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,t:(c.textContent||"").replace(/\s+/g," ").slice(0,40),step:window.__T.ui.tut,tr:tr?[tr.top,tr.bottom]:null}});
  if(!s){if((globalThis.__miss=(globalThis.__miss||0)+1)<6){await p.waitForTimeout(500);continue}break}globalThis.__miss=0;seen.add(s.step);const out=s.top<0||s.bottom>H||s.left<0||s.right>W;if(out){bad.push(JSON.stringify(s));}
  const nx=await p.$('.tut-card [data-tut=next]');if(nx){try{await nx.click({force:true,timeout:3000})}catch(e){const st=await p.evaluate(()=>{const c=document.querySelector(".tut-card");const r=c.getBoundingClientRect();const n=c.querySelector("[data-tut=next]").getBoundingClientRect();return JSON.stringify({card:[r.top,r.bottom,c.style.top,c.style.transform,c.className],next:[n.top,n.bottom],step:window.__T.ui.tut,sy:scrollY})});console.log("押せない",st);break}}else{const rr=await p.evaluate(()=>{const g=document.querySelector('.tut-ring');if(!g)return null;const r=g.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]});if(!rr)break;await p.mouse.click(rr[0],rr[1]);await p.waitForTimeout(250);const sh=await p.$('#sheet .grid2 [data-act=closeSheet]');}
  await p.waitForTimeout(450)}
const fin=await p.evaluate(()=>({tut:window.__T.ui.tut,n:(window.__T.ui.tutSteps||[]).length,done:window.__T.S.main.tutDone}));R.push((bad.length===0?"PASS ":"FAIL ")+W+"×"+H+"・"+label+"：案内が画面からはみ出さない | はみ出し"+bad.length+" "+(bad[0]||""));R.push((fin.done&&fin.tut==null&&seen.size>=minSteps?"PASS ":"FAIL ")+W+"×"+H+"・"+label+"：最後まで進められる | "+seen.size+"ステップ");};
await run("最初の入門の儀（短い版）",4);
await p.evaluate(()=>__T.A.tutStart());await p.waitForTimeout(500);
await run("全編（誓いの間から）",30);
if(errs.length)R.push("FAIL errors "+errs[0]);await p.close()}console.log(R.join("\n"));console.log("errors []");await b.close()})();
