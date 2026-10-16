/**
 * file: gateEvaluation.test.ts
 * description: 四道质量门禁判定与放行率领域推导单测
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[domain],[gate]
 */

import { describe, expect, it } from "vitest"
import { GATES } from "../src/domain/constants"
import {
  evaluateQualityGates,
  releaseRatePct,
} from "../src/domain/gateEvaluation"

const allPassInput = {
  consistency: 91.4,
  syncnet: 0.84,
  piiBypassCount: 0,
  secretIncidents: 0,
}

describe("evaluateQualityGates", () => {
  it("全达标输入 → 四道门禁全部通过", () => {
    const results = evaluateQualityGates(allPassInput)
    expect(results).toHaveLength(4)
    expect(results.every((g) => g.passed)).toBe(true)
  })

  it("门禁 1：一致性达到 GATES.CONSISTENCY 阈值判定（边界含等号）", () => {
    const pass = evaluateQualityGates({
      ...allPassInput,
      consistency: GATES.CONSISTENCY,
    })
    const fail = evaluateQualityGates({
      ...allPassInput,
      consistency: GATES.CONSISTENCY - 0.1,
    })
    expect(pass[0].passed).toBe(true)
    expect(fail[0].passed).toBe(false)
    expect(pass[0].value).toBe("80%")
    expect(pass[0].threshold).toContain("≥ 80%")
  })

  it("门禁 2：SyncNet 达到 GATES.SYNCNET 阈值判定（边界含等号）", () => {
    const pass = evaluateQualityGates({ ...allPassInput, syncnet: GATES.SYNCNET })
    const fail = evaluateQualityGates({
      ...allPassInput,
      syncnet: GATES.SYNCNET - 0.01,
    })
    expect(pass[1].passed).toBe(true)
    expect(fail[1].passed).toBe(false)
    expect(pass[1].value).toBe("0.75")
  })

  it("门禁 3：PII 绕过非零即 FAIL，展示值带计数", () => {
    const results = evaluateQualityGates({ ...allPassInput, piiBypassCount: 2 })
    expect(results[2].passed).toBe(false)
    expect(results[2].value).toBe("2 泄漏")
  })

  it("门禁 4：密钥事故非零即 FAIL 且展示计数，零事故展示零入库", () => {
    const fail = evaluateQualityGates({ ...allPassInput, secretIncidents: 1 })
    const pass = evaluateQualityGates(allPassInput)
    expect(fail[3].passed).toBe(false)
    expect(fail[3].value).toBe("1 起")
    expect(pass[3].value).toBe("零入库")
  })
})

describe("releaseRatePct", () => {
  it("按队列 passed/total 计算一位小数百分比", () => {
    expect(releaseRatePct(3, 4)).toBe("75.0%")
    expect(releaseRatePct(96.2, 100)).toBe("96.2%")
  })

  it("全过为 100.0%，空队列为 0.0%", () => {
    expect(releaseRatePct(7, 7)).toBe("100.0%")
    expect(releaseRatePct(0, 0)).toBe("0.0%")
  })

  it("四舍五入到一位小数", () => {
    expect(releaseRatePct(1, 3)).toBe("33.3%")
    expect(releaseRatePct(2, 3)).toBe("66.7%")
  })
})
