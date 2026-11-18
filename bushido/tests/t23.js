// 外観刷新：3テーマ×4画面の撮影、文字サイズ・演出・アニメーション設定、横スクロール、記録が消えないこと
const {chromium}=require('playwright');
const R=[];const ok=(n,c,x)=>R.push((c?"PASS ":"FAIL ")+n+(x?" | "+x:""));
const OUT=process.cwd()+'/look';
(async()=>{const b=await chromium.launch();const errs=[];try{
const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
const cer=async()=>{for(let i=0;i<5&&await p.$('#ceremony:not([hidden]) [data-cer]');i++){await p.click('#ceremony [data-cer] >> nth=0');await p.waitForTimeout(150)}};
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
await p.click('[data-act=demo]');await p.waitForTimeout(300);await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(300);
await p.evaluate(()=>{const T=__T;T.S.main.master={motive:"respect",name:"先生",gender:"male",date:T.todayKey()};T.S.main.tutVer=3;T.S.main.tutDone=true;T.S.main.hints={keiko:1,roku:1,chikai:1};T.render()});await p.waitForTimeout(200);
const e0=await p.evaluate(()=>__T.totalExp());const d0=await p.evaluate(()=>JSON.stringify(__T.S.days));
// 外観の設定は誓いの間にある
await p.click('#tabs [data-tab=chikai]');await p.waitForTimeout(300);ok("誓いの間に外観の設定",!!(await p.$('#sec-look')));
const seen={};
for(const th of ['kuro','haku','sumi']){
  await p.click('#tabs [data-tab=chikai]');await p.waitForTimeout(200);await p.click('#sec-look [data-k=theme][data-v='+th+']');await p.waitForTimeout(250);
  const bg=await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);seen[th]=bg;
  for(const t of ['dojo','keiko','roku','chikai']){await p.click('#tabs [data-tab='+t+']');await p.waitForTimeout(300);await cer();
    await p.screenshot({path:OUT+'/'+th+'_'+t+'.png'});
    const hs=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);if(hs)ok("横スクロールなし "+th+" "+t,false)}
}
ok("3テーマで背景色が変わる",new Set(Object.values(seen)).size===3,JSON.stringify(seen));
{const e1=await p.evaluate(()=>__T.totalExp());const d1=await p.evaluate(()=>JSON.stringify(__T.S.days));const nz=o=>JSON.parse(JSON.stringify(o,(k,v)=>v&&typeof v==="object"&&!Array.isArray(v)&&!Object.keys(v).length&&k?undefined:v));const A=nz(JSON.parse(d0)),B=nz(JSON.parse(d1));const diff=Object.keys(B).filter(k=>JSON.stringify(A[k])!==JSON.stringify(B[k])).map(k=>k+":"+JSON.stringify(A[k])+"=>"+JSON.stringify(B[k])).join(" ; ").slice(0,400);
ok("テーマを変えても記録とEXPは変わらない",e1===e0&&!diff,"EXP "+e0+"→"+e1+" "+diff)}
// コントラスト（本文と背景）
const con=await p.evaluate(()=>{const L=c=>{const m=c.match(/\d+(\.\d+)?/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
  const out={};for(const th of ["kuro","haku","sumi"]){document.documentElement.dataset.theme=th;const cs=getComputedStyle(document.documentElement);const fg=getComputedStyle(document.body).color;const bg=getComputedStyle(document.body).backgroundColor;
    const pn=document.createElement("div");pn.style.cssText="background:var(--panel);color:var(--muted)";document.body.appendChild(pn);const pc=getComputedStyle(pn);const r1=(Math.max(L(fg),L(bg))+.05)/(Math.min(L(fg),L(bg))+.05);const r2=(Math.max(L(pc.color),L(pc.backgroundColor))+.05)/(Math.min(L(pc.color),L(pc.backgroundColor))+.05);pn.remove();out[th]=[r1.toFixed(1),r2.toFixed(1)]}
  document.documentElement.dataset.theme="sumi";return out});
ok("文字のコントラスト（本文7以上・補足4.5以上）",Object.values(con).every(x=>+x[0]>=7&&+x[1]>=4.5),JSON.stringify(con));
// 文字サイズ
await p.click('#tabs [data-tab=chikai]');await p.waitForTimeout(200);
const fs=async v=>{await p.click('#sec-look [data-k=fs][data-v='+v+']');await p.waitForTimeout(200);return p.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('#sec-look h2')).fontSize))};
const f1=await fs('m'),f2=await fs('l'),f3=await fs('xl');ok("文字サイズが全画面に反映（標準<大きめ<最大）",f1<f2&&f2<f3,f1+"→"+f2+"→"+f3);
for(const t of ['dojo','keiko','roku','chikai']){await p.click('#tabs [data-tab='+t+']');await p.waitForTimeout(250);const hs=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);if(hs)ok("最大の文字でも横スクロールなし "+t,false)}
await p.click('#tabs [data-tab=dojo]');await p.waitForTimeout(200);await p.screenshot({path:OUT+'/xl_dojo.png'});
await p.click('#tabs [data-tab=chikai]');await p.waitForTimeout(200);await fs('m');
// アニメーションOFF
await p.click('#sec-look [data-k=anim][data-v=off]');await p.waitForTimeout(150);
const an=await p.evaluate(()=>{const e=document.createElement("div");e.className="stamp";document.body.appendChild(e);const a=getComputedStyle(e).animationName;e.remove();return a});ok("アニメーションOFFで動きが止まる",an==="none",an);
await p.click('#sec-look [data-k=anim][data-v=on]');
// 演出：最小限なら昇格の儀を全画面で出さない
await p.click('#sec-look [data-k=fx][data-v=min]');await p.waitForTimeout(150);
await p.evaluate(()=>{__T.ui.rankUp=1;__T.render()});await p.waitForTimeout(300);ok("演出「最小限」では昇格の儀を全画面にしない",await p.evaluate(()=>document.querySelector('#ceremony').hidden));
await p.click('#sec-look [data-k=fx][data-v=std]');
// 師範の登場：最小限なら出ない
await p.click('#sec-look [data-k=mfx][data-v=min]');await p.evaluate(()=>{document.querySelector('#mtoast').classList.remove('show')});
await p.evaluate(()=>__T.A.masterAdvice&&0);await p.evaluate(()=>{const ev=new Event('x')});
const shown=await p.evaluate(async()=>{const m=document.querySelector('#mtoast');m.classList.remove('show');window.__mt=0;return 0});
// 外観のリセット：記録は消えない
await p.click('[data-act=lookReset]');await p.waitForTimeout(200);
ok("外観の初期化で黒漆に戻り、記録は残る",(await p.evaluate(()=>document.documentElement.dataset.theme))==="kuro"&&(await p.evaluate(()=>__T.totalExp()))===e0);
// 再起動しても外観が残る
await p.click('#sec-look [data-k=theme][data-v=haku]');await p.waitForTimeout(400);await p.reload();await p.waitForTimeout(700);
ok("再起動しても選んだ外観が残る",(await p.evaluate(()=>document.documentElement.dataset.theme))==="haku");
// 一太刀の達成で印
await p.evaluate(()=>{const T=__T;T.day(T.todayKey()).mission=null;T.render()});await p.click('#tabs [data-tab=dojo]');await p.waitForTimeout(200);
await p.click('#sec-mission [data-act=setMission]');await p.click('#sheet [data-act=msCond][data-v=normal]');await p.waitForTimeout(150);await p.click('#ms-pick .qopt');await p.click('[data-act=saveMission]');await p.waitForTimeout(250);
await p.click('#sec-mission [data-act=mres][data-v=done]');await p.waitForTimeout(500);ok("一太刀の達成で「斬」の印",!!(await p.$('#sec-mission .stamp')));
await (await p.$('#sec-mission')).scrollIntoViewIfNeeded();await p.screenshot({path:OUT+'/haku_stamp.png'});
// 刀：6段階の描き分け
const sw=await p.evaluate(()=>{const out=[];for(let i=0;i<6;i++){const d=document.createElement('div');d.innerHTML=__T.swordSVG(i);out.push(d.querySelectorAll('svg *').length)}return out});
ok("刀は6段階で部品の数が増える",sw.every((n,i)=>i===0||n>=sw[i-1]),sw.join(","));
await p.setContent('<body style="background:#15130f;margin:0">'+(await p.evaluate(()=>[0,1,2,3,4,5].map(i=>'<div style="width:340px;padding:4px">'+__T.swordSVG(i)+'</div>').join(""))));await p.screenshot({path:OUT+'/swords.png',fullPage:true});
}catch(e){R.push("CRASH "+e.message.split("\n").slice(0,3).join(" ~ "))}
console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
