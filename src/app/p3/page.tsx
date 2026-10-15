/**
 * file: app/p3/page.tsx
 * description: P3 路由 · ReAct-C 九步编排
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [app-router],[page],[p3]
 *
 * brief: onSelectAgent 唤起 W1；onNavigate 走指挥链路由
 *
 * dependencies: P3ReActWorkflow, CommandCenterContext
 */

'use client'

import { P3ReActWorkflow } from '@/views/P3ReActWorkflow'
import { useCommandCenter } from '../CommandCenterContext'

export default function Page() {
  const { setActiveAgentId, setIsWidgetOpen, navigate } = useCommandCenter()
  return (
    <P3ReActWorkflow
      onSelectAgent={(id) => {
        setActiveAgentId(id)
        setIsWidgetOpen(true)
      }}
      onNavigate={navigate}
    />
  )
}
