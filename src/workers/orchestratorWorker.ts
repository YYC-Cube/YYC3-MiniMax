/**
 * file: orchestratorWorker.ts（src/workers）
 * description: 编排 worker 桥（PR4）· core 编排核 ↔ UI 消息边界
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [workers],[bridge],[orchestration],[message-protocol]
 *
 * brief: UI 只发命令消息（dispatch/cancel/resume/ping），worker 回流
 *        receipt/step/effect/error/pong——结构化消息，不共享引用
 *
 * details:
 * - 入站守卫：isAgentCommand / isHumanDecision（types/agent 运行时守卫），
 *   非法消息回 error 而非静默丢弃（可观测铁律）
 * - 默认装配：createModelPort()（env 驱动 mock/local/vLLM/Registry）+
 *   SIM Milvus 工具（S3 可通），PR6 起由 UI 侧注入真实端口
 * - 传输无关：post 回调注入（测试直连 / worker scope 接线两用）；
 *   installWorkerMessaging 供 PR6 的 worker 入口 self 接线
 *
 * dependencies: core/agents, core/runtime/orchestrator, core/machine, services/adapters, types
 * exports: WorkerInboundMessage, WorkerOutboundMessage, WorkerScope, OrchestratorWorkerOptions,
 *          OrchestratorWorkerHandle, createOrchestratorWorker, installWorkerMessaging
 */

import { createAgentRegistry } from "../core/agents"
import type { MachineEffect } from "../core/machine/reactStateMachine"
import type { OrchestratorRuntime } from "../core/runtime/orchestrator"
import { createOrchestrator } from "../core/runtime/orchestrator"
import { createModelPort } from "../services/adapters"
import { isAgentCommand, isHumanDecision } from "../types/agent"
import type { AgentCommand, AgentResult, HumanDecision, TaskPriority } from "../types/agent"
import type { ModelPort } from "../types/ports"

// ---------- 消息协议 ----------

export interface DispatchMessage {
  type: "dispatch"
  command: AgentCommand
  priority?: TaskPriority
}

export interface CancelMessage {
  type: "cancel"
  taskId: string
}

export interface ResumeMessage {
  type: "resume"
  taskId: string
  decision: HumanDecision
}

export interface PingMessage {
  type: "ping"
}

export type WorkerInboundMessage = DispatchMessage | CancelMessage | ResumeMessage | PingMessage

export interface ReceiptMessage {
  type: "receipt"
  taskId: string
  traceId: string
}

export interface StepMessage {
  type: "step"
  result: AgentResult
}

export interface EffectMessage {
  type: "effect"
  effect: MachineEffect
  taskId: string
  traceId: string
}

export interface ErrorMessage {
  type: "error"
  message: string
  taskId?: string
}

export interface PongMessage {
  type: "pong"
}

export type WorkerOutboundMessage = ReceiptMessage | StepMessage | EffectMessage | ErrorMessage | PongMessage

/** worker 侧消息接收端抽象（DedicatedWorkerGlobalScope 的最小结构子集） */
export interface WorkerScope {
  postMessage(data: WorkerOutboundMessage): void
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void
}

export interface OrchestratorWorkerOptions {
  model?: ModelPort
  post?: (message: WorkerOutboundMessage) => void
}

export interface OrchestratorWorkerHandle {
  runtime: OrchestratorRuntime
  /** 处理一条入站消息（守卫 + 分发；传输无关，测试直调） */
  handleIncoming(data: unknown): void
}

/** SIM 模式 Milvus 工具：未接真实检索时保证 S3 可通（与 eventStream SIM 哲学一致） */
function simMilvusTool() {
  return {
    name: "milvus.hybrid_search",
    async call() {
      return { ok: true, data: { hits: 0, note: "SIM 演示检索（未接真实 Milvus）" } }
    },
  }
}

/**
 * 创建编排 worker 桥：装配真实 8 Agent 注册表 + env 驱动模型端口 + SIM 工具，
 * 结果/效应经 post 回调流出（默认丢弃——测试与 installWorkerMessaging 必须显式提供）
 */
export function createOrchestratorWorker(options: OrchestratorWorkerOptions = {}): OrchestratorWorkerHandle {
  const post = options.post ?? (() => undefined)
  const runtime = createOrchestrator({
    agents: createAgentRegistry(options.model ?? createModelPort()),
    tools: { get: (name) => (name === "milvus.hybrid_search" ? simMilvusTool() : undefined) },
  })
  runtime.onStep((result) => post({ type: "step", result }))
  runtime.onEffect((effect, ctx) =>
    post({ type: "effect", effect, taskId: ctx.taskId, traceId: ctx.traceId }),
  )

  return {
    runtime,
    handleIncoming(data: unknown): void {
      if (typeof data !== "object" || data === null) {
        post({ type: "error", message: "非法 worker 消息（非对象）" })
        return
      }
      const type = (data as { type?: unknown }).type
      if (type === "dispatch") {
        const command = (data as { command?: unknown }).command
        if (!isAgentCommand(command)) {
          post({ type: "error", message: "dispatch 消息缺少合法 command" })
          return
        }
        const priority = (data as { priority?: unknown }).priority
        const safePriority: TaskPriority =
          priority === "P0" || priority === "P2" ? priority : "P1"
        void runtime
          .dispatch(command, safePriority)
          .then((receipt) => post({ type: "receipt", taskId: receipt.taskId, traceId: receipt.traceId }))
        return
      }
      if (type === "cancel") {
        const taskId = (data as { taskId?: unknown }).taskId
        if (typeof taskId !== "string" || !taskId) {
          post({ type: "error", message: "cancel 消息缺少合法 taskId" })
          return
        }
        runtime.cancel(taskId)
        return
      }
      if (type === "resume") {
        const taskId = (data as { taskId?: unknown }).taskId
        const decision = (data as { decision?: unknown }).decision
        if (typeof taskId !== "string" || !taskId || !isHumanDecision(decision)) {
          post({ type: "error", message: "resume 消息缺少合法 taskId/decision" })
          return
        }
        void runtime.resume(taskId, decision)
        return
      }
      if (type === "ping") {
        post({ type: "pong" })
        return
      }
      post({ type: "error", message: `未知消息类型: ${String(type)}` })
    },
  }
}

/** 将 worker 桥接到真实消息端点（PR6 的 worker 入口 self 接线用） */
export function installWorkerMessaging(
  scope: WorkerScope,
  options?: OrchestratorWorkerOptions,
): OrchestratorWorkerHandle {
  const handle = createOrchestratorWorker({
    ...options,
    post: options?.post ?? ((message) => scope.postMessage(message)),
  })
  scope.addEventListener("message", (event) => handle.handleIncoming(event.data))
  return handle
}
