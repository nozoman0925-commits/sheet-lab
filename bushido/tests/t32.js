// 第35版：初めての人が5タップで今日の一太刀に着く（序章1画面・安全の3問・入門の儀なし）。道場は一画面一行動
const {chromium}=require('playwright');
const R=[];const ok=(n,c,x)=>R.push((c?"PASS ":"FAIL ")+n+(x?" | "+x:""));const B=process.cwd();
(async()=>{const b=await chromium.launch();const errs=[];try{
const p=await b.newPage({viewport:{width:390,height:735}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/pl.html');await p.evaluate(()=>localStorage.clear());await p.reload();
let taps=0;const tap=async s=>{await p.click(s);taps++;await p.waitForTimeout(250)};
for(let i=0;i<40;i++){await p.waitForTimeout(150);if(await p.evaluate(()=>{const c=document.querySelector('.pl-cta');return !!c&&c.classList.contains('on')}))break}
const pl=await p.evaluate(()=>({act:__T.ui.pl&&__T.ui.pl.act,lines:document.querySelectorAll('#prologue .pl-line').length}));
ok("序章は最後の一画面から（文章はまとめて出て、すぐ「入門する」）",pl.act===6&&pl.lines===3,JSON.stringify(pl));
ok("序章を全部見たい人には「はじめから見る」",await p.evaluate(()=>{const b=document.querySelector('#prologue [data-pl=again]');return !!b&&getComputedStyle(b).display!=="none"}));
await tap('#prologue [data-pl=enter]');await p.waitForTimeout(600);
const first=await p.evaluate(()=>__T.flowX()[__T.ui.obStep]);ok("「入門する」の次は、すぐ安全の問い",first==="b9",first);
ok("問いの番号は「1 / 3」",/1 \/ 3/.test(await p.textContent('#app')));
for(let n=0;n<10;n++){if(await p.evaluate(()=>__T.S.main.onboarded))break;
  if(await p.$('[data-act=obMulti]')){await tap('[data-act=obMulti] >> nth=-1');await tap('[data-act=obNext]');continue}
  if(await p.$('[data-act=obAns]')){await tap('[data-act=obAns] >> nth=-1');await p.waitForTimeout(400);continue}
  await tap('[data-act=obNext]')}
await p.waitForTimeout(400);
const qs=await p.evaluate(()=>Object.keys(__T.S.main.obAns||{}));ok("初回の問いは安全の3問（けが・医師の制限・気分）",["b9","b10","m1"].every(x=>qs.includes(x))&&qs.length<=4,qs.join(","));
ok("5タップで道場の「稽古を始める」に着く",taps<=5&&!!(await p.$('#sec-mission [data-act=startRec]')),taps+"タップ");
ok("入門の儀（チュートリアル）は自動で始まらない",await p.evaluate(()=>__T.ui.tut==null&&__T.S.main.tutDone===true));
ok("師範の選択・誓い・師範の登場はない",await p.evaluate(()=>!__T.S.main.master&&!document.querySelector('#ceremony:not([hidden])')));
ok("初日はひとこと添える",(await p.textContent('#sec-mission .hero-sub')).includes("初日"));
ok("見出しは決定版のタグライン",(await p.textContent('.brand small')).trim()==="己に勝て。言い訳を断て。昨日の己を超えろ。");
const vis=await p.evaluate(()=>[...document.querySelectorAll('#app>.stack>section')].map(e=>e.id).filter(Boolean));
ok("道場で開いて見えるのは、今日の一太刀だけ（最小）",vis[0]==="sec-mission"&&!vis.includes("sec-quest")&&!vis.includes("sec-progress"),vis.join(","));
ok("一太刀は「稽古を始める」一つが主役",(await p.$$('#sec-mission .btn.gold')).length===1);
await tap('#sec-mission [data-act=startRec]');
ok("始めると、やり方と「やり切った」",!!(await p.$('#sec-mission .hero-how'))&&!!(await p.$('#sec-mission [data-act=mres][data-v=done]')));
await tap('#sec-mission [data-act=mres][data-v=done]');await p.waitForTimeout(400);
ok("やり切ると、次にやることを一つだけ示す",!!(await p.$('#sec-mission .hero-next')),((await p.textContent('#sec-mission .hero-next'))||"").trim());
const say=await p.evaluate(()=>{const e=document.querySelector('#mtoast');return e?e.textContent:""});
ok("達成の知らせは、人物の言葉ではなく出典つきの格言",/^格言 ・ /.test(say.trim())&&!/師範/.test(say),say.slice(0,60));
await p.screenshot({path:B+'/F35_done.png'});
for(const v of ["std","full"]){await p.evaluate(v=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{view:v});T.render()},v);
  const ids=await p.evaluate(()=>[...document.querySelectorAll('#app>.stack>section')].map(e=>e.id));
  ok("表示の量「"+(v==="std"?"標準":"詳細")+"」で進捗が出る"+(v==="full"?"（EXPも）":""),ids.includes("sec-progress")&&(v!=="full"||/EXP/.test(await p.textContent('#sec-progress'))),ids.join(","))}
await p.evaluate(()=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{view:"std"});T.day(T.todayKey()).cond="bad";T.render()});
const bad=await p.evaluate(()=>!document.querySelector('#app>.stack>#sec-progress')&&!!document.querySelector('[data-act=heroViewKeep]'));
await p.click('[data-act=heroViewKeep]');await p.waitForTimeout(150);
ok("不調の日は表示を一時的に減らし、本人が戻せる",bad&&!!(await p.$('#app>.stack>#sec-progress')));
await p.evaluate(()=>{const T=__T;const k=T.todayKey();T.day(k).cond="normal";T.S.main.look=Object.assign({},T.S.main.look,{view:"min"});T.S.main.viewAsked=false;T.S.main.uiStat={other:[k,T.addDays(k,-1),T.addDays(k,-2)]};T.render()});
ok("「その他の稽古・記録」は一つの折りたたみ",(await p.$$('#app details.grp')).length===1);
ok("「その他」をよく開く人には、標準の表示を提案（本人が選ぶ）",!!(await p.$('[data-act=viewSet][data-v=std]')));
await p.click('#tabs [data-tab=keiko]');await p.waitForTimeout(250);await p.evaluate(()=>{const t=document.querySelector('#tut');if(t)t.hidden=true;__T.ui.tut=null});
ok("稽古場：今日のおすすめ一つ＋分類",!!(await p.$('#app>.stack>#sec-pick')));
await p.evaluate(()=>document.querySelector('#tabs [data-tab=chikai]').click());await p.waitForTimeout(250);
const cg=await p.$$eval('#app details.grp .gt',x=>x.map(e=>e.textContent).join(","));ok("誓いの間：四つの分類（師範の分類はない）",cg==="自分の誓い,自分の成長,表示と通知,データ管理",cg);
}catch(e){R.push("CRASH "+e.message.split("\n").slice(0,3).join(" ~ "))}
console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
