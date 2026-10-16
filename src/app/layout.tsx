/**
 * file: app/layout.tsx
 * description: 根布局 · 站点元信息 12 项映射 + 指挥舱 Provider/Shell 挂载
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [app-router],[layout],[metadata]
 *
 * brief: Metadata/Viewport API 声明式 head；CommandCenterProvider（五态）→ CommandShell（全局壳）
 *
 * details:
 * - UniversalWidget 由 CommandShell 挂载，跨路由唯一实例
 * - LegacyViewBridge 处理 ?view= 旧深链（PWA 快捷方式/历史外链）
 *
 * dependencies: next, globals.css, Bootstrap, CommandCenterContext, CommandShell
 */

import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { Bootstrap } from "./Bootstrap"
import { CommandCenterProvider } from "../context/CommandCenterContext"
import { CommandShell } from "./CommandShell"
import { LegacyViewBridge } from "./LegacyViewBridge"
import "./globals.css"

const SITE_TITLE = "YYC³ AI FAMILY · 漫剧工业化指挥中心"
const SITE_DESCRIPTION =
  "8 拟人化 Agent 协同的漫剧工业化生产指挥中心 · ReAct-C 九步闭环"

export const metadata: Metadata = {
  metadataBase: new URL("https://minimax.yyc3.top"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/yyc3-icons/brand/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/yyc3-icons/brand/favicon-16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: "/yyc3-icons/brand/apple-touch-icon-180.png",
  },
  appleWebApp: {
    capable: true,
    title: "YYC³ 指挥舱",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Bootstrap />
        <CommandCenterProvider>
          <CommandShell>{children}</CommandShell>
        </CommandCenterProvider>
        <LegacyViewBridge />
      </body>
    </html>
  )
}
