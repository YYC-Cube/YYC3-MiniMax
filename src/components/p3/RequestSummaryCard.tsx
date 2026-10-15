/**
 * file: RequestSummaryCard.tsx
 * description: P3 中心调度工单卡 · 用户 query/意图置信度/风险标签/当前执行步
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p3],[card]
 *
 * brief: 九步环中心请求摘要卡（随舞台等比缩放）
 *
 * dependencies: react
 * exports: RequestSummaryCard
 */

interface RequestSummaryCardProps {
  activeStepIndex: number;
  stageScale: number;
}

export function RequestSummaryCard({ activeStepIndex, stageScale }: RequestSummaryCardProps) {
  return (
    <div
      className="absolute left-1/2 top-1/2 z-20 w-[260px] p-4 rounded-xl glass-panel border border-[#00F0FF]/40 shadow-[0_0_24px_rgba(0,240,255,0.3)] flex flex-col justify-between text-center"
      style={{
        backgroundColor: 'rgba(10, 14, 24, 0.92)',
        transform: `translate(-50%, -50%) scale(${Math.max(0.72, stageScale)})`,
      }}
    >
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <span className="text-[10px] text-[#9BA3B4] font-medium">当前调度工单</span>
        <span className="text-[10px] text-[#00FF88] font-bold font-mono-num flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-ping" />
          <span>EXECUTING</span>
        </span>
      </div>

      <div className="my-2 text-left">
        <span className="text-[10px] text-[#00F0FF] font-bold block mb-1">
          用户创意 Query:
        </span>
        <p className="text-xs text-white font-medium leading-tight">
          “生成《暗夜决弈》第3集雨夜对峙分镜，保持主角冷冽风衣一致性”
        </p>
      </div>

      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
        <div>
          <span className="text-[#9BA3B4] block">意图置信度</span>
          <span className="text-[#00FF88] font-mono-num font-bold text-xs">98.6%</span>
        </div>
        <div>
          <span className="text-[#9BA3B4] block">合规风险标签</span>
          <span className="text-[#00F0FF] font-mono-num font-bold text-xs">0-PII / LOW</span>
        </div>
        <div>
          <span className="text-[#9BA3B4] block">当前执行步骤</span>
          <span className="text-[#BF00FF] font-mono-num font-bold text-xs">
            Step {activeStepIndex + 1}/9
          </span>
        </div>
      </div>
    </div>
  );
}
