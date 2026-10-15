/**
 * file: next.config.ts
 * description: Next.js 16 配置 · 静态导出/尾斜杠/图片直出（GitHub Pages 托管形态）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [config],[build],[nextjs]
 *
 * brief: 迁移自 vite.config.ts 的构建职责（单轨 Next，Figma 插件随 D1 决策废弃）
 *
 * details:
 * - output: 'export' → next build 产出纯静态 out/（GitHub Pages 托管）
 * - trailingSlash: true → /p2/ 目录形态（Pages 无 URL 重写能力）
 * - images.unoptimized → 静态导出无图片优化服务端
 * dependencies: next
 * notes: 深链 redirects() 在导出模式不可用，?view= 兼容由 P3 客户端桥接实现
 */

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
