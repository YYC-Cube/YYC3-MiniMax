/**
 * file: StepDetailPanel.tsx
 * description: P3 选中步详情面板 · 责任实体/驱动模型/Token耗时/动作规约/Step7 回退规则
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p3],[panel]
 *
 * brief: 右侧抽屉：当前选中步的详情与唤起 Agent 交互会话入口
 *
 * dependencies: react, lucide-react, types, domain/constants
 * exports: StepDetailPanel
 */

import { AlertTriangle, ArrowRight, Cpu } from "lucide-react"
import { GATES } from "../../domain/constants"
import type { AgentId, ReActStep } from "../../types"

interface StepDetailPanelProps {
  currentStep: ReActStep
  selectedStepIndex: number
  activeStepIndex: number
  onSelectAgent: (id: AgentId) => void
}

export function StepDetailPanel({
  currentStep,
  selectedStepIndex,
  activeStepIndex,
  onSelectAgent,
}: StepDetailPanelProps) {
  return (
    <div className="w-full lg:w-[340px] xl:w-[380px] lg:shrink-0 rounded-2xl glass-panel border border-[#00F0FF]/30 p-4 lg:p-5 flex flex-col gap-4 overflow-hidden">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2.5">
            <span
              className="w-7 h-7 rounded-lg font-mono-num font-bold text-xs flex items-center justify-center text-[#0A1628]"
              style={{ backgroundColor: currentStep.color }}
            >
              {currentStep.step}
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">
                {currentStep.name}
              </h3>
              <span className="text-[10px] font-mono-num text-[#9BA3B4]">
                {currentStep.enName}
              </span>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded text-[10px] font-mono-num bg-white/5 border border-white/10 text-[#00FF88]">
            {selectedStepIndex === activeStepIndex ? "● RUNNING" : "COMPLETED"}
          </span>
        </div>

        {/* Bound Agent & Model */}
        <div className="p-3 rounded-xl bg-[#0A1628]/40 border border-white/10 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-[#9BA3B4]">执行责任实体:</span>
            <span
              className="text-xs font-bold cursor-pointer hover:underline"
              style={{ color: currentStep.color }}
              onClick={() => onSelectAgent(currentStep.agentId)}
            >
              {currentStep.agentName}
            </span>
          </div>
          <div className="flex items-center space-x-2 pt-2 border-t border-white/5">
            <Cpu size={14} className="text-[#00F0FF]" />
            <span className="text-[11px] text-[#9BA3B4]">驱动模型:</span>
            <span className="text-xs font-mono-num text-white font-medium">
              {currentStep.model}
            </span>
          </div>
        </div>

        {/* Metrics Grid: Tokens in/out, Duration */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-2.5 rounded-lg bg-[#0A1628]/30 border border-white/5">
            <span className="text-[10px] text-[#9BA3B4] block">
              Input Tokens
            </span>
            <span className="font-mono-num font-bold text-sm text-[#00F0FF] mt-0.5 block">
              {currentStep.tokensIn}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0A1628]/30 border border-white/5">
            <span className="text-[10px] text-[#9BA3B4] block">
              Output Tokens
            </span>
            <span className="font-mono-num font-bold text-sm text-[#D26BFF] mt-0.5 block">
              {currentStep.tokensOut}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0A1628]/30 border border-white/5">
            <span className="text-[10px] text-[#9BA3B4] block">执行耗时</span>
            <span className="font-mono-num font-bold text-sm text-[#00FF88] mt-0.5 block">
              {currentStep.durationMs}ms
            </span>
          </div>
        </div>

        {/* Step Narrative Description */}
        <div className="mb-4">
          <span className="text-[11px] text-[#9BA3B4] block mb-1">
            步骤动作规约:
          </span>
          <p className="text-xs text-[#E0E4EC] leading-relaxed bg-[#0D1B30] p-3 rounded-lg border border-white/10">
            {currentStep.description}
          </p>
        </div>

        {/* Step 7 Special Fallback Rule */}
        {currentStep.step === 7 && (
          <div className="p-3 rounded-lg bg-[#FF006E]/10 border border-[#FF006E]/40 mb-3 text-xs text-[#FF006E]">
            <div className="flex items-center space-x-1.5 font-bold mb-1">
              <AlertTriangle size={14} />
              <span>{`质量门禁复检机制 (≤${GATES.MAX_REVIEW_ROUNDS} 轮)`}</span>
            </div>
            <p className="text-[11px] text-[#E0E4EC]">
              {`若余弦相似度 < ${GATES.CONSISTENCY}%，格物·宗师将生成修复提示词差异增量包，强制回环至 Step 5（创想·灵韵报告润色）重构光影，最多触发 ${GATES.MAX_REVIEW_ROUNDS} 次复检。`}
            </p>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="pt-3 border-t border-white/10">
        <button
          onClick={() => onSelectAgent(currentStep.agentId)}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-[#00F0FF]/20 to-[#BF00FF]/20 hover:from-[#00F0FF]/30 hover:to-[#BF00FF]/30 text-white text-xs font-bold border border-[#00F0FF]/40 transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
        >
          <span>唤起 {currentStep.agentName.split("·")[0]} 交互会话</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}
