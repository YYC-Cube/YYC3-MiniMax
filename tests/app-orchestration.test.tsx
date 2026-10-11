/**
 * file: app-orchestration.test.tsx
 * description: App.tsx 编排层集成测试 · 视图路由/移动降级分支/W1 跨页指令闭环
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [test],[integration],[app],[router]
 *
 * test-target: src/App.tsx（default export 编排层）
 * notes: matchMedia stub 驱动桌面/移动双分支；含诊断 #13 同文本二次派发回归与引用卡跳转闭环
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

beforeAll(() => {
  // jsdom 未实现 scrollIntoView（W1 新消息滚动依赖）
  Element.prototype.scrollIntoView = vi.fn();
  // 压制 React 重复 key / boundary 噪声
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

interface FakeMql {
  matches: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

/** matchMedia stub：jsdom 缺失；返回 flip 供移动↔桌面动态切换 */
function setupMatchMedia(initial: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql: FakeMql = {
    matches: initial,
    addEventListener: vi.fn((_q: string, fn: (e: { matches: boolean }) => void) => {
      listeners.add(fn);
    }),
    removeEventListener: vi.fn((_q: string, fn: (e: { matches: boolean }) => void) => {
      listeners.delete(fn);
    }),
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
  return {
    flip(v: boolean) {
      mql.matches = v;
      listeners.forEach((fn) => fn({ matches: v }));
    },
  };
}

let media: ReturnType<typeof setupMatchMedia>;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  media = setupMatchMedia(false); // 默认桌面分支
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function storedMessages(): Array<{ id: string; sender: string; text: string }> {
  return JSON.parse(localStorage.getItem('yyc3.w1.messages')!) as Array<{
    id: string;
    sender: string;
    text: string;
  }>;
}

describe('App 桌面编排（P1-P5 路由）', () => {
  it('默认渲染 P1：Header/Footer/P1 时钟环/W1 收起球体', () => {
    render(<App />);
    expect(screen.getByText('8 拟人化 Agent 协同 · 工业化漫剧指挥中心')).toBeTruthy();
    expect(screen.getByText('/mnt/nas/yyc3_pipeline')).toBeTruthy();
    expect(screen.getAllByText('12:00').length).toBeGreaterThan(0);
    // W1 初始收起
    expect(screen.getByTitle('展开 Universal Agent AI 浮窗')).toBeTruthy();
  });

  it('Header 导航：P2→P3→P4→P5 逐一切换（ErrorBoundary key 随视图重挂载）', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'P2 漫剧生产台' }));
    expect(screen.getByText('ReAct-C 实时事件流')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'P3 ReAct-C 编排' }));
    expect(screen.getByText('REASONING + ACTING + CALIBRATION')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'P4 算力监控台' }));
    expect(screen.getByText('集群节点拓扑 (Node Topology)')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'P5 质检与安全' }));
    expect(screen.getByText('门禁 1 · 角色面部一致性')).toBeTruthy();
  });

  it('Footer CTA 链：P1 → 生产台(P2) → ReAct 视图(P3)', () => {
    render(<App />);
    fireEvent.click(screen.getAllByText('进入漫剧工业化生产台')[0]!);
    expect(screen.getByText('ReAct-C 实时事件流')).toBeTruthy();

    fireEvent.click(screen.getByText('查看 ReAct-C 九步编排视图'));
    expect(screen.getByText('REASONING + ACTING + CALIBRATION')).toBeTruthy();
  });

  it('P1 成员唤起 W1 → 收起复原（handleSelectAgentFromP1 闭环）', () => {
    render(<App />);
    fireEvent.click(screen.getAllByText('12:00')[0]!);
    expect(screen.getByText('UNIVERSAL AGENT WIDGET (W1)')).toBeTruthy();
    expect(screen.getByPlaceholderText('@天枢 输入指令或提问...')).toBeTruthy();

    fireEvent.click(screen.getByTitle('收起浮窗'));
    expect(screen.getByTitle('展开 Universal Agent AI 浮窗')).toBeTruthy();
  });

  it('P2 阶段卡头像唤起 W1（内联 onSelectAgent 分支）', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'P2 漫剧生产台' }));

    fireEvent.click(screen.getAllByTitle(/主导/)[0]!);
    expect(screen.getByText('UNIVERSAL AGENT WIDGET (W1)')).toBeTruthy();
  });

  it('P2 快捷指令直通 W1；同文本二次派发必达（诊断 #13 回归）', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'P2 漫剧生产台' }));

    // 事件流面板默认指令 '@元启 继续下一集生产' → 发送
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    expect(screen.getByText('UNIVERSAL AGENT WIDGET (W1)')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(storedMessages().filter((m) => m.sender === 'user' && m.text === '@元启 继续下一集生产')).toHaveLength(1);

    // 同文本再次派发：{ id } 自增对象身份必变 → effect 必触发
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(storedMessages().filter((m) => m.sender === 'user' && m.text === '@元启 继续下一集生产')).toHaveLength(2);
    expect(storedMessages()).toHaveLength(6); // 2 初始 + 2 用户 + 2 回复
  });

  it('W1 引用卡跳转：切至 P2 并携带高亮 stage（handleNavigateToTask）', () => {
    render(<App />);
    fireEvent.click(screen.getAllByText('12:00')[0]!);
    fireEvent.click(screen.getByText('任务 #TASK-STORY-108'));

    expect(screen.getByText('ReAct-C 实时事件流')).toBeTruthy();
    // 高亮台本仍渲染完整六阶段
    expect(screen.getAllByTitle(/主导/).length).toBeGreaterThan(0);
  });

  it('scaleMode 切换：fit ↔ 1080p（标题翻转 + 缩放分支）', () => {
    render(<App />);
    fireEvent.click(screen.getByTitle('切换至标准 1980×1020 视图'));
    expect(screen.getByTitle('切换至自适应高度视图')).toBeTruthy();

    fireEvent.click(screen.getByTitle('切换至自适应高度视图'));
    expect(screen.getByTitle('切换至标准 1980×1020 视图')).toBeTruthy();
  });

  it('P4 告警路由：→P5 / →P2 / →P3 三向贯通', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'P4 算力监控台' }));

    fireEvent.click(screen.getByText('排查根因 → P5'));
    expect(screen.getByText('门禁 1 · 角色面部一致性')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'P4 算力监控台' }));
    fireEvent.click(screen.getByText('流水线详情'));
    expect(screen.getByText('ReAct-C 实时事件流')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'P4 算力监控台' }));
    fireEvent.click(screen.getByText('ReAct 链路'));
    expect(screen.getByText('REASONING + ACTING + CALIBRATION')).toBeTruthy();
  });

  it('P5 底部导航：→P2 / →P3', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'P5 质检与安全' }));

    fireEvent.click(screen.getByText('直达生产指挥台'));
    expect(screen.getByText('ReAct-C 实时事件流')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'P5 质检与安全' }));
    fireEvent.click(screen.getByText('查看 ReAct-C 回环详情'));
    expect(screen.getByText('REASONING + ACTING + CALIBRATION')).toBeTruthy();
  });

  it('P3 步骤交互按钮唤起 W1（内联 onSelectAgent 分支）', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'P3 ReAct-C 编排' }));

    fireEvent.click(screen.getByRole('button', { name: /交互会话/ }));
    expect(screen.getByText('UNIVERSAL AGENT WIDGET (W1)')).toBeTruthy();
  });
});

describe('App 移动降级分支（<768px）', () => {
  beforeEach(() => {
    media.flip(true);
  });

  it('移动视图渲染：MobileFallback + W1 收起，桌面 Header/Footer 卸载', () => {
    render(<App />);
    expect(screen.getByText(/点击成员即可唤醒 W1/)).toBeTruthy();
    expect(screen.queryByText('P1 时钟环中心')).toBeNull();
    expect(screen.queryByText('/mnt/nas/yyc3_pipeline')).toBeNull();
    expect(screen.getByTitle('展开 Universal Agent AI 浮窗')).toBeTruthy();
  });

  it('移动成员唤起 W1；引用卡在移动分支仅改内部状态（无桌面视图可切）', () => {
    render(<App />);
    const memberBtns = screen.getAllByRole('button', { name: /·/ });
    fireEvent.click(memberBtns[0]!);
    expect(screen.getByText('UNIVERSAL AGENT WIDGET (W1)')).toBeTruthy();

    fireEvent.click(screen.getByText('任务 #TASK-STORY-108'));
    expect(screen.queryByText('P1 时钟环中心')).toBeNull(); // 仍为移动视图
    expect(screen.getByText('UNIVERSAL AGENT WIDGET (W1)')).toBeTruthy();
  });

  it('视口动态拉宽：移动 → 桌面实时切换（matchMedia change 订阅生效）', () => {
    render(<App />);
    expect(screen.getByText(/点击成员即可唤醒 W1/)).toBeTruthy();

    act(() => {
      media.flip(false);
    });
    expect(screen.getByText('P1 时钟环中心')).toBeTruthy();
    expect(screen.queryByText(/点击成员即可唤醒 W1/)).toBeNull();
  });
});
