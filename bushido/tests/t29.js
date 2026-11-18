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
ok("道場に開いて見えるのは、今日の帯・一太刀・修行・言葉だけ",JSON.stringify(ord)===JSON.stringify(["sec-todo","sec-mission","sec-quest","sec-quote"]),ord.join(" > "));
const h=await p.evaluate(()=>document.documentElement.scrollHeight);ok("道場の長さは、ほぼ一画面半まで",h<1400,h+"px");
const grp=await p.evaluate(()=>[...document.querySelectorAll('#app details.grp')].map(d=>d.querySelector('.gt').textContent+":"+d.open));
ok("ほかの稽古・整えることは、たたんで残す（機能は消さない）",grp.join(",")==="ほかの稽古:false,整えること:false",grp.join(","));
ok("SNSの関門などは「整えること」の中にある",await p.evaluate(()=>!!document.querySelector('details.grp #sec-env')));
ok("今日の帯に、同じ項目の大きな行を二度描かない",await p.evaluate(()=>!document.querySelector('#sec-todo .ti')&&document.querySelectorAll('#sec-todo .tiers .tier').length>=3));
await p.click('#sec-todo .tier.t3');await p.waitForTimeout(300);ok("「ほか」を押すと、ほかの稽古が開く",await p.evaluate(()=>document.querySelector('#app details.grp').open));
ok("端末保存の案内は道場に出さない",await p.evaluate(()=>!/ブラウザ内だけ/.test(document.querySelector('#app').textContent)));
// 背景
const sc=await p.evaluate(()=>{const s=document.querySelector('#scene');const c=getComputedStyle(document.querySelector('#sec-mission'));return {on:!!s&&getComputedStyle(s).display!=="none",bf:c.backdropFilter||c.webkitBackdropFilter,bg:c.backgroundColor,rain:getComputedStyle(document.querySelector('.sc-rain')).animationName}});
ok("初期は雨の森の背景",sc.on&&sc.rain.includes("scRain"),JSON.stringify(sc));
ok("区画はすりガラスで背景が透ける",/blur/.test(sc.bf)&&/rgba\(.*0\.[0-9]+\)/.test(sc.bg),sc.bf+" / "+sc.bg);
await p.screenshot({path:B+'/Z_rain.png'});
const set=async v=>{await p.evaluate(v=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{bg:v});T.render()},v);await p.waitForTimeout(200)};
await set("calm");ok("静かな森：雨を止め、景色は残す",await p.evaluate(()=>getComputedStyle(document.querySelector('.sc-rain')).display==="none"&&getComputedStyle(document.querySelector('#scene')).display!=="none"));
await set("none");ok("無地：背景を消し、区画も不透明に戻す",await p.evaluate(()=>getComputedStyle(document.querySelector('#scene')).display==="none"&&!/blur/.test(getComputedStyle(document.querySelector('#sec-mission')).backdropFilter||"")));
await set("rain");
await p.evaluate(()=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{anim:"off"});T.render()});
ok("アニメーションOFFでは雨も波紋も止まる",await p.evaluate(()=>getComputedStyle(document.querySelector('.sc-rain')).animationName==="none"&&getComputedStyle(document.querySelector('.sc-rip ellipse')).animationName==="none"));
await p.evaluate(()=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{anim:"on"});T.render()});
// 設定の画面
await p.click('#tabs [data-tab=chikai]');await p.waitForTimeout(300);await p.evaluate(()=>{document.querySelectorAll('details.grp').forEach(d=>d.open=true)});
ok("外観の設定に「背景」（雨の森・静かな森・無地）",await p.evaluate(()=>["rain","calm","none"].every(v=>!!document.querySelector('[data-act=look][data-k=bg][data-v='+v+']'))));
await p.click('[data-act=look][data-k=bg][data-v=calm]');await p.waitForTimeout(200);
ok("背景の選択は保存され、開き直しても残る",await p.evaluate(()=>JSON.parse(localStorage.getItem("bushido.look")).bg==="calm"&&document.documentElement.dataset.bg==="calm"));
// 3つの外観で読みやすさ（文字と区画の背景の明るさの差）
for(const th of ["kuro","haku","sumi"]){await p.evaluate(th=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{theme:th,bg:"rain"});T.render();document.querySelector('#tabs [data-tab=dojo]').click()},th);await p.waitForTimeout(500);await p.screenshot({path:B+'/Z_'+th+'.png'})}
await p.evaluate(()=>{const T=__T;T.S.main.look=Object.assign({},T.S.main.look,{theme:"kuro"});T.render()});
}catch(e){R.push("CRASH "+e.message.split("\n").slice(0,3).join(" ~ "))}
console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
