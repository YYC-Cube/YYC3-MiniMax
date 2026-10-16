/**
 * file: EventStreamPanel.tsx
 * description: ReAct-C 实时事件流面板 · LIVE/SIM 徽标/日志列表/快捷指令直通 W1
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[p2],[event-stream]
 *
 * brief: 右侧 3 列事件流：日志渲染 + 快捷指令输入（状态自持，回调上抛）
 *
 * dependencies: react, lucide-react, data/agents, types
 * exports: EventStreamPanel
 */

import { Send } from "lucide-react"
import { useState } from "react"
import { AGENTS } from "../../data/agents"
import type { EventStreamMode } from "../../services/eventStream"
import type { AgentId, LogItem } from "../../types"

interface EventStreamPanelProps {
  logs: LogItem[]
  streamMode: EventStreamMode
  onSelectAgent: (id: AgentId) => void
  /** 快捷指令上抛（已含非空校验前的原始文本） */
  onSendCommand: (text: string) => void
}

/** 日志级别配色（INFO/SUCCESS/WARN/ERROR/THINK/ACT） */
function getLogLevelStyle(level: LogItem["level"]) {
  switch (level) {
    case "INFO":
      return { color: "#9BA3B4", bg: "rgba(155,163,180,0.1)" }
    case "SUCCESS":
      return { color: "#00FF88", bg: "rgba(0,255,136,0.12)" }
    case "WARN":
      return { color: "#FFD700", bg: "rgba(255,215,0,0.15)" }
    case "ERROR":
      return { color: "#FF006E", bg: "rgba(255,0,110,0.18)" }
    case "THINK":
      return { color: "#BF00FF", bg: "rgba(191,0,255,0.15)" }
    case "ACT":
      return { color: "#00F0FF", bg: "rgba(0,240,255,0.15)" }
  }
}

export function EventStreamPanel({
  logs,
  streamMode,
  onSelectAgent,
  onSendCommand,
}: EventStreamPanelProps) {
  const [logInput, setLogInput] = useState("@元启 继续下一集生产")

  const handleSend = () => {
    if (!logInput.trim()) return
    onSendCommand(logInput)
  }

  return (
    <div className="col-span-3 h-full flex flex-col rounded-xl glass-panel border border-[#00F0FF]/30 p-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF] animate-pulse" />
          <h3 className="font-bold text-xs text-white tracking-wider">
            ReAct-C 实时事件流
          </h3>
        </div>
        <div className="flex items-center space-x-1.5">
          <span
            className={`px-1.5 py-[1px] rounded text-[9px] font-bold border tracking-wide ${streamMode === "live"
                ? "bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88]/50"
                : "bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/40"
              }`}
          >
            {streamMode === "live" ? "LIVE · WebSocket" : "SIM · 模拟流"}
          </span>
          <span className="text-[10px] font-mono-num text-[#9BA3B4]">
            {logs.length} Events
          </span>
        </div>
      </div>

      {/* Logs List Area (11px monospace, reverse chronological) */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono-num text-[11px]">
        {logs.map((log) => {
          const style = getLogLevelStyle(log.level)
          return (
            <div
              key={log.id}
              className="p-2 rounded bg-[#0D1B30]/90 border border-white/5 hover:border-[#00F0FF]/30 transition-all"
              style={{ animation: "fade-in-up 0.2s ease-out" }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[#9BA3B4]/70">[{log.timestamp}]</span>
                  <span
                    className="px-1.5 py-0.2 rounded font-bold text-[9px]"
                    style={{ color: style.color, backgroundColor: style.bg }}
                  >
                    {log.level}
                  </span>
                  {log.traceId && (
                    <span
                      className="text-[#00F0FF]/45 select-text"
                      title={`traceId: ${log.traceId}`}
                    >
                      #{log.traceId.slice(0, 8)}
                    </span>
                  )}
                </div>
                <span
                  className="text-[10px] font-bold cursor-pointer hover:underline"
                  style={{ color: AGENTS[log.agentId]?.color || "#00F0FF" }}
                  onClick={() => onSelectAgent(log.agentId)}
                >
                  @{AGENTS[log.agentId]?.nick || log.agentName}
                </span>
              </div>
              <p className="text-[#D1D5DB] leading-relaxed text-[11px] select-text">
                {log.message}
              </p>
            </div>
          )
        })}
      </div>

      {/* Bottom Quick Command Input to W1 */}
      <div className="mt-2 pt-2 border-t border-white/10">
        <div className="flex items-center space-x-1.5 bg-[#0A1628]/60 rounded-lg p-1.5 border border-white/10 focus-within:border-[#00F0FF]/60">
          <input
            type="text"
            value={logInput}
            onChange={(e) => setLogInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend()
            }}
            placeholder="@元启 继续下一集..."
            className="flex-1 bg-transparent text-xs text-white placeholder-[#9BA3B4]/50 focus:outline-none px-1"
          />
          <button
            onClick={handleSend}
            className="px-2.5 py-1 bg-[#00F0FF]/20 hover:bg-[#00F0FF]/40 text-[#00F0FF] hover:text-white rounded text-[11px] font-bold transition-all border border-[#00F0FF]/40 cursor-pointer flex items-center space-x-1"
          >
            <span>发送</span>
            <Send size={11} />
          </button>
        </div>
        <span className="text-[9px] text-[#9BA3B4] block mt-1 pl-1">
          按回车键直通 W1 全局 AI 浮窗调度内核
        </span>
      </div>
    </div>
  )
}
