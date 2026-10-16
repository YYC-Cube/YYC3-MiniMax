/**
 * file: KpiRibbon.tsx
 * description: 底部 KPI 带 · 6 指标卡 + SVG 迷你趋势线
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * created: 2026-10-11
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p2],[kpi]
 *
 * brief: 产能与效率指标带（高 96px），趋势线在组件内计算
 *
 * details:
 * - v1.1 IA 补链（NN/g 审计 #2）：传入 onKpiClick 时卡片升级为 button，
 *   点击直达 P4 算力监控台；未传时保持纯展示 div（分支双覆盖）
 *
 * dependencies: react, types
 * exports: KpiRibbon
 */

import type { KPIMetric } from "../../types";

interface KpiRibbonProps {
  kpis: KPIMetric[]
  /** 点击 KPI 卡回调（P2 → P4 算力监控台补链）；未提供时卡片为纯展示 */
  onKpiClick?: (id: string) => void
}

/** 计算 SVG 折线点集（viewBox 0 0 100 32） */
function sparklinePoints(trend: number[]): { points: string; lastY: number } {
  const min = Math.min(...trend)
  const max = Math.max(...trend)
  const range = max - min || 1
  const points = trend
    .map((val, i) => {
      const x = (i / (trend.length - 1)) * 100
      const y = 30 - ((val - min) / range) * 24
      return `${x},${y}`
    })
    .join(" ")
  const lastY = 30 - ((trend[trend.length - 1] - min) / range) * 24
  return { points, lastY }
}

export function KpiRibbon({ kpis, onKpiClick }: KpiRibbonProps) {
  return (
    <div className="h-24 grid grid-cols-6 gap-3.5">
      {kpis.map((kpi) => {
        const { points, lastY } = sparklinePoints(kpi.trend)
        const cardCls =
          "h-full rounded-xl glass-panel p-2.5 flex flex-col justify-between border border-[#00F0FF]/25 hover:border-[#00F0FF]/50 transition-all text-left select-none"
        const cardBody = (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#9BA3B4] truncate">
                {kpi.label}
              </span>
              <span
                className="text-[10px] font-mono-num font-bold px-1.5 py-0.2 rounded"
                style={{ color: kpi.color, backgroundColor: `${kpi.color}15` }}
              >
                {kpi.changePct}
              </span>
            </div>

            <div className="flex items-baseline space-x-1.5 my-0.5">
              <span
                className="font-mono-num font-extrabold text-2xl tracking-tight"
                style={{ color: kpi.color }}
              >
                {kpi.value}
              </span>
              {kpi.unit && (
                <span className="text-xs text-[#9BA3B4] font-medium">
                  {kpi.unit}
                </span>
              )}
            </div>

            {/* Sparkline & Target */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[9px] text-[#9BA3B4] font-mono-num">
                {kpi.target}
              </span>

              {/* 7-day Mini Sparkline */}
              <div className="w-16 h-6">
                <svg
                  viewBox="0 0 100 32"
                  className="w-full h-full overflow-visible"
                >
                  <polyline
                    fill="none"
                    stroke={kpi.color}
                    strokeWidth="2"
                    points={points}
                    strokeLinecap="round"
                  />
                  <circle cx="100" cy={lastY} r="3" fill={kpi.color} />
                </svg>
              </div>
            </div>
          </>
        )

        // IA 补链：可点击时渲染 button（键盘可达 + 语义化），直达 P4 算力监控台
        return onKpiClick ? (
          <button
            key={kpi.id}
            type="button"
            onClick={() => onKpiClick(kpi.id)}
            aria-label={`${kpi.label}：前往算力监控台查看详情`}
            title={`${kpi.label}：前往算力监控台查看详情`}
            className={`${cardCls} cursor-pointer`}
          >
            {cardBody}
          </button>
        ) : (
          <div key={kpi.id} className={cardCls}>
            {cardBody}
          </div>
        )
      })}
    </div>
  )
}
