/**
 * file: MessageList.tsx
 * description: W1 浮窗消息流 · 双向气泡/加粗解析/引用卡跳转/思考指示
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[widget],[chat]
 *
 * brief: 会话消息区渲染：用户/Agent 气泡、referenceCard 跳转、思考中占位与滚动锚点
 *
 * dependencies: react, lucide-react, data/agents, types
 * exports: MessageList
 */

import { ArrowUpRight, Sparkles } from "lucide-react"
import type { RefObject } from "react"
import { AGENTS } from "../../data/agents"
import type { AgentInfo, ChatMessage } from "../../types"
import { TakeoverCard } from "./TakeoverCard"

interface MessageListProps {
  messages: ChatMessage[]
  selectedAgent: AgentInfo
  isThinking: boolean
  /** 滚动锚点（父层 hook 持有，用于新消息自动滚底） */
  messagesEndRef: RefObject<HTMLDivElement | null>
  onNavigateToTask?: (stageId: string) => void
  /** 人工接管裁决回调（PR7：rerun/rollback/abort → resume 续跑） */
  onTakeoverDecision?: (messageId: string, action: "rerun" | "rollback" | "abort") => void
}

export function MessageList({
  messages,
  selectedAgent,
  isThinking,
  messagesEndRef,
  onNavigateToTask,
  onTakeoverDecision,
}: MessageListProps) {
  return (
    <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#0A1628]/40">
      {messages.map((msg) => {
        const isUser = msg.sender === "user"
        const senderAgent = msg.agentId ? AGENTS[msg.agentId] : selectedAgent

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${isUser ? "items-end" : "items-start"
              } transition-all`}
            style={{ animation: "fade-in-up 0.2s ease-out" }}
          >
            <div className="flex items-center space-x-1.5 mb-1 px-1">
              {!isUser && (
                <span
                  className="text-[10px] font-bold font-mono-num"
                  style={{ color: senderAgent?.color || "#00F0FF" }}
                >
                  {senderAgent?.name || "Agent"}
                </span>
              )}
              <span className="text-[9px] text-[#9BA3B4]/60 font-mono-num">
                {msg.timestamp}
              </span>
            </div>

            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed select-text ${isUser
                ? "bg-gradient-to-r from-[#00F0FF]/25 to-[#BF00FF]/30 text-white border border-[#00F0FF]/40 rounded-br-sm"
                : "bg-[#101320] text-[#E0E4EC] border border-white/10 rounded-bl-sm shadow-md"
                }`}
              style={{
                borderLeft: !isUser
                  ? `3px solid ${senderAgent?.color || "#00F0FF"}`
                  : undefined,
              }}
            >
              {/* Render message with bold parsing */}
              <div className="whitespace-pre-wrap">
                {msg.text.split("**").map((chunk, i) =>
                  i % 2 === 1 ? (
                    <strong key={i} className="text-white font-semibold">
                      {chunk}
                    </strong>
                  ) : (
                    <span key={i}>{chunk}</span>
                  ),
                )}
              </div>

              {/* Reference Card Jump Link（button：键盘可达，精修 F1） */}
              {msg.referenceCard && (
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToTask) {
                      onNavigateToTask(msg.referenceCard?.targetId || "image")
                    }
                  }}
                  className="w-full text-left mt-2 p-2 rounded-lg bg-[#0A1628]/40 border border-[#00F0FF]/30 hover:border-[#00F0FF] transition-all cursor-pointer group flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                >
                  <div className="flex flex-col pr-2">
                    <div className="flex items-center space-x-1 text-[10px] text-[#00F0FF] font-bold">
                      <Sparkles size={10} />
                      <span>{msg.referenceCard.title}</span>
                    </div>
                    <span className="text-[10px] text-[#9BA3B4] truncate">
                      {msg.referenceCard.desc}
                    </span>
                  </div>
                  <ArrowUpRight
                    size={13}
                    className="text-[#00F0FF] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                  />
                </button>
              )}

              {/* Human Takeover Decision Card（PR7） */}
              {msg.takeover && onTakeoverDecision && (
                <TakeoverCard
                  takeover={msg.takeover}
                  messageId={msg.id}
                  onDecision={onTakeoverDecision}
                />
              )}
            </div>
          </div>
        )
      })}

      {/* Thinking indicator */}
      {isThinking && (
        <div className="flex items-center space-x-2 text-xs text-[#00F0FF] bg-[#101320] px-3 py-1.5 rounded-lg border border-[#00F0FF]/30 w-fit">
          <div className="w-2 h-2 rounded-full bg-[#00F0FF] animate-ping" />
          <span className="text-[11px] font-mono-num">
            {selectedAgent.name} 思考中...
          </span>
          <span className="animate-cursor">|</span>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}
