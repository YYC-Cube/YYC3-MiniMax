/**
 * file: app/LegacyViewBridge.tsx
 * description: 旧深链桥接 · /?view=P2..P5 → /p2/../p5/（静态导出无 redirects() 的替代，清单 §5.3 要点 3）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [app-router],[redirect],[compatibility]
 *
 * brief: PWA 快捷方式与历史外链兼容；挂 layout 尾部，Suspense 包裹 useSearchParams（Next 约束）
 *
 * dependencies: next/navigation, CommandCenterContext.VIEW_PATHS
 * exports: LegacyViewBridge
 */

'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { VIEW_IDS, VIEW_PATHS } from './CommandCenterContext'

function Bridge() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // 仅根路由需要桥接（子路由自身不存在 ?view= 语义）
    if (pathname !== '/') return
    const view = searchParams.get('view')
    if (view && (VIEW_IDS as string[]).includes(view)) {
      router.replace(VIEW_PATHS[view as (typeof VIEW_IDS)[number]])
    }
  }, [pathname, searchParams, router])

  return null
}

export function LegacyViewBridge() {
  return (
    <Suspense fallback={null}>
      <Bridge />
    </Suspense>
  )
}
