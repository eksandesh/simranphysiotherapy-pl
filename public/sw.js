const CACHE='simran-offline-v2';const files=['/offline.html','/offline-app.js','/offline-app.css','/therapy.png','/clinic-icon.svg'];
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(files);await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{await caches.delete('simran-shell-v1');await self.clients.claim()})()));
self.addEventListener('message',e=>{if(e.data?.type==='CACHE_SHELL')e.ports[0]?.postMessage(true)});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin!==location.origin||e.request.method!=='GET')return;if(e.request.mode==='navigate'&&u.pathname==='/'){e.respondWith((async()=>await (await caches.open(CACHE)).match('/offline.html')||fetch(e.request))());return}if(files.includes(u.pathname))e.respondWith((async()=>await (await caches.open(CACHE)).match(u.pathname)||fetch(e.request))())});
