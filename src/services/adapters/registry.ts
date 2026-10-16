/**
 * file: registry.ts（services/adapters）
 * description: 模型 Registry 适配器（PR5）· 注册中心路由协议（/resolve）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [service],[adapter],[model-port],[registry]
 *
 * brief: 经模型注册中心路由实际后端：请求携带 trace_id 供注册中心留痕，
 *        应答 model 字段为实际路由到的模型（可能与请求模型名不同）
 *
 * details:
 * - 协议：POST {baseUrl}/resolve，请求 { model, system, messages, max_tokens,
 *   temperature, trace_id }，应答 { text, tokens_in, tokens_out, model }
 * - tokens 缺失时按字符估算降级；错误分类与 OpenAI 兼容层共用（http.ts）
 *
 * dependencies: types/ports（仅类型）, ./http
 * exports: RegistryModelConfig, registryModelPort
 */

import type { ModelPort, ModelRequest, ModelResponse } from "../../types/ports"
import { estimateTokens, postJson } from "./http"

const DEFAULT_TIMEOUT_MS = 30_000

export interface RegistryModelConfig {
  /** 注册中心基地址（如 https://registry.yyc3.local） */
  baseUrl: string
  timeoutMs?: number
}

function numberOrUndefined(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined
}

/** 模型 Registry ModelPort（provider = "registry"） */
export function registryModelPort(config: RegistryModelConfig): ModelPort {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  return {
    provider: "registry",
    async complete(req: ModelRequest): Promise<ModelResponse> {
      const startedAt = Date.now()
      const payload = await postJson(
        `${config.baseUrl}/resolve`,
        {
          model: req.model,
          system: req.system,
          messages: req.messages,
          max_tokens: req.maxTokens,
          temperature: req.temperature,
          trace_id: req.traceId,
        },
        timeoutMs,
      )
      const text = typeof payload["text"] === "string" ? payload["text"] : JSON.stringify(payload)
      const tokensIn = numberOrUndefined(payload["tokens_in"]) ?? estimateTokens(`${req.system}${JSON.stringify(req.messages)}`)
      const tokensOut = numberOrUndefined(payload["tokens_out"]) ?? estimateTokens(text)
      return {
        text,
        tokensIn,
        tokensOut,
        latencyMs: Date.now() - startedAt,
        model: typeof payload["model"] === "string" ? payload["model"] : req.model,
      }
    },
  }
}
