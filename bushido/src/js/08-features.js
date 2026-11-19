
// 今の試練に合った主題を選ぶ（安全と不調を最優先。理由も添える）
const QT_WHY={start:"動き出す日に",cont:"続ける者へ",fail:"もう一度立ち上がるお前に",self:"欲と衝動に向き合う日に",adv:"苦しい時のために",body:"体を整える日に",learn:"学ぶ者へ",time:"時を使う者へ",will:"志を確かめる日に",calm:"心を静める日に",humble:"驕らぬために",focus:"一点に集める日に",env:"意志に頼らぬために"};
function quoteTheme(k){const d=S.days[k]||{};const y=S.days[addDays(k,-1)]||{};const ym=y.mission;const pf=S.main.profile;
  if(painActive()||d.cond==="bad"||(ym&&ym.result==="miss"&&["sick","tired","pain"].includes(ym.missWhy)))return{t:"body",why:"体を休め、整える日に"};
  if(pf&&pf.flags&&pf.flags.care)return{t:"calm",why:"心を静める日に"};
  if(gapInfo(k)||needsRecovery())return{t:"fail",why:"もう一度立ち上がるお前に"};
  if(ym&&ym.result==="miss"){const m={hard:["fail","届かなかった昨日のあとに"],time:["time","時間に追われた昨日のあとに"],feel:["start","気持ちが乗らなかった昨日のあとに"],meaning:["will","意味を見失いかけたお前に"],env:["env","意志に頼らぬために"],forgot:["focus","忘れずに斬るために"]}[ym.missWhy]||["fail","届かなかった昨日のあとに"];return{t:m[0],why:m[1]}}
  if((y.urges||[]).some(u=>!u.won))return{t:"self",why:"昨日、衝動に負けたお前に"};
  const yr=y.reflection;if(yr&&yr.issue==="スマホや娯楽に流された")return{t:"self",why:"誘惑に流された昨日のあとに"};
  if(yr&&(yr.issue==="面倒だった"||yr.issue==="気分が乗らなかった"))return{t:"start",why:"動き出せない日のために"};
  const st=streak();if(st>=3&&STREAK_MS.includes(st))return{t:"cont",why:st+"日続けているお前に"};
  const rl=S.main.rankLog||[];const lr=rl[rl.length-1];if(lr&&lr.date&&diffDays(lr.date,k)<=2)return{t:"humble",why:"昇格したお前に。驕るな"};
  if(ym&&ym.result==="done"&&st>=2)return{t:"cont",why:"昨日も斬ったお前に"};
  const n=Math.floor(parseKey(k)/864e5);
  const fq=S.main.tasks.find(t=>t.focus&&t.status==="進行中");const fc=fq&&{1:"cont",2:"body",3:"self",4:"env",5:"learn",6:"time"}[fq.cat];
  if(fc&&n%2===0)return{t:fc,why:"重点修行「"+fq.name+"」に向かうお前に"};
  const rot=["will","start","cont","learn","calm","focus","humble","time","adv"];const t=rot[n%rot.length];return{t,why:QT_WHY[t]}}
// 1日1回だけ選び、その日は変えない。すべての言葉を見終えるまで、同じ言葉は出さない
function quoteOfDay(k){const M=S.main;if(M.quoteN!==QUOTES.length){M.quoteN=QUOTES.length;M.quoteSeen=[];if(M.quoteDay&&M.quoteDay.date!==k)M.quoteDay=null}if(M.quoteDay&&M.quoteDay.date===k&&QUOTES[M.quoteDay.i])return M.quoteDay;
  const th=quoteTheme(k);const seen=new Set(M.quoteSeen||[]);const all=QUOTES.map((q,i)=>i);
  let fresh=all.filter(i=>QUOTES[i][3].split(",").includes(th.t)&&!seen.has(i));
  if(!fresh.length)fresh=all.filter(i=>!seen.has(i));
  if(!fresh.length){M.quoteSeen=[];fresh=all.filter(i=>QUOTES[i][3].split(",").includes(th.t))}
  const i=fresh[Math.floor(seeded(Math.floor(parseKey(k)/864e5)*13+7)()*fresh.length)];
  M.quoteDay={date:k,i,t:th.t,why:th.why};M.quoteSeen=(M.quoteSeen||[]).concat([i]).slice(-QUOTES.length);saveMain();return M.quoteDay}
function quoteCard(){if(!S.main.onboarded)return "";const q=quoteOfDay(todayKey());const Q=QUOTES[q.i];const fl=Q[4]||"";
  return '<section class="sec quote" id="sec-quote"><p class="eyebrow">今日の言葉 ・ '+esc(q.why)+'</p><blockquote class="qt">'+esc(Q[0])+'</blockquote><p class="qa">'+esc(Q[1])+(Q[2]?'（'+esc(Q[2])+'）':'')+(fl.includes("訳")?' <span class="tag" title="原文から現代の日本語に訳したもの">意訳</span>':'')+(fl.includes("伝")?' <span class="tag" title="そう伝えられているが、出典の確認が難しい言葉">伝</span>':'')+'</p></section>'}
// 端末にファイルを保存する（claude.ai の外で開いた時の予備）
function anchorDL(filename,blob){try{const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);return true}catch(e){return false}}

/* 画面ごとに、毎日見る区画だけを開いて見せる。残りは折りたたみにまとめる */
const GROUPS={
 dojo:[{t:"その他の稽古・記録",s:"修行・ふり返り・師範・言葉・整えること",rest:true}],
 keiko:[{t:"心を整える",s:"呼吸・瞑想・欲の統制・今日の心得",ids:["sec-train","sec-tempt","sec-virtue"]},
  {t:"身体を鍛える",s:"自重の型",ids:["sec-bw"]},
  {t:"生活を整える",s:"朝の型・身支度・毎日の掟",ids:["sec-ritual","sec-groom","sec-okite"]},
  {t:"特別な修行",s:"二十の力・六つの修行",ids:["sec-power","sec-six"]},
  {t:"試練",s:"30日・75日の長い挑戦",ids:["sec-trial"]}],
 roku:[{t:"カレンダー",s:"修行絵巻",ids:["sec-cal"]},
  {t:"成長の記録",s:"人生の戦績・姿見・勝利の壺",ids:["sec-feats","sec-mirror","sec-wins"]},
  {t:"分析",s:"六つの能力・生活の基盤・言い訳・過去の自分",ids:["sec-status","sec-base","sec-excuse"],ey:["VS "]},
  {t:"これまでの記録",s:"省察・EXP・再起",ids:["sec-refl-list"],ey:["EXP履歴","再起履歴"]}],
 chikai:[{t:"自分の誓い",s:"起請文・未来之書・七徳の心得",ey:["起請文","未来之書","七徳の心得"]},
  {t:"自分の成長",s:"段位・刀・卒業・武士の型・見つめ直し",ids:["sec-grad-m","sec-self0","sec-type","sec-myprofile"],ey:["刀の成長","段位","離 ","卒業 ・ ","見つめ直し"]},
  {t:"表示と通知",s:"表示の量・外観・言葉の厳しさ・通知・使う機能",ids:["sec-look","sec-tone","sec-features"],ey:["通知設定"]},
  {t:"データ管理",s:"書き出し・読み込み・全消去・使い方",ey:["データ設定","用語集"]}]};
function groupSections(){const G=GROUPS[tab];const st=$("#app .stack");if(!G||!st)return;ui.grpOpen=ui.grpOpen||{};
  G.forEach((g,gi)=>{let els;const kids=[...st.children].filter(e=>e.tagName==="SECTION");
    if(g.rest){const show=ui.homeShow||[];els=kids.filter(e=>!show.includes(e.id))}
    else if(g.after){const a=document.getElementById(g.after)||document.getElementById(g.after2)||document.getElementById(g.after3);const i=a?kids.indexOf(a):-1;els=i>=0?kids.slice(i+1):[]}
    else els=kids.filter(e=>(g.ids||[]).includes(e.id)||(g.cls&&e.classList.contains(g.cls))||(g.ey||[]).some(x=>{const y=e.querySelector(".eyebrow");return y&&y.textContent.indexOf(x)===0}));
    els=els.filter(e=>!["sec-grad-apply","sec-pain"].includes(e.id));if(!els.length)return;
    const d=document.createElement("details");d.className="grp";d.id="grp-"+tab+"-"+gi;d.open=!!(ui.grpOpen[d.id]||ui.grpAll);
    d.innerHTML='<summary><span class="gt">'+g.t+'</span>'+(g.s?'<span class="gs">'+g.s+'</span>':'')+'<span class="gn num">'+els.length+'</span></summary>';
    const box=document.createElement("div");box.className="stack grp-in";els.forEach(e=>box.appendChild(e));d.appendChild(box);st.appendChild(d);
    d.addEventListener("toggle",()=>{ui.grpOpen[d.id]=d.open;if(d.open&&tab==="dojo"&&g.rest&&S.main.onboarded){const st=S.main.uiStat=S.main.uiStat||{};const k=todayKey();st.other=(st.other||[]).filter(x=>diffDays(x,k)<14);if(!st.other.includes(k)){st.other.push(k);saveMain()}}})})}
function openGrpOf(el){const dt=el&&el.closest&&el.closest("details.grp");if(dt&&!dt.open){dt.open=true;ui.grpOpen=ui.grpOpen||{};ui.grpOpen[dt.id]=true}}

/* 入門の七日：始めてから7日間は、毎日「今日の目標はこれ一つだけ」を示す。空いた日を責めない */
const WEEK1=[
 ["一太刀を一つ斬る","「今日の一太刀を受ける」を押し、終えたら「達成」を付ける",(d,k)=>!!(d.mission&&(d.mission.result==="done"||d.mission.result==="part"))],
 ["重点修行を、最低ラインだけやる","毎日の修行の「達成」か「最低ライン」を押す",(d,k)=>Object.values(d.logs||{}).some(l=>isDoneState(l.state))],
 ["夜の省察を書く","武道録の「今日の己を省みる」で、選ぶだけで振り返る",(d,k)=>!!d.reflection],
 ["呼吸を1分やる","稽古場の呼吸・瞑想で、ボックス呼吸1分",(d,k)=>breathDoneOn(d)],
 ["明日の仕込みを一つ選ぶ","夜の省察の「詳しく振り返る」で、今夜やる仕込みを選ぶ",(d,k)=>!!(d.prep&&d.prep.items&&d.prep.items.length)],
 ["掟を一つ実践する","道場の「実践しなさい。」から一つ押す",(d,k)=>okiteDay(d).ok>0],
 ["一太刀を斬り、七日間を振り返る","一太刀に「達成」を付け、週の振り返りをする",(d,k)=>!!(d.mission&&d.mission.result==="done"&&Object.values(S.main.weeklies||{}).some(w=>w.date===k))]];
const WEEK_M={2:"二日目だ。来ただけで、多くの者より先にいる。",3:"三日目。ここで止まる者が多い。お前は止まるな。",4:"四日目。小さくていい。今日の一つをやれ。",5:"五日目。体が、少しずつ覚え始めている。",6:"六日目。明日で七日だ。",7:"七日目。ここまで来た己を、認めてやれ。"};
function week1Card(k){const M=S.main;if(!M.onboarded||M.demo||!M.created)return "";const n=diffDays(M.created,k)+1;if(n<1||n>7)return "";
  const res=WEEK1.map((w,i)=>{const kk=addDays(M.created,i);const d=S.days[kk];return d?!!w[2](d,kk):false});
  const g=WEEK1[n-1],done=res[n-1],all=res.filter(Boolean).length;
  return '<section class="sec" id="sec-week1"><div class="row"><p class="eyebrow grow" style="margin:0">入門の七日 ・ '+n+'日目</p><span class="small muted num">'+all+' / 7</span></div>'+
  '<div class="w1dots" aria-label="7日間の進み具合">'+res.map((r,i)=>'<i class="'+(r?"ok":i===n-1?"now":"")+'">'+(r?"✓":i+1)+'</i>').join("")+'</div>'+
  '<p class="w1goal">'+(done?'<span class="w1ok">果たした</span>':'今日の目標')+'</p><p class="w1t">'+g[0]+'</p>'+
  '<p class="small muted">'+(done?(n===7?'七日、来た。ここからが本当の修行だ。':'今日の目標は果たした。ほかは、やれたらでいい。'):'今日はこれ一つだけでいい。'+g[1]+'。')+'</p>'+
  (!M.calAdded?'<button class="btn sm wide" data-act="calAdd" style="margin-top:10px">毎朝と夜の合図をカレンダーに入れる</button>':'')+'</section>'}
// 毎朝・毎晩の合図（カレンダーのファイル。アプリから通知を送れないための代わり）
function icsFile(){const n=S.main.notif||{};const am=n.morning||"06:30",pm=n.night||"21:30";const hm=t=>t.replace(":","")+"00";const d=todayKey().replace(/-/g,"");const st=new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z";
  const ev=(id,tm,sum,desc)=>["BEGIN:VEVENT","UID:bushido-"+id+"-"+d+"@bushido.app","DTSTAMP:"+st,"DTSTART:"+d+"T"+hm(tm),"DURATION:PT10M","RRULE:FREQ=DAILY","SUMMARY:"+sum,"DESCRIPTION:"+desc,"BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+sum,"TRIGGER:PT0M","END:VALARM","END:VEVENT"].join("\r\n");
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//BUSHIDO//JA","CALSCALE:GREGORIAN",ev("am",am,"武士道：今日の一太刀を受けよ","道場を開き、今日の一太刀を受ける。"),ev("pm",pm,"武士道：夜の省察","武道録で、今日を振り返る。"),"END:VCALENDAR"].join("\r\n")}

/* ============ 入門の序章（全7幕）：文章データ ============
   b＝タップごとに現れる一まとまり。<g>…</g>はシャンパンゴールド。c:"q"大きな問い／c:"big"転換点 */
