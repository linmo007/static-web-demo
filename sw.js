/* Service Worker：缓存核心静态资源，愿望数据仍实时来自 Firebase。 */
const CACHE_NAME = 'love-wishes-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './gallery.html',
  './letters.html',
  './report.html',
  './nav.js',
  './player.js',
  './ambient.js',
  './sfx.js',
  './manifest.json',
  './music/playlist.json',
  './icon-192.png',
  './icon-512.png',
  './charm-cat.png',
  './line-man.png',
  './line-woman.png',
  './44C0C187A706FC900C7E1657A618F81E.jpg',
  './7C48E35CE67184E610786CB72B12F37F.jpg',
  './7B236FCB471B1B363FC320CFD8392404.jpg'
];

// 安装时预缓存核心资源（单个失败不阻塞整体安装）
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.all(CORE_ASSETS.map(url =>
        cache.add(new Request(url, { cache: 'reload' })).catch(() => { /* 单个资源缺失不影响安装 */ })
      ));
    }).then(() => self.skipWaiting())
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// 请求策略：
// - Firebase 实时数据与 SDK：直接走网络，不缓存；
// - playlist.json：网络优先，保证用户更新歌单后立即生效，离线时回退缓存；
// - 其余同源静态资源：缓存优先，后台动态缓存。
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('firebasedatabase.app') || url.hostname.includes('gstatic.com')) {
    return; // 不缓存实时数据与 SDK
  }
  if (url.origin === location.origin && url.pathname.endsWith('music/playlist.json')) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response.ok && url.origin === location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
