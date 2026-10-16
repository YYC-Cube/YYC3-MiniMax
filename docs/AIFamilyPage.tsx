/**
 * AIFamilyPage.tsx
 * =================
 * YYC³ AI Family 交互中心
 * 全屏沉浸式 12 小时时钟环布局
 * 8 位 AI Family 成员 + 中心品牌标识
 *
 * 设计规范: guidelines/Family-AI.md & guidelines/AI-Family.md
 * 风格: 赛博朋克 · 深空黑背景 · 霓虹光效 · 真实时钟走动
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  Ear,
  Brain,
  Eye,
  Star,
  Network,
  Shield,
  Scale,
  MessageCircle,
  ChevronRight,
  X,
  Sparkles,
  Clock,
  Users,
  Zap,
  Activity,
  Lightbulb,
} from "lucide-react"
import { useNavigate } from "react-router"
import { useI18n } from "../hooks/useI18n"

// ======== AI Family 成员数据 ========

interface AIFamilyMember {
  id: string
  name: string
  title: string
  quote: string
  role: string
  responsibilities: string[]
  coreAbility: string
  angle: number // 在时钟环上的角度 (度)
  timeLabel: string // 对应时间刻度
  color: string // 专属颜色
  icon: React.ElementType
  status: "online" | "speaking" | "idle"
}

const AI_FAMILY_MEMBERS: AIFamilyMember[] = [
  {
    id: "navigator",
    name: "言启·千行",
    title: "Navigator · 领航者",
    quote: "我聆听万千言语，为您指引航向。",
    role: "系统的「耳朵」与「翻译官」，用户意图进入 YYC³ 的第一道门户",
    responsibilities: ["自然语言理解 (NLU)", "意图识别与路由", "上下文管理"],
    coreAbility: "LLM Prompt Engineering · 语义理解 · 实体抽取",
    angle: 0,
    timeLabel: "06:00",
    color: "#FFD700",
    icon: Ear,
    status: "speaking",
  },
  {
    id: "thinker",
    name: "语枢·万物",
    title: "Thinker · 思想家",
    quote: "我于喧嚣数据中，沉思，而后揭示真理。",
    role: "系统的「哲学家」与「分析师」，从数据中提炼深刻商业洞察",
    responsibilities: ["数据洞察生成", "文档智能分析", "假设推演"],
    coreAbility: "深度数据分析 · 归纳推理 · 文本摘要生成",
    angle: 45,
    timeLabel: "07:30",
    color: "#FF69B4",
    icon: Brain,
    status: "online",
  },
  {
    id: "prophet",
    name: "预见·先知",
    title: "Prophet · 预言家",
    quote: "我观过往之脉络，预见未来之可能。",
    role: "系统的「预言家」，分析历史数据预测未来趋势与风险",
    responsibilities: ["时间序列预测", "异常检测", "前瞻性建议"],
    coreAbility: "ARIMA · Prophet · LSTM · 异常检测算法",
    angle: 90,
    timeLabel: "09:00",
    color: "#00BFFF",
    icon: Eye,
    status: "online",
  },
  {
    id: "bolero",
    name: "千里·伯乐",
    title: "Bolero · 伯乐",
    quote: "我知您之所需，荐您之所未识。",
    role: "系统的「人才官」与「推荐引擎」，深度理解用户个性化需求",
    responsibilities: ["用户画像构建", "个性化推荐", "潜能发掘"],
    coreAbility: "协同过滤 · 基于内容的推荐 · 行为序列分析",
    angle: 135,
    timeLabel: "10:30",
    color: "#E8E8E8",
    icon: Star,
    status: "idle",
  },
  {
    id: "meta-oracle",
    name: "元启·天枢",
    title: "Meta-Oracle · 天枢",
    quote: "我观全局之流转，调度万物以归元。",
    role: "YYC³ 的「大脑」与「总指挥」，五化一体法则最高执行者",
    responsibilities: ["全局状态感知", "智能编排与调度", "自我进化决策"],
    coreAbility: "强化学习 · 运筹优化 · 分布式系统监控",
    angle: 180,
    timeLabel: "12:00",
    color: "#00FF88",
    icon: Network,
    status: "online",
  },
  {
    id: "sentinel",
    name: "智云·守护",
    title: "Sentinel · 守护者",
    quote: "我于无声处警戒，御威胁于国门之外。",
    role: "系统的「免疫系统」与「首席安全官」，实时检测隔离威胁",
    responsibilities: ["行为基线学习", "威胁实时检测", "自动响应与修复"],
    coreAbility: "UEBA · 异常检测 · SOAR 安全编排",
    angle: 225,
    timeLabel: "13:30",
    color: "#BF00FF",
    icon: Shield,
    status: "online",
  },
  {
    id: "master",
    name: "格物·宗师",
    title: "Master · 宗师",
    quote: "我究万物之理，定标准以传世。",
    role: "系统的「质量官」与「进化导师」，持续审视代码性能与架构",
    responsibilities: ["代码与架构分析", "性能基线观察", "标准建议与生成"],
    coreAbility: "SAST · 性能分析 · LLM 代码理解与生成",
    angle: 270,
    timeLabel: "15:00",
    color: "#C0C0C0",
    icon: Scale,
    status: "idle",
  },
  {
    id: "creative",
    name: "创想·灵韵",
    title: "Creative · 灵韵",
    quote: "我以灵感为墨，绘就无限可能。",
    role: "系统的「创意引擎」与「设计助手」，负责创意生成、内容创作、设计辅助",
    responsibilities: [
      "创意生成与文案设计",
      "多模态内容创作",
      "UI/UX 设计建议与配色优化",
      "风格分析与布局优化",
    ],
    coreAbility: "生成式 AI · 创意思维模型 · 多模态生成 · 设计思维算法",
    angle: 315,
    timeLabel: "16:30",
    color: "#FF7043",
    icon: Lightbulb,
    status: "online",
  },
]

// ======== 时钟逻辑 ========

function useRealTimeClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return time
}

/** 容器自适应尺寸 hook */
function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 800, height: 600 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) setSize({ width, height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}

// ======== 日期格式化 ========
const DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"] as const

function formatDateInfo(date: Date) {
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const dayIdx = date.getDay() // 0=日, 6=六
  const dayLabel = DAY_LABELS[dayIdx]
  const isWeekend = dayIdx === 0 || dayIdx === 6
  return { dateStr: `${yy}/${mm}/${dd}`, dayLabel, isWeekend }
}

// ======== 主组件 ========

export function AIFamilyPage() {
  const { t } = useI18n()
  const time = useRealTimeClock()
  const [selectedMember, setSelectedMember] = useState<AIFamilyMember | null>(
    null,
  )
  const [hoveredMember, setHoveredMember] = useState<string | null>(null)
  const [activeSpeaker, setActiveSpeaker] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: cW, height: cH } = useContainerSize(containerRef)

  // Simulated speaking rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSpeaker((prev) => (prev + 1) % AI_FAMILY_MEMBERS.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  // Clock hands
  const hours = time.getHours() % 12
  const minutes = time.getMinutes()
  const seconds = time.getSeconds()
  const hourAngle = hours * 30 + minutes * 0.5 - 90
  const minuteAngle = minutes * 6 + seconds * 0.1 - 90
  const secondAngle = seconds * 6 - 90

  const timeStr = time.toLocaleTimeString("zh-CN", { hour12: false })
  const { dateStr, dayLabel, isWeekend } = formatDateInfo(time)

  // ===== 自适应尺寸计算 =====
  // 可用空间 = 容器短边，留出 top/bottom UI 的间距
  const usable = Math.min(cW, cH) - 80 // 留边距
  const RING_RADIUS = Math.max(120, Math.min(usable * 0.38, 280))
  const scale = RING_RADIUS / 280 // 相对于设计稿 280 的缩放因子
  const MEMBER_SIZE = Math.round(72 * scale)
  const CENTER_SIZE = Math.round(100 * scale)
  const SVG_SIZE = Math.round(RING_RADIUS * 2 + 100 * scale)
  const LED_SIZE = Math.max(8, Math.round(10 * scale))

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden flex items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(10,15,40,0.95) 0%, rgba(4,8,20,1) 60%, #020510 100%)",
        minHeight: "400px",
      }}
    >
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Radial glow rings */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: RING_RADIUS * 2 + 120 * scale,
            height: RING_RADIUS * 2 + 120 * scale,
            border: "1px solid rgba(0,240,255,0.06)",
            boxShadow: "0 0 60px rgba(0,240,255,0.03)",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: RING_RADIUS * 2 + 200 * scale,
            height: RING_RADIUS * 2 + 200 * scale,
            border: "1px solid rgba(191,0,255,0.04)",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: RING_RADIUS * 2 - 40 * scale,
            height: RING_RADIUS * 2 - 40 * scale,
            border: "1px solid rgba(0,240,255,0.04)",
          }}
        />
      </div>

      {/* Clock tick marks */}
      <svg
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      >
        <g transform={`translate(${SVG_SIZE / 2}, ${SVG_SIZE / 2})`}>
          {/* 60 minor ticks */}
          {Array.from({ length: 60 }).map((_, i) => {
            const isMajor = i % 5 === 0
            const angle = (i * 6 - 90) * (Math.PI / 180)
            const outerR = RING_RADIUS + 30 * scale
            const innerR = isMajor
              ? RING_RADIUS + 8 * scale
              : RING_RADIUS + 18 * scale
            return (
              <line
                key={`tick-${i}`}
                x1={Math.cos(angle) * innerR}
                y1={Math.sin(angle) * innerR}
                x2={Math.cos(angle) * outerR}
                y2={Math.sin(angle) * outerR}
                stroke={
                  isMajor ? "rgba(0,240,255,0.4)" : "rgba(0,240,255,0.12)"
                }
                strokeWidth={isMajor ? 2 : 1}
              />
            )
          })}

          {/* Clock hands */}
          {/* Hour hand */}
          <line
            x1={0}
            y1={0}
            x2={Math.cos((hourAngle * Math.PI) / 180) * (RING_RADIUS * 0.45)}
            y2={Math.sin((hourAngle * Math.PI) / 180) * (RING_RADIUS * 0.45)}
            stroke="rgba(0,240,255,0.5)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          {/* Minute hand */}
          <line
            x1={0}
            y1={0}
            x2={Math.cos((minuteAngle * Math.PI) / 180) * (RING_RADIUS * 0.6)}
            y2={Math.sin((minuteAngle * Math.PI) / 180) * (RING_RADIUS * 0.6)}
            stroke="rgba(0,240,255,0.4)"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* Second hand */}
          <line
            x1={0}
            y1={0}
            x2={Math.cos((secondAngle * Math.PI) / 180) * (RING_RADIUS * 0.7)}
            y2={Math.sin((secondAngle * Math.PI) / 180) * (RING_RADIUS * 0.7)}
            stroke="rgba(255,0,110,0.6)"
            strokeWidth={1}
            strokeLinecap="round"
          />
          {/* Center dot */}
          <circle cx={0} cy={0} r={4 * scale} fill="#00F0FF" />

          {/* Holographic connection lines from center to members */}
          {AI_FAMILY_MEMBERS.map((member, i) => {
            const angle = (member.angle - 90) * (Math.PI / 180)
            const isActive = i === activeSpeaker
            return (
              <line
                key={`conn-${member.id}`}
                x1={0}
                y1={0}
                x2={Math.cos(angle) * (RING_RADIUS - 20 * scale)}
                y2={Math.sin(angle) * (RING_RADIUS - 20 * scale)}
                stroke={isActive ? member.color : "rgba(191,0,255,0.15)"}
                strokeWidth={isActive ? 1.5 : 0.5}
                strokeDasharray={isActive ? "none" : "4 4"}
                style={{
                  filter: isActive
                    ? `drop-shadow(0 0 6px ${member.color})`
                    : "none",
                  transition: "all 0.6s ease",
                }}
              />
            )
          })}
        </g>
      </svg>

      {/* ======== Center Brand Logo ======== */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        style={{ width: CENTER_SIZE, height: CENTER_SIZE }}
      >
        <div
          className="w-full h-full rounded-full flex flex-col items-center justify-center cursor-pointer"
          style={{
            background:
              "radial-gradient(circle, rgba(0,40,80,0.8) 0%, rgba(4,10,22,0.95) 70%)",
            border: "2px solid rgba(0,240,255,0.3)",
            boxShadow:
              "0 0 30px rgba(0,240,255,0.15), inset 0 0 20px rgba(0,240,255,0.05)",
            animation: "pulse-glow 3s ease-in-out infinite",
          }}
        >
          <span
            style={{
              fontSize: `${Math.max(0.5, 0.65 * scale)}rem`,
              color: "#00F0FF",
              letterSpacing: "2px",
            }}
          >
            YYC³
          </span>
          <span
            style={{
              fontSize: `${Math.max(0.35, 0.45 * scale)}rem`,
              color: "rgba(0,240,255,0.4)",
              marginTop: "2px",
            }}
          >
            AI Family
          </span>
        </div>
        {/* Time + Date display below center */}
        <div
          className="absolute left-1/2 -translate-x-1/2 text-center"
          style={{ top: CENTER_SIZE + 6, whiteSpace: "nowrap" }}
        >
          <span
            className="font-mono"
            style={{
              fontSize: `${Math.max(0.55, 0.7 * scale)}rem`,
              color: "#00F0FF",
              textShadow: "0 0 10px rgba(0,240,255,0.4)",
              letterSpacing: "2px",
            }}
          >
            {timeStr}
          </span>
          <div
            className="font-mono flex items-center justify-center gap-1"
            style={{ marginTop: "3px" }}
          >
            <span
              style={{
                fontSize: `${Math.max(0.42, 0.52 * scale)}rem`,
                color: "rgba(0,240,255,0.35)",
                letterSpacing: "1px",
              }}
            >
              {dateStr}
            </span>
            <span
              style={{
                fontSize: `${Math.max(0.42, 0.52 * scale)}rem`,
                color: isWeekend ? "#FF006E" : "rgba(0,240,255,0.35)",
                textShadow: isWeekend ? "0 0 6px rgba(255,0,110,0.4)" : "none",
                letterSpacing: "1px",
              }}
            >
              {dayLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ======== AI Family Members on Clock Ring ======== */}
      {AI_FAMILY_MEMBERS.map((member, idx) => {
        const angleRad = (member.angle - 90) * (Math.PI / 180)
        const x = Math.cos(angleRad) * RING_RADIUS
        const y = Math.sin(angleRad) * RING_RADIUS
        const isSpeaking = idx === activeSpeaker
        const isHovered = hoveredMember === member.id
        const isSelected = selectedMember?.id === member.id
        const Icon = member.icon

        // LED 沿径向外侧放置：圆心→成员方向的外边缘
        const ledOffsetX =
          Math.cos(angleRad) * (MEMBER_SIZE / 2 + LED_SIZE / 2 - 1)
        const ledOffsetY =
          Math.sin(angleRad) * (MEMBER_SIZE / 2 + LED_SIZE / 2 - 1)

        return (
          <div
            key={member.id}
            className="absolute z-10 flex flex-col items-center"
            style={{
              left: `calc(50% + ${x}px - ${MEMBER_SIZE / 2}px)`,
              top: `calc(50% + ${y}px - ${MEMBER_SIZE / 2}px)`,
              width: MEMBER_SIZE,
            }}
          >
            {/* Member avatar */}
            <button
              onClick={() => setSelectedMember(isSelected ? null : member)}
              onMouseEnter={() => setHoveredMember(member.id)}
              onMouseLeave={() => setHoveredMember(null)}
              className="relative rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                width: MEMBER_SIZE,
                height: MEMBER_SIZE,
                background: `radial-gradient(circle, ${member.color}15 0%, rgba(4,10,22,0.9) 70%)`,
                border: `2px solid ${
                  isSpeaking
                    ? member.color
                    : isHovered
                      ? `${member.color}80`
                      : `${member.color}30`
                }`,
                boxShadow: isSpeaking
                  ? `0 0 20px ${member.color}40, 0 0 40px ${member.color}15, inset 0 0 15px ${member.color}10`
                  : isHovered
                    ? `0 0 15px ${member.color}20`
                    : "none",
                transform: isHovered ? "scale(1.1)" : "scale(1)",
              }}
            >
              <Icon
                className="w-6 h-6"
                style={{
                  color: isSpeaking ? member.color : `${member.color}90`,
                  filter: isSpeaking
                    ? `drop-shadow(0 0 8px ${member.color})`
                    : "none",
                  transition: "all 0.3s ease",
                  width: Math.max(16, 24 * scale),
                  height: Math.max(16, 24 * scale),
                }}
              />

              {/* Speaking indicator LED — 沿圆径方向外侧 */}
              <div
                className="absolute rounded-full"
                style={{
                  width: LED_SIZE,
                  height: LED_SIZE,
                  left: MEMBER_SIZE / 2 + ledOffsetX - LED_SIZE / 2,
                  top: MEMBER_SIZE / 2 + ledOffsetY - LED_SIZE / 2,
                  background: isSpeaking
                    ? "#FF006E"
                    : member.status === "online"
                      ? "rgba(0,255,136,0.4)"
                      : "rgba(128,128,128,0.3)",
                  boxShadow: isSpeaking
                    ? "0 0 8px #FF006E"
                    : member.status === "online"
                      ? "0 0 4px rgba(0,255,136,0.3)"
                      : "none",
                  transition: "all 0.3s ease",
                  border: "1px solid rgba(0,0,0,0.4)",
                }}
              />

              {/* Pulse ring animation */}
              {isSpeaking && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: `1px solid ${member.color}`,
                    animation: "ring-pulse 2s ease-out infinite",
                  }}
                />
              )}
            </button>

            {/* Member name */}
            <span
              className="mt-1 text-center truncate"
              style={{
                fontSize: `${Math.max(0.48, 0.6 * scale)}rem`,
                color: isSpeaking ? member.color : "rgba(192,220,240,0.6)",
                textShadow: isSpeaking ? `0 0 8px ${member.color}60` : "none",
                maxWidth: MEMBER_SIZE + 24,
                transition: "all 0.3s ease",
                letterSpacing: "0.5px",
              }}
            >
              {member.name}
            </span>

            {/* Time label */}
            <span
              style={{
                fontSize: `${Math.max(0.36, 0.45 * scale)}rem`,
                color: "rgba(0,240,255,0.25)",
                marginTop: "1px",
              }}
            >
              {member.timeLabel}
            </span>

            {/* Hover tooltip */}
            {isHovered && !isSelected && (
              <div
                className="absolute z-30 rounded-lg px-3 py-2"
                style={{
                  bottom: MEMBER_SIZE + 20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(10,10,10,0.9)",
                  border: `1px solid ${member.color}40`,
                  backdropFilter: "blur(12px)",
                  whiteSpace: "nowrap",
                  boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 15px ${member.color}10`,
                }}
              >
                <p style={{ fontSize: "0.6rem", color: member.color }}>
                  {member.title}
                </p>
                <p
                  className="mt-0.5 italic"
                  style={{
                    fontSize: "0.52rem",
                    color: "rgba(192,220,240,0.5)",
                  }}
                >
                  「{member.quote}」
                </p>
              </div>
            )}
          </div>
        )
      })}

      {/* ======== Selected Member Detail Drawer ======== */}
      {selectedMember && (
        <MemberDetailDrawer
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* ======== Top-left title ======== */}
      <div className="absolute top-4 left-5 z-10">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#00F0FF]" />
          <span
            style={{
              fontSize: "0.8rem",
              color: "#00F0FF",
              letterSpacing: "2px",
            }}
          >
            AI Family
          </span>
        </div>
        <p
          className="mt-1"
          style={{
            fontSize: "0.55rem",
            color: "rgba(0,240,255,0.3)",
            letterSpacing: "1px",
          }}
        >
          八魂归一，云枢乃成
        </p>
      </div>

      {/* ======== Top-right stats ======== */}
      <div className="absolute top-4 right-5 z-10 flex items-center gap-3">
        <StatusBadge
          icon={Activity}
          label={t("aiFamily.online")}
          value="7/8"
          color="#00FF88"
        />
        <StatusBadge
          icon={Zap}
          label={t("aiFamily.activeTasks")}
          value="142"
          color="#FFD700"
        />
        <StatusBadge
          icon={Clock}
          label={t("aiFamily.uptime")}
          value="99.97%"
          color="#00BFFF"
        />
      </div>

      {/* ======== Bottom slogan ======== */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-center">
        <p
          style={{
            fontSize: "0.55rem",
            color: "rgba(0,240,255,0.25)",
            letterSpacing: "3px",
          }}
        >
          亦师亦友亦伯乐 · 一言一语一协同
        </p>
        <p
          className="mt-1"
          style={{
            fontSize: "0.45rem",
            color: "rgba(191,0,255,0.25)",
            letterSpacing: "1px",
          }}
        >
          Words Initiate Quadrants, Language Serves as Core for the Future
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 30px rgba(0,240,255,0.15), inset 0 0 20px rgba(0,240,255,0.05); }
          50% { box-shadow: 0 0 50px rgba(0,240,255,0.25), inset 0 0 30px rgba(0,240,255,0.1); }
        }
        @keyframes ring-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ======== Sub-components ========

function StatusBadge({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
      style={{
        background: "rgba(10,10,10,0.6)",
        border: "1px solid rgba(0,240,255,0.1)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Icon className="w-3 h-3" style={{ color }} />
      <div>
        <p style={{ fontSize: "0.45rem", color: "rgba(192,220,240,0.4)" }}>
          {label}
        </p>
        <p
          style={{
            fontSize: "0.65rem",
            color,
            textShadow: `0 0 6px ${color}40`,
          }}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function MemberDetailDrawer({
  member,
  onClose,
}: {
  member: AIFamilyMember
  onClose: () => void
}) {
  const navigate = useNavigate()
  const Icon = member.icon

  const handleNavigate = (subpage: string) => {
    navigate(`/ai-family/${subpage}`)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ background: "rgba(0,0,0,0.3)" }}
      />
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-y-auto"
        style={{
          width: "380px",
          maxWidth: "90vw",
          background:
            "linear-gradient(180deg, rgba(8,15,35,0.98) 0%, rgba(4,8,20,0.98) 100%)",
          borderLeft: `1px solid ${member.color}25`,
          boxShadow: `-10px 0 60px rgba(0,0,0,0.5), 0 0 30px ${member.color}08`,
          backdropFilter: "blur(16px)",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0,180,255,0.15) transparent",
        }}
      >
        {/* Header */}
        <div
          className="relative shrink-0 p-6 pb-4"
          style={{ borderBottom: `1px solid ${member.color}15` }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[rgba(0,240,255,0.3)] hover:text-[#00F0FF] hover:bg-[rgba(0,240,255,0.08)] transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="rounded-full flex items-center justify-center shrink-0"
              style={{
                width: 64,
                height: 64,
                background: `radial-gradient(circle, ${member.color}20 0%, rgba(4,10,22,0.9) 70%)`,
                border: `2px solid ${member.color}50`,
                boxShadow: `0 0 25px ${member.color}20`,
              }}
            >
              <Icon className="w-7 h-7" style={{ color: member.color }} />
            </div>

            <div>
              <h2
                style={{
                  fontSize: "1rem",
                  color: member.color,
                  letterSpacing: "1px",
                }}
              >
                {member.name}
              </h2>
              <p
                className="mt-0.5"
                style={{ fontSize: "0.65rem", color: "rgba(192,220,240,0.5)" }}
              >
                {member.title}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div
                  className="rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    background:
                      member.status === "speaking"
                        ? "#FF006E"
                        : member.status === "online"
                          ? "#00FF88"
                          : "#808080",
                    boxShadow:
                      member.status === "speaking"
                        ? "0 0 6px #FF006E"
                        : member.status === "online"
                          ? "0 0 6px #00FF88"
                          : "none",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.55rem",
                    color: "rgba(192,220,240,0.4)",
                  }}
                >
                  {member.status === "speaking"
                    ? "发言中"
                    : member.status === "online"
                      ? "在线"
                      : "待命"}
                </span>
                <span
                  className="mx-1"
                  style={{ color: "rgba(0,240,255,0.15)" }}
                >
                  |
                </span>
                <Clock
                  className="w-3 h-3"
                  style={{ color: "rgba(0,240,255,0.25)" }}
                />
                <span
                  style={{ fontSize: "0.55rem", color: "rgba(0,240,255,0.3)" }}
                >
                  {member.timeLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quote */}
        <div
          className="mx-6 mt-4 px-4 py-3 rounded-lg italic"
          style={{
            background: `${member.color}08`,
            borderLeft: `3px solid ${member.color}40`,
          }}
        >
          <p
            style={{
              fontSize: "0.72rem",
              color: "rgba(192,220,240,0.7)",
              lineHeight: "1.6",
            }}
          >
            「{member.quote}」
          </p>
        </div>

        {/* Role */}
        <div className="px-6 mt-5">
          <SectionTitle label="角色定位" color={member.color} />
          <p
            className="mt-2"
            style={{
              fontSize: "0.68rem",
              color: "rgba(192,220,240,0.6)",
              lineHeight: "1.6",
            }}
          >
            {member.role}
          </p>
        </div>

        {/* Responsibilities */}
        <div className="px-6 mt-5">
          <SectionTitle label="核心职责" color={member.color} />
          <div className="mt-2 space-y-2">
            {member.responsibilities.map((resp, i) => (
              <div key={i} className="flex items-start gap-2">
                <ChevronRight
                  className="w-3 h-3 shrink-0 mt-0.5"
                  style={{ color: member.color }}
                />
                <span
                  style={{
                    fontSize: "0.68rem",
                    color: "rgba(192,220,240,0.6)",
                    lineHeight: "1.5",
                  }}
                >
                  {resp}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Core Ability */}
        <div className="px-6 mt-5">
          <SectionTitle label="核心能力" color={member.color} />
          <div
            className="mt-2 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(0,40,80,0.2)",
              border: "1px solid rgba(0,180,255,0.08)",
            }}
          >
            <p
              className="font-mono"
              style={{
                fontSize: "0.62rem",
                color: "rgba(0,240,255,0.5)",
                lineHeight: "1.5",
              }}
            >
              {member.coreAbility}
            </p>
          </div>
        </div>

        {/* Activity Metrics (mock) */}
        <div className="px-6 mt-5 mb-6">
          <SectionTitle label="运行指标" color={member.color} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <MetricCard
              label="今日处理"
              value={`${Math.floor(Math.random() * 500) + 100}`}
              unit="tasks"
              color={member.color}
            />
            <MetricCard
              label="平均延迟"
              value={`${Math.floor(Math.random() * 80) + 20}`}
              unit="ms"
              color="#00BFFF"
            />
            <MetricCard
              label="准确率"
              value={`${(95 + Math.random() * 4.5).toFixed(1)}`}
              unit="%"
              color="#00FF88"
            />
            <MetricCard
              label="协作次数"
              value={`${Math.floor(Math.random() * 200) + 50}`}
              unit="calls"
              color="#BF00FF"
            />
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-6 pb-6 mt-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavigate("chat")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all"
              style={{
                background: `${member.color}12`,
                border: `1px solid ${member.color}30`,
                color: member.color,
                fontSize: "0.68rem",
              }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              对话
            </button>
            <button
              onClick={() => handleNavigate("data")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all"
              style={{
                background: "rgba(0,40,80,0.2)",
                border: "1px solid rgba(0,180,255,0.12)",
                color: "rgba(0,240,255,0.5)",
                fontSize: "0.68rem",
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              数据中心
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function SectionTitle({ label, color }: { label: string color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-full"
        style={{ width: 6, height: 6, background: color }}
      />
      <span
        style={{
          fontSize: "0.62rem",
          color: "rgba(0,240,255,0.5)",
          letterSpacing: "1px",
        }}
      >
        {label}
      </span>
    </div>
  )
}

function MetricCard({
  label,
  value,
  unit,
  color,
}: {
  label: string
  value: string
  unit: string
  color: string
}) {
  return (
    <div
      className="px-3 py-2 rounded-lg"
      style={{
        background: "rgba(0,40,80,0.15)",
        border: "1px solid rgba(0,180,255,0.06)",
      }}
    >
      <p style={{ fontSize: "0.5rem", color: "rgba(192,220,240,0.35)" }}>
        {label}
      </p>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span
          style={{
            fontSize: "0.85rem",
            color,
            textShadow: `0 0 6px ${color}30`,
          }}
        >
          {value}
        </span>
        <span style={{ fontSize: "0.45rem", color: "rgba(192,220,240,0.3)" }}>
          {unit}
        </span>
      </div>
    </div>
  )
}
