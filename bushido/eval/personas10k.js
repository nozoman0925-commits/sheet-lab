// 第三者評価 A：1万人の仮想利用者で、14日間の「今日の一太刀」の出し方を評価する（本体の計算をそのまま使う）
// 使い方: node eval/personas10k.js bushido.html [人数=10000] [日数=14] > 結果.json
// 測るもの：安全（運動禁止・けが）、生活との合い方（夜勤・シフトに朝や就寝時刻の課題）、使える時間との合い方、
//           同じ課題の繰り返し、候補の不足、難度の上がり方、段位の進み方、続く割合（下のモデルによる推定）
const {chromium}=require('playwright');const fs=require('fs');
const FILE=process.argv[2],N=+(process.argv[3]||10000),DAYS=+(process.argv[4]||14);
const src=fs.readFileSync(FILE,'utf8');
const hook='window.__E={get S(){return S},set S(v){S=v},setStore:v=>{store=v},profileFrom,lifeFrom,missionPlan,MISSIONS,MBYID,MDATA,totalExp,computeRank,RANKS,todayKey,addDays,blankMain,QS,mAlt:typeof mAlt==="function"?mAlt:null};\n';
const i=src.lastIndexOf('})();\n</script>');const html=src.slice(0,i)+hook+src.slice(i);
(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+html+'</body></html>');await p.waitForFunction(()=>window.__E);await p.waitForTimeout(300);
const BATCH=200;const agg=[];
for(let off=0;off<N;off+=BATCH){
 const r=await p.evaluate(([off,n,DAYS])=>{const E=window.__E;E.setStore({kind:"db",saveMain(){},saveDay(){},saveLog(){},wipe:async()=>{}});
  let seed=1;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};const pick=a=>a[Math.floor(rnd()*a.length)];
  const today=E.todayKey();const out=[];
  const NIGHT_RE=/(朝|起き|起床|目覚まし|23時|布団に入|二度寝|昼寝|夕方以降|朝食|寝る1時間前|就寝|同じ時刻に寝)/;
  const MIN=t=>{const m=/(\d+)\s*分/.exec(t||"");const h=/(\d+)\s*時間/.exec(t||"");return h?+h[1]*60:m?+m[1]:/一日|1日|終日/.test(t||"")?999:5};
  for(let u=off;u<off+n;u++){seed=u*7919+17;
   // ---- 人物像 ----
   const age=pick([0,1,1,2,2,3,4,5]);                     // b1：10代〜60代以上
   const role=pick(["会社員","会社員","学生","フリーランス","アルバイト","家事育児","経営者","求職中"]);
   const rhythm=role==="会社員"&&rnd()<.18?pick([3,4]):pick([0,1,1,1,2,5,6]); // l3：3=夜間 4=シフト
   const inj=rnd()<.22?[pick(["0","1","2","3"])]:["4"];   // b9：腰・膝・肩・手首・ない
   const noEx=rnd()<.07;                                  // b10：医師から運動を止められている
   const mood=rnd()<.12?3:rnd()<.25?2:rnd()<.5?1:0;        // m1：気分の落ち込み
   const time=pick(["0","0","1","1","2","3"]);             // g2：5分・15分・30分・1時間以上
   const strict=pick(["0","0","1","2"]);                  // g3
   const grit=rnd();                                      // 本人のやり抜く力（0〜1）
   const ob={b1:String(age),b4:pick(["0","1","2","3"]),b5:pick(["0","1","2","3"]),b9:inj,b10:noEx?"0":"1",s3:pick(["0","1","2","3"]),m1:String(mood===3?0:mood===2?1:mood===1?2:3),m2:pick(["0","1","2","3"]),m6:pick(["0","1","2","3"]),
     g1:[pick(["0","1","2","3","4"])],g2:time,g3:strict,tone:"gen",l1:[String(["会社員","経営者","フリーランス","アルバイト","学生","家事育児","求職中"].indexOf(role))],l2:pick(["0","1","2","3","4","5"]),l3:String(rhythm),l4:rnd()<.6?[pick(["0","1","2","3","4","5","6","7","8"])]:[]};
   // m1 の選択肢は「ほとんど毎日:3|半分以上:2|数日:1|ない:0」の順（番号0が重い）
   ob.m1=String([3,2,1,0].indexOf(mood));
   const M=E.blankMain();M.onboarded=true;M.tutVer=3;M.tutDone=true;M.prologue={done:true};M.obAns=ob;M.created=E.addDays(today,-DAYS);
   try{M.profile=E.profileFrom(ob);M.profile.life=E.lifeFrom(ob)}catch(e){out.push({u,err:"profile:"+e.message});continue}
   M.tasks=[{id:"t0",cat:1+Math.floor(rnd()*6),name:"修行",minimum:"最低",unit:"",restDays:[],status:"進行中",focus:true,start:M.created,settledOn:null,history:[]}];
   E.S={main:M,days:{}};
   const pf=M.profile,f=pf.flags||{};const night=rhythm===3||rhythm===4;const budget=[5,15,30,60][+time];
   const res={u,age,role,night,noEx,inj:inj[0]!=="4",care:!!f.care,time:budget,grit:+grit.toFixed(2),
     safety:0,careOver:0,newbieOver:0,nightMis:0,overTime:0,repeat:0,short:0,noPlan:0,noWhy:0,offers:0,done:0,miss:0,alive:true,lastDay:DAYS,lvs:[],errs:[]};
   let missStreak=0,streak=0;const seenT={};const hist=[];res.rankDay=null;
   for(let dI=0;dI<DAYS;dI++){
     // 本体は「今日」を実際の日付で数えるので、毎日、記録の日付を1日ずつ前へずらし、今日を dI 日目にする
     const k=today;M.created=E.addDays(today,-dI);M.tasks.forEach(t=>t.start=M.created);
     hist.push({logs:{},mission:null,ritual:{},reflection:null,temptations:[]});
     E.S.days={};hist.forEach((h,j)=>{E.S.days[E.addDays(today,-(dI-j))]=h});
     // 体調：ときどき不調
     const cond=rnd()<.08?"bad":rnd()<.15?"good":"normal";E.S.days[k].cond=cond;
     let plan;try{plan=E.missionPlan(k,0)}catch(e){res.errs.push(e.message);break}
     const offers=plan.offers||[];res.offers+=offers.length;
     E.S.days[k].offered=offers.map(o=>o.t); // 画面と同じく、見せた候補を記録する
     if(!plan.forced&&cond!=="bad"&&offers.length<3)res.short++;
     offers.forEach(o=>{const m=E.MBYID[o.id]||{};const tags=m.tags||[];
       if(tags.includes("ex")&&(f.noEx||cond==="bad"))res.safety++;
       if(tags.some(t=>t!=="ex"&&(f.inj||[]).includes(t)))res.safety++;
       if(f.care&&o.lv>3)res.careOver++;
       if(dI<3&&o.lv>2)res.newbieOver++;
       if(night&&NIGHT_RE.test(o.t))res.nightMis++;
       const md=E.MDATA[o.id];if(!md)res.noPlan++;else if(MIN(md[0])>budget*2&&MIN(md[0])<999)res.overTime++;
       if(!o.why)res.noWhy++;
       if(seenT[o.t]!=null&&dI-seenT[o.t]<7)res.repeat++;seenT[o.t]=dI});
     if(!offers.length){res.lastDay=dI;break}
     // 選ぶ：やり抜く力が低い人ほど軽いものを選ぶ
     const sorted=offers.slice().sort((a,b)=>a.lv-b.lv);const ch=grit<.4?sorted[0]:grit<.75?pick(sorted):sorted[sorted.length-1];
     const md=E.MDATA[ch.id];const mis=night&&NIGHT_RE.test(ch.t);const over=md&&MIN(md[0])>budget*2&&MIN(md[0])<999;
     // 達成の見込み（モデル）：やり抜く力・難度・生活との合い方・時間・気分
     let pDone=.35+.5*grit-.06*Math.max(0,ch.lv-2)-(mis?.35:0)-(over?.25:0)-(f.care?.08:0)+(cond==="good"?.05:0)-(cond==="bad"?.1:0);
     pDone=Math.max(.03,Math.min(.97,pDone));const done=rnd()<pDone;res.lvs.push(ch.lv);
     E.S.days[k].mission={text:ch.t,mid:ch.id,cat:ch.c,lv:ch.lv,setAt:"07:00",result:done?"done":"miss",missWhy:done?null:(mis?"env":over?"time":pick(["feel","time","forgot","hard"]))};
     if(done){res.done++;streak++;missStreak=0}else{res.miss++;streak=0;missStreak++}
     // 毎日の修行と夜のふり返りも、やり抜く力に応じて付ける
     if(rnd()<.3+.6*grit)E.S.days[k].logs.t0={state:rnd()<.8?"done":"min",at:"07:00"};
     if(rnd()<.15+.55*grit)E.S.days[k].reflection={verdict:done?"full":"half",improve:"x",at:"22:00"};
     if(res.rankDay==null){try{if(E.computeRank(E.totalExp())>=1)res.rankDay=dI+1}catch(e){}}
     // 続く見込み（モデル）：失敗の連続・合わない課題・時間超過で離れやすく、連続達成で残りやすい
     let pStay=.965-(missStreak>=2?.08:0)-(missStreak>=4?.1:0)-(mis?.05:0)-(over?.04:0)+(streak>=3?.02:0)+(done?.01:0);
     if(rnd()>pStay){res.alive=false;res.lastDay=dI+1;break}
   }
   try{res.exp=E.totalExp();res.rank=E.computeRank(res.exp)}catch(e){res.errs.push("exp:"+e.message)}
   out.push(res)}
  return out},[off,Math.min(BATCH,N-off),DAYS]);
 agg.push(...r);if(off%2000===0)process.stderr.write("… "+(off+BATCH)+"人\n")}
// ---- 集計 ----
const n=agg.length;const sum=k=>agg.reduce((a,x)=>a+(x[k]||0),0);const share=f=>+(agg.filter(f).length/n*100).toFixed(1);
const grp=(key)=>{const g={};agg.forEach(x=>{const v=String(x[key]);g[v]=g[v]||{n:0,stay14:0,done:0,days:0,nightMis:0};g[v].n++;if(x.alive)g[v].stay14++;g[v].done+=x.done;g[v].days+=x.done+x.miss;g[v].nightMis+=x.nightMis});
  Object.keys(g).forEach(v=>{const y=g[v];y.stay14=+(y.stay14/y.n*100).toFixed(1);y.達成率=+(y.done/Math.max(1,y.days)*100).toFixed(1);y.夜型に合わない課題_1人あたり=+(y.nightMis/y.n).toFixed(2);delete y.done;delete y.days;delete y.nightMis});return g};
const stayAt=d=>+(agg.filter(x=>x.alive||x.lastDay>=d).length/n*100).toFixed(1);
const report={人数:n,日数:DAYS,
 安全:{運動禁止やけがに反する課題:sum("safety"),心の不調の人に難度4以上:sum("careOver"),始めて3日に難度3以上:sum("newbieOver")},
 生活との合い方:{夜間・シフトの人:agg.filter(x=>x.night).length,夜型に朝や就寝時刻の課題が出た回数:sum("nightMis"),"夜型の人のうち1回以上出た割合%":+(agg.filter(x=>x.night&&x.nightMis>0).length/Math.max(1,agg.filter(x=>x.night).length)*100).toFixed(1),
   使える時間の2倍を超える課題:sum("overTime"),"5分しかない人に出た回数":agg.filter(x=>x.time===5).reduce((a,x)=>a+x.overTime,0)},
 中身:{候補が3つに満たない日:sum("short"),実行手順がない課題:sum("noPlan"),理由の説明がない課題:sum("noWhy"),"7日以内の同じ課題の再提示":sum("repeat"),"候補の総数":sum("offers")},
 結果:{"一太刀の達成率%":+(sum("done")/Math.max(1,sum("done")+sum("miss"))*100).toFixed(1),"続く割合%（モデル推定）":{"1日目":stayAt(1),"3日目":stayAt(3),"7日目":stayAt(7),"14日目":stayAt(14)},
   "EXP（中央値）":(()=>{const a=agg.map(x=>x.exp||0).sort((p,q)=>p-q);return a[Math.floor(a.length/2)]})(),"足軽に上がった人%":share(x=>x.rankDay!=null),"足軽までの日数（上がった人の中央値）":(()=>{const a=agg.filter(x=>x.rankDay!=null).map(x=>x.rankDay).sort((p,q)=>p-q);return a.length?a[Math.floor(a.length/2)]:null})(),
   "14日後の段位":agg.reduce((g,x)=>{const k=x.rank==null?"?":x.rank;g[k]=(g[k]||0)+1;return g},{})},
 生活リズム別:grp("night"),気分の不調別:grp("care"),やり抜く力別:(()=>{const g={低:[],中:[],高:[]};agg.forEach(x=>g[x.grit<.4?"低":x.grit<.75?"中":"高"].push(x));const o={};Object.keys(g).forEach(k=>{const a=g[k];o[k]={n:a.length,"14日続く%":+(a.filter(x=>x.alive).length/a.length*100).toFixed(1),"達成率%":+(a.reduce((s,x)=>s+x.done,0)/Math.max(1,a.reduce((s,x)=>s+x.done+x.miss,0))*100).toFixed(1)}});return o})(),
 エラー:{計算のエラー:agg.filter(x=>x.errs&&x.errs.length).length,例:(agg.find(x=>x.errs&&x.errs.length)||{}).errs,ページ:errs.slice(0,3)}};
console.log(JSON.stringify(report,null,1));await b.close()})();
