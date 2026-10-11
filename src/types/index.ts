/**
 * file: index.ts
 * description: 全局类型定义 · Agent/流水线/日志/遥测等核心 Schema
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [type],[schema],[core]
 *
 * brief: 全站单一类型事实源，视图/数据/服务层共同依赖
 *
 * exports: AgentId, AgentInfo, LogItem, PipelineStage, KPIMetric, ReActStep, OpsNode, ChatMessage 等
 */

export type AgentId =
  | 'tianshu' 
  | 'shouhu' 
  | 'zongshi' 
  | 'lingyun' 
  | 'qianxing' 
  | 'wanwu' 
  | 'xianzhi' 
  | 'bole';

export interface AgentInfo {
  id: AgentId;
  name: string;
  nick: string;
  title: string;
  color: string;
  clockPosition: string; // e.g. "12:00", "01:30"
  angleDeg: number; // 0deg at 12:00, 45, 90, 135, 180, 225, 270, 315
  status: 'online' | 'speaking' | 'idle' | 'offline';
  lastActive: string;
  role: string;
  description: string;
  primaryStage: string;
  model: string;
  avatarSeed: string;
}

export type PipelineStageId = 
  | 'novel' 
  | 'storyboard' 
  | 'image' 
  | 'video' 
  | 'render' 
  | 'ops';

export interface PipelineStage {
  id: PipelineStageId;
  stepNum: number;
  name: string;
  enName: string;
  color: string;
  status: 'ready' | 'running' | 'blocked' | 'completed';
  activeTasks: number;
  queueLength: number;
  avgDuration: string;
  passRate: string;
  progress: number;
  leadAgents: AgentId[];
  keySchemaOrGate: string;
  description: string;
}

export interface ReActStep {
  step: number;
  name: string;
  enName: string;
  agentId: AgentId;
  agentName: string;
  color: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'loopback';
}

export interface LogItem {
  id: string;
  timestamp: string;
  agentId: AgentId;
  agentName: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'THINK' | 'ACT';
  message: string;
  tag?: string;
  /** 链路追踪 ID：live 模式透传网关值，sim 模式本地生成，用于前后端日志关联 */
  traceId?: string;
}

export interface KPIMetric {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  target: string;
  color: string;
  trend: number[]; // 7-day trend values
  changePct: string;
  isPositive: boolean;
}

export interface OpsNode {
  id: string;
  name: string;
  role: string;
  hardware: string;
  ip: string;
  linkType: string;
  status: 'online' | 'warn' | 'critical';
  gpuUtil: number; // 0 - 100
  vramUsed: number; // in GB
  vramTotal: number;
  tempC: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  agentId?: AgentId;
  timestamp: string;
  text: string;
  referenceCard?: {
    type: 'task' | 'stage' | 'image' | 'audit';
    targetId: string;
    title: string;
    desc: string;
  };
}
