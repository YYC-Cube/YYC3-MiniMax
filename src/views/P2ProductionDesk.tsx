/**
 * file: P2ProductionDesk.tsx
 * description: P2 漫剧生产台（编排层） · 六阶段流水线/实时事件流/门禁失败模拟
 * author: YanYuCloudCube Team
 * version: v2.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[view],[p2],[pipeline]
 *
 * brief: 生产主视图编排层：只持状态与交互编排，UI 块全部下沉到 components/p2/*
 *
 * details:
 * - v2.0 重构：758 行单体拆分为 StageTabs/StageCard/EventStreamPanel/KpiRibbon/
 *   StageDetailDrawer/GateFailureModal 六组件 + useAgentEventStream hook
 * - selectedStage 一次性解析，修复原 8 次 stages.find() 重复查找
 * - AudioContext 加 try-catch（无头环境/自动播放策略降级），告警 timer 卸载清理
 *
 * dependencies: react, lucide-react, hooks/useAgentEventStream, components/p2/*, domain/constants, types
 * exports: P2ProductionDesk
 */

import { PlayCircle, ShieldAlert } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { EventStreamPanel } from '../components/p2/EventStreamPanel';
import { GateFailureModal } from '../components/p2/GateFailureModal';
import { KpiRibbon } from '../components/p2/KpiRibbon';
import { StageCard } from '../components/p2/StageCard';
import { StageDetailDrawer } from '../components/p2/StageDetailDrawer';
import { StageTabs } from '../components/p2/StageTabs';
import { KPI_METRICS, PIPELINE_STAGES } from '../data/pipeline';
import { GATES, formatGatePercent } from '../domain/constants';
import { useAgentEventStream } from '../hooks/useAgentEventStream';
import { telemetry } from '../services/telemetry';
import type { AgentId, LogItem, PipelineStageId } from '../types';

interface P2ProductionDeskProps {
  onSelectAgent: (id: AgentId) => void;
  onSendToWidget: (cmd: string) => void;
  onNavigateToP5?: () => void;
  highlightedStageId?: PipelineStageId | null;
}

export const P2ProductionDesk: React.FC<P2ProductionDeskProps> = ({
  onSelectAgent,
  onSendToWidget,
  onNavigateToP5,
  highlightedStageId,
}) => {
  const stages = PIPELINE_STAGES;
  const [selectedStageId, setSelectedStageId] = useState<PipelineStageId>(highlightedStageId || 'image');
  const [activeTabId, setActiveTabId] = useState<PipelineStageId>('image');
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isAlertFlashing, setIsAlertFlashing] = useState(false);
  const [gateFailureModal, setGateFailureModal] = useState(false);
  const { logs, streamMode, prependLog } = useAgentEventStream({
    url: process.env.NEXT_PUBLIC_EVENT_STREAM_URL,
  });

  const gateTestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync selected stage with prop if provided
  useEffect(() => {
    if (highlightedStageId) {
      setSelectedStageId(highlightedStageId);
      setActiveTabId(highlightedStageId);
      setIsDetailDrawerOpen(true);
    }
  }, [highlightedStageId]);

  // 卸载清理：门禁测试定时器（防止卸载后 setState）
  useEffect(() => {
    return () => {
      if (gateTestTimerRef.current) clearTimeout(gateTestTimerRef.current);
    };
  }, []);

  const selectedStage = stages.find((s) => s.id === selectedStageId);

  const handleSelectStage = (id: PipelineStageId) => {
    setSelectedStageId(id);
    setActiveTabId(id);
  };

  // Trigger Gate Failure Test (flashes pink 3 times then pops modal)
  const triggerGateFailureTest = () => {
    telemetry.audit('gate.simulate_failure', 'image');
    setIsAlertFlashing(true);
    try {
      const audioBeep = new AudioContext();
      const osc = audioBeep.createOscillator();
      osc.frequency.setValueAtTime(440, audioBeep.currentTime);
      osc.connect(audioBeep.destination);
      osc.start();
      osc.stop(audioBeep.currentTime + 0.15);
      osc.onended = () => void audioBeep.close();
    } catch {
      // 音频不可用（无头环境/自动播放策略拒绝）时静默降级，门禁告警链路不受影响
    }

    gateTestTimerRef.current = setTimeout(() => {
      setIsAlertFlashing(false);
      setGateFailureModal(true);
    }, 1500);
  };

  // Handle Quick Command to W1
  const handleSendCommand = (text: string) => {
    if (!text.trim()) return;
    onSendToWidget(text);
    const newLog: LogItem = {
      id: `cmd-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      agentId: 'tianshu',
      agentName: '元启·天枢',
      level: 'ACT',
      message: `接收控制台快捷指令: "${text}"，已派发至 ReAct-C 执行器。`,
    };
    prependLog(newLog);
  };

  return (
    <div className="w-full h-full flex flex-col p-5 space-y-4 overflow-hidden select-none">
      {/* 1. TOP 6-STAGE NAVIGATION TABS */}
      <StageTabs stages={stages} activeTabId={activeTabId} onSelectStage={handleSelectStage} />

      {/* 2. MIDDLE MAIN AREA: 6-Stage Pipeline Array (Left) + Real-time Event Stream (Right) */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left 9 Columns: Six Stage Cards Array + Simulation Trigger Bar */}
        <div className="col-span-9 flex flex-col justify-between overflow-x-auto overflow-y-hidden pb-1">
          <div className="grid grid-cols-6 gap-3.5 h-full items-center relative">
            {stages.map((stage, idx) => (
              <StageCard
                key={stage.id}
                stage={stage}
                showArrow={idx < stages.length - 1}
                isSelected={selectedStageId === stage.id}
                isBlocked={stage.status === 'blocked' || (stage.id === 'image' && isAlertFlashing)}
                onSelectStage={handleSelectStage}
                onSelectAgent={onSelectAgent}
                onOpenDetail={(id) => {
                  setSelectedStageId(id);
                  setIsDetailDrawerOpen(true);
                }}
              />
            ))}
          </div>

          {/* Interactive Simulation Trigger Bar */}
          <div className="mt-2 flex items-center justify-between bg-[#0A0D17]/80 px-4 py-2 rounded-xl border border-white/10 text-xs">
            <div className="flex items-center space-x-3 text-[#9BA3B4]">
              <span className="text-[#00F0FF] font-bold flex items-center space-x-1">
                <PlayCircle size={14} />
                <span>流水线控制器:</span>
              </span>
              <span>ReAct-C 全闭环自动化流转中</span>
              <span className="text-[10px] text-white/50">
                | 门禁规则：一致性 {formatGatePercent(GATES.CONSISTENCY)} & SyncNet {GATES.SYNCNET}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={triggerGateFailureTest}
                className="px-3 py-1 rounded bg-[#FF006E]/20 text-[#FF006E] hover:bg-[#FF006E]/30 border border-[#FF006E]/50 font-bold transition-all text-[11px] flex items-center space-x-1 cursor-pointer"
                title="模拟门禁失败：一致性低于阈值，卡片闪烁 3 次并弹窗"
              >
                <ShieldAlert size={12} />
                <span>模拟门禁失败测试</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 3 Columns: Real-Time Event Stream */}
        <EventStreamPanel
          logs={logs}
          streamMode={streamMode}
          onSelectAgent={onSelectAgent}
          onSendCommand={handleSendCommand}
        />
      </div>

      {/* 3. BOTTOM CAPACITY & EFFICIENCY KPI RIBBON */}
      <KpiRibbon kpis={KPI_METRICS} />

      {/* 4. STAGE DETAIL DRAWER MODAL (When clicking "进入阶段") */}
      {isDetailDrawerOpen && selectedStage && (
        <StageDetailDrawer stage={selectedStage} onClose={() => setIsDetailDrawerOpen(false)} />
      )}

      {/* 5. GATE FAILURE ALERT MODAL (Triggered when consistency < gate) */}
      {gateFailureModal && (
        <GateFailureModal
          onClose={() => setGateFailureModal(false)}
          onNavigateToP5={onNavigateToP5}
        />
      )}
    </div>
  );
};
