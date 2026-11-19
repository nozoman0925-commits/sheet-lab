const TUT=[
 {ch:0,center:true,t:"入門の儀",m:"道場の使い方を教えよう。聞くだけでは意味がない。押して覚えろ。",b:"光る所だけが押せる。練習なので、本番の記録には残らない。",next:"始める"},
 {ch:1,chap:true,m:"ここがお前の道場だ。毎日の稽古は、ここから始まる。"},
 {ch:1,tab:"dojo",sel:"#sec-mission",flag:"dojo",t:"今日の一太刀",b:"道場を開けば、今日やることが一つだけ出ている。ほかは下の「その他の稽古・記録」にある。",next:"次へ"},
 {ch:1,tab:"dojo",sel:"#sec-master",t:"師範",b:"迷ったら、ここで助言を聞ける。",next:"次へ"},
 {ch:1,tab:"dojo",sel:".rankchip",t:"段位とEXP",b:"記録するたびにEXPが増え、段位が上がる。",next:"次へ"},
 {ch:1,tab:"dojo",sel:".urge-fab",t:"衝動ボタン",b:"SNSや動画を見たくなったら、これを押せ。",next:"次へ"},
 {ch:2,chap:true,m:"今日の一振りを決めろ。自分で選んだ稽古に、責任を持て。"},
 {ch:2,tab:"dojo",sel:"#sec-mission [data-act=setMission]",press:true,flag:"mission",t:"一太刀を受ける",b:"「今日の一太刀を受ける」を押せ。",done:()=>!!$("#sheet [data-act=msCond]")||!!$("#ms-pick")||!!day(todayKey()).mission},
 {ch:2,tab:"dojo",sel:"#sheet [data-act=msCond][data-v=normal]",press:true,slim:true,top:true,t:"体調を選ぶ",b:"ここでは「ふつう」を押せ。",done:()=>!!$("#ms-pick")||!!day(todayKey()).mission},
 {ch:2,tab:"dojo",sel:"#ms-pick",allow:"#ms-pick",slim:true,top:true,t:"三つから一つ選ぶ",b:"どれか一つを押せ。",done:()=>ui.msPick!=null||!!day(todayKey()).mission},
 {ch:2,tab:"dojo",sel:"#sheet [data-act=saveMission]",press:true,slim:true,top:true,t:"決める",b:"「この一太刀を受ける」を押せ。",done:()=>!!day(todayKey()).mission},
 {ch:2,tab:"dojo",sel:"#sec-mission .hero-how",t:"やることは書いてある",b:"目安の時間・いつやるか・できない日の軽い版が書いてある。くわしい手順は「やり方をくわしく」から。",next:"次へ"},
 {ch:3,chap:true,m:"やったことは記録しろ。己の歩みを、曖昧にするな。"},
 {ch:3,tab:"dojo",sel:"#sec-mission [data-act=mres][data-v=done]",press:true,flag:"record",t:"達成を付ける",b:"やり終えたら「達成」。練習だ、押してみろ。",done:()=>{const m=day(todayKey()).mission;return !!(m&&m.result)}},
 {ch:3,tab:"dojo",sel:".rankchip",t:"EXPが増えた",b:"これが積み上がって、段位になる。",next:"次へ"},
 {ch:3,tab:"dojo",sel:"#sec-quest [data-act=quick]",press:true,alt:"今はいい",t:"毎日の修行も同じ",b:"重点修行も、やったら「達成」を押すだけだ。",done:()=>{const q=firstQuest();return !!(q&&logOf(todayKey(),q.id))}},
 {ch:3,tab:"dojo",center:true,t:"届かなかった日は",b:"「未達成」を押せば、原因を聞く。責めずに、翌日の命令を変える。",next:"次へ"},
 {ch:4,chap:true,m:"己の弱さを知ったなら、次は鍛えるだけだ。"},
 {ch:4,tab:"dojo",sel:"#tabs [data-tab=keiko]",press:true,flag:"keiko",t:"稽古場へ",b:"「稽古場」を押せ。",done:()=>tab==="keiko"},
 {ch:4,tab:"keiko",sel:"#sec-focus",t:"重点修行",b:"修行は一つずつ。7日以上・8割で「定着」する。",next:"次へ"},
 {ch:4,tab:"keiko",sel:"#sec-train [data-act=breath]",press:true,t:"呼吸を開く",b:"呼吸のタイマーを開いてみろ。",done:()=>!!$("#sheet .sheet")},
 {ch:4,tab:"keiko",sel:"#sheet .btn[data-act=closeSheet]",press:true,slim:true,top:true,t:"閉じる",b:"今は見るだけでいい。閉じろ。",done:()=>!$("#sheet .sheet")},
 {ch:5,chap:true,m:"過去の自分から目を背けるな。成長も失敗も、記録しておけ。"},
 {ch:5,tab:"keiko",sel:"#tabs [data-tab=roku]",press:true,flag:"roku",t:"武道録へ",b:"「武道録」を押せ。",done:()=>tab==="roku"},
 {ch:5,tab:"roku",sel:"#sec-reflect",t:"夜の省察",b:"夜はここで振り返る。選ぶだけで書ける。",next:"次へ"},
 {ch:5,tab:"roku",sel:"#sec-status",t:"六能力",b:"続けるほど、この数字が伸びる。",next:"次へ"},
 {ch:5,tab:"roku",sel:"#sec-cal",t:"修行絵巻",b:"斬った日ほど、色が濃くなる。",next:"次へ"},
 {ch:5,tab:"roku",sel:"#sec-mirror",t:"姿見",b:"写真で、自分の変化を比べられる。",next:"次へ"},
 {ch:6,chap:true,m:"これからは、お前の稽古を見届けよう。"},
 {ch:6,tab:"roku",sel:"#tabs [data-tab=dojo]",press:true,t:"道場に戻る",b:"「道場」を押せ。",done:()=>tab==="dojo"},
 {ch:6,tab:"dojo",sel:"#sec-master [data-act=masterAdvice]",press:true,flag:"advice",t:"助言を聞く",b:"「助言を聞く」を押せ。",done:()=>!!$("#sheet .sheet")},
 {ch:6,tab:"dojo",sel:"#sheet .btn[data-act=closeSheet]",press:true,slim:true,top:true,t:"読んだら閉じる",b:"読んだら「閉じる」を押せ。",done:()=>!$("#sheet .sheet")},
 {ch:6,tab:"dojo",sel:"#tabs [data-tab=chikai]",t:"誓いの間",b:"師範・外観・記録の設定は、ここにある。",next:"次へ"},
 {ch:6,tab:"dojo",center:true,t:"最初の七日",b:"これから七日、毎日「今日の目標」を一つだけ出す。まずは七日、来い。",next:"次へ"},
 {ch:6,tab:"dojo",center:true,t:"師範から一言",b:"「今日からが本当の始まりだ。」",next:"次へ"},
 {ch:7,tab:"dojo",center:true,reward:true,m:"よし。基本は教えた。これからは自分の意思で稽古を続けろ。",t:"入門の儀、完了。",b:"道場を開く・一振りを選ぶ・記録する・稽古場・武道録・助言。すべて体験した。",next:"道場へ進む"}
];
// 第35版：師範の手順（第六章・師範を指す手順）は全編から外す
const TUT_FULL=TUT.filter(s=>!(s.ch===6||/師範/.test(s.t||"")||/sec-master/.test(s.sel||"")));
function tutChStart(i){const T=TUT_FULL;const c=T[i]&&T[i].ch;if(c==null||c===0)return 0;if(c===7)return T.length-1;const ch=c===3?2:c;return Math.max(0,T.findIndex(s=>s.ch===ch))}
function tutSandbox(){if(S.main.tutSnap)return;const k=todayKey();const M=S.main;
  M.tutSnap={key:k,day:S.days[k]?clone(S.days[k]):null,tasks:clone(M.tasks),rankMax:M.rankMax,rankLog:clone(M.rankLog),weeklies:clone(M.weeklies),returns:clone(M.returns||[]),recoveries:clone(M.recoveries||[])};
  S.days[k]={logs:{},mission:null,ritual:{},reflection:null,temptations:[]};saveDay(k);saveMain();ui.shownExp=null}
function tutRestore(){const sn=S.main.tutSnap;if(!sn)return;const k=sn.key;const M=S.main;
  S.days[k]=sn.day||{logs:{},mission:null,ritual:{},reflection:null,temptations:[]};M.tasks=sn.tasks;M.rankMax=sn.rankMax;M.rankLog=sn.rankLog;M.weeklies=sn.weeklies;M.returns=sn.returns;M.recoveries=sn.recoveries;
  M.tutSnap=null;ui.rankUp=null;ui.shownExp=null;saveDay(k);saveMain()}
const TUT_FIRST=[
 {ch:2,chap:true,m:"まずは一つ。今日の一太刀を斬れ。"},
 {ch:2,tab:"dojo",sel:"#sec-mission [data-act=startRec]",press:true,flag:"mission",t:"稽古を始める",b:"今日のおすすめが一つ出ている。「稽古を始める」を押せ。",done:()=>!!day(todayKey()).mission},
 {ch:2,tab:"dojo",sel:"#sec-mission .hero-how",t:"やり方は、ここにある",b:"目安の時間と、できない日の軽い版が書いてある。くわしい手順は「やり方をくわしく」から。",next:"次へ"},
 {ch:3,tab:"dojo",sel:"#sec-mission [data-act=mres][data-v=done]",press:true,t:"終わったら「やり切った」",b:"練習だ。押してみろ。本番の記録には残らない。",done:()=>!!(day(todayKey()).mission||{}).result},
 {ch:7,tab:"dojo",center:true,reward:true,m:"よし。あとは毎日、これ一つからだ。",t:"入門の儀、完了。",b:"ほかの機能は、初めて開いた時にその場で案内する。すべての使い方は、誓いの間の「データ管理」からいつでも見直せる。",next:"道場へ進む"}];
function tutStart(from,full){closeSheet();$("#ceremony").hidden=true;tutRestore();tutSandbox();const steps=(full||S.main.tutFull)?TUT_FULL:TUT_FIRST;if(full)S.main.tutFull=true;ui.tutSteps=steps;ui.tutKind="main";
  ui.tut=from!=null?from:(S.main.tutStep||0);if(!(ui.tut>=0&&ui.tut<steps.length))ui.tut=0;if(steps===TUT_FULL)ui.tut=tutChStart(ui.tut);ui.tutSkip=false;ui.tutHelp=false;tab=steps[ui.tut].tab||"dojo";
  S.main.tutLater=false;S.main.tutStep=ui.tut;S.main.tutFlags=S.main.tutFlags||{};saveMain();render();window.scrollTo(0,0)}
const HINTS={
 keiko:[{sel:"#sec-pick",t:"稽古場",b:"今日やると良い稽古を一つだけ出している。ほかの稽古は、下の分類（心を整える・身体を鍛える など）を開くと出てくる。",next:"わかった"}],
 roku:[{sel:"#sec-reflect",t:"武道録",b:"今日と今週の記録だけを先に見せている。カレンダーや分析は、下の分類を開いた時だけ出てくる。",next:"わかった"}],
 chikai:[{sel:"#app details.grp",t:"誓いの間",b:"誓い・師範・成長・表示と通知・データ管理の五つに分けてある。開いた所だけ中身が出る。表示の量は「表示と通知」で変えられる。",next:"わかった"}]
};
function hintStart(t){if(!HINTS[t])return;ui.tutSteps=HINTS[t];ui.tutKind=t;ui.tut=0;ui.tutSkip=false;requestAnimationFrame(tutShow)}
function maybeHint(){if(ui.tut!=null||!S.main.onboarded||!(S.main.tutDone||S.main.tutLater))return;S.main.hints=S.main.hints||{};if(HINTS[tab]&&!S.main.hints[tab])hintStart(tab)}
function tutEnd(later){const kind=ui.tutKind;ui.tut=null;ui.tutSteps=null;$("#tut").hidden=true;$("#tut").innerHTML="";document.documentElement.classList.remove("tut-lock");
  if(kind==="main"){closeSheet();tutRestore();tab="dojo";
    if(later){S.main.tutLater=true;toast("入門の儀を中断した","道場のカードか「？」から、続きを再開できる")}
    else{S.main.tutDone=true;S.main.tutVer=3;S.main.tutStep=null;S.main.tutLater=false;S.main.tutFull=false}}
  else if(kind){S.main.hints=S.main.hints||{};S.main.hints[kind]=1}
  saveMain();render();if(kind==="main")window.scrollTo(0,0)}
function tutStep(){return ui.tut==null||!ui.tutSteps?null:ui.tutSteps[ui.tut]}
function tutAdvance(){const prev=ui.tutSteps[ui.tut];if(ui.tutKind==="main"&&prev&&prev.flag){S.main.tutFlags=S.main.tutFlags||{};S.main.tutFlags[prev.flag]=1}
  ui.tut++;ui.tutScrolled=false;ui.tutHelp=false;ui.tutMiss=0;if(ui.tut>=ui.tutSteps.length){tutEnd();return}
  if(ui.tutKind==="main"){S.main.tutStep=ui.tutSteps===TUT_FULL?tutChStart(ui.tut):ui.tut;saveMain()}tutShow()}
function tutBackIdx(){const cur=ui.tutSteps[ui.tut];if(!cur||cur.reward)return -1;for(let i=ui.tut-1;i>=0;i--){const s=ui.tutSteps[i];if(s.ch!==cur.ch)return -1;if(s.chap)return -1;if(!s.done&&!s.allow&&(s.tab||"dojo")===tab)return i}return -1}
function tutCheck(){
  const s=tutStep();if(!s)return;
  if(s.done&&s.done()){tutAdvance();return}
  if(s.back&&s.back()){ui.tut--;ui.tutScrolled=false;tutShow();return}
  tutShow();
}
function tutShow(){
  const s=tutStep();const box=$("#tut");if(!s){box.hidden=true;return}
  let el=s.sel?$(s.sel):null;
  if(el&&el.closest("details.grp")&&!el.closest("details.grp").open){openGrpOf(el);el=$(s.sel)}
  if(s.sel&&!el){return tutAdvance()}
  if(el&&el.closest("#sheet")&&!ui.tutScrolled){ui.tutScrolled=true;el.scrollIntoView({block:"center",behavior:"instant"})}
  if(s.done&&s.done())return tutAdvance();
  box.hidden=false;document.documentElement.classList.add("tut-lock");
  const vh=window.innerHeight;
  const offView=el&&(()=>{const q=el.getBoundingClientRect();return q.bottom<8||q.top>vh-8})();
  if(el&&(!ui.tutScrolled||offView)&&!el.closest("#tabs")&&!el.closest("#sheet")){
    ui.tutScrolled=true;const r=el.getBoundingClientRect();
    const want=r.height>vh*.55?100:Math.max(100,(vh-r.height)/2-80);
    if(Math.abs(r.top-want)>4)window.scrollTo({top:window.scrollY+r.top-want,behavior:"instant"});
  }
  const steps=ui.tutSteps;const body=typeof s.b==="function"?s.b():s.b;const main=ui.tutKind==="main";const KAN="〇一二三四五六";
  const skip='<button class="btn sm ghost tut-skip" data-tut="skip">'+(ui.tutSkip?"本当に中断する？":"後で行う")+'</button>';
  if(main&&s.chap){ // 章の扉
    const card='<div class="tut-card chapcard" role="dialog" aria-live="polite"><p class="chap-no">第'+KAN[s.ch]+'章</p><p class="chap-ttl">'+TUT_CH[s.ch]+'</p><div class="chap-dots">'+[1,2,3,4,5,6].map(c=>'<i class="'+(c<s.ch?"done":c===s.ch?"on":"")+'"></i>').join("")+'</div><div class="tut-m">'+mPic(S.main.master)+'<p>「'+s.m+'」</p></div><div class="acts">'+skip+'<span class="grow"></span><button class="btn gold" data-tut="next">進む</button></div></div>';
    box.hidden=false;document.documentElement.classList.add("tut-lock");box.innerHTML='<div class="tut-dim deep"></div>'+card;const cc=box.querySelector(".tut-card");cc.style.top="50%";cc.style.transform="translateY(-50%)";fillPk();return}
  const chS=main?steps.filter(x=>x.ch===s.ch&&!x.chap):[];const ci=chS.indexOf(s);
  const dots=main?'<div class="tut-head"><span class="tut-ch">'+(s.ch>0&&s.ch<7?"第"+KAN[s.ch]+"章 ・ "+TUT_CH[s.ch]:s.reward?"完了":"入門の儀")+'</span>'+(chS.length>1&&ci>=0?'<span class="tut-sd">'+chS.map((_,i)=>'<i class="'+(i<ci?"done":i===ci?"on":"")+'"></i>').join("")+'</span>':'')+(s.reward?'':'<button class="tut-help" data-tut="help" aria-label="ヘルプ">？</button>')+'</div>':steps.length>1?'<div class="tut-dots">'+steps.map((_,i)=>'<i class="'+(i<ui.tut?"done":i===ui.tut?"on":"")+'"></i>').join("")+'</div>':'';
  const hint=s.press&&!s.slim?'<p class="press-hint">光っている所を押せ</p>':'';
  const help=ui.tutHelp?'<p class="tut-helptext">金色に光っている所だけが押せる。暗い所は押せない。分からなくなったら「後で行う」で中断できる。続きは道場から再開できる。</p>':'';
  const bi=main?tutBackIdx():-1;
  const acts='<div class="acts">'+(main&&!s.reward?(bi>=0?'<button class="btn sm ghost" data-tut="back">戻る</button>':'')+skip:(ui.tutKind&&!s.reward?'<span></span>':''))+'<span class="grow"></span>'+(s.alt?'<button class="btn sm" data-tut="next">'+s.alt+'</button>':'')+(s.next?'<button class="btn gold" data-tut="next">'+s.next+'</button>':'')+'</div>';
  const inner=main&&!s.reward?'<div class="tut-say">'+mPic(S.main.master)+'<div><h3>'+s.t+'</h3><p>'+body+'</p></div></div>'+(s.m&&ui.tut===0?'<p class="tut-mline">「'+s.m+'」</p>':''):
    (main&&s.reward?'<div class="tut-m">'+mPic(S.main.master)+'<p>「'+s.m+'」</p></div><h3>'+s.t+'</h3><p>'+body+'</p>':(s.reward?'<div class="seal">入門</div>':'')+'<h3>'+s.t+'</h3><p>'+body+'</p>');
  const card='<div class="tut-card'+(s.reward?" reward":"")+(s.slim?" slim":"")+'" role="dialog" aria-live="polite">'+dots+inner+hint+help+acts+(main&&!s.reward&&!s.slim?'<span class="tut-prac">練習中 ・ 本番の記録には残らない</span>':'')+'</div>';
  if(!el){box.innerHTML='<div class="tut-dim"></div>'+card;const c=box.querySelector(".tut-card");c.style.top="50%";c.style.transform="translateY(-50%)";fillPk();return}
  const placeTut=()=>{if(!el.isConnected||!box.querySelector(".tut-card"))return;
  const r=el.getBoundingClientRect();const p=6; // スクロール後の位置で測り直す
  const top=Math.max(4,r.top-p),left=Math.max(4,r.left-p),w=Math.min(window.innerWidth-8-left,r.width+p*2),hh=r.height+p*2;
  let html='<div class="tut-ring'+(s.press?" press":"")+'" style="top:'+top+'px;left:'+left+'px;width:'+w+'px;height:'+hh+'px"></div>';
  if(s.press)html+='<div class="tut-tap" style="top:'+(r.top+r.height/2)+'px;left:'+(r.left+Math.min(r.width/2,r.width-24))+'px"></div>';
  {const old=box.querySelector(".tut-card");if(old){box.querySelectorAll(".tut-ring,.tut-tap").forEach(x=>x.remove());old.removeAttribute("style");old.classList.remove("above","below");old.insertAdjacentHTML("beforebegin",html)}else{box.innerHTML=html+card;fillPk()}}
  const c=box.querySelector(".tut-card");const cx=Math.min(Math.max(r.left+r.width/2,40),window.innerWidth-40);
  // カードの実際の高さを測ってから置く：光っている所の下 → 上 → どちらも無理なら画面の下端。必ず画面内に収める
  const ch=c.offsetHeight,M=12,below=top+hh+14,above=top-14-ch;c.style.setProperty("--ax",cx+"px");
  if(s.top){c.style.top=M+"px"}
  else if(r.top+r.height/2<=vh/2&&below+ch<=vh-M){c.style.top=below+"px";c.classList.add("below")}
  else if(above>=M){c.style.top=above+"px";c.classList.add("above")}
  else if(below+ch<=vh-M){c.style.top=below+"px";c.classList.add("below")}
  else{ // 上下どちらにも収まらない：広い方に置き、カードの中をスクロールさせる（光っている所は隠さない）
    const spB=vh-M-below,spA=top-14-M;
    if(spB>=spA){c.style.top=below+"px";c.style.maxHeight=Math.max(120,spB)+"px";c.classList.add("below")}
    else{c.style.maxHeight=Math.max(120,spA)+"px";c.style.top=Math.max(M,top-14-Math.min(ch,Math.max(120,spA)))+"px";c.classList.add("above")}}
  {const t=parseFloat(c.style.top)||0,h2=c.offsetHeight;const fit=Math.min(Math.max(M,t),Math.max(M,vh-h2-M));if(Math.abs(fit-t)>1){c.style.top=fit+"px";c.classList.remove("above","below")}}};
  box.innerHTML=card;fillPk();placeTut();
  if(ui.tutRO)ui.tutRO.disconnect();
  if(window.ResizeObserver){ui.tutRO=new ResizeObserver(()=>requestAnimationFrame(placeTut));ui.tutRO.observe($("#app"))}
  if(ui.tutScrollH)window.removeEventListener("scroll",ui.tutScrollH);ui.tutScrollH=()=>requestAnimationFrame(placeTut);window.addEventListener("scroll",ui.tutScrollH,{passive:true});
}
window.addEventListener("click",ev=>{
  const cb=ev.target.closest("[data-cer]");
  if(cb){ev.preventDefault();ev.stopPropagation();$("#ceremony").hidden=true;$("#ceremony").innerHTML="";$("#ceremony").classList.remove("vowbg");
    if(cb.dataset.cer==="tut"){tutStart(0);return}
    if(cb.dataset.cer==="cert"){const v=victories();let idx=-1;v.forEach((w,j)=>{if(w.cert&&w.cert.rank!=null)idx=j});if(idx>=0)certSheet(idx)}
    return}
  const s=tutStep();if(!s)return;
  const tb=ev.target.closest("[data-tut]");
  if(tb){ev.preventDefault();ev.stopPropagation();
    if(tb.dataset.tut==="skip"){if(!ui.tutSkip){ui.tutSkip=true;tutShow();return}tutEnd(ui.tutKind==="main");return}
    if(tb.dataset.tut==="help"){ui.tutHelp=!ui.tutHelp;tutShow();return}
    if(tb.dataset.tut==="back"){const i=tutBackIdx();if(i>=0){ui.tut=i;ui.tutScrolled=false;tutShow()}return}
    tutAdvance();return}
  const allowSel=s.allow||(s.press?s.sel:null);
  if(allowSel){const a=$(allowSel);if(a&&a.contains(ev.target)){setTimeout(tutCheck,40);return}}
  ev.preventDefault();ev.stopPropagation();
  ui.tutMiss=(ui.tutMiss||0)+1;if(ui.tutMiss>=3&&!ui.tutHelp&&ui.tutKind==="main"){ui.tutHelp=true;tutShow()}
  const ring=$("#tut .tut-ring");if(ring){ring.classList.remove("nudge");void ring.offsetWidth;ring.classList.add("nudge")}
},true);
window.addEventListener("resize",()=>{if(ui.tut!=null)tutShow()});
document.addEventListener("keydown",ev=>{if(ui.tut!=null&&ev.key==="Escape")setTimeout(tutCheck,40)});

document.addEventListener("click",ev=>{
  const tb=ev.target.closest("#tabs button");if(tb){tab=tb.dataset.tab;ui.calSel=null;render();window.scrollTo(0,0);return}
  const el=ev.target.closest("[data-act]");if(!el)return;
  if(el.dataset.act==="closeSheet"&&el.classList.contains("sheet-bg")&&ev.target!==el)return;
  const f=A[el.dataset.act];if(f){if(el.tagName==="BUTTON")ev.preventDefault();f(el,ev)}
});
document.addEventListener("change",ev=>{
  if(ev.target.id==="ob-cat"){ui.ob.cat=+ev.target.value;$("#ob-ex").innerHTML=presetChips(ui.ob.cat,new Set())}
  if(ev.target.id==="tk-cat"){const c=+ev.target.value;$("#tk-pre").innerHTML=presetChips(c);$("#tk-name").placeholder="例："+PRESETS[c][0].n}
});
document.addEventListener("keydown",ev=>{if(ev.key==="Escape")closeSheet()});

/* ============ 見本データ ============ */
function seedDemo(){
  const t=todayKey();const s=addDays(t,-20);
  const M=blankMain();M.onboarded=true;M.demo=true;M.displayName="見本";M.abilities=[1,2,5];
  M.oath={text:"一、私は自分との約束を守る。\n一、できなかった日も記録から逃げない。\n一、休むべき時は休み、必ず再起する。",signature:"見本",date:s,history:[]};
  const a={id:"demo1",cat:1,name:"6時30分に起床する",minimum:"7時までに起きる",unit:"",restDays:[0],status:"進行中",focus:false,start:s,settledOn:null,history:[]};
  const b={id:"demo2",cat:5,name:"読書20ページ",minimum:"2ページ",unit:"ページ",restDays:[],status:"進行中",focus:true,start:addDays(s,10),settledOn:null,history:[]};
  M.tasks=[a,b];
  const days={};
  for(let k=s;k<t;k=addDays(k,1)){const i=diffDays(s,k);const d={logs:{},mission:null,ritual:{},reflection:null,temptations:[]};
    if(taskOn(a,k))d.logs.demo1={state:i%6===4?"miss":(i%7===2?"min":"done"),at:"06:35",reason:i%6===4?"夜更かし":""};
    if(k>=b.start)d.logs.demo2={state:i%4===1?"min":(i%5===3?"miss":"done"),value:i%4===1?"3":"22",at:"21:10"};
    if(d.logs.demo1&&d.logs.demo1.state==="miss")d.logs.demo1.reason="スマホや娯楽に流された";
    if(d.logs.demo2&&d.logs.demo2.state==="miss")d.logs.demo2.reason="時間管理ができなかった";
    d.mission={text:["企画書の下書きを仕上げる","苦手な相手に返信する","部屋の床を片付ける"][i%3],setAt:"06:50",result:["done","part","done","miss"][i%4]};
    if(i%2===0)RITUAL.forEach((_,j)=>d.ritual[j]="06:"+pad(30+j*3));
    if(i%3!==1)d.reflection={result:"予定どおり進んだ",issue:"夜にスマホを触りすぎた",cause:"寝室に持ち込んだ",escape:"",improve:"22時にスマホを居間で充電する",next:"21時50分にアラーム",at:"22:00"};
    d.temptations=i%3===0?[{type:"SNS",won:true,at:"21:30",note:"通知を切った"}]:[];
    days[k]=d;}
  // 先週の振り返り
  M.weeklies[mondayOf(addDays(t,-7))]={virtue:"誠",action:"できなかった日も正直に記録した",note:"",date:addDays(mondayOf(t),-1)};
  S={main:M,days};
  // 定着判定（起床は定着、読書が重点）
  a.settledOn=addDays(s,9);a.status="定着";
  S.main.rankMax=computeRank(totalExp());S.main.rankLog=S.main.rankMax?[{rank:S.main.rankMax,date:addDays(t,-5)}]:[];
  saveMain();Object.keys(days).forEach(k=>saveDay(k));tab="dojo";
}

/* 記録の形を整える：古い版・壊れた値があっても、読める所は残して起動する */
function normState(x){const isO=v=>!!v&&typeof v==="object"&&!Array.isArray(v);
  try{x=JSON.parse(JSON.stringify(x||{}))}catch(e){x={}}   // 凍結された記録でも直せるよう、写しを作る
  const B=blankMain();const M=Object.assign({},B,isO(x&&x.main)?x.main:{});
  Object.keys(B).forEach(k=>{const b=B[k];if(Array.isArray(b)){if(!Array.isArray(M[k]))M[k]=b}else if(isO(b)){if(!isO(M[k]))M[k]=b}else if(typeof b==="number"){if(typeof M[k]!=="number"||!isFinite(M[k]))M[k]=b}else if(typeof b==="string"&&k!=="displayName"&&k!=="future"){if(typeof M[k]!=="string"||!/^\d{4}-\d\d-\d\d$/.test(M[k])&&k==="created")M[k]=b}});
  M.tasks=M.tasks.filter(isO).map(t=>{if(!(typeof t.cat==="number"&&CATS[t.cat]))t.cat=1;if(t.settledOn!=null&&!(typeof t.settledOn==="string"&&/^\d{4}-\d\d-\d\d$/.test(t.settledOn)))t.settledOn=null;t.restDays=Array.isArray(t.restDays)?t.restDays.filter(x=>Number.isInteger(x)&&x>=0&&x<=6):[];if(typeof t.name!=="string")t.name=String(t.name==null?"修行":t.name);if(!Array.isArray(t.restDays))t.restDays=[];if(!Array.isArray(t.history))t.history=[];if(typeof t.id!=="string")t.id="t"+Math.random().toString(36).slice(2,8);if(typeof t.start!=="string"||!/^\d{4}-\d\d-\d\d$/.test(t.start))t.start=M.created;return t});
  ["rankLog","trials","recoveries","edits","abilities","okiteOff"].forEach(k=>{M[k]=M[k].filter(v=>v!=null)});
  M.rankLog=M.rankLog.filter(r=>isO(r)&&typeof r.rank==="number"&&RANKS[r.rank]);
  ["trials","recoveries","edits"].forEach(k=>{M[k]=M[k].filter(isO)});["weeklies","habits"].forEach(k=>{Object.keys(M[k]).forEach(w=>{if(!isO(M[k][w]))delete M[k][w]})});
  Object.keys(M).forEach(k=>{const v=M[k];if(isO(v)&&!B.hasOwnProperty(k)&&Object.keys(v).length&&Object.values(v).every(isO)===false&&Object.values(v).some(isO)){Object.keys(v).forEach(j=>{if(v[j]===null)delete v[j]})}});
  if(!(typeof M.rankMax==="number"&&RANKS[M.rankMax]))M.rankMax=0;
  if(M.master!=null&&!(isO(M.master)&&MOTIVES[M.master.motive]))M.master=null;
  if(M.look!=null&&!isO(M.look))M.look=null;
  // そのほかの一覧（配列）と表（オブジェクト）：型が違えば外す（使う所で初期値に戻る）
  ["feats","masterHist","profileLog","quoteSeen","returns"].forEach(k=>{if(M[k]!=null&&!Array.isArray(M[k]))delete M[k];else if(Array.isArray(M[k]))M[k]=M[k].filter(v=>v!=null)});
  ["bwLevel","hints","oath","powers","tutFlags","life","env","painStop","self0","vow","tutSnap","graduated","quoteDay","lookPrev"].forEach(k=>{if(M[k]!=null&&!isO(M[k]))M[k]=null});
  ["tutStep","quoteN"].forEach(k=>{if(M[k]!=null&&!(typeof M[k]==="number"&&isFinite(M[k])))M[k]=null});
  if(M.tutVer!=null&&typeof M.tutVer!=="number")M.tutVer=null;
  ["onboarded","demo","tutDone","tutLater"].forEach(k=>{if(M[k]!=null&&typeof M[k]!=="boolean")M[k]=!!M[k]&&M[k]!=="false"});
  if(M.profile!=null&&!isO(M.profile))M.profile=null;
  if(M.obAns!=null&&!isO(M.obAns))M.obAns=null;
  if(M.obAns){const DATE=/^\d{4}-\d\d-\d\d$/;["g1","b9","l1","l4","l5","l6"].forEach(q=>{const v=M.obAns[q];if(v!=null&&!Array.isArray(v))M.obAns[q]=[v]})}
  if(M.obDraft!=null&&!isO(M.obDraft))M.obDraft=null;
  if(M.prologue!=null&&!isO(M.prologue))M.prologue=null;
  const days={};const D=isO(x&&x.days)?x.days:{};
  Object.keys(D).forEach(k=>{const d=D[k];if(!/^\d{4}-\d\d-\d\d$/.test(k)||!isO(d)||isNaN(Date.parse(k)))return;
    d.logs=isO(d.logs)?d.logs:{};Object.keys(d.logs).forEach(t=>{if(!isO(d.logs[t]))delete d.logs[t]});
    d.ritual=isO(d.ritual)?d.ritual:{};Object.keys(d.ritual).forEach(i=>{if(typeof d.ritual[i]!=="string")delete d.ritual[i]});
    d.temptations=Array.isArray(d.temptations)?d.temptations.filter(isO):[];if(d.urges!=null&&!Array.isArray(d.urges))d.urges=[];
    if(d.mission!=null&&!(isO(d.mission)&&typeof d.mission.text==="string"))d.mission=null;
    if(d.mission&&!(typeof d.mission.cat==="number"&&d.mission.cat>=0&&d.mission.cat<CATS.length))d.mission.cat=1;
    ["reflection","okite","virtue","prep","prepCheck"].forEach(f=>{if(d[f]!=null&&!isO(d[f]))d[f]=null});
    days[k]=d});
  return {main:M,days}}
/* ============ 起動 ============ */
(async function boot(){
  let done=false;
  window.__bootExport=()=>{try{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),main:S.main,days:S.days})],{type:"application/json"});anchorDL("bushido-backup.json",blob)}catch(e){}};
  const ready=()=>{};
  const safeRender=()=>{try{render();ready()}catch(e){console.warn(e);(window.__bootErr||[]).push((e&&e.message)||String(e));if(window.__bootFail)window.__bootFail("起動の途中で止まった。")}};
  const fallback=setTimeout(async()=>{if(done)return;done=true;store={kind:"local",saveMain(){},saveDay(){},wipe:async()=>{}};
    try{const x=JSON.parse(localStorage.getItem("bushido.v1")||"null");S=normState(x||{})}catch(e){S={main:blankMain(),days:{}}}
    const LK="bushido.v1";store.saveMain=store.saveDay=()=>{try{localStorage.setItem(LK,JSON.stringify(S))}catch(e){}};safeRender()},10000);
  try{store=await initStore();const data=await store.load();if(done)return;done=true;clearTimeout(fallback);
    S=normState(data);
    // 第34版：表示の量の既定値。すでに使っている人は「標準」、新しく始める人は「最小」
    if(S.main.onboarded&&!S.main.viewDefault&&!(S.main.look&&S.main.look.view))S.main.viewDefault="std";
    tutRestore();
    if(!S.main.prologue&&(S.main.onboarded||(S.main.obDraft&&S.main.obDraft.ob&&(S.main.obDraft.step||0)>0)))S.main.prologue={done:true,skipped:"existing"};
    const dr=S.main.obDraft;if(dr&&dr.ob&&(!S.main.onboarded||dr.retake||dr.mflow)){ui.ob=dr.ob;ui.retake=!!dr.retake&&S.main.onboarded;ui.mflow=S.main.onboarded&&dr.mflow||null;ui.obStep=Math.min(dr.step||0,flowX().length-1);if(flowX()[ui.obStep]==="building")ui.obStep++}
    safeRender();setTimeout(autoBackup,3000);
    if(S.main.onboarded&&!ui.retake&&!ui.mflow&&S.main.master&&S.main.tutVer!==3&&!S.main.tutLater)tutStart(S.main.tutStep||0);
  }catch(e){console.warn(e);if(!done){done=true;clearTimeout(fallback);store={kind:"local",saveMain(){},saveDay(){},wipe:async()=>{}};S={main:blankMain(),days:{}};safeRender()}else{(window.__bootErr||[]).push((e&&e.message)||String(e));if(window.__bootFail&&document.querySelector("#app .loading"))window.__bootFail("起動の途中で止まった。")}}
})();
})();
