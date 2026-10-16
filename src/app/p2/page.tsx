/**
 * file: app/p2/page.tsx
 * description: P2 路由 · 漫剧生产台（六阶段流水线）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [app-router],[page],[p2]
 *
 * brief: onSelectAgent 唤起 W1；onSendToWidget 走指令路由（诊断 #13 语义保持）
 *
 * dependencies: P2ProductionDesk, CommandCenterContext
 */

"use client"

import { P2ProductionDesk } from "@/views/P2ProductionDesk"
import { useCommandCenter } from "../../context/CommandCenterContext"

export default function Page() {
  const {
    setActiveAgentId,
    setIsWidgetOpen,
    sendCommandToWidget,
    navigate,
    highlightedStageId,
  } = useCommandCenter()
  return (
    <P2ProductionDesk
      onSelectAgent={(id) => {
        setActiveAgentId(id)
        setIsWidgetOpen(true)
      }}
      onSendToWidget={sendCommandToWidget}
      onNavigateToP5={() => navigate("P5")}
      highlightedStageId={highlightedStageId}
    />
  )
}
