/**
 * file: pipeline.ts
 * description: 数据层 · 六阶段流水线/KPI/12 字段分镜 Schema
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [data],[pipeline],[schema]
 *
 * brief: 生产流水线阶段定义、产能 KPI 与 12 字段分镜契约
 *
 * exports: PIPELINE_STAGES, KPI_METRICS, STORYBOARD_12_FIELDS
 */

import {
  GATES,
  formatGateDecimal,
  formatGatePercent,
} from "../domain/constants"
import { KPIMetric, PipelineStage } from "../types"

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "novel",
    stepNum: 1,
    name: "小说立项",
    enName: "Novel Projecting",
    color: "#FFD700",
    status: "completed",
    activeTasks: 4,
    queueLength: 2,
    avgDuration: "4.2m",
    passRate: "98.5%",
    progress: 100,
    leadAgents: ["tianshu", "lingyun"],
    keySchemaOrGate: "IP题材评估 & 世界观架构包",
    description: "解析创意意图，抽取人物档案设定集与100集剧情节奏大纲。",
  },
  {
    id: "storyboard",
    stepNum: 2,
    name: "剧本分镜",
    enName: "Storyboard Engine",
    color: "#00E5FF",
    status: "completed",
    activeTasks: 8,
    queueLength: 3,
    avgDuration: "12.8m",
    passRate: "96.2%",
    progress: 100,
    leadAgents: ["lingyun", "wanwu"],
    keySchemaOrGate: "输出 12 字段分镜 Schema",
    description:
      "严格输出镜号、机位景别、提示词、旁白音频、角色状态等12字段标准定义。",
  },
  {
    id: "image",
    stepNum: 3,
    name: "图像生成",
    enName: "Image Synthesis",
    color: "#BF00FF",
    status: "running",
    activeTasks: 16,
    queueLength: 6,
    avgDuration: "8.5m",
    passRate: "91.4%",
    progress: 74,
    leadAgents: ["lingyun", "zongshi"],
    keySchemaOrGate: `一致性门禁 ${formatGatePercent(GATES.CONSISTENCY)}`,
    description:
      "Flux 高清原画扩散，面部特征网格比对与 LoRA 风格锁定，严格门禁过滤。",
  },
  {
    id: "video",
    stepNum: 4,
    name: "视频合成",
    enName: "Video Generation",
    color: "#00BFFF",
    status: "running",
    activeTasks: 11,
    queueLength: 5,
    avgDuration: "18.4m",
    passRate: "93.0%",
    progress: 58,
    leadAgents: ["wanwu", "xianzhi"],
    keySchemaOrGate: `SyncNet 唇形吻合 ${formatGateDecimal(GATES.SYNCNET)}`,
    description:
      "VideoToolbox 硬件加速渲染，多段动作插帧与对白音视频毫米级同步。",
  },
  {
    id: "render",
    stepNum: 5,
    name: "成片交付",
    enName: "Master Rendering",
    color: "#00FF88",
    status: "ready",
    activeTasks: 3,
    queueLength: 1,
    avgDuration: "6.1m",
    passRate: "99.1%",
    progress: 25,
    leadAgents: ["zongshi", "shouhu"],
    keySchemaOrGate: "安全合规脱敏 & 4K导出",
    description: "音效声场母带混音、字幕压制与全流隐私三级过滤审查。",
  },
  {
    id: "ops",
    stepNum: 6,
    name: "运营反哺",
    enName: "Ops Feedback Loop",
    color: "#FF006E",
    status: "ready",
    activeTasks: 0,
    queueLength: 0,
    avgDuration: "实时回流",
    passRate: "100%",
    progress: 0,
    leadAgents: ["bole", "xianzhi"],
    keySchemaOrGate: "受众漏斗数据回流阶段①",
    description:
      "全域短剧完播率与转化率统计，自动向言启·千行输入爆款剧情权重。",
  },
]

export const KPI_METRICS: KPIMetric[] = [
  {
    id: "completed_episodes",
    label: "今日成片集数",
    value: 28,
    unit: "集",
    target: "日目标 ≥ 24",
    color: "#00FF88",
    trend: [18, 21, 24, 22, 26, 27, 28],
    changePct: "+16.7%",
    isPositive: true,
  },
  {
    id: "cost_per_episode",
    label: "平均单集成本",
    value: 1.42,
    unit: "元",
    target: "目标 ≤ 2.00",
    color: "#00F0FF",
    trend: [2.15, 1.95, 1.82, 1.64, 1.55, 1.48, 1.42],
    changePct: "-28.9%",
    isPositive: true,
  },
  {
    id: "consistency_score",
    label: "人物一致性均值",
    value: "91.4",
    unit: "%",
    target: "门禁 ≥ 80.0%",
    color: "#FFD700",
    trend: [82.5, 84.1, 86.8, 88.2, 89.5, 90.8, 91.4],
    changePct: "+4.2%",
    isPositive: true,
  },
  {
    id: "syncnet_score",
    label: "SyncNet 唇形吻合",
    value: "0.84",
    unit: "",
    target: "门禁 ≥ 0.75",
    color: "#00BFFF",
    trend: [0.72, 0.74, 0.77, 0.79, 0.81, 0.83, 0.84],
    changePct: "+8.3%",
    isPositive: true,
  },
  {
    id: "backlog_tasks",
    label: "队列积压任务数",
    value: 6,
    unit: "单",
    target: "警戒 > 25",
    color: "#FFD700",
    trend: [14, 12, 10, 8, 9, 7, 6],
    changePct: "-14.3%",
    isPositive: true,
  },
  {
    id: "system_availability",
    label: "系统整体可用率",
    value: "99.98",
    unit: "%",
    target: "SLA ≥ 99.9%",
    color: "#00FF88",
    trend: [99.92, 99.95, 99.96, 99.97, 99.98, 99.98, 99.98],
    changePct: "+0.03%",
    isPositive: true,
  },
]

export const STORYBOARD_12_FIELDS = [
  {
    field: "shot_id",
    name: "分镜序号",
    example: "EP03-SC02-SH08",
    type: "String",
  },
  {
    field: "scene_type",
    name: "景别机位",
    example: "特写 Close-Up / 35mm低角",
    type: "Enum",
  },
  {
    field: "character_anchor",
    name: "角色锚点",
    example: "陆明远 (CharID#01)",
    type: "IDRef",
  },
  {
    field: "emotion_state",
    name: "情绪状态",
    example: "凌厉、暗藏杀机 (Anger 0.85)",
    type: "Vector",
  },
  {
    field: "dialogue_text",
    name: "角色台词",
    example: "“你以为掌控了一切，其实只是棋局已定。”",
    type: "Text",
  },
  {
    field: "audio_track",
    name: "音频旁白",
    example: "BGM_Tension_04.wav / 128kbps",
    type: "Asset",
  },
  {
    field: "prompt_en",
    name: "正向提示词",
    example: "cinematic lighting, sharp eyes, neon rain...",
    type: "Prompt",
  },
  {
    field: "negative_prompt",
    name: "反向过滤",
    example: "deformed, low quality, duplicate face",
    type: "Prompt",
  },
  {
    field: "lora_weights",
    name: "LoRA权重",
    example: "char_lumingyuan_v4:0.85, film_cyber:0.6",
    type: "Config",
  },
  {
    field: "duration_sec",
    name: "镜头时长",
    example: "3.50 秒 (84 frames @ 24fps)",
    type: "Float",
  },
  {
    field: "camera_motion",
    name: "运镜轨迹",
    example: "缓慢推镜 Slow Zoom In 1.2x",
    type: "Motion",
  },
  {
    field: "transition_out",
    name: "出幅转场",
    example: "跳切 Cut to Black Flash",
    type: "FX",
  },
]
