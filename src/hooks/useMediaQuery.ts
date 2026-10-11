/**
 * file: useMediaQuery.ts
 * description: 响应式媒体查询 Hook · 视图降级切换依据
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [hook],[responsive],[layout]
 *
 * brief: matchMedia 订阅封装，驱动移动端降级视图切换
 *
 * dependencies: react
 * exports: useMediaQuery
 */

import { useEffect, useState } from 'react';

/** 响应式媒体查询 Hook（移动端降级视图切换依据） */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
