# オフライン版（PWA）を作る：bushido.html → pwa/ （index.html・manifest・sw.js・アイコン・画像）
import os,shutil,json,hashlib
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));OUT=os.path.join(B,'pwa')
os.makedirs(OUT,exist_ok=True);os.makedirs(os.path.join(OUT,'img'),exist_ok=True)
src=open(os.path.join(B,'bushido.html')).read()
# 保存先の説明を端末用に
src=src.replace('サインインしていないため、この端末のブラウザ内だけに保存しています。','この端末の中にだけ保存しています。機種変更の前に、誓いの間から記録を書き出してください。')
title='<title>武士道 BUSHIDO</title>'
assert src.startswith(title)
body=src[len(title):]
head=('<!doctype html><html lang="ja"><head><meta charset="utf-8">'
 '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
 +title+
 '<meta name="theme-color" content="#0d0c0a"><link rel="manifest" href="manifest.webmanifest">'
 '<link rel="apple-touch-icon" href="icon-180.png"><meta name="apple-mobile-web-app-capable" content="yes">'
 '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="武士道">'
 '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"></head><body>')
tail='<script>if("serviceWorker" in navigator){addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})})}</script></body></html>'
html=head+body+tail
open(os.path.join(OUT,'index.html'),'w').write(html)
imgs=sorted(f for f in os.listdir(os.path.join(B,'img')) if f.endswith('.webp'))
for f in imgs: shutil.copy(os.path.join(B,'img',f),os.path.join(OUT,'img',f))
json.dump({"name":"武士道 BUSHIDO","short_name":"武士道","start_url":"./","scope":"./","display":"standalone","orientation":"portrait",
 "background_color":"#0d0c0a","theme_color":"#0d0c0a","lang":"ja",
 "icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]},
 open(os.path.join(OUT,'manifest.webmanifest'),'w'),ensure_ascii=False)
ver=hashlib.sha1((html+''.join(imgs)).encode()).hexdigest()[:10]
shell=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png']+['img/'+f for f in imgs]
sw='''// 武士道 オフライン用：初回に本体と画像をすべて端末に保存し、以後はネットなしで起動する
const V="bushido-%s";const SHELL=%s;
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k.indexOf("bushido-")===0).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
  // 文字（Google Fonts）：手元にあれば即座に使い、裏で新しくする
  if(u.hostname==="fonts.googleapis.com"||u.hostname==="fonts.gstatic.com"){e.respondWith(caches.open(V+"-font").then(async c=>{const hit=await c.match(r);const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==="opaque"))c.put(r,res.clone());return res}).catch(()=>hit);return hit||net}));return}
  if(u.origin!==location.origin)return;
  // 本体と画像：端末の保存分を先に使う（ネットがなくても速く開く）
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match("index.html"))))});
'''%(ver,json.dumps(shell))
open(os.path.join(OUT,'sw.js'),'w').write(sw)
print("pwa",ver,len(html),"bytes,",len(imgs),"images")
