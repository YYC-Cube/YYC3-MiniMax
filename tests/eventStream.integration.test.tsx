/**
 * file: eventStream.integration.test.tsx
 * description: WS × P2 集成测试 · 网关→服务层→UI 端到端
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [test],[integration],[websocket]
 *
 * brief: 挂载真实 P2 生产台验证事件流全链路 7 场景
 *
 * test-target: src/views/P2ProductionDesk.tsx + src/services/eventStream.ts
 * notes: vi.stubEnv 注入网关地址；act 包裹 WS 回调与定时器推进
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { P2ProductionDesk } from '../src/views/P2ProductionDesk';

/**
 * WebSocket 事件流 × P2 生产台 集成测试
 * 链路：MockWebSocket 网关 → services/eventStream → P2 事件流 UI（模式徽章 + 日志行）
 * 覆盖：SIM 降级渲染 / LIVE 切换 / 真实协议消息上屏 / 包装协议 / 非法消息隔离 /
 *       断线回退 SIM / 卸载资源回收
 */

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  closedByClient = false;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;

  constructor(url: string | URL) {
    this.url = String(url);
    MockWebSocket.instances.push(this);
  }

  close(): void {
    this.closedByClient = true;
  }
}

const WS_URL = 'wss://gateway.yyc3.test/agent-events';

function renderP2() {
  return render(
    <P2ProductionDesk onSelectAgent={vi.fn()} onSendToWidget={vi.fn()} />
  );
}

/** 服务端推送一帧 JSON 文本消息 */
function push(ws: MockWebSocket, payload: unknown): void {
  act(() => {
    ws.onmessage?.({
      data: typeof payload === 'string' ? payload : JSON.stringify(payload),
    });
  });
}

describe('WebSocket × P2 生产台 集成链路', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('日志行透传 traceId（生成即上屏，闭合链路断点）', () => {
    window.localStorage.clear();
    renderP2();
    expect(screen.getByText('#1a2b3c4d')).toBeTruthy();
  });

  it('未配置网关：SIM 徽章渲染，模拟流按节拍注入日志行', () => {
    renderP2();

    expect(screen.getByText('SIM · 模拟流')).toBeTruthy();

    const counter = () =>
      Number(screen.getByText(/\d+ Events/).textContent?.match(/\d+/)?.[0]);

    const before = counter();
    expect(before).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(9100);
    });
    expect(counter()).toBeGreaterThan(before);
  });

  it('LIVE 全链路：onopen 徽章切换，服务端消息上屏', () => {
    vi.stubEnv('NEXT_PUBLIC_EVENT_STREAM_URL', WS_URL);
    renderP2();

    // 连接前仍为 SIM
    expect(screen.getByText('SIM · 模拟流')).toBeTruthy();
    const ws = MockWebSocket.instances[0];
    expect(ws.url).toBe(WS_URL);

    act(() => {
      ws.onopen?.();
    });
    expect(screen.getByText('LIVE · WebSocket')).toBeTruthy();

    // LIVE 后模拟流停注：计数冻结
    const counter = () =>
      Number(screen.getByText(/\d+ Events/).textContent?.match(/\d+/)?.[0]);
    const frozen = counter();
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(counter()).toBe(frozen);

    // 服务端裸协议消息 → 上屏（agentName 由档案回填，门禁级 SUCCESS）
    push(ws, {
      agentId: 'zongshi',
      message: '分镜 S12 合成完成（集成验证）',
      level: 'SUCCESS',
      tag: 'GATE',
    });
    expect(screen.getByText('分镜 S12 合成完成（集成验证）')).toBeTruthy();
  });

  it('包装协议 {type:"log", data} 自动解包并上屏', () => {
    vi.stubEnv('NEXT_PUBLIC_EVENT_STREAM_URL', WS_URL);
    renderP2();
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.onopen?.();
    });

    push(ws, {
      type: 'log',
      data: { agentId: 'wanwu', message: 'EP-04 合成任务下发（包装协议）' },
    });
    expect(screen.getByText('EP-04 合成任务下发（包装协议）')).toBeTruthy();
  });

  it('非法消息不污染 UI：非法 agentId 与坏 JSON 均被隔离', () => {
    vi.stubEnv('NEXT_PUBLIC_EVENT_STREAM_URL', WS_URL);
    renderP2();
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.onopen?.();
    });

    const counter = () =>
      Number(screen.getByText(/\d+ Events/).textContent?.match(/\d+/)?.[0]);
    const before = counter();

    push(ws, { agentId: 'intruder', message: '未注册成员' });
    push(ws, 'not-json{{{');
    push(ws, { agentId: 'tianshu', message: '   ' });

    expect(counter()).toBe(before);
    expect(screen.queryByText('未注册成员')).toBeNull();

    // 链路存活：合法消息继续上屏
    push(ws, { agentId: 'bole', message: '恢复正常入队' });
    expect(counter()).toBe(before + 1);
    expect(screen.getByText('恢复正常入队')).toBeTruthy();
  });

  it('服务端断开：徽章回退 SIM，模拟流恢复注入', () => {
    vi.stubEnv('NEXT_PUBLIC_EVENT_STREAM_URL', WS_URL);
    renderP2();
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.onopen?.();
    });
    expect(screen.getByText('LIVE · WebSocket')).toBeTruthy();

    act(() => {
      ws.onclose?.();
    });
    expect(screen.getByText('SIM · 模拟流')).toBeTruthy();

    const counter = () =>
      Number(screen.getByText(/\d+ Events/).textContent?.match(/\d+/)?.[0]);
    const before = counter();
    act(() => {
      vi.advanceTimersByTime(9100);
    });
    expect(counter()).toBeGreaterThan(before);
  });

  it('卸载组件：客户端主动关闭连接，事件流完全停止', () => {
    vi.stubEnv('NEXT_PUBLIC_EVENT_STREAM_URL', WS_URL);
    const { unmount } = renderP2();
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.onopen?.();
    });

    const counter = () =>
      Number(screen.getByText(/\d+ Events/).textContent?.match(/\d+/)?.[0]);
    const atUnmount = counter();

    unmount();
    expect(ws.closedByClient).toBe(true);

    // 卸载后 DOM 移除；即使迟到定时器触发也不产生任何新行
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(screen.queryByText(/\d+ Events/)).toBeNull();
    expect(atUnmount).toBeGreaterThan(0);
  });

  it('选中成员回调贯通：点击日志行成员名触发 onSelectAgent', () => {
    vi.stubEnv('NEXT_PUBLIC_EVENT_STREAM_URL', WS_URL);
    const onSelectAgent = vi.fn();
    render(
      <P2ProductionDesk onSelectAgent={onSelectAgent} onSendToWidget={vi.fn()} />
    );
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.onopen?.();
    });
    push(ws, { agentId: 'zongshi', message: '门禁扫描完成（回调贯通）' });

    // 定位日志行内可点击的成员名 span（cursor-pointer + 行内 style 色值）
    const row = screen.getByText('门禁扫描完成（回调贯通）').closest('div');
    const memberSpan = row?.querySelector('span.cursor-pointer');
    expect(memberSpan).toBeTruthy();
    fireEvent.click(memberSpan as Element);
    expect(onSelectAgent).toHaveBeenCalledWith('zongshi');
  });
});
