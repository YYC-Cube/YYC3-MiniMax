/**
 * file: widgetTakeover.test.tsx
 * description: W1 人工接管卡片交互测试（PR7）· 复检耗尽挂起 → 三键裁决 → resume 全链路
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[component],[widget],[takeover],[resume]
 *
 * test-target: components/UniversalWidget × hooks/useWidgetChat × workers/orchestratorClient
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { UniversalWidget } from "../src/components/UniversalWidget"
import type { ModelPort } from "../src/types/ports"
import {
  __resetOrchestratorClientForTests,
  getOrchestratorClient,
} from "../src/workers/orchestratorClient"

/** 剧本模型：failLimit 次 S7 低分后达标（failLimit=Infinity 即永不达标） */
function scriptedModel(failLimit: number): ModelPort {
  let zongshiCalls = 0
  return {
    provider: "mock",
    async complete(req) {
      if (req.system.includes("格物·宗师")) {
        zongshiCalls += 1
        const pass = zongshiCalls > failLimit
        return {
          text: pass ? '{"score": 92}' : '{"score": 74.8}',
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

function renderWidget() {
  return render(
    <UniversalWidget
      activeAgentId="tianshu"
      onSelectAgent={() => undefined}
      isOpen
      onToggleOpen={() => undefined}
    />,
  )
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  vi.spyOn(console, "error").mockImplementation(() => undefined)
})

beforeEach(() => {
  localStorage.clear()
  __resetOrchestratorClientForTests()
})

afterEach(() => {
  __resetOrchestratorClientForTests()
})

describe("W1 人工接管卡片（PR7 全链路）", () => {
  it("质检指令 → 复检耗尽挂起 → 接管卡片渲染 → 重跑裁决 → 达标回复回流 + 卡片禁用", async () => {
    // 前三次低分：第三次失败发生于 attempt=2 → 接管挂起；rerun 后第 4 次达标
    getOrchestratorClient({ model: scriptedModel(3) })
    renderWidget()

    // 芯片「查看质检」触发 quality 意图 → dispatch
    fireEvent.click(screen.getByRole("button", { name: "查看质检" }))

    // 接管卡片出现（复检耗尽，第 2 轮）
    expect(await screen.findByText("人工接管 · HUMAN TAKEOVER")).toBeTruthy()
    expect(screen.getByText(/复检轮次耗尽（第 2 轮）/)).toBeTruthy()

    // 三键齐备
    expect(screen.getByRole("button", { name: "重跑 Step5" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "回滚检查点" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "终止任务" })).toBeTruthy()

    // 裁决 rerun：第 3 次 S7 达标 → quality 意图回复回流
    fireEvent.click(screen.getByRole("button", { name: "重跑 Step5" }))
    expect(await screen.findByText(/人工裁决已下发/)).toBeTruthy()
    expect(await screen.findByText(/已就绪/)).toBeTruthy()
    expect(screen.getByText(/高于门禁阈值/)).toBeTruthy()

    // 裁决后卡片禁用（防重复裁决）
    const rerunBtn = screen.getByRole("button", { name: "重跑 Step5" }) as HTMLButtonElement
    expect(rerunBtn.disabled).toBe(true)
  })

  it("abort 裁决 → failed 终态系统消息回流", async () => {
    getOrchestratorClient({ model: scriptedModel(Number.POSITIVE_INFINITY) })
    renderWidget()

    fireEvent.click(screen.getByRole("button", { name: "查看质检" }))
    expect(await screen.findByText("人工接管 · HUMAN TAKEOVER")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "终止任务" }))
    await waitFor(() => expect(screen.getByText(/执行失败/)).toBeTruthy())
  })

  it("接管消息持久化至 localStorage（刷新恢复语义）", async () => {
    getOrchestratorClient({ model: scriptedModel(Number.POSITIVE_INFINITY) })
    renderWidget()
    fireEvent.click(screen.getByRole("button", { name: "查看质检" }))
    await screen.findByText("人工接管 · HUMAN TAKEOVER")

    const stored = JSON.parse(localStorage.getItem("yyc3.w1.messages")!) as Array<{
      takeover?: { taskId: string; step: number }
    }>
    const takeoverMsg = stored.find((m) => m.takeover)
    expect(takeoverMsg?.takeover?.step).toBe(7)
    expect(typeof takeoverMsg?.takeover?.taskId).toBe("string")
  })
})
