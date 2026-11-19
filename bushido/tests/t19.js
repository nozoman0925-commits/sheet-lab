// 初回起動〜師範〜短い入門〜誓い〜最初の入門の儀〜通常の道場までの通しテスト（第34版の流れ）
const {chromium}=require('playwright');
const IMG=process.cwd()+'/a_img.png';
const R=[];const ok=(name,cond,extra)=>{R.push((cond?"PASS ":"FAIL ")+name+(extra?" | "+extra:""));};
async function upload(p,sel){const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click(sel)]);await fc.setFiles(IMG);await p.waitForSelector('#crop');await p.waitForTimeout(250);
  const b=await (await p.$('#crop')).boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2+30,b.y+b.height/2+20,{steps:4});await p.mouse.up();
  await p.$eval('#crop-z',e=>{e.value=1.6;e.dispatchEvent(new Event('input'))});await p.waitForTimeout(100);await p.click('[data-act=cropOk]');await p.waitForTimeout(400)}
const cur=p=>p.evaluate(()=>{const T=__T;return T.flowX()[T.ui.obStep]});
async function answerAll(p){for(let n=0;n<80;n++){const id=await cur(p);if(id==="building"){await p.waitForTimeout(500);continue}
  if(id==="result"||id==="confirm")return id;
  if(await p.$('#taunt:not([hidden]) [data-act=tauntNext]')){await p.click('#taunt [data-act=tauntNext]');await p.waitForTimeout(120);continue}
  if(id.startsWith("ch:")){await p.click('[data-act=obNext]');await p.waitForTimeout(80);continue}
  if(await p.$('[data-act=obMulti]')){await p.click('[data-act=obMulti] >> nth=1');await p.click('[data-act=obNext]');await p.waitForTimeout(80);continue}
  if(await p.$('[data-act=obAns]')){const o=await p.$$('[data-act=obAns]');await o[o.length-1].click();await p.waitForTimeout(320);continue}
  throw new Error("unknown screen "+id)}}
async function tutLoop(p,stop){for(let n=0;n<90;n++){const st=await p.evaluate(()=>{const T=__T;if(T.ui.tut==null)return null;const s=T.ui.tutSteps[T.ui.tut];return {i:T.ui.tut,ch:s.ch,sel:s.sel||null,press:!!s.press,next:!!s.next,allow:!!s.allow,reward:!!s.reward,chap:!!s.chap,t:s.t}});
  if(!st)return 'end';if(stop&&stop(st))return st;
  if(st.sel==='#ms-pick'){await p.click('#ms-pick .qopt')}
  else if(st.allow){if(await p.$('#sheet [data-act=msCond]')){await p.click('#sheet [data-act=msCond][data-v=normal]');await p.waitForTimeout(150);await p.click('#ms-pick .qopt');await p.click('[data-act=saveMission]')}
    else await p.click('#sheet .btn[data-act=closeSheet]')}
  else if(st.press)await p.click(st.sel);else if(st.next||st.chap)await p.click('[data-tut=next]');
  await p.waitForTimeout(200)}return 'loop'}
(async()=>{const b=await chromium.launch();try{const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});const p=await ctx.newPage();
var errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
await p.click('[data-act=obNext]');await p.waitForTimeout(150);
ok("初回起動で師範選択が最初に表示される",(await cur(p))==="m_pick"&&(await p.textContent('.q')).includes("己の師範を選べ。"));
ok("4つの選択肢が一画面に表示される",(await p.$$('.mopt')).length===4);
await p.click('.mopt[data-v=rival]');await p.click('.mopt[data-v=dear]');
ok("一人だけ選択できる",(await p.$$('.mopt[aria-pressed=true]')).length===1&&await p.evaluate(()=>__T.ui.ob.m.motive)==="dear");
await p.click('[data-act=obNext]');await p.click('[data-act=mInfoNext]');ok("名前なしでは進めない",(await cur(p))==="m_info");
await p.fill('#mi-name','母さん');await p.click('[data-act=mInfoNext]');ok("性別なしでは進めない",(await cur(p))==="m_info");
await p.click('[data-act=mGender][data-v=female]');await p.click('details.more summary');await p.click('[data-act=mRel][data-v=母親]');await p.fill('#mi-reason','一番信じてくれた');await p.fill('#mi-feel','感謝');await p.fill('#mi-words','あんたならできる');
await p.screenshot({path:'m2.png',fullPage:true});
await p.click('[data-act=mInfoNext]');await p.waitForTimeout(150);
await upload(p,'[data-act=mPhoto][data-v=lib]');
const mpk=await p.evaluate(()=>__T.ui.ob.m.pk);ok("師範写真を登録できる（切り抜き後に保存）",!!mpk&&!!(await p.evaluate(k=>localStorage.getItem("bushido.photo."+k),mpk)));
await p.click('[data-act=obNext]');await p.waitForTimeout(200);
const first=await cur(p);ok("写真の次はすぐ問い（己の姿・言葉づかいは後で）",first.startsWith("ch:"),first);
await answerAll(p);
const qs=await p.evaluate(()=>__T.flowX().filter(x=>/^[a-z]\d+$/.test(x)));ok("初回の問いは安全・目標・時間の5問",qs.length===5,qs.join(","));
for(let i=0;i<3&&(await cur(p))!=="confirm";i++){await p.click('[data-act=obNext]');await p.waitForTimeout(200)}
ok("問いの後は最終確認（SNSの関門は使い始めてから）",(await cur(p))==="confirm"&&(await p.textContent('.q')).includes("この二人で、道を歩む。"));
ok("最終確認で師範の写真が表示される",await p.$$eval('.duo img',x=>x.some(i=>i.src.startsWith("data:image/jpeg"))));
await p.screenshot({path:'m6.png',fullPage:true});
await p.click('[data-act=obNext]');await p.waitForTimeout(200);ok("呼び名なしでは決定できない",(await cur(p))==="confirm");
await p.click('[data-act=mChange]');ok("設定を変更するで師範選択に戻る（答えは保つ）",(await cur(p))==="m_pick"&&await p.evaluate(()=>__T.ui.ob.m.name)==="母さん");
for(let i=0;i<20&&(await cur(p))!=="confirm";i++){const id=await cur(p);if(id==="m_info")await p.click('[data-act=mInfoNext]');else if(id==="building"){await p.waitForTimeout(400);continue}else await p.click('[data-act=obNext]');await p.waitForTimeout(150)}
ok("変更後も答えを保ったまま確認に戻れる",(await cur(p))==="confirm");
await p.fill('#cf-sign','武');await p.click('[data-act=obNext]');await p.waitForTimeout(200);
ok("師範への誓いの画面（指定本文）",(await p.textContent('.vow')).includes("その人を思い、己を律せよ。")&&(await p.textContent('.vow')).includes("この誓いを胸に、今日から稽古を始める。"));
await p.click('[data-act=vowGo]');await p.waitForTimeout(7600);
const cv=await p.textContent('#ceremony');ok("誓いの演出：師範が登場し、最初の一言（大切な人）",cv.includes("師範、登場")&&cv.includes("ここまで来たね。これから一緒に頑張ろう。"));
const M=await p.evaluate(()=>{const m=__T.S.main;return {master:m.master,name:m.displayName,temp:!!(m.profile&&m.profile.temp&&Object.keys(m.profile.temp).length),onb:m.onboarded,view:m.viewDefault}});
ok("師範の人物情報が保存される",M.master.name==="母さん"&&M.master.gender==="female"&&M.master.rel==="母親"&&M.master.words==="あんたならできる"&&M.master.motive==="dear");
ok("呼び名が保存される",M.name==="武");ok("16タイプは入門で必須にしない（任意）",!M.temp);ok("初めての人の表示の量は「最小」",M.view==="min");
const E0=await p.evaluate(()=>__T.totalExp());
await p.click('[data-cer=tut]');await p.waitForTimeout(300);
ok("誓いの後に、短い入門の儀が始まる",await p.evaluate(()=>__T.ui.tut===0&&__T.ui.tutKind==="main"&&__T.ui.tutSteps.length<10));
// 途中で「後で行う」
await tutLoop(p,s=>s.press);
await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(300);
const af=await p.evaluate(()=>{const T=__T;return {exp:T.totalExp(),m:T.day(T.todayKey()).mission,snap:T.S.main.tutSnap,tut:T.ui.tut}});
ok("後で行う：練習データが消え、本番EXPは増えていない",af.exp===E0&&!af.m&&!af.snap&&af.tut==null,"EXP "+af.exp);
await p.reload();await p.waitForTimeout(600);
ok("再起動後：入門の儀を再開できる",!!(await p.$('#sec-tutresume')));
await p.click('#sec-tutresume [data-act=tutResume]');await p.waitForTimeout(300);
const r1=await tutLoop(p);ok("入門の儀を最後まで完了",r1==='end');
const fin=await p.evaluate(()=>{const T=__T;const m=T.S.main;return {exp:T.totalExp(),ver:m.tutVer,done:m.tutDone,tab:document.querySelector('#tabs [aria-current=page]').dataset.tab,mission:T.day(T.todayKey()).mission}});
ok("完了後に通常の道場へ移行",fin.ver===3&&fin.done&&fin.tab==="dojo"&&!(await p.$('#sec-tutresume')));
ok("チュートリアル用データで本番EXPが増えない",fin.exp===E0&&!fin.mission,"本番 "+E0+" → 完了後 "+fin.exp);
// 本番の稽古：おすすめ一つを始めて、やり切る
await p.waitForFunction(()=>!document.querySelector('#mtoast').classList.contains('show'),null,{timeout:9000}).catch(()=>{});
await p.click('#sec-mission [data-act=startRec]');await p.waitForTimeout(300);
const pk1=await p.evaluate(()=>document.querySelector("#mtoast").classList.contains("show"));ok("稽古を始めるだけでは師範は出てこない（必要な場面だけ）",!pk1);
await p.click('#sec-mission [data-act=mres][data-v=done]');await p.waitForTimeout(300);
const E1=await p.evaluate(()=>__T.totalExp());ok("本番の達成でEXPが一度だけ加算",E1-E0===10||E1-E0===20,"+"+(E1-E0));
const dn=await p.textContent('#mtoast');ok("達成で師範が動機に応じて反応",/頑張ったね|見てたよ|続いてる/.test(dn),dn.replace(/\s+/g," "));
await p.screenshot({path:'m13.png'});
await p.click('#sec-mission [data-act=heroRedo]');await p.click('#sec-mission [data-act=mres][data-v=done]').catch(()=>{});ok("結果を押し直してもEXPは二重加算されない",(await p.evaluate(()=>__T.totalExp()))===E1);
// 型による伝え方の違い
const adv=await p.evaluate(()=>{const T=__T;const pf=T.S.main.profile;const keep=pf.temp;const r={};
  pf.temp=Object.fromEntries(Array.from({length:12},(_,i)=>["t"+(i+1),"0"]));r.a=T.adviceBody().replace(/<[^>]+>/g," ").slice(0,90);
  pf.temp=Object.fromEntries(Array.from({length:12},(_,i)=>["t"+(i+1),"3"]));r.b=T.adviceBody().replace(/<[^>]+>/g," ").slice(0,90);pf.temp=keep;return r});
ok("診断結果が師範の伝え方に反映される",adv.a!==adv.b);
await p.click('#sec-master [data-act=masterAdvice]');await p.waitForTimeout(200);await p.screenshot({path:'m14.png'});await p.click('#sheet .btn[data-act=closeSheet]');
// 誓いの間：師範の写真、自分の写真（あとから登録）、言葉づかい
await p.click('#tabs [data-tab=chikai]');await p.waitForTimeout(300);while(await p.$('[data-tut=next]')){await p.click('[data-tut=next]');await p.waitForTimeout(120)}
const oldPk=await p.evaluate(()=>__T.S.main.master.pk);
await upload(p,'#sec-mset [data-act=mMasterPhoto][data-v=lib]');
const newPk=await p.evaluate(()=>__T.S.main.master.pk);ok("師範写真を変更できる（古い写真は消す）",newPk&&newPk!==oldPk&&!(await p.evaluate(k=>localStorage.getItem("bushido.photo."+k),oldPk)));
await p.click('#sec-mset [data-act=mMasterPhotoDel]');await p.click('#sec-mset [data-act=mMasterPhotoDel]');await p.waitForTimeout(200);
ok("師範写真を削除できる（絵に戻る）",!(await p.evaluate(()=>__T.S.main.master.pk))&&(await p.$eval('#sec-mset .pf img',i=>i.src.startsWith("data:image/svg"))));
await upload(p,'#sec-self0 [data-act=mSelfPhoto][data-v=lib]');ok("自分の写真は、あとから誓いの間で登録できる",!!(await p.evaluate(()=>__T.S.main.self0&&__T.S.main.self0.key)));
await p.click('#sec-self0 [data-act=mSelfDel]');await p.click('#sec-self0 [data-act=mSelfDel]');await p.waitForTimeout(200);ok("自分の写真を削除できる",!(await p.evaluate(()=>__T.S.main.self0)));
await p.click('#sec-tone [data-act=setTone][data-v=oni]');await p.waitForTimeout(150);ok("師範の言葉づかいを誓いの間で変えられる",await p.evaluate(()=>__T.S.main.tone)==="oni");
const before=await p.evaluate(()=>({exp:__T.totalExp(),days:Object.keys(__T.S.days).length,mission:JSON.stringify(__T.day(__T.todayKey()).mission)}));
await p.click('#sec-mset [data-act=mflowStart]');await p.click('.mopt[data-v=rival]');await p.click('[data-act=obNext]');await p.fill('#mi-name','佐藤');await p.click('[data-act=mGender][data-v=male]');await p.click('[data-act=mInfoNext]');await p.click('[data-act=obNext]');await p.waitForTimeout(200);
await p.click('[data-act=mEditDone]');await p.waitForTimeout(300);
const after=await p.evaluate(()=>({exp:__T.totalExp(),days:Object.keys(__T.S.days).length,mission:JSON.stringify(__T.day(__T.todayKey()).mission),m:__T.S.main.master}));
ok("師範設定の変更で稽古記録が消えない",after.exp===before.exp&&after.days===before.days&&after.mission===before.mission&&after.m.motive==="rival"&&after.m.name==="佐藤");
ok("負けたくない人（男性）の一人称は「俺」",await p.evaluate(()=>__T.mLine("grad")).then(x=>x.includes("俺")));
await p.click('#tabs [data-tab=roku]');await p.waitForTimeout(300);while(await p.$('[data-tut=next]')){await p.click('[data-tut=next]');await p.waitForTimeout(120)}
ok("武道録に成長記録がある",!!(await p.$('#sec-mirror')));
await p.reload();await p.waitForTimeout(600);ok("再起動後も師範設定が残る",(await p.evaluate(()=>__T.S.main.master.name))==="佐藤");
// 写真なしでも動く（別の利用者）
const p2=await ctx.newPage();p2.on('pageerror',e=>errs.push("p2:"+e.message));await p2.goto('http://localhost:8765/index.html');await p2.evaluate(()=>localStorage.clear());await p2.reload();await p2.waitForTimeout(400);
await p2.click('[data-act=obNext]');await p2.click('.mopt[data-v=respect]');await p2.click('[data-act=obNext]');await p2.fill('#mi-name','先生');await p2.click('[data-act=mGender][data-v=none]');await p2.click('[data-act=mInfoNext]');await p2.waitForTimeout(150);
ok("写真なし：動機・性別に応じた師範の絵",await p2.$eval('.pf-wrap img',i=>i.src.startsWith("data:image/svg")));
await p2.click('[data-act=obNext]');await p2.waitForTimeout(150);
await answerAll(p2);for(let i=0;i<3&&(await cur(p2))!=="confirm";i++){await p2.click('[data-act=obNext]');await p2.waitForTimeout(200)}
await p2.fill('#cf-sign','無');await p2.click('[data-act=obNext]');await p2.waitForTimeout(150);await p2.click('[data-act=vowGo]');await p2.waitForTimeout(7300);
ok("写真なしでも誓いの演出が動く（尊敬する人の一言）",(await p2.textContent('#ceremony')).includes("覚悟は受け取った。では、まず一つ目の稽古を始めよう。"));
await p2.click('[data-cer=tut]');const e2=await p2.evaluate(()=>__T.totalExp());const r2=await tutLoop(p2);ok("写真なしでも入門の儀を最後まで完了",r2==='end'&&await p2.evaluate(()=>__T.S.main.tutVer)===3&&(await p2.evaluate(()=>__T.totalExp()))===e2);
}catch(e){R.push('CRASH '+e.message.split('\n')[0])}console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
