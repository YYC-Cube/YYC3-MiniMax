/**
 * file: StageTabs.tsx
 * description: 六阶段导航 Tab · 等宽横排/状态灯/活跃下划线光晕
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[p2],[navigation]
 *
 * brief: P2 顶部导航条：点击同步选中阶段与激活 Tab
 *
 * dependencies: react, types, p2/StatusLight
 * exports: StageTabs
 */

import React from 'react';
import type { PipelineStage, PipelineStageId } from '../../types';
import { StatusLight } from './StatusLight';

interface StageTabsProps {
  stages: PipelineStage[];
  activeTabId: PipelineStageId;
  onSelectStage: (id: PipelineStageId) => void;
}

export function StageTabs({ stages, activeTabId, onSelectStage }: StageTabsProps) {
  return (
    <div className="grid grid-cols-6 gap-2 bg-[#0E111C]/90 p-1.5 rounded-xl border border-white/10 shadow-lg">
      {stages.map((stage) => {
        const isActive = activeTabId === stage.id;

        return (
          <button
            key={stage.id}
            onClick={() => onSelectStage(stage.id)}
            className={`relative py-2.5 px-3 rounded-lg flex items-center justify-between transition-all duration-200 cursor-pointer ${isActive
              ? 'bg-gradient-to-r from-[#00F0FF]/15 to-[#BF00FF]/15 border border-[#00F0FF]/50 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
              : 'bg-black/20 hover:bg-white/5 border border-transparent'
              } ${stage.status === 'blocked' ? 'animate-alert-flash' : ''}`}
          >
            <div className="flex items-center space-x-2 truncate">
              <span className="font-mono-num font-bold text-xs text-[#00F0FF] bg-[#00F0FF]/15 w-5 h-5 rounded flex items-center justify-center">
                {stage.stepNum}
              </span>
              <span className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-[#9BA3B4]'}`}>
                {stage.name}
              </span>
            </div>

            <div className="flex items-center space-x-2 pl-1">
              <span className="font-mono-num text-[11px] text-white/80 bg-white/5 px-1.5 py-0.5 rounded">
                {stage.activeTasks}
              </span>
              <StatusLight status={stage.status} />
            </div>

            {/* Active Tab Underline Glow */}
            {isActive && (
              <div className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-gradient-to-r from-[#00F0FF] via-[#BF00FF] to-[#FF006E] rounded-full shadow-[0_0_8px_#00F0FF]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
