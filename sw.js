// 離線快取：素材先讀快取（版本更新時整批換新），網頁與程式先連網、失敗再用快取
importScripts('js/asset-list.js');
const CACHE = 'wendao-20261107150000';
const CORE = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'js/asset-list.js', 'js/data.js', 'js/audio.js', 'js/state.js', 'js/fx.js', 'js/aura.js', 'js/story.js', 'js/halo.js', 'js/battle.js', 'js/ui.js', 'js/main.js', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([...CORE, ...ASSET_LIST]).then(() => Promise.all((typeof AUDIO_LIST !== 'undefined' ? AUDIO_LIST : []).map((u) => c.add(u).catch(() => {}))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('wendao-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 字型等外部資源：有快取就用，同時更新
  if (url.origin !== location.origin) {
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => { const net = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit); return hit || net; })));
    return;
  }
  if (url.pathname.includes('/assets/')) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
    return;
  }
  e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return r; }).catch(() => caches.match(req, { ignoreSearch: true })));
});
