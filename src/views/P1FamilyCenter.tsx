/**
 * file: P1FamilyCenter.tsx
 * description: P1 时钟环中心 · 8 Agent 时钟位/全息连线/悬浮档案卡
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[view],[p1]
 *
 * brief: 家族中枢视图：真实走时时钟环（时分秒三针）+ 中心数字时间/日期 + 8 Agent 时钟位交互
 *
 * dependencies: react, lucide-react, types, data/agents, components/AgentAvatar
 * exports: P1FamilyCenter
 */

import { ArrowRight, Cpu, Sparkles } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { AgentAvatar } from '../components/AgentAvatar';
import { AGENTS } from '../data/agents';
import { AgentId } from '../types';

// ======== 真实时钟逻辑（复用自 docs/AIFamilyPage.tsx 设计基准） ========

/** 1 秒 setInterval 走时，卸载清理 */
function useRealTimeClock(): Date {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return time;
}

/** 舞台缩放因子：900 viewBox 设计稿 → 实际渲染尺寸，用于中心字号自适应 */
function useStageScale(ref: React.RefObject<HTMLDivElement | null>): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(el.clientWidth, el.clientHeight) / 900);
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [ref]);
  return scale;
}

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const;

/** yy/mm/dd + 星期（周末粉色） */
function formatDateInfo(date: Date): { dateStr: string; dayLabel: string; isWeekend: boolean } {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dayIdx = date.getDay(); // 0=日, 6=六
  return {
    dateStr: `${yy}/${mm}/${dd}`,
    dayLabel: DAY_LABELS[dayIdx],
    isWeekend: dayIdx === 0 || dayIdx === 6,
  };
}

interface P1FamilyCenterProps {
  onSelectAgent: (id: AgentId) => void;
  onNavigate: (view: 'P1' | 'P2' | 'P3' | 'P4' | 'P5') => void;
}

interface ClockMemberConfig {
  id: AgentId;
  angleDeg: number; // Angle relative to top 12:00
  clockLabel: string;
}

const CLOCK_MEMBERS: ClockMemberConfig[] = [
  { id: 'tianshu', angleDeg: -90, clockLabel: '12:00' },
  { id: 'shouhu', angleDeg: -45, clockLabel: '01:30' },
  { id: 'zongshi', angleDeg: 0, clockLabel: '03:00' },
  { id: 'lingyun', angleDeg: 45, clockLabel: '04:30' },
  { id: 'qianxing', angleDeg: 90, clockLabel: '06:00' },
  { id: 'wanwu', angleDeg: 135, clockLabel: '07:30' },
  { id: 'xianzhi', angleDeg: 180, clockLabel: '09:00' },
  { id: 'bole', angleDeg: 225, clockLabel: '10:30' },
];

export const P1FamilyCenter: React.FC<P1FamilyCenterProps> = ({
  onSelectAgent,
  onNavigate,
}) => {
  const [hoveredAgentId, setHoveredAgentId] = useState<AgentId | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const scale = useStageScale(stageRef);

  // 真实时钟：1 秒走时
  const time = useRealTimeClock();
  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  // 三针角度公式（-90 使 0° 指向 12:00，与 CLOCK_MEMBERS 角度约定一致）
  const hourAngle = ((hours * 30 + minutes * 0.5 - 90) * Math.PI) / 180;
  const minuteAngle = ((minutes * 6 + seconds * 0.1 - 90) * Math.PI) / 180;
  const secondAngle = ((seconds * 6 - 90) * Math.PI) / 180;
  const timeStr = time.toLocaleTimeString('zh-CN', { hour12: false });
  const { dateStr, dayLabel, isWeekend } = formatDateInfo(time);

  const cx = 450;
  const cy = 450;
  const radius = 295; // Radius to avatar centers

  // 三针真实钟表比例（以表盘半径 R=295 为基准，长度/尾锤各不相同）
  // 时针：最短最粗（0.42R，尾锤 0.06R）
  const hourLen = radius * 0.42;
  const hourTail = radius * 0.06;
  // 分针：中等（0.58R，尾锤 0.08R）
  const minuteLen = radius * 0.58;
  const minuteTail = radius * 0.08;
  // 秒针：最细最长（0.7R，长尾锤 0.16R + 轴后配重圆点）
  const secondLen = radius * 0.7;
  const secondTail = radius * 0.16;

  /** 单根指针的路径点（含尾锤），角度已含 -90 的 12:00 偏移 */
  const handLine = (angle: number, len: number, tail: number) => ({
    x1: cx - tail * Math.cos(angle),
    y1: cy - tail * Math.sin(angle),
    x2: cx + len * Math.cos(angle),
    y2: cy + len * Math.sin(angle),
  });

  // Generate 60 ticks for the clock dial
  const ticks = Array.from({ length: 60 }).map((_, i) => {
    const angle = (i * 6 - 90) * (Math.PI / 180);
    const isMajor = i % 5 === 0;
    const rOuter = 385;
    const rInner = isMajor ? 368 : 376;
    const x1 = cx + rOuter * Math.cos(angle);
    const y1 = cy + rOuter * Math.sin(angle);
    const x2 = cx + rInner * Math.cos(angle);
    const y2 = cy + rInner * Math.sin(angle);
    return { id: i, isMajor, x1, y1, x2, y2 };
  });

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      {/* Background Decorative Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[840px] h-[840px] rounded-full border border-white/5" />
        <div className="absolute w-[680px] h-[680px] rounded-full border border-[#00F0FF]/10 animate-slow-rotate" />
        <div className="absolute w-[590px] h-[590px] rounded-full border border-[#BF00FF]/15 border-dashed" />
        <div className="absolute w-[360px] h-[360px] rounded-full border border-[#00F0FF]/20" />
      </div>

      {/* Main Clock Stage Canvas */}
      <div
        ref={stageRef}
        className="relative w-[900px] h-[900px] flex items-center justify-center max-w-full max-h-[85vh] aspect-square"
      >
        {/* SVG Dial Elements: Dial Ticks, Holographic Lines, Particles */}
        <svg
          viewBox="0 0 900 900"
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        >
          <defs>
            {/* Holographic Purple Gradient for Connection Lines */}
            <linearGradient id="holoLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BF00FF" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#00F0FF" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#BF00FF" stopOpacity="0.85" />
            </linearGradient>

            {/* Particle Glow Filter */}
            <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 12 Major + 60 Minor Clock Dial Ticks */}
          {ticks.map((tick) => (
            <line
              key={tick.id}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={tick.isMajor ? '#00F0FF' : 'rgba(255,255,255,0.2)'}
              strokeWidth={tick.isMajor ? 2.5 : 1}
              filter={tick.isMajor ? 'drop-shadow(0 0 6px #00F0FF)' : undefined}
            />
          ))}

          {/* 8 Holographic Connection Lines from Center (cx, cy) to 8 Member Nodes */}
          {CLOCK_MEMBERS.map((member) => {
            const rad = member.angleDeg * (Math.PI / 180);
            const targetX = cx + radius * Math.cos(rad);
            const targetY = cy + radius * Math.sin(rad);

            return (
              <g key={`line-group-${member.id}`}>
                {/* Base Holographic Line: 1px, #BF00FF, 60% opacity */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={targetX}
                  y2={targetY}
                  stroke="#BF00FF"
                  strokeWidth="1.2"
                  strokeOpacity="0.6"
                  strokeDasharray="4 3"
                />

                {/* 10 Animated Particles (3px) moving outward along the line in 2s loop */}
                {Array.from({ length: 8 }).map((_, pIdx) => {
                  const delay = (pIdx * 0.25).toFixed(2);
                  return (
                    <circle
                      key={`part-${member.id}-${pIdx}`}
                      r="2.5"
                      fill="#00F0FF"
                      filter="url(#particleGlow)"
                      opacity="0.9"
                    >
                      <animate
                        attributeName="cx"
                        from={cx}
                        to={targetX}
                        dur="2s"
                        begin={`${delay}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="cy"
                        from={cy}
                        to={targetY}
                        dur="2s"
                        begin={`${delay}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0; 0.9; 1; 0.2; 0"
                        dur="2s"
                        begin={`${delay}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  );
                })}
              </g>
            );
          })}

          {/* 真实走时三针：时针最短最粗(青) / 分针中等(冰白) / 秒针最细最长(品红+尾锤)，1s ticking */}
          <g>
            {/* 时针 */}
            <line
              {...handLine(hourAngle, hourLen, hourTail)}
              stroke="#00F0FF"
              strokeOpacity={0.75}
              strokeWidth={5}
              strokeLinecap="round"
            />
            {/* 分针 */}
            <line
              {...handLine(minuteAngle, minuteLen, minuteTail)}
              stroke="#D6FBFF"
              strokeOpacity={0.7}
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* 秒针：带长尾锤与轴后配重圆点 */}
            <line
              {...handLine(secondAngle, secondLen, secondTail)}
              stroke="#FF006E"
              strokeOpacity={0.9}
              strokeWidth={1.6}
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 4px rgba(255,0,110,0.55))' }}
            />
            <circle
              cx={cx - (secondTail - 12) * Math.cos(secondAngle)}
              cy={cy - (secondTail - 12) * Math.sin(secondAngle)}
              r={5}
              fill="none"
              stroke="#FF006E"
              strokeWidth={1.6}
              strokeOpacity={0.9}
            />
            {/* 中心轴帽（同比缩小：外环品红 + 内芯青） */}
            <circle cx={cx} cy={cy} r={4.2} fill="#0A0A0A" stroke="#00F0FF" strokeWidth={1.4} />
            <circle cx={cx} cy={cy} r={1.8} fill="#FF006E" />
          </g>
        </svg>

        {/* Center YYC³ Logo + 真实走时数字时间：
            150px 慢旋指示环 + 102px 品牌核心（点击进入 P2），下方 HH:MM:SS + yy/mm/dd 星期。
            中心圆随三针真实比例同比缩小（0.82），避免遮挡指针尾锤 */}
        <div className="absolute z-20 flex flex-col items-center pointer-events-none">
          <div className="relative" style={{ width: 150, height: 150 }}>
            {/* 60s Slow Rotating Outer Indicator Ring */}
            <div className="absolute inset-0 rounded-full border border-[#00F0FF]/30 border-t-[#BF00FF] border-r-transparent animate-slow-rotate flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] absolute -top-1.5 shadow-[0_0_10px_#00F0FF]" />
              <div className="w-2 h-2 rounded-full bg-[#BF00FF] absolute -bottom-1 shadow-[0_0_10px_#BF00FF]" />
            </div>

            {/* 124x124 Core Logo */}
            <div
              onClick={() => onNavigate('P2')}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[102px] h-[102px] rounded-xl p-[2px] bg-gradient-to-br from-[#00F0FF] via-[#BF00FF] to-[#FF006E] shadow-[0_0_20px_rgba(0,240,255,0.5),0_0_32px_rgba(191,0,255,0.3)] animate-pulse-breath cursor-pointer pointer-events-auto group hover:scale-105 transition-all"
              title="点击快速进入漫剧生产指挥台"
            >
              <div className="w-full h-full bg-[#0A0A0A] rounded-[10px] flex flex-col items-center justify-center relative overflow-hidden border border-white/10">
                <span className="font-mono-num font-black text-xl tracking-tighter bg-gradient-to-r from-[#00F0FF] via-[#BF00FF] to-white bg-clip-text text-transparent">
                  YYC³
                </span>
                <span className="text-[8px] text-[#9BA3B4] font-medium tracking-widest mt-0.5">
                  AI FAMILY
                </span>
                <div className="flex items-center space-x-1 mt-0.5 text-[7px] text-[#00FF88] font-mono-num">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-ping" />
                  <span>ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

          {/* 数字时间 HH:MM:SS（1s ticking，字号随舞台缩放自适应） */}
          <span
            className="font-mono-num font-bold text-center whitespace-nowrap"
            style={{
              fontSize: Math.max(11, Math.round(18 * scale)),
              color: '#00F0FF',
              textShadow: '0 0 10px rgba(0,240,255,0.4)',
              letterSpacing: '2px',
            }}
          >
            {timeStr}
          </span>

          {/* yy/mm/dd + 星期（周末粉色霓虹） */}
          <div
            className="font-mono-num flex items-center justify-center gap-1 whitespace-nowrap"
            style={{ marginTop: '3px' }}
          >
            <span
              style={{
                fontSize: Math.max(9, Math.round(12 * scale)),
                color: 'rgba(0,240,255,0.4)',
                letterSpacing: '1px',
              }}
            >
              {dateStr}
            </span>
            <span
              style={{
                fontSize: Math.max(9, Math.round(12 * scale)),
                color: isWeekend ? '#FF006E' : 'rgba(0,240,255,0.4)',
                textShadow: isWeekend ? '0 0 6px rgba(255,0,110,0.4)' : 'none',
                letterSpacing: '1px',
              }}
            >
              {dayLabel}
            </span>
          </div>
        </div>

        {/* 8 Agent Members Distributed Clockwise */}
        {CLOCK_MEMBERS.map((member) => {
          const agent = AGENTS[member.id];
          const rad = member.angleDeg * (Math.PI / 180);
          const x = cx + radius * Math.cos(rad);
          const y = cy + radius * Math.sin(rad);

          // Calculate offset relative to 900x900 container
          const leftPct = (x / 900) * 100;
          const topPct = (y / 900) * 100;

          const isHovered = hoveredAgentId === member.id;

          return (
            <div
              key={member.id}
              className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              onMouseEnter={() => setHoveredAgentId(member.id)}
              onMouseLeave={() => setHoveredAgentId(null)}
              onClick={() => onSelectAgent(member.id)}
            >
              {/* Clock Position Label Badge */}
              <div className="mb-1 text-[10px] font-mono-num text-[#9BA3B4] bg-[#0A0A0A]/80 px-1.5 py-0.2 rounded border border-white/10 group-hover:text-[#00F0FF] group-hover:border-[#00F0FF]/40 transition-colors">
                {member.clockLabel}
              </div>

              {/* 80x80 Agent Avatar with Unique Halo, 20px Pulse Ring, 8x8 LED */}
              <div className="transform transition-transform duration-200 group-hover:scale-110">
                <AgentAvatar
                  agentId={member.id}
                  size={80}
                  showPulseRing={true}
                  showLed={true}
                />
              </div>

              {/* Agent Name Tag */}
              <div className="mt-2 text-center">
                <span
                  className="font-bold text-xs tracking-wider transition-colors drop-shadow"
                  style={{ color: isHovered ? '#FFFFFF' : agent.color }}
                >
                  {agent.name}
                </span>
                <div className="text-[10px] text-[#9BA3B4] font-medium tracking-tight">
                  {agent.nick} · {agent.primaryStage.split('&')[0]}
                </div>
              </div>

              {/* 180x120 Hover Floating Card:
                  Deep dark 80% + Blue border 1px + Purple shadow 10px,
                  Avatar, Nick, Status (online/offline/speaking), Last active time
              */}
              {isHovered && (
                <div
                  className="absolute bottom-full mb-3 w-[220px] rounded-xl p-3 z-50 pointer-events-none transition-all duration-200"
                  style={{
                    backgroundColor: 'rgba(10, 12, 20, 0.92)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid #00F0FF',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.8), 0 0 16px rgba(191,0,255,0.45)',
                    animation: 'fade-in-up 0.18s ease-out',
                  }}
                >
                  <div className="flex items-center space-x-2.5 pb-2 border-b border-white/10">
                    <AgentAvatar agentId={member.id} size={36} />
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-white">
                        {agent.name}
                      </span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: agent.status === 'speaking' ? '#FF006E' : '#00FF88',
                            boxShadow: `0 0 6px ${agent.status === 'speaking' ? '#FF006E' : '#00FF88'}`,
                          }}
                        />
                        <span className="text-[10px] text-[#9BA3B4]">
                          {agent.status === 'speaking' ? '发言中' : '在线就绪'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-[10px] text-[#9BA3B4] space-y-1">
                    <div className="flex justify-between">
                      <span>时钟位点:</span>
                      <span className="font-mono-num text-[#00F0FF]">{agent.clockPosition}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>最后发言:</span>
                      <span className="font-mono-num text-white">{agent.lastActive}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>驱动模型:</span>
                      <span className="font-mono-num text-[#BF00FF]">{agent.model.split('/')[0]}</span>
                    </div>
                    <div className="pt-1 text-[#E0E4EC] text-[10px] leading-tight border-t border-white/10">
                      {agent.role}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Quick Link to P2 */}
      <div className="absolute bottom-4 left-6 z-30">
        <div
          onClick={() => onNavigate('P2')}
          className="flex items-center space-x-3 px-4 py-2.5 rounded-xl glass-panel-hover glass-panel cursor-pointer group border border-[#00F0FF]/30"
        >
          <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/20 flex items-center justify-center text-[#00F0FF] group-hover:scale-110 transition-transform">
            <Cpu size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white group-hover:text-[#00F0FF] transition-colors flex items-center space-x-1">
              <span>进入漫剧工业化生产台</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </span>
            <span className="text-[10px] text-[#9BA3B4]">
              六阶段流水线 · 实时事件日志 · 产能带
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-20 z-30 hidden md:flex items-center space-x-2 text-[11px] text-[#9BA3B4]">
        <Sparkles size={12} className="text-[#00F0FF]" />
        <span>点击任意 Agent 头像，即可唤起 Universal Agent Widget 进行实时多模态调度</span>
      </div>
    </div>
  );
};
