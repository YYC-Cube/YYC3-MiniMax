/**
 * file: locale-switch.test.tsx
 * description: 运行时语言切换链路测试 · store 持久化/水合/跨 Tab + LocaleToggle + 消费组件重渲染
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[unit],[i18n],[locale],[persistence]
 *
 * brief: useSyncExternalStore 外部 Store 三协议 + setLocale 命令的端到端行为断言
 *
 * test-target: src/services/i18n/store.ts, src/components/LocaleToggle.tsx, src/components/PwaInstallButton.tsx
 * notes: store 为模块级单例——Store 单测组用 vi.resetModules + 动态 import 隔离；
 *        组件测试组共享静态实例，beforeEach 显式归位 zh-CN 保证确定性
 */

import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LocaleToggle } from "../src/components/LocaleToggle"
import { PwaInstallButton } from "../src/components/PwaInstallButton"
import {
  getLocaleSnapshot,
  setLocale,
  subscribeLocale,
} from "../src/services/i18n/store"

const STORAGE_KEY = "yyc3.locale"

describe("i18n locale Store（持久化 / 校验 / 水合 / 跨 Tab）", () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  it("setLocale：持久化 localStorage + 联动 html lang + 通知订阅者", async () => {
    const store = await import("../src/services/i18n/store")
    const seen: string[] = []
    const unsubscribe = store.subscribeLocale(() => seen.push(store.getLocaleSnapshot()))

    store.setLocale("en")
    expect(store.getLocaleSnapshot()).toBe("en")
    expect(localStorage.getItem(STORAGE_KEY)).toBe("en")
    expect(document.documentElement.lang).toBe("en")
    expect(seen).toEqual(["en"])

    unsubscribe()
  })

  it("setLocale：不支持的语言与同值切换均 no-op（不持久化不通知）", async () => {
    const store = await import("../src/services/i18n/store")
    let calls = 0
    const unsubscribe = store.subscribeLocale(() => {
      calls += 1
    })

    store.setLocale("fr")
    store.setLocale("zh-CN") // 同值（当前缺省）
    expect(store.getLocaleSnapshot()).toBe("zh-CN")
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(calls).toBe(0)

    unsubscribe()
  })

  it("订阅时机水合：挂载前已持久化的语言被恢复", async () => {
    localStorage.setItem(STORAGE_KEY, "en")
    const store = await import("../src/services/i18n/store")
    const unsubscribe = store.subscribeLocale(() => { })

    expect(store.getLocaleSnapshot()).toBe("en")
    expect(document.documentElement.lang).toBe("en")

    unsubscribe()
  })

  it("持久化值非法时水合回退缺省语言（存储不可信原则）", async () => {
    localStorage.setItem(STORAGE_KEY, "xx-XX")
    const store = await import("../src/services/i18n/store")
    const unsubscribe = store.subscribeLocale(() => { })

    expect(store.getLocaleSnapshot()).toBe("zh-CN")

    unsubscribe()
  })

  it("storage 事件跨 Tab 同步：他 Tab 改语言本 Tab 跟随", async () => {
    const store = await import("../src/services/i18n/store")
    const seen: string[] = []
    const unsubscribe = store.subscribeLocale(() => seen.push(store.getLocaleSnapshot()))

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_KEY, newValue: "en" }),
      )
    })

    expect(store.getLocaleSnapshot()).toBe("en")
    expect(seen).toEqual(["en"])

    unsubscribe()
  })
})

describe("LocaleToggle（切换按钮 + 持久化闭环）", () => {
  beforeEach(() => {
    localStorage.clear()
    setLocale("zh-CN")
    document.documentElement.lang = "zh-CN"
  })

  it("zh 站显示目标语言标签 EN，点击切换至 en 并持久化", () => {
    render(<LocaleToggle />)
    const toggle = screen.getByRole("button", { name: /切换界面语言至 English/ })
    expect(toggle.textContent).toContain("EN")

    fireEvent.click(toggle)

    expect(getLocaleSnapshot()).toBe("en")
    expect(localStorage.getItem(STORAGE_KEY)).toBe("en")
    expect(document.documentElement.lang).toBe("en")
    expect(screen.getByRole("button", { name: /Switch interface language to 中文/ }).textContent).toContain("中文")
  })

  it("二次点击切回 zh-CN（双向闭环）", () => {
    render(<LocaleToggle />)
    fireEvent.click(screen.getByRole("button", { name: /切换界面语言至 English/ }))
    fireEvent.click(screen.getByRole("button", { name: /Switch interface language to 中文/ }))

    expect(getLocaleSnapshot()).toBe("zh-CN")
    expect(localStorage.getItem(STORAGE_KEY)).toBe("zh-CN")
    expect(document.documentElement.lang).toBe("zh-CN")
  })
})

describe("消费组件切换重渲染（useI18nLocale 响应式）", () => {
  function dispatchInstallPrompt() {
    const evt = new Event("beforeinstallprompt", {
      bubbles: true,
      cancelable: true,
    }) as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
    }
    evt.prompt = vi.fn().mockResolvedValue(undefined)
    evt.userChoice = Promise.resolve({ outcome: "accepted" })
    act(() => window.dispatchEvent(evt))
  }

  beforeEach(() => {
    localStorage.clear()
    setLocale("zh-CN")
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

  it("PwaInstallButton 文案随语言切换实时更新（zh 安装应用 → en Install App）", () => {
    render(<PwaInstallButton />)
    dispatchInstallPrompt()
    expect(screen.getByRole("button", { name: /安装应用/ })).toBeTruthy()

    act(() => setLocale("en"))

    expect(screen.getByRole("button", { name: /Install App/ })).toBeTruthy()
    expect(screen.queryByRole("button", { name: /安装应用/ })).toBeNull()
  })

  it("订阅退订对称：卸载后 store 不再通知（无泄漏）", () => {
    const spy = vi.fn()
    const unsubscribe = subscribeLocale(spy)
    unsubscribe()
    act(() => setLocale("en"))
    expect(spy).not.toHaveBeenCalled()
    act(() => setLocale("zh-CN"))
  })
})
