/**
 * file: reactStateMachine.test.ts
 * description: ReAct-C 九步状态机单测（PR3）· 转移表穷举/回环≤2轮/重试/人工接管/终态幂等
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[core],[machine],[react-c]
 *
 * test-target: core/machine/reactStateMachine
 * notes: 每个转移分支（含守卫的操作数真假双向）至少一条断言，覆盖率对齐棘轮（≥96/87/93/94）
 */

import { describe, expect, it } from "vitest"
import {
  INITIAL_REACT_STATE,
  MAX_AGENT_RETRIES,
  isTerminal,
  reduceReAct,
  type HumanTakeoverState,
  type RunningState,
} from "../src/core/machine/reactStateMachine"
import { GATES } from "../src/domain/constants"
import type { AgentError, AgentResult, AgentTrace, ReActStepId } from "../src/types/agent"

// ---------- 夹具 ----------

function tr(step: ReActStepId, attempt = 0): AgentTrace {
  return {
    traceId: "trace-sm-1",
    taskId: "task-sm-1",
    agentId: "zongshi",
    step,
    attempt,
    model: "qwen-2.5-max-eval",
    provider: "mock",
    latencyMs: 100,
    tokensIn: 100,
    tokensOut: 10,
    riskTags: ["consistency"],
    startedAt: "2026-10-16T08:00:00.000Z",
    endedAt: "2026-10-16T08:00:00.100Z",
  }
}

function ok(step: ReActStepId, attempt = 0): AgentResult {
  return { trace: tr(step, attempt), output: { ok: true, payload: {}, tokensIn: 1, tokensOut: 1 } }
}

function gate(score: number, attempt = 0): AgentResult {
  return {
    trace: tr(7, attempt),
    output: { ok: false, payload: {}, score, tokensIn: 1, tokensOut: 1 },
  }
}

function err(step: ReActStepId, error: AgentError): AgentResult {
  return { trace: tr(step), error }
}

function started(): RunningState {
  const transition = reduceReAct(INITIAL_REACT_STATE, { type: "START" })
  return transition.state as RunningState
}

function running(step: ReActStepId, attempt = 0, retryCount = 0): RunningState {
  return { phase: "running", step, attempt, retryCount }
}

const TIMEOUT: AgentError = { code: "MODEL_TIMEOUT", message: "推理超时", retryable: true }

// ---------- 启动与无效事件 ----------

describe("状态机：启动与无效事件幂等", () => {
  it("idle + START → running step1 attempt0 retry0", () => {
    const transition = reduceReAct(INITIAL_REACT_STATE, { type: "START" })
    expect(transition.state).toEqual({ phase: "running", step: 1, attempt: 0, retryCount: 0 })
    expect(transition.effects).toEqual([])
  })

  it("idle + STEP_RESULT / CANCEL / HUMAN_DECISION → 状态不变", () => {
    expect(reduceReAct(INITIAL_REACT_STATE, { type: "STEP_RESULT", result: ok(1) }).state).toBe(
      INITIAL_REACT_STATE,
    )
    expect(reduceReAct(INITIAL_REACT_STATE, { type: "CANCEL" }).state).toBe(INITIAL_REACT_STATE)
    expect(
      reduceReAct(INITIAL_REACT_STATE, { type: "HUMAN_DECISION", action: "abort" }).state,
    ).toBe(INITIAL_REACT_STATE)
  })

  it("running + START / HUMAN_DECISION → 状态不变", () => {
    const state = started()
    expect(reduceReAct(state, { type: "START" }).state).toBe(state)
    expect(reduceReAct(state, { type: "HUMAN_DECISION", action: "rerun" }).state).toBe(state)
  })

  it("running + CANCEL → cancelled + terminal 效应（无 traceId）", () => {
    const transition = reduceReAct(started(), { type: "CANCEL" })
    expect(transition.state).toEqual({ phase: "cancelled" })
    expect(transition.effects).toEqual([{ kind: "terminal", phase: "cancelled" }])
  })

  it("isTerminal：终态为真，非终态为假", () => {
    expect(isTerminal({ phase: "done" })).toBe(true)
    expect(isTerminal({ phase: "failed", code: "X", message: "m" })).toBe(true)
    expect(isTerminal({ phase: "rolled-back", toStep: 5, reason: "r" })).toBe(true)
    expect(isTerminal({ phase: "cancelled" })).toBe(true)
    expect(isTerminal(INITIAL_REACT_STATE)).toBe(false)
    expect(isTerminal(started())).toBe(false)
  })
})

// ---------- 顺序推进 ----------

describe("状态机：九步顺序推进", () => {
  it("ok 结果推进下一步且 retryCount 归零", () => {
    const transition = reduceReAct(running(2, 0, 1), { type: "STEP_RESULT", result: ok(2) })
    expect(transition.state).toEqual({ phase: "running", step: 3, attempt: 0, retryCount: 0 })
  })

  it("step9 ok → done + terminal 效应（含 traceId）", () => {
    const transition = reduceReAct(running(9), { type: "STEP_RESULT", result: ok(9) })
    expect(transition.state).toEqual({ phase: "done" })
    expect(transition.effects).toEqual([{ kind: "terminal", phase: "done", traceId: "trace-sm-1" }])
  })

  it("迟到结果防御：trace.step 与当前步不一致 → 丢弃", () => {
    const state = running(5)
    expect(reduceReAct(state, { type: "STEP_RESULT", result: ok(7) }).state).toBe(state)
  })

  it("output 与 error 皆无 → failed EMPTY_RESULT", () => {
    const transition = reduceReAct(running(5), { type: "STEP_RESULT", result: { trace: tr(5) } })
    expect(transition.state).toEqual({
      phase: "failed",
      code: "EMPTY_RESULT",
      message: "AgentResult 缺少 output 与 error（契约违规）",
    })
  })
})

// ---------- 门禁回环（S7 专有） ----------

describe("状态机：Step7 门禁回环（复检 ≤ 2 轮）", () => {
  it("门禁分低于阈值且 attempt < 2 → 回环 S5，attempt+1 + loopback 效应", () => {
    const transition = reduceReAct(running(7, 0), { type: "STEP_RESULT", result: gate(74.8) })
    expect(transition.state).toEqual({ phase: "running", step: 5, attempt: 1, retryCount: 0 })
    expect(transition.effects).toEqual([
      { kind: "loopback", fromStep: 7, toStep: 5, attempt: 1, traceId: "trace-sm-1" },
    ])
  })

  it("attempt 已达上限（2）→ human-takeover + takeover-required 效应，reason 含分数与阈值", () => {
    const transition = reduceReAct(running(7, 2), { type: "STEP_RESULT", result: gate(74.8, 2) })
    expect(transition.state.phase).toBe("human-takeover")
    expect(transition.state).toMatchObject({ step: 7, attempt: 2, traceId: "trace-sm-1" })
    const reason = (transition.state as { reason: string }).reason
    expect(reason).toContain("74.8")
    expect(reason).toContain(String(GATES.CONSISTENCY))
    expect(transition.effects[0]).toMatchObject({
      kind: "takeover-required",
      step: 7,
      attempt: 2,
      traceId: "trace-sm-1",
    })
  })

  it("GATE_FAIL 错误在 S7 → 同样回环（错误消息留痕于轮次耗尽时）", () => {
    const gateFail: AgentError = {
      code: "GATE_FAIL",
      message: "一致性 79.9% 未达标",
      retryable: false,
    }
    const loop = reduceReAct(running(7, 0), { type: "STEP_RESULT", result: err(7, gateFail) })
    expect(loop.state).toEqual({ phase: "running", step: 5, attempt: 1, retryCount: 0 })

    const exhaust = reduceReAct(running(7, 2), { type: "STEP_RESULT", result: err(7, gateFail) })
    expect(exhaust.state).toMatchObject({ phase: "human-takeover", reason: "一致性 79.9% 未达标" })
  })

  it("GATE_FAIL 错误在非 S7 → 走通用错误路径（无 rollbackTo → failed）", () => {
    const gateFail: AgentError = { code: "GATE_FAIL", message: "非门禁步不允许 GATE_FAIL", retryable: false }
    const transition = reduceReAct(running(4), { type: "STEP_RESULT", result: err(4, gateFail) })
    expect(transition.state).toEqual({
      phase: "failed",
      code: "GATE_FAIL",
      message: "非门禁步不允许 GATE_FAIL",
    })
  })

  it("门禁分达标（score ≥ 阈值）→ 正常推进 S8", () => {
    const transition = reduceReAct(running(7), { type: "STEP_RESULT", result: gate(91.4) })
    expect(transition.state).toEqual({ phase: "running", step: 8, attempt: 0, retryCount: 0 })
  })

  it("S7 无 score（score 缺失）→ 门禁不可评估，按通过推进", () => {
    const transition = reduceReAct(running(7), { type: "STEP_RESULT", result: ok(7) })
    expect(transition.state).toEqual({ phase: "running", step: 8, attempt: 0, retryCount: 0 })
  })
})

// ---------- 错误与重试 ----------

describe("状态机：错误路径与瞬时重试", () => {
  it("可重试错误且 retryCount < MAX → 原步重试，retryCount+1 + retry 效应", () => {
    const transition = reduceReAct(running(2), { type: "STEP_RESULT", result: err(2, TIMEOUT) })
    expect(transition.state).toEqual({ phase: "running", step: 2, attempt: 0, retryCount: 1 })
    expect(transition.effects).toEqual([
      { kind: "retry", step: 2, retryCount: 1, traceId: "trace-sm-1" },
    ])
  })

  it("可重试错误且 retryCount 达 MAX → 有 rollbackTo 则回滚", () => {
    const e: AgentError = { ...TIMEOUT, rollbackTo: 3 }
    const transition = reduceReAct(running(4, 0, MAX_AGENT_RETRIES), {
      type: "STEP_RESULT",
      result: err(4, e),
    })
    expect(transition.state).toEqual({ phase: "rolled-back", toStep: 3, reason: "推理超时" })
    expect(transition.effects).toEqual([
      { kind: "terminal", phase: "rolled-back", traceId: "trace-sm-1" },
    ])
  })

  it("可重试错误且 retryCount 达 MAX 且无 rollbackTo → failed", () => {
    const transition = reduceReAct(running(4, 0, MAX_AGENT_RETRIES), {
      type: "STEP_RESULT",
      result: err(4, TIMEOUT),
    })
    expect(transition.state).toEqual({ phase: "failed", code: "MODEL_TIMEOUT", message: "推理超时" })
  })

  it("不可重试错误带 rollbackTo → rolled-back", () => {
    const e: AgentError = { code: "SAFETY_BLOCK", message: "输入含越狱指令，熔断", retryable: false, rollbackTo: 2 }
    const transition = reduceReAct(running(5), { type: "STEP_RESULT", result: err(5, e) })
    expect(transition.state).toEqual({ phase: "rolled-back", toStep: 2, reason: "输入含越狱指令，熔断" })
  })

  it("不可重试错误无 rollbackTo → failed", () => {
    const e: AgentError = { code: "BUDGET_EXCEEDED", message: "Token 预算超限", retryable: false }
    const transition = reduceReAct(running(6), { type: "STEP_RESULT", result: err(6, e) })
    expect(transition.state).toEqual({ phase: "failed", code: "BUDGET_EXCEEDED", message: "Token 预算超限" })
  })

  it("REVIEW_EXHAUSTED → 直接 human-takeover（错误消息为 reason）", () => {
    const e: AgentError = { code: "REVIEW_EXHAUSTED", message: "复检轮次耗尽", retryable: false }
    const transition = reduceReAct(running(7, 2), { type: "STEP_RESULT", result: err(7, e) })
    expect(transition.state).toMatchObject({ phase: "human-takeover", reason: "复检轮次耗尽" })
  })
})

// ---------- 人工接管 ----------

describe("状态机：人工接管恢复", () => {
  const takeoverState: HumanTakeoverState = {
    phase: "human-takeover",
    step: 7,
    attempt: 2,
    reason: "门禁不达标且复检耗尽",
    traceId: "trace-sm-1",
  }

  it("rerun（无 targetStep）→ 回到 S5，attempt 归零重开复检周期", () => {
    const transition = reduceReAct(takeoverState, { type: "HUMAN_DECISION", action: "rerun" })
    expect(transition.state).toEqual({ phase: "running", step: 5, attempt: 0, retryCount: 0 })
  })

  it("rerun 指定 targetStep=6 → 从 S6 重跑", () => {
    const transition = reduceReAct(takeoverState, {
      type: "HUMAN_DECISION",
      action: "rerun",
      targetStep: 6,
    })
    expect(transition.state).toEqual({ phase: "running", step: 6, attempt: 0, retryCount: 0 })
  })

  it("rollback（无 targetStep）→ rolled-back 默认 S5", () => {
    const transition = reduceReAct(takeoverState, { type: "HUMAN_DECISION", action: "rollback" })
    expect(transition.state).toEqual({ phase: "rolled-back", toStep: 5, reason: "人工裁决回滚" })
  })

  it("rollback 指定 targetStep=4 → rolled-back S4", () => {
    const transition = reduceReAct(takeoverState, {
      type: "HUMAN_DECISION",
      action: "rollback",
      targetStep: 4,
    })
    expect(transition.state).toEqual({ phase: "rolled-back", toStep: 4, reason: "人工裁决回滚" })
  })

  it("abort → failed HUMAN_ABORTED", () => {
    const transition = reduceReAct(takeoverState, { type: "HUMAN_DECISION", action: "abort" })
    expect(transition.state).toEqual({ phase: "failed", code: "HUMAN_ABORTED", message: "人工裁决终止" })
  })

  it("takeover + CANCEL → cancelled（含 traceId）；takeover + STEP_RESULT → 不变", () => {
    const cancelled = reduceReAct(takeoverState, { type: "CANCEL" })
    expect(cancelled.state).toEqual({ phase: "cancelled" })
    expect(cancelled.effects).toEqual([{ kind: "terminal", phase: "cancelled", traceId: "trace-sm-1" }])

    expect(reduceReAct(takeoverState, { type: "STEP_RESULT", result: ok(7) }).state).toBe(takeoverState)
  })
})

// ---------- 终态幂等 ----------

describe("状态机：终态幂等", () => {
  const terminals = [
    { phase: "done" } as const,
    { phase: "failed", code: "X", message: "m" } as const,
    { phase: "rolled-back", toStep: 5, reason: "r" } as const,
    { phase: "cancelled" } as const,
  ]

  it.each(terminals)("终态 %j 收到任何事件均不变", (state) => {
    expect(reduceReAct(state, { type: "START" }).state).toBe(state)
    expect(reduceReAct(state, { type: "STEP_RESULT", result: ok(1) }).state).toBe(state)
    expect(reduceReAct(state, { type: "HUMAN_DECISION", action: "rerun" }).state).toBe(state)
  })
})
