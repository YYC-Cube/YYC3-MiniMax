/**
 * file: GateCard.tsx
 * description: P5 质量门禁状态卡 · 单张门禁概览（图标/数值/阈值达标文案）
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p5],[gate]
 *
 * brief: 顶部四道门禁之一：passed 判定驱动达标/告警双态——PASS 按 variant 呈现品牌色，
 *        FAIL 统一覆写为告警态（粉描边 + alert-flash + 状态点变粉）
 *
 * dependencies: react, lucide-react
 * exports: GateCard
 */

import type { LucideIcon } from "lucide-react"

/** 门禁配色变体（模块级常量：Tailwind 类名保持字面量，可被静态提取） */
type GateVariant = "green" | "cyan" | "purple"

const GATE_VARIANT_STYLES: Record<GateVariant, {
  card: string
  iconWrap: string
  threshold: string
  dot: string
}> = {
  green: {
    card: "border-[#00FF88]/40 shadow-[0_0_16px_rgba(0,255,136,0.15)]",
    iconWrap:
      "bg-[#00FF88]/15 border border-[#00FF88]/50 flex items-center justify-center text-[#00FF88]",
    threshold: "text-[#00FF88]",
    dot: "bg-[#00FF88] shadow-[0_0_10px_#00FF88] animate-pulse",
  },
  cyan: {
    card: "border-[#00F0FF]/40 shadow-[0_0_16px_rgba(0,240,255,0.15)]",
    iconWrap:
      "bg-[#00F0FF]/15 border border-[#00F0FF]/50 flex items-center justify-center text-[#00F0FF]",
    threshold: "text-[#00F0FF]",
    dot: "bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]",
  },
  purple: {
    card: "border-[#BF00FF]/40 shadow-[0_0_16px_rgba(191,0,255,0.15)]",
    iconWrap:
      "bg-[#BF00FF]/15 border border-[#BF00FF]/50 flex items-center justify-center text-[#D26BFF]",
    threshold: "text-[#D26BFF]",
    dot: "bg-[#BF00FF] shadow-[0_0_10px_#BF00FF]",
  },
}

/** FAIL 告警态覆写（与 GateOverviewCard FAIL 描边/动画语义一致） */
const GATE_FAIL_STYLES = {
  card: "border-[#FF006E]/60 animate-alert-flash",
  threshold: "text-[#FF006E]",
  dot: "bg-[#FF006E] shadow-[0_0_10px_#FF006E]",
}

interface GateCardProps {
  icon: LucideIcon
  variant: GateVariant
  title: string
  value: string
  threshold: string
  /** 门禁判定结果（domain/gateEvaluation）：false 时整卡覆写为告警态 */
  passed: boolean
}

export function GateCard({
  icon: Icon,
  variant,
  title,
  value,
  threshold,
  passed,
}: GateCardProps) {
  const styles = GATE_VARIANT_STYLES[variant]
  const failStyles = passed ? null : GATE_FAIL_STYLES

  return (
    <div
      className={`rounded-xl glass-panel p-4 flex items-center justify-between border ${failStyles?.card ?? styles.card}`}
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div className={`w-10 h-10 rounded-xl shrink-0 ${styles.iconWrap}`}>
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-[#9BA3B4] font-medium block truncate">
            {title}
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-mono-num font-extrabold text-2xl text-white">
              {value}
            </span>
            <span
              className={`text-[10px] ${failStyles?.threshold ?? styles.threshold} font-bold`}
            >
              {threshold}
            </span>
          </div>
        </div>
      </div>
      <span className={`w-3 h-3 rounded-full ${failStyles?.dot ?? styles.dot}`} />
    </div>
  )
}
