/**
 * file: useReActSnapshot.ts
 * description: ReAct-C 实时快照 Hook（PR6）· 订阅编排事件流派生九步闭环视图状态
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [hook],[react-c],[snapshot],[orchestration]
 *
 * brief: P3 等视图消费的状态机快照：活跃步/复检轮次/回环中/接管步/终态，
 *        全部由 step/effect 事件派生——视图不再自造演示状态（无 live 任务时由调用方回退演示）
 *
 * details:
 * - onStep：活跃步推进并解除回环标记（回环红弧在下一步开跑时熄灭）
 * - onEffect：loopback 置回环态；takeover-required 记录接管步；terminal 记终态并结束 live
 * - 事件回调内 setState（订阅回调非 effect 直体，Compiler 合规）
 *
 * dependencies: react, workers/orchestratorClient, types
 * exports: ReActSnapshot, INITIAL_REACT_SNAPSHOT, useReActSnapshot
 */

import { useEffect, useState } from "react"
import { getOrchestratorClient } from "../workers/orchestratorClient"

export interface ReActSnapshot {
  /** 是否有 live 任务在跑（false 时视图可回退本地演示动画） */
  hasLiveTask: boolean
  /** 活跃步（1..9；null = 尚无 step 事件） */
  activeStep: number | null
  /** 当前复检轮次（回环累计） */
  attempt: number
  /** 回环红弧展示态（loopback 起，下一步事件止） */
  isLoopingBack: boolean
  /** 人工接管发生步（null = 无接管） */
  takeoverStep: number | null
  /** 最近一次终态（done/failed/rolled-back/cancelled） */
  terminalPhase: "done" | "failed" | "rolled-back" | "cancelled" | null
  /** 最近 live 任务链路 ID */
  traceId: string | null
}

export const INITIAL_REACT_SNAPSHOT: ReActSnapshot = {
  hasLiveTask: false,
  activeStep: null,
  attempt: 0,
  isLoopingBack: false,
  takeoverStep: null,
  terminalPhase: null,
  traceId: null,
}

export function useReActSnapshot(): ReActSnapshot {
  const [snapshot, setSnapshot] = useState<ReActSnapshot>(INITIAL_REACT_SNAPSHOT)

  useEffect(() => {
    const client = getOrchestratorClient()
    const offStep = client.onStep((result) => {
      setSnapshot((prev) => ({
        ...prev,
        hasLiveTask: true,
        activeStep: result.trace.step,
        attempt: result.trace.attempt,
        isLoopingBack: false,
        traceId: result.trace.traceId,
      }))
    })
    const offEffect = client.onEffect((effect) => {
      if (effect.kind === "loopback") {
        setSnapshot((prev) => ({
          ...prev,
          hasLiveTask: true,
          isLoopingBack: true,
          attempt: effect.attempt,
          traceId: effect.traceId,
        }))
      } else if (effect.kind === "takeover-required") {
        setSnapshot((prev) => ({
          ...prev,
          hasLiveTask: true,
          takeoverStep: effect.step,
          traceId: effect.traceId,
        }))
      } else if (effect.kind === "terminal") {
        setSnapshot((prev) => ({
          ...prev,
          hasLiveTask: false,
          isLoopingBack: false,
          terminalPhase: effect.phase,
          traceId: effect.traceId ?? prev.traceId,
        }))
      }
    })
    return () => {
      offStep()
      offEffect()
    }
  }, [])

  return snapshot
}
