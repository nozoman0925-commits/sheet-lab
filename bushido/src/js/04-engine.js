const OPP_M={
 "動":[["行動する前に、今日の目的を一行書いてから動け",3],["大事な判断を一つ、10分考えてから決めろ",4]],
 "静":[["考える前に、まず5分手を動かせ",3],["迷ったことを一つ、10秒で決めて実行しろ",4]],
 "誇":[["人と比べず、昨日の自分との差を一つ書け",2],["誰にも言わず、誰にも見せず、修行を一つやり遂げろ",4]],
 "道":[["今日の成果を一つ、人に伝えろ",3],["誰かと回数や時間を張り合って、一つやれ",4]],
 "型":[["いつもと違うやり方で、修行を一つやれ",3],["初めての場所に一つ行け",4]],
 "波":[["やる気がなくても、決めた時刻に5分だけ始めろ",2],["今日の修行を、昨日と同じ時刻に始めろ",3]],
 "刺":[["夜の刺激をやめ、代わりに10分歩け",3],["刺激のない時間を30分作れ。スマホも音楽もなしで座れ",4]],
 "楽":[["横になりたくなったら、立って1分体を動かせ",2],["楽な道と苦しい道があれば、今日は苦しい方を選べ",5]]};
const OPPO={"動":"静","静":"動","誇":"道","道":"誇","型":"波","波":"型"};
Object.keys(OPP_M).forEach(L=>OPP_M[L].forEach((x,j)=>{MBYID["o-"+L+j]={id:"o-"+L+j,t:x[0],lv:x[1],c:0,q:null}}));

function canWrite(){return (S.main.rankMax||0)>=2} // 破（侍）から自分の言葉で書ける
function seeded(seed){let x=seed%2147483647;if(x<=0)x+=2147483646;return()=>{x=x*16807%2147483647;return(x-1)/2147483646}}
// 時刻に縛られた課題（朝・就寝の時刻）。夜型・シフト制の人には出しにくくする
const CLOCK_RE=/(朝|起き|起床|目覚まし|23時|布団に入|二度寝|昼寝|夕方以降|朝食|寝る1時間前|就寝|同じ時刻に寝)/;
// 課題のおおよその所要時間（分）。「一日を通して」など時間を取らないものは null
function mMinutes(id){const d=MDATA[id];if(!d)return null;const t=d[0]||"";const h=/(\d+)\s*時間/.exec(t),m=/(\d+)\s*分/.exec(t);return h?+h[1]*60:m?+m[1]:null}
function missionAllowed(m,pf,cond){
  if(cond==="bad"&&m.tags&&m.tags.includes("ex"))return false;
  if(m.tags&&m.tags.includes("ex")&&typeof painActive==="function"&&painActive())return false;
  const f=pf&&pf.flags;if(!f)return true;
  if(m.tags&&m.tags.some(t=>t==="ex"?f.noEx:(f.inj||[]).includes(t)))return false;
  if(m.fit==="hi"&&f.lowFit)return false;if(m.fit==="lo"&&f.highFit)return false;return true}
function unsupDays(){return Object.keys(S.days).filter(k=>{const m=S.days[k].mission;return m&&m.unsup&&m.result==="done"}).length}
function unsupAvailable(k){if(tenure()<7)return false;for(let i=1;i<7;i++){const d=S.days[addDays(k,-i)];if(d&&d.mission&&d.mission.unsup)return false}return true}
function missionHist(before){return Object.keys(S.days).filter(k=>k<before&&S.days[k].mission&&S.days[k].mission.result).sort().map(k=>Object.assign({k},S.days[k].mission))}
// 分野ごとの今の難度：見つめ直しの答えと段位を出発点に、3回続けて達成で+1、2回続けて未達で-1（記録から毎回計算）
function catLevel(c,k){const pf=S.main.profile;
  let lv=pf&&pf.cat&&isFinite(pf.cat[c])?Math.min(6,Math.max(1,Math.round((100-pf.cat[c])/15)+1)):3;
  lv+=Math.floor((S.main.rankMax||0)/2);if(tenure()<=7)lv=Math.min(lv,3);
  let up=0,dn=0,change=null,cdate=null;
  missionHist(k).filter(m=>m.cat===c).forEach(m=>{
    if(m.result==="done"){up++;dn=0;if(up>=3){lv++;up=0;change="up";cdate=m.k}}
    else if(m.result==="miss"){if(m.missWhy&&m.missWhy!=="hard"&&m.missWhy!=="feel")return;dn+=m.missWhy==="hard"?2:1;up=0;if(dn>=2){lv--;dn=0;change="down";cdate=m.k}}
    else if(m.result==="part"){up=0;dn=0}});
  lv=Math.max(1,Math.min(10,lv));if(cdate&&diffDays(cdate,k)>3)change=null;return{lv,change}}
const CAT_SHORT={0:"人間関係・礼節",1:"生活・習慣",2:"身体・健康",3:"精神・自制",4:"環境・生活管理",5:"知識・教養",6:"生活・習慣（時間）"};
// 六領域：内部の分類番号 → 領域（「時間と行動」は「生活・習慣」に、品格の命令は「人間関係・礼節」に対応付ける）
const DOMAIN_OF={0:"rel",1:"life",6:"life",2:"body",3:"mind",4:"env",5:"know"};
function domOf(c){return DOMAIN_OF[c]||("x"+c)}
function missionPlan(k,roll){
  const r=seeded(Math.floor(parseKey(k)/864e5)*31+(roll||0)*977+7);const pf=S.main.profile||null;const tp=typeOf(pf);const d=day(k);const cond=d.cond||"normal";
  const care=!!(pf&&pf.flags&&pf.flags.care);const y=S.days[addDays(k,-1)];const yc=y&&y.reflection&&y.reflection.issue;
  const recent=new Set(),recentQ=new Set(),shown=new Set();for(let i=1;i<=7;i++){const dd=S.days[addDays(k,-i)];if(dd&&Array.isArray(dd.offered))dd.offered.forEach(t=>shown.add(t));if(dd&&dd.mission){recent.add(dd.mission.text);const mm=MBYID[dd.mission.mid];if(mm&&mm.q)recentQ.add(mm.q)}}
  // 生活に合わせる：使える時間（入門の答え）と、夜型・シフト制の人には時刻に縛られた課題を避ける
  const A=S.main.obAns||{};const budget=[5,15,30,60][+A.g2]||null;const lf=lifeOf();const nightLife=!!(lf&&(String(lf.l3)==="3"||String(lf.l3)==="4"));
  const fitsTime=m=>{if(!budget)return true;const mm=mMinutes(m.id);return mm==null||mm<=budget*2};
  const fitsClock=m=>!nightLife||!CLOCK_RE.test(m.t);
  const ym=y&&y.mission;const yw=ym&&ym.result==="miss"?ym.missWhy:null;
  const focus=S.main.tasks.find(t=>t.focus&&t.status==="進行中")||activeTasks()[0];
  const need=c=>{if(pf&&pf.cat)return pf.cat[c];const a=ability(c);return a==null?50:100-a};
  const hist=missionHist(k);const last2=hist.slice(-2);
  const forced=cond!=="bad"&&(needsRecovery()||(last2.length===2&&last2.every(m=>m.result==="miss")&&diffDays(last2[0].k,k)<=3));
  // 分野の優先順位（理由つき）
  const slots=[];const add=(c,why,q)=>{if(!slots.some(x=>x.c===c))slots.push({c,why,q})};
  if(cond==="bad")add(1,"今日は不調と答えた。体を責めず、回復の土台を整える");
  if(pf&&pf.score&&pf.score.s3>=2)add(1,"睡眠が足りていない。体を鍛える前に、眠りの土台を直す");
  if(d.msDomain&&d.msDomain!=="auto"&&cond!=="bad")add(+d.msDomain,"お前が自分で選んだ分野");
  if(yc==="スマホや娯楽に流された")add(3,"昨夜の省察で「スマホや娯楽に流された」と答えた");
  if(yc==="時間管理ができなかった"||yc==="面倒だった"||yc==="気分が乗らなかった")add(6,"昨夜の省察で「"+yc+"」と答えた");
  if(yw==="tired"||yw==="sick"||yw==="pain")add(1,"昨日の一太刀は「"+MISS_T[yw]+"」で届かなかった。まず回復の土台を整える");
  if(yw==="env")add(4,"昨日の一太刀は「環境が整っていなかった」。意志より先に、環境を整える");
  if(yw==="forgot")add(4,"昨日の一太刀は「忘れていた」。忘れない仕組みを作る","L2");
  { const ex=excuseStats(14);const top=ex[0];const map={"スマホや娯楽に流された":3,"時間管理ができなかった":6,"面倒だった":6,"気分が乗らなかった":6};
    if(top&&top.n>=3&&map[top.r])add(map[top.r],"ここ2週間で「"+top.r+"」が"+top.n+"回。同じ逃げ道を断つ") }
  { const lf=lifeOf();const LT={0:1,1:6,2:4,3:4,4:4,5:3,6:6,7:6,8:1};const ix=lf&&lf.l4?lf.l4.map(Number).filter(i=>LT[i]!=null):[];
    if(ix.length){const i=ix[Math.floor(r()*ix.length)];add(LT[i],"「"+L4T[i]+"」と答えた。意志に頼らず、環境で勝つ","L"+i)} }
  if(focus)add(focus.cat,"重点修行「"+focus.name+"」と同じ分野");
  const cw={};[1,2,3,4,5,6].forEach(c=>cw[c]=need(c));if(tp){if(tp.code[3]==="刺")cw[3]+=15;else cw[6]+=15}
  [1,2,3,4,5,6].sort((a,b)=>cw[b]-cw[a]).forEach(c=>add(c,pf?"見つめ直しで、いま崩れが大きい分野":"達成率が低い分野"));
  // 難度の目標
  const target=c=>{let t=catLevel(c,k).lv;if(cond==="bad")t=Math.min(t,2);if(care)t=Math.min(t,3);if(yc==="計画が大きすぎた"||yw==="time"||yw==="hard")t=Math.max(1,t-1);if(painActive()&&c===2)t=Math.min(t,2);if(cond==="good")t=Math.min(10,t+1);if(tenure()<=3)t=Math.min(t,2);return t};
  const goalC=new Set(((S.main.obAns||{}).g1||[]).map(i=>[1,2,3,4,5,6][+i]).filter(Boolean));
  const histC={};hist.slice(-30).forEach(h=>{if(h.cat==null)return;const x=histC[h.cat]=histC[h.cat]||{n:0,ok:0};x.n++;x.ok+=h.result==="done"?1:h.result==="part"?.5:0});
  const lfTags=new Set(((lf&&lf.l4)||[]).map(i=>"L"+i));
  const score=(m,c)=>{const cc=c!=null?c:m.c;let tg=cc?target(cc):2;if(!isFinite(tg))tg=2;const lv=isFinite(m.lv)?m.lv:2;
    const goal=cc&&goalC.has(cc)?1:goalC.size?0:.5;
    const condFit=cond==="bad"?Math.max(0,1-(lv-1)*.35):cond==="good"?(lv>=tg?1:.6):Math.max(0,1-Math.abs(lv-tg)*.3);
    const state=.5*condFit+.5*(fitsTime(m)?1:0);
    const ability=Math.max(0,1-Math.abs(lv-tg)/4);
    const h=cc!=null&&histC[cc];const histS=h&&h.n?Math.min(1,.2+h.ok/h.n):.5;
    const env=(fitsClock(m)?.7:0)+(m.q&&lfTags.has(m.q)?.3:0);
    const fresh=!recent.has(m.t)&&!shown.has(m.t)?1:0;
    const v=.25*goal+.25*state+.20*ability+.15*histS+.10*env+.05*fresh;return isFinite(v)?v:.5};
  const chosen=new Set();
  let cap=10;if(cond==="bad")cap=2;if(care)cap=Math.min(cap,3);if(tenure()<=3)cap=Math.min(cap,2); // 当てはまる上限のうち、いちばん低いもの // 不調の日・心の不調・始めて三日間は、難度に上限をかける // 不調の日・心の不調では、難度に上限をかける（絶対条件）
  // 似た命令（同じ答え・同じ悪習慣に向けた命令）は7日間出にくくする。なければ同じ命令だけを避ける
  const pick=(list,tg,pref)=>{list=list.filter(m=>!chosen.has(m.t)&&missionAllowed(m,pf,cond)&&m.lv<=cap);tg=Math.min(tg,cap);
    {const fit=list.filter(m=>fitsTime(m)&&fitsClock(m));if(fit.length)list=fit;else{const fc=list.filter(fitsClock);if(fc.length)list=fc}}
    const fresh=list.filter(m=>!recent.has(m.t)&&!shown.has(m.t)&&!(m.q&&m.q!==pref&&recentQ.has(m.q))),fresh1=list.filter(m=>!recent.has(m.t)&&!shown.has(m.t)),fresh2=list.filter(m=>!recent.has(m.t));list=fresh.length?fresh:fresh1.length?fresh1:fresh2.length?fresh2:list;if(!list.length)return null;
    const w=list.map(m=>{const dd=Math.abs(m.lv-tg);return (.3+score(m))*(dd===0?4:dd===1?2:dd===2?.6:.1)*(1+(pf&&m.q&&pf.score&&pf.score[m.q]!=null?pf.score[m.q]*1.5:0))*(pref&&m.q===pref?6:1)*(yw==="time"?(/^(\d+分|数秒|1分|2分|3分|5分)/.test((MDATA[m.id]||[""])[0])?3:.5):1)});
    let x=r()*w.reduce((a,b)=>a+b,0);for(let i=0;i<list.length;i++){x-=w[i];if(x<=0)return list[i]}return list[list.length-1]};
  const detail=(m,why,c)=>{let w=why;if(pf&&m.q&&pf.score&&pf.score[m.q]>=2&&QMAP[m.q])w+="（見つめ直し：「"+QMAP[m.q].q.replace(/[「」]/g,"")+"」）";
    if(c){const cl=catLevel(c,k);if(cl.change==="up")w+=" ・ 3回続けて斬った。難度を上げた";if(cl.change==="down")w+=" ・ 2回続けて斬れなかった。難度を下げた"}return w};
  const out=[];
  if(forced){const c=focus?focus.cat:slots[0].c;const m=pick(MISSIONS[c],Math.max(1,target(c)-2))||pick(MISSIONS[c],1);if(m){chosen.add(m.t);out.push({c,t:m.t,lv:m.lv,id:m.id,why:"崩れが続いている。今日は軽い一つだけを、確実に斬る"})}
    return{offers:out,forced:true,cond}}
  // 1枠目・2枠目：優先順位の上から
  const usedD=new Set();if(yw==="meaning"&&ym&&ym.cat!=null)usedD.add(domOf(ym.cat)); // 意味を感じなかった分野は、翌日は外す
  for(const sl of slots){if(out.length>=2)break;if(usedD.has(domOf(sl.c)))continue;const m=pick(MISSIONS[sl.c],target(sl.c),sl.q);if(m){chosen.add(m.t);usedD.add(domOf(sl.c));out.push({c:sl.c,t:m.t,lv:m.lv,id:m.id,why:detail(m,sl.why,sl.c)})}}
  // 3枠目：型の反対側の資質（または崩れ方への備え）、なければ品格・次の分野
  if(tp&&cond!=="bad"&&r()<.65){const i=Math.floor(r()*4);const L=tp.code[i];const list=OPP_M[L].map((x,j)=>({t:x[0],lv:x[1],id:"o-"+L+j}));const m=pick(list,Math.min(5,target(slots[0].c)));
    if(m){chosen.add(m.t);out.push({c:0,t:m.t,lv:m.lv,id:m.id,why:i<3?"お前の型は「"+L+"」。反対側の「"+OPPO[L]+"」を鍛える":"お前の崩れ方は「"+L+"」。崩れる前に備える",opp:true})}}
  if(out.length<3&&!usedD.has("rel")){const m=pick(MISSIONS[0],3);if(m&&cond!=="bad"){chosen.add(m.t);usedD.add("rel");out.push({c:0,t:m.t,lv:m.lv,id:m.id,why:detail(m,"人間関係と礼節を磨く",null)})}}
  for(const sl of slots){if(out.length>=3)break;if(usedD.has(domOf(sl.c)))continue;const m=pick(MISSIONS[sl.c],target(sl.c),sl.q);if(m){chosen.add(m.t);usedD.add(domOf(sl.c));out.push({c:sl.c,t:m.t,lv:m.lv,id:m.id,why:detail(m,sl.why,sl.c)})}}
  for(const sl of slots){if(out.length>=3)break;const m=pick(MISSIONS[sl.c],target(sl.c),sl.q);if(m){chosen.add(m.t);out.push({c:sl.c,t:m.t,lv:m.lv,id:m.id,why:detail(m,sl.why,sl.c)})}}
  out.forEach(o=>{const m=MBYID[o.id]||{t:o.t,lv:o.lv,c:o.c};o.score=+score(m,o.c||null).toFixed(3)});
  return{offers:out,forced:false,cond};
}
function missionOffer(k,roll){return missionPlan(k,roll).offers}
/* 省察：選ぶだけで書ける */
const VERDICTS=[{v:"full",t:"やり切った"},{v:"half",t:"半分しかやれなかった"},{v:"fled",t:"逃げた"}];
const FIXES={
 "面倒だった":["明日は最初の5分だけやると決め、朝一番に着手する","明日は一太刀を起きて30分以内に始める"],
 "気分が乗らなかった":["明日は気分を待たず、決めた時刻になったら体を動かす","明日は最低ラインだけでも必ずやる"],
 "スマホや娯楽に流された":["明日は21時以降、スマホを別の部屋に置く","明日はSNSと動画のアプリをホーム画面から消す"],
 "時間管理ができなかった":["明日は朝のうちに、一太刀をやる時刻を決める","明日は予定を紙に書き、その通りに動く"],
 "計画が大きすぎた":["明日は最低ラインだけを確実にやる","明日は一太刀を一段軽いものにする"],
 "体調不良・疲労・負傷":["明日は休む。回復を最優先にする","明日は睡眠を7時間以上とる"],
 "突発的な事情":["明日は同じ時刻に、同じ修行を再開する","明日は一太刀を朝のうちに終わらせる"],
 "その他":["明日は一太刀を朝のうちに終わらせる","明日は最低ラインだけを確実にやる"],
 "full":["明日も同じ時刻に、同じ型をくり返す","明日は一太刀を一段厳しいものにする"]
};
const TEMPT=["SNS","動画","ゲーム","ネット閲覧","夜更かし","衝動買い","先延ばし","その他"];
const RECOVER=[
 {k:"same",t:"同じ目標で再挑戦"},{k:"shrink",t:"目標を縮小する"},{k:"method",t:"方法を変更する"},{k:"rest",t:"休息してから再開する"}
];
const WD="日月火水木金土";
const EXP_TASK=10, EXP_MIN=5, EXP_REFL=20, EXP_WEEK=50, EXP_SETTLE=100, EXP_TRIAL=200, EXP_RITUAL=10, EXP_MISSION=10, EXP_MISSION_PART=5;

/* ============ 日付 ============ */
const pad=n=>String(n).padStart(2,"0");
const keyOf=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parseKey=k=>{const [y,m,d]=k.split("-").map(Number);return new Date(y,m-1,d)};
const addDays=(k,n)=>{const d=parseKey(k);d.setDate(d.getDate()+n);return keyOf(d)};
const DAY_START_H=3; // 午前3時までは前日として扱う
const todayKey=()=>keyOf(new Date(Date.now()-DAY_START_H*3600e3));
const wdOf=k=>parseKey(k).getDay();
const diffDays=(a,b)=>Math.round((parseKey(b)-parseKey(a))/864e5);
const mondayOf=k=>{const w=wdOf(k);return addDays(k,w===0?-6:1-w)};
const fmtMD=k=>{if(!k||typeof k!=="string"||!/^\d{4}-\d\d-\d\d/.test(k))return "—";const d=parseKey(k);return (d.getMonth()+1)+"/"+d.getDate()+"（"+WD[d.getDay()]+"）"};
const nowHM=()=>{const d=new Date();return pad(d.getHours())+":"+pad(d.getMinutes())};
const uid=()=>Math.random().toString(36).slice(2,10);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ============ 状態と保存 ============ */
let S=null;            // {main:{...}, days:{key:{...}}}
let store=null;        // {kind:'db'|'local'|'memory', ...}
let tab="dojo";
let ui={calSel:null,obStep:0,ob:{},confirmReset:false};
function applyProfile(pl,first){const M=S.main;const ob=ui.ob;
  M.profile=Object.assign({},pl.pf,{answers:Object.fromEntries(Object.entries(ob).filter(([k])=>QMAP[k]||k==="wake"||k==="sleep"))});
  M.abilities=pl.goals;M.okiteOff=OKITE_ALL.map(x=>x.id).filter(id=>!pl.okiteOn.includes(id));
  M.bwLevel=Object.assign({},M.bwLevel||{},first?pl.bw:{});
  M.habits={age:ansText("b1",ob),wake:ob.wake,sleep:ob.sleep,minutes:pl.minutes,strict:pl.strict};
  const tp=typeOf(pl.pf);M.tone=ob.tone||M.tone||"gen";M.type=tp?{code:tp.code,date:todayKey()}:null;
  M.profileLog=(M.profileLog||[]).concat([{date:todayKey(),dom:pl.pf.dom,type:tp?tp.code:null}]).slice(-24)}
function envTarget(){return ui.envSheet||(ui.ob.env=ui.ob.env||{})}
function envRefresh(){const e=envTarget();if(ui.envSheet){$("#env-body").innerHTML=envBody(e);$("#env-btn").innerHTML=e.has?'<button class="btn gold wide" data-act="envNext" style="margin-top:12px" '+(envReady(e)?"":"disabled")+'>'+(e.has==="no"?"記録する":"断った。記録する")+'</button>':'';return}render()}
function showTaunt(line,tone){const t=$("#taunt");t.innerHTML='<div class="taunt"><p class="eyebrow" style="color:var(--red-ink)">甘えを見た</p><p class="taunt-line">'+esc(line)+'</p>'+(tone==="oni"?'<p class="small" style="color:var(--red-ink);margin-top:10px">その甘さのままなら、お前に真の男になる資格はない。今すぐこのアプリを閉じろ。閉じないなら、黙って続けろ。</p>':'')+'<button class="btn gold wide" data-act="tauntNext" style="margin-top:16px">黙って次へ</button></div>';t.hidden=false}
function obDraft(){S.main.obDraft={ob:ui.ob,step:ui.obStep,retake:!!ui.retake,mflow:ui.mflow||null};saveMain()}
function obAfter(){obDraft();render();window.scrollTo(0,0);if(flowX()[ui.obStep]==="building"){ui.buildN=0;const tick=()=>{if(flowX()[ui.obStep]!=="building")return;ui.buildN++;if(ui.buildN>4){ui.obStep++;render();return}render();setTimeout(tick,ui.buildN===4?450:650)};setTimeout(tick,500)}}

const GLOSS={
 "一太刀":"その日に必ずやり遂げる行動。アプリが出す三つの命令から一つ選びます（引き直しは1日1回）。選んだら当日中は変えられません（病気・けが・急な事情のときだけ延期できます）。自分の言葉で書けるのは侍（破の段）から。",
 "最低ライン":"いつもの目標ができない日に、せめてこれだけはやる、という小さな行動。例：読書20ページ → 2ページ。通常の達成とは分けて記録します。",
 "定着":"重点修行を7日以上やり、達成率が80%以上になった状態。定着すると次の修行を追加できます。定着は最初の確認であって、習慣の完成ではありません。考えずにできるまでの日数は人によって18〜254日と大きく違います（研究での平均は66日）。75日試練は、武士道が独自に定めた試練です。",
 "重点修行":"今いちばん力を入れて身につけている修行。同時に一つだけです。",
 "省察":"一日の終わりに、自分の行動を振り返ること。書いた「明日の改善策」は翌朝の道場に出ます。",
 "起請文":"自分への誓いを書いた文。入門のときに書き、署名します。",
 "守破離":"成長の三段階。守＝型を守る（見習い・足軽。一太刀や修行はアプリの型から選ぶ）、破＝型を自分に合わせて工夫する（侍・武士。自分の言葉でも書ける）、離＝型から離れて自分を律する（師範・達人）。",
 "掟":"毎日実践する決まりごと。誓いの間で、自分に必要な掟だけを選べます。",
 "再起":"うまくいかなかった後に、目標の大きさややり方を変えて立て直すこと。失敗の記録は消さずに残ります。",
 "勝利の壺":"修行の定着、試練の完遂、段位の昇格など、過去の達成をためておく場所。調子が落ちたときに見返します。",
 "EXP":"経験値。行動を記録すると増え、段位の条件の一つになります。減ることはありません。"
};
function term(w,label){return '<button class="term" data-act="term" data-v="'+w+'">'+(label||w)+'</button>'}
function blankMain(){return{v:1,onboarded:false,features:{ritual:true,okite:true,groom:true,tempt:true,virtue:true,train:true,power:true,urge:true,sound:true},okiteOff:[],created:todayKey(),displayName:"",abilities:[],habits:{},oath:null,tasks:[],trials:[],weeklies:{},recoveries:[],rankMax:0,rankLog:[],future:"",notif:{morning:"06:30",night:"21:30"},demo:false,edits:[]}}
function day(k){if(!S.days[k])S.days[k]={logs:{},mission:null,ritual:{},reflection:null,temptations:[]};return S.days[k]}

const timers={};
const pendingSaves={};
function debounce(id,fn,ms){clearTimeout(timers[id]);pendingSaves[id]=fn;timers[id]=setTimeout(()=>{delete pendingSaves[id];fn()},ms||350)}
// アプリを閉じる・切り替える瞬間に、まだ書き込んでいない保存を確実に流す（途中再開のため）
function flushSaves(){Object.keys(pendingSaves).forEach(id=>{clearTimeout(timers[id]);const f=pendingSaves[id];delete pendingSaves[id];try{f()}catch(e){}})}
window.addEventListener("pagehide",flushSaves);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flushSaves()});
function saveMain(){debounce("main",()=>store.saveMain(S.main))}
function saveDay(k){debounce("d"+k,()=>store.saveDay(k,S.days[k]))}
const clone=o=>JSON.parse(JSON.stringify(o));

async function initStore(){
  let db=null,user=null,id=null;
  try{
    if(window.claude&&window.claude.use){
      [db,user]=await Promise.all([window.claude.use("db"),window.claude.use("user")]);
      if(user) id=await user.id();
    }
  }catch(e){db=null}
  if(db&&id){
    const base="data/users/"+id;
    const mainRef=db.doc(base+"/main");
    const daysCol=db.collection(base+"/main/days");
    const load=async()=>{
      const get2=async()=>{try{return await Promise.all([mainRef.get(),daysCol.get()])}catch(e){if(e&&e.code==="unavailable"){await new Promise(r=>setTimeout(r,700+Math.random()*600));return Promise.all([mainRef.get(),daysCol.get()])}throw e}};
      const [m,ds]=await get2();
      // 保存領域から届く data() は凍結されている（変更できない）。必ず写しを作ってから使う
      const days={};ds.docs.forEach(d=>{if(d.exists)days[d.id]=clone(d.data())});
      return{main:m.exists?clone(m.data()):blankMain(),days};
    };
    const withRetry=async f=>{try{await f()}catch(e){if(e&&e.code==="unavailable"){await new Promise(r=>setTimeout(r,600+Math.random()*600));try{await f()}catch(e2){warn(e2)}}else warn(e)}};
    const photoCol=db.collection(base+"/main/photos");
    return{kind:"db",load,
      saveMain:m=>withRetry(()=>mainRef.set(clone(m))),
      saveDay:(k,d)=>withRetry(()=>daysCol.doc(k).set(clone(d))),
      savePhoto:(k,url)=>photoCol.doc(k).set({url,at:new Date().toISOString()}),
      loadPhoto:async k=>{const d=await photoCol.doc(k).get();return d.exists?d.data().url:null},
      deletePhoto:k=>photoCol.doc(k).delete(),
      wipe:async()=>{const ds=await daysCol.get();for(const d of ds.docs){await daysCol.doc(d.id).delete()}const ps=await photoCol.get();for(const d of ps.docs){await photoCol.doc(d.id).delete()}await mainRef.delete()}};
  }
  // 端末内保存（サインインしていない等）
  const LK="bushido.v1";
  const read=()=>{try{return JSON.parse(localStorage.getItem(LK)||"null")}catch(e){return null}};
  const write=()=>{try{localStorage.setItem(LK,JSON.stringify(S))}catch(e){}};
  return{kind:"local",load:async()=>read()||{main:blankMain(),days:{}},saveMain:write,saveDay:write,
    savePhoto:async(k,url)=>{localStorage.setItem("bushido.photo."+k,url)},loadPhoto:async k=>{try{return localStorage.getItem("bushido.photo."+k)}catch(e){return null}},deletePhoto:async k=>{try{localStorage.removeItem("bushido.photo."+k)}catch(e){}},
    wipe:async()=>{try{Object.keys(localStorage).filter(x=>x.indexOf("bushido.")===0).forEach(x=>localStorage.removeItem(x))}catch(e){}}};
}
const memPhotos={};
async function photoSave(k,url){memPhotos[k]=url;try{if(store.savePhoto){await store.savePhoto(k,url);return true}}catch(e){console.warn(e)}return false}
async function photoLoad(k){if(memPhotos[k])return memPhotos[k];try{const u=store.loadPhoto?await store.loadPhoto(k):null;if(u)memPhotos[k]=u;return u}catch(e){return null}}
function warn(e){console.warn(e);if(e&&e.code==="quota_exceeded")toast("保存容量の上限です","データ設定を確認");else if(!timers.warned){timers.warned=setTimeout(()=>{timers.warned=null},20000);toast("保存できませんでした","通信を確かめてください。記録はこの画面に残っています")}}

/* ============ 集計（すべて元の記録から再計算） ============ */
const isDoneState=s=>s==="done"||s==="min";
const isExcluded=s=>s==="rest"||s==="excused";
function activeTasks(){return S.main.tasks.filter(t=>t.status==="進行中"||t.status==="定着")}
function inPause(t,k){return (t.pauses||[]).some(p=>k>=p.from&&(!p.to||k<=p.to))}
function taskOn(t,k){return k>=t.start && !(t.restDays||[]).includes(wdOf(k)) && !(t.pausedDays||[]).includes(k) && !inPause(t,k)}
function logOf(k,tid){const d=S.days[k];return d&&d.logs?d.logs[tid]:null}

// 対象日の一覧（休息日・正当事情を除外）。今日は記録済みのときだけ含める
// strict=true：あとからまとめて「休み」にした日も対象日に残す（定着の判定でEXPを不正に得ないため）
function eligibleDays(t,from,to,strict){
  const out=[];const today=todayKey();
  for(let k=from<t.start?t.start:from;k<=to;k=addDays(k,1)){
    if(!taskOn(t,k))continue;
    let l=logOf(k,t.id);
    if(strict&&l&&l.bulk){out.push({k,l:null});continue}
    if(l&&isExcluded(l.state))continue;
    if(k===today&&!l)continue;
    out.push({k,l});
  }
  return out;
}
function taskRate(t,days){
  const to=todayKey();const from=addDays(to,-(days-1));
  const el=eligibleDays(t,from,to);
  if(!el.length)return null;
  const ok=el.filter(e=>e.l&&isDoneState(e.l.state)).length;
  return{ok,n:el.length,rate:ok/el.length};
}
function settleCheck(t){
  if(t.settledOn)return true;
  const el=eligibleDays(t,t.start,todayKey(),true);
  const ok=el.filter(e=>e.l&&isDoneState(e.l.state)).length;
  const last=el.slice(-30);const lok=last.filter(e=>e.l&&isDoneState(e.l.state)).length;
  return ok>=7 && last.length>0 && lok/last.length>=0.8;
}
function updateSettled(){
  let changed=false;
  S.main.tasks.forEach(t=>{
    if((t.status==="進行中")&&!t.settledOn&&settleCheck(t)){
      t.settledOn=todayKey();t.status="定着";t.focus=false;changed=true;
      toast("修行が定着した","「"+t.name+"」 +"+EXP_SETTLE+" EXP");
    }
  });
  if(changed)saveMain();
}
function trialEval(tr){
  if(tr.status==="中止")return{status:"中止",okDays:0,day:0};
  const today=todayKey();const end=addDays(tr.start,tr.days-1);
  let okDays=0;
  for(let k=tr.start;k<=end&&k<today;k=addDays(k,1)){
    if((tr.restDays||[]).includes(wdOf(k))){okDays++;continue}
    const allOk=tr.taskIds.every(id=>{const l=logOf(k,id);return l&&!l.bulk&&(isDoneState(l.state)||l.state==="excused"||l.state==="rest")});
    if(!allOk){if(k===addDays(today,-1)&&tr.taskIds.every(id=>{const l=logOf(k,id);return !l||l.state!=="miss"}))break;return{status:"失敗",failedOn:k,okDays,day:diffDays(tr.start,k)+1}}
    okDays++;
  }
  if(today>end)return{status:"完遂",okDays,day:tr.days,doneOn:end};
  return{status:"進行中",okDays,day:Math.max(1,diffDays(tr.start,today)+1)};
}
function expEvents(){
  const ev=[];const tmap={};S.main.tasks.forEach(t=>tmap[t.id]=t);
  Object.keys(S.days).sort().forEach(k=>{
    const d=S.days[k];
    Object.keys(d.logs||{}).forEach(id=>{const l=d.logs[id];const t=tmap[id];if(!t)return;
      if(l.state==="done")ev.push({k,exp:EXP_TASK,what:"修行達成："+t.name});
      else if(l.state==="min")ev.push({k,exp:EXP_MIN,what:"最低ライン："+t.name});
    });
    if(d.mission&&d.mission.result==="done"){ev.push({k,exp:EXP_MISSION,what:"一太刀 達成"});if(isCrit(k))ev.push({k,exp:EXP_CRIT,what:"会心の一太刀（ときどき出る）"})}
    if(d.urges){const w=d.urges.filter(u=>u.won).length;if(w)ev.push({k,exp:Math.min(w,URGE_CAP)*EXP_URGE,what:"衝動に打ち勝った ×"+w})}
    if(d.screen!=null){const y=S.days[addDays(k,-1)];if(y&&y.screen!=null&&d.screen<y.screen)ev.push({k,exp:EXP_LESS,what:"SNS・動画の時間が昨日より減った"})}
    if(d.mission&&d.mission.result==="part")ev.push({k,exp:EXP_MISSION_PART,what:"一太刀 一部達成"});
    if(d.ritual&&RITUAL.every((_,i)=>d.ritual[i]))ev.push({k,exp:EXP_RITUAL,what:"朝の型 完遂"});
    if(d.reflection&&d.reflection.at)ev.push({k,exp:EXP_REFL,what:"省察録 記入"});
    if(d.virtue)ev.push({k,exp:EXP_TASK,what:"七徳の実践："+d.virtue.k});
    const okc=okiteCount(d).ok;if(okc)ev.push({k,exp:Math.min(OKITE_CAP,okc*EXP_OKITE),what:"掟の実践 "+okc+"項目"+(okc*EXP_OKITE>OKITE_CAP?"（1日の上限）":"")});
    GROOM.forEach(g=>{if(groomComplete(d,g.id)){if(g.weekly){const w=groomWeekDone(g.id,k);if(w&&w<k)return}ev.push({k,exp:EXP_GROOM,what:"身支度の型："+g.n})}});
    if(breathDoneOn(d))ev.push({k,exp:EXP_BREATH,what:"呼吸・瞑想"});
    if(bwDoneOn(d))ev.push({k,exp:EXP_BW,what:"自重の型"});
  });
  Object.keys(S.main.powers||{}).forEach(id=>{const p=POWERS.find(x=>x.id===id);if(p)ev.push({k:S.main.powers[id].date,exp:EXP_POWER,what:"二十の力 会得："+p.n})});
  Object.keys(S.main.weeklies).forEach(w=>ev.push({k:S.main.weeklies[w].date||w,exp:EXP_WEEK,what:"週次振り返り（"+fmtMD(w)+"週）"}));
  S.main.tasks.forEach(t=>{if(t.settledOn)ev.push({k:t.settledOn,exp:EXP_SETTLE,what:"修行の定着："+t.name})});
  if(S.main.oath&&S.main.oath.date)ev.push({k:S.main.oath.date,exp:EXP_OATH,what:"起請文を立てた"});
  if(S.main.env&&S.main.env.date&&EXP_ENV[S.main.env.state])ev.push({k:S.main.env.date,exp:EXP_ENV[S.main.env.state],what:{deleted:"環境を断った（SNSを消した）",none:"環境は断たれている",work:"SNSを管理下に置いた",keep:"SNSをホームから外した"}[S.main.env.state]});
  {let last=null;(S.main.returns||[]).slice().sort((a,b)=>a.date<b.date?-1:1).forEach(r=>{if(!last||diffDays(last,r.date)>=RETURN_GAP){ev.push({k:r.date,exp:EXP_RETURN,what:"再起の者（戻ってきた）"});last=r.date}})} // 再起の報酬は14日に一度まで
  S.main.trials.forEach(tr=>{const e=trialEval(tr);if(e.status==="完遂")ev.push({k:e.doneOn,exp:EXP_TRIAL,what:tr.days+"日試練 完遂："+tr.name})});
  prepDays().slice(0,PREP_SETTLE).forEach(k=>ev.push({k,exp:EXP_PREP,what:"明日の仕込み（できていた）"}));
  return ev.sort((a,b)=>a.k<b.k?-1:a.k>b.k?1:0);
}
const totalExp=()=>expEvents().reduce((s,e)=>s+e.exp,0);
function settledCats(){const s=new Set();S.main.tasks.forEach(t=>{if(t.settledOn&&t.status!=="中止")s.add(t.cat)});return s}
function trialDone(len){return S.main.trials.some(tr=>tr.days>=len&&trialEval(tr).status==="完遂")}
function practiceDays(){return Object.keys(S.days).filter(k=>Object.values(S.days[k].logs||{}).some(l=>isDoneState(l.state))).length}
function rankConds(){
  const sc=settledCats().size;
  return[true,practiceDays()>=7,sc>=2,sc>=3,sc>=4&&trialDone(30),sc>=6&&trialDone(75)];
}
function computeRank(exp){
  const c=rankConds();let r=0;
  for(let i=1;i<RANKS.length;i++){if(exp>=RANKS[i].exp&&c[i])r=i;else break}
  return r;
}
function syncRank(){
  const exp=totalExp();const r=computeRank(exp);
  if(r>S.main.rankMax){S.main.rankMax=r;S.main.rankLog.push({rank:r,date:todayKey()});saveMain();ui.rankUp=r}
  return{exp,rank:S.main.rankMax};
}
function ability(cat){
  const ts=S.main.tasks.filter(t=>t.cat===cat&&t.status!=="中止");
  let ok=0,n=0;
  ts.forEach(t=>{const r=taskRate(t,30);if(r){ok+=r.ok;n+=r.n}});
  if(cat===6){const to=todayKey();for(let i=0;i<30;i++){const k=addDays(to,-i);const m=S.days[k]&&S.days[k].mission;if(m&&m.result&&m.result!=="postponed"){n++;ok+=m.result==="done"?1:m.result==="part"?.5:0}}}
  return n?Math.round(ok/n*100):null;
}
function needsRecovery(){
  const f=S.main.tasks.find(t=>t.focus&&t.status==="進行中");if(!f)return null;
  const today=todayKey();let k=addDays(today,-1);let miss=0;let guard=0;
  const lastRec=S.main.recoveries.filter(r=>r.taskId===f.id).map(r=>r.date).sort().pop()||"";
  while(miss<3&&guard<20&&k>=f.start&&k>=lastRec){guard++;
    if(taskOn(f,k)){const l=logOf(k,f.id);if(l&&isExcluded(l.state)){k=addDays(k,-1);continue}
      if(!l||l.state==="miss")miss++;else break}
    k=addDays(k,-1)}
  return miss>=3?f:null;
}

/* ============ 共通UI ============ */
const $=s=>document.querySelector(s);
function toast(t,sub){if(S&&S.main&&S.main.tutSnap&&sub&&/EXP/.test(sub))sub+="（練習・本番には残らない）";if(sub&&/\+\d+ EXP/.test(sub))kin(/会心|昇格|すべて|断った|再起/.test(t+sub));const el=$("#toast");el.innerHTML="<div>"+esc(t)+(sub?"<small>"+esc(sub)+"</small>":"")+"</div>";clearTimeout(timers.toast);timers.toast=setTimeout(()=>{el.innerHTML=""},1700)}
function openSheet(html){$("#sheet").innerHTML='<div class="sheet-bg" data-act="closeSheet"><div class="sheet" role="dialog" aria-modal="true">'+html+'</div></div>';const f=$("#sheet .sheet input,#sheet .sheet textarea,#sheet .sheet select");if(f)setTimeout(()=>f.focus(),30)}
function closeSheet(){if(ui.breath){clearInterval(ui.breath.iv);try{ui.breath.lock&&ui.breath.lock.release()}catch(e){}ui.breath=null}$("#sheet").innerHTML=""}
const kamon='<svg class="mon" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18.5" fill="none" stroke="#c9a24a" stroke-width="1.5"/><circle cx="20" cy="20" r="15" fill="none" stroke="#c9a24a" stroke-width=".6"/><path d="M20 7 L23 17 L33 20 L23 23 L20 33 L17 23 L7 20 L17 17Z" fill="#c9a24a"/><circle cx="20" cy="20" r="3" fill="#0d0c0a"/></svg>';
function rankState(){const k=todayKey();const d=S.days[k]||{};if(painActive()||d.cond==="bad")return "休養中";if(gapInfo(k)||needsRecovery())return "再起中";if(S.main.graduated)return "卒業";return ""}
function header(){
  const {exp,rank}=syncRank();const next=RANKS[rank+1];
  const cur=RANKS[rank];const pct=next?Math.max(0,Math.min(100,(exp-cur.exp)/(next.exp-cur.exp)*100)):100;
  const wait=next&&exp>=next.exp;
  return '<header class="top">'+kamon+'<div class="brand">武士道<small>毎日の約束で、己を鍛える</small></div><div class="rankchip"><b>'+cur.n+'</b>'+(rankState()?'<i class="rs">'+rankState()+'</i>':'')+'<span><span id="expn">'+(ui.shownExp!=null&&ui.shownExp<exp?ui.shownExp:exp).toLocaleString()+'</span> EXP'+(next?' / 次 '+next.exp.toLocaleString():'')+'</span></div><button class="help" data-act="help" aria-label="使い方とヘルプ">？</button><div class="hbar" title="'+(next?(wait?next.n+"は修行の条件待ち":next.n+"まで"+Math.round(pct)+"%"):"最高段位")+'"><i style="width:'+(ui.shownPct!=null&&ui.shownExp<exp?ui.shownPct:pct)+'%"></i></div><span id="expfloat" class="expfloat"></span></header>';
}
function render(){applyLook();
  if(plActive()){$("#tabs").hidden=true;$("#app").innerHTML="";plMount();return}if($("#prologue"))plUnmount();
  if(!S.main.onboarded||ui.retake||ui.mflow){$("#tabs").hidden=true;$("#app").innerHTML=renderGate();fillPk();return}
  updateSettled();
  $("#tabs").hidden=false;
  const hs=S.main.hints||{};document.querySelectorAll("#tabs button").forEach(b=>{b.setAttribute("aria-current",b.dataset.tab===tab?"page":"false");b.classList.toggle("new",!!(S.main.tutDone&&HINTS[b.dataset.tab]&&!hs[b.dataset.tab]&&b.dataset.tab!==tab))});
  let body;try{body={dojo:renderDojo,keiko:renderKeiko,roku:renderRoku,chikai:renderChikai}[tab]()}catch(e){console.warn(e);ui.renderErr=(e&&e.message)||String(e);body='<section class="sec" id="sec-renderr"><p class="eyebrow">表示の不具合</p><h2>この画面の一部を表示できなかった。</h2><p class="small muted">記録は消えていない。ほかの間は使える。直らない時は、この文を撮って送ってほしい。</p><p class="small" style="margin-top:6px;overflow-wrap:anywhere">'+esc(ui.renderErr)+'</p><button class="btn wide" data-act="export" style="margin-top:10px">記録を書き出す（控え）</button></section>'}
  const notes=[];
  if(store.kind==="local"&&tab==="chikai")notes.push('<div class="banner small">サインインしていないため、この端末のブラウザ内だけに保存しています。</div>');
  if(S.main.demo)notes.push('<div class="banner small">見本データを表示中です。誓いの間の「データ設定」から消去して本番を始められます。</div>');
  const fade=ui.lastTab!==tab;ui.lastTab=tab;$("#app").classList.toggle("fade",fade&&look().anim==="on");
  $("#app").innerHTML=header()+'<div class="stack">'+notes.join("")+body+'</div>'+(feat("urge")?'<button class="urge-fab" data-act="urge" aria-label="衝動：SNSや動画を見たくなったら押す"><b>衝動</b></button>':'');
  try{groupSections()}catch(e){console.warn(e)}
  if(ui.tut!=null)requestAnimationFrame(tutShow);else maybeHint();
  afterRender();
}
function afterRender(){
  // EXPが増えたら数字を数え上げ、ゲージを伸ばす（即時の手応え）
  const {exp,rank}={exp:totalExp(),rank:S.main.rankMax};const next=RANKS[rank+1];const cur=RANKS[rank];
  const pct=next?Math.max(0,Math.min(100,(exp-cur.exp)/(next.exp-cur.exp)*100)):100;
  const from=ui.shownExp;
  if(from!=null&&exp>from){const el=$("#expn"),bar=$(".hbar i"),fl=$("#expfloat");const t0=performance.now();
    if(fl){fl.textContent="+"+(exp-from)+" EXP";fl.classList.remove("go");void fl.offsetWidth;fl.classList.add("go")}
    if(bar)requestAnimationFrame(()=>{bar.style.width=pct+"%"});
    const step=t=>{const f=Math.min(1,(t-t0)/700);const v=Math.round(from+(exp-from)*(1-Math.pow(1-f,3)));if(el)el.textContent=v.toLocaleString();if(f<1)requestAnimationFrame(step)};requestAnimationFrame(step)}
  ui.shownExp=exp;ui.shownPct=pct;
  if(ui.rankUp!=null&&ui.tut==null)showCeremony(ui.rankUp);
  fillPhotos();fillPk();
}
function showCeremony(r){ui.rankUp=null;if(look().fx==="min"){toast("昇格："+RANKS[r].n,"刀は「"+SWORDS[r]+"」へ");return}const c=$("#ceremony");c.classList.remove("vowbg");setTimeout(fillPk,0);
  c.innerHTML='<div class="cer"><div class="seal big">昇格</div><p class="eyebrow" style="text-align:center">'+SHUHARI[r]+'の段</p><p class="cer-rank">'+RANKS[r].n+'</p>'+swordSVG(r)+'<p class="small muted" style="text-align:center">刀は「'+SWORDS[r]+'」へ。一度得た段位は失いません。</p>'+(S.main.master?'<div class="mcomment" style="margin-top:12px">'+mPic(S.main.master)+'<div><p class="small muted">師範 ・ '+esc(S.main.master.name)+'</p><p class="mline" style="margin:0">「'+esc(mLine("rankup",{r:RANKS[r].n}))+'」</p></div></div>':'')+'<div class="grid2" style="margin-top:14px"><button class="btn" data-cer="close">閉じる</button><button class="btn gold" data-cer="cert">達成証を作る</button></div></div>';
  c.hidden=false}

/* ============ 入門（初回登録） ============ */
/* ============ 入門：まずは自分を見つめ直す（8章・53問。答えで修行・一太刀・掟を決める） ============ */
