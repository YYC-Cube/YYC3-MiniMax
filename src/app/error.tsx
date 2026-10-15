/**
 * file: app/error.tsx
 * description: 路由级错误边界 · 段渲染异常降级 UI（迁移自 main.tsx 的 ErrorBoundary 包裹职责）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [app-router],[error-boundary],[observability]
 *
 * brief: 捕获路由段渲染异常，上报 telemetry 并展示带 traceId 的降级面板（复用 ErrorBoundary 视觉语言）
 *
 * dependencies: next, services/telemetry
 * exports: default（Next 约定导出）
 */

'use client'

import { useEffect, useState } from 'react'
import { createTraceId, telemetry } from '@/services/telemetry'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [traceId, setTraceId] = useState<string | null>(null)

  useEffect(() => {
    const tid = createTraceId()
    setTraceId(tid)
    telemetry.error('ui.render_error', {
      message: error.message,
      traceId: tid,
      data: { digest: error.digest, label: '路由段渲染异常' },
    })
  }, [error])

  return (
    <div className="w-full h-full min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-2xl glass-panel border border-[#FF006E]/60 p-6 space-y-4 shadow-[0_0_30px_rgba(255,0,110,0.3)]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF006E]/20 border border-[#FF006E] flex items-center justify-center text-[#FF006E] font-bold">
            !
          </div>
          <div>
            <h3 className="text-base font-bold text-white">页面渲染异常</h3>
            <p className="text-xs text-[#9BA3B4]">该视图已隔离，可返回首页恢复</p>
          </div>
        </div>

        <p className="text-xs text-[#E0E4EC] font-mono-num break-all select-text bg-black/40 p-2.5 rounded-lg border border-white/10">
          {error.message || String(error)}
        </p>

        {traceId && (
          <p className="text-[10px] text-[#9BA3B4] font-mono-num">
            traceId: <span className="text-[#00F0FF] select-text">{traceId}</span>
          </p>
        )}

        <button
          onClick={reset}
          className="px-4 py-1.5 rounded-lg bg-[#00F0FF]/20 hover:bg-[#00F0FF]/30 text-[#00F0FF] font-bold text-xs border border-[#00F0FF]/50 transition-all cursor-pointer"
        >
          重试渲染
        </button>
      </div>
    </div>
  )
}
