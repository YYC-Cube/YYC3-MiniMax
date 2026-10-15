/**
 * file: opsData.ts
 * description: 数据层 · 算力节点遥测与系统告警样本
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [data],[ops],[telemetry]
 *
 * brief: DGX×2/Mac/NAS 节点遥测与告警事件（全虚构样本）
 *
 * 安全约定：节点地址一律采用 RFC 5737 文档保留段（192.0.2.0/24 TEST-NET-1），
 * 非真实可路由内网地址，避免客户端 bundle 泄露内部网络拓扑
 *
 * exports: OPS_NODES, SYSTEM_ALERTS
 */

import { OpsNode } from '../types';

export const OPS_NODES: OpsNode[] = [
  {
    id: 'yyc3-101',
    name: 'yyc3-101 DGX GB10',
    role: '主推理节点 (vLLM 72B / Flux-Pro)',
    hardware: '8× NVIDIA H100 80GB SXM5',
    ip: '192.0.2.101',
    linkType: '万兆 NFS / RoCE 200G',
    status: 'warn', // Memory high
    gpuUtil: 84,
    vramUsed: 76.2,
    vramTotal: 80.0,
    tempC: 68,
  },
  {
    id: 'yyc3-102',
    name: 'yyc3-102 DGX GB10',
    role: '能力支撑与安全审计 (三件套)',
    hardware: '8× NVIDIA H100 80GB SXM5',
    ip: '192.0.2.102',
    linkType: '万兆 NFS / RoCE 200G',
    status: 'online',
    gpuUtil: 58,
    vramUsed: 49.6,
    vramTotal: 80.0,
    tempC: 59,
  },
  {
    id: 'yyc3-22',
    name: 'yyc3-22 Mac Studio M4',
    role: '全局调度中枢 + VideoToolbox 硬件压制',
    hardware: 'Apple M4 Max 128GB Unified',
    ip: '192.0.2.22',
    linkType: '2.5G SSH 控制面',
    status: 'online',
    gpuUtil: 42,
    vramUsed: 68.4,
    vramTotal: 128.0,
    tempC: 48,
  },
  {
    id: 'yyc3-45',
    name: 'yyc3-45 NAS 存储阵列',
    role: '/mnt/nas 单一事实源 (全流程共享)',
    hardware: 'TrueNAS Enterprise RAID1/6 192TB',
    ip: '192.0.2.45',
    linkType: '万兆 SMB / NFSv4.2',
    status: 'online',
    gpuUtil: 0,
    vramUsed: 78.4, // used TB
    vramTotal: 100.0, // total TB
    tempC: 38,
  },
];

export interface SystemAlert {
  id: string;
  time: string;
  level: 'CRITICAL' | 'EVENT' | 'INSPECTION';
  source: string;
  message: string;
  actionText: string;
  targetPage?: 'P5' | 'P2' | 'P3';
}

export const SYSTEM_ALERTS: SystemAlert[] = [
  {
    id: 'ALT-902',
    time: '14:28:10',
    level: 'CRITICAL',
    source: 'yyc3-101 DGX',
    message: 'GPU-3 显存占用突破警戒线 95.2% (76.2GB/80GB)，正在缓冲溢出',
    actionText: '排查根因 → P5',
    targetPage: 'P5',
  },
  {
    id: 'ALT-899',
    time: '14:25:44',
    level: 'CRITICAL',
    source: 'yyc3-45 NAS',
    message: '/mnt/nas/render_raw 存储池容量达到 78.4% (接近 80% 警告线)',
    actionText: '查看质检归档',
    targetPage: 'P5',
  },
  {
    id: 'EVT-412',
    time: '14:27:02',
    level: 'EVENT',
    source: 'yyc3-22 Mac M4',
    message: '自动分发 4 组 4K 分镜至 VideoToolbox ProRes 422HQ 硬件编码流',
    actionText: '流水线详情',
    targetPage: 'P2',
  },
  {
    id: 'EVT-409',
    time: '14:24:18',
    level: 'EVENT',
    source: 'yyc3-102 DGX',
    message: 'deepseek-v4-guard 模型权重完成热加载，安全推理延迟稳定在 82ms',
    actionText: 'ReAct 链路',
    targetPage: 'P3',
  },
  {
    id: 'INS-105',
    time: '14:00:00',
    level: 'INSPECTION',
    source: '自动巡检守护进程',
    message: '整机集群双机热备校验正常，万兆 RoCE 丢包率 0.000%，SLA 达标',
    actionText: '巡检报告',
    targetPage: 'P5',
  },
];
