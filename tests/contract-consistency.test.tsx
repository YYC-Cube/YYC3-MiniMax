/**
 * file: contract-consistency.test.tsx
 * description: 数据契约一致性测试（诊断 #25）· 跨文件业务规则/头部指标三方断言
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [test],[contract],[consistency]
 *
 * test-target: data/qualityData × domain/constants × data/pipeline × services/agentReply × components/p2
 * notes: 防止演示数据在多文件手工同步时发生漂移（阈值/头部指标/状态流转）
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { GateFailureModal } from "../src/components/p2/GateFailureModal"
import { PIPELINE_STAGES } from "../src/data/pipeline"
import { AUDIT_STORYBOARDS, PII_AUDIT_LOGS } from "../src/data/qualityData"
import { REACT_STEPS } from "../src/data/reactSteps"
import {
  formatGateDecimal,
  formatGatePercent,
  GATES,
} from "../src/domain/constants"
import { resolveAgentReply } from "../src/services/agentReply"
import { P5QualitySecurity } from "../src/views/P5QualitySecurity"

describe("门禁规则一致性（GATES 单源）", () => {
  it("低于一致性阈值的分镜不得处于 passed 状态", () => {
    for (const sb of AUDIT_STORYBOARDS) {
      if (sb.status === "passed") {
        expect(sb.consistencyScore).toBeGreaterThanOrEqual(GATES.CONSISTENCY)
      }
    }
  })

  it("复检轮次必须在 [1, MAX_REVIEW_ROUNDS] 区间", () => {
    for (const sb of AUDIT_STORYBOARDS) {
      expect(sb.reviewRound).toBeGreaterThanOrEqual(1)
      expect(sb.reviewRound).toBeLessThanOrEqual(GATES.MAX_REVIEW_ROUNDS)
    }
  })

  it("PII 交付数据包不含原文（rawSnippet 已移出前端契约）", () => {
    for (const log of PII_AUDIT_LOGS) {
      expect(log).not.toHaveProperty("rawSnippet")
      expect(log.maskedSnippet.length).toBeGreaterThan(0)
    }
  })
})

describe("阈值文案单一事实源（data 层无独立字面量）", () => {
  it("pipeline 阶段门禁文案由 GATES 派生", () => {
    const imageStage = PIPELINE_STAGES.find((s) => s.id === "image")
    const videoStage = PIPELINE_STAGES.find((s) => s.id === "video")
    expect(imageStage?.keySchemaOrGate).toBe(
      `一致性门禁 ${formatGatePercent(GATES.CONSISTENCY)}`,
    )
    expect(videoStage?.keySchemaOrGate).toBe(
      `SyncNet 唇形吻合 ${formatGateDecimal(GATES.SYNCNET)}`,
    )
  })

  it("质检打回文案与 ReAct 步骤描述由 GATES 派生", () => {
    const sb103 = AUDIT_STORYBOARDS.find((s) => s.id === "sb-103")
    expect(sb103?.rejectReason).toContain(`${GATES.CONSISTENCY}% 门禁`)

    const zongshiStep = REACT_STEPS.find(
      (s) => s.agentId === "zongshi" && s.step === 7,
    )
    expect(zongshiStep?.description).toContain(
      formatGatePercent(GATES.CONSISTENCY),
    )
  })
})

describe("头部指标跨文件一致性（诊断 #10/#25）", () => {
  it("一致性均值三方一致：pipeline.passRate ↔ P5 门禁显示 ↔ agentReply 文案", () => {
    const imageStage = PIPELINE_STAGES.find((s) => s.id === "image")
    expect(imageStage).toBeTruthy()
    const passRate = imageStage!.passRate // '91.4%'

    // W1 语义路由文案引用同一数值
    const reply = resolveAgentReply("查看质检", {
      activeAgentName: "元启·天枢",
    })
    expect(reply.text).toContain(passRate)

    // P5 门禁 1 显示同一数值
    render(
      <P5QualitySecurity
        onNavigateToP2={() => undefined}
        onNavigateToP3={() => undefined}
      />,
    )
    expect(screen.getByText(passRate)).toBeTruthy()

    // 阈值文案由 GATES 派生（agentReply 与 P5 显示一致，无独立字面量）
    expect(reply.text).toContain(formatGatePercent(GATES.CONSISTENCY))
    expect(
      screen.getByText(`${formatGatePercent(GATES.CONSISTENCY)} 达标`),
    ).toBeTruthy()
    expect(
      screen.getByText(`${formatGateDecimal(GATES.SYNCNET)} 达标`),
    ).toBeTruthy()
  })

  it("门禁失败弹窗数值与质检样本 sb-103 一致", () => {
    const sb103 = AUDIT_STORYBOARDS.find((s) => s.id === "sb-103")
    expect(sb103).toBeTruthy()

    render(<GateFailureModal onClose={() => undefined} />)
    // 弹窗中的一致性得分必须来自真实样本数据（74.8）
    const scorePattern = new RegExp(`${sb103!.consistencyScore}%`)
    expect(screen.getAllByText(scorePattern).length).toBeGreaterThan(0)
    // 拦截阈值同样由 GATES 派生
    expect(
      screen.getAllByText(new RegExp(`< ${GATES.CONSISTENCY}\\.0%`)).length,
    ).toBeGreaterThan(0)
  })
})
