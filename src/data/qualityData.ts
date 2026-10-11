/**
 * file: qualityData.ts
 * description: 数据层 · 质检队列/PII 审计/宗师终审样本
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [data],[quality],[security]
 *
 * brief: 分镜质检、PII 三级脱敏审计与终审报告样本（全虚构）
 *
 *         样本安全约定（诊断 #20）：PII 原文均为"文档保留格式/必然校验失败"的假数据——
 *         手机号 138-0000-0000（全零占位段）、密钥 sk-DEMO-0000000000（零熵）、
 *         证件号 110101199002299590（1990-02-29 为非法日期，校验位必错）。
 *         均无法通过任何真实 PII/凭据格式校验，可被 gitleaks 默认规则直接放行。
 *
 * exports: AUDIT_STORYBOARDS, PII_AUDIT_LOGS, MASTER_REVIEW
 */

export interface StoryboardAuditItem {
  id: string;
  shotCode: string;
  episode: string;
  sceneName: string;
  character: string;
  consistencyScore: number; // 0 - 100
  radarScores: {
    facialFeature: number;
    clothingPalette: number;
    lightingAtmosphere: number;
    postureContinuity: number;
    artisticStyle: number;
  };
  status: 'passed' | 'rejected' | 'pending';
  thumbPrompt: string;
  reviewRound: number; // 1 or 2
  rejectReason?: string;
}

export const AUDIT_STORYBOARDS: StoryboardAuditItem[] = [
  {
    id: 'sb-101',
    shotCode: 'EP03-SC02-SH08',
    episode: '第3集 · 迷雾暗流',
    sceneName: '雨夜天台对峙',
    character: '陆明远 (主角)',
    consistencyScore: 92.4,
    radarScores: {
      facialFeature: 94,
      clothingPalette: 91,
      lightingAtmosphere: 90,
      postureContinuity: 93,
      artisticStyle: 94,
    },
    status: 'passed',
    thumbPrompt: '雨幕天台 / 黑色战壕风衣 / 蓝紫霓虹反射 / 凌厉冷冽目光',
    reviewRound: 1,
  },
  {
    id: 'sb-102',
    shotCode: 'EP03-SC02-SH09',
    episode: '第3集 · 迷雾暗流',
    sceneName: '手枪上膛特写',
    character: '陆明远 (特写机位)',
    consistencyScore: 88.6,
    radarScores: {
      facialFeature: 89,
      clothingPalette: 87,
      lightingAtmosphere: 92,
      postureContinuity: 86,
      artisticStyle: 89,
    },
    status: 'passed',
    thumbPrompt: '机械特写 / 手部骨节青筋 / 雨滴飞溅 / 金属冷光',
    reviewRound: 1,
  },
  {
    id: 'sb-103',
    shotCode: 'EP03-SC03-SH02',
    episode: '第3集 · 迷雾暗流',
    sceneName: '密室阴影逆光',
    character: '神秘线人 (配角)',
    consistencyScore: 74.8, // Below 80!
    radarScores: {
      facialFeature: 68,
      clothingPalette: 72,
      lightingAtmosphere: 85,
      postureContinuity: 76,
      artisticStyle: 73,
    },
    status: 'pending',
    thumbPrompt: '百叶窗斜射阴影 / 礼帽风衣 / 面部阴影过重导致瞳孔识别失真',
    reviewRound: 1,
    rejectReason: '面部特征相似度 68% 未达 80% 门禁，瞳距与下颌线偏离标准资产图谱。',
  },
  {
    id: 'sb-104',
    shotCode: 'EP03-SC03-SH05',
    episode: '第3集 · 迷雾暗流',
    sceneName: '地下通道疾跑',
    character: '苏晚晴 (女主角)',
    consistencyScore: 94.1,
    radarScores: {
      facialFeature: 95,
      clothingPalette: 93,
      lightingAtmosphere: 94,
      postureContinuity: 92,
      artisticStyle: 96,
    },
    status: 'passed',
    thumbPrompt: '地下暗道 / 疾驰动态模糊 / 米白风衣衣角扬起 / 科技蓝冷光',
    reviewRound: 1,
  },
];

export interface PIILogItem {
  id: string;
  time: string;
  stageName: string;
  entityType: '身份证/护照' | '手机/座机' | '内网IP/密钥' | '涉密实体';
  /**
   * 安全契约（诊断 #21 完整版）：前端数据包不下发 rawSnippet 原文。
   * 原文仅可经 services/piiReveal.ts 从受控接口按次调取（RBAC+审计+限流）。
   */
  maskedSnippet: string;
  action: '已实时脱敏' | '拦截并告警' | '放行';
  guardAgent: string;
}

export const PII_AUDIT_LOGS: PIILogItem[] = [
  {
    id: 'pii-1',
    time: '14:26:18',
    stageName: '剧本分镜 (阶段②)',
    entityType: '手机/座机',
    maskedSnippet: '“这是我的保密专线：138-****-0000，不要泄露。”',
    action: '已实时脱敏',
    guardAgent: '智云·守护',
  },
  {
    id: 'pii-2',
    time: '14:21:40',
    stageName: '视频合成 (阶段④)',
    entityType: '内网IP/密钥',
    maskedSnippet: 'API_ENDPOINT=10.253.*.*:****; KEY=sk-DEMO-**********',
    action: '拦截并告警',
    guardAgent: '智云·守护',
  },
  {
    id: 'pii-3',
    time: '14:15:02',
    stageName: '小说立项 (阶段①)',
    entityType: '身份证/护照',
    maskedSnippet: '反派假证件登记号：110101********9590 (合成虚拟标记)',
    action: '已实时脱敏',
    guardAgent: '智云·守护',
  },
  {
    id: 'pii-4',
    time: '14:08:55',
    stageName: '成片交付 (阶段⑤)',
    entityType: '涉密实体',
    maskedSnippet: '片尾字幕致谢含未公开内部研制编号: [YYC³ INDUSTRIAL DESK]',
    action: '已实时脱敏',
    guardAgent: '智云·守护',
  },
];
