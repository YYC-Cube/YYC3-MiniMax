/**
 * file: taskQueue.test.ts
 * description: 任务队列单测（PR4）· 优先级/FIFO/取消移除/结果订阅
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[core],[queue]
 *
 * test-target: core/queue/taskQueue
 */

import { describe, expect, it } from "vitest"
import { createTaskQueue } from "../src/core/queue/taskQueue"
import type { AgentResult, TaskEnvelope, TaskPriority } from "../src/types/agent"

function envelope(taskId: string, priority: TaskPriority): TaskEnvelope {
  return {
    taskId,
    traceId: `trace-${taskId}`,
    command: { type: "produce-episode", payload: {}, issuedBy: "api" },
    priority,
    attempt: 0,
    enqueuedAt: "2026-10-16T08:00:00.000Z",
  }
}

describe("任务队列：优先级与 FIFO", () => {
  it("P0 > P1 > P2 出队；同优先级按入队顺序", () => {
    const queue = createTaskQueue()
    queue.enqueue(envelope("a", "P2"))
    queue.enqueue(envelope("b", "P0"))
    queue.enqueue(envelope("c", "P1"))
    queue.enqueue(envelope("d", "P0"))
    queue.enqueue(envelope("e", "P2"))
    expect(queue.dequeue()?.taskId).toBe("b")
    expect(queue.dequeue()?.taskId).toBe("d")
    expect(queue.dequeue()?.taskId).toBe("c")
    expect(queue.dequeue()?.taskId).toBe("a")
    expect(queue.dequeue()?.taskId).toBe("e")
    expect(queue.dequeue()).toBeNull()
  })

  it("size 随入队/出队联动；空队列为 0", () => {
    const queue = createTaskQueue()
    expect(queue.size()).toBe(0)
    queue.enqueue(envelope("a", "P1"))
    queue.enqueue(envelope("b", "P1"))
    expect(queue.size()).toBe(2)
    queue.dequeue()
    expect(queue.size()).toBe(1)
    queue.dequeue()
    expect(queue.size()).toBe(0)
  })
})

describe("任务队列：取消移除", () => {
  it("remove 命中返回 true 并移除；未命中返回 false", () => {
    const queue = createTaskQueue()
    queue.enqueue(envelope("a", "P1"))
    expect(queue.remove("a")).toBe(true)
    expect(queue.size()).toBe(0)
    expect(queue.dequeue()).toBeNull()
    expect(queue.remove("missing")).toBe(false)
  })
})

describe("任务队列：结果订阅", () => {
  it("emitResult 广播至全部订阅者；退订后不再接收", () => {
    const queue = createTaskQueue()
    const receivedA: AgentResult[] = []
    const receivedB: AgentResult[] = []
    const offA = queue.onResult((r) => receivedA.push(r))
    queue.onResult((r) => receivedB.push(r))
    const sample: AgentResult = { trace: { traceId: "t", taskId: "a", agentId: "tianshu", step: 1, attempt: 0, model: "m", provider: "mock", latencyMs: 1, tokensIn: 1, tokensOut: 1, riskTags: [], startedAt: "s", endedAt: "e" } }
    queue.emitResult(sample)
    queue.emitResult(sample)
    expect(receivedA).toHaveLength(2)
    expect(receivedB).toHaveLength(2)
    offA()
    queue.emitResult(sample)
    expect(receivedA).toHaveLength(2)
    expect(receivedB).toHaveLength(3)
  })
})
