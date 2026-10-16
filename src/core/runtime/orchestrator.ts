/**
 * file: orchestrator.ts（core/runtime）
 * description: ReAct-C 编排运行时（PR4）· dispatch/cancel/resume + 串行泵 + 会话检查点
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [core],[runtime],[orchestration],[react-c]
 *
 * brief: UI 只经 dispatch 发命令；运行时驱动「队列 → 状态机 → Agent」闭环，
 *        每步结果与状态机效应外流（onStep/onEffect/queue.onResult），核内零遥测副作用
 *
 * details:
 * - 串行泵：同一时刻仅一个任务在跑（ReAct-C 语义：全局决策单线程）；
 *   dispatch 在泵运行中入队，由当前 drain 循环自然接管；泵结束后若有积压自动续泵
 * - 会话（Session）即检查点栈的轻量形态：payload 滚动前移（上一步产物 = 下一步输入），
 *   S7 门禁失败的 score 随 payload 回流 S5 形成「校准反馈」；human-takeover 态挂起保留会话
 * - 失败可重试：状态机 retryCount 驱动指数退避（backoffDelayMs，sleep 注入可测）
 * - 取消三态：入队未跑（queue.remove）/ 运行中（下步前检查 cancelRequested）/
 *   挂起接管态（立即 CANCEL 终结）；均幂等
 * - 终态即会话清理；每步结果必经 emitResult（trace 铁律）
 *
 * dependencies: core/agents, core/machine, core/queue, types/agent, types/ports
 * exports: DEFAULT_AGENT_BUDGET, backoffDelayMs, EffectContext, OrchestratorOptions, OrchestratorRuntime, createOrchestrator
 */

import type {
  AgentBudget,
  AgentCommand,
  AgentPort,
  AgentResult,
  HumanDecision,
  TaskPriority,
  ToolRegistry,
} from "../../types/agent"
import type { AgentId } from "../../types/index"
import type { DispatchReceipt, OrchestratorPort, TaskQueuePort } from "../../types/ports"
import { STEP_AGENT_MAP } from "../agents"
import type { MachineEffect, ReActMachineState } from "../machine/reactStateMachine"
import { INITIAL_REACT_STATE, isTerminal, reduceReAct } from "../machine/reactStateMachine"
import type { TaskQueue } from "../queue/taskQueue"
import { createTaskQueue } from "../queue/taskQueue"

/** 缺省执行预算（可经 OrchestratorOptions.budget 覆写） */
export const DEFAULT_AGENT_BUDGET: AgentBudget = { maxTokens: 4096, maxLatencyMs: 60_000 }

/** 瞬时重试退避（ms）：500 → 1000 → 2000…封顶 8s（状态机 retryCount 已 +1 后传入） */
export function backoffDelayMs(retryCount: number): number {
  return Math.min(500 * 2 ** (retryCount - 1), 8_000)
}

/** 效应上下文：定位效应归属任务与链路 */
export interface EffectContext {
  taskId: string
  traceId: string
}

export interface OrchestratorOptions {
  agents: Record<AgentId, AgentPort>
  tools?: ToolRegistry
  memory?: Record<string, unknown>
  budget?: AgentBudget
  /** 重试退避睡眠（默认 no-op；worker 装配真实实现，测试注入 spy） */
  sleep?: (ms: number) => Promise<void>
}

export interface OrchestratorRuntime extends OrchestratorPort {
  /** 受理命令（可选优先级，缺省 P1；OrchestratorPort 签名的超集，结构兼容） */
  dispatch(cmd: AgentCommand, priority?: TaskPriority): Promise<DispatchReceipt>
  /** UI 侧队列端口（onResult 订阅结果流 / size 观测积压） */
  readonly queue: TaskQueuePort
  /** 每步结果流（worker 翻译为 step 消息回流 UI） */
  onStep(cb: (result: AgentResult) => void): () => void
  /** 状态机效应流（loopback/retry/takeover/terminal） */
  onEffect(cb: (effect: MachineEffect, ctx: EffectContext) => void): () => void
}

/** 会话 = 任务级检查点：机器状态 + 滚动 payload + 取消标记 */
interface Session {
  taskId: string
  traceId: string
  machine: ReActMachineState
  payload: Record<string, unknown>
  cancelRequested: boolean
}

const EMPTY_TOOLS: ToolRegistry = { get: () => undefined }

/** 生成前缀化 ID：优先 crypto.randomUUID（核内不得依赖 services/telemetry，模式对齐） */
function createId(prefix: string): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined
  if (c && typeof c.randomUUID === "function") return `${prefix}-${c.randomUUID()}`
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * 创建编排运行时（纯 core：不 import react/next/services，depcruise 守卫）
 * dispatch 即受理（返回回执），执行异步进行；结果/效应经订阅流出
 */
export function createOrchestrator(options: OrchestratorOptions): OrchestratorRuntime {
  const queue: TaskQueue = createTaskQueue()
  const sessions = new Map<string, Session>()
  const stepListeners = new Set<(result: AgentResult) => void>()
  const effectListeners = new Set<(effect: MachineEffect, ctx: EffectContext) => void>()
  const sleep = options.sleep ?? (() => Promise.resolve())
  const tools = options.tools ?? EMPTY_TOOLS
  const memory = options.memory ?? {}
  const budget = options.budget ?? DEFAULT_AGENT_BUDGET
  let pumping = false

  function emitResult(result: AgentResult): void {
    queue.emitResult(result)
    for (const listener of stepListeners) listener(result)
  }

  function emitEffects(effects: MachineEffect[], session: Session): void {
    for (const effect of effects) {
      for (const listener of effectListeners) {
        listener(effect, { taskId: session.taskId, traceId: session.traceId })
      }
    }
  }

  /** 驱动一个会话直至终态/挂起；终态即清理，human-takeover 挂起保留会话供 resume */
  async function runSession(session: Session): Promise<void> {
    let state = session.machine
    while (true) {
      if (isTerminal(state)) {
        sessions.delete(session.taskId)
        return
      }
      if (state.phase === "human-takeover") {
        session.machine = state
        return
      }
      if (state.phase !== "running") {
        // idle：会话首次进入，注入 START 后重走守卫检查
        state = reduceReAct(state, { type: "START" }).state
        continue
      }
      if (session.cancelRequested) {
        const transition = reduceReAct(state, { type: "CANCEL" })
        emitEffects(transition.effects, session)
        sessions.delete(session.taskId)
        return
      }
      const agent = options.agents[STEP_AGENT_MAP[state.step]]
      const result = await agent.run({
        input: {
          taskId: session.taskId,
          traceId: session.traceId,
          step: state.step,
          attempt: state.attempt,
          payload: session.payload,
        },
        context: { agentId: agent.id, memory, budget, riskPolicy: [] },
        tools,
      })
      emitResult(result)
      const transition = reduceReAct(state, { type: "STEP_RESULT", result })
      emitEffects(transition.effects, session)
      const nextState = transition.state
      const nextRetryCount = nextState.phase === "running" ? nextState.retryCount : 0
      const retrying = nextState.phase === "running" && nextRetryCount > state.retryCount
      if (retrying) await sleep(backoffDelayMs(nextRetryCount))
      if (result.output?.ok) session.payload = result.output.payload
      state = nextState
    }
  }

  /** 串行排空队列；期间新入队任务由循环自然接管，结束后仍有积压则续泵 */
  async function drain(): Promise<void> {
    for (let envelope = queue.dequeue(); envelope !== null; envelope = queue.dequeue()) {
      const session: Session = {
        taskId: envelope.taskId,
        traceId: envelope.traceId,
        machine: INITIAL_REACT_STATE,
        payload: envelope.command.payload,
        cancelRequested: false,
      }
      sessions.set(envelope.taskId, session)
      await runSession(session)
    }
  }

  function schedulePump(): void {
    if (pumping) return
    pumping = true
    void drain().finally(() => {
      pumping = false
      if (queue.size() > 0) schedulePump()
    })
  }

  return {
    queue,
    async dispatch(cmd: AgentCommand, priority: TaskPriority = "P1"): Promise<DispatchReceipt> {
      const taskId = createId("task")
      const traceId = createId("trace")
      queue.enqueue({
        taskId,
        traceId,
        command: cmd,
        priority,
        attempt: 0,
        enqueuedAt: new Date().toISOString(),
      })
      schedulePump()
      return { taskId, traceId }
    },
    cancel(taskId: string): void {
      if (queue.remove(taskId)) return
      const session = sessions.get(taskId)
      if (!session) return
      session.cancelRequested = true
      if (session.machine.phase === "human-takeover") {
        const transition = reduceReAct(session.machine, { type: "CANCEL" })
        emitEffects(transition.effects, session)
        sessions.delete(taskId)
      }
    },
    async resume(taskId: string, decision: HumanDecision): Promise<void> {
      const session = sessions.get(taskId)
      if (!session || session.machine.phase !== "human-takeover") return
      const transition = reduceReAct(session.machine, {
        type: "HUMAN_DECISION",
        action: decision.action,
        targetStep: decision.targetStep,
      })
      emitEffects(transition.effects, session)
      session.machine = transition.state
      session.cancelRequested = false
      await runSession(session)
    },
    onStep(cb) {
      stepListeners.add(cb)
      return () => {
        stepListeners.delete(cb)
      }
    },
    onEffect(cb) {
      effectListeners.add(cb)
      return () => {
        effectListeners.delete(cb)
      }
    },
  }
}
