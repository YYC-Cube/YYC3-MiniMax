/**
 * file: StageDetailDrawer.tsx
 * description: 阶段详情抽屉 · 12 字段分镜 Schema/图像门禁详情/默认生产配置
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[p2],[modal]
 *
 * brief: "进入阶段"弹窗：按阶段类型渲染专属 Schema（接收已解析的 stage 对象）
 *
 * dependencies: react, lucide-react, data/pipeline, domain/constants, types
 * exports: StageDetailDrawer
 */

import { CheckCircle2, Cpu, Layers, X } from "lucide-react"
import { STORYBOARD_12_FIELDS } from "../../data/pipeline"
import { GATES, formatGatePercent } from "../../domain/constants"
import type { PipelineStage } from "../../types"

interface StageDetailDrawerProps {
  /** 已解析的目标阶段（父层一次性 find，组件内不做重复查找） */
  stage: PipelineStage
  onClose: () => void
}

export function StageDetailDrawer({ stage, onClose }: StageDetailDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0A1628]/75 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-[820px] max-h-[85vh] rounded-2xl glass-panel border border-[#00F0FF]/60 p-6 flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_16px_rgba(0,240,255,0.3)] animate-bounce-subtle">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: `${stage.color}22`,
                border: `1px solid ${stage.color}`,
              }}
            >
              <Cpu size={22} style={{ color: stage.color }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{stage.name}</span>
                <span className="text-xs text-[#00F0FF] font-mono-num font-normal">
                  [{stage.enName}]
                </span>
              </h2>
              <p className="text-xs text-[#9BA3B4]">{stage.description}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9BA3B4] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content: Specific Stage Schemas */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* If Stage 2 Storyboard, show 12-field Schema */}
          {stage.id === "storyboard" && (
            <div>
              <h4 className="text-xs font-bold text-[#00E5FF] mb-2 flex items-center space-x-1.5">
                <Layers size={14} />
                <span>标准化 12 字段分镜 Schema 规范输出表:</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {STORYBOARD_12_FIELDS.map((f, i) => (
                  <div
                    key={f.field}
                    className="p-2.5 rounded-lg bg-[#0A1628]/40 border border-white/10 flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono-num text-[#00F0FF] font-bold">
                        {i + 1}. {f.field}
                      </span>
                      <span className="text-[10px] text-[#9BA3B4] bg-white/5 px-1.5 rounded">
                        {f.type}
                      </span>
                    </div>
                    <span className="text-white font-medium text-[11px]">
                      {f.name}
                    </span>
                    <span className="text-[#9BA3B4] text-[10px] mt-1 truncate">
                      示例: {f.example}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If Stage 3 Image Synthesis, show Face Consistency Gate Details */}
          {stage.id === "image" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/40">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={18} className="text-[#00FF88]" />
                  <span className="text-xs text-white font-bold">
                    人物面部特征门禁 ({formatGatePercent(GATES.CONSISTENCY)})
                  </span>
                </div>
                <span className="font-mono-num text-lg font-extrabold text-[#00FF88]">
                  91.4% 通过
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-[#0A1628]/40 border border-white/10 text-center">
                  <span className="text-[10px] text-[#9BA3B4] block">
                    主导执行 Agent
                  </span>
                  <span className="text-xs font-bold text-[#BF00FF] mt-1 block">
                    创想·灵韵 (Flux-Pro)
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#0A1628]/40 border border-white/10 text-center">
                  <span className="text-[10px] text-[#9BA3B4] block">
                    质量复检 Agent
                  </span>
                  <span className="text-xs font-bold text-[#C0C0C0] mt-1 block">
                    格物·宗师 (余弦比对)
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#0A1628]/40 border border-white/10 text-center">
                  <span className="text-[10px] text-[#9BA3B4] block">
                    LoRA 权重池
                  </span>
                  <span className="text-xs font-bold text-[#00F0FF] mt-1 block">
                    char_lumingyuan_v4 (0.85)
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#9BA3B4] leading-relaxed">
                在 Flux 扩散原画渲染流程中，格物·宗师将每张输出切片与 3D
                人物骨架基准向量进行五维相似度比对（五官轮廓、瞳距、发色、光影色温、姿态连贯性）。若得分低于{" "}
                {GATES.CONSISTENCY}
                %，将强制阻断并触发 ReAct-C 闭环回环重跑。
              </p>
            </div>
          )}

          {/* Default other stages */}
          {stage.id !== "storyboard" && stage.id !== "image" && (
            <div className="p-4 rounded-xl bg-[#0A1628]/40 border border-white/10 text-xs text-[#9BA3B4] space-y-2">
              <p className="text-white font-medium">
                当前阶段生产配置与算力资源分配：
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white/5 rounded">
                  <span className="text-[#9BA3B4]">调度节点:</span>
                  <span className="text-white font-mono-num pl-2">
                    yyc3-101 / yyc3-22 M4
                  </span>
                </div>
                <div className="p-2 bg-white/5 rounded">
                  <span className="text-[#9BA3B4]">并发线程数:</span>
                  <span className="text-[#00F0FF] font-mono-num pl-2">
                    8 Parallel Pipelines
                  </span>
                </div>
                <div className="p-2 bg-white/5 rounded">
                  <span className="text-[#9BA3B4]">中间件依赖:</span>
                  <span className="text-white font-mono-num pl-2">
                    Milvus + /mnt/nas NFS
                  </span>
                </div>
                <div className="p-2 bg-white/5 rounded">
                  <span className="text-[#9BA3B4]">容错策略:</span>
                  <span className="text-[#00FF88] font-mono-num pl-2">
                    ≤{GATES.MAX_REVIEW_ROUNDS} 轮自动回环复检
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] text-[#9BA3B4]">
            YYC³ 漫剧工业化流水线 · 自动化闭环控制
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#00F0FF]/20 hover:bg-[#00F0FF]/30 text-[#00F0FF] font-bold text-xs border border-[#00F0FF]/50 transition-all cursor-pointer"
          >
            确认并关闭
          </button>
        </div>
      </div>
    </div>
  )
}
