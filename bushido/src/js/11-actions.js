const A={
  closeSheet:(el,ev)=>{if(ev.target===el||el.tagName==="BUTTON")closeSheet()},
  obNext:()=>{if(ui.ob&&ui.ob.retConfirm&&flowX()[ui.obStep]==="self"){ui.ob.retConfirm=false;ui.obStep=flowX().indexOf("confirm");obAfter();return}ui.obStep=Math.min(flowX().length-1,ui.obStep+1);if(flowX()[ui.obStep]==="env2")ui.obStep++;obAfter()},
  envHas:el=>{const e=envTarget();e.has=el.dataset.v;envRefresh()},
  envApp:el=>{const e=envTarget();const a=e.apps=e.apps||[];const i=a.indexOf(el.dataset.v);i<0?a.push(el.dataset.v):a.splice(i,1);e.checks=(e.checks||[]).filter(c=>!/を消した$/.test(c)||a.some(x=>c===x+" を消した"));envRefresh()},
  envChoice:el=>{const e=envTarget();e.choice=el.dataset.v;e.checks=[];e.slot=null;envRefresh()},
  envCheck:el=>{const e=envTarget();const c=e.checks=e.checks||[];const i=c.indexOf(el.dataset.v);i<0?c.push(el.dataset.v):c.splice(i,1);envRefresh()},
  envSlot:el=>{const e=envTarget();e.slot=el.dataset.v;envRefresh()},
  envNext:()=>{const e=envTarget();if(!envReady(e))return;
    if(ui.envSheet){S.main.env=Object.assign({},e,{state:envState(e),date:todayKey()});saveMain();closeSheet();ui.envSheet=null;toast(S.main.env.state==="deleted"||S.main.env.state==="none"?"環境を断った":"誓いを立てた","+"+EXP_ENV[S.main.env.state]+" EXP");render();return}
    ui.obStep=flowX().indexOf("confirm");obAfter()},
  envOpen:()=>{ui.envSheet={};openSheet('<div id="env-body">'+envBody(ui.envSheet)+'</div><div id="env-btn"></div>')},
  obBack:()=>{if(ui.mflow&&ui.obStep===0){ui.mflow=null;ui.ob={};ui.obStep=0;S.main.obDraft=null;saveMain();render();return}if(ui.retake&&ui.obStep===0){ui.retake=false;ui.ob={};ui.obStep=0;S.main.obDraft=null;saveMain();render();return}ui.obStep=Math.max(0,ui.obStep-1);if(flowX()[ui.obStep]==="building")ui.obStep--;obAfter()},
  obAns:el=>{const q=el.dataset.q;ui.ob[q]=el.dataset.v;el.parentNode.querySelectorAll(".qopt,.pair-o").forEach(b=>b.setAttribute("aria-pressed",b===el));
    const o=QMAP[q]&&QMAP[q].opts[+el.dataset.v];const line=o?tauntFor(q,o.s,ui.ob.tone):null;
    if(line){setTimeout(()=>showTaunt(line,ui.ob.tone),200);return}setTimeout(()=>A.obNext(),220)},
  obTone:el=>{ui.ob.tone=el.dataset.v;setTimeout(()=>A.obNext(),200)},
  tauntNext:()=>{$("#taunt").hidden=true;$("#taunt").innerHTML="";A.obNext()},
  obMulti:el=>{const q=el.dataset.q,v=el.dataset.v;let a=(ui.ob[q]||[]).slice();const none=QMAP[q].opts.findIndex(o=>o.t==="ない"||/^特に|特にない$/.test(o.t));
    if(String(none)===v)a=a.includes(v)?[]:[v];else{a=a.filter(x=>x!==String(none));const i=a.indexOf(v);i<0?a.push(v):a.splice(i,1)}ui.ob[q]=a;render()},
  retake:()=>{ui.retake=true;ui.ob={tone:S.main.tone||null};ui.obStep=0;window.scrollTo(0,0);render()},
  setTone:el=>{S.main.tone=el.dataset.v;saveMain();render()},
  obRetakeDone:()=>{const pl=planFrom(ui.ob);applyProfile(pl,false);S.main.obAns=obAnsOf(ui.ob);ui.retake=false;ui.mflow=null;ui.restFlow=null;ui.ob={};ui.obStep=0;S.main.obDraft=null;saveMain();tab="dojo";render();window.scrollTo(0,0);toast("見つめ直した","一太刀と掟を、あなた用に入れ替えた")},
  obTimes:()=>{ui.ob.wake=$("#ob-wake").value||"07:00";ui.ob.sleep=$("#ob-sleep").value||"23:30";A.obNext()},
  obPick:()=>{ui.obPick=true;render();window.scrollTo(0,0)},
  obPickBack:()=>{ui.obPick=false;render()},
  obPickSave:()=>{const n=$("#ob-name").value.trim();if(!n){toast("候補から一つ選べ");return}
    Object.assign(ui.ob,{custom:true,cat:+$("#ob-cat").value,name:n,min:$("#ob-min").value.trim()});ui.obPick=false;render()},
  obOath:()=>{const t=$("#ob-oath").value.trim();if(!t)return;ui.ob.oath=t;A.obNext()},
  preset:el=>{const p=PRESETS[el.dataset.c][+el.dataset.i];
    el.parentNode.querySelectorAll(".chip").forEach(b=>b.setAttribute("aria-pressed",b===el));
    if($("#ob-name")){$("#ob-name").value=p.n;$("#ob-min").value=p.m||"";ui.ob.unit=p.u||"";ui.ob.rest=p.r||[];return}
    $("#tk-name").value=p.n;$("#tk-min").value=p.m||"";$("#tk-unit").value=p.u||"";
    document.querySelectorAll("#tk-rest .chip").forEach(b=>b.setAttribute("aria-pressed",(p.r||[]).includes(+b.dataset.v)))},
  groomOpen:el=>{ui.groomOpen=ui.groomOpen===el.dataset.g?null:el.dataset.g;render()},
  groom:el=>{const k=todayKey();const d=day(k);d.groom=d.groom||{};const g=GROOM.find(x=>x.id===el.dataset.g);const r=d.groom[g.id]=d.groom[g.id]||{};
    r[+el.dataset.i]=nowHM();saveDay(k);
    if(g.steps.every((_,i)=>r[i])){const w=g.weekly&&groomWeekDone(g.id,k);toast(g.n+" 完了",w&&w<k?"今週の分は記録済み":"+"+EXP_GROOM+" EXP");ui.groomOpen=null}
    render()},
  okite:el=>{const k=todayKey();const d=day(k);d.okite=d.okite||{};const id=el.dataset.v;
    if(d.okite[id]==="ok"){delete d.okite[id]}else{d.okite[id]="ok";const it=OKITE_ALL.find(x=>x.id===id);const c=okiteDay(d);
      if(c.ok+c.na>=c.act.length)toast("今日の掟をすべて片付けた","+"+EXP_OKITE+" EXP");else toast(it.t,"+"+EXP_OKITE+" EXP")}
    saveDay(k);render()},
  okiteNa:el=>{const k=todayKey();const d=day(k);d.okite=d.okite||{};const id=el.dataset.v;if(d.okite[id]==="na")delete d.okite[id];else d.okite[id]="na";saveDay(k);render()},
  okiteAll:()=>{ui.okiteAll=!ui.okiteAll;render()},
  featAll:()=>{ui.featAll=!ui.featAll;render()},
  feat:()=>{ui.feat={cat:null,kind:null};featSheet()},
  featPick:el=>{ui.feat[el.dataset.f]=el.dataset.v;if(el.dataset.f==="cat")ui.feat.kind=null;featSheet()},
  featSave:()=>{const F=ui.feat;if(!F||!F.cat||!F.kind){toast("分野と中身を選べ");return}const v=$("#ft-v")?$("#ft-v").value.trim():"";const n=$("#ft-n")?$("#ft-n").value.trim():"";
    S.main.feats=(S.main.feats||[]).concat([{date:todayKey(),cat:F.cat,kind:F.kind.replace(/（[^）]*）$/,""),value:v?(v+((F.kind.match(/（([^）]*)）$/)||[])[1]||"")):"",note:n}]);saveMain();closeSheet();toast("戦績を刻んだ","現実が変わった証だ");render()},
  typeImg:()=>typeImageSheet(),
  power:el=>{const p=POWERS.find(x=>x.id===el.dataset.v);const g=(S.main.powers||{})[p.id];ui.powerOpen=!!el.closest("details");
    openSheet('<p class="eyebrow">二十の力</p><h2>'+p.n+'</h2><div class="stack" style="gap:12px"><div class="note"><p class="small muted">試練</p><p>'+p.t+'</p></div>'+(g?'<p class="small"><span class="tag gold">'+fmtMD(g.date)+' 会得</span></p><div class="grid2"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn red" data-act="powerUndo" data-v="'+p.id+'">会得を取り消す</button></div>':'<p class="small">この試練を、本当にやり遂げたか。</p><p class="small muted">やっていないなら閉じろ。嘘の会得は、自分を裏切るだけだ。</p><div class="grid2"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="powerSave" data-v="'+p.id+'">やり遂げた</button></div>')+'</div>')},
  powerSave:el=>{const p0=POWERS.find(x=>x.id===el.dataset.v);const note=p0.t;S.main.powers=S.main.powers||{};S.main.powers[el.dataset.v]={date:todayKey(),note};saveMain();closeSheet();const p=POWERS.find(x=>x.id===el.dataset.v);toast("力を会得した",p.n+" +"+EXP_POWER+" EXP");render()},
  powerUndo:el=>{if(S.main.powers)delete S.main.powers[el.dataset.v];saveMain();closeSheet();toast("会得を取り消した");render()},
  photo:()=>takePhoto(),
  cert:el=>certSheet(+el.dataset.i),
  certRank:()=>{const v=victories();let idx=-1;v.forEach((w,j)=>{if(w.cert&&w.cert.rank!=null)idx=j});if(idx>=0)certSheet(idx)},
  certSave:async()=>{const c=ui.certCanvas;if(!c)return;const msg=$("#cert-msg");
    if(!window.claude){const blob=await new Promise(r=>c.toBlob(r,"image/png"));anchorDL("bushido-"+ui.certNo.replace(/[^A-Za-z0-9-]/g,"")+".png",blob);if(msg)msg.textContent="保存しました。";return}
    try{const dl=await window.claude.use("downloads");if(dl){const blob=await new Promise(r=>c.toBlob(r,"image/png"));await dl.save({filename:"bushido-"+ui.certNo.replace(/[^A-Za-z0-9-]/g,"")+".png",data:blob});if(msg)msg.textContent="保存しました。";return}}catch(e){if(msg)msg.textContent="保存をやめました。";return}
    if(msg)msg.textContent="この画面では保存できません。上の画像を長押しして保存してください。"},
  breath:()=>breathSheet(),
  urge:()=>urgeSheet(),
  urgeGiveUp:()=>{breathFinish(false)},
  urgeTag:el=>{ui["urge"+el.dataset.f]=el.dataset.v;el.parentNode.querySelectorAll(".chip").forEach(b=>b.setAttribute("aria-pressed",b===el))},
  urgeSave:el=>{const k=todayKey();const d=day(k);d.urges=d.urges||[];const won=el.dataset.v==="1";const before=d.urges.filter(u=>u.won).length;d.urges.push({at:nowHM(),won,type:ui.urgeType||"その他",state:ui.urgeState||null,place:ui.urgePlace||null});d.temptations.push({type:"衝動ボタン",won,at:nowHM(),note:""});saveDay(k);closeSheet();
    if(won)toast("衝動に打ち勝った",before<URGE_CAP?"+"+EXP_URGE+" EXP":"今日のEXPは上限。打ち勝ちは数えた");else toast("記録した","次は、押した時点で勝ちに近い");render();mSay(won?"urgeWin":"urgeLose")},
  breathMode:el=>{if(ui.breath)return;ui.breathMode=el.dataset.v;breathSheet()},
  breathGo:async el=>{if(ui.breath){breathFinish(false);return}
    ui.breath={mode:ui.breathMode||"med5",start:Date.now()};ui.breath.iv=setInterval(breathTick,100);el.textContent="やめる";el.classList.remove("gold");
    document.querySelectorAll("#br-modes .chip").forEach(b=>b.disabled=true);
    try{if(navigator.wakeLock){const lk=await navigator.wakeLock.request("screen");if(ui.breath)ui.breath.lock=lk;else lk.release()}}catch(e){}},
  bw:()=>bwSheet(),
  saveBw:()=>{const k=todayKey();const d=day(k);const items={};S.main.bwLevel=S.main.bwLevel||{};
    document.querySelectorAll("#bw-list [data-bw]").forEach(r=>{const id=r.dataset.bw;const lv=+r.querySelector(".bw-lv").value;const reps=r.querySelector(".bw-reps").value;S.main.bwLevel[id]=lv;if(reps!==""&&+reps>0)items[id]={lv,reps:String(Math.round(+reps))}});
    const first=!bwDoneOn(d);d.bw={items,at:nowHM()};saveDay(k);saveMain();closeSheet();
    if(Object.keys(items).length)toast("自重の型を記録した",first?"+"+EXP_BW+" EXP":"今日の記録を更新");render()},
  okiteMore:()=>{ui.okiteMore=true;render()},
  okiteSel:()=>{const off=S.main.okiteOff||[];openSheet('<p class="eyebrow">実践しなさい。</p><h2>自分の掟を選ぶ</h2><p class="small muted" style="margin-bottom:8px">外した掟は道場に出なくなります。修行として記録しているものと重なる掟は外すと二重の記録を防げます。</p><div id="ok-sel">'+OKITE.map(g=>'<p class="eyebrow" style="margin:12px 0 2px;color:var(--gold)">'+g.g+'</p>'+g.items.map(x=>'<button class="switch" data-act="toggle" data-v="'+x.id+'" aria-pressed="'+!off.includes(x.id)+'"><span>'+x.t+'</span><span class="knob"></span></button>').join("")).join("")+'</div><div class="grid2" style="margin-top:12px"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="saveOkiteSel">保存</button></div>')},
  saveOkiteSel:()=>{const on=[...document.querySelectorAll("#ok-sel .switch")].filter(b=>b.getAttribute("aria-pressed")==="true").map(b=>b.dataset.v);S.main.okiteOff=OKITE_ALL.map(x=>x.id).filter(id=>!on.includes(id));saveMain();closeSheet();toast("掟を保存した",on.length+"項目");render()},
  feature:el=>{S.main.features=Object.assign({ritual:true,okite:true,groom:true,tempt:true,virtue:true,train:true,power:true,urge:true,sound:true},S.main.features);const f=el.dataset.v;S.main.features[f]=S.main.features[f]===false;saveMain();render()},
  term:el=>{const w=el.dataset.v;openSheet('<p class="eyebrow">用語の説明</p><h2>'+w+'</h2><p>'+GLOSS[w]+'</p><button class="btn wide" data-act="closeSheet" style="margin-top:14px">わかった</button>')},
  ritualOpen:()=>{ui.ritualOpen=!ui.ritualOpen;render()},
  ritualUndo:el=>{const k=todayKey();const d=day(k);delete d.ritual[+el.dataset.i];saveDay(k);toast("取り消した");render()},
  groomUndo:el=>{const k=todayKey();const d=day(k);const r=d.groom&&d.groom[el.dataset.g];if(r){delete r[+el.dataset.i];saveDay(k);toast("取り消した")}render()},
  gap:el=>{setTimeout(()=>mSay("ret"),500);const v=el.dataset.v;const k=todayKey();const gp=gapInfo(k);if(gp&&!(S.main.returns||[]).some(r=>r.date===k)){S.main.returns=(S.main.returns||[]).concat([{date:k,gap:gp.gap}])}
    if(v==="rest"&&gp){let n=0;for(let x=gp.from;x<=gp.to&&n<60;x=addDays(x,1)){const d=day(x);activeTasks().forEach(t=>{if(x>=t.start&&taskOn(t,x)&&!d.logs[t.id]){d.logs[t.id]={state:"excused",reason:"休んでいた（あとからまとめて記録）",at:"—",bulk:true}}});saveDay(x);n++}toast("休んでいた日として記録した","再起の案内は出なくなります")}
    else if(v==="slack")toast("正直に残した。再起の者","+"+EXP_RETURN+" EXP");
    if(v==="rest")toast("再起の者","+"+EXP_RETURN+" EXP ・ 休んだ日も記録した");
    S.main.gapAck=k;saveMain();render()},
  fixMission:()=>{const m=day(todayKey()).mission;openSheet('<h2>一太刀の誤字を直す</h2><div class="stack" style="gap:12px"><label class="f">一太刀<input type="text" id="ms" maxlength="50" value="'+esc(m.text)+'"></label><p class="small muted">決めてから10分以内だけ直せます。</p><div class="grid2"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="saveFixMission">直す</button></div></div>')},
  saveFixMission:()=>{const v=$("#ms").value.trim();const k=todayKey();const m=day(k).mission;if(!v||!m||Date.now()-m.setTs>10*60e3){closeSheet();render();return}m.text=v;saveDay(k);closeSheet();render()},
  calNav:el=>{ui.calOff=Math.max(0,(ui.calOff||0)+(+el.dataset.v));ui.calSel=null;render()},
  expAll:()=>{ui.expAll=!ui.expAll;render()},
  reflAll:()=>{ui.reflAll=!ui.reflAll;render()},
  virtueDone:()=>{const v=virtueOf(todayKey());openSheet('<p class="eyebrow">特別クエスト ・ 七徳の実践</p><h2>今日の「'+v.k+'」、何を実践した？</h2><div class="qopts" id="vd-pick">'+v.p.map((x,i)=>'<button class="qopt" data-act="pickOne" data-v="'+i+'" aria-pressed="false"><span>'+esc(x)+'</span></button>').join("")+'</div><p class="small muted" style="margin-top:8px">実践したものだけを選べ。やっていないなら閉じろ。</p><div class="grid2" style="margin-top:10px"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="saveVirtue">実践した</button></div>');ui.pick=null},
  saveVirtue:()=>{if(ui.pick==null){toast("一つ選べ");return}const k=todayKey();const v=virtueOf(k);const note=v.p[+ui.pick];day(k).virtue={k:v.k,note,at:nowHM()};saveDay(k);closeSheet();toast("七徳の実践「"+v.k+"」","+"+EXP_TASK+" EXP");render()},
  obFinish:()=>{const ob=ui.ob;const sign=$("#ob-sign").value.trim();if(!sign){$("#ob-sign").focus();return}
    const k=todayKey();const M=S.main;const pl=planFrom(ob);const t=pl.task;
    M.onboarded=true;M.displayName=sign;M.features=pl.features;M.notif=pl.notif;applyProfile(pl,true);
    if(ob.env&&envReady(ob.env))M.env=Object.assign({},ob.env,{state:envState(ob.env),date:k});M.created=M.created||k;
    M.oath={text:ob.oath,signature:sign,date:k,history:[]};
    M.tasks.push({id:uid(),cat:t.c,name:t.p.n,minimum:t.p.m||"",unit:t.p.u||"",restDays:t.p.r||[],status:"進行中",focus:true,start:k,settledOn:null,history:[{date:k,change:"開始"}]});
    M.obDraft=null;saveMain();tab="dojo";render();window.scrollTo(0,0);tutStart()},
  mMotive:el=>{const m=ui.ob.m=ui.ob.m||{};m.motive=el.dataset.v;document.querySelectorAll(".mopt").forEach(b=>{b.setAttribute("aria-pressed",b===el);b.setAttribute("aria-checked",b===el)});const n=$("#m-next");if(n)n.disabled=false;obDraft()},
  mGender:el=>{const m=ui.ob.m;m.gender=el.dataset.v;el.parentNode.querySelectorAll(".chip").forEach(b=>b.setAttribute("aria-pressed",b===el));mRead();obDraft()},
  mRel:el=>{const m=ui.ob.m;m.rel=m.rel===el.dataset.v?null:el.dataset.v;el.parentNode.querySelectorAll(".chip").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===m.rel));mRead();obDraft()},
  mInfoNext:()=>{mRead();const m=ui.ob.m;if(!m.name){toast("師範の名を記せ","名前または呼び名は必須");$("#mi-name").focus();return}if(!m.gender){toast("性別を選べ","答えたくなければ「回答しない」");return}A.obNext()},
  mPhoto:el=>pickPhoto(el.dataset.v==="cam"?"environment":null,async url=>{const m=ui.ob.m;const pk=await savePk("m",url);if(m.pk&&m.pk!==(S.main.master&&S.main.master.pk))photoDel(m.pk);m.pk=pk;obDraft();render()}),
  mPhotoDel:()=>{const m=ui.ob.m;if(m.pk&&m.pk!==(S.main.master&&S.main.master.pk))photoDel(m.pk);m.pk=null;obDraft();render()},
  sPhoto:el=>{const nm=$("#sf-name");if(nm)ui.ob.sign=nm.value.trim();pickPhoto(el.dataset.v==="cam"?"user":null,async url=>{const sf=ui.ob.self;const pk=await savePk("s",url);if(sf.pk&&sf.pk!==(S.main.self0&&S.main.self0.key))photoDel(sf.pk);sf.pk=pk;obDraft();render()})},
  sPhotoDel:()=>{const nm=$("#sf-name");if(nm)ui.ob.sign=nm.value.trim();const sf=ui.ob.self;if(sf.pk&&sf.pk!==(S.main.self0&&S.main.self0.key))photoDel(sf.pk);sf.pk=null;obDraft();render()},
  selfNext:()=>{const v=$("#sf-name").value.trim();if(!v){toast("お前の名を記せ","表示名は必須");$("#sf-name").focus();return}ui.ob.sign=v;A.obNext()},
  cropOk:()=>{const u=cropOut();const cb=ui.crop&&ui.crop.cb;ui.crop=null;closeSheet();if(u&&cb)cb(u)},
  mChange:()=>{ui.ob.retConfirm=flowX().includes("self");ui.obStep=flowX().indexOf("m_pick");obAfter()},
  mflowStart:()=>{const M=S.main;ui.mflow=M.master?"edit":"new";ui.ob={m:Object.assign({},M.master||{}),sign:M.displayName||""};if(!M.master)ui.ob.self={pk:(M.self0&&M.self0.key)||null};ui.obStep=0;obDraft();render();window.scrollTo(0,0)},
  mEditDone:()=>{mCommit(ui.ob);ui.mflow=null;ui.ob={};ui.obStep=0;S.main.obDraft=null;saveMain();tab="chikai";render();window.scrollTo(0,0);toast("師範を改めた","稽古の記録はそのまま");setTimeout(()=>mSay("advice"),600)},
  vowGo:()=>{const ob=ui.ob;const k=todayKey();const M=S.main;const first=!M.onboarded;const sign=ob.sign||M.displayName||"無名";
    if(first){const pl=planFrom(ob);const t=pl.task;
      M.onboarded=true;M.displayName=sign;M.features=pl.features;M.notif=pl.notif;applyProfile(pl,true);
      if(ob.env&&envReady(ob.env))M.env=Object.assign({},ob.env,{state:envState(ob.env),date:k});M.created=M.created||k;
      M.oath={text:VOW_LINES.join("\n")+"\n"+VOW_LAST,signature:sign,date:k,history:[]};
      M.tasks.push({id:uid(),cat:t.c,name:t.p.n,minimum:t.p.m||"",unit:t.p.u||"",restDays:t.p.r||[],status:"進行中",focus:true,start:k,settledOn:null,history:[{date:k,change:"開始"}]})}
    else if(ob.sign)M.displayName=ob.sign;
    if(first)M.obAns=obAnsOf(ob);
    mCommit(ob);M.vow={date:k,master:ob.m.name};
    const startTut=first||M.tutVer!==3;
    ui.mflow=null;M.obDraft=null;ui.ob={};ui.obStep=0;saveMain();tab="dojo";render();window.scrollTo(0,0);playVow(startTut)},
  masterAdvice:()=>masterAdviceSheet(),
  restStart:()=>{ui.restFlow=restQs();ui.mflow="rest";ui.ob=Object.assign({},S.main.obAns||{});ui.obStep=0;obDraft();render();window.scrollTo(0,0)},
  typeStart:()=>{ui.mflow="type";ui.ob={tone:S.main.tone||"gen"};ui.obStep=0;obDraft();render();window.scrollTo(0,0)},
  typeDone:()=>{const temp={};TEMP_Q.forEach(q=>{if(ui.ob[q[0]]!=null)temp[q[0]]=ui.ob[q[0]]});if(S.main.profile)S.main.profile.temp=temp;S.main.obAns=Object.assign(S.main.obAns||{},temp);
    ui.mflow=null;ui.ob={};ui.obStep=0;S.main.obDraft=null;saveMain();tab="chikai";render();window.scrollTo(0,0);const tp=typeOf(S.main.profile);if(tp)toast("武士の型："+tp.t[0],"参考の分類。稽古の難しさは記録で決める")},
  lifeStart:()=>{const L=lifeOf()||{};ui.mflow="life";ui.ob=Object.assign({},L);delete ui.ob.date;ui.obStep=0;obDraft();render();window.scrollTo(0,0)},
  lifeDone:()=>{const L=lifeFrom(ui.ob);if(S.main.profile)S.main.profile.life=L;else S.main.life=L;ui.mflow=null;ui.ob={};ui.obStep=0;S.main.obDraft=null;saveMain();tab="dojo";render();window.scrollTo(0,0);toast("己の生活を記した","命令と明日の仕込みに使う")},
  rfPrep:el=>{const R=ui.rf;R.prep=R.prep||[];const v=el.dataset.v;if(v==="none")R.prep=["none"];else{R.prep=R.prep.filter(x=>x!=="none");const i=R.prep.indexOf(v);i<0?R.prep.push(v):R.prep.splice(i,1);R.prep=R.prep.slice(0,3)}$("#rf-body").innerHTML=rfBody()},
  prepRes:el=>{const k=todayKey();const d=day(k);const pc=d.prepCheck=d.prepCheck||{res:{},why:null};pc.res[el.dataset.k]=+el.dataset.v;render()},
  prepWhy:el=>{const d=day(todayKey());if(d.prepCheck)d.prepCheck.why=el.dataset.v;render()},
  prepSave:()=>{const k=todayKey();const d=day(k);const y=S.days[addDays(k,-1)];const pc=d.prepCheck;if(!pc||!y||!y.prep)return;const items=y.prep.items.filter(x=>PREP[x]);
    if(items.some(x=>pc.res[x]==null)){toast("すべて答えよ");return}const ng=items.some(x=>pc.res[x]===0);if(ng&&!pc.why){toast("できなかった原因を一つ選べ");return}
    pc.done=true;pc.at=nowHM();saveDay(k);const n=prepDays().length;render();
    if(items.some(x=>pc.res[x]===1))toast(n>PREP_SETTLE?"仕込みは定着している":"仕込みが効いた",n>PREP_SETTLE?"維持確認（EXPは付かない）":"+"+EXP_PREP+" EXP");else toast("記録した","今夜は「"+PREP[items[0]]+"」から")},
  mSelfPhoto:el=>pickPhoto(el.dataset.v==="cam"?"user":null,async url=>{const pk=await savePk("s",url);const o=S.main.self0;if(o&&o.key)photoDel(o.key);S.main.self0={key:pk,date:todayKey()};saveMain();render();toast("開始時点の写真を変更した")}),
  mSelfDel:el=>{if(el.dataset.ok!=="1"){el.dataset.ok="1";el.textContent="本当に削除する（元に戻せない）";return}const o=S.main.self0;if(o&&o.key)photoDel(o.key);S.main.self0=null;saveMain();render();toast("開始時点の写真を削除した")},
  mMasterPhoto:el=>pickPhoto(el.dataset.v==="cam"?"environment":null,async url=>{const pk=await savePk("m",url);const m=S.main.master;if(m.pk)photoDel(m.pk);m.pk=pk;saveMain();render();toast("師範の写真を変更した")}),
  mMasterPhotoDel:el=>{if(el.dataset.ok!=="1"){el.dataset.ok="1";el.textContent="本当に外す";return}const m=S.main.master;if(m.pk)photoDel(m.pk);m.pk=null;saveMain();render();toast("師範の写真を外した","絵で表示する")},
  mirSel:el=>{ui.mirB=ui.mirB===el.dataset.v?null:el.dataset.v;render()},
  help:()=>openSheet('<p class="eyebrow">ヘルプ</p><h2>使い方</h2><ul class="plan-list"><li>毎日は道場の「今日やること」を上から片付ける</li><li>今日の一太刀は三つの命令から選び、夜までに結果を付ける</li><li>迷ったら師範の「助言を聞く」</li><li>SNSや動画を見たくなったら右下の「衝動」</li><li>夜は武道録で省察を書く</li></ul><div class="stack" style="gap:8px;margin-top:12px">'+(S.main.tutVer!==3&&S.main.tutStep!=null?'<button class="btn gold wide" data-act="tutResume">入門の儀を途中から再開する</button>':'')+'<button class="btn wide" data-act="tutStart">入門の儀を最初から行う</button><button class="btn ghost wide" data-act="closeSheet">閉じる</button></div>'),
  tutResume:()=>tutStart(S.main.tutStep||0),
  demo:()=>{seedDemo();render();window.scrollTo(0,0);tutStart(0)},
  tutStart:()=>tutStart(0),
  openGrp:()=>{const g=document.querySelector('#app details.grp');if(g){g.open=true;ui.grpOpen=ui.grpOpen||{};ui.grpOpen[g.id]=true;g.scrollIntoView({behavior:"smooth",block:"start"})}},
  goto:el=>{const s=document.getElementById(el.dataset.v);if(s){openGrpOf(s);s.scrollIntoView({behavior:"smooth",block:"start"})}},
  setMission:()=>{const k=todayKey();const d=day(k);
    if(!d.cond){openSheet('<p class="eyebrow">'+fmtMD(k)+' ・ 一太刀の前に</p><h2>今日の体と心は？</h2><p class="small muted" style="margin-bottom:10px">命令の重さを合わせる。不調の日に無理をさせる命令は出さない。</p><div class="qopts">'+[["good","万全","いつもより一段重い命令を出す"],["normal","ふつう","いつもの重さ"],["bad","不調","体調不良・けが・強い疲れ。回復を優先する"]].map(o=>'<button class="qopt" data-act="msCond" data-v="'+o[0]+'"><span>'+o[1]+'<small>'+o[2]+'</small></span></button>').join("")+'</div>');return}
    const rkG=S.main.rankMax||0;
    if(rkG===3&&!d.msDomain&&d.cond!=="bad"){openSheet('<p class="eyebrow">'+fmtMD(k)+' ・ 考える段</p><h2>今日、どこを鍛えるべきか。自分で決めろ。</h2><p class="small muted" style="margin-bottom:10px">昨日までの記録を思い出して選べ。選んだ分野から命令を出す。</p><div class="qopts">'+[1,2,3,4,5,6].map(c=>'<button class="qopt" data-act="msDomain" data-v="'+c+'"><span>'+CAT_SHORT[c]+'</span></button>').join("")+'<button class="qopt" data-act="msDomain" data-v="auto"><span>今日は任せる</span></button></div>');return}
    const roll=d.offerRoll||0;const plan=missionPlan(k,roll);const offer=plan.offers;ui.msPick=plan.forced?0:null;ui.msOffer=offer;
    const tp=typeOf(S.main.profile);const pr=tp?partners(tp.code):null;
    const guide=rkG<=1?'<p class="small" style="color:var(--gold-hi);margin-bottom:8px">迷ったら「おすすめ」でいい。</p>':rkG===2?'<p class="small muted" style="margin-bottom:8px">三つから、自分で選べ。選んだものに責任を持て。</p>':rkG>=4?'<p class="small" style="color:var(--gold-hi);margin-bottom:8px">命令は、もう要らないはずだ。下で自分の一太刀を決めてもよい。</p>':'';
    const head=plan.forced?'<h2>今日は、これ一つだけを斬れ。</h2><p class="small" style="color:var(--red-ink);margin-bottom:10px">崩れが続いている。量ではない。今日一つ斬れば、流れは戻る。</p>':plan.cond==="bad"?'<h2>今日は守れ。回復も修行だ。</h2><p class="small muted" style="margin-bottom:10px">不調の日は、軽い命令だけを出す。休むと決めるのも、立派な一太刀だ。</p>':'<h2>今日は、これをやれ。</h2><p class="small muted" style="margin-bottom:6px">今日、何を斬れば「勝った」と言えるか。一つ選べ。選んだら今日中は変えられない。逃げ道は「病気・けが・急な事情」だけだ。</p>';
    openSheet('<p class="eyebrow">'+fmtMD(k)+' ・ 今日の'+term("一太刀")+' ・ 体：'+({good:"万全",normal:"ふつう",bad:"不調"}[plan.cond])+'</p>'+head+
    (tp&&plan.cond!=="bad"?'<p class="small" style="margin-bottom:10px;color:var(--gold-hi)">お前の戦い方：'+tp.t[5]+'</p>':'')+
    guide+'<div class="qopts" id="ms-pick">'+offer.map((o,i)=>'<button class="qopt" data-act="msPick" data-i="'+i+'" aria-pressed="'+(plan.forced&&i===0)+'"><span>'+(rkG<=1&&i===0&&!plan.forced?'<b class="lvtag" style="background:var(--gold-hi)">おすすめ</b> ':'')+esc(o.t)+'<small><b class="lvtag">難度'+o.lv+'</b> '+(o.opp?"反対側の資質":CAT_SHORT[o.c])+'</small><small class="why">'+esc(o.why)+'</small>'+(MDATA[o.id]?'<small class="mrow">'+esc(MDATA[o.id][0])+' ・ 最低ライン：'+esc(MDATA[o.id][2])+'</small>':'')+'</span></button>').join("")+'</div>'+
    (plan.cond==="bad"?'<button class="btn ghost wide" data-act="msRest" style="margin-top:8px">今日は休むと決める（回復に専念する）</button>':'')+
    (!plan.forced&&plan.cond!=="bad"?(roll<1?'<button class="btn ghost wide sm" data-act="msRoll" style="margin-top:8px">別の3つを出す（今日あと1回）</button>':'<p class="small muted" style="margin-top:8px">今日の引き直しは使い切った。この中から選べ。</p>'):'')+
    (pr&&plan.cond!=="bad"?'<p class="small muted" style="margin-top:10px">相棒の<b>'+TYPES[pr.buddy][0]+'</b>は「'+TYPES[pr.buddy][3]+'」を持つ。好敵手の<b>'+TYPES[pr.rival][0]+'</b>も、今日の一太刀を受けている。</p>':'')+
    (!plan.forced&&plan.cond!=="bad"&&unsupAvailable(k)?'<button class="btn wide" data-act="unsup" style="margin-top:10px">今日を「無監督の日」にする（命令なし・自分で決める）</button>':'')+
    (canWrite()&&!plan.forced?'<details class="more" style="margin-top:6px"'+(rkG>=4?" open":"")+'><summary>'+(rkG>=4?"自分で一太刀を決める（離の段）":"自分の言葉で書く（破の段）")+'</summary><input type="text" id="ms" maxlength="50" style="margin-top:6px" placeholder="今日いちばん大事な行動"></details>':'')+
    '<div class="grid2" style="margin-top:12px"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="saveMission">この一太刀を受ける</button></div>')},
  unsup:()=>{const k=todayKey();openSheet('<p class="eyebrow">無監督の日 ・ 週に一度まで</p><h2>今日は、己が己の師だ。</h2><p class="small muted" style="margin:6px 0 10px">アプリは命令しない。今日やるべき一太刀を、自分で決めろ。やり切った回数は卒業認定に数える。</p><label class="f">領域<select id="us-c">'+[1,2,3,4,5,6].map(c=>'<option value="'+c+'">'+CATS[c].ord+" "+CATS[c].name+'</option>').join("")+'</select></label><label class="f" style="margin-top:10px">今日の一太刀（自分の言葉で）<input type="text" id="us-t" maxlength="50" placeholder="例：企画書を最後まで書き上げる"></label><div class="grid2" style="margin-top:12px"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="unsupSave">これを斬る</button></div>')},
  unsupSave:()=>{const t=$("#us-t").value.trim();if(!t){$("#us-t").focus();toast("自分で決めろ");return}const k=todayKey();const d=day(k);d.mission={text:t,cat:+$("#us-c").value,unsup:true,why:"無監督の日：自分で決めた一太刀",setAt:nowHM(),setTs:Date.now(),result:null,own:true};
    if(feat("ritual")&&RITUAL.findIndex((_,i)=>!d.ritual[i])===6)d.ritual[6]=nowHM();saveDay(k);closeSheet();toast("無監督の日","自分で決めた。あとは斬るだけだ");render()},
  msDomain:el=>{const k=todayKey();day(k).msDomain=el.dataset.v;saveDay(k);A.setMission()},
  msCond:el=>{const k=todayKey();day(k).cond=el.dataset.v;saveDay(k);A.setMission()},
  msRest:()=>{const k=todayKey();const d=day(k);d.mission={text:"今日は休み、回復に専念する",cat:1,lv:1,rest:true,setAt:nowHM(),setTs:Date.now(),result:"postponed",postponeReason:"不調（自己申告）"};saveDay(k);closeSheet();toast("休むと決めた","回復も修行だ");render()},
  msPick:el=>{ui.msPick=+el.dataset.i;document.querySelectorAll("#ms-pick .qopt").forEach(b=>b.setAttribute("aria-pressed",b===el))},
  msRoll:()=>{const k=todayKey();const d=day(k);if((d.offerRoll||0)>=1)return;d.offerRoll=1;saveDay(k);A.setMission()},
  saveMission:()=>{const k=todayKey();const d=day(k);const own=$("#ms")&&$("#ms").value.trim();let text=null,cat=null,lv=null,why=null,mid=null;
    if(own&&canWrite()){text=own}else if(ui.msPick!=null&&ui.msOffer&&ui.msOffer[ui.msPick]){const o=ui.msOffer[ui.msPick];text=o.t;cat=o.c||(o.opp?0:null);lv=o.lv;why=o.why;mid=o.id}
    if(!text){toast("一つ選べ");return}
    d.mission={text,cat,lv,why,mid,setAt:nowHM(),setTs:Date.now(),result:null,own:!!(own&&canWrite())};
    if(feat("ritual")&&RITUAL.findIndex((_,i)=>!d.ritual[i])===6)d.ritual[6]=nowHM();
    saveDay(k);closeSheet();toast("一太刀を受けた",text);render()},
  mres:el=>{const k=todayKey();const m=day(k).mission;const prev=m.result;m.result=el.dataset.v;m.resultAt=nowHM();if(prev&&prev!==m.result){m.hist=(m.hist||[]).concat([{from:prev,to:m.result,at:new Date().toISOString()}])}if(m.result!=="miss")delete m.missWhy;saveDay(k);
    if(m.result==="done"&&prev!=="done"){if(isCrit(k))toast("会心の一太刀","+"+(EXP_MISSION+EXP_CRIT)+" EXP（倍）");else toast("一太刀、達成","+"+EXP_MISSION+" EXP")}
    if(m.result==="miss"&&prev!=="miss"){const tp=typeOf(S.main.profile);if(tp){const rv=TYPES[partners(tp.code).rival][0];toast("好敵手の"+rv+"は、今日も斬った","2回続けば、命令を一段軽くする")}}render();
    if(m.result==="done"&&prev!=="done"&&look().fx!=="min"){const sec=$("#sec-mission");if(sec)sec.insertAdjacentHTML("beforeend",'<span class="stamp'+(look().fx==="low"?" still":"")+'" aria-hidden="true">斬</span>')}
    if(m.result!==prev){if(m.result==="done"){const st=streak();if(STREAK_MS.includes(st))mSay("streak",{s:st});else mSay("done")}else if(m.result==="part")mSay("part");else if(m.result==="miss")missWhySheet()}},
  gradApply:()=>openSheet('<p class="eyebrow">卒業の申請</p><h2>最後に、自分に問え。</h2><p class="small muted" style="margin-bottom:8px">三つとも「はい」と言えるなら、卒業しろ。</p><div class="chips" id="grad-q" style="flex-direction:column;align-items:stretch">'+["命令がなくても、今日やるべきことを自分で決められる","崩れたとき、原因を見つけて自分で立て直せる","自分に必要な支援を、自分で選べる"].map(x=>'<button class="chip" data-act="toggle" data-v="'+x+'" aria-pressed="false" style="text-align:left">'+x+'</button>').join("")+'</div><div class="grid2" style="margin-top:12px"><button class="btn" data-act="closeSheet">まだ早い</button><button class="btn gold" data-act="gradYes">卒業する</button></div>'),
  gradYes:()=>{if(chipsOn("#grad-q").length<3){toast("三つとも「はい」と言えるまで、待て","卒業は急がなくていい");return}S.main.graduated={date:todayKey()};saveMain();closeSheet();render();setTimeout(()=>mSay("grad"),300)},
  calAdd:async()=>{const data=icsFile();let ok=false;
    try{if(window.claude&&window.claude.use){const dl=await window.claude.use("downloads");if(dl){await dl.save({filename:"bushido-aizu.ics",data});ok=true}}}catch(e){toast("保存をやめた");return}
    if(!ok&&!window.claude)ok=anchorDL("bushido-aizu.ics",new Blob([data],{type:"text/calendar"}));
    if(ok){S.main.calAdded=todayKey();saveMain();render();toast("合図のファイルを保存した","開くと、毎朝と毎晩の合図がカレンダーに入る")}else toast("保存できませんでした")},
  missWhy:el=>{const k=todayKey();const m=day(k).mission;if(!m)return;const w=el.dataset.v;m.missWhy=w;saveDay(k);
    if(w==="pain"){S.main.painStop={date:k,mid:m.mid||null,cleared:false};saveMain()}
    const nx=MISS_NEXT[w];openSheet('<p class="eyebrow">次の一手 ・ '+MISS_GROUP[w]+'の問題</p><h2>'+nx[0]+'</h2><p style="margin-bottom:12px">'+nx[1]+'</p>'+(w==="pain"?'<div class="banner red small">体を使う命令は、道場で「痛みが引いた」を押すまで出さない。</div>':'')+'<button class="btn gold wide" data-act="closeSheet" style="margin-top:8px">わかった</button>');render();setTimeout(()=>mSay("miss"),400)},
  painClear:()=>{if(S.main.painStop){S.main.painStop.cleared=todayKey();saveMain()}render();toast("体の試練を再開する","軽いものから戻る")},
  postpone:()=>openSheet('<h2>一太刀を延期・中止する</h2><div class="stack" style="gap:12px"><label class="f">理由<select id="pp">'+["病気","負傷","重大な突発事情"].map(x=>'<option>'+x+'</option>').join("")+'</select></label><label class="f">詳しく（任意）<input type="text" id="pp2" maxlength="60"></label><div class="grid2"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn red" data-act="savePostpone">延期・中止する</button></div></div>'),
  savePostpone:()=>{const k=todayKey();const m=day(k).mission;m.result="postponed";m.postponeReason=$("#pp").value+($("#pp2").value.trim()?"："+$("#pp2").value.trim():"");saveDay(k);closeSheet();render()},
  quick:el=>{writeLog(el.dataset.t,el.dataset.k,"done");render()},
  log:el=>logSheet(el.dataset.t,el.dataset.k),
  pickState:el=>{document.querySelectorAll("#lg-state .chip").forEach(b=>b.setAttribute("aria-pressed",b===el));ui.pick=el.dataset.v;$("#lg-reason").hidden=ui.pick!=="miss"},
  saveLog:el=>{if(!ui.pick){toast("状態を選んでください");return}
    const extra={value:$("#lg-v").value,note:$("#lg-n").value.trim()};if(ui.pick==="miss")extra.reason=$("#lg-r").value;
    writeLog(el.dataset.t,el.dataset.k,ui.pick,extra);closeSheet();render()},
  clearLog:el=>{const k=el.dataset.k;if(!canRecord(k))return;const d=day(k);const prev=d.logs[el.dataset.t];if(prev){S.main.edits.push({k,tid:el.dataset.t,from:prev.state,to:null,at:new Date().toISOString()});saveMain()}delete d.logs[el.dataset.t];saveDay(k);closeSheet();render()},
  ritual:el=>{const i=+el.dataset.i;const k=todayKey();const d=day(k);
    if(i===6&&!d.mission){A.setMission();return}
    d.ritual[i]=nowHM();saveDay(k);
    if(RITUAL.every((_,j)=>d.ritual[j]))toast("出陣","朝の型 完遂  +"+EXP_RITUAL+" EXP");render()},
  addTask:()=>taskSheet(null),
  editTask:el=>taskSheet(S.main.tasks.find(t=>t.id===el.dataset.t)),
  toggle:el=>el.setAttribute("aria-pressed",el.getAttribute("aria-pressed")!=="true"),
  pickOne:el=>{el.parentNode.querySelectorAll(".chip,.qopt").forEach(b=>b.setAttribute("aria-pressed",b===el));ui.pick=isNaN(+el.dataset.v)?el.dataset.v:+el.dataset.v},
  taskStatus:el=>{el.parentNode.querySelectorAll(".chip").forEach(b=>b.setAttribute("aria-pressed",b===el));ui.pickStatus=el.dataset.v},
  saveTask:el=>{const name=$("#tk-name").value.trim();if(!name){toast("候補から一つ選べ");return}
    const rest=chipsOn("#tk-rest").map(Number);const k=todayKey();
    if(!el.dataset.t){
      if(S.main.tasks.some(t=>t.focus&&t.status==="進行中")){toast("重点修行が定着してから追加できます");return}
      S.main.tasks.push({id:uid(),cat:+$("#tk-cat").value,name,minimum:$("#tk-min").value.trim(),unit:$("#tk-unit").value.trim(),restDays:rest,status:"進行中",focus:true,start:k,settledOn:null,history:[{date:k,change:"開始"}]});
      toast("新たな修行","重点修行に設定した");
    }else{
      const t=S.main.tasks.find(x=>x.id===el.dataset.t);const why=$("#tk-why").value.trim();
      const ch=[];if(t.name!==name)ch.push("内容："+t.name+"→"+name);if((t.minimum||"")!==$("#tk-min").value.trim())ch.push("最低ライン変更");if(JSON.stringify((t.restDays||[]).slice().sort())!==JSON.stringify(rest.slice().sort()))ch.push("休息日変更");
      const ns=ui.pickStatus;if(ns&&ns!==t.status)ch.push("状態："+t.status+"→"+ns);
      if(ch.length&&!why){$("#tk-why").focus();toast("変更理由を書いてください");return}
      t.name=name;t.minimum=$("#tk-min").value.trim();t.unit=$("#tk-unit").value.trim();t.restDays=rest;
      if(ns&&ns!==t.status){t.pauses=t.pauses||[];if(ns==="一時停止")t.pauses.push({from:k,to:null});else if(t.status==="一時停止"){const lp=t.pauses[t.pauses.length-1];if(lp&&!lp.to)lp.to=addDays(k,-1)}t.status=ns;if(ns!=="進行中")t.focus=false;if(ns==="進行中"&&!t.settledOn&&!S.main.tasks.some(x=>x.focus&&x.status==="進行中"))t.focus=true}
      if(ch.length)t.history.push({date:k,change:ch.join("、"),why});
    }
    ui.pickStatus=null;saveMain();closeSheet();render()},
  tempt:el=>{const won=el.dataset.v==="1";openSheet('<h2>'+(won?"誘惑に打ち勝った":"誘惑に負けた")+'</h2><div class="stack" style="gap:12px"><div class="chips" id="tp">'+TEMPT.map((t,i)=>'<button class="chip" data-act="pickOne" data-v="'+t+'" aria-pressed="'+(i===0)+'">'+t+'</button>').join("")+'</div><label class="f">'+(won?"どう打ち勝ったか":"次の対策")+'（任意）<input type="text" id="tp-n" maxlength="60"></label><div class="grid2"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="saveTempt" data-v="'+(won?1:0)+'">記録する</button></div></div>');ui.pick=TEMPT[0]},
  saveTempt:el=>{const k=todayKey();day(k).temptations.push({type:ui.pick||"その他",won:el.dataset.v==="1",at:nowHM(),note:$("#tp-n").value.trim()});saveDay(k);closeSheet();render()},
  reflect:()=>reflectSheet(),
  rfPick:el=>{const f=el.dataset.f,v=el.dataset.v;ui.rf[f]=v;if(f==="screen"){$("#rf-body").innerHTML=rfBody();return}if(f==="verdict"){ui.rf.cause=null;ui.rf.fix=null}if(f==="cause")ui.rf.fix=null;$("#rf-body").innerHTML=rfBody()},
  saveReflect:()=>{const k=todayKey();const d=day(k);const R=ui.rf;if(!R||!R.verdict||(R.verdict!=="full"&&!R.cause)){toast("今日の自分を選べ");return}if(!R.fix){const fk=R.verdict==="full"?"full":R.cause;R.fix=(FIXES[fk]||["明日も、今日の一太刀から始める"])[0]}
    const y=S.days[addDays(k,-1)];const less=R.screen!=null&&y&&y.screen!=null&&+R.screen<y.screen&&!(d.screen!=null&&d.screen<y.screen);if(R.screen!=null)d.screen=+R.screen;if(less)setTimeout(()=>toast("昨日より減った","+"+EXP_LESS+" EXP"),1800);
    const slips=$("#rf-slips")?chipsOn("#rf-slips"):((d.reflection&&d.reflection.slips)||[]);const note=$("#rf-note")?$("#rf-note").value.trim():((d.reflection&&d.reflection.note)||"");
    const vt=VERDICTS.find(x=>x.v===R.verdict).t;
    const first=!d.reflection;d.reflection={verdict:R.verdict,result:vt,issue:R.verdict==="full"?"":R.cause,improve:R.fix,slips,note,at:(d.reflection&&d.reflection.at)||nowHM()};
    {const pr=(R.prep||[]).filter(x=>PREP[x]).slice(0,3);d.prep=pr.length?{items:pr,at:nowHM()}:(R.prep||[]).includes("none")?{items:[],none:true,at:nowHM()}:null}
    saveDay(k);closeSheet();if(first)toast("省察を記した","+"+EXP_REFL+" EXP");render()},
  weekly:()=>weeklySheet(),
  wkPick:el=>{const f=el.dataset.f;ui.wk[f]=el.dataset.v;if(f==="sns"){$("#wk-body").innerHTML=wkBody();return}if(f==="virtue"){ui.wk.action=null;ui.wk.next=null}if(f==="action")ui.wk.next=null;$("#wk-body").innerHTML=wkBody()},
  saveWeekly:()=>{const W=ui.wk;if(!W||!W.next||!W.sns){toast("最後まで選べ");return}const wk=mondayOf(todayKey());const first=!S.main.weeklies[wk];
    S.main.weeklies[wk]={virtue:W.virtue,action:W.action,note:W.next,sns:W.sns,date:(S.main.weeklies[wk]&&S.main.weeklies[wk].date)||todayKey()};saveMain();closeSheet();if(first)toast("週の振り返り","+"+EXP_WEEK+" EXP");render();if(first)mSay("weekly")},
  newTrial:()=>trialSheet(),
  trialRetry:el=>{const tr=S.main.trials.find(x=>x.id===el.dataset.v);trialSheet({name:tr.name,days:tr.days,taskIds:tr.taskIds.slice(),restDays:(tr.restDays||[]).slice(),stopRule:tr.stopRule})},
  startTrial:()=>{const name=$("#tr-name").value.trim();const ids=chipsOn("#tr-tasks");if(!name){$("#tr-name").focus();return}if(!ids.length){toast("対象修行を選んでください");return}
    if(S.main.trials.some(t=>trialEval(t).status==="進行中")){toast("進行中の試練があります");return}
    S.main.trials.push({id:uid(),name,days:+ui.pick||7,taskIds:ids,restDays:chipsOn("#tr-rest").map(Number),stopRule:$("#tr-stop").value.trim(),start:todayKey(),status:"進行中",changes:[]});saveMain();closeSheet();toast("試練を開始せよ",name);render()},
  trialStop:el=>openSheet('<h2>試練を中止する</h2><div class="stack" style="gap:12px"><label class="f">理由（履歴に残ります）<input type="text" id="ts" maxlength="60"></label><div class="grid2"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn red" data-act="saveTrialStop" data-v="'+el.dataset.v+'">中止する</button></div></div>'),
  saveTrialStop:el=>{const why=$("#ts").value.trim();if(!why){$("#ts").focus();return}const tr=S.main.trials.find(x=>x.id===el.dataset.v);tr.status="中止";tr.stopReason=why;tr.changes.push({date:todayKey(),change:"中止",why});saveMain();closeSheet();render()},
  trialChange:el=>{const tr=S.main.trials.find(x=>x.id===el.dataset.v);openSheet('<h2>試練の条件を変更する</h2><div class="stack" style="gap:12px"><p class="small muted">開始後の変更は理由と履歴を残します。変更できるのは休息日だけです。</p><div class="chips" id="tc-rest">'+[1,2,3,4,5,6,0].map(i=>'<button class="chip" data-act="toggle" data-v="'+i+'" aria-pressed="'+(tr.restDays||[]).includes(i)+'">'+WD[i]+'</button>').join("")+'</div><label class="f">変更理由<input type="text" id="tc-why" maxlength="60"></label>'+(tr.changes.length?'<div class="small muted">'+tr.changes.map(c=>fmtMD(c.date)+' '+esc(c.change)+'（'+esc(c.why)+'）').join("<br>")+'</div>':'')+'<div class="grid2"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="saveTrialChange" data-v="'+tr.id+'">変更する</button></div></div>')},
  saveTrialChange:el=>{const why=$("#tc-why").value.trim();if(!why){$("#tc-why").focus();return}const tr=S.main.trials.find(x=>x.id===el.dataset.v);const r=chipsOn("#tc-rest").map(Number);tr.changes.push({date:todayKey(),change:"休息日 "+((tr.restDays||[]).map(i=>WD[i]).join("")||"なし")+"→"+(r.map(i=>WD[i]).join("")||"なし"),why});tr.restDays=r;saveMain();closeSheet();render()},
  recover:el=>{const v=el.dataset.v;const t=S.main.tasks.find(x=>x.id===el.dataset.t);
    S.main.recoveries.push({date:todayKey(),taskId:t.id,choice:v,note:""});
    if(v==="rest"){t.pausedDays=t.pausedDays||[];t.pausedDays.push(todayKey())}
    saveMain();
    if(v==="shrink"||v==="method"){taskSheet(t);setTimeout(()=>{const w=$("#tk-why");if(w)w.value=v==="shrink"?"再起：目標を縮小":"再起：方法を変更"},40)}
    else toast("再起",v==="rest"?"今日は休み、明日から再開する":"同じ目標で、もう一度");
    render()},
  cal:el=>{ui.calSel=ui.calSel===el.dataset.k?null:el.dataset.k;render()},
  editOath:()=>openSheet('<h2>起請文を書き直す</h2><div class="stack" style="gap:12px"><textarea id="oa" rows="7" style="font-family:var(--display);line-height:1.9">'+esc(S.main.oath.text)+'</textarea><label class="f">書き直す理由<input type="text" id="oa-why" maxlength="60"></label><div class="grid2"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn gold" data-act="saveOath">署名して保存</button></div></div>'),
  saveOath:()=>{const t=$("#oa").value.trim(),why=$("#oa-why").value.trim();if(!t)return;if(!why){$("#oa-why").focus();return}const o=S.main.oath;o.history=o.history||[];o.history.push({text:o.text,date:o.date,why});o.text=t;o.date=todayKey();saveMain();closeSheet();render()},
  saveFuture:()=>{S.main.future=$("#future").value;saveMain();toast("未来之書を保存した")},
  saveNotif:()=>{S.main.notif={morning:$("#n-m").value,night:$("#n-n").value};saveMain();toast("通知設定を保存した")},
  export:async()=>{const data=JSON.stringify({exportedAt:new Date().toISOString(),main:S.main,days:S.days},null,1);
    let ok=false;try{const dl=await window.claude.use("downloads");if(dl){await dl.save({filename:"bushido-"+todayKey()+".json",data});ok=true}}catch(e){}
    if(!ok&&!window.claude)ok=anchorDL("bushido-"+todayKey()+".json",new Blob([data],{type:"application/json"}));
    if(!ok){$("#exportOut").innerHTML='<p class="small muted" style="margin-top:10px">下の内容をすべて選択してコピーし、保管してください。</p><textarea id="exp-t" rows="6" readonly>'+esc(data)+'</textarea>';const t=$("#exp-t");t.focus();t.select()}},
  reset:()=>{ui.confirmReset=true;render()},
  look:el=>{S.main.look=Object.assign({},look(),{[el.dataset.k]:el.dataset.v});saveMain();const y=window.scrollY;render();window.scrollTo(0,y)},
  lookReset:()=>{S.main.look={};saveMain();const y=window.scrollY;render();window.scrollTo(0,y);toast("外観を初期状態に戻した","記録はそのまま")},
  importOpen:()=>{const inp=document.createElement("input");inp.type="file";inp.accept="application/json,.json";inp.hidden=true;document.body.appendChild(inp);
    inp.addEventListener("change",async()=>{const f=inp.files&&inp.files[0];inp.remove();if(!f)return;try{const x=JSON.parse(await f.text());importPreview(x)}catch(e){toast("読み込めませんでした","武士道で書き出したJSONを選んでください")}});inp.click()},
  restoreLocal:()=>{try{const b=JSON.parse(localStorage.getItem("bushido.backup")||"null");if(!b){toast("この端末に控えはありません");return}importPreview(b.data)}catch(e){toast("控えを読み込めませんでした")}},
  importYes:async()=>{const x=ui.importData;if(!x)return;const N=normState(x);const M=N.main;M.onboarded=true;M.obDraft=null;M.tutSnap=null;
    S={main:M,days:N.days};
    const old=ui.importOld||[];try{await store.saveMain(S.main);for(const k of Object.keys(S.days))await store.saveDay(k,S.days[k]);for(const k of old)if(!S.days[k]){S.days[k]={logs:{},mission:null,ritual:{},reflection:null,temptations:[]};await store.saveDay(k,S.days[k])}}catch(e){warn(e)}
    ui.importData=null;closeSheet();tab="dojo";render();toast("復元した",Object.keys(S.days).length+"日分の記録")},
  resetNo:()=>{ui.confirmReset=false;render()},
  resetYes:async()=>{ui.confirmReset=false;try{await store.wipe()}catch(e){warn(e)}S={main:blankMain(),days:{}};ui.obStep=0;ui.ob={};tab="dojo";render();window.scrollTo(0,0)}
};
/* ============ チュートリアル（ゲーム型：光った所しか押せない／一手ずつ／初めて開いた画面で短く案内） ============ */
const firstQuest=()=>activeTasks().find(t=>t.start<=todayKey()&&taskOn(t,todayKey()));
const TUT_CH=["","道場を知る","今日の一振りを選ぶ","稽古を記録する","己を鍛える","武道録を知る","師範と歩む"];
