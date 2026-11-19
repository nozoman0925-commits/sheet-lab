/* 桜美建設 業務管理：保存先（Supabase）とのつなぎ込み
   アプリ本体は window.claude.use('db' | 'user' | 'assets') で保存先を受け取る作りなので、
   同じ形の部品をここで用意する。設定は config.js（OUBI_CONFIG）に書く。

   - 会社の合言葉 … Supabase の「社員用」「社長用」2つのアカウントのパスワード。
     どちらで入れたかで社長かどうかが決まる（承認と基準値の変更は社長用だけが書き込める）。
   - 一度入れたら、この端末では次から聞かない（ログインの状態を端末に保存）。
   - 記録は端末にも控えを置き、開いた瞬間に前回の記録を出す。電波がなくても見られる。 */
(function(){
'use strict';
const cfg=window.OUBI_CONFIG||{};
const configured=!!(cfg.url&&cfg.anonKey&&window.supabase&&window.supabase.createClient);
window.OUBI_SUPA=configured;
if(!configured)return; // 未設定のときは、アプリはこの端末だけの試用モードで動く

const LSK={role:'oubi.role',me:'oubi.me',cache:'oubi.cache.'};
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const lsDel=k=>{try{localStorage.removeItem(k)}catch(e){}};

const sb=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'oubi.auth'}});
let role=lsGet(LSK.role,'');

/* ---------- エラーをアプリが分かる形に ---------- */
function mapErr(e){
  const m=String((e&&(e.message||e.error_description))||e||'');
  if(e&&(e.code==='42501'||/row-level security|permission|not authorized|Unauthorized|JWT/i.test(m)))return {code:'invalid_argument',message:m};
  return {code:'network',message:m};
}

/* ---------- 記録（docs テーブル：col＝種類、id、data） ---------- */
const store={}, listeners={}, fetched={};
function mapOf(col){
  if(!store[col]){store[col]=new Map(Object.entries(lsGet(LSK.cache+col,{})))}
  return store[col];
}
const saveT={};
/* 端末の控え（圏外でも開けるように）。ブラウザの保存場所は約5MBしかないため、
   ・使われ方の記録などは控えない ・入りきらなければ古いものから減らす（サーバーには全部ある）
   ・送れていない記録（oubi.slout など）は、控えを減らしてでも必ず入れる（window.OUBI_LS_FREE） */
const NOCACHE=new Set(['usage','vitals','errlog','feedback']);
function lsTry(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
function trimmed(col,obj){
  const ents=Object.entries(obj);
  if(col==='visits'){const lim=new Date(Date.now()-90*864e5).toISOString().slice(0,10); // 90日より前の訪問は、再訪問の予定ともう行かない家だけ残す
    return Object.fromEntries(ents.filter(([,d])=>!d||(d.day||'')>=lim||(d.rv&&!d.rvDone)||d.ng))}
  if(['board','replies','likes','wb'].includes(col))return Object.fromEntries(ents.sort((a,b)=>String((b[1]||{}).at||'').localeCompare(String((a[1]||{}).at||''))).slice(0,300));
  return obj;
}
function freeSpace(except){ // 控えを減らす：まず古い訪問・投稿を間引き、それでも足りなければ控えそのものを消す
  for(const col of ['visits','board','replies','likes','wb']){const k=LSK.cache+col;if(k===except)continue;const raw=localStorage.getItem(k);if(!raw)continue;try{const t=JSON.stringify(trimmed(col,JSON.parse(raw)));if(t.length<raw.length)lsTry(k,t)}catch(e){}}
  for(const k of Object.keys(localStorage))if(k.startsWith(LSK.cache)&&k!==except&&/(usage|vitals|errlog|feedback|likes|replies|board)$/.test(k))lsDel(k);
}
window.OUBI_LS_FREE=freeSpace;
function saveCache(col){if(NOCACHE.has(col))return;clearTimeout(saveT[col]);saveT[col]=setTimeout(()=>{
  const k=LSK.cache+col, obj=Object.fromEntries(mapOf(col)); let s=JSON.stringify(obj);
  if(lsTry(k,s))return;
  s=JSON.stringify(trimmed(col,obj)); if(lsTry(k,s))return;
  freeSpace(k); if(lsTry(k,s))return;
  lsDel(k); // それでも入らなければ、この種類の控えはあきらめる（開くときにサーバーから取る）
},400)}
function emit(col){
  const rows=[...mapOf(col)].map(([id,data])=>({id,data}));
  (listeners[col]||[]).forEach(l=>{
    try{
      if(l.doc){const r=rows.find(x=>x.id===l.doc);l.cb({exists:!!r,id:l.doc,data:()=>r?r.data:undefined});return}
      let list=rows;
      if(l.order){const [f,dir]=l.order;list=[...rows].sort((a,b)=>String((a.data||{})[f]||'').localeCompare(String((b.data||{})[f]||''))*(dir==='desc'?-1:1))}
      if(l.limit)list=list.slice(0,l.limit);
      l.cb({docs:list.map(r=>({id:r.id,data:()=>r.data}))});
    }catch(err){console.error(err)}
  });
}
/* 取り直しの最中に、この端末で保存・削除したものは、取り直した一覧で上書きしない
   （取り直しが保存より先に始まると、古い一覧で上書きされ、保存した記録が次の取り直しまで消えて見えていた。1万人の試験で発見） */
const touched={}; // col → Map(id → {t, del})
function markTouched(col,id,del){(touched[col]=touched[col]||new Map()).set(id,{t:Date.now(),del})}
async function fetchCol(col){
  // 1000件ずつ、idの順に「前の最後のidより後」を取る（順番の決まっていない取り方や、何件目からの取り方だと、
  // 途中で消された記録があると1件ずれて、取りこぼしが起きる。1000件を超えたときだけ起きる不具合だった）
  const t0=Date.now(); let all=[],last='';
  for(;;){
    let q=sb.from('docs').select('id,data').eq('col',col).order('id',{ascending:true}).limit(1000);
    if(last)q=q.gt('id',last);
    const {data,error}=await q;
    if(error)throw error;
    all=all.concat(data); if(data.length<1000)break; last=data[data.length-1].id;
  }
  const m=new Map(all.map(r=>[r.id,r.data])), old=mapOf(col), tc=touched[col];
  if(tc)tc.forEach((x,id)=>{if(x.t>=t0-1000){if(x.del)m.delete(id);else if(old.has(id))m.set(id,old.get(id))} else if(Date.now()-x.t>600000)tc.delete(id)});
  store[col]=m; fetched[col]=true; saveCache(col); emit(col);
}
function listen(col,l){
  (listeners[col]=listeners[col]||[]).push(l);
  // 端末の控えをすぐ出し、そのあと最新を取りに行く
  setTimeout(()=>{if(mapOf(col).size||!navigator.onLine)emit(col)},0);
  fetchCol(col).catch(e=>{if(!mapOf(col).size&&navigator.onLine&&l.err)l.err(mapErr(e))});
  return ()=>{listeners[col]=(listeners[col]||[]).filter(x=>x!==l)};
}
function query(col,order,limit){
  return {
    orderBy:(f,dir)=>query(col,[f,dir||'asc'],limit),
    limit:n=>query(col,order,n),
    onSnapshot:(cb,err)=>listen(col,{cb,err,order,limit})
  };
}
function split(path){const i=path.indexOf('/');return [path.slice(0,i),path.slice(i+1)]}
const db={
  collection:col=>query(col),
  doc:path=>{const [col,id]=split(path);return {
    async set(data){
      const clean=JSON.parse(JSON.stringify(data));
      const {error}=await sb.from('docs').upsert({col,id,data:clean,updated_at:new Date().toISOString()});
      if(error)throw mapErr(error);
      markTouched(col,id,false); mapOf(col).set(id,clean); saveCache(col); emit(col);
    },
    async delete(){
      const {error}=await sb.from('docs').delete().eq('col',col).eq('id',id);
      if(error)throw mapErr(error);
      markTouched(col,id,true); mapOf(col).delete(id); saveCache(col); emit(col);
    },
    onSnapshot:(cb,err)=>listen(col,{cb,err,doc:id})
  }}
};

/* ほかの人の変更をすぐ受け取る */
let channel=null;
function startRealtime(){
  if(channel)return;
  channel=sb.channel('oubi-docs').on('postgres_changes',{event:'*',schema:'public',table:'docs'},p=>{
    const r=p.eventType==='DELETE'?p.old:p.new; if(!r||!r.col)return;
    if(!(listeners[r.col]||[]).length&&!store[r.col])return; // 見ていない種類（使われ方の記録など）は端末に控えない（端末の保存場所がいっぱいにならないように）
    if(p.eventType==='DELETE')mapOf(r.col).delete(r.id); else mapOf(r.col).set(r.id,r.data);
    saveCache(r.col); emit(r.col);
  }).subscribe();
}
// 電波が戻ったとき・アプリに戻ってきたときは、取りこぼしがないよう取り直す
function refetchAll(){Object.keys(listeners).forEach(col=>fetchCol(col).catch(()=>{}))}
window.addEventListener('online',refetchAll);
let hiddenAt=0;
document.addEventListener('visibilitychange',()=>{if(document.hidden)hiddenAt=Date.now();else if(Date.now()-hiddenAt>20000)refetchAll()});

/* ---------- 写真・書類 ---------- */
const OK_TYPE=/^(application\/pdf|image\/)/;
const assets={
  async upload(file){
    if(!OK_TYPE.test(file.type||''))throw {code:'unsupported_type'};
    if(file.size>20*1024*1024)throw {code:'too_large'};
    const ext=(file.name.match(/\.[A-Za-z0-9]{1,6}$/)||[''])[0].toLowerCase();
    const path=new Date().toISOString().slice(0,7)+'/'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)+ext;
    const {error}=await sb.storage.from('files').upload(path,file,{contentType:file.type,upsert:false});
    if(error)throw mapErr(error);
    return {id:path,url:'',sizeBytes:file.size,contentType:file.type};
  }
};
// 写真は鍵つきの保管場所にあるので、表示用の期限つきURLをもらって差し込む
const signed={}, PH='about:blank#oubi-blob:';
window.SUPA_BLOB=id=>{const s=signed[id];return s&&s.exp>Date.now()?s.url:PH+encodeURIComponent(id)};
let signT=null;
function fillBlobs(){
  const els=[...document.querySelectorAll(`[src^="${PH}"],[href^="${PH}"]`)];
  const ids=[...new Set(els.map(e=>decodeURIComponent((e.getAttribute('src')||e.getAttribute('href')).slice(PH.length))))].filter(id=>!(signed[id]&&signed[id].exp>Date.now()));
  const apply=()=>els.forEach(e=>{const attr=e.hasAttribute('src')?'src':'href';const id=decodeURIComponent(e.getAttribute(attr).slice(PH.length));if(signed[id])e.setAttribute(attr,signed[id].url)});
  if(!ids.length){apply();return}
  sb.storage.from('files').createSignedUrls(ids,3600).then(({data})=>{(data||[]).forEach(d=>{if(d.signedUrl)signed[d.path]={url:d.signedUrl,exp:Date.now()+50*60e3}});apply()}).catch(()=>{});
}
new MutationObserver(()=>{clearTimeout(signT);signT=setTimeout(fillBlobs,30)}).observe(document.documentElement,{subtree:true,childList:true});

/* ---------- 使う人 ---------- */
const user={
  async me(){return {id:lsGet(LSK.me,''),isOwner:role==='boss',name:''}},
  isOwner:()=>role==='boss',
  async profiles(){return {}}
};
window.OUBI_SET_ME=id=>{if(id)lsSet(LSK.me,id);else lsDel(LSK.me)};
window.SUPA_EMAIL=()=>role==='boss'?'社長として登録しています':'社員として登録しています';
window.SUPA_LOGOUT=async()=>{
  try{await sb.auth.signOut()}catch(e){}
  [LSK.role,LSK.me].forEach(lsDel);
  try{Object.keys(localStorage).filter(k=>k.startsWith(LSK.cache)).forEach(k=>localStorage.removeItem(k))}catch(e){}
  location.reload();
};

/* ---------- 入口：会社の合言葉（最初の1回だけ） ---------- */
let open; const gate=new Promise(r=>{open=r});
function begin(){startRealtime();open(true)}
function showGate(){
  const g=document.getElementById('gate'); if(!g)return;
  g.hidden=false;
  const inp=g.querySelector('#gate-pass'), btn=g.querySelector('#gate-go'), err=g.querySelector('#gate-err'), eye=g.querySelector('#gate-eye');
  setTimeout(()=>inp.focus(),50);
  eye.addEventListener('click',()=>{const show=inp.type==='password';inp.type=show?'text':'password';eye.textContent=show?'かくす':'見る';eye.setAttribute('aria-pressed',String(show))});
  const say=t=>{err.textContent=t;err.hidden=!t;inp.setAttribute('aria-invalid',t?'true':'false')};
  if(window.OUBI_JOIN_ERR)say(window.OUBI_JOIN_ERR);
  const go=async()=>{
    const pass=inp.value.trim();
    if(!pass){say('合言葉を入れてください');inp.focus();return}
    if(!navigator.onLine){say('インターネットにつながっていません。電波のよい場所でもう一度押してください');return}
    btn.disabled=true; btn.textContent='確かめています…'; say('');
    const r=await signInWith(pass);
    if(r.err==='net'){say('つながりませんでした。少し待ってから、もう一度押してください');btn.disabled=false;btn.textContent='はじめる';return}
    if(r.err){say('合言葉がちがいます。社長に確かめてください');btn.disabled=false;btn.textContent='はじめる';inp.select();return}
    role=r.role; lsSet(LSK.role,role); g.hidden=true; begin();
  };
  btn.addEventListener('click',go);
  inp.addEventListener('keydown',e=>{if(e.key==='Enter')go()});
}
/* 招待リンク（…/#join=合言葉）：押すだけで入れる。合言葉は「#」より後ろなのでサーバーには送られない。
   入ったらすぐアドレスから消す（画面の写真や履歴に残さないため） */
function takeJoin(){
  const m=/(?:^#|&)join=([^&]+)/.exec(location.hash||''); if(!m)return '';
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  try{return decodeURIComponent(m[1])}catch(e){return ''}
}
// 合言葉が1つだけ（staffEmail と bossEmail が同じ）なら、入った人は全員「社長と同じ」扱い
const roleOf=email=>email&&email===cfg.bossEmail?'boss':'staff';
async function signInWith(pass){
  for(const email of [...new Set([cfg.staffEmail,cfg.bossEmail])]){
    if(!email)continue;
    const {error}=await sb.auth.signInWithPassword({email,password:pass});
    if(!error)return {role:roleOf(email)};
    if(!/invalid/i.test(error.message||''))return {err:'net'};
  }
  return {err:'bad'};
}
window.OUBI_INVITE=pass=>location.origin+location.pathname+'#join='+encodeURIComponent(pass);
(async()=>{
  let session=null;
  const join=takeJoin();
  if(join&&navigator.onLine){
    const r=await signInWith(join);
    if(r.role){role=r.role;lsSet(LSK.role,role);begin();return}
    if(r.err==='bad'){window.OUBI_JOIN_ERR='この招待リンクは使えなくなっています（合言葉が変わった可能性があります）。社長に新しいリンクをもらうか、合言葉を入れてください'}
  }
  try{session=(await sb.auth.getSession()).data.session}catch(e){}
  if(session){
    const em=(session.user&&session.user.email)||'';
    role=em===cfg.bossEmail?'boss':'staff'; lsSet(LSK.role,role); begin(); return;
  }
  // 電波がなくても、前に入ったことのある端末なら控えの記録で始める
  if(role&&!navigator.onLine){begin();return}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showGate);else showGate();
})();

/* アプリ本体への受け渡し */
const caps={db,user,assets};
window.claude={use:name=>gate.then(()=>caps[name]||null)};
})();
