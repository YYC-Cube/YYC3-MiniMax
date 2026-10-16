/**
 * file: app/CommandShell.tsx
 * description: 指挥舱全局壳 · 桌面框架(Header/Footer/缩放)/移动降级分支/W1 常驻浮窗
 *              （迁移自 App.tsx 渲染层，挂载于 layout 跨路由常驻）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [app-router],[shell],[responsive]
 *
 * brief: 布局骨架与状态逻辑分离——视图内容由路由 children 注入，五态与指令路由走 CommandCenterContext
 *
 * details:
 * - 桌面：1980×1020 缩放（scaleMode）+ Header/Footer + 视图级 ErrorBoundary
 * - 移动（<768px，挂载守卫后）：MobileFallback 整屏 + W1 常驻
 * - W1 UniversalWidget 跨路由唯一实例（清单 §5.3 要点 2）
 *
 * dependencies: react, components/*, views/MobileFallback, CommandCenterContext, ResponsiveGate
 * exports: CommandShell
 */

"use client"

// 1980×1020 固定模式缩放因子（迁移自 App.tsx L60-74）

// 移动降级：挂载守卫后（避免 SSR 首帧 mismatch），W1 交互闭环保持
/* 视图内容由路由注入（视图级错误边界：单视图故障不扩散全站） */ /* W1 常驻浮窗（跨路由唯一实例） */

import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Footer } from "@/components/Footer"
import { Header } from "@/components/Header"
import { UniversalWidget } from "@/components/UniversalWidget"
import { MobileFallback } from "@/views/MobileFallback"
import { useEffect, useState, type ReactNode } from "react"
import { useCommandCenter } from "../context/CommandCenterContext"
import { useResponsiveGate } from "./ResponsiveGate"

export function CommandShell({ children }: { children: ReactNode }) {
  const {
    activeAgentId,
    setActiveAgentId,
    isWidgetOpen,
    setIsWidgetOpen,
    externalCommand,
    clearExternalCommand,
    navigateToStage,
    scaleMode,
    toggleScaleMode,
  } = useCommandCenter()
  const [isMobile, mounted] = useResponsiveGate()
  const [scaleFactor, setScaleFactor] = useState(1)
  useEffect(() => {
    const handleResize = () => {
      if (
        scaleMode ===
        "1080p"
      ) {
        setScaleFactor(
          Math.min(
            window.innerWidth /
            1980,
            window.innerHeight /
            1020,
          ),
        )
      } else {
        setScaleFactor(1)
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [scaleMode])
  if (mounted && isMobile) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-[#0A1628] relative">
        <div className="noise-overlay" />
        <div className="relative z-10 w-full h-full">
          <ErrorBoundary key="mobile" label="移动视图">
            <MobileFallback
              onSelectAgent={(id) => {
                setActiveAgentId(id)
                setIsWidgetOpen(true)
              }}
            />
          </ErrorBoundary>
        </div>
        <UniversalWidget
          activeAgentId={activeAgentId}
          onSelectAgent={setActiveAgentId}
          isOpen={isWidgetOpen}
          onToggleOpen={() => setIsWidgetOpen(!isWidgetOpen)}
          onNavigateToTask={navigateToStage}
          externalCommand={externalCommand}
          onClearExternalCommand={clearExternalCommand}
        />
      </div>
    )
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0A1628] command-bg relative flex flex-col justify-between">
      <div className="noise-overlay" />

      {/* Skip-link（WCAG 2.4.1）：首个可停靠点，键盘 Tab 一次直达主内容，聚焦前视觉隐藏 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-3 focus:py-2 focus:text-xs focus:text-[#00F0FF] focus:bg-[#0A1628] focus:border focus:border-[#00F0FF] focus:rounded"
      >
        跳到主内容
      </a>

      <div
        className={`w-full h-full flex flex-col justify-between relative z-10 ${scaleMode === "1080p" ? "origin-top-left" : ""
          }`}
        style={
          scaleMode === "1080p"
            ? { width: 1980, height: 1020, transform: `scale(${scaleFactor})` }
            : undefined
        }
      >
        <Header scaleMode={scaleMode} onToggleScaleMode={toggleScaleMode} />

        { }
        <main id="main-content" className="flex-1 w-full h-[calc(100%-92px)] relative overflow-hidden">
          <ErrorBoundary label="视图渲染异常">{children}</ErrorBoundary>
        </main>

        <Footer />
      </div>

      { }
      <UniversalWidget
        activeAgentId={activeAgentId}
        onSelectAgent={setActiveAgentId}
        isOpen={isWidgetOpen}
        onToggleOpen={() => setIsWidgetOpen(!isWidgetOpen)}
        onNavigateToTask={navigateToStage}
        externalCommand={externalCommand}
        onClearExternalCommand={clearExternalCommand}
      />
    </div>
  )
}
