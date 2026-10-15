/**
 * YYC³ AI FAMILY — Service Worker
 * 策略：
 *  - 安装：预缓存应用外壳（单文件构建后 '/' 已内联全部 JS/CSS）+ 品牌图标
 *  - 导航请求：network-first，离线回退缓存外壳（离线可开屏）
 *  - 同源静态资源：stale-while-revalidate（图标/字体）
 *  - 跨域：直连不拦截
 */
const SW_VERSION = 'yyc3-v1';
const SHELL_CACHE = `shell-${SW_VERSION}`;
const ASSET_CACHE = `asset-${SW_VERSION}`;
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/yyc3-icons/brand/logo-transparent-256.png',
  '/yyc3-icons/brand/icon-192.png',
  '/yyc3-icons/brand/icon-512.png',
  '/yyc3-icons/brand/icon-maskable-512.png',
  '/yyc3-icons/brand/apple-touch-icon-180.png',
  '/yyc3-icons/brand/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => ![SHELL_CACHE, ASSET_CACHE].includes(k)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 跨域直连

  // 导航：network-first → 缓存外壳
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    );
    return;
  }

  // 静态资源：stale-while-revalidate
  if (req.destination && req.destination !== '') {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(ASSET_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
