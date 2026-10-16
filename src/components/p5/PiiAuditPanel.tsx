/**
 * file: PiiAuditPanel.tsx
 * description: P5 安全审计与 PII 脱敏 · 脱敏放行文本 / 受控调取原文前后对比
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p5],[security],[pii]
 *
 * brief: 中列安全审计卡列表：受控调取态与原文缓存由父层持有，此处仅渲染与回调
 *
 * dependencies: react, lucide-react, data/qualityData
 * exports: PiiAuditPanel
 */

import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import type { PIILogItem } from "../../data/qualityData"

interface PiiAuditPanelProps {
  piiLogs: PIILogItem[]
  /** 当前展开（已调取）原文的日志 id */
  revealedPiiId: string | null
  /** 受控调取的原文缓存（按日志 id） */
  revealedRaw: Record<string, string>
  /** 切换某条日志的原文展开/收起（展开时触发异步调取） */
  onToggleReveal: (logId: string) => void
}

export function PiiAuditPanel({
  piiLogs,
  revealedPiiId,
  revealedRaw,
  onToggleReveal,
}: PiiAuditPanelProps) {
  return (
    <div className="col-span-4 rounded-2xl glass-panel border border-[#00F0FF]/30 p-4 flex flex-col justify-between overflow-hidden">
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck size={16} className="text-[#00FF88]" />
            <h3 className="font-bold text-xs text-white tracking-wider">
              安全审计与 PII 脱敏 (智云·守护)
            </h3>
          </div>
          <span className="text-[10px] text-[#00FF88] font-mono-num">
            三级过滤拦截中
          </span>
        </div>

        {/* PII Log Cards */}
        <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
          {piiLogs.map((log) => {
            const isRevealed = revealedPiiId === log.id

            return (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-[#0A0D18] border border-white/10 hover:border-[#00F0FF]/40 transition-all text-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FF006E]/20 text-[#FF006E] border border-[#FF006E]/40">
                      {log.entityType}
                    </span>
                    <span className="text-[10px] text-[#9BA3B4] font-mono-num">
                      {log.time}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#00FF88] font-bold">
                    {log.action}
                  </span>
                </div>

                <span className="text-[10px] text-[#9BA3B4] block mb-1">
                  来源: {log.stageName} · 审查实体: {log.guardAgent}
                </span>

                {/* Masked vs Raw Snippet Comparison */}
                <div className="space-y-1.5 bg-black/50 p-2.5 rounded-lg border border-white/5 my-2">
                  <div>
                    <span className="text-[9px] text-[#9BA3B4] block mb-0.5">
                      脱敏放行文本 (Cleaned):
                    </span>
                    <p className="font-mono-num text-white text-[11px] select-text">
                      {log.maskedSnippet}
                    </p>
                  </div>

                  {isRevealed && (
                    <div className="pt-1.5 border-t border-white/10">
                      <span className="text-[9px] text-[#FF006E] block mb-0.5 font-bold">
                        原始高危拦截数据 (Raw Dangerous · 受控调取):
                      </span>
                      <p className="font-mono-num text-[#FF006E] text-[11px] select-text">
                        {revealedRaw[log.id] || "调取中…"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Toggle Raw View */}
                <div className="flex justify-end">
                  <button
                    onClick={() => onToggleReveal(log.id)}
                    className="text-[10px] text-[#00F0FF] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                    <span>
                      {isRevealed ? "收起敏感比对" : "查看脱敏前后对比"}
                    </span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[#9BA3B4]">
        <span>数字盲水印: 已注入 4K 帧序列</span>
        <span className="text-[#00FF88]">PII 审计零残留</span>
      </div>
    </div>
  )
}
