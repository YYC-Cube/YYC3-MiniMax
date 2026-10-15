/**
 * file: pwa.ts
 * description: PWA 服务 · Service Worker 注册（仅生产构建，开发环境不缓存）
 */

export function registerServiceWorker(): void {
  // Next.js：NODE_ENV 由构建管线注入（next build → production），等价 Vite import.meta.env.PROD
  if (process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // 注册失败不阻塞应用（隐私模式/受限环境）
      console.warn('[PWA] service worker 注册失败：', err);
    });
  });
}
