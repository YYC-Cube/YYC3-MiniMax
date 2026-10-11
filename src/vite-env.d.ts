/**
 * file: vite-env.d.ts
 * description: Vite 环境类型 · ImportMetaEnv 声明（事件流地址）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [type],[env],[vite]
 *
 * brief: 环境变量类型契约
 *
 * exports: ImportMetaEnv.VITE_EVENT_STREAM_URL, ImportMetaEnv.VITE_PII_REVEAL_API
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** WebSocket 事件流地址（wss://...），未配置时 P2 事件流自动降级为模拟流 */
  readonly VITE_EVENT_STREAM_URL?: string;
  /** PII 原文受控调取接口（GET {endpoint}/{logId} → { raw }），未配置时走 SIM 演示模式 */
  readonly VITE_PII_REVEAL_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
