/**
 * file: app/ResponsiveGate.tsx
 * description: 响应式挂载守卫 · useMediaQuery 客户端态延后暴露（SSR 首帧 hydration 安全）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [responsive],[hydration],[app-router]
 *
 * brief: matchMedia 仅客户端可判；SSR 首帧按桌面渲染（matches=false），挂载后同步真实视口，
 *        消除 App Router 下移动端首帧闪跳与 hydration mismatch（清单 §5.3 要点 4）
 *
 * dependencies: react, hooks/useMediaQuery
 * exports: ResponsiveGate
 */

'use client'

import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useEffect, useState } from 'react'

/** @returns [isMobile, mounted]：mounted=false 期间调用方必须按桌面分支渲染 */
export function useResponsiveGate(): [boolean, boolean] {
  const isMobile = useMediaQuery('(max-width: 767px)')
  // 首帧与 SSR 对齐（桌面），挂载后才允许切换移动分支
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return [isMobile, mounted]
}
