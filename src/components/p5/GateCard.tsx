/**
 * file: GateCard.tsx
 * description: P5 质量门禁状态卡 · 单张门禁概览（图标/数值/阈值达标文案）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p5],[gate]
 *
 * brief: 顶部四道门禁之一：按 variant 呈现配色与脉冲灯，标题/数值/阈值文案由父层派生
 *
 * dependencies: react, lucide-react
 * exports: GateCard
 */

import type { LucideIcon } from 'lucide-react';

/** 门禁配色变体（模块级常量：Tailwind 类名保持字面量，可被静态提取） */
type GateVariant = 'green' | 'cyan' | 'purple';

const GATE_VARIANT_STYLES: Record<GateVariant, {
  card: string;
  iconWrap: string;
  threshold: string;
  dot: string;
}> = {
  green: {
    card: 'border-[#00FF88]/40 shadow-[0_0_16px_rgba(0,255,136,0.15)]',
    iconWrap: 'bg-[#00FF88]/15 border border-[#00FF88]/50 flex items-center justify-center text-[#00FF88]',
    threshold: 'text-[#00FF88]',
    dot: 'bg-[#00FF88] shadow-[0_0_10px_#00FF88] animate-pulse',
  },
  cyan: {
    card: 'border-[#00F0FF]/40 shadow-[0_0_16px_rgba(0,240,255,0.15)]',
    iconWrap: 'bg-[#00F0FF]/15 border border-[#00F0FF]/50 flex items-center justify-center text-[#00F0FF]',
    threshold: 'text-[#00F0FF]',
    dot: 'bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]',
  },
  purple: {
    card: 'border-[#BF00FF]/40 shadow-[0_0_16px_rgba(191,0,255,0.15)]',
    iconWrap: 'bg-[#BF00FF]/15 border border-[#BF00FF]/50 flex items-center justify-center text-[#BF00FF]',
    threshold: 'text-[#BF00FF]',
    dot: 'bg-[#BF00FF] shadow-[0_0_10px_#BF00FF]',
  },
};

interface GateCardProps {
  icon: LucideIcon;
  variant: GateVariant;
  title: string;
  value: string;
  threshold: string;
}

export function GateCard({ icon: Icon, variant, title, value, threshold }: GateCardProps) {
  const styles = GATE_VARIANT_STYLES[variant];

  return (
    <div className={`rounded-xl glass-panel p-3.5 flex items-center justify-between border ${styles.card}`}>
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-xl ${styles.iconWrap}`}>
          <Icon size={22} />
        </div>
        <div>
          <span className="text-[10px] text-[#9BA3B4] font-medium block">
            {title}
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-mono-num font-extrabold text-xl text-white">{value}</span>
            <span className={`text-[10px] ${styles.threshold} font-bold`}>{threshold}</span>
          </div>
        </div>
      </div>
      <span className={`w-3 h-3 rounded-full ${styles.dot}`} />
    </div>
  );
}
