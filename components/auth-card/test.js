// サインイン切替カードの検査（Playwright）。使い方: node test.js   （同じフォルダの index.html を開く）
const {chromium}=require('playwright');const path=require('path');
const URL='file://'+path.join(__dirname,'index.html');const OUT=process.argv[2]||__dirname;
const R=[];const ok=(n,c,x)=>R.push((c?"PASS ":"FAIL ")+n+(x?" | "+x:""));
const bladeX=`(()=>{const m=new DOMMatrix(getComputedStyle(document.querySelector('.ac-blade')).transform);return {x:m.m41,y:m.m42}})()`;
(async()=>{const b=await chromium.launch();const errs=[];try{
const ctx=await b.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto(URL);await p.waitForTimeout(200);
const g=await p.evaluate(()=>{const c=document.querySelector('.ac-card').getBoundingClientRect();const f=document.querySelector('[data-form=signin]').getBoundingClientRect();const cs=getComputedStyle(document.querySelector('.ac-card'));return {cw:c.width,fx:f.left-c.left,r:cs.borderTopLeftRadius,sh:cs.boxShadow!=="none"}});
const x0=await p.evaluate(bladeX);
ok("サインイン：左がフォーム、右に濃色パネル（カード幅の半分だけ見せる）",g.fx<g.cw/2&&Math.abs(x0.x-g.cw/2)<2,JSON.stringify({x:Math.round(x0.x),cw:g.cw}));
ok("カードは角丸16〜20px・うっすら影",parseFloat(g.r)>=16&&parseFloat(g.r)<=20&&g.sh,g.r);
await p.screenshot({path:OUT+'/A1_signin.png'});
// 入力途中の内容
await p.fill('#si-email','taro@example.com');await p.fill('#si-pass','abcdefgh');
// 毎フレームの位置と、入れ替わりの瞬間を記録しながら切り替える
await p.evaluate(()=>{window.__f=[];const card=document.querySelector('.ac-card'),bl=document.querySelector('.ac-blade');let on=true;const t0=performance.now();
  const props=new Set();const tick=()=>{const m=new DOMMatrix(getComputedStyle(bl).transform);window.__f.push({t:performance.now()-t0,x:m.m41,signup:card.classList.contains('is-signup'),vis:getComputedStyle(document.querySelector('[data-form=signup]')).visibility});
    document.getAnimations().filter(a=>{const t=a.effect&&a.effect.target;return t&&(t.classList.contains('ac-blade')||t.classList.contains('ac-blade-inner')||t.classList.contains('ac-form')||t.classList.contains('ac-card'))}).forEach(a=>{const k=a.effect&&a.effect.getKeyframes?a.effect.getKeyframes():[];k.forEach(f=>Object.keys(f).forEach(p=>{if(!["offset","easing","composite","computedOffset"].includes(p))props.add(p)}));if(a.transitionProperty)props.add(a.transitionProperty)});window.__props=[...props];
    if(on)requestAnimationFrame(tick)};requestAnimationFrame(tick);setTimeout(()=>{on=false},1100)});
await p.click('.ac-toggle');await p.waitForTimeout(1200);
const F=await p.evaluate(()=>({f:window.__f,props:window.__props}));
const firstSwap=F.f.findIndex(z=>z.signup);const atSwap=F.f[firstSwap];const prev=F.f[firstSwap-1];
ok("入れ替わりは、ブレードがカード全体を覆った瞬間（x=0）",atSwap&&Math.abs(atSwap.x)<1,"入れ替わり直前 x="+(prev&&prev.x.toFixed(1))+" / 直後 x="+(atSwap&&atSwap.x.toFixed(1)));
const moving=F.f.filter(z=>Math.abs(z.x)>1);const notCovered=F.f.filter((z,i)=>i>0&&z.signup!==F.f[i-1].signup&&Math.abs(z.x)>1);
ok("覆っていない時に、フォームが入れ替わる瞬間はない",notCovered.length===0);
const start=F.f.findIndex(z=>Math.abs(z.x-x0.x)>1);const fin=F.f[F.f.length-1].x;const end=F.f.findIndex((z,i)=>i>firstSwap&&Math.abs(z.x-fin)<0.5);const dur=F.f[end].t-F.f[start].t;
ok("動きの長さは0.5〜0.7秒",dur>=480&&dur<=760,Math.round(dur)+"ms");
const dts=F.f.slice(start,end).map((z,i,a)=>i?z.t-a[i-1].t:0).slice(1).sort((a,c)=>a-c);const med=dts[Math.floor(dts.length/2)];
ok("滑らか（フレーム間隔の中央値がおよそ16.7ms＝60fps）",med<20,"中央 "+med.toFixed(1)+"ms・最大 "+dts[dts.length-1].toFixed(1)+"ms・"+dts.length+"コマ");
ok("動かしているのは transform と opacity だけ",F.props.every(x=>["transform","opacity"].includes(x)),F.props.join(","));
ok("フェードでフォームを切り替えていない（フォームの透明度は常に1）",await p.evaluate(()=>[...document.querySelectorAll('.ac-form')].every(f=>getComputedStyle(f).opacity==="1")));
const g2=await p.evaluate(()=>{const c=document.querySelector('.ac-card').getBoundingClientRect();const f=document.querySelector('[data-form=signup]').getBoundingClientRect();return {cw:c.width,fx:f.left-c.left}});const x2=await p.evaluate(bladeX);
ok("新規登録は鏡像：右がフォーム、左に濃色パネル",g2.fx>=g2.cw/2-2&&Math.abs(x2.x+g2.cw/2)<2,JSON.stringify({fx:Math.round(g2.fx),x:Math.round(x2.x)}));
ok("切り替え後、フォーカスは新しいフォームの最初の欄",await p.evaluate(()=>document.activeElement&&document.activeElement.id==="su-name"));
ok("入力途中の内容を引き継ぐ（メール・パスワード）",await p.evaluate(()=>document.querySelector('#su-email').value==="taro@example.com"&&document.querySelector('#su-pass').value==="abcdefgh"));
ok("隠れたフォームは操作できない（inert）",await p.evaluate(()=>document.querySelector('[data-form=signin]').hasAttribute('inert')&&!document.querySelector('[data-form=signup]').hasAttribute('inert')));
await p.screenshot({path:OUT+'/A2_signup.png'});
// 入力チェックと送信
await p.click('[data-form=signup] .ac-submit');await p.waitForTimeout(100);
const e1=await p.evaluate(()=>({name:document.querySelector('#su-name-e').textContent,agree:document.querySelector('#su-agree-e').textContent,focus:document.activeElement.id,inv:document.querySelector('#su-name').getAttribute('aria-invalid')}));
ok("必須の欄が空ならエラーを出し、最初の誤りへ移る",e1.name&&e1.agree&&e1.focus==="su-name"&&e1.inv==="true",JSON.stringify(e1));
await p.screenshot({path:OUT+'/A3_errors.png'});
await p.fill('#su-name','山田 太郎');await p.fill('#su-pass2','zzzzzzzz');await p.click('[data-form=signup] .ac-submit');await p.waitForTimeout(100);
ok("確認用パスワードの不一致を指摘",(await p.textContent('#su-pass2-e')).includes("同じ"));
await p.fill('#su-email','taro@');await p.click('[data-form=signup] .ac-submit');await p.waitForTimeout(100);ok("メールの形の誤りを指摘",(await p.textContent('#su-email-e')).includes("メールアドレスの形"));
await p.fill('#su-email','taro@example.com');await p.fill('#su-pass2','abcdefgh');await p.check('[name=agree]');
await p.click('[data-form=signup] .ac-submit');const busy=await p.evaluate(()=>document.querySelector('[data-form=signup] .ac-submit').getAttribute('aria-busy'));await p.waitForTimeout(900);
ok("送信中は二重送信できず、終わると結果を表示",busy==="true"&&(await p.textContent('[data-form=signup] .ac-alert')).includes("登録しました"),await p.textContent('[data-form=signup] .ac-alert'));
// 既存の認証処理につなぐ口
const hook=await p.evaluate(async()=>{const c=document.querySelector('.ac-card');const n=c.cloneNode(true);document.body.appendChild(n);let got=null;const api=AuthCard.mount(n,{onSignIn:async d=>{got=d;return {ok:false,message:"パスワードが違います",fields:{password:"パスワードが違います"}}}});
  n.querySelector('#si-email').value="a@example.com";n.querySelector('#si-pass').value="12345678";n.querySelector('[data-form=signin]').requestSubmit();await new Promise(r=>setTimeout(r,50));const r={got,alert:n.querySelector('[data-form=signin] .ac-alert').textContent};n.remove();return r});
ok("既存の認証処理（onSignIn）を呼び、その結果を表示する",hook.got&&hook.got.email==="a@example.com"&&hook.alert.includes("違います"),JSON.stringify(hook));
// 戻す
await p.click('.ac-toggle');await p.waitForTimeout(900);ok("もう一度押すとサインインへ戻り、入力も残る",await p.evaluate(()=>!document.querySelector('.ac-card').classList.contains('is-signup')&&document.activeElement.id==="si-email"&&document.querySelector('#si-email').value==="taro@example.com"));
// 連打しても壊れない
for(let i=0;i<5;i++){await p.click('.ac-toggle',{force:true});await p.waitForTimeout(60)}await p.waitForTimeout(1200);
ok("連打しても、状態とパネルの位置が食い違わない",await p.evaluate(()=>{const c=document.querySelector('.ac-card');const m=new DOMMatrix(getComputedStyle(document.querySelector('.ac-blade')).transform);const w=c.getBoundingClientRect().width;return c.classList.contains('is-signup')?Math.abs(m.m41+w/2)<2:Math.abs(m.m41-w/2)<2}));
// 金の配色
await p.click('[data-theme-set=golden]');await p.evaluate(()=>{const c=document.querySelector('.ac-card');if(c.classList.contains('is-signup'))window.authCard.toggle()});await p.waitForTimeout(900);await p.screenshot({path:OUT+'/A4_golden.png'});
await p.click('.ac-toggle');await p.waitForTimeout(900);await p.screenshot({path:OUT+'/A5_golden_signup.png'});
await ctx.close();
// 視差効果を減らす
const c2=await b.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});const q=await c2.newPage();await q.goto(URL);await q.waitForTimeout(100);
await q.click('.ac-toggle');const imm=await q.evaluate(()=>({anim:document.getAnimations().length,signup:document.querySelector('.ac-card').classList.contains('is-signup'),focus:document.activeElement.id}));
ok("視差効果を減らす：アニメーションなしで即切り替え",imm.anim===0&&imm.signup&&imm.focus==="su-name",JSON.stringify(imm));await c2.close();
// 狭い画面
const c3=await b.newContext({viewport:{width:375,height:740},deviceScaleFactor:1});const r=await c3.newPage();await r.goto(URL);await r.waitForTimeout(200);
const m1=await r.evaluate(()=>({ov:document.documentElement.scrollWidth>innerWidth}));await r.screenshot({path:OUT+'/A6_mobile.png',fullPage:true});
await r.click('.ac-toggle');await r.waitForTimeout(900);const m2=await r.evaluate(()=>{const c=document.querySelector('.ac-card').getBoundingClientRect();const f=document.querySelector('[data-form=signup]').getBoundingClientRect();const s=document.querySelector('.ac-slot').getBoundingClientRect();return {ov:document.documentElement.scrollWidth>innerWidth,formTop:f.top<s.top,focus:document.activeElement.id}});
await r.screenshot({path:OUT+'/A7_mobile_signup.png',fullPage:true});
ok("スマホ幅（375px）：はみ出さず、上下の鏡像で切り替わる",!m1.ov&&!m2.ov&&m2.formTop&&m2.focus==="su-name",JSON.stringify(m2));await c3.close();
}catch(e){R.push("CRASH "+e.message.split("\n").slice(0,3).join(" ~ "))}
console.log(R.join("\n"));console.log("errors",JSON.stringify(errs));await b.close()})();
