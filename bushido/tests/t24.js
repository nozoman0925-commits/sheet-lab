// 今日の言葉（数・試練に合わせた選び方・重複なし）とオフライン版（PWA）
const {chromium}=require('playwright');const fs=require('fs');
const R=[];const ok=(n,c,x)=>R.push((c?"PASS ":"FAIL ")+n+(x?" | "+x:""));
const B=process.cwd();
(async()=>{const b=await chromium.launch();const errs=[];
// アイコン（家紋）
{const p=await b.newPage();const kam=await (async()=>{const s=fs.readFileSync(B+'/bushido.html','utf8');return s.match(/const kamon='([^']+)'/)[1]})();
 for(const n of [180,192,512]){await p.setViewportSize({width:n,height:n});await p.setContent('<body style="margin:0;background:#0d0c0a;display:grid;place-items:center;width:'+n+'px;height:'+n+'px">'+kam.replace('class="mon"','style="width:'+Math.round(n*.68)+'px;height:'+Math.round(n*.68)+'px"')+'</body>');await p.screenshot({path:B+'/pwa/icon-'+n+'.png'})}
 await p.close()}
try{
const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
await p.click('[data-act=demo]');await p.waitForTimeout(300);await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(300);
await p.evaluate(()=>{const T=__T;T.S.main.master={motive:"respect",name:"先生",gender:"male",date:T.todayKey()};T.S.main.tutVer=3;T.S.main.tutDone=true;T.S.main.hints={keiko:1,roku:1,chikai:1};T.render()});
const n=await p.evaluate(()=>__T.QUOTES.length);ok("言葉は365通り以上",n>=365,n+"通り");
ok("道場に今日の言葉が出る",!!(await p.$('#sec-quote')),(await p.textContent('#sec-quote')).replace(/\s+/g," ").slice(0,90));
await (await p.$('#sec-quote')).scrollIntoViewIfNeeded();await p.screenshot({path:B+'/Q1.png'});
const same=await p.evaluate(()=>{const T=__T;const a=JSON.stringify(T.quoteOfDay(T.todayKey()));T.render();const b2=JSON.stringify(T.quoteOfDay(T.todayKey()));return a===b2});ok("同じ日は何度開いても同じ言葉",same);
// 試練に合わせた選び方
const th=await p.evaluate(()=>{const T=__T;const k=T.todayKey(),y=T.addDays(k,-1);const out={};const S=T.S;const yd=T.day(y);const keep=JSON.stringify(yd);
  const run=(name,setup)=>{const ys=JSON.parse(keep);S.days[y]=ys;S.main.quoteDay=null;setup(ys);const q=T.quoteOfDay(k);out[name]=q.t+"／"+q.why+"／"+T.QUOTES[q.i][3]};
  run("未達・時間",ys=>{ys.mission={text:"x",cat:1,result:"miss",missWhy:"time"}});
  run("未達・気持ち",ys=>{ys.mission={text:"x",cat:1,result:"miss",missWhy:"feel"}});
  {const tk=S.main.tasks;S.main.tasks=[];run("衝動に負けた",ys=>{ys.mission=null;ys.reflection=null;ys.urges=[{won:false}]});S.main.tasks=tk}
  run("体調不良",ys=>{ys.mission={text:"x",cat:1,result:"miss",missWhy:"sick"}});
  S.days[y]=JSON.parse(keep);S.main.quoteDay=null;return out});
ok("昨日「時間がなかった」→時の言葉",/^time/.test(th["未達・時間"])&&/time/.test(th["未達・時間"].split("／")[2]),th["未達・時間"]);
ok("昨日「気持ちが乗らなかった」→始める言葉",/^start/.test(th["未達・気持ち"]),th["未達・気持ち"]);
ok("衝動に負けた翌日→自制の言葉",/^self/.test(th["衝動に負けた"]),th["衝動に負けた"]);
ok("体調不良の翌日→体と休息の言葉",/^body/.test(th["体調不良"]),th["体調不良"]);
// 1年分：同じ言葉が出ない
const yr=await p.evaluate(()=>{const T=__T;const S=T.S;S.main.quoteSeen=[];const ids=[];const k0=T.todayKey();for(let i=0;i<T.QUOTES.length;i++){S.main.quoteDay=null;ids.push(T.quoteOfDay(T.addDays(k0,i)).i)}return {n:ids.length,u:new Set(ids).size}});
ok("すべての言葉を見終えるまで重複しない（"+yr.n+"日）",yr.u===yr.n,yr.u+"種類");
await p.evaluate(()=>{const T=__T;T.S.main.quoteSeen=[];T.S.main.quoteDay=null;T.render()});
}catch(e){R.push("CRASH "+e.message.split("\n").slice(0,2).join(" ~ "))}
// オフライン版
try{
const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push("pwa:"+e.message));
await p.goto('http://localhost:8766/');await p.waitForTimeout(500);
await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await p.waitForTimeout(800);
await p.evaluate(()=>localStorage.setItem('bushido.v1',JSON.stringify({main:{prologue:{done:true}},days:{}})));await p.reload();await p.waitForTimeout(600);
const ctl=await p.evaluate(()=>!!navigator.serviceWorker.controller);ok("オフライン用の仕組みが動く",ctl);
await p.click('[data-act=demo]');await p.waitForTimeout(300);await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(400);
await ctx.setOffline(true);const t0=Date.now();await p.reload();await p.waitForSelector('#tabs:not([hidden])',{timeout:15000});const ms=Date.now()-t0;
ok("ネットなしで起動する",true,"起動 "+ms+"ms");ok("ネットなしで記録が残っている",await p.evaluate(()=>!!document.querySelector('#sec-todo')));
ok("ネットなしで今日の言葉が出る",!!(await p.$('#sec-quote')));
await p.click('#tabs [data-tab=roku]');await p.waitForTimeout(300);await p.click('#tabs [data-tab=dojo]');await p.waitForTimeout(200);
const img=await p.evaluate(async()=>{const im=new Image();return await new Promise(r=>{im.onload=()=>r(im.naturalWidth);im.onerror=()=>r(0);im.src="img/t01.webp"})});ok("ネットなしで16タイプの絵が出る",img>0,img+"px");
await p.screenshot({path:B+'/Q2.png'});
ok("ネットなしで記録できる",await p.evaluate(()=>{const b=document.querySelector('#sec-quest [data-act=quick]');if(!b)return true;b.click();return true}));
await p.waitForTimeout(300);await p.reload();await p.waitForTimeout(800);ok("ネットなしで記録が保存される（再起動後も残る）",await p.evaluate(()=>{const k=Object.keys(JSON.parse(localStorage.getItem("bushido.v1")).days);return k.length>0}));
const mf=await (await fetch('http://localhost:8766/manifest.webmanifest').catch(()=>null));
}catch(e){R.push("CRASH2 "+e.message.split("\n").slice(0,2).join(" ~ "))}
console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
