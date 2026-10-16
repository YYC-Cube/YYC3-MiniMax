/**
 * file: useWidgetChat.ts
 * description: W1 浮窗会话状态 Hook · 编排 dispatch 驱动回复/接管卡片/外部指令/未读（PR6 重写）
 * author: YanYuCloudCube Team
 * version: v2.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [hook],[widget],[chat],[orchestration]
 *
 * brief: UI 只发命令：语义路由定意图 → dispatch 至编排客户端；回复与人工接管
 *        由 step/effect 事件回流渲染——取代 v1 的 setTimeout 假回复
 *
 * details:
 * - 发送链路：resolveAgentReply（UI 侧 NLU）产出 intent + 展示文案 →
 *   dispatch({ type: 'widget:{intent}' })；回执 taskId 绑定 pending 回复
 * - 回复链路：terminal(done) → 追加 Agent 回复（NLU 文案 + traceId 留痕）；
 *   failed/rolled-back → 系统消息；takeover-required → 人工接管卡片消息
 * - 人工裁决：handleTakeoverDecision 经 client.resume 续跑；裁决后卡片禁用
 * - isOpen 经 ref 供挂载期订阅闭包读取（latest-ref 模式，Compiler 合规）
 *
 * dependencies: react, data/agents, services/agentReply, workers/orchestratorClient, hooks/useLocalStorage, types
 * exports: useWidgetChat
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { AGENTS } from "../data/agents"
import { resolveAgentReply } from "../services/agentReply"
import type { AgentId, ChatMessage } from "../types"
import { getOrchestratorClient } from "../workers/orchestratorClient"
import { useLocalStorage } from "./useLocalStorage"

/** 会话持久化键与容量上限（诊断 #15：刷新/断网恢复聊天记录） */
const W1_MESSAGES_STORAGE_KEY = "yyc3.w1.messages"
const W1_MESSAGES_MAX = 50

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    sender: "agent",
    agentId: "tianshu",
    timestamp: "14:20:00",
    text: "指挥官您好，我是 **元启·天枢**。当前 P2 漫剧生产台各系统运行平稳，今日已完成 28 集成片交付。ReAct-C 九步流水线当前正执行第 3 集镜头扩散与音视频合成，请下达生产决策。",
    referenceCard: {
      type: "task",
      targetId: "image",
      title: "任务 #TASK-STORY-108",
      desc: "《暗夜决弈》EP03 脸部一致性审查中 (当前 92.4%)",
    },
  },
  {
    id: "msg-2",
    sender: "agent",
    agentId: "lingyun",
    timestamp: "14:24:12",
    text: "我是 **创想·灵韵**，第3集雨夜天台对峙分镜已输出完成！采用 12 字段严谨 Schema 规范，正向提示词已注入电影级暗调蓝紫冷光质感。",
    referenceCard: {
      type: "stage",
      targetId: "storyboard",
      title: "分镜资产已锁定",
      desc: "包含 12 字段标准 Schema 与 LoRA 权重",
    },
  },
]

function nowTime(): string {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false })
}

/** 构造用户消息（事件域调用，非渲染期） */
function createUserMessage(text: string): ChatMessage {
  return {
    id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sender: "user",
    timestamp: nowTime(),
    text,
  }
}

/** 终态文案（失败/回滚系统消息） */
function terminalSystemText(phase: string): string {
  if (phase === "failed") return "ReAct-C 闭环执行失败，任务已终止。可重新下达指令或前往 P5 查看质检详情。"
  if (phase === "rolled-back") return "任务已回滚至检查点并挂起。可重新下达指令恢复生产。"
  return "任务已取消。"
}

/** 待回复任务（发送时绑定 NLU 文案；terminal 时消费） */
interface PendingReply {
  text: string
  referenceCard?: ChatMessage["referenceCard"]
  agentId: AgentId
}

interface UseWidgetChatParams {
  activeAgentId: AgentId
  isOpen: boolean
  /** 外部指令对象（诊断 #13）：自增 id 保证同一文本重复发送也可触发 */
  externalCommand?: { id: number; text: string } | null
  onClearExternalCommand?: () => void
  onToggleOpen: () => void
}

export function useWidgetChat({
  activeAgentId,
  isOpen,
  externalCommand,
  onClearExternalCommand,
  onToggleOpen,
}: UseWidgetChatParams) {
  // 会话持久化：localStorage 写穿 + 50 条环形截断（诊断 #15）
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>(
    W1_MESSAGES_STORAGE_KEY,
    INITIAL_MESSAGES,
  )

  const appendMessage = useCallback(
    (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-(W1_MESSAGES_MAX - 1)), msg])
    },
    [setMessages],
  )

  const [inputText, setInputText] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [unreadCount, setUnreadCount] = useState(1)
  const [isMergedMode, setIsMergedMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedAgent = AGENTS[activeAgentId] || AGENTS.tianshu

  const handleSendRef = useRef<(text?: string) => void>(() => undefined)
  const pendingRef = useRef(new Map<string, PendingReply>())

  // latest-ref：挂载期订阅闭包经 ref 读取最新 isOpen（未读计数分支）
  const isOpenRef = useRef(isOpen)
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  // 编排事件回流：终态消费 pending 回复；takeover 追加人工接管卡片
  useEffect(() => {
    const client = getOrchestratorClient()
    const offEffect = client.onEffect((effect, ctx) => {
      if (effect.kind === "takeover-required") {
        appendMessage({
          id: `tk-${ctx.taskId}`,
          sender: "system",
          agentId: "tianshu",
          timestamp: nowTime(),
          text: `**格物·宗师** 复检轮次耗尽（第 ${effect.attempt} 轮）：${effect.reason}。任务已挂起，等待人工接管裁决。`,
          traceId: ctx.traceId,
          takeover: {
            taskId: ctx.taskId,
            traceId: ctx.traceId,
            step: effect.step,
            attempt: effect.attempt,
            reason: effect.reason,
          },
        })
        setIsThinking(false)
        if (!isOpenRef.current) setUnreadCount((c) => c + 1)
        return
      }
      if (effect.kind !== "terminal") return
      const pending = pendingRef.current.get(ctx.taskId)
      if (!pending) return
      pendingRef.current.delete(ctx.taskId)
      if (effect.phase === "done") {
        appendMessage({
          id: `agent-${ctx.taskId}`,
          sender: "agent",
          agentId: pending.agentId,
          timestamp: nowTime(),
          text: pending.text,
          referenceCard: pending.referenceCard,
          traceId: ctx.traceId,
        })
      } else {
        appendMessage({
          id: `sys-${ctx.taskId}`,
          sender: "system",
          agentId: "tianshu",
          timestamp: nowTime(),
          text: terminalSystemText(effect.phase),
          traceId: ctx.traceId,
        })
      }
      setIsThinking(false)
      if (!isOpenRef.current) setUnreadCount((c) => c + 1)
    })
    return offEffect
  }, [appendMessage])

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim()
    if (!text) return

    appendMessage(createUserMessage(text))
    if (!textToSend) setInputText("")
    setIsThinking(true)

    // UI 侧 NLU 定意图与回复文案 → dispatch 命令至编排（UI 只发命令）
    const reply = resolveAgentReply(text, { activeAgentName: selectedAgent.name })
    const agentId: AgentId = isMergedMode ? "tianshu" : activeAgentId
    void getOrchestratorClient()
      .dispatch({
        type: `widget:${reply.intent}`,
        payload: { text },
        issuedBy: "ui-widget",
      })
      .then((receipt) => {
        pendingRef.current.set(receipt.taskId, {
          text: reply.text,
          referenceCard: reply.referenceCard,
          agentId,
        })
      })
  }

  // 保持 latest-ref 指向最新闭包（inputText/selectedAgent/isMergedMode 等状态）。
  // ref 写入放 effect（Compiler 规则禁 render 期写 ref）；本 effect 声明在外部指令 effect
  // 之前，同一 commit 内先赋值后消费——挂载即派发的外部指令也能拿到新鲜闭包
  useEffect(() => {
    handleSendRef.current = handleSend
  })

  // Handle external command from P2 log stream or other pages
  // latest-ref 模式：effect 只依赖 externalCommand（对象身份每次派发必变），无闭包陷阱
  useEffect(() => {
    if (externalCommand) {
      handleSendRef.current(externalCommand.text)
      if (onClearExternalCommand) {
        onClearExternalCommand()
      }
    }
  }, [externalCommand, onClearExternalCommand])

  // 人工接管裁决：resume 续跑 + 卡片置禁用态（防重复裁决）
  const handleTakeoverDecision = useCallback(
    (messageId: string, action: "rerun" | "rollback" | "abort") => {
      const message = messages.find((m) => m.id === messageId)
      const takeover = message?.takeover
      if (!takeover || takeover.resolvedAction) return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.takeover
            ? { ...m, takeover: { ...m.takeover, resolvedAction: action } }
            : m,
        ),
      )
      const labels: Record<typeof action, string> = {
        rerun: "重跑（回环 Step5 重开复检周期）",
        rollback: "回滚至检查点",
        abort: "终止任务",
      }
      appendMessage({
        id: `tkack-${messageId}-${action}`,
        sender: "system",
        agentId: "tianshu",
        timestamp: nowTime(),
        text: `人工裁决已下发：${labels[action]}（traceId: ${takeover.traceId.slice(0, 8)}…）`,
        traceId: takeover.traceId,
      })
      if (action === "rerun") setIsThinking(true)
      void getOrchestratorClient().resume(takeover.taskId, {
        taskId: takeover.taskId,
        traceId: takeover.traceId,
        action,
        decidedBy: "ui-widget",
      })
    },
    [appendMessage, messages, setMessages],
  )

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen])

  // 开箱即清未读（事件语义：随开箱动作清零，取代原 effect 内同步 setState——Compiler 规则合规）
  const handleToggleOpen = () => {
    if (!isOpen) setUnreadCount(0)
    onToggleOpen()
  }

  const handleChipClick = (chipText: string) => {
    handleSend(chipText)
  }

  return {
    messages,
    inputText,
    setInputText,
    isThinking,
    unreadCount,
    isMergedMode,
    setIsMergedMode,
    messagesEndRef,
    selectedAgent,
    handleSend,
    handleToggleOpen,
    handleChipClick,
    handleTakeoverDecision,
  }
}
