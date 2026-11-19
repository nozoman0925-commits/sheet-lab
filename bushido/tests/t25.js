// 入門の儀（章の扉・一手順一指示・押し間違いの助け）・入門の七日・最初の三日は軽く・合図・画面の折りたたみ
const {chromium}=require('playwright');
const R=[];const ok=(n,c,x)=>R.push((c?"PASS ":"FAIL ")+n+(x?" | "+x:""));const B=process.cwd();
(async()=>{const b=await chromium.launch();const errs=[];try{
const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
await p.click('[data-act=demo]');await p.waitForTimeout(300);await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(300);
await p.evaluate(()=>{const T=__T;T.ui.grpAll=false;T.ui.grpOpen={};T.S.main.master={motive:"dear",name:"母",gender:"female",date:T.todayKey()};T.render()});
// 入門の儀を最初から
await p.evaluate(()=>__T.A.tutStart());await p.waitForTimeout(300);
await p.click('[data-tut=next]');await p.waitForTimeout(400);
ok("章の扉が出る（第一章・師範の言葉）",(await p.textContent('#tut')).includes("第一章")&&(await p.textContent('#tut')).includes("ここがお前の道場だ"));await p.screenshot({path:B+'/U1.png'});
await p.click('[data-tut=next]');await p.waitForTimeout(300);
const t1=await p.textContent('#tut .tut-card');ok("一手順は短い指示一つ",t1.length<120,t1.replace(/\s+/g," ").slice(0,80)+"…("+t1.length+"字)");await p.screenshot({path:B+'/U2.png'});
// 押し間違い3回で助け
await p.evaluate(()=>{for(let i=0;i<3;i++)document.querySelector('#app .top').dispatchEvent(new MouseEvent('click',{bubbles:true}))});await p.waitForTimeout(200);
ok("3回押し間違えると、ヘルプが自動で出る",!!(await p.$('#tut .tut-helptext')));
// 第二章まで進む
const step=()=>p.evaluate(()=>{const T=__T;const s=T.ui.tutSteps[T.ui.tut];return {ch:s.ch,sel:s.sel||null,chap:!!s.chap,press:!!s.press,next:!!s.next,t:s.t}});
for(let i=0;i<10;i++){const s=await step();if(s.ch===2&&!s.chap)break;await p.click('[data-tut=next]');await p.waitForTimeout(250)}
await p.click('#sec-mission [data-act=setMission]');await p.waitForTimeout(400);
let s=await step();ok("体調を選ぶ場所だけを光らせる",s.sel==="#sheet [data-act=msCond][data-v=normal]",s.t);await p.screenshot({path:B+'/U3.png'});
await p.click(s.sel);await p.waitForTimeout(400);s=await step();ok("次は三つの命令の中だけを光らせる",s.sel==="#ms-pick",s.t);await p.screenshot({path:B+'/U4.png'});
await p.click('#ms-pick .qopt');await p.waitForTimeout(300);s=await step();ok("選んだら「受ける」ボタンだけを光らせる",s.sel==="#sheet [data-act=saveMission]",s.t);
await p.click(s.sel);await p.waitForTimeout(400);s=await step();ok("受けた後は、やることの書いてある所を示す",s.sel==="#sec-mission .hero-how",s.t);
await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(300);
// 画面の折りたたみ
await p.evaluate(()=>{__T.ui.grpOpen={};__T.render()});
const dg=await p.evaluate(()=>{const d=document.querySelector('#app details.grp');return d?{open:d.open,n:d.querySelectorAll('section').length,t:d.querySelector('summary').innerText.replace(/\s+/g," ")}:null});
ok("道場：毎日見ない区画は「ほかの稽古」にたたむ",dg&&!dg.open&&dg.n>0,JSON.stringify(dg));
const vis=await p.evaluate(()=>[...document.querySelectorAll('#app .stack>section')].map(e=>e.id||((e.querySelector('.eyebrow')||{}).textContent||"").slice(0,8)).join(" / "));R.push("INFO 道場に開いて見える区画："+vis);
await p.screenshot({path:B+'/U5.png',fullPage:true});
// 今日やることから押すと、たたんだ区画が開く
await p.evaluate(()=>{__T.ui.grpOpen={};__T.render();__T.A.goto({dataset:{v:'sec-quest'}})});await p.waitForTimeout(300);ok("たたんだ区画の中へ移る時は、その折りたたみが開く",await p.evaluate(()=>{const q=document.querySelector('#sec-quest');return !!q&&(!q.closest('details')||q.closest('details').open)}));
for(const t of ['keiko','roku','chikai']){await p.click('#tabs [data-tab='+t+']');await p.waitForTimeout(300);while(await p.$('[data-tut=next]')){await p.click('[data-tut=next]');await p.waitForTimeout(150)}
  const g=await p.evaluate(()=>[...document.querySelectorAll('#app details.grp')].map(d=>d.querySelector('.gt').textContent+"("+d.querySelectorAll('section').length+")").join("・"));
  const h=await p.evaluate(()=>document.documentElement.scrollHeight);ok(t+"：区画をたたんで短くする",g.length>0,g+" ・ 画面の長さ "+h+"px");await p.screenshot({path:B+'/U6_'+t+'.png',fullPage:true})}
// 入門の七日
await p.click('#tabs [data-tab=dojo]');await p.waitForTimeout(200);const w=await p.evaluate(()=>{const T=__T;const M=T.S.main;M.demo=false;M.created=T.todayKey();T.day(T.todayKey()).mission=null;T.render();const c=document.querySelector('#sec-week1');return c?c.textContent.replace(/\s+/g," "):null});
ok("始めた日に「入門の七日・1日目」と今日の目標一つ",w&&w.includes("1日目")&&w.includes("一太刀を一つ斬る"),w&&w.slice(0,90));
await p.click('#tabs [data-tab=dojo]');await p.waitForTimeout(200);await (await p.$('#sec-week1')).scrollIntoViewIfNeeded();await p.screenshot({path:B+'/U7.png'});
const w3=await p.evaluate(()=>{const T=__T;const M=T.S.main;M.created=T.addDays(T.todayKey(),-2);T.day(M.created).mission={text:"x",result:"done"};T.render();return document.querySelector('#sec-week1').textContent.replace(/\s+/g," ")});
ok("3日目：1日目の達成に印、今日は「夜の省察を書く」",w3.includes("3日目")&&w3.includes("夜の省察")&&/✓/.test(w3),w3.slice(0,90));
ok("七日の間も、師範（人物）の言葉は出さない",await p.evaluate(()=>!document.querySelector('#sec-master')));
const w8=await p.evaluate(()=>{const T=__T;T.S.main.created=T.addDays(T.todayKey(),-8);T.render();return !!document.querySelector('#sec-week1')});ok("8日目からは七日のカードは消える",!w8);
// 最初の三日は命令を軽く
const cap=await p.evaluate(()=>{const T=__T;const M=T.S.main;M.created=T.todayKey();let mx=0;for(let r=0;r<80;r++)T.missionPlan(T.todayKey(),r).offers.forEach(o=>{if(!o.opp)mx=Math.max(mx,o.lv)});M.created=T.addDays(T.todayKey(),-30);return mx});
ok("始めて三日間は、難度2までの命令だけ",cap<=2,"最大難度 "+cap);
// 合図のカレンダー
const ics=await p.evaluate(()=>__T.icsFile());ok("毎朝・毎晩の合図（毎日くり返し・通知つき）",/RRULE:FREQ=DAILY/.test(ics)&&(ics.match(/BEGIN:VEVENT/g)||[]).length===2&&/BEGIN:VALARM/.test(ics),ics.split("\r\n").filter(l=>/^(DTSTART|SUMMARY)/.test(l)).join(" ・ "));
}catch(e){R.push("CRASH "+e.message.split("\n").slice(0,3).join(" ~ "))}
console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
