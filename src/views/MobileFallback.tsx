/**
 * file: MobileFallback.tsx
 * description: 移动端降级视图 · <768px 五卡精简呈现保持 W1 闭环
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[view],[mobile]
 *
 * brief: 家族/流水线/ReAct/算力/质安五卡精简视图，点击成员唤起 W1
 *
 * dependencies: react, lucide-react, data/*, components/AgentAvatar, components/StatusPill, domain/constants, domain/opsView
 * exports: MobileFallback
 */

import { Cpu, GitBranch, Radio, ShieldAlert, Sparkles, Workflow } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AgentAvatar } from '../components/AgentAvatar';
import { BrandMark } from '../components/BrandMark';
import { PwaInstallButton } from '../components/PwaInstallButton';
import { StatusPill } from '../components/StatusPill';
import { AGENT_LIST } from '../data/agents';
import { OPS_NODES } from '../data/opsData';
import { KPI_METRICS, PIPELINE_STAGES } from '../data/pipeline';
import { AUDIT_STORYBOARDS, PII_AUDIT_LOGS } from '../data/qualityData';
import { REACT_STEPS } from '../data/reactSteps';
import { formatGateDecimal, formatGatePercent, GATES } from '../domain/constants';
import { memUsagePct, OPS_STATUS_LABEL, OPS_STATUS_TONE, REACT_STEP_STATUS_LABEL, REACT_STEP_STATUS_TONE } from '../domain/opsView';
import { AgentId } from '../types';

interface MobileFallbackProps {
  onSelectAgent: (id: AgentId) => void;
}

type MobileTab = 'family' | 'pipeline' | 'react' | 'ops' | 'security';

const TABS: Array<{ id: MobileTab; label: string; icon: React.FC<{ size?: number; className?: string }> }> = [
  { id: 'family', label: '家族', icon: Sparkles },
  { id: 'pipeline', label: '流水线', icon: Workflow },
  { id: 'react', label: 'ReAct', icon: GitBranch },
  { id: 'ops', label: '算力', icon: Cpu },
  { id: 'security', label: '质安', icon: ShieldAlert },
];

/**
 * 移动端降级视图（< 768px 自动切换）
 * 保留指挥舱核心信息密度：家族 / 流水线 / ReAct / 算力 / 质安 五卡精简呈现，
 * 点击成员仍可唤起 W1 全局浮窗，保证跨端交互闭环不中断。
 */
export const MobileFallback: React.FC<MobileFallbackProps> = ({ onSelectAgent }) => {
  const [tab, setTab] = useState<MobileTab>('family');

  // 顶栏实时走时（1s ticking，与 P1/Header 同源真实时钟）
  const [timeStr, setTimeStr] = useState<string>('');
  useEffect(() => {
    const tick = () => setTimeStr(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const consistencyKpi = KPI_METRICS.find((k) => k.id === 'consistency_score');
  const syncnetKpi = KPI_METRICS.find((k) => k.id === 'syncnet_score');

  return (
    <div
      className="w-full h-[100dvh] overflow-y-auto bg-[#0A0A0A] command-bg relative"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="noise-overlay" />

      {/* Brand Header（安全区适配 + 真实品牌 logo + 实时时钟 + PWA 安装） */}
      <header className="sticky top-0 z-20 px-4 py-3 glass-panel border-b border-[#00F0FF]/20 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00F0FF] via-[#BF00FF] to-[#FF006E] p-[1.5px] shadow-[0_0_10px_rgba(0,240,255,0.4)] shrink-0">
              <div className="w-full h-full bg-[#0A0A0A] rounded-[6.5px] flex items-center justify-center p-[3px]">
                <BrandMark size={26} quiet />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white leading-none truncate">AI FAMILY 指挥中心</h1>
              <p className="text-[10px] text-[#9BA3B4] mt-0.5">YanYuCloudCube · 言启象限</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden min-[420px]:inline px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40">
              PWA 移动版
            </span>
            <PwaInstallButton variant="mobile" />
            {timeStr && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold text-[#00F0FF] bg-[#0A0A0A]/80 border border-[#00F0FF]/30">
                {timeStr}
              </span>
            )}
          </div>
        </div>

        {/* Tab Bar */}
        <nav className="flex items-center space-x-1 mt-2.5 overflow-x-auto" aria-label="移动版五大视图切换">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${tab === id
                ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
                : 'text-[#9BA3B4] border border-transparent hover:text-white'
                }`}
            >
              <Icon size={12} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main
        className="px-3 pt-3 pb-28 space-y-2.5 relative z-10"
        style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
      >
        {/* 家族：成员列表 */}
        {tab === 'family' && (
          <div className="space-y-2">
            {AGENT_LIST.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                className="w-full flex items-center space-x-3 p-2.5 rounded-lg glass-panel border border-white/10 text-left active:border-[#00F0FF]/50"
              >
                <AgentAvatar agentId={agent.id} size={40} showLed />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {agent.name} · {agent.nick}
                  </p>
                  <p className="text-[10px] text-[#9BA3B4] truncate">{agent.title}</p>
                </div>
                <span className="text-[9px] font-mono-num text-[#5A6478]">{agent.clockPosition}</span>
              </button>
            ))}
            <p className="text-center text-[10px] text-[#5A6478] pt-1">点击成员即可唤醒 W1 全局浮窗对话</p>
          </div>
        )}

        {/* 流水线：六阶段精简卡 */}
        {tab === 'pipeline' && (
          <div className="space-y-2">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.id} className="p-2.5 rounded-lg glass-panel border border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white">
                    <span className="text-[#00F0FF] font-mono-num mr-1.5">S{stage.stepNum}</span>
                    {stage.name}
                  </p>
                  <span className="text-[10px] font-mono-num text-[#9BA3B4]">
                    {stage.activeTasks} 任务 · 队列 {stage.queueLength}
                  </span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00F0FF] to-[#BF00FF]"
                    style={{ width: `${stage.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-[#5A6478] truncate">{stage.keySchemaOrGate}</p>
                  <span className="text-[10px] font-mono-num text-[#00F0FF]">
                    {stage.progress}% · 通过率 {stage.passRate}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ReAct：九步闭环列表 */}
        {tab === 'react' && (
          <div className="space-y-2">
            {REACT_STEPS.map((step) => (
              <div
                key={step.step}
                className="flex items-center space-x-2.5 p-2.5 rounded-lg glass-panel border border-white/10"
              >
                <span
                  className={`w-8 h-8 shrink-0 rounded-md flex items-center justify-center text-[10px] font-black font-mono-num border ${step.status === 'running'
                    ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/50'
                    : step.status === 'completed' || step.status === 'loopback'
                      ? 'bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/40'
                      : 'bg-white/5 text-[#5A6478] border-white/10'
                    }`}
                >
                  {step.step}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{step.name}</p>
                  <p className="text-[10px] text-[#9BA3B4] truncate">
                    {step.agentName} · {step.model}
                  </p>
                </div>
                <StatusPill label={REACT_STEP_STATUS_LABEL[step.status]} tone={REACT_STEP_STATUS_TONE[step.status]} />
              </div>
            ))}
          </div>
        )}

        {/* 算力：节点遥测精简卡 */}
        {tab === 'ops' && (
          <div className="space-y-2">
            {OPS_NODES.map((node) => (
              <div key={node.id} className="p-2.5 rounded-lg glass-panel border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{node.name}</p>
                    <p className="text-[10px] text-[#5A6478] truncate">{node.hardware}</p>
                  </div>
                  <StatusPill label={OPS_STATUS_LABEL[node.status]} tone={OPS_STATUS_TONE[node.status]} />
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] text-[#5A6478] w-8">GPU</span>
                    <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#00F0FF]" style={{ width: `${node.gpuUtil}%` }} />
                    </div>
                    <span className="text-[9px] font-mono-num text-[#9BA3B4] w-16 text-right">{node.gpuUtil}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] text-[#5A6478] w-8">{node.memKind === 'storage' ? 'DISK' : 'VRAM'}</span>
                    <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#BF00FF]" style={{ width: `${memUsagePct(node.memUsed, node.memTotal)}%` }} />
                    </div>
                    <span className="text-[9px] font-mono-num text-[#9BA3B4] w-16 text-right">
                      {node.memUsed}/{node.memTotal}{node.memUnit}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 质安：双门禁 + 分镜质检 */}
        {tab === 'security' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg glass-panel border border-[#00FF88]/30">
                <p className="text-[10px] text-[#9BA3B4]">人物一致性</p>
                <p className="text-lg font-black font-mono-num text-[#00FF88]">{consistencyKpi?.value ?? '--'}</p>
                <p className="text-[9px] text-[#5A6478]">门禁阈值 {formatGatePercent(GATES.CONSISTENCY)}</p>
              </div>
              <div className="p-2.5 rounded-lg glass-panel border border-[#00F0FF]/30">
                <p className="text-[10px] text-[#9BA3B4]">SyncNet 唇形</p>
                <p className="text-lg font-black font-mono-num text-[#00F0FF]">{syncnetKpi?.value ?? '--'}</p>
                <p className="text-[9px] text-[#5A6478]">门禁阈值 {formatGateDecimal(GATES.SYNCNET)}</p>
              </div>
            </div>
            <div className="p-2.5 rounded-lg glass-panel border border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-white flex items-center">
                  <Radio size={11} className="text-[#00F0FF] mr-1" />
                  分镜质检队列
                </p>
                <span className="text-[10px] font-mono-num text-[#00FF88]">
                  {AUDIT_STORYBOARDS.filter((s) => s.status === 'passed').length}/{AUDIT_STORYBOARDS.length} 通过
                </span>
              </div>
              <div className="space-y-1">
                {AUDIT_STORYBOARDS.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-[10px]">
                    <span className="font-mono-num text-[#9BA3B4]">{s.shotCode}</span>
                    <span className={s.status === 'rejected' ? 'text-[#FF006E] font-mono-num' : 'text-[#00FF88] font-mono-num'}>
                      {s.consistencyScore} 分
                      {s.status === 'rejected' ? ' · 打回' : s.status === 'pending' ? ' · 质检中' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-2.5 rounded-lg glass-panel border border-white/10 flex items-center justify-between">
              <p className="text-xs font-bold text-white">PII 三级脱敏审计</p>
              <span className="text-[10px] font-mono-num text-[#00FF88]">
                {PII_AUDIT_LOGS.length} 条记录 · 0 泄漏
              </span>
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-[#5A6478] pt-2">
          桌面端（≥ 768px）可获得完整指挥舱 · 1980×1020 体验
        </p>
      </main>
    </div>
  );
};
