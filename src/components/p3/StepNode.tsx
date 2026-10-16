/**
 * file: StepNode.tsx
 * description: P3 九步环节点 · 64px 圆形节点（步骤号 + 迷你头像 + 标题标签）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p3],[node]
 *
 * brief: 单步节点：活跃/选中/常态三态样式，点击切换选中步
 *
 * dependencies: react, types, AgentAvatar
 * exports: StepNode
 */

import { AgentAvatar } from "../AgentAvatar"
import type { ReActStep } from "../../types"

interface StepNodeProps {
  step: ReActStep
  pos: { x: number; y: number }
  isActive: boolean
  isSelected: boolean
  stageScale: number
  onSelect: () => void
}

export function StepNode({
  step,
  pos,
  isActive,
  isSelected,
  stageScale,
  onSelect,
}: StepNodeProps) {
  return (
    <div
      onClick={onSelect}
      className={`absolute z-30 flex flex-col items-center cursor-pointer transition-transform duration-300 ${
        isActive ? "z-40" : ""
      }`}
      style={{
        left: `${(pos.x / 760) * 100}%`,
        top: `${(pos.y / 760) * 100}%`,
        transform: `translate(-50%, -50%) scale(${stageScale})`,
      }}
    >
      {/* 64x64 Circle Node */}
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center relative p-[2px] transition-all duration-300 ${
          isActive
            ? "shadow-[0_0_20px_#00F0FF,0_0_30px_#BF00FF] animate-pulse-breath scale-115"
            : isSelected
              ? "shadow-[0_0_14px_rgba(255,255,255,0.4)] hover:scale-105"
              : "shadow-md hover:scale-105"
        }`}
        style={{
          backgroundColor: isActive ? "#00F0FF" : step.color,
        }}
      >
        <div className="w-full h-full rounded-full bg-[#0A0C16] flex flex-col items-center justify-center p-1 relative overflow-hidden">
          {/* Step number badge */}
          <span
            className="font-mono-num text-[10px] font-extrabold"
            style={{ color: isActive ? "#00F0FF" : step.color }}
          >
            S{step.step}
          </span>

          {/* Miniature Avatar or Icon */}
          <div className="scale-75">
            <AgentAvatar
              agentId={step.agentId}
              size={28}
              showLed={isActive}
              overrideStatus={isActive ? "speaking" : "online"}
            />
          </div>
        </div>
      </div>

      {/* Step Title Label */}
      <div className="mt-1.5 text-center whitespace-nowrap">
        <span
          className={`text-[10px] font-bold block transition-colors ${
            isActive
              ? "text-[#00F0FF] text-glow-cyan"
              : isSelected
                ? "text-white"
                : "text-[#9BA3B4]"
          }`}
        >
          {step.name}
        </span>
        <span className="text-[9px] text-[#9BA3B4]/70 font-mono-num block">
          {step.agentName.split("·")[0]}
        </span>
      </div>
    </div>
  )
}
