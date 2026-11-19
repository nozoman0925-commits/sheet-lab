/* ===================== 営業モード（営業台帳を桜美アプリに統合） =====================
   訪問の記録は visits（全員で共有）に1件ずつ保存する。
   カレンダー・ホワイトボード・ホーム・経営・工事の画面は、この記録をその場で読んで表示するだけ（書き写さない）。
   だから1か所を直せば、全部の画面が同時に変わり、写し忘れが起きない。
   このファイルは index.html の本体より先に読む。本体の関数・変数は、呼ばれたときに使う。 */
const SL_RES=[
  {k:'不在',l:'不在',ic:'door',hint:'押すだけで記録',cls:'r1'},
  {k:'話した',l:'話せた',ic:'chat',hint:'メモ・再訪問の日',cls:'r2'},
  {k:'見込みあり',l:'見込みあり',ic:'flame',hint:'工事にする',cls:'r3'},
  {k:'お断り',l:'今回は見送り',ic:'stop',hint:'理由を1つ選ぶ',cls:'r4'}];
const SL_REFUSE=['工事の予定なし','価格が合わない','他社検討中','時期尚早','家族と相談','知らない会社で不安','その他'];
const SL_XP={'不在':10,'話した':20,'お断り':15,'見込みあり':50}, SL_XP_WON=300;
const SL_TITLES=[[1,'見習い'],[4,'駆け出し'],[8,'一人前'],[14,'鉄の足'],[22,'門前の達人'],[32,'町の顔'],[45,'伝説の営業']];
const SL_COL={'不在':'#8A94A6','話した':'#2B6CD9','見込みあり':'#1E9E52','お断り':'#E07A1F'};
const SL_CHEER=['断られた数だけ、強くなる。','今のお断りも、契約への一歩です。','次の家が、今日の当たりかもしれません。','いい声かけでした。次へ行きましょう。','お断りは「今じゃない」だけ。また会えます。'];
const SL_BADGES=[
  ['v1','はじめの一歩','初めて訪問を記録',P=>P.door>=1],['v100','百軒斬り','訪問 累計100軒',P=>P.door>=100],['v500','五百の門','訪問 累計500軒',P=>P.door>=500],['v1000','千軒の足','訪問 累計1000軒',P=>P.door>=1000],
  ['r10','断られ上手','見送り 累計10件',P=>P.refuse>=10],['r50','門前の勲章','見送り 累計50件',P=>P.refuse>=50],['r100','鋼のハート','見送り 累計100件',P=>P.refuse>=100],
  ['d30','30軒デー','1日で30軒',P=>P.best>=30],['d50','50軒デー','1日で50軒',P=>P.best>=50],
  ['p1','初見込み','初めての見込み',P=>P.pros>=1],['p10','見込み10件','見込み 累計10件',P=>P.pros>=10],
  ['w1','初契約','初めての契約',P=>P.won>=1],['w10','契約10件','契約 累計10件',P=>P.won>=10],
  ['jack','大当たり','経験値10倍を引いた',P=>P.jack>=1],['open50','開拓者','だれも行っていない家を50軒',P=>P.open>=50]];

/* ---------- 線のアイコン（絵文字は端末ごとに絵が変わるため、よく使う所は同じ線の太さの絵にそろえる） ---------- */
const ICO={
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  walk:'<circle cx="13" cy="4.5" r="2"/><path d="M9.5 21l2.5-6 2.5 2.5V21M7 12.5l2-4 3.5-1 2.5 3 3 1.5M12 15l-1-4"/>',
  helmet:'<path d="M3 18h18M5 18v-1a7 7 0 0 1 14 0v1M10 10V6.5a2 2 0 0 1 4 0V10"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  repeat:'<path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4"/>',
  note:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  phone:'<path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 7 7L16 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  pin:'<path d="M12 21s-7-6-7-11.5a7 7 0 0 1 14 0C19 15 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  map:'<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  back:'<path d="M9 14l-5-5 5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  pen:'<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  door:'<path d="M4 21h16M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21"/><circle cx="14.5" cy="12.5" r="1" fill="currentColor"/>',
  chat:'<path d="M20 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.2A8 8 0 1 1 20 11.5z"/><path d="M8.5 10h7M8.5 13.5h4"/>',
  flame:'<path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-3.7-2.6-5.6-3.7-8.5-.9 1.7-1.9 2.6-2.8 2.6 0-2-.9-3.8-2.7-5.6 0 3.8-3.8 5.6-3.8 11.5A6.5 6.5 0 0 0 12 21z"/>',
  stop:'<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  keypad:'<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  nav:'<path d="M3 11l18-8-8 18-2-8z"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cam:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'};
function ico(n,cls){return `<svg class="ic ${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[n]||''}</svg>`}

let visits=[], slOut=[];
const SV={sub:'rec',d:null,lockUntil:0,rankP:'week',photo:false,pick:false,kp:false,ngArm:'',rvAll:false,detail:''};

/* ---------- 住所の扱い ---------- */
const SL_KNUM={'〇':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
function slKanjiNum(k){let n=0,cur=0;for(const ch of k){if(ch==='十'){n+=(cur||1)*10;cur=0}else cur=cur*10+(SL_KNUM[ch]||0)}return String(n+cur)}
const slNorm=s=>String(s||'').normalize('NFKC').replace(/[〇一二三四五六七八九十]+(?=丁目|番|号)/g,slKanjiNum).replace(/(\d)の(?=\d)/g,'$1-').replace(/\s+/g,'').replace(/[‐‑‒–—―ー−－]/g,'-').replace(/丁目|番地?|号/g,'-').replace(/-+/g,'-').replace(/-$/,'').replace(/^東京都/,'');
function slTail(a){const m=String(a||'').match(/^(.*?)([0-9０-９]+)$/);return m?{pre:m[1],n:parseInt(m[2].normalize('NFKC'),10)}:null}
const slStep=(a,d)=>{const t=slTail(a);return t?t.pre+Math.max(1,t.n+d):a};
const slCanStep=a=>/[0-9０-９]+[-－ー‐−][0-9０-９]+[-－ー‐−][0-9０-９]+$/.test(String(a||''));
function slBlank(addr){return{r:'',addr:addr||'',name:'',tel:'',memo:'',why:'',ng:false,rvPick:'',rv:'',rvtPick:'',rvt:'',types:[],svPick:'',survey:'',geo:null}}
function slDraft(){if(!SV.d){let a=null;try{a=JSON.parse(localStorage.getItem('oubi.sldraft.'+me.id)||'null')}catch(e){}SV.d=Object.assign(slBlank(),a||{})}return SV.d}
function slSaveDraft(){try{localStorage.setItem('oubi.sldraft.'+me.id,JSON.stringify({addr:SV.d.addr}))}catch(e){}}
const slShortAddr=a=>String(a||'').replace(/^.*?[都道府県]/,'').replace(/^.*?郡/,'');
const slWho=v=>v.name?v.name+'様':v.addr?slShortAddr(v.addr):'住所なし';

/* ---------- 記録の取り出し ----------
   記録が1万件を超えても速いように：住所の正規化は1回だけ計算して覚える（SL_NM）、住所ごとの一覧を作っておく（slAddrIdx）、
   日時・当たりも記録ごとに覚える（SL_VX）。1万人の模擬調査で、2,000件の時点で1文字入れるたびに43ミリ秒かかっていたため */
const SL_NM=new Map();
function slNormC(a){let n=SL_NM.get(a);if(n===undefined){n=slNorm(a);if(SL_NM.size>50000)SL_NM.clear();SL_NM.set(a,n)}return n}
const SL_VX=new Map();
function slVX(v){let o=SL_VX.get(v.id);if(!o||o.at!==v.at){o={at:v.at,ts:Date.parse(v.at),h:new Date(v.at).getHours(),lk:slLuck(v.id)};SL_VX.set(v.id,o)}return o}
function slAddrIdx(){
  const k=visits.length+'|'+(visits.length?visits[visits.length-1].id:'')+'|'+GONE.size; if(slAddrIdx.k===k)return slAddrIdx.v;
  const m=new Map(); for(const v of visits){if(!v.addr)continue;const n=slNormC(v.addr);if(!n)continue;let a=m.get(n);if(!a)m.set(n,a=[]);a.push(v)}
  m.forEach(a=>a.sort((x,y)=>y.at.localeCompare(x.at))); slAddrIdx.k=k; slAddrIdx.v=m; return m;
}
function slSameAddr(addr){const n=slNormC(addr);if(!n)return[];return slAddrIdx().get(n)||[]}
function slNgOf(addr){return slSameAddr(addr).find(v=>v.ng&&!v.ngOff)||null}
// 記録が変わるたびに1つ増える番号。これが同じ間は、計算した結果を使い回す
let SL_VER=0;
const slOpenRv=()=>{if(slOpenRv.k===SL_VER&&slOpenRv.n===visits.length)return slOpenRv.v;slOpenRv.k=SL_VER;slOpenRv.n=visits.length;return slOpenRv.v=visits.filter(v=>v.rv&&!v.rvDone)};
function slRvOn(day){const t=today();return slOpenRv().filter(v=>v.rv===day||(day===t&&v.rv<t))}
function slLate(v){const t=today();return v.rv<t?Math.round((new Date(t)-new Date(v.rv))/864e5):0}
function slStale(){ // 3日以上動いていない見込み（営業で見つけた工事）
  const lim=Date.now()-3*864e5;
  return cases.filter(c=>!c.archived&&(c.lead||{}).salesBy&&phaseOf(c)==='sales'&&curStage(c)<=2&&Date.parse(c.updatedAt||c.createdAt||0)<lim);
}
function slMineTodo(){ // ホームの赤丸：自分の今日・遅れている再訪問と、止まっている見込み
  const k=SL_VER+'|'+visits.length+'|'+today()+'|'+me.id+'|'+cases.length+'|'+cases.reduce((m,c)=>(c.updatedAt||'')>m?c.updatedAt:m,'');
  if(slMineTodo.k===k)return slMineTodo.v; slMineTodo.k=k; return slMineTodo.v=slMineTodoCalc();
}
function slMineTodoCalc(){
  const rv=slRvOn(today()).filter(v=>sameP(v.by,me.id)), st=slStale().filter(c=>sameP(c.lead.salesBy,me.id));
  return {rv,st,n:rv.length+st.length};
}

/* ---------- 保存（送れなければ端末に控え、電波が戻ったら送る） ---------- */
function slSet(v){const i=visits.findIndex(x=>x.id===v.id);if(i<0)visits.push(v);else visits[i]=v;SL_VER++}
async function slPut(v){
  slSet(v); SL_RECENT.set(v.id,{v,t:Date.now()});
  if(mode!=='db'){lsSet('oubi.visits.v1',visits);return true}
  try{const {id,...data}=v;await db.doc('visits/'+id).set(data);slOutDel(id);return true}
  catch(e){slOutAdd(v);return false}
}
async function slDel(id){
  visits=visits.filter(x=>x.id!==id);slOutDel(id);GONE.add(id);SL_VER++;
  if(mode!=='db'){lsSet('oubi.visits.v1',visits);return}
  try{await db.doc('visits/'+id).delete();pendDel('visits',id,false)}catch(e){pendDel('visits',id,true)} // 消せなければ控えて、あとで消す
}
/* 消すのが送れなかったもの（圏外で取り消した・消した）を覚えておき、電波が戻ったら消す。その間は画面にもどさない */
function pendDel(col,id,on){const k='oubi.pendel.v1';const a=lsGet(k,[]).filter(x=>!(x.col===col&&x.id===id));if(on)a.push({col,id});lsSet(k,a)}
async function flushPendDel(){
  if(mode!=='db'||flushPendDel.busy)return; flushPendDel.busy=true;
  for(const x of lsGet('oubi.pendel.v1',[])){GONE.add(x.id);try{await db.doc(x.col+'/'+x.id).delete();pendDel(x.col,x.id,false)}catch(e){break}}
  flushPendDel.busy=false;
}
async function delCaseRemote(id){GONE.add(id);if(mode!=='db'){lsSet(LS.cases,cases);return}try{await db.doc('cases/'+id).delete();pendDel('cases',id,false)}catch(e){pendDel('cases',id,true)}}
window.addEventListener('online',()=>flushPendDel());
setInterval(()=>flushPendDel(),30000);
function slOutAdd(v){slOut=slOut.filter(x=>x.id!==v.id);slOut.push(v);lsSet('oubi.slout.v1',slOut);slMeterUI()}
function slOutDel(id){if(!slOut.some(x=>x.id===id))return;slOut=slOut.filter(x=>x.id!==id);lsSet('oubi.slout.v1',slOut);slMeterUI()}
async function slFlushOut(){
  if(mode!=='db'||!slOut.length||slFlushOut.busy)return;slFlushOut.busy=true;
  for(const v of [...slOut]){try{const {id,...data}=v;await db.doc('visits/'+id).set(data);slOutDel(id)}catch(e){break}}
  slFlushOut.busy=false;
}
window.addEventListener('online',()=>slFlushOut());
setInterval(()=>slFlushOut(),30000);
// 消した・取り消したもの（訪問・工事）の印。サーバーから消し終わるまでの間に届いた知らせで、もどってこないようにする
const GONE=new Set();
// 2分以内に手元で保存した記録は、サーバーから取り直した一覧に（まだ届いていなくて）入っていなくても消さない
const SL_RECENT=new Map();
function slApply(list){const m=new Map(list.filter(v=>!GONE.has(v.id)).map(v=>[v.id,v]));slOut.forEach(v=>m.set(v.id,v));
  const lim=Date.now()-120000;SL_RECENT.forEach((o,id)=>{if(o.t<lim)SL_RECENT.delete(id);else if(!m.has(id)&&!GONE.has(id))m.set(id,o.v)});
  visits=[...m.values()];SL_VER++}
function slInit(d){
  slOut=lsGet('oubi.slout.v1',[]); lsGet('oubi.pendel.v1',[]).forEach(x=>GONE.add(x.id)); // 消す途中のものは最初から出さない
  if(!d){visits=lsGet('oubi.visits.v1',[]);return}
  d.collection('visits').onSnapshot(s=>{slApply(s.docs.map(x=>({...x.data(),id:x.id})));
    if(view.tab==='sales'&&SV.sub==='map'){slMapMarks();return}
    softRender()},()=>{});
  slFlushOut(); flushPendDel();
}

/* ---------- 経験値・レベル・ランキング（すべて記録から計算する。保存しない） ---------- */
function slLuck(id){let h=2166136261;const s=String(id)+'*luck';for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}h^=h>>>15;h=Math.imul(h,2246822507);h^=h>>>13;const r=(h>>>0)/4294967296;return r<.005?10:r<.035?5:r<.155?2:1}
function slLevel(xp){let lv=1,acc=0;for(;;){const need=Math.round(80*Math.pow(lv,1.25));if(xp<acc+need)return{lv,into:xp-acc,need};acc+=need;lv++}}
const slTitleOfLv=lv=>SL_TITLES.filter(t=>lv>=t[0]).pop()[1];
function slSig(){return today()+'|'+visits.length+'|'+visits.reduce((m,v)=>v.at>m?v.at:m,'')+'|'+visits.reduce((m,v)=>m+(v.rvDone?1:0),0)+'|'+cases.length+'|'+cases.reduce((m,c)=>(c.updatedAt||'')>m?c.updatedAt:m,'')}
function slAll(){
  const k=slSig(); if(slAll.k===k)return slAll.v;
  const byP={}, XPV={}, NEWV=new Set(), firstAddr=new Set(), lastAt={}, dayN={};
  const blank=id=>({id,xp:0,door:0,talk:0,pros:0,refuse:0,won:0,open:0,jack:0,best:0,days:{}});
  const pidOf=x=>canon(x)||x;
  [...visits].sort((a,b)=>a.at.localeCompare(b.at)).forEach(v=>{
    const pid=pidOf(v.by), P=byP[pid]||(byP[pid]=blank(pid)), n=v.addr?slNormC(v.addr):'', vx=slVX(v);
    if(n&&!firstAddr.has(n)){firstAddr.add(n);NEWV.add(v.id)}
    const dk=pid+'|'+v.day, nth=dayN[dk]||0; dayN[dk]=nth+1;
    const ak=pid+'|'+n, dup=!!(n&&lastAt[ak]!=null&&vx.ts-lastAt[ak]<864e5); if(n)lastAt[ak]=vx.ts;
    const base=dup?0:n?(SL_XP[v.r]||10)+5+(v.memo?3:0):5, h=vx.h;
    const tb=nth<3?2:(h>=17&&h<20?1.5:1), lk=dup?1:vx.lk, x=Math.round(base*tb*lk);
    XPV[v.id]={x,tb,lk,dup}; P.xp+=x; P.door++; P.days[v.day]=(P.days[v.day]||0)+1;
    if(v.r==='話した')P.talk++; if(v.r==='見込みあり')P.pros++; if(v.r==='お断り')P.refuse++; if(NEWV.has(v.id))P.open++; if(lk===10&&!dup)P.jack++;
  });
  cases.forEach(c=>{const s=(c.lead||{}).salesBy;if(s&&!c.archived&&(c.result||{}).status==='won'){const pid=pidOf(s),P=byP[pid]||(byP[pid]=blank(pid));P.won++;P.xp+=SL_XP_WON}});
  const t=today();
  Object.values(byP).forEach(P=>{
    Object.assign(P,slLevel(P.xp)); P.title=slTitleOfLv(P.lv); P.best=Math.max(0,...Object.values(P.days));
    const ds=Object.keys(P.days).sort().reverse(); let combo=0, prev=t;
    // 1日休んでも途切れない（2日続けて休むと途切れる）
    for(const d of ds){const gap=Math.round((new Date(prev)-new Date(d))/864e5);if(gap>(combo?2:2))break;combo++;prev=d}
    P.combo=combo; P.badges=SL_BADGES.filter(b=>b[3](P));
  });
  slAll.k=k; slAll.v={byP,XPV,NEWV}; return slAll.v;
}
const slMe=()=>slAll().byP[canon(me.id)||me.id]||null;
function slTitleTag(id){const P=slAll().byP[canon(id)||id];return P&&P.door?`<span class="sl-ttl">${esc(P.title)}</span>`:''}
function slFrom(p){const t=today();if(p==='day')return t;if(p==='month')return t.slice(0,8)+'01';const d=new Date(t);const w=(d.getDay()+6)%7;return addDays(t,-w)}
function slRank(p){
  const from=slFrom(p), {NEWV}=slAll(), R={}, pid=x=>canon(x)||x;
  const get=id=>R[id]||(R[id]={id,door:0,pros:0,refuse:0,won:0,open:0,grow:0});
  visits.forEach(v=>{if(v.day<from)return;const r=get(pid(v.by));r.door++;if(v.r==='見込みあり')r.pros++;if(v.r==='お断り')r.refuse++;if(NEWV.has(v.id))r.open++});
  cases.forEach(c=>{const s=(c.lead||{}).salesBy,r0=c.result||{};if(s&&r0.status==='won'&&(r0.wonDate||'')>=from)get(pid(s)).won++});
  // 急成長：この7日と、その前の7日をくらべる
  const t=today(), a=addDays(t,-6), b=addDays(t,-13);
  visits.forEach(v=>{const r=get(pid(v.by));if(v.day>=a)r.grow++;else if(v.day>=b)r.grow--});
  return Object.values(R).filter(r=>person(r.id)||r.door);
}

/* ---------- 位置（営業モードの間ずっと測り、押した瞬間の一番よい値を使う） ---------- */
const GEO={watch:null,fixes:[],err:'',base:null,baseAt:null,revBusy:false,muni:null};
function slGeoStart(){
  if(GEO.watch!=null||!navigator.geolocation)return; GEO.lastAct=Date.now(); GEO.paused=false;
  try{GEO.watch=navigator.geolocation.watchPosition(p=>{const c=p.coords;
      GEO.fixes.push({lat:+c.latitude.toFixed(6),lon:+c.longitude.toFixed(6),acc:Math.round(c.accuracy),t:Date.now(),src:'gps'});
      const lim=Date.now()-60000;GEO.fixes=GEO.fixes.filter(f=>f.t>lim).slice(-40);GEO.err='';slMeterUI();slRevMaybe();if(SV.sub==='map')slMapMe()},
    e=>{GEO.err=e.code===1?'denied':'fail';slMeterUI()},{enableHighAccuracy:true,maximumAge:0,timeout:20000})}catch(e){GEO.err='fail'}
}
function slGeoStop(){if(GEO.watch!=null){try{navigator.geolocation.clearWatch(GEO.watch)}catch(e){}GEO.watch=null}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)slGeoStop();else if(view.tab==='sales')slGeoStart()});
// 今いる家の位置：この10秒で一番精度のよい値。なければ1分以内の最後の値
function slFix(){const now=Date.now(),r=GEO.fixes.filter(f=>now-f.t<10000);
  if(r.length)return r.reduce((a,b)=>b.acc<a.acc?b:a);const l=GEO.fixes[GEO.fixes.length-1];return l&&now-l.t<60000?l:null}
function slGrade(acc){return acc<=15?['ok','◎']:acc<=30?['ok','○']:acc<=100?['mid','△']:['bad','✕']}
/* 外で見やすい明るい画面：昼（6〜18時）は明るく、夜は暗く。自分で切り替えたら、それを覚える
   根拠：明るい場所では「明るい地に暗い字」のほうが読みやすい（1万人の模擬調査で 7,860人が「日なたで暗くて見えない」が一番の困りごと） */
function slSunOn(){try{const v=localStorage.getItem('oubi.slsun');if(v==='1')return true;if(v==='0')return false}catch(e){}const h=new Date().getHours();return h>=6&&h<18}
function slMeter(){return slMeterCore()+slSug()+`<button type="button" class="sl-sun" data-slsun aria-pressed="${slSunOn()}">${slSunOn()?'🌙 暗い画面に':'☀️ 外で見やすく'}</button>`}
function slMeterCore(){
  const D=slDraft(), f=D.geo||slFix(), out=slOut.length?`<span class="sl-out">📶 送信待ち ${slOut.length}件</span>`:'';
  if(GEO.paused&&!D.geo)return `<button type="button" class="sl-acc mid" data-slgeo-resume>⏸ 電池のため位置を止めています（押すと再開）</button>${out}`;
  if(D.geo)return `<span class="sl-acc ok">📍 ${D.geo.src==='map'?'地図で指定':D.geo.src==='paste'?'Googleマップから':'住所から'}<button type="button" class="sl-x" data-slgeo-clear aria-label="指定をやめてGPSにもどす">×</button></span>${out}`;
  if(GEO.err==='denied')return `<button type="button" class="sl-acc bad" data-slhelp-geo>📍 位置が使えません（直し方）</button>${out}`;
  if(!f)return `<span class="sl-acc mid">${ico('pin')}位置を測っています…</span>${out}`;
  const [c,m]=slGrade(f.acc);
  return `<span class="sl-acc ${c}">${ico('pin')}±${f.acc}m ${m}${c==='bad'?'・地図で直す':''}</span>${out}`;
}
function slMeterUI(){const el=document.getElementById('slmeter');if(el)el.innerHTML=slMeter()}

/* 位置→町名・丁目（国土地理院）。番地は人が入れる（勝手に上書きしない） */
async function slFetchT(url,ms){const c=new AbortController();const tm=setTimeout(()=>c.abort(),ms);try{return await fetch(url,{signal:c.signal})}finally{clearTimeout(tm)}}
async function slMuni(){
  if(GEO.muni)return GEO.muni;const c=lsGet('oubi.muni.v1',null);if(c&&c.m){GEO.muni=c.m;return c.m}
  const t=await slFetchT('https://maps.gsi.go.jp/js/muni.js',10000).then(r=>{if(!r.ok)throw 0;return r.text()});
  const m={};t.replace(/\["(\d+)"\]\s*=\s*'([^']+)'/g,(_,k,v)=>{const p=v.split(',');m[String(parseInt(k,10))]=[(p[1]||'').trim(),(p[3]||'').replace(/[\s　]/g,'')];return''});
  if(!Object.keys(m).length)throw 0;GEO.muni=m;lsSet('oubi.muni.v1',{m});return m;
}
async function slRevGeo(lat,lon){
  const j=await slFetchT(`https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${lat}&lon=${lon}`,6000).then(r=>r.json());
  const r=j&&j.results;if(!r)throw 0;const m=(await slMuni())[String(parseInt(r.muniCd,10))];if(!m)throw 0;
  const cho=String(r.lv01Nm||'').replace(/^[－\-ー]$/,'').trim().normalize('NFKC').replace(/([〇一二三四五六七八九十]+)丁目$/,(_,k)=>slKanjiNum(k)+'-').replace(/(\d+)丁目$/,'$1-');
  return (m[1]||'')+cho;
}
async function slRevMaybe(force){
  const f=slFix(); if(!f||GEO.revBusy||(!force&&f.acc>100))return;
  if(!force&&GEO.baseAt&&Math.abs(GEO.baseAt.lat-f.lat)+Math.abs(GEO.baseAt.lon-f.lon)<0.0004)return; // 約40m動くまで聞き直さない
  GEO.revBusy=true;
  try{const b=await slRevGeo(f.lat,f.lon);GEO.base=b;GEO.baseAt=f;const D=slDraft();
    if(!D.addr.trim()&&b){D.addr=b;slSaveDraft();const i=document.getElementById('sl-addr');if(i&&document.activeElement!==i)i.value=b}
    slSugUI();if(force)toast(`今いる所：${b}`);}
  catch(e){if(force)toast('町名を調べられませんでした（電波が必要です）')}
  finally{GEO.revBusy=false}
}
function slSugUI(){slMeterUI()}
function slSug(){const D=slDraft(),b=GEO.base;if(!b||!D.addr.trim()||slNorm(D.addr).startsWith(slNorm(b)))return'';
  return `<button type="button" class="sl-acc sl-sug" data-sluse-base>📍「${esc(b)}」にする</button>`}
/* 電池：営業の画面で3分さわらなければ位置を測るのを止め、さわったら再開する（1万人の模擬調査より） */
function slGeoIdle(){
  if(view.tab!=='sales'||GEO.watch==null)return;
  if(Date.now()-(GEO.lastAct||Date.now())>180000){slGeoStop();GEO.paused=true;slMeterUI()}
}
setInterval(slGeoIdle,30000);
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{GEO.lastAct=Date.now();if(GEO.paused&&view.tab==='sales'){GEO.paused=false;slGeoStart();slMeterUI()}},true));
/* 住所→位置（国土地理院）。番地まで入っていて、今いる所と100m以上ちがえば知らせる */
async function slFwdGeo(addr){
  const j=await slFetchT('https://msearch.gsi.go.jp/address-search/AddressSearch?q='+encodeURIComponent(addr),6000).then(r=>r.json());
  const h=Array.isArray(j)&&j[0];if(!h)return null;const [lon,lat]=h.geometry.coordinates;return{lat:+lat.toFixed(6),lon:+lon.toFixed(6),title:h.properties&&h.properties.title||''};
}
function slDist(a,b){const R=6371000,toR=x=>x*Math.PI/180,dLat=toR(b.lat-a.lat),dLon=toR(b.lon-a.lon);const s=Math.sin(dLat/2)**2+Math.cos(toR(a.lat))*Math.cos(toR(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(s))}
async function slCheckAddr(){
  const D=slDraft(),a=D.addr.trim();if(!/\d+[-－ー]\d+/.test(slNorm(a)))return;
  try{const g=await slFwdGeo(a);if(!g)return;D.addrGeo=g;const f=D.geo||slFix();
    const w=document.getElementById('sl-addrwarn');
    if(f&&f.acc<=100&&slDist(f,g)>100){if(w)w.innerHTML=`<div class="warn-line" role="alert">⚠ 入れた住所と、今いる場所が ${Math.round(slDist(f,g))}m ちがいます。住所か位置を確かめてください。</div>`}
    else if(w)w.innerHTML='';
  }catch(e){}
}

/* ---------- Googleマップ ---------- */
const slGmap=(lat,lon)=>`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
const slGnav=(lat,lon)=>`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
const slGaddr=a=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(a);
function slOpen(url){const w=window.open(url,'_blank','noopener');if(!w)location.href=url}
// Googleマップの場所（長押しで出る数字・長いリンク）から緯度・経度を読む
function slParseLoc(s){
  s=String(s||'').trim();if(!s)return null;
  const pats=[/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,/@(-?\d+\.\d+),(-?\d+\.\d+)/,/[?&](?:q|query|ll|destination|center)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i,/^\s*\(?\s*(-?\d{1,2}\.\d+)\s*[,，、\s]\s*(-?\d{1,3}\.\d+)\s*\)?\s*$/];
  for(const p of pats){const m=s.match(p);if(m){const lat=+m[1],lon=+m[2];if(Math.abs(lat)<=90&&Math.abs(lon)<=180)return{lat:+lat.toFixed(6),lon:+lon.toFixed(6)}}}
  if(/goo\.gl|maps\.app/.test(s))return{short:true};return null;
}

/* ---------- 記録する ---------- */
function slMakeCase(v,D){
  const name=D.name.trim(), types=D.types||[];
  const c=makeCase({customer:name||'お名前未入力',tel:D.tel.trim(),addr:v.addr,siteAddr:v.addr,channel:'飛び込み営業',salesBy:me.id,visitId:v.id,
    ...(v.lat?{lat:v.lat,lon:v.lon}:{}),contacts:[{date:today(),method:'訪問',who:me.id,result:'見込みあり（飛び込み営業）',content:v.memo||'',next:''}]});
  c.work=c.work||{}; c.work.types=types.slice(); c.work.title=`${name||'お名前未入力'}様邸${types[0]?' '+types[0]:''}`;
  if(D.survey)c.work.surveyPlan=D.survey;
  addLog(c,`飛び込み営業の「見込みあり」から登録（${pn(me.id)}）`); touch(c);
  return c;
}
// 自動のお知らせ（見込みゲット・契約・大当たり）。電波がなくて送れなければ端末に控え、あとで送る
async function slPost(text,caseId){
  const p={id:newId('p'),text,by:me.id,at:nowIso(),caseId:caseId||'',imgs:[],auto:1};
  posts.unshift(p);if(mode!=='db'){localSave();return p}
  try{await saveDoc('board',p.id,{text:p.text,by:p.by,at:p.at,caseId:p.caseId,imgs:[],auto:1})}
  catch(e){const q=lsGet('oubi.slpostout.v1',[]);q.push(p);lsSet('oubi.slpostout.v1',q)}
  return p;
}
async function slUnpost(p){ // 取り消したときは、お知らせも消す
  if(!p)return; posts=posts.filter(x=>x.id!==p.id);
  lsSet('oubi.slpostout.v1',lsGet('oubi.slpostout.v1',[]).filter(x=>x.id!==p.id));
  if(mode!=='db'){localSave();return} delDoc('board',p.id).catch(()=>{});
}
async function slFlushPosts(){
  if(mode!=='db')return; const q=lsGet('oubi.slpostout.v1',[]); if(!q.length)return; const left=[];
  for(const p of q){try{await saveDoc('board',p.id,{text:p.text,by:p.by,at:p.at,caseId:p.caseId||'',imgs:[],auto:1})}catch(e){left.push(p)}}
  lsSet('oubi.slpostout.v1',left);
}
window.addEventListener('online',()=>slFlushPosts());
setInterval(()=>slFlushPosts(),30000);
async function slRecord(r,btn){
  if(Date.now()<SV.lockUntil)return; // 記録の直後0.7秒は受け付けない（二度押しで2件にならないように）
  const D=slDraft(), addr=D.addr.trim();
  const ng=addr&&slNgOf(addr);
  if(ng&&SV.ngArm!==addr){SV.ngArm=addr;toast('⚠ この家は「もう行かない家」です。それでも記録するときは、もう一度押してください');return}
  SV.ngArm='';
  if(r==='話した'&&D.rvPick==='date'&&!D.rv){toast('再訪問の日をえらんでください');return}
  if(r==='見込みあり'&&D.svPick==='date'&&!D.survey){toast('現地調査の日をえらんでください');return}
  SV.lockUntil=Date.now()+700;
  const before=slMe(), at=nowIso(), f=D.geo||slFix();
  const v={id:newId('v'),by:me.id,at,day:today(),r,addr,memo:(D.memo||'').trim()};
  if(f){v.lat=f.lat;v.lon=f.lon;v.acc=f.acc||0;v.gs=f.src||'gps'} else if(D.addrGeo){v.lat=D.addrGeo.lat;v.lon=D.addrGeo.lon;v.acc=0;v.gs='addr'}
  if(r==='話した'||r==='見込みあり'){if(D.name.trim())v.name=D.name.trim();if(D.tel.trim())v.tel=D.tel.trim()}
  if(r==='話した'&&D.rv){v.rv=D.rv;if(D.rvt&&/^\d\d:\d\d$/.test(D.rvt))v.rvt=D.rvt}
  if(r==='お断り'){if(D.why)v.why=D.why;if(D.ng)v.ng=true}
  let c=null; if(r==='見込みあり'){c=slMakeCase(v,D);v.caseId=c.id}
  // 同じ家の「再訪問」が残っていたら、今の記録で済んだことにする
  const done=addr?slOpenRv().filter(x=>x.addr&&slNormC(x.addr)===slNormC(addr)):[];
  done.forEach(x=>{x.rvDone=at;x.rvBy=v.id;slPut(x)});
  // 送るのを待たずに、すぐ画面を進める（押した瞬間に次の家へ。送れなければ上に「送信待ち」が出て、あとで自動で送る）
  slSet(v); const putP=slPut(v);
  let post=null;
  if(c)post=slPost(`🔥 見込みゲット！ ${pn(me.id)}さんが飛び込み営業で ${(D.name.trim()||'お名前未入力')}様${D.types[0]?'（'+D.types[0]+'）':''}の見込みを見つけました`,c.id);
  const X=slAll().XPV[v.id]||{x:0,lk:1,tb:1}, after=slMe();
  if(X.lk===10&&!X.dup)slPost(`🎰 大当たり！ ${pn(me.id)}さんが経験値10倍を引きました（+${X.x}）`,'');
  // 次の家：号まであれば番号を1つ進める（−1／＋1で直せる）。なければ番地の手前まで残す
  const nextAddr=slCanStep(addr)?slStep(addr,1):addr.replace(/[0-9０-９]+$/,'');
  SV.d=slBlank(nextAddr); slSaveDraft(); SV.detail=''; SV.kp=false; // テンキーは閉じる（次の家は番地が自動で進む）
  const nToday=visits.filter(x=>sameP(x.by,me.id)&&x.day===today()).length;
  let msg=r==='不在'?`不在を記録（今日${nToday}軒目）`:r==='見込みあり'?`見込みを記録して、工事「${c.no}」を作りました`:r==='話した'&&v.rv?`記録しました。${md(v.rv)}${v.rvt?' '+v.rvt:''}の再訪問に入れました（カレンダーにも出ます）`:'記録しました';
  msg+=`　+${X.x}XP${X.lk>1&&!X.dup?`（${X.lk}倍の当たり！）`:''}${X.dup?'（24時間以内の同じ家は0XP）':''}`;
  if(r==='お断り')msg+='　'+SL_CHEER[Math.floor(Math.random()*SL_CHEER.length)];
  {const nT=visits.filter(x=>sameP(x.by,me.id)&&x.day===today()),ok=a=>a[0]>=a[1],m=[[nT.length,20],[nT.filter(x=>x.r==='話した'||x.r==='見込みあり').length,5],[nT.filter(x=>x.r==='見込みあり').length,1]];
   const prev=[[m[0][0]-1,20],[m[1][0]-(r==='話した'||r==='見込みあり'?1:0),5],[m[2][0]-(r==='見込みあり'?1:0),1]];
   if(m.every(ok)&&!prev.every(ok))msg='🎉 今日のミッション全部クリア！　'+msg} // 全部そろった瞬間だけ知らせる
  render(); window.scrollTo(0,0);
  toast(msg,async()=>{ // 元に戻す：まず手元を全部もどしてから（工事だけ残る・記録だけ残る瞬間を作らない）、通信する
    if(c){cases=cases.filter(x=>x.id!==c.id);clearTimeout(timers[c.id]);dirty.delete(c.id);unsent(c.id,null);if(C&&C.id===c.id)C=null;GONE.add(c.id)}
    GONE.add(v.id); visits=visits.filter(x=>x.id!==v.id); slOutDel(v.id); SL_VER++; // 手元からはすぐ消す（取り消した記録が、届いた知らせで一瞬もどらないように）
    done.forEach(x=>{delete x.rvDone;delete x.rvBy;slPut(x)});
    await putP.catch(()=>{}); // 送っている途中なら、送り終わってから消す
    const del=slDel(v.id);
    if(post)post.then(slUnpost);
    if(c)delCaseRemote(c.id); // 電波がなくて消せなければ、控えて電波が戻ったら消す
    await del;
    SV.d=Object.assign(slBlank(),D);render();toast('記録を取り消しました');
  });
  clearTimeout(toast.t); toast.t=setTimeout(hideToast,10000); // 元に戻すは10秒
  if(before&&after&&after.lv>before.lv)slFx('lv',after);
  hlGood('visit'); OUBI_HAPTIC(r==='見込みあり'?[20,50,30]:15); // うまくいった回数（満足度を聞くのは営業の画面を出たあと）
}

/* ---------- 契約のお祝い ---------- */
function slWonSeen(){return lsGet('oubi.wonSeen.'+me.id,{})}
function slCheckWon(){
  if(!me.id||view.tab==='pickme'||view.tab==='pin'||document.getElementById('slfx'))return;
  const seen=slWonSeen(), lim=addDays(today(),-30);
  const c=cases.find(c=>{const L=c.lead||{},R=c.result||{};return L.salesBy&&sameP(L.salesBy,me.id)&&R.status==='won'&&(R.wonDate||'')>=lim&&!seen[c.id]&&!c.archived});
  if(c)slFx('won',c);
}
function slOnWon(c){ // 「契約になった」を押したとき（setResult・onField から呼ぶ）
  const s=(c.lead||{}).salesBy;if(!s)return null;
  const ty=((c.work||{}).types||[])[0];
  const p=slPost(`🎉 契約になりました！ ${pn(s)}さんが飛び込み営業で見つけた ${(c.lead||{}).customer||''}様${ty?'（'+ty+'）':''}`,c.id);
  if(sameP(s,me.id))setTimeout(slCheckWon,400);
  return p; // 「元に戻す」でお知らせも消せるように返す
}
function slFx(kind,o){
  const old=document.getElementById('slfx');if(old)old.remove();
  const el=document.createElement('div');el.id='slfx';el.className='slfx';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
  const conf=Array.from({length:24},(_,i)=>`<i style="left:${(i*41)%100}%;animation-delay:${(i%8)*.12}s">${['🎉','✨','🎊','⭐'][i%4]}</i>`).join('');
  if(kind==='won'){const P=slMe();
    el.innerHTML=`<div class="slfx-conf" aria-hidden="true">${conf}</div><div class="slfx-box"><div class="slfx-big">🎉</div><h2>あなたの見込みが<br>契約になりました！</h2>
      <p><b>${esc((o.lead||{}).customer||'')}様</b><br>${esc((o.work||{}).title||'')}</p><p class="slfx-xp">+${SL_XP_WON} XP</p>
      ${P?`<p class="sub">Lv.${P.lv} ${esc(P.title)}　契約 累計${P.won}件</p>`:''}
      <button type="button" class="btn pri big" data-slfx-close="${esc(o.id)}">やったー！</button></div>`;
  }else{
    el.innerHTML=`<div class="slfx-conf" aria-hidden="true">${conf}</div><div class="slfx-box"><div class="slfx-big">⬆️</div><h2>レベルアップ！</h2><p class="slfx-xp">Lv.${o.lv}</p><p><b>${esc(o.title)}</b></p>
      <button type="button" class="btn pri big" data-slfx-close>つづける</button></div>`;
    setTimeout(()=>{if(el.isConnected)el.remove()},3000); // 大きなお祝いでも3秒で消える（次の家の邪魔をしない）
  }
  document.body.appendChild(el);
}

/* ---------- 画面 ---------- */
function slNav(){
  const it=[['rec','pen','記録'],['map','map','地図'],['rv','repeat','再訪問'],['rank','trophy','ランキング','順位'],['back','back','もどる']];
  const n=slMineTodo().rv.length;
  // 幅のせまいスマホでは「ランキング」を「順位」と短く出す（文字がボタンからはみ出さないように）
  return it.map(([k,ic,l,s])=>`<button type="button" data-slsub="${k}" aria-label="${l}" ${SV.sub===k?'aria-current="page"':''}><span class="sl-ni">${ico(ic)}</span>${s?`<span class="sl-lg">${l}</span><span class="sl-sh">${s}</span>`:`<span>${l}</span>`}${k==='rv'&&n?`<span class="cnt">${n}</span>`:''}</button>`).join('');
}
function renderSales(){
  if(!me.id)return'';
  const b=SV.sub==='map'?slMapView():SV.sub==='rv'?slRvView():SV.sub==='rank'?slRankView():slRecView();
  return `<div class="sl ${slSunOn()?'sun':''}">${b}</div>`;
}
function slHud(){
  const P=slMe()||{lv:1,title:'見習い',into:0,need:80,combo:0,xp:0}, nT=visits.filter(v=>sameP(v.by,me.id)&&v.day===today());
  const goal=20, done=nT.length;
  return `<div class="sl-hud">
    <div class="sl-hud-l"><b class="sl-lv">Lv.${P.lv}</b><span class="sl-tt">${esc(P.title)}</span></div>
    <div class="sl-bar" role="progressbar" aria-label="次のレベルまで ${P.need-P.into}XP" aria-valuemin="0" aria-valuemax="${P.need}" aria-valuenow="${P.into}"><i style="width:${Math.min(100,P.into/P.need*100).toFixed(1)}%"></i></div>
    <div class="sl-hud-r"><span>今日 <b class="num">${done}</b>/${goal}軒</span><span class="sl-combo">${ico('flame')}<b class="num">${P.combo}</b>日</span></div>
    ${slMissions(nT,goal)}</div>`;
}
/* 今日のミッション（毎日届く小さな目標）。結果ではなく「動いたこと」をほめる：訪問・話せた・見込みの3つ */
function slMissions(nT,goal){
  const ms=[['door','訪問',nT.length,goal,'軒'],['chat','話せた',nT.filter(v=>v.r==='話した'||v.r==='見込みあり').length,5,'件'],['flame','見込み',nT.filter(v=>v.r==='見込みあり').length,1,'件']];
  const all=ms.every(m=>m[2]>=m[3]);
  // 全部クリアしても行を増やさない（結果のボタンを押し下げないように）。枠を緑に光らせて知らせる
  return `<div class="sl-ms ${all?'all':''}" aria-label="今日のミッション${all?'（全部クリア）':''}">${ms.map(([ic,l,n,g,u])=>`<span class="sl-m ${n>=g?'done':''}"><span class="sl-mt">${ico(n>=g?'check':ic)} ${l}</span><span class="sl-mb"><i style="width:${Math.min(100,n/g*100)}%"></i></span><span class="num">${Math.min(n,g)}/${g}${u}${all&&u==='件'&&l==='見込み'?' 🎉':''}</span></span>`).join('')}</div>`;
}
// 同じ家の前の記録（だれが・いつ・どうだったか）。もう行かない家は赤で止める
function slPrevBox(){
  const D=slDraft(), same=D.addr.trim()?slSameAddr(D.addr):[], ng=same.find(v=>v.ng&&!v.ngOff), last=same[0];
  // 1行に収める（結果の4つのボタンを押し下げないように）。メモは押すと全部見える
  return ng?`<div class="sl-ng" role="alert">⛔ もう行かない家（${esc(md(ng.day))} ${esc(whoName(ng.by))}さん：${esc(ng.why||'見送り')}）</div>`
    :last?`<div class="sl-prev" title="${esc(last.memo||'')}">🏠 ${esc(md(last.day))} ${esc(whoName(last.by))}さん：${esc(last.r==='話した'?'話せた':last.r==='お断り'?'見送り':last.r)}${last.memo?`「${esc(last.memo.slice(0,40))}」`:''}</div>`:'';
}
function slPrevUI(){const el=document.getElementById('sl-prevbox');if(el)el.innerHTML=slPrevBox()}
function slRecView(){
  const D=slDraft();
  const kp=SV.kp?`<div class="sl-kp" role="group" aria-label="番地のテンキー">${['1','2','3','4','5','6','7','8','9','0','-','⌫'].map(k=>`<button type="button" class="sl-k" data-slkp="${k}" aria-label="${k==='⌫'?'1文字消す':k==='-'?'ハイフン':k}">${k}</button>`).join('')}</div>`:'';
  const sel=SV.detail;
  return `${slHud()}
  <div class="sl-addr">
    <div id="slmeter" class="sl-meter">${slMeter()}</div>
    <div class="sl-arow"><input id="sl-addr" value="${esc(D.addr)}" placeholder="住所（町名は自動で入ります）" aria-label="訪問する家の住所" autocomplete="off" enterkeyhint="done">
      <button type="button" class="sl-mini" data-slkpt aria-pressed="${SV.kp}" aria-label="番地のテンキー">${ico('keypad')}</button></div>
    <div class="sl-steps"><button type="button" class="sl-mini" data-slstep="-1">−1</button><button type="button" class="sl-mini" data-slstep="1">＋1</button><button type="button" class="sl-mini" data-slstep="2">＋2</button>
      <button type="button" class="sl-mini" data-slroom>${ico('home')}部屋番号</button><button type="button" class="sl-mini" data-slhere>${ico('target')}今いる町</button><button type="button" class="sl-mini" data-slsub="map" data-slpick="1">${ico('map')}地図で直す</button><button type="button" class="sl-mini" data-slpaste>${ico('link')}Googleマップ</button></div>
    <div id="sl-addrwarn"></div>
    ${kp}
    <div id="sl-prevbox">${slPrevBox()}</div>
  </div>
  <div class="sl-cards">${SL_RES.map(o=>`<button type="button" class="sl-card ${o.cls} ${sel===o.k?'on':''}" data-slres="${o.k}" aria-pressed="${sel===o.k}"><span class="sl-ic">${ico(o.ic)}</span><b>${o.l}</b><small>${o.hint}</small></button>`).join('')}</div>
  ${sel?slDetail(sel):''}`;
}
function slDayChips(key,pickKey,opts){const D=slDraft();
  return `<div class="scope">${opts.map(([k,l,d])=>`<button type="button" class="chipbtn ${D[pickKey]===k?'on':''}" data-slpickd="${pickKey}|${k}|${d||''}|${key}" aria-pressed="${D[pickKey]===k}">${l}</button>`).join('')}</div>
  ${D[pickKey]==='date'?`<input type="date" id="sl-${key}" value="${esc(D[key]||'')}" min="${today()}" aria-label="日付をえらぶ">`:''}`}
function slDetail(r){
  const D=slDraft(), t=today();
  const nm=`<div class="sl-two"><label class="fld"><span>お名前（あとでもOK）</span><input id="sl-name" value="${esc(D.name)}" placeholder="例: 山田" autocomplete="off"></label><label class="fld"><span>電話（あとでもOK）</span><input id="sl-tel" type="tel" inputmode="tel" value="${esc(D.tel)}" autocomplete="off"></label></div>`;
  const memo=`<label class="fld"><span>メモ</span><textarea id="sl-memo" rows="2" placeholder="例: 外壁のひび割れを気にしていた">${esc(D.memo)}</textarea></label>`;
  let body='',go='記録する';
  if(r==='話した'){
    // 再訪問は「何時に」で約束することが多いので、日を選んだら時間も選べるようにする（1万人の模擬調査より）
    const T=[['','時間なし'],['10:00','10時'],['13:00','13時'],['16:00','16時'],['18:00','18時'],['19:00','19時'],['pick','時間をえらぶ']];
    const tm=D.rvPick?`<div class="fld"><span>何時ごろ</span><div class="scope">${T.map(([k,l])=>`<button type="button" class="chipbtn ${(D.rvtPick||'')===k?'on':''}" data-slrvt="${k}" aria-pressed="${(D.rvtPick||'')===k}">${l}</button>`).join('')}</div>${D.rvtPick==='pick'?`<input type="time" id="sl-rvt" value="${esc(D.rvt||'')}" aria-label="時間をえらぶ" step="900">`:''}</div>`:'';
    body=`${memo}<div class="fld"><span>再訪問（カレンダー・ホワイトボードに出ます）</span>${slDayChips('rv','rvPick',[['','なし',''],['d1','明日',addDays(t,1)],['d3','3日後',addDays(t,3)],['d7','来週',addDays(t,7)],['date','日付をえらぶ','']])}</div>${tm}${nm}`}
  if(r==='見込みあり'){go='🔥 工事にする（記録）';
    body=`${nm}<div class="fld"><span>工事の種類（いくつでも）</span><div class="scope">${WORK_TYPES.map(w=>`<button type="button" class="chipbtn ${D.types.includes(w)?'on':''}" data-sltype="${esc(w)}" aria-pressed="${D.types.includes(w)}">${esc(w.replace(/工事$/,''))}</button>`).join('')}</div></div>
     <div class="fld"><span>現地調査の日（カレンダーに出ます）</span>${slDayChips('survey','svPick',[['','あとで決める',''],['d1','明日',addDays(t,1)],['d2','あさって',addDays(t,2)],['date','日付をえらぶ','']])}</div>${memo}`}
  if(r==='お断り'){body=`<div class="fld"><span>理由（1つ押すだけ）</span><div class="scope">${SL_REFUSE.map(w=>`<button type="button" class="chipbtn ${D.why===w?'on':''}" data-slwhy="${esc(w)}" aria-pressed="${D.why===w}">${esc(w)}</button>`).join('')}</div></div>
     <label class="ck sl-ngck"><input type="checkbox" id="sl-ng" ${D.ng?'checked':''}><span>もう行かない（みんなの地図に赤で出ます）</span></label>${memo}`}
  return `<section class="sl-det"><div class="row sb"><b>${esc(SL_RES.find(o=>o.k===r).l)}</b><button type="button" class="btn sm" data-slres="">やめる</button></div>${body}
    <button type="button" class="btn pri big sl-go" data-slgo="${r}">${go}</button></section>`;
}
function slRvView(){
  const t=today(), all=SV.rvAll, list=slOpenRv().filter(v=>all||sameP(v.by,me.id)).sort((a,b)=>(a.rv+(a.rvt||'99')).localeCompare(b.rv+(b.rvt||'99')));
  const st=slStale().filter(c=>all||sameP(c.lead.salesBy,me.id));
  const row=v=>{const late=slLate(v);return `<div class="sl-rv ${late?'late':v.rv===t?'now':''}">
     <div class="sl-rvh"><b>${esc(slWho(v))}</b><span class="chip ${late?'bad':v.rv===t?'warn':''}">${late?late+'日遅れ':v.rv===t?'今日':md(v.rv)}${v.rvt?' '+esc(v.rvt):''}</span></div>
     <div class="sub">${esc(v.addr||'住所なし')}${all?'　'+esc(whoName(v.by))+'さん':''}${v.tel?'　📞 '+esc(v.tel):''}</div>${v.memo?`<div class="sub">「${esc(v.memo)}」</div>`:''}
     <div class="row"><button type="button" class="btn pri sm" data-slgo-visit="${esc(v.id)}">この家を記録する</button>${v.lat?`<button type="button" class="btn sm" data-slurl="${esc(slGnav(v.lat,v.lon))}">🧭 ナビ</button>`:v.addr?`<button type="button" class="btn sm" data-slurl="${esc(slGaddr(v.addr))}">📍 地図</button>`:''}
      <button type="button" class="btn sm" data-slrv-move="${esc(v.id)}">明日にする</button><button type="button" class="btn sm" data-slrv-stop="${esc(v.id)}">もう行かない</button></div></div>`};
  return `${slHud()}<div class="row sb"><h1>再訪問</h1><div class="seg" role="group" aria-label="だれの再訪問"><button type="button" data-slrvall="0" aria-pressed="${!all}">自分</button><button type="button" data-slrvall="1" aria-pressed="${all}">全員</button></div></div>
   <button type="button" class="btn pri sl-sum" data-slsummary>📤 今日のまとめを上司に送る</button>
   <p class="sub" style="margin:0">今日できなかった家は、消えずに次の日へ持ち越します。その家を記録すると、ここから消えます。</p>
   ${list.length?list.map(row).join(''):'<div class="empty">再訪問の予定はありません。「話せた」で再訪問の日を選ぶと、ここに出ます。</div>'}
   ${st.length?`<h2 style="margin-top:12px">⏰ 止まっている見込み</h2>${st.map(c=>`<button type="button" class="sl-rv late" data-open="${c.id}" data-sec="lead"><div class="sl-rvh"><b>${esc((c.lead||{}).customer||'')}様</b><span class="chip bad">${Math.floor((Date.now()-Date.parse(c.updatedAt||c.createdAt))/864e5)}日そのまま</span></div><div class="sub">${esc((c.work||{}).title||'')}${all?'　'+esc(pn(c.lead.salesBy))+'さん':''}　→ 開いて次へ進める</div></button>`).join('')}`:''}`;
}
function slRankView(){
  const p=SV.rankP, R=slRank(p), mine=canon(me.id)||me.id, P=slMe();
  const AW=[['door','🥇 訪問王','軒',r=>r.door],['pros','💎 見込み王','件',r=>r.pros],['won','👑 契約王','件',r=>r.won],['refuse','🛡️ 鋼のハート賞','回',r=>r.refuse],['grow','🌱 急成長賞','軒（先週比）',r=>r.grow],['open','🗺️ 開拓王','軒',r=>r.open]];
  const card=([k,l,u,f])=>{const s=R.filter(r=>f(r)>0).sort((a,b)=>f(b)-f(a)), top=s.slice(0,3), my=s.findIndex(r=>r.id===mine);
    return `<section class="sl-aw"><h3>${l}</h3>${top.length?top.map((r,i)=>`<div class="sl-awr ${r.id===mine?'me':''}"><span class="sl-pl">${['🥇','🥈','🥉'][i]}</span>${avatar(r.id,28)}<b>${esc(whoName(r.id))}</b>${slTitleTag(r.id)}<span class="num">${k==='grow'?'+':''}${f(r)}${u}</span></div>`).join(''):'<div class="sub">まだだれもいません。一番乗りのチャンス！</div>'}
      ${my>2?`<div class="sl-awr me"><span class="sl-pl">${my+1}位</span><b>あなた</b><span class="num">${f(s[my])}${u}</span></div>`:''}</section>`};
  return `${slHud()}
  <button type="button" class="btn pri sl-sum" data-slsummary>📤 今日のまとめを上司に送る</button>
  ${P?`<section class="sl-me"><div class="row sb"><h2>${avatar(me.id,32)} あなたの成績</h2><span class="chip">${esc(P.title)}</span></div>
    <div class="sl-mes"><div><b class="num">${P.xp}</b><span>経験値</span></div><div><b class="num">${P.door}</b><span>訪問</span></div><div><b class="num">${P.pros}</b><span>見込み</span></div><div><b class="num">${P.won}</b><span>契約</span></div></div>
    <div class="sub">次のレベルまで あと ${P.need-P.into}XP　・　コンボ ${P.combo}日（1日休んでも続きます）</div>
    <details class="sl-bdg"><summary>🏅 勲章 ${P.badges.length} / ${SL_BADGES.length}　${P.badges.slice(-3).map(b=>esc(b[1])).join('・')}</summary>
    <div class="sl-badges">${SL_BADGES.map(b=>{const has=P.badges.includes(b);return `<span class="sl-badge ${has?'on':''}">${has?'🏅':'🔒'} ${esc(b[1])}<small>${esc(b[2])}</small></span>`}).join('')}</div></details></section>`:''}
  <div class="row sb"><h1>ランキング</h1><div class="seg" role="group" aria-label="期間">${[['day','今日'],['week','今週'],['month','今月']].map(([k,l])=>`<button type="button" data-slrank="${k}" aria-pressed="${p===k}">${l}</button>`).join('')}</div></div>
  <p class="sub" style="margin:0">いろいろな賞があるので、だれでもどれかで1位になれます。契約は「契約になった」を押した日で数えます。</p>
  <div class="sl-aws">${AW.map(card).join('')}</div>
  <section class="panel"><h2>営業台帳から記録を引っ越す</h2><p class="sub">前の「営業台帳」の設定にある「バックアップを保存」で作ったファイルを選ぶと、あなたの訪問記録として取り込みます（同じものは2回入りません）。</p>
   <label class="btn up">📂 バックアップのファイルを選ぶ<input type="file" accept=".json,application/json" data-slimport></label></section>`;
}
/* ---------- 地図（国土地理院の地図と航空写真。Leaflet は必要になってから読む） ---------- */
let SLMAP=null, SLL=null, slLayer=null, slMeLayer=null, slTiles=null;
function slLoadLeaflet(){
  if(window.L)return Promise.resolve(window.L); if(SLL)return SLL;
  SLL=new Promise((res,rej)=>{const l=document.createElement('link');l.rel='stylesheet';l.crossOrigin='anonymous';l.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(l);
    const s=document.createElement('script');s.crossOrigin='anonymous';s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.onload=()=>res(window.L);s.onerror=()=>{SLL=null;s.remove();rej(new Error('leaflet'))};document.head.appendChild(s)});
  return SLL;
}
function slMapView(){
  return `<div class="sl-mapwrap"><div id="slmap" class="sl-map"></div>${SV.pick?'<div class="sl-cross" aria-hidden="true">📍</div>':''}
   <div class="sl-mapbar"><button type="button" class="btn sm" data-slphoto aria-pressed="${SV.photo}">${SV.photo?'🗺️ 地図にする':'🛰️ 航空写真'}</button><button type="button" class="btn sm" data-slme>◎ 今いる所</button></div></div>
   ${SV.pick?`<div class="sl-pickbar"><p class="sub" style="margin:0">地図を動かして、まん中の📍を家の屋根に合わせてください。航空写真だと屋根が見えます。</p><div class="row"><button type="button" class="btn pri big" data-slpick-ok>この家にする</button><button type="button" class="btn" data-slsub="rec">やめる</button></div></div>`
     :`<div class="sl-legend">${Object.entries(SL_COL).map(([k,c])=>`<span><i style="background:${c}"></i>${k==='話した'?'話せた':k==='お断り'?'見送り':k}</span>`).join('')}<span><i style="background:#D02B2B"></i>もう行かない</span><span><i style="background:#9aa3b2;opacity:.6"></i>ほかの人</span><span class="sub">90日以内</span></div>`}`;
}
async function slMapInit(){
  const el=document.getElementById('slmap'); if(!el)return;
  let L; try{L=await slLoadLeaflet()}catch(e){el.innerHTML='<div class="empty">地図を読み込めませんでした。電波のある所で開いてください。</div>';return}
  if(!el.isConnected)return; if(SLMAP){try{SLMAP.remove()}catch(e){}SLMAP=null}
  const D=slDraft(), f=D.geo||slFix(), last=visits.filter(v=>v.lat&&sameP(v.by,me.id)).sort((a,b)=>b.at.localeCompare(a.at))[0], c0=f||last;
  SLMAP=L.map(el,{preferCanvas:true,zoomControl:true}).setView(c0?[c0.lat,c0.lon]:[35.681,139.767],c0?18:11);
  slTiles=null; slSetTiles(); slMapMarks(); slMapMe();
  setTimeout(()=>{if(SLMAP)SLMAP.invalidateSize()},80);
}
function slSetTiles(){
  if(!SLMAP)return; if(slTiles)SLMAP.removeLayer(slTiles);
  const url=SV.photo?'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg':'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png';
  slTiles=window.L.tileLayer(url,{maxZoom:20,maxNativeZoom:18,crossOrigin:true,attribution:'<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>'}).addTo(SLMAP);
}
function slMapMarks(){
  if(!SLMAP||!window.L)return; const L=window.L; if(slLayer)SLMAP.removeLayer(slLayer); slLayer=L.layerGroup().addTo(SLMAP);
  const from=addDays(today(),-90), last={};
  visits.filter(v=>v.lat&&(v.day>=from||v.ng)).sort((a,b)=>a.at.localeCompare(b.at)).forEach(v=>{last[v.addr?slNormC(v.addr):v.id]=v});
  Object.values(last).forEach(v=>{const mine=sameP(v.by,me.id), ng=v.ng&&!v.ngOff;
    const col=ng?'#D02B2B':mine?(SL_COL[v.r]||'#8A94A6'):'#9aa3b2';
    const m=L.circleMarker([v.lat,v.lon],{radius:v.day===today()?9:7,color:'#fff',weight:2,fillColor:col,fillOpacity:mine||ng?.95:.6}).addTo(slLayer);
    m.bindPopup(`<b>${esc(v.r==='話した'?'話せた':v.r==='お断り'?'見送り':v.r)}</b>${ng?' <b style="color:#D02B2B">もう行かない</b>':''}<br>${esc(v.addr||'住所なし')}<br>${esc(md(v.day))} ${esc(whoName(v.by))}さん${v.why?'・'+esc(v.why):''}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button type="button" class="btn sm" data-slgo-visit="${esc(v.id)}">ここを記録</button><button type="button" class="btn sm" data-slurl="${esc(slGnav(v.lat,v.lon))}">🧭 ナビ</button><button type="button" class="btn sm" data-slurl="${esc(slGmap(v.lat,v.lon))}">Googleマップ</button></div>`);
  });
}
function slMapMe(){
  if(!SLMAP||!window.L)return; const f=slFix(); if(!f)return; const L=window.L;
  if(slMeLayer)SLMAP.removeLayer(slMeLayer);
  slMeLayer=L.layerGroup([L.circle([f.lat,f.lon],{radius:f.acc,color:'#2B6CD9',weight:1,fillOpacity:.08}),L.circleMarker([f.lat,f.lon],{radius:6,color:'#fff',weight:2,fillColor:'#2B6CD9',fillOpacity:1})]).addTo(SLMAP);
}

/* ---------- 営業台帳のバックアップから取り込む ---------- */
async function slImport(file){
  let o;try{o=JSON.parse(await file.text())}catch(e){toast('ファイルを読めませんでした。営業台帳の「バックアップを保存」で作ったファイルを選んでください');return}
  const docs=o&&o.docs||{}; let n=0,skip=0;
  const have=new Set(visits.map(v=>v.id));
  for(const [k,d] of Object.entries(docs)){if(!k.startsWith('visitDays/'))continue;
    for(const x of (d&&d.visits)||[]){const id='imp_'+x.id;if(have.has(id)){skip++;continue}
      const v={id,by:me.id,at:x.at,day:String(x.at||'').slice(0,10),r:x.result||'不在',addr:x.address||'',memo:x.memo||'',imp:1};
      if(x.lat){v.lat=x.lat;v.lon=x.lon;v.acc=x.acc||0;v.gs=x.geoSrc||'gps'}
      if(x.reason)v.why=x.reason; if(x.ng)v.ng=true; if(x.revisitAt&&x.revisitAt>=today())v.rv=String(x.revisitAt).slice(0,10);
      if(!v.day)continue; await slPut(v); have.add(id); n++;}}
  render(); toast(n?`${n}件の訪問記録を取り込みました${skip?`（${skip}件はもう入っていました）`:''}`:skip?'もう全部取り込み済みです':'取り込める訪問記録がありませんでした');
}

/* ---------- 本体から呼ぶ部品 ---------- */
// ホームの「営業に出る」ボタンと、今日のトップ
function slHomeBtn(){
  const td=slMineTodo(), R=slRank('day').filter(r=>r.door>0).sort((a,b)=>b.door-a.door)[0];
  const top=R?`今日のトップ：<b>${esc(whoName(R.id))}</b>さん <b class="num">${R.door}</b>軒`:'今日の一番乗りはだれだ？';
  return {top:`<div class="sl-ribbon">${ico('trophy')}<span>${top}</span></div>`,btn:`<button type="button" class="launch-btn sales" data-tab="sales" data-slsubgo="rec"><span class="lb-ic">${ico('walk')}</span><span class="lb-tx"><b>営業に出る</b><small>開いたらすぐ記録できます</small></span>${td.n?`<span class="cnt" aria-label="やり残し ${td.n}件">${td.n}</span>`:''}</button>`};
}
// ホームの「今日やること」に足す
function slTodayItems(){
  const out=[], t=today();
  slRvOn(t).filter(v=>sameP(v.by,me.id)).forEach(v=>{const late=slLate(v);out.push({cls:late?'bad':'warn',ti:late?`再訪問が${late}日遅れています`:'今日の再訪問'+(v.rvt?'　'+v.rvt:''),tx:esc(slWho(v))+(v.addr&&v.name?'　'+esc(slShortAddr(v.addr)):''),slrv:v.id})});
  slStale().filter(c=>sameP(c.lead.salesBy,me.id)||me.isOwner).forEach(c=>out.push({cls:'warn',ti:'見込みが止まっています',tx:`${esc(c.lead.customer||'')}様　${Math.floor((Date.now()-Date.parse(c.updatedAt||c.createdAt))/864e5)}日そのまま${sameP(c.lead.salesBy,me.id)?'':'（'+esc(pn(c.lead.salesBy))+'さん）'}`,open:c.id,sec:'lead'}));
  return out;
}
// ホームの下：やり残し（0件なら何も出さない）
function slHomeTodo(){
  const it=slTodayItems(); if(!it.length)return'';
  return `<section class="today sl-todo" aria-label="やり残し"><h2>🔴 やり残し ${it.length}件</h2>
   ${it.slice(0,3).map(x=>`<button type="button" class="td-item ${x.cls}" ${x.slrv?`data-slgo-visit="${x.slrv}"`:`data-open="${x.open}" data-sec="${x.sec}"`}><span class="tx"><span class="ti">${x.ti}</span><b>${x.tx}</b></span><span class="go">開く ›</span></button>`).join('')}
   ${it.length>3?`<button type="button" class="btn" data-tab="sales" data-slsubgo="rv">ほか ${it.length-3}件を見る</button>`:''}</section>`;
}
// カレンダー・ホワイトボードの1件
const slCalEv=v=>`<button type="button" class="ev rvev ${slLate(v)?'late':''}" data-slgo-visit="${esc(v.id)}" title="${esc('再訪問 '+(v.rvt||'')+' '+slWho(v)+' '+whoName(v.by))}">🔁 ${v.rvt?esc(v.rvt)+' ':''}${esc(slWho(v))}</button>`;
const slCalAg=v=>{const late=slLate(v);return `<button type="button" class="ag-ev rvag" data-slgo-visit="${esc(v.id)}"><b>🔁 再訪問　${v.rvt?esc(v.rvt)+'　':''}${esc(slWho(v))}${late?` <span class="chip bad">${late}日遅れ</span>`:''}</b><span>${v.name&&v.addr?esc(v.addr)+'　':''}${esc(whoName(v.by))}さん${v.memo?'　「'+esc(v.memo.slice(0,30))+'」':''}</span></button>`};
function slWBBlock(day){
  const vs=slRvOn(day).filter(v=>!view.wbWho||sameP(v.by,view.wbWho)); if(!vs.length)return'';
  const by={};vs.forEach(v=>{const k=canon(v.by)||v.by;(by[k]=by[k]||[]).push(v)});
  return `<section class="wb-day sl-wbauto"><h2>🔁 ${esc(dayName(day))}の再訪問 <span class="chip">営業の記録から自動</span></h2>
    ${Object.entries(by).map(([id,a])=>`<div class="wb-msg">${avatar(id,36)}<div class="wb-b"><div class="tw-h"><b>${esc(whoName(id))}</b><span class="sub">・${a.length}軒</span></div>${a.map(slCalAg).join('')}</div></div>`).join('')}</section>`;
}
// 経営：飛び込み営業（今月）
function slDash(){
  const mon=today().slice(0,7), vs=visits.filter(v=>v.day.startsWith(mon));
  const n=k=>vs.filter(v=>v.r===k).length, door=vs.length, pros=n('見込みあり');
  const won=cases.filter(c=>(c.lead||{}).salesBy&&(c.result||{}).status==='won'&&String(c.result.wonDate||'').startsWith(mon)).length;
  const why={};vs.filter(v=>v.r==='お断り').forEach(v=>{const k=v.why||'未入力';why[k]=(why[k]||0)+1});const wr=Object.entries(why).sort((a,b)=>b[1]-a[1]);
  const kp=(l,v,u)=>`<div class="kpi"><span class="l">${l}</span><span class="v">${v}${u?`<small>${u}</small>`:''}</span></div>`;
  return `<section class="grp"><div class="row sb"><h3>飛び込み営業（今月）</h3><button type="button" class="btn sm" data-tab="sales" data-slsubgo="rank">ランキングを見る</button></div>
   <div class="kpis">${kp('訪問',door,'軒')}${kp('話せた',n('話した'),'件')}${kp('見込み',pros,'件')}${kp('契約',won,'件')}${kp('見込み率',door?(pros/door*100).toFixed(1):'—',door?'%':'')}</div>
   ${wr.length?`<div class="sub">見送りの理由：${wr.slice(0,5).map(([k,v])=>`${esc(k)} ${v}件`).join('・')}</div>`:''}</section>`;
}
// 工事の「問い合わせ」の上に出す：だれが見つけたか・位置
function slLeadNote(C){
  const L=C.lead||{}; if(!L.salesBy&&!L.lat)return'';
  const v=L.visitId&&visits.find(x=>x.id===L.visitId);
  return `<div class="sl-lead">${L.salesBy?`🚶 <b>${esc(pn(L.salesBy))}</b>さんが飛び込み営業で見つけたお客様${v?`（${esc(md(v.day))}訪問）`:''}`:''}
   ${L.lat?`<div class="row"><button type="button" class="btn sm" data-slurl="${esc(slGmap(L.lat,L.lon))}">📍 Googleマップで開く</button><button type="button" class="btn sm" data-slurl="${esc(slGnav(L.lat,L.lon))}">🧭 ここまでナビ</button></div>`:''}</div>`;
}
// 見積の明細：前に使った品目を候補に出し、選んだら単位と単価を入れる
function slItemList(){const m=new Map();cases.forEach(c=>((c.quote||{}).items||[]).forEach(i=>{const n=(i.name||'').trim();if(n&&N(i.price))m.set(n,{unit:i.unit||'',price:N(i.price)})}));slItemList.m=m;
  return `<datalist id="qitems">${[...m.keys()].slice(-300).map(n=>`<option value="${esc(n)}">`).join('')}</datalist>`}
function slItemFill(p,v){const m=slItemList.m;if(!m||!/^quote\.items\.\d+\.name$/.test(p))return false;const hit=m.get(String(v||'').trim());if(!hit)return false;
  const row=getP(C,p.replace(/\.name$/,''));if(!row||N(row.price))return false;row.price=hit.price;if(!row.unit||row.unit==='式')row.unit=hit.unit||row.unit;return true}

/* ---------- 操作 ---------- */
function slRR(){const y=window.scrollY;render();window.scrollTo(0,y)}
function slGoVisit(id){
  const v=visits.find(x=>x.id===id);if(!v)return;
  SV.d=slBlank(v.addr||'');if(v.lat)SV.d.geo={lat:v.lat,lon:v.lon,acc:v.acc||0,src:v.gs==='gps'?'map':v.gs};if(v.name)SV.d.name=v.name;if(v.tel)SV.d.tel=v.tel;
  SV.sub='rec';SV.detail='';closeSheet&&closeSheet();setTab('sales');toast(`${slWho(v)}を記録します。結果のボタンを押してください`);
}
function slClick(t,d){
  if(d.slsub!==undefined){const s=d.slsub;if(s==='back'){slGeoStop();setTab('home');return true}
    SV.pick=s==='map'&&!!d.slpick;SV.sub=s;render();window.scrollTo(0,0);return true}
  if(d.slsubgo){SV.sub=d.slsubgo;return false} // そのあと data-tab で開く
  if(d.slres!==undefined){const r=d.slres;
    if(r==='不在'){busyRun('slrec',null,slRecord,'不在');return true}
    SV.detail=SV.detail===r?'':r;slDraft().r=r;slRR();
    if(SV.detail)setTimeout(()=>{const el=document.querySelector('.sl-det');if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'})},30);return true}
  if(d.slgo){busyRun('slrec',t,slRecord,d.slgo);return true}
  if(d.slkpt!==undefined){SV.kp=!SV.kp;slRR();return true}
  if(d.slkp!==undefined){const D=slDraft(),k=d.slkp;D.addr=k==='⌫'?D.addr.slice(0,-1):D.addr+k;slSaveDraft();const i=document.getElementById('sl-addr');if(i)i.value=D.addr;slSugUI();slPrevUI();return true}
  if(d.slstep){const D=slDraft();if(!slTail(D.addr)){toast('番地の数字が入っていません');return true}D.addr=slStep(D.addr,+d.slstep);D.geo=null;slSaveDraft();slRR();return true}
  if(d.slhere!==undefined){if(!slFix()){toast('位置を測っています。少し待ってからもう一度押してください');slGeoStart();return true}slRevMaybe(true).then(()=>{const D=slDraft();if(GEO.base&&!slNorm(D.addr).startsWith(slNorm(GEO.base))){D.addr=GEO.base;slSaveDraft();slRR()}});return true}
  if(d.sluseBase!==undefined){const D=slDraft();D.addr=GEO.base||D.addr;slSaveDraft();slRR();return true}
  if(d.slgeoClear!==undefined){slDraft().geo=null;slMeterUI();toast('GPSの位置にもどしました');return true}
  if(d.slhelpGeo!==undefined){toast(/iPhone|iPad/.test(navigator.userAgent)?'iPhone：設定 → プライバシーとセキュリティ → 位置情報 → Safari（またはこのアプリ）を「使用中のみ」にして、「正確な位置情報」をオンにしてください':'スマホの設定で、ブラウザ（Chrome）の位置情報を「許可」にしてください');clearTimeout(toast.t);toast.t=setTimeout(hideToast,12000);return true}
  if(d.slpaste!==undefined){slPasteSheet();return true}
  if(d.slpasteOk!==undefined){const i=document.getElementById('sl-paste'),g=slParseLoc(i&&i.value);
    if(!g){toast('場所が読めませんでした。Googleマップで場所を長押しして出る数字（例：35.68, 139.76）を貼ってください');return true}
    if(g.short){toast('「maps.app.goo.gl」の短いリンクは読めません。Googleマップで場所を長押しして、上に出る数字をコピーして貼ってください');clearTimeout(toast.t);toast.t=setTimeout(hideToast,10000);return true}
    const D=slDraft();D.geo={lat:g.lat,lon:g.lon,acc:0,src:'paste'};closeSheet();
    slRevGeo(g.lat,g.lon).then(b=>{if(b&&!slNorm(D.addr).startsWith(slNorm(b))){D.addr=b;slSaveDraft()}slRR();toast(`Googleマップの場所を入れました${b?'（'+b+'）':''}。番地を足してください`)}).catch(()=>{slRR();toast('Googleマップの場所を入れました')});return true}
  if(d.slpickd){const [pk,k,dd,key]=d.slpickd.split('|'),D=slDraft();D[pk]=k;D[key]=k==='date'?(D[key]||''):dd;if(pk==='rvPick'&&!k){D.rvt='';D.rvtPick=''}slRR();return true}
  if(d.sltype){const D=slDraft(),w=d.sltype,i=D.types.indexOf(w);if(i<0)D.types.push(w);else D.types.splice(i,1);slRR();return true}
  if(d.slrvt!==undefined){const D=slDraft(),k=d.slrvt;D.rvtPick=k;D.rvt=k==='pick'?(D.rvt||''):k;slRR();if(k==='pick')setTimeout(()=>{const i=document.getElementById('sl-rvt');if(i)i.focus()},30);return true}
  if(d.slroom!==undefined){const D=slDraft();if(!/\s$/.test(D.addr))D.addr=D.addr.trim()+' ';slSaveDraft();SV.kp=true;slRR();toast('部屋番号を押してください（例：101）。次の部屋は「＋1」で進みます');return true}
  if(d.slsun!==undefined){const on=!slSunOn();try{localStorage.setItem('oubi.slsun',on?'1':'0')}catch(e){}slRR();toast(on?'外で見やすい明るい画面にしました':'暗い画面にしました');return true}
  if(d.slgeoResume!==undefined){GEO.paused=false;slGeoStart();slMeterUI();return true}
  if(d.slsummary!==undefined){slShareSummary();return true}
  if(d.slwhy){const D=slDraft();D.why=D.why===d.slwhy?'':d.slwhy;slRR();return true}
  if(d.slgoVisit){slGoVisit(d.slgoVisit);return true}
  if(d.slurl){slOpen(d.slurl);return true}
  if(d.slrvall!==undefined){SV.rvAll=d.slrvall==='1';slRR();return true}
  if(d.slrvMove){const v=visits.find(x=>x.id===d.slrvMove);if(!v)return true;const old=v.rv;v.rv=addDays(today(),1);slPut(v);slRR();toast(`${slWho(v)}を明日にしました`,()=>{v.rv=old;slPut(v);slRR();toast('元に戻しました')});return true}
  if(d.slrvStop){const v=visits.find(x=>x.id===d.slrvStop);if(!v)return true;v.rvDone=nowIso();v.rvBy='stop';slPut(v);slRR();toast(`${slWho(v)}の再訪問をやめました`,()=>{delete v.rvDone;delete v.rvBy;slPut(v);slRR();toast('元に戻しました')});return true}
  if(d.slrank){SV.rankP=d.slrank;slRR();return true}
  if(d.slphoto!==undefined){SV.photo=!SV.photo;slSetTiles();t.textContent=SV.photo?'🗺️ 地図にする':'🛰️ 航空写真';t.setAttribute('aria-pressed',SV.photo);return true}
  if(d.slme!==undefined){const f=slFix();if(f&&SLMAP)SLMAP.setView([f.lat,f.lon],19);else toast('位置を測っています…');return true}
  if(d.slpickOk!==undefined){if(!SLMAP)return true;const c=SLMAP.getCenter(),D=slDraft();D.geo={lat:+c.lat.toFixed(6),lon:+c.lng.toFixed(6),acc:0,src:'map'};SV.pick=false;SV.sub='rec';render();
    slRevGeo(D.geo.lat,D.geo.lon).then(b=>{if(b&&!slNorm(D.addr).startsWith(slNorm(b))){D.addr=b;slSaveDraft();slRR()}}).catch(()=>{});toast('地図で選んだ位置にしました');return true}
  if(d.slfxClose!==undefined){if(d.slfxClose){const s=slWonSeen();s[d.slfxClose]=today();lsSet('oubi.wonSeen.'+me.id,s)}const el=document.getElementById('slfx');if(el)el.remove();setTimeout(slCheckWon,300);return true}
  return false;
}
/* 今日のまとめ（上司への日報）：1回押すと文ができて、LINEなどで送れる（1万人の模擬調査より：7割が毎日報告する） */
function slSummaryText(){
  const t=today(), d=new Date(), mine=visits.filter(v=>sameP(v.by,me.id)&&v.day===t), n=k=>mine.filter(v=>v.r===k).length;
  const pros=mine.filter(v=>v.r==='見込みあり').map(v=>{const c=cases.find(x=>x.id===v.caseId);return '・'+(v.name?v.name+'様':slShortAddr(v.addr)||'お名前未入力')+(c&&((c.work||{}).types||[])[0]?'（'+c.work.types[0]+'）':'')});
  const rv=mine.filter(v=>v.rv).map(v=>`・${md(v.rv)}${v.rvt?' '+v.rvt:''} ${slWho(v)}`);
  const ms=[['訪問',mine.length,20],['話せた',n('話した')+n('見込みあり'),5],['見込み',n('見込みあり'),1]];
  return `【営業日報】${d.getMonth()+1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}） ${pn(me.id)}\n`
   +`訪問 ${mine.length}軒（不在 ${n('不在')}・話せた ${n('話した')}・見込み ${n('見込みあり')}・見送り ${n('お断り')}）\n`
   +(pros.length?`\n■ 見込み\n${pros.join('\n')}\n`:'')
   +(rv.length?`\n■ 再訪問の予定\n${rv.join('\n')}\n`:'')
   +`\n■ 今日のミッション\n${ms.map(([l,a,g])=>`${a>=g?'✅':'□'} ${l} ${a}/${g}`).join('\n')}`;
}
async function slShareSummary(){
  const text=slSummaryText();
  try{if(navigator.share){await navigator.share({text});return}}catch(e){if(e&&e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(text);toast('今日のまとめをコピーしました。LINEに貼って送ってください');return}catch(e){}
  const sh=document.getElementById('sheet'); // コピーもできない端末では、文を出して選んでもらう
  sh.innerHTML=`<div class="sheet-box" role="dialog" aria-modal="true" aria-label="今日のまとめ"><span class="grab" aria-hidden="true"></span><div class="row sb"><h2>今日のまとめ</h2><button type="button" class="btn sm" data-sheet-close>閉じる</button></div><textarea readonly rows="10" style="width:100%">${esc(text)}</textarea><p class="sub" style="margin:0">長押しで全部選んでコピーし、LINEに貼ってください。</p></div>`;
  sh.hidden=false;
}
function slPasteSheet(){
  const sh=document.getElementById('sheet');
  sh.innerHTML=`<div class="sheet-box" role="dialog" aria-modal="true" aria-label="Googleマップの場所を貼る"><span class="grab" aria-hidden="true"></span>
   <div class="row sb"><h2>Googleマップの場所を貼る</h2><button type="button" class="btn sm" data-sheet-close>閉じる</button></div>
   <p class="sub" style="margin:0">Googleマップで家を<b>長押し</b>すると、上に「35.68123, 139.76712」のような数字が出ます。それをコピーして下に貼ってください。場所の長いリンクでも読めます。</p>
   <input id="sl-paste" placeholder="ここに貼る" autocomplete="off" inputmode="url">
   <button type="button" class="btn pri big" data-slpaste-ok>この場所にする</button></div>`;
  sh.hidden=false;setTimeout(()=>{const i=document.getElementById('sl-paste');if(i)i.focus()},50);
}
function slInput(e){
  const id=e.target.id, D=slDraft(), v=e.target.value;
  if(id==='sl-addr'){D.addr=v;D.addrGeo=null;slSaveDraft();slSugUI();slPrevUI();return true}
  if(id==='sl-name'){D.name=v;return true} if(id==='sl-tel'){D.tel=v;return true} if(id==='sl-memo'){D.memo=v;return true}
  if(id==='sl-paste')return true;
  return false;
}
function slChange(e){
  const id=e.target.id, D=slDraft();
  if(id==='sl-addr'){slCheckAddr();slPrevUI();return true} // 描き直さない（次に押したボタンが消えないように）
  if(id==='sl-rv'){D.rv=e.target.value;return true}
  if(id==='sl-rvt'){D.rvt=e.target.value;return true} if(id==='sl-survey'){D.survey=e.target.value;return true}
  if(id==='sl-ng'){D.ng=e.target.checked;return true}
  if(e.target.dataset&&e.target.dataset.slimport!==undefined){const f=e.target.files[0];if(f)slImport(f);return true}
  return false;
}
// 画面を描いたあと：営業モードの間だけ位置を測る。地図はここで作る
function slAfterRender(){
  const on=view.tab==='sales'; document.body.classList.toggle('sl-on',on); document.body.classList.toggle('sl-sun',on&&slSunOn());
  if(on)slGeoStart(); else slGeoStop();
  if(!on&&SLMAP){try{SLMAP.remove()}catch(e){}SLMAP=null}
  if(on&&SV.sub==='map')slMapInit(); else if(SLMAP){try{SLMAP.remove()}catch(e){}SLMAP=null}
  if(!on&&['home','list','board','wb'].includes(view.tab))setTimeout(slCheckWon,500);
}

/* ---------- 見た目（営業モードは暗い画面。外でもまぶしくないように） ---------- */
(function(){const s=document.createElement('style');s.textContent=`
.sl{--sbg:#0B1324;--ssf:#152036;--ssf2:#1C2A45;--sink:#F1F5FC;--sink2:#C5D0E2;--sink3:#A6B3C7;--sline:#2A3A58;--spri:#3D82F5;
  color:var(--sink);display:grid;gap:12px}
body.sl-on{background:#0B1324!important}
body.sl-on main,body.sl-on #main{background:transparent}
body.sl-on .launch-logo{display:none}
.sl h1,.sl h2,.sl h3{color:var(--sink)}
.sl .sub{color:var(--sink3)}
.sl .btn{background:var(--ssf);border-color:var(--sline);color:var(--sink)}
.sl .btn.pri{background:var(--spri);border-color:var(--spri);color:#fff}
.sl .chipbtn{background:var(--ssf2);border-color:var(--sline);color:var(--sink2)}
.sl .chipbtn.on{background:var(--spri);border-color:var(--spri);color:#fff}
.sl input,.sl textarea{background:var(--ssf2);border:1px solid var(--sline);color:var(--sink);border-radius:10px;padding:10px 12px;font:inherit;width:100%;min-width:0;box-sizing:border-box}
.sl .fld>span{color:var(--sink2)}
.sl .panel,.sl .empty{background:var(--ssf);border-color:var(--sline);color:var(--sink)}
.sl .seg{display:inline-flex;background:var(--ssf);border-radius:10px;padding:3px;gap:2px}
.sl .seg button{border:0;background:none;color:var(--sink2);padding:8px 12px;border-radius:8px;font:inherit;min-height:40px}
.sl .seg button[aria-selected="true"],.sl .seg button[aria-pressed="true"]{background:var(--spri);color:#fff}
/* v18：14px未満の文字をなくし、青の上の白い字を4.5:1以上に */
.sl{--spri:#2C6BDB;--sink3:#AEBBD0}
.sl input,.sl textarea{border:1.5px solid #6B7FA6!important}
.sl .fld input,.sl .fld textarea,.sl input,.sl textarea{background:var(--ssf2)!important;color:var(--sink)!important} /* アプリ全体の入力欄の色より、営業の画面の色を優先（暗い画面で白い地に白い字にならないように） */
.sl-tt,.sl-hud-r,.sl-m,.sl-card small,.sl-badge,.sl-legend,.sl-acc,.sl-out,.sl-prev,.sl-rv .sub,.sl-badge small,.sl-mall{font-size:.875rem!important}
.sl .seg button{font-size:1rem}
.sl-awr .num{font-size:1rem}
.sl-hud{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;background:var(--ssf);border:1px solid var(--sline);border-radius:14px;padding:8px 12px}
.sl-hud-l{display:flex;flex-direction:column;line-height:1.1}.sl-lv{font-size:1.1rem}.sl-tt{font-size:.75rem;color:var(--sink3)}
.sl-bar{height:10px;background:var(--ssf2);border-radius:99px;overflow:hidden}.sl-bar i{display:block;height:100%;background:linear-gradient(90deg,#3D82F5,#5BE39A);border-radius:99px}
.sl-hud-r{display:flex;flex-direction:column;align-items:flex-end;font-size:.8rem;color:var(--sink2);line-height:1.3}
.sl-ms{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding-top:6px;border-top:1px solid var(--sline)}
.sl-m{display:grid;gap:3px;font-size:.72rem;color:var(--sink2);min-width:0}
.sl-mt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sl-mb{height:6px;background:var(--ssf2);border-radius:99px;overflow:hidden}.sl-mb i{display:block;height:100%;background:#F2C14E;border-radius:99px}
.sl-m.done{color:#5BE39A}.sl-m.done .sl-mb i{background:#5BE39A}
.sl-mt .ic{width:14px;height:14px}.sl-combo{display:inline-flex;align-items:center;gap:3px}.sl-combo .ic{width:15px;height:15px;color:#F2994A}
.sl-acc .ic{width:16px;height:16px}
.sl-mall{grid-column:1/-1;text-align:center;font-weight:700;color:#5BE39A;font-size:.85rem}
.sl-top{display:flex;justify-content:center}
.sl-meter{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.sl-acc,.sl-out{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:99px;font-size:.85rem;font-weight:700;background:var(--ssf2);color:var(--sink);border:1px solid var(--sline)}
.sl-acc.ok{color:#5BE39A}.sl-acc.mid{color:#F2C14E}.sl-acc.bad{color:#FF8A7A}.sl-out{color:#F2C14E}
.sl-x{border:0;background:none;color:inherit;font-size:1rem;cursor:pointer;min-width:28px;min-height:28px}
.sl-addr{display:grid;gap:8px}
.sl-arow{display:grid;grid-template-columns:minmax(0,1fr) 48px;gap:8px}
.sl-arow input{font-size:1.1rem;min-height:48px}
.sl-steps{display:flex;gap:6px;flex-wrap:wrap}
.sl-mini{min-height:44px;min-width:44px;padding:0 12px;border-radius:10px;border:1px solid var(--sline);background:var(--ssf);color:var(--sink);font:inherit;font-weight:700;cursor:pointer}
.sl-mini[aria-pressed="true"]{background:var(--spri);color:#fff}
.sl-kp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.sl-k{min-height:52px;border-radius:12px;border:1px solid var(--sline);background:var(--ssf);color:var(--sink);font-size:1.3rem;font-weight:700;cursor:pointer}
.sl-ng{background:#4A1B1B;color:#FFD2CC;border:1px solid #D02B2B;border-radius:12px;padding:10px 12px;font-weight:700}
.sl-prev{background:var(--ssf2);border-radius:12px;padding:8px 12px;font-size:.9rem;color:var(--sink2)}
.sl-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.sl-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:118px;border-radius:18px;border:1.5px solid rgba(255,255,255,.08);color:#fff;cursor:pointer;padding:12px 8px;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.35);
  background:radial-gradient(120% 90% at 80% 0%,var(--g1),var(--g2))}
.sl-card.r1{--g1:#3A4558;--g2:#1E2738}.sl-card.r2{--g1:#2F4C7E;--g2:#18284A}.sl-card.r3{--g1:#1F5C46;--g2:#122E27}.sl-card.r4{--g1:#4A3B52;--g2:#231B2B}
.sl-card .sl-ic{line-height:1;display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:rgba(255,255,255,.12)}
.sl-card .sl-ic .ic{width:30px;height:30px}
.sl-card.r3 .sl-ic{color:#7CF0B0}.sl-card.r2 .sl-ic{color:#A9C8FF}.sl-card.r4 .sl-ic{color:#E7B9F0}
.sl-mini{display:inline-flex;align-items:center;gap:6px}.sl-mini .ic{width:18px;height:18px}
nav.tabs .sl-ni .ic{width:22px;height:22px}
body.sl-on nav.tabs button[aria-current="page"]::before{background:#3D82F5}.sl-card b{font-size:1.25rem;font-weight:900}.sl-card small{font-size:.75rem;color:rgba(255,255,255,.75)}
.sl-card.on{border:2px solid #4D93FF;box-shadow:0 0 0 3px rgba(77,147,255,.25),0 0 28px rgba(77,147,255,.55)}
.sl-card:active{transform:scale(.97)}
.sl-det{background:var(--ssf);border:1px solid var(--sline);border-radius:16px;padding:14px;display:grid;gap:12px}
.sl-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.sl .fld{display:grid;gap:6px}
.sl-go{min-height:56px;font-size:1.1rem}
.sl-ngck{display:flex;gap:8px;align-items:center;color:var(--sink)}.sl-ngck input{width:22px;height:22px}
.sl-rv{display:grid;gap:6px;background:var(--ssf);border:1px solid var(--sline);border-left:5px solid var(--sline);border-radius:12px;padding:10px 12px;text-align:left;color:var(--sink);width:100%;font:inherit;cursor:pointer}
.sl-rv.now{border-left-color:#F2C14E}.sl-rv.late{border-left-color:#FF6B5A}
.sl-rvh{display:flex;justify-content:space-between;gap:8px;align-items:center}.sl-rvh b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sl-aws{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:10px}
.sl-aw{background:var(--ssf);border:1px solid var(--sline);border-radius:14px;padding:12px;display:grid;gap:6px}
.sl-aw h3{margin:0 0 4px;font-size:1rem}
.sl-awr{display:grid;grid-template-columns:36px 28px minmax(0,1fr) auto auto;gap:8px;align-items:center}
.sl-awr b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sl-awr.me{background:rgba(61,130,245,.18);border-radius:8px;padding:2px 4px}
.sl-awr .num{font-weight:700}.sl-pl{font-size:1.1rem;text-align:center}
.sl-me{background:linear-gradient(135deg,#1C2A45,#18284A);border:1px solid var(--sline);border-radius:16px;padding:14px;display:grid;gap:10px}
.sl-me h2{display:flex;gap:8px;align-items:center;margin:0;font-size:1.05rem}
.sl-mes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;text-align:center}
.sl-mes b{display:block;font-size:1.4rem}.sl-mes span{font-size:.75rem;color:var(--sink3)}
.sl-badges{display:flex;flex-wrap:wrap;gap:6px}
.sl-badge{font-size:.75rem;padding:4px 8px;border-radius:99px;background:var(--ssf2);color:var(--sink3)}
.sl-badge.on{background:#3b3214;color:#F2C14E}
.sl-badge small{display:block;font-size:.65rem;opacity:.8}
.sl-bdg summary{cursor:pointer;color:#F2C14E;font-weight:700;font-size:.85rem;min-height:32px;display:flex;align-items:center}
.sl-bdg .sl-badges{margin-top:8px}
.sl-me .chip{background:#3b3214;color:#F2C14E;border-color:transparent}
.sl-ttl{font-size:.72rem;padding:1px 6px;border-radius:99px;background:var(--warn-soft);color:var(--warn);margin-left:4px;font-weight:700;white-space:nowrap}
.sl .sl-ttl{background:#3b3214;color:#F2C14E}
/* v18：文字を大きくしても、結果の4つのボタンがスクロールなしで見えるように上をつめる */
.sl-meter{justify-content:flex-start}
.sl-steps{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin-inline:-2px;padding:2px}
.sl-steps::-webkit-scrollbar{display:none}
.sl-steps .sl-mini{flex:none;white-space:nowrap}
.sl-card{min-height:104px;padding:10px 6px}
.sl-card b{font-size:1.125rem!important;white-space:nowrap;letter-spacing:0}
.sl-card small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#slsug:empty,#sl-addrwarn:empty,#sl-prevbox:empty{display:none}
.sl-card .sl-ic{width:44px;height:44px;border-radius:14px}.sl-card .sl-ic .ic{width:26px;height:26px}
.sl-hud{padding:8px 12px;row-gap:6px}
.sl{gap:10px}
.sl-mapwrap{position:relative}
.sl-map{height:calc(100vh - 290px);min-height:320px;border-radius:14px;overflow:hidden;background:#1C2A45}
.sl-cross{position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);font-size:2.2rem;pointer-events:none;z-index:500;filter:drop-shadow(0 2px 2px rgba(0,0,0,.5))}
.sl-mapbar{position:absolute;top:8px;right:8px;z-index:500;display:flex;gap:6px}
.sl-pickbar{display:grid;gap:8px}
.sl-legend{display:flex;flex-wrap:wrap;gap:10px;font-size:.8rem;color:var(--sink2)}
.sl-legend i{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:4px;vertical-align:-1px}
.sl .leaflet-popup-content{color:#222}
.sl-ribbon{display:inline-flex;align-items:center;gap:6px;background:var(--surface);color:var(--ink);box-shadow:var(--shadow);border-radius:99px;padding:6px 14px;font-size:.88rem;max-width:100%;overflow:hidden;white-space:nowrap}
.sl-ribbon>span{overflow:hidden;text-overflow:ellipsis}.sl-ribbon .ic{color:#c9861d}
.launch-btn.sales{position:relative;background:linear-gradient(135deg,#18284A,#1F5C46);color:#fff;border-color:#2A3A58}
.launch-btn.sales small{color:rgba(255,255,255,.8)}.launch-btn.sales .lb-ic{background:rgba(255,255,255,.12);color:#fff}
.launch-btn .cnt{position:absolute;top:10px;right:10px;background:var(--bad);color:#fff;border-radius:99px;min-width:24px;height:24px;display:grid;place-items:center;font-size:.8rem;font-weight:700;padding:0 6px}
.sl-lead{background:var(--blue-soft);border-radius:10px;padding:10px 12px;display:grid;gap:8px;margin-bottom:10px}
.ev.rvev{background:#E9F0FD;color:#1F4E9E;border-color:#BCD0F5}.ev.rvev.late{background:var(--bad-soft);color:var(--bad)}
.ag-ev.rvag{border-left:4px solid #2B6CD9}
.sl-wbauto{border-style:dashed}
.sl-wbauto .ag-ev{width:100%;margin-top:4px}
body.sl-on nav.tabs{background:#0F1A2E!important;border-top-color:#2A3A58!important}
body.sl-on nav.tabs button{color:#C5D0E2!important}
body.sl-on nav.tabs button[aria-current="page"]{color:#fff!important;background:none!important}
nav.tabs .sl-ni{font-size:1.25rem;line-height:1}
body.sl-on nav.tabs button>span:not(.sl-ni):not(.cnt){white-space:nowrap;font-size:.875rem}
nav.tabs .sl-sh{display:none!important}
@media (max-width:380px){nav.tabs .sl-lg{display:none!important}nav.tabs .sl-sh{display:inline!important}}
/* 「元に戻す」は片手の親指が届く下に（下のボタンのすぐ上）。結果のボタンの上の方は隠さない */
body.sl-on #toast{top:auto;bottom:calc(var(--navh,80px) + 8px);max-width:calc(100vw - 24px)}
/* ===== v20：訪問販売1万人の模擬調査から ===== */
/* 横に流す1行（精度の表示・番地のボタン）が、画面ぜんたいを横に広げないように（中身の幅で広がるのを止める） */
.sl>*,.sl-addr>*,.sl-hud>*,.sl-rv>*,.sl-det>*,.sl-aw>*{min-width:0}
/* 番地のテンキーは6列×2段（4段だと結果のボタンが下に押し出されるため） */
.sl-kp{grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:6px}.sl-k{min-height:48px!important;font-size:1.25rem}
.sl .sub,.sl-rv .sub{overflow-wrap:anywhere}
.sl-meter{display:flex;flex-wrap:nowrap;gap:6px;align-items:center;overflow-x:auto;scrollbar-width:none}
.sl-meter::-webkit-scrollbar{display:none}
.sl-meter>*{flex:none;white-space:nowrap}
.sl-sun{margin-left:auto;min-height:40px;border-radius:99px;border:1.5px solid #6B7FA6;background:var(--ssf);color:var(--sink);font:inherit;font-weight:700;font-size:.875rem;padding:0 12px;cursor:pointer}
.sl-sug{cursor:pointer}
/* 背の低いスマホ（iPhone SE など高さ740px以下）：ミッションの行をたたみ、結果のボタンを低くして、4つ全部を1画面に入れる */
@media (max-height:740px){
  .sl-ms{display:none}.sl-hud{padding:6px 10px}.sl-hud-r{flex-direction:row;gap:10px}
  .sl-card{min-height:84px!important;padding:6px!important;gap:2px}.sl-card small{display:none}
  .sl-card .sl-ic{width:34px!important;height:34px!important}.sl-card .sl-ic .ic{width:22px!important;height:22px!important}
  .sl{gap:8px}.sl-addr{gap:6px}
  .sl-hud{padding:4px 10px!important}.sl-lv{font-size:1rem}
  .sl-meter .sl-acc,.sl-sun,.sl-steps .sl-mini,.sl-arow .sl-mini{min-height:44px!important}.sl-arow input{min-height:44px!important}
  .sl-k{min-height:44px!important}.sl-kp{gap:4px!important}
  .sl-addr:has(.sl-kp) .sl-steps{display:none} /* テンキーを開いている間は、番地の±の行をたたむ（テンキーで足りる） */
  .sl-prev,.sl-ng,#sl-addrwarn .warn-line{padding:4px 10px!important}
  .sl-card{min-height:80px!important}
}
.sl-ms.all{border-top-color:#5BE39A}.sl-hud:has(.sl-ms.all){border-color:#5BE39A;box-shadow:0 0 0 2px rgba(91,227,154,.35)}
#sl-addrwarn .warn-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.875rem;margin:0}
.sl-prev,.sl-ng{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:6px 12px!important;font-size:.875rem}
.sl-mini,.sl .seg button,.sl .btn.sm{min-height:48px;min-width:48px;justify-content:center}
.sl-meter .sl-acc,.sl-sun{min-height:48px}
.sl.sun{--sink3:#2E3A52}
.sl.sun .sl-m.done,.sl.sun .sl-mall,.sl.sun .sl-acc.ok{color:#0B5A2E}
.sl.sun .sl-m{color:#26324A}
.sl-sum{width:100%;min-height:52px;font-size:1.0625rem}
.sl-mes span{font-size:.875rem}
/* 外で見やすい明るい画面（明るい地に濃い字。日なたで反射しても読める） */
.sl.sun{--sbg:#F4F6FA;--ssf:#FFFFFF;--ssf2:#E9EEF6;--sink:#0B1324;--sink2:#26324A;--sink3:#3E4C66;--sline:#B4C0D6;--spri:#1F5BC6}
body.sl-on.sl-sun{background:#F4F6FA!important}
.sl.sun .sl-hud,.sl.sun .sl-det,.sl.sun .sl-rv,.sl.sun .sl-aw{box-shadow:0 1px 2px rgba(20,30,60,.08)}
.sl.sun .sl-card{color:#0B1324;border:1.5px solid rgba(20,30,60,.14);box-shadow:0 2px 8px rgba(20,30,60,.08)}
.sl.sun .sl-card small{color:#26324A}
.sl.sun .sl-card .sl-ic{background:rgba(255,255,255,.75)}
.sl.sun .sl-card.r1{--g1:#F1F3F7;--g2:#DDE2EA}.sl.sun .sl-card.r2{--g1:#E6EFFF;--g2:#CADCFF}.sl.sun .sl-card.r3{--g1:#E1F6EA;--g2:#BFE8D0}.sl.sun .sl-card.r4{--g1:#F5EAF7;--g2:#E4CDE8}
.sl.sun .sl-card.r1 .sl-ic{color:#3E4C66}.sl.sun .sl-card.r2 .sl-ic{color:#1F5BC6}.sl.sun .sl-card.r3 .sl-ic{color:#13753F}.sl.sun .sl-card.r4 .sl-ic{color:#8A2F9E}
.sl.sun .sl-card.on{border-color:#1F5BC6}
.sl.sun .sl-acc.ok{color:#13753F}.sl.sun .sl-acc.mid{color:#8A5A00}.sl.sun .sl-acc.bad{color:#B42318}.sl.sun .sl-out{color:#8A5A00}
.sl.sun .sl-ng{background:#FDE8E8;color:#8A1C1C;border-color:#D02B2B}
.sl.sun .sl-m.done,.sl.sun .sl-mall{color:#13753F}.sl.sun .sl-m.done .sl-mb i{background:#2E9E5B}.sl.sun .sl-mb i{background:#D99A1E}
.sl.sun .sl-combo .ic{color:#C2410C}
.sl.sun .sl-badge.on,.sl.sun .sl-ttl,.sl.sun .sl-me .chip{background:#FFF1CC;color:#7A4E00}
.sl.sun .sl-bdg summary{color:#7A4E00}
.sl.sun .sl-me{background:linear-gradient(135deg,#FFFFFF,#EEF3FF)}
.sl.sun .sl-awr.me{background:rgba(31,91,198,.12)}
.sl.sun input,.sl.sun textarea{border-color:#6B7896!important}
body.sl-on.sl-sun nav.tabs{background:#FFFFFF!important;border-top-color:#B4C0D6!important}
body.sl-on.sl-sun nav.tabs button{color:#3E4C66!important}
body.sl-on.sl-sun nav.tabs button[aria-current="page"]{color:#1F5BC6!important}
body.sl-on.sl-sun nav.tabs button[aria-current="page"]::before{background:#1F5BC6}
.slfx{position:fixed;inset:0;z-index:80;display:grid;place-items:center;background:rgba(8,12,24,.72);padding:16px}
.slfx-box{position:relative;z-index:2;background:#152036;color:#F1F5FC;border:1px solid #2A3A58;border-radius:20px;padding:24px;text-align:center;display:grid;gap:10px;width:min(100%,360px)}
.slfx-box h2{margin:0;font-size:1.4rem;color:#fff}.slfx-big{font-size:3.4rem;line-height:1}.slfx-xp{font-size:1.8rem;font-weight:900;color:#5BE39A;margin:0}
.slfx-box .sub{color:#A6B3C7}
.slfx-conf{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.slfx-conf i{position:absolute;top:-10%;font-style:normal;font-size:1.6rem;animation:slfall 2.4s ease-in forwards}
@keyframes slfall{to{transform:translateY(120vh) rotate(540deg);opacity:.2}}
@media (prefers-reduced-motion:reduce){.slfx-conf{display:none}}
@media (max-width:360px){.sl-card{min-height:100px}.sl-card small{display:none}}
`;document.head.appendChild(s)})();
