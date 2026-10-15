/**
 * file: constants.ts
 * description: 领域常量 · 质量门禁阈值单一事实源
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [domain],[constants],[gates]
 *
 * brief: 全站门禁阈值唯一来源，视图/数据/测试共同引用，禁止在业务文件硬编码
 *
 * exports: GATES, formatGatePercent, formatGateDecimal
 */

/** 工业化交付质量门禁阈值（单一事实源） */
export const GATES = {
  /** 人物面部特征一致性门禁（百分比，0-100） */
  CONSISTENCY: 80,
  /** SyncNet 唇形吻合门禁（0-1） */
  SYNCNET: 0.75,
  /** 质量复检最大轮次（超过即熔断） */
  MAX_REVIEW_ROUNDS: 2,
} as const;

/** 门禁模拟事故样本分（演示注入的事故值，非阈值；用于 GATE-FAIL 演示与 metric 上报） */
export const GATE_SIM_SAMPLE_SCORE = 74.8;

/** 百分比门禁展示文案：≥ 80% */
export function formatGatePercent(value: number): string {
  return `≥ ${value}%`;
}

/** 小数门禁展示文案：≥ 0.75 */
export function formatGateDecimal(value: number): string {
  return `≥ ${value}`;
}
