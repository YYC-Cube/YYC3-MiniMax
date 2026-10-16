/**
 * file: useReActSnapshot.test.tsx
 * description: ReAct 实时快照 Hook 单测（PR6）· 事件派生/回环/接管/终态收敛
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[hook],[react-c],[snapshot]
 *
 * test-target: hooks/useReActSnapshot × workers/orchestratorClient（进程内）
 */

import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { INITIAL_REACT_SNAPSHOT, useReActSnapshot } from "../src/hooks/useReActSnapshot"
import type { DispatchReceipt, ModelPort } from "../src/types/ports"
import {
  __resetOrchestratorClientForTests,
  getOrchestratorClient,
} from "../src/workers/orchestratorClient"

/** 剧本模型：前三次低分（第三次失败于 attempt=2 → 接管挂起），第四次达标（rerun 通过） */
function takeoverThenPassModel(): ModelPort {
  let zongshiCalls = 0
  return {
    provider: "mock",
    async complete(req) {
      if (req.system.includes("格物·宗师")) {
        zongshiCalls += 1
        return {
          text: zongshiCalls <= 3 ? '{"score": 74.8}' : '{"score": 92}',
          tokensIn: 10,
          tokensOut: 5,
          latencyMs: 1,
          model: req.model,
        }
      }
      return { text: "ok", tokensIn: 4, tokensOut: 2, latencyMs: 1, model: req.model }
    },
  }
}

beforeEach(() => {
  __resetOrchestratorClientForTests()
})

afterEach(() => {
  __resetOrchestratorClientForTests()
})

describe("useReActSnapshot：事件派生", () => {
  it("初始快照为静态基线（无 live 任务）", () => {
    const { result } = renderHook(() => useReActSnapshot())
    expect(result.current).toEqual(INITIAL_REACT_SNAPSHOT)
  })

  it("dispatch → 活跃步推进 → 接管挂起（takeoverStep 置位）；resume → 终态收敛", async () => {
    const client = getOrchestratorClient({ model: takeoverThenPassModel() })
    const { result } = renderHook(() => useReActSnapshot())

    // act 包裹 dispatch：微任务链（回环×2 → 接管挂起）在 act 内冲刷，快照同步可见
    let receipt!: DispatchReceipt
    await act(async () => {
      receipt = await client.dispatch({
        type: "widget:quality",
        payload: { text: "查看质检" },
        issuedBy: "ui-widget",
      })
    })

    expect(result.current.takeoverStep).toBe(7)
    expect(result.current.hasLiveTask).toBe(true)
    expect(result.current.attempt).toBe(2)
    expect(result.current.traceId).toBe(receipt.traceId)

    await act(async () => {
      await client.resume(receipt.taskId, {
        taskId: receipt.taskId,
        traceId: receipt.traceId,
        action: "rerun",
        decidedBy: "tester",
      })
    })

    expect(result.current.terminalPhase).toBe("done")
    expect(result.current.hasLiveTask).toBe(false)
    expect(result.current.isLoopingBack).toBe(false)
    expect(result.current.activeStep).toBe(9)
    expect(result.current.takeoverStep).toBe(7)
  })
})
