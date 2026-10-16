/**
 * file: agents.ts
 * description: 数据层 · 8 Agent 家族档案（单一事实源）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [data],[agents],[family]
 *
 * brief: 成员档案：徽记/定位/驱动模型/时钟位/霓虹色板
 *
 * exports: AGENTS, AGENT_LIST
 */

import {
  GATES,
  formatGateDecimal,
  formatGatePercent,
} from "../domain/constants"
import { AgentId, AgentInfo } from "../types"

/** 8 位成员档案映射：键为 AgentId 字符串字面量全集，取值穷尽由类型系统保证 */
export const AGENTS: Record<AgentId, AgentInfo> = {
  tianshu: {
    id: "tianshu",
    name: "元启·天枢",
    nick: "天枢",
    title: "天枢总调度 / 全局决策",
    color: "#00F0FF",
    clockPosition: "12:00",
    angleDeg: 0, // Top
    status: "speaking",
    lastActive: "刚刚 (0秒前)",
    role: "统筹全局战略与任务调度，驱动 ReAct-C 核心闭环与多智能体共识决策",
    description: "工业化漫剧流水线主控中枢，负责跨阶段依赖调度与动态资源调配。",
    primaryStage: "小说立项 (阶段①) & 全局决策",
    model: "nemotron-super-120b",
    avatarSeed: "tianshu",
  },
  shouhu: {
    id: "shouhu",
    name: "智云·守护",
    nick: "守护",
    title: "安全合规 / 审计脱敏",
    color: "#00FF88",
    clockPosition: "13:30",
    angleDeg: 45, // Top-right
    status: "online",
    lastActive: "12秒前",
    role: "三级过滤安全防线，执行 PII 零泄漏、内容合规与密钥零入库审查",
    description:
      "全流程守护数据与模型安全，对违规输入/输出执行毫秒级熔断脱敏。",
    primaryStage: "成片交付 (阶段⑤) & 安全审计",
    model: "deepseek-v4-guard",
    avatarSeed: "shouhu",
  },
  zongshi: {
    id: "zongshi",
    name: "格物·宗师",
    nick: "宗师",
    title: "质量校验 / 门禁审查",
    color: "#C0C0C0",
    clockPosition: "15:00",
    angleDeg: 90, // Right
    status: "online",
    lastActive: "4秒前",
    role: `多模态质量门禁把控，严格核验人物一致性${formatGatePercent(GATES.CONSISTENCY)}与事实溯源，≤${GATES.MAX_REVIEW_ROUNDS}轮质量复检`,
    description: "严谨求真的质检大师，确保画面特征、音画质感不漂移。",
    primaryStage: "图像生成 (阶段③) & 成片质检",
    model: "qwen-2.5-max-eval",
    avatarSeed: "zongshi",
  },
  lingyun: {
    id: "lingyun",
    name: "创想·灵韵",
    nick: "灵韵",
    title: "视觉概念 / 艺术生成",
    color: "#BF00FF",
    clockPosition: "16:30",
    angleDeg: 135, // Bottom-right
    status: "speaking",
    lastActive: "刚刚 (1秒前)",
    role: "精研分镜提示词体系、角色设定图谱与高质量图像扩散生成",
    description: "艺术感性与算法精确的交汇者，将文学剧本具象为顶级视效分镜。",
    primaryStage: "分镜设计 (阶段②) & 图像生成 (阶段③)",
    model: "flux-pro-cinema",
    avatarSeed: "lingyun",
  },
  qianxing: {
    id: "qianxing",
    name: "言启·千行",
    nick: "千行",
    title: "意图识别 / 需求路由",
    color: "#FFD700",
    clockPosition: "06:00",
    angleDeg: 180, // Bottom
    status: "online",
    lastActive: "30秒前",
    role: "精准解析用户初始创意意图，执行小说立项语义分解与多轮提示词工程",
    description: "创意破晓之门，将粗糙的故事大纲重构为标准化立项规范包。",
    primaryStage: "小说立项 (阶段①) & 意图路由",
    model: "deepseek-v4-pro",
    avatarSeed: "qianxing",
  },
  wanwu: {
    id: "wanwu",
    name: "语枢·万物",
    nick: "万物",
    title: "分镜Schema / 视频合成",
    color: "#00E5FF",
    clockPosition: "07:30",
    angleDeg: 225, // Bottom-left
    status: "online",
    lastActive: "8秒前",
    role: "构建 12 字段标准化分镜 Schema，统筹口型吻合与动态视频生成流",
    description: "精密结构工程师，架设文本语义向动态视频时序映射的代码桥梁。",
    primaryStage: "剧本分镜 (阶段②) & 视频合成 (阶段④)",
    model: "claude-3.7-sonnet",
    avatarSeed: "wanwu",
  },
  xianzhi: {
    id: "xianzhi",
    name: "预见·先知",
    nick: "先知",
    title: "趋势预测 / SyncNet监测",
    color: "#00BFFF",
    clockPosition: "09:00",
    angleDeg: 270, // Left
    status: "online",
    lastActive: "15秒前",
    role: `实时监测 SyncNet 音画对齐 (目标${formatGateDecimal(GATES.SYNCNET)})，预估全网短剧受众留存与爆款概率`,
    description: "洞悉未来的风向标，用指标概率为每一帧镜头赋能商业竞争力。",
    primaryStage: "视频合成 (阶段④) & 运营反哺 (阶段⑥)",
    model: "nemotron-4-340b",
    avatarSeed: "xianzhi",
  },
  bole: {
    id: "bole",
    name: "知遇·伯乐",
    nick: "伯乐",
    title: "画像推荐 / 运营反哺",
    color: "#FF006E",
    clockPosition: "10:30",
    angleDeg: 315, // Top-left
    status: "online",
    lastActive: "45秒前",
    role: "收集全渠道投放与播放弹幕数据，提炼爆款画像闭环回流至下一季立项",
    description: "慧眼识珠的运营中枢，完成短剧从交付到新一轮孵化的生态闭环。",
    primaryStage: "运营反哺 (阶段⑥) & 画像推荐",
    model: "deepseek-v4-recommender",
    avatarSeed: "bole",
  },
}

export const AGENT_LIST: AgentInfo[] = [
  AGENTS.tianshu,
  AGENTS.shouhu,
  AGENTS.zongshi,
  AGENTS.lingyun,
  AGENTS.qianxing,
  AGENTS.wanwu,
  AGENTS.xianzhi,
  AGENTS.bole,
]
