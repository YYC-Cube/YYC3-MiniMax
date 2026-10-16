/**
 * file: TakeoverCard.tsx
 * description: W1 人工接管裁决卡片（PR7）· 复检耗尽挂起态的三键裁决入口
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[widget],[takeover],[human-in-loop]
 *
 * brief: rerun（回环 Step5 重开复检周期）/ rollback（回滚检查点）/ abort（终止）
 *        三键裁决 → client.resume 续跑；裁决后按钮禁用防重复
 *
 * dependencies: react, lucide-react, types
 * exports: TakeoverCard
 */

import { AlertTriangle, RotateCcw, Undo2, XCircle } from "lucide-react"
import React from "react"
import type { ChatMessage } from "../../types"

interface TakeoverCardProps {
  takeover: NonNullable<ChatMessage["takeover"]>
  onDecision: (messageId: string, action: "rerun" | "rollback" | "abort") => void
  /** 宿主消息 ID（裁决回调定位消息置禁用态） */
  messageId: string
}

export const TakeoverCard: React.FC<TakeoverCardProps> = ({
  takeover,
  onDecision,
  messageId,
}) => {
  const disabled = takeover.resolvedAction !== undefined
  const buttons: Array<{
    action: "rerun" | "rollback" | "abort"
    label: string
    icon: React.ReactNode
    cls: string
  }> = [
    {
      action: "rerun",
      label: "重跑 Step5",
      icon: <RotateCcw size={11} />,
      cls: "bg-[#00F0FF]/15 hover:bg-[#00F0FF]/30 text-[#00F0FF] border-[#00F0FF]/50",
    },
    {
      action: "rollback",
      label: "回滚检查点",
      icon: <Undo2 size={11} />,
      cls: "bg-[#FFD700]/15 hover:bg-[#FFD700]/30 text-[#FFD700] border-[#FFD700]/50",
    },
    {
      action: "abort",
      label: "终止任务",
      icon: <XCircle size={11} />,
      cls: "bg-[#FF006E]/15 hover:bg-[#FF006E]/30 text-[#FF006E] border-[#FF006E]/50",
    },
  ]

  return (
    <div className="mt-2 p-2.5 rounded-lg bg-[#FF006E]/8 border border-[#FF006E]/40 shadow-[0_0_12px_rgba(255,0,110,0.2)]">
      <div className="flex items-center space-x-1.5 mb-2">
        <AlertTriangle size={12} className="text-[#FF006E]" />
        <span className="text-[10px] font-bold text-[#FF006E] font-mono-num">
          人工接管 · HUMAN TAKEOVER
        </span>
        <span className="text-[9px] text-[#9BA3B4] ml-auto font-mono-num truncate max-w-[110px]">
          S{takeover.step} · 第{takeover.attempt}轮
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {buttons.map(({ action, label, icon, cls }) => (
          <button
            key={action}
            onClick={() => onDecision(messageId, action)}
            disabled={disabled}
            className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all flex items-center space-x-1 ${
              disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
            } ${takeover.resolvedAction === action ? "ring-1 ring-white/50" : ""} ${cls}`}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
