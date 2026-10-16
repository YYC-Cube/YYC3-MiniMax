/**
 * file: taskQueue.ts（core/queue）
 * description: 任务队列（PR4）· 优先级调度 + 结果订阅，TaskQueuePort 的 core 实现
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [core],[queue],[priority],[orchestration]
 *
 * brief: P0 > P1 > P2 优先级出队（同优先级 FIFO）；与 Agent 解耦——只存信封、
 *        只回流 AgentResult，不感知执行细节
 *
 * details:
 * - 纯内存实现（无 IO/无计时器），可移植 Worker/Node；持久化属边界职责（PR7 StoragePort）
 * - enqueue 不做校验：worker 消息边界已由 isTaskEnvelope 守卫，核内互信（六边形原则）
 * - remove 供取消路径移除「已入队未开跑」的任务
 *
 * dependencies: types/agent（仅类型）, types/ports（仅类型）
 * exports: TaskQueue, createTaskQueue
 */

import type { AgentResult, TaskEnvelope, TaskPriority } from "../../types/agent"
import type { TaskQueuePort } from "../../types/ports"

const PRIORITY_RANK: Record<TaskPriority, number> = { P0: 0, P1: 1, P2: 2 }

interface QueuedTask {
  envelope: TaskEnvelope
  seq: number
}

/** 队列完整接口：UI 侧 TaskQueuePort 超集（worker 侧另有 dequeue/remove/emitResult） */
export interface TaskQueue extends TaskQueuePort {
  /** 按优先级取出下一任务（同优先级 FIFO）；空队列返回 null */
  dequeue(): TaskEnvelope | null
  /** 向订阅者广播一步执行结果（编排运行时调用） */
  emitResult(result: AgentResult): void
  /** 移除已入队未开跑的任务（取消路径）；返回是否实际移除 */
  remove(taskId: string): boolean
}

/** 创建内存优先级任务队列 */
export function createTaskQueue(): TaskQueue {
  const tasks: QueuedTask[] = []
  const listeners = new Set<(result: AgentResult) => void>()
  let seq = 0

  return {
    enqueue(task) {
      tasks.push({ envelope: task, seq: seq++ })
    },
    dequeue() {
      if (tasks.length === 0) return null
      tasks.sort((a, b) => {
        const rankDiff = PRIORITY_RANK[a.envelope.priority] - PRIORITY_RANK[b.envelope.priority]
        return rankDiff !== 0 ? rankDiff : a.seq - b.seq
      })
      const next = tasks.shift()
      return next !== undefined ? next.envelope : null
    },
    remove(taskId) {
      const idx = tasks.findIndex((t) => t.envelope.taskId === taskId)
      if (idx === -1) return false
      tasks.splice(idx, 1)
      return true
    },
    size() {
      return tasks.length
    },
    onResult(cb) {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    emitResult(result) {
      for (const listener of listeners) listener(result)
    },
  }
}
