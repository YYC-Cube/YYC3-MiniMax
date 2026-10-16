/**
 * file: ErrorBoundary.tsx
 * description: 渲染错误边界 · 视图级故障隔离 + traceId 降级 UI
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[error-boundary],[observability]
 *
 * brief: 捕获子树渲染异常，上报 telemetry 并展示带 traceId 的降级面板，故障不扩散全屏白
 *
 * dependencies: react, services/telemetry
 * exports: ErrorBoundary
 */

import React from "react"
import { createTraceId, telemetry } from "../services/telemetry"

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** 降级区域标题（默认"视图渲染异常"） */
  label?: string
}

interface ErrorBoundaryState {
  error: Error | null
  traceId: string | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, traceId: null }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const traceId = createTraceId()
    this.setState({ traceId })
    telemetry.error("ui.render_error", {
      message: error.message,
      traceId,
      data: {
        label: this.props.label,
        componentStack: info.componentStack ?? undefined,
      },
    })
  }

  private handleReset = (): void => {
    this.setState({ error: null, traceId: null })
  }

  render(): React.ReactNode {
    const { error, traceId } = this.state
    if (!error) return this.props.children

    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="max-w-md w-full rounded-2xl glass-panel border border-[#FF006E]/60 p-6 space-y-4 shadow-[0_0_30px_rgba(255,0,110,0.3)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF006E]/20 border border-[#FF006E] flex items-center justify-center text-[#FF006E] font-bold">
              !
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {this.props.label ?? "视图渲染异常"}
              </h3>
              <p className="text-xs text-[#9BA3B4]">
                该区域已隔离，其余功能不受影响
              </p>
            </div>
          </div>

          <p className="text-xs text-[#E0E4EC] font-mono-num break-all select-text bg-black/40 p-2.5 rounded-lg border border-white/10">
            {error.message || String(error)}
          </p>

          {traceId && (
            <p className="text-[10px] text-[#9BA3B4] font-mono-num">
              traceId:{" "}
              <span className="text-[#00F0FF] select-text">{traceId}</span>
            </p>
          )}

          <button
            onClick={this.handleReset}
            className="px-4 py-1.5 rounded-lg bg-[#00F0FF]/20 hover:bg-[#00F0FF]/30 text-[#00F0FF] font-bold text-xs border border-[#00F0FF]/50 transition-all cursor-pointer"
          >
            重试渲染
          </button>
        </div>
      </div>
    )
  }
}
