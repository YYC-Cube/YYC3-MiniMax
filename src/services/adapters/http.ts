/**
 * file: http.ts（services/adapters）
 * description: 模型适配器共享基座（PR5）· OpenAI 兼容 HTTP 传输 + 错误分类 + Token 估算
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [service],[adapter],[model-port],[http]
 *
 * brief: local/vLLM 适配器的共用传输层：POST + 超时中止 + HTTP/网络错误结构化分类
 *
 * details:
 * - fetch 仅存在于 services 适配器（ESLint 纯核禁令的合法落点）
 * - 错误分类铁律：网络中断/超时/5xx/429 → MODEL_TIMEOUT 可重试；
 *   其余 4xx（鉴权/参数/内容策略）→ PROVIDER_REJECTED 不可重试；
 *   响应非合法 JSON → PROVIDER_REJECTED
 * - Agent 核（core/agents）对抛错做结构化 duck-typing 读取 code/retryable
 *
 * dependencies: types/agent（仅类型）, types/ports（仅类型）
 * exports: ModelError, OpenAICompatibleConfig, openAICompatibleModelPort, postJson, estimateTokens
 */

import type { AgentErrorCode, ProviderKind } from "../../types/agent"
import type { ModelPort, ModelRequest, ModelResponse } from "../../types/ports"

/** 结构化模型错误：code/retryable 由 Agent 核读取（duck-typing 契约） */
export class ModelError extends Error {
  readonly code: AgentErrorCode
  readonly retryable: boolean

  constructor(code: AgentErrorCode, message: string, retryable: boolean) {
    super(message)
    this.name = "ModelError"
    this.code = code
    this.retryable = retryable
  }
}

/** OpenAI 兼容端点配置（local / vLLM 共用） */
export interface OpenAICompatibleConfig {
  baseUrl: string
  timeoutMs?: number
  provider: ProviderKind
}

const DEFAULT_TIMEOUT_MS = 30_000

/** 粗估 Token 数（无 usage 字段时降级：约 4 字符/Token） */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/** 网络层/中止错误 → 可重试 MODEL_TIMEOUT */
function classifyTransportError(error: unknown, timeoutMs: number): ModelError {
  const isAbort = error instanceof Error && error.name === "AbortError"
  const message = error instanceof Error ? error.message : String(error)
  return new ModelError("MODEL_TIMEOUT", isAbort ? `模型请求超时（${timeoutMs}ms）` : `模型网络故障: ${message}`, true)
}

/** HTTP 状态 → 5xx/429 可重试，其余 4xx 不可重试 */
function classifyStatus(status: number): ModelError {
  if (status >= 500 || status === 429) {
    return new ModelError("MODEL_TIMEOUT", `提供方暂不可用（HTTP ${status}）`, true)
  }
  return new ModelError("PROVIDER_REJECTED", `提供方拒绝请求（HTTP ${status}）`, false)
}

/** 带超时中止的 JSON POST（services 层唯一 fetch 出口，可被测试 stub） */
export async function postJson(
  url: string,
  body: unknown,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    throw classifyTransportError(error, timeoutMs)
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw classifyStatus(res.status)
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    throw new ModelError("PROVIDER_REJECTED", "提供方响应非合法 JSON", false)
  }
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : undefined
}

function numberOrUndefined(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined
}

/** OpenAI 兼容 ModelPort 工厂（/v1/chat/completions 协议） */
export function openAICompatibleModelPort(config: OpenAICompatibleConfig): ModelPort {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  return {
    provider: config.provider,
    async complete(req: ModelRequest): Promise<ModelResponse> {
      const startedAt = Date.now()
      const payload = await postJson(
        `${config.baseUrl}/v1/chat/completions`,
        {
          model: req.model,
          messages: [{ role: "system", content: req.system }, ...req.messages],
          max_tokens: req.maxTokens,
          temperature: req.temperature,
          stream: false,
        },
        timeoutMs,
      )
      const choices = payload["choices"]
      const choiceList = Array.isArray(choices) ? choices : []
      const first = asRecord(choiceList[0])
      const message = asRecord(first?.["message"])
      const text = typeof message?.["content"] === "string" ? message["content"] : JSON.stringify(payload)
      const usage = asRecord(payload["usage"])
      const fallbackChars = `${req.system}${JSON.stringify(req.messages)}${text}`
      return {
        text,
        tokensIn: numberOrUndefined(usage?.["prompt_tokens"]) ?? estimateTokens(fallbackChars),
        tokensOut: numberOrUndefined(usage?.["completion_tokens"]) ?? estimateTokens(text),
        latencyMs: Date.now() - startedAt,
        model: typeof payload["model"] === "string" ? payload["model"] : req.model,
      }
    },
  }
}
