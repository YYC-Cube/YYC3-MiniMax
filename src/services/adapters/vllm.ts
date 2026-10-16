/**
 * file: vllm.ts（services/adapters）
 * description: vLLM 模型适配器（PR5）· OpenAI 兼容 /v1/chat/completions 协议
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [service],[adapter],[model-port],[vllm]
 *
 * brief: vLLM 推理集群桥接（http.ts 共享传输 + 错误分类），429 限流归类为可重试
 *
 * dependencies: types/agent（仅类型）, ./http
 * exports: VllmModelConfig, vllmModelPort
 */

import type { ModelPort } from "../../types/ports"
import { openAICompatibleModelPort } from "./http"

export interface VllmModelConfig {
  /** vLLM 服务基地址（如 http://gpu-node:8000） */
  baseUrl: string
  timeoutMs?: number
}

/** vLLM ModelPort（provider = "vllm"） */
export function vllmModelPort(config: VllmModelConfig): ModelPort {
  return openAICompatibleModelPort({ ...config, provider: "vllm" })
}
