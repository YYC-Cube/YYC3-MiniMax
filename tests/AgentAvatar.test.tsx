/**
 * file: AgentAvatar.test.tsx
 * description: AgentAvatar 组件单测 · 渲染/LED/点击回调
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [test],[unit],[component]
 *
 * brief: 头像尺寸/pattern 命名/状态灯/onClick 5 用例
 *
 * test-target: src/components/AgentAvatar.tsx
 * notes: 使用 Vitest + React Testing Library
 */

import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgentAvatar } from '../src/components/AgentAvatar';

describe('AgentAvatar 组件', () => {
  it('按 size 渲染外框与网格纹理', () => {
    const { container } = render(<AgentAvatar agentId="tianshu" size={80} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.getAttribute('style')).toContain('width: 80px');
    expect(root.getAttribute('style')).toContain('height: 80px');
    // agentId + size 唯一命名的 cyber 网格 pattern
    expect(container.querySelector('#pat-tianshu-80')).not.toBeNull();
  });

  it('showLed 渲染带状态 title 的 LED 灯', () => {
    const { container } = render(<AgentAvatar agentId="shouhu" size={40} showLed />);
    expect(container.querySelector('div[title^="状态:"]')).not.toBeNull();
  });

  it('默认不渲染 LED 与脉冲环', () => {
    const { container } = render(<AgentAvatar agentId="zongshi" size={40} />);
    expect(container.querySelector('div[title^="状态:"]')).toBeNull();
  });

  it('点击头像触发回调', () => {
    const onClick = vi.fn();
    const { container } = render(<AgentAvatar agentId="zongshi" size={40} onClick={onClick} />);
    fireEvent.click(container.firstElementChild as Element);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('overrideStatus 覆盖成员默认状态（LED 颜色随之变化）', () => {
    const { container } = render(
      <AgentAvatar agentId="bole" size={40} showLed overrideStatus="speaking" />
    );
    const led = container.querySelector('div[title^="状态:"]') as HTMLElement;
    expect(led.getAttribute('title')).toContain('发言中');
    expect(led.getAttribute('style')).toContain('#FF006E');
  });
});
