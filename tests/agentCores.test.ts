/**
 * file: agentCores.test.ts
 * description: 8 Agent 行为核单测（PR2）· 模型/工具双路径/错误映射/档案同步锁/回环集成
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[core],[agents],[port]
 *
 * test-target: core/agents × core/machine（S7 回环集成）
 * notes: ModelPort 以 mock 注入验证六元组契约（trace 必带/错误码映射/score 解析）
 */

import { describe, expect, it } from "vitest"
import { createAgentRegistry, STEP_AGENT_MAP } from "../src/core/agents"
import {
  INITIAL_REACT_STATE,
  reduceReAct,
  type RunningState,
} from "../src/core/machine/reactStateMachine"
import { AGENT_LIST } from "../src/data/agents"
import { REACT_STEPS } from "../src/data/reactSteps"
import type {
  AgentError,
  AgentInvocation,
  AgentResult,
  AgentTool,
  ReActStepId,
  ToolRegistry,
} from "../src/types/agent"
import { isAgentId, isAgentResult } from "../src/types/agent"
import type { ModelPort, ModelRequest } from "../src/types/ports"

// ---------- 夹具 ----------

/** 可编程 mock 模型端口：按 system 关键词路由回包；记录请求供断言 */
function mockModel(reply: (req: ModelRequest) => string): {
  port: ModelPort
  requests: ModelRequest[]
} {
  const requests: ModelRequest[] = []
  const port: ModelPort = {
    provider: "mock",
    complete: async (req) => {
      requests.push(req)
      return { text: reply(req), tokensIn: 12, tokensOut: 6, latencyMs: 2, model: req.model }
    },
  }
  return { port, requests }
}

function inv(
  step: ReActStepId,
  options?: { tools?: ToolRegistry; payload?: Record<string, unknown> },
): AgentInvocation {
  return {
    input: {
      taskId: "task-a1",
      traceId: "trace-a1",
      step,
      attempt: 0,
      payload: options?.payload ?? { outline: "EP04 大纲" },
    },
    context: {
      agentId: "qianxing",
      memory: {},
      budget: { maxTokens: 512, maxLatencyMs: 1000 },
      riskPolicy: [],
    },
    tools: options?.tools ?? { get: () => undefined },
  }
}

const echoModel = mockModel((req) => `ok:${req.system.slice(0, 6)}`)

// ---------- 注册表与档案同步锁 ----------

describe("注册表：结构与档案互锁", () => {
  const registry = createAgentRegistry(echoModel.port)

  it("8 Agent 齐备，id 与 AGENT_LIST 档案集合一致", () => {
    expect(Object.keys(registry)).toHaveLength(8)
    for (const agent of AGENT_LIST) {
      expect(isAgentId(registry[agent.id].id)).toBe(true)
      expect(registry[agent.id].primaryStages.length).toBeGreaterThan(0)
    }
  })

  it("STEP_AGENT_MAP 与 data/reactSteps 的 agentId 无漂移", () => {
    expect(REACT_STEPS).toHaveLength(9)
    for (const step of REACT_STEPS) {
      expect(STEP_AGENT_MAP[step.step as ReActStepId]).toBe(step.agentId)
    }
  })

  it("xianzhi 无独立步（S4 由 wanwu 主责），注册表仍提供端口", () => {
    expect(registry.xianzhi.id).toBe("xianzhi")
  })
})

// ---------- 模型路径 ----------

describe("Agent 行为核：模型路径", () => {
  it("qianxing S2：output 包裹模型文本，trace 回显 input 六元组锚点，maxTokens 透传", async () => {
    const registry = createAgentRegistry(echoModel.port)
    const result = await registry.qianxing.run(inv(2))
    expect(isAgentResult(result)).toBe(true)
    expect(result.error).toBeUndefined()
    expect(typeof result.output?.payload["text"]).toBe("string")
    expect(result.trace).toMatchObject({
      traceId: "trace-a1",
      taskId: "task-a1",
      agentId: "qianxing",
      step: 2,
      attempt: 0,
      model: "deepseek-v4-pro",
      provider: "mock",
      tokensIn: 12,
      tokensOut: 6,
    })
    expect(result.trace.riskTags).toEqual(["intent-spoof"])
    expect(result.trace.latencyMs).toBeGreaterThanOrEqual(0)
    expect(echoModel.requests[0]?.maxTokens).toBe(512)
    expect(echoModel.requests[0]?.messages[0]?.content).toContain("EP04")
  })

  it("未注册步骤 → TOOL_ERROR 不可重试，trace 必带（契约铁律）", async () => {
    const registry = createAgentRegistry(echoModel.port)
    const result = await registry.qianxing.run(inv(6))
    expect(isAgentResult(result)).toBe(true)
    expect(result.error).toMatchObject({
      code: "TOOL_ERROR",
      retryable: false,
    })
    expect(result.error?.message).toContain("步骤 6")
    expect(result.output).toBeUndefined()
  })

  it("模型抛错 → MODEL_TIMEOUT 可重试，错误消息透传", async () => {
    const { port } = mockModel(() => {
      throw new Error("gateway unreachable")
    })
    const registry = createAgentRegistry(port)
    const result = await registry.lingyun.run(inv(5))
    expect(isAgentResult(result)).toBe(true)
    expect(result.error).toEqual({
      code: "MODEL_TIMEOUT",
      message: "gateway unreachable",
      retryable: true,
    })
  })

  it("模型抛非 Error 值 → 消息字符串化", async () => {
    const { port } = mockModel(() => {
      throw "boom-string"
    })
    const registry = createAgentRegistry(port)
    const result = await registry.tianshu.run(inv(6))
    expect(result.error).toMatchObject({ code: "MODEL_TIMEOUT", message: "boom-string" })
  })

  it("适配器结构化分类（PR5 ModelError）：PROVIDER_REJECTED 不可重试透传", async () => {
    const { port } = mockModel(() => {
      throw Object.assign(new Error("提供方拒绝请求（HTTP 401）"), {
        code: "PROVIDER_REJECTED",
        retryable: false,
      })
    })
    const registry = createAgentRegistry(port)
    const result = await registry.lingyun.run(inv(5))
    expect(result.error).toEqual({
      code: "PROVIDER_REJECTED",
      message: "提供方拒绝请求（HTTP 401）",
      retryable: false,
    })
  })

  it("适配器携带部分字段（code 非法、retryable 缺省）→ 回退 MODEL_TIMEOUT 可重试", async () => {
    const { port } = mockModel(() => {
      throw Object.assign(new Error("网关 5xx"), { code: "NOT_A_CODE" })
    })
    const registry = createAgentRegistry(port)
    const result = await registry.lingyun.run(inv(5))
    expect(result.error).toMatchObject({ code: "MODEL_TIMEOUT", message: "网关 5xx", retryable: true })
  })
})

// ---------- 工具路径 ----------

describe("Agent 行为核：工具路径（S3 RAG）", () => {
  const milvusTool: AgentTool = {
    name: "milvus.hybrid_search",
    call: async () => ({ ok: true, data: { hits: 3, topK: ["EP01", "EP02", "EP03"] } }),
  }
  const tools: ToolRegistry = {
    get: (name) => (name === milvusTool.name ? milvusTool : undefined),
  }

  it("工具命中 → payload 包裹工具名与数据，tokens 记 0", async () => {
    const registry = createAgentRegistry(echoModel.port)
    const result = await registry.qianxing.run(inv(3, { tools }))
    expect(isAgentResult(result)).toBe(true)
    expect(result.output).toMatchObject({
      ok: true,
      tokensIn: 0,
      tokensOut: 0,
    })
    expect(result.output?.payload).toEqual({
      tool: "milvus.hybrid_search",
      data: { hits: 3, topK: ["EP01", "EP02", "EP03"] },
    })
  })

  it("工具未注册 → TOOL_ERROR 不可重试", async () => {
    const registry = createAgentRegistry(echoModel.port)
    const result = await registry.qianxing.run(inv(3))
    expect(result.error).toMatchObject({ code: "TOOL_ERROR", retryable: false })
    expect(result.error?.message).toContain("milvus.hybrid_search")
  })

  it("工具失败自带 error → 透传原错误语义", async () => {
    const toolError: AgentError = {
      code: "TOOL_ERROR",
      message: "Milvus 集合不存在",
      retryable: true,
    }
    const failing: ToolRegistry = {
      get: () => ({
        name: "milvus.hybrid_search",
        call: async () => ({ ok: false, error: toolError }),
      }),
    }
    const registry = createAgentRegistry(echoModel.port)
    const result = await registry.qianxing.run(inv(3, { tools: failing }))
    expect(result.error).toEqual(toolError)
  })

  it("工具失败无 error → 默认 TOOL_ERROR 可重试", async () => {
    const failing: ToolRegistry = {
      get: () => ({
        name: "milvus.hybrid_search",
        call: async () => ({ ok: false }),
      }),
    }
    const registry = createAgentRegistry(echoModel.port)
    const result = await registry.qianxing.run(inv(3, { tools: failing }))
    expect(result.error).toEqual({ code: "TOOL_ERROR", message: "工具执行失败", retryable: true })
  })
})

// ---------- S7 门禁分解析 ----------

describe("Agent 行为核：zongshi S7 score 解析", () => {
  function zongshiWith(text: string) {
    const { port } = mockModel(() => text)
    return createAgentRegistry(port).zongshi
  }

  it("合法 JSON {score} → output.score 提取", async () => {
    const result = await zongshiWith('{"score": 91.4}').run(inv(7))
    expect(result.output?.score).toBe(91.4)
    expect(result.output?.payload).toEqual({ score: 91.4 })
  })

  it("JSON 无 score 字段 → score 缺失，payload 原样", async () => {
    const result = await zongshiWith('{"verdict": "pass"}').run(inv(7))
    expect(result.output?.score).toBeUndefined()
    expect(result.output?.payload).toEqual({ verdict: "pass" })
  })

  it("非 JSON 文本 → 降级包裹 { text }", async () => {
    const result = await zongshiWith("一致性比对通过，但未按 JSON 输出").run(inv(7))
    expect(result.output?.score).toBeUndefined()
    expect(result.output?.payload).toEqual({ text: "一致性比对通过，但未按 JSON 输出" })
  })
})

// ---------- 集成：状态机 × Agent 行为核（S7 回环全链路） ----------

describe("集成：S7 门禁回环（agent → machine）", () => {
  /** 组装合法 ok 结果（traceId 与 Agent 核产物一致） */
  function okResult(step: ReActStepId): AgentResult {
    return {
      trace: {
        traceId: "trace-a1",
        taskId: "task-a1",
        agentId: "tianshu",
        step,
        attempt: 0,
        model: "nemotron-super-120b",
        provider: "mock",
        latencyMs: 10,
        tokensIn: 1,
        tokensOut: 1,
        riskTags: [],
        startedAt: "2026-10-16T08:00:00.000Z",
        endedAt: "2026-10-16T08:00:00.010Z",
      },
      output: { ok: true, payload: {}, tokensIn: 1, tokensOut: 1 },
    }
  }

  it("低分 → 回环 S5（attempt=1）；attempt 耗尽 → human-takeover；人工 rerun → 重开周期", async () => {
    const { port } = mockModel((req) =>
      req.system.includes("格物·宗师") ? '{"score": 74.8}' : "ok",
    )
    const registry = createAgentRegistry(port)

    // START 后以 ok 结果顺序推进至 S7 attempt=0
    let state: ReturnType<typeof reduceReAct>["state"] = reduceReAct(INITIAL_REACT_STATE, {
      type: "START",
    }).state
    for (const step of [1, 2, 3, 4, 5, 6] as ReActStepId[]) {
      state = reduceReAct(state, { type: "STEP_RESULT", result: okResult(step) }).state
    }
    expect(state).toMatchObject({ phase: "running", step: 7, attempt: 0 })

    // 第一次 S7 低分 → 回环
    const first = await registry.zongshi.run(inv(7))
    expect(first.output?.score).toBe(74.8)
    const loop = reduceReAct(state, { type: "STEP_RESULT", result: first })
    expect(loop.state).toEqual({ phase: "running", step: 5, attempt: 1, retryCount: 0 })
    expect(loop.effects[0]).toMatchObject({ kind: "loopback", fromStep: 7, toStep: 5, attempt: 1 })

    // 复检周期耗尽（attempt=2 时仍低分）→ 人工接管
    const at7again: RunningState = { phase: "running", step: 7, attempt: 2, retryCount: 0 }
    const second = await registry.zongshi.run(inv(7, { payload: {} }))
    const exhaust = reduceReAct(at7again, { type: "STEP_RESULT", result: second })
    expect(exhaust.state).toMatchObject({ phase: "human-takeover", step: 7, attempt: 2 })
    expect(exhaust.effects[0]?.kind).toBe("takeover-required")

    // 人工 rerun → 回到 S5 重开复检周期
    const rerun = reduceReAct(exhaust.state, { type: "HUMAN_DECISION", action: "rerun" })
    expect(rerun.state).toEqual({ phase: "running", step: 5, attempt: 0, retryCount: 0 })
  })

  it("高分 → 直通 S8，无回环效应", async () => {
    const { port } = mockModel(() => '{"score": 93.2}')
    const registry = createAgentRegistry(port)
    const at7: RunningState = { phase: "running", step: 7, attempt: 0, retryCount: 0 }
    const transition = reduceReAct(at7, {
      type: "STEP_RESULT",
      result: await registry.zongshi.run(inv(7)),
    })
    expect(transition.state).toEqual({ phase: "running", step: 8, attempt: 0, retryCount: 0 })
    expect(transition.effects).toEqual([])
  })
})
