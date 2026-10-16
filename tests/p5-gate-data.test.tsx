/**
 * file: p5-gate-data.test.tsx
 * description: P5 门禁数据接入集成测试（KPI/PII 审计/质检队列 → 领域判定 → 视图渲染）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[integration],[p5],[gate]
 *
 * test-target: src/views/P5QualitySecurity.tsx, src/components/p5/GateOverviewCard.tsx
 * notes: 视图接线层用例——使用真实数据源（KPI_METRICS/PII_AUDIT_LOGS/AUDIT_STORYBOARDS，
 *        不 mock 数据层），验证领域判定结果在视图的渲染正确性与队列操作实时联动；
 *        FAIL 态经 GateOverviewCard 组件级直渲染覆盖（领域阈值边界见 gateEvaluation.test.ts）
 */

import { act, fireEvent, render, screen } from "@testing-library/react"
import { CheckCircle2 } from "lucide-react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GateCard } from "../src/components/p5/GateCard"
import { GateOverviewCard } from "../src/components/p5/GateOverviewCard"
import { KPI_METRICS } from "../src/data/pipeline"
import { PII_AUDIT_LOGS } from "../src/data/qualityData"
import { GATES } from "../src/domain/constants"
import { P5QualitySecurity } from "../src/views/P5QualitySecurity"

describe("P5 门禁数据接入（真实数据源 → 领域判定 → 视图）", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function renderP5() {
    render(
      <P5QualitySecurity
        onNavigateToP2={vi.fn()}
        onNavigateToP3={vi.fn()}
      />,
    )
  }

  it("门禁 1/2 值与 KPI_METRICS 同源，阈值文案由 GATES 派生", () => {
    renderP5()
    const consistencyKpi = KPI_METRICS.find(
      (k) => k.id === "consistency_score",
    )!
    const syncnetKpi = KPI_METRICS.find((k) => k.id === "syncnet_score")!

    // 展示值取自 KPI 实时数据（非硬编码）：与 pipeline.ts 任一改动保持同步
    expect(screen.getByText(`${consistencyKpi.value}%`)).toBeTruthy()
    expect(screen.getByText(`${syncnetKpi.value}`)).toBeTruthy()

    // 阈值文案单一事实源：GATES 常量 → formatGate* 派生
    expect(screen.getByText(`≥ ${GATES.CONSISTENCY}% 达标`)).toBeTruthy()
    expect(screen.getByText(`≥ ${GATES.SYNCNET} 达标`)).toBeTruthy()
  })

  it("门禁 3 接线 PII 审计：真实日志零「放行」→ 0 泄漏达标", () => {
    renderP5()
    // 前置锚定：当前真实审计数据确无绕过事件（数据回归保护）
    expect(PII_AUDIT_LOGS.filter((l) => l.action === "放行")).toHaveLength(0)
    expect(screen.getByText("0 泄漏")).toBeTruthy()
  })

  it("门禁 4 零事故上报位：渲染零入库达标态", () => {
    renderP5()
    expect(screen.getByText("零入库")).toBeTruthy()
  })

  it("总览主卡初始值：4/4 全过 + 放行率 75.0%（3 passed / 4 队列）", () => {
    renderP5()
    expect(screen.getByText("门禁总览 · 全链路放行判定")).toBeTruthy()
    expect(screen.getByText("4/4")).toBeTruthy()
    expect(screen.getByText(/今日放行率 75\.0%/)).toBeTruthy()
  })

  it("核验通过 → 放行率实时联动 75.0% → 100.0%", () => {
    renderP5()
    // sb-103（第 3 位）为唯一 pending：通过后队列 4/4 passed
    fireEvent.click(screen.getAllByRole("button", { name: "核验通过" })[2]!)
    expect(screen.getByText(/今日放行率 100\.0%/)).toBeTruthy()
  })

  it("打回重跑 → rejected 不计入放行率（保持 75.0%）且门禁判定不受队列影响", () => {
    renderP5()
    fireEvent.click(screen.getAllByRole("button", { name: "打回重跑" })[2]!)
    act(() => {
      vi.advanceTimersByTime(600)
    })
    // passed 停留 3/4：rejected 样本既非通过也非待定
    expect(screen.getByText(/今日放行率 75\.0%/)).toBeTruthy()
    // 门禁判定与队列放行率解耦：队列流转不改四道门禁计数
    expect(screen.getByText("4/4")).toBeTruthy()
  })
})

describe("GateOverviewCard 判定态渲染（组件级）", () => {
  it("PASS 态：绿色描边 + 柔光，无告警闪烁", () => {
    const { container } = render(
      <GateOverviewCard passed={4} total={4} releaseRate="100.0%" />,
    )
    expect(screen.getByText("4/4")).toBeTruthy()
    expect(screen.getByText(/今日放行率 100\.0%/)).toBeTruthy()

    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain("border-[#00FF88]/50")
    expect(card.className).toContain("shadow-[0_0_16px_rgba(0,255,136,0.15)]")
    expect(card.className).not.toContain("animate-alert-flash")
  })

  it("FAIL 态：红色描边 + 告警闪烁（alert-flash 语义收敛）", () => {
    const { container } = render(
      <GateOverviewCard passed={3} total={4} releaseRate="75.0%" />,
    )
    expect(screen.getByText("3/4")).toBeTruthy()

    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain("border-[#FF006E]/60")
    expect(card.className).toContain("animate-alert-flash")
    expect(card.className).not.toContain("border-[#00FF88]/50")
  })
})

describe("GateCard 判定态渲染（组件级）", () => {
  const baseProps = {
    icon: CheckCircle2,
    variant: "green" as const,
    title: "门禁 1 · 角色面部一致性",
    value: "91.4%",
    threshold: "≥ 80% 达标",
  }

  it("PASS 态：variant 品牌色生效（绿描边 + 脉冲灯），无告警类", () => {
    const { container } = render(<GateCard {...baseProps} passed={true} />)
    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain("border-[#00FF88]/40")
    expect(card.className).not.toContain("animate-alert-flash")
    expect(screen.getByText("≥ 80% 达标").className).toContain(
      "text-[#00FF88]",
    )
  })

  it("FAIL 态：告警覆写生效——粉描边 + 闪烁 + 阈值文案转粉", () => {
    const { container } = render(<GateCard {...baseProps} passed={false} />)
    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain("border-[#FF006E]/60")
    expect(card.className).toContain("animate-alert-flash")
    expect(card.className).not.toContain("border-[#00FF88]/40")
    // 状态点同步转粉（复用 GATE_FAIL_STYLES.dot）
    const dot = card.lastElementChild as HTMLElement
    expect(dot.className).toContain("bg-[#FF006E]")
    expect(dot.className).not.toContain("animate-pulse")
    expect(screen.getByText("≥ 80% 达标").className).toContain(
      "text-[#FF006E]",
    )
  })

  it("视图接线：全过数据源下四张中卡均为 PASS 态渲染", () => {
    render(
      <P5QualitySecurity onNavigateToP2={vi.fn()} onNavigateToP3={vi.fn()} />,
    )
    // 门禁 1-4 卡：全过数据源下均无告警闪烁
    for (const title of [
      "门禁 1 · 角色面部一致性",
      "门禁 2 · SyncNet 唇形吻合",
      "门禁 3 · 敏感隐私实体",
      "门禁 4 · 密钥凭据防泄漏",
    ]) {
      const card = screen
        .getByText(title)
        .closest(".glass-panel") as HTMLElement
      expect(card.className).not.toContain("animate-alert-flash")
      expect(card.className).not.toContain("border-[#FF006E]")
    }
  })
})
