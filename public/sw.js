/* Service Worker for PERS — سامانه بازرسی تجهیزات */
const VERSION = 'v1';
const STATIC_CACHE = 'pers-static-' + VERSION;
const STATIC_ASSETS = ['./', './index.html', './sw.js'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(STATIC_CACHE).then(c=>c.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(k=>k!==STATIC_CACHE).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const req = e.request, url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(req).catch(()=>new Response(JSON.stringify({error:'آفلاین'}), {
      headers:{'content-type':'application/json'}, status:503 })));
    return;
  }
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate' || (req.headers.get('accept')||'').includes('text/html')) {
    e.respondWith(fetch(req).then(res=>{
      const copy = res.clone(); caches.open(STATIC_CACHE).then(c=>c.put('./index.html', copy));
      return res;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(cached=>{
    const network = fetch(req).then(res=>{
      const copy = res.clone(); caches.open(STATIC_CACHE).then(c=>c.put(req, copy)); return res;
    }).catch(()=>cached);
    return cached || network;
  }));
});
