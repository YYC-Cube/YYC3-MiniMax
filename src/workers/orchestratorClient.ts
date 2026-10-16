/**
 * file: orchestratorClient.ts（workers）
 * description: UI 侧编排客户端（PR6）· worker/进程内双模式单例，OrchestratorPort 的 UI 出口
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [workers],[client],[orchestration],[ha]
 *
 * brief: UI 只经本客户端 dispatch/cancel/resume；step/effect 事件经订阅回流
 *
 * details:
 * - 双模式（高可用契约）：Worker 可用时以真实线程运行（UI 主线程零阻塞）；
 *   Worker 不可用（测试环境/极旧浏览器/构造失败）自动降级进程内运行，
 *   事件语义完全一致——与 eventStream LIVE/SIM 降级哲学同构
 * - 测试强制进程内：NODE_ENV=test 时跳过 Worker 分支（vitest 无法加载 worker chunk）
 * - worker 模式 receipt 按 dispatch FIFO 关联（单 UI 顺序派发，无并发竞态）
 * - 可观测桥：worker 模式在 entry 线程内挂接；进程内模式在本客户端挂接
 *
 * dependencies: workers/orchestratorWorker, workers/observability, services/telemetry, types
 * exports: OrchestratorClientMode, OrchestratorClient, OrchestratorClientOptions,
 *          getOrchestratorClient, __resetOrchestratorClientForTests
 */

import type { EffectContext } from "../core/runtime/orchestrator"
import type { MachineEffect } from "../core/machine/reactStateMachine"
import { telemetry } from "../services/telemetry"
import type { AgentCommand, AgentResult, HumanDecision, TaskPriority } from "../types/agent"
import type { DispatchReceipt, ModelPort } from "../types/ports"
import { attachObservability } from "./observability"
import { createOrchestratorWorker } from "./orchestratorWorker"
import type { WorkerOutboundMessage } from "./orchestratorWorker"

export type OrchestratorClientMode = "worker" | "in-process"

export type StepListener = (result: AgentResult) => void
export type EffectListener = (effect: MachineEffect, ctx: EffectContext) => void

export interface OrchestratorClient {
  readonly mode: OrchestratorClientMode
  dispatch(cmd: AgentCommand, priority?: TaskPriority): Promise<DispatchReceipt>
  cancel(taskId: string): void
  resume(taskId: string, decision: HumanDecision): Promise<void>
  /** 订阅每步执行结果（含 trace），返回退订函数 */
  onStep(cb: StepListener): () => void
  /** 订阅状态机效应（回环/重试/接管/终态），返回退订函数 */
  onEffect(cb: EffectListener): () => void
  /** 释放客户端（终止 worker / 清空监听）；单例场景仅测试使用 */
  dispose(): void
}

export interface OrchestratorClientOptions {
  /** 进程内模式的模型端口注入（缺省 env 驱动装配；测试注脚本模型） */
  model?: ModelPort
}

/** 事件总线（双模式共用：worker 模式经 onmessage 汇入，进程内模式经 post 汇入） */
function createEventBus() {
  const stepListeners = new Set<StepListener>()
  const effectListeners = new Set<EffectListener>()
  return {
    route(message: WorkerOutboundMessage): void {
      if (message.type === "step") {
        for (const listener of stepListeners) listener(message.result)
      } else if (message.type === "effect") {
        for (const listener of effectListeners)
          listener(message.effect, { taskId: message.taskId, traceId: message.traceId })
      }
    },
    onStep(cb: StepListener): () => void {
      stepListeners.add(cb)
      return () => {
        stepListeners.delete(cb)
      }
    },
    onEffect(cb: EffectListener): () => void {
      effectListeners.add(cb)
      return () => {
        effectListeners.delete(cb)
      }
    },
    clear(): void {
      stepListeners.clear()
      effectListeners.clear()
    },
  }
}

/** 进程内模式：真实编排核跑在当前线程，post 回调直连事件总线 */
function createInProcessClient(options: OrchestratorClientOptions): OrchestratorClient {
  const bus = createEventBus()
  const handle = createOrchestratorWorker({ model: options.model, post: bus.route })
  attachObservability(handle.runtime)
  return {
    mode: "in-process",
    dispatch: (cmd, priority) => handle.runtime.dispatch(cmd, priority),
    cancel: (taskId) => handle.runtime.cancel(taskId),
    resume: (taskId, decision) => handle.runtime.resume(taskId, decision),
    onStep: bus.onStep,
    onEffect: bus.onEffect,
    dispose: bus.clear,
  }
}

/** worker 模式：真实线程执行；构造失败返回 null 由调用方降级 */
function createWorkerClient(): OrchestratorClient | null {
  if (typeof Worker === "undefined" || process.env.NODE_ENV === "test") return null
  let worker: Worker
  try {
    worker = new Worker(new URL("./orchestratorWorker.entry.ts", import.meta.url), {
      type: "module",
    })
  } catch (error) {
    telemetry.warn("orchestrator_client.worker_unavailable", {
      message: "Worker 构造失败，已降级进程内编排",
      data: { reason: error instanceof Error ? error.message : String(error) },
    })
    return null
  }
  const bus = createEventBus()
  const pendingReceipts: Array<(receipt: DispatchReceipt) => void> = []
  worker.onmessage = (event: MessageEvent) => {
    const message = event.data as WorkerOutboundMessage
    if (message.type === "receipt") {
      pendingReceipts.shift()?.({ taskId: message.taskId, traceId: message.traceId })
      return
    }
    bus.route(message)
  }
  return {
    mode: "worker",
    dispatch: (cmd, priority) =>
      new Promise<DispatchReceipt>((resolve) => {
        pendingReceipts.push(resolve)
        worker.postMessage({ type: "dispatch", command: cmd, priority })
      }),
    cancel: (taskId) => {
      worker.postMessage({ type: "cancel", taskId })
    },
    resume: (taskId, decision) => {
      worker.postMessage({ type: "resume", taskId, decision })
      return Promise.resolve()
    },
    onStep: bus.onStep,
    onEffect: bus.onEffect,
    dispose: () => {
      worker.terminate()
      bus.clear()
    },
  }
}

let singleton: OrchestratorClient | null = null

/** 获取编排客户端单例（惰性创建；UI 层唯一出口） */
export function getOrchestratorClient(options: OrchestratorClientOptions = {}): OrchestratorClient {
  if (singleton) return singleton
  singleton = createWorkerClient() ?? createInProcessClient(options)
  return singleton
}

/** 测试专用：释放单例（终止 worker / 清空监听），下次获取按新 options 重建 */
export function __resetOrchestratorClientForTests(): void {
  singleton?.dispose()
  singleton = null
}
