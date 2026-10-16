/**
 * file: reactSteps.ts
 * description: 数据层 · ReAct-C 九步闭环定义
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [data],[react],[orchestration]
 *
 * brief: ReAct-C 九步闭环步骤/责任成员/驱动模型定义
 *
 * exports: REACT_STEPS
 */

import { GATES, formatGatePercent } from "../domain/constants"
import { ReActStep } from "../types"

export const REACT_STEPS: ReActStep[] = [
  {
    step: 1,
    name: "输入安全过滤",
    enName: "Input Safety Guard",
    agentId: "shouhu",
    agentName: "智云·守护",
    color: "#00FF88",
    model: "deepseek-v4-guard",
    tokensIn: 340,
    tokensOut: 64,
    durationMs: 82,
    description: "过滤越狱指令、敏感词汇、涉政涉暴检测与PII隐私实体初筛。",
    status: "completed",
  },
  {
    step: 2,
    name: "意图识别路由",
    enName: "Intent Routing",
    agentId: "qianxing",
    agentName: "言启·千行",
    color: "#FFD700",
    model: "deepseek-v4-pro",
    tokensIn: 412,
    tokensOut: 128,
    durationMs: 145,
    description: "语义解析为生产工单，提取分镜镜头数、情感基调与目标风格槽位。",
    status: "completed",
  },
  {
    step: 3,
    name: "RAG 知识注入",
    enName: "RAG Knowledge Injection",
    agentId: "qianxing",
    agentName: "Milvus 向量中枢",
    color: "#00F0FF",
    model: "milvus-hybrid-search",
    tokensIn: 890,
    tokensOut: 520,
    durationMs: 64,
    description:
      "检索 IP 世界观原著、角色形象 LoRA 资产索引与前序剧集记忆向量。",
    status: "completed",
  },
  {
    step: 4,
    name: "分析+预测并行",
    enName: "Parallel Analysis & Prediction",
    agentId: "wanwu",
    agentName: "语枢·万物 ‖ 预见·先知",
    color: "#00E5FF",
    model: "claude-3.7-sonnet + nemotron-4",
    tokensIn: 1840,
    tokensOut: 960,
    durationMs: 420,
    description:
      "语枢生成 12 字段分镜骨架；预见并发推演留存峰值与口型 SyncNet 难度。",
    status: "running",
  },
  {
    step: 5,
    name: "报告润色",
    enName: "Script Refinement",
    agentId: "lingyun",
    agentName: "创想·灵韵",
    color: "#BF00FF",
    model: "flux-pro-cinema / gemini-1.5-pro",
    tokensIn: 1420,
    tokensOut: 810,
    durationMs: 310,
    description: "丰富场景视效修饰词，重构光影色温与微表情动态描写。",
    status: "pending",
  },
  {
    step: 6,
    name: "全局汇总决策",
    enName: "Global Arbitration",
    agentId: "tianshu",
    agentName: "元启·天枢",
    color: "#00F0FF",
    model: "nemotron-super-120b",
    tokensIn: 2200,
    tokensOut: 480,
    durationMs: 180,
    description: "汇总多智能体产物，核验计算资源与预算约束，批准进入渲染阶段。",
    status: "pending",
  },
  {
    step: 7,
    name: "质量校验复检",
    enName: `Quality Verification (≤${GATES.MAX_REVIEW_ROUNDS} R)`,
    agentId: "zongshi",
    agentName: "格物·宗师",
    color: "#C0C0C0",
    model: "qwen-2.5-max-eval",
    tokensIn: 1650,
    tokensOut: 320,
    durationMs: 240,
    description: `面部特征一致性 ${formatGatePercent(GATES.CONSISTENCY)} 严格比对；若未达标则触发红色虚线回环至 Step 5。`,
    status: "pending",
  },
  {
    step: 8,
    name: "输出审计脱敏",
    enName: "Output Audit & Masking",
    agentId: "shouhu",
    agentName: "智云·守护",
    color: "#00FF88",
    model: "deepseek-v4-guard",
    tokensIn: 980,
    tokensOut: 210,
    durationMs: 95,
    description: "成片前最终水印签名、PII 残留清洗与版权数字盲水印嵌入。",
    status: "pending",
  },
  {
    step: 9,
    name: "画像更新推荐",
    enName: "Persona Profile Feedback",
    agentId: "bole",
    agentName: "知遇·伯乐",
    color: "#FF006E",
    model: "deepseek-v4-recommender",
    tokensIn: 640,
    tokensOut: 180,
    durationMs: 110,
    description: "将分镜节奏与受众反馈埋点更新至画像特征库，指导后续剧集调优。",
    status: "pending",
  },
]
