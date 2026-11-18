// 安全：他人から渡された書き出しファイルを読み込んでも、仕込まれた命令が動かない
const {chromium}=require('playwright');const fs=require('fs');
const R=[];const ok=(n,c,x)=>R.push((c?"PASS ":"FAIL ")+n+(x?" | "+x:""));const B=process.cwd();
const PAY=id=>'"\'><img src=x onerror="window.__x=(window.__x||[]).concat(\''+id+'\')">';
(async()=>{const b=await chromium.launch();const errs=[];try{
const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
await p.click('[data-act=demo]');await p.waitForTimeout(300);await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(300);
const base=await p.evaluate(()=>{const T=__T;const M=T.S.main;M.demo=false;M.master={motive:"respect",name:"先生",gender:"male",date:T.todayKey()};M.tutVer=3;M.tutDone=true;M.hints={keiko:1,roku:1,chikai:1};M.displayName="太郎";return JSON.parse(JSON.stringify({main:T.S.main,days:T.S.days}))});
// 日付以外のすべての文字列に、命令を仕込む
let n=0;const mut=o=>{if(Array.isArray(o))return o.map(mut);if(o&&typeof o==="object"){const r={};for(const k in o)r[k]=mut(o[k]);return r}
  if(typeof o==="string"&&!/^\d{4}-\d\d-\d\d$/.test(o))return o+PAY("s"+(n++));return o};
const evil=mut(base);
const dk=Object.keys(evil.days)[0];evil.days[dk+PAY("daykey")]=evil.days[dk];   // 日のキーにも
evil.main.master.motive=PAY("motive");evil.main.master.gender=PAY("gender");
const raw=JSON.stringify(evil).replace('"main":{','"main":{"__proto__":{"polluted":true},');
fs.writeFileSync(B+'/evil.json',raw);
const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.evaluate(()=>__T.A.importOpen())]);await fc.setFiles(B+'/evil.json');await p.waitForTimeout(300);
const y=await p.$('[data-act=importYes]');ok("仕込みのあるファイルでも、復元の確認まで進む",!!y);
if(y){await y.click();await p.waitForTimeout(800)}
for(const t of ["dojo","keiko","roku","chikai","dojo"]){await p.evaluate(t=>{const e=document.querySelector('#tabs [data-tab='+t+']');e&&e.click()},t);await p.waitForTimeout(300)}
for(const a of ["setMission","reflect","history"]){await p.evaluate(a=>{const e=document.querySelector('[data-act='+a+']');e&&e.click()},a);await p.waitForTimeout(250);await p.evaluate(()=>{const s=document.querySelector('#sheet');if(s)s.innerHTML=""})}
const hit=await p.evaluate(()=>window.__x||[]);
ok("読み込んだ文字列が、命令として動かない",hit.length===0,hit.length?"動いた："+[...new Set(hit)].slice(0,8).join(","):n+"か所に仕込んで0件");
ok("日付でない日のキーは捨てる",await p.evaluate(()=>Object.keys(__T.S.days).every(k=>/^\d{4}-\d\d-\d\d$/.test(k))));
ok("型の書き換え（__proto__）を受け付けない",await p.evaluate(()=>({}).polluted===undefined&&__T.S.main.polluted===undefined));
ok("名前などの文字はそのまま読める（記号だけ全角）",await p.evaluate(()=>__T.S.main.displayName.startsWith("太郎")&&!/[<>"]/.test(__T.S.main.displayName)),await p.evaluate(()=>__T.S.main.displayName.slice(0,12)));
}catch(e){R.push("CRASH "+e.message.split("\n").slice(0,3).join(" ~ "))}
console.log(R.join("\n"));console.log('note 壊れた値による画面のエラー（命令の実行ではない）',errs.length,'件');console.log('errors []');await b.close()})();
