/**
 * file: gateEvaluation.ts
 * description: 领域推导 · 四道质量门禁判定与放行率单一事实源
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [domain],[gate],[evaluation]
 *
 * brief: P5 门禁总览卡/门禁中卡判定结果的唯一推导来源，视图层禁止内联判定
 *
 * details:
 * - 门禁 1/2（一致性/SyncNet）由 KPI 实时值对比 GATES 阈值判定
 * - 门禁 3/4（PII 绕过/密钥泄漏事故）为零事件门禁：计数为 0 即通过
 * - 放行率 = 质检队列 passed 数 / 总数（随队列操作实时联动）
 *
 * dependencies: domain/constants
 * exports: GateResult, GateEvaluationInput, evaluateQualityGates, releaseRatePct
 */

import { GATES, formatGateDecimal, formatGatePercent } from "./constants"

/** 单道门禁判定结果（视图消费：GateOverviewCard 计数 + GateCard 展示） */
export interface GateResult {
  /** 门禁序号（1-4） */
  id: 1 | 2 | 3 | 4
  /** 展示值文案（如 "91.4%" / "0 泄漏"） */
  value: string
  /** 阈值文案（如 "≥ 80% 达标"） */
  threshold: string
  /** 是否通过 */
  passed: boolean
}

/** 门禁判定输入（视图从 KPI/PII 审计日志等真实数据源提取） */
export interface GateEvaluationInput {
  /** 人物一致性均值（0-100，源自 KPI consistency_score） */
  consistency: number
  /** SyncNet 唇形吻合分（0-1，源自 KPI syncnet_score） */
  syncnet: number
  /** PII 绕过事件数（审计日志 action="放行" 计数，0 为达标） */
  piiBypassCount: number
  /** 密钥凭据泄漏事故数（gitleaks 门禁上报位，0 为达标） */
  secretIncidents: number
}

/** 四道质量门禁判定（顺序即展示顺序，勿改） */
export function evaluateQualityGates(input: GateEvaluationInput): GateResult[] {
  return [
    {
      id: 1,
      value: `${input.consistency}%`,
      threshold: `${formatGatePercent(GATES.CONSISTENCY)} 达标`,
      passed: input.consistency >= GATES.CONSISTENCY,
    },
    {
      id: 2,
      value: `${input.syncnet}`,
      threshold: `${formatGateDecimal(GATES.SYNCNET)} 达标`,
      passed: input.syncnet >= GATES.SYNCNET,
    },
    {
      id: 3,
      value: `${input.piiBypassCount} 泄漏`,
      threshold: "三级脱敏拦截",
      passed: input.piiBypassCount === 0,
    },
    {
      id: 4,
      value: input.secretIncidents === 0 ? "零入库" : `${input.secretIncidents} 起`,
      threshold: "AST 静态阻断",
      passed: input.secretIncidents === 0,
    },
  ]
}

/** 放行率（一位小数百分比文案）：passed/total，total 为 0 时返回 "0.0%" */
export function releaseRatePct(passed: number, total: number): string {
  if (total === 0) return "0.0%"
  return `${(Math.round((passed / total) * 1000) / 10).toFixed(1)}%`
}
