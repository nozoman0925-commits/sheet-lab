// 第29版：すっきりした道場と、雨の森の背景・透ける区画
const {chromium}=require('playwright');
const R=[];const ok=(n,c,x)=>R.push((c?"PASS ":"FAIL ")+n+(x?" | "+x:""));const B=process.cwd();
(async()=>{const b=await chromium.launch();const errs=[];try{
const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
await p.click('[data-act=demo]');await p.waitForTimeout(300);await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(300);
await p.evaluate(()=>{const T=__T;T.ui.grpAll=false;T.ui.grpOpen={};const M=T.S.main;M.demo=false;M.env=null;M.master={motive:"respect",name:"先生",gender:"male",date:T.todayKey()};M.tutVer=3;M.tutDone=true;M.hints={keiko:1,roku:1,chikai:1};M.created=T.addDays(T.todayKey(),-20);T.day(T.todayKey()).mission=null;T.render()});
// 道場
const ord=await p.evaluate(()=>[...document.querySelectorAll('#app>.stack>section')].map(e=>e.id));
ok("道場（最小）で開いて見えるのは、今日の一太刀だけ",JSON.stringify(ord)===JSON.stringify(["sec-mission"])||(ord[0]==="sec-mission"&&ord.every(x=>["sec-mission","sec-night"].includes(x))),ord.join(" > "));
const h=await p.evaluate(()=>document.documentElement.scrollHeight);ok("道場の長さは、ほぼ一画面",h<1000,h+"px");
const grp=await p.evaluate(()=>[...document.querySelectorAll('#app details.grp')].map(d=>d.querySelector('.gt').textContent+":"+d.open));
ok("ほかはすべて「その他の稽古・記録」にたたんで残す（機能は消さない）",grp.join(",")==="その他の稽古・記録:false",grp.join(","));
ok("SNSの関門なども「その他」の中にある",await p.evaluate(()=>!!document.querySelector('details.grp #sec-env')));
ok("見出しは決定版のタグライン",(await p.textContent('.brand small')).includes("己に勝て。言い訳を断て。昨日の己を超えろ。"));
await p.click('#app details.grp summary');await p.waitForTimeout(300);ok("「その他の稽古・記録」を押すと開く",await p.evaluate(()=>document.querySelector('#app details.grp').open));
ok("端末保存の案内は道場に出さない",await p.evaluate(()=>!/ブラウザ内だけ/.test(document.querySelector('#app').textContent)));
// 背景
const sc=await p.evaluate(()=>{const s=document.querySelector('#scene');const c=getComputedStyle(document.querySelector('#sec-mission'));const ph=getComputedStyle(document.querySelector('.sc-photo'));const anims=[...document.querySelectorAll('#scene, #scene *')].filter(e=>getComputedStyle(e).animationName!=="none").length;return {on:!!s&&getComputedStyle(s).display!=="none",photo:ph.display==="block"&&/webp/.test(ph.backgroundImage),anims,bf:c.backdropFilter||c.webkitBackdropFilter,bg:c.backgroundColor}});
ok("初期は写真（雨の縁側）の背景",sc.on&&sc.photo,JSON.stringify({on:sc.on,photo:sc.photo}));
ok("背景は静止画（動きなし）",sc.anims===0,sc.anims+"個が動いている");
ok("区画はすりガラスで背景が透ける",/blur/.test(sc.bf)&&/rgba\(.*0\.[0-9]+\)/.test(sc.bg),sc.bf+" / "+sc.bg);
await p.screenshot({path:B+'/Z_rain.png'});
const set=async v=>{await p.evaluate(v=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{bg:v});T.render()},v);await p.waitForTimeout(200)};
await set("calm");ok("絵（雨の森）：写真の代わりに絵を出す",await p.evaluate(()=>getComputedStyle(document.querySelector('.sc-photo')).display==="none"&&getComputedStyle(document.querySelector('.sc-land')).display!=="none"));
await set("none");ok("無地：背景を消し、区画も不透明に戻す",await p.evaluate(()=>getComputedStyle(document.querySelector('#scene')).display==="none"&&!/blur/.test(getComputedStyle(document.querySelector('#sec-mission')).backdropFilter||"")));
await set("rain");
await p.evaluate(()=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{anim:"off"});T.render()});
ok("アニメーションOFFでは雨も波紋も止まる",await p.evaluate(()=>getComputedStyle(document.querySelector('.sc-rain')).animationName==="none"&&getComputedStyle(document.querySelector('.sc-rip ellipse')).animationName==="none"));
await p.evaluate(()=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{anim:"on"});T.render()});
// 設定の画面
await p.click('#tabs [data-tab=chikai]');await p.waitForTimeout(300);await p.evaluate(()=>{document.querySelectorAll('details.grp').forEach(d=>d.open=true)});
ok("外観の設定に「背景」（写真・絵・無地）",await p.evaluate(()=>["rain","calm","none"].every(v=>!!document.querySelector('[data-act=look][data-k=bg][data-v='+v+']'))));
await p.click('[data-act=look][data-k=bg][data-v=calm]');await p.waitForTimeout(200);
ok("背景の選択は保存され、開き直しても残る",await p.evaluate(()=>JSON.parse(localStorage.getItem("bushido.look")).bg==="calm"&&document.documentElement.dataset.bg==="calm"));
// 3つの外観で読みやすさ（文字と区画の背景の明るさの差）
for(const th of ["kuro","haku","sumi"]){await p.evaluate(th=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{theme:th,bg:"rain"});T.render();document.querySelector('#tabs [data-tab=dojo]').click()},th);await p.waitForTimeout(500);await p.screenshot({path:B+'/Z_'+th+'.png'})}
await p.evaluate(()=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{theme:"kuro"});T.render()});
}catch(e){R.push("CRASH "+e.message.split("\n").slice(0,3).join(" ~ "))}
console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
