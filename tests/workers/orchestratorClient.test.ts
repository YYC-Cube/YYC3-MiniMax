/**
 * file: orchestratorClient.test.ts
 * description: UI 侧编排客户端单测（PR6/PR7）· 双模式降级/全链路回流/接管 resume/取消幂等
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[workers],[client],[orchestration]
 *
 * test-target: workers/orchestratorClient（NODE_ENV=test 强制进程内模式）
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { MachineEffect } from "../../src/core/machine/reactStateMachine"
import { addTelemetrySink, type TelemetryEvent } from "../../src/services/telemetry"
import type { AgentResult, HumanDecision } from "../../src/types/agent"
import type { ModelPort } from "../../src/types/ports"
import {
  __resetOrchestratorClientForTests,
  getOrchestratorClient,
  type OrchestratorClient,
} from "../../src/workers/orchestratorClient"

/** 脚本模型：格物·宗师前三次低分（a0/a1/a2 → 第三次失败触发接管）、之后达标（rerun 通过） */
function takeoverThenPassModel(): ModelPort {
  let zongshiCalls = 0
  return {
    provider: "mock",
    async complete(req) {
      if (req.system.includes("格物·宗师")) {
        zongshiCalls += 1
        const text = zongshiCalls <= 3 ? '{"score": 74.8}' : '{"score": 92}'
        return { text, tokensIn: 10, tokensOut: 5, latencyMs: 1, model: req.model }
      }
      return { text: "ok", tokensIn: 4, tokensOut: 2, latencyMs: 1, model: req.model }
    },
  }
}

async function waitFor(predicate: () => boolean, timeoutMs = 2_000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor 超时")
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
}

const CMD = { type: "widget:quality", payload: { text: "查看质检" }, issuedBy: "ui-widget" } as const

/** Worker 假体：捕获 postMessage / 记录 terminate / 可主动 emit 出站消息（真实线程分支可控化） */
class FakeWorker {
  static last: FakeWorker | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  readonly posted: unknown[] = []
  terminated = false
  constructor() {
    FakeWorker.last = this
  }
  postMessage(message: unknown): void {
    this.posted.push(message)
  }
  terminate(): void {
    this.terminated = true
  }
  emit(data: unknown): void {
    this.onmessage?.(new MessageEvent("message", { data }))
  }
}

const SAMPLE_RESULT: AgentResult = {
  trace: {
    traceId: "tr-1",
    taskId: "t-1",
    agentId: "zongshi",
    step: 7,
    attempt: 0,
    model: "m",
    provider: "mock",
    latencyMs: 1,
    tokensIn: 1,
    tokensOut: 1,
    riskTags: [],
    startedAt: "s",
    endedAt: "e",
  },
}

beforeEach(() => {
  __resetOrchestratorClientForTests()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  __resetOrchestratorClientForTests()
})

describe("客户端：模式选择与降级", () => {
  it("测试环境强制进程内模式", () => {
    const client = getOrchestratorClient()
    expect(client.mode).toBe("in-process")
    expect(getOrchestratorClient()).toBe(client)
  })

  it("Worker 构造失败 → 降级进程内 + 结构化告警", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubGlobal(
      "Worker",
      class {
        constructor() {
          throw new Error("worker construction failed")
        }
      },
    )
    const events: TelemetryEvent[] = []
    const uninstall = addTelemetrySink((e) => events.push(e))
    const client = getOrchestratorClient()
    expect(client.mode).toBe("in-process")
    expect(
      events.some(
        (e) => e.event === "orchestrator_client.worker_unavailable" && e.level === "warn",
      ),
    ).toBe(true)
    uninstall()
  })

  it("dispose 后单例重建（测试隔离语义）", () => {
    const first = getOrchestratorClient()
    __resetOrchestratorClientForTests()
    const second = getOrchestratorClient()
    expect(second).not.toBe(first)
  })
})

describe("客户端：全链路回流（dispatch → 事件 → 终态）", () => {
  it("正常链路：receipt → 9 步 → terminal(done)；onStep/onEffect 双流可见", async () => {
    const client: OrchestratorClient = getOrchestratorClient()
    const steps: number[] = []
    const effects: MachineEffect[] = []
    client.onStep((r) => steps.push(r.trace.step))
    client.onEffect((e) => effects.push(e))

    const receipt = await client.dispatch({ ...CMD })
    expect(receipt.taskId).toBeTruthy()
    expect(receipt.traceId).toBeTruthy()
    await waitFor(() => effects.some((e) => e.kind === "terminal"))
    expect(steps).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(effects.find((e) => e.kind === "terminal")).toMatchObject({
      kind: "terminal",
      phase: "done",
    })
  })

  it("onStep/onEffect 退订后静默", async () => {
    const client = getOrchestratorClient()
    const steps: number[] = []
    const effects: MachineEffect[] = []
    const offStep = client.onStep((r) => steps.push(r.trace.step))
    const offEffect = client.onEffect((e) => effects.push(e))
    offStep()
    offEffect()
    await client.dispatch({ ...CMD })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(steps).toHaveLength(0)
    expect(effects).toHaveLength(0)
  })

  it("cancel 未知 taskId 幂等无副作用", () => {
    const client = getOrchestratorClient()
    expect(() => client.cancel("nope")).not.toThrow()
  })
})

describe("客户端：人工接管 resume 全链路（PR7）", () => {
  it("低分×2 → 回环×2 → 接管挂起 → resume(rerun) → done；effect 语义完整", async () => {
    const client = getOrchestratorClient({ model: takeoverThenPassModel() })
    const steps: number[] = []
    const loopbacks: number[] = []
    let takeoverTaskId: string | null = null
    let terminalPhase: string | null = null
    client.onStep((r) => steps.push(r.trace.step))
    client.onEffect((effect, ctx) => {
      if (effect.kind === "loopback") loopbacks.push(effect.attempt)
      if (effect.kind === "takeover-required") takeoverTaskId = ctx.taskId
      if (effect.kind === "terminal") terminalPhase = effect.phase
    })

    const receipt = await client.dispatch({ ...CMD })
    await waitFor(() => takeoverTaskId !== null)
    // 回环×2：S7(a0)→S5(a1)、S7(a1)→S5(a2)，随后接管挂起
    expect(loopbacks).toEqual([1, 2])
    expect(steps).toEqual([1, 2, 3, 4, 5, 6, 7, 5, 6, 7, 5, 6, 7])
    expect(terminalPhase).toBeNull()
    expect(takeoverTaskId).toBe(receipt.taskId)

    await client.resume(receipt.taskId, {
      taskId: receipt.taskId,
      traceId: receipt.traceId,
      action: "rerun",
      decidedBy: "tester",
    })
    expect(terminalPhase).toBe("done")
    // rerun 后完整跑完 S5..S9（zongshi 第 3 次调用达标）
    expect(steps.slice(13)).toEqual([5, 6, 7, 8, 9])
  })

  it("resume(abort) → failed 终态", async () => {
    const client = getOrchestratorClient({ model: takeoverThenPassModel() })
    let takeoverTaskId: string | null = null
    let terminalPhase: string | null = null
    client.onEffect((effect, ctx) => {
      if (effect.kind === "takeover-required") takeoverTaskId = ctx.taskId
      if (effect.kind === "terminal") terminalPhase = effect.phase
    })
    const receipt = await client.dispatch({ ...CMD })
    await waitFor(() => takeoverTaskId !== null)
    await client.resume(receipt.taskId, {
      taskId: receipt.taskId,
      traceId: receipt.traceId,
      action: "abort",
      decidedBy: "tester",
    })
    expect(terminalPhase).toBe("failed")
  })
})

describe("客户端：worker 模式（真实线程分支）", () => {
  it("Worker 可用 → worker 模式：FIFO receipt 关联 / step+effect 回流 / cancel+resume 透传 / dispose 终止", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubGlobal("Worker", FakeWorker)
    const client = getOrchestratorClient()
    expect(client.mode).toBe("worker")
    const worker = FakeWorker.last
    expect(worker).not.toBeNull()
    if (!worker) throw new Error("FakeWorker 未构造")

    const steps: number[] = []
    const effects: MachineEffect[] = []
    client.onStep((r) => steps.push(r.trace.step))
    client.onEffect((e) => effects.push(e))

    // dispatch → postMessage 透传命令，receipt 回流后按 FIFO resolve
    const receiptPromise = client.dispatch({ ...CMD })
    expect(worker.posted[0]).toMatchObject({ type: "dispatch", command: CMD })
    worker.emit({ type: "receipt", taskId: "t-1", traceId: "tr-1" })
    await expect(receiptPromise).resolves.toEqual({ taskId: "t-1", traceId: "tr-1" })

    // step / effect 出站消息经事件总线回流订阅者
    worker.emit({ type: "step", result: SAMPLE_RESULT })
    worker.emit({
      type: "effect",
      effect: { kind: "terminal", phase: "done" },
      taskId: "t-1",
      traceId: "tr-1",
    })
    expect(steps).toEqual([7])
    expect(effects).toEqual([{ kind: "terminal", phase: "done" }])

    // cancel / resume 透传
    client.cancel("t-1")
    expect(worker.posted).toContainEqual({ type: "cancel", taskId: "t-1" })
    const decision: HumanDecision = {
      taskId: "t-1",
      traceId: "tr-1",
      action: "rerun",
      decidedBy: "tester",
    }
    await client.resume("t-1", decision)
    expect(worker.posted).toContainEqual({ type: "resume", taskId: "t-1", decision })

    // dispose：终止线程 + 清空监听（后续出站消息不再回流）
    client.dispose()
    expect(worker.terminated).toBe(true)
    worker.emit({
      type: "effect",
      effect: { kind: "terminal", phase: "failed" },
      taskId: "t-1",
      traceId: "tr-1",
    })
    expect(effects).toHaveLength(1)
  })

  it("Worker 全局缺失 → 降级进程内模式", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubGlobal("Worker", undefined)
    const client = getOrchestratorClient()
    expect(client.mode).toBe("in-process")
  })
})
