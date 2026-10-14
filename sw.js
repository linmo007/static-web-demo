/* Service Worker：HTML 页面网络优先（保证更新即时生效），静态资源缓存优先（离线可用）。 */
const CACHE_NAME = 'love-wishes-v6';
const CORE_ASSETS = [
  './',
  './index.html',
  './wheel.html',
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
  './44C0C187A706FC900C7E1657A618F81E.jpg',
  './7C48E35CE67184E610786CB72B12F37F.jpg',
  './7B236FCB471B1B363FC320CFD8392404.jpg'
];

// 安装：预缓存核心资源（单个失败不阻塞），并立即接管
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.all(CORE_ASSETS.map(url =>
        cache.add(new Request(url, { cache: 'reload' })).catch(() => { /* 单个资源缺失不影响安装 */ })
      ));
    }).then(() => self.skipWaiting())
  );
});

// 激活：清理所有旧版本缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Firebase 实时数据与 SDK：直接走网络，不缓存
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('firebasedatabase.app') || url.hostname.includes('gstatic.com')) {
    return;
  }
  // 页面（真实跳转或 SPA fetch 拉取的 HTML）：网络优先——在线时永远拿最新页面，离线时才回退缓存
  const isPage = event.request.mode === 'navigate' ||
    (url.origin === location.origin && (url.pathname.endsWith('.html') || url.pathname.endsWith('/')));
  if (isPage) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
        return response;
      }).catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }
  // playlist.json：网络优先，更新歌单立即生效
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
  // 其余静态资源（JS/CSS/图片/字体）：缓存优先，后台动态补缓存
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
