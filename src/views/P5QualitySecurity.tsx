/**
 * file: P5QualitySecurity.tsx
 * description: P5 质检与安全 · 四道门禁/质检队列/PII 脱敏/宗师终审
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[view],[p5],[security]
 *
 * brief: 质量门禁与安全合规视图：双硬门禁、三级脱敏、终审报告
 *
 * dependencies: react, lucide-react, data/qualityData, components/AgentAvatar
 * exports: P5QualitySecurity
 */

import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck,
  Key,
  ShieldCheck,
  Sparkles,
  XCircle
} from 'lucide-react';
import React, { useState } from 'react';
import { AUDIT_STORYBOARDS, PII_AUDIT_LOGS, PIILogItem, StoryboardAuditItem } from '../data/qualityData';
import { formatGateDecimal, formatGatePercent, GATES } from '../domain/constants';
import { revealPiiRaw } from '../services/piiReveal';
import { telemetry } from '../services/telemetry';

interface P5QualitySecurityProps {
  onNavigateToP2: () => void;
  onNavigateToP3: () => void;
}

export const P5QualitySecurity: React.FC<P5QualitySecurityProps> = ({
  onNavigateToP2,
  onNavigateToP3,
}) => {
  const [storyboards, setStoryboards] = useState<StoryboardAuditItem[]>(AUDIT_STORYBOARDS);
  const [piiLogs] = useState<PIILogItem[]>(PII_AUDIT_LOGS);
  const [shakingCardId, setShakingCardId] = useState<string | null>(null);
  const [revealedPiiId, setRevealedPiiId] = useState<string | null>(null);
  // 受控调取态：原文按次异步拉取（诊断 #21），缓存避免重复调取
  const [revealedRaw, setRevealedRaw] = useState<Record<string, string>>({});
  const [revealingPiiId, setRevealingPiiId] = useState<string | null>(null);

  // 受控调取 PII 原文（异步契约与生产接口一致；审计由服务层自动留痕）
  const handleRevealPii = async (logId: string) => {
    if (revealingPiiId) return;
    setRevealingPiiId(logId);
    try {
      const { raw } = await revealPiiRaw(logId);
      setRevealedRaw((prev) => ({ ...prev, [logId]: raw }));
      setRevealedPiiId(logId);
    } catch {
      // 调取失败（拒绝/网络）：保持收起态，服务层已上报审计事件
      setRevealedPiiId(null);
    } finally {
      setRevealingPiiId(null);
    }
  };

  // Handle pass action (green checkmark pop)
  const handlePass = (id: string) => {
    const item = storyboards.find((sb) => sb.id === id);
    // 审计留痕（诊断 #22）：质检操作可追溯 who/when/what/target
    telemetry.audit('gate.pass', id, { shotCode: item?.shotCode, reviewRound: item?.reviewRound });
    setStoryboards((prev) =>
      prev.map((sb) =>
        sb.id === id ? { ...sb, status: 'passed' as const } : sb
      )
    );
  };

  // Handle reject action (pink border shake 0.5s)
  const handleReject = (id: string) => {
    const item = storyboards.find((sb) => sb.id === id);
    telemetry.audit('gate.reject', id, { shotCode: item?.shotCode, reviewRound: item?.reviewRound });
    setShakingCardId(id);
    setTimeout(() => {
      setStoryboards((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'rejected' as const, reviewRound: 2 } : item
        )
      );
      setShakingCardId(null);
    }, 500);
  };

  return (
    <div className="w-full h-full p-5 flex flex-col space-y-4 overflow-hidden select-none">
      {/* 1. TOP GATE OVERVIEW: 4 Big Status Lights */}
      <div className="grid grid-cols-4 gap-4">
        {/* Gate 1: 一致性 >= 80% */}
        <div className="rounded-xl glass-panel p-3.5 flex items-center justify-between border border-[#00FF88]/40 shadow-[0_0_16px_rgba(0,255,136,0.15)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#00FF88]/15 border border-[#00FF88]/50 flex items-center justify-center text-[#00FF88]">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span className="text-[10px] text-[#9BA3B4] font-medium block">
                门禁 1 · 角色面部一致性
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="font-mono-num font-extrabold text-xl text-white">91.4%</span>
                <span className="text-[10px] text-[#00FF88] font-bold">{formatGatePercent(GATES.CONSISTENCY)} 达标</span>
              </div>
            </div>
          </div>
          <span className="w-3 h-3 rounded-full bg-[#00FF88] shadow-[0_0_10px_#00FF88] animate-pulse" />
        </div>

        {/* Gate 2: SyncNet >= 0.75 */}
        <div className="rounded-xl glass-panel p-3.5 flex items-center justify-between border border-[#00F0FF]/40 shadow-[0_0_16px_rgba(0,240,255,0.15)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/50 flex items-center justify-center text-[#00F0FF]">
              <Sparkles size={22} />
            </div>
            <div>
              <span className="text-[10px] text-[#9BA3B4] font-medium block">
                门禁 2 · SyncNet 唇形吻合
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="font-mono-num font-extrabold text-xl text-white">0.84</span>
                <span className="text-[10px] text-[#00F0FF] font-bold">{formatGateDecimal(GATES.SYNCNET)} 达标</span>
              </div>
            </div>
          </div>
          <span className="w-3 h-3 rounded-full bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]" />
        </div>

        {/* Gate 3: PII 0 泄漏 */}
        <div className="rounded-xl glass-panel p-3.5 flex items-center justify-between border border-[#00FF88]/40 shadow-[0_0_16px_rgba(0,255,136,0.15)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#00FF88]/15 border border-[#00FF88]/50 flex items-center justify-center text-[#00FF88]">
              <ShieldCheck size={22} />
            </div>
            <div>
              <span className="text-[10px] text-[#9BA3B4] font-medium block">
                门禁 3 · 敏感隐私实体
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="font-mono-num font-extrabold text-xl text-white">0 泄漏</span>
                <span className="text-[10px] text-[#00FF88] font-bold">三级脱敏拦截</span>
              </div>
            </div>
          </div>
          <span className="w-3 h-3 rounded-full bg-[#00FF88] shadow-[0_0_10px_#00FF88]" />
        </div>

        {/* Gate 4: 密钥零入库 */}
        <div className="rounded-xl glass-panel p-3.5 flex items-center justify-between border border-[#BF00FF]/40 shadow-[0_0_16px_rgba(191,0,255,0.15)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#BF00FF]/15 border border-[#BF00FF]/50 flex items-center justify-center text-[#BF00FF]">
              <Key size={22} />
            </div>
            <div>
              <span className="text-[10px] text-[#9BA3B4] font-medium block">
                门禁 4 · 密钥凭据防泄漏
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="font-mono-num font-extrabold text-xl text-white">零入库</span>
                <span className="text-[10px] text-[#BF00FF] font-bold">AST 静态阻断</span>
              </div>
            </div>
          </div>
          <span className="w-3 h-3 rounded-full bg-[#BF00FF] shadow-[0_0_10px_#BF00FF]" />
        </div>
      </div>

      {/* 2. THREE-COLUMN AUDIT WORKSPACE */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Col (4 Cols): Quality Inspection Queue (质检队列) */}
        <div className="col-span-4 rounded-2xl glass-panel border border-[#00F0FF]/30 p-4 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
              <div className="flex items-center space-x-2">
                <FileCheck size={16} className="text-[#00F0FF]" />
                <h3 className="font-bold text-xs text-white tracking-wider">
                  分镜质检队列 (格物·宗师门禁)
                </h3>
              </div>
              <span className="text-[10px] font-mono-num text-[#9BA3B4]">
                待定: {storyboards.filter((s) => s.status === 'pending').length}
              </span>
            </div>

            {/* Storyboard cards list */}
            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
              {storyboards.map((sb) => {
                const isPassed = sb.status === 'passed';
                const isRejected = sb.status === 'rejected';
                const isShaking = shakingCardId === sb.id;
                const isBelowGate = sb.consistencyScore < GATES.CONSISTENCY;

                return (
                  <div
                    key={sb.id}
                    className={`p-3 rounded-xl bg-[#0A0D18] border transition-all ${isShaking ? 'animate-alert-flash' : ''
                      } ${isPassed
                        ? 'border-[#00FF88]/40 bg-[#00FF88]/5'
                        : isRejected
                          ? 'border-[#FF006E]/60 bg-[#FF006E]/10'
                          : isBelowGate
                            ? 'border-[#FF006E]/50'
                            : 'border-white/10'
                      }`}
                  >
                    {/* Header: Shot Code + Score */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-mono-num font-bold text-xs text-white block">
                          {sb.shotCode}
                        </span>
                        <span className="text-[10px] text-[#9BA3B4]">
                          {sb.character} · {sb.sceneName}
                        </span>
                      </div>

                      <div className="flex flex-col items-end">
                        <span
                          className={`font-mono-num font-extrabold text-sm ${isBelowGate ? 'text-[#FF006E]' : 'text-[#00FF88]'
                            }`}
                        >
                          {sb.consistencyScore}%
                        </span>
                        <span className="text-[9px] text-[#9BA3B4]">
                          {isBelowGate ? `未达 ${GATES.CONSISTENCY}% 门禁` : '一致性通过'}
                        </span>
                      </div>
                    </div>

                    {/* Miniature Radar Attribute Breakdown */}
                    <div className="grid grid-cols-3 gap-1 bg-black/40 p-2 rounded-lg border border-white/5 text-[9px] mb-2 font-mono-num">
                      <div className="flex justify-between">
                        <span className="text-[#9BA3B4]">五官:</span>
                        <span className="text-white">{sb.radarScores.facialFeature}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9BA3B4]">服饰:</span>
                        <span className="text-white">{sb.radarScores.clothingPalette}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9BA3B4]">光影:</span>
                        <span className="text-white">{sb.radarScores.lightingAtmosphere}%</span>
                      </div>
                    </div>

                    {/* Prompt Hint */}
                    <p className="text-[10px] text-[#9BA3B4] truncate mb-2">
                      提示词: {sb.thumbPrompt}
                    </p>

                    {/* Reject Reason warning if failed */}
                    {sb.rejectReason && (
                      <p className="text-[10px] text-[#FF006E] bg-[#FF006E]/10 p-1.5 rounded mb-2">
                        {sb.rejectReason}
                      </p>
                    )}

                    {/* Action buttons (Pass / Reject) */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="text-[10px] text-[#9BA3B4] font-mono-num">
                        复检轮次: {sb.reviewRound}/2
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleReject(sb.id)}
                          className="px-2.5 py-1 rounded bg-[#FF006E]/20 hover:bg-[#FF006E]/30 text-[#FF006E] border border-[#FF006E]/40 font-bold text-[10px] transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          <XCircle size={11} />
                          <span>打回重跑</span>
                        </button>
                        <button
                          onClick={() => handlePass(sb.id)}
                          className="px-2.5 py-1 rounded bg-[#00FF88]/20 hover:bg-[#00FF88]/30 text-[#00FF88] border border-[#00FF88]/40 font-bold text-[10px] transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          <CheckCircle2 size={11} />
                          <span>核验通过</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[#9BA3B4]">
            <span>门禁策略: 严格阻断模式</span>
            <span className="text-[#00F0FF]">人物 LoRA 锚点已锁定</span>
          </div>
        </div>

        {/* Middle Col (4 Cols): Security Audit Logs (智云·守护三级脱敏前后对比) */}
        <div className="col-span-4 rounded-2xl glass-panel border border-[#00F0FF]/30 p-4 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck size={16} className="text-[#00FF88]" />
                <h3 className="font-bold text-xs text-white tracking-wider">
                  安全审计与 PII 脱敏 (智云·守护)
                </h3>
              </div>
              <span className="text-[10px] text-[#00FF88] font-mono-num">
                三级过滤拦截中
              </span>
            </div>

            {/* PII Log Cards */}
            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
              {piiLogs.map((log) => {
                const isRevealed = revealedPiiId === log.id;

                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-[#0A0D18] border border-white/10 hover:border-[#00F0FF]/40 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FF006E]/20 text-[#FF006E] border border-[#FF006E]/40">
                          {log.entityType}
                        </span>
                        <span className="text-[10px] text-[#9BA3B4] font-mono-num">
                          {log.time}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#00FF88] font-bold">
                        {log.action}
                      </span>
                    </div>

                    <span className="text-[10px] text-[#9BA3B4] block mb-1">
                      来源: {log.stageName} · 审查实体: {log.guardAgent}
                    </span>

                    {/* Masked vs Raw Snippet Comparison */}
                    <div className="space-y-1.5 bg-black/50 p-2.5 rounded-lg border border-white/5 my-2">
                      <div>
                        <span className="text-[9px] text-[#9BA3B4] block mb-0.5">
                          脱敏放行文本 (Cleaned):
                        </span>
                        <p className="font-mono-num text-white text-[11px] select-text">
                          {log.maskedSnippet}
                        </p>
                      </div>

                      {isRevealed && (
                        <div className="pt-1.5 border-t border-white/10">
                          <span className="text-[9px] text-[#FF006E] block mb-0.5 font-bold">
                            原始高危拦截数据 (Raw Dangerous · 受控调取):
                          </span>
                          <p className="font-mono-num text-[#FF006E] text-[11px] select-text">
                            {revealedRaw[log.id] || '调取中…'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Toggle Raw View */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          if (isRevealed) {
                            setRevealedPiiId(null);
                          } else {
                            void handleRevealPii(log.id);
                          }
                        }}
                        className="text-[10px] text-[#00F0FF] hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                        <span>{isRevealed ? '收起敏感比对' : '查看脱敏前后对比'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[#9BA3B4]">
            <span>数字盲水印: 已注入 4K 帧序列</span>
            <span className="text-[#00FF88]">PII 审计零残留</span>
          </div>
        </div>

        {/* Right Col (4 Cols): Gewu Zongshi Audit Report (格物·宗师报告) */}
        <div className="col-span-4 rounded-2xl glass-panel border border-[#00F0FF]/30 p-4 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
              <div className="flex items-center space-x-2">
                <FileCheck size={16} className="text-[#C0C0C0]" />
                <h3 className="font-bold text-xs text-white tracking-wider">
                  格物·宗师 质量终审报告
                </h3>
              </div>
              <span className="text-[10px] text-[#C0C0C0] font-mono-num">
                REPORT #GW-2025-08
              </span>
            </div>

            {/* Report Highlights */}
            <div className="space-y-3 text-xs overflow-y-auto max-h-[60vh] pr-1">
              <div className="p-3 rounded-xl bg-[#0A0D18] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">事实溯源与剧情一致性核查</span>
                  <span className="text-[10px] text-[#00FF88] font-bold">100% 溯源</span>
                </div>
                <p className="text-[11px] text-[#9BA3B4] leading-relaxed">
                  本批次 28 集成片已全部完成知识图谱反向检索，所有台词、道具设定均严格溯源至原著 Milvus 知识库向量节点，无幻觉虚构。
                </p>
                <div className="text-[10px] text-[#00F0FF] flex items-center space-x-1">
                  <ExternalLink size={11} />
                  <span>原著知识溯源拓扑链 (Milvus #IP-WORLD-90)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0A0D18] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">复检轮次统计与容错控制</span>
                  <span className="text-[10px] text-[#00F0FF] font-mono-num font-bold">1/2 轮 (安全)</span>
                </div>
                <p className="text-[11px] text-[#9BA3B4] leading-relaxed">
                  漫剧流水线严格规定最多允许 ≤2 轮质量自动复检。当前仅分镜 #SH02 触发 1 次光影微调，二次推理特征相似度已回升至 91.2%，未超限熔断。
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0A0D18] border border-white/10 space-y-2">
                <span className="text-white font-bold block">母带交付质量总评</span>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono-num">
                  <div className="p-1.5 bg-black/40 rounded">
                    <span className="text-[#9BA3B4]">画质规范:</span>
                    <span className="text-white pl-1">4K UHD @ 24fps</span>
                  </div>
                  <div className="p-1.5 bg-black/40 rounded">
                    <span className="text-[#9BA3B4]">色彩空间:</span>
                    <span className="text-[#00F0FF] pl-1">DCI-P3 Cinema</span>
                  </div>
                  <div className="p-1.5 bg-black/40 rounded">
                    <span className="text-[#9BA3B4]">唇形评分:</span>
                    <span className="text-[#00FF88] pl-1">SyncNet 0.84</span>
                  </div>
                  <div className="p-1.5 bg-black/40 rounded">
                    <span className="text-[#9BA3B4]">脱敏完整度:</span>
                    <span className="text-[#00FF88] pl-1">100% PASS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
            <button
              onClick={onNavigateToP2}
              className="text-[#00F0FF] hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>直达生产指挥台</span>
              <ArrowRight size={11} />
            </button>
            <button
              onClick={onNavigateToP3}
              className="text-[#BF00FF] hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>查看 ReAct-C 回环详情</span>
              <ArrowRight size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
