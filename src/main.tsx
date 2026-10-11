/**
 * file: main.tsx
 * description: React 挂载入口 · 全局错误钩子 + 根错误边界 + App 渲染
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [entry],[bootstrap],[app]
 *
 * brief: 应用启动引导（可观测性优先：先装钩子再挂载）
 *
 * dependencies: React 19, ReactDOM, index.css, App, ErrorBoundary, telemetry
 * exports: 无（副作用入口）
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { installGlobalErrorHooks } from './services/telemetry'
import './index.css'

// 全局兜底：未捕获异常/Promise 拒绝统一进入结构化遥测（含 traceId）
installGlobalErrorHooks()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary label="应用崩溃保护">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
