/**
 * file: app/p4/page.tsx
 * description: P4 路由 · 算力监控台
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [app-router],[page],[p4]
 *
 * brief: 三向告警路由（P5/P2/P3）走指挥链
 *
 * dependencies: P4OpsMonitoring, CommandCenterContext
 */

'use client'

import { P4OpsMonitoring } from '@/views/P4OpsMonitoring'
import { useCommandCenter } from '../../context/CommandCenterContext'

export default function Page() {
  const { navigate } = useCommandCenter()
  return (
    <P4OpsMonitoring
      onNavigateToP5={() => navigate('P5')}
      onNavigateToP2={() => navigate('P2')}
      onNavigateToP3={() => navigate('P3')}
    />
  )
}
