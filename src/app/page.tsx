/**
 * file: app/page.tsx
 * description: 根路由 · P1 家庭中枢（时钟环）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [app-router],[page],[p1]
 *
 * brief: 静态导出首页；onSelectAgent 唤起 W1，onNavigate 走指挥链路由
 *
 * dependencies: P1FamilyCenter, CommandCenterContext
 */

'use client'

import { P1FamilyCenter } from '@/views/P1FamilyCenter'
import { useCommandCenter } from '../context/CommandCenterContext'

export default function Page() {
  const { setActiveAgentId, setIsWidgetOpen, navigate } = useCommandCenter()
  return (
    <P1FamilyCenter
      onSelectAgent={(id) => {
        setActiveAgentId(id)
        setIsWidgetOpen(true)
      }}
      onNavigate={navigate}
    />
  )
}
