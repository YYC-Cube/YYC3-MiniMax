/**
 * file: ZongshiReportPanel.tsx
 * description: P5 格物·宗师质量终审报告 · 溯源核查/复检统计/母带总评
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p5],[report]
 *
 * brief: 右列终审报告：三段高亮卡 + 底部 P2/P3 直达导航
 *
 * dependencies: react, lucide-react, domain/constants
 * exports: ZongshiReportPanel
 */

import { ArrowRight, ExternalLink, FileCheck } from "lucide-react"
import { GATES } from "../../domain/constants"

interface ZongshiReportPanelProps {
  onNavigateToP2: () => void
  onNavigateToP3: () => void
}

export function ZongshiReportPanel({
  onNavigateToP2,
  onNavigateToP3,
}: ZongshiReportPanelProps) {
  return (
    <div className="col-span-4 rounded-2xl glass-panel border border-[#00F0FF]/30 p-4 flex flex-col justify-between overflow-hidden">
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
          <div className="flex items-center space-x-2">
            <FileCheck size={16} className="text-[#C0C0C0]" />
            <h3 className="font-bold text-xs text-white tracking-wider">
              格物·宗师 质量终审报告
            </h3>
          </div>
          <span className="text-[10px] text-[#C0C0C0] font-mono-num">
            REPORT #GW-2025-08
          </span>
        </div>

        {/* Report Highlights */}
        <div className="space-y-3 text-xs overflow-y-auto max-h-[60vh] pr-1">
          <div className="p-3 rounded-xl bg-[#0A0D18] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold">
                事实溯源与剧情一致性核查
              </span>
              <span className="text-[10px] text-[#00FF88] font-bold">
                100% 溯源
              </span>
            </div>
            <p className="text-[11px] text-[#9BA3B4] leading-relaxed">
              本批次 28
              集成片已全部完成知识图谱反向检索，所有台词、道具设定均严格溯源至原著
              Milvus 知识库向量节点，无幻觉虚构。
            </p>
            <div className="text-[10px] text-[#00F0FF] flex items-center space-x-1">
              <ExternalLink size={11} />
              <span>原著知识溯源拓扑链 (Milvus #IP-WORLD-90)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0A0D18] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold">
                复检轮次统计与容错控制
              </span>
              <span className="text-[10px] text-[#00F0FF] font-mono-num font-bold">
                1/2 轮 (安全)
              </span>
            </div>
            <p className="text-[11px] text-[#9BA3B4] leading-relaxed">
              {`漫剧流水线严格规定最多允许 ≤${GATES.MAX_REVIEW_ROUNDS} 轮质量自动复检。当前仅分镜 #SH02 触发 1 次光影微调，二次推理特征相似度已回升至 91.2%，未超限熔断。`}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#0A0D18] border border-white/10 space-y-2">
            <span className="text-white font-bold block">母带交付质量总评</span>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono-num">
              <div className="p-1.5 bg-black/40 rounded">
                <span className="text-[#9BA3B4]">画质规范:</span>
                <span className="text-white pl-1">4K UHD @ 24fps</span>
              </div>
              <div className="p-1.5 bg-black/40 rounded">
                <span className="text-[#9BA3B4]">色彩空间:</span>
                <span className="text-[#00F0FF] pl-1">DCI-P3 Cinema</span>
              </div>
              <div className="p-1.5 bg-black/40 rounded">
                <span className="text-[#9BA3B4]">唇形评分:</span>
                <span className="text-[#00FF88] pl-1">SyncNet 0.84</span>
              </div>
              <div className="p-1.5 bg-black/40 rounded">
                <span className="text-[#9BA3B4]">脱敏完整度:</span>
                <span className="text-[#00FF88] pl-1">100% PASS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
        <button
          onClick={onNavigateToP2}
          className="text-[#00F0FF] hover:underline flex items-center space-x-1 cursor-pointer"
        >
          <span>直达生产指挥台</span>
          <ArrowRight size={11} />
        </button>
        <button
          onClick={onNavigateToP3}
          className="text-[#BF00FF] hover:underline flex items-center space-x-1 cursor-pointer"
        >
          <span>查看 ReAct-C 回环详情</span>
          <ArrowRight size={11} />
        </button>
      </div>
    </div>
  )
}
