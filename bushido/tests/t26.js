// 本質の見直し：初回の問いを絞る・続きは後で・16タイプは任意・道場の三層・師範は必要な時だけ・段位の状態・段位で指導を変える・30秒の省察・言葉
const {chromium}=require('playwright');
const R=[];const ok=(n,c,x)=>R.push((c?"PASS ":"FAIL ")+n+(x?" | "+x:""));const B=process.cwd();
(async()=>{const b=await chromium.launch();const errs=[];try{
const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
// 初回の問い
const fq=await p.evaluate(()=>{const T=__T;T.ui.ob={};const f=T.flowX();return {n:f.filter(x=>/^[a-z]\d+$/.test(x)).length,temp:f.includes("t1"),type:f.includes("type"),ids:f.filter(x=>/^[a-z]\d+$/.test(x)).join(",")}});
ok("初回の問いは安全と生活に絞る（16タイプは入れない）",fq.n<=20&&!fq.temp&&!fq.type,fq.n+"問："+fq.ids);
ok("安全の問い（けが・医師・心・睡眠）は必ず聞く",["b9","b10","m1","m2","m6","s3"].every(x=>fq.ids.split(",").includes(x)));
// 見本で道場へ
await p.click('[data-act=demo]');await p.waitForTimeout(300);await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(300);
await p.evaluate(()=>{const T=__T;const M=T.S.main;M.demo=false;M.master={motive:"respect",name:"先生",gender:"male",date:T.todayKey()};M.tutVer=3;M.tutDone=true;M.hints={keiko:1,roku:1,chikai:1};
  M.obAns={b1:"1",b4:"1",b5:"1",b9:["4"],b10:"1",wake:"07:00",sleep:"23:30",m1:"0",m2:"0",m6:"2",g1:["0"],g2:"1",g3:"1",tone:"gen"};T.day(T.todayKey()).mission=null;T.render()});
// 道場の並び（一太刀が主役、次に三層の稽古）
const ord=await p.evaluate(()=>[...document.querySelectorAll('#app>.stack>section')].map(e=>e.id).filter(Boolean));
{const o2=ord.filter(x=>x!=="sec-week1");ok("道場：今日の帯が一番上（入門の七日の案内を除く）、すぐ下に一太刀、次に毎日の修行",o2[0]==="sec-todo"&&o2[1]==="sec-mission"&&o2[2]==="sec-quest",ord.join(" > "))}
const tiers=await p.evaluate(()=>[...document.querySelectorAll('#sec-todo .tier .tl')].map(e=>e.textContent).join(","));ok("今日の稽古は必須・推奨・任意の三層",tiers.startsWith("必須")&&tiers.includes("推奨")&&tiers.includes("任意"),tiers);
ok("必須は一太刀だけ",(await p.$$('#sec-todo .tier.t1')).length===1&&(await p.textContent('#sec-todo .tier.t1')).includes("一太刀"));
await (await p.$('#sec-mission')).scrollIntoViewIfNeeded();await p.screenshot({path:B+'/W1.png'});
// 不調の日は必須だけ
const bad=await p.evaluate(()=>{const T=__T;T.day(T.todayKey()).cond="bad";T.render();const r=document.querySelectorAll('#sec-todo .tier').length;T.day(T.todayKey()).cond=null;T.render();return r});
ok("不調の日は、必須の一つだけを見せる",bad===1,bad+"行");
// 一太刀を斬ると「今日は斬った」
await p.evaluate(()=>{const T=__T;T.day(T.todayKey()).mission={text:"x",cat:1,lv:1,result:"done"};T.render()});
ok("一太刀を斬れば「今日は斬った」",(await p.textContent('#sec-todo .todo-next')).includes("斬った"));
// 師範は必要な場面だけ
const ml=await p.evaluate(()=>{const T=__T;T.day(T.todayKey()).mission=null;T.S.main.created=T.addDays(T.todayKey(),-40);T.S.main.tasks=[];T.render();const e=document.querySelector('#sec-master .mline');return e?e.textContent:null});
ok("何もない日は、師範の一言を出さない",ml===null,String(ml));
// 段位の状態
const rs=await p.evaluate(()=>{const T=__T;T.day(T.todayKey()).cond="bad";T.render();const a=(document.querySelector('.rankchip .rs')||{}).textContent;T.day(T.todayKey()).cond=null;T.render();return a});
ok("段位は下げず「休養中」を添える",rs==="休養中",rs);
// 続きの問い
await p.click('#tabs [data-tab=dojo]');await p.waitForTimeout(200);
ok("道場に「見つめ直しの続き」",!!(await p.$('#sec-rest')),(await p.textContent('#sec-rest')||"").replace(/\s+/g," ").slice(0,40));
await p.click('#sec-rest [data-act=restStart]');await p.waitForTimeout(250);ok("続きの入口の画面",(await p.textContent('.q')).includes("残りの問い"));
const before=await p.evaluate(()=>__T.S.main.tasks.length);
for(let n=0;n<120;n++){const id=await p.evaluate(()=>__T.flowX()[__T.ui.obStep]);if(id==="result")break;if(id==="building"){await p.waitForTimeout(400);continue}
  if(await p.$('#taunt:not([hidden]) [data-act=tauntNext]')){await p.click('#taunt [data-act=tauntNext]');continue}
  if(id==="restIntro"||id.startsWith("ch:")){await p.click('[data-act=obNext]');await p.waitForTimeout(80);continue}
  if(await p.$('[data-act=obMulti]')){await p.click('[data-act=obMulti] >> nth=0');await p.click('[data-act=obNext]');await p.waitForTimeout(80);continue}
  const o=await p.$$('[data-act=obAns]');await o[0].click();await p.waitForTimeout(300)}
await p.click('[data-act=obRetakeDone]');await p.waitForTimeout(300);
const rest=await p.evaluate(()=>({left:document.querySelector('#sec-rest')?1:0,dom:Object.values(__T.S.main.profile.dom).filter(x=>x==null).length}));
ok("続きを答えると、案内が消え、全分野がそろう",rest.left===0&&rest.dom===0,JSON.stringify(rest));
// 16タイプは任意：誓いの間から
await p.evaluate(()=>{__T.S.main.profile.temp={};__T.render()});await p.click('#tabs [data-tab=chikai]');await p.waitForTimeout(300);
ok("誓いの間に「武士の型を診断する」（任意）",!!(await p.$('[data-act=typeStart]')));
await p.click('[data-act=typeStart]');await p.waitForTimeout(250);await p.click('[data-act=obNext]');await p.waitForTimeout(200);
for(let i=0;i<12;i++){if(await p.$('#taunt:not([hidden]) [data-act=tauntNext]'))await p.click('#taunt [data-act=tauntNext]');await p.click('.pair-o.p'+(i%2?0:3));await p.waitForTimeout(320)}
if(await p.$('#taunt:not([hidden]) [data-act=tauntNext]'))await p.click('#taunt [data-act=tauntNext]');
const ty=await p.textContent('#app');ok("型の結果に必要な項目と師範の言葉",["行動パターン","相性の良い指導方法","注意すべき傾向"].every(x=>ty.includes(x))&&!!(await p.$('.mcomment')));
await p.click('[data-act=typeDone]');await p.waitForTimeout(300);ok("型が保存され、記録はそのまま",await p.evaluate(()=>Object.keys(__T.S.main.profile.temp).length===12));
// 段位で指導を変える
const g=async rk=>{await p.evaluate(r=>{const T=__T;const d=T.day(T.todayKey());d.mission=null;d.cond="normal";d.msDomain=null;T.S.main.rankMax=r;T.render()},rk);await p.waitForTimeout(150);for(let i=0;i<3&&await p.$('#ceremony:not([hidden]) [data-cer]');i++){await p.click('#ceremony [data-cer] >> nth=0');await p.waitForTimeout(120)}await p.evaluate(()=>{document.querySelector('#ceremony').hidden=true});await p.click('#tabs [data-tab=dojo]');await p.waitForTimeout(150);await p.click('#sec-mission [data-act=setMission]');await p.waitForTimeout(250);const t=await p.textContent('#sheet');await p.evaluate(()=>{document.querySelector('#sheet').innerHTML=""});return t.replace(/\s+/g," ")};
const g0=await g(0),g2=await g(2),g3=await g(3),g4=await g(4);
ok("見習い：おすすめを示して導く",g0.includes("おすすめ"));ok("侍：三つから自分で選ばせる",g2.includes("自分で選べ"));ok("武士：鍛える分野を自分で考えさせる",g3.includes("どこを鍛えるべきか"));ok("師範：自分で決める欄を開いて任せる",g4.includes("自分で一太刀を決める"));
await p.evaluate(()=>{__T.S.main.rankMax=1;__T.render()});
// 30秒の省察
await p.click('#tabs [data-tab=roku]');await p.waitForTimeout(200);await p.evaluate(()=>{__T.ui.grpAll=false;const T=__T;T.day(T.todayKey()).reflection=null;T.render()});
await p.click('#sec-reflect [data-act=reflect]');await p.waitForTimeout(200);await p.screenshot({path:B+'/W2.png'});
await p.click('[data-act=rfPick][data-f=verdict][data-v=full]');await p.waitForTimeout(100);await p.click('[data-act=saveReflect]');await p.waitForTimeout(250);
ok("省察は「今日の自分」を選ぶだけで記録できる",await p.evaluate(()=>{const r=__T.day(__T.todayKey()).reflection;return !!(r&&r.improve)}));
// 言葉
const q=await p.evaluate(()=>({n:__T.QUOTES.length,den:__T.QUOTES.filter(x=>(x[4]||"").includes("伝")).length}));ok("今日の言葉は365通り以上、出典の不確かな言葉は外した",q.n>=365&&q.den===0,q.n+"通り・伝 "+q.den);
await p.click('#tabs [data-tab=dojo]');await p.waitForTimeout(200);await p.screenshot({path:B+'/W3.png',fullPage:true});
}catch(e){R.push("CRASH "+e.message.split("\n").slice(0,3).join(" ~ "))}
console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
