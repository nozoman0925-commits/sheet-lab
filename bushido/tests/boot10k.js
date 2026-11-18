// 起動の耐久テスト：claude.ai の保存領域（db・user）を模し、さまざまな記録の状態で N 回起動する。
// 「読み込み中」のまま止まらないこと・四つの間が表示できることを確かめる。
// 使い方: node tests/boot10k.js <bushido.html> <seed.json> [回数=10000] [並列=8]
const {chromium}=require('playwright');const fs=require('fs');const http=require('http');
const [,,FILE,SEEDF,NS,PS]=process.argv;const N=+(NS||10000),PAR=+(PS||8);
const page=fs.readFileSync(FILE,'utf8');const SEED=JSON.parse(fs.readFileSync(SEEDF,'utf8'));
// 決まった乱数（同じ番号なら同じ状態）
const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const JUNK=[null,"",0,-1,[],{},"x",true,NaN,"2026-99-99"];
function paths(o,pre,out){if(o&&typeof o==="object"){for(const k of Object.keys(o)){out.push(pre.concat(k));if(pre.length<5)paths(o[k],pre.concat(k),out)}}return out}
function makeState(i){const r=rng(i*7919+13);const pick=a=>a[Math.floor(r()*a.length)];
  const kind=i%10;let st=JSON.parse(JSON.stringify(SEED));let mode={lat:Math.floor(r()*40)};
  if(kind===0)st=null;                                                   // 新規
  if(kind===1){const ks=Object.keys(st.main);for(let j=0;j<4;j++)delete st.main[pick(ks)]}    // 古い版：項目が欠けている
  if(kind===2||kind===3){const ps=paths(st,[],[]);for(let j=0;j<1+Math.floor(r()*4);j++){const p=pick(ps);let o=st;for(const k of p.slice(0,-1)){if(o==null||typeof o!=="object"){o=null;break}o=o[k]}if(o&&typeof o==="object")o[p[p.length-1]]=pick(JUNK)}} // 壊れた値
  if(kind===4){const t=Object.keys(st.days).sort();const last=t[t.length-1];for(let j=1;j<=340;j++){const d=new Date(Date.parse(t[0])-j*864e5).toISOString().slice(0,10);st.days[d]=JSON.parse(JSON.stringify(st.days[last]))}} // 1年分
  if(kind===5){st.main.look=pick([null,{theme:"nazo",bg:"???"},{bg:"none"},{bg:"calm",theme:"haku"},{theme:"sumi"}]);st.main.master=pick([null,{},{motive:"zzz",name:"a"},st.main.master])}
  if(kind===6){(st.main.tasks||[]).forEach(t=>{t.cat=pick([99,-1,null,"2",t.cat])});Object.values(st.days).forEach(d=>{if(d.mission&&r()<.3)d.mission.cat=pick([99,null,"x"])})}
  if(kind===7)mode.unavailOnce=1;                                         // 一度だけ一時的な失敗
  if(kind===8)mode.noLS=1;                                                // ブラウザ内保存を使えない
  if(kind===9){st.main.onboarded=r()<.5;st.main.obDraft=pick([null,{ob:{},step:3},{ob:{m:{motive:"dear"}},step:99,mflow:"x"}]);st.main.prologue=pick([null,{act:3},{done:true}])}
  return {st,mode,kind}}
const KINDS=["新規","項目の欠け","壊れた値","壊れた値2","1年分","外観・師範の異常","分野の番号の異常","一時的な失敗","ブラウザ保存なし","入門途中"];
const MOCK=(st,mode)=>`<script>(function(){const MODE=${JSON.stringify(mode)};const ST=${JSON.stringify(st)};const store=new Map();let failed=0;
if(ST){store.set("data/users/u1/main",ST.main);Object.keys(ST.days||{}).forEach(k=>store.set("data/users/u1/main/days/"+k,ST.days[k]))}
const wait=ms=>new Promise(r=>setTimeout(r,ms));const snap=(p,v)=>({id:p.split("/").pop(),exists:v!==undefined,data:()=>v===undefined?undefined:JSON.parse(JSON.stringify(v))});
const doc=p=>({id:p.split("/").pop(),path:p,get:async()=>{if(MODE.unavailOnce&&!failed++)throw Object.assign(new Error("一時的"),{code:"unavailable"});await wait(MODE.lat);return snap(p,store.get(p))},
 set:async v=>{await wait(3);store.set(p,JSON.parse(JSON.stringify(v)))},delete:async()=>{store.delete(p)},collection:c=>col(p+"/"+c)});
const col=p=>({path:p,doc:id=>doc(p+"/"+id),get:async()=>{await wait(MODE.lat);const docs=[];for(const [k,v] of store)if(k.startsWith(p+"/")&&k.slice(p.length+1).indexOf("/")<0)docs.push(snap(k,v));return {docs,size:docs.length}}});
const db=Object.freeze({doc,collection:col});const user=Object.freeze({id:async()=>"u1"});
window.claude=Object.freeze({use:async n=>{await wait(5);return n==="db"?db:n==="user"?user:null}});
if(MODE.noLS)Object.defineProperty(window,"localStorage",{get(){throw new DOMException("denied","SecurityError")}});})();</script>`;
(async()=>{const srv=http.createServer((q,res)=>{const i=+q.url.slice(1)||0;const {st,mode}=makeState(i);res.writeHead(200,{"content-type":"text/html; charset=utf-8"});
  res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+MOCK(st,mode)+'</head><body>'+page+'</body></html>')}).listen(8791);
const b=await chromium.launch();const stats={ok:0,stuck:0,bootfail:0,renderErr:0,pageErr:0,ms:[]};const byKind={};const ex=[];let next=0;const t0=Date.now();
async function worker(){const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();let errs=[];p.on('pageerror',e=>errs.push(e.message));
  while(true){const i=next++;if(i>=N)break;errs=[];const k=KINDS[makeState(i).kind];byKind[k]=byKind[k]||{n:0,bad:0};byKind[k].n++;
    const s0=Date.now();await p.goto('http://localhost:8791/'+i);let res=null;
    for(let w=0;w<150;w++){await p.waitForTimeout(w<10?40:100);res=await p.evaluate(()=>{const a=document.querySelector('#app');return {load:!!a.querySelector('.loading'),fail:!!a.querySelector('.bootfail'),pl:!!document.querySelector('#prologue'),tabs:!document.querySelector('#tabs').hidden}});if(!res.load||res.pl)break}
    const ms=Date.now()-s0;let bad="";
    if(res.load&&!res.pl){stats.stuck++;bad="読み込み中のまま"}else if(res.fail){stats.bootfail++;bad="起動失敗の画面"}
    else{stats.ms.push(ms);if(res.tabs){for(const t of ["keiko","roku","chikai","dojo"]){await p.evaluate(t=>{const e=document.querySelector('#tabs [data-tab='+t+']');e&&e.click()},t);if(await p.$('#sec-renderr')){stats.renderErr++;bad="表示の不具合:"+t+" "+(await p.textContent('#sec-renderr')).slice(-80);break}}}}
    if(!bad&&errs.length){stats.pageErr++;bad="エラー:"+errs[0]}
    if(bad){byKind[k].bad++;if(ex.length<40)ex.push("#"+i+" "+k+" → "+bad.slice(0,160))}else stats.ok++;
    if(i%1000===999)console.log("…",i+1,"回",Math.round((Date.now()-t0)/1000)+"秒")}
  await ctx.close()}
await Promise.all(Array.from({length:PAR},worker));await b.close();srv.close();
stats.ms.sort((a,c)=>a-c);const q=x=>stats.ms[Math.floor(stats.ms.length*x)]||0;
console.log(JSON.stringify({回数:N,正常:stats.ok,読み込み中のまま:stats.stuck,起動失敗の画面:stats.bootfail,表示の不具合:stats.renderErr,ページのエラー:stats.pageErr,起動時間ms:{中央:q(.5),p95:q(.95),最大:stats.ms[stats.ms.length-1]},種類別:byKind},null,1));
console.log(ex.join("\n"))})();
