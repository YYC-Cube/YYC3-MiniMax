/**
 * file: app/p5/page.tsx
 * description: P5 路由 · 质检与安全
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [app-router],[page],[p5]
 *
 * brief: 底部导航（P2/P3）走指挥链
 *
 * dependencies: P5QualitySecurity, context/navigation
 */

"use client"

import { P5QualitySecurity } from "@/views/P5QualitySecurity"
import { useNavigation } from "../../context/navigation"

export default function Page() {
  const { navigate } = useNavigation()
  return (
    <P5QualitySecurity
      onNavigateToP2={() => navigate("P2")}
      onNavigateToP3={() => navigate("P3")}
    />
  )
}
