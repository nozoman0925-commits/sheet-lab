const PROLOGUE=[
 {s:"fog",n:"問い",b:[{t:"今の自分に、|満足しているか。",c:"q"}]},
 {s:"lone",n:"悔しさ",b:[{t:"悔しかったことは|ないか。"},{t:"自分に負けて、|情けなくなったことは|ないか。"}]},
 {s:"light",n:"希望",b:[{t:"変わりたい。\n<g>強くなりたい。</g>\n今の自分を|超えたい。"},{t:"そう思ったことが|あるなら、\n<g>ここから|始めよう。</g>"}]},
 {s:"katana",n:"覚悟",b:[{t:"だが、|覚えておいてほしい。"},{t:"人生を変えるのは、\n誰かでも、|環境でもない。"},{t:"自分自身の|行動だ。",c:"big"}]},
 {s:"path",n:"道",b:[{t:"毎日、|小さな約束を守る。\n失敗しても、|また立ち上がる。\n昨日の自分を、|少しずつ超えていく。"},{t:"その積み重ねが、|やがて<g>自分を|変える</g>。"}]},
 {s:"dojo",n:"武士道",b:[{t:"ここは、|自分を鍛える道場。"},{t:"甘えるためではない。\n誰かと|比べるためでもない。"},{t:"<g>己を律し、|己を超える</g>|ためにある。"}]},
 {s:"dawn",n:"入門",b:[{t:"さあ、|始めよう。"},{t:"これからの自分を|変えるのは、\n今日の自分だ。"},{t:"己の道は、|己で切り拓け。",c:"big"}]}];
const PL_T={in:1200,out:800,swap:500,cta:1000,glass:900,stagger:160};
const PL_NO=["第一幕","第二幕","第三幕","第四幕","第五幕","第六幕","終幕"];

const PL_FIG='<svg viewBox="0 0 40 100" aria-hidden="true"><circle cx="20" cy="10" r="7"/><path d="M12 22 Q20 18 28 22 L30 58 L26 58 L25 97 L21 97 L20 64 L19 97 L15 97 L14 58 L10 58 Z"/></svg>';
const PL_MTN='<svg class="pl-mtn" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 190 L60 150 L110 175 L170 120 L230 165 L290 130 L350 160 L400 140 V300 H0Z" fill="#15181d"/><path d="M0 225 L80 185 L150 215 L220 180 L300 220 L360 195 L400 210 V300 H0Z" fill="#101216"/><path d="M0 262 Q120 236 200 250 T400 246 V300 H0Z" fill="#0b0c0f"/><path d="M200 300 Q186 280 204 266 T199 248" fill="none" stroke="rgba(198,166,106,.28)" stroke-width="1.4"/></svg>';
const PL_KATANA='<svg class="pl-katana" viewBox="0 0 400 120" aria-hidden="true"><defs><linearGradient id="plBl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a3a9b2"/><stop offset=".55" stop-color="#3d4148"/><stop offset="1" stop-color="#1b1d21"/></linearGradient></defs>'+
 '<path d="M112 62 L330 50 Q368 46 394 34 Q372 54 332 60 L112 68 Z" fill="url(#plBl)"/><path d="M118 65 Q170 62 220 63 T330 57" fill="none" stroke="rgba(255,255,255,.28)" stroke-width=".8"/>'+
 '<rect x="104" y="58" width="9" height="12" rx="1.5" fill="#8f7a52"/><ellipse cx="98" cy="64" rx="4.5" ry="17" fill="#15161a" stroke="#C6A66A" stroke-opacity=".55"/>'+
 '<rect x="20" y="59" width="76" height="10" rx="4" fill="#111215"/>'+[0,1,2,3,4,5].map(i=>'<path d="M'+(26+i*12)+' 59 l6 5 l-6 5" fill="none" stroke="rgba(198,166,106,.35)" stroke-width="1.1"/>').join("")+'</svg>';
function plScenes(){
 return '<div class="pl-sc" data-s="fog"><div class="pl-fog a"></div><div class="pl-fog b"></div></div>'+
  '<div class="pl-sc" data-s="lone"><div class="pl-floor"></div><div class="pl-fig lone">'+PL_FIG+'</div><div class="pl-fog b"></div></div>'+
  '<div class="pl-sc" data-s="light"><div class="pl-beam"></div><div class="pl-fog a"></div></div>'+
  '<div class="pl-sc" data-s="katana"><div class="pl-spot"></div>'+PL_KATANA+'</div>'+
  '<div class="pl-sc" data-s="path"><div class="pl-dawn"></div>'+PL_MTN+'<div class="pl-fig walk">'+PL_FIG+'</div></div>'+
  '<div class="pl-sc" data-s="dojo"><div class="pl-shoji"></div><div class="pl-mon">'+kamon+'</div><div class="pl-boards"></div></div>'+
  '<div class="pl-sc" data-s="dawn"><div class="pl-sky"></div><div class="pl-sun"></div>'+PL_MTN+'<div class="pl-fig face">'+PL_FIG+'</div></div>'+
  '<div class="pl-dust">'+[0,1,2,3,4,5,6,7].map(i=>'<i style="--x:'+(8+i*12)+'%;--d:'+(9+i%4*2)+'s;--w:'+(i*1.3)+'s"></i>').join("")+'</div>'}

function plActive(){return !ui.noPrologue&&S&&S.main&&!S.main.onboarded&&!ui.retake&&!ui.mflow&&!(S.main.prologue&&S.main.prologue.done)}
function plReduced(){try{return look().anim==="off"||matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}}
function plD(n){return plReduced()?0:n}
function plMount(){if($("#prologue"))return;const el=document.createElement("div");el.id="prologue";el.setAttribute("role","dialog");el.setAttribute("aria-label","入門の序章");
  el.innerHTML='<div class="pl-aurora" aria-hidden="true"><i></i><i></i><i></i></div><div class="pl-scenes">'+plScenes()+'</div><div class="pl-grain" aria-hidden="true"></div><div class="pl-vignette"></div>'+
   '<div class="pl-top"><button class="pl-btn" data-pl="back" aria-label="前の幕へ戻る">‹</button><div class="pl-dots" aria-hidden="true">'+PROLOGUE.map(()=>'<i></i>').join("")+'</div><button class="pl-btn" data-pl="skip">スキップ</button></div>'+
   '<div class="pl-center"><div class="pl-glass"><p class="pl-ch" aria-hidden="true"></p><div class="pl-text" aria-live="polite"></div></div></div>'+
   '<p class="pl-hint" aria-hidden="true">タップして進む</p>'+
   '<div class="pl-cta"><button class="pl-enter" data-pl="enter">入門する</button><button class="pl-demo" data-pl="demo">先に見本で中を見る</button></div>';
  document.body.appendChild(el);document.documentElement.classList.add("pl-lock");
  el.addEventListener("click",plTap);
  // ガラスに映る淡い光（指やマウスの位置）
  el.addEventListener("pointermove",ev=>{const g=el.querySelector(".pl-glass");if(!g)return;const r=g.getBoundingClientRect();g.style.setProperty("--mx",(ev.clientX-r.left)+"px");g.style.setProperty("--my",(ev.clientY-r.top)+"px")},{passive:true});ui.pl={act:-1,beat:-1,busy:false,t:0};
  const a=Math.max(0,Math.min(PROLOGUE.length-1,(S.main.prologue&&S.main.prologue.act)||0));plShowAct(a)}
function plUnmount(){const el=$("#prologue");if(el)el.remove();document.documentElement.classList.remove("pl-lock");ui.pl=null}
function plFmt(t){return esc(t).replace(/&lt;g&gt;/g,'<span class="g">').replace(/&lt;\/g&gt;/g,'</span>').replace(/\n/g,"<br>").replace(/\|/g,"<wbr>")} // 「|」は文節の区切り（ここでだけ折り返す）
function plShowAct(i){const el=$("#prologue");if(!el)return;const P=ui.pl;P.act=i;P.beat=-1;P.busy=true;P.leaving=false;const seq=P.seq=(P.seq||0)+1;
  el.dataset.act=i;el.querySelector(".pl-ch").textContent=PL_NO[i]+" ・ "+PROLOGUE[i].n;el.querySelectorAll(".pl-sc").forEach(x=>x.classList.toggle("on",x.dataset.s===PROLOGUE[i].s));
  el.querySelectorAll(".pl-dots i").forEach((d,j)=>{d.className=j<i?"done":j===i?"on":""});
  el.querySelector(".pl-top [data-pl=back]").disabled=i===0;el.querySelector(".pl-top [data-pl=skip]").hidden=i===PROLOGUE.length-1;
  el.querySelector(".pl-hint").classList.remove("on");el.querySelector(".pl-cta").classList.remove("on");
  const tx=el.querySelector(".pl-text");tx.className="pl-text";tx.innerHTML="";const g=el.querySelector(".pl-glass");g.classList.remove("on");
  S.main.prologue={act:i,done:false};saveMain();
  setTimeout(()=>{if(!ui.pl||ui.pl.seq!==seq)return;g.classList.add("on");setTimeout(()=>{if(ui.pl&&ui.pl.seq===seq)plBeat(0)},plD(400))},plD(PL_T.swap))}
function plBeat(j){const el=$("#prologue");if(!el||!ui.pl)return;const P=ui.pl;const seq=P.seq;const A=PROLOGUE[P.act];const B=A.b[j];P.beat=j;P.busy=true;
  el.querySelector(".pl-hint").classList.remove("on");
  const tx=el.querySelector(".pl-text");if(B.c==="big")tx.classList.add("focus");
  const rows=B.t.split("\n");const line=document.createElement("p");line.className="pl-line"+(B.c?" "+B.c:"");
  line.innerHTML=rows.map((x,i)=>'<span class="pl-ln" style="--i:'+i+'">'+plFmt(x)+'</span>').join("");tx.appendChild(line);
  requestAnimationFrame(()=>requestAnimationFrame(()=>line.classList.add("in")));
  setTimeout(()=>{if(!ui.pl||ui.pl.seq!==seq)return;P.busy=false;P.t=Date.now();
    const last=j===A.b.length-1,fin=P.act===PROLOGUE.length-1;
    if(last&&fin){el.querySelector(".pl-cta").classList.add("on");const b=el.querySelector(".pl-enter");if(b)setTimeout(()=>{try{b.focus({preventScroll:true})}catch(e){}},plD(PL_T.cta))}
    else el.querySelector(".pl-hint").classList.add("on")},plD(PL_T.in+(rows.length-1)*PL_T.stagger))}
function plGo(i){const el=$("#prologue");const P=ui.pl;if(!el||!P||P.leaving)return;P.busy=true;P.leaving=true;P.seq=(P.seq||0)+1; // 表示途中でも「戻る」「スキップ」は効く。古い表示の予定は無効にする
  el.querySelector(".pl-hint").classList.remove("on");el.querySelector(".pl-cta").classList.remove("on");el.querySelector(".pl-text").classList.add("out");
  setTimeout(()=>{if(!$("#prologue"))return;el.querySelector(".pl-glass").classList.remove("on");plShowAct(i)},plD(PL_T.out))}
function plTap(ev){const P=ui.pl;if(!P)return;const b=ev.target.closest("[data-pl]");
  if(b){ev.stopPropagation();const v=b.dataset.pl;
    if(v==="enter")return plEnter(false);if(v==="demo")return plEnter(true);
    if(v==="skip"){if(P.act<PROLOGUE.length-1)plGo(PROLOGUE.length-1);return}
    if(v==="back"){if(P.act>0)plGo(P.act-1);return}return}
  if(P.busy||Date.now()-P.t<250)return; // 連続タップで飛ばさない
  const A=PROLOGUE[P.act];if(P.beat<A.b.length-1)plBeat(P.beat+1);else if(P.act<PROLOGUE.length-1)plGo(P.act+1)}
function plEnter(demo){const el=$("#prologue");if(!el)return;S.main.prologue={done:true,date:todayKey()};saveMain();
  el.classList.add("leave");setTimeout(()=>{plUnmount();if(demo){A.demo();return}ui.ob=ui.ob||{};ui.obStep=Math.max(0,flowX().indexOf("m_pick"));obAfter()},plD(PL_T.swap))}
document.addEventListener("keydown",ev=>{if(!ui.pl||!$("#prologue"))return;if(ev.key===" "||ev.key==="Enter"||ev.key==="ArrowRight"){if(ev.target&&ev.target.closest&&ev.target.closest("[data-pl]"))return;ev.preventDefault();plTap({target:$("#prologue .pl-center")})}else if(ev.key==="ArrowLeft"&&ui.pl.act>0)plGo(ui.pl.act-1)});
