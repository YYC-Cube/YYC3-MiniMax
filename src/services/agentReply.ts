/**
 * file: agentReply.ts
 * description: W1 浮窗语义路由服务 · 关键词意图解析 + mock Agent 回复生成
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [service],[nlu],[widget]
 *
 * brief: 纯函数语义路由：质检/生产/成本三类意图 + 兜底回显，接真实 LLM 时仅替换实现
 *
 * details:
 * - 意图优先级：质检 > 生产 > 成本 > 兜底（"继续生产"命中生产而非兜底）
 * - 返回 intent 标识便于测试与遥测埋点
 * - referenceCard 提供阶段跳转锚点（与 ChatMessage 契约一致）
 *
 * dependencies: types（仅类型）
 * exports: WidgetIntent, AgentReplyResult, resolveAgentReply
 */

import { formatGatePercent, GATES } from '../domain/constants';
import type { ChatMessage } from '../types';

export type WidgetIntent = 'quality' | 'production' | 'cost' | 'fallback';

export interface AgentReplyResult {
  intent: WidgetIntent;
  text: string;
  referenceCard?: ChatMessage['referenceCard'];
}

export interface ResolveAgentReplyOptions {
  /** 当前对话 Agent 显示名（兜底回显署名用） */
  activeAgentName: string;
}

/** 质检/门禁关键词 → 格物·宗师质检看板（阈值文案由 GATES 单源派生，禁止字面量） */
function qualityReply(): AgentReplyResult {
  return {
    intent: 'quality',
    text: `**格物·宗师** 已就绪：当前人物一致性均值为 **91.4%**，高于门禁阈值 ${formatGatePercent(GATES.CONSISTENCY)}。仅分镜 #SH02 早期触发过 1 次复检，已修复重跑达标。`,
    referenceCard: {
      type: 'audit',
      targetId: 'image',
      title: '质检门禁实时看板',
      desc: '点击直达 P2 图像生成一致性门禁卡片',
    },
  };
}

/** 下一集/生产/继续 → 元启·天枢生产调度 */
function productionReply(): AgentReplyResult {
  return {
    intent: 'production',
    text: `**元启·天枢**：指令已确认！调度内核已向 **言启·千行** 发送第 4 集剧本大纲抽取任务，Milvus 知识库注入已并行触发。预计 4.2 分钟后交付分镜。`,
    referenceCard: {
      type: 'task',
      targetId: 'novel',
      title: '工单 #TASK-EP04-INIT',
      desc: '已将任务下发至阶段① 小说立项',
    },
  };
}

/** 成本 → 预见·先知成本报告 */
function costReply(): AgentReplyResult {
  return {
    intent: 'cost',
    text: `**预见·先知**：当前平均单集生产成本为 **¥1.42** (远优于目标 ≤¥2.00)；GPU 显存利用率健康，单位算力产出比提升 28.9%。`,
  };
}

/** 兜底：回显指令 + ReAct-C 闭环话术 */
function fallbackReply(text: string, activeAgentName: string): AgentReplyResult {
  return {
    intent: 'fallback',
    text: `**${activeAgentName}**：已收到您的指令：“${text}”。ReAct-C 正在进行「意图解析→知识匹配→方案决策」闭环流转，已同步推送到流水线控制总线。`,
  };
}

/**
 * 解析用户指令并生成 Agent 回复（纯函数，mock NLU）
 * 接入真实 LLM 时替换本函数实现，调用方契约不变
 */
export function resolveAgentReply(text: string, options: ResolveAgentReplyOptions): AgentReplyResult {
  if (text.includes('质检') || text.includes('门禁')) {
    return qualityReply();
  }
  if (text.includes('下一集') || text.includes('生产') || text.includes('继续')) {
    return productionReply();
  }
  if (text.includes('成本')) {
    return costReply();
  }
  return fallbackReply(text, options.activeAgentName);
}
