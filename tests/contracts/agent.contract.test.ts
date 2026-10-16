/**
 * file: agent.contract.test.ts
 * description: Agent 统一契约测试（PR1）· 六元组结构断言 + worker 边界守卫行为断言
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[contract],[port],[hexagonal],[agent]
 *
 * test-target: types/agent × types/ports(Port 5-7)
 * notes: 结构断言（端口 ← 伪实现赋值）保证类型兼容；行为断言保证语义契约
 *        （trace 必带铁律 / 常量表完整性 / 守卫对畸形消息全字段拒绝 / 档案同步锁）
 */

import { describe, expect, it } from "vitest"
import { AGENT_LIST } from "../../src/data/agents"
import { REACT_STEPS } from "../../src/data/reactSteps"
import type {
  AgentBudget,
  AgentCommand,
  AgentContext,
  AgentError,
  AgentErrorCode,
  AgentInput,
  AgentInvocation,
  AgentOutput,
  AgentPort,
  AgentResult,
  AgentTool,
  AgentTrace,
  HumanDecision,
  ProviderKind,
  ReActStepId,
  RiskTag,
  TaskEnvelope,
  TaskPriority,
  ToolRegistry,
  ToolResult,
} from "../../src/types/agent"
import {
  AGENT_ERROR_CODES,
  DEFAULT_RETRYABLE_ERROR_CODES,
  PROVIDER_KINDS,
  REACT_STEP_IDS,
  isAgentCommand,
  isAgentError,
  isAgentId,
  isAgentOutput,
  isAgentResult,
  isAgentTrace,
  isProviderKind,
  isRiskTag,
  isTaskEnvelope,
  isValidReActStepId,
} from "../../src/types/agent"
import type {
  DispatchReceipt,
  ModelPort,
  ModelRequest,
  ModelResponse,
  OrchestratorPort,
  TaskQueuePort,
} from "../../src/types/ports"

// ---------- 合法基准夹具（单点维护，全部字段取自真实业务语义） ----------

const riskTags: RiskTag[] = ["consistency", "x-render-drift"]
const verifyStep: ReActStepId = 7
const provider: ProviderKind = "vllm"
const gateCode: AgentErrorCode = "GATE_FAIL"
const priority: TaskPriority = "P1"

const VALID_TRACE: AgentTrace = {
  traceId: "trace-0001",
  taskId: "task-0001",
  agentId: "zongshi",
  step: verifyStep,
  attempt: 0,
  model: "qwen-2.5-max-eval",
  provider,
  latencyMs: 240,
  tokensIn: 1650,
  tokensOut: 320,
  riskTags,
  startedAt: "2026-10-16T08:00:00.000Z",
  endedAt: "2026-10-16T08:00:00.240Z",
}

const VALID_OUTPUT: AgentOutput = {
  ok: true,
  payload: { verdict: "pass" },
  score: 91.4,
  tokensIn: 1650,
  tokensOut: 320,
}

const VALID_ERROR: AgentError = {
  code: gateCode,
  message: "一致性 74.8% 低于门禁阈值",
  retryable: false,
  rollbackTo: 5,
}

const VALID_COMMAND: AgentCommand = {
  type: "produce-episode",
  payload: { episode: 4 },
  issuedBy: "ui-widget",
}

const VALID_ENVELOPE: TaskEnvelope = {
  taskId: "task-0001",
  traceId: "trace-0001",
  command: VALID_COMMAND,
  priority,
  attempt: 0,
  enqueuedAt: "2026-10-16T08:00:00.000Z",
}

const MINIMAL_RESULT: AgentResult = { trace: VALID_TRACE }

/** 用补丁覆写合法基准，构造畸形样本（属性值 undefined 模拟字段缺失） */
function traceWith(patch: Record<string, unknown>): unknown {
  return { ...VALID_TRACE, ...patch }
}

function outputWith(patch: Record<string, unknown>): unknown {
  return { ...VALID_OUTPUT, ...patch }
}

function errorWith(patch: Record<string, unknown>): unknown {
  return { ...VALID_ERROR, ...patch }
}

function commandWith(patch: Record<string, unknown>): unknown {
  return { ...VALID_COMMAND, ...patch }
}

function envelopeWith(patch: Record<string, unknown>): unknown {
  return { ...VALID_ENVELOPE, ...patch }
}

const NON_OBJECTS: unknown[] = [null, undefined, 42, "str", true, []]

// ---------- 常量表契约 ----------

describe("契约常量表（运行时校验的单一事实源）", () => {
  it("REACT_STEP_IDS：九步 1..9 无重复", () => {
    expect(REACT_STEP_IDS).toHaveLength(9)
    expect([...REACT_STEP_IDS]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(new Set(REACT_STEP_IDS).size).toBe(9)
  })

  it("PROVIDER_KINDS：四类提供方", () => {
    expect([...PROVIDER_KINDS]).toEqual(["local", "vllm", "registry", "mock"])
  })

  it("AGENT_ERROR_CODES：七类错误码", () => {
    expect([...AGENT_ERROR_CODES]).toEqual([
      "MODEL_TIMEOUT",
      "PROVIDER_REJECTED",
      "TOOL_ERROR",
      "BUDGET_EXCEEDED",
      "GATE_FAIL",
      "SAFETY_BLOCK",
      "REVIEW_EXHAUSTED",
    ])
  })

  it("DEFAULT_RETRYABLE_ERROR_CODES：仅超时与工具错误可重试", () => {
    expect(DEFAULT_RETRYABLE_ERROR_CODES.size).toBe(2)
    expect(DEFAULT_RETRYABLE_ERROR_CODES.has("MODEL_TIMEOUT")).toBe(true)
    expect(DEFAULT_RETRYABLE_ERROR_CODES.has("TOOL_ERROR")).toBe(true)
    expect(DEFAULT_RETRYABLE_ERROR_CODES.has("PROVIDER_REJECTED")).toBe(false)
    expect(DEFAULT_RETRYABLE_ERROR_CODES.has("GATE_FAIL")).toBe(false)
    expect(DEFAULT_RETRYABLE_ERROR_CODES.has("SAFETY_BLOCK")).toBe(false)
    expect(DEFAULT_RETRYABLE_ERROR_CODES.has("REVIEW_EXHAUSTED")).toBe(false)
  })
})

// ---------- 枚举守卫 ----------

describe("守卫：isAgentId / isProviderKind / isValidReActStepId / isRiskTag", () => {
  it("isAgentId：已知成员通过，未知与非字符串拒绝", () => {
    expect(isAgentId("tianshu")).toBe(true)
    expect(isAgentId("bole")).toBe(true)
    expect(isAgentId("yanyu")).toBe(false)
    expect(isAgentId(42)).toBe(false)
  })

  it("isProviderKind：四类通过，未知拒绝", () => {
    expect(isProviderKind("local")).toBe(true)
    expect(isProviderKind("vllm")).toBe(true)
    expect(isProviderKind("registry")).toBe(true)
    expect(isProviderKind("mock")).toBe(true)
    expect(isProviderKind("openai")).toBe(false)
    expect(isProviderKind(1)).toBe(false)
  })

  it("isValidReActStepId：整数 1..9 通过；越界/浮点/字符串拒绝", () => {
    for (const id of REACT_STEP_IDS) {
      expect(isValidReActStepId(id)).toBe(true)
    }
    expect(isValidReActStepId(0)).toBe(false)
    expect(isValidReActStepId(10)).toBe(false)
    expect(isValidReActStepId(1.5)).toBe(false)
    expect(isValidReActStepId("5")).toBe(false)
  })

  it("isRiskTag：已知标签与 x- 扩展位通过，未知与非字符串拒绝", () => {
    expect(isRiskTag("pii")).toBe(true)
    expect(isRiskTag("feedback-poison")).toBe(true)
    expect(isRiskTag("x-render-drift")).toBe(true)
    expect(isRiskTag("nope")).toBe(false)
    expect(isRiskTag(42)).toBe(false)
  })
})

// ---------- worker 消息边界守卫 ----------

describe("守卫：isAgentCommand（UI → worker 命令边界）", () => {
  it("合法命令通过", () => {
    expect(isAgentCommand(VALID_COMMAND)).toBe(true)
  })

  it.each([
    ["type 为空串", { type: "" }],
    ["type 非字符串", { type: 42 }],
    ["payload 为数组", { payload: [] }],
    ["payload 非对象", { payload: "x" }],
    ["payload 缺失", { payload: undefined }],
  ])("拒绝：%s", (_label, patch) => {
    expect(isAgentCommand(commandWith(patch))).toBe(false)
  })

  it.each(NON_OBJECTS)("拒绝非对象输入：%s", (v) => {
    expect(isAgentCommand(v)).toBe(false)
  })
})

describe("守卫：isAgentTrace（执行留痕全字段强校验）", () => {
  it("合法 trace 通过", () => {
    expect(isAgentTrace(VALID_TRACE)).toBe(true)
  })

  it.each([
    ["traceId 为空串", { traceId: "" }],
    ["traceId 非字符串", { traceId: 42 }],
    ["taskId 缺失", { taskId: undefined }],
    ["agentId 未知", { agentId: "yanyu" }],
    ["step 越界", { step: 10 }],
    ["step 字符串", { step: "5" }],
    ["step 浮点", { step: 1.5 }],
    ["attempt 非数字", { attempt: "0" }],
    ["attempt 浮点", { attempt: 0.5 }],
    ["attempt 负数", { attempt: -1 }],
    ["model 为空串", { model: "" }],
    ["provider 未知", { provider: "openai" }],
    ["latencyMs 负数", { latencyMs: -1 }],
    ["tokensIn NaN", { tokensIn: Number.NaN }],
    ["tokensOut 负数", { tokensOut: -2 }],
    ["riskTags 非数组", { riskTags: "pii" }],
    ["riskTags 含未知标签", { riskTags: ["nope"] }],
    ["riskTags 含非字符串", { riskTags: [42] }],
    ["startedAt 为空串", { startedAt: "" }],
    ["endedAt 缺失", { endedAt: undefined }],
  ])("拒绝：%s", (_label, patch) => {
    expect(isAgentTrace(traceWith(patch))).toBe(false)
  })

  it.each(NON_OBJECTS)("拒绝非对象输入：%s", (v) => {
    expect(isAgentTrace(v)).toBe(false)
  })
})

describe("守卫：isAgentError（失败语义）", () => {
  it("合法 error 通过（含 rollbackTo）", () => {
    expect(isAgentError(VALID_ERROR)).toBe(true)
  })

  it("合法 error 通过（无 rollbackTo 最小形态）", () => {
    expect(
      isAgentError({
        code: "MODEL_TIMEOUT",
        message: "推理超时",
        retryable: true,
      }),
    ).toBe(true)
  })

  it.each([
    ["code 未知", { code: "NOPE" }],
    ["code 非字符串", { code: 42 }],
    ["retryable 非布尔", { retryable: "yes" }],
    ["rollbackTo 越界", { rollbackTo: 10 }],
    ["rollbackTo 非数字", { rollbackTo: "5" }],
    ["message 为空串", { message: "" }],
    ["message 缺失", { message: undefined }],
  ])("拒绝：%s", (_label, patch) => {
    expect(isAgentError(errorWith(patch))).toBe(false)
  })

  it.each(NON_OBJECTS)("拒绝非对象输入：%s", (v) => {
    expect(isAgentError(v)).toBe(false)
  })
})

describe("守卫：isAgentOutput（Agent 产物）", () => {
  it("合法 output 通过（含 score）", () => {
    expect(isAgentOutput(VALID_OUTPUT)).toBe(true)
  })

  it("合法 output 通过（ok=false 无 score 边界；score=0 有效）", () => {
    expect(
      isAgentOutput({ ok: false, payload: {}, tokensIn: 0, tokensOut: 0 }),
    ).toBe(true)
    expect(isAgentOutput(outputWith({ score: 0 }))).toBe(true)
  })

  it.each([
    ["ok 非布尔", { ok: "yes" }],
    ["payload 为数组", { payload: [] }],
    ["payload 非对象", { payload: "x" }],
    ["payload 缺失", { payload: undefined }],
    ["score 非数字", { score: "92" }],
    ["score NaN", { score: Number.NaN }],
    ["tokensIn 负数", { tokensIn: -1 }],
    ["tokensOut 非数字", { tokensOut: "x" }],
  ])("拒绝：%s", (_label, patch) => {
    expect(isAgentOutput(outputWith(patch))).toBe(false)
  })

  it.each(NON_OBJECTS)("拒绝非对象输入：%s", (v) => {
    expect(isAgentOutput(v)).toBe(false)
  })
})

describe("守卫：isAgentResult（trace 必带铁律）", () => {
  it("最小形态：仅 trace 也合法（失败可无 output/error，但留痕不可缺）", () => {
    expect(isAgentResult(MINIMAL_RESULT)).toBe(true)
  })

  it("完整形态：output + trace 通过", () => {
    expect(isAgentResult({ trace: VALID_TRACE, output: VALID_OUTPUT })).toBe(
      true,
    )
  })

  it("失败形态：error + trace 通过", () => {
    expect(isAgentResult({ trace: VALID_TRACE, error: VALID_ERROR })).toBe(true)
  })

  it.each([
    ["trace 非法", { trace: { traceId: 1 } }],
    ["trace 缺失", { trace: undefined }],
    ["output 非法", { output: { ok: true } }],
    ["error 非法", { error: { code: "NOPE", message: "m", retryable: false } }],
  ])("拒绝：%s", (_label, patch) => {
    expect(isAgentResult({ ...MINIMAL_RESULT, ...patch } as unknown)).toBe(
      false,
    )
  })

  it.each(NON_OBJECTS)("拒绝非对象输入：%s", (v) => {
    expect(isAgentResult(v)).toBe(false)
  })
})

describe("守卫：isTaskEnvelope（任务信封）", () => {
  it("合法信封通过", () => {
    expect(isTaskEnvelope(VALID_ENVELOPE)).toBe(true)
  })

  it.each([
    ["priority 非法值", { priority: "P3" }],
    ["priority 非字符串", { priority: 1 }],
    ["attempt 非数字", { attempt: "0" }],
    ["attempt 浮点", { attempt: 1.5 }],
    ["attempt 负数", { attempt: -1 }],
    ["taskId 为空串", { taskId: "" }],
    ["traceId 为空串", { traceId: "" }],
    ["enqueuedAt 缺失", { enqueuedAt: undefined }],
    ["command 非法", { command: { type: "x" } }],
    ["command 缺失", { command: undefined }],
  ])("拒绝：%s", (_label, patch) => {
    expect(isTaskEnvelope(envelopeWith(patch))).toBe(false)
  })

  it.each(NON_OBJECTS)("拒绝非对象输入：%s", (v) => {
    expect(isTaskEnvelope(v)).toBe(false)
  })
})

// ---------- 档案同步锁（守卫常量表 ↔ data 层单一事实源） ----------

describe("契约同步：守卫与数据档案互锁", () => {
  it("8 Agent 档案 id 全部通过 isAgentId（AGENT_ID_SET 与 data/agents 无漂移）", () => {
    expect(AGENT_LIST).toHaveLength(8)
    for (const agent of AGENT_LIST) {
      expect(isAgentId(agent.id)).toBe(true)
    }
  })

  it("九步数据 step 字段全部通过 isValidReActStepId（REACT_STEP_IDS 与 data/reactSteps 无漂移）", () => {
    expect(REACT_STEPS).toHaveLength(9)
    for (const step of REACT_STEPS) {
      expect(isValidReActStepId(step.step)).toBe(true)
    }
  })
})

// ---------- 端口结构契约（伪实现赋值 + 行为断言） ----------

describe("Port 5：ModelPort（模型唯一出口）", () => {
  const mockModel: ModelPort = {
    provider: "mock",
    complete: async (req: ModelRequest): Promise<ModelResponse> => ({
      text: `ack:${req.model}`,
      tokensIn: req.maxTokens,
      tokensOut: 2,
      latencyMs: 3,
      model: req.model,
    }),
  }

  it("结构契约：complete 签名兼容，回包携带实际模型名", async () => {
    expect(mockModel.provider).toBe("mock")
    const res = await mockModel.complete({
      traceId: "trace-0001",
      model: "deepseek-v4-pro",
      system: "你是言启·千行",
      messages: [{ role: "user", content: "解析第 4 集大纲" }],
      maxTokens: 128,
    })
    expect(res.text).toBe("ack:deepseek-v4-pro")
    expect(res.tokensIn).toBe(128)
    expect(res.model).toBe("deepseek-v4-pro")
  })
})

describe("Port 6：OrchestratorPort（UI 只发命令）", () => {
  it("结构契约：dispatch/cancel/resume 三入口语义", async () => {
    const resumed: string[] = []
    const orchestrator: OrchestratorPort = {
      dispatch: async (): Promise<DispatchReceipt> => ({
        taskId: "task-0002",
        traceId: "trace-0002",
      }),
      cancel: () => undefined,
      resume: async (taskId: string) => {
        resumed.push(taskId)
      },
    }

    const receipt: DispatchReceipt = await orchestrator.dispatch(VALID_COMMAND)
    expect(receipt.taskId).toBe("task-0002")
    expect(receipt.traceId).toBe("trace-0002")

    orchestrator.cancel("task-0002")

    const decision: HumanDecision = {
      taskId: "task-0001",
      traceId: "trace-0001",
      action: "rerun",
      targetStep: 5,
      note: "人工放宽门禁重跑",
      decidedBy: "指挥官",
    }
    await orchestrator.resume("task-0001", decision)
    expect(resumed).toEqual(["task-0001"])
  })
})

describe("Port 7：TaskQueuePort（队列与 Agent 解耦）", () => {
  it("结构契约：enqueue/size/onResult 订阅退订语义", () => {
    const tasks: TaskEnvelope[] = []
    const seen: AgentResult[] = []
    const subscribers = new Set<(result: AgentResult) => void>()
    const queue: TaskQueuePort = {
      enqueue: (task) => {
        tasks.push(task)
      },
      size: () => tasks.length,
      onResult: (cb) => {
        subscribers.add(cb)
        return () => subscribers.delete(cb)
      },
    }

    expect(queue.size()).toBe(0)
    queue.enqueue(VALID_ENVELOPE)
    expect(queue.size()).toBe(1)

    const off = queue.onResult((r) => seen.push(r))
    for (const cb of subscribers) cb(MINIMAL_RESULT)
    expect(seen).toHaveLength(1)

    off()
    for (const cb of subscribers) cb(MINIMAL_RESULT)
    expect(seen).toHaveLength(1)
  })
})

describe("六元组：AgentPort.run 行为契约", () => {
  const sampleTool: AgentTool = {
    name: "milvus.hybrid_search",
    call: async (): Promise<ToolResult> => ({ ok: true, data: { hits: 3 } }),
  }
  const tools: ToolRegistry = {
    get: (name) => (name === sampleTool.name ? sampleTool : undefined),
  }
  const budget: AgentBudget = { maxTokens: 4096, maxLatencyMs: 30_000 }
  const context: AgentContext = {
    agentId: "qianxing",
    memory: { episodes: 3 },
    budget,
    riskPolicy: ["intent-spoof"],
  }
  const input: AgentInput = {
    taskId: "task-0001",
    traceId: "trace-0001",
    step: 2,
    attempt: 0,
    payload: { outline: "EP04 大纲" },
  }
  const invocation: AgentInvocation = { input, context, tools }

  const qianxingAgent: AgentPort = {
    id: "qianxing",
    primaryStages: ["novel"],
    run: async (inv) => ({
      trace: {
        ...VALID_TRACE,
        traceId: inv.input.traceId,
        taskId: inv.input.taskId,
        step: inv.input.step,
        agentId: inv.context.agentId,
      },
      output: {
        ok: true,
        payload: { intent: "production" },
        tokensIn: 412,
        tokensOut: 128,
      },
    }),
  }

  it("行为契约：run 返回值必过 isAgentResult 且 trace 回显 input（可观测铁律）", async () => {
    const result = await qianxingAgent.run(invocation)
    expect(isAgentResult(result)).toBe(true)
    expect(result.trace.traceId).toBe(input.traceId)
    expect(result.trace.taskId).toBe(input.taskId)
    expect(result.trace.step).toBe(2)
    expect(result.trace.agentId).toBe("qianxing")
    expect(result.output?.ok).toBe(true)
  })
})
