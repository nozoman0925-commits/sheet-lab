const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
let src=fs.readFileSync('bushido.html','utf8');const i=src.lastIndexOf('})();\n</script>');src=src.slice(0,i)+'ui.grpAll=true;ui.noPrologue=true;window.__T={ui,get S(){return S},todayKey,addDays,day,render,missionPlan,excuseStats,unsupDays,totalExp};\n'+src.slice(i);
await p.setContent('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+src+'</body></html>');
await p.waitForTimeout(300);await p.click('[data-act=demo]');await p.waitForTimeout(200);await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');
// 衝動の原因：3回分を記録し、4回目のシートで傾向を見る
await p.evaluate(()=>{const T=__T;const t=T.todayKey();for(let i=1;i<=3;i++){T.day(T.addDays(t,-i)).urges=[{at:"22:15",won:i!==2,type:"動画",state:"疲労",place:"自宅"}]}});
await p.click('.urge-fab');await p.waitForTimeout(300);console.log('urge advice:',await p.evaluate(()=>document.querySelector('#sheet .note').innerText.replace(/\n/g,' ')));
await p.evaluate(()=>{__T.ui.breath.start-=61000});await p.waitForTimeout(400);
await p.click('#urge-type .chip >> text=SNS');await p.click('#urge-state .chip >> text=退屈');await p.click('#urge-place .chip >> text=移動中');await p.click('[data-act=urgeSave][data-v="1"]');await p.waitForTimeout(200);
console.log('saved urge:',JSON.stringify(await p.evaluate(()=>{const u=__T.day(__T.todayKey()).urges;return u[u.length-1]})));
// 人生の戦績
await p.click('#tabs [data-tab=roku]');await p.waitForTimeout(200);while(await p.$('[data-tut=next]')){await p.click('[data-tut=next]');await p.waitForTimeout(120)}
const e0=await p.evaluate(()=>__T.totalExp());
await p.click('#sec-feats [data-act=feat]');await p.click('[data-act=featPick][data-v=お金]');await p.click('[data-act=featPick] >> text=貯金が増えた（円）');await p.fill('#ft-v','30000');await p.fill('#ft-n','3か月でコンビニ通いをやめた');await p.click('[data-act=featSave]');await p.waitForTimeout(200);
console.log('feat:',JSON.stringify(await p.evaluate(()=>__T.S.main.feats)),await p.textContent('#sec-feats .feat'),'| EXP changed:',(await p.evaluate(()=>__T.totalExp()))!==e0);
// 繰り返す言い訳
await p.evaluate(()=>{const T=__T;const t=T.todayKey();for(let i=2;i<=5;i++){const d=T.day(T.addDays(t,-i));d.reflection={verdict:"fled",result:"逃げた",issue:"スマホや娯楽に流された",improve:"x",at:"22:00"}}T.render()});
console.log('excuse:',await p.evaluate(()=>{const s=document.querySelector('#sec-excuse');return s?s.innerText.replace(/\n/g,' ').slice(0,140):null}));
await (await p.$('#sec-feats')).scrollIntoViewIfNeeded();await p.screenshot({path:'v0.png'});
console.log('engine uses excuse:',await p.evaluate(()=>{const T=__T;const t=T.todayKey();T.day(t).mission=null;T.day(t).cond="normal";return T.missionPlan(t,0).offers.map(o=>o.why).join(" | ")}));
// 無監督の日
await p.click('#tabs [data-tab=dojo]');await p.waitForTimeout(200);
await p.evaluate(()=>{__T.S.main.created=__T.addDays(__T.todayKey(),-20)});
await p.click('#sec-mission [data-act=setMission]');await p.waitForTimeout(200);
console.log('unsup button:',!!(await p.$('[data-act=unsup]')));await p.screenshot({path:'v1.png',fullPage:true});
await p.click('[data-act=unsup]');await p.fill('#us-t','企画書を最後まで書き上げる');await p.click('[data-act=unsupSave]');await p.waitForTimeout(200);
await p.click('#sec-mission [data-act=mres][data-v=done]');await p.waitForTimeout(200);
console.log('unsup days:',await p.evaluate(()=>__T.unsupDays()));
await p.click('#tabs [data-tab=chikai]');await p.waitForTimeout(200);while(await p.$('[data-tut=next]')){await p.click('[data-tut=next]');await p.waitForTimeout(120)}
console.log('grad row:',await p.evaluate(()=>[...document.querySelectorAll('.row.small')].map(r=>r.innerText).find(t=>t.includes('無監督'))));
console.log('errors',JSON.stringify(errs));await b.close()})();
