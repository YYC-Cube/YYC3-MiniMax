/**
 * file: opsView.ts
 * description: 领域推导 · 算力/ReAct 状态语义与内存占用率单一事实源
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [domain],[ops],[view]
 *
 * brief: 内存占用率与节点/ReAct 步状态标签·色调的唯一推导来源，视图层禁止重复内联计算
 *
 * dependencies: types
 *
 * exports: memUsagePct, OPS_STATUS_LABEL, OPS_STATUS_TONE, REACT_STEP_STATUS_LABEL, REACT_STEP_STATUS_TONE, StatusTone
 */

import type { OpsNode, ReActStep } from "../types"

/** 状态色调令牌：与 StatusPill 组件共用的视觉语义（非具体样式，映射在 UI 层） */
export type StatusTone = "accent" | "ok" | "muted" | "warn" | "danger"

/** 内存占用率（%，0-100 上限）：used/total 四舍五入后封顶 100 */
export function memUsagePct(used: number, total: number): number {
  return Math.min(100, Math.round((used / total) * 100))
}

/** 算力节点状态标签 */
export const OPS_STATUS_LABEL: Record<OpsNode["status"], string> = {
  online: "在线",
  warn: "高负载",
  critical: "告警",
}

/** 算力节点状态色调 */
export const OPS_STATUS_TONE: Record<OpsNode["status"], StatusTone> = {
  online: "ok",
  warn: "warn",
  critical: "danger",
}

/** ReAct 步状态标签 */
export const REACT_STEP_STATUS_LABEL: Record<ReActStep["status"], string> = {
  pending: "待命",
  running: "执行中",
  completed: "已完成",
  loopback: "回环",
}

/** ReAct 步状态色调 */
export const REACT_STEP_STATUS_TONE: Record<ReActStep["status"], StatusTone> = {
  running: "accent",
  completed: "ok",
  loopback: "ok",
  pending: "muted",
}
