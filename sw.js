/* «Ремонт по полочкам» – works without the internet after the first visit.
   The page itself: from the network when there is one (so a new version shows at once), else from the cache.
   Fonts, three.js, Excel and the other libraries from CDNs: from the cache, refreshed in the background.
   make-site.sh writes the build time into VERSION, so every new upload gets a fresh cache. */
const VERSION = '20261114-195052';
const CACHE = 'remont-' + VERSION;
const SHELL = ['./', './index.html', './catalog.json', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
const CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('remont-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* the page and the site's own files: network first, the cache when offline */
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
    return;
  }
  /* libraries and fonts: the cache at once, refreshed behind */
  if (CDN.test(req.url)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
  /* anything else (exchange rates, the feedback form) – straight to the network, as before */
});
