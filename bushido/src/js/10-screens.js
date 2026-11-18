function typeIdx(code){return Object.keys(TYPES).indexOf(code)+1}
function typeArt(code,small){const n=typeIdx(code);return n?"img/"+(small?"s":"t")+String(n).padStart(2,"0")+".webp":""}
function artImg(code,cls,small){return '<img class="'+cls+'" src="'+typeArt(code,small)+'" alt="'+TYPES[code][0]+'の絵" loading="lazy" onerror="this.style.display=\'none\'">'}
/* 二段構造：最初の2文字（動き方×燃える理由）で4系統に束ねる */
const FAMILY={"動誇":{n:"武将の系譜",s:"先陣を切り、勝利で燃える",c:"#c0473a"},"動道":{n:"修行者の系譜",s:"自ら動き、己の道を歩く",c:"#5b8fa3"},"静誇":{n:"軍師の系譜",s:"読み切って、勝ちを取る",c:"#9a7bc0"},"静道":{n:"求道者の系譜",s:"深く考え、己を極める",c:"#6f9f78"}};
function famOf(code){return FAMILY[code.slice(0,2)]}
function flip(code,idx){const c=code.split("");idx.forEach(i=>{const a=AXES[i];c[i]=c[i]===a.a?a.b:a.a});return c.join("")}
// 相性（遊びの目安）：相棒＝動き方と進め方が逆で、燃える理由と崩れ方が同じ／好敵手＝燃える理由だけが逆
function partners(code){return{buddy:flip(code,[0,2]),rival:flip(code,[1])}}
function typeList(mine){return Object.keys(FAMILY).map(f=>'<div class="fam"><p class="fam-h" style="--fc:'+FAMILY[f].c+'"><b>'+FAMILY[f].n+'</b><span>'+FAMILY[f].s+'</span></p>'+
  Object.keys(TYPES).filter(c=>c.slice(0,2)===f).map(c=>'<div class="tl'+(c===mine?" me":"")+'" style="--fc:'+FAMILY[f].c+'">'+artImg(c,"tl-art",true)+'<span style="min-width:0"><span class="tl-c">'+c+'</span><br><b>'+TYPES[c][0]+(c===mine?' <span class="tag gold">あなた</span>':'')+'</b><span class="small muted" style="display:block">'+TYPES[c][1]+'</span></span></div>').join("")+'</div>').join("")}
async function typeImage(tp){
  try{await Promise.all([document.fonts.load('800 120px "Shippori Mincho B1"'),document.fonts.load('500 30px "Zen Kaku Gothic New"')])}catch(e){}
  const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");const fam=famOf(tp.code);const t=tp.t;
  const D='"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif',B='"Zen Kaku Gothic New","Hiragino Sans",sans-serif';
  g.fillStyle="#0b0a08";g.fillRect(0,0,W,H);
  const img=await new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=typeArt(tp.code)});
  if(img)g.drawImage(img,0,0,W,H);
  // 下半分を暗くして文字を読めるように
  const sh=g.createLinearGradient(0,H*.42,0,H);sh.addColorStop(0,"rgba(11,10,8,0)");sh.addColorStop(.38,"rgba(11,10,8,.82)");sh.addColorStop(1,"rgba(11,10,8,.97)");g.fillStyle=sh;g.fillRect(0,H*.42,W,H*.58);
  const top=g.createLinearGradient(0,0,0,180);top.addColorStop(0,"rgba(11,10,8,.85)");top.addColorStop(1,"rgba(11,10,8,0)");g.fillStyle=top;g.fillRect(0,0,W,180);
  g.fillStyle=fam.c;g.fillRect(0,0,W,16);g.fillRect(0,H-16,W,16);
  g.strokeStyle="rgba(201,162,74,.85)";g.lineWidth=3;g.strokeRect(44,44,W-88,H-88);
  g.textAlign="left";g.fillStyle="#d8cfbd";g.font='500 28px '+B;g.fillText("武士道 ・ 武士の型診断",84,110);
  g.textAlign="right";g.fillStyle=fam.c;g.font='800 30px '+D;g.fillText(fam.n,W-84,110);
  g.textAlign="center";
  const gold=g.createLinearGradient(0,880,0,980);gold.addColorStop(0,"#f3d98a");gold.addColorStop(1,"#c9a24a");g.fillStyle=gold;g.font='800 92px '+D;g.fillText(tp.code.split("").join(" "),W/2,975);
  g.fillStyle="#f2ede3";g.font='800 104px '+D;g.fillText(t[0],W/2,1100);
  const wrap=(txt,y,size,color,maxW)=>{g.fillStyle=color;g.font='500 '+size+'px '+B;let line="",yy=y;for(const ch of txt){if(g.measureText(line+ch).width>maxW){g.fillText(line,W/2,yy);line=ch;yy+=size*1.5}else line+=ch}if(line)g.fillText(line,W/2,yy);return yy};
  wrap(t[1],1170,32,"#d8cfbd",860);
  g.fillStyle="#a39a89";g.font='500 24px '+B;g.fillText("あなたは、どの型か。",W/2,H-70);
  return c;
}
async function typeImageSheet(code){const tp=code?{code,pct:[50,50,50,50],t:TYPES[code]}:typeOf(S.main.profile)||(ui.ob&&typeOf(profileFrom(ui.ob)));if(!tp)return;
  openSheet('<p class="eyebrow">型カード</p><h2>'+tp.t[0]+'</h2><p class="small muted">準備中…</p>');
  const c=await typeImage(tp);ui.certCanvas=c;ui.certNo="type-"+tp.code;
  openSheet('<p class="eyebrow">型カード ・ '+famOf(tp.code).n+'</p><h2>'+tp.t[0]+'</h2><img src="'+c.toDataURL("image/png")+'" alt="型カードの画像" style="width:100%;border-radius:4px;border:1px solid var(--line)"><p class="small muted" style="margin:8px 0">型の名前・4文字・一言・強みと、軸の傾きだけを載せている。答えの中身や記録は入らない。</p><div class="grid2"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="certSave">画像を保存</button></div><p class="small muted" id="cert-msg" style="margin-top:6px"></p>')}
function typeCard(tp,full){const t=tp.t;const fam=famOf(tp.code);const pr=partners(tp.code);
  return '<div class="type-card has-art" style="--fc:'+fam.c+'">'+typeMon(tp.code)+artImg(tp.code,"type-art")+'<p class="fam-tag">'+fam.n+' ・ '+fam.s+'</p><p class="type-code">'+tp.code.split("").join(" ")+'</p><p class="type-name">'+t[0]+'</p><p class="small muted">'+t[1]+'</p></div>'+
  '<div class="note"><div class="axes2">'+AXES.map((a,i)=>{const bp=tp.pct[i],ap=100-bp;const isA=ap>=bp;return '<div class="ax2"><p class="small muted">'+a.k+'</p><div class="ax2-row"><b class="'+(isA?"on":"")+'">'+a.a+'</b><div class="ax2-bar"><i style="left:0;width:'+ap+'%" class="'+(isA?"on":"")+'"></i><i style="right:0;width:'+bp+'%" class="'+(isA?"":"on")+'"></i></div><b class="'+(isA?"":"on")+'">'+a.b+'</b></div><p class="small muted">'+(isA?a.ad+" "+ap+"%":a.bd+" "+bp+"%")+(bp>=40&&bp<=60?'<span style="color:var(--gold-hi)">（境界：両方の面を持つ）</span>':'')+'</p></div>'}).join("")+'</div></div>'+
  (full?'<div class="note"><p class="small muted">こんな男</p><ul class="plan-list">'+t[2].map(x=>'<li>'+x+'</li>').join("")+'</ul></div><div class="grid2 tgrid"><div class="note"><p class="small muted">強み</p><p>'+t[3]+'</p></div><div class="note"><p class="small muted">注意すべき傾向</p><p>'+t[4]+'</p></div></div><div class="note gold"><p class="small muted">成長戦略（お前の戦い方）</p><p>'+t[5]+'</p></div>'+typeExtra(tp)+
  '<div class="grid2 tgrid"><div class="note">'+artImg(pr.buddy,"pr-art",true)+'<p class="small muted">相棒（補い合う型）</p><p><b>'+TYPES[pr.buddy][0]+'</b> <span class="small muted">'+pr.buddy+'</span></p><p class="small muted">足りないものを持ち、同じ物に燃える。</p></div><div class="note">'+artImg(pr.rival,"pr-art",true)+'<p class="small muted">好敵手（張り合う型）</p><p><b>'+TYPES[pr.rival][0]+'</b> <span class="small muted">'+pr.rival+'</span></p><p class="small muted">動き方は同じで、燃える理由が逆。張り合うと互いに伸びる。</p></div></div>'+
  '<button class="btn wide" data-act="typeImg" style="margin-top:2px">型カードを画像で保存</button>'+
  '<p class="small muted" style="margin-top:8px">これは自己理解のための参考分類で、医学的・心理学的な診断ではなく、性格を固定するものでもない。稽古の難しさは型だけで決めず、現在地・体の制約・生活・達成の記録から決める。五分五分の軸は、両方の面を持つと読め。</p>':'')}
/* 甘えた答えへの言葉（心・けが・医師の制限・睡眠時間の答えには何も言わない） */
const TAUNT={b3:"鏡を見ろ。それが今までの選択の合計だ。",b4:"体を動かさない男が、人生を動かせると思うな。",b5:"腕立て一回もできない男が、いざという時に何を守れる。",b6:"自分の体重すら持ち上げられないのか。",b7:"階段で息が切れる体は、もう警告を出している。",b8:"椅子と布団の往復を、人生と呼ぶな。",
 s4:"目覚ましに負ける男が、誘惑に勝てるわけがない。",s5:"寝る直前まで画面を見て「眠れない」と言うな。自分でやっている。",s6:"朝を抜いて、昼に疲れたと言うのか。",s7:"夕方のカフェインで夜を壊し、朝に負ける。自分で仕掛けた罠だ。",s9:"休日に寝坊して、月曜に死んだ顔をする。その繰り返しを断て。",
 f1:"コンビニに生かされているうちは、自分を養えているとは言わない。",f2:"甘い物でご機嫌を取る毎日。大の男が、子供と何が違う。",f3:"毎晩の酒は、休息ではない。逃避だ。",f4:"何も考えずに食べた物で、強い体ができると思うな。",f5:"夜中に食べて、朝に後悔する。それを何年続ける気だ。",
 d1:"一日の三分の一を、他人が作った画面に差し出している。それはお前の人生か。",d2:"数えきれないほど開くなら、お前はもう操られている。",d3:"止まらないのではない。止めないのだ。",d4:"画面の中で強くなって、現実で何が変わった。",d5:"衝動で買った物の数だけ、自分に負けている。",d6:"欲に毎日手綱を渡す男に、自分を律せるはずがない。",
 o1:"床に物が散らばった部屋は、そのままお前の頭の中だ。",o2:"物に埋もれた机で、何を成し遂げるつもりだ。",o3:"洗濯物すら片付けられない男に、人生が片付くか。",o4:"見た目を気にしないのは男らしさではない。ただの手抜きだ。",o5:"毎日鍵を探している時間を、合計してみろ。",
 k1:"一冊も読まずに、自分の頭で考えていると思うな。",k2:"学ぶのをやめた日から、人は衰え始める。",k4:"5分も集中できないのは、才能ではない。習慣の問題だ。",
 a1:"「明日やる」と言い続けた明日が、今日だ。",a2:"予定のない一日は、他人と画面に奪われる一日だ。",a3:"時間を守れない男は、信用を少しずつ失っている。",a4:"迷っている間に、選択肢は勝手に消えていく。",a5:"苦手から逃げ続ける男に、強くなる日は来ない。"};
const TONES=[{v:"oni",t:"鬼",s:"容赦なく言え。少しでも甘えた答えには罵倒を"},{v:"gen",t:"厳",s:"最も甘えた答えにだけ、厳しく言え"},{v:"on",t:"穏",s:"煽りはいらない。結果だけ見せろ"}];
function tauntFor(qid,score,tone){if(!tone||tone==="on"||!TAUNT[qid]||score==null)return null;if(score>=3||(tone==="oni"&&score>=2))return TAUNT[qid];return null}
// [ID, 章, 質問, 選択肢（"文:点" 点が高いほど課題が大きい。点なしは集計しない）, 種類]
const QS_RAW=[
 ["b1","body","年代は？","10代|20代|30代|40代|50代|60代以上"],
 ["b3","body","自分の体型は？","やせている:1|ふつう:0|やや太め:2|太め:3"],
 ["b4","body","運動はどのくらいしている？","ほぼしない:3|週1〜2回:2|週3〜4回:1|ほぼ毎日:0"],
 ["b5","body","腕立て伏せは、続けて何回できる？","0回:3|1〜10回:2|11〜30回:1|31回以上:0"],
 ["b6","body","スクワットは、続けて何回できる？","0〜10回:3|11〜30回:2|31〜50回:1|51回以上:0"],
 ["b7","body","階段で3階まで上ると？","息が切れる:3|少し切れる:2|平気:0"],
 ["b8","body","1日に歩く時間は？","ほとんど歩かない:3|30分未満:2|30〜60分:1|1時間以上:0"],
 ["b9","body","痛みやけががある所は？","腰|膝|肩|手首|ない","multi"],
 ["b10","body","医師から運動を止められている、または運動に注意が必要な持病がある？","はい|いいえ"],
 ["s1","sleep","いつも起きる時刻と、寝る時刻は？","","times"],
 ["s3","sleep","1日の睡眠時間は？","5時間未満:3|5〜6時間:2|6〜7時間:1|7時間以上:0"],
 ["s4","sleep","朝、目覚ましで起きられる？","ほぼ起きられない:3|二度寝が多い:2|だいたい起きる:1|すぐ起きる:0"],
 ["s5","sleep","寝る直前までスマホを見る？","毎日:3|よく見る:2|たまに:1|見ない:0"],
 ["s6","sleep","朝ごはんは？","食べない:2|たまに:1|毎日:0"],
 ["s7","sleep","午後4時以降にコーヒーなどカフェインをとる？","毎日:2|たまに:1|とらない:0"],
 ["s8","sleep","日中の眠気は？","強い:3|ある:2|少し:1|ない:0"],
 ["s9","sleep","休日の起きる時刻は、平日と比べて？","3時間以上遅い:3|1〜2時間遅い:2|少し遅い:1|同じ:0"],
 ["f1","food","自炊はする？","しない:2|週1〜2回:1|週3回以上:0"],
 ["f2","food","甘い物や甘い飲み物は？","毎日:3|週に数回:2|たまに:1|とらない:0"],
 ["f3","food","お酒は？","ほぼ毎日:3|週に数回:2|たまに:1|飲まない:0"],
 ["f4","food","タンパク質（肉・魚・卵・大豆）を意識している？","していない:2|少し:1|毎食:0"],
 ["f5","food","夜遅くの食事や夜食は？","毎日:3|よくある:2|たまに:1|ない:0"],
 ["d1","desire","仕事以外でスマホを使う時間は、1日どのくらい？","1時間未満:0|1〜3時間:1|3〜5時間:2|5時間以上:3"],
 ["d2","desire","目的もなくSNSを開く回数は？","数えきれない:3|1日10回以上:2|数回:1|ほぼ開かない:0"],
 ["d3","desire","動画を見始めると止まらない？","いつも:3|よく:2|たまに:1|ない:0"],
 ["d4","desire","ゲームの時間は？","1日2時間以上:3|1〜2時間:2|少し:1|しない:0"],
 ["d5","desire","衝動買いは？","よくある:3|たまに:2|まれ:1|ない:0"],
 ["d6","desire","ポルノを見る頻度は？","ほぼ毎日:3|週に数回:2|たまに:1|見ない:0|答えない"],
 ["d7","desire","いちばん抗えない誘惑は？","SNS|動画|ゲーム|夜更かし|食べ物・お酒|買い物|ポルノ|特にない"],
 ["o1","order","部屋の床は？","物が散乱している:3|やや散らかっている:2|だいたい片付いている:1|物がない:0"],
 ["o2","order","机の上は？","物で埋まっている:3|半分くらい:2|少しある:1|空:0"],
 ["o3","order","洗濯物は？","溜めがち:3|干したまま:2|たまに溜まる:1|すぐ畳む:0"],
 ["o4","order","外に出るときの身だしなみは？","気にしない:3|最低限:2|整える:1|毎日きちんと:0"],
 ["o5","order","鍵や財布を探すことは？","毎日:3|よくある:2|たまに:1|ない:0"],
 ["k1","know","本は月に何冊読む？","0冊:3|1冊:2|2〜3冊:1|4冊以上:0"],
 ["k2","know","勉強の習慣は？","ない:3|気が向いたら:2|週に数回:1|毎日:0"],
 ["k3","know","いま一番学びたいことは？","資格|語学|仕事の技術|お金|教養・歴史|特にない"],
 ["k4","know","集中が続く時間は？","5分:3|15分:2|30分:1|1時間以上:0"],
 ["a1","act","やるべきことを先延ばしにする？","いつも:3|よく:2|たまに:1|しない:0"],
 ["a2","act","1日の予定を立てる？","立てない:3|頭の中だけ:2|たまに書く:1|毎日書く:0"],
 ["a3","act","約束の時間は？","遅れがち:3|ぎりぎり:2|間に合う:1|5分前に着く:0"],
 ["a4","act","決めるのは？","なかなか決められない:3|迷う:2|まあ決める:1|すぐ決める:0"],
 ["a5","act","苦手なことには？","避ける:3|ぎりぎりまで放置:2|やる:1|真っ先に手をつける:0"],
 ["m1","mind","この2週間で、気分が沈んだ日は？","ほとんど毎日:3|半分以上:2|数日:1|ない:0"],
 ["m2","mind","ストレスは？","とても強い:3|強い:2|少し:1|ない:0"],
 ["m3","mind","「一度失敗すると、自分を責めてやめてしまう」","当てはまる:3|少し当てはまる:2|当てはまらない:0"],
 ["m4","mind","「やると決めても、数日で終わってしまう」","当てはまる:3|少し当てはまる:2|当てはまらない:0"],
 ["m5","mind","「人に見られていないと、つい手を抜いてしまう」","当てはまる:3|少し当てはまる:2|当てはまらない:0"],
 ["m6","mind","自分のことが？","嫌い:3|あまり好きじゃない:2|ふつう:1|好き:0"],
 ["g1","resolve","今、いちばん変えたいことは？","朝、決めた時間に起きられない|体を鍛えたい・体型を変えたい|スマホや娯楽に時間を奪われる|部屋や身だしなみが乱れがち|勉強や読書が続かない|やるべきことを先延ばしにする","multi"],
 ["g2","resolve","1日のうち、修行に使える時間は？","5分|15分|30分|1時間以上"],
 ["g3","resolve","どのくらい厳しく鍛えますか？","まずは無理なく|しっかり|徹底的に"]
];
[["l6","life","翌日に向けて、準備が要るものは？（当てはまるものすべて）","翌日の予定確認|必要書類の確認|道具・持ち物の準備|衣服・制服の準備|PC・スマートフォンの準備|移動経路・出発時間の確認|食事・飲み物の準備|学習教材・提出物の準備|家事・育児に必要な物の準備|その他","multi"],
 ["l5","life","翌日の準備で、困ることは？（当てはまるものすべて）","必要な物を忘れる|準備に時間がかかる|朝になって慌てる|翌日の予定を把握していない|何から準備すればよいか分からない|準備する習慣がない|特に困っていない","multi"],
 ["l4","life","日常生活で、困っていることは？（当てはまるものすべて）",L4T.join("|"),"multi"],
 ["l3","life","生活のリズムは？","早朝から活動する|朝から夕方まで活動する|昼から活動する|夜間に活動する|シフト制|日によって異なる|不規則"],
 ["l2","life","日常の主な活動は？","外で働く|現場・訪問先を移動する|店舗・施設で働く|自宅で働く|学校に通う|家事・育児・介護を行う|複数を組み合わせている|その他"],
 ["l1","life","今の生活の立場は？（当てはまるものすべて）","会社員|経営者・個人事業主|フリーランス|アルバイト・パート|学生|家事・育児中心|求職中|休職中|その他|現在、定期的な予定は特にない","multi"]].forEach(x=>QS_RAW.unshift(x));
TEMP_Q.slice().reverse().forEach(q=>QS_RAW.unshift([q[0],"temp","どちらが近い？","","pair",q[2],q[3]]));
const QS=QS_RAW.map(x=>x[4]==="pair"?{id:x[0],ch:x[1],q:x[2],type:"pair",a:x[5],b:x[6],opts:[{t:x[5],s:null},{t:"どちらかといえば上",s:null},{t:"どちらかといえば下",s:null},{t:x[6],s:null}]}:({id:x[0],ch:x[1],q:x[2],type:x[4]||"one",opts:x[3]?x[3].split("|").map(o=>{const i=o.lastIndexOf(":");return i>0&&/^\d$/.test(o.slice(i+1))?{t:o.slice(0,i),s:+o.slice(i+1)}:{t:o,s:null}}):[]}));
const QMAP={};QS.forEach(q=>QMAP[q.id]=q);
// 分岐：全員に全部は聞かない。仕事や学校の中身・機密は聞かない
{const A=(ob,id)=>(ob[id]||[]).map(Number);const role=ob=>A(ob,"l1").some(i=>i<=5);
 QMAP.l2.cond=ob=>!(A(ob,"l1").length===1&&A(ob,"l1")[0]===9);
 QMAP.l6.cond=ob=>role(ob)||A(ob,"l5").some(i=>i!==6);
 QMAP.l6.vis=(i,ob)=>{const r=A(ob,"l1"),a=+ob.l2;const work=r.some(x=>x<=3);if(i===1)return work;if(i===7)return r.includes(4)||a===4;if(i===8)return r.includes(5)||a===5;if(i===5)return a!==3;return true}}
function liveQ(id){const q=QMAP[id];return !q||!q.cond||q.cond(ui.ob||{})}
const QCOUNT=QS.reduce((n,q)=>n+(q.type==="times"?2:1),0);
const CHFLOW_ALL=CHAPTERS.flatMap(c=>["ch:"+c.id].concat(QS.filter(q=>q.ch===c.id).map(q=>q.id)));
const MFLOW_NEW=["m_pick","m_info","m_photo","self","confirm","vow"],MFLOW_EDIT=["m_pick","m_info","m_photo","confirm"];
// 初回に聞く問い：安全（けが・医師の制限・心・睡眠・体力）と、計画に要るもの（起床と就寝・変えたいこと・時間・厳しさ）
const QUICK_Q=["b1","b4","b5","b9","b10","s1","s3","m1","m2","m6","g1","g2","g3"];
function obFlowQs(full){return CHAPTERS.filter(c=>c.id!=="temp").flatMap(c=>{const qs=QS.filter(q=>q.ch===c.id&&(full||c.id==="life"||QUICK_Q.includes(q.id))).map(q=>q.id).filter(liveQ);return qs.length?["ch:"+c.id].concat(qs):[]})}
function restQs(){const A=S.main.obAns;if(!A)return[];return CHAPTERS.filter(c=>c.id!=="temp"&&c.id!=="life").flatMap(c=>{const qs=QS.filter(q=>q.ch===c.id&&(q.type==="times"?!A.wake:A[q.id]==null)).map(q=>q.id);return qs.length?["ch:"+c.id].concat(qs):[]})}
function restCount(){return restQs().filter(x=>x.indexOf("ch:")!==0).length}
function obAnsOf(ob){const o={};Object.keys(ob||{}).forEach(k=>{if(!["m","self","sign","env","retConfirm"].includes(k))o[k]=ob[k]});return o}
/* 外観（修行の記録とは別に保存する） */
const LOOK_DEF={theme:"kuro",fs:"m",fx:"std",anim:"on",tex:"on",mfx:"std",bg:"rain"};
function look(){return Object.assign({},LOOK_DEF,(S&&S.main&&S.main.look)||{})}
function applyLook(L){L=L||look();const r=document.documentElement;r.dataset.theme=L.theme;r.dataset.fs=L.fs;r.dataset.fx=L.fx;r.dataset.anim=L.anim;r.dataset.tex=L.tex;r.dataset.mfx=L.mfx;r.dataset.bg=L.bg;
  try{localStorage.setItem("bushido.look",JSON.stringify(L))}catch(e){}}
function flowX(){if(ui.mflow==="rest")return ["restIntro"].concat(ui.restFlow||restQs(),["building","result"]);if(ui.mflow==="type")return ["ch:temp"].concat(TEMP_Q.map(q=>q[0]),["type"]);if(ui.mflow==="life")return ["ch:life"].concat(QS.filter(q=>q.ch==="life").map(q=>q.id).filter(liveQ),["lifeDone"]);if(ui.mflow)return ui.mflow==="edit"?MFLOW_EDIT:MFLOW_NEW;return ui.retake?["tone"].concat(obFlowQs(true),["building","result"]):["start","m_pick","m_info","m_photo","self","know","tone"].concat(obFlowQs(false),["building","result","plan","env1","env2","confirm","vow"])}
function envState(e){if(!e)return null;if(e.has==="no")return"none";return e.choice||null}
function envBody(e){
  if(!e.has)return '<p class="eyebrow">第零関門 ・ 環境を断つ</p><p class="q qq">今、あなたの携帯に<br>Instagram・TikTok・X・YouTubeは<br>入っているか。</p><div class="qopts"><button class="qopt" data-act="envHas" data-v="yes"><span>入っている</span></button><button class="qopt" data-act="envHas" data-v="no"><span>入っていない</span></button></div><p class="small muted">嘘をついても、このアプリには分からない。だが、自分には分かる。断つべきは、アプリそのものより、生活を崩している使い方だ。仕事で必要なものは、残して管理すればいい。</p>';
  const apps=e.apps||[];
  let h='<p class="eyebrow">第零関門 ・ 環境を断つ</p><p class="q qq">今すぐ消しなさい。<br>話はそれからだ。</p><p class="lede small">意志で欲に勝とうとするのは負け戦だ。誘惑の入口そのものを、手元から断て。</p>'+
  '<p class="small muted" style="margin-top:6px">入っているものを選べ</p><div class="chips">'+SNS_APPS.map(a=>'<button class="chip" data-act="envApp" data-v="'+a+'" aria-pressed="'+apps.includes(a)+'">'+a+'</button>').join("")+'</div>';
  if(apps.length){
    h+='<p class="small muted" style="margin-top:14px">どうする</p><div class="qopts">'+[["deleted","消す","仕事で使うなら、会社のパソコンでログインすればいい。普段の携帯に入っている必要はない。"],["work","仕事で必要（管理する）","使う時間帯を決め、使った時間を毎晩申告する。"],["keep","まだ消せない","最低でも、ログアウト・通知オフ・ホーム画面から外す、をいま済ませる。"]].map(o=>'<button class="qopt" data-act="envChoice" data-v="'+o[0]+'" aria-pressed="'+(e.choice===o[0])+'"><span>'+o[1]+'<small>'+o[2]+'</small></span></button>').join("")+'</div>';
    const chk=(list)=>'<div class="qopts" style="margin-top:8px">'+list.map(t=>'<button class="qopt" data-act="envCheck" data-v="'+t+'" aria-pressed="'+(e.checks||[]).includes(t)+'"><span>'+t+'</span><i class="qchk">'+((e.checks||[]).includes(t)?"✓":"")+'</i></button>').join("")+'</div>';
    if(e.choice==="deleted")h+='<p class="small" style="margin-top:12px;color:var(--gold-hi)">今、この場で消せ。消したものを押せ。</p>'+chk(apps.map(a=>a+" を消した"));
    if(e.choice==="work")h+='<p class="small" style="margin-top:12px;color:var(--gold-hi)">使ってよい時間を決めろ。それ以外は開くな。</p><div class="chips">'+["仕事の時間だけ","1日30分だけ","昼休みだけ"].map(x=>'<button class="chip" data-act="envSlot" data-v="'+x+'" aria-pressed="'+(e.slot===x)+'">'+x+'</button>').join("")+'</div>'+chk(["通知を切った","ホーム画面から外した"]);
    if(e.choice==="keep")h+='<p class="small" style="margin-top:12px;color:var(--gold-hi)">今、この三つを済ませろ。</p>'+chk(["ログアウトした","通知を切った","ホーム画面から外した"]);
  }
  return h;
}
function envReady(e){if(!e)return false;if(e.has==="no")return true;const st=e.choice,c=e.checks||[],apps=e.apps||[];if(!apps.length||!st)return false;
  if(st==="deleted")return apps.every(a=>c.includes(a+" を消した"));if(st==="work")return !!e.slot&&c.includes("通知を切った")&&c.includes("ホーム画面から外した");return ["ログアウトした","通知を切った","ホーム画面から外した"].every(x=>c.includes(x))}
const OKITE_SETS={soft:6,mid:10,hard:16};
const OKITE_Q={o1:"d6",o2:"f4",o3:null,o4:"b4",o5:"b8",o6:"s8",o7:"s7",o8:"f4",o9:"f2",o10:"s3",o11:"k1",o12:"m3",o13:"m6",m1:null,m2:null,m3:null};
const QPRESET={s3:"睡眠を7〜8時間とる",s4:"スヌーズを押さずに起きる",s7:"午後4時以降カフェインをとらない",s8:"睡眠を7〜8時間とる",m1:"瞑想5分（稽古場のタイマー）",m2:"瞑想5分（稽古場のタイマー）",m6:"寝る前に感謝を3つ書く",
 b4:"自重の型（週3回）",b7:"有酸素運動30分",b8:"有酸素運動30分",f1:"安くて健康な自炊を1品作る",f2:"砂糖・炭酸飲料をやめる",f3:"塩分と酒を控える（むくみ対策）",f4:"毎食タンパク質をとる",
 d1:"SNSは1日30分まで",d2:"SNSは1日30分まで",d3:"動画は1日1本まで",d4:"22時以降スマホを手放す",s5:"ベッドでスマホを見ない",d6:"ポルノを見ない",
 o1:"部屋を10分掃除する",o2:"机の上を片付ける",o3:"洗濯物をその日に畳む",o4:"身だしなみを整えて出かける",o5:"持ち物を最小限にする",
 k1:"読書を毎日30分",k2:"資格の問題10問",k4:"学んだことをクイズにして復習する",a1:"先延ばしの作業に5分着手する",a2:"朝に一日の計画を立てる",a3:"約束の5分前に着く",a5:"先延ばしの作業に5分着手する"};
const DOM_CAT={body:2,food:2,sleep:1,mind:1,desire:3,order:4,know:5,act:6};
const VERDICT_D={body:"体が鈍っている。まず動ける体を取り戻せ。",sleep:"眠りが崩れている。睡眠を削る修行はさせない。まず眠れ。",food:"食が乱れている。体は、食べた物でできている。",desire:"欲に時間を奪われている。奪い返せ。",order:"身の回りが乱れている。環境が人を作る。",know:"学ぶ習慣が止まっている。毎日少しずつ取り戻せ。",act:"考えるだけで動けていない。小さく、すぐ動け。",mind:"心が疲れている。厳しさより、まず整えることから。"};
function ansText(id,ob){const q=QMAP[id];const v=ob[id];if(v==null||!q)return null;return q.opts[+v]?q.opts[+v].t:null}
function profileFrom(ob){
  const score={};QS.forEach(q=>{if(q.type!=="one")return;const v=ob[q.id];if(v==null)return;const o=q.opts[+v];if(o&&o.s!=null)score[q.id]=o.s});
  const dom={};Object.keys(DOM).forEach(d=>{const xs=QS.filter(q=>q.ch===d&&score[q.id]!=null).map(q=>score[q.id]);dom[d]=xs.length?Math.round(xs.reduce((a,b)=>a+b,0)/xs.length/3*100):null});
  const av=(...a)=>{const b=a.filter(x=>x!=null);return b.length?Math.round(b.reduce((s,x)=>s+x,0)/b.length):35};
  const cat={1:av(dom.sleep,dom.mind),2:av(dom.body,dom.food),3:av(dom.desire),4:av(dom.order),5:av(dom.know),6:av(dom.act)};
  const inj=(ob.b9||[]).map(i=>["back","knee","shoulder","wrist",null][+i]).filter(Boolean);
  const noEx=ansText("b10",ob)==="はい";
  const push=score.b5!=null?score.b5:2;
  const care=(score.m1===3)||(score.m1>=2&&score.m2>=2&&score.m6>=2);
  const temp={};TEMP_Q.forEach(q=>{if(ob[q[0]]!=null)temp[q[0]]=ob[q[0]]});if(!Object.keys(temp).length&&S.main.profile&&S.main.profile.temp)Object.assign(temp,S.main.profile.temp); // 型は任意。答え直しでは前の型を残す
  const life=QS.some(q=>q.ch==="life"&&ob[q.id]!=null)?lifeFrom(ob):((S.main.profile&&S.main.profile.life)||null);
  return{life,score,dom,cat,temp,flags:{inj,noEx,lowFit:push>=2,highFit:push===0,care},wake:ob.wake||"07:00",sleep:ob.sleep||"23:30",date:todayKey()};
}
function planFrom(ob){
  const pf=profileFrom(ob);
  const goals=((ob.g1||[]).map(i=>+i+1)).sort();const cats=goals.length?goals:[1,2,3,4,5,6];
  const bad=n=>{if(/自重の型/.test(n)&&(pf.flags.noEx||pf.flags.inj.some(x=>x!=="back")))return true;if(/有酸素/.test(n)&&pf.flags.noEx)return true;return false};
  let pick=null,why="";
  if(pf.score.s3>=2){pick=findPreset("睡眠を7〜8時間とる");why="睡眠が足りていない。眠りを削って鍛えても崩れるだけだ。まずは眠れ。"}
  else{let best=-1;Object.keys(QPRESET).forEach(q=>{const sc=pf.score[q];if(sc==null||sc<1)return;let n=QPRESET[q];if(q==="k2"){const k3=ansText("k3",ob);n=k3==="語学"?"語学学習20分":k3==="資格"?"資格の問題10問":"読書を毎日30分"}
      const fp=findPreset(n);if(!fp||!cats.includes(fp.c)||bad(n))return;const v=sc*10+pf.cat[fp.c]/10;if(v>best){best=v;pick=fp;why="「"+QMAP[q].q.replace(/[「」]/g,"")+"」の答えから。"}})}
  if(!pick){const c=cats.slice().sort((x,y)=>pf.cat[y]-pf.cat[x])[0];pick={c,p:PRESETS[c].find(p=>!bad(p.n))||PRESETS[c][0]};why="いちばん課題の大きい分野から。"}
  const task=ob.custom?{c:ob.cat,p:{n:ob.name,m:ob.min,u:ob.unit,r:ob.rest}}:pick;
  const m=ansText("g2",ob)||"15分";
  const F={"5分":{ritual:true,okite:false,groom:false,tempt:false,virtue:true,train:false},"15分":{ritual:true,okite:true,groom:false,tempt:true,virtue:true,train:false},"30分":{ritual:true,okite:true,groom:true,tempt:true,virtue:true,train:true},"1時間以上":{ritual:true,okite:true,groom:true,tempt:true,virtue:true,train:true}}[m];
  const Fx=Object.assign({power:true},F);if(/自重の型|瞑想|呼吸/.test(task.p.n))Fx.train=true;if(/身支度の型/.test(task.p.n))Fx.groom=true;
  let st={"まずは無理なく":"soft","しっかり":"mid","徹底的に":"hard"}[ansText("g3",ob)]||"mid";if(pf.flags.care)st="soft";
  const cand=OKITE_ALL.filter(x=>!(pf.flags.noEx&&(x.id==="o4"||x.id==="o5"))).map(x=>({id:x.id,v:(OKITE_Q[x.id]&&pf.score[OKITE_Q[x.id]]!=null?pf.score[OKITE_Q[x.id]]:1)}));
  cand.sort((a,b)=>b.v-a.v);const on=cand.slice(0,OKITE_SETS[st]).map(x=>x.id);
  const notes=[];
  if(pf.score.m4>=2)notes.push(["一つに絞る","最初の修行は一つだけ。7日やって定着したら、次を足す。"]);
  if(pf.score.m3>=2)notes.push(["責めずに立て直す","失敗しても経験値は没収されない。できない日は「最低ライン」、崩れたら「再起」で戻る。"]);
  if(pf.score.m5>=2)notes.push(["自分に見られる","毎朝の「今日やること」と姿見の写真で、自分自身に見られる仕組みを使う。"]);
  const [sh,sm]=pf.sleep.split(":").map(Number);const nt=((sh*60+sm-60)%1440+1440)%1440;const night=pad(Math.floor(nt/60))+":"+pad(nt%60);
  const bw={push:pf.score.b5>=2?0:pf.score.b5===1?1:2,squat:pf.score.b6>=2?0:pf.score.b6===1?1:2};
  return{pf,goals:goals.length?goals:cats.slice().sort((x,y)=>pf.cat[y]-pf.cat[x]).slice(0,2),task,why,features:Fx,okiteOn:on,strict:st,notes,notif:{morning:pf.wake,night},minutes:m,bw};
}
const findPreset=n=>{for(const c of [1,2,3,4,5,6]){const i=PRESETS[c].findIndex(p=>p.n===n);if(i>=0)return{c,p:PRESETS[c][i]}}return null};
function profileBars(pf){const ds=Object.keys(DOM).filter(d=>pf.dom[d]!=null).sort((a,b)=>pf.dom[b]-pf.dom[a]);
  return '<div class="stats">'+Object.keys(DOM).map(d=>{if(pf.dom[d]==null)return '<div class="stat"><span>'+DOM[d]+'</span><span class="small muted">まだ答えていない</span><b>—</b></div>';const v=100-pf.dom[d];return '<div class="stat"><span>'+DOM[d]+'</span><div class="bar"><i style="width:'+v+'%;'+(ds.indexOf(d)<2?"background:var(--red)":"")+'"></i></div><b>'+v+'</b></div>'}).join("")+'</div>'}
function careNote(){return '<div class="note" style="border-color:var(--red)"><b style="color:var(--red-ink)">先に、心を守れ</b><p class="small muted" style="margin-top:4px">気分の沈みやストレスが強く続いているなら、一人で抱えず、医療機関や相談窓口に相談してください（こころの健康相談統一ダイヤル 0570-064-556）。このアプリは医療の代わりになりません。厳しさは自動で「無理なく」にしました。</p></div>'}
function renderGate(){
  const ob=ui.ob;const FL=flowX();const id=ui.obPick?"pick":FL[ui.obStep]||FL[0];const idx=FL.indexOf(id);
  const qi=QS.findIndex(q=>q.id===id);const qn=qi>=0?QS.slice(0,qi+1).reduce((n,q)=>n+(q.type==="times"?2:1),0):null;
  const bar=idx>0||ui.retake||ui.mflow?'<div class="qtop"><button class="qback" data-act="obBack" aria-label="戻る">‹</button><div class="qbar"><i style="width:'+Math.round(idx/(FL.length-1)*100)+'%"></i></div>'+(qn?'<span class="small muted num" style="flex:none">'+qn+' / '+QCOUNT+'</span>':'')+'</div>':'';
  const wrap=(inner,cls)=>'<div class="gate quiz'+(cls?" "+cls:"")+'">'+bar+inner+'</div>';
  if(id==="start")return '<div class="gate">'+kamon.replace('class="mon"','class="mon" style="width:56px;height:56px"')+'<p class="eyebrow">入門 ・ 男のための道場</p><p class="q">男として、<br>己を変える<br>覚悟はあるか。</p><p class="lede">誰を師範にするのか。なぜ変わりたいのか。まず師範を選び、己の姿を記し、体と生活の問いに答え（約3分）、誓いを立てる。</p><div class="stack"><button class="btn gold shutsujin" data-act="obNext">入門する</button><button class="btn ghost wide small" data-act="demo">先に見本データで中を見る</button></div></div>';
  if(id==="env1"||id==="env2"){const e=ob.env=ob.env||{};const ready=envReady(e);
    return wrap('<div id="env-body">'+envBody(e)+'</div>'+(e.has?'<button class="btn gold wide" data-act="envNext" '+(ready?"":"disabled")+'>'+(e.has==="no"?"次へ":"断った。次へ")+'</button>':''))}
  if(id.indexOf("ch:")===0){const c=CHAPTERS.find(x=>"ch:"+x.id===id);const n=QS.filter(q=>q.ch===c.id).reduce((a,q)=>a+(q.type==="times"?2:1),0);
    return wrap('<div class="chap"><p class="eyebrow">'+(c.id==="temp"?"性格の問い ・ 16タイプ診断（12問）":"生活の問い ・ 稽古計画のため（16タイプ診断とは別）")+'</p><p class="chap-t">'+c.t.replace("　","<br>")+'</p><p class="lede">'+c.s+'</p><p class="small muted">'+n+'問 ・ 正直に答えるほど、修行が合う</p></div><button class="btn gold wide" data-act="obNext">答える</button>')}
  if(QMAP[id]){const q=QMAP[id];
    if(q.type==="times")return wrap('<p class="small muted">'+DOM[q.ch]+'</p><p class="q qq">'+q.q+'</p><p class="small muted">いつもの時刻でかまわない。朝の型と夜の省察の目安に使う。</p><div class="grid2"><label class="f">起床<input type="time" id="ob-wake" value="'+esc(ob.wake||"07:00")+'"></label><label class="f">就寝<input type="time" id="ob-sleep" value="'+esc(ob.sleep||"23:30")+'"></label></div><button class="btn gold wide" data-act="obTimes">次へ</button>');
    if(q.type==="pair"){const cur=ob[id];const lab=["強く上","やや上","やや下","強く下"];
      return wrap('<p class="small muted">性格の問い（16タイプ） ・ 良し悪しはない。直感で選べ</p><p class="q qq">どちらが近い？</p><div class="pair"><div class="pair-a">'+q.a+'</div><div class="pair-opts">'+[0,1,2,3].map(i=>'<button class="pair-o p'+i+'" data-act="obAns" data-q="'+id+'" data-v="'+i+'" aria-pressed="'+(cur===String(i))+'" aria-label="'+lab[i]+'"><i></i></button>').join("")+'</div><div class="pair-b">'+q.b+'</div></div><div class="pair-legend small muted"><span>上の文に近い</span><span>下の文に近い</span></div>')}
    const multi=q.type==="multi";const cur=ob[id];
    const opts=q.opts.map((o,i)=>{if(q.vis&&!q.vis(i,ob))return "";const on=multi?(cur||[]).includes(String(i)):cur===String(i);
      return '<button class="qopt" data-act="'+(multi?"obMulti":"obAns")+'" data-q="'+id+'" data-v="'+i+'" aria-pressed="'+on+'"><span>'+o.t+'</span>'+(multi?'<i class="qchk">'+(on?"✓":"")+'</i>':'')+'</button>'}).join("");
    return wrap('<p class="small muted">'+(CHAPTERS.find(c=>c.id===q.ch).t.split("　")[1])+'</p><p class="q qq">'+q.q+'</p>'+(multi?'<p class="small muted">当てはまるものをすべて選ぶ</p>':'')+'<div class="qopts">'+opts+'</div>'+(multi?'<button class="btn gold wide" data-act="obNext" '+((cur||[]).length?"":"disabled")+'>次へ</button>':''));}
  if(id==="m_pick"){const m=ob.m=ob.m||{};
    return wrap('<p class="eyebrow">己の師範</p><p class="q qq">己の師範を選べ。</p><p class="lede" style="margin-top:-10px">お前が変わる理由となる人物は誰だ？</p><div class="mpick" role="radiogroup" aria-label="師範の動機">'+Object.keys(MOTIVES).map(k=>{const o=MOTIVES[k];
      return '<button class="mopt" role="radio" data-act="mMotive" data-v="'+k+'" aria-pressed="'+(m.motive===k)+'" aria-checked="'+(m.motive===k)+'" style="--mc:'+o.c+'"><span class="mk">'+o.k+'</span><b>'+o.n+'</b><span class="mh">「'+o.h+'」</span><span class="ms">'+o.d+'</span><span class="mst">'+o.st.join(" ・ ")+'</span></button>'}).join("")+'</div>'+
      '<p class="small muted">師範にできるのは一人だけ。後から「誓いの間」で変更でき、変更しても稽古の記録は消えない。</p><button class="btn gold wide" data-act="obNext" id="m-next" '+(m.motive?"":"disabled")+'>この人を師範にする</button>')}
  if(id==="m_info"){const m=ob.m=ob.m||{};if(!m.motive){ui.obStep=flowX().indexOf("m_pick");return renderGate()}const o=MOTIVES[m.motive];
    return wrap('<p class="eyebrow">師範 ・ '+o.n+'</p><p class="q qq">師範の名を記せ。</p>'+
    '<label class="f">名前または呼び名（必須）<input type="text" id="mi-name" maxlength="16" autocomplete="off" placeholder="例：父さん、先輩、〇〇" value="'+esc(m.name||"")+'"></label>'+
    '<div><p class="small muted" style="margin-bottom:6px">性別（必須）</p><div class="chips" id="mi-g">'+GENDERS.map(g=>'<button class="chip" data-act="mGender" data-v="'+g[0]+'" aria-pressed="'+(m.gender===g[0])+'">'+g[1]+'</button>').join("")+'</div></div>'+
    '<details class="more"'+(m.rel||m.reason||m.feel||m.words?" open":"")+'><summary>任意：関係性・選んだ理由・感情・かけてほしい言葉</summary><div class="stack" style="gap:12px;margin-top:8px">'+
    '<div><p class="small muted" style="margin-bottom:6px">関係性</p><div class="chips" id="mi-rel">'+RELS.map(r=>'<button class="chip" data-act="mRel" data-v="'+r+'" aria-pressed="'+(m.rel===r)+'">'+r+'</button>').join("")+'</div></div>'+
    '<label class="f">選んだ理由<input type="text" id="mi-reason" maxlength="60" value="'+esc(m.reason||"")+'"></label>'+
    '<label class="f">抱いている感情<input type="text" id="mi-feel" maxlength="30" list="mi-feel-l" value="'+esc(m.feel||"")+'"></label><datalist id="mi-feel-l">'+FEELS.map(f=>'<option value="'+f+'">').join("")+'</datalist>'+
    '<label class="f">どんな言葉をかけてもらいたいか<input type="text" id="mi-words" maxlength="60" placeholder="例：お前ならできる" value="'+esc(m.words||"")+'"></label></div></details>'+
    '<button class="btn gold wide" data-act="mInfoNext">次へ</button>')}
  if(id==="m_photo"){const m=ob.m=ob.m||{};if(!m.motive){ui.obStep=flowX().indexOf("m_pick");return renderGate()}
    return wrap('<p class="eyebrow">師範 ・ '+esc(m.name||"")+'</p><p class="q qq">師範の姿を定めよ。</p><div class="pf-wrap">'+mPic(m)+'</div>'+
    '<div class="grid2"><button class="btn" data-act="mPhoto" data-v="lib">写真ライブラリ</button><button class="btn" data-act="mPhoto" data-v="cam">カメラで撮る</button></div>'+(m.pk?'<button class="btn ghost wide sm" data-act="mPhotoDel">写真を外す（絵にする）</button>':'')+
    '<p class="small muted">写真はこのアプリの中だけで使い、あなた専用の保存領域に置く。公開せず、AIにも送らない。写真は切り抜くだけで、表情を変えたり加工したりはしない。'+(m.pk?'':'写真なしの場合は、動機と性別から描いたオリジナルの師範の絵になる（実在の人物を再現するものではない）。')+'</p>'+
    '<button class="btn gold wide" data-act="obNext">'+(m.pk?"この姿で決める":"写真なしで進む")+'</button>')}
  if(id==="self"){const sf=ob.self=ob.self||{pk:(S.main.self0&&S.main.self0.key)||null};
    return wrap('<p class="eyebrow">第二の工程</p><p class="q qq">己の姿を登録せよ。</p><p class="lede" style="margin-top:-10px">己を知らずして、己を変えることはできない。</p>'+
    '<label class="f">お前の名（表示名・必須）<input type="text" id="sf-name" maxlength="20" autocomplete="off" placeholder="名前または号" value="'+esc(ob.sign||S.main.displayName||"")+'"></label>'+
    '<div class="pf-wrap">'+sPic(sf.pk)+'</div><div class="grid2"><button class="btn" data-act="sPhoto" data-v="lib">写真ライブラリ</button><button class="btn" data-act="sPhoto" data-v="cam">カメラで撮る</button></div>'+(sf.pk?'<button class="btn ghost wide sm" data-act="sPhotoDel">この写真を外す</button>':'')+
    '<p class="small muted">開始時点の自分として保存する。後から撮る姿見の写真で上書きされることはなく、武道録で成長の比較に使う。登録は任意で、公開せず、AIにも送らない。</p>'+
    '<button class="btn gold wide" data-act="selfNext">'+(sf.pk?"この姿で進む":"今は登録しない")+'</button>')}
  if(id==="lifeDone"){const L=lifeFrom(ob);const t=(id2)=>(L[id2]||[]).map(i=>QMAP[id2].opts[+i].t);
    return wrap('<p class="eyebrow">己の生活を知る</p><p class="q qq">お前の毎日は、こうだ。</p><div class="note small"><p><span class="muted">立場：</span>'+t("l1").join("・")+'</p>'+(L.l2!=null?'<p><span class="muted">主な活動：</span>'+QMAP.l2.opts[+L.l2].t+'</p>':'')+(L.l3!=null?'<p><span class="muted">リズム：</span>'+QMAP.l3.opts[+L.l3].t+'</p>':'')+'<p><span class="muted">困りごと：</span>'+t("l4").join("・")+'</p></div><p class="small muted">この答えから、環境を整える命令と、夜の「明日の仕込み」を選ぶ。修行の記録・EXP・段位は変わらない。</p><button class="btn gold wide" data-act="lifeDone">これで決める</button>')}
  if(id==="restIntro"){const n=(ui.restFlow||restQs()).filter(x=>x.indexOf("ch:")!==0).length;return wrap('<p class="eyebrow">見つめ直しの続き</p><p class="q qq">残りの問いに答えよ。</p><p class="lede">'+n+'問（約'+Math.max(1,Math.round(n/10))+'分）。答えるほど、命令がお前に合う。途中でやめても、続きから答えられる。</p><button class="btn gold wide" data-act="obNext">答える</button>')}
  if(id==="know")return wrap('<p class="eyebrow">己の姿を登録せよ ・ 16タイプ診断</p><p class="q qq">まずは己を知れ。</p><p class="lede">お前の体と生活の現在地を知る。己を知ることが、変わるための第一歩だ。</p><p class="small muted">まずは安全と生活に関わる問いだけに答える（約3分）。残りの問いと「武士の型」の診断は、あとで道場と誓いの間から答えられる。</p><button class="btn gold shutsujin" data-act="obNext">己を知る</button>');
  if(id==="confirm"){const m=ob.m||S.main.master||{};const pf=ui.mflow?S.main.profile:profileFrom(ob);const tp=typeOf(pf);const sk=ob.self?ob.self.pk:(S.main.self0&&S.main.self0.key);const nm=ob.sign||S.main.displayName||"";
    return wrap('<p class="eyebrow">最終確認</p><p class="q qq">この二人で、道を歩む。</p><div class="duo"><figure>'+mPic(m)+'<figcaption><span class="small muted">師範</span><b>'+esc(m.name||"")+'</b><span class="small muted">'+(m.rel?esc(m.rel)+" ・ ":"")+((GENDERS.find(g=>g[0]===m.gender)||[])[1]||"")+'</span></figcaption></figure><span class="duo-x">共に</span><figure>'+sPic(sk)+'<figcaption><span class="small muted">己</span><b>'+esc(nm)+'</b><span class="small muted">'+(tp?tp.t[0]+" "+tp.code:"型は未診断")+'</span></figcaption></figure></div>'+
    '<div class="note"><div class="cfrow"><span>師範の動機</span><b>'+(MOTIVES[m.motive]?MOTIVES[m.motive].n:"")+'</b></div><div class="cfrow"><span>16タイプ</span><b>'+(tp?tp.t[0]+"（"+tp.code+" ・ "+famOf(tp.code).n+"）":"未診断")+'</b></div>'+(m.feel?'<div class="cfrow"><span>抱いている感情</span><b>'+esc(m.feel)+'</b></div>':'')+'</div>'+
    '<div class="grid2"><button class="btn" data-act="mChange">設定を変更する</button><button class="btn gold" data-act="'+(ui.mflow==="edit"?"mEditDone":"obNext")+'">これで決定する</button></div>')}
  if(id==="vow"){const m=ob.m||{};const sk=ob.self?ob.self.pk:(S.main.self0&&S.main.self0.key);
    return wrap('<p class="eyebrow">誓い</p><p class="q qq">師範への誓い</p><div class="duo face"><figure>'+mPic(m,"l")+'<figcaption><b>'+esc(m.name||"")+'</b></figcaption></figure><span class="duo-x">誓</span><figure>'+sPic(sk,"r")+'<figcaption><b>'+esc(ob.sign||S.main.displayName||"")+'</b></figcaption></figure></div>'+
    '<div class="oath vow">'+VOW_LINES.map(l=>'<p>'+l+'</p>').join("")+'<p class="last">'+VOW_LAST+'</p></div><button class="btn gold shutsujin" data-act="vowGo">誓いを立てる</button>')}
  if(id==="building"){const lines=["体と生活を読み取る","八つの分野の現在地を測る","最初の修行と一太刀を選ぶ","掟を、あなた用に絞る"];const n=ui.buildN||0;
    return wrap('<p class="q qq">あなたを分析しています</p><div class="build">'+lines.map((l,i)=>'<div class="bl'+(i<n?" done":i===n?" now":"")+'"><i>'+(i<n?"✓":"")+'</i>'+l+'</div>').join("")+'</div><div class="qbar" style="margin-top:14px;flex:none"><i style="width:'+Math.round(n/lines.length*100)+'%"></i></div>')}
  if(id==="tone")return wrap('<p class="eyebrow">見つめ直しの前に</p><p class="q qq">これから、本音で問う。<br>甘えた答えには、容赦なく言う。<br>どこまで言われたいか。</p><div class="qopts">'+TONES.map(o=>'<button class="qopt" data-act="obTone" data-v="'+o.v+'" aria-pressed="'+(ob.tone===o.v)+'"><span>'+o.t+'<small>'+o.s+'</small></span></button>').join("")+'</div><p class="small muted">心の状態、体のけが、医師からの制限、睡眠時間の答えには、何も言わない。そこは責める所ではない。</p>');
  if(id==="type"){const pf=profileFrom(ob);const tp=typeOf(pf);const tone=ob.tone||"gen";const care=ui.mflow==="type"?!!(S.main.profile&&S.main.profile.flags&&S.main.profile.flags.care):pf.flags.care;
    if(!tp)return wrap('<p class="q qq">気質の問いに答えていない。</p><button class="btn gold wide" data-act="obNext">現在地を見る</button>');
    const line=care?"今は責める時ではない。まず心を整えろ。":tone==="on"?"":tone==="oni"?tp.t[7]:tp.t[6];
    const box=line?'<div class="taunt-box" style="margin:12px 0">'+line+'</div>':'';
    return wrap('<p class="eyebrow">診断 ・ お前は、こういう男だ</p>'+typeCard(tp,true).replace('</div><div class="note"><div class="axes2">','</div>'+box+'<div class="note"><div class="axes2">')+
    (curMaster()?'<div class="mcomment">'+mPic(curMaster())+'<div><p class="small muted">師範 ・ '+esc(curMaster().name)+'</p><p class="mline" style="margin:0">「'+esc(mLine("type",{t:tp.t[0]},curMaster()))+'」</p><p class="small muted" style="margin-top:4px">伝え方：'+GUIDE[0][typeSide(tp,0)]+'。'+GUIDE[2][typeSide(tp,2)]+'。</p></div></div>':'')+
    '<details class="more"><summary>十六の型をすべて見る</summary>'+typeList(tp.code)+'</details>'+
    '<p class="small muted">型は性格だ。答え直しても大きくは変わらない。変わっていくのは、次に見せる「現在地」と段位だ。</p><button class="btn gold shutsujin" data-act="'+(ui.mflow==="type"?"typeDone":"obNext")+'">'+(ui.mflow==="type"?"これで決める":"現在地を見る")+'</button>')}
  if(id==="result"){const pl=planFrom(ob);const pf=pl.pf;const worst=Object.keys(DOM).filter(d=>pf.dom[d]!=null).sort((a,b)=>pf.dom[b]-pf.dom[a]).slice(0,2);
    const inj=pf.flags.inj.map(x=>({back:"腰",knee:"膝",shoulder:"肩",wrist:"手首"}[x]));
    return wrap('<p class="eyebrow">見つめ直しの結果</p><p class="q qq">これが、今のあなたの現在地だ。</p><div class="note">'+profileBars(pf)+'<p class="small muted" style="margin-top:8px">100に近いほど整っている。赤は、いま最も崩れている二つ。</p></div>'+
    worst.map(d=>'<div class="note"><b>'+DOM[d]+'</b><p style="margin-top:4px">'+VERDICT_D[d]+'</p></div>').join("")+
    (inj.length||pf.flags.noEx?'<div class="note"><b>体の制限</b><p class="small muted" style="margin-top:4px">'+(pf.flags.noEx?"運動に注意が必要と答えたため、運動の命令は出さない。運動を始める前に医師に相談すること。":"")+(inj.length?inj.join("・")+"に痛みがあるため、そこに負担がかかる命令は出さない。":"")+'</p></div>':'')+
    (pf.flags.care?careNote():'')+
    (pl.notes.length?pl.notes.map(n=>'<div class="note"><b>'+n[0]+'</b><p class="small muted" style="margin-top:4px">'+n[1]+'</p></div>').join(""):'')+
    (()=>{const qs=Object.keys(pf.score).filter(q=>pf.score[q]>=2).sort((a,b)=>pf.score[b]-pf.score[a]);const rows=[];const used=new Set();
      for(const q of qs){if(rows.length>=3)break;const m=Object.values(MISSIONS).flat().filter(x=>x.q===q&&!used.has(x.t)&&missionAllowed(x,pf,"normal")).sort((a,b)=>a.lv-b.lv)[Math.min(1,0)];if(!m)continue;used.add(m.t);rows.push('<div class="ex-row"><p class="small muted">「'+QMAP[q].q.replace(/[「」]/g,"")+'」の答えから</p><p>→ '+m.t+' <b class="lvtag">難度'+m.lv+'</b></p></div>')}
      return rows.length?'<div class="note"><b>あなたの答えから、こういう命令が出る</b>'+rows.join("")+'<p class="small muted" style="margin-top:6px">難度は、達成するたびに上がり、崩れたら下がる。</p></div>':''})()+
    (ui.retake||ui.mflow==="rest"?'<p class="small muted">この結果に合わせて、一太刀の命令と掟を入れ替える。今の修行と記録はそのまま残る。</p><button class="btn gold shutsujin" data-act="obRetakeDone">この結果で鍛え直す</button>':'<button class="btn gold shutsujin" data-act="obNext">修行計画を見る</button>'))}
  if(id==="plan"){const pl=planFrom(ob);const t=pl.task;const k=todayKey();
    const fl=[["ritual","朝の型（目安 "+pl.notif.morning+"）"],["okite","実践しなさい。（掟 "+pl.okiteOn.length+"）"],["train","鍛錬の型（呼吸・自重）"],["groom","身支度の型"],["virtue","今日の心得（七徳）"]].filter(f=>pl.features[f[0]]).map(f=>f[1]);
    return wrap('<p class="eyebrow">あなた一人のための</p><p class="q qq">修行計画</p>'+
    '<div class="note"><p class="small muted">鍛える能力</p><div class="chips" style="margin-top:6px">'+pl.goals.map(c=>'<span class="chip" aria-pressed="true">'+CATS[c].ab+'</span>').join("")+'</div></div>'+
    '<div class="note gold"><p class="small muted">最初の'+term("重点修行")+'</p><p class="plan-task">'+esc(t.p.n)+'</p><p class="small muted">'+term("最低ライン")+'：'+esc(t.p.m||"—")+' ・ '+CATS[t.c].ord+" "+CATS[t.c].name+'</p>'+(ob.custom?'':'<p class="small" style="margin-top:4px">'+esc(pl.why)+'</p>')+'<button class="btn ghost sm" data-act="obPick" style="margin-top:6px">別の修行にする</button></div>'+
    '<div class="note"><p class="small muted">毎日の型（1日 '+pl.minutes+' ・ 厳しさ「'+({soft:"無理なく",mid:"しっかり",hard:"徹底的に"}[pl.strict])+'」）</p><ul class="plan-list">'+fl.map(x=>'<li>'+x+'</li>').join("")+'<li>夜の省察（目安 '+pl.notif.night+'）</li></ul><p class="small muted" style="margin-top:6px">一太刀の命令は、あなたの答えの中で点の悪かった所から多く出る。</p></div>'+
    '<div class="note"><p class="small muted">道のり</p><div class="miles">'+[["今日",k,"入門"],["7日",addDays(k,7),"最初の確認"],["66日",addDays(k,66),"習慣を意識する目安"],["75日",addDays(k,75),"武士道の試練"]].map(m=>'<div><b>'+m[0]+'</b><span class="num">'+fmtMD(m[1])+'</span><small>'+m[2]+'</small></div>').join("")+'</div></div>'+
    '<button class="btn gold shutsujin" data-act="obNext">この計画で始める</button>')}
  if(id==="pick"){const c=ob.cat||planFrom(ob).task.c;const cats=[1,2,3,4,5,6];
    return '<div class="gate quiz"><div class="qtop"><button class="qback" data-act="obPickBack" aria-label="戻る">‹</button></div><p class="q qq">最初の修行を選ぶ</p><p class="lede small">確実に続けられる大きさにする。7日以上やり、達成率80%以上で「定着」だ。</p><label class="f">領域<select id="ob-cat">'+cats.map(i=>'<option value="'+i+'"'+(i==c?" selected":"")+'>'+CATS[i].ord+" "+CATS[i].name+'（'+CATS[i].ab+'）</option>').join("")+'</select></label><div><p class="small muted" style="margin-bottom:6px">候補から選ぶ</p><div id="ob-ex">'+presetChips(c,new Set())+'</div></div><label class="f">選んだ修行<input type="text" id="ob-name" maxlength="40" readonly placeholder="上の候補から選ぶ" value="'+esc(ob.custom?ob.name:"")+'"></label><label class="f">最低ライン<input type="text" id="ob-min" maxlength="40" readonly value="'+esc(ob.custom?ob.min:"")+'"></label><button class="btn gold wide" data-act="obPickSave">この修行にする</button></div>'}
  if(id==="oath"){const t=planFrom(ob).task.p.n;const def=ob.oath||("一、私は自分との約束を守る。\n一、できなかった日も記録から逃げない。\n一、休むべき時は休み、必ず再起する。\n一、「"+t+"」をやり遂げ、定着させる。");
    return wrap('<p class="q qq">起請文を書け</p><p class="lede small">自分への誓いだ。書き換えて構わない。</p><textarea id="ob-oath" rows="6" style="font-family:var(--display);line-height:1.9">'+esc(def)+'</textarea><button class="btn gold wide" data-act="obOath">次へ</button>')}
  if(id==="sign")return wrap('<p class="q qq">署名せよ</p><div class="oath">'+esc(ob.oath)+'</div><label class="f">署名（表示名）<input type="text" id="ob-sign" maxlength="20" placeholder="名前または号" value="'+esc(ob.sign||"")+'"></label><button class="btn gold shutsujin" data-act="obFinish">道場へ入る</button>');
  return "";
}

/* ============ 道場 ============ */
function virtueOf(k){const n=Math.floor(parseKey(k)/864e5);const v=VIRTUES[((n%7)+7)%7];const w=Math.floor(n/7);return Object.assign({},v,{t:v.p[((w%v.p.length)+v.p.length)%v.p.length]})}
function groomWeekDone(id,k){const mon=mondayOf(k);for(let x=mon;x<=addDays(mon,6);x=addDays(x,1)){if(x===k)continue;if(groomComplete(S.days[x],id))return x}return null}
function groomComplete(d,id){const g=GROOM.find(x=>x.id===id);const r=d&&d.groom&&d.groom[id];return !!r&&g.steps.every((_,i)=>r[i])}
function renderPowers(k){
  const got=S.main.powers||{};const n=Object.keys(got).length;const wk=powerOfWeek(k);
  return '<section class="sec" id="sec-power"><p class="eyebrow">離への道 ・ 自立の試練</p><h2>二十の力</h2><p class="small muted">便利さに頼って手放した力を、一つずつ取り戻す。やったら、何をしたかを書いて「会得」します（+'+EXP_POWER+' EXP）。</p>'+
  '<div class="row small" style="margin-top:8px"><span class="grow">会得</span><b class="num">'+n+' / 20</b></div><div class="bar" style="margin-top:4px"><i style="width:'+n/20*100+'%"></i></div>'+
  (wk?'<div class="task focus" style="margin-top:12px"><p class="small muted">今週の自立の試練</p><b>'+wk.n+'</b><p class="small" style="margin-top:4px">'+wk.t+'</p><button class="btn gold wide" data-act="power" data-v="'+wk.id+'" style="margin-top:8px">やった（会得する）</button></div>':'<p style="margin-top:10px;color:var(--gold-hi)">二十の力を、すべて会得した。</p>')+
  '<details class="more" style="margin-top:8px"'+(ui.powerOpen?" open":"")+'><summary>二十の力をすべて見る</summary><div>'+POWERS.map((p,i)=>{const g=got[p.id];return '<button class="pw'+(g?" got":"")+'" data-act="power" data-v="'+p.id+'"><span class="no">'+(g?"✓":i+1)+'</span><span style="min-width:0"><b>'+p.n+'</b><span class="small muted" style="display:block">'+(g?fmtMD(g.date)+' 会得':p.t)+'</span></span></button>'}).join("")+'</div></details>'+
  '<p class="small muted" style="margin-top:10px">「便利さに依存するな。便利さを使いこなせ。」<br>何でもできる必要はない。できないことを、できるようにする。</p></section>';
}
function renderTrain(k){
  const d=day(k);const bN=weekCount(breathDoneOn,k),wN=weekCount(bwDoneOn,k);
  const bt=(d.breath||[]).filter(x=>x.done).map(x=>(BREATH.find(b=>b.id===x.mode)||{}).n).join("、");
  return '<section class="sec" id="sec-train"><p class="eyebrow">自宅でできる鍛錬</p><h2>鍛錬の型</h2>'+
  '<div class="task"><div class="row"><div class="grow"><b>呼吸・瞑想</b> '+(breathDoneOn(d)?'<span class="tag gold">今日済</span>':'')+'<div class="small muted">'+(bt?esc(bt)+' ・ ':'')+'今週 '+bN+'日</div></div><button class="btn sm'+(breathDoneOn(d)?"":" gold")+'" data-act="breath">始める</button></div><p class="small muted" style="margin-top:6px">1日5分を毎日続けることに意味があります。長さより継続。</p></div>'+
  '<div class="task"><div class="row"><div class="grow"><b>自重の型</b> '+(bwDoneOn(d)?'<span class="tag gold">今日済</span>':'')+'<div class="small muted">器具なし ・ 今週 '+wN+' / 3回</div></div><button class="btn sm'+(bwDoneOn(d)?"":" gold")+'" data-act="bw">'+(bwDoneOn(d)?"記録を見る":"始める")+'</button></div><p class="small muted" style="margin-top:6px">週3回を目安に。軽い版から始め、楽になった種目だけ一段上げます。</p></div></section>';
}
function breathSheet(){
  const m=ui.breathMode||"med5";
  openSheet('<p class="eyebrow">呼吸・瞑想</p><h2>今日の呼吸</h2><div class="chips" id="br-modes">'+BREATH.map(b=>'<button class="chip" data-act="breathMode" data-v="'+b.id+'" aria-pressed="'+(b.id===m)+'">'+b.n+'</button>').join("")+'</div><p class="small muted" style="margin:8px 0" id="br-desc">'+BREATH.find(b=>b.id===m).s+'</p>'+
  '<div class="breath"><div class="br-c" id="br-c"></div><div class="br-l" id="br-l">準備</div></div><p class="num" id="br-t" style="text-align:center;font-family:var(--display);font-size:calc(22px*var(--fz,1))">'+fmtSec(BREATH.find(b=>b.id===m).sec)+'</p>'+
  '<div class="grid2" style="margin-top:10px"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" id="br-go" data-act="breathGo">開始</button></div><p class="small muted" style="margin-top:10px">強い不安や不眠が続くときは、瞑想は医療の代わりになりません。</p>');
}
function fmtSec(n){n=Math.max(0,Math.ceil(n));return Math.floor(n/60)+":"+pad(n%60)}
function breathTick(){
  const b=ui.breath;if(!b)return;const def=BREATH.find(x=>x.id===b.mode);
  const el=(Date.now()-b.start)/1000;const c=$("#br-c"),l=$("#br-l"),t=$("#br-t");if(!c){clearInterval(b.iv);ui.breath=null;return}
  t.textContent=fmtSec(def.sec-el);
  if(def.box){const ph=Math.floor(el/4)%4,f=(el%4)/4;const sc=ph===0?.55+.45*f:ph===1?1:ph===2?1-.45*f:.55;c.style.transform="scale("+sc+")";l.textContent=["吸う","止める","吐く","止める"][ph]+" "+(4-Math.floor(el%4))}
  else{const f=(Math.sin(el/6*Math.PI*2-Math.PI/2)+1)/2;c.style.transform="scale("+(.6+.35*f)+")";l.textContent="呼吸に注意を置く"}
  if(el>=def.sec)breathFinish(true);
}
const URGE_TYPES=["SNS","動画","ゲーム","食べ物・酒","買い物","ポルノ","先延ばし","その他"];
const URGE_STATES=["退屈","疲労","ストレス","不安","孤独","特にない"];const URGE_PLACES=["自宅","職場・学校","移動中","その他"];
const STATE_ADV={"退屈":"退屈な数分にやることを先に決めておけ（散歩・腕立て10回・本を1ページ）。","疲労":"疲れた時の回復は刺激ではなく睡眠だ。22時に画面を寝室から出せ。","ストレス":"ストレスの逃げ場をスマホにするな。60秒の呼吸と5分の散歩を逃げ場にしろ。","不安":"不安は紙に3行書き出せ。書いてから、スマホを手に取るか決めろ。","孤独":"一人の夜は、画面ではなく人とつながれ。誰か一人に連絡しろ。"};
const URGE_ADV={"SNS":"SNSのアプリを消せ。開けなければ、衝動は起きない。","動画":"動画のアプリをホーム画面から外せ。指が覚えた場所に置くな。","ゲーム":"ゲーム機の電源とコードを、別の部屋にしまえ。","食べ物・酒":"買い置きをするな。家にない物は食べられない。","買い物":"カートに入れたら24時間待て。それでも要るなら買え。","ポルノ":"寝室にスマホを持ち込むな。一人の夜が入口だ。","先延ばし":"5分だけ手をつけろ。始めれば、衝動は消える。","その他":"衝動が来る場所と時間を、先に断て。"};
function urgeStats(){const all=[];Object.keys(S.days).forEach(k=>(S.days[k].urges||[]).forEach(u=>all.push(u)));if(all.length<3)return null;
  const byT={},byH={},byS={},byP={};all.forEach(u=>{if(u.type)byT[u.type]=(byT[u.type]||0)+1;if(u.state&&u.state!=="特にない")byS[u.state]=(byS[u.state]||0)+1;if(u.place)byP[u.place]=(byP[u.place]||0)+1;const h=parseInt((u.at||"").slice(0,2),10);if(!isNaN(h))byH[h]=(byH[h]||0)+1});
  const top=o=>Object.keys(o).sort((a,b)=>o[b]-o[a])[0];const won=all.filter(u=>u.won).length;
  return{n:all.length,rate:Math.round(won/all.length*100),type:top(byT),hour:top(byH),state:top(byS),place:top(byP)}}
function urgeSheet(){const d=day(todayKey());const w=(d.urges||[]).filter(u=>u.won).length;const st=urgeStats();
  openSheet('<p class="eyebrow">衝動ボタン ・ 今日の打ち勝ち '+w+'回</p><h2>見たくなったか。<br>60秒だけ、呼吸しろ。</h2><p class="small muted" style="margin:6px 0">衝動は、波のように上がって引く。60秒やり過ごせば、たいてい弱まる。</p>'+
  (st?'<div class="note" style="margin:6px 0"><p class="small muted">お前の衝動の傾向（'+st.n+'回 ・ 打ち勝ち'+st.rate+'%）</p><p class="small"><b>'+[st.hour!=null?st.hour+"時台":"",st.state?"「"+st.state+"」のとき":"",st.place?st.place+"で":"",st.type?"「"+st.type+"」":""].filter(Boolean).join("、")+'に引かれやすい。</b>'+(st.state&&STATE_ADV[st.state]?'<br>原因への対処：'+STATE_ADV[st.state]:'')+(st.type?'<br>入口を断つ：'+URGE_ADV[st.type]:'')+'</p></div>':'')+'<div class="breath"><div class="br-c" id="br-c"></div><div class="br-l" id="br-l">吸う</div></div><p class="num" id="br-t" style="text-align:center;font-family:var(--display);font-size:calc(22px*var(--fz,1))">1:00</p><div id="urge-end"><button class="btn ghost wide sm" data-act="urgeGiveUp">やめる</button></div>');
  ui.breath={mode:"box60",start:Date.now(),urge:true};ui.breath.iv=setInterval(breathTick,100)}
function urgeResult(){const e=$("#urge-end");if(!e)return;$("#br-l").textContent="60秒、耐えた";
  ui.urgeType=null;ui.urgeState=null;ui.urgePlace=null;const ch=(id,list,f)=>'<div class="chips" id="'+id+'" style="margin-bottom:10px">'+list.map(t=>'<button class="chip" data-act="urgeTag" data-f="'+f+'" data-v="'+t+'" aria-pressed="false">'+t+'</button>').join("")+'</div>';
  e.innerHTML='<p class="small muted" style="margin-bottom:6px">何に引かれた？</p>'+ch("urge-type",URGE_TYPES,"Type")+'<p class="small muted" style="margin-bottom:6px">直前の状態は？</p>'+ch("urge-state",URGE_STATES,"State")+'<p class="small muted" style="margin-bottom:6px">どこにいた？</p>'+ch("urge-place",URGE_PLACES,"Place")+'<p style="text-align:center;margin-bottom:8px">どうだった。正直に選べ。</p><div class="grid2"><button class="btn" data-act="urgeSave" data-v="0">負けた（見た）</button><button class="btn gold" data-act="urgeSave" data-v="1">打ち勝った</button></div>'}
function breathFinish(done){
  if(ui.breath&&ui.breath.urge){clearInterval(ui.breath.iv);ui.breath=null;if(done)urgeResult();else closeSheet();return}
  const b=ui.breath;if(!b)return;clearInterval(b.iv);ui.breath=null;try{b.lock&&b.lock.release()}catch(e){}
  const sec=Math.round(Math.min((Date.now()-b.start)/1000,BREATH.find(x=>x.id===b.mode).sec));
  const k=todayKey();const d=day(k);
  if(done||sec>=30){const first=!breathDoneOn(d);d.breath=d.breath||[];d.breath.push({mode:b.mode,sec,done:!!done,at:nowHM()});saveDay(k);
    if(done)toast("呼吸を整えた",first?"+"+EXP_BREATH+" EXP":"今日の分は記録済み");else toast("途中まで記録した",fmtSec(sec))}
  closeSheet();render();
}
function bwSheet(){
  const k=todayKey();const d=day(k);const cur=(d.bw&&d.bw.items)||{};const L=S.main.bwLevel||{};
  openSheet('<p class="eyebrow">器具なし ・ 週3回が目安</p><h2>自重の型</h2><p class="small muted" style="margin-bottom:6px">各種目の段を選び、今日やった合計回数（プランクは合計秒数）を入れます。やらなかった種目は空欄のまま。</p><div id="bw-list">'+
  BW.map(x=>{const lv=cur[x.id]?cur[x.id].lv:(L[x.id]||0);const last=lastBw(x.id,k);
    return '<div class="task" data-bw="'+x.id+'"><div class="row"><b class="grow">'+x.n+'</b><span class="small muted">目安 '+x.goal+'</span></div><div style="display:grid;grid-template-columns:1fr 6.5em;gap:10px;margin-top:6px"><label class="f" style="min-width:0">段<select class="bw-lv">'+x.lv.map((n,i)=>'<option value="'+i+'"'+(i==lv?" selected":"")+'>'+(i+1)+'段 '+n+'</option>').join("")+'</select></label><label class="f">合計（'+x.u+'）<input type="number" inputmode="numeric" class="bw-reps" min="0" value="'+esc(cur[x.id]?cur[x.id].reps:"")+'"></label></div>'+
    '<p class="small muted" style="margin-top:4px">'+(last?'前回 '+fmtMD(last.k)+'：'+(last.it.lv+1)+'段 '+esc(x.lv[last.it.lv])+' '+esc(last.it.reps)+x.u+(last.it.lv<x.lv.length-1?' ・ 目安を楽にこなせたら次の段へ':''):'初回は1段目から。フォームが崩れない回数で止める')+(x.note?'<br>'+x.note:'')+'</p></div>'}).join("")+
  '</div><div class="grid2" style="margin-top:10px"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="saveBw">記録する</button></div><p class="small muted" style="margin-top:10px">痛みが出たら中止。自重でも見た目が変わるほどの筋肉はつきますが、限界近くまで追い込み、回数や段を少しずつ上げることが条件です。減量の主役は食事です。</p>');
}
function renderGroom(k){
  const d=day(k);d.groom=d.groom||{};
  return '<section class="sec" id="sec-groom"><p class="eyebrow">身だしなみ ・ 四ノ修行</p><h2>身支度の型</h2><p class="small muted" style="margin-bottom:8px">上から順に押します。型を最後まで終えると +'+EXP_GROOM+' EXP（週一の手入れは週に1回まで）。</p>'+
  GROOM.map(g=>{const r=d.groom[g.id]||{};const n=g.steps.filter((_,i)=>r[i]).length;const full=n===g.steps.length;const wk=g.weekly?groomWeekDone(g.id,k):null;const open=ui.groomOpen===g.id;
    let body='';
    if(open){const next=g.steps.findIndex((_,i)=>!r[i]);
      const last=next<0?g.steps.length-1:next-1;
      body='<div class="ritual" style="margin-top:6px">'+g.steps.map((s,i)=>{const ok=!!r[i];const can=i===next;const undo=ok&&i===last;return '<button class="step'+(ok?" ok":"")+(can?" next":"")+(!ok&&!can?" locked":"")+'" data-act="'+(undo?"groomUndo":"groom")+'" data-g="'+g.id+'" data-i="'+i+'" '+(can||undo?"":"disabled")+'><span class="n">'+(i+1)+'</span><span class="t">'+s+'</span><span class="small muted num">'+(ok?r[i]+(undo?" 取消":""):"")+'</span></button>'}).join("")+'</div>'}
    return '<div class="task'+(full?" focus":"")+'"><div class="row"><div class="grow"><b>'+g.n+'</b> '+(full?'<span class="tag gold">完了</span>':wk?'<span class="tag">今週は'+fmtMD(wk)+'に完了</span>':'')+'<div class="small muted">'+g.s+' ・ '+n+'/'+g.steps.length+'</div></div><button class="btn sm'+(open?" ghost":"")+'" data-act="groomOpen" data-g="'+g.id+'">'+(open?"閉じる":(n?"続ける":"始める"))+'</button></div>'+body+'</div>'}).join("")+'</section>';
}
function lastActiveBefore(k){let best=null;Object.keys(S.days).forEach(x=>{if(x>=k)return;const d=S.days[x];if(Object.keys(d.logs||{}).length||d.mission||Object.keys(d.ritual||{}).length||d.reflection||(d.okite&&Object.keys(d.okite).length)){if(!best||x>best)best=x}});return best}
function gapInfo(k){const la=lastActiveBefore(k);if(!la)return null;const gap=diffDays(la,k)-1;return gap>=2&&S.main.gapAck!==k?{from:addDays(la,1),to:addDays(k,-1),gap}:null}
function feat(f){return !S.main.features||S.main.features[f]!==false}
function okiteActive(){const off=S.main.okiteOff||[];return OKITE_ALL.filter(x=>!off.includes(x.id))}
function okiteDay(d){const o=(d&&d.okite)||{};const act=okiteActive();return{act,ok:act.filter(x=>o[x.id]==="ok").length,na:act.filter(x=>o[x.id]==="na").length}}
function renderDojo(){
  const k=todayKey(),d=day(k),v=virtueOf(k);
  const y=S.days[addDays(k,-1)];
  const h=new Date().getHours();const morning=h>=DAY_START_H&&h<12;
  const out=[];
  const gp=gapInfo(k);
  if(gp)out.push('<section class="sec" id="sec-gap" style="border-color:var(--gold)"><p class="eyebrow">おかえり</p><h2>'+gp.gap+'日、間が空いた。だが、戻ってきた。</h2><p style="color:var(--gold-hi);margin-bottom:6px">戻ってきた者には、それだけで +'+EXP_RETURN+' EXP（再起の者）。</p><p class="small muted" style="margin-bottom:10px">'+fmtMD(gp.from)+'〜'+fmtMD(gp.to)+'の記録がありません。どうしていたかを選んでください。「休んでいた」を選ぶと、その日は再起の案内や達成率の表示で責められなくなります（ただし、あとから付けた休みは、試練と定着の判定では達成扱いになりません）。</p><div class="stack" style="gap:6px"><button class="btn gold wide" data-act="gap" data-v="rest">休んでいた（体調・用事など）</button><button class="btn wide" data-act="gap" data-v="slack">さぼってしまった（未記録のまま残す）</button><button class="btn ghost wide sm" data-act="gap" data-v="skip">あとで決める</button></div></section>');
  if(!S.main.env)out.push('<section class="sec" id="sec-env" style="border-color:var(--red)"><p class="eyebrow">第零関門</p><h2>携帯にSNSは、まだ入っているか。</h2><p class="small muted" style="margin-bottom:10px">今すぐ消しなさい。話はそれからだ。仕事で使うなら、会社のパソコンでログインすればいい。</p><button class="btn gold wide" data-act="envOpen">環境を断つ</button></section>');
  if(!S.main.profile)out.push('<section class="sec" id="sec-profile" style="border-color:var(--red)"><p class="eyebrow">まだ終えていない</p><h2>まずは自分を見つめ直せ。</h2><p class="small muted" style="margin-bottom:10px">体・眠り・食・欲・身辺・知・行動・心について、'+QCOUNT+'の問いに答える（約5分）。答えから、一太刀の命令と掟をあなた一人のものにする。今の修行と記録はそのまま残る。</p><button class="btn gold wide" data-act="retake">見つめ直す</button></section>');
  if(S.main.tutVer!==3&&S.main.master&&ui.tut==null)out.push('<section class="sec" id="sec-tutresume" style="border-color:var(--gold)"><p class="eyebrow">入門の儀'+(S.main.tutStep?" ・ 途中":"")+'</p><h2>道場の使い方を、師範が教える。</h2><p class="small muted" style="margin-bottom:10px">実際に押して覚える約3分の儀式。練習の操作は本番のEXPや記録に残らない。'+(S.main.tutStep?"中断した章から再開する。":"")+'</p><button class="btn gold wide" data-act="tutResume">'+(S.main.tutStep?"入門の儀を再開する":"入門の儀を始める")+'</button></section>');
  if(painActive())out.push('<section class="sec" id="sec-pain" style="border-color:var(--red)"><p class="eyebrow">安全 ・ '+fmtMD(S.main.painStop.date)+'から</p><h2>体の試練を止めている。</h2><p class="small muted" style="margin-bottom:10px">痛みの申告があったため、体を使う命令は出さない。痛みが続く・強い・しびれがあるときは、医療機関に相談しろ。</p><button class="btn wide" data-act="painClear">痛みが引いた（体の試練を再開する）</button></section>');
  out.push(masterCard());
  out.push(week1Card(k));
  {const y=S.days[addDays(k,-1)];const items=y&&y.prep?y.prep.items.filter(x=>PREP[x]):[];const pc=d.prepCheck;
   if(items.length&&!(pc&&pc.done)){const r=pc?pc.res:{};const ng=items.some(x=>r[x]===0);
    out.push('<section class="sec" id="sec-prep"><p class="eyebrow">昨夜の仕込み ・ 確かめる</p><h2>仕込みは、できていたか。</h2>'+items.map(x=>'<div class="row" style="padding:6px 0;border-top:1px solid var(--line)"><span class="grow small">'+PREP[x]+'</span><button class="btn sm'+(r[x]===1?" gold":"")+'" data-act="prepRes" data-k="'+x+'" data-v="1" aria-pressed="'+(r[x]===1)+'">できていた</button><button class="btn sm'+(r[x]===0?" red":"")+'" data-act="prepRes" data-k="'+x+'" data-v="0" aria-pressed="'+(r[x]===0)+'" style="margin-left:6px">できず</button></div>').join("")+
    (ng?'<p class="small muted" style="margin:10px 0 6px">できなかった原因</p><div class="chips">'+PREP_WHY.map(w=>'<button class="chip" data-act="prepWhy" data-v="'+w+'" aria-pressed="'+((pc&&pc.why)===w)+'">'+w+'</button>').join("")+'</div>':'')+
    '<button class="btn wide" data-act="prepSave" style="margin-top:10px">記録する</button></section>')}}
  if(S.main.onboarded&&S.main.obAns&&S.main.tutVer===3&&ui.tut==null&&!S.main.demo){const rc=restCount();if(rc)out.push('<section class="sec" id="sec-rest"><p class="eyebrow">見つめ直しの続き ・ 任意 ・ '+rc+'問</p><h2>残りの問いに答えるほど、命令が合う。</h2><p class="small muted" style="margin-bottom:10px">食・欲・身辺・知・行動などの問い。今の記録と段位はそのまま残る。</p><button class="btn wide" data-act="restStart">続きを答える</button></section>')}
  if(S.main.onboarded&&!lifeOf()&&S.main.tutVer===3&&ui.tut==null)out.push('<section class="sec" id="sec-life"><p class="eyebrow">己の生活を知る ・ 約1分</p><h2>お前の毎日を教えろ。</h2><p class="small muted" style="margin-bottom:10px">生活の立場・リズム・困りごとを選ぶだけ。答えから、環境を整える命令と「明日の仕込み」を出す。</p><button class="btn wide" data-act="lifeStart">答える</button></section>');
  const wk=mondayOf(k);if((wdOf(k)===0||wdOf(k)===6)&&!S.main.weeklies[wk])out.push('<section class="sec" id="sec-weekly"><p class="eyebrow">週末</p><h2>一週間を振り返れ。</h2><button class="btn wide" data-act="weekly" style="margin-top:8px">週の振り返り</button></section>');
  const rec=gp?null:needsRecovery();
  if(rec)out.push('<section class="sec" id="sec-recover" style="border-color:var(--gold)"><p class="eyebrow">'+term("再起")+'</p><h2>ここから立て直す</h2><p class="small muted" style="margin-bottom:10px">「'+esc(rec.name)+'」が3日続けて、未達成か未記録です。記録は消えません。次の一手を一つ選んでください。</p><div class="stack" style="gap:6px">'+RECOVER.map(r=>'<button class="btn wide" data-act="recover" data-t="'+rec.id+'" data-v="'+r.k+'">'+r.t+'</button>').join("")+'</div></section>');
  if(y&&y.reflection&&(y.reflection.improve||y.reflection.next))out.push('<section class="sec" id="sec-yimp"><p class="eyebrow">昨日の自分からの改善策</p>'+(y.reflection.improve?'<p>'+esc(y.reflection.improve)+'</p>':'')+(y.reflection.next?'<p class="small muted" style="margin-top:4px">具体的な行動：'+esc(y.reflection.next)+'</p>':'')+'</section>');
  const ritualSec=feat("ritual")?renderRitual(k,d):"";
  out.push(renderTodo(k,d));
  // 一太刀
  const m=d.mission;
  if(!m)out.push('<section class="sec mission" id="sec-mission"><p class="eyebrow">今日の'+term("一太刀")+'</p><p class="small muted" style="margin-bottom:10px">三つから一つ選べ。選んだら、今日は変えない。</p><button class="btn gold wide" data-act="setMission">今日の一太刀を受ける</button></section>');
  else{
    const res=m.result;const canFix=m.own&&m.setTs&&Date.now()-m.setTs<10*60e3&&!res;
    out.push('<section class="sec mission" id="sec-mission"><div class="row"><p class="eyebrow grow" style="margin:0">今日の'+term("一太刀")+'</p>'+(res?'<span class="tag '+(res==="done"?"gold":res==="miss"?"red":"")+'">'+({done:"達成",part:"一部達成",miss:"未達成",postponed:"延期・中止"}[res])+'</span>':'')+'</div><p class="txt">'+esc(m.text)+'</p>'+(m.lv?'<p class="small muted" style="margin:-6px 0 10px"><b class="lvtag">難度'+m.lv+' / 10</b> '+(m.cat!=null&&CAT_SHORT[m.cat]?'分野：'+CAT_SHORT[m.cat]:'')+'</p>':'')+(m.why?'<p class="small" style="margin:-4px 0 8px"><span class="muted">なぜこの命令か：</span>'+esc(m.why)+'</p>':'')+
    (m.mid&&MDATA[m.mid]&&!res?mInfoHTML(m.mid,m.cat,true)+(()=>{const a=mAlt(m);return a?'<p class="small muted" style="margin:6px 0 10px">体調などで実行できない時の代案：「'+esc(a.t)+'」。やり切れば「一部達成」として付けろ。</p>':''})():'')+
    (res==="miss"&&m.missWhy&&MISS_NEXT[m.missWhy]?'<div class="note" style="margin-bottom:10px"><p class="small muted">原因：'+MISS_T[m.missWhy]+'（'+MISS_GROUP[m.missWhy]+'の問題）</p><p class="small">'+MISS_NEXT[m.missWhy].join("")+'</p></div>':'')+(canFix?'<button class="btn ghost sm" data-act="fixMission" style="margin:-6px 0 10px">誤字を直す（決めてから10分以内）</button>':'')+
    (res==="postponed"?'<p class="small muted">理由：'+esc(m.postponeReason)+'</p>':
    '<p class="small muted" style="margin-bottom:6px">'+(res?"結果を変えるときは押し直します。":"終わったら（または夜に）結果を押します。")+'</p><div class="seg"><button class="btn'+(res==="done"?" gold":"")+'" data-act="mres" data-v="done">達成</button><button class="btn" data-act="mres" data-v="part" '+(res==="part"?'style="border-color:var(--gold);color:var(--gold-hi)"':'')+'>一部達成</button><button class="btn'+(res==="miss"?" red":"")+'" data-act="mres" data-v="miss">未達成</button></div><button class="btn ghost sm" data-act="postpone" style="margin-top:8px">病気・けが・急な事情で延期／中止する</button>')+'</section>');
  }
  // クエスト
  const qs=activeTasks().filter(t=>k>=t.start);const paused=S.main.tasks.filter(t=>t.status==="一時停止");
  const total=qs.filter(t=>taskOn(t,k)).length;const doneN=qs.filter(t=>{const l=d.logs[t.id];return taskOn(t,k)&&l&&(isDoneState(l.state)||isExcluded(l.state))}).length;
  out.push('<section class="sec" id="sec-quest"><div class="row" style="margin-bottom:6px"><div class="grow"><p class="eyebrow" style="margin:0">今日のクエスト</p><h2 style="margin:0">毎日の修行</h2></div><span class="num muted">'+doneN+' / '+total+'</span></div><div class="bar" style="margin-bottom:6px"><i style="width:'+(total?doneN/total*100:0)+'%"></i></div>'+(qs.length?qs.map(t=>questRow(t,k)).join(""):paused.length?'<p class="muted small">修行は一時停止中です。稽古場の「設定」から再開できます。停止中の日は、達成率の計算に入りません。</p>':'<p class="muted small">修行がまだありません。稽古場で追加します。</p>')+'</section>');
  out.push(quoteCard());
  if(feat("okite"))out.push(renderOkite(k,d));
  out.push(ritualSec);
  if(feat("virtue"))out.push('<section class="sec"><p class="eyebrow">今日の心得 ・ '+fmtMD(k)+'</p><div class="virtue"><div class="kanji'+(v.k.length>1?" long":"")+'">'+v.k+'</div><div><h3>'+v.m+'</h3><p class="small muted">'+v.t+'</p></div></div>'+(v.q?'<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px"><p style="font-family:var(--display);font-weight:800;color:var(--gold-hi)">'+v.q+'</p><p class="small muted">'+v.src+'</p></div>':'')+
  (d.virtue?'<p class="small" style="margin-top:12px"><span class="tag gold">実践済</span>　'+esc(d.virtue.note)+'</p>':'<button class="btn wide" data-act="virtueDone" style="margin-top:12px">今日の「'+v.k+'」を実践した</button>')+'</section>');
  const allW=victories();const wins=allW.map((w,i)=>Object.assign({i},w)).slice(-3).reverse();
  out.push('<section class="sec"><p class="eyebrow">'+term("勝利の壺")+'</p>'+(wins.length?wins.map(w=>'<div class="row small" style="padding:4px 0"><span class="muted num" style="width:5.5em;flex:none">'+fmtMD(w.k)+'</span><span class="grow">'+esc(w.what)+'</span>'+(w.cert?'<button class="btn sm ghost" data-act="cert" data-i="'+w.i+'">達成証</button>':'')+'</div>').join(""):'<p class="small muted">修行の定着・試練の完遂・段位の昇格・再起後の達成がここに貯まります。</p>')+'</section>');
  return out.join("");
}
function renderRitual(k,d){
  const nOk=RITUAL.filter((_,i)=>d.ritual[i]).length;const full=nOk===8;const open=!full||ui.ritualOpen;
  return '<section class="sec" id="sec-ritual"><div class="row"><div class="grow"><p class="eyebrow" style="margin:0">MORNING RITUAL</p><h2 style="margin:0">朝の型</h2></div>'+(full?'<span class="tag gold">完遂 '+d.ritual[0]+'〜'+d.ritual[7]+'</span>':'<span class="num muted">'+nOk+' / 8</span>')+'</div>'+
  (open?'<p class="small muted" style="margin-top:4px">起きたら上から順に押します。押し間違えたら、最後に押した行をもう一度押すと取り消せます。</p>'+(d.photo?'':'<button class="btn sm ghost" data-act="photo" style="margin-top:6px">五の「姿見」で写真も残す（任意）</button>')+'<div class="ritual" style="margin-top:6px">'+ritualRows(k)+'</div>':'')+
  (full?'<button class="btn ghost sm" data-act="ritualOpen" style="margin-top:6px">'+(open?"閉じる":"中身を見る")+'</button>':'')+'</section>';
}
function renderOkite(k,d){
  const o=d.okite||{};const c=okiteDay(d);const showAll=ui.okiteAll;
  const pending=c.act.filter(x=>!o[x.id]);const LIMIT=6;
  const rows=showAll?c.act:pending.slice(0,ui.okiteMore?99:LIMIT);const hidden=showAll||ui.okiteMore?0:Math.max(0,pending.length-LIMIT);
  let html='';OKITE.forEach(g=>{const its=g.items.filter(x=>rows.includes(x));if(!its.length)return;
    html+='<p class="eyebrow" style="margin:12px 0 2px;color:var(--gold)">'+g.g+'</p>'+its.map(x=>{const st=o[x.id]||"";return '<div class="okrow'+(st==="ok"?" ok-k":"")+(st==="na"?" na-k":"")+'"><button class="okmain" data-act="okite" data-v="'+x.id+'" aria-pressed="'+(st==="ok")+'"><span class="mk">'+(st==="ok"?"✓":st==="na"?"—":"")+'</span><span style="min-width:0"><span class="t">'+x.t+'</span>'+(x.s?'<span class="small muted" style="display:block">'+x.s+'</span>':'')+'</span></button><button class="btn sm ghost okna" data-act="okiteNa" data-v="'+x.id+'" aria-pressed="'+(st==="na")+'">'+(st==="na"?"戻す":"該当なし")+'</button></div>'}).join("")});
  const doneN=c.ok+c.na;
  return '<section class="sec" id="sec-okite"><div class="row"><div class="grow"><p class="eyebrow" style="margin:0">毎日の'+term("掟")+'</p><h2 style="margin:0">実践しなさい。</h2></div><span class="num muted">'+c.ok+' / '+(c.act.length-c.na)+'</span></div><p class="small muted" style="margin:4px 0 6px">実践したら押す。押した掟はたたまれて、残りだけが並びます。休みの日や当てはまらない日は「該当なし」。</p>'+
  (rows.length?html:'<p class="small" style="margin-top:8px;color:var(--gold-hi)">今日の掟は、すべて片付いた。</p>')+(hidden?'<button class="btn wide" data-act="okiteMore" style="margin-top:8px">残り'+hidden+'項目を表示</button>':'')+
  (doneN?'<button class="btn ghost sm" data-act="okiteAll" style="margin-top:8px">'+(showAll?"済んだ掟をたたむ":"済んだ掟も表示（"+doneN+"）")+'</button>':'')+'</section>';
}
function renderTodo(k,d){
  // 必須＝今日の一太刀。推奨＝毎日の修行と夜の省察。任意＝ほかの稽古。不調の日は必須だけにする
  const qs=activeTasks().filter(t=>k>=t.start&&taskOn(t,k));const qDone=qs.filter(t=>d.logs[t.id]).length;
  const m=d.mission;const N=S.main.notif||{};const bad=d.cond==="bad"||painActive();
  const mRes=!!(m&&m.result);const mCut=!!(m&&(m.result==="done"||m.result==="part"||m.rest));
  const rec=[];if(qs.length)rec.push({t:"毎日の修行",sub:"やったら「達成」 ・ "+qDone+"/"+qs.length,ok:qDone>=qs.length,act:'data-act="goto" data-v="sec-quest"',btn:"記録へ"});
  rec.push({t:"夜の省察（30秒）",sub:"寝る前に（目安 "+esc(N.night||"")+"）",ok:!!d.reflection,act:'data-act="reflect"',btn:"書く"});
  const recDone=rec.every(x=>x.ok);const st=streak();
  const head=!m?'まず、<b>今日の一太刀</b>を受けよ。':!mRes?'今日の一太刀を、<b>斬れ</b>。':mCut&&(recDone||bad)?'今日の修行は終えた。<br><span class="small" style="font-family:var(--body);font-weight:500;color:var(--gold-hi)">アプリを閉じて、現実で斬れ。今日はもう開かなくていい。</span>':mCut?'今日は<b>斬った</b>。あとは、やれたらでいい。':'記録した。明日、取り返せ。';
  const chip=(lab,cls,t,ok,act,gold)=>'<button class="tier '+cls+(ok?" ok":"")+(gold&&!ok?" now":"")+'" '+act+'><span class="tl">'+lab+'</span><span class="tt">'+t+'</span><span class="ck" aria-hidden="true">'+(ok?"✓":"")+'</span></button>';
  const qOk=!qs.length||qDone>=qs.length;
  const stk=st?'<span class="streak" title="1日だけの空白は許される">継続 '+st+'日</span>':'';
  return '<section class="sec todo" id="sec-todo"><p class="todo-next">'+head+'</p><div class="tiers">'+
   chip("必須","t1","一太刀",mRes,m?'data-act="goto" data-v="sec-mission"':'data-act="setMission"',true)+
   (bad?stk+'</div><p class="small muted" style="margin-top:6px">今日は体を休める日だ。一太刀だけでいい。</p>':
    (qs.length?chip("推奨","t2","修行 "+qDone+"/"+qs.length,qOk,'data-act="goto" data-v="sec-quest"'):'')+
    chip("推奨","t2","省察",!!d.reflection,'data-act="reflect"')+
    chip("任意","t3","ほか",false,'data-act="openGrp"')+stk+'</div>')+'</section>';
}
function questRow(t,k){
  const l=logOf(k,t.id);const off=!taskOn(t,k);const st=off?"rest":(l?l.state:"");
  const mark={done:"✓",min:"◐",miss:"×",rest:"休",excused:"休"}[st]||"";
  const label={done:"達成",min:"最低ライン",miss:"未達成",rest:"休息日",excused:"正当な事情"}[st];
  return '<div class="quest '+st+'"><span class="mark">'+mark+'</span><div style="min-width:0"><div class="nm">'+esc(t.name)+(t.focus?' <span class="tag gold">重点</span>':'')+(t.settledOn?' <span class="tag">定着</span>':'')+'</div><div class="sub">'+CATS[t.cat].name+(label?' ・ '+label:'')+(l&&l.value?' ・ '+esc(l.value)+esc(t.unit||""):'')+(l&&l.reason?' ・ '+esc(l.reason):'')+'</div></div>'+
   (off?'<span class="small muted">休息日</span>':'<div class="qacts">'+(l?'<button class="btn sm ghost" data-act="log" data-t="'+t.id+'" data-k="'+k+'">変更</button>':'<button class="btn sm gold" data-act="quick" data-t="'+t.id+'" data-k="'+k+'">達成</button><button class="btn sm" data-act="log" data-t="'+t.id+'" data-k="'+k+'">ほか</button>')+'</div>')+'</div>';
}
function ritualRows(k){
  const d=day(k);let next=RITUAL.findIndex((_,i)=>!d.ritual[i]);const last=next<0?7:next-1;
  return RITUAL.map((s,i)=>{const ok=!!d.ritual[i];const can=i===next;const undo=ok&&i===last;
    return '<button class="step'+(ok?" ok":"")+(can?" next":"")+(!ok&&!can?" locked":"")+'" data-act="'+(undo?"ritualUndo":"ritual")+'" data-i="'+i+'" '+(can||undo?"":"disabled")+'><span class="n">'+"一二三四五六七八"[i]+'</span><span class="t">'+s+(i===6&&!d.mission&&can?' <span class="small muted">（押すと一太刀を決める画面が開きます）</span>':'')+'</span><span class="small muted num">'+(ok?d.ritual[i]+(undo?" 取消":""):"")+'</span></button>'}).join("");
}
function victories(){
  const v=[];
  S.main.tasks.forEach(t=>{if(t.settledOn)v.push({k:t.settledOn,what:"修行の定着：「"+t.name+"」",cert:{t:"修行の定着",s:CATS[t.cat].ord+" "+CATS[t.cat].name}})});
  S.main.trials.forEach(tr=>{const e=trialEval(tr);if(e.status==="完遂")v.push({k:e.doneOn,what:tr.days+"日試練 完遂：「"+tr.name+"」",cert:{t:tr.days+"日試練 完遂",s:tr.days+"日間、自分との約束を守り抜いた"}})});
  S.main.rankLog.forEach(r=>v.push({k:r.date,what:"段位昇格："+RANKS[r.rank].n,cert:{t:"段位昇格",s:RANKS[r.rank].n+"の段に至る",rank:r.rank}}));
  (S.main.feats||[]).forEach(f=>v.push({k:f.date,what:"戦績："+f.kind+(f.value?" "+f.value:"")}));
  S.main.recoveries.forEach(r=>{const t=S.main.tasks.find(x=>x.id===r.taskId);if(!t)return;
    for(let k=addDays(r.date,0);k<=todayKey();k=addDays(k,1)){const l=logOf(k,t.id);if(l&&isDoneState(l.state)){v.push({k,what:"再起後の達成：「"+t.name+"」"});break}}});
  return v.sort((a,b)=>a.k<b.k?-1:1);
}

/* ============ 稽古場 ============ */
function renderKeiko(){
  const out=[];const k=todayKey();
  const focus=S.main.tasks.find(t=>t.focus&&t.status==="進行中");
  out.push('<section class="sec plain"><p class="eyebrow">TRAINING</p><h2 style="font-size:calc(24px*var(--fz,1));margin:0">稽古場</h2><p class="small muted">重点修行は一つだけ。定着した修行は維持対象として続けます。</p></section>');
  if(focus){const el=eligibleDays(focus,focus.start,k);const ok=el.filter(e=>e.l&&isDoneState(e.l.state)).length;const r=taskRate(focus,30);
    out.push('<section class="sec" id="sec-focus" style="border-color:var(--gold)"><p class="eyebrow">'+term("重点修行")+' ・ '+term("定着")+'まで</p><h3>'+esc(focus.name)+'</h3><div class="grid2 small" style="margin-top:6px"><div>実施日数 <b class="num">'+ok+'</b> / 7日</div><div>達成率 <b class="num">'+(r?Math.round(r.rate*100):0)+'%</b> / 80%</div></div><div class="bar" style="margin-top:8px"><i style="width:'+Math.min(100,ok/7*100)+'%"></i></div><p class="small muted" style="margin-top:8px">定着すると次の修行を追加できます（+'+EXP_SETTLE+' EXP）。</p><div style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px"><div class="row small"><span class="grow">習慣を意識する目安（保証ではない）</span><b class="num">'+ok+' / 66日</b></div><div class="bar" style="margin-top:6px"><i style="width:'+Math.min(100,ok/66*100)+'%"></i></div><p class="small muted" style="margin-top:6px">66日は保証ではなく、習慣を意識する目安です。研究では、考えずにできるまでの日数は人によって18〜254日と大きく違いました（Lallyら、2010年。平均66日）。7日は最初の確認、75日は武士道独自の試練です。</p></div></section>');}
  else out.push('<section class="sec" id="sec-focus"><p class="small">重点修行がありません。次の修行を一つ選べます。</p><button class="btn gold wide" data-act="addTask" style="margin-top:10px">修行を追加する</button></section>');
  if(feat("train"))out.push(renderTrain(k));
  if(feat("power"))out.push(renderPowers(k));
  if(feat("groom"))out.push(renderGroom(k));
  // 六つの修行
  let cats='';
  for(let c=1;c<=6;c++){const ts=S.main.tasks.filter(t=>t.cat===c&&t.status!=="中止");const a=ability(c);
    cats+='<div class="cat"><div class="cat-h"><span class="ord">'+CATS[c].ord+'</span><span class="nm">'+CATS[c].name+'</span><span class="ab">'+CATS[c].ab+' <b class="num" style="color:var(--fg)">'+(a==null?"—":a)+'</b></span></div>'+
    (ts.length?ts.map(t=>{const r=taskRate(t,30);return '<div class="task'+(t.focus?" focus":"")+'"><div class="row"><div class="grow"><b>'+esc(t.name)+'</b> <span class="tag'+(t.status==="定着"?" gold":"")+'">'+(t.focus?"重点":t.status)+'</span></div><button class="btn sm ghost" data-act="editTask" data-t="'+t.id+'">設定</button></div><div class="small muted">'+(t.minimum?'最低ライン：'+esc(t.minimum)+' ・ ':'')+'30日達成率 '+(r?Math.round(r.rate*100)+'%（'+r.ok+'/'+r.n+'）':'—')+((t.restDays||[]).length?' ・ 休息日 '+t.restDays.map(i=>WD[i]).join(""):'')+'</div></div>'}).join(""):'<p class="small muted" style="margin-top:4px">未着手</p>')+'</div>';}
  out.push('<section class="sec"><p class="eyebrow">六つの修行</p>'+cats+'</section>');
  // 欲望との対決
  const d=day(k);const won=d.temptations.filter(x=>x.won).length,lost=d.temptations.length-won;
  if(feat("tempt"))out.push('<section class="sec"><p class="eyebrow">欲の統制</p><h2>欲望との対決</h2><p class="small muted" style="margin-bottom:8px">SNSや動画を見たくなったら、画面右下の「衝動」を押せ。60秒の呼吸で波をやり過ごす。</p><div class="row" style="margin-bottom:10px"><div class="grow small">今日　勝ち <b class="num" style="color:var(--gold-hi);font-size:calc(18px*var(--fz,1))">'+won+'</b>　負け <b class="num" style="font-size:calc(18px*var(--fz,1))">'+lost+'</b></div></div><div class="grid2"><button class="btn gold" data-act="tempt" data-v="1">誘惑に打ち勝った</button><button class="btn" data-act="tempt" data-v="0">誘惑に負けた</button></div>'+(d.temptations.length?'<div class="small muted" style="margin-top:10px">'+d.temptations.slice(-5).reverse().map(x=>'<div>'+esc(x.at)+'　'+esc(x.type)+'　'+(x.won?"勝":"負")+(x.note?'　'+esc(x.note):'')+'</div>').join("")+'</div>':'')+'</section>');
  // 試練
  const trs=S.main.trials.slice().reverse();
  out.push('<section class="sec"><p class="eyebrow">期間クエスト</p><h2>試練モード</h2>'+(trs.length?trs.map(tr=>{const e=trialEval(tr);return '<div class="task"><div class="row"><b class="grow">'+esc(tr.name)+'</b><span class="tag'+(e.status==="完遂"?" gold":e.status==="失敗"?" red":"")+'">'+e.status+'</span></div><div class="small muted">'+tr.days+'日 ・ '+fmtMD(tr.start)+'開始 ・ '+(e.status==="進行中"?e.day+'日目':e.status==="失敗"?fmtMD(e.failedOn)+'に未達':e.status==="完遂"?'+'+EXP_TRIAL+' EXP':'中止：'+esc(tr.stopReason||""))+'</div>'+(e.status==="進行中"?'<div class="bar" style="margin-top:6px"><i style="width:'+(e.okDays/tr.days*100)+'%"></i></div><div class="row" style="margin-top:8px;justify-content:flex-end;gap:6px"><button class="btn sm ghost" data-act="trialChange" data-v="'+tr.id+'">条件変更</button><button class="btn sm ghost" data-act="trialStop" data-v="'+tr.id+'">中止</button></div>':'')+(e.status==="失敗"||e.status==="中止"?'<div style="margin-top:8px;text-align:right"><button class="btn sm" data-act="trialRetry" data-v="'+tr.id+'">同じ条件で再挑戦</button></div>':'')+'</div>'}).join(""):'<p class="small muted">7日・30日・75日の約束を自分と交わします。開始後は条件を簡単に変えられません。</p>')+'<button class="btn wide" data-act="newTrial" style="margin-top:12px" '+(activeTasks().length?"":"disabled")+'>試練を始める</button></section>');
  return out.join("");
}

/* ============ 武道録 ============ */
function weekRate(from,to){
  let ok=0,n=0;activeTasks().concat(S.main.tasks.filter(t=>t.status==="一時停止")).forEach(t=>{
    for(let k=from;k<=to;k=addDays(k,1)){if(!taskOn(t,k))continue;const l=logOf(k,t.id);if(!l||isExcluded(l.state))continue;n++;if(isDoneState(l.state))ok++}});
  return n?{ok,n,rate:Math.round(ok/n*100)}:null;
}
function sumVals(from,to){const m={};S.main.tasks.forEach(t=>{if(!t.unit)return;let s=0,has=false;for(let k=from;k<=to;k=addDays(k,1)){const l=logOf(k,t.id);if(l&&l.value!==""&&l.value!=null&&!isNaN(+l.value)){s+=+l.value;has=true}}if(has)m[t.id]={t,s}});return m}
function missionRate(from,to){let n=0,ok=0;for(let k=from;k<=to;k=addDays(k,1)){const m=S.days[k]&&S.days[k].mission;if(m&&m.result&&m.result!=="postponed"){n++;ok+=m.result==="done"?1:m.result==="part"?.5:0}}return n?Math.round(ok/n*100):null}
function renderRoku(){
  const out=[];const k=todayKey();const d=day(k);
  out.push('<section class="sec plain"><p class="eyebrow">RECORD</p><h2 style="font-size:calc(24px*var(--fz,1));margin:0">武道録</h2></section>');
  // 省察
  out.push('<section class="sec" id="sec-reflect"><div class="row"><div class="grow"><p class="eyebrow" style="margin:0">夜の'+term("省察")+'</p><h2 style="margin:0">省察録</h2></div>'+(d.reflection?'<span class="tag gold">記入済 +'+EXP_REFL+'</span>':'')+'</div>'+(d.reflection?'<p class="small" style="margin-top:8px">明日の改善策：'+esc(d.reflection.improve||"—")+'</p>':'<p class="small muted" style="margin:6px 0 10px">今日の成果・課題・原因・明日の行動を書きます。改善策は翌朝の道場に表示されます。</p>')+'<button class="btn '+(d.reflection?"":"gold ")+'wide" data-act="reflect" style="margin-top:8px">'+(d.reflection?"省察録を見直す":"今日の己を省みる")+'</button></section>');
  // 人生の戦績
  const feats=(S.main.feats||[]).slice().reverse();
  out.push('<section class="sec" id="sec-feats"><p class="eyebrow">アプリの外で起きたこと</p><h2>人生の戦績</h2><p class="small muted" style="margin-bottom:8px">修行の記録ではなく、現実で変わったことを残す。EXPは付かない。これが、武士道を使う本当の理由だ。</p>'+
    (feats.length?feats.slice(0,ui.featAll?100:5).map(f=>'<div class="feat"><span class="tag gold">'+esc(f.cat)+'</span><div style="min-width:0"><b>'+esc(f.kind)+(f.value?' '+esc(f.value):'')+'</b>'+(f.note?'<span class="small muted" style="display:block">'+esc(f.note)+'</span>':'')+'</div><span class="small muted num">'+fmtMD(f.date)+'</span></div>').join("")+(feats.length>5?'<button class="btn ghost sm" data-act="featAll">'+(ui.featAll?"減らす":"すべて表示（"+feats.length+"件）")+'</button>':''):'<p class="small muted">まだない。体・仕事・お金・学び・人間関係で変わったことがあれば、ここに刻め。</p>')+
    '<button class="btn gold wide" data-act="feat" style="margin-top:10px">戦績を刻む</button></section>');
  // 繰り返す言い訳
  { const to=todayKey();let chk=0,ok=0,forgot=0;const why={};
    for(let i=0;i<30;i++){const kk=addDays(to,-i);const dd=S.days[kk];if(!dd)continue;const pc=dd.prepCheck;
      if(pc&&pc.done){Object.values(pc.res||{}).forEach(v=>{chk++;if(v===1)ok++});if(pc.why==="忘れていた")forgot++}
      const mm=dd.mission;if(mm&&mm.result==="miss"&&mm.missWhy){why[mm.missWhy]=(why[mm.missWhy]||0)+1;if(mm.missWhy==="forgot")forgot++}}
    const pd=prepDays().length;const wl=Object.keys(why).sort((a,b)=>why[b]-why[a]);
    if(chk||wl.length)out.push('<section class="sec" id="sec-base"><p class="eyebrow">生活の基盤 ・ 直近30日</p><h2>仕込みと、つまずき</h2>'+
      (chk?'<div class="grid2 small" style="margin-bottom:8px"><div class="note"><p class="muted">仕込みの実施率</p><b class="num" style="font-size:calc(20px*var(--fz,1))">'+Math.round(ok/chk*100)+'%</b></div><div class="note"><p class="muted">忘れたこと</p><b class="num" style="font-size:calc(20px*var(--fz,1))">'+forgot+'回</b></div></div><p class="small muted">仕込みができていた日：通算 '+pd+'日'+(pd>=PREP_SETTLE?'（定着。今は維持確認でEXPは付かない）':'（'+PREP_SETTLE+'日で定着）')+'</p>':'')+
      (wl.length?'<p class="small muted" style="margin:10px 0 6px">一太刀が届かなかった原因</p>'+wl.map(w=>'<div class="row small" style="padding:3px 0"><span class="grow">'+MISS_T[w]+'</span><b class="num">'+why[w]+'回</b></div>').join(""):'')+'</section>') }
  { const ex=excuseStats(30);if(ex.length)out.push('<section class="sec" id="sec-excuse"><p class="eyebrow">逃げ道の記録 ・ 直近30日</p><h2>繰り返す言い訳</h2><p class="small muted" style="margin-bottom:8px">責めるためではない。自分がどこから逃げるかを知るためだ。</p>'+ex.slice(0,4).map((x,i)=>'<div class="stat"><span>'+esc(x.r)+'</span><div class="bar"><i style="width:'+Math.round(x.n/ex[0].n*100)+'%;'+(i===0?"background:var(--red)":"")+'"></i></div><b>'+x.n+'</b></div>').join("")+(FIXES[ex[0].r]?'<p class="small" style="margin-top:10px">次の一手：'+esc(FIXES[ex[0].r][0])+'</p>':'')+'</section>') }
  // 昨日の自分との対決
  const mon=mondayOf(k);const span=diffDays(mon,k);
  const lmon=addDays(mon,-7),lend=addDays(lmon,span);
  const a=weekRate(lmon,lend),b=weekRate(mon,k);
  const sw=addDays(k,-7);const sa=weekRate(sw,sw),sb=weekRate(k,k);
  const ma=missionRate(lmon,lend),mb=missionRate(mon,k);
  const va=sumVals(lmon,lend),vb=sumVals(mon,k);
  let rows='';
  rows+=cmpRow("修行達成率（先週の"+WD[wdOf(k)]+"曜と今日）",sa&&sa.rate,sb&&sb.rate,"%");
  rows+=cmpRow("一太刀の達成率",ma,mb,"%");
  rows+=cmpRow("掟の実践（1日平均）",okiteAvg(lmon,lend),okiteAvg(mon,k),"項目");
  rows+=cmpRow("戒め（1日平均・少ないほど良い）",slipAvg(lmon,lend),slipAvg(mon,k),"件");
  const scr=(a,b)=>{let n=0,t=0;for(let x=a;x<=b;x=addDays(x,1)){const d=S.days[x];if(d&&d.screen!=null){n++;t+=SCREEN_MIN[d.screen]}}return n?Math.round(t/n):null};
  rows+=cmpRow("SNS・動画（1日平均・少ないほど良い）",scr(lmon,lend),scr(mon,k),"分");
  const cnt=(fn,a,b)=>{let n=0,any=false;for(let x=a;x<=b;x=addDays(x,1)){if(S.days[x])any=true;if(fn(S.days[x]))n++}return any?n:null};
  rows+=cmpRow("呼吸・瞑想（日数）",cnt(breathDoneOn,lmon,lend),cnt(breathDoneOn,mon,k),"日");
  rows+=cmpRow("自重の型（回数）",cnt(bwDoneOn,lmon,lend),cnt(bwDoneOn,mon,k),"回");
  Object.keys(Object.assign({},va,vb)).forEach(id=>{const t=(va[id]||vb[id]).t;rows+=cmpRow(t.name,va[id]?va[id].s:null,vb[id]?vb[id].s:null,t.unit||"")});
  out.push('<section class="sec"><p class="eyebrow">VS 過去の自分 ・ '+(span?'今週の月〜'+WD[wdOf(k)]+'曜と、先週の同じ期間を比べる':'今日（月曜）と先週の月曜を比べる')+'</p><h2>昨日の自分との対決</h2>'+(a&&b?'<p class="small muted" style="text-align:center">修行の達成率</p><div class="vs"><div><div class="small muted">先週</div><div class="big num">'+a.rate+'%</div></div><div class="muted">→</div><div><div class="small muted">今週</div><div class="big now num">'+b.rate+'%</div></div></div><p style="text-align:center;margin-top:4px;font-family:var(--display);color:'+(b.rate>=a.rate?"var(--gold-hi)":"var(--muted)")+'">'+(b.rate>=a.rate?"+":"")+(b.rate-a.rate)+'ポイント</p>':'<p class="small muted">比較できる記録がまだありません。未記録の日は0点として扱わず、比較から外します。</p>')+(rows?'<div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>項目</th><th class="r">先週</th><th class="r">今週</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'')+'</section>');
  // ステータス
  out.push('<section class="sec" id="sec-status"><p class="eyebrow">STATUS ・直近30日の対象行動の達成率</p><h2>六能力</h2><div class="stats">'+[1,2,6,5,3,4].map(c=>{const v=ability(c);return '<div class="stat"><span>'+CATS[c].ab+'</span><div class="bar"><i style="width:'+(v||0)+'%"></i></div><b>'+(v==null?"—":v)+'</b></div>'}).join("")+'</div><p class="small muted" style="margin-top:10px">精神力などを医学的・心理学的に測った数値ではありません。行動をどれだけ実践したかの参考指標です。</p></section>');
  // 修行絵巻（カレンダー）
  out.push(renderMirror());
  out.push(calendar());
  // 週の振り返り
  const wk=S.main.weeklies[mon];
  out.push('<section class="sec"><div class="row"><div class="grow"><p class="eyebrow" style="margin:0">週間振り返り ・ '+fmtMD(mon)+'の週</p><h2 style="margin:0">七徳の実践</h2></div>'+(wk?'<span class="tag gold">記入済 +'+EXP_WEEK+'</span>':'')+'</div>'+(wk?'<p class="small" style="margin-top:8px"><b style="color:var(--gold-hi);font-family:var(--display)">'+esc(wk.virtue)+'</b>　'+esc(wk.action)+'</p>':'')+'<button class="btn wide" data-act="weekly" style="margin-top:10px">'+(wk?"見直す":"今週を振り返る")+'</button></section>');
  // EXP履歴
  const evAll=expEvents();const ev=(ui.expAll?evAll.slice(-200):evAll.slice(-12)).reverse();
  const refl=Object.keys(S.days).filter(x=>S.days[x].reflection&&x<k).sort().reverse().slice(0,ui.reflAll?60:7);
  out.push('<section class="sec" id="sec-refl-list"><p class="eyebrow">これまでの省察</p>'+(refl.length?refl.map(x=>{const r=S.days[x].reflection;return '<details class="more" style="border-top:1px solid var(--line)"><summary><span class="num">'+fmtMD(x)+'</span>　<span class="muted">'+esc((r.result||r.issue||r.improve||"").slice(0,24))+'</span></summary><div class="small muted" style="padding-bottom:8px">できたこと：'+esc(r.result||"—")+'<br>課題：'+esc(r.issue||"—")+'<br>改善策：'+esc(r.improve||"—")+(r.cause?'<br>原因：'+esc(r.cause):'')+(r.slips&&r.slips.length?'<br>戒め：'+esc(r.slips.join("、")):'')+'</div></details>'}).join("")+'<button class="btn ghost sm" data-act="reflAll" style="margin-top:6px">'+(ui.reflAll?"減らす":"もっと見る")+'</button>':'<p class="small muted">まだありません。</p>')+'</section>');
  out.push('<section class="sec"><p class="eyebrow">EXP履歴 ・ 記録から毎回再計算</p><div class="tbl-wrap"><table><tbody>'+(ev.length?ev.map(e=>'<tr><td class="muted">'+fmtMD(e.k)+'</td><td style="white-space:normal">'+esc(e.what)+'</td><td class="r" style="color:var(--gold-hi)">+'+e.exp+'</td></tr>').join(""):'<tr><td class="muted">まだありません</td></tr>')+'</tbody></table></div>'+(evAll.length>12?'<button class="btn ghost sm" data-act="expAll" style="margin-top:6px">'+(ui.expAll?"直近だけ表示":"すべて表示（"+evAll.length+"件）")+'</button>':'')+'</section>');
  // 再起履歴
  if(S.main.recoveries.length)out.push('<section class="sec"><p class="eyebrow">再起履歴</p>'+S.main.recoveries.slice().reverse().map(r=>{const t=S.main.tasks.find(x=>x.id===r.taskId);return '<div class="small" style="padding:4px 0"><span class="muted num">'+fmtMD(r.date)+'</span>　'+esc(t?t.name:"")+'　→ '+esc((RECOVER.find(x=>x.k===r.choice)||{}).t)+(r.note?'<div class="muted">'+esc(r.note)+'</div>':'')+'</div>'}).join("")+'</section>');
  return out.join("");
}
function okiteAvg(from,to){let n=0,s=0;for(let k=from;k<=to;k=addDays(k,1)){const d=S.days[k];if(d&&d.okite&&Object.keys(d.okite).length){n++;s+=okiteCount(d).ok}}return n?Math.round(s/n*10)/10:null}
function slipAvg(from,to){let n=0,s=0;for(let k=from;k<=to;k=addDays(k,1)){const r=S.days[k]&&S.days[k].reflection;if(r&&r.slips){n++;s+=r.slips.length}}return n?Math.round(s/n*10)/10:null}
function cmpRow(label,a,b,u){if(a==null&&b==null)return"";return '<tr><td style="white-space:normal">'+esc(label)+'</td><td class="r">'+(a==null?"—":a+esc(u))+'</td><td class="r"'+(a!=null&&b!=null&&b>a?' style="color:var(--gold-hi)"':'')+'>'+(b==null?"—":b+esc(u))+'</td></tr>'}
function dayLevel(k){
  const ts=S.main.tasks.filter(t=>t.status!=="中止"&&taskOn(t,k));if(!ts.length)return 0;
  let ok=0,n=0;ts.forEach(t=>{const l=logOf(k,t.id);if(l&&isExcluded(l.state))return;n++;if(l&&isDoneState(l.state))ok++});
  if(!n)return 0;const r=ok/n;return r>=1?3:r>=.5?2:r>0?1:0;
}
function excuseStats(days){const k=todayKey();const c={};
  for(let i=1;i<=days;i++){const d=S.days[addDays(k,-i)];if(!d)continue;
    Object.values(d.logs||{}).forEach(l=>{if(l.reason&&!l.bulk)c[l.reason]=(c[l.reason]||0)+1});
    if(d.reflection&&d.reflection.issue)c[d.reflection.issue]=(c[d.reflection.issue]||0)+1}
  return Object.keys(c).map(r=>({r,n:c[r]})).sort((a,b)=>b.n-a.n)}
function featSheet(){const F=ui.feat;const unit=F.kind&&(F.kind.match(/（([^）]*)）$/)||[])[1];
  openSheet('<p class="eyebrow">人生の戦績</p><h2>現実で、何が変わった？</h2><p class="small muted" style="margin:6px 0">分野</p><div class="chips">'+Object.keys(FEATS).map(c=>'<button class="chip" data-act="featPick" data-f="cat" data-v="'+c+'" aria-pressed="'+(F.cat===c)+'">'+c+'</button>').join("")+'</div>'+
  (F.cat?'<p class="small muted" style="margin:12px 0 6px">中身</p><div class="qopts">'+FEATS[F.cat].map(x=>'<button class="qopt" data-act="featPick" data-f="kind" data-v="'+esc(x)+'" aria-pressed="'+(F.kind===x)+'"><span>'+esc(x)+'</span></button>').join("")+'</div>':'')+
  (F.kind?(unit?'<label class="f" style="margin-top:12px">どれだけ（'+unit+'）<input type="number" inputmode="decimal" id="ft-v"></label>':'')+'<label class="f" style="margin-top:10px">ひとこと（任意。事実の記録なので書いてよい）<input type="text" id="ft-n" maxlength="50" placeholder="例：宅建に合格した"></label>':'')+
  '<div class="grid2" style="margin-top:12px"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="featSave" '+(F.kind?"":"disabled")+'>刻む</button></div>')}
// 読み込むファイルは、他人から渡されたものかもしれない。画面に差し込まれて命令として動かないよう、
// 文字列とキーから < > " ' を全角に置き換え、日付でない日のキーと、型を書き換えるキーを捨てる。
const IMP_BAD=new Set(["__proto__","constructor","prototype"]);
function importClean(v,dep){if(dep>40)return null;
  if(typeof v==="string")return v.replace(/[<>"'`]/g,c=>({"<":"＜",">":"＞",'"':"＂","'":"＇","`":"｀"}[c]));
  if(Array.isArray(v))return v.map(x=>importClean(x,dep+1));
  if(v&&typeof v==="object"){const o={};Object.keys(v).forEach(k=>{if(IMP_BAD.has(k))return;o[importClean(k,dep)]=importClean(v[k],dep+1)});return o}
  return typeof v==="number"&&!isFinite(v)?0:v}
function importPreview(x){if(!x||!x.main||typeof x.main!=="object"||Array.isArray(x.main)||!x.days||typeof x.days!=="object"||Array.isArray(x.days)){toast("武士道の記録ではありません");return}
  x=importClean(x,0);Object.keys(x.days).forEach(k=>{if(!/^\d{4}-\d\d-\d\d$/.test(k)||!x.days[k]||typeof x.days[k]!=="object"||Array.isArray(x.days[k]))delete x.days[k]});
  ui.importData=x;ui.importOld=Object.keys(S.days);const n=Object.keys(x.days).length;const ks=Object.keys(x.days).sort();
  openSheet('<p class="eyebrow">復元の確認</p><h2>この記録で置き換える。</h2><div class="note small"><p>書き出した日時：'+esc(String(x.exportedAt||"不明").slice(0,16).replace("T"," "))+'</p><p>記録：'+n+'日分'+(n?'（'+fmtMD(ks[0])+'〜'+fmtMD(ks[n-1])+'）':'')+'</p><p>修行：'+((x.main.tasks||[]).length)+' ・ 名前：'+esc(x.main.displayName||"")+'</p></div><div class="banner red small" style="margin-top:8px">今の記録は、この内容で置き換わる。先に今の記録を書き出しておけ。写真は復元されない。</div><div class="grid2" style="margin-top:12px"><button class="btn" data-act="closeSheet">やめる</button><button class="btn red" data-act="importYes">置き換えて復元する</button></div>')}
// 端末内の自動の控え（1日1回・写真を除く）
function autoBackup(){try{const k=todayKey();const b=JSON.parse(localStorage.getItem("bushido.backup")||"null");if(b&&b.date===k)return;if(!S.main.onboarded||S.main.demo)return;
  localStorage.setItem("bushido.backup",JSON.stringify({date:k,data:{exportedAt:new Date().toISOString(),main:S.main,days:S.days}}))}catch(e){}}
function photoDays(){return Object.keys(S.days).filter(x=>S.days[x].photo).sort()}
function renderMirror(){
  const k=todayKey();const ds=photoDays();const s0=S.main.self0;const has=!!(S.days[k]&&S.days[k].photo);
  const base=s0?{ph:s0.key,label:"開始時点 "+fmtMD(s0.date),date:s0.date,pk:1}:ds[0]?{ph:ds[0],label:"初日 "+fmtMD(ds[0]),date:ds[0]}:null;
  const pickD=ui.mirB&&ds.includes(ui.mirB)?ui.mirB:ds[ds.length-1];
  const other=pickD&&(!base||base.pk||pickD!==base.ph)?{ph:pickD,label:(pickD===ds[ds.length-1]?"最新 ":"")+fmtMD(pickD)+(base?" ・ "+diffDays(base.date,pickD)+"日後":""),date:pickD}:null;
  const fig=x=>x?'<figure><img '+(x.pk?'data-pk':'data-ph')+'="'+x.ph+'" alt="'+x.label+'の写真"><figcaption>'+x.label+'</figcaption></figure>':'<figure class="empty"><figcaption>次の写真で<br>比べられる</figcaption></figure>';
  return '<section class="sec" id="sec-mirror"><div class="row"><div class="grow"><p class="eyebrow" style="margin:0">自分への証拠写真 ・ 成長記録</p><h2 style="margin:0">姿見の記録</h2></div>'+(has?'<span class="tag gold">今日撮影済</span>':'')+'</div><p class="small muted" style="margin:6px 0 10px">誰にも見せない、自分だけの記録です。同じ場所・同じ光で撮ると体型の変化が分かります。写真はあなた専用の保存領域にだけ置かれ、達成証には入らず、AIにも送られません。'+(s0?'開始時点の写真が比較の基準です。':'')+'</p>'+
  (base?'<div class="mirror2">'+fig(base)+fig(other)+'</div>':'<p class="small muted">まだ写真がない。登録は任意。</p>')+
  (ds.length?'<details class="more"'+(ui.mirB?" open":"")+'><summary>日付別の写真（'+ds.length+'枚）・ 押すと比較する写真を変える</summary><div class="mirgrid">'+ds.slice().reverse().slice(0,24).map(x=>'<button data-act="mirSel" data-v="'+x+'" aria-pressed="'+(x===pickD)+'"><img data-ph="'+x+'" alt="'+fmtMD(x)+'の姿見" loading="lazy"><span>'+fmtMD(x)+'</span></button>').join("")+'</div></details>':'')+
  '<button class="btn '+(has?"":"gold ")+'wide" data-act="photo" style="margin-top:10px">'+(has?"今日の写真を撮り直す":"今日の姿見を撮る")+'</button>'+(s0?'':'<p class="small muted" style="margin-top:6px">開始時点の写真は「誓いの間」で登録できる。</p>')+'</section>';
}
async function fillPhotos(){const imgs=document.querySelectorAll("img[data-ph]");for(const im of imgs){if(im.getAttribute("src"))continue;const u=await photoLoad(im.dataset.ph);if(u)im.src=u;else{const f=im.closest("figure");if(f)f.classList.add("empty");im.style.display="none"}}}
function takePhoto(){let inp=$("#ph-in");if(!inp){inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.setAttribute("capture","user");inp.id="ph-in";inp.hidden=true;document.body.appendChild(inp);
  inp.addEventListener("change",async()=>{const f=inp.files&&inp.files[0];inp.value="";if(!f)return;
    try{const url=await shrink(f,540);const k=todayKey();const ok=await photoSave(k,url);day(k).photo=true;saveDay(k);toast(ok?"姿見を記録した":"写真は今回だけ表示します",ok?"自分だけの証拠":"この画面では写真を保存できませんでした");render()}catch(e){console.warn(e);toast("写真を保存できませんでした","容量が足りない可能性があります")}})}
  inp.click()}
function shrink(file,max){return new Promise((res,rej)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{const sc=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);res(c.toDataURL("image/jpeg",.72))};img.onerror=e=>{URL.revokeObjectURL(u);rej(e)};img.src=u})}
/* ============ 達成証（SNSに出してよい内容だけ：名前・段位・達成・日付・記録番号） ============ */
async function makeCert(w,i){
  try{await Promise.all([document.fonts.load('800 120px "Shippori Mincho B1"'),document.fonts.load('500 30px "Zen Kaku Gothic New"')])}catch(e){}
  const W=1080,H=1350;const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
  const D='"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif',B='"Zen Kaku Gothic New","Hiragino Sans",sans-serif';
  const bg=g.createRadialGradient(W/2,H*.35,50,W/2,H*.5,900);bg.addColorStop(0,"#2a2214");bg.addColorStop(1,"#0b0a08");g.fillStyle=bg;g.fillRect(0,0,W,H);
  g.strokeStyle="#c9a24a";g.lineWidth=4;g.strokeRect(48,48,W-96,H-96);g.lineWidth=1.5;g.strokeRect(66,66,W-132,H-132);
  // 家紋
  g.save();g.translate(W/2,190);g.strokeStyle="#c9a24a";g.lineWidth=4;g.beginPath();g.arc(0,0,58,0,Math.PI*2);g.stroke();g.fillStyle="#c9a24a";g.beginPath();for(let j=0;j<8;j++){const a=j*Math.PI/4-Math.PI/2;const r=j%2?16:44;g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath();g.fill();g.fillStyle="#0b0a08";g.beginPath();g.arc(0,0,8,0,Math.PI*2);g.fill();g.restore();
  g.textAlign="center";g.fillStyle="#a39a89";g.font='500 28px '+B;g.fillText("武 士 道 ・ THE WAY OF SELF MASTERY",W/2,300);
  const gold=g.createLinearGradient(0,330,0,500);gold.addColorStop(0,"#f3d98a");gold.addColorStop(1,"#c9a24a");g.fillStyle=gold;g.font='800 170px '+D;g.fillText("達成証",W/2,500);
  g.fillStyle="#f2ede3";g.font='800 64px '+D;g.fillText(w.cert.t,W/2,640);
  g.fillStyle="#d8cfbd";g.font='500 34px '+B;g.fillText(w.cert.s,W/2,705);
  g.strokeStyle="#3a3226";g.lineWidth=2;g.beginPath();g.moveTo(240,770);g.lineTo(W-240,770);g.stroke();
  const rank=w.cert.rank!=null?w.cert.rank:S.main.rankMax;
  g.fillStyle="#a39a89";g.font='500 30px '+B;g.fillText("段位",W/2,840);g.fillStyle="#ecc96f";g.font='800 72px '+D;g.fillText(RANKS[rank].n,W/2,920);
  g.fillStyle="#f2ede3";g.font='800 52px '+D;g.fillText((S.main.displayName||"")+"　殿",W/2,1030);
  const dd=parseKey(w.k);g.fillStyle="#a39a89";g.font='500 30px '+B;g.fillText(dd.getFullYear()+"年"+(dd.getMonth()+1)+"月"+dd.getDate()+"日",W/2,1100);
  const no="No. BSD-"+w.k.replace(/-/g,"")+"-"+String(i+1).padStart(3,"0");g.font='500 26px '+B;g.fillText(no,W/2,1145);
  // 朱印
  g.save();g.translate(W-230,H-250);g.rotate(-.08);g.strokeStyle="#b8392c";g.fillStyle="rgba(184,57,44,.12)";g.lineWidth=6;g.fillRect(-70,-70,140,140);g.strokeRect(-70,-70,140,140);g.fillStyle="#c9473a";g.font='800 52px '+D;g.fillText("武士",0,-8);g.fillText("道印",0,52);g.restore();
  g.fillStyle="#6f6758";g.font='500 22px '+B;g.textAlign="left";g.fillText("没収なし・再起あり。己を律し、己を磨く。",110,H-110);
  return {canvas:c,no};
}
async function certSheet(i){
  const w=victories()[i];if(!w||!w.cert)return;
  openSheet('<p class="eyebrow">達成証</p><h2>'+esc(w.cert.t)+'</h2><p class="small muted">準備中…</p>');
  const {canvas,no}=await makeCert(w,i);const url=canvas.toDataURL("image/png");ui.certCanvas=canvas;ui.certNo=no;
  openSheet('<p class="eyebrow">達成証 ・ '+no+'</p><h2>'+esc(w.cert.t)+'</h2><img src="'+url+'" alt="達成証の画像" style="width:100%;border-radius:4px;border:1px solid var(--line)"><p class="small muted" style="margin:8px 0">表示名・段位・達成の種類・日付・記録番号だけを載せています。修行の中身や日記、体の情報は入りません。SNSに出すかどうかは自由です。</p><div class="grid2"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="certSave">画像を保存</button></div><p class="small muted" id="cert-msg" style="margin-top:6px"></p>');
}
function calendar(){
  const today=todayKey();const off=ui.calOff||0;const end=addDays(mondayOf(today),6-35*off);const start=addDays(end,-34);const sel=ui.calSel;
  let cells='';["月","火","水","木","金","土","日"].forEach(w=>cells+='<div class="h">'+w+'</div>');
  for(let k=start;k<=end;k=addDays(k,1)){
    const fut=k>today;cells+='<button class="d l'+(fut?0:dayLevel(k))+(k===today?" today":"")+(k===sel?" sel":"")+'" data-act="cal" data-k="'+k+'" '+(fut?"disabled":"")+' aria-label="'+fmtMD(k)+'">'+parseKey(k).getDate()+'</button>';
  }
  let detail='';
  if(sel){const d=S.days[sel];const r=d&&d.reflection;
    detail='<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px"><h3>'+fmtMD(sel)+'</h3>'+
    S.main.tasks.filter(x=>x.status!=="中止"&&sel>=x.start).map(x=>{const l=logOf(sel,x.id);const st=inPause(x,sel)?"一時停止中":!taskOn(x,sel)?"休息日":l?{done:"達成",min:"最低ライン",miss:"未達成",rest:"休息",excused:"正当な事情"}[l.state]:"未記録";return '<div class="row small" style="padding:2px 0"><span class="grow">'+esc(x.name)+'</span><span class="muted">'+st+(l&&l.reason?"（"+esc(l.reason)+"）":"")+'</span></div>'}).join("")+
    (d&&d.mission?'<div class="small" style="margin-top:6px">一太刀：'+esc(d.mission.text)+' <span class="muted">'+({done:"達成",part:"一部達成",miss:"未達成",postponed:"延期・中止"}[d.mission.result]||"結果未記録")+'</span></div>':'')+
    (r?'<div class="small muted" style="margin-top:6px">成果：'+esc(r.result||"—")+'<br>課題：'+esc(r.issue||"—")+'<br>改善策：'+esc(r.improve||"—")+(r.slips?'<br>戒め：'+(r.slips.length?esc(r.slips.join("、")):"なし"):'')+'</div>':'')+
    (diffDays(sel,today)===1?'<p class="small muted" style="margin-top:6px">昨日の分は道場の各修行から記録できます。</p>':'')+'</div>';}
  return '<section class="sec" id="sec-cal"><div class="row"><p class="eyebrow grow" style="margin:0">修行絵巻 ・ '+fmtMD(start)+'〜'+fmtMD(end)+'</p><button class="btn sm ghost" data-act="calNav" data-v="1" aria-label="前の5週">‹</button><button class="btn sm ghost" data-act="calNav" data-v="-1" '+(off?"":"disabled")+' aria-label="次の5週">›</button></div><div class="cal" style="margin-top:8px">'+cells+'</div><p class="small muted" style="margin-top:6px">色が濃いほど、その日の修行を多く達成。日付を押すと記録が見られます。</p>'+detail+'</section>';
}

/* ============ 誓いの間 ============ */
function swordSVG(stage){
  // 0 見習い：木刀／1 足軽：素の刀／2 侍：拵えの整った刀／3 武士：黒漆の鞘／4 師範：透かし鍔と下げ緒／5 達人：金の家紋と光
  const st=Math.max(0,Math.min(5,stage|0));const G="#c9a24a",GH="#ecc96f";
  const lbl='刀：'+SWORDS[st];
  let h='<svg class="sword" viewBox="0 0 340 120" role="img" aria-label="'+lbl+'"><defs>'+
   '<linearGradient id="sw-bl" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f4f6f7"/><stop offset=".45" stop-color="#c3c8cc"/><stop offset="1" stop-color="#6f757a"/></linearGradient>'+
   '<linearGradient id="sw-wd" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b48a5a"/><stop offset=".55" stop-color="#8a6237"/><stop offset="1" stop-color="#5e4022"/></linearGradient>'+
   '<linearGradient id="sw-sy" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3a3530"/><stop offset=".4" stop-color="#14110e"/><stop offset="1" stop-color="#050404"/></linearGradient>'+
   '<radialGradient id="sw-gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="'+GH+'" stop-opacity=".28"/><stop offset="1" stop-color="'+GH+'" stop-opacity="0"/></radialGradient></defs>';
  const y=60;
  if(st===5)h+='<ellipse cx="185" cy="'+y+'" rx="165" ry="46" fill="url(#sw-gl)"/>';
  if(st===0){ // 木刀：一本の木、反りのある素朴な形、小さな輪の鍔
    h+='<path d="M14 '+(y-5)+' L120 '+(y-5)+' Q230 '+(y-9)+' 318 '+(y-18)+' Q326 '+(y-17)+' 324 '+(y-11)+' Q232 '+(y+1)+' 120 '+(y+5)+' L14 '+(y+5)+' Q8 '+y+' 14 '+(y-5)+'Z" fill="url(#sw-wd)" stroke="#4a321a" stroke-width="1"/>'+
       '<ellipse cx="96" cy="'+y+'" rx="4" ry="13" fill="#2b2117" stroke="#4a321a"/>'+
       [30,46,62,78].map(x=>'<path d="M'+x+' '+(y-5)+' v10" stroke="#6e4e2b" stroke-width="1" opacity=".6"/>').join("");
    return h+'</svg>'}
  // 刀身（反り）
  const tip=318,base=104;
  h+='<path d="M'+base+' '+(y-4)+' L250 '+(y-7)+' Q300 '+(y-11)+' '+tip+' '+(y-20)+' Q312 '+(y-8)+' 250 '+(y+2)+' L'+base+' '+(y+4)+'Z" fill="url(#sw-bl)" stroke="#5a6064" stroke-width=".6"/>';
  if(st>=2)h+='<path d="M'+(base+4)+' '+(y+1.6)+' q14 -3 28 0 t28 0 t28 0 t28 -.6 t28 -1.4 t26 -3 t20 -5" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1"/>'; // 刃文
  if(st===5)h+='<path d="M'+(base+10)+' '+(y-3)+' L300 '+(y-11)+'" stroke="'+GH+'" stroke-opacity=".7" stroke-width="1.2"/>';
  // 鎺（はばき）
  h+='<rect x="'+(base-6)+'" y="'+(y-6)+'" width="9" height="12" rx="1.5" fill="'+(st>=2?G:"#8c8f92")+'"/>';
  // 鍔
  if(st===1)h+='<ellipse cx="'+(base-11)+'" cy="'+y+'" rx="5" ry="16" fill="#3a3a3c" stroke="#58585a"/>';
  else if(st<=3)h+='<ellipse cx="'+(base-11)+'" cy="'+y+'" rx="5.5" ry="17" fill="#2a2a2c" stroke="'+G+'" stroke-width="1.4"/>';
  else h+='<ellipse cx="'+(base-11)+'" cy="'+y+'" rx="6" ry="19" fill="'+(st===5?G:"#2a2a2c")+'" stroke="'+GH+'" stroke-width="1.6"/>'+
        '<circle cx="'+(base-11)+'" cy="'+(y-9)+'" r="2.4" fill="'+(st===5?"#2a2a2c":G)+'"/><circle cx="'+(base-11)+'" cy="'+(y+9)+'" r="2.4" fill="'+(st===5?"#2a2a2c":G)+'"/>'; // 透かし
  // 柄
  const hx=14,hw=base-17-hx;
  h+='<rect x="'+hx+'" y="'+(y-6)+'" width="'+hw+'" height="12" rx="4" fill="#141210"/>';
  if(st===1)h+=[0,1,2,3,4,5].map(i=>'<path d="M'+(hx+6+i*12)+' '+(y-6)+' l6 12" stroke="#55534f" stroke-width="1.4"/>').join("");
  else h+=[0,1,2,3,4,5].map(i=>'<path d="M'+(hx+6+i*12)+' '+(y-6)+' l6 6 l-6 6" fill="none" stroke="'+(st>=4?G:"#8a7a5a")+'" stroke-width="1.3"/>').join(""); // 菱巻
  if(st>=2)h+='<ellipse cx="'+(hx+hw/2)+'" cy="'+y+'" rx="6" ry="2.6" fill="'+G+'"/>'; // 目貫
  h+='<rect x="'+(hx-4)+'" y="'+(y-6.5)+'" width="6" height="13" rx="2" fill="'+(st>=3?G:"#3b3b3b")+'"/>'; // 頭
  // 鞘（武士から）：刀の下に置く
  if(st>=3){const sy=y+30;
    h+='<path d="M'+(base-4)+' '+(sy-6)+' L250 '+(sy-8)+' Q300 '+(sy-11)+' 324 '+(sy-17)+' L326 '+(sy-8)+' Q300 '+(sy-1)+' 250 '+(sy+2)+' L'+(base-4)+' '+(sy+4)+'Z" fill="url(#sw-sy)" stroke="'+(st>=4?G:"#3a3226")+'" stroke-width=".8"/>'+
       '<path d="M318 '+(sy-15.5)+' L326 '+(sy-17)+' L326 '+(sy-8)+' L318 '+(sy-6)+'Z" fill="'+G+'"/>'+ // こじり
       '<rect x="'+(base-4)+'" y="'+(sy-6)+'" width="7" height="10" fill="'+G+'"/>'; // 鯉口
    if(st>=4)h+='<path d="M'+(base+30)+' '+(sy-5)+' q-4 22 -16 30 M'+(base+34)+' '+(sy-5)+' q-2 22 -10 32" fill="none" stroke="#8e2a20" stroke-width="2.4" stroke-linecap="round"/>'; // 下げ緒
    if(st===5)h+='<circle cx="220" cy="'+(sy-3)+'" r="7" fill="none" stroke="'+GH+'" stroke-width="1.2"/><path d="M220 '+(sy-9)+' l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6z" fill="'+GH+'"/>'; // 金の家紋
  }
  return h+'</svg>';
}
function renderChikai(){
  const out=[];const {exp,rank}=syncRank();const c=rankConds();
  out.push('<section class="sec plain"><p class="eyebrow">OATH</p><h2 style="font-size:calc(24px*var(--fz,1));margin:0">誓いの間</h2></section>');
  const o=S.main.oath||{};
  out.push('<section class="sec"><p class="eyebrow">'+term("起請文")+' ・ '+(o.date?fmtMD(o.date):"")+'</p><div class="oath">'+esc(o.text||"")+'</div><div class="sign">'+esc(o.signature||"")+'</div><button class="btn sm ghost" data-act="editOath" style="margin-top:8px">書き直す（履歴を残す）</button></section>');
  {const m=S.main.master;const s0=S.main.self0;
   out.push('<section class="sec" id="sec-mset"><p class="eyebrow">己の師範'+(m?' ・ '+fmtMD(m.date)+'から':'')+'</p>'+(m?'<div class="mcard">'+mPic(m)+'<div class="grow small"><b style="font-family:var(--display);font-size:calc(18px*var(--fz,1))">'+esc(m.name)+'</b><p class="muted">'+MOTIVES[m.motive].n+(m.rel?' ・ '+esc(m.rel):'')+' ・ '+((GENDERS.find(g=>g[0]===m.gender)||[])[1]||"")+'</p>'+(m.reason?'<p class="muted">理由：'+esc(m.reason)+'</p>':'')+(m.words?'<p class="muted">望んだ言葉：「'+esc(m.words)+'」</p>':'')+'</div></div><div class="stack" style="gap:6px;margin-top:10px"><button class="btn wide" data-act="mflowStart">師範の設定を変更する</button><div class="grid2"><button class="btn sm" data-act="mMasterPhoto" data-v="lib">写真を変更</button><button class="btn sm" data-act="mMasterPhoto" data-v="cam">カメラで撮る</button></div>'+(m.pk?'<button class="btn sm ghost" data-act="mMasterPhotoDel">写真を外す（絵にする）</button>':'')+'</div>':'<p class="small muted" style="margin-bottom:8px">まだ師範がいない。</p><button class="btn gold wide" data-act="mflowStart">師範を選ぶ</button>')+'</section>');
   if(S.main.vow)out.push('<section class="sec" id="sec-vow"><p class="eyebrow">師範への誓い ・ '+fmtMD(S.main.vow.date)+'</p><div class="oath vow">'+VOW_LINES.map(l=>'<p>'+l+'</p>').join("")+'<p class="last">'+VOW_LAST+'</p></div></section>');
   out.push('<section class="sec" id="sec-self0"><p class="eyebrow">己の姿 ・ 開始時点'+(s0?' ・ '+fmtMD(s0.date):'')+'</p><div class="mcard">'+sPic(s0&&s0.key)+'<p class="small muted grow">成長を比べる基準の写真。姿見の写真を撮っても上書きされない。公開されず、AIにも送られない。</p></div><div class="grid2" style="margin-top:10px"><button class="btn sm" data-act="mSelfPhoto" data-v="lib">'+(s0?"写真を変更":"写真を登録")+'</button><button class="btn sm" data-act="mSelfPhoto" data-v="cam">カメラで撮る</button></div>'+(s0?'<button class="btn sm ghost wide" data-act="mSelfDel" style="margin-top:6px">開始時点の写真を削除</button>':'')+'</section>')}
  out.push('<section class="sec"><p class="eyebrow">刀の成長 ・ '+term("守破離",SHUHARI[rank])+'</p><h2>'+SWORDS[rank]+'</h2>'+'<div class="sword-wrap">'+swordSVG(rank)+'</div>'+'<p class="small muted">段位とともに刀が鍛えられます。守（見習い・足軽）→ 破（侍・武士）→ 離（師範・達人）。</p></section>');
  out.push('<section class="sec"><p class="eyebrow">段位 ・ EXPと修行実績の両方が必要 ・ 一度得た段位は失わない</p>'+(rank>0?'<button class="btn wide" data-act="certRank" style="margin-bottom:8px">今の段位の達成証を作る</button>':'')+'<div class="ranks">'+RANKS.map((r,i)=>'<div class="rk'+(i<=rank?" got":"")+(i===rank?" cur":"")+'"><span class="n">'+r.n+'</span><span class="small"><span class="num">'+r.exp.toLocaleString()+' EXP</span>　<span class="muted">'+r.cond+'</span></span><span class="small">'+(i<=rank?'<span class="tag gold">獲得</span>':(exp>=r.exp?'':'<span class="muted num">'+Math.round(exp/r.exp*100)+'%</span>')+(c[i]?' <span class="tag">条件は達成</span>':''))+'</span></div>').join("")+'</div></section>');
  // 卒業
  const sc=settledCats().size;
  const items=[["自己管理：生活を自分で維持できる（六領域の定着）",sc>=6,sc+" / 6"],["自己判断：自分で問題を見つけ、修行を決められる（修行を3つ以上自分で追加）",S.main.tasks.length>=3,S.main.tasks.length+" / 3"],["自己改善：失敗から方法を変えられる（週次振り返り8回）",Object.keys(S.main.weeklies).length>=8,Object.keys(S.main.weeklies).length+" / 8"],["自己制御：誘惑と衝動に対処し続けられる（75日試練の完遂）",trialDone(75),""],["自己継続：命令なしで行動できる（無監督の日を4回やり切る）",unsupDays()>=4,unsupDays()+" / 4"]];
  out.push('<section class="sec"><p class="eyebrow">離 ・ 独立修行</p><h2>卒業認定</h2><p class="small muted" style="margin-bottom:8px">目的はアプリに頼らず自分を律すること。卒業は強制せず、卒業後も記録は続けられます。</p>'+items.map(x=>'<div class="row small" style="padding:5px 0;border-top:1px solid var(--line)"><span style="width:1.4em;color:'+(x[1]?"var(--gold-hi)":"var(--dim)")+'">'+(x[1]?"●":"○")+'</span><span class="grow">'+x[0]+'</span><span class="muted num">'+x[2]+'</span></div>').join("")+'<div class="row small" style="padding:5px 0;border-top:1px dashed var(--line)"><span style="width:1.4em;color:var(--dim)">参</span><span class="grow">参考：二十の力の会得（自分の力で生きる目安）</span><span class="muted num">'+Object.keys(S.main.powers||{}).length+' / 20</span></div></section>');
  if(items.every(x=>x[1])&&!S.main.graduated)out.push('<section class="sec" id="sec-grad-apply" style="border-color:var(--gold)"><p class="eyebrow">卒業 ・ 本人の申請</p><h2>五つの力は揃った。</h2><p class="small muted" style="margin-bottom:10px">卒業は強制しない。自分で決めろ。支援を受け続けることも、自分に必要な支援を自分で選ぶことも、自立の一部だ。</p><button class="btn gold wide" data-act="gradApply">卒業を申請する</button></section>');
  if(S.main.graduated)out.push('<section class="sec"><p class="eyebrow">卒業 ・ '+fmtMD(S.main.graduated.date)+'</p><h2>己が、己の師範となった。</h2><p class="small muted">記録は続けられる。命令が要らなければ、一太刀は受けなくてよい。</p></section>');
  if(items.every(x=>x[1])&&S.main.master&&S.main.graduated)out.push('<section class="sec" id="sec-grad-m"><div class="mcomment">'+mPic(S.main.master)+'<div><p class="small muted">卒業 ・ 師範 '+esc(S.main.master.name)+'</p><p class="mline" style="margin:0">「'+esc(mLine("grad"))+'」</p></div></div></section>');
  // 七徳
  out.push('<section class="sec"><p class="eyebrow">七徳の心得 ・ 日替わり固定ローテーション</p>'+VIRTUES.map(v=>'<div class="row small" style="padding:6px 0;align-items:flex-start"><b style="font-family:var(--display);color:var(--gold-hi);width:2.6em;flex:none">'+v.k+'</b><span class="grow">'+v.m+v.p.map(x=>'<span class="muted" style="display:block">・'+x+'</span>').join("")+(v.q?'<span style="display:block;color:var(--gold-hi);font-family:var(--display)">'+v.q+'</span>':'')+'</span></div>').join("")+'</section>');
  // 未来之書
  out.push('<section class="sec"><p class="eyebrow">未来之書</p><label class="f">一年後の自分へ<textarea id="future" rows="4">'+esc(S.main.future)+'</textarea></label><button class="btn sm" data-act="saveFuture" style="margin-top:8px">保存</button></section>');
  // 通知・データ
  out.push('<section class="sec"><p class="eyebrow">通知設定（アプリ内表示）</p><div class="grid2"><label class="f">朝の確認<input type="time" id="n-m" value="'+esc(S.main.notif.morning)+'"></label><label class="f">夜の省察<input type="time" id="n-n" value="'+esc(S.main.notif.night)+'"></label></div><p class="small muted" style="margin-top:6px">朝の時刻は「朝の型」の目安、夜の時刻を過ぎると「今日やること」で省察が一番上の候補になります。スマホへのプッシュ通知はこの試作品では未対応です。</p><button class="btn sm" data-act="saveNotif" style="margin-top:8px">保存</button></section>');
  if(S.main.profile){const pf=S.main.profile;const tp=typeOf(pf);
    out.push('<section class="sec" id="sec-type"><p class="eyebrow">武士の型 ・ お前はこういう男だ</p>'+(tp?typeCard(tp,true):'<p class="small muted" style="margin-bottom:8px">任意の診断（12問・約2分）。性格を4つの軸で分ける参考の分類で、稽古の難しさは型では決めない。師範の伝え方を少し合わせる。</p><button class="btn wide" data-act="typeStart">武士の型を診断する</button>')+
    '<details class="more" style="margin-top:10px"><summary>十六の型をすべて見る</summary>'+typeList(tp?tp.code:null)+'</details>'+
    '<div class="row" style="margin-top:10px"><span class="small grow">煽りの強さ</span><div class="chips">'+TONES.map(o=>'<button class="chip" data-act="setTone" data-v="'+o.v+'" aria-pressed="'+((S.main.tone||"gen")===o.v)+'">'+o.t+'</button>').join("")+'</div></div></section>');
    out.push('<section class="sec" id="sec-myprofile"><p class="eyebrow">見つめ直しの結果 ・ '+fmtMD(pf.date)+'</p><h2>今の現在地</h2>'+profileBars(pf)+(pf.flags&&pf.flags.care?'<div style="margin-top:10px">'+careNote()+'</div>':'')+'<p class="small muted" style="margin-top:8px">体や生活が変わったら、もう一度答え直す。30日ごとがよい。答えは、あなた専用の保存領域だけに置かれる。</p><button class="btn wide" data-act="retake" style="margin-top:8px">もう一度見つめ直す（'+QCOUNT+'問）</button></section>')}
  else out.push('<section class="sec"><p class="eyebrow">見つめ直し</p><button class="btn gold wide" data-act="retake">自分を見つめ直す（'+QCOUNT+'問）</button></section>');
  const F=S.main.features||{};
  const sw=(id,label,sub)=>'<button class="switch" data-act="feature" data-v="'+id+'" aria-pressed="'+(F[id]!==false)+'"><span><b>'+label+'</b><span class="small muted" style="display:block">'+sub+'</span></span><span class="knob"></span></button>';
  out.push('<section class="sec" id="sec-features"><p class="eyebrow">使う機能を選ぶ</p><p class="small muted" style="margin-bottom:4px">使わない機能は消して、画面を短くできます。記録は消えません。</p>'+sw("ritual","朝の型","起きてからの8つの手順")+sw("okite","実践しなさい。（毎日の掟）","掟は下で一つずつ選べます")+sw("train","呼吸・瞑想／自重の型","タイマーと自宅トレーニングの記録")+sw("power","二十の力（自立の試練）","週に一つ、自分の手で取り戻す")+sw("groom","身支度の型","朝・夜・顔・週一・人と会う前")+sw("urge","衝動ボタン","見たくなったら押す。60秒の呼吸で波をやり過ごす")+sw("sound","効果音","記録したときに短い音を鳴らす")+sw("tempt","欲望との対決","誘惑に勝った・負けたの記録")+sw("virtue","今日の心得（七徳）","日替わりの徳目と実践")+'<button class="btn wide" data-act="okiteSel" style="margin-top:10px">自分の掟を選ぶ（'+okiteActive().length+' / '+OKITE_ALL.length+'）</button></section>');
  out.push('<section class="sec"><p class="eyebrow">用語集</p>'+Object.keys(GLOSS).map(w=>'<details class="more" style="border-top:1px solid var(--line)"><summary>'+w+'</summary><p class="small muted" style="padding-bottom:8px">'+GLOSS[w]+'</p></details>').join("")+'</section>');
  {const L=look();const seg=(k,opts)=>'<div class="chips" role="radiogroup">'+opts.map(o=>'<button class="chip" role="radio" data-act="look" data-k="'+k+'" data-v="'+o[0]+'" aria-pressed="'+(L[k]===o[0])+'" aria-checked="'+(L[k]===o[0])+'">'+(o[2]?'<i class="sw-th" style="background:'+o[2]+'"></i>':'')+o[1]+'</button>').join("")+'</div>';
   const row=(t,h)=>'<div class="lk"><span>'+t+'</span>'+h+'</div>';
   out.push('<section class="sec" id="sec-look"><p class="eyebrow">外観 ・ 修行の記録・EXP・段位には影響しない</p><h2>外観</h2>'+
   row("外観",seg("theme",[["kuro","黒漆","#15130f"],["haku","白書","#f3eee3"],["sumi","墨","#2a2c30"]]))+
   row("文字サイズ",seg("fs",[["m","標準"],["l","大きめ"],["xl","最大"]]))+
   row("演出",seg("fx",[["std","標準"],["low","控えめ"],["min","最小限"]]))+
   row("アニメーション",seg("anim",[["on","ON"],["off","OFF"]]))+
   row("背景",seg("bg",[["rain","写真（雨の縁側）"],["calm","絵（雨の森）"],["none","無地"]]))+
   row("背景の質感",seg("tex",[["on","ON"],["off","OFF"]]))+
   row("師範の登場",seg("mfx",[["std","標準"],["low","控えめ"],["min","最小限"]]))+
   '<p class="small muted" style="margin:8px 0">演出の「最小限」では昇格の儀を短い知らせにし、達成の印も押さない。師範の登場の「控えめ」は、復帰・連続達成・週の振り返り・未達成・卒業の時だけ現れる。</p><button class="btn ghost wide sm" data-act="lookReset">外観だけを初期状態に戻す</button></section>')}
  out.push('<section class="sec"><p class="eyebrow">データ設定</p><p class="small muted">保存先：'+(store.kind==="db"?"あなた専用の領域（他の人は閲覧・編集できません）":"この端末のブラウザ内")+'</p><div class="stack" style="gap:8px;margin-top:10px"><button class="btn wide" data-act="tutStart">使い方（チュートリアル）をもう一度見る</button><div class="note small"><p class="muted">保存されている内容</p><p>記録 '+Object.keys(S.days).length+'日分 ・ 修行 '+S.main.tasks.length+' ・ 姿見の写真 '+photoDays().length+'枚'+(S.main.master&&S.main.master.pk?' ・ 師範の写真':'')+(S.main.self0?' ・ 開始時点の写真':'')+'</p><p class="muted">写真は書き出しに含まれない（写真は本人専用の保存領域にだけ置く）。'+(()=>{try{const b=JSON.parse(localStorage.getItem("bushido.backup")||"null");return b?'この端末の控え：'+fmtMD(b.date):''}catch(e){return ''}})()+'</p></div><button class="btn wide" data-act="calAdd">毎朝と夜の合図をカレンダーに入れる</button><button class="btn wide" data-act="export">記録を書き出す（JSON）</button><button class="btn wide" data-act="importOpen">書き出した記録から復元する</button>'+(store.kind==="db"?'<button class="btn wide ghost" data-act="restoreLocal">この端末の控えから復元する</button>':'')+''+(ui.confirmReset?'<div class="banner red small">すべての記録・段位・起請文を消去します。元に戻せません。</div><div class="grid2"><button class="btn" data-act="resetNo">やめる</button><button class="btn red" data-act="resetYes">消去する</button></div>':'<button class="btn red wide" data-act="reset">すべての記録を消去</button>')+'</div><div id="exportOut"></div></section>');
  return out.join("");
}

/* ============ シート（入力） ============ */
function canRecord(k){const d=diffDays(k,todayKey());return d===0||d===1}
function logSheet(tid,k){
  const t=S.main.tasks.find(x=>x.id===tid);const l=logOf(k,tid)||{};
  openSheet('<p class="eyebrow">'+fmtMD(k)+' ・ '+CATS[t.cat].name+'</p><h2>'+esc(t.name)+'</h2><div class="stack" style="gap:12px"><div class="chips" id="lg-state">'+[["done","達成"],["min","最低ライン"+(t.minimum?"（"+t.minimum+"）":"")],["miss","未達成"],["rest","休息"]].map(s=>'<button class="chip" data-act="pickState" data-v="'+s[0]+'" aria-pressed="'+(l.state===s[0])+'">'+esc(s[1])+'</button>').join("")+'</div>'+
  '<div id="lg-reason" '+(l.state==="miss"?"":"hidden")+'><label class="f">理由（逃げの記録）<select id="lg-r">'+REASONS.map(r=>'<option'+(l.reason===r.t?" selected":"")+'>'+r.t+'</option>').join("")+'</select></label><p class="small muted" style="margin-top:4px">「体調不良・疲労・負傷」「突発的な事情」は正当な事情として、達成率の対象日から外します。</p></div>'+
  '<div class="grid2"><label class="f">記録値'+(t.unit?'（'+esc(t.unit)+'）':'')+'<input type="number" inputmode="decimal" id="lg-v" value="'+esc(l.value||"")+'"></label><label class="f">メモ<input type="text" id="lg-n" maxlength="60" value="'+esc(l.note||"")+'"></label></div>'+
  '<div class="grid2"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="saveLog" data-t="'+tid+'" data-k="'+k+'">記録する</button></div>'+(l.state?'<button class="btn ghost sm" data-act="clearLog" data-t="'+tid+'" data-k="'+k+'">この日の記録を取り消す</button>':'')+
  (k===todayKey()&&canRecord(addDays(k,-1))&&taskOn(t,addDays(k,-1))&&!logOf(addDays(k,-1),tid)&&addDays(k,-1)>=t.start?'<button class="btn ghost sm" data-act="log" data-t="'+tid+'" data-k="'+addDays(k,-1)+'">昨日の分を記録する</button>':'')+'</div>');
  ui.pick=l.state||null;
}
function writeLog(tid,k,state,extra){
  if(!canRecord(k)){toast("記録できるのは今日と昨日だけです");return}
  const d=day(k);const prev=d.logs[tid];
  const reasonObj=REASONS.find(r=>r.t===(extra&&extra.reason));
  const st=state==="miss"&&reasonObj&&reasonObj.g==="just"?"excused":state;
  if(prev){S.main.edits.push({k,tid,from:prev.state,to:st,at:new Date().toISOString()});if(S.main.edits.length>300)S.main.edits.shift();saveMain()}
  d.logs[tid]=Object.assign({state:st,at:nowHM()},extra||{});
  if(st!=="miss"&&st!=="excused")delete d.logs[tid].reason;
  saveDay(k);
  const prevExp=prev&&isDoneState(prev.state);
  if(st==="done"&&!prevExp)toast("任務完了","QUEST COMPLETE  +"+EXP_TASK+" EXP");
  else if(st==="min"&&!prevExp)toast("最低ラインを守った","+"+EXP_MIN+" EXP");
  else if(st==="miss")toast("記録した","失敗から目をそらさない");
}
function taskSheet(t){
  const isNew=!t;t=t||{cat:1,name:"",minimum:"",unit:"",restDays:[]};
  openSheet('<p class="eyebrow">'+(isNew?"修行の追加（重点修行になります）":"修行の設定")+'</p><h2>'+(isNew?"次の修行を決める":esc(t.name))+'</h2><div class="stack" style="gap:12px">'+
  '<label class="f">領域<select id="tk-cat" '+(isNew?"":"disabled")+'>'+[1,2,3,4,5,6].map(i=>'<option value="'+i+'"'+(i==t.cat?" selected":"")+'>'+CATS[i].ord+" "+CATS[i].name+'</option>').join("")+'</select></label>'+
  (isNew||!canWrite()?'<div><p class="small muted" style="margin-bottom:6px">候補から選ぶ（押すと下に入ります）</p><div id="tk-pre">'+presetChips(t.cat)+'</div></div>':'')+
  (canWrite()?'':'<p class="small muted">守の段では、候補の中から選ぶ。自分の言葉で書けるのは「侍」（破の段）から。</p>')+
  '<label class="f">修行の内容<input type="text" id="tk-name" maxlength="40" value="'+esc(t.name)+'" placeholder="'+(canWrite()?"例："+esc(PRESETS[t.cat][0].n):"上の候補から選ぶ")+'" '+(canWrite()?"":"readonly")+'></label>'+
  '<div class="grid2"><label class="f">最低ライン<input type="text" id="tk-min" maxlength="40" value="'+esc(t.minimum||"")+'" '+(canWrite()?'placeholder="例：2ページ"':"readonly")+'></label><label class="f">記録の単位<input type="text" id="tk-unit" maxlength="8" value="'+esc(t.unit||"")+'" '+(canWrite()?'placeholder="分・ページ・km"':"readonly")+'></label></div>'+
  '<div><p class="small muted" style="margin-bottom:6px">休息日（未達成扱いにしない曜日）</p><div class="chips" id="tk-rest">'+[1,2,3,4,5,6,0].map(i=>'<button class="chip" data-act="toggle" data-v="'+i+'" aria-pressed="'+((t.restDays||[]).includes(i))+'">'+WD[i]+'</button>').join("")+'</div></div>'+
  (!isNew?'<label class="f">変更理由（履歴に残ります）<input type="text" id="tk-why" maxlength="60"></label><div><p class="small muted" style="margin-bottom:6px">状態</p><div class="chips">'+["進行中","定着","一時停止","中止"].filter(s=>s!=="定着"||t.settledOn).filter(s=>s!=="進行中"||!t.settledOn).map(s=>'<button class="chip" data-act="taskStatus" data-t="'+t.id+'" data-v="'+s+'" aria-pressed="'+(t.status===s)+'">'+s+'</button>').join("")+'</div></div>':'')+
  '<div class="grid2"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="saveTask" data-t="'+(t.id||"")+'">'+(isNew?"追加する":"保存")+'</button></div></div>');
}
function reflectSheet(){
  const k=todayKey(),d=day(k),r=d.reflection||{};const m=d.mission;
  ui.rf={verdict:r.verdict||null,cause:r.issue||null,fix:r.improve||null,screen:d.screen!=null?String(d.screen):null,prep:(d.prep&&d.prep.items)||[]};
  const qs=activeTasks().filter(t=>k>=t.start&&taskOn(t,k));const done=qs.filter(t=>{const l=d.logs[t.id];return l&&isDoneState(l.state)}).length;
  const facts='今日の一太刀：'+(m?esc(m.text)+'　<b>'+({done:"達成",part:"一部達成",miss:"未達成",postponed:"延期・中止"}[m.result]||"結果未記録")+'</b>':"未設定")+'<br>修行：'+done+' / '+qs.length+'　掟：'+okiteDay(d).ok;
  openSheet('<p class="eyebrow">'+fmtMD(k)+' ・ 夜の'+term("省察")+'</p><h2>今日の己を省みよ。</h2><p class="small muted" style="margin:-4px 0 8px">選ぶだけ。30秒で終わる。</p><div class="banner small">'+facts+'</div><div id="rf-body">'+rfBody()+'</div>');
}
function rfBody(){
  const mo=document.getElementById("rf-more");if(mo)ui.rfMore=mo.open;
  const r=ui.rf;const k=todayKey();const d=day(k);const prev=d.reflection||{};const y=S.days[addDays(k,-1)];
  let h='<p class="small muted" style="margin:12px 0 6px">今日の自分は</p><div class="qopts">'+VERDICTS.map(v=>'<button class="qopt" data-act="rfPick" data-f="verdict" data-v="'+v.v+'" aria-pressed="'+(r.verdict===v.v)+'"><span>'+v.t+'</span></button>').join("")+'</div>';
  if(r.verdict&&r.verdict!=="full")h+='<p class="small muted" style="margin:14px 0 6px">一番の原因は（人のせいにするな）</p><div class="chips">'+REASONS.map(x=>'<button class="chip" data-act="rfPick" data-f="cause" data-v="'+x.t+'" aria-pressed="'+(r.cause===x.t)+'">'+x.t+'</button>').join("")+'</div>';
  const ready=!!(r.verdict&&(r.verdict==="full"||r.cause));const key=r.verdict==="full"?"full":r.cause;
  h+='<details class="more" id="rf-more" style="margin-top:12px"'+(ui.rfMore||ui.grpAll?" open":"")+'><summary>詳しく振り返る（任意）</summary>';
  h+='<p class="small muted" style="margin:10px 0 6px">SNS・ショート動画に使った時間'+(y&&y.screen!=null?'（昨日：'+SCREEN_OPTS[y.screen]+'）':'')+'</p><div class="chips">'+SCREEN_OPTS.map((x,i)=>'<button class="chip" data-act="rfPick" data-f="screen" data-v="'+i+'" aria-pressed="'+(r.screen===String(i))+'">'+x+'</button>').join("")+'</div>';
  if(key&&FIXES[key])h+='<p class="small muted" style="margin:14px 0 6px">明日はこうしろ（選ばなければ一つ目にする）</p><div class="qopts">'+FIXES[key].map(x=>'<button class="qopt" data-act="rfPick" data-f="fix" data-v="'+esc(x)+'" aria-pressed="'+(r.fix===x)+'"><span>'+esc(x)+'</span></button>').join("")+'</div>';
  {const pc=prepCands();h+='<p class="small muted" style="margin:14px 0 6px">明日の仕込み（今夜やるものを選ぶ・最大3つ）</p><div class="chips" id="rf-prep">'+pc.map(x=>'<button class="chip" data-act="rfPrep" data-v="'+x+'" aria-pressed="'+((r.prep||[]).includes(x))+'">'+PREP[x]+'</button>').join("")+'<button class="chip" data-act="rfPrep" data-v="none" aria-pressed="'+((r.prep||[]).includes("none"))+'">明日は休み・仕込み不要</button></div>'}
  h+='<p class="small muted" style="margin:14px 0 6px">戒めの点検（やってしまったものを選ぶ）</p><div class="chips" id="rf-slips">'+SLIPS.map(x=>'<button class="chip" data-act="toggle" data-v="'+esc(x)+'" aria-pressed="'+((prev.slips||[]).includes(x))+'">'+esc(x)+'</button>').join("")+'</div>';
  if(canWrite())h+='<label class="f" style="margin-top:12px">自分の言葉で書き足す（破の段）<textarea id="rf-note" rows="2">'+esc(prev.note||"")+'</textarea></label>';
  h+='</details>';
  h+='<div class="grid2" style="margin-top:14px"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="saveReflect" '+(ready?"":"disabled")+'>記録する</button></div>';
  return h;
}
function weeklySheet(){
  const wk=mondayOf(todayKey());const w=S.main.weeklies[wk]||{};ui.wk={virtue:w.virtue||null,action:w.action||null,next:w.note||null,sns:w.sns||null};
  openSheet('<p class="eyebrow">'+fmtMD(wk)+'の週</p><h2>一週間を振り返れ。</h2><div id="wk-body">'+wkBody()+'</div>');
}
function wkBody(){const W=ui.wk;const v=VIRTUES.find(x=>x.k===W.virtue);const env=S.main.env;
  let h='<p class="small muted" style="margin:6px 0">〇、今週、携帯にSNSや動画のアプリはあったか</p><div class="chips">'+["なかった","あった"].map(x=>'<button class="chip" data-act="wkPick" data-f="sns" data-v="'+x+'" aria-pressed="'+(W.sns===x)+'">'+x+'</button>').join("")+'</div>'+
  (W.sns==="あった"&&env&&(env.state==="deleted"||env.state==="none")?'<p class="small" style="color:var(--red-ink);margin-top:6px">誓いを破った。責めはしない。今すぐ、もう一度消せ。</p>':'')+
  '<p class="small muted" style="margin:14px 0 6px">一、今週いちばん実践できた徳目</p><div class="chips">'+VIRTUES.map(x=>'<button class="chip" data-act="wkPick" data-f="virtue" data-v="'+x.k+'" aria-pressed="'+(W.virtue===x.k)+'">'+x.k+'</button>').join("")+'</div>';
  if(v)h+='<p class="small muted" style="margin:14px 0 6px">二、何をした</p><div class="qopts">'+v.p.map(x=>'<button class="qopt" data-act="wkPick" data-f="action" data-v="'+esc(x)+'" aria-pressed="'+(W.action===x)+'"><span>'+esc(x)+'</span></button>').join("")+'</div>';
  if(W.action)h+='<p class="small muted" style="margin:14px 0 6px">三、来週はどうする</p><div class="qopts">'+["同じ型を続ける","重点修行を一段厳しくする","崩れた日の原因を一つ潰す","休息日を決めて、守る"].map(x=>'<button class="qopt" data-act="wkPick" data-f="next" data-v="'+x+'" aria-pressed="'+(W.next===x)+'"><span>'+x+'</span></button>').join("")+'</div>';
  h+='<div class="grid2" style="margin-top:14px"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="saveWeekly" '+(W.next&&W.sns?"":"disabled")+'>記録する</button></div>';return h}
function trialSheet(base){
  const ts=activeTasks();base=base||{name:"",days:7,taskIds:ts.filter(t=>t.focus).map(t=>t.id),restDays:[]};
  openSheet('<p class="eyebrow">期間クエスト</p><h2>試練を始める</h2><div class="stack" style="gap:12px"><label class="f">試練名<input type="text" id="tr-name" maxlength="30" value="'+esc(base.name)+'" placeholder="例：早起きの30日"></label><div><p class="small muted" style="margin-bottom:6px">期間</p><div class="chips" id="tr-days">'+[7,30,75].map(n=>'<button class="chip" data-act="pickOne" data-v="'+n+'" aria-pressed="'+(base.days===n)+'">'+n+'日</button>').join("")+'</div></div><div><p class="small muted" style="margin-bottom:6px">対象修行（毎日の達成条件：選んだ修行をすべて達成、または最低ライン）</p><div class="chips" id="tr-tasks">'+ts.map(t=>'<button class="chip" data-act="toggle" data-v="'+t.id+'" aria-pressed="'+base.taskIds.includes(t.id)+'">'+esc(t.name)+'</button>').join("")+'</div></div><div><p class="small muted" style="margin-bottom:6px">休息日</p><div class="chips" id="tr-rest">'+[1,2,3,4,5,6,0].map(i=>'<button class="chip" data-act="toggle" data-v="'+i+'" aria-pressed="'+base.restDays.includes(i)+'">'+WD[i]+'</button>').join("")+'</div></div><label class="f">中止条件<input type="text" id="tr-stop" maxlength="60" value="'+esc(base.stopRule||"体調不良・負傷のとき")+'"></label><p class="small muted">成功条件：期間中の対象日すべてで条件を満たすこと。体調不良など正当な事情の日は失敗になりません。開始は今日です。</p><div class="grid2"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="startTrial">試練を開始</button></div></div>');
  ui.pick=base.days;
}

/* ============ 操作 ============ */
function mRead(){const m=ui.ob&&ui.ob.m;if(!m)return;const g=id=>{const e=$(id);return e?e.value.trim():undefined};const n=g("#mi-name");if(n!==undefined)m.name=n;const r=g("#mi-reason");if(r!==undefined)m.reason=r;const f=g("#mi-feel");if(f!==undefined)m.feel=f;const w=g("#mi-words");if(w!==undefined)m.words=w}
function chipsOn(sel){return [...document.querySelectorAll(sel+' .chip[aria-pressed=true]')].map(b=>b.dataset.v)}
