/* ===================== 10万人の模擬調査（PDCA）から入れた機能 =====================
   1 声で入力（手袋・字を打つのが苦手）   2 どこからでも探す（お客様・工事・営業の記録・投稿）
   3 電話をかけたら自動で記録              4 初めての人への3画面の案内
   5 ホームに「今日の自分の現場」（ナビ・写真・終わった）
   6 押したら震える（Android）            7 写真を小さくしてから送る（通信量・速さ）
   8 写真に工事名・日付・撮影者を入れる（施主・元請への報告用。公共工事の電子小黒板の代わりではない）
   本体（index.html）より先に読み、本体の関数は呼ばれたときに使う */

/* ---------- 6 押したら震える ---------- */
function OUBI_HAPTIC(p){try{if(navigator.vibrate)navigator.vibrate(p||12)}catch(e){}}

/* ---------- 7 写真を小さくする・8 写真に文字を入れる ---------- */
const FT_MAX=1600;
async function ftBitmap(file){try{return await createImageBitmap(file,{imageOrientation:'from-image'})}catch(e){
  return await new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=e=>{URL.revokeObjectURL(u);rej(e)};im.src=u})}}
function ftCanvas(bm,max){const w=bm.width,h=bm.height,s=Math.min(1,max/Math.max(w,h));const c=document.createElement('canvas');c.width=Math.round(w*s);c.height=Math.round(h*s);c.getContext('2d').drawImage(bm,0,0,c.width,c.height);return c}
const ftBlob=(c,q)=>new Promise(r=>c.toBlob(r,'image/jpeg',q||.82));
const ftName=n=>String(n||'photo').replace(/\.[^.]+$/,'')+'.jpg';
async function OUBI_SHRINK(file){
  if(!file||!/^image\/(jpeg|png|webp|heic|heif)/i.test(file.type||'')||/gif|svg/i.test(file.type))return file;
  try{const bm=await ftBitmap(file);if(Math.max(bm.width,bm.height)<=FT_MAX&&file.size<600*1024)return file;
    const b=await ftBlob(ftCanvas(bm,FT_MAX));if(!b||b.size>=file.size)return file;return new File([b],ftName(file.name),{type:'image/jpeg'})}
  catch(e){return file}
}
async function OUBI_STAMP(file,info){
  try{const bm=await ftBitmap(file);const c=ftCanvas(bm,FT_MAX),g=c.getContext('2d');
    const lines=[info.title||'',[info.cat,info.step].filter(Boolean).join('　'),info.when||'',info.who?'撮影：'+info.who:''].filter(Boolean);
    const fs=Math.max(18,Math.round(c.width/34)),pad=Math.round(fs*.6),lh=Math.round(fs*1.35),bw=Math.min(c.width-pad*2,Math.round(c.width*.62)),bh=lines.length*lh+pad*1.4;
    const x=pad,y=c.height-bh-pad;
    g.fillStyle='rgba(16,48,32,.86)';g.fillRect(x,y,bw,bh);g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=Math.max(2,fs/10);g.strokeRect(x,y,bw,bh); // 黒板のような緑の札
    g.fillStyle='#fff';g.font=`700 ${fs}px "Hiragino Sans","Noto Sans JP","Yu Gothic UI",sans-serif`;g.textBaseline='top';
    lines.forEach((t,i)=>{let s=t;while(g.measureText(s).width>bw-pad*2&&s.length>1)s=s.slice(0,-1);if(s!==t)s=s.slice(0,-1)+'…';g.fillText(s,x+pad,y+pad*.7+i*lh)});
    const b=await ftBlob(c);return b?new File([b],ftName(file.name),{type:'image/jpeg'}):file}
  catch(e){return file}
}
const ftStampOn=()=>{try{return localStorage.getItem('oubi.stamp')!=='0'}catch(e){return true}};
// 写真を送る口をくるむ：画像なら小さくしてから送る（ここ1か所で、工事の写真・投稿の写真・プロフィールの写真すべてに効く）
function ftWrapAssets(a){if(!a)return a;return{...a,upload:async f=>a.upload(await OUBI_SHRINK(f))}}

/* ---------- 1 声で入力 ---------- */
const FT_SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let ftRec=null, ftRecFor=null;
function OUBI_VOICE(id){
  const ta=document.getElementById(id); if(!ta)return;
  // ホーム画面に置いたiPhoneのアプリなどは声の入力の仕組みがない → 欄を開いてキーボードを出し、キーボードのマイクを案内する（PDCA3）
  if(!FT_SR){ta.focus();toast('キーボードの右下（または左下）の🎤マイクを押して話すと、文字になります',null);return}
  if(ftRec){try{ftRec.stop()}catch(e){}if(ftRecFor===id)return}
  const r=new FT_SR(); r.lang='ja-JP'; r.interimResults=true; r.continuous=false; ftRec=r; ftRecFor=id;
  const base=ta.value?ta.value.replace(/\s*$/,'')+(ta.value.trim()?'。':''):'' ; let finalText='';
  const btn=document.querySelector(`[data-mic-for="${id}"]`); if(btn){btn.classList.add('on');btn.innerHTML=ico('mic')+'<span>聞いています…押すと止める</span>'}
  r.onresult=e=>{let tmp='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)finalText+=t;else tmp+=t}
    ta.value=base+finalText+tmp;ta.dispatchEvent(new Event('input',{bubbles:true}))};
  r.onerror=e=>{if(e.error==='not-allowed')toast('マイクが許可されていません。スマホの設定でマイクを許可してください');else if(e.error!=='no-speech'&&e.error!=='aborted')toast('声を聞き取れませんでした。もう一度押してください')};
  r.onend=()=>{ftRec=null;ftRecFor=null;const b=document.querySelector(`[data-mic-for="${id}"]`);if(b){b.classList.remove('on');b.innerHTML=ico('mic')+'<span>声</span>'}
    ta.value=(base+finalText).trim()?base+finalText:ta.value;ta.dispatchEvent(new Event('input',{bubbles:true}));ta.dispatchEvent(new Event('change',{bubbles:true}));if(finalText)OUBI_HAPTIC(20)};
  try{r.start();OUBI_HAPTIC(10)}catch(e){ftRec=null}
}
let ftMicN=0;
function ftAddMics(root){
  (root||document).querySelectorAll('#main textarea:not([readonly]), #sheet textarea:not([readonly])').forEach(ta=>{
    if(ta.dataset.mic)return; ta.dataset.mic='1'; if(!ta.id)ta.id='ftv'+(++ftMicN);
    // PDCA2：欄の下に置くと1つにつき50px伸びた → 欄の右下の角に重ねる（案B）。欄の右下は文字が来にくいので右に余白を足す
    const w=document.createElement('div');w.className='ft-taw';ta.parentNode.insertBefore(w,ta);w.appendChild(ta);
    const b=document.createElement('button');b.type='button';b.className='ft-mic';b.dataset.micFor=ta.id;b.innerHTML=ico('mic')+'<span>声</span>';b.setAttribute('aria-label','声で入れる');b.title='声で入れる';
    w.appendChild(b);
  });
}
new MutationObserver(()=>{clearTimeout(ftAddMics.t);ftAddMics.t=setTimeout(()=>ftAddMics(),0)}).observe(document.documentElement,{childList:true,subtree:true});

/* ---------- 3 電話をかけたら自動で記録 ---------- */
function OUBI_CALLLOG(c,tel){
  if(!c)return; const L=c.lead=c.lead||{}; const before=JSON.stringify(c);
  (L.contacts=L.contacts||[]).push({date:today(),method:'電話',who:me.id,result:'電話をかけた（自動の記録）',content:'',next:''});
  addLog(c,`電話をかけた（${tel}）`); touch(c);
  setTimeout(()=>toast('電話したことを記録しました。話した内容は「問い合わせ」の対応履歴に書けます',()=>{const o=JSON.parse(before);Object.keys(c).forEach(k=>delete c[k]);Object.assign(c,o);touch(c);toast('記録を取り消しました')}),300);
}
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href^="tel:"]');if(!a)return;
  const c=(typeof C!=='undefined'&&C&&view.tab==='case')?C:(a.dataset.case?cases.find(x=>x.id===a.dataset.case):null);
  if(c)OUBI_CALLLOG(c,a.getAttribute('href').slice(4))},true);

/* ---------- 2 どこからでも探す ---------- */
const FT={sq:''};
function ftSearchOpen(){
  const sh=document.getElementById('sheet');
  sh.innerHTML=`<div class="sheet-box ft-gs" role="dialog" aria-modal="true" aria-label="探す"><span class="grab" aria-hidden="true"></span>
    <div class="row sb"><h2>🔍 探す</h2><button type="button" class="btn sm" data-sheet-close>閉じる</button></div>
    <input id="gs-q" type="search" placeholder="お客様の名前・電話・住所・工事名・言葉" value="${esc(FT.sq)}" autocomplete="off" enterkeyhint="search" aria-label="探す言葉">
    <div id="gs-r">${ftSearchHTML(FT.sq)}</div></div>`;
  sh.hidden=false; setTimeout(()=>{const i=document.getElementById('gs-q');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},60);
}
const ftNorm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s\-ー－‐]/g,'');
function ftSearchHTML(q){
  const n=ftNorm(q); if(!n)return '<p class="sub">お客様の名前の一部（例：やまだ・山田）、電話番号の一部、住所の一部でも探せます。</p>';
  const hit=s=>ftNorm(s).includes(n)||ftNorm(kana(s)).includes(ftNorm(kana(q)));
  const cs=cases.filter(c=>!GONE.has(c.id)&&hit([c.no,(c.lead||{}).customer,(c.lead||{}).tel,(c.lead||{}).addr,(c.lead||{}).siteAddr,(c.work||{}).title].join(' '))).slice(0,8);
  const vs=visits.filter(v=>hit([v.name,v.addr,v.tel,v.memo].join(' '))).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,6);
  const ps=posts.filter(p=>hit(p.text)).slice(0,5);
  const pp=peopleList().filter(p=>hit([p.name,p.tel].join(' '))).slice(0,5);
  const sec=(t,a)=>a.length?`<h3>${t}（${a.length}${a.length>=5?'+':''}）</h3>${a.join('')}`:'';
  const out=sec('工事',cs.map(c=>`<button type="button" class="gs-i" data-open="${c.id}"><b>${esc((c.lead||{}).customer||'名称未設定')}様</b><span class="sub">${esc((c.work||{}).title||'')}・${esc(stageLabel(c))}・${esc(c.no)}</span></button>`))
   +sec('営業の記録',vs.map(v=>`<button type="button" class="gs-i" data-slgo-visit="${esc(v.id)}"><b>${esc(slWho(v))}</b><span class="sub">${esc(md(v.day))} ${esc(whoName(v.by))}さん：${esc(v.r==='話した'?'話せた':v.r==='お断り'?'見送り':v.r)}${v.memo?'「'+esc(v.memo.slice(0,20))+'」':''}</span></button>`))
   +sec('タイムライン',ps.map(p=>`<button type="button" class="gs-i" data-tab="board"><b>${esc(whoName(p.by))}さん</b><span class="sub">${esc(p.text.slice(0,40))}</span></button>`))
   +sec('社員',pp.map(p=>`<button type="button" class="gs-i" data-profile="${esc(p.id)}"><b>${esc(p.name)}</b><span class="sub">${esc(p.tel||'')}</span></button>`));
  return out||`<p class="sub">「${esc(shortQ(q))}」は見つかりませんでした。言葉を短くしてみてください。</p>`;
}
document.addEventListener('input',e=>{if(e.target.id!=='gs-q')return;if(e.isComposing||e.target._comp)return;FT.sq=e.target.value;clearTimeout(FT.t);FT.t=setTimeout(()=>{const r=document.getElementById('gs-r');if(r)r.innerHTML=ftSearchHTML(FT.sq)},150)},true);
document.addEventListener('compositionstart',e=>{if(e.target.id==='gs-q')e.target._comp=true});
document.addEventListener('compositionend',e=>{if(e.target.id==='gs-q'){e.target._comp=false;FT.sq=e.target.value;const r=document.getElementById('gs-r');if(r)r.innerHTML=ftSearchHTML(FT.sq)}});
// ホームの検索の入口（PDCA2：上の帯の🔍［案A］とホームの検索欄［案B］をくらべて決める）
const FT_SEARCH_VARIANT=()=>{try{return localStorage.getItem('oubi.gsv')||'B'}catch(e){return'B'}};
function ftHomeSearch(){return FT_SEARCH_VARIANT()==='A'?'':`<button type="button" class="ft-hsearch" data-gsearch>${ico('search')}<span>お客様・工事・記録を探す</span></button>`}
function ftHeaderSearch(){ // 上の帯（社員一覧の左）に🔍
  const hw=document.querySelector('.hw'); if(!hw||hw.querySelector('[data-gsearch]'))return;
  const b=document.createElement('button');b.type='button';b.className='hd-btn';b.dataset.gsearch='';b.setAttribute('aria-label','探す');b.title='探す';
  b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>';
  hw.insertBefore(b,hw.firstChild);
}

/* ---------- 5 今日の自分の現場 ---------- */
function ftMySites(){
  const t=today(), out=[];
  cases.filter(c=>!c.archived&&!isLost(c)&&!GONE.has(c.id)&&caseHas(c,me.id)).forEach(c=>{
    const s=c.schedule||{}; (s.steps||[]).forEach((st,i)=>{if(st.start&&st.start<=t&&(st.end||st.start)>=t)out.push({c,st,i})});
    const W=c.work||{}; if(W.surveyPlan===t&&!W.surveyDate&&sameP(W.surveyor,me.id))out.push({c,survey:true});
  });
  return out;
}
function ftSitesHTML(){
  const a=ftMySites(); if(!a.length)return'';
  // 1つの現場を1行に（PDCA2：2行だとホームの大事なボタンが下に押し出されたため）。ボタンは44pxの四角で、名前は読み上げ用に付ける
  const row=({c,st,i,survey})=>{const L=c.lead||{},ad=L.siteAddr||L.addr||'',done=st&&st.progress==='完了',nm=(L.customer||'')+'様 '+(survey?'現地調査':(st.name||'工事'));
    const nav=L.lat?slGnav(L.lat,L.lon):ad?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(ad):'';
    return `<div class="ft-site ${done?'done':''}" data-site><div class="ft-st"><b>${esc(nm)}</b><span class="sub">${esc(slShortAddr(ad))}</span></div>
      ${nav?`<button type="button" class="ft-ib" data-slurl="${esc(nav)}" aria-label="${esc(nm)}へナビ">${ico('nav')}<small>ナビ</small></button>`:''}<button type="button" class="ft-ib" data-open="${c.id}" data-sec="${survey?'work':'invoice'}" data-goalbum="1" aria-label="${esc(nm)}の写真">${ico('cam')}<small>写真</small></button>${st?`<button type="button" class="ft-ib ${done?'on':''}" data-sitedone="${c.id}|${i}" aria-pressed="${done}" aria-label="${esc(nm)}を${done?'進行中に戻す':'終わったにする'}">${ico('check')}<small>${done?'済':'終了'}</small></button>`:''}</div>`};
  const lim=innerHeight<=720?1:2; // 画面の低いスマホ（iPhone SE など）は1件だけ。残りは予定の画面へ
  return `<div class="tdb-sites"><b class="tdb-sh">今日のあなたの現場</b>${a.slice(0,lim).map(row).join('')}${a.length>lim?`<button type="button" class="btn sm" data-mday="${today()}" data-tab-cal>ほかの現場 ${a.length-lim}件を見る</button>`:''}</div>`;
}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-sitedone],[data-gsearch],[data-mic-for],[data-onb],[data-stamp-toggle]');if(!t)return;const d=t.dataset;
  if(d.sitedone){const [id,i]=d.sitedone.split('|'),c=cases.find(x=>x.id===id),st=c&&((c.schedule||{}).steps||[])[+i];if(!st)return;
    const was=st.progress||'未着手';st.progress=st.progress==='完了'?'進行中':'完了';addLog(c,`「${st.name}」を${st.progress==='完了'?'完了':'進行中に戻した'}（ホームから）`);touch(c);OUBI_HAPTIC(st.progress==='完了'?[15,40,15]:12);render();
    toast(st.progress==='完了'?`${(c.lead||{}).customer||''}様「${st.name}」を完了にしました。工程表にも入っています`:'進行中に戻しました',()=>{st.progress=was;touch(c);render();toast('元に戻しました')});return}
  if(d.gsearch!==undefined){ftSearchOpen();return}
  if(d.micFor){OUBI_VOICE(d.micFor);return}
  if(d.onb!==undefined){ftOnb(d.onb);return}
},false);

document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.stampToggle!==undefined){try{localStorage.setItem('oubi.stamp',e.target.checked?'1':'0')}catch(_){}toast(e.target.checked?'これから入れる写真に、工事名・日付・撮影者を入れます':'写真に文字を入れないようにしました')}},true);
/* ---------- 4 初めての人への案内（3画面まで。Appleの指針：短く・飛ばせる） ---------- */
const FT_ONB=[
  ['🏠','ホームは3つだけ','「営業に出る」「新規工事の追加」「既存工事の確認」。今日の天気と予定も上に出ます。'],
  ['👇','下のボタンで行き来','ホーム・既存工事・ホワイトボード・予定・経営。いま見ている画面に青い線が付きます。'],
  ['❓','困ったら右上の「？」','やりたいことを入れると、やり方が出ます。書く欄の右下の「🎤声」で、しゃべって入れられます。']];
function OUBI_ONBOARD(force){
  const k='oubi.onb.'+(me&&me.id);let seen=false;try{seen=localStorage.getItem(k)==='1'}catch(e){}
  if(seen&&!force)return; ftOnb('0');
}
function ftOnb(step){
  const sh=document.getElementById('sheet'),i=+step;
  if(step==='end'||i>=FT_ONB.length){try{localStorage.setItem('oubi.onb.'+me.id,'1')}catch(e){}sh.hidden=true;sh.innerHTML='';toast('いつでも ？（ヘルプ）から、もう一度見られます');return}
  const [ic,h,p]=FT_ONB[i];
  sh.innerHTML=`<div class="sheet-box ft-onb" role="dialog" aria-modal="true" aria-label="使い方の案内 ${i+1}/${FT_ONB.length}"><span class="grab" aria-hidden="true"></span>
    <div class="ft-onb-ic" aria-hidden="true">${ic}</div><h2>${esc(h)}</h2><p>${esc(p)}</p>
    <div class="ft-dots" aria-hidden="true">${FT_ONB.map((_,j)=>`<i class="${j===i?'on':''}"></i>`).join('')}</div>
    <div class="row sb"><button type="button" class="btn" data-onb="end">とばす</button><button type="button" class="btn pri big" data-onb="${i+1}">${i+1<FT_ONB.length?'次へ':'はじめる'}</button></div></div>`;
  sh.hidden=false;
}

/* ---------- 見た目 ---------- */
(function(){const s=document.createElement('style');s.textContent=`
.ft-taw{position:relative;display:grid;min-width:0}.ft-taw>textarea{padding-right:64px;width:100%}
.ft-mic{position:absolute;right:6px;bottom:6px;display:inline-flex;align-items:center;gap:4px;min-height:44px;min-width:52px;padding:0 10px;border-radius:99px;border:1.5px solid var(--ctl,#8d7f6e);background:var(--surface);color:var(--ink);font:inherit;font-size:.9375rem;font-weight:700;cursor:pointer}
.ft-mic .ic{width:18px;height:18px}
.ft-mic.on{background:var(--bad);border-color:var(--bad);color:#fff;animation:ftpulse 1.2s infinite}
@keyframes ftpulse{50%{box-shadow:0 0 0 6px rgba(174,58,46,.25)}}
@media (prefers-reduced-motion:reduce){.ft-mic.on{animation:none}}
.sl .ft-mic{background:var(--ssf2);color:var(--sink);border-color:#6B7FA6}
.ft-hsearch{width:min(100%,440px);display:flex;align-items:center;gap:10px;min-height:52px;padding:0 16px;border-radius:99px;border:1.5px solid var(--ctl,#8d7f6e);background:var(--surface);color:var(--muted);font:inherit;font-size:1rem;cursor:pointer;box-shadow:var(--shadow)}
.ft-hsearch .ic{width:20px;height:20px;color:var(--blue)}
.ft-gs{max-height:85vh;overflow:auto}.ft-gs input{width:100%;min-height:48px;font-size:1rem;border:1.5px solid var(--ctl);border-radius:12px;padding:0 12px;background:var(--surface)}
.ft-gs h3{margin:10px 0 4px}.gs-i{display:grid;gap:2px;width:100%;text-align:left;border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:10px 12px;margin-bottom:6px;cursor:pointer;min-height:52px;color:var(--ink);font:inherit}
.tdb-sites{display:grid;gap:6px;border-top:1px solid var(--line);padding-top:8px}.tdb-sh{font-size:.9375rem}
.ft-site{display:flex;align-items:center;gap:6px;padding:6px 6px 6px 10px;border-radius:12px;background:var(--sunk)}.ft-site.done{opacity:.85}
.ft-st{display:grid;gap:0;min-width:0;flex:1}.ft-st b,.ft-st .sub{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ft-ib{flex:none;display:grid;justify-items:center;align-content:center;gap:1px;min-width:52px;height:54px;border-radius:12px;border:1.5px solid var(--ctl,#8d7f6e);background:var(--surface);color:var(--ink);cursor:pointer;padding:0;font:inherit}
.ft-ib .ic{width:20px;height:20px}.ft-ib small{font-size:.875rem;font-weight:700;line-height:1.1}
.ft-ib.on{background:var(--ok);border-color:var(--ok);color:#fff}
.ft-onb{text-align:center;justify-items:center;gap:10px}.ft-onb-ic{font-size:3rem;line-height:1}.ft-onb p{margin:0;max-width:30em}
.ft-onb .row{width:100%}.ft-dots{display:flex;gap:6px}.ft-dots i{width:8px;height:8px;border-radius:50%;background:var(--line)}.ft-dots i.on{background:var(--blue)}
.ft-stamp{display:flex;align-items:center;gap:8px;min-height:44px;font-size:.9375rem}.ft-stamp input{width:22px;height:22px}
`;document.head.appendChild(s)})();
