// 第35版：師範（人物）をやめて格言へ。すでに登録された師範のデータは消さずに残す。誓いの間・写真・EXP・再起動
const {chromium}=require('playwright');
const IMG=process.cwd()+'/a_img.png';
const R=[];const ok=(name,cond,extra)=>{R.push((cond?"PASS ":"FAIL ")+name+(extra?" | "+extra:""));};
async function upload(p,sel){const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click(sel)]);await fc.setFiles(IMG);await p.waitForSelector('#crop');await p.waitForTimeout(250);
  const b=await (await p.$('#crop')).boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2+30,b.y+b.height/2+20,{steps:4});await p.mouse.up();
  await p.$eval('#crop-z',e=>{e.value=1.6;e.dispatchEvent(new Event('input'))});await p.waitForTimeout(100);await p.click('[data-act=cropOk]');await p.waitForTimeout(400)}
(async()=>{const b=await chromium.launch();const errs=[];try{const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});const p=await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));
// すでに師範を登録していた人（第34版までの記録）
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
await p.click('[data-act=demo]');await p.waitForTimeout(300);await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(300);
await p.evaluate(()=>{const T=__T;const M=T.S.main;M.demo=false;M.master={motive:"dear",name:"母さん",gender:"female",rel:"母親",words:"あんたならできる",date:T.todayKey()};M.vow={date:T.todayKey(),master:"母さん"};M.tutVer=3;M.tutDone=true;M.hints={keiko:1,roku:1,chikai:1};T.day(T.todayKey()).mission=null;T.render()});
ok("師範のデータは消さずに残っている",await p.evaluate(()=>__T.S.main.master&&__T.S.main.master.name==="母さん"));
ok("道場に師範のカード・師範の言葉は出ない",await p.evaluate(()=>!document.querySelector('#sec-master')&&!/師範 ・ 母さん|母さん「/.test(document.querySelector('#app').textContent)));
const E0=await p.evaluate(()=>__T.totalExp());
await p.click('#sec-mission [data-act=startRec]');await p.waitForTimeout(300);
await p.click('#sec-mission [data-act=mres][data-v=done]');await p.waitForTimeout(300);
const E1=await p.evaluate(()=>__T.totalExp());ok("本番の達成でEXPが一度だけ加算",E1-E0===10||E1-E0===20,"+"+(E1-E0));
const say=await p.textContent('#mtoast');ok("達成の知らせは出典つきの格言（人物の名前・写真なし）",/^格言 ・ /.test(say.trim())&&!say.includes("母さん")&&!(await p.$('#mtoast .pf img[src^="data:image/jpeg"]')),say.replace(/\s+/g," ").slice(0,60));
await p.click('#sec-mission [data-act=heroRedo]');await p.click('#sec-mission [data-act=mres][data-v=done]').catch(()=>{});ok("結果を押し直してもEXPは二重加算されない",(await p.evaluate(()=>__T.totalExp()))===E1);
// 誓いの間
await p.click('#tabs [data-tab=chikai]');await p.waitForTimeout(300);while(await p.$('[data-tut=next]')){await p.click('[data-tut=next]');await p.waitForTimeout(120)}
const cg=await p.$$eval('#app details.grp .gt',x=>x.map(e=>e.textContent).join(","));ok("誓いの間は四つの分類（師範の分類はない）",cg==="自分の誓い,自分の成長,表示と通知,データ管理",cg);
ok("師範の設定・師範への誓いの区画は出さない",!(await p.$('#sec-mset'))&&!(await p.$('#sec-vow')));
await upload(p,'#sec-self0 [data-act=mSelfPhoto][data-v=lib]');ok("自分の写真（開始時点）を誓いの間で登録できる",!!(await p.evaluate(()=>__T.S.main.self0&&__T.S.main.self0.key)));
await p.click('#sec-self0 [data-act=mSelfDel]');await p.click('#sec-self0 [data-act=mSelfDel]');await p.waitForTimeout(200);ok("自分の写真を削除できる",!(await p.evaluate(()=>__T.S.main.self0)));
await p.click('#sec-tone [data-act=setTone][data-v=oni]');await p.waitForTimeout(150);ok("言葉の厳しさを「表示と通知」で変えられる",await p.evaluate(()=>__T.S.main.tone==="oni"&&!!document.querySelector('#sec-tone').closest('details')&&document.querySelector('#sec-tone').closest('details').querySelector('.gt').textContent==="表示と通知"));
// 入門の儀（全編）は誓いの間から。師範の章は出ない
await p.evaluate(()=>__T.A.tutStart());await p.waitForTimeout(300);
const tt=[];for(let i=0;i<60;i++){const s=await p.evaluate(()=>{const T=__T;if(T.ui.tut==null)return null;const s=T.ui.tutSteps[T.ui.tut];return {t:s.t||"",sel:s.sel||null,press:!!s.press}});if(!s)break;tt.push(s.t);
  if(s.press){const e=await p.$(s.sel);if(e)await e.click({timeout:3000}).catch(()=>{});else await p.click('[data-tut=next]',{timeout:3000}).catch(()=>{})}else await p.click('[data-tut=next]',{timeout:3000}).catch(()=>{});await p.waitForTimeout(220);
  if(await p.$('#sheet [data-act=msCond]')){await p.click('#sheet [data-act=msCond][data-v=normal]',{timeout:3000}).catch(()=>{})}if(s.sel==='#ms-pick'){await p.click('#ms-pick .qopt',{timeout:3000}).catch(()=>{})}}
ok("全編の入門の儀を最後まで進められ、師範の手順は出ない",await p.evaluate(()=>__T.ui.tut==null)&&!tt.some(t=>/師範/.test(t)),tt.length+"手順");
ok("入門の儀で本番のEXPは増えない",(await p.evaluate(()=>__T.totalExp()))===E1);
// 武道録と再起動
await p.click('#tabs [data-tab=roku]');await p.waitForTimeout(300);while(await p.$('[data-tut=next]')){await p.click('[data-tut=next]');await p.waitForTimeout(120)}
ok("武道録に成長記録（姿見）がある",!!(await p.$('#sec-mirror')));
await p.reload();await p.waitForTimeout(700);ok("再起動後も記録と師範のデータが残る",await p.evaluate(()=>__T.S.main.master&&__T.S.main.master.name==="母さん"&&__T.totalExp()>0));
}catch(e){R.push('CRASH '+e.message.split('\n').slice(0,3).join(' ~ '))}console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
