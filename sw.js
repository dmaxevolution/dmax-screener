const C='idx-terminal-pro-v401-20260915';
const A=['./','./index.html','./styles.css','./app.js','./data.json','./emiten.json','./manifest.json','./icon.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(A)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('idx')&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==location.origin)return; e.respondWith(fetch(e.request).then(r=>{if(r&&r.ok){const c=r.clone();caches.open(C).then(cache=>cache.put(e.request,c));}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html))));});
