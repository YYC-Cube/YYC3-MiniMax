/**
 * file: p1-onboarding.test.tsx
 * description: P1 首访三步引导测试（IA 审计建议 #4）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[component],[p1],[onboarding]
 *
 * test-target: src/views/P1FamilyCenter.tsx + components/p1/OnboardingCoach.tsx
 * notes: 覆盖首访渲染/learn-by-doing 自动收起/手动关闭持久化三条链路
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { P1FamilyCenter } from "../src/views/P1FamilyCenter"

const ONBOARDING_KEY = "yyc3-onboarding-v1"

function renderP1() {
  const onSelectAgent = vi.fn()
  const onNavigate = vi.fn()
  const utils = render(
    <P1FamilyCenter
      onSelectAgent={onSelectAgent}
      onNavigate={onNavigate}
    />,
  )
  return { onSelectAgent, unmount: utils.unmount }
}

describe("P1 首访三步引导（IA 审计 #4）", () => {
  beforeEach(() => {
    localStorage.removeItem(ONBOARDING_KEY)
  })

  it("首访渲染三步引导卡（唤起 W1 → 进生产台 → 派发指令）", () => {
    renderP1()
    expect(screen.getByText("三步开启指挥")).toBeTruthy()
    expect(screen.getByText("唤起 W1 对话")).toBeTruthy()
    expect(screen.getByText("进入生产台")).toBeTruthy()
    expect(screen.getByText("派发生产指令")).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "关闭新手引导" }),
    ).toBeTruthy()
  })

  it("learn-by-doing：点击成员唤起 W1 即完成引导，卡片收起且回调照常上抛", () => {
    const { onSelectAgent } = renderP1()
    fireEvent.click(screen.getByText("12:00"))
    expect(onSelectAgent).toHaveBeenCalledWith("tianshu")
    expect(screen.queryByText("三步开启指挥")).toBeNull()
    expect(JSON.parse(localStorage.getItem(ONBOARDING_KEY)!)).toBe(true)
  })

  it("手动「知道了」关闭并持久化：重挂载后不再显示", () => {
    const { unmount } = renderP1()
    fireEvent.click(screen.getByRole("button", { name: "关闭新手引导" }))
    expect(screen.queryByText("三步开启指挥")).toBeNull()
    expect(JSON.parse(localStorage.getItem(ONBOARDING_KEY)!)).toBe(true)

    // 模拟刷新重挂载：引导不再出现
    unmount()
    renderP1()
    expect(screen.queryByText("三步开启指挥")).toBeNull()
  })
})
