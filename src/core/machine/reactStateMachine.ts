/**
 * file: reactStateMachine.ts
 * description: ReAct-C 九步闭环状态机（PR3）· 纯函数 reducer，零 UI/零框架依赖
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [core],[machine],[react-c],[state],[orchestration]
 *
 * brief: 九步顺序推进 + Step7 门禁回环 Step5（复检 ≤ GATES.MAX_REVIEW_ROUNDS 轮）+
 *        可重试错误原地重试（≤ MAX_AGENT_RETRIES 次）+ 人工接管可恢复 + 四类终态
 *
 * details:
 * - 纯函数 reducer：无 IO、无计时器、无遥测副作用；可观测诉求以 MachineEffect
 *   描述符返回，由 PR4 运行时翻译为 telemetry audit/metric（留痕不在核内发生）
 * - 复检语义：attempt = 已消耗的回环轮次；S7 门禁失败时 attempt < MAX_REVIEW_ROUNDS
 *   则回环 S5 并 attempt+1，否则进入 human-takeover（即复检轮次硬上限 2）
 * - 门禁评估仅发生在 S7：output.score < GATES.CONSISTENCY 或 error.code = GATE_FAIL；
 *   其他步收到 GATE_FAIL 走通用错误路径（回滚/失败）
 * - 迟到结果防御：STEP_RESULT 的 trace.step 与当前步不一致时丢弃（不改状态）
 * - 状态与事件类型全部用具名接口声明（规避 oxfmt 对内联多成员类型字面量的
 *   分隔符吞并缺陷，见 2026-10-16 format 事故）
 *
 * dependencies: domain/constants（GATES）, types/agent（仅类型）
 * exports: MAX_AGENT_RETRIES, INITIAL_REACT_STATE, isTerminal, reduceReAct 及全部状态/事件/效应类型
 */

import { GATES } from "../../domain/constants"
import type { AgentResult, ReActStepId } from "../../types/agent"

/** 同一步可重试错误的最大瞬时重试次数（耗尽后回滚或失败） */
export const MAX_AGENT_RETRIES = 2

/** 回环目标步：S7 门禁失败重做起点 */
const LOOPBACK_TARGET_STEP = 5

// ---------- 状态 ----------

export interface IdleState {
  phase: "idle"
}

export interface RunningState {
  phase: "running"
  step: ReActStepId
  /** 已消耗的复检轮次（回环次数），上限 GATES.MAX_REVIEW_ROUNDS */
  attempt: number
  /** 当前步瞬时重试计数（步推进/回环时归零） */
  retryCount: number
}

export interface HumanTakeoverState {
  phase: "human-takeover"
  step: ReActStepId
  attempt: number
  reason: string
  traceId: string
}

export interface DoneState {
  phase: "done"
}

export interface FailedState {
  phase: "failed"
  code: string
  message: string
}

export interface RolledBackState {
  phase: "rolled-back"
  toStep: ReActStepId
  reason: string
}

export interface CancelledState {
  phase: "cancelled"
}

export type ReActMachineState =
  | IdleState
  | RunningState
  | HumanTakeoverState
  | DoneState
  | FailedState
  | RolledBackState
  | CancelledState

// ---------- 事件 ----------

export interface StartEvent {
  type: "START"
}

export interface CancelEvent {
  type: "CANCEL"
}

export interface StepResultEvent {
  type: "STEP_RESULT"
  result: AgentResult
}

export type HumanDecisionAction = "rerun" | "rollback" | "abort"

export interface HumanDecisionEvent {
  type: "HUMAN_DECISION"
  action: HumanDecisionAction
  targetStep?: ReActStepId
}

export type ReActMachineEvent = StartEvent | CancelEvent | StepResultEvent | HumanDecisionEvent

// ---------- 效应（可观测描述符，由运行时翻译为遥测） ----------

export interface LoopbackEffect {
  kind: "loopback"
  fromStep: ReActStepId
  toStep: ReActStepId
  attempt: number
  traceId: string
}

export interface RetryEffect {
  kind: "retry"
  step: ReActStepId
  retryCount: number
  traceId: string
}

export interface TakeoverEffect {
  kind: "takeover-required"
  step: ReActStepId
  attempt: number
  reason: string
  traceId: string
}

export type TerminalPhase = "done" | "failed" | "rolled-back" | "cancelled"

export interface TerminalEffect {
  kind: "terminal"
  phase: TerminalPhase
  traceId?: string
}

export type MachineEffect = LoopbackEffect | RetryEffect | TakeoverEffect | TerminalEffect

export interface ReActTransition {
  state: ReActMachineState
  effects: MachineEffect[]
}

/** 初始状态 */
export const INITIAL_REACT_STATE: ReActMachineState = { phase: "idle" }

/** 终态联合（isTerminal 谓词的窄化目标） */
export type TerminalMachineState = DoneState | FailedState | RolledBackState | CancelledState

/** 是否处于任一终态（不可再转移；谓词签名供编排循环窄化使用） */
export function isTerminal(state: ReActMachineState): state is TerminalMachineState {
  return (
    state.phase === "done" ||
    state.phase === "failed" ||
    state.phase === "rolled-back" ||
    state.phase === "cancelled"
  )
}

/**
 * 九步状态机 reducer（纯函数）
 * - 无效事件（如 idle 期 STEP_RESULT、running 期 HUMAN_DECISION）幂等忽略
 * - 终态幂等：任何事件均不改状态
 */
export function reduceReAct(state: ReActMachineState, event: ReActMachineEvent): ReActTransition {
  switch (state.phase) {
    case "idle":
      if (event.type === "START") {
        return { state: { phase: "running", step: 1, attempt: 0, retryCount: 0 }, effects: [] }
      }
      return { state, effects: [] }
    case "running":
      return reduceRunning(state, event)
    case "human-takeover":
      return reduceTakeover(state, event)
    default:
      return { state, effects: [] }
  }
}

// ---------- 内部转移实现 ----------

function reduceRunning(state: RunningState, event: ReActMachineEvent): ReActTransition {
  if (event.type === "CANCEL") {
    return { state: { phase: "cancelled" }, effects: [terminal("cancelled")] }
  }
  if (event.type !== "STEP_RESULT") {
    return { state, effects: [] }
  }
  const result = event.result
  // 迟到/错投结果防御：结果步与当前步不一致时丢弃
  if (result.trace.step !== state.step) {
    return { state, effects: [] }
  }
  const traceId = result.trace.traceId

  // 1) 门禁评估（仅 S7）：分数不达标或 Agent 显式上报 GATE_FAIL
  if (isGateFailure(state.step, result)) {
    if (state.attempt < GATES.MAX_REVIEW_ROUNDS) {
      const attempt = state.attempt + 1
      return {
        state: { phase: "running", step: LOOPBACK_TARGET_STEP, attempt, retryCount: 0 },
        effects: [
          { kind: "loopback", fromStep: state.step, toStep: LOOPBACK_TARGET_STEP, attempt, traceId },
        ],
      }
    }
    return takeover(state, traceId, gateFailReason(result))
  }

  // 2) 错误路径：接管 > 可重试 > 回滚/失败
  const error = result.error
  if (error) {
    if (error.code === "REVIEW_EXHAUSTED") {
      return takeover(state, traceId, error.message)
    }
    if (error.retryable && state.retryCount < MAX_AGENT_RETRIES) {
      const retryCount = state.retryCount + 1
      return {
        state: { phase: "running", step: state.step, attempt: state.attempt, retryCount },
        effects: [{ kind: "retry", step: state.step, retryCount, traceId }],
      }
    }
    if (error.rollbackTo !== undefined) {
      return rolledBack(error.rollbackTo, error.message, traceId)
    }
    return failed(error.code, error.message, traceId)
  }

  // 3) 成功路径：output 与 error 皆无属契约违规
  if (!result.output) {
    return failed("EMPTY_RESULT", "AgentResult 缺少 output 与 error（契约违规）", traceId)
  }
  if (state.step === 9) {
    return { state: { phase: "done" }, effects: [terminal("done", traceId)] }
  }
  const nextStep = (state.step + 1) as ReActStepId
  return {
    state: { phase: "running", step: nextStep, attempt: state.attempt, retryCount: 0 },
    effects: [],
  }
}

function reduceTakeover(state: HumanTakeoverState, event: ReActMachineEvent): ReActTransition {
  if (event.type === "CANCEL") {
    return { state: { phase: "cancelled" }, effects: [terminal("cancelled", state.traceId)] }
  }
  if (event.type !== "HUMAN_DECISION") {
    return { state, effects: [] }
  }
  if (event.action === "rerun") {
    const step = event.targetStep ?? LOOPBACK_TARGET_STEP
    return { state: { phase: "running", step, attempt: 0, retryCount: 0 }, effects: [] }
  }
  if (event.action === "rollback") {
    return rolledBack(event.targetStep ?? LOOPBACK_TARGET_STEP, "人工裁决回滚", state.traceId)
  }
  return failed("HUMAN_ABORTED", "人工裁决终止", state.traceId)
}

// ---------- 判定与构造辅助 ----------

/** S7 门禁失败判定：GATE_FAIL 错误，或 score 低于一致性门禁阈值 */
function isGateFailure(step: ReActStepId, result: AgentResult): boolean {
  if (step !== 7) return false
  if (result.error?.code === "GATE_FAIL") return true
  const score = result.output?.score
  return score !== undefined && score < GATES.CONSISTENCY
}

/** 门禁失败原因（供 takeover 态展示） */
function gateFailReason(result: AgentResult): string {
  if (result.error) return result.error.message
  return `门禁分 ${result.output?.score} 低于阈值 ${GATES.CONSISTENCY}`
}

function takeover(state: RunningState, traceId: string, reason: string): ReActTransition {
  return {
    state: { phase: "human-takeover", step: state.step, attempt: state.attempt, reason, traceId },
    effects: [
      { kind: "takeover-required", step: state.step, attempt: state.attempt, reason, traceId },
    ],
  }
}

function rolledBack(toStep: ReActStepId, reason: string, traceId: string): ReActTransition {
  return {
    state: { phase: "rolled-back", toStep, reason },
    effects: [terminal("rolled-back", traceId)],
  }
}

function failed(code: string, message: string, traceId: string): ReActTransition {
  return {
    state: { phase: "failed", code, message },
    effects: [terminal("failed", traceId)],
  }
}

function terminal(phase: TerminalPhase, traceId?: string): TerminalEffect {
  return { kind: "terminal", phase, traceId }
}
