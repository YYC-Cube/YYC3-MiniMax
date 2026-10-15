/**
 * file: app/page.tsx
 * description: 根路由 · P1 家庭中枢视图挂载
 * author: YanYuCloudCube Team
 * version: v0.1.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: wip
 * tags: [app-router],[page],[p1]
 *
 * brief: P1 最小壳（'use client' 保守策略：视图树整体客户端，见清单 §5.5）；P3 拆分五路由后重构
 *
 * dependencies: P1FamilyCenter
 */

'use client'

import { P1FamilyCenter } from '@/views/P1FamilyCenter'
import { useState } from 'react'

export default function Page() {
  // P1 最小壳：Agent 选中态本地暂存；P3 拆五路由后上移 CommandCenterContext
  const [, setActiveAgentId] = useState<string | null>(null)
  return (
    <P1FamilyCenter
      onSelectAgent={setActiveAgentId}
      onNavigate={() => {
        /* 路由桥接在 P3 接入；当前最小壳仅承载 P1 视图 */
      }}
    />
  )
}
