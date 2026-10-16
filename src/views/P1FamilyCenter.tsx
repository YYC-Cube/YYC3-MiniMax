/**
 * file: P1FamilyCenter.tsx
 * description: P1 时钟环中心 · 8 Agent 时钟位/全息连线/悬浮档案卡
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-16
 * status: active
 * tags: [component],[view],[p1]
 *
 * brief: 家族中枢视图：真实走时时钟环（时分秒三针）+ 中心数字时间/日期 + 8 Agent 时钟位交互
 *
 * dependencies: react, lucide-react, types, data/agents, components/p1/*
 * exports: P1FamilyCenter
 */

import { ArrowRight, Cpu, Sparkles } from "lucide-react"
import React, { useEffect, useRef, useState } from "react"
import { AgentMember } from "../components/p1/AgentMember"
import { ClockCenter } from "../components/p1/ClockCenter"
import { ClockDial } from "../components/p1/ClockDial"
import { AGENTS } from "../data/agents"
import { AgentId } from "../types"

// ======== 真实时钟逻辑（复用自 docs/AIFamilyPage.tsx 设计基准） ========

/** 1 秒 setInterval 走时，卸载清理 */
function useRealTimeClock(): Date {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return time
}

/** 舞台缩放因子：900 viewBox 设计稿 → 实际渲染尺寸，用于中心字号自适应 */
function useStageScale(ref: React.RefObject<HTMLDivElement | null>): number {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () =>
      setScale(Math.min(el.clientWidth, el.clientHeight) / 900)
    update()
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update)
      ro.observe(el)
      return () => ro.disconnect()
    }
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [ref])
  return scale
}

interface P1FamilyCenterProps {
  onSelectAgent: (id: AgentId) => void
  onNavigate: (view: "P1" | "P2" | "P3" | "P4" | "P5") => void
}

interface ClockMemberConfig {
  id: AgentId
  angleDeg: number // Angle relative to top 12:00
  clockLabel: string
}

const CLOCK_MEMBERS: ClockMemberConfig[] = [
  { id: "tianshu", angleDeg: -90, clockLabel: "12:00" },
  { id: "shouhu", angleDeg: -45, clockLabel: "01:30" },
  { id: "zongshi", angleDeg: 0, clockLabel: "03:00" },
  { id: "lingyun", angleDeg: 45, clockLabel: "04:30" },
  { id: "qianxing", angleDeg: 90, clockLabel: "06:00" },
  { id: "wanwu", angleDeg: 135, clockLabel: "07:30" },
  { id: "xianzhi", angleDeg: 180, clockLabel: "09:00" },
  { id: "bole", angleDeg: 225, clockLabel: "10:30" },
]

export const P1FamilyCenter: React.FC<P1FamilyCenterProps> = ({
  onSelectAgent,
  onNavigate,
}) => {
  const [hoveredAgentId, setHoveredAgentId] = useState<AgentId | null>(null)

  const stageRef = useRef<HTMLDivElement>(null)
  const scale = useStageScale(stageRef)

  // 真实时钟：1 秒走时
  const time = useRealTimeClock()

  const cx = 450
  const cy = 450
  const radius = 295 // Radius to avatar centers

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      {/* Background Decorative Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[840px] h-[840px] rounded-full border border-white/5" />
        <div className="absolute w-[680px] h-[680px] rounded-full border border-[#00F0FF]/10 animate-slow-rotate" />
        <div className="absolute w-[590px] h-[590px] rounded-full border border-[#BF00FF]/15 border-dashed" />
        <div className="absolute w-[360px] h-[360px] rounded-full border border-[#00F0FF]/20" />
      </div>

      {/* Main Clock Stage Canvas */}
      <div
        ref={stageRef}
        className="relative w-[900px] h-[900px] flex items-center justify-center max-w-full max-h-[85vh] aspect-square"
      >
        {/* SVG Dial Elements: Dial Ticks, Holographic Lines, Particles */}
        <ClockDial
          time={time}
          cx={cx}
          cy={cy}
          radius={radius}
          members={CLOCK_MEMBERS}
        />

        {/* Center YYC³ Logo + 真实走时数字时间：
            150px 慢旋指示环 + 102px 品牌核心（点击进入 P2），下方 HH:MM:SS + yy/mm/dd 星期。
            中心圆随三针真实比例同比缩小（0.82），避免遮挡指针尾锤 */}
        <ClockCenter
          time={time}
          scale={scale}
          onNavigateToP2={() => onNavigate("P2")}
        />

        {/* 8 Agent Members Distributed Clockwise */}
        {CLOCK_MEMBERS.map((member) => (
          <AgentMember
            key={member.id}
            member={member}
            agent={AGENTS[member.id]}
            cx={cx}
            cy={cy}
            radius={radius}
            isHovered={hoveredAgentId === member.id}
            onMouseEnter={() => setHoveredAgentId(member.id)}
            onMouseLeave={() => setHoveredAgentId(null)}
            onSelect={() => onSelectAgent(member.id)}
          />
        ))}
      </div>

      {/* Floating Bottom Quick Link to P2 */}
      <div className="absolute bottom-4 left-6 z-30">
        <div
          onClick={() => onNavigate("P2")}
          className="flex items-center space-x-3 px-4 py-2.5 rounded-xl glass-panel-hover glass-panel cursor-pointer group border border-[#00F0FF]/30"
        >
          <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/20 flex items-center justify-center text-[#00F0FF] group-hover:scale-110 transition-transform">
            <Cpu size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white group-hover:text-[#00F0FF] transition-colors flex items-center space-x-1">
              <span>进入漫剧工业化生产台</span>
              <ArrowRight
                size={13}
                className="group-hover:translate-x-1 transition-transform"
              />
            </span>
            <span className="text-[10px] text-[#9BA3B4]">
              六阶段流水线 · 实时事件日志 · 产能带
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-20 z-30 hidden md:flex items-center space-x-2 text-[11px] text-[#9BA3B4]">
        <Sparkles size={12} className="text-[#00F0FF]" />
        <span>
          点击任意 Agent 头像，即可唤起 Universal Agent Widget
          进行实时多模态调度
        </span>
      </div>
    </div>
  )
}
