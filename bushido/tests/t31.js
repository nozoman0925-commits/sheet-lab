// 一太刀の出し方：生活に合わせる（夜型・使える時間）、見せた候補を7日間繰り返さない、難度の上限は低い方
const {chromium}=require('playwright');
const R=[];const ok=(n,c,x)=>R.push((c?"PASS ":"FAIL ")+n+(x?" | "+x:""));
(async()=>{const b=await chromium.launch();const errs=[];try{
const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
await p.click('[data-act=demo]');await p.waitForTimeout(300);await p.click('[data-tut=skip]');await p.click('[data-tut=skip]');await p.waitForTimeout(300);
const CLOCK=/(朝|起き|起床|目覚まし|23時|布団に入|二度寝|昼寝|夕方以降|朝食|寝る1時間前|就寝|同じ時刻に寝)/;
const run=(setup,days)=>p.evaluate(([setup,days])=>{const T=__T;const M=T.S.main;M.demo=false;M.created=T.addDays(T.todayKey(),-30);M.profile=M.profile||{cat:{},dom:{},flags:{},score:{}};
  new Function("T","M",setup)(T,M);const out=[];const k=T.todayKey();
  for(let r=0;r<days;r++){const d=T.day(k);d.mission=null;d.cond="normal";const plan=T.missionPlan(k,r);out.push(plan.offers.map(o=>({t:o.t,id:o.id,lv:o.lv})))}
  return out},[setup,days]);
// 夜型：時刻に縛られた課題を出さない
const night=await run('M.life={l3:"3"};M.profile.life={l3:"3"};',40);const nb=night.flat().filter(o=>CLOCK.test(o.t));
ok("夜間に活動する人には、朝・就寝時刻の課題を出さない",nb.length===0,nb.length?nb[0].t:night.flat().length+"件を確認");
const day=await run('M.life={l3:"1"};M.profile.life={l3:"1"};',40);ok("昼に活動する人には、朝・就寝の課題も出る（消しすぎていない）",day.flat().some(o=>CLOCK.test(o.t)));
// 使える時間：5分の人に長い課題を出さない
const five=await run('M.obAns=Object.assign({},M.obAns,{g2:"0"});M.life=null;M.profile.life=null;',40);
const long=await p.evaluate(list=>list.filter(o=>{const d=__T.MDATA[o.id];if(!d)return false;const h=/(\d+)\s*時間/.exec(d[0]),m=/(\d+)\s*分/.exec(d[0]);const mm=h?+h[1]*60:m?+m[1]:null;return mm!=null&&mm>10}),five.flat());
ok("使える時間が5分の人に、10分を超える課題を出さない",long.length===0,long.length?long[0].t:five.flat().length+"件を確認");
// 見せた候補は、7日間なるべく繰り返さない
const rep=await p.evaluate(()=>{const T=__T;const M=T.S.main;M.obAns=Object.assign({},M.obAns,{g2:"3"});M.life=null;if(M.profile)M.profile.life=null;const today=T.todayKey();const hist=[];let dup=0,tot=0;
  for(let i=0;i<7;i++){Object.keys(T.S.days).forEach(k=>{if(k>today)delete T.S.days[k]});const k=T.addDays(today,-(6-i));const d=T.day(k);d.mission=null;d.cond="normal";}
  // 6日前から今日まで、毎日見せた候補を記録しながら進める（本体は「今日」を実際の日付で数えるので、日付をずらして記録する）
  const days=[];for(let i=0;i<7;i++){const k=T.todayKey();const shown=new Set();for(let j=1;j<=6;j++){const dd=T.S.days[T.addDays(k,-j)];if(dd&&dd.offered)dd.offered.forEach(t=>shown.add(t))}
    const d=T.day(k);d.mission=null;d.offered=null;const off=T.missionPlan(k,i).offers.map(o=>o.t);off.forEach(t=>{tot++;if(shown.has(t))dup++});
    // 日付を1日前へずらす
    const nd={};Object.keys(T.S.days).forEach(x=>{nd[T.addDays(x,-1)]=T.S.days[x]});T.S.days=nd;nd[T.addDays(k,-1)].offered=off}
  return {dup,tot}});
ok("見せた候補を、7日以内に繰り返すのは2割未満",rep.dup/rep.tot<.2,rep.dup+"/"+rep.tot);
// 難度の上限：心の不調があり、始めて3日以内なら、低い方（2）
const cap=await p.evaluate(()=>{const T=__T;const M=T.S.main;M.created=T.todayKey();M.profile=Object.assign({},M.profile,{flags:Object.assign({},(M.profile||{}).flags,{care:true})});const k=T.todayKey();let mx=0;for(let r=0;r<30;r++){const d=T.day(k);d.mission=null;d.cond="good";T.missionPlan(k,r).offers.forEach(o=>mx=Math.max(mx,o.lv))}return mx});
ok("始めて3日以内は、心の不調があっても難度2まで（上限は低い方）",cap<=2,"最大の難度 "+cap);
// 道場に今日のEXPと次の段位まで
await p.evaluate(()=>{const T=__T;T.S.main.created=T.addDays(T.todayKey(),-10);T.render()});
ok("今日の稽古に「今日 +EXP」と「次の段位まで」",/今日 \+\d+ EXP/.test(await p.textContent('#sec-todo'))&&/次の段位/.test(await p.textContent('#sec-todo')));
}catch(e){R.push("CRASH "+e.message.split("\n").slice(0,3).join(" ~ "))}
console.log(R.join("\n"));console.log('errors',JSON.stringify(errs));await b.close()})();
