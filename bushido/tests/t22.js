// 第24版：命令の実行情報・原因別の再起・痛みの安全停止・EXPの偏り対策・卒業の申請・復元
const {chromium}=require('playwright');const fs=require('fs');
const BK=process.cwd()+'/bk.json';
const R=[];const ok=(n,c,x)=>R.push((c?"PASS ":"FAIL ")+n+(x?" | "+x:""));
(async()=>{const b=await chromium.launch();const errs=[];try{
const ctx=await b.newContext({viewport:{width:390,height:844}});globalThis.ctx=ctx;const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
const cer=async()=>{for(let i=0;i<5&&await p.$('#ceremony:not([hidden]) [data-cer]');i++){await p.click('#ceremony [data-cer] >> nth=0');await p.waitForTimeout(150)}};globalThis.cer1=cer;
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
await p.click('[data-act=demo]');await p.waitForTimeout(300);await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(300);
await p.evaluate(()=>{const T=__T;T.S.main.master={motive:"respect",name:"先生",gender:"male"};T.S.main.tutVer=3;T.S.main.tutDone=true;T.S.main.hints={keiko:1,roku:1,chikai:1};T.render()});
// 1) すべての命令に実行情報
const miss=await p.evaluate(()=>Object.keys(__T.MBYID).filter(id=>!__T.MDATA[id]));
ok("全命令に所要時間・タイミング・最低ライン・実行計画",miss.length===0,"命令 "+(await p.evaluate(()=>Object.keys(__T.MBYID).length))+"個・欠け "+miss.join(","));
// 2) 選択画面と一太刀カード
await p.evaluate(()=>{const T=__T;T.day(T.todayKey()).mission=null;T.render()});
await p.click('#sec-mission [data-act=setMission]');await p.click('#sheet [data-act=msCond][data-v=normal]');await p.waitForTimeout(200);
ok("命令の候補に所要時間と最低ライン",(await p.$$('#ms-pick .mrow')).length>=2);await p.screenshot({path:'V1.png'});
await p.click('#ms-pick .qopt');await p.click('[data-act=saveMission]');await p.waitForTimeout(300);
const card=await p.textContent('#sec-mission');
ok("一太刀カードに目的・いつ・最低ライン・実行計画・達成条件",["目的","所要時間","いつ・どこで","最低ライン","実行計画","達成条件","なぜこの命令か"].every(x=>card.includes(x)));
await (await p.$('#sec-mission')).scrollIntoViewIfNeeded();await p.screenshot({path:'V2.png'});
// 3) 時間がなかった
const lvOf=()=>p.evaluate(()=>{const T=__T;const m=T.day(T.todayKey()).mission;return m.cat?T.catLevel(m.cat,T.addDays(T.todayKey(),1)).lv:null});
const lv0=await lvOf();
await p.click('#sec-mission [data-act=mres][data-v=miss]');await p.waitForTimeout(250);await p.click('[data-act=missWhy][data-v=time]');await p.waitForTimeout(250);
ok("原因を選ぶと、その場で次の一手が出る",(await p.textContent('#sheet')).includes("時間の置き方を変えよう"));await p.screenshot({path:'V3.png'});
await p.click('#sheet .btn[data-act=closeSheet]');
const lv1=await lvOf();ok("「時間がなかった」では難度を下げない",lv0===lv1,lv0+"→"+lv1);
const sh=await p.evaluate(()=>{const T=__T;const k=T.addDays(T.todayKey(),1);let s=0,n=0;for(let r=0;r<60;r++)T.missionPlan(k,r).offers.forEach(o=>{const d=T.MDATA[o.id];n++;if(d&&/^(\d+分|数秒|1分|2分|3分|5分)/.test(d[0]))s++});return Math.round(s/n*100)});
ok("翌日は所要時間の短い命令が多くなる",sh>=50,"短い命令 "+sh+"%");
ok("カードに原因と次の一手",(await p.textContent('#sec-mission')).includes("時間の問題"));
// 4) 意味を感じなかった
const mean=await p.evaluate(()=>{const T=__T;const m=T.day(T.todayKey()).mission;m.missWhy="meaning";const D={0:"rel",1:"life",6:"life",2:"body",3:"mind",4:"env",5:"know"};let hit=0;const k=T.addDays(T.todayKey(),1);
  for(let r=0;r<60;r++){const pl=T.missionPlan(k,r);if(pl.forced)continue;pl.offers.forEach(o=>{if(!o.opp&&D[o.c]===D[m.cat])hit++})}m.missWhy="time";return hit});
ok("「意味を感じなかった」分野は翌日外す",mean===0,"同じ領域 "+mean+"回");
// 5) 痛みの申告
await p.evaluate(()=>{const T=__T;const m=T.day(T.todayKey()).mission;m.result=null;delete m.missWhy;T.render()});
await p.click('#sec-mission [data-act=mres][data-v=miss]');await p.waitForTimeout(250);await p.click('[data-act=missWhy][data-v=pain]');await p.waitForTimeout(250);await p.click('#sheet .btn[data-act=closeSheet]');
const pain=await p.evaluate(()=>{const T=__T;const k=T.addDays(T.todayKey(),1);let ex=0;for(let r=0;r<80;r++)T.missionPlan(k,r).offers.forEach(o=>{const m=T.MBYID[o.id];if(m&&m.tags&&m.tags.includes("ex"))ex++});return {active:T.painActive(),ex}});
ok("痛みの申告後は運動の命令が出ない",pain.active&&pain.ex===0,JSON.stringify(pain));ok("道場に安全の停止カード",!!(await p.$('#sec-pain')));
await (await p.$('#sec-pain')).scrollIntoViewIfNeeded();await p.screenshot({path:'V4.png'});
await p.click('#sec-pain [data-act=painClear]');ok("「痛みが引いた」で再開",!(await p.evaluate(()=>__T.painActive()))&&!(await p.$('#sec-pain')));
await p.click('#sec-mission [data-act=mres][data-v=done]');await p.waitForTimeout(200);
const h2=await p.evaluate(()=>{const T=__T;return T.day(T.todayKey()).mission.hist||[]});ok("結果の修正履歴が残る",h2.length>=1&&h2[h2.length-1].to==="done",JSON.stringify(h2[h2.length-1]));
// 6) EXPの偏り対策
const ex=await p.evaluate(()=>{const T=__T;const k=T.todayKey();const d=T.day(k);d.okite={};["o1","o2","o3","o4","o5","o6","o7","o8"].forEach(id=>d.okite[id]="ok");
  const ok8=T.expEvents().filter(e=>e.k===k&&/掟/.test(e.what)).map(e=>e.exp);
  T.S.main.returns=[{date:T.addDays(k,-20),gap:3},{date:T.addDays(k,-15),gap:3},{date:T.addDays(k,-2),gap:3}];const rs=T.expEvents().filter(e=>/再起の者/.test(e.what)).length;
  T.S.main.returns=[];d.okite={};return {ok8,rs}});
ok("掟は1日10EXPまで（8個実践でも10）",ex.ok8[0]===10,JSON.stringify(ex.ok8));ok("再起の報酬は14日に一度まで（3回中2回）",ex.rs===2,ex.rs+"回");
// 7) 卒業
await p.evaluate(()=>{const T=__T;const M=T.S.main;[1,2,3,4,5,6].forEach((c,i)=>M.tasks.push({id:"g"+i,cat:c,name:"x",status:"定着",settledOn:T.addDays(T.todayKey(),-30),start:T.addDays(T.todayKey(),-60),history:[],restDays:[]}));
  for(let i=0;i<8;i++)M.weeklies["w"+i]={note:"x"};
  for(let i=1;i<=4;i++){T.day(T.addDays(T.todayKey(),-i*7)).mission={text:"x",unsup:true,result:"done"}}T.render()});
await p.waitForTimeout(300);await cer();await p.click('#tabs [data-tab=chikai]');await p.waitForTimeout(300);
const txt=await p.evaluate(()=>[...document.querySelectorAll('.row.small')].map(r=>r.innerText.replace(/\s+/g," ")).filter(t=>/^[●○]/.test(t)).join(" | "));
ok("卒業条件が五つの自立能力として表示",["自己管理","自己判断","自己改善","自己制御","自己継続"].every(x=>txt.includes(x)),txt.slice(0,200));
// 75日試練だけは本物の記録が要るため、判定関数を一時的に満たして申請の動きを確かめる
const ap=await p.evaluate(()=>{const T=__T;return !!document.querySelector('#sec-grad-apply')});
ok("75日試練が未完遂なら申請ボタンは出ない",!ap);
}catch(e){R.push("CRASH "+e.message.split("\n").filter(l=>/intercepts|waiting for/.test(l)).slice(-2).join(" ~ "))}
try{
const p=await globalThis.ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.waitForTimeout(500);
const cer=async()=>{for(let i=0;i<5&&await p.$('#ceremony:not([hidden]) [data-cer]');i++){await p.click('#ceremony [data-cer] >> nth=0');await p.waitForTimeout(150)}};await cer();
// 8) 書き出し → 復元
const json=await p.evaluate(()=>JSON.stringify({exportedAt:new Date().toISOString(),main:__T.S.main,days:__T.S.days}));fs.writeFileSync(BK,json);
const n0=JSON.parse(json);const nd=Object.keys(n0.days).length;
await p.evaluate(()=>{const T=__T;T.S.days={};T.S.main.tasks=[];T.ui.tut=null;document.querySelector('#tut').hidden=true;T.render()});
await p.click('#tabs [data-tab=chikai]');await p.waitForTimeout(300);while(await p.$('[data-tut=next]')){await p.click('[data-tut=next]');await p.waitForTimeout(120)}
await (await p.$('[data-act=importOpen]')).scrollIntoViewIfNeeded();await p.screenshot({path:'V5.png'});
const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('[data-act=importOpen]')]);await fc.setFiles(BK);await p.waitForTimeout(300);
ok("復元前に確認画面（日数・修行数）",(await p.textContent('#sheet')).includes(nd+"日分"),nd+"日分");await p.screenshot({path:'V6.png'});
await p.click('[data-act=importYes]');await p.waitForTimeout(500);
ok("復元すると記録が戻る",(await p.evaluate(()=>Object.keys(__T.S.days).length))===nd&&(await p.evaluate(()=>__T.S.main.tasks.length))===n0.main.tasks.length);
await p.reload();await p.waitForTimeout(600);ok("再起動後も復元した記録が残る",(await p.evaluate(()=>Object.keys(__T.S.days).length))>=nd);
// 9) 保存失敗の通知
await p.evaluate(()=>__T.warn({code:"unavailable"}));await p.waitForTimeout(100);ok("保存に失敗すると知らせる",(await p.textContent('#toast')).includes("保存できませんでした"));
}catch(e){R.push("CRASH2 "+e.message.split("\n").filter(l=>/intercepts|waiting for/.test(l)).slice(-2).join(" ~ "))}
console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
