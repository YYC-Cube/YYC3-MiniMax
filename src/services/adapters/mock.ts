/**
 * file: mock.ts（services/adapters）
 * description: mock 模型适配器（PR5）· 确定性回显，SIM 模式默认提供方
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [service],[adapter],[model-port],[mock]
 *
 * brief: 未配置真实网关时的降级提供方（与 eventStream/piiReveal SIM 哲学一致）
 *
 * dependencies: types/ports（仅类型）
 * exports: MockModelOptions, mockModelPort
 */

import type { ModelPort, ModelRequest, ModelResponse } from "../../types/ports"
import { estimateTokens } from "./http"

export interface MockModelOptions {
  /** 自定义回包文本（缺省回显末条用户消息） */
  reply?: (req: ModelRequest) => string
  /** 模拟延迟（默认 0） */
  latencyMs?: number
}

/** 确定性 mock ModelPort：token 按字符估算，无随机性 */
export function mockModelPort(options: MockModelOptions = {}): ModelPort {
  return {
    provider: "mock",
    async complete(req: ModelRequest): Promise<ModelResponse> {
      const lastUser = req.messages.length > 0 ? req.messages[req.messages.length - 1].content : ""
      const text = options.reply ? options.reply(req) : `[mock:${req.model}] ${lastUser}`
      return {
        text,
        tokensIn: estimateTokens(lastUser),
        tokensOut: estimateTokens(text),
        latencyMs: options.latencyMs ?? 0,
        model: req.model,
      }
    },
  }
}
