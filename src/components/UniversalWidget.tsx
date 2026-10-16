/**
 * file: UniversalWidget.tsx
 * description: W1 全局 AI 浮窗 · 8 Agent 秒切/语义路由/引用卡跳转（响应式）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-16
 * status: active
 * tags: [component],[widget],[ai]
 *
 * brief: 跨视图常驻对话浮窗，支持外部指令注入与阶段引用跳转
 *
 * dependencies: react, lucide-react, types, data/agents, hooks/useWidgetChat, components/widget/MessageList
 * exports: UniversalWidget
 */

import { Layers, Minimize2, Paperclip, Send, X } from "lucide-react"
import React from "react"
import { AGENT_LIST } from "../data/agents"
import { useWidgetChat } from "../hooks/useWidgetChat"
import { AgentId } from "../types"
import { AgentAvatar } from "./AgentAvatar"
import { BrandMark } from "./BrandMark"
import { MessageList } from "./widget/MessageList"

interface UniversalWidgetProps {
  activeAgentId: AgentId
  onSelectAgent: (id: AgentId) => void
  isOpen: boolean
  onToggleOpen: () => void
  onNavigateToTask?: (stageId: string) => void
  /** 外部指令对象（诊断 #13）：自增 id 保证同一文本重复发送也可触发 */
  externalCommand?: { id: number; text: string } | null
  onClearExternalCommand?: () => void
}

export const UniversalWidget: React.FC<UniversalWidgetProps> = ({
  activeAgentId,
  onSelectAgent,
  isOpen,
  onToggleOpen,
  onNavigateToTask,
  externalCommand,
  onClearExternalCommand,
}) => {
  const {
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
  } = useWidgetChat({
    activeAgentId,
    isOpen,
    externalCommand,
    onClearExternalCommand,
    onToggleOpen,
  })

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      {/* Collapsed State: 56x56 Pulsing Sphere（button：键盘可达，精修 F1——Tab 循环不再绕过 W1） */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleToggleOpen}
          aria-haspopup="dialog"
          className="relative w-14 h-14 rounded-full cursor-pointer group flex items-center justify-center transition-transform hover:scale-105 active:scale-95 animate-bounce-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          title="展开 Universal Agent AI 浮窗"
        >
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-full bg-[#00F0FF]/30 animate-ping opacity-50" />

          {/* Main sphere body */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00F0FF] via-[#BF00FF] to-[#0A1628] p-[2px] shadow-[0_0_20px_rgba(0,240,255,0.6)]">
            <div className="w-full h-full rounded-full bg-[#0A1628] flex items-center justify-center relative overflow-hidden">
              <BrandMark size={34} quiet />
              <div className="absolute inset-0 bg-radial from-transparent via-[#00F0FF]/10 to-transparent" />
            </div>
          </div>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#C40055] border-2 border-[#0A1628] text-[10px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_#FF006E]">
              {unreadCount}
            </div>
          )}
        </button>
      )}

      {/* Expanded State: 400x600 Glass Panel（非模态 dialog：SR 可感知，无焦点陷阱——Tab 自然进出） */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Universal Agent AI 浮窗"
          className="w-[min(410px,calc(100vw-2rem))] h-[min(610px,calc(100dvh-8rem))] rounded-2xl glass-panel flex flex-col overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.8),0_0_24px_rgba(191,0,255,0.3)] border border-[#00F0FF]/40 transition-all duration-240"
          style={{
            animation: "float-widget 3s ease-in-out infinite alternate",
          }}
        >
          {/* 1. Header with Title & Controls */}
          <div className="h-12 px-4 bg-[#0E1018]/95 border-b border-white/10 flex items-center justify-between cursor-move">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#00F0FF] to-[#BF00FF] p-[1px]">
                <div className="w-full h-full bg-[#0A1628] rounded-[5px] flex items-center justify-center p-[1px]">
                  <BrandMark size={20} quiet />
                </div>
              </div>
              <span className="font-mono-num font-bold text-xs text-white tracking-wide">
                UNIVERSAL AGENT WIDGET (W1)
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Merged mode toggle */}
              <button
                onClick={() => setIsMergedMode(!isMergedMode)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${isMergedMode
                  ? "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50 shadow-[0_0_8px_rgba(0,240,255,0.3)]"
                  : "text-[#9BA3B4] hover:text-white bg-white/5 border border-transparent"
                  }`}
                title="天枢总调度合并模式：汇总所有智能体意见"
              >
                <span className="flex items-center space-x-1">
                  <Layers size={10} />
                  <span>天枢总调度</span>
                </span>
              </button>

              {/* Minimize/Close button */}
              <button
                onClick={handleToggleOpen}
                className="p-1 rounded text-[#9BA3B4] hover:text-white hover:bg-white/10 transition-colors"
                title="收起浮窗"
              >
                <Minimize2 size={13} />
              </button>
              <button
                onClick={handleToggleOpen}
                className="p-1 rounded text-[#9BA3B4] hover:text-[#FF006E] hover:bg-white/10 transition-colors"
                title="关闭"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* 2. Top Agent Switcher: 8 Members Circle Avatars (32px) */}
          <div className="px-3 py-2 bg-[#0D1B30]/90 border-b border-white/10">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] text-[#9BA3B4] font-medium">
                8 拟人化 Agent 切换:
              </span>
              <span className="text-[10px] text-[#00F0FF] font-mono-num">
                {selectedAgent.nick} ({selectedAgent.clockPosition})
              </span>
            </div>
            <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 px-1">
              {AGENT_LIST.map((agent) => {
                const isSelected = activeAgentId === agent.id
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => onSelectAgent(agent.id)}
                    aria-pressed={isSelected}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] rounded-md"
                    title={`${agent.name} (${agent.title})`}
                  >
                    <div
                      className={`relative transition-all duration-200 ${isSelected
                        ? "scale-110"
                        : "opacity-70 hover:opacity-100"
                        }`}
                    >
                      <AgentAvatar
                        agentId={agent.id}
                        size={32}
                        showLed={true}
                        overrideStatus={isSelected ? "speaking" : agent.status}
                      />
                    </div>
                    <span
                      className={`text-[9px] mt-1 transition-colors whitespace-nowrap ${isSelected
                        ? "text-[#00F0FF] font-bold"
                        : "text-[#9BA3B4]"
                        }`}
                    >
                      {agent.nick}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Chat Messages Stream Area */}
          <MessageList
            messages={messages}
            selectedAgent={selectedAgent}
            isThinking={isThinking}
            messagesEndRef={messagesEndRef}
            onNavigateToTask={onNavigateToTask}
            onTakeoverDecision={handleTakeoverDecision}
          />

          {/* 4. Quick Command Chips */}
          <div className="px-3 py-1.5 bg-[#0D0F1A] border-t border-white/10 flex items-center gap-1.5 overflow-x-auto">
            {["继续生产", "查看质检", "下一阶段", "成本报告", "异常诊断"].map(
              (chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className="px-2.5 py-1 rounded-full text-[10px] bg-white/5 hover:bg-[#00F0FF]/20 text-[#9BA3B4] hover:text-white border border-white/10 hover:border-[#00F0FF]/50 transition-all whitespace-nowrap cursor-pointer"
                >
                  {chip}
                </button>
              ),
            )}
          </div>

          {/* 5. Input Box & Action Buttons */}
          <div className="p-3 bg-[#0D1B30] border-t border-white/10">
            <div className="flex items-center space-x-2 bg-[#121524] rounded-xl px-3 py-2 border border-white/15 focus-within:border-[#00F0FF]/70 transition-colors">
              <button
                className="text-[#9BA3B4] hover:text-[#00F0FF] transition-colors p-0.5"
                title="上传剧本/参考图 (附件)"
                onClick={() => handleChipClick("上传剧本附件：EP04-SC01.docx")}
              >
                <Paperclip size={14} />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSend()
                  }
                }}
                placeholder={`@${selectedAgent.nick} 输入指令或提问...`}
                className="flex-1 bg-transparent text-xs text-white placeholder-[#9BA3B4]/60 focus:outline-none"
              />

              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim()}
                className={`p-1.5 rounded-lg transition-all ${inputText.trim()
                  ? "bg-gradient-to-r from-[#00F0FF] to-[#BF00FF] text-white shadow-[0_0_10px_rgba(0,240,255,0.5)] cursor-pointer"
                  : "text-[#9BA3B4]/40 cursor-not-allowed"
                  }`}
              >
                <Send size={13} />
              </button>
            </div>

            {/* Bottom subtitle attribution: 当前由 [Agent名] 响应 · ReAct-C 九步模式 */}
            <div className="mt-1.5 px-1 flex items-center justify-between text-[10px] text-[#9BA3B4]">
              <span className="flex items-center space-x-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: selectedAgent.color }}
                />
                <span>
                  当前由{" "}
                  <strong className="text-white">{selectedAgent.name}</strong>{" "}
                  响应
                </span>
              </span>
              <span className="text-[#00F0FF] font-mono-num">
                ReAct-C 九步模式
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
