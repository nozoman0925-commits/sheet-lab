const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
let src=fs.readFileSync('bushido.html','utf8');const i=src.lastIndexOf('})();\n</script>');src=src.slice(0,i)+'ui.grpAll=true;ui.noPrologue=true;window.__T={ui,get S(){return S},catLevel,todayKey,addDays,day,render,missionPlan};\n'+src.slice(i);
await p.setContent('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+src+'</body></html>');
await p.waitForTimeout(300);await p.click('[data-act=demo]');await p.waitForTimeout(200);await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');
// プロフィール（静道波楽・スマホ依存・腕立て0回・膝けが）と、身体分野で3回連続達成の履歴を入れる
const r=await p.evaluate(()=>{const T=__T;const S=T.S;const t=T.todayKey();
  S.main.profile={score:{d2:3,d1:3,b5:3,s3:1},cat:{1:40,2:70,3:85,4:30,5:30,6:50},dom:{},temp:{t1:"3",t2:"3",t3:"3",t4:"3",t5:"3",t6:"3",t7:"3",t8:"3",t9:"3",t10:"3",t11:"3",t12:"3"},flags:{inj:["knee"],noEx:false,care:false,lowFit:true,highFit:false}};
  S.main.created=T.addDays(t,-30);
  const before=T.catLevel(2,t).lv;
  for(let i=6;i>=4;i--){const k=T.addDays(t,-i);const d=T.day(k);d.mission={text:"x"+i,cat:2,lv:3,result:"done"}}
  const up=T.catLevel(2,t);
  for(let i=3;i>=2;i--){const k=T.addDays(t,-i);const d=T.day(k);d.mission={text:"y"+i,cat:2,lv:3,result:"done"}}
  const down=T.catLevel(2,t);
  T.day(T.addDays(t,-1)).reflection={verdict:"fled",result:"逃げた",issue:"スマホや娯楽に流された",improve:"x",at:"22:00"};
  T.day(t).mission=null;T.render();return{before,up,down}});
console.log('身体の難度:',r.before,'→ 3連続達成後',JSON.stringify(r.up),'→ 2連続未達後',JSON.stringify(r.down));
// 一太刀：体調確認 → 3つの命令（理由つき）
await p.click('#sec-mission [data-act=setMission]');await p.waitForTimeout(200);await p.screenshot({path:'e0.png'});
await p.click('[data-act=msCond][data-v=normal]');await p.waitForTimeout(200);await p.screenshot({path:'e1.png',fullPage:true});
console.log('offers:',JSON.stringify(await p.$$eval('#ms-pick .qopt',x=>x.map(e=>e.innerText.replace(/\n/g,' / ')))));
await p.click('[data-act=closeSheet].btn');
// 2日連続未達 → 一本化（不調ではない日）
console.log('forced:',await p.evaluate(()=>{const T=__T;const t=T.todayKey();T.day(T.addDays(t,-1)).mission={text:"z",cat:3,lv:3,result:"miss"};T.day(T.addDays(t,-2)).mission={text:"w",cat:3,lv:3,result:"miss"};const pl=T.missionPlan(t,0);return pl.forced+" "+pl.offers.length+" "+(pl.offers[0]&&pl.offers[0].why)}));
// 不調の日
console.log('bad day:',await p.evaluate(()=>{const T=__T;const t=T.todayKey();T.day(T.addDays(t,-1)).mission.result="done";T.day(t).cond="bad";const pl=T.missionPlan(t,0);return JSON.stringify(pl.offers.map(o=>o.t+"(難度"+o.lv+")"))}));
// 衝動の傾向
await p.evaluate(()=>{const T=__T;const t=T.todayKey();for(let i=1;i<=4;i++){const d=T.day(T.addDays(t,-i));d.urges=[{at:"23:10",won:i%2===0,type:"動画"}]}});
await p.click('.urge-fab');await p.waitForTimeout(400);await p.screenshot({path:'e2.png'});
console.log('urge advice:',await p.evaluate(()=>{const n=document.querySelector('#sheet .note');return n?n.innerText.replace(/\n/g,' '):null}));
console.log('errors',JSON.stringify(errs));await b.close()})();
