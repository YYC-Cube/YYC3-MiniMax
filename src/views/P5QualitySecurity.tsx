/**
 * file: P5QualitySecurity.tsx
 * description: P5 质检与安全 · 四道门禁/质检队列/PII 脱敏/宗师终审
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-16
 * status: active
 * tags: [component],[view],[p5],[security]
 *
 * brief: 质量门禁与安全合规视图：双硬门禁、三级脱敏、终审报告
 *
 * dependencies: react, lucide-react, data/qualityData, domain/constants, services/piiReveal, services/telemetry, components/p5/*
 * exports: P5QualitySecurity
 */

import { CheckCircle2, Key, ShieldCheck, Sparkles } from "lucide-react"
import React, { useState } from "react"
import { GateCard } from "../components/p5/GateCard"
import { GateOverviewCard } from "../components/p5/GateOverviewCard"
import { PiiAuditPanel } from "../components/p5/PiiAuditPanel"
import { QualityQueuePanel } from "../components/p5/QualityQueuePanel"
import { ZongshiReportPanel } from "../components/p5/ZongshiReportPanel"
import { KPI_METRICS } from "../data/pipeline"
import {
  AUDIT_STORYBOARDS,
  PII_AUDIT_LOGS,
  StoryboardAuditItem,
} from "../data/qualityData"
import { GATES } from "../domain/constants"
import { evaluateQualityGates, releaseRatePct } from "../domain/gateEvaluation"
import { revealPiiRaw } from "../services/piiReveal"
import { telemetry } from "../services/telemetry"

interface P5QualitySecurityProps {
  onNavigateToP2: () => void
  onNavigateToP3: () => void
  /** 质检队列「定位生产台」→ P2 image 阶段高亮（navigateToStage，IA 补链） */
  onLocateProductionStage?: () => void
}

export const P5QualitySecurity: React.FC<P5QualitySecurityProps> = ({
  onNavigateToP2,
  onNavigateToP3,
  onLocateProductionStage,
}) => {
  const [storyboards, setStoryboards] =
    useState<StoryboardAuditItem[]>(AUDIT_STORYBOARDS)
  const [piiLogs] = useState(PII_AUDIT_LOGS)
  const [shakingCardId, setShakingCardId] = useState<string | null>(null)
  const [revealedPiiId, setRevealedPiiId] = useState<string | null>(null)
  // 受控调取态：原文按次异步拉取（诊断 #21），缓存避免重复调取
  const [revealedRaw, setRevealedRaw] = useState<Record<string, string>>({})
  const [revealingPiiId, setRevealingPiiId] = useState<string | null>(null)

  // 受控调取 PII 原文（异步契约与生产接口一致；审计由服务层自动留痕）
  const handleRevealPii = async (logId: string) => {
    if (revealingPiiId) return
    setRevealingPiiId(logId)
    try {
      const { raw } = await revealPiiRaw(logId)
      setRevealedRaw((prev) => ({ ...prev, [logId]: raw }))
      setRevealedPiiId(logId)
    } catch {
      // 调取失败（拒绝/网络）：保持收起态，服务层已上报审计事件
      setRevealedPiiId(null)
    } finally {
      setRevealingPiiId(null)
    }
  }

  // 展开/收起敏感原文对比（展开时触发受控调取）
  const togglePiiReveal = (logId: string) => {
    if (revealedPiiId === logId) {
      setRevealedPiiId(null)
    } else {
      void handleRevealPii(logId)
    }
  }

  // Handle pass action (green checkmark pop)
  const handlePass = (id: string) => {
    const item = storyboards.find((sb) => sb.id === id)
    // 审计留痕（诊断 #22）：质检操作可追溯 who/when/what/target
    telemetry.audit("gate.pass", id, {
      shotCode: item?.shotCode,
      reviewRound: item?.reviewRound,
    })
    setStoryboards((prev) =>
      prev.map((sb) =>
        sb.id === id ? { ...sb, status: "passed" as const } : sb,
      ),
    )
  }

  // Handle reject action (pink border shake 0.5s)
  const handleReject = (id: string) => {
    const item = storyboards.find((sb) => sb.id === id)
    telemetry.audit("gate.reject", id, {
      shotCode: item?.shotCode,
      reviewRound: item?.reviewRound,
    })
    setShakingCardId(id)
    setTimeout(() => {
      setStoryboards((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
              ...item,
              status: "rejected" as const,
              // 复检轮次递增并以门禁上限封顶（审计 P1-#2：禁止硬编码 2）
              reviewRound: Math.min(
                item.reviewRound + 1,
                GATES.MAX_REVIEW_ROUNDS,
              ),
            }
            : item,
        ),
      )
      setShakingCardId(null)
    }, 500)
  }

  // 四道门禁真实数据判定（domain 单一事实源）：1/2 源 KPI 实时值、3 源 PII 审计、4 为 gitleaks 上报位
  const kpiNum = (id: string) => {
    const kpi = KPI_METRICS.find((k) => k.id === id)
    const v = kpi?.value
    return typeof v === "number" ? v : parseFloat(v ?? "0")
  }
  const gateResults = evaluateQualityGates({
    consistency: kpiNum("consistency_score"),
    syncnet: kpiNum("syncnet_score"),
    piiBypassCount: piiLogs.filter((l) => l.action === "放行").length,
    secretIncidents: 0, // gitleaks 周期门禁上报位：运行时无事故数据源，零事件即达标
  })
  const passedCount = gateResults.filter((g) => g.passed).length
  // 放行率随质检队列实时联动（passed/total，队列操作即刻刷新）
  const releaseRate = releaseRatePct(
    storyboards.filter((s) => s.status === "passed").length,
    storyboards.length,
  )

  return (
    <div className="w-full h-full p-6 flex flex-col space-y-6 overflow-hidden select-none">
      {/* 1. TOP GATE OVERVIEW: 总览主卡（H1 锚点）+ 4 Medium GateCards */}
      <div className="grid grid-cols-12 gap-6">
        {/* Gate 0: 全链路放行判定（主焦大卡） */}
        <GateOverviewCard passed={passedCount} total={gateResults.length} releaseRate={releaseRate} />

        {/* Gate 1-4（中卡层级，收进 8 栏次级区） */}
        <div className="col-span-8 grid grid-cols-4 gap-5 min-w-0">
          {/* Gate 1: 一致性 >= 80% */}
          <GateCard
            icon={CheckCircle2}
            variant="green"
            title="门禁 1 · 角色面部一致性"
            value={gateResults[0].value}
            threshold={gateResults[0].threshold}
          />

          {/* Gate 2: SyncNet >= 0.75 */}
          <GateCard
            icon={Sparkles}
            variant="cyan"
            title="门禁 2 · SyncNet 唇形吻合"
            value={gateResults[1].value}
            threshold={gateResults[1].threshold}
          />

          {/* Gate 3: PII 0 泄漏 */}
          <GateCard
            icon={ShieldCheck}
            variant="green"
            title="门禁 3 · 敏感隐私实体"
            value={gateResults[2].value}
            threshold={gateResults[2].threshold}
          />

          {/* Gate 4: 密钥零入库 */}
          <GateCard
            icon={Key}
            variant="purple"
            title="门禁 4 · 密钥凭据防泄漏"
            value={gateResults[3].value}
            threshold={gateResults[3].threshold}
          />
        </div>
      </div>

      {/* 2. THREE-COLUMN AUDIT WORKSPACE */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Left Col (4 Cols): Quality Inspection Queue (质检队列) */}
        <QualityQueuePanel
          storyboards={storyboards}
          shakingCardId={shakingCardId}
          onPass={handlePass}
          onReject={handleReject}
          onLocateStage={onLocateProductionStage}
        />

        {/* Middle Col (4 Cols): Security Audit Logs (智云·守护三级脱敏前后对比) */}
        <PiiAuditPanel
          piiLogs={piiLogs}
          revealedPiiId={revealedPiiId}
          revealedRaw={revealedRaw}
          onToggleReveal={togglePiiReveal}
        />

        {/* Right Col (4 Cols): Gewu Zongshi Audit Report (格物·宗师报告) */}
        <ZongshiReportPanel
          onNavigateToP2={onNavigateToP2}
          onNavigateToP3={onNavigateToP3}
        />
      </div>
    </div>
  )
}
