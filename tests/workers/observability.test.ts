/**
 * file: observability.test.ts
 * description: 可观测桥单测（PR7）· step 指标/错误审计/回环/接管/终态审计落点
 * author: YanYuCloudCube Team
 * version: v1.2.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[workers],[observability],[telemetry]
 *
 * test-target: workers/observability × core/runtime/orchestrator（SIM milvus 工具注入）
 */

import { describe, expect, it } from "vitest"
import { createAgentRegistry } from "../../src/core/agents"
import type { OrchestratorRuntime } from "../../src/core/runtime/orchestrator"
import { createOrchestrator } from "../../src/core/runtime/orchestrator"
import { addTelemetrySink, type TelemetryEvent } from "../../src/services/telemetry"
import type { AgentInvocation, AgentPort, AgentResult } from "../../src/types/agent"
import type { ModelPort } from "../../src/types/ports"
import { attachObservability } from "../../src/workers/observability"

function capture(): { events: TelemetryEvent[]; uninstall: () => void } {
  const events: TelemetryEvent[] = []
  const uninstall = addTelemetrySink((e) => events.push(e))
  return { events, uninstall }
}

/** 剧本模型：zongshiScore 恒定（<80 即门禁失败链路） */
function scriptedModel(zongshiScore: number): ModelPort {
  return {
    provider: "mock",
    async complete(req) {
      const text = req.system.includes("格物·宗师")
        ? `{"score": ${zongshiScore}}`
        : "ok"
      return { text, tokensIn: 4, tokensOut: 2, latencyMs: 1, model: req.model }
    },
  }
}

/** SIM milvus 工具（S3 可通，与 worker 桥默认装配一致） */
const simTools = {
  get: (name: string) =>
    name === "milvus.hybrid_search"
      ? { name, call: async () => ({ ok: true, data: { hits: 0 } }) }
      : undefined,
}

function makeRuntime(model: ModelPort): OrchestratorRuntime {
  return createOrchestrator({ agents: createAgentRegistry(model), tools: simTools })
}

async function waitFor(predicate: () => boolean, timeoutMs = 2_000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor 超时")
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
}

describe("可观测桥：正常链路指标落点", () => {
  it("每步 latency/tokens 指标（agent/step/model/provider 平铺标签）+ 终态审计", async () => {
    const { events, uninstall } = capture()
    const runtime = makeRuntime(scriptedModel(92))
    attachObservability(runtime)
    await runtime.dispatch({ type: "widget:quality", payload: {}, issuedBy: "ui-widget" })
    await waitFor(() =>
      events.some((e) => e.event === "audit.react.terminal" && e.data?.phase === "done"),
    )

    const latency = events.find((e) => e.event === "metric.agent.step.latency_ms")
    // metric 语义：tags 平铺进 data（采集端可直接聚合）
    expect(latency?.data).toMatchObject({
      name: "agent.step.latency_ms",
      unit: "ms",
      agent: "shouhu",
      step: 1,
      model: "deepseek-v4-guard",
      provider: "mock",
    })
    expect(typeof latency?.traceId).toBe("string")
    expect(events.filter((e) => e.event === "metric.agent.step.latency_ms")).toHaveLength(9)
    expect(events.some((e) => e.event === "metric.agent.step.tokens_in")).toBe(true)
    expect(events.some((e) => e.event === "metric.agent.step.tokens_out")).toBe(true)

    const terminal = events.find((e) => e.event === "audit.react.terminal")
    expect(terminal?.data).toMatchObject({
      action: "react.terminal",
      phase: "done",
    })
    uninstall()
  })

  it("卸载后不再产生事件", async () => {
    const { events, uninstall } = capture()
    const runtime = makeRuntime(scriptedModel(92))
    const off = attachObservability(runtime)
    off()
    await runtime.dispatch({ type: "t", payload: {}, issuedBy: "api" })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(
      events.filter((e) => e.event.startsWith("metric.agent.") || e.event.startsWith("audit.")),
    ).toHaveLength(0)
    uninstall()
  })
})

describe("可观测桥：异常链路审计落点", () => {
  it("回环×2 + 人工接管（恒低分：第三次失败于 attempt=2）；abort → failed 终态审计", async () => {
    const { events, uninstall } = capture()
    const runtime = makeRuntime(scriptedModel(74.8))
    attachObservability(runtime)
    let takeoverTaskId: string | null = null
    runtime.onEffect((effect, ctx) => {
      if (effect.kind === "takeover-required") takeoverTaskId = ctx.taskId
    })
    const receipt = await runtime.dispatch({ type: "t", payload: {}, issuedBy: "api" })
    await waitFor(() => takeoverTaskId !== null)

    const loopbacks = events.filter((e) => e.event === "audit.react.loopback")
    expect(loopbacks.map((e) => e.data?.attempt)).toEqual([1, 2])
    expect(loopbacks[0]?.data).toMatchObject({ fromStep: 7, toStep: 5 })

    const takeover = events.find((e) => e.event === "audit.human.takeover.required")
    expect(takeover?.data).toMatchObject({ step: 7, attempt: 2 })
    expect(typeof takeover?.traceId).toBe("string")

    // 接管挂起：无终态审计
    expect(events.some((e) => e.event === "audit.react.terminal")).toBe(false)

    await runtime.resume(receipt.taskId, {
      taskId: receipt.taskId,
      traceId: receipt.traceId,
      action: "abort",
      decidedBy: "tester",
    })
    await waitFor(() =>
      events.some((e) => e.event === "audit.react.terminal" && e.data?.phase === "failed"),
    )
    uninstall()
  })

  it("可重试错误步：agent.step.error 审计（code/retryable 留痕），重试耗尽 → failed", async () => {
    const { events, uninstall } = capture()
    // 覆写 qianxing：S2 恒定可重试错误（重试 2 次耗尽 → failed 终态）
    const failing: AgentPort = {
      id: "qianxing",
      primaryStages: [],
      async run(inv: AgentInvocation): Promise<AgentResult> {
        return {
          trace: {
            traceId: inv.input.traceId,
            taskId: inv.input.taskId,
            agentId: "qianxing",
            step: inv.input.step,
            attempt: inv.input.attempt,
            model: "scripted",
            provider: "mock",
            latencyMs: 1,
            tokensIn: 1,
            tokensOut: 1,
            riskTags: [],
            startedAt: "s",
            endedAt: "e",
          },
          error: { code: "MODEL_TIMEOUT", message: "瞬时超时", retryable: true },
        }
      },
    }
    const runtime = createOrchestrator({
      agents: { ...createAgentRegistry(scriptedModel(92)), qianxing: failing },
      tools: simTools,
    })
    attachObservability(runtime)
    await runtime.dispatch({ type: "t", payload: {}, issuedBy: "api" })
    await waitFor(() =>
      events.some((e) => e.event === "audit.react.terminal" && e.data?.phase === "failed"),
    )
    const stepError = events.find((e) => e.event === "audit.agent.step.error")
    expect(stepError?.data).toMatchObject({ code: "MODEL_TIMEOUT", retryable: true, step: 2 })
    expect(events.filter((e) => e.event === "audit.agent.retry")).toHaveLength(2)
    uninstall()
  })
})
