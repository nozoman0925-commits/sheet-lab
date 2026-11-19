/* 電波がなくても画面を開けるようにする。記録そのものは supa.js が端末に控えを置く。
   画面のファイルは「まず最新を取りに行き、だめなら控え」。更新したら VERSION を上げる。 */
const VERSION='oubi-v25';
const FILES=['./','index.html','config.js','supa.js','sales.js','health.js','features.js','mitsu.js','mitsu.css','mitsu-bridge.js','mitsu-host.css','theme-oumitsu.css','manifest.webmanifest','logo.jpg','logo-s.jpg','icon-180.png','icon-192.png','icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET')return;
  const url=new URL(req.url);
  // 記録・写真・ログインの通信（Supabase）は控えを使わない
  if(/supabase\.co$/.test(url.hostname))return;
  const mine=url.origin===location.origin||FILES.includes(req.url)||url.hostname.endsWith('fonts.googleapis.com')||url.hostname.endsWith('fonts.gstatic.com');
  if(!mine)return;
  e.respondWith(fetch(req).then(res=>{if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(VERSION).then(c=>c.put(req,cp))}return res})
    .catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||(req.mode==='navigate'?caches.match('index.html'):undefined))));
});
