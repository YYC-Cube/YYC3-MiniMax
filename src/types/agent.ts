/**
 * file: agent.ts
 * description: Agent 统一契约（PR1）· 六元组 input/context/tools/output/trace/error 单一事实源
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [type],[port],[contract],[agent],[hexagonal]
 *
 * brief: 8 Agent 统一调用契约 + worker 消息边界运行时守卫（纯核零依赖，不依赖 UI/Next/react）
 *
 * details:
 * - 静态契约（类型）与运行时契约（is* 守卫）同居本文件：postMessage 跨线程边界
 *   无法依赖 TS 类型系统，守卫是消息合法性的唯一防线
 * - 与 types/ports.ts 的分工：本文件定义「被调用方」契约（Agent 是什么），
 *   ports.ts 定义「调用方」契约（编排如何使用 Agent/模型/队列）
 * - attempt 语义：0 起，复检轮次上限由 GATES.MAX_REVIEW_ROUNDS（domain/constants）
 *   在状态机层执行，本契约仅承载字段语义
 * - AGENT_ID_SET 与 data/agents.ts 档案的同步由契约测试锁定（tests/contracts）
 *
 * dependencies: types/index（仅类型）
 * exports: ReActStepId, REACT_STEP_IDS, RiskTag, ProviderKind, PROVIDER_KINDS, AgentErrorCode,
 *          AGENT_ERROR_CODES, DEFAULT_RETRYABLE_ERROR_CODES, TaskPriority, AgentCommand, TaskEnvelope,
 *          HumanDecision, AgentInput, AgentBudget, AgentContext, ToolResult, AgentTool, ToolRegistry,
 *          AgentOutput, AgentTrace, AgentError, AgentInvocation, AgentResult, AgentPort,
 *          isAgentId, isProviderKind, isValidReActStepId, isRiskTag, isAgentCommand,
 *          isAgentTrace, isAgentError, isAgentOutput, isAgentResult, isTaskEnvelope
 */

import type { AgentId, PipelineStageId } from "./index"

// ---------- 标识与枚举 ----------

/** ReAct-C 九步闭环步号（与 data/reactSteps.ts 的 step 字段一致，1 起） */
export type ReActStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

/** 九步步号全集（运行时校验常量表） */
export const REACT_STEP_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

/**
 * 已知风险标签（开放联合：`x-${string}` 为扩展位，跨会话新增风险须带 x- 前缀显式标注，
 * 不使用裸 string 以保留 IDE 补全与穷尽检查收益）
 */
export type RiskTag = "pii" | "jailbreak" | "politic" | "copyright" | "consistency" | "syncnet" | "budget" | "schema-drift" | "intent-spoof" | "feedback-poison" | `x-${string // PII 泄漏（智云·守护 S1/S8） // 越狱指令（S1） // 涉政涉暴（S1） // 版权素材（S5/S8） // 人物一致性门禁（S7） // 唇形吻合（S4/S7） // 预算/算力约束（S6） // 分镜 Schema 漂移（S3/S4） // 意图欺骗（S2） // 反哺投毒（S9）
  }`

/** 模型提供方：适配器可替换（本地推理 / vLLM / 模型 Registry / mock） */
export type ProviderKind = "local" | "vllm" | "registry" | "mock"

/** Provider 全集（运行时校验常量表） */
export const PROVIDER_KINDS = ["local", "vllm", "registry", "mock"] as const

/** Agent 错误码 */
export type AgentErrorCode = "MODEL_TIMEOUT" | "PROVIDER_REJECTED" | "TOOL_ERROR" | "BUDGET_EXCEEDED" | "GATE_FAIL" | "SAFETY_BLOCK" | "REVIEW_EXHAUSTED" // 模型推理超时/网络中断/5xx（默认可重试） // 提供方拒绝：4xx 鉴权/参数/内容策略（不可重试） // 工具调用失败（默认可重试） // Token/延迟预算超限（不可重试，需降级或改参） // 质量门禁不达标（回环语义由状态机处理，非重试语义） // 安全熔断（S1/S8 拒绝，不可重试） // 复检轮次耗尽（转人工接管）

/** 错误码全集（运行时校验常量表） */
export const AGENT_ERROR_CODES = [
  "MODEL_TIMEOUT",
  "PROVIDER_REJECTED",
  "TOOL_ERROR",
  "BUDGET_EXCEEDED",
  "GATE_FAIL",
  "SAFETY_BLOCK",
  "REVIEW_EXHAUSTED",
] as const

/** 默认可重试错误码：其余码默认不可重试（编排层可按部署覆写重试策略） */
export const DEFAULT_RETRYABLE_ERROR_CODES: ReadonlySet<AgentErrorCode> =
  new Set(["MODEL_TIMEOUT", "TOOL_ERROR"])

/** 任务优先级（队列调度用） */
export type TaskPriority = "P0" | "P1" | "P2"

// ---------- 六元组契约：input · context · tools · output · trace · error ----------

/** ① input：Agent 调用入参（taskId 为幂等键，traceId 贯穿全链路） */
export interface AgentInput {
  taskId: string
  traceId: string
  step: ReActStepId
  /** 复检轮次（0 起；Step7 不达标回环 Step5 时 +1，上限 GATES.MAX_REVIEW_ROUNDS） */
  attempt: number
  /** 上一步产物（含检查点快照引用） */
  payload: Record<string, unknown>
}

/** 执行预算约束 */
export interface AgentBudget {
  maxTokens: number
  maxLatencyMs: number
}

/** ② context：执行上下文（注入式，Agent 不自取环境） */
export interface AgentContext {
  agentId: AgentId
  /** RAG 注入 / 前序剧集记忆（只读） */
  memory: Readonly<Record<string, unknown>>
  budget: AgentBudget
  /** 本步需强制命中的风险标签 */
  riskPolicy: ReadonlyArray<RiskTag>
}

/** ③ tools：工具调用结果 */
export interface ToolResult {
  ok: boolean
  data?: unknown
  error?: AgentError
}

/** 单个工具（Agent 不直接持有实现，经 ToolRegistry 注入） */
export interface AgentTool {
  readonly name: string
  call(args: Record<string, unknown>): Promise<ToolResult>
}

/** 工具注册表（ports 注入，适配器可替换） */
export interface ToolRegistry {
  get(name: string): AgentTool | undefined
}

/** ④ output：Agent 产物 */
export interface AgentOutput {
  ok: boolean
  payload: Record<string, unknown>
  /** 门禁分（Step7 一致性 % / SyncNet 0-1 等；非门禁步可缺省 */
  score?: number
  tokensIn: number
  tokensOut: number
}

/** ⑤ trace：执行留痕（无论成败必带——可观测铁律） */
export interface AgentTrace {
  traceId: string
  taskId: string
  agentId: AgentId
  step: ReActStepId
  attempt: number
  /** 模型名（如 flux-pro-cinema） */
  model: string
  /** 提供方（local / vllm / registry / mock） */
  provider: ProviderKind
  latencyMs: number
  tokensIn: number
  tokensOut: number
  /** 命中/声明的风险标签 */
  riskTags: RiskTag[]
  /** ISO 8601 */
  startedAt: string
  /** ISO 8601 */
  endedAt: string
}

/** ⑥ error：失败语义（可重试 / 可回滚 / 可人工接管的判定依据） */
export interface AgentError {
  code: AgentErrorCode
  message: string
  retryable: boolean
  /** 回滚检查点目标步（如 Step7 门禁失败 → 回滚 Step5） */
  rollbackTo?: ReActStepId
}

/** 一次 Agent 调用的完整入参聚合 */
export interface AgentInvocation {
  input: AgentInput
  context: AgentContext
  tools: ToolRegistry
}

/** 一次 Agent 调用的完整结果：output/error 二选一或皆无，trace 必有 */
export interface AgentResult {
  output?: AgentOutput
  trace: AgentTrace
  error?: AgentError
}

/** 8 Agent 统一端口：全部实现此接口，编排层不感知具体 Agent 差异 */
export interface AgentPort {
  readonly id: AgentId
  readonly primaryStages: ReadonlyArray<PipelineStageId>
  run(invocation: AgentInvocation): Promise<AgentResult>
}

// ---------- 队列与人工接管契约 ----------

/** UI/外部系统下发的命令（UI 只发命令，不携带 UI 状态） */
export interface AgentCommand {
  /** 命令类型（如 'produce-episode' / 'query-quality'） */
  type: string
  payload: Record<string, unknown>
  issuedBy: "ui-widget" | "ui-quick-action" | "api" | "schedule"
}

/** 任务信封：跨线程（UI → worker）传递的最小完整任务描述 */
export interface TaskEnvelope {
  taskId: string
  traceId: string
  command: AgentCommand
  priority: TaskPriority
  attempt: number
  /** ISO 8601 入队时间 */
  enqueuedAt: string
}

/** 人工接管裁决（复检耗尽后 HUMAN_TAKEOVER 态的唯一出口） */
export interface HumanDecision {
  taskId: string
  traceId: string
  action: "rerun" | "rollback" | "abort"
  /** rerun/rollback 的目标步（缺省由状态机按检查点推导） */
  targetStep?: ReActStepId
  note?: string
  /** 裁决人标识（审计留痕） */
  decidedBy: string
}

// ---------- 运行时守卫（worker 消息边界唯一防线，纯函数零依赖） ----------

/** AgentId 全集：与 data/agents.ts 档案同步（契约测试锁定），types 纯核不 import data */
const AGENT_ID_SET: ReadonlySet<string> = new Set([
  "tianshu",
  "shouhu",
  "zongshi",
  "lingyun",
  "qianxing",
  "wanwu",
  "xianzhi",
  "bole",
])

const KNOWN_RISK_TAG_SET: ReadonlySet<string> = new Set([
  "pii",
  "jailbreak",
  "politic",
  "copyright",
  "consistency",
  "syncnet",
  "budget",
  "schema-drift",
  "intent-spoof",
  "feedback-poison",
])

const PROVIDER_KIND_SET: ReadonlySet<string> = new Set<string>(PROVIDER_KINDS)
const AGENT_ERROR_CODE_SET: ReadonlySet<string> = new Set<string>(
  AGENT_ERROR_CODES,
)
const TASK_PRIORITY_SET: ReadonlySet<string> = new Set(["P0", "P1", "P2"])
const STEP_ID_SET: ReadonlySet<number> = new Set<number>(REACT_STEP_IDS)

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0
}

function isNonNegativeNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0
}

/** 校验 AgentId 字符串（8 成员全集） */
export function isAgentId(v: unknown): v is AgentId {
  return typeof v === "string" && AGENT_ID_SET.has(v)
}

/** 校验 ProviderKind */
export function isProviderKind(v: unknown): v is ProviderKind {
  return typeof v === "string" && PROVIDER_KIND_SET.has(v)
}

/** 校验九步步号（整数 1..9，拒绝 '5'/1.5/10） */
export function isValidReActStepId(v: unknown): v is ReActStepId {
  return typeof v === "number" && Number.isInteger(v) && STEP_ID_SET.has(v)
}

/** 校验风险标签（已知标签或 x- 扩展位） */
export function isRiskTag(v: unknown): v is RiskTag {
  if (typeof v !== "string") return false
  return KNOWN_RISK_TAG_SET.has(v) || v.startsWith("x-")
}

/** 校验 AgentCommand */
export function isAgentCommand(v: unknown): v is AgentCommand {
  if (!isPlainObject(v)) return false
  const payload = v["payload"]
  return isNonEmptyString(v["type"]) && isPlainObject(payload)
}

/** 校验 AgentTrace（全字段强校验：跨线程留痕不可有半合法态） */
export function isAgentTrace(v: unknown): v is AgentTrace {
  if (!isPlainObject(v)) return false
  const riskTags = v["riskTags"]
  return (
    isNonEmptyString(v["traceId"]) &&
    isNonEmptyString(v["taskId"]) &&
    isAgentId(v["agentId"]) &&
    isValidReActStepId(v["step"]) &&
    typeof v["attempt"] === "number" &&
    Number.isInteger(v["attempt"]) &&
    v["attempt"] >= 0 &&
    isNonEmptyString(v["model"]) &&
    isProviderKind(v["provider"]) &&
    isNonNegativeNumber(v["latencyMs"]) &&
    isNonNegativeNumber(v["tokensIn"]) &&
    isNonNegativeNumber(v["tokensOut"]) &&
    Array.isArray(riskTags) &&
    riskTags.every(isRiskTag) &&
    isNonEmptyString(v["startedAt"]) &&
    isNonEmptyString(v["endedAt"])
  )
}

/** 校验 AgentError */
export function isAgentError(v: unknown): v is AgentError {
  if (!isPlainObject(v)) return false
  const code = v["code"]
  const rollbackTo = v["rollbackTo"]
  if (typeof code !== "string" || !AGENT_ERROR_CODE_SET.has(code)) return false
  if (typeof v["retryable"] !== "boolean") return false
  if (rollbackTo !== undefined && !isValidReActStepId(rollbackTo)) return false
  return isNonEmptyString(v["message"])
}

/** 校验 AgentOutput */
export function isAgentOutput(v: unknown): v is AgentOutput {
  if (!isPlainObject(v)) return false
  if (typeof v["ok"] !== "boolean") return false
  if (!isPlainObject(v["payload"])) return false
  const score = v["score"]
  if (
    score !== undefined &&
    (typeof score !== "number" || !Number.isFinite(score))
  )
    return false
  return (
    isNonNegativeNumber(v["tokensIn"]) && isNonNegativeNumber(v["tokensOut"])
  )
}

/** 校验 AgentResult（trace 必带；output/error 存在时必须各自合法） */
export function isAgentResult(v: unknown): v is AgentResult {
  if (!isPlainObject(v)) return false
  if (!isAgentTrace(v["trace"])) return false
  if (v["output"] !== undefined && !isAgentOutput(v["output"])) return false
  if (v["error"] !== undefined && !isAgentError(v["error"])) return false
  return true
}

/** 校验 TaskEnvelope（UI → worker 消息边界） */
export function isTaskEnvelope(v: unknown): v is TaskEnvelope {
  if (!isPlainObject(v)) return false
  const priority = v["priority"]
  if (typeof priority !== "string" || !TASK_PRIORITY_SET.has(priority))
    return false
  if (
    typeof v["attempt"] !== "number" ||
    !Number.isInteger(v["attempt"]) ||
    v["attempt"] < 0
  )
    return false
  return (
    isNonEmptyString(v["taskId"]) &&
    isNonEmptyString(v["traceId"]) &&
    isNonEmptyString(v["enqueuedAt"]) &&
    isAgentCommand(v["command"])
  )
}

const HUMAN_DECISION_ACTION_SET: ReadonlySet<string> = new Set([
  "rerun",
  "rollback",
  "abort",
])

/** 校验 HumanDecision（人工接管裁决，worker resume 消息边界） */
export function isHumanDecision(v: unknown): v is HumanDecision {
  if (!isPlainObject(v)) return false
  const action = v["action"]
  const targetStep = v["targetStep"]
  const note = v["note"]
  if (
    typeof action !== "string" ||
    !HUMAN_DECISION_ACTION_SET.has(action)
  )
    return false
  if (targetStep !== undefined && !isValidReActStepId(targetStep)) return false
  if (note !== undefined && typeof note !== "string") return false
  return (
    isNonEmptyString(v["taskId"]) &&
    isNonEmptyString(v["traceId"]) &&
    isNonEmptyString(v["decidedBy"])
  )
}
