/**
 * file: p1-p3-p4.test.tsx
 * description: P1 家族中枢 / P3 ReAct 闭环 / P4 算力监控 交互测试
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [test],[component],[p1],[p3],[p4]
 *
 * test-target: src/views/P1FamilyCenter.tsx, P3ReActWorkflow.tsx, P4OpsMonitoring.tsx
 * notes: 覆盖成员唤起/轮播/回环时序/告警路由四条主链路（视图层棘轮爬坡）
 */

import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { P1FamilyCenter } from "../src/views/P1FamilyCenter"
import { P3ReActWorkflow } from "../src/views/P3ReActWorkflow"
import { P4OpsMonitoring } from "../src/views/P4OpsMonitoring"

describe("P1FamilyCenter（家族中枢）", () => {
  function renderP1() {
    const onSelectAgent = vi.fn()
    const onNavigate = vi.fn()
    render(
      <P1FamilyCenter onSelectAgent={onSelectAgent} onNavigate={onNavigate} />,
    )
    return { onSelectAgent, onNavigate }
  }

  it("渲染 8 成员时钟位与中心 Logo", () => {
    renderP1()
    for (const label of [
      "12:00",
      "01:30",
      "03:00",
      "04:30",
      "06:00",
      "07:30",
      "09:00",
      "10:30",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    expect(screen.getByText("YYC³")).toBeTruthy()
  })

  it("点击成员唤起 W1（回调携带 AgentId）", () => {
    const { onSelectAgent } = renderP1()
    // 点击时钟位徽标（子元素冒泡到成员容器）
    fireEvent.click(screen.getByText("12:00"))
    expect(onSelectAgent).toHaveBeenCalledWith("tianshu")
    fireEvent.click(screen.getByText("03:00"))
    expect(onSelectAgent).toHaveBeenCalledWith("zongshi")
    expect(onSelectAgent).toHaveBeenCalledTimes(2)
  })

  it("悬浮成员展示档案卡（状态/最后发言/驱动模型）", () => {
    renderP1()
    const member = screen.getByText("12:00").parentElement!
    fireEvent.mouseEnter(member)
    expect(screen.getByText("时钟位点:")).toBeTruthy()
    expect(screen.getByText("最后发言:")).toBeTruthy()
    expect(screen.getByText("驱动模型:")).toBeTruthy()
    fireEvent.mouseLeave(member)
    expect(screen.queryByText("时钟位点:")).toBeNull()
  })

  it("中心 Logo 与底部快速入口均导航 P2", () => {
    const { onNavigate } = renderP1()
    fireEvent.click(screen.getByText("AI FAMILY"))
    fireEvent.click(screen.getByText("进入漫剧工业化生产台"))
    expect(onNavigate).toHaveBeenCalledTimes(2)
    expect(onNavigate).toHaveBeenNthCalledWith(1, "P2")
    expect(onNavigate).toHaveBeenNthCalledWith(2, "P2")
  })
})

describe("P3ReActWorkflow（ReAct-C 九步闭环）", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function renderP3() {
    const onSelectAgent = vi.fn()
    render(
      <P3ReActWorkflow onSelectAgent={onSelectAgent} onNavigate={vi.fn()} />,
    )
    return { onSelectAgent }
  }

  it("九步节点与默认选中 Step4 详情渲染", () => {
    renderP3()
    expect(screen.getByText("输入安全过滤")).toBeTruthy()
    expect(screen.getByText("画像更新推荐")).toBeTruthy()
    expect(screen.getAllByText("分析+预测并行").length).toBeGreaterThan(0)
    expect(screen.getByText("REASONING + ACTING + CALIBRATION")).toBeTruthy()
  })

  it("单步推进：Step4 → Step5", () => {
    renderP3()
    fireEvent.click(screen.getByRole("button", { name: "单步推进" }))
    expect(screen.getAllByText("报告润色").length).toBeGreaterThan(0)
  })

  it("自动轮播：1.8s 间隔推进活跃步", () => {
    renderP3()
    fireEvent.click(screen.getByRole("button", { name: "自动轮播" }))

    act(() => {
      vi.advanceTimersByTime(1800)
    })
    expect(screen.getAllByText("报告润色").length).toBeGreaterThan(0)

    act(() => {
      vi.advanceTimersByTime(1800)
    })
    expect(screen.getAllByText("全局汇总决策").length).toBeGreaterThan(0)
  })

  it("模拟 Step7 回环：跳质检复检 → 展示回退规则 → 回退 Step5", () => {
    const { onSelectAgent } = renderP3()

    fireEvent.click(screen.getByRole("button", { name: "模拟 Step7 回环" }))
    expect(screen.getAllByText("质量校验复检").length).toBeGreaterThan(0)
    // Step7 专属回退规则面板
    expect(screen.getByText(/修复提示词差异增量包/)).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(1300)
    })
    // 1.2s 后回退至 Step5
    expect(screen.getAllByText("报告润色").length).toBeGreaterThan(0)

    act(() => {
      vi.advanceTimersByTime(1600)
    })
    // 回环解除后仍可唤起当前步 Agent
    fireEvent.click(screen.getByRole("button", { name: /交互会话/ }))
    expect(onSelectAgent).toHaveBeenCalledTimes(1)
  })
})

describe("P4OpsMonitoring（算力监控台）", () => {
  function renderP4() {
    const onNavigateToP5 = vi.fn()
    const onNavigateToP2 = vi.fn()
    const onNavigateToP3 = vi.fn()
    render(
      <P4OpsMonitoring
        onNavigateToP5={onNavigateToP5}
        onNavigateToP2={onNavigateToP2}
        onNavigateToP3={onNavigateToP3}
      />,
    )
    return { onNavigateToP5, onNavigateToP2, onNavigateToP3 }
  }

  it("渲染节点拓扑/四象限遥测/告警队列三栏", () => {
    renderP4()
    expect(screen.getByText("集群节点拓扑 (Node Topology)")).toBeTruthy()
    expect(screen.getByText("双 DGX GPU 利用率曲线")).toBeTruthy()
    expect(screen.getByText("显存驻留池分布 (GB)")).toBeTruthy()
    expect(screen.getByText("RoCE 200Gbps 网络吞吐")).toBeTruthy()
    expect(screen.getByText("NAS IOPS 与存储池 (RAID1/6)")).toBeTruthy()
    expect(screen.getByText("告警与事件队列")).toBeTruthy()
    expect(screen.getByText("4/4 在线")).toBeTruthy()
  })

  it("告警按钮按 targetPage 正确路由 P5/P2/P3", () => {
    const { onNavigateToP5, onNavigateToP2, onNavigateToP3 } = renderP4()

    fireEvent.click(screen.getByText("排查根因 → P5"))
    expect(onNavigateToP5).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText("流水线详情"))
    expect(onNavigateToP2).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText("ReAct 链路"))
    expect(onNavigateToP3).toHaveBeenCalledTimes(1)
  })
})
