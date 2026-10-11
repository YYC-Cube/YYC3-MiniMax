/**
 * file: StageCard.tsx
 * description: 流水线阶段卡 · 370px 基线卡/粒子箭头连接器/Agent 头像组
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[p2],[pipeline]
 *
 * brief: 单阶段卡片：点击选中、Agent 头像唤起 W1、"进入阶段"打开详情抽屉
 *
 * dependencies: react, lucide-react, AgentAvatar, data/agents, types, p2/StatusLight
 * exports: StageCard
 */

import { ArrowRight, BookOpen, Clapperboard, FileCode2, Image as ImageIcon, Repeat, Video } from 'lucide-react';
import React from 'react';
import { AgentAvatar } from '../AgentAvatar';
import { AGENTS } from '../../data/agents';
import type { AgentId, PipelineStage, PipelineStageId } from '../../types';
import { StatusLight } from './StatusLight';

interface StageCardProps {
  stage: PipelineStage;
  /** 是否渲染到下一张卡的粒子箭头（最后一张为 false） */
  showArrow: boolean;
  isSelected: boolean;
  /** 阻塞态（含门禁告警闪烁叠加） */
  isBlocked: boolean;
  onSelectStage: (id: PipelineStageId) => void;
  onSelectAgent: (id: AgentId) => void;
  onOpenDetail: (id: PipelineStageId) => void;
}

function getStageIcon(id: PipelineStageId) {
  switch (id) {
    case 'novel':
      return BookOpen;
    case 'storyboard':
      return FileCode2;
    case 'image':
      return ImageIcon;
    case 'video':
      return Video;
    case 'render':
      return Clapperboard;
    case 'ops':
      return Repeat;
  }
}

const STATUS_LABEL: Record<PipelineStage['status'], string> = {
  completed: '已达成',
  running: '运行中',
  blocked: '门禁告警',
  ready: '待命',
};

export function StageCard({
  stage,
  showArrow,
  isSelected,
  isBlocked,
  onSelectStage,
  onSelectAgent,
  onOpenDetail,
}: StageCardProps) {
  const Icon = getStageIcon(stage.id);
  const isRunning = stage.status === 'running';

  return (
    <div className="relative h-full flex flex-col justify-center">
      {/* Pipeline Arrow to Next Card (with particle flow) */}
      {showArrow && (
        <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 pointer-events-none w-5 flex items-center justify-center">
          <div className="relative w-full flex items-center justify-center">
            <ArrowRight size={16} className="text-[#BF00FF] drop-shadow-[0_0_6px_#BF00FF]" />
            {/* Flowing particle animation */}
            <div
              className="absolute w-1.5 h-1.5 rounded-full bg-[#00F0FF] shadow-[0_0_6px_#00F0FF]"
              style={{
                animation: 'particle-flow-cw 1.8s linear infinite',
              }}
            />
          </div>
        </div>
      )}

      {/* 260x360 Baseline Card: rounded-12, panel-bg + blue border + 10px purple shadow */}
      <div
        onClick={() => onSelectStage(stage.id)}
        className={`w-full h-[370px] rounded-xl glass-panel p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer relative overflow-hidden group ${isSelected
          ? 'border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.4),0_0_30px_rgba(191,0,255,0.25)]'
          : 'border-[#00F0FF]/25 hover:border-[#00F0FF]/50 shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_10px_rgba(191,0,255,0.15)]'
          } ${isRunning ? 'animate-pulse-breath' : ''} ${isBlocked ? 'animate-alert-flash' : ''}`}
        style={{
          backgroundColor: 'rgba(16, 18, 28, 0.78)',
        }}
      >
        {/* Top Row: Stage Icon (24px, stage color) + Status Pill */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md"
              style={{
                backgroundColor: `${stage.color}18`,
                border: `1px solid ${stage.color}55`,
                boxShadow: `0 0 10px ${stage.color}33`,
              }}
            >
              <Icon size={20} style={{ color: stage.color }} />
            </div>

            <div className="flex items-center space-x-1.5 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
              <StatusLight status={stage.status} />
              <span className="text-[10px] text-[#9BA3B4] font-medium">{STATUS_LABEL[stage.status]}</span>
            </div>
          </div>

          {/* Stage Name + En Subtitle */}
          <div className="mb-2">
            <h3 className="font-bold text-sm text-white group-hover:text-[#00F0FF] transition-colors">
              {stage.name}
            </h3>
            <span className="text-[10px] font-mono-num text-[#9BA3B4]">
              {stage.enName}
            </span>
          </div>

          {/* Bound Lead Agent Avatars (32px overlapped) */}
          <div className="bg-[#0A0C14]/80 p-2 rounded-lg border border-white/10 mb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-[#9BA3B4]">协同 Agent:</span>
              <span className="text-[9px] text-[#00F0FF] font-bold">
                {AGENTS[stage.leadAgents[0]]?.nick} (主导)
              </span>
            </div>
            <div className="flex items-center -space-x-1.5">
              {stage.leadAgents.map((agId, aIdx) => (
                <div
                  key={agId}
                  className="relative"
                  title={`${AGENTS[agId]?.name} (${aIdx === 0 ? '主导' : '协作者'})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAgent(agId);
                  }}
                >
                  <AgentAvatar agentId={agId} size={30} showLed={aIdx === 0} />
                </div>
              ))}
              <span className="text-[10px] text-[#9BA3B4] pl-3 truncate">
                {stage.leadAgents.map((id) => AGENTS[id]?.nick).join(' + ')}
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Key Metric Numbers (Monospace, Neon Color) */}
        <div className="grid grid-cols-2 gap-1.5 my-1">
          <div className="bg-black/30 p-1.5 rounded border border-white/5">
            <span className="text-[9px] text-[#9BA3B4] block">在跑任务</span>
            <span className="font-mono-num font-bold text-sm text-[#00F0FF]">
              {stage.activeTasks} <span className="text-[9px] text-[#9BA3B4]">单</span>
            </span>
          </div>
          <div className="bg-black/30 p-1.5 rounded border border-white/5">
            <span className="text-[9px] text-[#9BA3B4] block">队列长度</span>
            <span className="font-mono-num font-bold text-sm text-[#BF00FF]">
              {stage.queueLength} <span className="text-[9px] text-[#9BA3B4]">单</span>
            </span>
          </div>
          <div className="bg-black/30 p-1.5 rounded border border-white/5">
            <span className="text-[9px] text-[#9BA3B4] block">平均耗时</span>
            <span className="font-mono-num font-bold text-xs text-white">
              {stage.avgDuration}
            </span>
          </div>
          <div className="bg-black/30 p-1.5 rounded border border-white/5">
            <span className="text-[9px] text-[#9BA3B4] block">合格率</span>
            <span className="font-mono-num font-bold text-xs text-[#00FF88]">
              {stage.passRate}
            </span>
          </div>
        </div>

        {/* Mini Progress Bar (Linear, Cyan-Purple Gradient) + Status */}
        <div className="mt-1">
          <div className="flex justify-between text-[10px] text-[#9BA3B4] mb-1">
            <span className="truncate pr-1 text-[9px]">{stage.keySchemaOrGate}</span>
            <span className="font-mono-num text-white">{stage.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#00F0FF] via-[#BF00FF] to-[#FF006E] rounded-full transition-all duration-300"
              style={{ width: `${stage.progress}%` }}
            />
          </div>
        </div>

        {/* Bottom Action Button: 进入阶段 (小按钮，蓝边) */}
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(stage.id);
            }}
            className="w-full py-1.5 px-2 rounded-lg text-[11px] font-bold text-[#00F0FF] hover:text-white bg-[#00F0FF]/15 hover:bg-[#00F0FF]/30 border border-[#00F0FF]/40 hover:border-[#00F0FF] transition-all flex items-center justify-center space-x-1 cursor-pointer"
          >
            <span>进入阶段</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
