/**
 * file: StatusPill.tsx
 * description: 状态标签胶囊 · 5 色调令牌（accent/ok/muted/warn/danger）通用展示件
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[visual],[status]
 *
 * brief: MobileFallback 与各视图共用的状态胶囊，色调令牌由 domain/opsView 提供
 *
 * dependencies: domain/opsView
 * exports: StatusPill
 */

import type { StatusTone } from "../domain/opsView"

interface StatusPillProps {
  label: string
  tone: StatusTone
}

const BASE_CLASS = "text-[9px] px-1.5 py-0.5 rounded border shrink-0"

const TONE_CLASS: Record<StatusTone, string> = {
  accent: "text-[#00F0FF] border-[#00F0FF]/40",
  ok: "text-[#00FF88] border-[#00FF88]/40",
  muted: "text-[#5A6478] border-white/10",
  warn: "text-[#FFD700] border-[#FFD700]/40",
  danger: "text-[#FF006E] border-[#FF006E]/40",
}

export function StatusPill({ label, tone }: StatusPillProps) {
  return <span className={`${BASE_CLASS} ${TONE_CLASS[tone]}`}>{label}</span>
}
