/**
 * file: ClockDial.tsx
 * description: P1 时钟表盘 SVG · 60 刻度/全息连线粒子/真实走时三针
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p1],[clock]
 *
 * brief: 900 viewBox 表盘渲染层：刻度 + 8 成员全息连线 + 时分秒三针（随传入时间走时）
 *
 * dependencies: react, types
 * exports: ClockDial
 */

import type { AgentId } from '../../types';

interface ClockDialProps {
  /** 当前真实时间（1s 走时由父层驱动） */
  time: Date;
  cx: number;
  cy: number;
  radius: number;
  /** 8 成员角度配置（相对 12:00） */
  members: ReadonlyArray<{ id: AgentId; angleDeg: number }>;
}

export function ClockDial({ time, cx, cy, radius, members }: ClockDialProps) {
  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  // 三针角度公式（-90 使 0° 指向 12:00，与成员角度约定一致）
  const hourAngle = ((hours * 30 + minutes * 0.5 - 90) * Math.PI) / 180;
  const minuteAngle = ((minutes * 6 + seconds * 0.1 - 90) * Math.PI) / 180;
  const secondAngle = ((seconds * 6 - 90) * Math.PI) / 180;

  // 三针真实钟表比例（以表盘半径为基准，长度/尾锤各不相同）
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
      {members.map((member) => {
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
  );
}
