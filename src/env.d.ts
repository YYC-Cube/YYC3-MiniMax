/**
 * file: env.d.ts
 * description: 环境变量类型契约 · NEXT_PUBLIC_ 客户端内联变量（迁移自 vite-env.d.ts）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [type],[env],[nextjs]
 *
 * brief: Next.js 约定 NEXT_PUBLIC_ 前缀变量构建时内联到客户端 bundle；
 *        服务端专用变量（无前缀）不暴露给浏览器，勿在此声明敏感值
 *
 * exports: ProcessEnv.NEXT_PUBLIC_EVENT_STREAM_URL, ProcessEnv.NEXT_PUBLIC_PII_REVEAL_API
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /** WebSocket 事件流地址（wss://...），未配置时 P2 事件流自动降级为模拟流 */
      readonly NEXT_PUBLIC_EVENT_STREAM_URL?: string
      /** PII 原文受控调取接口（GET {endpoint}/{logId} → { raw }），未配置时走 SIM 演示模式 */
      readonly NEXT_PUBLIC_PII_REVEAL_API?: string
    }
  }
}

export {}
