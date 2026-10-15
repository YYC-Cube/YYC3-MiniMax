/**
 * file: opsView.test.ts
 * description: 领域推导单测 · 内存占比 / 状态标签·色调 Record / StatusPill 渲染
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[unit],[domain],[component]
 *
 * test-target: src/domain/opsView.ts, src/components/StatusPill.tsx
 * notes: 覆盖 memUsagePct 归一化/四舍五入/100 封顶 + 五状态 Record 全键 + 胶囊色调类
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { StatusPill } from '../src/components/StatusPill';
import {
  OPS_STATUS_LABEL,
  OPS_STATUS_TONE,
  REACT_STEP_STATUS_LABEL,
  REACT_STEP_STATUS_TONE,
  memUsagePct,
} from '../src/domain/opsView';

describe('memUsagePct（内存占用率归一化）', () => {
  it('常规比例：四舍五入取整', () => {
    expect(memUsagePct(50, 100)).toBe(50);
    expect(memUsagePct(25, 200)).toBe(13); // 0.125 → 12.5 → 13
    expect(memUsagePct(0, 100)).toBe(0);
  });

  it('精确取整：三分位/八分位 边界进位', () => {
    expect(memUsagePct(1, 3)).toBe(33);
    expect(memUsagePct(2, 3)).toBe(67);
    expect(memUsagePct(1, 8)).toBe(13); // 12.5 → 13
  });

  it('超量时封顶 100（>100 不再溢出）', () => {
    expect(memUsagePct(150, 100)).toBe(100);
    expect(memUsagePct(200, 100)).toBe(100);
    expect(memUsagePct(101, 100)).toBe(100);
  });
});

describe('状态标签 / 色调 Record（单一事实源）', () => {
  it('OPS_STATUS_LABEL / OPS_STATUS_TONE：online/warn/critical 全键映射', () => {
    expect(OPS_STATUS_LABEL).toEqual({ online: '在线', warn: '高负载', critical: '告警' });
    expect(OPS_STATUS_TONE).toEqual({ online: 'ok', warn: 'warn', critical: 'danger' });
  });

  it('REACT_STEP_STATUS_LABEL / REACT_STEP_STATUS_TONE：pending/running/completed/loopback 全键映射', () => {
    expect(REACT_STEP_STATUS_LABEL).toEqual({
      pending: '待命',
      running: '执行中',
      completed: '已完成',
      loopback: '回环',
    });
    expect(REACT_STEP_STATUS_TONE).toEqual({
      running: 'accent',
      completed: 'ok',
      loopback: 'ok',
      pending: 'muted',
    });
  });
});

describe('StatusPill（状态胶囊）', () => {
  it('渲染 label，基底类 + 色调类逐字节拼接', () => {
    render(React.createElement(StatusPill, { label: '执行中', tone: 'accent' }));
    const pill = screen.getByText('执行中');
    expect(pill.className).toBe(
      'text-[9px] px-1.5 py-0.5 rounded border shrink-0 text-[#00F0FF] border-[#00F0FF]/40',
    );
  });

  it('五色调各自映射到对应边框/文字色', () => {
    const cases: Array<[Parameters<typeof StatusPill>[0]['tone'], string]> = [
      ['accent', 'text-[#00F0FF] border-[#00F0FF]/40'],
      ['ok', 'text-[#00FF88] border-[#00FF88]/40'],
      ['muted', 'text-[#5A6478] border-white/10'],
      ['warn', 'text-[#FFD700] border-[#FFD700]/40'],
      ['danger', 'text-[#FF006E] border-[#FF006E]/40'],
    ];
    for (const [tone, toneClass] of cases) {
      render(React.createElement(StatusPill, { label: `L-${tone}`, tone }));
      const pill = screen.getByText(`L-${tone}`);
      expect(pill.className).toBe(`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${toneClass}`);
    }
  });
});
