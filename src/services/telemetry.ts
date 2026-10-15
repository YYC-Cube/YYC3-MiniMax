/**
 * file: telemetry.ts
 * description: 可观测性服务 · 结构化日志/traceId 生成/全局错误钩子
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [service],[telemetry],[observability]
 *
 * brief: 单行 JSON 结构化遥测输出，全链路 traceId 关联，永不因遥测故障中断业务
 *
 * details:
 * - createTraceId：优先 crypto.randomUUID，降级时间戳+随机串
 * - telemetry.debug/info/warn/error：经 sink 输出单行 JSON，sink 异常静默吞掉
 * - installGlobalErrorHooks：window error + unhandledrejection 兜底上报，返回卸载函数
 *
 * dependencies: 无（零依赖，可在 Node/happy-dom/浏览器任意环境运行）
 * exports: TelemetryEvent, TelemetryLevel, TelemetrySink, createTraceId, telemetry, addTelemetrySink, installGlobalErrorHooks
 */

export type TelemetryLevel = 'debug' | 'info' | 'warn' | 'error';

export interface TelemetryEvent {
  /** ISO 8601 时间戳 */
  timestamp: string;
  level: TelemetryLevel;
  /** 点分事件名，如 event_stream.mode_change / runtime.uncaught_error */
  event: string;
  message?: string;
  /** 关联链路 ID（W3C 风格） */
  traceId?: string;
  /** 结构化上下文，禁止塞入 PII/密钥 */
  data?: Record<string, unknown>;
}

export type TelemetrySink = (event: TelemetryEvent) => void;

/** 生成 traceId：优先 crypto.randomUUID（Node 19+/现代浏览器均内置） */
export function createTraceId(now = new Date()): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return `trace-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** 默认 sink：单行 JSON 输出到 console（结构化，便于采集器解析） */
const consoleSink: TelemetrySink = (event) => {
  const line = JSON.stringify(event);
  if (event.level === 'error') console.error(line);
  else if (event.level === 'warn') console.warn(line);
  else console.log(line);
};

const sinks: TelemetrySink[] = [consoleSink];

/** 注册自定义 sink（如后端采集端点），返回卸载函数 */
export function addTelemetrySink(sink: TelemetrySink): () => void {
  sinks.push(sink);
  return () => {
    const idx = sinks.indexOf(sink);
    if (idx >= 0) sinks.splice(idx, 1);
  };
}

function emit(
  level: TelemetryLevel,
  event: string,
  payload?: { message?: string; traceId?: string; data?: Record<string, unknown> },
): void {
  const evt: TelemetryEvent = {
    timestamp: new Date().toISOString(),
    level,
    event,
    message: payload?.message,
    traceId: payload?.traceId,
    data: payload?.data,
  };
  // sink 故障绝不阻断业务链路
  for (const sink of sinks) {
    try {
      sink(evt);
    } catch {
      // 静默：遥测自身异常不产生二次风暴
    }
  }
}

export const telemetry = {
  debug: (event: string, payload?: { message?: string; traceId?: string; data?: Record<string, unknown> }) =>
    emit('debug', event, payload),
  info: (event: string, payload?: { message?: string; traceId?: string; data?: Record<string, unknown> }) =>
    emit('info', event, payload),
  warn: (event: string, payload?: { message?: string; traceId?: string; data?: Record<string, unknown> }) =>
    emit('warn', event, payload),
  error: (event: string, payload?: { message?: string; traceId?: string; data?: Record<string, unknown> }) =>
    emit('error', event, payload),
  /**
   * 审计事件：记录"谁在何时对什么做了什么"（what=action，whom=target，可选 detail）
   * 事件名规约 audit.{action}；data 携带 action/target 平铺字段，便于采集端直接检索
   * traceId 可外部传入（关联同链路的业务事件）；缺省时本地生成，保证审计事件永不缺链
   */
  audit: (action: string, target: string, detail?: Record<string, unknown>, traceId?: string) =>
    emit('info', `audit.${action}`, {
      traceId: traceId ?? createTraceId(),
      data: { action, target, ...detail },
    }),
};

/**
 * 安装全局错误兜底钩子（window.onerror + unhandledrejection）
 * 返回卸载函数；非浏览器环境为 no-op
 */
export function installGlobalErrorHooks(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleError = (event: ErrorEvent): void => {
    telemetry.error('runtime.uncaught_error', {
      message: event.message,
      traceId: createTraceId(),
      data: {
        filename: event.filename || undefined,
        lineno: event.lineno || undefined,
        colno: event.colno || undefined,
      },
    });
  };

  const handleRejection = (event: PromiseRejectionEvent): void => {
    const reason = event.reason;
    telemetry.error('runtime.unhandled_rejection', {
      message: reason instanceof Error ? reason.message : String(reason),
      traceId: createTraceId(),
    });
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);
  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
}
