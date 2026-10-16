/**
 * file: QualityQueuePanel.tsx
 * description: P5 分镜质检队列 · 格物·宗师门禁卡列表 + 核验通过/打回重跑操作
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p5],[quality]
 *
 * brief: 左侧质检队列：分镜卡（一致性评分/雷达属性/提示词/拒绝原因）+ 双操作按钮
 *
 * details:
 * - v1.1 IA 补链（NN/g 审计 #3）：底部新增「定位生产台 · 镜头阶段」入口，
 *   复用 navigateToStage 直达 P2 image 阶段卡并高亮（一致性门禁所在）
 *
 * dependencies: react, lucide-react, data/qualityData, domain/constants
 * exports: QualityQueuePanel
 */

import { ArrowRight, CheckCircle2, FileCheck, XCircle } from "lucide-react"
import type { StoryboardAuditItem } from "../../data/qualityData"
import { GATES } from "../../domain/constants"

interface QualityQueuePanelProps {
  storyboards: StoryboardAuditItem[]
  /** 正在抖动告警的分镜 id（打回重跑 0.5s 动画窗口内） */
  shakingCardId: string | null
  onPass: (id: string) => void
  onReject: (id: string) => void
  /** 定位生产台镜头阶段（P5 → P2 image 阶段高亮补链）；未提供时不渲染入口 */
  onLocateStage?: () => void
}

export function QualityQueuePanel({
  storyboards,
  shakingCardId,
  onPass,
  onReject,
  onLocateStage,
}: QualityQueuePanelProps) {
  return (
    <div className="col-span-4 rounded-2xl glass-panel border border-[#00F0FF]/30 p-4 flex flex-col justify-between overflow-hidden">
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
          <div className="flex items-center space-x-2">
            <FileCheck size={16} className="text-[#00F0FF]" />
            <h3 className="font-bold text-sm text-white tracking-wider">
              分镜质检队列 (格物·宗师门禁)
            </h3>
          </div>
          <span className="flex items-baseline space-x-1">
            <span className="text-[10px] font-mono-num text-[#9BA3B4]">待定</span>
            <span className="font-mono-num font-bold text-lg text-[#FFD700]">
              {storyboards.filter((s) => s.status === "pending").length}
            </span>
          </span>
        </div>

        {/* Storyboard cards list */}
        <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
          {storyboards.map((sb) => {
            const isPassed = sb.status === "passed"
            const isRejected = sb.status === "rejected"
            const isShaking = shakingCardId === sb.id
            const isBelowGate = sb.consistencyScore < GATES.CONSISTENCY
            // 终态锁（审计 P1-#1）：已通过/已打回的分镜禁止二次翻转
            const isTerminal = isPassed || isRejected
            // 复检熔断（审计 P1-#2）：待检且已达最大复检轮次，禁止再打回
            const isMaxRounds =
              sb.status === "pending" &&
              sb.reviewRound >= GATES.MAX_REVIEW_ROUNDS

            return (
              <div
                key={sb.id}
                className={`p-3 rounded-xl bg-[#0D1B30] border transition-all ${isShaking ? "animate-alert-flash" : ""
                  } ${isPassed
                    ? "border-[#00FF88]/40 bg-[#00FF88]/5"
                    : isRejected
                      ? "border-[#FF006E]/60 bg-[#FF006E]/10"
                      : isBelowGate
                        ? "border-[#FF006E]/50"
                        : "border-white/10"
                  }`}
              >
                {/* Header: Shot Code + Score */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-mono-num font-bold text-xs text-white block">
                      {sb.shotCode}
                    </span>
                    <span className="text-[10px] text-[#9BA3B4]">
                      {sb.character} · {sb.sceneName}
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                    <span
                      className={`font-mono-num font-extrabold text-sm ${isBelowGate ? "text-[#FF006E]" : "text-[#00FF88]"
                        }`}
                    >
                      {sb.consistencyScore}%
                    </span>
                    <span className="text-[9px] text-[#9BA3B4]">
                      {isBelowGate
                        ? `未达 ${GATES.CONSISTENCY}% 门禁`
                        : "一致性通过"}
                    </span>
                  </div>
                </div>

                {/* Miniature Radar Attribute Breakdown */}
                <div className="grid grid-cols-3 gap-1 bg-[#0A1628]/40 p-2 rounded-lg border border-white/5 text-[9px] mb-2 font-mono-num">
                  <div className="flex justify-between">
                    <span className="text-[#9BA3B4]">五官:</span>
                    <span className="text-white">
                      {sb.radarScores.facialFeature}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9BA3B4]">服饰:</span>
                    <span className="text-white">
                      {sb.radarScores.clothingPalette}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9BA3B4]">光影:</span>
                    <span className="text-white">
                      {sb.radarScores.lightingAtmosphere}%
                    </span>
                  </div>
                </div>

                {/* Prompt Hint */}
                <p className="text-[10px] text-[#9BA3B4] truncate mb-2">
                  提示词: {sb.thumbPrompt}
                </p>

                {/* Reject Reason warning if failed */}
                {sb.rejectReason && (
                  <p className="text-[10px] text-[#FF006E] bg-[#FF006E]/10 p-1.5 rounded mb-2">
                    {sb.rejectReason}
                  </p>
                )}

                {/* 复检熔断提示（审计 P1-#2）：达上限的待检分镜禁止再打回 */}
                {isMaxRounds && (
                  <p className="text-[10px] text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/30 p-1.5 rounded mb-2 flex items-center space-x-1">
                    <span aria-hidden="true">⚠</span>
                    <span>
                      已达复检上限（≤{GATES.MAX_REVIEW_ROUNDS}{" "}
                      轮熔断），请人工终审
                    </span>
                  </p>
                )}

                {/* Action buttons (Pass / Reject) */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-[10px] text-[#9BA3B4] font-mono-num">
                    复检轮次: {sb.reviewRound}/{GATES.MAX_REVIEW_ROUNDS}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onReject(sb.id)}
                      disabled={isTerminal || isMaxRounds}
                      className={`px-2.5 py-1 rounded bg-[#FF006E]/20 text-[#FF006E] border border-[#FF006E]/40 font-bold text-[10px] transition-all flex items-center space-x-1 ${isTerminal || isMaxRounds
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-[#FF006E]/30 cursor-pointer"
                        }`}
                    >
                      <XCircle size={11} />
                      <span>打回重跑</span>
                    </button>
                    <button
                      onClick={() => onPass(sb.id)}
                      disabled={isTerminal}
                      className={`px-2.5 py-1 rounded bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/40 font-bold text-[10px] transition-all flex items-center space-x-1 ${isTerminal
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-[#00FF88]/30 cursor-pointer"
                        }`}
                    >
                      <CheckCircle2 size={11} />
                      <span>核验通过</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[#9BA3B4]">
        <span>门禁策略: 严格阻断模式</span>
        <div className="flex items-center gap-2.5">
          <span className="text-[#00F0FF]">人物 LoRA 锚点已锁定</span>
          {onLocateStage && (
            <button
              type="button"
              onClick={onLocateStage}
              aria-label="前往生产台镜头阶段"
              title="跳转 P2 漫剧生产台并高亮镜头扩散阶段（一致性门禁所在）"
              className="flex items-center space-x-1 text-[#00F0FF] hover:text-white hover:underline cursor-pointer transition-colors"
            >
              <span>定位生产台 · 镜头阶段</span>
              <ArrowRight size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
