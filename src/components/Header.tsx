/**
 * file: Header.tsx
 * description: 顶部导航 · 实时时钟/路由导航（Next Link 化）/全局状态灯
 * author: YanYuCloudCube Team
 * version: v2.0.0
 * created: 2026-10-11
 * updated: 2026-10-15
 * status: active
 * tags: [component],[ui],[navigation]
 *
 * brief: 指挥舱顶栏：品牌标识、P1-P5 导航、系统时间与在线状态
 *
 * details:
 * - Next.js 16 迁移：onViewChange 回调 → Link 路由跳转；currentView props → usePathname 派生
 * - scaleMode 切换仍走 CommandCenterContext（非路由语义）
 *
 * dependencies: react, next/link, next/navigation, lucide-react, context/navigation
 * exports: Header
 */

import { VIEW_PATHS, type ViewId } from "@/context/navigation"
import {
  Activity,
  Cpu,
  Maximize2,
  Radio,
  ShieldAlert,
  Sparkles,
  Workflow,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import React, { useEffect, useState } from "react"
import { BrandMark } from "./BrandMark"
import { PwaInstallButton } from "./PwaInstallButton"

interface HeaderProps {
  scaleMode: "fit" | "1080p"
  onToggleScaleMode: () => void
}

const NAV_ITEMS: Array<{
  id: ViewId
  label: string
  sub: string
  icon: typeof Sparkles
}> = [
  { id: "P1", label: "P1 时钟环中心", sub: "AI Family", icon: Sparkles },
  { id: "P2", label: "P2 漫剧生产台", sub: "六阶段流水线", icon: Workflow },
  { id: "P3", label: "P3 ReAct-C 编排", sub: "九步闭环", icon: Radio },
  { id: "P4", label: "P4 算力监控台", sub: "双DGX+Mac+NAS", icon: Cpu },
  { id: "P5", label: "P5 质检与安全", sub: "门禁与脱敏", icon: ShieldAlert },
]

export const Header: React.FC<HeaderProps> = ({
  scaleMode,
  onToggleScaleMode,
}) => {
  const pathname = usePathname()
  const [timeStr, setTimeStr] = useState<string>("00:00:00")

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, "0")
      const minutes = String(now.getMinutes()).padStart(2, "0")
      const seconds = String(now.getSeconds()).padStart(2, "0")
      setTimeStr(`${hours}:${minutes}:${seconds}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="h-14 px-6 border-b border-[#00F0FF]/25 bg-[#10121C]/85 backdrop-blur-md flex items-center justify-between select-none relative z-40">
      {/* Left: YYC³ Branding（→ 根路由） */}
      <div className="flex items-center space-x-3.5">
        <Link
          href={VIEW_PATHS.P1}
          className="cursor-pointer group flex items-center space-x-2.5"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00F0FF] via-[#BF00FF] to-[#FF006E] p-[1.5px] shadow-[0_0_12px_rgba(0,240,255,0.4)] group-hover:shadow-[0_0_16px_rgba(191,0,255,0.7)] transition-all">
            <div className="w-full h-full bg-[#0A0A0A] rounded-[6.5px] flex items-center justify-center p-1">
              <BrandMark size={26} quiet />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-mono-num font-extrabold text-sm tracking-wider text-white">
                YYC³ <span className="text-[#00F0FF]">AI FAMILY</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-[#BF00FF]/20 border border-[#BF00FF]/40 text-[#BF00FF] rounded font-mono-num">
                v4.8-HYPER
              </span>
            </div>
            <span className="text-[10px] text-[#9BA3B4] font-medium tracking-tight">
              8 拟人化 Agent 协同 · 工业化漫剧指挥中心
            </span>
          </div>
        </Link>
      </div>

      {/* Middle: 5 Screen Navigation Tabs（路由跳转 + pathname 高亮） */}
      <nav className="flex items-center space-x-1.5 bg-[#0D0F18]/90 p-1 rounded-xl border border-white/10 shadow-inner">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === VIEW_PATHS[item.id]
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={VIEW_PATHS[item.id]}
              className={`relative px-3.5 py-1.5 rounded-lg flex items-center space-x-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-[#00F0FF]/20 to-[#BF00FF]/20 text-white border border-[#00F0FF]/50 shadow-[0_0_12px_rgba(0,240,255,0.25)]"
                  : "text-[#9BA3B4] hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Icon
                size={14}
                className={isActive ? "text-[#00F0FF]" : "text-[#9BA3B4]"}
              />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-[#00F0FF] via-[#BF00FF] to-[#FF006E] rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Right: Live Clock & Global Status LEDs */}
      <div className="flex items-center space-x-5">
        {/* PWA 安装入口（浏览器可安装时才出现） */}
        <PwaInstallButton />
        {/* Real-time Clock */}
        <div className="flex items-center space-x-2 bg-[#0A0A0A]/80 px-3 py-1 rounded border border-[#00F0FF]/30 shadow-[0_0_8px_rgba(0,240,255,0.2)]">
          <Activity size={13} className="text-[#00F0FF] animate-pulse" />
          <span className="font-mono-num text-sm font-bold text-[#00F0FF] tracking-widest text-glow-cyan">
            {timeStr}
          </span>
          <span className="text-[10px] text-[#9BA3B4] font-mono-num">
            UTC+8
          </span>
        </div>

        {/* Global Status Lights: 产能 / 质检 / 安全 */}
        <div className="flex items-center space-x-3.5 pl-2 border-l border-white/15">
          <div
            className="flex items-center space-x-1.5"
            title="产能系统: 运行正常"
          >
            <span className="w-2 h-2 rounded-full bg-[#00FF88] shadow-[0_0_8px_#00FF88] animate-pulse" />
            <span className="text-[11px] text-[#9BA3B4]">产能</span>
          </div>
          <div
            className="flex items-center space-x-1.5"
            title="质量门禁: 严格在线"
          >
            <span className="w-2 h-2 rounded-full bg-[#00FF88] shadow-[0_0_8px_#00FF88]" />
            <span className="text-[11px] text-[#9BA3B4]">质检</span>
          </div>
          <div
            className="flex items-center space-x-1.5"
            title="安全审计: 零泄漏防护"
          >
            <span className="w-2 h-2 rounded-full bg-[#00FF88] shadow-[0_0_8px_#00FF88]" />
            <span className="text-[11px] text-[#9BA3B4]">安全</span>
          </div>
        </div>

        {/* View mode toggle */}
        <button
          onClick={onToggleScaleMode}
          className="p-1.5 rounded text-[#9BA3B4] hover:text-white hover:bg-white/10 transition-colors border border-white/10"
          title={
            scaleMode === "fit"
              ? "切换至标准 1980×1020 视图"
              : "切换至自适应高度视图"
          }
        >
          <Maximize2 size={13} />
        </button>
      </div>
    </header>
  )
}
