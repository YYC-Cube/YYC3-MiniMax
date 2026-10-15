/**
 * file: P3ReActWorkflow.tsx
 * description: P3 ReAct-C 编排 · 九步闭环环/Step7 回环/遥测自动轮播
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[view],[p3],[react-loop]
 *
 * brief: ReAct-C 九步闭环可视化与回环演示视图
 *
 * dependencies: react, lucide-react, types, data/reactSteps, components/AgentAvatar
 * exports: P3ReActWorkflow
 */

import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Cpu,
  Pause,
  Play,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { AgentAvatar } from '../components/AgentAvatar';
import { REACT_STEPS } from '../data/reactSteps';
import { AgentId, ReActStep } from '../types';

interface P3ReActWorkflowProps {
  onSelectAgent: (id: AgentId) => void;
  onNavigate: (view: 'P1' | 'P2' | 'P3' | 'P4' | 'P5') => void;
}

export const P3ReActWorkflow: React.FC<P3ReActWorkflowProps> = ({
  onSelectAgent,
  onNavigate,
}) => {
  const [steps] = useState<ReActStep[]>(REACT_STEPS);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(3); // Step 4 running by default
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [isLoopingBack, setIsLoopingBack] = useState<boolean>(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(3);

  // Auto progression timer（updater 纯函数化：副作用移出 setState，规避 StrictMode 双触发）
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % 9);
    }, 1800);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  // 选中态跟随活跃步：render 期派生（React 官方 prop→state 同步模式，取代 effect 内同步
  // setState）；手动点选/下一步后，下一次活跃步推进仍会覆盖选中——与原 effect 行为一致
  const [prevActiveIndex, setPrevActiveIndex] = useState<number | null>(null);
  if (activeStepIndex !== prevActiveIndex) {
    setPrevActiveIndex(activeStepIndex);
    setSelectedStepIndex(activeStepIndex);
  }

  // 回环演示定时器：卸载清理 + 重复触发防叠（诊断 #7）
  const loopbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const timers = loopbackTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  // 自适应舞台：实测容器短边，九步环 760 viewBox 整体等比缩放（矮屏/窄屏均完整可见）
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState<number>(720);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      setStageSize(Math.max(260, Math.floor(Math.min(el.clientWidth, el.clientHeight))));
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  // HTML 节点层相对 760 设计稿的缩放因子
  const stageScale = stageSize / 760;

  // Center coordinates for 9-step circle（760 viewBox 设计坐标）
  const cx = 380;
  const cy = 380;
  const radius = 260;

  // Calculate coordinates for the 9 nodes
  const nodePositions = steps.map((_, i) => {
    const angleDeg = -90 + i * 40; // 360 / 9 = 40 deg
    const rad = angleDeg * (Math.PI / 180);
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
      angleDeg,
    };
  });

  // Calculate Step 7 to Step 5 loopback curved path
  const step7Pos = nodePositions[6]; // index 6 is Step 7
  const step5Pos = nodePositions[4]; // index 4 is Step 5
  // Control point curving toward center
  const loopbackControlX = cx - 40;
  const loopbackControlY = cy + 130;
  const loopbackPath = `M ${step7Pos.x} ${step7Pos.y} Q ${loopbackControlX} ${loopbackControlY} ${step5Pos.x} ${step5Pos.y}`;

  const currentStep = steps[selectedStepIndex];

  // Trigger manual loopback demo（定时器入 ref：可清理、可防叠）
  const triggerLoopbackDemo = () => {
    loopbackTimersRef.current.forEach(clearTimeout);
    loopbackTimersRef.current = [];
    setActiveStepIndex(6); // Go to Step 7
    setIsLoopingBack(true);
    const t1: ReturnType<typeof setTimeout> = setTimeout(() => {
      setActiveStepIndex(4); // Jump back to Step 5
      const t2: ReturnType<typeof setTimeout> = setTimeout(() => {
        setIsLoopingBack(false);
      }, 1500);
      loopbackTimersRef.current.push(t2);
    }, 1200);
    loopbackTimersRef.current.push(t1);
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row p-3 lg:p-5 gap-3 lg:gap-5 overflow-y-auto lg:overflow-hidden select-none">
      {/* Left 8.5 Cols: 9-Step Circular Workflow Diagram + Controls */}
      <div className="flex-1 min-h-0 flex flex-col justify-between rounded-2xl glass-panel border border-[#00F0FF]/30 p-4 lg:p-5 relative overflow-hidden">
        {/* Top Header of Diagram */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10 z-20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#BF00FF]/20 border border-[#BF00FF]/50 flex items-center justify-center text-[#BF00FF]">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>ReAct-C 九步闭环编排流程视图</span>
                <span className="text-[10px] text-[#00F0FF] font-mono-num px-2 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/30">
                  REASONING + ACTING + CALIBRATION
                </span>
              </h2>
              <span className="text-[11px] text-[#9BA3B4]">
                顺时针九步闭环执行 · Step 7 质量校验不达标则触发红色回环（≤2轮）
              </span>
            </div>
          </div>

          {/* Player controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${isAutoPlaying
                ? 'bg-[#FF006E]/20 text-[#FF006E] border border-[#FF006E]/50 shadow-[0_0_10px_rgba(255,0,110,0.4)]'
                : 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/50 hover:bg-[#00FF88]/30'
                }`}
            >
              {isAutoPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isAutoPlaying ? '暂停轮转' : '自动轮播'}</span>
            </button>

            <button
              onClick={() => {
                setActiveStepIndex((prev) => (prev + 1) % 9);
                setSelectedStepIndex((prev) => (prev + 1) % 9);
              }}
              className="px-3 py-1.5 rounded-lg text-xs text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center space-x-1 cursor-pointer"
            >
              <span>单步推进</span>
              <ChevronRight size={13} />
            </button>

            <button
              onClick={triggerLoopbackDemo}
              className="px-3 py-1.5 rounded-lg text-xs text-[#FF006E] bg-[#FF006E]/15 hover:bg-[#FF006E]/30 border border-[#FF006E]/50 transition-all flex items-center space-x-1 cursor-pointer"
              title="模拟 Step 7 质检未过触发红色虚线回环"
            >
              <RotateCcw size={13} />
              <span>模拟 Step7 回环</span>
            </button>
          </div>
        </div>

        {/* Center SVG Circle Stage（实测短边正方形，760 viewBox 等比缩放） */}
        <div ref={stageRef} className="relative flex-1 min-h-[260px] flex items-center justify-center my-2">
          <div
            className="relative"
            style={{ width: stageSize, height: stageSize }}
          >
            {/* SVG Canvas for Connectors, Arrows, Particles & Loopback */}
            <svg
              viewBox="0 0 760 760"
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            >
              <defs>
                <filter id="p3Glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background circular guide ring */}
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />

              {/* Connecting lines between sequential steps (0->1->...->8->0) */}
              {nodePositions.map((pos, i) => {
                const nextPos = nodePositions[(i + 1) % 9];
                const isPassing = i === activeStepIndex;

                return (
                  <g key={`seq-line-${i}`}>
                    <line
                      x1={pos.x}
                      y1={pos.y}
                      x2={nextPos.x}
                      y2={nextPos.y}
                      stroke={isPassing ? '#00F0FF' : '#BF00FF'}
                      strokeWidth={isPassing ? '2.5' : '1.5'}
                      strokeOpacity={isPassing ? '0.9' : '0.45'}
                      strokeDasharray={isPassing ? '6 4' : undefined}
                    />

                    {/* Flowing particle along line */}
                    <circle
                      r="3"
                      fill={isPassing ? '#00F0FF' : '#BF00FF'}
                      filter="url(#p3Glow)"
                    >
                      <animate
                        attributeName="cx"
                        from={pos.x}
                        to={nextPos.x}
                        dur="1.2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="cy"
                        from={pos.y}
                        to={nextPos.y}
                        dur="1.2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                );
              })}

              {/* Step 7 不达标 → 虚线红色回环到 Step 5 (标注"复检≤2轮") */}
              <g className={isLoopingBack ? 'animate-pulse' : ''}>
                <path
                  d={loopbackPath}
                  fill="none"
                  stroke="#FF006E"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  filter="url(#p3Glow)"
                  opacity={isLoopingBack ? '1' : '0.7'}
                />

                {/* Loopback Arrowhead Marker */}
                <polygon
                  points={`${step5Pos.x},${step5Pos.y} ${step5Pos.x - 8},${step5Pos.y + 10} ${step5Pos.x + 8},${step5Pos.y + 10}`}
                  fill="#FF006E"
                />

                {/* Loopback text annotation */}
                <text
                  x={loopbackControlX}
                  y={loopbackControlY + 10}
                  fill="#FF006E"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-mono-num"
                  filter="drop-shadow(0 0 4px #FF006E)"
                >
                  ◀ 质检未通过：红色回环 (复检≤2轮)
                </text>
              </g>
            </svg>

            {/* Central Request Summary Card:
              用户 query + 置信度 % + 风险标签（随舞台等比缩放）
          */}
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

            {/* 9 Circular Nodes (64px) */}
            {nodePositions.map((pos, idx) => {
              const step = steps[idx];
              const isActive = idx === activeStepIndex;
              const isSelected = idx === selectedStepIndex;

              return (
                <div
                  key={step.step}
                  onClick={() => setSelectedStepIndex(idx)}
                  className={`absolute z-30 flex flex-col items-center cursor-pointer transition-transform duration-300 ${isActive ? 'z-40' : ''
                    }`}
                  style={{
                    left: `${(pos.x / 760) * 100}%`,
                    top: `${(pos.y / 760) * 100}%`,
                    transform: `translate(-50%, -50%) scale(${stageScale})`,
                  }}
                >
                  {/* 64x64 Circle Node */}
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center relative p-[2px] transition-all duration-300 ${isActive
                      ? 'shadow-[0_0_20px_#00F0FF,0_0_30px_#BF00FF] animate-pulse-breath scale-115'
                      : isSelected
                        ? 'shadow-[0_0_14px_rgba(255,255,255,0.4)] hover:scale-105'
                        : 'shadow-md hover:scale-105'
                      }`}
                    style={{
                      backgroundColor: isActive ? '#00F0FF' : step.color,
                    }}
                  >
                    <div className="w-full h-full rounded-full bg-[#0A0C16] flex flex-col items-center justify-center p-1 relative overflow-hidden">
                      {/* Step number badge */}
                      <span
                        className="font-mono-num text-[10px] font-extrabold"
                        style={{ color: isActive ? '#00F0FF' : step.color }}
                      >
                        S{step.step}
                      </span>

                      {/* Miniature Avatar or Icon */}
                      <div className="scale-75">
                        <AgentAvatar
                          agentId={step.agentId}
                          size={28}
                          showLed={isActive}
                          overrideStatus={isActive ? 'speaking' : 'online'}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step Title Label */}
                  <div className="mt-1.5 text-center whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold block transition-colors ${isActive ? 'text-[#00F0FF] text-glow-cyan' : isSelected ? 'text-white' : 'text-[#9BA3B4]'
                        }`}
                    >
                      {step.name}
                    </span>
                    <span className="text-[9px] text-[#9BA3B4]/70 font-mono-num block">
                      {step.agentName.split('·')[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Flow Meta */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 z-20 text-xs text-[#9BA3B4]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="w-2 h-2 rounded-full bg-[#00FF88]" />
            <span>Milvus 知识库连接正常</span>
            <span className="text-white/20">|</span>
            <span className="hidden md:inline">深度推理引擎: deepseek-v4 + nemotron</span>
          </div>

          <button
            onClick={() => onNavigate('P2')}
            className="flex items-center space-x-1 text-[#00F0FF] hover:underline cursor-pointer"
          >
            <span>返回生产台实时流水线</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Right Drawer/Panel: Selected Step Details (Tokens, Duration, Model, Payload) */}
      <div className="w-full lg:w-[340px] xl:w-[380px] lg:shrink-0 rounded-2xl glass-panel border border-[#00F0FF]/30 p-4 lg:p-5 flex flex-col gap-4 overflow-hidden">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center space-x-2.5">
              <span
                className="w-7 h-7 rounded-lg font-mono-num font-bold text-xs flex items-center justify-center text-white"
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
              {selectedStepIndex === activeStepIndex ? '● RUNNING' : 'COMPLETED'}
            </span>
          </div>

          {/* Bound Agent & Model */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 mb-4">
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
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
              <span className="text-[10px] text-[#9BA3B4] block">Input Tokens</span>
              <span className="font-mono-num font-bold text-sm text-[#00F0FF] mt-0.5 block">
                {currentStep.tokensIn}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
              <span className="text-[10px] text-[#9BA3B4] block">Output Tokens</span>
              <span className="font-mono-num font-bold text-sm text-[#BF00FF] mt-0.5 block">
                {currentStep.tokensOut}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
              <span className="text-[10px] text-[#9BA3B4] block">执行耗时</span>
              <span className="font-mono-num font-bold text-sm text-[#00FF88] mt-0.5 block">
                {currentStep.durationMs}ms
              </span>
            </div>
          </div>

          {/* Step Narrative Description */}
          <div className="mb-4">
            <span className="text-[11px] text-[#9BA3B4] block mb-1">步骤动作规约:</span>
            <p className="text-xs text-[#E0E4EC] leading-relaxed bg-[#0A0D17] p-3 rounded-lg border border-white/10">
              {currentStep.description}
            </p>
          </div>

          {/* Step 7 Special Fallback Rule */}
          {currentStep.step === 7 && (
            <div className="p-3 rounded-lg bg-[#FF006E]/10 border border-[#FF006E]/40 mb-3 text-xs text-[#FF006E]">
              <div className="flex items-center space-x-1.5 font-bold mb-1">
                <AlertTriangle size={14} />
                <span>质量门禁复检机制 (≤2 轮)</span>
              </div>
              <p className="text-[11px] text-[#E0E4EC]">
                若余弦相似度 &lt; 80%，格物·宗师将生成修复提示词差异增量包，强制回环至 Step 5（创想·灵韵报告润色）重构光影，最多触发 2 次复检。
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
            <span>唤起 {currentStep.agentName.split('·')[0]} 交互会话</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
