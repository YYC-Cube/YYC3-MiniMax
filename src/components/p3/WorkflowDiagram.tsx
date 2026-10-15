/**
 * file: WorkflowDiagram.tsx
 * description: P3 九步环 SVG 图层 · 背景导引环/顺序连线粒子/Step7 红色回环
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p3],[svg]
 *
 * brief: 760 viewBox SVG：节点顺序连线（活跃步高亮）+ 粒子流动 + 回环虚线路径与标注
 *
 * dependencies: react, lucide-react, domain/constants, hooks/useReActGeometry
 * exports: WorkflowDiagram
 */

import { GATES } from '../../domain/constants';
import type { ReactNodePosition } from '../../hooks/useReActGeometry';

interface WorkflowDiagramProps {
  cx: number;
  cy: number;
  radius: number;
  nodePositions: ReactNodePosition[];
  activeStepIndex: number;
  isLoopingBack: boolean;
  loopbackPath: string;
  step5Pos: { x: number; y: number };
  loopbackControlX: number;
  loopbackControlY: number;
}

export function WorkflowDiagram({
  cx,
  cy,
  radius,
  nodePositions,
  activeStepIndex,
  isLoopingBack,
  loopbackPath,
  step5Pos,
  loopbackControlX,
  loopbackControlY,
}: WorkflowDiagramProps) {
  return (
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
          {`◀ 质检未通过：红色回环 (复检≤${GATES.MAX_REVIEW_ROUNDS}轮)`}
        </text>
      </g>
    </svg>
  );
}
