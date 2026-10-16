/**
 * file: orchestratorWorker.entry.ts
 * description: 编排 Worker 入口（PR6）· 真实 DedicatedWorker 线程装配
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [workers],[entry],[orchestration]
 *
 * brief: worker 线程侧唯一入口：消息接线 + 可观测桥挂接（纯副作用，无导出）
 *
 * details:
 * - 由 orchestratorClient 以 new Worker(new URL('./orchestratorWorker.entry.ts',
 *   import.meta.url), { type: 'module' }) 装配；本文件不感知 UI
 * - globalThis 强转 WorkerScope：tsconfig lib 为 DOM，显式 lib 引用会与
 *   DOM 全局冲突，结构化子集转换在运行时（worker 全局）完全兼容
 *
 * dependencies: workers/orchestratorWorker, workers/observability
 * exports: 无（副作用入口）
 */

import type { WorkerScope } from "./orchestratorWorker"
import { installWorkerMessaging } from "./orchestratorWorker"
import { attachObservability } from "./observability"

const scope = globalThis as unknown as WorkerScope
const handle = installWorkerMessaging(scope)
attachObservability(handle.runtime)
