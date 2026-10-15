/**
 * file: app/ResponsiveGate.tsx
 * description: 响应式挂载守卫 · useMediaQuery 客户端态延后暴露（SSR 首帧 hydration 安全）
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [responsive],[hydration],[app-router]
 *
 * brief: matchMedia 仅客户端可判；SSR 首帧按桌面渲染（mounted=false），挂载后切换真实视口，
 *        消除 App Router 下移动端首帧闪跳与 hydration mismatch（清单 §5.3 要点 4）。
 *        mounted 经 useSyncExternalStore 空订阅实现——零 setState-in-effect 级联
 *        （React Compiler 规则合规），行为与原 setMounted effect 等价
 *
 * dependencies: react, hooks/useMediaQuery
 * exports: useResponsiveGate
 */

'use client'

import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSyncExternalStore } from 'react'

/** 空订阅：mounted 为纯挂载信号，无外部数据源 */
const emptySubscribe = () => () => {}

/** @returns [isMobile, mounted]：mounted=false 期间调用方必须按桌面分支渲染 */
export function useResponsiveGate(): [boolean, boolean] {
  const isMobile = useMediaQuery('(max-width: 767px)')
  // 服务端/首帧快照 false（与 SSR 桌面渲染对齐），挂载后翻 true——等价原 setMounted effect，零级联渲染
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  return [isMobile, mounted]
}
