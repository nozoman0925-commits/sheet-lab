// 最終実装指示書：初回起動〜誓い〜入門の儀〜通常の道場までの通しテスト
const {chromium}=require('playwright');
const IMG=process.cwd()+'/a_img.png';
const R=[];const ok=(name,cond,extra)=>{R.push((cond?"PASS ":"FAIL ")+name+(extra?" | "+extra:""));};
async function upload(p,sel){const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click(sel)]);await fc.setFiles(IMG);await p.waitForSelector('#crop');await p.waitForTimeout(250);
  const b=await (await p.$('#crop')).boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2+30,b.y+b.height/2+20,{steps:4});await p.mouse.up();
  await p.$eval('#crop-z',e=>{e.value=1.6;e.dispatchEvent(new Event('input'))});await p.waitForTimeout(100);await p.click('[data-act=cropOk]');await p.waitForTimeout(400)}
const cur=p=>p.evaluate(()=>{const T=__T;return T.flowX()[T.ui.obStep]});
async function answerAll(p){for(let n=0;n<200;n++){const id=await cur(p);if(id==="building"){await p.waitForTimeout(500);continue}
  if(id==="type"||id==="result")return id;
  if(await p.$('#taunt:not([hidden]) [data-act=tauntNext]')){await p.click('#taunt [data-act=tauntNext]');await p.waitForTimeout(120);continue}
  if(id.startsWith("ch:")){await p.click('[data-act=obNext]');await p.waitForTimeout(80);continue}
  if(await p.$('[data-act=obTimes]')){await p.click('[data-act=obTimes]');await p.waitForTimeout(80);continue}
  if(await p.$('.pair-o')){await p.click('.pair-o.p'+(n%2?0:3));await p.waitForTimeout(320);continue}
  if(await p.$('[data-act=obMulti]')){await p.click('[data-act=obMulti] >> nth=1');await p.click('[data-act=obNext]');await p.waitForTimeout(80);continue}
  if(await p.$('[data-act=obAns]')){const o=await p.$$('[data-act=obAns]');await o[o.length-1].click();await p.waitForTimeout(320);continue}
  throw new Error("unknown screen "+id)}}
async function tutLoop(p,stop){for(let n=0;n<90;n++){const st=await p.evaluate(()=>{const T=__T;if(T.ui.tut==null)return null;const s=T.ui.tutSteps[T.ui.tut];return {i:T.ui.tut,ch:s.ch,sel:s.sel||null,press:!!s.press,next:!!s.next,allow:!!s.allow,reward:!!s.reward,chap:!!s.chap,t:s.t}});
  if(!st)return 'end';if(stop&&stop(st))return st;
  if(st.sel==='#ms-pick'){await p.click('#ms-pick .qopt')}
  else if(st.allow){if(await p.$('#sheet [data-act=msCond]')){await p.click('#sheet [data-act=msCond][data-v=normal]');await p.waitForTimeout(150);await p.click('#ms-pick .qopt');await p.click('[data-act=saveMission]')}
    else await p.click('#sheet .btn[data-act=closeSheet]')}
  else if(st.press)await p.click(st.sel);else if(st.next||st.chap)await p.click('[data-tut=next]');
  await p.waitForTimeout(160)}return 'loop'}
(async()=>{const b=await chromium.launch();try{const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});const p=await ctx.newPage();
var errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
await p.click('[data-act=obNext]');await p.waitForTimeout(150);
ok("初回起動で師範選択が最初に表示される",(await cur(p))==="m_pick"&&(await p.textContent('.q')).includes("己の師範を選べ。"));
ok("4つの選択肢が一画面に表示される",(await p.$$('.mopt')).length===4,"高さ "+await p.evaluate(()=>Math.round(document.querySelector('.mpick').getBoundingClientRect().bottom)));
await p.screenshot({path:'m1.png'});
await p.click('.mopt[data-v=rival]');await p.click('.mopt[data-v=dear]');
ok("一人だけ選択できる",(await p.$$('.mopt[aria-pressed=true]')).length===1&&await p.evaluate(()=>__T.ui.ob.m.motive)==="dear");
await p.click('[data-act=obNext]');await p.click('[data-act=mInfoNext]');ok("名前なしでは進めない",(await cur(p))==="m_info");
await p.fill('#mi-name','母さん');await p.click('[data-act=mInfoNext]');ok("性別なしでは進めない",(await cur(p))==="m_info");
await p.click('[data-act=mGender][data-v=female]');await p.click('details.more summary');await p.click('[data-act=mRel][data-v=母親]');await p.fill('#mi-reason','一番信じてくれた');await p.fill('#mi-feel','感謝');await p.fill('#mi-words','あんたならできる');
await p.screenshot({path:'m2.png',fullPage:true});
await p.click('[data-act=mInfoNext]');await p.waitForTimeout(150);
await p.screenshot({path:'m3a.png'});
await upload(p,'[data-act=mPhoto][data-v=lib]');
const mpk=await p.evaluate(()=>__T.ui.ob.m.pk);ok("師範写真を登録できる（切り抜き後に保存）",!!mpk&&!!(await p.evaluate(k=>localStorage.getItem("bushido.photo."+k),mpk)));
await p.screenshot({path:'m3.png'});
await p.click('[data-act=obNext]');await p.waitForTimeout(150);
ok("「己の姿を登録せよ。」が表示される",(await p.textContent('.q')).includes("己の姿を登録せよ。"));
await p.fill('#sf-name','武');await upload(p,'[data-act=sPhoto][data-v=lib]');
await p.screenshot({path:'m4.png'});
await p.click('[data-act=selfNext]');await p.waitForTimeout(150);
ok("「まずは己を知れ。」から診断を始める",(await p.textContent('.q')).includes("まずは己を知れ。"));
await p.click('[data-act=obNext]');await p.click('[data-act=obTone][data-v=gen]');await p.waitForTimeout(300);
const first=await cur(p);ok("診断の最初は生活の問い（16タイプは任意）",first==="ch:life",first);
const sc=await answerAll(p);
await p.screenshot({path:'m5.png',fullPage:true});
const nq=await p.evaluate(()=>__T.flowX().filter(x=>__T.QMAP&&0||(/^[a-z]\d+$/.test(x))).length);ok("初回の問いは安全と生活に絞る",nq<=25,nq+"問");
for(let i=0;i<2;i++){await p.click('[data-act=obNext]');await p.waitForTimeout(150)}
ok("計画の後に環境の関門",(await cur(p))==="env1");
await p.click('[data-act=envHas][data-v=no]');await p.click('[data-act=envNext]');await p.waitForTimeout(400);
ok("最終確認「この二人で、道を歩む。」",(await p.textContent('.q')).includes("この二人で、道を歩む。"));
const imgs=await p.$$eval('.duo img',x=>x.map(i=>i.src.slice(0,15)));ok("最終確認で両者の写真が表示される",imgs.length===2&&imgs.every(s=>s.startsWith("data:image/jpeg")),imgs.join(","));
await p.screenshot({path:'m6.png',fullPage:true});
await p.click('[data-act=mChange]');ok("設定を変更するで師範選択に戻る",(await cur(p))==="m_pick"&&await p.evaluate(()=>__T.ui.ob.m.name)==="母さん");
for(let i=0;i<3;i++){await p.click(i===0?'[data-act=obNext]':i===1?'[data-act=mInfoNext]':'[data-act=obNext]');await p.waitForTimeout(150)}
await p.click('[data-act=selfNext]');await p.waitForTimeout(200);
ok("変更後も答えを保ったまま確認に戻れる",(await cur(p))==="confirm");
await p.click('[data-act=obNext]');await p.waitForTimeout(200);
ok("師範への誓いの画面（指定本文）",(await p.textContent('.vow')).includes("その人を思い、己を律せよ。")&&(await p.textContent('.vow')).includes("この誓いを胸に、今日から稽古を始める。"));
await p.screenshot({path:'m7.png',fullPage:true});
await p.click('[data-act=vowGo]');await p.waitForTimeout(800);await p.screenshot({path:'m8a.png'});await p.waitForTimeout(6800);
const cv=await p.textContent('#ceremony');ok("誓いの演出：師範が登場し、最初の一言（大切な人）",cv.includes("師範、登場")&&cv.includes("ここまで来たね。これから一緒に頑張ろう。"));
await p.screenshot({path:'m8.png'});
const M=await p.evaluate(()=>{const m=__T.S.main;return {master:m.master,self0:m.self0,temp:!!(m.profile&&m.profile.temp&&Object.keys(m.profile.temp).length),onb:m.onboarded}});
ok("師範の人物情報が保存される",M.master.name==="母さん"&&M.master.gender==="female"&&M.master.rel==="母親"&&M.master.words==="あんたならできる"&&M.master.motive==="dear");
ok("自分の初期写真が保存される",!!(M.self0&&M.self0.key));ok("16タイプは入門で必須にしない（任意）",!M.temp);
const E0=await p.evaluate(()=>__T.totalExp());
await p.click('[data-cer=tut]');await p.waitForTimeout(300);
ok("誓いの後にチュートリアルが始まる",await p.evaluate(()=>__T.ui.tut===0&&__T.ui.tutKind==="main"));
await p.screenshot({path:'m9.png'});
// 第三章の途中まで進める
let st=await tutLoop(p,s=>s.ch===3&&s.press);await p.screenshot({path:'m10.png'});
await p.click('[data-tut=next]').catch(()=>{});
st=await tutLoop(p,s=>s.ch===3&&!s.press&&s.sel===".rankchip");
const Epr=await p.evaluate(()=>__T.totalExp());ok("練習中はEXPが練習として加算表示",Epr>0,"本番 "+E0+" → 練習中 "+Epr);
await p.screenshot({path:'m11.png'});
// 後で行う（中断）
await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(300);
const af=await p.evaluate(()=>{const T=__T;return {exp:T.totalExp(),m:T.day(T.todayKey()).mission,step:T.S.main.tutStep,snap:T.S.main.tutSnap,tut:T.ui.tut}});
ok("後で行う：練習データが消え、本番EXPは増えていない",af.exp===E0&&!af.m&&!af.snap&&af.tut==null,"EXP "+af.exp+" step "+af.step);
await p.reload();await p.waitForTimeout(600);
ok("再起動後：道場に再開カードが出る",!!(await p.$('#sec-tutresume')));
await p.click('#sec-tutresume [data-act=tutResume]');await p.waitForTimeout(300);
ok("中断した章（練習の選択から）から再開",await p.evaluate(()=>__T.ui.tutSteps[__T.ui.tut].ch)===2);
// 第四章の途中で再起動（後で行うを押さずに閉じる）
st=await tutLoop(p,s=>s.ch===4&&s.sel==="#sec-focus");
await p.reload();await p.waitForTimeout(700);
const rs=await p.evaluate(()=>{const T=__T;return {ch:T.ui.tut!=null&&T.ui.tutSteps[T.ui.tut].ch,exp:T.totalExp()}});
ok("閉じて再起動しても途中（第四章）から自動で再開",rs.ch===4,JSON.stringify(rs));
st=await tutLoop(p,s=>s.reward);await p.screenshot({path:'m12.png'});
ok("完了画面「入門の儀、完了。」と師範の言葉",(await p.textContent('#tut')).includes("入門の儀、完了。")&&(await p.textContent('#tut')).includes("よし。基本は教えた。これからは自分の意思で稽古を続けろ。")&&(await p.textContent('#tut [data-tut=next]')).includes("道場へ進む"));
await p.click('[data-tut=next]');await p.waitForTimeout(300);
const fin=await p.evaluate(()=>{const T=__T;const m=T.S.main;return {exp:T.totalExp(),ver:m.tutVer,flags:m.tutFlags,tab:document.querySelector('#tabs [aria-current=page]').dataset.tab,mission:T.day(T.todayKey()).mission}});
ok("完了後に通常の道場へ移行",fin.ver===3&&fin.tab==="dojo"&&!!(await p.$('#sec-master'))&&!(await p.$('#sec-tutresume')));
ok("完了条件6つを体験した",["dojo","mission","record","keiko","roku","advice"].every(k=>fin.flags[k]),JSON.stringify(fin.flags));
ok("チュートリアル用データで本番EXPが増えない",fin.exp===E0&&!fin.mission,"本番 "+E0+" → 完了後 "+fin.exp);
// 本番の稽古
await p.click('#sec-mission [data-act=setMission]');await p.click('#sheet [data-act=msCond][data-v=normal]');await p.waitForTimeout(150);await p.click('#ms-pick .qopt');await p.click('[data-act=saveMission]');await p.waitForTimeout(300);
const pk1=await p.evaluate(()=>document.querySelector("#mtoast").classList.contains("show"));ok("一振りを選ぶだけでは師範は出てこない（必要な場面だけ）",!pk1);
await p.click('#sec-mission [data-act=mres][data-v=done]');await p.waitForTimeout(300);
const E1=await p.evaluate(()=>__T.totalExp());ok("本番の達成でEXPが一度だけ加算",E1-E0===10||E1-E0===20,"+"+(E1-E0));
const dn=await p.textContent('#mtoast');ok("達成で師範が動機に応じて反応",/頑張ったね|見てたよ|続いてる/.test(dn),dn.replace(/\s+/g," "));
await p.screenshot({path:'m13.png'});
await p.click('#sec-mission [data-act=mres][data-v=done]').catch(()=>{});ok("同じ結果を押し直してもEXPは二重加算されない",(await p.evaluate(()=>__T.totalExp()))===E1);
// 型による伝え方の違い
const adv=await p.evaluate(()=>{const T=__T;const pf=T.S.main.profile;const keep=pf.temp;const r={};
  pf.temp=Object.fromEntries(Array.from({length:12},(_,i)=>["t"+(i+1),"0"]));r.a=T.adviceBody().replace(/<[^>]+>/g," ").slice(0,90);
  pf.temp=Object.fromEntries(Array.from({length:12},(_,i)=>["t"+(i+1),"3"]));r.b=T.adviceBody().replace(/<[^>]+>/g," ").slice(0,90);pf.temp=keep;return r});
ok("診断結果が師範の伝え方に反映される（動・型 と 静・波 で変わる）",adv.a!==adv.b,"動型:「"+adv.a.trim()+"」 静波:「"+adv.b.trim()+"」");
await p.click('#sec-master [data-act=masterAdvice]');await p.waitForTimeout(200);await p.screenshot({path:'m14.png'});await p.click('#sheet .btn[data-act=closeSheet]');
// 誓いの間：師範の変更・写真の変更と削除
await p.click('#tabs [data-tab=chikai]');await p.waitForTimeout(300);while(await p.$('[data-tut=next]')){await p.click('[data-tut=next]');await p.waitForTimeout(120)}
await (await p.$('#sec-mset')).scrollIntoViewIfNeeded();await p.screenshot({path:'m15.png'});
const oldPk=await p.evaluate(()=>__T.S.main.master.pk);
await upload(p,'#sec-mset [data-act=mMasterPhoto][data-v=lib]');
const newPk=await p.evaluate(()=>__T.S.main.master.pk);ok("師範写真を変更できる（古い写真は消す）",newPk&&newPk!==oldPk&&!(await p.evaluate(k=>localStorage.getItem("bushido.photo."+k),oldPk)));
await p.click('#sec-mset [data-act=mMasterPhotoDel]');await p.click('#sec-mset [data-act=mMasterPhotoDel]');await p.waitForTimeout(200);
ok("師範写真を削除できる（絵に戻る）",!(await p.evaluate(()=>__T.S.main.master.pk))&&(await p.$eval('#sec-mset .pf img',i=>i.src.startsWith("data:image/svg"))));
const s0=await p.evaluate(()=>__T.S.main.self0.key);
await upload(p,'#sec-self0 [data-act=mSelfPhoto][data-v=lib]');ok("自分の写真を変更できる",(await p.evaluate(()=>__T.S.main.self0.key))!==s0);
await p.click('#sec-self0 [data-act=mSelfDel]');await p.click('#sec-self0 [data-act=mSelfDel]');await p.waitForTimeout(200);ok("自分の写真を削除できる",!(await p.evaluate(()=>__T.S.main.self0)));
const before=await p.evaluate(()=>({exp:__T.totalExp(),days:Object.keys(__T.S.days).length,mission:JSON.stringify(__T.day(__T.todayKey()).mission)}));
await p.click('#sec-mset [data-act=mflowStart]');await p.click('.mopt[data-v=rival]');await p.click('[data-act=obNext]');await p.fill('#mi-name','佐藤');await p.click('[data-act=mGender][data-v=male]');await p.click('[data-act=mInfoNext]');await p.click('[data-act=obNext]');await p.waitForTimeout(200);
await p.click('[data-act=mEditDone]');await p.waitForTimeout(300);
const after=await p.evaluate(()=>({exp:__T.totalExp(),days:Object.keys(__T.S.days).length,mission:JSON.stringify(__T.day(__T.todayKey()).mission),m:__T.S.main.master}));
ok("師範設定の変更で稽古記録が消えない",after.exp===before.exp&&after.days===before.days&&after.mission===before.mission&&after.m.motive==="rival"&&after.m.name==="佐藤");
ok("負けたくない人（男性）の一人称は「俺」",await p.evaluate(()=>__T.mLine("grad")).then(x=>x.includes("俺")));
// 武道録：成長記録
await p.click('#tabs [data-tab=roku]');await p.waitForTimeout(300);while(await p.$('[data-tut=next]')){await p.click('[data-tut=next]');await p.waitForTimeout(120)}
ok("武道録に成長記録がある",!!(await p.$('#sec-mirror')));
// 再起動後も師範・写真が残る
await p.reload();await p.waitForTimeout(600);ok("再起動後も師範設定が残る",(await p.evaluate(()=>__T.S.main.master.name))==="佐藤");
// 写真なしでも動く（別の利用者）
const p2=await ctx.newPage();p2.on('pageerror',e=>errs.push("p2:"+e.message));await p2.goto('http://localhost:8765/index.html');await p2.evaluate(()=>localStorage.clear());await p2.reload();await p2.waitForTimeout(400);
await p2.click('[data-act=obNext]');await p2.click('.mopt[data-v=respect]');await p2.click('[data-act=obNext]');await p2.fill('#mi-name','先生');await p2.click('[data-act=mGender][data-v=none]');await p2.click('[data-act=mInfoNext]');await p2.waitForTimeout(150);
ok("写真なし：動機・性別に応じた師範の絵",await p2.$eval('.pf-wrap img',i=>i.src.startsWith("data:image/svg")));await p2.screenshot({path:'m16.png'});
await p2.click('[data-act=obNext]');await p2.fill('#sf-name','無');await p2.click('[data-act=selfNext]');await p2.click('[data-act=obNext]');await p2.click('[data-act=obTone][data-v=on]');await p2.waitForTimeout(300);
await answerAll(p2);await p2.click('[data-act=obNext]');await p2.waitForTimeout(150);await p2.click('[data-act=obNext]');await p2.waitForTimeout(150);await p2.click('[data-act=envHas][data-v=no]');await p2.click('[data-act=envNext]');await p2.waitForTimeout(300);
await p2.click('[data-act=obNext]');await p2.click('[data-act=vowGo]');await p2.waitForTimeout(7300);
ok("写真なしでも誓いの演出が動く（尊敬する人の一言）",(await p2.textContent('#ceremony')).includes("覚悟は受け取った。では、まず一つ目の稽古を始めよう。"));
await p2.click('[data-cer=tut]');const e2=await p2.evaluate(()=>__T.totalExp());const r2=await tutLoop(p2);ok("写真なしでも入門の儀を最後まで完了",r2==='end'&&await p2.evaluate(()=>__T.S.main.tutVer)===3&&(await p2.evaluate(()=>__T.totalExp()))===e2);
}catch(e){R.push('CRASH '+e.message.split('\n')[0])}console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
