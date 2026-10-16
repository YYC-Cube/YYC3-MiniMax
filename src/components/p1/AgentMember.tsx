/**
 * file: AgentMember.tsx
 * description: P1 时钟成员位 · 80px 头像/时钟徽标/名称标签/悬浮档案卡
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p1],[clock]
 *
 * brief: 表盘外圈单个成员节点：点击唤起 W1，悬浮展示档案卡（状态/时钟位点/最后发言/驱动模型）
 *
 * dependencies: react, types, AgentAvatar
 * exports: AgentMember
 */

import { AgentAvatar } from "../AgentAvatar"
import type { AgentId, AgentInfo } from "../../types"

interface AgentMemberProps {
  member: { id: AgentId; angleDeg: number; clockLabel: string }
  agent: AgentInfo
  cx: number
  cy: number
  radius: number
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onSelect: () => void
}

export function AgentMember({
  member,
  agent,
  cx,
  cy,
  radius,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onSelect,
}: AgentMemberProps) {
  const rad = member.angleDeg * (Math.PI / 180)
  const x = cx + radius * Math.cos(rad)
  const y = cy + radius * Math.sin(rad)

  // Calculate offset relative to 900x900 container
  const leftPct = (x / 900) * 100
  const topPct = (y / 900) * 100

  return (
    <div
      className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onSelect}
    >
      {/* Clock Position Label Badge */}
      <div className="mb-1 text-[10px] font-mono-num text-[#9BA3B4] bg-[#0A0A0A]/80 px-1.5 py-0.2 rounded border border-white/10 group-hover:text-[#00F0FF] group-hover:border-[#00F0FF]/40 transition-colors">
        {member.clockLabel}
      </div>

      {/* 80x80 Agent Avatar with Unique Halo, 20px Pulse Ring, 8x8 LED */}
      <div className="transform transition-transform duration-200 group-hover:scale-110">
        <AgentAvatar
          agentId={member.id}
          size={80}
          showPulseRing={true}
          showLed={true}
        />
      </div>

      {/* Agent Name Tag */}
      <div className="mt-2 text-center">
        <span
          className="font-bold text-xs tracking-wider transition-colors drop-shadow"
          style={{ color: isHovered ? "#FFFFFF" : agent.color }}
        >
          {agent.name}
        </span>
        <div className="text-[10px] text-[#9BA3B4] font-medium tracking-tight">
          {agent.nick} · {agent.primaryStage.split("&")[0]}
        </div>
      </div>

      {/* 180x120 Hover Floating Card:
          Deep dark 80% + Blue border 1px + Purple shadow 10px,
          Avatar, Nick, Status (online/offline/speaking), Last active time
      */}
      {isHovered && (
        <div
          className="absolute bottom-full mb-3 w-[220px] rounded-xl p-3 z-50 pointer-events-none transition-all duration-200"
          style={{
            backgroundColor: "rgba(10, 12, 20, 0.92)",
            backdropFilter: "blur(16px)",
            border: "1px solid #00F0FF",
            boxShadow:
              "0 10px 28px rgba(0,0,0,0.8), 0 0 16px rgba(191,0,255,0.45)",
            animation: "fade-in-up 0.18s ease-out",
          }}
        >
          <div className="flex items-center space-x-2.5 pb-2 border-b border-white/10">
            <AgentAvatar agentId={member.id} size={36} />
            <div className="flex flex-col">
              <span className="font-bold text-xs text-white">{agent.name}</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      agent.status === "speaking" ? "#FF006E" : "#00FF88",
                    boxShadow: `0 0 6px ${
                      agent.status === "speaking" ? "#FF006E" : "#00FF88"
                    }`,
                  }}
                />
                <span className="text-[10px] text-[#9BA3B4]">
                  {agent.status === "speaking" ? "发言中" : "在线就绪"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-[#9BA3B4] space-y-1">
            <div className="flex justify-between">
              <span>时钟位点:</span>
              <span className="font-mono-num text-[#00F0FF]">
                {agent.clockPosition}
              </span>
            </div>
            <div className="flex justify-between">
              <span>最后发言:</span>
              <span className="font-mono-num text-white">
                {agent.lastActive}
              </span>
            </div>
            <div className="flex justify-between">
              <span>驱动模型:</span>
              <span className="font-mono-num text-[#BF00FF]">
                {agent.model.split("/")[0]}
              </span>
            </div>
            <div className="pt-1 text-[#E0E4EC] text-[10px] leading-tight border-t border-white/10">
              {agent.role}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
