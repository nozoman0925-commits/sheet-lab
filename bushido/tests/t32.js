// 第34版：初めての人が、最初の一太刀を記録するまで（短い入門・短い入門の儀）と、道場の一画面一行動
const {chromium}=require('playwright');
const R=[];const ok=(n,c,x)=>R.push((c?"PASS ":"FAIL ")+n+(x?" | "+x:""));const B=process.cwd();
(async()=>{const b=await chromium.launch();const errs=[];try{
const p=await b.newPage({viewport:{width:390,height:735}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
let taps=0;const tap=async sel=>{await p.click(sel);taps++;await p.waitForTimeout(160)};const cur=()=>p.evaluate(()=>__T.flowX()[__T.ui.obStep]);
const t0=Date.now();
await tap('[data-act=obNext]');
await tap('.mopt[data-v=respect]');await tap('[data-act=obNext]');
await p.fill('#mi-name','先生');await tap('[data-act=mGender][data-v=male]');await tap('[data-act=mInfoNext]');
let guard=0;while(guard++<40){const id=await cur();if(id==="vow")break;
  if(id==="confirm"){await p.fill('#cf-sign','武');await tap('[data-act=obNext]');continue}
  if(id==="building"){await p.waitForTimeout(400);continue}
  if(await p.$('#taunt:not([hidden]) [data-act=tauntNext]')){await tap('#taunt [data-act=tauntNext]');continue}
  if(await p.$('[data-act=obMulti]')){await tap('[data-act=obMulti] >> nth=0');await tap('[data-act=obNext]');continue}
  if(await p.$('[data-act=obAns]')){await tap('[data-act=obAns] >> nth=0');await p.waitForTimeout(150);continue}
  await tap('[data-act=obNext]')}
const screens=await p.evaluate(()=>__T.flowX().length);const qn=await p.evaluate(()=>__T.flowX().filter(x=>/^[a-z]\d+$/.test(x)).length);
ok("入門は20画面以内・問いは安全と目標と時間の5問",screens<=20&&qn===5,screens+"画面・問い"+qn);
await tap('[data-act=vowGo]');await p.waitForTimeout(600);
for(let i=0;i<4&&await p.$('#ceremony:not([hidden]) [data-cer]');i++){await tap('#ceremony [data-cer] >> nth=0');await p.waitForTimeout(300)}
let n=0;for(;n<10;n++){const st=await p.evaluate(()=>{const T=__T;if(T.ui.tut==null)return null;const s=T.ui.tutSteps[T.ui.tut];return {sel:s.sel||null,press:!!s.press}});if(!st)break;
  if(st.press)await tap(st.sel);else await tap('[data-tut=next]');await p.waitForTimeout(250);
  for(let i=0;i<3&&await p.$('#ceremony:not([hidden]) [data-cer]');i++){await tap('#ceremony [data-cer] >> nth=0')}}
const tut=await p.evaluate(()=>({done:__T.S.main.tutDone,tut:__T.ui.tut}));
ok("呼び名は最終確認で入れたもの",await p.evaluate(()=>__T.S.main.displayName==="武"));
ok("最初の入門の儀は短い（10手順未満）で終わる",tut.done&&tut.tut==null&&n<10,n+"手順");
ok("初めての人の表示の量は「最小」",await p.evaluate(()=>__T.S.main.viewDefault==="min"));
const vis=await p.evaluate(()=>[...document.querySelectorAll('#app>.stack>section')].map(e=>e.id).filter(Boolean));
ok("道場で開いて見えるのは、今日の一太刀だけ（最小）",vis[0]==="sec-mission"&&!vis.includes("sec-quest")&&!vis.includes("sec-progress"),vis.join(","));
ok("一太刀は「稽古を始める」一つが主役",(await p.$$('#sec-mission .btn.gold')).length===1&&!!(await p.$('#sec-mission [data-act=startRec]')));
ok("今日のおすすめに、目安の時間と分野",/目安 .+ ・ /.test(await p.textContent('#sec-mission .hero-meta')),await p.textContent('#sec-mission .hero-meta'));
await tap('#sec-mission [data-act=startRec]');
ok("始めると、やり方と「やり切った」",!!(await p.$('#sec-mission .hero-how'))&&!!(await p.$('#sec-mission [data-act=mres][data-v=done]')));
await tap('#sec-mission [data-act=mres][data-v=done]');await p.waitForTimeout(400);
for(let i=0;i<3&&await p.$('#ceremony:not([hidden]) [data-cer]');i++){await tap('#ceremony [data-cer] >> nth=0')}
ok("やり切ると、次にやることを一つだけ示す",!!(await p.$('#sec-mission .hero-next')),((await p.textContent('#sec-mission .hero-next'))||"").trim());
ok("初めて開いてから最初の一太刀の記録まで、60タップ以内",taps<=60,taps+"タップ");
await p.screenshot({path:B+'/F34_done.png'});
for(const v of ["std","full"]){await p.evaluate(v=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{view:v});T.render()},v);
  const ids=await p.evaluate(()=>[...document.querySelectorAll('#app>.stack>section')].map(e=>e.id));
  ok("表示の量「"+(v==="std"?"標準":"詳細")+"」で進捗が出る"+(v==="full"?"（EXPも）":""),ids.includes("sec-progress")&&(v!=="full"||/EXP/.test(await p.textContent('#sec-progress'))),ids.join(","))}
await p.evaluate(()=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{view:"std"});T.day(T.todayKey()).cond="bad";T.render()});
const bad=await p.evaluate(()=>!document.querySelector('#app>.stack>#sec-progress')&&!!document.querySelector('[data-act=heroViewKeep]'));
await p.click('[data-act=heroViewKeep]');await p.waitForTimeout(150);
ok("不調の日は表示を一時的に減らし、本人が戻せる",bad&&!!(await p.$('#app>.stack>#sec-progress')));
await p.evaluate(()=>{const T=__T;const k=T.todayKey();T.day(k).cond="normal";T.S.main.look=Object.assign({},T.S.main.look,{view:"min"});T.S.main.viewAsked=false;T.S.main.uiStat={other:[k,T.addDays(k,-1),T.addDays(k,-2)]};T.render()});
ok("「その他の稽古・記録」は一つの折りたたみ",(await p.$$('#app details.grp')).length===1&&(await p.textContent('#app details.grp summary')).includes("その他"));
ok("「その他」をよく開く人には、標準の表示を提案（本人が選ぶ）",!!(await p.$('[data-act=viewSet][data-v=std]')));
await p.click('#tabs [data-tab=keiko]');await p.waitForTimeout(250);await p.evaluate(()=>{const t=document.querySelector('#tut');if(t)t.hidden=true});
ok("稽古場：今日のおすすめ一つ＋分類",!!(await p.$('#app>.stack>#sec-pick'))&&(await p.$$eval('#app details.grp .gt',x=>x.map(e=>e.textContent))).join(",").includes("心を整える"));
await p.evaluate(()=>{const T=__T;T.ui.tut=null;document.querySelector('#tabs [data-tab=chikai]').click()});await p.waitForTimeout(250);
const cg=await p.$$eval('#app details.grp .gt',x=>x.map(e=>e.textContent).join(","));ok("誓いの間：五つの分類",cg==="自分の誓い,師範,自分の成長,表示と通知,データ管理",cg);
}catch(e){R.push("CRASH "+e.message.split("\n").slice(0,3).join(" ~ "))}
console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
