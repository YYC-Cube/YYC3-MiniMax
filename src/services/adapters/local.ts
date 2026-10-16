/**
 * file: local.ts（services/adapters）
 * description: 本地推理模型适配器（PR5）· OpenAI 兼容端点（Ollama/LM Studio/llama.cpp）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [service],[adapter],[model-port],[local]
 *
 * brief: 本地推理服务桥接（http.ts 共享传输 + 错误分类），baseUrl 指向本地 OpenAI 兼容服务
 *
 * dependencies: types/agent（仅类型）, ./http
 * exports: LocalModelConfig, localModelPort
 */

import type { ModelPort } from "../../types/ports"
import { openAICompatibleModelPort } from "./http"

export interface LocalModelConfig {
  /** 本地 OpenAI 兼容服务基地址（如 http://127.0.0.1:11434） */
  baseUrl: string
  timeoutMs?: number
}

/** 本地推理 ModelPort（provider = "local"） */
export function localModelPort(config: LocalModelConfig): ModelPort {
  return openAICompatibleModelPort({ ...config, provider: "local" })
}
