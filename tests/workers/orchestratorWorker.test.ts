/**
 * file: orchestratorWorker.test.ts
 * description: 编排 worker 桥单测（PR4）· 消息协议/入站守卫/全链路回流/scope 接线
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[workers],[bridge],[message-protocol]
 *
 * test-target: workers/orchestratorWorker（真实 8 Agent 注册表 + mock 模型默认装配）
 */

import { describe, expect, it } from "vitest"
import {
  createOrchestratorWorker,
  installWorkerMessaging,
  type WorkerInboundMessage,
  type WorkerOutboundMessage,
  type WorkerScope,
} from "../../src/workers/orchestratorWorker"

function recorder() {
  const posts: WorkerOutboundMessage[] = []
  return {
    posts,
    post: (message: WorkerOutboundMessage) => {
      posts.push(message)
    },
    waitFor: async (predicate: () => boolean, timeoutMs = 2_000): Promise<void> => {
      const start = Date.now()
      while (!predicate()) {
        if (Date.now() - start > timeoutMs) throw new Error("waitFor 超时")
        await new Promise((resolve) => setTimeout(resolve, 1))
      }
    },
  }
}

const VALID_COMMAND = { type: "produce-episode", payload: { episode: 4 }, issuedBy: "api" as const }

describe("worker 桥：入站守卫", () => {
  it("非对象消息 → error", () => {
    const rec = recorder()
    const worker = createOrchestratorWorker({ post: rec.post })
    worker.handleIncoming("garbage")
    worker.handleIncoming(null)
    expect(rec.posts.filter((m) => m.type === "error")).toHaveLength(2)
  })

  it("未知消息类型 → error（含类型名）", () => {
    const rec = recorder()
    createOrchestratorWorker({ post: rec.post }).handleIncoming({ type: "mystery" })
    expect(rec.posts[0]).toMatchObject({ type: "error", message: expect.stringContaining("mystery") })
  })

  it("dispatch 缺合法 command → error", () => {
    const rec = recorder()
    createOrchestratorWorker({ post: rec.post }).handleIncoming({ type: "dispatch" })
    expect(rec.posts[0]).toMatchObject({ type: "error", message: expect.stringContaining("command") })
  })

  it("cancel/resume 非法参数 → error", () => {
    const rec = recorder()
    const worker = createOrchestratorWorker({ post: rec.post })
    worker.handleIncoming({ type: "cancel", taskId: 42 })
    worker.handleIncoming({ type: "resume", taskId: "t", decision: { action: "nope" } })
    expect(rec.posts.filter((m) => m.type === "error")).toHaveLength(2)
  })

  it("ping → pong", () => {
    const rec = recorder()
    createOrchestratorWorker({ post: rec.post }).handleIncoming({ type: "ping" })
    expect(rec.posts).toEqual([{ type: "pong" }])
  })

  it("入站消息协议联合覆盖四类（编译期一致性）", () => {
    const samples: WorkerInboundMessage[] = [
      { type: "dispatch", command: VALID_COMMAND },
      { type: "cancel", taskId: "t" },
      { type: "resume", taskId: "t", decision: { taskId: "t", traceId: "tr", action: "abort", decidedBy: "x" } },
      { type: "ping" },
    ]
    expect(samples.map((s) => s.type)).toEqual(["dispatch", "cancel", "resume", "ping"])
  })
})

describe("worker 桥：全链路回流（真实注册表 + mock 模型）", () => {
  it("dispatch → receipt → 9×step → terminal(done)；非法 priority 回退 P1", async () => {
    const rec = recorder()
    const worker = createOrchestratorWorker({ post: rec.post })
    worker.handleIncoming({ type: "dispatch", command: VALID_COMMAND, priority: "P9" })
    await rec.waitFor(() => rec.posts.some((m) => m.type === "effect" && m.effect.kind === "terminal"))
    const receipt = rec.posts.find((m) => m.type === "receipt")
    expect(receipt).toMatchObject({ type: "receipt" })
    const steps = rec.posts.filter((m) => m.type === "step")
    expect(steps).toHaveLength(9)
    expect(steps.map((s) => (s.type === "step" ? s.result.trace.step : 0))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const terminal = rec.posts.find((m) => m.type === "effect" && m.effect.kind === "terminal")
    expect(terminal).toMatchObject({ effect: { kind: "terminal", phase: "done" } })
    expect(worker.runtime.queue.size()).toBe(0)
  })

  it("cancel 未知 taskId：幂等无 error", () => {
    const rec = recorder()
    const worker = createOrchestratorWorker({ post: rec.post })
    worker.handleIncoming({ type: "cancel", taskId: "nope" })
    expect(rec.posts).toHaveLength(0)
  })
})

describe("worker 桥：scope 接线", () => {
  it("installWorkerMessaging：事件驱动收发，回执经 scope.postMessage 流出", async () => {
    const rec = recorder()
    let incoming: ((data: unknown) => void) | undefined
    const scope: WorkerScope & { dispatch: (data: unknown) => void } = {
      postMessage: rec.post,
      addEventListener(_type, listener) {
        incoming = (data: unknown) => listener({ data })
      },
      dispatch: (data: unknown) => {
        if (incoming) incoming(data)
      },
    }
    installWorkerMessaging(scope)
    scope.dispatch({ type: "ping" })
    expect(rec.posts).toEqual([{ type: "pong" }])
    scope.dispatch({ type: "dispatch", command: VALID_COMMAND })
    await rec.waitFor(() => rec.posts.some((m) => m.type === "receipt"))
    expect(rec.posts.some((m) => m.type === "receipt")).toBe(true)
  })
})
