/* ===================== アプリの調子（使われ方・不具合・速さ・満足度） =====================
   口コミで評価が下がる一番の理由は「落ちる・固まる」（FROSK調査 2020：不満でレビューを書く理由の1位 33.5%）。
   使いやすさの国際規格 ISO 9241-11 は「目的を達成できたか・手間・満足」で測る。
   そこで、外のサービス（アカウントが必要）を使わず、会社の Supabase にだけ次の4つを記録する。
   1) 不具合の記録（Sentry の代わり）  2) 実際のスマホでの速さ（Google の web-vitals：LCP・INP・CLS）
   3) 使った人数と画面（どこが使われているか）  4) 満足度（うまくいったあとに一度だけ聞く）
   管理者は「設定 → アプリの調子」で見られる。名前・電話などのお客様の情報は記録しない。 */
const HL={q:[],sent:0,day:null,tabs:{},dirty:false,ver:'v25'};
const hlDay=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function hlDev(){try{let d=localStorage.getItem('oubi.dev');if(!d){d='d'+Math.random().toString(36).slice(2,10);localStorage.setItem('oubi.dev',d)}return d}catch(e){return 'd0'}}
const hlReady=()=>typeof mode!=='undefined'&&mode==='db'&&typeof db!=='undefined'&&db&&typeof me!=='undefined'&&me.id;
function hlHash(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return (h>>>0).toString(36)}
/* 1) 不具合：同じ日の同じ内容は1件にまとめて回数を数える。1回開いている間に送るのは20件まで */
function hlErr(msg,where){
  msg=String(msg||'').slice(0,200); if(!msg||/ResizeObserver loop|Script error\.?$/.test(msg))return;
  HL.q.push({msg,where:String(where||'').slice(0,120),tab:(typeof view!=='undefined'&&view.tab)||'',at:new Date().toISOString()}); hlFlushErr();
}
window.addEventListener('error',e=>hlErr(e.message,(e.filename||'').split('/').pop()+':'+(e.lineno||'')));
window.addEventListener('unhandledrejection',e=>{const r=e.reason;hlErr(r&&(r.message||r.code)||String(r),'promise')});
async function hlFlushErr(){
  if(!hlReady()||!HL.q.length||HL.busy)return; HL.busy=true;
  try{while(HL.q.length&&HL.sent<20){const e=HL.q.shift();HL.sent++;const id='e_'+hlDay()+'_'+hlDev()+'_'+hlHash(e.msg+e.where);
    HL.cnt=HL.cnt||{}; const n=HL.cnt[id]=(HL.cnt[id]||0)+1; // 端末ごと・内容ごとに1件。同じものは回数だけ増やす
    await db.doc('errlog/'+id).set({day:hlDay(),msg:e.msg,where:e.where,tab:e.tab,n,last:e.at,by:me.id,ua:navigator.userAgent.replace(/\(.*?\)/g,'').slice(0,80),ver:HL.ver,w:innerWidth})}}
  catch(err){}finally{HL.busy=false}
}
/* 2) 速さ：Google の web-vitals（4.2.4）で、その端末のその日の値を1件残す */
let HLV={};
function hlVitals(){
  if(hlVitals.on)return; hlVitals.on=true;
  const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/web-vitals@4.2.4/dist/web-vitals.iife.js'; s.crossOrigin='anonymous';
  s.onload=()=>{const W=window.webVitals;if(!W)return;const k=m=>HLV[m.name.toLowerCase()]=Math.round(m.name==='CLS'?m.value*1000:m.value);
    W.onLCP(k,{reportAllChanges:true});W.onINP(k,{reportAllChanges:true});W.onCLS(k,{reportAllChanges:true});W.onFCP(k);W.onTTFB(k)};
  document.head.appendChild(s);
}
/* 3) 使われ方：その人のその日に、開いた画面の回数を1件にまとめる（1分に1回まで送る） */
function hlTab(t){if(!t||['pickme','pin','setup'].includes(t))return;if(HL.day!==hlDay()){HL.day=hlDay();HL.tabs={}}HL.tabs[t]=(HL.tabs[t]||0)+1;HL.dirty=true}
async function hlFlushUse(){
  if(!hlReady()||!HL.dirty)return; HL.dirty=false; const day=hlDay(), who=(typeof canon==='function'&&canon(me.id))||me.id;
  try{await db.doc('usage/u_'+day+'_'+who).set({day,by:who,tabs:HL.tabs,last:new Date().toISOString(),ver:HL.ver})}catch(e){HL.dirty=true}
  if(Object.keys(HLV).length){try{await db.doc('vitals/v_'+day+'_'+hlDev()).set({day,by:who,...HLV,w:innerWidth,ver:HL.ver,standalone:!!(matchMedia('(display-mode: standalone)').matches||navigator.standalone)})}catch(e){}}
}
setInterval(()=>{hlFlushUse();hlFlushErr()},60000);
document.addEventListener('visibilitychange',()=>{if(document.hidden){hlFlushUse();hlFlushErr()}});
/* 4) 満足度：うまくいったこと（記録・登録・投稿）が5回たまり、使い始めて3日以上、前に聞いてから30日以上なら、一度だけ聞く。
      営業の記録の最中（訪問先の前）では聞かない */
function hlGood(kind){
  try{const k='oubi.good';const o=JSON.parse(localStorage.getItem(k)||'{}');o.n=(o.n||0)+1;o.first=o.first||Date.now();localStorage.setItem(k,JSON.stringify(o));
    const asked=+localStorage.getItem('oubi.asked')||0;
    if(o.n>=5&&Date.now()-o.first>3*864e5&&Date.now()-asked>30*864e5&&view.tab!=='sales')setTimeout(()=>hlAsk('auto'),1500)}catch(e){}
}
function hlAsk(src){
  const sh=document.getElementById('sheet'); if(!sh||!sh.hidden&&src==='auto')return;
  try{localStorage.setItem('oubi.asked',String(Date.now()))}catch(e){}
  HL.score=0;
  const faces=[[1,'😣','とても不満'],[2,'🙁','不満'],[3,'😐','ふつう'],[4,'🙂','満足'],[5,'😄','とても満足']];
  sh.innerHTML=`<div class="sheet-box hl-ask" role="dialog" aria-modal="true" aria-label="使いやすさを教えてください"><span class="grab" aria-hidden="true"></span>
    <div class="row sb"><h2>このアプリ、使いやすいですか？</h2><button type="button" class="btn sm" data-sheet-close>あとで</button></div>
    <p class="sub" style="margin:0">管理者だけが見ます。よりよくするために使います。</p>
    <div class="hl-faces" role="group" aria-label="使いやすさ">${faces.map(([v,f,l])=>`<button type="button" class="hl-face" data-hlscore="${v}" aria-pressed="false" aria-label="${l}"><span aria-hidden="true">${f}</span><small>${l}</small></button>`).join('')}</div>
    <label class="fld"><span>ひとこと（なくてもOK）</span><textarea id="hl-text" rows="3" placeholder="例：工事の一覧で、もっと早く探したい"></textarea></label>
    <button type="button" class="btn pri big" data-hlsend>送る</button></div>`;
  sh.hidden=false;
}
async function hlSend(){
  const text=((document.getElementById('hl-text')||{}).value||'').trim().slice(0,500);
  if(!HL.score&&!text){toast('顔のボタンを1つ押すか、ひとことを書いてください');return}
  const f={by:me.id,at:new Date().toISOString(),score:HL.score||null,text,tab:view.tab,ver:HL.ver,w:innerWidth};
  try{if(hlReady())await db.doc('feedback/f'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)).set(f);closeSheet();toast('ありがとうございます。届きました')}
  catch(e){toast('送れませんでした。電波のよい場所でもう一度押してください')}
}
document.addEventListener('click',e=>{const t=e.target.closest('[data-hlscore],[data-hlsend],[data-hlask]');if(!t)return;
  if(t.dataset.hlscore){HL.score=+t.dataset.hlscore;document.querySelectorAll('.hl-face').forEach(b=>b.setAttribute('aria-pressed',b===t))}
  if(t.dataset.hlsend!==undefined)busyRun('hl',t,hlSend);
  if(t.dataset.hlask!==undefined)hlAsk('user')});
/* 5) 管理者の画面：ここ7日の、使った人・よく使う画面・不具合・速さ・満足度 */
const HLD={usage:[],errlog:[],vitals:[],feedback:[],on:false};
function hlWatch(){if(HLD.on||!hlReady())return;HLD.on=true;
  ['usage','errlog','vitals','feedback'].forEach(c=>db.collection(c).onSnapshot(s=>{HLD[c]=s.docs.map(x=>({...x.data(),id:x.id}));const el=document.getElementById('hl-panel');if(el)el.outerHTML=hlPanel()},()=>{}))}
const p75=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(s.length*.75))]};
function hlJudge(k,v){if(v==null)return['','まだ記録なし'];const T={lcp:[2500,4000],inp:[200,500],cls:[100,250]}[k];return v<=T[0]?['ok','良い']:v<=T[1]?['warn','もう少し']:['bad','遅い']}
function hlPanel(){
  if(!me.isOwner)return'';
  hlWatch();
  const from=(()=>{const d=new Date();d.setDate(d.getDate()-6);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})();
  const us=HLD.usage.filter(u=>u.day>=from), people=new Set(us.map(u=>u.by)), days=new Set(us.map(u=>u.day));
  const tabs={};us.forEach(u=>Object.entries(u.tabs||{}).forEach(([k,v])=>tabs[k]=(tabs[k]||0)+v));
  const NAME={home:'ホーム',list:'既存工事',case:'工事の画面',wb:'ホワイトボード',board:'タイムライン',cal:'予定',dash:'経営',sales:'営業',help:'ヘルプ',staff:'社員一覧',settings:'設定',quick:'新規登録',profile:'プロフィール',person:'担当者'};
  const top=Object.entries(tabs).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const er=HLD.errlog.filter(e=>e.day>=from).sort((a,b)=>(b.last||'').localeCompare(a.last||'')), en=er.reduce((s,e)=>s+(e.n||1),0);
  const vs=HLD.vitals.filter(v=>v.day>=from), V={lcp:p75(vs.map(v=>v.lcp).filter(x=>x!=null)),inp:p75(vs.map(v=>v.inp).filter(x=>x!=null)),cls:p75(vs.map(v=>v.cls).filter(x=>x!=null))};
  const fb=[...HLD.feedback].sort((a,b)=>(b.at||'').localeCompare(a.at||'')), sc=fb.filter(f=>f.score), avg=sc.length?(sc.reduce((s,f)=>s+f.score,0)/sc.length):null;
  const vrow=(k,l,u,f)=>{const [c,w]=hlJudge(k,V[k]);return `<div class="hl-v"><span>${l}</span><b class="num">${V[k]==null?'—':f(V[k])}${V[k]==null?'':u}</b><span class="chip ${c}">${w}</span></div>`};
  return `<section class="panel" id="hl-panel"><h2>アプリの調子（ここ7日）</h2>
   <p class="sub" style="margin:0">使われ方・不具合・実際のスマホでの速さ・使いやすさの声を、会社の記録にだけ残しています（お客様の情報は残しません）。</p>
   <div class="hl-kpis"><div><b class="num">${people.size}</b><span>使った人</span></div><div><b class="num">${days.size?Math.round(us.length/days.size*10)/10:0}</b><span>1日の平均人数</span></div><div><b class="num ${en?'bad-t':''}">${en}</b><span>不具合</span></div><div><b class="num">${avg==null?'—':avg.toFixed(1)}</b><span>使いやすさ（5点）</span></div></div>
   <h3>よく使われている画面</h3>${top.length?`<div class="hl-bars">${top.map(([k,v])=>`<div class="hl-bar"><span>${NAME[k]||k}</span><i style="width:${Math.max(6,v/top[0][1]*100)}%"></i><b class="num">${v}</b></div>`).join('')}</div>`:'<div class="sub">まだ記録がありません。</div>'}
   <h3>実際のスマホでの速さ（4人に3人がこれより速い）</h3>
   ${vrow('lcp','最初の画面が出るまで','秒',v=>(v/1000).toFixed(1))}${vrow('inp','押してから反応するまで','ミリ秒',v=>v)}${vrow('cls','画面のずれ','',v=>(v/1000).toFixed(2))}
   <h3>不具合の記録</h3>${er.length?er.slice(0,5).map(e=>`<div class="hl-err"><b>${esc(e.msg)}</b><span class="sub">${esc(e.day)}・${e.n||1}回・${esc(e.tab||'')}・${esc(whoName(e.by))}さん</span></div>`).join(''):'<div class="sub">ありません。</div>'}
   <h3>使いやすさの声</h3>${fb.length?fb.slice(0,6).map(f=>`<div class="hl-err"><b>${f.score?'★'.repeat(f.score)+'☆'.repeat(5-f.score):'（点なし）'}</b>${f.text?`<span>${esc(f.text)}</span>`:''}<span class="sub">${f.at?esc(new Date(f.at).toLocaleDateString('ja-JP')):''}・${esc(whoName(f.by))}さん</span></div>`).join(''):'<div class="sub">まだありません。ヘルプの画面の「ご意見を送る」からも送れます。</div>'}
  </section>`;
}
(function(){const s=document.createElement('style');s.textContent=`
.hl-faces{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.hl-face{display:grid;justify-items:center;gap:2px;min-height:72px;border:1.5px solid var(--line);border-radius:14px;background:var(--surface);cursor:pointer;padding:6px 2px;color:var(--ink)}
.hl-face span{font-size:1.8rem;line-height:1}.hl-face small{font-size:.875rem;line-height:1.25;text-align:center;color:var(--muted);word-break:keep-all}
.hl-face[aria-pressed="true"]{border-color:var(--blue);background:var(--blue-soft)}
.hl-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;text-align:center}
.hl-kpis b{display:block;font-size:1.5rem}.hl-kpis span{font-size:.875rem;color:var(--muted)}.bad-t{color:var(--bad)}
.hl-bars{display:grid;gap:6px}.hl-bar{display:grid;grid-template-columns:7em minmax(0,1fr) 3em;gap:8px;align-items:center}
.hl-bar i{display:block;height:10px;border-radius:99px;background:var(--blue)}.hl-bar b{text-align:right}
.hl-v{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)}
.hl-err{display:grid;gap:2px;padding:8px 0;border-bottom:1px solid var(--line)}.hl-err b{overflow-wrap:anywhere}
`;document.head.appendChild(s)})();
