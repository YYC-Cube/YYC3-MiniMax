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
 * dependencies: telemetry
 * exports: revealPiiRaw, PiiRawPayload
 */

import { telemetry } from './telemetry';

export interface PiiRawPayload {
  raw: string;
}

/** 受控接口地址（构建时注入；Next.js 约定 NEXT_PUBLIC_ 前缀变量内联到客户端） */
const ENDPOINT = process.env.NEXT_PUBLIC_PII_REVEAL_API;

/**
 * SIM 演示原文映射（仅本地开发/演示用）。
 * 安全约定：均为文档保留格式假数据（见 qualityData.ts 样本安全说明）。
 * 生产环境：删除本映射，原文只存在于后端受控存储。
 */
const DEMO_RAW: Record<string, string> = {
  'pii-1': '“这是我的保密专线：138-0000-0000，不要泄露。”',
  'pii-2': 'API_ENDPOINT=10.253.0.10:8000; KEY=sk-DEMO-0000000000',
  'pii-3': '反派假证件登记号：110101199002299590',
  'pii-4': '片尾字幕致谢含未公开内部研制编号: YYC3-PROJ-ORBIT-09',
};

/**
 * 按审计记录 ID 受控调取 PII 原文（异步契约，与生产接口签名一致）
 * @throws 未知 logId 或接口拒绝（403/500）时抛错，由调用方提示
 */
export async function revealPiiRaw(logId: string): Promise<PiiRawPayload> {
  // 调取即审计：who/when 由遥测时间戳与用户态补全，target=logId
  telemetry.audit('pii.reveal.request', logId);

  if (ENDPOINT) {
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(logId)}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      telemetry.warn('pii.reveal.denied', { data: { logId, status: res.status } });
      throw new Error(`PII 原文调取被拒绝（HTTP ${res.status}）`);
    }
    return (await res.json()) as PiiRawPayload;
  }

  // SIM：微任务级异步，保持与生产路径一致的 await 语义
  await Promise.resolve();
  const demo = DEMO_RAW[logId];
  if (!demo) throw new Error(`未知 PII 审计记录: ${logId}`);
  return { raw: `${demo}（SIM 演示原文 · 生产环境由受控接口下发）` };
}
