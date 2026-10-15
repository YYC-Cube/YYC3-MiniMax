/**
 * file: telemetry.test.ts
 * description: 可观测性单测 · traceId 生成/sink 结构化输出/全局错误钩子
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [test],[unit],[telemetry]
 *
 * test-target: src/services/telemetry.ts
 * notes: 使用 Vitest + happy-dom（window 可用）
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addTelemetrySink,
  createTraceId,
  installGlobalErrorHooks,
  telemetry,
  type TelemetryEvent,
} from '../src/services/telemetry';

describe('createTraceId', () => {
  it('生成唯一且非空 traceId', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createTraceId()));
    expect(ids.size).toBe(100);
    for (const id of ids) {
      expect(id.length).toBeGreaterThan(8);
    }
  });
});

describe('telemetry 结构化输出', () => {
  const cleanupFns: Array<() => void> = [];

  afterEach(() => {
    for (const fn of cleanupFns.splice(0)) fn();
  });

  it('事件携带 level/event/timestamp 且 sink 可捕获', () => {
    const captured: TelemetryEvent[] = [];
    cleanupFns.push(addTelemetrySink((e) => captured.push(e)));

    telemetry.info('test.event', { message: 'hello', traceId: 't-1', data: { k: 1 } });

    expect(captured).toHaveLength(1);
    const evt = captured[0]!;
    expect(evt.level).toBe('info');
    expect(evt.event).toBe('test.event');
    expect(evt.message).toBe('hello');
    expect(evt.traceId).toBe('t-1');
    expect(evt.data).toEqual({ k: 1 });
    expect(evt.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('单 sink 故障不阻断其余 sink 与业务调用', () => {
    const captured: TelemetryEvent[] = [];
    cleanupFns.push(addTelemetrySink(() => { throw new Error('sink down'); }));
    cleanupFns.push(addTelemetrySink((e) => captured.push(e)));

    expect(() => telemetry.error('test.sink_failure')).not.toThrow();
    expect(captured).toHaveLength(1);
    expect(captured[0]!.event).toBe('test.sink_failure');
  });

  it('addTelemetrySink 返回卸载函数', () => {
    const captured: TelemetryEvent[] = [];
    const remove = addTelemetrySink((e) => captured.push(e));
    telemetry.info('test.before_remove');
    remove();
    telemetry.info('test.after_remove');
    expect(captured).toHaveLength(1);
    expect(captured[0]!.event).toBe('test.before_remove');
  });

  it('audit 产出 audit.{action} 事件并携带 target/detail 与 traceId', () => {
    const captured: TelemetryEvent[] = [];
    cleanupFns.push(addTelemetrySink((e) => captured.push(e)));

    telemetry.audit('gate.pass', 'sb-103', { shotCode: 'EP03-SC03-SH02', reviewRound: 1 });

    expect(captured).toHaveLength(1);
    const evt = captured[0]!;
    expect(evt.level).toBe('info');
    expect(evt.event).toBe('audit.gate.pass');
    expect(evt.traceId).toBeTruthy();
    expect(evt.data).toEqual({
      action: 'gate.pass',
      target: 'sb-103',
      shotCode: 'EP03-SC03-SH02',
      reviewRound: 1,
    });
  });

  it('audit 支持外部传入 traceId 以关联同链路业务事件', () => {
    const captured: TelemetryEvent[] = [];
    cleanupFns.push(addTelemetrySink((e) => captured.push(e)));

    telemetry.audit('gate.simulate_failure', 'image', undefined, 'trace-shared-1');

    expect(captured[0]!.event).toBe('audit.gate.simulate_failure');
    expect(captured[0]!.traceId).toBe('trace-shared-1');
  });

  it('metric 事件：metric.{name} 规约，平铺 name/value/unit 且可携带外部 traceId', () => {
    const captured: TelemetryEvent[] = [];
    cleanupFns.push(addTelemetrySink((e) => captured.push(e)));

    telemetry.metric('gate.consistency_pct', 74.8, { unit: '%', traceId: 'trace-metric-1' });

    const evt = captured.find((e) => e.event === 'metric.gate.consistency_pct');
    expect(evt?.level).toBe('info');
    expect(evt?.traceId).toBe('trace-metric-1');
    expect(evt?.data).toEqual({ name: 'gate.consistency_pct', value: 74.8, unit: '%' });
  });

  it('metric 缺省 traceId 时本地生成，保证指标事件永不缺链', () => {
    const captured: TelemetryEvent[] = [];
    cleanupFns.push(addTelemetrySink((e) => captured.push(e)));

    telemetry.metric('pii.reveal.latency_ms', 12);

    expect(captured[0]!.event).toBe('metric.pii.reveal.latency_ms');
    expect(captured[0]!.traceId).toBeTruthy();
  });
});

describe('installGlobalErrorHooks（happy-dom）', () => {
  const cleanupFns: Array<() => void> = [];

  afterEach(() => {
    for (const fn of cleanupFns.splice(0)) fn();
    vi.restoreAllMocks();
  });

  it('捕获 window error 并输出结构化事件', () => {
    const captured: TelemetryEvent[] = [];
    cleanupFns.push(addTelemetrySink((e) => captured.push(e)));
    cleanupFns.push(installGlobalErrorHooks());

    const err = new Error('boom');
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: err }));

    expect(captured).toHaveLength(1);
    const evt = captured[0]!;
    expect(evt.level).toBe('error');
    expect(evt.event).toBe('runtime.uncaught_error');
    expect(evt.message).toBe('boom');
    expect(evt.traceId).toBeTruthy();
  });

  it('卸载后不再捕获', () => {
    const captured: TelemetryEvent[] = [];
    cleanupFns.push(addTelemetrySink((e) => captured.push(e)));
    const uninstall = installGlobalErrorHooks();
    uninstall();

    window.dispatchEvent(new ErrorEvent('error', { message: 'after-uninstall' }));

    expect(captured).toHaveLength(0);
  });
});
