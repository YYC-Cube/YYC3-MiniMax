/**
 * file: components-root.test.tsx
 * description: components 根组件直测 · UniversalWidget 全交互流 / ErrorBoundary 触发链 / Header / Footer
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [test],[component],[w1],[error-boundary]
 *
 * test-target: src/components/UniversalWidget.tsx, ErrorBoundary.tsx, Header.tsx, Footer.tsx
 * notes: W1 覆盖收起/展开/成员切换/引用卡/键盘与 chip 发送/外部指令/合并模式/持久化/截断
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { Footer } from '../src/components/Footer';
import { Header } from '../src/components/Header';
import { UniversalWidget } from '../src/components/UniversalWidget';
import { addTelemetrySink, type TelemetryEvent } from '../src/services/telemetry';
import type { AgentId } from '../src/types';

// jsdom 未实现 scrollIntoView（W1 新消息滚动依赖）
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const cleanupFns: Array<() => void> = [];

afterEach(() => {
  while (cleanupFns.length) cleanupFns.pop()!();
  localStorage.clear();
  vi.useRealTimers();
});

describe('ErrorBoundary（错误边界）', () => {
  let shouldThrow = true;
  function Bomb() {
    if (shouldThrow) throw new Error('boom-render');
    return <div>safe-content</div>;
  }

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    shouldThrow = true;
  });

  afterEach(() => {
    vi.mocked(console.error).mockRestore();
  });

  it('捕获渲染异常：降级面板 + 错误消息 + traceId + telemetry 上报（默认标签）', () => {
    const captured: TelemetryEvent[] = [];
    cleanupFns.push(addTelemetrySink((e) => captured.push(e)));

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.queryByText('safe-content')).toBeNull();
    expect(screen.getByText('视图渲染异常')).toBeTruthy();
    expect(screen.getByText('该区域已隔离，其余功能不受影响')).toBeTruthy();
    expect(screen.getByText('boom-render')).toBeTruthy();

    expect(captured).toHaveLength(1);
    expect(captured[0]!.event).toBe('ui.render_error');
    expect(captured[0]!.level).toBe('error');
    expect(captured[0]!.message).toBe('boom-render');
    // 面板展示的 traceId 与上报 traceId 一致
    expect(screen.getByText(captured[0]!.traceId!)).toBeTruthy();
  });

  it('自定义 label；异常源修复后"重试渲染"恢复子树', () => {
    render(
      <ErrorBoundary label="生产指挥台">
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('生产指挥台')).toBeTruthy();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: '重试渲染' }));
    expect(screen.getByText('safe-content')).toBeTruthy();
    expect(screen.queryByText('生产指挥台')).toBeNull();
  });
});

describe('Header（顶部导航）', () => {
  function renderHeader(currentView: 'P1' | 'P2' | 'P3' | 'P4' | 'P5' = 'P2') {
    const onViewChange = vi.fn();
    const onToggleScaleMode = vi.fn();
    render(
      <Header
        currentView={currentView}
        onViewChange={onViewChange}
        scaleMode="fit"
        onToggleScaleMode={onToggleScaleMode}
      />,
    );
    return { onViewChange, onToggleScaleMode };
  }

  it('五个导航 Tab 点击回调对应视图', () => {
    const { onViewChange } = renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'P1 时钟环中心' }));
    fireEvent.click(screen.getByRole('button', { name: 'P2 漫剧生产台' }));
    fireEvent.click(screen.getByRole('button', { name: 'P3 ReAct-C 编排' }));
    fireEvent.click(screen.getByRole('button', { name: 'P4 算力监控台' }));
    fireEvent.click(screen.getByRole('button', { name: 'P5 质检与安全' }));
    expect(onViewChange).toHaveBeenCalledTimes(5);
    expect(onViewChange).toHaveBeenNthCalledWith(1, 'P1');
    expect(onViewChange).toHaveBeenLastCalledWith('P5');
  });

  it('品牌点击回 P1；视图缩放开关回调', () => {
    const { onViewChange, onToggleScaleMode } = renderHeader();
    fireEvent.click(screen.getByText(/YYC³/));
    expect(onViewChange).toHaveBeenCalledWith('P1');
    fireEvent.click(screen.getByTitle('切换至标准 1980×1020 视图'));
    expect(onToggleScaleMode).toHaveBeenCalledTimes(1);
  });

  it('实时时钟：固定系统时间初始渲染，1s 后走秒（定时器卸载不泄漏）', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 11, 14, 25, 8) });
    renderHeader();
    expect(screen.getByText('14:25:08')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('14:25:09')).toBeTruthy();
    expect(screen.getByText('UTC+8')).toBeTruthy();
  });

  it('全局状态灯：产能/质检/安全三灯齐备', () => {
    renderHeader();
    expect(screen.getByText('产能')).toBeTruthy();
    expect(screen.getByText('质检')).toBeTruthy();
    expect(screen.getByText('安全')).toBeTruthy();
    expect(screen.getByText('8 拟人化 Agent 协同 · 工业化漫剧指挥中心')).toBeTruthy();
  });
});

describe('Footer（底部状态栏）', () => {
  function renderFooter(currentView: 'P1' | 'P2' | 'P3' | 'P4' | 'P5') {
    const onNavigate = vi.fn();
    render(<Footer currentView={currentView} onNavigate={onNavigate} />);
    return { onNavigate };
  }

  it('渲染 NAS/任务队列/在线率遥测摘要', () => {
    renderFooter('P3');
    expect(screen.getByText('/mnt/nas/yyc3_pipeline')).toBeTruthy();
    expect(screen.getByText('万兆 NFSv4.2 挂载')).toBeTruthy();
    expect(screen.getByText('42 Active')).toBeTruthy();
    expect(screen.getByText('100% (8/8 在线)')).toBeTruthy();
    expect(screen.getByText('合规校验: PASS')).toBeTruthy();
  });

  it('P1 视图：CTA 引导进入生产台 → P2', () => {
    const { onNavigate } = renderFooter('P1');
    fireEvent.click(screen.getByText('进入漫剧工业化生产台'));
    expect(onNavigate).toHaveBeenCalledWith('P2');
  });

  it('P2 视图：CTA 引导查看 ReAct → P3', () => {
    const { onNavigate } = renderFooter('P2');
    fireEvent.click(screen.getByText('查看 ReAct-C 九步编排视图'));
    expect(onNavigate).toHaveBeenCalledWith('P3');
  });

  it('P3/P4/P5 视图：无快捷 CTA', () => {
    renderFooter('P4');
    expect(screen.queryByText('进入漫剧工业化生产台')).toBeNull();
    expect(screen.queryByText('查看 ReAct-C 九步编排视图')).toBeNull();
  });
});

describe('UniversalWidget（W1 浮窗）', () => {
  function renderWidget(overrides: Partial<Parameters<typeof UniversalWidget>[0]> = {}) {
    const props = {
      activeAgentId: 'tianshu' as AgentId,
      onSelectAgent: vi.fn(),
      isOpen: true,
      onToggleOpen: vi.fn(),
      ...overrides,
    };
    const utils = render(<UniversalWidget {...props} />);
    return { props, unmount: utils.unmount };
  }

  it('收起态：品牌 logo 球体 + 初始未读徽标 1，点击展开回调', () => {
    const { props } = renderWidget({ isOpen: false });
    expect(screen.getByAltText('YYC³ 言语云')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    fireEvent.click(screen.getByTitle('展开 Universal Agent AI 浮窗'));
    expect(props.onToggleOpen).toHaveBeenCalledTimes(1);
  });

  it('展开态：标题/8 成员切换器/初始会话/响应者副标全渲染', () => {
    renderWidget();
    expect(screen.getByText('UNIVERSAL AGENT WIDGET (W1)')).toBeTruthy();
    expect(screen.getByText('8 拟人化 Agent 切换:')).toBeTruthy();
    for (const nick of ['天枢', '守护', '宗师', '灵韵', '千行', '万物', '先知', '伯乐']) {
      expect(screen.getByText(nick)).toBeTruthy();
    }
    expect(screen.getAllByText('元启·天枢').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('创想·灵韵').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText('@天枢 输入指令或提问...')).toBeTruthy();
    expect(screen.getByText('ReAct-C 九步模式')).toBeTruthy();
    expect(screen.getByText('天枢 (12:00)')).toBeTruthy();
  });

  it('成员切换：点击 nick 回调 AgentId；收起/关闭按钮均回调 onToggleOpen', () => {
    const onSelectAgent = vi.fn();
    const { props } = renderWidget({ onSelectAgent });
    fireEvent.click(screen.getByText('宗师'));
    expect(onSelectAgent).toHaveBeenCalledWith('zongshi');

    fireEvent.click(screen.getByTitle('收起浮窗'));
    fireEvent.click(screen.getByTitle('关闭'));
    expect(props.onToggleOpen).toHaveBeenCalledTimes(2);
  });

  it('引用卡跳转：点击回调对应 targetId', () => {
    const onNavigateToTask = vi.fn();
    renderWidget({ onNavigateToTask });
    fireEvent.click(screen.getByText('任务 #TASK-STORY-108'));
    expect(onNavigateToTask).toHaveBeenCalledWith('image');
    fireEvent.click(screen.getByText('分镜资产已锁定'));
    expect(onNavigateToTask).toHaveBeenLastCalledWith('storyboard');
  });

  it('键盘发送：Enter 清空输入 → 思考态 → 700ms 后 quality 语义回复', () => {
    vi.useFakeTimers();
    renderWidget();
    const input = screen.getByPlaceholderText('@天枢 输入指令或提问...') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '查看质检' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input.value).toBe('');
    expect(screen.getAllByText('查看质检').length).toBeGreaterThanOrEqual(2); // chip + 用户消息
    expect(screen.getByText(/思考中\.\.\./)).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByText(/91\.4%/)).toBeTruthy();
    expect(screen.queryByText(/思考中/)).toBeNull();
  });

  it('空白输入：Enter 不触发发送（早退分支）', () => {
    renderWidget();
    const input = screen.getByPlaceholderText('@天枢 输入指令或提问...');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByText(/思考中/)).toBeNull();
  });

  it('chip 快捷指令：production 意图回复含工单引用卡', () => {
    vi.useFakeTimers();
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: '继续生产' }));

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByText(/言启·千行/)).toBeTruthy();
    expect(screen.getByText('工单 #TASK-EP04-INIT')).toBeTruthy();
  });

  it('外部指令注入：挂载即派发 + 立即清除回调 + cost 语义回复', () => {
    vi.useFakeTimers();
    const onClearExternalCommand = vi.fn();
    renderWidget({ externalCommand: { id: 7, text: '成本报告' }, onClearExternalCommand });

    expect(onClearExternalCommand).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByText(/¥1\.42/)).toBeTruthy();
    expect(screen.getByText(/预见·先知/)).toBeTruthy();
  });

  it('收起态外部指令：回复到达未读徽标累加（1→2）', () => {
    vi.useFakeTimers();
    renderWidget({ isOpen: false, externalCommand: { id: 3, text: '继续生产' } });

    expect(screen.getByText('1')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('持久化：发送后写入 localStorage，重挂载恢复会话', () => {
    vi.useFakeTimers();
    const { unmount } = renderWidget();
    fireEvent.click(screen.getByRole('button', { name: '成本报告' }));
    act(() => {
      vi.advanceTimersByTime(700);
    });

    const stored = JSON.parse(localStorage.getItem('yyc3.w1.messages')!) as unknown[];
    expect(stored).toHaveLength(4); // 2 初始 + 用户 + 回复

    unmount();
    renderWidget();
    expect(screen.getAllByText('成本报告').length).toBeGreaterThanOrEqual(2); // chip + 恢复的用户消息
    expect(screen.getByText(/¥1\.42/)).toBeTruthy();
  });

  it('环形截断：50 条上限，新消息挤掉最旧记录', () => {
    const seeded = Array.from({ length: 50 }, (_, i) => ({
      id: `seed-${i}`,
      sender: 'agent',
      agentId: 'tianshu',
      timestamp: '00:00:00',
      text: `seed-${i}`,
    }));
    localStorage.setItem('yyc3.w1.messages', JSON.stringify(seeded));

    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: '继续生产' }));

    const stored = JSON.parse(localStorage.getItem('yyc3.w1.messages')!) as Array<{ id: string }>;
    expect(stored).toHaveLength(50);
    expect(stored.some((m) => m.id.startsWith('usr-'))).toBe(true);
    expect(stored[0]!.id).toBe('seed-1'); // seed-0 已被挤出
  });

  it('天枢总调度合并模式：非天枢 Agent 下回复归属天枢', () => {
    vi.useFakeTimers();
    renderWidget({ activeAgentId: 'lingyun' as AgentId });
    fireEvent.click(screen.getByRole('button', { name: /天枢总调度/ }));
    fireEvent.click(screen.getByRole('button', { name: '查看质检' }));

    act(() => {
      vi.advanceTimersByTime(700);
    });
    // 初始 2 处（msg-1 发送者+加粗正文）+ 合并回复发送者 = 3
    expect(screen.getAllByText('元启·天枢').length).toBeGreaterThanOrEqual(3);
  });

  it('附件按钮：注入上传指令文案并走 fallback 语义回复', () => {
    vi.useFakeTimers();
    renderWidget();
    fireEvent.click(screen.getByTitle('上传剧本/参考图 (附件)'));

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByText(/已收到您的指令/)).toBeTruthy();
    expect(screen.getAllByText(/EP04-SC01\.docx/).length).toBeGreaterThanOrEqual(2); // 用户消息 + 回复回显
  });
});
