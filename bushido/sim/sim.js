// 1万人分の擬似利用データを生成し、全画面に流し込んで計算・表示の不整合を検出する
const {chromium}=require('playwright');
const fs=require('fs');
const N=+(process.argv[3]||10000);
const src=fs.readFileSync(process.argv[2],'utf8');
// テスト用に内部へアクセスする口を、テスト用コピーにだけ差し込む
const hook='window.__T={get S(){return S},set S(v){S=v},render,expEvents,totalExp,computeRank,rankConds,settleCheck,ability,needsRecovery,trialEval,taskOn,eligibleDays,setTab:v=>{tab=v},setStore:v=>{store=v},ui,canRecord,RANKS,GROOM,OKITE_ALL,groomWeekDone,mondayOf,addDays,todayKey,wdOf,diffDays,tutEnd,A,gapInfo,inPause,isCrit,streak,missionPlan,catLevel,MISSIONS,TYPES,day};\n';
const idx=src.lastIndexOf('})();\n</script>');
const html=src.slice(0,idx)+hook+src.slice(idx);

(async()=>{
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
  const pageErrs=[];p.on('pageerror',e=>pageErrs.push(e.message));
  await p.setContent('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>'+html+'</body></html>');
  await p.waitForFunction(()=>window.__T);
  await p.waitForTimeout(300);
  const t0=Date.now();
  const BATCH=250;const all={users:0,issues:{},examples:{},types:{},slow:[],renderMs:[]};
  for(let off=0;off<N;off+=BATCH){
    const r=await p.evaluate(([off,n])=>{
      const T=window.__T;T.setStore({kind:"db",saveMain(){},saveDay(){},wipe:async()=>{}});
      // 再現可能な乱数
      let seed=1;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};
      const pick=a=>a[Math.floor(rnd()*a.length)];
      const today=T.todayKey();
      const TYPES=["毎日やる人","平均的な人","三日坊主","気まぐれ","病気で1週間休む","記録を何度も直す","1年使い込む","一太刀だけ使う","週末は休む","初日の人"];
      const out={issues:{},examples:{},types:{},slow:[],renderMs:[]};let S0;
      const issue=(k,ex)=>{out.issues[k]=(out.issues[k]||0)+1;if(!out.examples[k])out.examples[k]=ex};
      for(let u=off;u<off+n;u++){
        seed=u*7919+13;
        const type=TYPES[u%TYPES.length];out.types[type]=(out.types[type]||0)+1;
        const L=type==="初日の人"?0:type==="1年使い込む"?365:type==="三日坊主"?3+Math.floor(rnd()*30):1+Math.floor(rnd()*120);
        const start=T.addDays(today,-L);
        const pDone={"毎日やる人":.95,"平均的な人":.65,"三日坊主":.8,"気まぐれ":.4,"病気で1週間休む":.75,"記録を何度も直す":.7,"1年使い込む":.8,"一太刀だけ使う":0,"週末は休む":.85,"初日の人":.9}[type];
        const nTasks=type==="一太刀だけ使う"?1:1+Math.floor(rnd()*6);
        const tasks=[];
        for(let i=0;i<nTasks;i++){
          const ts=i===0?start:T.addDays(start,Math.floor(rnd()*Math.max(1,L)));
          tasks.push({id:"t"+i,cat:1+Math.floor(rnd()*6),name:"修行"+i,minimum:rnd()<.7?"最低":"",unit:rnd()<.5?"分":"",restDays:type==="週末は休む"?[0,6]:(rnd()<.3?[Math.floor(rnd()*7)]:[]),status:"進行中",focus:i===nTasks-1,start:ts,settledOn:null,history:[]});
        }
        if(rnd()<.15&&tasks.length>1)tasks[0].status=pick(["一時停止","中止"]);
        if(rnd()<.2&&L>10){const t=tasks[tasks.length-1];const f=T.addDays(today,-Math.floor(rnd()*L));t.pauses=[{from:f,to:rnd()<.5?null:T.addDays(f,Math.floor(rnd()*8))}];if(!t.pauses[0].to)t.status="一時停止"}
        const days={};
        const sickFrom=T.addDays(start,Math.floor(L/2));
        const quitAfter=type==="三日坊主"?T.addDays(start,3):null;
        for(let k=start;k<=today;k=T.addDays(k,1)){
          if(quitAfter&&k>quitAfter)break;
          if(type==="気まぐれ"&&rnd()<.4)continue; // 開かなかった日
          const d={logs:{},mission:null,ritual:{},reflection:null,temptations:[]};
          const sick=type==="病気で1週間休む"&&k>=sickFrom&&k<T.addDays(sickFrom,7);
          if(type!=="一太刀だけ使う")tasks.forEach(t=>{
            if(k<t.start||!T.taskOn(t,k))return;
            if(k===today&&rnd()<.5)return;
            let st=rnd()<pDone?(rnd()<.15?"min":"done"):(rnd()<.6?"miss":null);
            if(sick)st="excused";
            if(rnd()<.03)st="rest";
            if(st)d.logs[t.id]={state:st,at:"07:00",value:rnd()<.5?String(Math.floor(rnd()*60)):"",reason:st==="miss"?"面倒だった":(st==="excused"?"体調不良・疲労・負傷":undefined)};
          });
          if(rnd()<.8)d.mission={text:"一太刀",setAt:"07:00",result:k===today&&rnd()<.5?null:pick(["done","part","miss","postponed",null])};
          const rn=rnd()<.5?8:Math.floor(rnd()*9);for(let i=0;i<rn;i++)d.ritual[i]="06:3"+i;
          if(rnd()<.5)d.reflection={result:"x",issue:"",cause:"",escape:"",improve:rnd()<.5?"改善":"",next:"",at:"22:00",slips:rnd()<.5?["愚痴を言った"]:[]};
          if(rnd()<.5){d.okite={};["o1","o2","o3","m1","m3","zz"].forEach(id=>{if(rnd()<.6)d.okite[id]=rnd()<.8?"ok":"na"})}
          if(rnd()<.4){d.groom={};T.GROOM.forEach(g=>{if(rnd()<.5){const r={};const m=rnd()<.6?g.steps.length:Math.floor(rnd()*g.steps.length);for(let i=0;i<m;i++)r[i]="07:00";d.groom[g.id]=r}})}
          if(rnd()<.3)d.breath=[{mode:"med5",sec:rnd()<.7?300:120,done:rnd()<.7,at:"07:00"}];
          if(rnd()<.3)d.bw={items:rnd()<.8?{push:{lv:Math.floor(rnd()*3),reps:String(Math.floor(rnd()*40))}}:{},at:"19:00"};
          if(rnd()<.3)d.urges=[{at:"21:00",won:true},{at:"22:00",won:rnd()<.6},{at:"23:00",won:true}].slice(0,1+Math.floor(rnd()*3));
          if(rnd()<.5)d.screen=Math.floor(rnd()*6);
          if(rnd()<.3)d.virtue={k:"礼",note:"x",at:"12:00"};
          if(rnd()<.2)d.temptations.push({type:"SNS",won:rnd()<.5,at:"21:00",note:""});
          days[k]=d;
        }
        const trials=[];
        if(rnd()<.3&&L>0){const len=pick([7,30,75]);trials.push({id:"tr",name:"試練",days:len,taskIds:[tasks[tasks.length-1].id],restDays:[],stopRule:"",start:T.addDays(today,-Math.floor(rnd()*Math.min(L,len+10))),status:rnd()<.1?"中止":"進行中",changes:[]})}
        const weeklies={};for(let k=start;k<today;k=T.addDays(k,7))if(rnd()<.4)weeklies[T.mondayOf(k)]={virtue:"誠",action:"x",note:"",date:k};
        const main=Object.assign({},{v:1,onboarded:true,tutDone:true,created:start,displayName:"u",abilities:[1],habits:{},oath:{text:"誓",signature:"u",date:start,history:[]},tasks,trials,weeklies,recoveries:rnd()<.1?[{date:T.addDays(today,-2),taskId:tasks[tasks.length-1].id,choice:"same",note:""}]:[],rankMax:0,rankLog:[],future:"",notif:{morning:"06:30",night:"21:30"},demo:false,edits:[],hints:{keiko:1,roku:1,chikai:1},features:{power:rnd()<.8,train:rnd()<.8,ritual:rnd()<.8,okite:rnd()<.8,groom:rnd()<.8,tempt:rnd()<.8,virtue:rnd()<.8},okiteOff:rnd()<.3?["o1","m3"]:[],env:rnd()<.5?{state:pick(["deleted","none","work","keep"]),date:start}:undefined,powers:rnd()<.4?{p1:{date:start,note:"x"},p7:{date:today,note:"y"},zz:{date:today,note:"不明なID"}}:{}});
        T.S={main,days};T.ui.calSel=null;
        // 全画面を描画
        let ms=0;
        for(const tab of ["dojo","keiko","roku","chikai"]){
          T.setTab(tab);const a=performance.now();
          try{T.render()}catch(e){issue("描画で例外:"+tab+":"+e.message,{type,L});continue}
          const dt=performance.now()-a;ms+=dt;
          const txt=document.getElementById("app").innerText;
          if(/NaN|undefined|\[object|Infinity/.test(txt))issue("画面に壊れた値:"+tab+":"+(txt.match(/.{0,20}(NaN|undefined|\[object|Infinity).{0,10}/)||[""])[0],{type,L});
          if(document.documentElement.scrollWidth>390)issue("横にはみ出し:"+tab,{type,L});
        }
        out.renderMs.push(ms);if(ms>300)out.slow.push({type,L,ms:Math.round(ms)});
        // カレンダーの日付を押した表示
        try{T.ui.calSel=T.addDays(today,-1);T.setTab("roku");T.render();T.ui.calSel=null}catch(e){issue("カレンダー詳細で例外:"+e.message,{type,L})}
        { T.setTab("roku");T.render();const first=document.querySelector(".cal .d");if(!first||!/（月）/.test(first.getAttribute("aria-label")))issue("カレンダーの曜日がずれている",{type,first:first&&first.getAttribute("aria-label")}) }
        // 一時停止中の日が対象日に入っていないか
        S0=T.S;S0.main.tasks.forEach(t=>{T.eligibleDays(t,t.start,today).forEach(e=>{if(T.inPause(t,e.k))issue("一時停止中の日が対象日に入った",{type})})});
        // おかえり：まとめて休みにしてもEXPは増えない／昨日より前にEXPが付かない
        const gp=T.gapInfo(today);let gv=null;
        if(gp){gv=rnd()<.5?"rest":"slack";T.setTab("dojo");T.render();const before=T.totalExp();T.A.gap({dataset:{v:gv}});T.setTab("dojo");T.render();const after=T.totalExp();if(after!==before+30)issue("復帰時のEXPが+30以外",{type,before,after});
          if(T.gapInfo(today))issue("おかえり表示が消えない",{type});
          if(gv==="rest")for(let x=gp.from;x<=gp.to;x=T.addDays(x,1)){const d=T.S.days[x];T.S.main.tasks.forEach(t=>{if((t.status==="進行中"||t.status==="定着")&&x>=t.start&&T.taskOn(t,x)&&!(d&&d.logs[t.id]))issue("空白日が残った",{type,x})})}
          out.gapUsers=(out.gapUsers||0)+1}
        {const st=T.streak();if(!(st>=0&&st<=L+2))issue("継続日数が不正",{type,st,L})}
        // ---- 修行命令エンジン ----
        { const inj=[];if(rnd()<.3)inj.push(pick(["knee","back","shoulder","wrist"]));
          const codes=Object.keys(T.TYPES);const code=pick(codes);const tempAns={};["t1","t2","t3"].forEach(x=>tempAns[x]=code[0]==="動"?"0":"3");["t4","t5","t6"].forEach(x=>tempAns[x]=code[1]==="誇"?"0":"3");["t7","t8","t9"].forEach(x=>tempAns[x]=code[2]==="型"?"0":"3");["t10","t11","t12"].forEach(x=>tempAns[x]=code[3]==="刺"?"0":"3");
          if(rnd()<.6){const sc={};["s3","s4","s5","b4","b5","b6","b8","d1","d2","d3","d6","o1","o2","k1","k2","a1","a2","m2","m3"].forEach(q=>sc[q]=Math.floor(rnd()*4));
            T.S.main.profile={score:sc,dom:{},cat:{1:Math.floor(rnd()*100),2:Math.floor(rnd()*100),3:Math.floor(rnd()*100),4:Math.floor(rnd()*100),5:Math.floor(rnd()*100),6:Math.floor(rnd()*100)},temp:tempAns,flags:{inj,noEx:rnd()<.1,care:rnd()<.1,lowFit:rnd()<.5,highFit:false}}}
          const td=T.day(today);td.mission=null;td.cond=pick(["good","normal","bad"]);
          for(const roll of [0,1]){const pl=T.missionPlan(today,roll);const pf=T.S.main.profile;const of=pl.offers;
            if(!of.length)issue("命令が1つも出ない",{type,cond:td.cond});
            if(pl.forced&&of.length!==1)issue("一本化なのに複数",{type});
            if(!pl.forced&&td.cond!=="bad"&&of.length<2)issue("命令が2つ未満",{type,n:of.length});
            const ts=of.map(o=>o.t);if(new Set(ts).size!==ts.length)issue("同じ命令が重複",{type});
            of.forEach(o=>{if(!(o.lv>=1&&o.lv<=10))issue("難度が範囲外",{lv:o.lv});if(!o.why)issue("理由が空",{t:o.t});
              const m=Object.values(T.MISSIONS).flat().find(x=>x.t===o.t);
              if(m&&m.tags){if(td.cond==="bad"&&m.tags.includes("ex"))issue("不調の日に運動の命令",{t:o.t});
                if(pf&&pf.flags.noEx&&m.tags.includes("ex"))issue("運動制限の人に運動の命令",{t:o.t});
                if(pf&&m.tags.some(x=>pf.flags.inj.includes(x)))issue("けがの部位に負担の命令",{t:o.t,inj:pf.flags.inj});}
              if(m&&m.fit==="hi"&&pf&&pf.flags.lowFit)issue("体力に合わない命令",{t:o.t});
              if(td.cond==="bad"&&o.lv>2)issue("不調の日に難度3以上",{lv:o.lv});
              if(pf&&pf.flags.care&&o.lv>3&&!o.opp)issue("心の不調の人に難度4以上",{lv:o.lv});});
          }
          for(let c=1;c<=6;c++){const cl=T.catLevel(c,today);if(!(cl.lv>=1&&cl.lv<=10))issue("分野の難度が範囲外",{c,lv:cl.lv})}
          delete T.S.main.profile;td.cond=undefined;
        }
        // ---- 不変条件 ----
        const S=T.S;const ev=T.expEvents();const exp=T.totalExp();
        if(exp<0||!Number.isFinite(exp))issue("EXPが不正",{type,exp});
        // 独立に計算し直したEXPと一致するか
        let ind=0;const ids=new Set(S.main.tasks.map(t=>t.id));
        Object.keys(S.days).forEach(k=>{const d=S.days[k];
          Object.keys(d.logs).forEach(id=>{if(!ids.has(id))return;const s=d.logs[id].state;ind+=s==="done"?10:s==="min"?5:0});
          if(d.mission&&d.mission.result==="done"){ind+=10;if(T.isCrit(k))ind+=10}if(d.urges)ind+=5*Math.min(2,d.urges.filter(u=>u.won).length);if(d.screen!=null){const y=S.days[T.addDays(k,-1)];if(y&&y.screen!=null&&d.screen<y.screen)ind+=10}if(d.mission&&d.mission.result==="part")ind+=5;
          if([0,1,2,3,4,5,6,7].every(i=>d.ritual[i]))ind+=10;
          if(d.reflection&&d.reflection.at)ind+=20;if(d.virtue)ind+=10;if(d.breath&&d.breath.some(x=>x.done))ind+=10;if(d.bw&&Object.values(d.bw.items||{}).some(x=>+x.reps>0))ind+=10;
          if(d.okite)ind+=Math.min(10,2*T.OKITE_ALL.filter(x=>d.okite[x.id]==="ok").length);
          if(d.groom)T.GROOM.forEach(g=>{const r=d.groom[g.id];if(r&&g.steps.every((_,i)=>r[i])){if(g.weekly){const mon=T.mondayOf(k);for(let x=mon;x<k;x=T.addDays(x,1)){const rr=S.days[x]&&S.days[x].groom&&S.days[x].groom[g.id];if(rr&&g.steps.every((_,i)=>rr[i]))return}}ind+=10}});
        });
        ind+=50*Object.keys(S.main.weeklies).length;if(S.main.oath&&S.main.oath.date)ind+=50;if(S.main.env&&S.main.env.date)ind+={deleted:50,none:50,work:30,keep:20}[S.main.env.state]||0;{let last=null;(S.main.returns||[]).slice().sort((a,b)=>a.date<b.date?-1:1).forEach(r=>{if(!last||(Date.parse(r.date)-Date.parse(last))/864e5>=14){ind+=30;last=r.date}})}ind+=20*Object.keys(S.main.powers||{}).filter(id=>/^p([1-9]|1[0-9]|20)$/.test(id)).length;
        S.main.tasks.forEach(t=>{if(t.settledOn)ind+=100});
        S.main.trials.forEach(tr=>{if(T.trialEval(tr).status==="完遂")ind+=200});
        if(ind!==exp)issue("EXPの再計算が合わない",{type,L,app:exp,ind});
        // 同じ記録でEXPが二重に入っていないか（同日・同項目の重複イベント）
        const seen=new Set();ev.forEach(e=>{const key=e.k+"|"+e.what;if(seen.has(key))issue("同じ日に同じEXPイベントが重複",{type,key});seen.add(key)});
        // 段位：獲得段位は計算上の段位以上、かつ条件を満たしている
        const cr=T.computeRank(exp);if(S.main.rankMax<cr)issue("段位が上がっていない",{type,cr,max:S.main.rankMax});
        const c=T.rankConds();for(let i=1;i<=cr;i++)if(!c[i]||exp<T.RANKS[i].exp)issue("条件未達で昇格",{type,i});
        // 定着：未定着の修行は条件を満たしていない／定着済みは7日以上の実績がある
        S.main.tasks.forEach(t=>{
          if(!t.settledOn&&t.status==="進行中"&&T.settleCheck(t))issue("定着条件を満たすのに未定着",{type,t:t.id});
          if(t.settledOn&&!t.demo){const el=T.eligibleDays(t,t.start,today);const ok=el.filter(e=>e.l&&(e.l.state==="done"||e.l.state==="min")).length;if(ok<7)issue("7日未満で定着",{type,ok})}
        });
        // 休息日・正当な事情の日が対象日に入っていないか
        S.main.tasks.forEach(t=>{T.eligibleDays(t,t.start,today).forEach(e=>{if((t.restDays||[]).includes(T.wdOf(e.k)))issue("休息日が対象日に入った",{type});if(e.l&&(e.l.state==="rest"||e.l.state==="excused"))issue("正当な事情の日が対象日に入った",{type})})});
        // 能力値は0〜100
        for(let cat=1;cat<=6;cat++){const a=T.ability(cat);if(a!=null&&(a<0||a>100||!Number.isFinite(a)))issue("能力値が範囲外",{type,cat,a})}
        // 記録できる日付は今日と昨日だけ
        if(T.canRecord(T.addDays(today,-2))||!T.canRecord(today)||!T.canRecord(T.addDays(today,-1))||T.canRecord(T.addDays(today,1)))issue("記録可能日の判定ミス",{});
        // 再起の判定：重点修行が直近3対象日すべて未達（未記録含む）のとき
        const f=S.main.tasks.find(t=>t.focus&&t.status==="進行中");
        if(f){let miss=0,k=T.addDays(today,-1),g=0;const lastRec=S.main.recoveries.filter(r=>r.taskId===f.id).map(r=>r.date).sort().pop()||"";
          while(miss<3&&g<20&&k>=f.start&&k>=lastRec){g++;if(T.taskOn(f,k)){const l=S.days[k]&&S.days[k].logs[f.id];if(l&&(l.state==="rest"||l.state==="excused")){k=T.addDays(k,-1);continue}if(!l||l.state==="miss")miss++;else break}k=T.addDays(k,-1)}
          if((miss>=3)!==!!T.needsRecovery())issue("再起の判定が合わない",{type,miss});}
        // 三日坊主・気まぐれの人が久しぶりに開いたとき、再起の案内が出るか
        if(type==="三日坊主"&&L>10&&f&&!S.main.recoveries.length&&T.diffDays(f.start,today)>=4&&!(f.restDays||[]).length&&!f.pauses&&gv!=="rest"&&!T.needsRecovery())issue("久しぶりに開いたのに再起案内が出ない（三日坊主）",{type,L,focusStart:f.start});
      }
      return out;
    },[off,Math.min(BATCH,N-off)]);
    all.users+=Math.min(BATCH,N-off);
    for(const k in r.issues){all.issues[k]=(all.issues[k]||0)+r.issues[k];if(!all.examples[k])all.examples[k]=r.examples[k]}
    for(const k in r.types)all.types[k]=(all.types[k]||0)+r.types[k];
    all.gapUsers=(all.gapUsers||0)+(r.gapUsers||0);all.slow.push(...r.slow);all.renderMs.push(...r.renderMs);
  }
  const ms=all.renderMs.sort((a,b)=>a-b);
  const q=x=>Math.round(ms[Math.floor(ms.length*x)]);
  console.log(JSON.stringify({users:all.users,seconds:Math.round((Date.now()-t0)/1000),types:all.types,renderMs4tabs:{p50:q(.5),p95:q(.95),max:Math.round(ms[ms.length-1])},slowOver300ms:all.slow.length,gapUsersTested:all.gapUsers,slowExamples:all.slow.slice(0,3),issues:all.issues,examples:all.examples,pageErrors:pageErrs.slice(0,5)},null,1));
  await b.close();
})();
