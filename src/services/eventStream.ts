/**
 * file: eventStream.ts
 * description: WebSocket 事件流客户端 · 断线重连/降级模拟/消息规范化
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [service],[websocket],[realtime]
 *
 * brief: 高可用双模事件流：LIVE（WS 网关）+ SIM（降级模拟），链路永不中断
 *
 * details:
 * - 配置 NEXT_PUBLIC_EVENT_STREAM_URL 连接真实网关，指数退避重连 ≤5 次
 * - 未配置/失败自动降级内置模拟流；LIVE 后停用模拟定时器
 * - 消息规范化：非法 agentId/空消息静默丢弃，兼容 {type,data} 包装协议
 *
 * dependencies: types, data/agents
 * exports: createEventStream, normalizeIncomingEvent, EventStreamMode, EventStreamHandle
 */

import { AGENTS, AGENT_LIST } from '../data/agents';
import type { AgentId, LogItem } from '../types';
import { createTraceId, telemetry } from './telemetry';

/**
 * 实时事件流服务（高可用设计）
 * - 配置 url 时优先连接 WebSocket 实时流，断线指数退避重连（≤5 次）
 * - 未配置或连接失败时自动降级为内置模拟流，保证链路不中断
 * - 消息协议：{ agentId, message, level?, tag?, timestamp?, agentName? }
 */

export type EventStreamMode = 'live' | 'simulated';

export interface EventStreamOptions {
  /** WebSocket 服务地址（如 wss://gateway.yyc3.local/agent-events） */
  url?: string;
  /** 事件回调 */
  onEvent: (log: LogItem) => void;
  /** 模式切换回调（live / simulated） */
  onModeChange?: (mode: EventStreamMode) => void;
  /** 模拟流节拍（ms），默认 9000 */
  intervalMs?: number;
}

export interface EventStreamHandle {
  close: () => void;
}

const VALID_AGENT_IDS: ReadonlySet<string> = new Set(AGENT_LIST.map((a) => a.id));
const VALID_LEVELS: ReadonlySet<string> = new Set(['INFO', 'SUCCESS', 'WARN', 'ERROR', 'THINK', 'ACT']);

const SIMULATED_EVENTS: ReadonlyArray<Pick<LogItem, 'agentId' | 'level' | 'message' | 'tag'>> = [
  { agentId: 'tianshu', level: 'INFO', message: '全局编排心跳正常，家族在线率 100%', tag: 'HEARTBEAT' },
  { agentId: 'lingyun', level: 'INFO', message: 'EP-03 S12 关键帧渲染完成（19.4s/帧）', tag: 'RENDER' },
  { agentId: 'zongshi', level: 'SUCCESS', message: '分镜 S09 终审通过：一致性 93.2% / SyncNet 0.86', tag: 'GATE' },
  { agentId: 'wanwu', level: 'INFO', message: 'EP-04 合成任务下发 GPU 队列（优先级 P1）', tag: 'QUEUE' },
  { agentId: 'shouhu', level: 'WARN', message: 'PII 过滤器拦截 1 条候选文本，已自动脱敏', tag: 'SECURITY' },
  { agentId: 'xianzhi', level: 'INFO', message: '平台热度模型刷新：Shanghai 微短剧榜 +2', tag: 'TREND' },
  { agentId: 'qianxing', level: 'INFO', message: '新需求解析入队，意图路由至 wanwu', tag: 'ROUTE' },
  { agentId: 'bole', level: 'INFO', message: '运营反哺回流：候选素材 12 组进入推荐池', tag: 'FEEDBACK' },
];

function randomId(now: Date): string {
  return `evt-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 将任意入站消息规范化为 LogItem；agentId 或 message 非法时丢弃（返回 null） */
export function normalizeIncomingEvent(raw: unknown, now = new Date()): LogItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const agentId = typeof r.agentId === 'string' && VALID_AGENT_IDS.has(r.agentId) ? (r.agentId as AgentId) : null;
  const message = typeof r.message === 'string' && r.message.trim() ? r.message.trim() : null;
  if (!agentId || !message) return null;
  const level = typeof r.level === 'string' && VALID_LEVELS.has(r.level) ? (r.level as LogItem['level']) : 'INFO';
  return {
    id: typeof r.id === 'string' ? r.id : randomId(now),
    timestamp:
      typeof r.timestamp === 'string'
        ? r.timestamp
        : now.toLocaleTimeString('zh-CN', { hour12: false }),
    agentId,
    agentName: typeof r.agentName === 'string' ? r.agentName : AGENTS[agentId].name,
    level,
    message,
    tag: typeof r.tag === 'string' ? r.tag : undefined,
    traceId: typeof r.traceId === 'string' && r.traceId.trim() ? r.traceId : createTraceId(now),
  };
}

export function createEventStream(options: EventStreamOptions): EventStreamHandle {
  const { url, onEvent, onModeChange, intervalMs = 9000 } = options;
  const maxReconnects = 5;

  let mode: EventStreamMode | null = null;
  let ws: WebSocket | null = null;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let simTimer: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  function setMode(next: EventStreamMode): void {
    if (mode === next || closed) return;
    mode = next;
    // 降级/恢复必须可观测：SIM 上线意味着实时链路不可用，需告警而非静默
    telemetry.warn('event_stream.mode_change', {
      message: `事件流模式切换: ${next}`,
      traceId: createTraceId(),
      data: { mode: next, url: url ?? null, reconnectAttempt },
    });
    onModeChange?.(next);
  }

  function startSimulated(): void {
    if (closed || simTimer) return;
    let cursor = Math.floor(Math.random() * SIMULATED_EVENTS.length);
    simTimer = setInterval(() => {
      const base = SIMULATED_EVENTS[cursor % SIMULATED_EVENTS.length];
      cursor += 1;
      const log = normalizeIncomingEvent(base);
      if (log) onEvent(log);
    }, intervalMs);
  }

  function stopSimulated(): void {
    if (simTimer) {
      clearInterval(simTimer);
      simTimer = null;
    }
  }

  function scheduleReconnect(): void {
    if (closed || !url || reconnectAttempt >= maxReconnects) return;
    const delay = Math.min(1000 * 2 ** reconnectAttempt, 30_000);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(connect, delay);
  }

  function connect(): void {
    if (closed || !url) return;
    try {
      ws = new WebSocket(url);
    } catch {
      setMode('simulated');
      startSimulated();
      scheduleReconnect();
      return;
    }
    ws.onopen = () => {
      reconnectAttempt = 0;
      setMode('live');
      stopSimulated();
    };
    ws.onmessage = (event: MessageEvent) => {
      try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        // 兼容 { type: 'log', data: {...} } 包装协议与裸 LogItem 协议
        const candidate =
          payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)
            ? (payload as { data: unknown }).data
            : payload;
        const log = normalizeIncomingEvent(candidate);
        if (log) onEvent(log);
        else {
          telemetry.warn('event_stream.invalid_message', {
            message: '入站消息规范化失败，已丢弃',
            data: { rawType: typeof candidate },
          });
        }
      } catch {
        // 非法消息静默丢弃，不中断链路（遥测在 normalize 内为结构化 warn）
      }
    };
    ws.onclose = () => {
      setMode('simulated');
      startSimulated();
      scheduleReconnect();
    };
    ws.onerror = () => {
      setMode('simulated');
      startSimulated();
    };
  }

  setMode('simulated');
  startSimulated();
  if (url) connect();

  return {
    close() {
      closed = true;
      stopSimulated();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.close();
      }
      simTimer = null;
      reconnectTimer = null;
      ws = null;
    },
  };
}
