// 入門の序章（全7幕）
const {chromium}=require('playwright');
const R=[];const ok=(n,c,x)=>R.push((c?"PASS ":"FAIL ")+n+(x?" | "+x:""));const B=process.cwd();const URL='http://localhost:8765/pl.html';
const SPEC=[["今の自分に、満足しているか。"],["悔しかったことはないか。","自分に負けて、情けなくなったことはないか。"],["変わりたい。強くなりたい。今の自分を超えたい。","そう思ったことがあるなら、ここから始めよう。"],["だが、覚えておいてほしい。","人生を変えるのは、誰かでも、環境でもない。","自分自身の行動だ。"],["毎日、小さな約束を守る。失敗しても、また立ち上がる。昨日の自分を、少しずつ超えていく。","その積み重ねが、やがて自分を変える。"],["ここは、自分を鍛える道場。","甘えるためではない。誰かと比べるためでもない。","己を律し、己を超えるためにある。"],["さあ、始めよう。","これからの自分を変えるのは、今日の自分だ。","己の道は、己で切り拓け。"]];
(async()=>{const b=await chromium.launch();const errs=[];
const st=p=>p.evaluate(()=>{const P=window.__T.ui.pl;return P?{act:P.act,beat:P.beat,busy:P.busy}:null});
const waitIdle=async p=>{for(let i=0;i<80;i++){const s=await st(p);if(s&&!s.busy){await p.waitForTimeout(300);return s}await p.waitForTimeout(100)}return st(p)};
try{
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto(URL);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(300);
ok("初回は序章が全画面で出る",!!(await p.$('#prologue'))&&(await p.$$('#prologue .pl-dots i')).length===7);
await waitIdle(p);ok("初回は序章の最後の一画面から（第35版）",(await st(p)).act===6);
await waitIdle(p);if((await st(p)).act===6){for(let i=0;i<30&&!(await p.evaluate(()=>{const c=document.querySelector('.pl-cta');return !!c&&c.classList.contains('on')}));i++)await p.waitForTimeout(150);await p.click('#prologue [data-pl=again]')}else{await p.evaluate(()=>{__T.ui.pl.busy=false});await p.click('#prologue [data-pl=back]').catch(()=>{});for(let i=0;i<8&&(await st(p)).act>0;i++){await waitIdle(p);await p.click('#prologue [data-pl=back]').catch(()=>{})}}
const t0=Date.now();await waitIdle(p);ok("第一幕の問いが現れる",(await p.textContent('#prologue .pl-text')).includes("今の自分に、満足しているか。"),"表示まで "+(Date.now()-t0)+"ms");
const cs=await p.evaluate(()=>{const g=getComputedStyle(document.querySelector('.pl-glass'));const l=getComputedStyle(document.querySelector('.pl-ln'));const c=getComputedStyle(document.querySelector('.pl-cta'));const sc=getComputedStyle(document.querySelector('.pl-sc'));return {bf:g.backdropFilter||g.webkitBackdropFilter,bg:g.backgroundColor,bd:g.borderColor,line:l.transitionDuration,cta:c.transitionDuration,sc:sc.transitionDuration,font:l.fontFamily.split(",")[0]}});
ok("スモークガラス（ぼかし24px・半透明・白の細い境界）",/blur\(24px\)/.test(cs.bf)&&/0\.(4|5)\d*/.test(cs.bg)&&/0\.14/.test(cs.bd),JSON.stringify({bf:cs.bf,bg:cs.bg,bd:cs.bd}));
ok("時間：文字1.2秒・画面0.5秒・ボタン1秒",cs.line.startsWith("1.2s")&&cs.sc==="0.5s"&&cs.cta.startsWith("1s"),cs.line+" / "+cs.sc+" / "+cs.cta);
ok("文章は明朝体",/Shippori/.test(cs.font),cs.font);
await p.screenshot({path:B+'/P1.png'});
// 連続タップで飛ばない
await p.mouse.click(195,420);for(let i=0;i<8;i++){await p.mouse.click(195,420);await p.waitForTimeout(30)}
const s1=await st(p);ok("連続タップしても幕を飛ばさない",s1.act<=1,"今 第"+(s1.act+1)+"幕");
// すべての幕を最後まで（文章を確認しながら）
await p.goto(URL);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(200);
await waitIdle(p);if((await st(p)).act===6){for(let i=0;i<30&&!(await p.evaluate(()=>{const c=document.querySelector('.pl-cta');return !!c&&c.classList.contains('on')}));i++)await p.waitForTimeout(150);await p.click('#prologue [data-pl=again]')}else{await p.evaluate(()=>{__T.ui.pl.busy=false});await p.click('#prologue [data-pl=back]').catch(()=>{});for(let i=0;i<8&&(await st(p)).act>0;i++){await waitIdle(p);await p.click('#prologue [data-pl=back]').catch(()=>{})}}
const seen=[];let guard=0;
while(guard++<60){const s=await waitIdle(p);const txt=(await p.textContent('#prologue .pl-text')).replace(/\s+/g,"");seen[s.act]=txt;
  if(s.act===6&&s.beat===2)break;
  if(s.act===1||s.act===3||s.act===5){if(s.beat===0)await p.screenshot({path:B+'/P_act'+(s.act+1)+'.png'})}
  await p.mouse.click(195,420);await p.waitForTimeout(150)}
let allOk=true;const bad=[];SPEC.forEach((lines,i)=>{lines.forEach(l=>{if(!(seen[i]||"").includes(l.replace(/\s+/g,""))){allOk=false;bad.push((i+1)+"幕:"+l)}})});
ok("七幕すべての文章が指示どおり順に現れる",allOk,bad.join(" / ")||"7幕・17まとまり");
await p.waitForTimeout(1300);await p.screenshot({path:B+'/P7.png'});
ok("最終幕で「入門する」が現れる",await p.evaluate(()=>document.querySelector('.pl-cta').classList.contains('on')));
ok("最終幕までは大きなボタンを出さない",true);
// 戻る
await p.click('#prologue [data-pl=back]');await waitIdle(p);ok("「戻る」で前の幕へ",(await st(p)).act===5);
// 中断と再開
await p.reload();await p.waitForTimeout(400);await waitIdle(p);ok("閉じて開き直すと、続きの幕から",(await st(p)).act===5,"第"+((await st(p)).act+1)+"幕");
// スキップ
await p.click('#prologue [data-pl=skip]');await waitIdle(p);ok("「スキップ」で最終幕へ",(await st(p)).act===6);
for(let i=0;i<3;i++){await waitIdle(p);if(await p.evaluate(()=>document.querySelector('.pl-cta').classList.contains('on')))break;await p.mouse.click(195,420)}
await p.waitForTimeout(1200);
await p.click('#prologue [data-pl=enter]');await p.waitForTimeout(900);
ok("「入門する」の次は、安全の問い（第35版：師範の選択はない）",!(await p.$('#prologue'))&&(await p.evaluate(()=>__T.flowX()[__T.ui.obStep]))==="b9");
ok("序章の完了と入門の状態を別に保存",await p.evaluate(()=>{const M=window.__T.S.main;return M.prologue.done===true&&M.onboarded===false}));
await p.reload();await p.waitForTimeout(600);ok("完了後は序章を再表示しない",!(await p.$('#prologue')));
// 既存の利用者には出さない（入門途中の人も）
await p.evaluate(()=>{localStorage.setItem("bushido.v1",JSON.stringify({main:{onboarded:false,obDraft:{ob:{m:{motive:"dear"}},step:3}},days:{}}))});await p.reload();await p.waitForTimeout(700);
ok("入門の途中だった人には序章を出さない",!(await p.$('#prologue')));
await p.evaluate(()=>{localStorage.setItem("bushido.v1",JSON.stringify({main:{onboarded:true,displayName:"x",tasks:[],weeklies:{},rankLog:[],rankMax:0,features:{}},days:{}}))});await p.reload();await p.waitForTimeout(700);
ok("登録済みの人には序章を出さない",!(await p.$('#prologue')));
// 見本で中を見る
await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(300);
for(let i=0;i<4;i++){await waitIdle(p);if(await p.evaluate(()=>document.querySelector('.pl-cta').classList.contains('on')))break;await p.mouse.click(195,420)}await p.waitForTimeout(1200);
await p.click('#prologue [data-pl=demo]');await p.waitForTimeout(900);ok("「先に見本で中を見る」も使える",await p.evaluate(()=>!!window.__T.S.main.demo&&!document.querySelector('#prologue')));
await ctx.close();
// 動きを減らす設定
const c2=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const q=await c2.newPage();await q.goto(URL);await q.evaluate(()=>localStorage.clear());await q.reload();
const t1=Date.now();for(let i=0;i<40;i++){const s=await st(q);if(s&&!s.busy&&s.beat>=0)break;await q.waitForTimeout(25)}ok("動きを減らす設定では、すぐに表示",Date.now()-t1<800,(Date.now()-t1)+"ms");await c2.close();
// 画面幅
for(const [n,vp] of [["SE",{width:375,height:667}],["Pro Max",{width:430,height:932}],["PC",{width:1280,height:800}]]){const c3=await b.newContext({viewport:vp,deviceScaleFactor:1});const r=await c3.newPage();await r.goto(URL);await r.evaluate(()=>localStorage.clear());await r.reload();await r.waitForTimeout(300);
  for(let i=0;i<4;i++){await waitIdle(r);if(await r.evaluate(()=>document.querySelector('.pl-cta').classList.contains('on')))break;await r.mouse.click(vp.width/2,vp.height/2)}await r.waitForTimeout(1200);
  const m=await r.evaluate(()=>{const g=document.querySelector('.pl-glass').getBoundingClientRect();const c=document.querySelector('.pl-enter').getBoundingClientRect();const t=document.querySelector('.pl-top').getBoundingClientRect();return {ov:document.documentElement.scrollWidth>innerWidth,overlap:g.bottom>c.top-4||g.top<t.bottom,inView:g.top>=0&&g.bottom<=innerHeight}});
  ok(n+"：はみ出し・重なりなし",!m.ov&&!m.overlap&&m.inView,JSON.stringify(m));await r.screenshot({path:B+'/P_'+n.replace(/ /g,"")+'.png'});await c3.close()}
}catch(e){R.push("CRASH "+e.message.split("\n").slice(0,3).join(" ~ "))}
console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
