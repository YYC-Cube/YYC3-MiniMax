/**
 * file: ports.ts
 * description: 六边形端口契约（评分卡 P0-2 + PR1 编排解耦）· 服务适配器结构契约的单一事实源
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [type],[port],[hexagonal],[contract],[orchestration]
 *
 * brief: 端口（接口）居于 types 纯核，适配器居于 services——依赖方向恒为 services → types
 *
 * details:
 * - 每个 Port 以「结构类型」独立声明于本文件，与 services 实现类型**有意保持物理分离**：
 *   契约测试（tests/contracts/ports.contract.test.ts）以结构兼容断言 + 行为断言双向锁死，
 *   实现 drift 时契约测试先行失败，端口消费者（未来 LLM 网关/采集后端）不被波及
 * - 接真实后端时仅替换适配器实现，端口签名不变（评分卡「Agent 接口统一」的类型基石）
 * - PR1 追加 Port 5-7（编排侧调用方契约）：与 types/agent.ts（被调用方契约）配套——
 *   所有 Agent 调用模型走 ModelPort（适配器可替换 local/vLLM/Registry），
 *   UI 只经 OrchestratorPort.dispatch 发命令，worker 经 TaskQueuePort 执行与回流
 *
 * dependencies: types/index, types/agent（仅类型）
 * exports: EventStreamPort*, TelemetrySinkPort*, PiiGatewayPort*, AgentReplyPort*,
 *          ModelRequest, ModelResponse, ModelPort, DispatchReceipt, OrchestratorPort, TaskQueuePort
 */

import type {
  AgentCommand,
  AgentResult,
  HumanDecision,
  ProviderKind,
  TaskEnvelope,
} from "./agent"
import type { LogItem } from "./index"

// ---------- Port 1: 实时事件流（适配器 services/eventStream.ts#createEventStream） ----------

export type EventStreamPortMode = "live" | "simulated"

export interface EventStreamPortOptions {
  /** 网关 WebSocket 地址；缺省时端口实现必须以模拟流降级（高可用契约） */
  url?: string
  onEvent: (log: LogItem) => void
  onModeChange?: (mode: EventStreamPortMode) => void
  /** 模拟流节拍（ms） */
  intervalMs?: number
}

export interface EventStreamPortHandle {
  /** 关闭后不再有任何事件回调（资源释放契约） */
  close(): void
}

export type EventStreamPort = (
  options: EventStreamPortOptions,
) => EventStreamPortHandle

// ---------- Port 2: 遥测汇点（适配器 services/telemetry.ts#addTelemetrySink） ----------

export type TelemetryPortLevel = "debug" | "info" | "warn" | "error"

export interface TelemetryPortEvent {
  /** ISO 8601 */
  timestamp: string
  level: TelemetryPortLevel
  /** 点分事件名 */
  event: string
  message?: string
  traceId?: string
  data?: Record<string, unknown>
}

export type TelemetrySinkPort = (event: TelemetryPortEvent) => void

// ---------- Port 3: PII 受控网关（适配器 services/piiReveal.ts#revealPiiRaw） ----------

export interface PiiPortPayload {
  raw: string
}

/** 异步按次调取契约；403/不可达必须拒绝或显式降级，禁止静默返回空原文 */
export type PiiGatewayPort = (logId: string) => Promise<PiiPortPayload>

// ---------- Port 4: Agent 语义路由（适配器 services/agentReply.ts#resolveAgentReply） ----------

export type AgentPortIntent = "quality" | "production" | "cost" | "fallback"

export interface AgentPortReply {
  intent: AgentPortIntent
  text: string
}

export interface AgentPortResolveOptions {
  activeAgentName: string
}

/** 纯函数语义路由契约：接真实 LLM 时仅替换适配器 */
export type AgentReplyPort = (
  text: string,
  options: AgentPortResolveOptions,
) => AgentPortReply

// ---------- Port 5: 模型推理网关（适配器：本地推理 / vLLM / 模型 Registry / mock） ----------

export interface ModelRequest {
  traceId: string
  model: string
  system: string
  messages: ReadonlyArray<{ role: 'user' | 'assistant'; content: string }>
  maxTokens: number
  temperature?: number
}

export interface ModelResponse {
  text: string
  tokensIn: number
  tokensOut: number
  latencyMs: number
  /** 实际应答模型（Registry 路由可能与请求模型不同，留痕以实际为准） */
  model: string
}

/** 所有 Agent 调用模型的唯一出口；换后端只换适配器实现，签名冻结 */
export interface ModelPort {
  readonly provider: ProviderKind
  complete(req: ModelRequest): Promise<ModelResponse>
}

// ---------- Port 6: 编排器（UI 只发命令，不感知执行细节） ----------

/** dispatch 受理回执：taskId 幂等键 + traceId 全链路追踪锚点 */
export interface DispatchReceipt {
  taskId: string
  traceId: string
}

export interface OrchestratorPort {
  /** UI/外部系统唯一入口：仅发命令，返回受理回执 */
  dispatch(cmd: AgentCommand): Promise<DispatchReceipt>
  /** 取消执行中的任务（幂等：不存在/已终态为 no-op） */
  cancel(taskId: string): void
  /** 人工接管续跑（复检耗尽 HUMAN_TAKEOVER 态的唯一出口） */
  resume(taskId: string, decision: HumanDecision): Promise<void>
}

// ---------- Port 7: 任务队列（与 Agent 解耦：worker 执行，事件回流） ----------

export interface TaskQueuePort {
  enqueue(task: TaskEnvelope): void
  /** 订阅执行结果，返回退订函数 */
  onResult(cb: (result: AgentResult) => void): () => void
  /** 当前积压任务数（观测/告警用） */
  size(): number
}
