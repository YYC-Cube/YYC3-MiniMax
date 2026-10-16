/**
 * file: domain-constants.test.ts
 * description: 领域常量门禁单测 · 阈值单一事实源一致性
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [test],[unit],[domain]
 *
 * test-target: src/domain/constants.ts
 * notes: 防止阈值回归与跨文件漂移（诊断项 #25 前置守卫）
 */

import { describe, expect, it } from "vitest"
import { AUDIT_STORYBOARDS } from "../src/data/qualityData"
import {
  GATES,
  formatGateDecimal,
  formatGatePercent,
} from "../src/domain/constants"

describe("GATES 单一事实源", () => {
  it("门禁阈值为行业契约值（一致性 80 / SyncNet 0.75 / 复检 ≤2 轮）", () => {
    expect(GATES.CONSISTENCY).toBe(80)
    expect(GATES.SYNCNET).toBe(0.75)
    expect(GATES.MAX_REVIEW_ROUNDS).toBe(2)
  })

  it("passed 样本全部达标；低于门禁的样本可被阈值正确识别", () => {
    for (const sb of AUDIT_STORYBOARDS) {
      if (sb.status === "passed") {
        expect(sb.consistencyScore).toBeGreaterThanOrEqual(GATES.CONSISTENCY)
      }
    }
    const belowGateIds = AUDIT_STORYBOARDS.filter(
      (s) => s.consistencyScore < GATES.CONSISTENCY,
    ).map((s) => s.id)
    expect(belowGateIds).toEqual(["sb-103"])
  })

  it("格式化函数输出稳定文案", () => {
    expect(formatGatePercent(GATES.CONSISTENCY)).toBe("≥ 80%")
    expect(formatGateDecimal(GATES.SYNCNET)).toBe("≥ 0.75")
  })
})
