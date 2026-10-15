/**
 * file: piiReveal.ts
 * description: PII 原文受控调取服务（诊断 #21 完整版·前端契约）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [service],[security],[pii]
 *
 * brief: 原始高危数据永不出前端数据包——原文仅能经本服务从受控接口按次调取
 *
 * details:
 * 前端契约（本模块已落地）：
 * - 构建产物不包含任何 PII 原文（qualityData 仅下发 maskedSnippet）
 * - 视图层禁止直取原文，必须经 revealPiiRaw() 异步调取
 * - 每次调取自动产生 audit.pii.reveal.request 审计事件（含 traceId）
 *
 * 生产后端要求（接口配合，缺一不可）：
 * 1. 接口契约: GET {NEXT_PUBLIC_PII_REVEAL_API}/{logId} → 200 { raw: string }，403 拒绝
 * 2. RBAC: 服务端校验"安全员"角色（前端隐藏入口不构成权限控制）
 * 3. 服务端审计: 落库 who/when/logId/审批链，与前端遥测事件可经 traceId 关联
 * 4. 限流: 单账号限次（防批量导出），响应不缓存（Cache-Control: no-store）
 * 5. 凭证: 同源 Cookie 或短时票据，禁止长期 token 暴露于查询串
 *
 * SIM 模式（未配置 NEXT_PUBLIC_PII_REVEAL_API 时）：
 * 返回本地演示原文并显式标注。生产环境必须配置接口后删除 DEMO_RAW 映射。
 *
 * 离线降级（诊断 #37：公网部署无网关时的可用性闭环）：
 * - 网关不可达（fetch 抛错）时回退「掩码快照」——复用 qualityData 的 maskedSnippet；
 * - 不在前端缓存原文，符合后端契约「响应不缓存（no-store）」；
 * - 降级与成功路径均发射 metric 指标（available/latency_ms），可观测闭环。
 *
 * dependencies: telemetry, data/qualityData
 * exports: revealPiiRaw, PiiRawPayload
 */

import { PII_AUDIT_LOGS } from '../data/qualityData';
import { createTraceId, telemetry } from './telemetry';

export interface PiiRawPayload {
  raw: string;
}

/** 受控接口地址（构建时内联 NEXT_PUBLIC_ 前缀变量；按次读取便于测试注入） */
const endpoint = (): string | undefined => process.env.NEXT_PUBLIC_PII_REVEAL_API;

/** 离线降级快照：logId → 掩码文本（不含任何原文，可直接随包分发） */
const MASKED_SNAPSHOTS = new Map<string, string>(
  PII_AUDIT_LOGS.map((log) => [log.id, log.maskedSnippet]),
);

/**
 * SIM 演示原文映射（仅本地开发/演示用）。
 * 安全约定（诊断 #21）：
 * - 不含任何真实凭据形态（密钥 sk-* / 真实端点 / 内部研制编号均已去除或脱敏）；
 * - 仅保留文档保留格式占位（零熵手机号、非法日期证件号），可被 gitleaks 直接放行；
 * - 生产环境必须删除本映射，原文只存在于后端受控存储，经受控接口按次下发。
 */
const DEMO_RAW: Record<string, string> = {
  'pii-1': '“这是我的保密专线：138-0000-0000，不要泄露。”',
  'pii-2': 'API_ENDPOINT=<REDACTED>:8000; KEY=<REDACTED-API-KEY>',
  'pii-3': '反派假证件登记号：110101199002299590',
  'pii-4': '片尾字幕致谢含未公开内部研制编号: [编号已脱敏]',
};

/**
 * 按审计记录 ID 受控调取 PII 原文（异步契约，与生产接口签名一致）
 * - 单次调取生成共享 traceId：审计/告警/指标同链路可串联
 * - 网关不可达时回退掩码快照（离线降级），不在前端缓存原文
 * @throws 未知 logId、接口拒绝（403/500）或网关不可达且无降级快照时抛错，由调用方提示
 */
export async function revealPiiRaw(logId: string): Promise<PiiRawPayload> {
  // 调取即审计：who/when 由遥测时间戳与用户态补全，target=logId
  const traceId = createTraceId();
  telemetry.audit('pii.reveal.request', logId, undefined, traceId);

  const api = endpoint();
  if (api) {
    const startedAt = Date.now();
    let res: Response;
    try {
      res = await fetch(`${api}/${encodeURIComponent(logId)}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    } catch {
      // 网络级失败（离线/DNS/网关未启动）：结构化告警 + 掩码快照降级，不缓存原文
      telemetry.warn('pii.reveal.gateway_unreachable', { traceId, data: { logId } });
      telemetry.metric('pii.reveal.available', 0, { traceId, tags: { logId } });
      const masked = MASKED_SNAPSHOTS.get(logId);
      if (masked !== undefined) {
        return { raw: `${masked}（离线降级快照 · 网关不可达，恢复后可调取原文）` };
      }
      throw new Error(`PII 网关不可达且无降级快照: ${logId}`);
    }
    if (!res.ok) {
      telemetry.warn('pii.reveal.denied', { traceId, data: { logId, status: res.status } });
      telemetry.metric('pii.reveal.available', 0, { traceId, tags: { logId, status: res.status } });
      throw new Error(`PII 原文调取被拒绝（HTTP ${res.status}）`);
    }
    telemetry.metric('pii.reveal.latency_ms', Date.now() - startedAt, { traceId });
    telemetry.metric('pii.reveal.available', 1, { traceId });
    return (await res.json()) as PiiRawPayload;
  }

  // SIM：微任务级异步，保持与生产路径一致的 await 语义
  await Promise.resolve();
  const demo = DEMO_RAW[logId];
  if (!demo) throw new Error(`未知 PII 审计记录: ${logId}`);
  return { raw: `${demo}（SIM 演示原文 · 生产环境由受控接口下发）` };
}
