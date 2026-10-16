/**
 * file: p5-mobile.test.tsx
 * description: P5 质检安全 + 移动端降级视图交互测试
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [test],[component],[p5],[mobile]
 *
 * test-target: src/views/P5QualitySecurity.tsx, src/views/MobileFallback.tsx
 * notes: 覆盖核验通过/打回重跑/PII 显隐/导航 + 五 Tab 切换/成员唤起链路
 */

import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QualityQueuePanel } from "../src/components/p5/QualityQueuePanel"
import {
  AUDIT_STORYBOARDS,
  type StoryboardAuditItem,
} from "../src/data/qualityData"
import { MobileFallback } from "../src/views/MobileFallback"
import { P5QualitySecurity } from "../src/views/P5QualitySecurity"

describe("P5QualitySecurity（质检与安全）", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function renderP5() {
    const onNavigateToP2 = vi.fn()
    const onNavigateToP3 = vi.fn()
    render(
      <P5QualitySecurity
        onNavigateToP2={onNavigateToP2}
        onNavigateToP3={onNavigateToP3}
      />,
    )
    return { onNavigateToP2, onNavigateToP3 }
  }

  it("渲染四道门禁（阈值文案由 GATES 派生）与质检队列", () => {
    renderP5()
    expect(screen.getByText("门禁 1 · 角色面部一致性")).toBeTruthy()
    expect(screen.getByText("门禁 2 · SyncNet 唇形吻合")).toBeTruthy()
    expect(screen.getByText("门禁 3 · 敏感隐私实体")).toBeTruthy()
    expect(screen.getByText("门禁 4 · 密钥凭据防泄漏")).toBeTruthy()
    expect(screen.getByText("≥ 80% 达标")).toBeTruthy()
    expect(screen.getByText("≥ 0.75 达标")).toBeTruthy()
    // 4 张分镜卡各带双操作按钮
    expect(screen.getAllByRole("button", { name: "核验通过" })).toHaveLength(4)
    expect(screen.getAllByRole("button", { name: "打回重跑" })).toHaveLength(4)
  })

  // 队列头待定计数（视觉重构后拆分为「待定」标签 + 大数字两个节点）
  function pendingCountText(): string {
    return screen.getByText("待定").parentElement?.textContent ?? ""
  }

  it("核验通过：pending 样本流转后待定数归零", () => {
    renderP5()
    expect(pendingCountText()).toBe("待定1")

    // sb-103 是唯一 pending（EP03-SC03-SH02，低于门禁），位于列表第 3 位
    const passBtns = screen.getAllByRole("button", { name: "核验通过" })
    fireEvent.click(passBtns[2]!)

    expect(pendingCountText()).toBe("待定0")
  })

  it("打回重跑：500ms 延迟流转为 rejected 且复检轮次升至 2/2", () => {
    renderP5()
    // sb-103（第 3 位）为唯一 pending；终态卡按钮已禁用（审计 P1-#1）
    fireEvent.click(screen.getAllByRole("button", { name: "打回重跑" })[2]!)

    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(screen.getByText("复检轮次: 2/2")).toBeTruthy()
  })

  it("终态锁（审计 P1-#1）：核验通过后该卡双按钮禁用不可翻转", () => {
    renderP5()
    const passBtns = screen.getAllByRole("button", { name: "核验通过" })
    const rejectBtns = screen.getAllByRole("button", { name: "打回重跑" })

    // sb-103（第 3 位）为唯一 pending：核验通过进入 passed 终态
    fireEvent.click(passBtns[2]!)
    expect(pendingCountText()).toBe("待定0")
    expect((passBtns[2] as HTMLButtonElement).disabled).toBe(true)
    expect((rejectBtns[2] as HTMLButtonElement).disabled).toBe(true)

    // 终态卡点击无效：不翻转为 rejected（无 2/2 出现，轮次保持 1/2）
    fireEvent.click(rejectBtns[2]!)
    expect(screen.queryByText("复检轮次: 2/2")).toBeNull()
    expect(screen.getAllByText("复检轮次: 1/2").length).toBe(4)
  })

  it("复检熔断（审计 P1-#2）：待检达 2/2 轮禁用打回并提示人工终审", () => {
    // 直接渲染队列面板：构造"pending 且已达最大复检轮次"的熔断态
    const storyboards: StoryboardAuditItem[] = [
      { ...AUDIT_STORYBOARDS[2]!, reviewRound: 2 },
    ]
    const onReject = vi.fn()
    render(
      <QualityQueuePanel
        storyboards={storyboards}
        shakingCardId={null}
        onPass={vi.fn()}
        onReject={onReject}
      />,
    )
    expect(screen.getByText(/已达复检上限/)).toBeTruthy()

    const rejectBtn = screen.getByRole("button", {
      name: "打回重跑",
    }) as HTMLButtonElement
    expect(rejectBtn.disabled).toBe(true)
    fireEvent.click(rejectBtn)
    expect(onReject).not.toHaveBeenCalled()

    // 人工终审出口保留：核验通过仍可用
    const passBtn = screen.getByRole("button", {
      name: "核验通过",
    }) as HTMLButtonElement
    expect(passBtn.disabled).toBe(false)
  })

  it("PII 受控调取：异步拉取原文后可收起（原文不在数据包内）", async () => {
    renderP5()
    expect(screen.queryByText(/138-0000-0000/)).toBeNull()

    await act(async () => {
      fireEvent.click(
        screen.getAllByRole("button", { name: "查看脱敏前后对比" })[0]!,
      )
    })
    expect(screen.getByText(/138-0000-0000/)).toBeTruthy()
    // SIM 模式标注：原文来自受控调取而非前端数据包
    expect(screen.getByText(/SIM 演示原文/)).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "收起敏感比对" }))
    expect(screen.queryByText(/138-0000-0000/)).toBeNull()
  })

  it("底部导航回调贯通 P2/P3", () => {
    const { onNavigateToP2, onNavigateToP3 } = renderP5()
    fireEvent.click(screen.getByText("直达生产指挥台"))
    fireEvent.click(screen.getByText("查看 ReAct-C 回环详情"))
    expect(onNavigateToP2).toHaveBeenCalledTimes(1)
    expect(onNavigateToP3).toHaveBeenCalledTimes(1)
  })

  it("质检队列「定位生产台」→ P2 image 阶段高亮补链（IA 审计 #3）", () => {
    const onLocateProductionStage = vi.fn()
    const { unmount } = render(
      <P5QualitySecurity
        onNavigateToP2={vi.fn()}
        onNavigateToP3={vi.fn()}
        onLocateProductionStage={onLocateProductionStage}
      />,
    )
    fireEvent.click(
      screen.getByRole("button", { name: "前往生产台镜头阶段" }),
    )
    expect(onLocateProductionStage).toHaveBeenCalledTimes(1)

    // 未传回调时不渲染入口（与纯展示态兼容）
    unmount()
    renderP5()
    expect(
      screen.queryByRole("button", { name: "前往生产台镜头阶段" }),
    ).toBeNull()
  })
})

describe("MobileFallback（移动端降级视图）", () => {
  function renderMobile() {
    const onSelectAgent = vi.fn()
    render(<MobileFallback onSelectAgent={onSelectAgent} />)
    return { onSelectAgent }
  }

  it("默认家族 Tab：8 名成员可点击唤起 W1", () => {
    const { onSelectAgent } = renderMobile()
    expect(screen.getByText(/点击成员即可唤醒 W1/)).toBeTruthy()

    const memberBtns = screen.getAllByRole("button", { name: /·/ })
    expect(memberBtns.length).toBe(8)
    fireEvent.click(memberBtns[0]!)
    expect(onSelectAgent).toHaveBeenCalledTimes(1)
  })

  it("流水线 Tab：六阶段精简卡渲染", () => {
    renderMobile()
    fireEvent.click(screen.getByRole("button", { name: "流水线" }))
    expect(screen.getByText(/S1/)).toBeTruthy()
    expect(screen.getByText(/S6/)).toBeTruthy()
  })

  it("ReAct Tab：九步闭环（执行中/已完成/待命三态并存）", () => {
    renderMobile()
    fireEvent.click(screen.getByRole("button", { name: "ReAct" }))
    expect(screen.getByText("执行中")).toBeTruthy()
    expect(screen.getAllByText("已完成")).toHaveLength(3)
    expect(screen.getAllByText("待命")).toHaveLength(5)
  })

  it("算力 Tab：节点遥测（GPU/VRAM）渲染", () => {
    renderMobile()
    fireEvent.click(screen.getByRole("button", { name: "算力" }))
    expect(screen.getAllByText("GPU").length).toBeGreaterThan(0)
    expect(screen.getAllByText("VRAM").length).toBeGreaterThan(0)
  })

  it("质安 Tab：GATES 阈值派生文案与质检统计", () => {
    renderMobile()
    fireEvent.click(screen.getByRole("button", { name: "质安" }))
    expect(screen.getByText("门禁阈值 ≥ 80%")).toBeTruthy()
    expect(screen.getByText("门禁阈值 ≥ 0.75")).toBeTruthy()
    expect(screen.getByText(/通过/)).toBeTruthy()
    expect(screen.getByText("PII 三级脱敏审计")).toBeTruthy()
    expect(screen.getByText("4 条记录 · 0 泄漏")).toBeTruthy()
  })
})
