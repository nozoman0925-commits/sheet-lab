// 武士道 オフライン用：初回に本体と画像をすべて端末に保存し、以後はネットなしで起動する
const V="bushido-fbba31c666";const SHELL=["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "img/bg-engawa.webp", "img/s01.webp", "img/s02.webp", "img/s03.webp", "img/s04.webp", "img/s05.webp", "img/s06.webp", "img/s07.webp", "img/s08.webp", "img/s09.webp", "img/s10.webp", "img/s11.webp", "img/s12.webp", "img/s13.webp", "img/s14.webp", "img/s15.webp", "img/s16.webp", "img/t01.webp", "img/t02.webp", "img/t03.webp", "img/t04.webp", "img/t05.webp", "img/t06.webp", "img/t07.webp", "img/t08.webp", "img/t09.webp", "img/t10.webp", "img/t11.webp", "img/t12.webp", "img/t13.webp", "img/t14.webp", "img/t15.webp", "img/t16.webp"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k.indexOf("bushido-")===0).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
  // 文字（Google Fonts）：手元にあれば即座に使い、裏で新しくする
  if(u.hostname==="fonts.googleapis.com"||u.hostname==="fonts.gstatic.com"){e.respondWith(caches.open(V+"-font").then(async c=>{const hit=await c.match(r);const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==="opaque"))c.put(r,res.clone());return res}).catch(()=>hit);return hit||net}));return}
  if(u.origin!==location.origin)return;
  // 本体と画像：端末の保存分を先に使う（ネットがなくても速く開く）
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match("index.html"))))});
