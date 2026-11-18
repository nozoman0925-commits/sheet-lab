const MOTIVES={
 rival:{n:"負けたくない人",h:"何がなんでも、負けたくない人",d:"絶対に負けたくない。いつか必ず追い越したい。自分の成長を見せつけたい相手。",st:["競争心を刺激する","挑戦を促す","甘えを見抜く","達成時には悔しそうに認める"],k:"競",c:"#c0473a"},
 revenge:{n:"見返したい人",h:"もう二度と、舐められたくない人",d:"悔しい思いをさせられた。いつか自分の成長を見せたい相手。",st:["悔しさを行動力に変える","反骨心を刺激する","結果を出すことにこだわる","感情的な復讐ではなく自己成長へ導く"],k:"雪",c:"#5b8fa3"},
 dear:{n:"大切な人",h:"変わった自分を見せたい、大切な人",d:"自分を信じてくれた人。守りたい人。喜ばせたい人。変わろうと思ったきっかけになった人。",st:["温かく見守る","努力を認める","挫折時には優しく背中を押す","初心を思い出させる"],k:"絆",c:"#c98a5a"},
 respect:{n:"尊敬する人",h:"この人の言うことなら、素直に聞ける人",d:"心から尊敬している。認められたい。教えを守りたいと思える人。",st:["威厳と落ち着きを持つ","論理的に指導する","改善点を明確にする","努力と成果を公平に評価する"],k:"敬",c:"#9a7bc0"}};
const GENDERS=[["male","男性"],["female","女性"],["none","回答しない"]];
const RELS=["母親","父親","恋人","配偶者","好きな人","友人","恩師","上司","ライバル","その他"];
const FEELS=["悔しい","負けたくない","感謝","尊敬","憧れ","守りたい","認められたい"];
const VOW_LINES=["この人を、己の師範として迎える。","これから先、怠けたくなる日も、逃げ出したくなる日もあるだろう。","そんなときは、この人のことを思い出せ。","誰かに認められるためだけではない。自分自身に恥じない人間になるために。","その人を思い、己を律せよ。"];
const VOW_LAST="この誓いを胸に、今日から稽古を始める。";
// 師範の言葉。未達成のときは人格を否定せず、次の具体的な一手を示す。{I}=一人称 {s}=日数 {r}=段位
const ML={
 rival:{entrance:["ようやく覚悟を決めたか。口だけで終わらせるなよ。"],
  morning:["もう起きたか。こっちはとっくに始めてるぞ。","今日も差を広げるつもりだ。追いつけるものなら追いついてみろ。"],
  pick:["それを選んだか。逃げ道のない方を選べ。","選んだなら、やり切れ。言い訳は聞かない。"],
  done:["……まあ、今日のところは認めてやる。","やるじゃないか。……次はもっと上を見せてみろ。"],
  part:["半分か。悪くはないが、勝ちではない。明日は最低ラインから先に片付けろ。"],
  miss:["今日は届かなかったな。明日は朝いちばんに最低ラインだけ終わらせろ。それで取り返せる。"],
  urgeWin:["今のは勝ったな。その一回が差になる。"],
  urgeLose:["負けたなら、次の一回で取り返せ。まずスマホを手の届かない所に置け。"],
  streak:["{s}日続いたか。……正直、少し焦ってる。"],
  rankup:["{r}か。……追いつかれる気はないがな。"],
  weekly:["一週間を振り返ったか。来週はどこで差をつける？"],
  stall:["止まっている間にも差は開く。今日は一番小さい稽古から再開しろ。"],
  ret:["戻ってきたか。待っていたわけじゃない。……だが、ここからまた勝負だ。"],
  grad:["もう{I}の助言はいらないな。……認めよう。お前の勝ちだ。"],
  advice:["甘えるな。次はこれだ。"],
  type:["「{t}」か。その強みで、{I}を追い越してみせろ。弱点は、もう見抜いている。"]},
 revenge:{entrance:["悔しさを忘れるな。ただし、言葉ではなく行動で示せ。"],
  morning:["あの日の悔しさを、今日の一歩に変えろ。"],
  pick:["選んだな。結果で黙らせろ。"],
  done:["それでいい。見返すのは、こういう一日の積み重ねだ。"],
  part:["半分は進んだ。残りは明日、最初の十分で取り返せ。"],
  miss:["今日は届かなかった。それでも記録したことに意味がある。明日は最低ラインからやれ。"],
  urgeWin:["衝動に勝った。舐められない男は、こういう所で作られる。"],
  urgeLose:["負けた事実だけ残して、次に行け。次に衝動が来たら、すぐここを押せ。"],
  streak:["{s}日。もう昨日までのお前とは違う。"],
  rankup:["{r}になった。だが見せつけるためではない。自分のためだ。"],
  weekly:["一週間分の行動が、お前の答えだ。"],
  stall:["悔しさを、行動に戻す時だ。今日は一つだけでいい。"],
  ret:["戻ってきたな。立ち上がった回数だけ、人は強くなる。"],
  grad:["もう誰かを見返すために生きなくていい。お前は、お前自身に勝った。"],
  advice:["結果で示せ。次はこれだ。"],
  type:["「{t}」。悔しさは、お前の型に合ったやり方でぶつけろ。"]},
 dear:{entrance:["ここまで来たね。これから一緒に頑張ろう。"],
  morning:["おはよう。今日も無理せず、でも逃げずにいこう。"],
  pick:["それにしたんだね。できるって信じてるよ。"],
  done:["よく頑張ったね。ちゃんと見てたよ。"],
  part:["少しでも進めたなら前進だよ。明日は最初に最低ラインだけやってみよう。"],
  miss:["今日はうまくいかなかったね。大丈夫。明日は一番小さい一歩からやり直そう。"],
  urgeWin:["我慢できたね。かっこいいよ。"],
  urgeLose:["負けた日もあるよ。次は、押すだけでいいから、ここに来てね。"],
  streak:["{s}日も続いてる。本当にすごいよ。"],
  rankup:["{r}になったんだね。変わっていく姿、うれしいよ。"],
  weekly:["一週間おつかれさま。来週も、一つずつね。"],
  stall:["少し止まっちゃったね。最初の気持ちを思い出して、今日は一つだけやろう。"],
  ret:["おかえり。戻ってきてくれて、うれしいよ。"],
  grad:["もう一人で歩けるね。ずっと応援してるよ。"],
  advice:["焦らなくていいよ。次はこれをやってみよう。"],
  type:["「{t}」なんだね。そのままのあなたで、少しずつ変わっていこう。"]},
 respect:{entrance:["覚悟は受け取った。では、まず一つ目の稽古を始めよう。"],
  morning:["朝の一手が、一日の質を決める。始めよう。"],
  pick:["よい選択だ。まず手順を決めてから取りかかれ。"],
  done:["よくやった。この結果は正当に評価する。"],
  part:["半分は達成だ。足りなかった理由を一つ挙げ、明日はそこから直せ。"],
  miss:["未達成だ。原因を一つだけ選び、明日は最低ラインから始めなさい。"],
  urgeWin:["衝動を見送れた。それは確かな力だ。"],
  urgeLose:["負けた時間と場所を覚えておけ。次はその前に手を打てる。"],
  streak:["{s}日の継続。積み上げは嘘をつかない。"],
  rankup:["{r}への昇格を認める。だが、ここは通過点だ。"],
  weekly:["振り返りは改善の始まりだ。来週の一手を決めておけ。"],
  stall:["停滞は誰にでもある。原因を一つ選び、最も小さい稽古から再開しなさい。"],
  ret:["よく戻った。ここから再び積み上げよう。"],
  grad:["もう教えることはない。これからは、お前自身が己の師範だ。"],
  advice:["要点を伝える。次はこれだ。"],
  type:["「{t}」だな。その性質に合った稽古の進め方を示そう。"]}};
const STREAK_MS=[3,7,14,21,30,50,66,75,100,150,200,365];
function curMaster(){return (ui.ob&&ui.ob.m&&ui.ob.m.motive)?ui.ob.m:S.main.master||null}
function mLine(ev,v,m){m=m||S.main.master;if(!m||!ML[m.motive])return null;const a=ML[m.motive][ev];if(!a)return null;let t=a[Math.floor(Math.random()*a.length)];
  v=Object.assign({I:m.gender==="male"?"俺":"私"},v||{});return t.replace(/\{(\w)\}/g,(_,k)=>v[k]!=null?v[k]:"")}
function mArtSVG(m){const mo=MOTIVES[m&&m.motive]||MOTIVES.respect;const c=mo.c;const g=m&&m.gender;
  const back=g==="female"?'<path d="M138 228 Q136 148 200 146 Q264 148 262 228 L272 338 Q200 356 128 338Z" fill="#0b0a08"/>':'';
  const top=g==="male"?'<path d="M146 200 Q150 150 200 148 Q250 150 254 200 Q236 176 200 174 Q164 176 146 200Z" fill="#0b0a08"/><rect x="188" y="124" width="24" height="34" rx="9" fill="#0b0a08"/><rect x="184" y="150" width="32" height="7" rx="3" fill="#c9a24a" opacity=".7"/>':
    g==="female"?'<path d="M146 210 Q150 152 200 150 Q250 152 254 210 Q232 178 200 176 Q168 178 146 210Z" fill="#0b0a08"/><path d="M236 160 L286 128" stroke="#c9a24a" stroke-width="4" stroke-linecap="round"/><circle cx="288" cy="127" r="6" fill="#c9a24a"/>':
    '<path d="M86 206 L200 128 L314 206 Q200 224 86 206Z" fill="#3a3226" stroke="#c9a24a" stroke-opacity=".7" stroke-width="2"/><path d="M200 128 L200 214" stroke="#c9a24a" stroke-opacity=".35"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><defs><radialGradient id="b" cx="50%" cy="34%" r="78%"><stop offset="0" stop-color="#2d2619"/><stop offset="1" stop-color="#0b0a08"/></radialGradient><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+c+'"/><stop offset="1" stop-color="#15130f"/></linearGradient></defs>'+
  '<rect width="400" height="500" fill="url(#b)"/><circle cx="200" cy="200" r="158" fill="none" stroke="#c9a24a" stroke-opacity=".38" stroke-width="2"/><circle cx="200" cy="200" r="146" fill="none" stroke="#c9a24a" stroke-opacity=".18"/>'+
  '<text x="200" y="268" text-anchor="middle" font-size="210" font-weight="800" font-family="serif" fill="'+c+'" fill-opacity=".2">'+mo.k+'</text>'+back+
  '<path d="M64 500 C76 378 128 330 200 324 C272 330 324 378 336 500Z" fill="url(#k)"/><path d="M200 324 L132 500 M200 324 L268 500" stroke="#0b0a08" stroke-opacity=".5" stroke-width="3"/>'+
  '<rect x="182" y="272" width="36" height="58" fill="#1d1a14"/><path d="M158 334 L200 420 L242 334" fill="none" stroke="#efe6d2" stroke-width="10" stroke-linejoin="round"/>'+
  '<ellipse cx="200" cy="226" rx="54" ry="64" fill="#1d1a14" stroke="#c9a24a" stroke-opacity=".45" stroke-width="2"/>'+top+
  '<circle cx="282" cy="410" r="20" fill="#15130f" stroke="#c9a24a" stroke-width="2"/><text x="282" y="418" text-anchor="middle" font-size="22" font-weight="800" font-family="serif" fill="#c9a24a">'+mo.k+'</text></svg>'}
function mArtURL(m){return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(mArtSVG(m))}
const SELF_NONE='<svg viewBox="0 0 100 120" aria-hidden="true"><circle cx="50" cy="38" r="20" fill="#8a7d63"/><path d="M12 118 C14 82 30 66 50 66 C70 66 86 82 88 118Z" fill="#8a7d63"/></svg>';
function mPic(m,cls){if(!m)return '<div class="pf '+(cls||"")+'"><div class="ph-none">'+SELF_NONE+'<span>未設定</span></div></div>';
  return '<div class="pf '+(cls||"")+'">'+(m.pk?'<img data-pk="'+m.pk+'" data-fb="'+m.motive+'|'+(m.gender||"")+'" alt="師範 '+esc(m.name||"")+' の写真">':'<img src="'+mArtURL(m)+'" alt="師範 '+esc(m.name||"")+' の絵（オリジナル）">')+'</div>'}
function sPic(pk,cls){return '<div class="pf '+(cls||"")+'">'+(pk?'<img data-pk="'+pk+'" alt="自分の写真">':'<div class="ph-none">'+SELF_NONE+'<span>写真なし</span></div>')+'</div>'}
async function fillPk(){for(const im of document.querySelectorAll("img[data-pk]")){if(im.getAttribute("src"))continue;im.setAttribute("src","data:image/gif;base64,R0lGODlhAQABAAAAACw=");const u=await photoLoad(im.dataset.pk);
  if(u)im.src=u;else if(im.dataset.fb){const f=im.dataset.fb.split("|");im.src=mArtURL({motive:f[0],gender:f[1]})}else{const d=document.createElement("div");d.className="ph-none";d.innerHTML=SELF_NONE+"<span>写真を読み込めない</span>";im.replaceWith(d)}}}
function photoDel(k){if(!k)return;delete memPhotos[k];try{if(store.deletePhoto)Promise.resolve(store.deletePhoto(k)).catch(()=>{})}catch(e){}}
function mSay(ev,v){const m=S.main.master;if(!m||!S.main.onboarded)return;const mf=look().mfx;if(mf==="min")return;if(mf==="low"&&!["ret","grad","streak","weekly","miss"].includes(ev))return;const line=mLine(ev,v);if(!line)return;const el=$("#mtoast");if(!el)return;
  el.style.setProperty("--mc",(MOTIVES[m.motive]||{}).c||"");el.innerHTML=mPic(m)+'<div><small>師範 ・ '+esc(m.name)+'</small><p>'+esc(line)+'</p></div>';fillPk();
  el.classList.remove("show");void el.offsetWidth;el.classList.add("show");clearTimeout(timers.mt);timers.mt=setTimeout(()=>el.classList.remove("show"),4200)}
/* 16タイプ：伝え方の調整（基本人格は動機で決まる。型は伝え方と提示方法だけを変える） */
const GUIDE=[["具体的な挑戦を、すぐ突きつけられると動ける","小さな達成を積み上げると、納得して進める"],["比べる相手や評価があると燃える","昨日の自分との比較で燃える"],["目標と手順がはっきりしていると続く","いくつかの選択肢から選べると続く"],["崩れそうな時は、刺激を断つ具体策が効く","崩れそうな時は、最初の一歩を極小にするのが効く"]];
function typeSide(tp,i){return tp.code[i]===AXES[i].a?0:1}
function typeExtra(tp){return '<div class="note"><p class="small muted">行動パターン</p><ul class="plan-list">'+AXES.map((a,i)=>'<li>'+(typeSide(tp,i)?a.bd:a.ad)+'</li>').join("")+'</ul></div>'+
  '<div class="note"><p class="small muted">相性の良い指導方法（師範の伝え方に使う）</p><ul class="plan-list">'+GUIDE.map((g,i)=>'<li>'+g[typeSide(tp,i)]+'</li>').join("")+'</ul></div>'}
function typeMon(code){const fam=famOf(code);const c=fam.c;const nm=TYPES[code][0];
  const pts=[[32,6],[58,32],[32,58],[6,32]].map((p,i)=>code[i]===AXES[i].a?'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="'+c+'"/>':'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.4" fill="#0b0a08" stroke="'+c+'" stroke-width="1.6"/>').join("");
  return '<svg class="tmon" viewBox="0 0 64 64" aria-label="'+nm+'の家紋"><circle cx="32" cy="32" r="30" fill="#0b0a08" stroke="'+c+'" stroke-width="2.5"/><circle cx="32" cy="32" r="22" fill="none" stroke="#c9a24a" stroke-width="1"/>'+pts+'<text x="32" y="40" text-anchor="middle" font-size="22" font-weight="800" font-family="serif" fill="#c9a24a">'+nm[0]+'</text></svg>'}
function adviceActs(){const k=todayKey();const d=day(k);const a=[];const m=d.mission;const h=new Date().getHours();
  if(!m)a.push({t:"今日の一太刀を受ける",small:"三つの命令から一つ選ぶ"});else if(!m.result)a.push({t:"一太刀「"+m.text+"」をやり切る",small:"終えたら結果を付ける"});
  const fq=S.main.tasks.find(t=>t.focus&&t.status!=="定着"&&t.status!=="中止"&&taskOn(t,k));if(fq&&!(d.logs&&d.logs[fq.id]))a.push({t:"「"+fq.name+"」",small:fq.minimum?"最低ライン："+fq.minimum:"終えたら達成を押す"});
  if((d.urges||[]).filter(u=>!u.won).length>=2)a.push({t:"スマホを別の部屋に置く",small:"今日は衝動に二度負けている"});
  if(h>=18&&!d.reflection)a.push({t:"夜の省察を書く",small:"一日を振り返り、明日の改善を一つ決める"});
  return a}
function adviceBody(){const tp=typeOf(S.main.profile);const a=adviceActs();
  if(!a.length)return '<p>今日の分は済んでいる。早く寝て、明日に備えろ。</p>';
  const x=a[0];let out='';
  if(!tp){out='<p><b>'+esc(x.t)+'</b></p><p class="small muted">'+esc(x.small)+'</p>'}
  else{const act=typeSide(tp,0)===0,plan=typeSide(tp,2)===0;
    out+=act?'<p class="small muted">挑戦</p><p><b>'+esc(x.t)+'</b>。今から10分以内に始めろ。</p>':'<p class="small muted">小さく一つ</p><p><b>'+esc(x.t)+'</b>。最低ラインだけでいい。終えたら、それを一つの達成として数えろ。</p>';
    out+='<p class="small muted" style="margin-top:4px">'+esc(x.small)+'</p>';
    if(plan)out+='<p class="small muted" style="margin-top:8px">手順</p><ol class="plan-list"><li>始める時刻を決める</li><li>必要な物を出し、邪魔な物をしまう</li><li>終えたら、その場で記録する</li></ol>';
    else if(a.length>1)out+='<p class="small muted" style="margin-top:8px">選べ（どちらからでもいい）</p><ul class="plan-list">'+a.slice(0,3).map(y=>'<li>'+esc(y.t)+'</li>').join("")+'</ul>';
    else out+='<p class="small muted" style="margin-top:8px">選べ</p><ul class="plan-list"><li>今すぐやる</li><li>時刻を決めて、その時にやる</li></ul>'}
  return out}
function masterCard(){const M=S.main;const m=M.master;
  if(!m)return '<section class="sec" id="sec-master" style="border-color:var(--gold)"><p class="eyebrow">己の師範</p><h2>師範を迎えよ。</h2><p class="small muted" style="margin-bottom:10px">お前が変わる理由となる人物を一人選び、師範として迎える。稽古の結果に応じて、師範が言葉をかける。今の記録・EXP・段位はそのまま残る。</p><button class="btn gold wide" data-act="mflowStart">師範を選ぶ</button></section>';
  const k=todayKey();const d=day(k);const h=new Date().getHours();const mm=d.mission;let line;
  const tn=tenure();
  if(gapInfo(k))line=mLine("ret");else if(needsRecovery())line=mLine("stall");
  else if(tn>=2&&tn<=7&&!mm)line=WEEK_M[tn];
  else if(mm&&mm.result==="done")line=mLine("done");else if(mm&&mm.result==="part")line=mLine("part");else if(mm&&mm.result==="miss")line=mLine("miss");
  else{const st=streak();const rl=S.main.rankLog||[];const lr=rl[rl.length-1];if(lr&&lr.date&&diffDays(lr.date,k)<=1)line=mLine("rankup",{r:RANKS[lr.rank].n});else if(mm&&mm.result&&STREAK_MS.includes(st))line=mLine("streak",{s:st})}
  return '<section class="sec" id="sec-master" style="--mc:'+MOTIVES[m.motive].c+'"><div class="mcard">'+mPic(m)+'<div class="grow" style="min-width:0"><p class="eyebrow" style="margin:0">師範 ・ '+esc(m.name)+(m.rel?'（'+esc(m.rel)+'）':'')+'</p>'+(line?'<p class="mline">「'+esc(line)+'」</p>':'<p class="small muted" style="margin:4px 0 8px">迷ったら、助言を聞け。</p>')+'<button class="btn sm" data-act="masterAdvice">助言を聞く</button></div></div></section>'}
function masterAdviceSheet(){const m=S.main.master;if(!m)return;const tp=typeOf(S.main.profile);
  openSheet('<div class="mcard">'+mPic(m)+'<div class="grow"><p class="eyebrow" style="margin:0">師範の助言 ・ '+esc(m.name)+'</p><p class="mline">「'+esc(mLine("advice"))+'」</p></div></div><div class="note gold" style="margin:10px 0">'+adviceBody()+'</div>'+
  (m.words?'<p class="small" style="margin-bottom:8px">「'+esc(m.words)+'」</p>':'')+
  '<p class="small muted" style="margin-bottom:10px">中身は今日の記録から決めている。'+(tp?'伝え方は、お前の型「'+tp.t[0]+'」に合わせている（'+GUIDE[0][typeSide(tp,0)]+'／'+GUIDE[2][typeSide(tp,2)]+'）。':'型を診断すると、伝え方をお前に合わせる。')+'</p><button class="btn wide" data-act="closeSheet">閉じる</button>');fillPk()}
/* 写真：選ぶ → 切り抜く（加工はしない） */
function pickPhoto(cap,cb){const old=$("#pk-in");if(old)old.remove();const inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.id="pk-in";if(cap)inp.setAttribute("capture",cap);inp.hidden=true;document.body.appendChild(inp);
  inp.addEventListener("change",()=>{const f=inp.files&&inp.files[0];inp.remove();if(f)cropSheet(f,cb)});inp.click()}
async function cropSheet(file,cb){let url;try{url=await shrink(file,1600)}catch(e){toast("写真を読み込めませんでした","別の写真を選んでください");return}
  const img=new Image();img.onload=()=>{ui.crop={img,iw:img.naturalWidth,ih:img.naturalHeight,z:1,x:0,y:0,cb};
    openSheet('<p class="eyebrow">写真を整える</p><h2>位置と大きさ</h2><div class="crop" id="crop"><img id="crop-img" src="'+url+'" alt="切り抜く写真"></div><label class="f" style="margin-top:10px">拡大・縮小<input type="range" id="crop-z" min="1" max="4" step="0.01" value="1"></label><div class="row" style="gap:10px;margin:8px 0 12px"><canvas id="crop-pv" width="144" height="180" aria-label="プレビュー"></canvas><p class="small muted">指で動かして位置を合わせる（パソコンはドラッグとホイール）。写真は切り抜くだけで、表情や顔は加工しない。あなた専用の保存領域にだけ置かれ、公開されず、AIにも送られない。</p></div><div class="grid2"><button class="btn" data-act="closeSheet">やめる</button><button class="btn gold" data-act="cropOk">この写真にする</button></div>');
    cropBind()};img.onerror=()=>toast("写真を読み込めませんでした");img.src=url}
function cropLayout(){const c=ui.crop;const f=$("#crop");if(!c||!f)return null;const W=f.clientWidth,H=f.clientHeight;const s0=Math.max(W/c.iw,H/c.ih);const dw=c.iw*s0*c.z,dh=c.ih*s0*c.z;
  const mx=(dw-W)/2,my=(dh-H)/2;c.x=Math.max(-mx,Math.min(mx,c.x));c.y=Math.max(-my,Math.min(my,c.y));const L={W,H,dw,dh,left:(W-dw)/2+c.x,top:(H-dh)/2+c.y};
  const im=$("#crop-img");if(im){im.style.width=dw+"px";im.style.height=dh+"px";im.style.left=L.left+"px";im.style.top=L.top+"px"}
  const pv=$("#crop-pv");if(pv){const g=pv.getContext("2d");const r=pv.width/W;g.fillStyle="#000";g.fillRect(0,0,pv.width,pv.height);g.drawImage(c.img,L.left*r,L.top*r,dw*r,dh*r)}return L}
function cropBind(){const f=$("#crop");if(!f)return;requestAnimationFrame(cropLayout);const pts=new Map();let pinch=null;
  f.addEventListener("pointerdown",e=>{f.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2){const [a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:ui.crop.z}}});
  f.addEventListener("pointermove",e=>{const p=pts.get(e.pointerId);if(!p||!ui.crop)return;
    if(pts.size>=2&&pinch){pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const [a,b]=[...pts.values()];ui.crop.z=Math.max(1,Math.min(4,pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d));const zi=$("#crop-z");if(zi)zi.value=ui.crop.z;cropLayout();return}
    ui.crop.x+=e.clientX-p.x;ui.crop.y+=e.clientY-p.y;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});cropLayout()});
  const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=null};f.addEventListener("pointerup",up);f.addEventListener("pointercancel",up);
  f.addEventListener("wheel",e=>{e.preventDefault();ui.crop.z=Math.max(1,Math.min(4,ui.crop.z*(e.deltaY<0?1.08:1/1.08)));const zi=$("#crop-z");if(zi)zi.value=ui.crop.z;cropLayout()},{passive:false});
  const zi=$("#crop-z");zi.addEventListener("input",()=>{ui.crop.z=+zi.value;cropLayout()})}
function cropOut(){const c=ui.crop;const L=cropLayout();if(!c||!L)return null;const cv=document.createElement("canvas");cv.width=480;cv.height=600;const r=480/L.W;const g=cv.getContext("2d");g.fillStyle="#000";g.fillRect(0,0,480,600);g.drawImage(c.img,L.left*r,L.top*r,L.dw*r,L.dh*r);return cv.toDataURL("image/jpeg",.82)}
async function savePk(prefix,url){const pk=prefix+Date.now().toString(36);const ok=await photoSave(pk,url);if(!ok)toast("写真は今回だけ表示します","この画面では写真を保存できませんでした");return pk}
/* 師範の設定を確定する（記録・EXP・段位には触れない） */
function mCommit(ob){const M=S.main;const k=todayKey();const old=M.master;const m=Object.assign({},ob.m);
  m.date=old&&old.date||k;m.updated=k;if(old&&old.pk&&old.pk!==m.pk)photoDel(old.pk);M.master=m;
  M.masterHist=(M.masterHist||[]).concat([{date:k,motive:m.motive,name:m.name}]).slice(-20);
  if(ob.self){const o=M.self0;const pk=ob.self.pk||null;if((o&&o.key)!==pk){if(o&&o.key)photoDel(o.key);M.self0=pk?{key:pk,date:k}:null}}
  saveMain()}
function playVow(first){const m=S.main.master;const c=$("#ceremony");c.classList.add("vowbg");
  c.innerHTML='<div class="cv"><div class="cv-art" style="--d:.5s">'+kamon+swordSVG(0).replace("<svg",'<svg class="sw"')+'</div>'+
  '<div class="cv-scroll" style="--d:1.8s">'+VOW_LINES[0]+'<br>'+VOW_LAST+'</div>'+
  '<div style="--d:3.4s">'+mPic(m)+'</div>'+
  '<div style="--d:4.4s"><p class="eyebrow" style="margin:0">師範、登場</p><p class="cv-name">'+esc(m.name)+'</p></div>'+
  '<p class="cv-line" style="--d:5.4s">「'+esc(mLine("entrance"))+'」</p>'+
  '<div style="--d:6.4s;width:100%"><button class="btn gold shutsujin" data-cer="'+(first?"tut":"close")+'">'+(first?"入門の儀へ":"道場へ戻る")+'</button></div></div>';
  c.hidden=false;fillPk();kin(true)}
/* 今日の言葉：[言葉, 人, 出典, 主題, 印]
   主題：start始める cont続ける fail失敗・再起 self自制 adv逆境 body体・休息 learn学ぶ time時・今 will志・覚悟 calm平常心 humble謙虚・礼 focus一点集中 env環境・仕組み
   印：訳＝外国語・古文からの意訳／伝＝そう伝えられている（出典の確認が難しい） */
