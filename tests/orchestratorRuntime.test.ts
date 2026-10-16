/**
 * file: orchestratorRuntime.test.ts
 * description: 编排运行时单测（PR4）· 九步全链路/回环/重试退避/取消三态/人工接管/订阅
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[core],[runtime],[orchestration]
 *
 * test-target: core/runtime/orchestrator
 * notes: Agent 以可编程伪实现注入（scripted AgentPort），状态机行为已由
 *        reactStateMachine.test 穷举，此处验证运行时装配语义
 */

import { describe, expect, it } from "vitest"
import type { MachineEffect } from "../src/core/machine/reactStateMachine"
import type { EffectContext, OrchestratorRuntime } from "../src/core/runtime/orchestrator"
import { backoffDelayMs, createOrchestrator } from "../src/core/runtime/orchestrator"
import type {
  AgentError,
  AgentInvocation,
  AgentPort,
  AgentResult,
  HumanDecision,
} from "../src/types/agent"
import type { AgentId } from "../src/types/index"

// ---------- 伪 Agent 工厂 ----------

interface ScriptedAgent extends AgentPort {
  invocations: AgentInvocation[]
}

/** 可编程 Agent：behavior 闭包驱动返回值，记录全部 invocation */
function scriptedAgent(id: AgentId, behavior: (inv: AgentInvocation) => AgentResult): ScriptedAgent {
  const invocations: AgentInvocation[] = []
  return {
    id,
    primaryStages: [],
    invocations,
    async run(inv) {
      invocations.push(inv)
      return behavior(inv)
    },
  }
}

function okResult(inv: AgentInvocation): AgentResult {
  return {
    trace: {
      traceId: inv.input.traceId,
      taskId: inv.input.taskId,
      agentId: inv.context.agentId,
      step: inv.input.step,
      attempt: inv.input.attempt,
      model: "scripted",
      provider: "mock",
      latencyMs: 1,
      tokensIn: 1,
      tokensOut: 1,
      riskTags: [],
      startedAt: "2026-10-16T08:00:00.000Z",
      endedAt: "2026-10-16T08:00:00.001Z",
    },
    output: { ok: true, payload: { from: inv.input.step, prev: inv.input.payload }, tokensIn: 1, tokensOut: 1 },
  }
}

function errorResult(inv: AgentInvocation, error: AgentError): AgentResult {
  return { ...okResult(inv), output: undefined, error }
}

const ALL_AGENTS: AgentId[] = ["tianshu", "shouhu", "zongshi", "lingyun", "qianxing", "wanwu", "xianzhi", "bole"]

/** 全 echo 注册表 + 指定 Agent 覆写 */
function registryWith(overrides: Partial<Record<AgentId, AgentPort>>): Record<AgentId, AgentPort> {
  const agents: Record<string, AgentPort> = {}
  for (const id of ALL_AGENTS) agents[id] = overrides[id] ?? scriptedAgent(id, okResult)
  return agents as Record<AgentId, AgentPort>
}

/** 轮询等待条件成立（真实定时器，1ms 步进） */
async function waitFor(predicate: () => boolean, timeoutMs = 2_000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor 超时")
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
}

interface Collected {
  steps: AgentResult[]
  effects: Array<{ effect: MachineEffect; ctx: EffectContext }>
}

function collect(runtime: OrchestratorRuntime): Collected {
  const collected: Collected = { steps: [], effects: [] }
  runtime.onStep((result) => collected.steps.push(result))
  runtime.onEffect((effect, ctx) => collected.effects.push({ effect, ctx }))
  return collected
}

function terminalOf(collected: Collected): MachineEffect | undefined {
  return collected.effects.find(({ effect }) => effect.kind === "terminal")?.effect
}

// ---------- 用例 ----------

describe("编排运行时：九步全链路", () => {
  it("dispatch → 9 步顺序执行 → done 终态；payload 逐步滚动前移；回执含前缀 ID", async () => {
    const runtime = createOrchestrator({ agents: registryWith({}) })
    const collected = collect(runtime)
    const receipt = await runtime.dispatch({ type: "produce-episode", payload: { episode: 4 }, issuedBy: "api" })
    expect(receipt.taskId.startsWith("task-")).toBe(true)
    expect(receipt.traceId.startsWith("trace-")).toBe(true)
    await waitFor(() => terminalOf(collected)?.kind === "terminal")
    expect(terminalOf(collected)).toMatchObject({ kind: "terminal", phase: "done" })
    expect(collected.steps).toHaveLength(9)
    expect(collected.steps.map((s) => s.trace.step)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    // 检查点链：S3 的输入 payload（prev）即 S2 的输出 payload
    const s2Output = collected.steps.find((s) => s.trace.step === 2)?.output?.payload
    const s3Prev = collected.steps.find((s) => s.trace.step === 3)?.output?.payload?.["prev"]
    expect(s3Prev).toEqual(s2Output)
  })

  it("queue.onResult 与 onStep 同步收流；退订后静默", async () => {
    const runtime = createOrchestrator({ agents: registryWith({}) })
    const viaQueue: AgentResult[] = []
    const off = runtime.queue.onResult((r) => viaQueue.push(r))
    const collected = collect(runtime)
    await runtime.dispatch({ type: "t", payload: {}, issuedBy: "api" })
    await waitFor(() => terminalOf(collected)?.kind === "terminal")
    expect(viaQueue).toHaveLength(9)
    off()
    expect(runtime.queue.size()).toBe(0)
  })
})

describe("编排运行时：S7 门禁回环与人工接管", () => {
  it("低分×2 → 回环 S5 两次 → takeover 挂起 → resume rerun 通过 → done", async () => {
    let score = 74.8
    const zongshi = scriptedAgent("zongshi", (inv) =>
      score < 80
        ? { ...okResult(inv), output: { ok: false, payload: {}, score, tokensIn: 1, tokensOut: 1 } }
        : okResult(inv),
    )
    const runtime = createOrchestrator({ agents: registryWith({ zongshi }) })
    const collected = collect(runtime)
    const receipt = await runtime.dispatch({ type: "t", payload: {}, issuedBy: "api" })

    await waitFor(() => collected.effects.some(({ effect }) => effect.kind === "takeover-required"))
    const loopbacks = collected.effects.filter(({ effect }) => effect.kind === "loopback")
    expect(loopbacks).toHaveLength(2)
    expect(zongshi.invocations.map((i) => i.input.attempt)).toEqual([0, 1, 2])
    expect(terminalOf(collected)).toBeUndefined()

    // 人工裁决 rerun：翻转分数后重开复检周期并跑完
    score = 92
    const decision: HumanDecision = {
      taskId: receipt.taskId,
      traceId: receipt.traceId,
      action: "rerun",
      decidedBy: "tester",
    }
    await runtime.resume(receipt.taskId, decision)
    await waitFor(() => terminalOf(collected)?.kind === "terminal")
    expect(terminalOf(collected)).toMatchObject({ phase: "done" })
    // 会话已清理：再次 resume 幂等无副作用
    await runtime.resume(receipt.taskId, decision)
    expect(terminalOf(collected)).toMatchObject({ phase: "done" })
  })

  it("挂起态 cancel → 立即 cancelled 终结", async () => {
    const zongshi = scriptedAgent("zongshi", (inv) =>
      ({ ...okResult(inv), output: { ok: false, payload: {}, score: 60, tokensIn: 1, tokensOut: 1 } }),
    )
    const runtime = createOrchestrator({ agents: registryWith({ zongshi }) })
    const collected = collect(runtime)
    const receipt = await runtime.dispatch({ type: "t", payload: {}, issuedBy: "api" })
    await waitFor(() => collected.effects.some(({ effect }) => effect.kind === "takeover-required"))
    runtime.cancel(receipt.taskId)
    expect(terminalOf(collected)).toMatchObject({ phase: "cancelled" })
  })
})

describe("编排运行时：重试退避", () => {
  it("可重试错误两次后成功：retry 效应×2 + 退避 500/1000ms；三次调用后推进", async () => {
    const sleeps: number[] = []
    let failures = 0
    const qianxing = scriptedAgent("qianxing", (inv) => {
      if (inv.input.step === 2 && failures < 2) {
        failures += 1
        return errorResult(inv, { code: "MODEL_TIMEOUT", message: "瞬时超时", retryable: true })
      }
      return okResult(inv)
    })
    const runtime = createOrchestrator({
      agents: registryWith({ qianxing }),
      sleep: async (ms) => {
        sleeps.push(ms)
      },
    })
    const collected = collect(runtime)
    await runtime.dispatch({ type: "t", payload: {}, issuedBy: "api" })
    await waitFor(() => terminalOf(collected)?.kind === "terminal")
    expect(sleeps).toEqual([backoffDelayMs(1), backoffDelayMs(2)])
    expect(backoffDelayMs(1)).toBe(500)
    expect(backoffDelayMs(2)).toBe(1000)
    expect(collected.effects.filter(({ effect }) => effect.kind === "retry")).toHaveLength(2)
    expect(terminalOf(collected)).toMatchObject({ phase: "done" })
    expect(qianxing.invocations.filter((i) => i.input.step === 2)).toHaveLength(3)
  })

  it("重试耗尽 + rollbackTo → rolled-back 终态", async () => {
    const wanwu = scriptedAgent("wanwu", (inv) =>
      errorResult(inv, { code: "TOOL_ERROR", message: "工具持续失败", retryable: true, rollbackTo: 3 }),
    )
    const runtime = createOrchestrator({ agents: registryWith({ wanwu }) })
    const collected = collect(runtime)
    await runtime.dispatch({ type: "t", payload: {}, issuedBy: "api" })
    await waitFor(() => terminalOf(collected)?.kind === "terminal")
    expect(terminalOf(collected)).toMatchObject({ phase: "rolled-back" })
    expect(wanwu.invocations).toHaveLength(3)
  })
})

describe("编排运行时：取消三态", () => {
  it("运行中取消：当前步完成后终结为 cancelled，不再执行后续步", async () => {
    let releaseFirst: (() => void) | undefined
    let started = false
    const gatedShouhu: AgentPort = {
      id: "shouhu",
      primaryStages: [],
      async run(inv) {
        if (!started) {
          started = true
          return await new Promise<AgentResult>((resolve) => {
            releaseFirst = () => resolve(okResult(inv))
          })
        }
        return okResult(inv)
      },
    }
    const runtime = createOrchestrator({ agents: registryWith({ shouhu: gatedShouhu }) })
    const collected = collect(runtime)
    const receipt = await runtime.dispatch({ type: "t", payload: {}, issuedBy: "api" })
    await waitFor(() => started)
    runtime.cancel(receipt.taskId)
    releaseFirst?.()
    await waitFor(() => terminalOf(collected)?.kind === "terminal")
    expect(terminalOf(collected)).toMatchObject({ phase: "cancelled" })
    expect(collected.steps).toHaveLength(1)
  })

  it("入队未跑取消：任务被移除，永不执行；cancel 未知 ID 幂等", async () => {
    let gateOpen = false
    let started = false
    const gatedShouhu: AgentPort = {
      id: "shouhu",
      primaryStages: [],
      async run(inv) {
        if (!started) {
          started = true
          await new Promise<void>((resolve) => {
            const timer = setInterval(() => {
              if (gateOpen) {
                clearInterval(timer)
                resolve()
              }
            }, 1)
          })
        }
        return okResult(inv)
      },
    }
    const runtime = createOrchestrator({ agents: registryWith({ shouhu: gatedShouhu }) })
    const collected = collect(runtime)
    const first = await runtime.dispatch({ type: "t", payload: { n: 1 }, issuedBy: "api" })
    await waitFor(() => started)
    const second = await runtime.dispatch({ type: "t", payload: { n: 2 }, issuedBy: "api" })
    runtime.cancel(second.taskId)
    runtime.cancel("unknown-task-id")
    gateOpen = true
    await waitFor(() => terminalOf(collected)?.kind === "terminal")
    expect(terminalOf(collected)).toMatchObject({ phase: "done" })
    const traceIds = new Set(collected.steps.map((s) => s.trace.taskId))
    expect(traceIds.has(first.taskId)).toBe(true)
    expect(traceIds.has(second.taskId)).toBe(false)
  })
})

describe("编排运行时：订阅与边界", () => {
  it("onStep/onEffect 退订后静默", async () => {
    const runtime = createOrchestrator({ agents: registryWith({}) })
    const steps: AgentResult[] = []
    const effects: MachineEffect[] = []
    const offStep = runtime.onStep((r) => steps.push(r))
    const offEffect = runtime.onEffect((e) => effects.push(e))
    offStep()
    offEffect()
    await runtime.dispatch({ type: "t", payload: {}, issuedBy: "api" })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(steps).toHaveLength(0)
    expect(effects).toHaveLength(0)
  })

  it("resume 无会话/非挂起态 → 幂等无副作用", async () => {
    const runtime = createOrchestrator({ agents: registryWith({}) })
    const collected = collect(runtime)
    await runtime.resume("missing", { taskId: "missing", traceId: "t", action: "abort", decidedBy: "x" })
    const receipt = await runtime.dispatch({ type: "t", payload: {}, issuedBy: "api" })
    await runtime.resume(receipt.taskId, { taskId: receipt.taskId, traceId: receipt.traceId, action: "rerun", decidedBy: "x" })
    await waitFor(() => terminalOf(collected)?.kind === "terminal")
    expect(collected.effects.filter(({ effect }) => effect.kind === "takeover-required")).toHaveLength(0)
  })

  it("dispatch 显式 P0 优先级受理成功（回执有效）", async () => {
    const runtime = createOrchestrator({ agents: registryWith({}) })
    const receipt = await runtime.dispatch({ type: "t", payload: {}, issuedBy: "api" }, "P0")
    expect(receipt.taskId).toBeTruthy()
  })
})
