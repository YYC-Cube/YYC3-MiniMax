/**
 * file: GateOverviewCard.tsx
 * description: P5 门禁总览主卡 · 全链路放行判定大数字锚点（视觉节奏 H1 层）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p5],[gate]
 *
 * brief: 顶部门禁区主卡：passed/total 48px 大数字 + 放行率金色副锚点，FAIL 态告警闪烁
 *
 * dependencies: react
 * exports: GateOverviewCard
 */

interface GateOverviewCardProps {
  /** 已通过门禁数 */
  passed: number
  /** 门禁总数 */
  total: number
  /** 放行率文案（由视图从质检队列实时推导，domain/gateEvaluation.releaseRatePct） */
  releaseRate: string
}

export function GateOverviewCard({
  passed,
  total,
  releaseRate,
}: GateOverviewCardProps) {
  const allPass = passed === total

  return (
    <div
      className={`col-span-4 rounded-2xl glass-panel p-4 flex flex-col justify-between border ${allPass
          ? "border-[#00FF88]/50 shadow-[0_0_16px_rgba(0,255,136,0.15)]"
          : "border-[#FF006E]/60 animate-alert-flash"
        }`}
    >
      <span className="text-xs text-[#9BA3B4] font-medium">
        门禁总览 · 全链路放行判定
      </span>
      <div className="flex items-baseline space-x-2">
        <span
          className={`font-mono-num font-black text-5xl leading-none ${allPass ? "text-[#00FF88]" : "text-[#FF006E]"
            }`}
        >
          {passed}/{total}
        </span>
        <span className="text-sm text-[#9BA3B4]">门禁通过</span>
      </div>
      <div className="flex items-center space-x-1.5 text-[11px] text-[#FFD700] font-mono-num">
        今日放行率 {releaseRate}
      </div>
    </div>
  )
}
