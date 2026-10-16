/**
 * file: pwa-brand-mobile.test.tsx
 * description: 品牌 logo 全局引用 / PWA 安装能力 / 移动版增强 测试
 *
 * test-target:
 * - src/components/BrandMark.tsx
 * - src/hooks/usePwaInstall.ts + components/PwaInstallButton.tsx
 * - src/views/MobileFallback.tsx（真实 logo + 实时时钟 + 安装入口）
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { BrandMark, BRAND_LOGO_SRC } from "../src/components/BrandMark"
import { MobileFallback } from "../src/views/MobileFallback"
import { PwaInstallButton } from "../src/components/PwaInstallButton"

describe("BrandMark（品牌标识单一真源）", () => {
  it("使用 public/yyc3-icons/brand 透明底 logo 且携带 alt", () => {
    render(<BrandMark size={32} />)
    const img = screen.getByAltText("YYC³ 言语云") as HTMLImageElement
    expect(img.getAttribute("src")).toBe(BRAND_LOGO_SRC)
    expect(BRAND_LOGO_SRC).toContain("/yyc3-icons/brand/")
  })

  it("Header / W1 浮窗 / 移动版均引用同一品牌资源", () => {
    render(
      <>
        <BrandMark size={26} />
        <BrandMark size={34} />
      </>,
    )
    const imgs = screen.getAllByAltText("YYC³ 言语云")
    expect(imgs).toHaveLength(2)
    for (const img of imgs) {
      expect(img.getAttribute("src")).toBe(BRAND_LOGO_SRC)
    }
  })
})

describe("PWA 安装能力（beforeinstallprompt）", () => {
  // 最小可分派的安装提示事件
  function dispatchInstallPrompt() {
    const prompt = vi.fn().mockResolvedValue(undefined)
    const evt = new Event("beforeinstallprompt", {
      bubbles: true,
      cancelable: true,
    }) as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
    }
    evt.prompt = prompt
    evt.userChoice = Promise.resolve({ outcome: "accepted" })
    act(() => window.dispatchEvent(evt))
    return prompt
  }

  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((q: string) => ({
        matches: false,
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    )
  })

  afterEach(() => vi.unstubAllGlobals())

  it("无可安装事件时按钮不渲染", () => {
    render(<PwaInstallButton />)
    expect(screen.queryByRole("button", { name: /安装/ })).toBeNull()
  })

  it("捕获 beforeinstallprompt 后出现按钮，点击触发 prompt 并在 accepted 后消失", async () => {
    render(<PwaInstallButton />)
    const prompt = dispatchInstallPrompt()
    expect(await screen.findByRole("button", { name: /安装应用/ })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /安装应用/ }))
    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /安装应用/ })).toBeNull(),
    )
  })

  it("appinstalled 事件后入口隐藏", () => {
    render(<PwaInstallButton />)
    dispatchInstallPrompt()
    act(() => window.dispatchEvent(new Event("appinstalled")))
    expect(screen.queryByRole("button", { name: /安装/ })).toBeNull()
  })
})

describe("移动版增强（品牌 + 实时时钟 + 安全区 + 五 Tab）", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("顶部品牌 logo 与 PWA 标识渲染，时钟 1 秒走动", () => {
    render(<MobileFallback onSelectAgent={vi.fn()} />)
    expect(screen.getByAltText("YYC³ 言语云")).toBeTruthy()
    expect(screen.getByText("PWA 移动版")).toBeTruthy()

    const clockRegex = /^\d{2}:\d{2}:\d{2}$/
    const before = screen.getByText(clockRegex).textContent
    act(() => vi.advanceTimersByTime(1000))
    const after = screen.getByText(clockRegex).textContent
    expect(after).not.toBe(before)
  })

  it("五 Tab 仍全量可切换（家族/流水线/ReAct/算力/质安）", () => {
    render(<MobileFallback onSelectAgent={vi.fn()} />)
    for (const name of ["流水线", "ReAct", "算力", "质安", "家族"]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(name) }))
      expect(
        screen
          .getByRole("button", { name: new RegExp(name) })
          .getAttribute("aria-pressed"),
      ).toBe("true")
    }
  })
})
