/**
 * file: index.ts（services/adapters）
 * description: 模型适配器工厂（PR5）· 按 NEXT_PUBLIC_MODEL_PROVIDER 装配 ModelPort
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [service],[adapter],[model-port],[factory]
 *
 * brief: 环境驱动装配：mock（缺省）/ local / vllm / registry；配置不完整时
 *        结构化告警并降级 mock（高可用契约，与 eventStream SIM 降级一致）
 *
 * details:
 * - NEXT_PUBLIC_MODEL_PROVIDER：local | vllm | registry | mock（缺省 mock）
 * - NEXT_PUBLIC_MODEL_LOCAL_URL / NEXT_PUBLIC_MODEL_VLLM_URL / NEXT_PUBLIC_MODEL_REGISTRY_URL
 * - 降级必发 telemetry.warn（model_adapter.*），禁止静默
 *
 * dependencies: types/ports（仅类型）, ./local, ./mock, ./registry, ./vllm, ../telemetry
 * exports: createModelPort
 */

import type { ModelPort } from "../../types/ports"
import { telemetry } from "../telemetry"
import { localModelPort } from "./local"
import { mockModelPort } from "./mock"
import { registryModelPort } from "./registry"
import { vllmModelPort } from "./vllm"

/**
 * 按 env 装配 ModelPort（默认 process.env，测试可注入）
 * - 提供方配置合法且 URL 齐备 → 真实适配器
 * - 提供方已配置但 URL 缺失 / 未知值 → warn + mock 降级
 * - 未配置 → mock（SIM 默认，静默）
 */
export function createModelPort(env: Record<string, string | undefined> = process.env): ModelPort {
  const provider = env["NEXT_PUBLIC_MODEL_PROVIDER"]

  if (provider === "local" || provider === "vllm" || provider === "registry") {
    const url =
      provider === "local"
        ? env["NEXT_PUBLIC_MODEL_LOCAL_URL"]
        : provider === "vllm"
          ? env["NEXT_PUBLIC_MODEL_VLLM_URL"]
          : env["NEXT_PUBLIC_MODEL_REGISTRY_URL"]
    if (url) {
      if (provider === "local") return localModelPort({ baseUrl: url })
      if (provider === "vllm") return vllmModelPort({ baseUrl: url })
      return registryModelPort({ baseUrl: url })
    }
    telemetry.warn("model_adapter.fallback_mock", {
      message: `NEXT_PUBLIC_MODEL_PROVIDER=${provider} 但未配置对应 URL，已降级 mock`,
      data: { provider },
    })
    return mockModelPort()
  }

  if (provider !== undefined && provider !== "mock") {
    telemetry.warn("model_adapter.unknown_provider", {
      message: `未知 NEXT_PUBLIC_MODEL_PROVIDER=${provider}，已降级 mock`,
      data: { provider },
    })
  }
  return mockModelPort()
}
