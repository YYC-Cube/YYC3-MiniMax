/**
 * file: app/Bootstrap.tsx
 * description: 启动引导组件 · 全局错误钩子 + RUM 采样 + Service Worker 注册（迁移自 main.tsx 引导链）
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * created: 2026-10-15
 * updated: 2026-10-16
 * status: active
 * tags: [app-router],[bootstrap],[observability],[pwa],[rum]
 *
 * brief: 客户端挂载后立即安装可观测性钩子与 PWA 外壳（保持"先装钩子再挂载"语义：
 *        layout 渲染顺序保证 Bootstrap 先于业务子树完成副作用注册）
 *
 * details: 安装顺序：错误钩子 → RUM 采样（评分卡 P0-1：错误率/p95/长任务/内存）→ SW 注册
 *
 * dependencies: services/telemetry, services/rum, services/pwa
 * exports: Bootstrap
 */

"use client"

import { useEffect } from "react"
import { installGlobalErrorHooks } from "@/services/telemetry"
import { installRumSampling } from "@/services/rum"
import { registerServiceWorker } from "@/services/pwa"

export function Bootstrap() {
  useEffect(() => {
    const uninstallErrorHooks = installGlobalErrorHooks()
    const uninstallRum = installRumSampling()
    registerServiceWorker()
    return () => {
      uninstallErrorHooks()
      uninstallRum()
    }
  }, [])

  return null
}
