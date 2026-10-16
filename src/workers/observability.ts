/**
 * file: observability.ts（workers）
 * description: 可观测性桥（PR7）· 编排事件 → telemetry audit/metric 统一落点
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [workers],[observability],[telemetry],[orchestration]
 *
 * brief: 每步留痕（traceId/耗时/Token/模型/提供方/风险标签）+ 效应审计
 *        （回环/重试/人工接管/终态），全部经 telemetry 单行 JSON 输出可采集
 *
 * details:
 * - 装配位置：worker 模式在 entry（线程内落点），进程内模式在 client——
 *   两种模式遥测语义完全一致
 * - metric 事件名规约 agent.step.*；audit 事件名规约 react.* / agent.* / human.*
 * - traceId 贯穿：同链路 metric 与 audit 可串联检索
 *
 * dependencies: core/runtime/orchestrator（仅类型）, services/telemetry
 * exports: attachObservability
 */

import type { OrchestratorRuntime } from "../core/runtime/orchestrator"
import { telemetry } from "../services/telemetry"

/**
 * 挂接编排运行时的可观测桥：订阅 step/effect 流并落遥测
 * 返回卸载函数（卸载后不再产生事件）
 */
export function attachObservability(runtime: OrchestratorRuntime): () => void {
  const offStep = runtime.onStep((result) => {
    const trace = result.trace
    const tags = {
      agent: trace.agentId,
      step: trace.step,
      attempt: trace.attempt,
      model: trace.model,
      provider: trace.provider,
    }
    telemetry.metric("agent.step.latency_ms", trace.latencyMs, {
      unit: "ms",
      traceId: trace.traceId,
      tags,
    })
    telemetry.metric("agent.step.tokens_in", trace.tokensIn, { traceId: trace.traceId, tags })
    telemetry.metric("agent.step.tokens_out", trace.tokensOut, { traceId: trace.traceId, tags })
    if (result.error) {
      telemetry.audit(
        "agent.step.error",
        trace.taskId,
        {
          code: result.error.code,
          retryable: result.error.retryable,
          step: trace.step,
          agent: trace.agentId,
        },
        trace.traceId,
      )
    }
  })

  const offEffect = runtime.onEffect((effect, ctx) => {
    if (effect.kind === "loopback") {
      telemetry.audit(
        "react.loopback",
        ctx.taskId,
        { fromStep: effect.fromStep, toStep: effect.toStep, attempt: effect.attempt },
        ctx.traceId,
      )
    } else if (effect.kind === "retry") {
      telemetry.audit(
        "agent.retry",
        ctx.taskId,
        { step: effect.step, retryCount: effect.retryCount },
        ctx.traceId,
      )
    } else if (effect.kind === "takeover-required") {
      telemetry.audit(
        "human.takeover.required",
        ctx.taskId,
        { step: effect.step, attempt: effect.attempt, reason: effect.reason },
        ctx.traceId,
      )
    } else {
      telemetry.audit("react.terminal", ctx.taskId, { phase: effect.phase }, ctx.traceId)
    }
  })

  return () => {
    offStep()
    offEffect()
  }
}
