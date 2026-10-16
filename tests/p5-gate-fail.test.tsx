/**
 * file: p5-gate-fail.test.tsx
 * description: P5 门禁 FAIL 场景视图传播测试（真实 GateProvider 链路：触发 → 降级 → 复位）
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[integration],[p5],[gate],[failure]
 *
 * test-target: src/context/gate.tsx, src/views/P5QualitySecurity.tsx,
 *              src/domain/gateEvaluation.ts
 * notes: 走真实跨视图链路（GateProvider + useGate 触发探针），不 mock 数据层——
 *        P2 触发 simulateGateFail → P5 门禁 1 注入 GATE_SIM_SAMPLE_SCORE →
 *        总览/中卡降级 → clearGateFail 复位，全链路可验证；
 *        领域阈值边界见 gateEvaluation.test.ts，全过场景接线见 p5-gate-data.test.tsx
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { GateProvider, useGate } from "../src/context/gate"
import { GATE_SIM_SAMPLE_SCORE, GATES } from "../src/domain/constants"
import { P5QualitySecurity } from "../src/views/P5QualitySecurity"

/** 测试探针：暴露触发/复位按钮，驱动真实 GateProvider 状态（模拟 P2 触发侧） */
function GateTriggerProbe() {
  const { simulateGateFail, clearGateFail } = useGate()
  return (
    <>
      <button type="button" onClick={simulateGateFail}>
        PROBE-SIMULATE
      </button>
      <button type="button" onClick={clearGateFail}>
        PROBE-CLEAR
      </button>
    </>
  )
}

function renderGateChain() {
  render(
    <GateProvider>
      <GateTriggerProbe />
      <P5QualitySecurity onNavigateToP2={vi.fn()} onNavigateToP3={vi.fn()} />
    </GateProvider>,
  )
}

describe("P5 门禁 FAIL 场景（真实 GateProvider 链路传播）", () => {
  it("默认态：无演示事故，门禁 4/4 全过 + 91.4 达标值", () => {
    renderGateChain()
    expect(screen.getByText("4/4")).toBeTruthy()
    const card1 = screen
      .getByText("门禁 1 · 角色面部一致性")
      .closest(".glass-panel") as HTMLElement
    expect(card1.textContent).toContain("91.4%")
    expect(card1.className).not.toContain("animate-alert-flash")
  })

  it("simulateGateFail → 门禁 1 注入事故样本 74.8 并告警（值贯通断言）", () => {
    renderGateChain()
    fireEvent.click(screen.getByText("PROBE-SIMULATE"))

    const card1 = screen
      .getByText("门禁 1 · 角色面部一致性")
      .closest(".glass-panel") as HTMLElement
    // 值贯通：useGate 激活 → GATE_SIM_SAMPLE_SCORE 注入 → GateCard 展示
    expect(card1.textContent).toContain(`${GATE_SIM_SAMPLE_SCORE}%`)
    expect(card1.textContent).not.toContain("91.4%")
    // 判定贯通：74.8 < GATES.CONSISTENCY → 告警态
    expect(GATE_SIM_SAMPLE_SCORE).toBeLessThan(GATES.CONSISTENCY)
    expect(card1.className).toContain("border-[#FF006E]/60")
    expect(card1.className).toContain("animate-alert-flash")
  })

  it("总览主卡联动降级 4/4 → 3/4 + 红闪；其余门禁保持达标态", () => {
    renderGateChain()
    fireEvent.click(screen.getByText("PROBE-SIMULATE"))

    expect(screen.getByText("3/4")).toBeTruthy()
    const overview = screen
      .getByText("门禁总览 · 全链路放行判定")
      .closest(".glass-panel") as HTMLElement
    expect(overview.className).toContain("border-[#FF006E]/60")
    expect(overview.className).toContain("animate-alert-flash")

    // 未受影响的门禁 2 保持 variant 达标态（隔离性）
    const card2 = screen
      .getByText("门禁 2 · SyncNet 唇形吻合")
      .closest(".glass-panel") as HTMLElement
    expect(card2.className).toContain("border-[#00F0FF]/40")
    expect(card2.className).not.toContain("animate-alert-flash")
  })

  it("门禁判定与质检队列解耦：FAIL 态放行率仍 75.0%", () => {
    renderGateChain()
    fireEvent.click(screen.getByText("PROBE-SIMULATE"))
    // 队列未动：门禁演示事故不影响 passed/total 放行率（数据源独立）
    expect(screen.getByText(/今日放行率 75\.0%/)).toBeTruthy()
  })

  it("clearGateFail 复位：恢复 4/4 全过与 91.4 达标值（模拟模态「忽略测试」）", () => {
    renderGateChain()
    fireEvent.click(screen.getByText("PROBE-SIMULATE"))
    expect(screen.getByText("3/4")).toBeTruthy()

    fireEvent.click(screen.getByText("PROBE-CLEAR"))
    expect(screen.getByText("4/4")).toBeTruthy()
    const card1 = screen
      .getByText("门禁 1 · 角色面部一致性")
      .closest(".glass-panel") as HTMLElement
    expect(card1.textContent).toContain("91.4%")
    expect(card1.className).not.toContain("animate-alert-flash")
  })
})
