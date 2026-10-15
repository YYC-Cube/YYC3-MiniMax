/**
 * YYC³ AI FAMILY — Service Worker（Next.js 16 静态导出多路由版）
 * 策略：
 *  - 安装：预缓存五路由文档（/ /p2/ /p3/ /p4/ /p5/）+ 404 兜底页 + manifest + 品牌图标
 *  - 导航请求：network-first，按各自 pathname 落缓存（路由内容一一对应），
 *              离线回退先精确匹配本路由，再回退根外壳（离线可开屏不白屏）
 *  - 同源静态资源（含 /_next/static 分包）：stale-while-revalidate
 *  - 跨域：直连不拦截
 *
 * 迁移注记：v2 起适配 App Router 多路由目录形态（trailingSlash）；
 * 旧版单页缓存键（v1）在 activate 阶段整体清除，防止「离线旧站」。
 */
const SW_VERSION = 'yyc3-v2-nextjs';
const SHELL_CACHE = `shell-${SW_VERSION}`;
const ASSET_CACHE = `asset-${SW_VERSION}`;
const PRECACHE_URLS = [
  '/',
  '/p2/',
  '/p3/',
  '/p4/',
  '/p5/',
  '/404.html',
  '/manifest.webmanifest',
  '/yyc3-icons/brand/logo-transparent-256.png',
  '/yyc3-icons/brand/icon-192.png',
  '/yyc3-icons/brand/icon-512.png',
  '/yyc3-icons/brand/icon-maskable-512.png',
  '/yyc3-icons/brand/apple-touch-icon-180.png',
  '/yyc3-icons/brand/favicon-32.png',
];

/** 导航 URL → 归一化缓存键（目录形态以尾斜杠为路由身份） */
function navCacheKey(url) {
  const path = url.pathname;
  return path.endsWith('/') ? path : `${path}/`;
}

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

  // 导航：network-first → 本路由缓存 → 根外壳兜底
  if (req.mode === 'navigate') {
    const key = navCacheKey(url);
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(key, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(key)
            .then((r) => r || caches.match('/'))
            .then((r) => r || caches.match('/index.html')),
        ),
    );
    return;
  }

  // 静态资源：stale-while-revalidate（含 _next/static 内容哈希分包）
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
