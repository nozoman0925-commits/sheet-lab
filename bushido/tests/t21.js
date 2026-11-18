// 生活背景の問い・明日の仕込み・命令エンジン（分野の分散・似た命令・未達成の原因）
const {chromium}=require('playwright');
const R=[];const ok=(n,c,x)=>R.push((c?"PASS ":"FAIL ")+n+(x?" | "+x:""));
(async()=>{const b=await chromium.launch();const errs=[];try{
const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
// 1) 入門の流れに「己の生活を知る」が性格の問いの直後に入る／分岐
const fl=await p.evaluate(()=>{const T=__T;T.ui.ob={};const f=T.flowX();const i=f.indexOf("ch:life");return {after:f[i-1],ids:f.slice(i,i+8)}});
ok("「己の生活を知る」が問いの最初（16タイプは任意）",fl.after==="tone",fl.ids.join(","));
const br=await p.evaluate(()=>{const T=__T;T.ui.ob={l1:["9"],l5:["6"]};const a=T.flowX();T.ui.ob={l1:["4"],l5:["6"]};const c=T.flowX();return {noneHasL2:a.includes("l2"),noneHasL6:a.includes("l6"),stuHasL6:c.includes("l6")}});
ok("予定が特にない人には活動・準備内容を聞かない",!br.noneHasL2&&!br.noneHasL6,JSON.stringify(br));ok("学生には準備内容を聞く",br.stuHasL6);
await p.evaluate(()=>{const T=__T;T.ui.ob={m:{motive:"respect",name:"先生",gender:"male"},sign:"x",l1:["4"],l2:"4"};T.ui.obStep=T.flowX().indexOf("l6");T.render()});
const l6=await p.$$eval('[data-act=obMulti]',x=>x.map(e=>e.innerText.trim()));
ok("準備内容は立場で出し分け（学生：教材あり・書類なし）",l6.includes("学習教材・提出物の準備")&&!l6.includes("必要書類の確認"),l6.length+"択");
await p.screenshot({path:'L1.png'});
await p.evaluate(()=>{const T=__T;T.ui.obStep=T.flowX().indexOf("l1");T.render()});
await p.click('[data-act=obMulti] >> nth=0');await p.click('[data-act=obMulti] >> nth=9');
ok("「特にない」は他と同時に選べない",JSON.stringify(await p.evaluate(()=>__T.ui.ob.l1))==='["9"]');
// 2) 既存の利用者（見本データ）
await p.evaluate(()=>{localStorage.clear()});await p.reload();await p.waitForTimeout(400);
await p.click('[data-act=demo]');await p.waitForTimeout(300);await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(300);
await p.evaluate(()=>{const T=__T;T.S.main.master={motive:"respect",name:"先生",gender:"male"};T.S.main.tutVer=3;T.S.main.tutDone=true;T.S.main.hints={keiko:1,roku:1,chikai:1};T.render()});await p.waitForTimeout(200);
ok("生活の問いの案内が道場に出る",!!(await p.$('#sec-life')));
await p.click('#sec-life [data-act=lifeStart]');await p.waitForTimeout(150);await p.click('[data-act=obNext]');
const ans={l1:[0],l2:0,l3:1,l4:[2,5],l5:[0,2],l6:[0,2,3]};
for(let n=0;n<10;n++){const id=await p.evaluate(()=>__T.flowX()[__T.ui.obStep]);if(id==="lifeDone")break;const a=ans[id];
  if(Array.isArray(a)){for(const i of a)await p.click('[data-act=obMulti][data-v="'+i+'"]');await p.click('[data-act=obNext]')}else await p.click('[data-act=obAns][data-v="'+a+'"]');await p.waitForTimeout(300)}
await p.screenshot({path:'L2.png'});await p.click('[data-act=lifeDone]');await p.waitForTimeout(200);
const life=await p.evaluate(()=>__T.S.main.life||(__T.S.main.profile&&__T.S.main.profile.life));ok("生活の答えが保存される",life&&JSON.stringify(life.l4)==='["2","5"]',JSON.stringify(life));
// 3) エンジン：三つの命令は異なる領域から・生活の困りごとが反映される
const eg=await p.evaluate(()=>{const T=__T;const k=T.todayKey();const D={0:"rel",1:"life",6:"life",2:"body",3:"mind",4:"env",5:"know"};let dup=0,n=0,life=0,lifeQ=0;
  for(let r=0;r<200;r++){const pl=T.missionPlan(k,r);if(pl.forced)continue;n++;const ds=pl.offers.filter(o=>!o.opp).map(o=>D[o.c]);if(new Set(ds).size!==ds.length)dup++;
    pl.offers.forEach(o=>{if(/忘れ物が多い|スマートフォンを使いすぎる/.test(o.why)){life++;const m=T.MBYID[o.id];if(m&&/^L/.test(m.q))lifeQ++}})}
  return {n,dup,life,lifeQ}});
ok("三つの命令は異なる領域から",eg.dup===0,"200回中 重複 "+eg.dup);ok("生活の困りごとから環境の命令が出る",eg.life>0&&eg.lifeQ>0,"理由つき "+eg.life+"回（専用命令 "+eg.lifeQ+"）");
// 似た命令：昨日の命令と同じ答え（q）に向けた命令は出にくい
const sim=await p.evaluate(()=>{const T=__T;const k=T.todayKey();const y=T.addDays(k,-1);let hit=0,n=0;
  for(let r=0;r<120;r++){const yd=T.day(y);const m0=T.MISSIONS[3][0];yd.mission={text:m0.t,mid:m0.id,cat:3,lv:1,result:"done"};const pl=T.missionPlan(k,r);pl.offers.forEach(o=>{const m=T.MBYID[o.id];n++;if(m&&m.q===m0.q)hit++})}
  T.day(y).mission=null;return {hit,n}});
ok("似た命令（同じ悪習慣向け）は7日間出にくい",sim.hit===0,"同じ系統 "+sim.hit+"/"+sim.n);
// 4) 未達成の原因
await p.evaluate(()=>{const T=__T;const k=T.todayKey();T.day(k).mission=null;T.render()});
await p.click('#sec-mission [data-act=setMission]');await p.click('#sheet [data-act=msCond][data-v=normal]');await p.waitForTimeout(150);await p.click('#ms-pick .qopt');await p.click('[data-act=saveMission]');await p.waitForTimeout(300);
const c0=await p.evaluate(()=>{const T=__T;const m=T.day(T.todayKey()).mission;return {c:m.cat,lv:m.cat?T.catLevel(m.cat,T.addDays(T.todayKey(),1)).lv:null}});
await p.click('#sec-mission [data-act=mres][data-v=miss]');await p.waitForTimeout(300);
ok("未達成で原因を選ぶ画面が出る",!!(await p.$('#sheet [data-act=missWhy]')));await p.screenshot({path:'L3.png'});
await p.click('[data-act=missWhy][data-v=hard]');await p.waitForTimeout(250);await p.click('#sheet .btn[data-act=closeSheet]');await p.waitForTimeout(150);
const c1=await p.evaluate(()=>{const T=__T;const m=T.day(T.todayKey()).mission;return {why:m.missWhy,lv:m.cat?T.catLevel(m.cat,T.addDays(T.todayKey(),1)).lv:null}});
ok("原因が記録される",c1.why==="hard");
ok("「難しすぎた」は一度で難度を下げる",c0.c===0||c1.lv<c0.lv,"分野"+c0.c+" "+c0.lv+"→"+c1.lv);
// 翌日の命令に原因が反映される（今日を昨日に見立てる）
const nx=await p.evaluate(()=>{const T=__T;const k=T.todayKey();const m=T.day(k).mission;m.missWhy="env";const pl=T.missionPlan(T.addDays(k,1),0);m.missWhy="hard";return pl.offers.map(o=>o.why).join(" / ")});
ok("翌日の命令に「環境が整っていなかった」が反映",/環境が整っていなかった/.test(nx),nx.slice(0,80));
// 5) 明日の仕込み
await p.click('#tabs [data-tab=roku]');await p.waitForTimeout(200);await p.click('#sec-reflect [data-act=reflect]');await p.waitForTimeout(200);
await p.click('[data-act=rfPick][data-f=screen] >> nth=1');await p.click('[data-act=rfPick][data-f=verdict][data-v=full]');await p.waitForTimeout(100);await p.click('[data-act=rfPick][data-f=fix] >> nth=0');await p.waitForTimeout(100);
const cands=await p.$$eval('#rf-prep [data-act=rfPrep]',x=>x.map(e=>e.innerText));ok("仕込みの候補は生活の答えから最大3つ（＋不要）",cands.length===4,cands.join("・"));
for(let i=0;i<4;i++)await p.click('#rf-prep [data-act=rfPrep] >> nth='+i);await p.click('#rf-prep [data-act=rfPrep] >> nth=0');await p.click('#rf-prep [data-act=rfPrep] >> nth=1');
await p.screenshot({path:'L4.png'});
await p.click('[data-act=saveReflect]');await p.waitForTimeout(300);
const pr=await p.evaluate(()=>__T.day(__T.todayKey()).prep);ok("選んだ仕込みが保存される（最大3つ）",pr&&pr.items.length===2,JSON.stringify(pr));
// 翌朝に見立てる：今日の記録を昨日へ移す
const e0=await p.evaluate(()=>{const T=__T;const k=T.todayKey(),y=T.addDays(k,-1);T.S.days[y]=Object.assign(T.S.days[y]||{logs:{},ritual:{},temptations:[]},{prep:T.S.days[k].prep});T.S.days[k].prep=null;T.render();return T.totalExp()});
await p.click('#tabs [data-tab=dojo]');await p.waitForTimeout(200);ok("翌朝、道場に仕込みの確認が出る",!!(await p.$('#sec-prep')));
await p.click('#sec-prep [data-act=prepRes][data-v="1"] >> nth=0');await p.click('#sec-prep [data-act=prepRes][data-v="0"] >> nth=1');await p.waitForTimeout(100);
await p.click('#sec-prep [data-act=prepSave]');ok("できなかった原因を選ばないと記録できない",!!(await p.$('#sec-prep')));
await p.click('#sec-prep [data-act=prepWhy] >> nth=0');await (await p.$('#sec-prep')).scrollIntoViewIfNeeded();await p.screenshot({path:'L5.png'});await p.click('#sec-prep [data-act=prepSave]');await p.waitForTimeout(300);
const e1=await p.evaluate(()=>__T.totalExp());ok("仕込みが効いた日は +2 EXP（一度だけ）",e1-e0===2,"+"+(e1-e0));
await p.evaluate(()=>__T.render());ok("記録後は確認カードが消え、EXPも増えない",!(await p.$('#sec-prep'))&&(await p.evaluate(()=>__T.totalExp()))===e1);
const st=await p.evaluate(()=>{const T=__T;const k=T.todayKey();for(let i=1;i<=20;i++){const d=T.day(T.addDays(k,-i-1));d.prepCheck={res:{plan:1},done:true}}return T.totalExp()});
ok("仕込みは14日で定着し、それ以上EXPは付かない",st-e1===2*13,"+"+(st-e1));
// 6) 武道録
await p.click('#tabs [data-tab=roku]');await p.waitForTimeout(200);ok("武道録に生活の基盤・失敗の原因",!!(await p.$('#sec-base'))&&(await p.textContent('#sec-base')).includes("難しすぎた"));
await (await p.$('#sec-base')).scrollIntoViewIfNeeded();await p.screenshot({path:'L6.png'});
}catch(e){R.push("CRASH "+e.message.split("\n").filter(l=>/intercepts|waiting for locator/.test(l)).slice(-2).join(" ~ "))}console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
