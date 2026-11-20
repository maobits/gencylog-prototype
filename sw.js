/* Cache de archivos estáticos. No se cachean datos operativos, guardados únicamente en IndexedDB. */
const CACHE='gencylog-f4-static-v2.0.0';
const ASSETS=['./','./index.html','./styles.css','./favicon.svg','./seed.js','./domain.js','./storage.js','./app.js','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('gencylog-f4-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));});
