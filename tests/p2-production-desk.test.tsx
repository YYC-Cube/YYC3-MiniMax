/**
 * file: p2-production-desk.test.tsx
 * description: P2 生产台交互测试 · 编排层重构保护网
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [test],[component],[p2]
 *
 * test-target: src/views/P2ProductionDesk.tsx + components/p2/* + hooks/useAgentEventStream
 * notes: happy-dom + fake timers 覆盖抽屉/快捷指令/门禁弹窗/SIM 流节拍四条主链路
 */

import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GATE_SIM_SAMPLE_SCORE } from "../src/domain/constants"
import {
  addTelemetrySink,
  type TelemetryEvent,
} from "../src/services/telemetry"
import { P2ProductionDesk } from "../src/views/P2ProductionDesk"

type DeskProps = Parameters<typeof P2ProductionDesk>[0]

function renderDesk(props: Partial<DeskProps> = {}) {
  const onSelectAgent = vi.fn()
  const onSendToWidget = vi.fn()
  const utils = render(
    <P2ProductionDesk
      onSelectAgent={onSelectAgent}
      onSendToWidget={onSendToWidget}
      {...props}
    />,
  )
  return { onSelectAgent, onSendToWidget, ...utils }
}

function readEventCount(): number {
  const badge = screen.getByText(/^\d+ Events$/)
  return Number(badge.textContent?.match(/(\d+) Events/)?.[1])
}

describe("P2ProductionDesk（编排层）", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("渲染 6 个阶段 Tab 与 6 张流水线卡（含进入阶段按钮）", () => {
    renderDesk()
    expect(screen.getAllByRole("button", { name: "进入阶段" })).toHaveLength(6)
    // Tab + Card 双处渲染 stepNum 徽标（数字 1-6）
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("6").length).toBeGreaterThanOrEqual(2)
    // KPI 带 6 卡与事件流面板就位
    expect(screen.getByText("ReAct-C 实时事件流")).toBeTruthy()
  })

  it('点击卡片"进入阶段"打开默认配置抽屉并可关闭', () => {
    renderDesk()
    fireEvent.click(screen.getAllByRole("button", { name: "进入阶段" })[0]!)
    expect(screen.getByText("当前阶段生产配置与算力资源分配：")).toBeTruthy()
    fireEvent.click(screen.getByText("确认并关闭"))
    expect(screen.queryByText("当前阶段生产配置与算力资源分配：")).toBeNull()
  })

  it("highlightedStageId=storyboard 时自动打开 12 字段 Schema 抽屉（W1 引用卡链路）", () => {
    renderDesk({ highlightedStageId: "storyboard" })
    expect(
      screen.getByText("标准化 12 字段分镜 Schema 规范输出表:"),
    ).toBeTruthy()
    expect(screen.getAllByText(/示例:/)).toHaveLength(12)
  })

  it("highlightedStageId=image 时展示人物面部特征门禁详情", () => {
    renderDesk({ highlightedStageId: "image" })
    expect(screen.getByText(/人物面部特征门禁/)).toBeTruthy()
    expect(screen.getByText("91.4% 通过")).toBeTruthy()
  })

  it("快捷指令经回车上抛 onSendToWidget 并回显 ACT 日志", () => {
    const { onSendToWidget } = renderDesk()
    const input = screen.getByPlaceholderText("@元启 继续下一集...")
    const before = readEventCount()

    fireEvent.change(input, { target: { value: "@元启 启动 EP05 生产" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(onSendToWidget).toHaveBeenCalledWith("@元启 启动 EP05 生产")
    expect(readEventCount()).toBe(before + 1)
    expect(
      screen.getByText(/接收控制台快捷指令: "@元启 启动 EP05 生产"/),
    ).toBeTruthy()
  })

  it("模拟门禁失败：延迟 1.5s 弹出告警弹窗，忽略后关闭，同链路上报 metric 指标", () => {
    // 同链路可观测断言：audit 与 metric.gate.consistency_pct 共享 traceId
    const captured: TelemetryEvent[] = []
    const off = addTelemetrySink((e) => captured.push(e))
    renderDesk({ onNavigateToP5: vi.fn() })

    fireEvent.click(screen.getByText("模拟门禁失败测试"))
    expect(screen.queryByText("质检门禁拦截告警：一致性不达标！")).toBeNull()

    const auditEvt = captured.find(
      (e) => e.event === "audit.gate.simulate_failure",
    )
    const metricEvt = captured.find(
      (e) => e.event === "metric.gate.consistency_pct",
    )
    expect(metricEvt?.data?.value).toBe(GATE_SIM_SAMPLE_SCORE)
    expect(metricEvt?.data?.unit).toBe("%")
    expect(metricEvt?.traceId).toBe(auditEvt?.traceId)
    off()

    act(() => {
      vi.advanceTimersByTime(1600)
    })
    expect(screen.getByText("质检门禁拦截告警：一致性不达标！")).toBeTruthy()

    fireEvent.click(screen.getByText("忽略测试"))
    expect(screen.queryByText("质检门禁拦截告警：一致性不达标！")).toBeNull()
  })

  it("SIM 模拟流按 9s 节拍注入事件", () => {
    renderDesk()
    const before = readEventCount()
    act(() => {
      vi.advanceTimersByTime(9000)
    })
    expect(readEventCount()).toBe(before + 1)
  })

  it("KPI 产能卡点击 → 导航 P4 算力监控台（IA 补链）", () => {
    const onNavigateToP4 = vi.fn()
    const { unmount } = renderDesk({ onNavigateToP4 })

    const kpiCard = screen.getByRole("button", {
      name: "系统整体可用率：前往算力监控台查看详情",
    })
    fireEvent.click(kpiCard)
    expect(onNavigateToP4).toHaveBeenCalledTimes(1)
    expect(onNavigateToP4).toHaveBeenCalledWith("system_availability")

    // 未传回调时保持纯展示（无 button 语义，不误触）
    unmount()
    renderDesk()
    expect(
      screen.queryByRole("button", {
        name: "系统整体可用率：前往算力监控台查看详情",
      }),
    ).toBeNull()
  })
})
