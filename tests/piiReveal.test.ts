/**
 * file: piiReveal.test.ts
 * description: PII 受控调取服务契约单测 · 审计/成功/拒绝/未知 ID + 源码无凭据形态守卫
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[unit],[security],[pii]
 *
 * brief: 覆盖 revealPiiRaw 异步契约（调取即审计 / SIM 原文 / 未知 ID 抛错）与 P0 安全守卫
 *
 * test-target: src/services/piiReveal.ts
 * notes: SIM 模式（未配置 NEXT_PUBLIC_PII_REVEAL_API）下的前端契约保护
 */

import { describe, expect, it, vi } from 'vitest';
import { revealPiiRaw } from '../src/services/piiReveal';
import { telemetry } from '../src/services/telemetry';

describe('revealPiiRaw（PII 受控调取契约 · SIM）', () => {
  it('调取即审计：产生 pii.reveal.request 审计事件（target=logId）', async () => {
    const spy = vi.spyOn(telemetry, 'audit').mockImplementation(() => undefined);
    await revealPiiRaw('pii-1');
    expect(spy).toHaveBeenCalledWith('pii.reveal.request', 'pii-1');
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
