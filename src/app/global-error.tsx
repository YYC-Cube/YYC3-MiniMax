/**
 * file: app/global-error.tsx
 * description: 全局错误边界 · 根布局级崩溃兜底（对应原 main.tsx 应用崩溃保护外层）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [app-router],[error-boundary],[fallback]
 *
 * brief: layout/root 段崩溃时接管整个文档（自带 html/body），极简降级保持指挥舱视觉基调
 *
 * dependencies: next, services/telemetry
 * exports: default（Next 约定导出）
 */

'use client'

import { useEffect } from 'react'
import { createTraceId, telemetry } from '@/services/telemetry'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    telemetry.error('ui.global_error', {
      message: error.message,
      traceId: createTraceId(),
      data: { digest: error.digest },
    })
  }, [error])

  return (
    <html lang="zh-CN">
      <body className="bg-[#0A0A0A] text-white antialiased">
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md w-full space-y-4 text-center">
            <h2 className="text-lg font-bold">应用崩溃保护</h2>
            <p className="text-xs text-[#9BA3B4]">根布局级异常已捕获，可尝试整页恢复</p>
            <button
              onClick={reset}
              className="px-4 py-1.5 rounded-lg bg-[#00F0FF]/20 hover:bg-[#00F0FF]/30 text-[#00F0FF] font-bold text-xs border border-[#00F0FF]/50 transition-all cursor-pointer"
            >
              恢复应用
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
