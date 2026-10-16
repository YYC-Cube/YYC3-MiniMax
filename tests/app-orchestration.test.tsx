/**
 * file: app-orchestration.test.tsx
 * description: 指挥舱编排层集成测试（Next.js 16 路由架构）· 全局壳/移动降级分支/W1 跨路由指令闭环
 * author: YanYuCloudCube Team
 * version: v2.0.0
 * created: 2026-10-11
 * updated: 2026-10-15
 * status: active
 * tags: [test],[integration],[app-router]
 *
 * test-target: src/app/CommandShell.tsx + CommandCenterContext + 五路由 page（原 App.tsx 编排语义等价迁移）
 * notes:
 * - next/navigation mock：usePathname 驱动视图；router.push 收集跳转路径断言
 * - 渲染单元 = Provider + Shell + 真实 page（与 layout 组装完全一致），交互断言全部作用于真实视图
 * - matchMedia stub 驱动桌面/移动双分支；含诊断 #13 同文本二次派发回归与引用卡跳转闭环
 */

import { act, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { CommandCenterProvider } from "../src/context/CommandCenterContext"
import { CommandShell } from "../src/app/CommandShell"
import P2Page from "../src/app/p2/page"
import P3Page from "../src/app/p3/page"
import P4Page from "../src/app/p4/page"
import P5Page from "../src/app/p5/page"
import P1Page from "../src/app/page"

/* ---------------------------------- 路由 mock ---------------------------------- */

const PUSH_CALLS: string[] = []
let currentPath = "/"

vi.mock("next/navigation", () => ({
  usePathname: () => currentPath,
  useRouter: () => ({
    push: vi.fn((path: string) => {
      PUSH_CALLS.push(path)
      currentPath = path
    }),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

type ViewId = "P1" | "P2" | "P3" | "P4" | "P5"
const PAGES: Record<ViewId, ReactNode> = {
  P1: <P1Page />,
  P2: <P2Page />,
  P3: <P3Page />,
  P4: <P4Page />,
  P5: <P5Page />,
}
const PATHS: Record<ViewId, string> = {
  P1: "/",
  P2: "/p2/",
  P3: "/p3/",
  P4: "/p4/",
  P5: "/p5/",
}

/** 渲染单元与 layout 组装一致：Provider + Shell(children=page) */
function renderShell(view: ViewId = "P1") {
  currentPath = PATHS[view]
  return (
    <CommandCenterProvider>
      <CommandShell>{PAGES[view]}</CommandShell>
    </CommandCenterProvider>
  )
}

/** 模拟路由跳转后的重渲染（jsdom 下 push 不触发导航，手动 rerender） */
function rerenderAt(view: ViewId, rerender: (ui: ReactNode) => void) {
  rerender(renderShell(view))
}

beforeAll(() => {
  // jsdom 未实现 scrollIntoView（W1 新消息滚动依赖）
  Element.prototype.scrollIntoView = vi.fn()
  // 压制 React 重复 key / boundary 噪声
  vi.spyOn(console, "error").mockImplementation(() => undefined)
})

interface FakeMql {
  matches: boolean
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
}

/** matchMedia stub：jsdom 缺失；返回 flip 供移动↔桌面动态切换 */
function setupMatchMedia(initial: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>()
  const mql: FakeMql = {
    matches: initial,
    addEventListener: vi.fn(
      (_q: string, fn: (e: { matches: boolean }) => void) => {
        listeners.add(fn)
      },
    ),
    removeEventListener: vi.fn(
      (_q: string, fn: (e: { matches: boolean }) => void) => {
        listeners.delete(fn)
      },
    ),
  }
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mql))
  return {
    flip(v: boolean) {
      mql.matches = v
      listeners.forEach((fn) => fn({ matches: v }))
    },
  }
}

let media: ReturnType<typeof setupMatchMedia>

beforeEach(() => {
  localStorage.clear()
  PUSH_CALLS.length = 0
  currentPath = "/"
  vi.useFakeTimers()
  media = setupMatchMedia(false) // 默认桌面分支
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function storedMessages(): Array<{ id: string; sender: string; text: string }> {
  return JSON.parse(localStorage.getItem("yyc3.w1.messages")!) as Array<{
    id: string
    sender: string
    text: string
  }>
}

describe("CommandShell 桌面编排（P1-P5 路由架构）", () => {
  it("默认渲染 P1：Header/Footer/P1 时钟环/W1 收起球体", () => {
    render(renderShell("P1"))
    expect(
      screen.getByText("8 拟人化 Agent 协同 · 工业化漫剧指挥中心"),
    ).toBeTruthy()
    expect(screen.getByText("/mnt/nas/yyc3_pipeline")).toBeTruthy()
    expect(screen.getAllByText("12:00").length).toBeGreaterThan(0)
    // W1 初始收起
    expect(screen.getByTitle("展开 Universal Agent AI 浮窗")).toBeTruthy()
  })

  it("Header 导航 Link 化：href 指向五路由（Next Link 渲染规范化无尾斜杠）", () => {
    render(renderShell("P1"))
    for (const [label, href] of [
      ["P2 漫剧生产台", "/p2"],
      ["P3 ReAct-C 编排", "/p3"],
      ["P4 算力监控台", "/p4"],
      ["P5 质检与安全", "/p5"],
    ] as const) {
      expect(
        screen.getByRole("link", { name: label }).getAttribute("href"),
      ).toBe(href)
    }
    // 品牌标识 → 根路由
    expect(
      screen.getByRole("link", { name: /YYC³ AI FAMILY/ }).getAttribute("href"),
    ).toBe("/")
  })

  it("Header 当前路由高亮：pathname 匹配项持有激活样式", () => {
    render(renderShell("P3"))
    expect(
      screen.getByRole("link", { name: "P3 ReAct-C 编排" }).className,
    ).toContain("from-[#00F0FF]/20")
    expect(
      screen.getByRole("link", { name: "P2 漫剧生产台" }).className,
    ).not.toContain("from-[#00F0FF]/20")
  })

  it("Footer CTA 链：P1 → /p2/，P2 → /p3/（router.push 路径断言）", () => {
    const { rerender } = render(renderShell("P1"))
    // P1 视图与 Footer 均有同名 CTA（原 App 测试即取 [0]）
    fireEvent.click(screen.getAllByText("进入漫剧工业化生产台")[0]!)
    expect(PUSH_CALLS).toContain("/p2/")

    rerenderAt("P2", rerender)
    fireEvent.click(screen.getByText("查看 ReAct-C 九步编排视图"))
    expect(PUSH_CALLS).toContain("/p3/")
  })

  it("P1 成员唤起 W1 → 收起复原（Context 跨层接线闭环）", () => {
    render(renderShell("P1"))
    fireEvent.click(screen.getAllByText("12:00")[0]!)
    expect(screen.getByText("UNIVERSAL AGENT WIDGET (W1)")).toBeTruthy()
    expect(screen.getByPlaceholderText("@天枢 输入指令或提问...")).toBeTruthy()

    fireEvent.click(screen.getByTitle("收起浮窗"))
    expect(screen.getByTitle("展开 Universal Agent AI 浮窗")).toBeTruthy()
  })

  it("P2 阶段卡头像唤起 W1（onSelectAgent 分支）", () => {
    render(renderShell("P2"))
    fireEvent.click(screen.getAllByTitle(/主导/)[0]!)
    expect(screen.getByText("UNIVERSAL AGENT WIDGET (W1)")).toBeTruthy()
  })

  it("P2 快捷指令直通 W1；同文本二次派发必达（诊断 #13 回归）", async () => {
    render(renderShell("P2"))
    // 事件流面板默认指令 '@元启 继续下一集生产' → 发送
    fireEvent.click(screen.getByRole("button", { name: "发送" }))
    expect(screen.getByText("UNIVERSAL AGENT WIDGET (W1)")).toBeTruthy()

    // PR6：回复由编排事件回流驱动（微任务链），async act 冲刷后落库
    await act(async () => {
      vi.advanceTimersByTime(700)
    })
    expect(
      storedMessages().filter(
        (m) => m.sender === "user" && m.text === "@元启 继续下一集生产",
      ),
    ).toHaveLength(1)

    // 同文本再次派发：{ id } 自增对象身份必变 → effect 必触发
    fireEvent.click(screen.getByRole("button", { name: "发送" }))
    await act(async () => {
      vi.advanceTimersByTime(700)
    })
    expect(
      storedMessages().filter(
        (m) => m.sender === "user" && m.text === "@元启 继续下一集生产",
      ),
    ).toHaveLength(2)
    expect(storedMessages()).toHaveLength(6) // 2 初始 + 2 用户 + 2 回复
  })

  it("W1 引用卡跳转：navigateToStage → push(/p2/) 并渲染 P2 视图", () => {
    const { rerender } = render(renderShell("P1"))
    fireEvent.click(screen.getAllByText("12:00")[0]!)
    fireEvent.click(screen.getByText("任务 #TASK-STORY-108"))

    expect(PUSH_CALLS).toContain("/p2/")
    rerenderAt("P2", rerender)
    // 高亮台本仍渲染完整六阶段
    expect(screen.getAllByTitle(/主导/).length).toBeGreaterThan(0)
  })

  it("scaleMode 切换：fit ↔ 1080p（标题翻转 + 缩放分支）", () => {
    render(renderShell("P1"))
    fireEvent.click(screen.getByTitle("切换至标准 1980×1020 视图"))
    expect(screen.getByTitle("切换至自适应高度视图")).toBeTruthy()

    fireEvent.click(screen.getByTitle("切换至自适应高度视图"))
    expect(screen.getByTitle("切换至标准 1980×1020 视图")).toBeTruthy()
  })

  it("P4 告警路由：→P5 / →P2 / →P3 三向贯通", () => {
    const { rerender } = render(renderShell("P4"))
    fireEvent.click(screen.getByText("排查根因 → P5"))
    expect(PUSH_CALLS).toContain("/p5/")

    rerenderAt("P4", rerender)
    fireEvent.click(screen.getByText("流水线详情"))
    expect(PUSH_CALLS).toContain("/p2/")

    rerenderAt("P4", rerender)
    fireEvent.click(screen.getByText("ReAct 链路"))
    expect(PUSH_CALLS).toContain("/p3/")
  })

  it("P5 底部导航：→P2 / →P3", () => {
    const { rerender } = render(renderShell("P5"))
    fireEvent.click(screen.getByText("直达生产指挥台"))
    expect(PUSH_CALLS).toContain("/p2/")

    rerenderAt("P5", rerender)
    fireEvent.click(screen.getByText("查看 ReAct-C 回环详情"))
    expect(PUSH_CALLS).toContain("/p3/")
  })

  it("P3 步骤交互按钮唤起 W1（onSelectAgent 分支）", () => {
    render(renderShell("P3"))
    fireEvent.click(screen.getByRole("button", { name: /交互会话/ }))
    expect(screen.getByText("UNIVERSAL AGENT WIDGET (W1)")).toBeTruthy()
  })
})

describe("CommandShell 移动降级分支（<768px）", () => {
  beforeEach(() => {
    media.flip(true)
  })

  it("移动视图渲染：MobileFallback + W1 收起，桌面 Header/Footer 卸载", () => {
    render(renderShell("P1"))
    expect(screen.getByText(/点击成员即可唤醒 W1/)).toBeTruthy()
    expect(screen.queryByText("P1 时钟环中心")).toBeNull()
    expect(screen.queryByText("/mnt/nas/yyc3_pipeline")).toBeNull()
    expect(screen.getByTitle("展开 Universal Agent AI 浮窗")).toBeTruthy()
  })

  it("移动成员唤起 W1；引用卡在移动分支仅改内部状态（无桌面视图可切）", () => {
    render(renderShell("P1"))
    const memberBtns = screen.getAllByRole("button", { name: /·/ })
    fireEvent.click(memberBtns[0]!)
    expect(screen.getByText("UNIVERSAL AGENT WIDGET (W1)")).toBeTruthy()

    fireEvent.click(screen.getByText("任务 #TASK-STORY-108"))
    expect(screen.queryByText("P1 时钟环中心")).toBeNull() // 仍为移动视图
    expect(screen.getByText("UNIVERSAL AGENT WIDGET (W1)")).toBeTruthy()
  })

  it("视口动态拉宽：移动 → 桌面实时切换（matchMedia change 订阅生效）", () => {
    render(renderShell("P1"))
    expect(screen.getByText(/点击成员即可唤醒 W1/)).toBeTruthy()

    act(() => {
      media.flip(false)
    })
    expect(screen.getByText("P1 时钟环中心")).toBeTruthy()
    expect(screen.queryByText(/点击成员即可唤醒 W1/)).toBeNull()
  })
})
