/**
 * file: logs.ts
 * description: 数据层 · 事件流初始日志样本
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [data],[logs],[realtime]
 *
 * brief: P2 事件流首屏日志样本（全虚构脱敏数据）
 *
 * exports: INITIAL_LOGS
 */

import { LogItem } from '../types';

export const INITIAL_LOGS: LogItem[] = [
  {
    id: 'log-1',
    timestamp: '14:28:42',
    agentId: 'tianshu',
    agentName: '元启·天枢',
    level: 'ACT',
    message: '调度 EP03-第7场 镜头合成任务，并发分配至 yyc3-22 Mac Studio 硬件编码池。',
    tag: 'SCHEDULER',
    traceId: '1a2b3c4d',
  },
  {
    id: 'log-2',
    timestamp: '14:28:39',
    agentId: 'zongshi',
    agentName: '格物·宗师',
    level: 'THINK',
    message: '正在评估分镜 #SH08 脸部特征余弦相似度：当前得分 92.4%，高于门禁阈值 80.0%。',
    tag: 'GATE-PASS',
    traceId: '2b3c4d5e',
  },
  {
    id: 'log-3',
    timestamp: '14:28:31',
    agentId: 'shouhu',
    agentName: '智云·守护',
    level: 'SUCCESS',
    message: '第3集对白音轨完成 PII 敏感词扫描，0 涉政违规，0 密钥泄漏，合规放行。',
    tag: 'SECURITY',
    traceId: '3c4d5e6f',
  },
  {
    id: 'log-4',
    timestamp: '14:28:22',
    agentId: 'lingyun',
    agentName: '创想·灵韵',
    level: 'INFO',
    message: 'Flux 扩散原画渲染完毕 [512x768@24step]，应用 LoRA权重: char_lumingyuan_v4:0.85。',
    tag: 'DIFFUSION',
    traceId: '4d5e6f70',
  },
  {
    id: 'log-5',
    timestamp: '14:28:15',
    agentId: 'xianzhi',
    agentName: '预见·先知',
    level: 'WARN',
    message: '检测到镜头 #SH06 口型张合加速度略超预期，SyncNet得分 0.77 (临界值0.75)，建议微调。',
    tag: 'SYNCNET',
    traceId: '5e6f7081',
  },
  {
    id: 'log-6',
    timestamp: '14:28:03',
    agentId: 'wanwu',
    agentName: '语枢·万物',
    level: 'ACT',
    message: '解析小说第4章《暗夜决弈》，输出包含 12 字段的标准化分镜 Schema 结构体。',
    tag: 'SCHEMA',
    traceId: '6f708192',
  },
  {
    id: 'log-7',
    timestamp: '14:27:51',
    agentId: 'qianxing',
    agentName: '言启·千行',
    level: 'THINK',
    message: '意图抽取：用户需求为“商战逆袭 + 悬疑微短剧”，情感槽位设置为高压冷峻、反差打脸。',
    tag: 'INTENT',
    traceId: '708192a3',
  },
  {
    id: 'log-8',
    timestamp: '14:27:38',
    agentId: 'bole',
    agentName: '知遇·伯乐',
    level: 'INFO',
    message: '回流昨日上线短剧完播漏斗数据：前3秒跳出率下降 12%，第7集高潮节点留存达 68.4%。',
    tag: 'OPS-FEEDBACK',
    traceId: '8192a3b4',
  },
  {
    id: 'log-9',
    timestamp: '14:27:12',
    agentId: 'zongshi',
    agentName: '格物·宗师',
    level: 'ERROR',
    message: '历史异常捕获：分镜 #SH02 早期版本面部相似度仅 74.2%，已自动触发红色回环复检。',
    tag: 'LOOPBACK',
    traceId: '92a3b4c5',
  },
];
