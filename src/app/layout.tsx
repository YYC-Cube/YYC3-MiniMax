/**
 * file: app/layout.tsx
 * description: 根布局 · 全局样式/站点元信息挂载点（迁移自 index.html + main.tsx 壳层职责）
 * author: YanYuCloudCube Team
 * version: v0.1.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: wip
 * tags: [app-router],[layout],[bootstrap]
 *
 * brief: P1 最小壳（构建验收用）；P2 按《迁移评估清单 §5.2》补全 12 项 Metadata 映射
 *
 * dependencies: react, globals.css（现 index.css，P2 平移改名）
 */

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../index.css'

export const metadata: Metadata = {
  title: 'YYC³ AI FAMILY · 漫剧工业化指挥中心',
  description: '8 拟人化 Agent 协同的漫剧工业化生产指挥中心 · ReAct-C 九步闭环',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
