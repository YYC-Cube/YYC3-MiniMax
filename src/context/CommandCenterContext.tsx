/**
 * file: context/CommandCenterContext.tsx
 * description: 指挥舱上下文组合入口 · 汇聚导航/Agent/W1 三域（跨路由常驻，挂载于 layout）
 * author: YanYuCloudCube Team
 * version: v2.0.0
 * created: 2026-10-15
 * updated: 2026-10-16
 * status: active
 * tags: [context],[orchestration],[app-router]
 *
 * brief: 五态由三域 Provider（navigation/agent/widget）分别持有并各自 memo 化；
 *        本模块仅做组合装配，单域消费者请优先用 useNavigation/useActiveAgent/useWidgetCommand
 *        缩窄订阅，避免任一变更触发全域重渲染
 *
 * details:
 * - P1 成员唤起 W1 / P2 指令直通 / P2·P3·P4·P5 视图跳转 / W1 引用卡回跳（清单 §5.3）
 * - externalCommand 保留 { id, text } 自增对象语义（诊断 #13：同文本二次派发必达）
 *
 * dependencies: react, context/navigation, context/agent, context/widget
 * exports: CommandCenterProvider, useCommandCenter
 */

"use client"

/** 组合三域 Provider：导航 / Agent / W1 浮窗（挂载于 layout，跨路由常驻） */

/**
 * 组合三域 Hook：需跨域取值的消费者（CommandShell / 路由 page）使用；
 * 仅需单域的消费者请改用 useNavigation/useActiveAgent/useWidgetCommand 缩窄订阅
 */

import type { AgentId, PipelineStageId } from "@/types"
import type { ReactNode } from "react"
import { AgentProvider, useActiveAgent } from "./agent"
import { NavigationProvider, useNavigation, type ViewId } from "./navigation"
import {
  WidgetProvider,
  useWidgetCommand,
  type ExternalCommand,
} from "./widget"

interface CommandCenterValue {
  activeAgentId: AgentId
  setActiveAgentId: (id: AgentId) => void
  isWidgetOpen: boolean
  setIsWidgetOpen: (open: boolean) => void
  externalCommand: ExternalCommand | null
  clearExternalCommand: () => void
  sendCommandToWidget: (text: string) => void
  highlightedStageId: PipelineStageId | null
  navigate: (view: ViewId) => void
  navigateToStage: (stageId: string) => void
  scaleMode: "fit" | "1080p"
  toggleScaleMode: () => void
}
export function CommandCenterProvider({ children }: { children: ReactNode }) {
  return (
    <NavigationProvider>
      <AgentProvider>
        <WidgetProvider>{children}</WidgetProvider>
      </AgentProvider>
    </NavigationProvider>
  )
}
export function useCommandCenter(): CommandCenterValue {
  const { activeAgentId, setActiveAgentId } = useActiveAgent()
  const {
    isWidgetOpen,
    setIsWidgetOpen,
    externalCommand,
    clearExternalCommand,
    sendCommandToWidget,
  } = useWidgetCommand()
  const {
    highlightedStageId,
    navigate,
    navigateToStage,
    scaleMode,
    toggleScaleMode,
  } = useNavigation()

  return {
    activeAgentId,
    setActiveAgentId,
    isWidgetOpen,
    setIsWidgetOpen,
    externalCommand,
    clearExternalCommand,
    sendCommandToWidget,
    highlightedStageId,
    navigate,
    navigateToStage,
    scaleMode,
    toggleScaleMode,
  }
}
