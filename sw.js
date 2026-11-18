/* Service Worker cho Trắc Nghiệm Từ Vựng PWA */
var CACHE_NAME = 'tuvung-pwa-v1';
var CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Cache từng file riêng để 1 file lỗi không làm hỏng cả quá trình
      return Promise.allSettled(
        CORE_ASSETS.map(function (url) {
          return cache.add(url).catch(function () { /* bỏ qua file lỗi */ });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  // Chỉ cache request cùng origin (bỏ qua CDN bên ngoài như xlsx)
  if (url.origin !== self.location.origin) return;

  // Với điều hướng trang (mở app): ưu tiên mạng, fallback về cache (hỗ trợ offline)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); }).catch(function () {});
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Với tài nguyên tĩnh (icon, manifest): cache-first, nếu chưa có thì tải về và cache
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () { return cached; });
    })
  );
});
