/**
 * file: app/not-found.tsx
 * description: 404 页 · 导出为 404.html（GitHub Pages 缺失能力补齐）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [app-router],[not-found],[routing]
 *
 * brief: 未知路径降级页，保持指挥舱霓虹视觉；提供返回首页出口
 *
 * dependencies: next/link
 * exports: default（Next 约定导出）
 */

import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#0A1628]">
      <div className="max-w-md w-full text-center space-y-4 rounded-2xl glass-panel border border-[#00F0FF]/40 p-8">
        <p className="text-5xl font-bold text-[#00F0FF] font-mono-num">404</p>
        <h2 className="text-base font-bold text-white">航线未收录</h2>
        <p className="text-xs text-[#9BA3B4]">
          该视图不在指挥舱航图内，请返回指挥舱
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-1.5 rounded-lg bg-[#00F0FF]/20 hover:bg-[#00F0FF]/30 text-[#00F0FF] font-bold text-xs border border-[#00F0FF]/50 transition-all"
        >
          返回指挥舱
        </Link>
      </div>
    </div>
  )
}
