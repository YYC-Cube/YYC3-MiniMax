/**
 * file: useMediaQuery.ts
 * description: 响应式媒体查询 Hook · 视图降级切换依据
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * created: 2026-10-11
 * updated: 2026-10-15
 * status: active
 * tags: [hook],[responsive],[layout]
 *
 * brief: matchMedia 订阅封装，驱动移动端降级视图切换。
 *        useSyncExternalStore 实现：SSR 快照恒 false（首帧按桌面渲染），
 *        客户端读写 matchMedia，query 变更自动重订阅——无 setState-in-effect 级联
 *        （React Compiler 规则合规），可观测行为与原 useState+useEffect 版本等价
 *
 * dependencies: react
 * exports: useMediaQuery
 */

import { useCallback, useSyncExternalStore } from 'react';

/** 响应式媒体查询 Hook（移动端降级视图切换依据） */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // 服务端快照恒 false：与原实现 typeof window 兜底一致
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
