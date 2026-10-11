/**
 * file: KpiRibbon.tsx
 * description: 底部 KPI 带 · 6 指标卡 + SVG 迷你趋势线
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[p2],[kpi]
 *
 * brief: 产能与效率指标带（高 96px），趋势线在组件内计算
 *
 * dependencies: react, types
 * exports: KpiRibbon
 */

import type { KPIMetric } from '../../types';

interface KpiRibbonProps {
  kpis: KPIMetric[];
}

/** 计算 SVG 折线点集（viewBox 0 0 100 32） */
function sparklinePoints(trend: number[]): { points: string; lastY: number } {
  const min = Math.min(...trend);
  const max = Math.max(...trend);
  const range = max - min || 1;
  const points = trend
    .map((val, i) => {
      const x = (i / (trend.length - 1)) * 100;
      const y = 30 - ((val - min) / range) * 24;
      return `${x},${y}`;
    })
    .join(' ');
  const lastY = 30 - ((trend[trend.length - 1] - min) / range) * 24;
  return { points, lastY };
}

export function KpiRibbon({ kpis }: KpiRibbonProps) {
  return (
    <div className="h-24 grid grid-cols-6 gap-3.5">
      {kpis.map((kpi) => {
        const { points, lastY } = sparklinePoints(kpi.trend);

        return (
          <div
            key={kpi.id}
            className="h-full rounded-xl glass-panel p-2.5 flex flex-col justify-between border border-[#00F0FF]/25 hover:border-[#00F0FF]/50 transition-all"
          >
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
                <span className="text-xs text-[#9BA3B4] font-medium">{kpi.unit}</span>
              )}
            </div>

            {/* Sparkline & Target */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[9px] text-[#9BA3B4] font-mono-num">
                {kpi.target}
              </span>

              {/* 7-day Mini Sparkline */}
              <div className="w-16 h-6">
                <svg viewBox="0 0 100 32" className="w-full h-full overflow-visible">
                  <polyline
                    fill="none"
                    stroke={kpi.color}
                    strokeWidth="2"
                    points={points}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="100"
                    cy={lastY}
                    r="3"
                    fill={kpi.color}
                  />
                </svg>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
