/**
 * file: sw-precache.test.ts
 * description: Service Worker 预缓存容错契约 · 单资源失败不阻断安装
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[unit],[pwa],[offline]
 *
 * brief: 以 vm 沙箱加载 public/sw.js，注入 mock caches/self，验证 install 逐项预缓存容错
 *
 * test-target: public/sw.js
 * notes: 覆盖 P1 修复「cache.addAll → 逐项 add 容错」，防止离线首屏因单资源 404 整体失效
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createContext, runInContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"

const SW_SOURCE = readFileSync(join(process.cwd(), "public/sw.js"), "utf8")

type SwInstallEvent = { waitUntil: (promise: Promise<unknown>) => void }
type SwHandler = (event: SwInstallEvent) => void

/** 在 vm 沙箱中加载 sw.js，返回捕获的事件处理器与 mock 句柄 */
function loadSw(opts: { onlyFail?: string } = {}) {
  const handlers: Record<string, SwHandler | undefined> = {}
  const added: string[] = []
  const cache = {
    add: vi.fn((url: string) => {
      if (url === opts.onlyFail) return Promise.reject(new Error(`404 ${url}`))
      added.push(url)
      return Promise.resolve()
    }),
  }
  const selfMock = {
    addEventListener: (type: string, handler: SwHandler) => {
      handlers[type] = handler
    },
    skipWaiting: vi.fn(() => Promise.resolve()),
    clients: { claim: vi.fn(() => Promise.resolve()) },
    location: { origin: "http://localhost:3030" },
  }
  const consoleMock = { warn: vi.fn(), log: vi.fn(), error: vi.fn() }
  const context = {
    self: selfMock,
    caches: {
      open: vi.fn(() => Promise.resolve(cache)),
      keys: vi.fn(() => Promise.resolve([])),
      delete: vi.fn(() => Promise.resolve(true)),
      match: vi.fn(() => Promise.resolve(undefined)),
    },
    console: consoleMock,
    fetch: vi.fn(),
  }
  createContext(context)
  runInContext(SW_SOURCE, context)

  return { handlers, added, cache, selfMock, consoleMock }
}

describe("Service Worker 预缓存容错（public/sw.js）", () => {
  it("注册 install / activate / fetch 三类事件处理器", () => {
    const { handlers } = loadSw()
    expect(Object.keys(handlers).sort()).toEqual([
      "activate",
      "fetch",
      "install",
    ])
  })

  it("单资源 404 不阻断安装：install 仍 resolve，其余资源照常入缓存", async () => {
    const { handlers, added, cache, selfMock, consoleMock } = loadSw({
      onlyFail: "/404.html",
    })

    let waited: Promise<unknown> | undefined
    handlers.install!({
      waitUntil: (p) => {
        waited = p
      },
    })

    await expect(waited).resolves.toBeUndefined()
    expect(added).not.toContain("/404.html")
    expect(added).toContain("/p5/")
    expect(cache.add.mock.calls.length).toBeGreaterThan(added.length)
    expect(consoleMock.warn).toHaveBeenCalledWith(
      "[sw] precache 跳过不可达资源:",
      "/404.html",
      expect.any(Error),
    )
    expect(selfMock.skipWaiting).toHaveBeenCalled()
  })

  it("全部资源可达时正常完成安装", async () => {
    const { handlers, added, selfMock } = loadSw()

    let waited: Promise<unknown> | undefined
    handlers.install!({
      waitUntil: (p) => {
        waited = p
      },
    })

    await expect(waited).resolves.toBeUndefined()
    expect(added).toContain("/")
    expect(added).toContain("/404.html")
    expect(selfMock.skipWaiting).toHaveBeenCalled()
  })
})
