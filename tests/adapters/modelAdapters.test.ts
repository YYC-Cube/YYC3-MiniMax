/**
 * file: modelAdapters.test.ts
 * description: 模型适配器单测（PR5）· mock/本地/vLLM/Registry 协议映射 + 错误分类 + 工厂矩阵
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[service],[adapter],[model-port]
 *
 * test-target: services/adapters/*（fetch 全量 stub；错误分类铁律见 http.ts 头注）
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { createModelPort } from "../../src/services/adapters"
import { ModelError, estimateTokens } from "../../src/services/adapters/http"
import { localModelPort } from "../../src/services/adapters/local"
import { mockModelPort } from "../../src/services/adapters/mock"
import { registryModelPort } from "../../src/services/adapters/registry"
import { vllmModelPort } from "../../src/services/adapters/vllm"
import { addTelemetrySink, type TelemetryEvent } from "../../src/services/telemetry"
import type { ModelRequest } from "../../src/types/ports"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const REQ: ModelRequest = {
  traceId: "trace-m1",
  model: "deepseek-v4-pro",
  system: "你是言启·千行",
  messages: [{ role: "user", content: "hello world" }],
  maxTokens: 64,
}

interface FetchCapture {
  url: string
  body: Record<string, unknown>
}

/** stub fetch：记录请求并返回指定 JSON；capture 由用例读取 */
function stubFetchJson(json: unknown, status = 200, capture?: FetchCapture) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown, init?: RequestInit) => {
      if (capture) {
        capture.url = String(url)
        capture.body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>
      }
      return new Response(JSON.stringify(json), { status, headers: { "Content-Type": "application/json" } })
    }),
  )
}

// ---------- mock ----------

describe("适配器：mock", () => {
  it("默认回显末条用户消息；token 按字符估算；provider=mock", async () => {
    const port = mockModelPort()
    const res = await port.complete(REQ)
    expect(port.provider).toBe("mock")
    expect(res.text).toBe("[mock:deepseek-v4-pro] hello world")
    expect(res.tokensIn).toBe(estimateTokens("hello world"))
    expect(res.tokensOut).toBe(estimateTokens(res.text))
    expect(res.model).toBe("deepseek-v4-pro")
    expect(res.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it("自定义 reply 与 latencyMs 生效", async () => {
    const port = mockModelPort({ reply: () => '{"score": 91.4}', latencyMs: 3 })
    const res = await port.complete(REQ)
    expect(res.text).toBe('{"score": 91.4}')
    expect(res.latencyMs).toBe(3)
  })
})

// ---------- OpenAI 兼容（local / vllm） ----------

const OPENAI_OK = {
  model: "deepseek-v4-pro@local",
  choices: [{ message: { role: "assistant", content: "工单已生成" } }],
  usage: { prompt_tokens: 10, completion_tokens: 4 },
}

describe("适配器：local（OpenAI 兼容）", () => {
  it("请求形态与响应映射：/v1/chat/completions + system 消息 + usage 透传", async () => {
    const capture: FetchCapture = { url: "", body: {} }
    stubFetchJson(OPENAI_OK, 200, capture)
    const port = localModelPort({ baseUrl: "http://127.0.0.1:11434" })
    const res = await port.complete(REQ)
    expect(port.provider).toBe("local")
    expect(capture.url).toBe("http://127.0.0.1:11434/v1/chat/completions")
    expect(capture.body["model"]).toBe("deepseek-v4-pro")
    expect(capture.body["max_tokens"]).toBe(64)
    expect(capture.body["stream"]).toBe(false)
    const messages = capture.body["messages"] as Array<{ role: string; content: string }>
    expect(messages[0]).toEqual({ role: "system", content: "你是言启·千行" })
    expect(res.text).toBe("工单已生成")
    expect(res.tokensIn).toBe(10)
    expect(res.tokensOut).toBe(4)
    expect(res.model).toBe("deepseek-v4-pro@local")
  })

  it("缺 usage 字段：字符估算降级", async () => {
    stubFetchJson({ choices: [{ message: { content: "ok" } }] })
    const res = await localModelPort({ baseUrl: "http://l" }).complete(REQ)
    expect(res.tokensIn).toBeGreaterThan(0)
    expect(res.tokensOut).toBe(estimateTokens("ok"))
    expect(res.model).toBe("deepseek-v4-pro")
  })
})

describe("适配器：vllm（OpenAI 兼容薄封装）", () => {
  it("provider=vllm，同一协议端点", async () => {
    const capture: FetchCapture = { url: "", body: {} }
    stubFetchJson(OPENAI_OK, 200, capture)
    const port = vllmModelPort({ baseUrl: "http://gpu:8000" })
    await port.complete(REQ)
    expect(port.provider).toBe("vllm")
    expect(capture.url).toBe("http://gpu:8000/v1/chat/completions")
  })
})

// ---------- Registry ----------

describe("适配器：registry（/resolve 协议）", () => {
  it("请求携带 trace_id；响应字段映射", async () => {
    const capture: FetchCapture = { url: "", body: {} }
    stubFetchJson(
      { text: "路由应答", tokens_in: 20, tokens_out: 8, model: "routed-model-x" },
      200,
      capture,
    )
    const port = registryModelPort({ baseUrl: "https://registry.yyc3.local" })
    const res = await port.complete(REQ)
    expect(port.provider).toBe("registry")
    expect(capture.url).toBe("https://registry.yyc3.local/resolve")
    expect(capture.body["trace_id"]).toBe("trace-m1")
    expect(capture.body["system"]).toBe("你是言启·千行")
    expect(res).toMatchObject({ text: "路由应答", tokensIn: 20, tokensOut: 8, model: "routed-model-x" })
  })

  it("403 → PROVIDER_REJECTED 不可重试", async () => {
    stubFetchJson({ error: "forbidden" }, 403)
    await expect(registryModelPort({ baseUrl: "https://r" }).complete(REQ)).rejects.toMatchObject({
      code: "PROVIDER_REJECTED",
      retryable: false,
    })
  })
})

// ---------- 错误分类铁律 ----------

describe("适配器：错误分类", () => {
  async function captureError(port: ReturnType<typeof localModelPort>): Promise<unknown> {
    try {
      await port.complete(REQ)
    } catch (error) {
      return error
    }
    throw new Error("应当抛错")
  }

  it("HTTP 500 / 429 → MODEL_TIMEOUT 可重试", async () => {
    stubFetchJson({}, 500)
    const e500 = await captureError(localModelPort({ baseUrl: "http://l" }))
    expect(e500).toBeInstanceOf(ModelError)
    expect(e500).toMatchObject({ code: "MODEL_TIMEOUT", retryable: true })

    stubFetchJson({}, 429)
    const e429 = await captureError(localModelPort({ baseUrl: "http://l" }))
    expect(e429).toMatchObject({ code: "MODEL_TIMEOUT", retryable: true })
  })

  it("HTTP 401 → PROVIDER_REJECTED 不可重试", async () => {
    stubFetchJson({}, 401)
    expect(await captureError(localModelPort({ baseUrl: "http://l" }))).toMatchObject({
      code: "PROVIDER_REJECTED",
      retryable: false,
    })
  })

  it("网络中断（TypeError）→ MODEL_TIMEOUT 可重试", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed")
      }),
    )
    expect(await captureError(localModelPort({ baseUrl: "http://l" }))).toMatchObject({
      code: "MODEL_TIMEOUT",
      retryable: true,
    })
  })

  it("超时中止（AbortError）→ MODEL_TIMEOUT 可重试，消息含超时时长", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: unknown, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("The operation was aborted", "AbortError")),
            )
          }),
      ),
    )
    const error = (await captureError(localModelPort({ baseUrl: "http://l", timeoutMs: 5 }))) as ModelError
    expect(error).toMatchObject({ code: "MODEL_TIMEOUT", retryable: true })
    expect(error.message).toContain("5ms")
  })

  it("响应非合法 JSON → PROVIDER_REJECTED", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not-json", { status: 200 })))
    expect(await captureError(localModelPort({ baseUrl: "http://l" }))).toMatchObject({
      code: "PROVIDER_REJECTED",
      retryable: false,
    })
  })
})

// ---------- 工厂矩阵 ----------

describe("工厂：createModelPort（env 驱动装配）", () => {
  it("未配置 → mock（静默）", () => {
    const events: TelemetryEvent[] = []
    const uninstall = addTelemetrySink((e) => events.push(e))
    const port = createModelPort({})
    expect(port.provider).toBe("mock")
    expect(events).toHaveLength(0)
    uninstall()
  })

  it("provider=local + URL → local", () => {
    expect(
      createModelPort({
        NEXT_PUBLIC_MODEL_PROVIDER: "local",
        NEXT_PUBLIC_MODEL_LOCAL_URL: "http://127.0.0.1:11434",
      }).provider,
    ).toBe("local")
  })

  it("provider=vllm + URL → vllm", () => {
    expect(
      createModelPort({
        NEXT_PUBLIC_MODEL_PROVIDER: "vllm",
        NEXT_PUBLIC_MODEL_VLLM_URL: "http://gpu:8000",
      }).provider,
    ).toBe("vllm")
  })

  it("provider=registry + URL → registry", () => {
    expect(
      createModelPort({
        NEXT_PUBLIC_MODEL_PROVIDER: "registry",
        NEXT_PUBLIC_MODEL_REGISTRY_URL: "https://r",
      }).provider,
    ).toBe("registry")
  })

  it("provider 已配置但 URL 缺失 → warn + mock 降级", () => {
    const events: TelemetryEvent[] = []
    const uninstall = addTelemetrySink((e) => events.push(e))
    const port = createModelPort({ NEXT_PUBLIC_MODEL_PROVIDER: "vllm" })
    expect(port.provider).toBe("mock")
    expect(events.some((e) => e.event === "model_adapter.fallback_mock" && e.level === "warn")).toBe(true)
    uninstall()
  })

  it("未知 provider → warn + mock 降级", () => {
    const events: TelemetryEvent[] = []
    const uninstall = addTelemetrySink((e) => events.push(e))
    const port = createModelPort({ NEXT_PUBLIC_MODEL_PROVIDER: "openai" })
    expect(port.provider).toBe("mock")
    expect(events.some((e) => e.event === "model_adapter.unknown_provider" && e.level === "warn")).toBe(true)
    uninstall()
  })

  it("显式 provider=mock → mock（静默）", () => {
    const events: TelemetryEvent[] = []
    const uninstall = addTelemetrySink((e) => events.push(e))
    expect(createModelPort({ NEXT_PUBLIC_MODEL_PROVIDER: "mock" }).provider).toBe("mock")
    expect(events).toHaveLength(0)
    uninstall()
  })
})
