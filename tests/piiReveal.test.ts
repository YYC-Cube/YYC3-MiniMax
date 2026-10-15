/**
 * file: piiReveal.test.ts
 * description: PII 受控调取服务契约单测 · 审计/成功/拒绝/未知 ID/离线降级 + 源码无凭据形态守卫
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[unit],[security],[pii],[offline]
 *
 * brief: 覆盖 revealPiiRaw 异步契约（SIM/LIVE 双路径）与 P0 安全守卫
 *
 * test-target: src/services/piiReveal.ts
 * notes: LIVE 路径经 vi.stubEnv + fetch mock 注入，不依赖真实网关
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { revealPiiRaw } from '../src/services/piiReveal';
import { addTelemetrySink, telemetry, type TelemetryEvent } from '../src/services/telemetry';

describe('revealPiiRaw（PII 受控调取契约 · SIM）', () => {
  it('调取即审计：产生 pii.reveal.request 审计事件（target=logId，traceId 同链路）', async () => {
    const spy = vi.spyOn(telemetry, 'audit').mockImplementation(() => undefined);
    await revealPiiRaw('pii-1');
    expect(spy).toHaveBeenCalledWith('pii.reveal.request', 'pii-1', undefined, expect.any(String));
    spy.mockRestore();
  });

  it('已知 logId 返回带 SIM 标注的原文（保持与生产一致的 await 语义）', async () => {
    const payload = await revealPiiRaw('pii-1');
    expect(payload.raw).toContain('SIM 演示原文');
  });

  it('未知 logId 抛错，由调用方提示', async () => {
    await expect(revealPiiRaw('pii-unknown')).rejects.toThrow('未知 PII 审计记录');
  });

  it('演示原文不含凭据形态与内部研制编号（P0 安全守卫）', async () => {
    for (const id of ['pii-1', 'pii-2', 'pii-3', 'pii-4']) {
      const { raw } = await revealPiiRaw(id);
      expect(raw).not.toMatch(/sk-[A-Za-z0-9]/);
      expect(raw).not.toMatch(/YYC3-PROJ/);
    }
  });
});

describe('revealPiiRaw（PII 受控调取契约 · LIVE 网关路径）', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('网关不可达：回退掩码快照降级，告警与指标同 traceId 串联', async () => {
    vi.stubEnv('NEXT_PUBLIC_PII_REVEAL_API', 'http://127.0.0.1:8787');
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    const captured: TelemetryEvent[] = [];
    const off = addTelemetrySink((e) => captured.push(e));

    const payload = await revealPiiRaw('pii-1');
    off();

    // 降级内容为掩码快照（不含原文），且显式标注离线降级
    expect(payload.raw).toContain('138-****-0000');
    expect(payload.raw).toContain('离线降级快照');
    const warn = captured.find((e) => e.event === 'pii.reveal.gateway_unreachable');
    expect(warn?.traceId).toBeTruthy();
    const avail = captured.find((e) => e.event === 'metric.pii.reveal.available');
    expect(avail?.data?.value).toBe(0);
    expect(avail?.traceId).toBe(warn?.traceId);
  });

  it('网关不可达且无掩码快照：抛类型化错误，由调用方提示', async () => {
    vi.stubEnv('NEXT_PUBLIC_PII_REVEAL_API', 'http://127.0.0.1:8787');
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('ECONNREFUSED'))));
    await expect(revealPiiRaw('pii-unknown')).rejects.toThrow('PII 网关不可达且无降级快照');
  });

  it('网关正常：返回原文并发射 latency/available 指标（可观测闭环）', async () => {
    vi.stubEnv('NEXT_PUBLIC_PII_REVEAL_API', 'http://127.0.0.1:8787');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ raw: 'GATEWAY-RAW' }),
        }),
      ),
    );
    const captured: TelemetryEvent[] = [];
    const off = addTelemetrySink((e) => captured.push(e));

    const payload = await revealPiiRaw('pii-2');
    off();

    expect(payload.raw).toBe('GATEWAY-RAW');
    const latency = captured.find((e) => e.event === 'metric.pii.reveal.latency_ms');
    expect(typeof latency?.data?.value).toBe('number');
    expect(latency?.data?.value).toBeGreaterThanOrEqual(0);
    expect(captured.find((e) => e.event === 'metric.pii.reveal.available')?.data?.value).toBe(1);
  });

  it('HTTP 拒绝（403）：告警携带 traceId 与 status，指标计数降为 0', async () => {
    vi.stubEnv('NEXT_PUBLIC_PII_REVEAL_API', 'http://127.0.0.1:8787');
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 403 })));
    const captured: TelemetryEvent[] = [];
    const off = addTelemetrySink((e) => captured.push(e));

    await expect(revealPiiRaw('pii-1')).rejects.toThrow('HTTP 403');
    off();

    const denied = captured.find((e) => e.event === 'pii.reveal.denied');
    expect(denied?.traceId).toBeTruthy();
    expect(denied?.data?.status).toBe(403);
    const avail = captured.find((e) => e.event === 'metric.pii.reveal.available');
    expect(avail?.data?.value).toBe(0);
  });
});
