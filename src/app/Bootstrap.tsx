/**
 * file: app/Bootstrap.tsx
 * description: 启动引导组件 · 全局错误钩子安装 + Service Worker 注册（迁移自 main.tsx 引导链）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [app-router],[bootstrap],[observability],[pwa]
 *
 * brief: 客户端挂载后立即安装可观测性钩子与 PWA 外壳（保持"先装钩子再挂载"语义：
 *        layout 渲染顺序保证 Bootstrap 先于业务子树完成副作用注册）
 *
 * dependencies: services/telemetry, services/pwa
 * exports: Bootstrap
 */

'use client'

import { useEffect } from 'react'
import { installGlobalErrorHooks } from '@/services/telemetry'
import { registerServiceWorker } from '@/services/pwa'

export function Bootstrap() {
  useEffect(() => {
    const uninstallErrorHooks = installGlobalErrorHooks()
    registerServiceWorker()
    return uninstallErrorHooks
  }, [])

  return null
}
