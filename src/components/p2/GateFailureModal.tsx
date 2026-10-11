/**
 * file: GateFailureModal.tsx
 * description: 门禁失败告警弹窗 · 一致性不达标拦截 + P5 跳转
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[p2],[alert]
 *
 * brief: 模拟门禁失败的告警弹窗（一致性 < 阈值场景演示）
 *
 * dependencies: react, lucide-react, domain/constants
 * exports: GateFailureModal
 */

import { ArrowRight, ShieldAlert } from 'lucide-react';
import React from 'react';
import { GATES } from '../../domain/constants';

interface GateFailureModalProps {
  onClose: () => void;
  onNavigateToP5?: () => void;
}

export function GateFailureModal({ onClose, onNavigateToP5 }: GateFailureModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="w-[520px] rounded-2xl glass-panel border-2 border-[#FF006E] p-6 flex flex-col shadow-[0_0_40px_rgba(255,0,110,0.7)] animate-alert-flash">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF006E]/20 border border-[#FF006E] flex items-center justify-center text-[#FF006E]">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              质检门禁拦截告警：一致性不达标！
            </h3>
            <span className="text-xs text-[#FF006E] font-mono-num font-bold">
              GATE-FAIL: Consistency 74.8% &lt; {GATES.CONSISTENCY}.0%
            </span>
          </div>
        </div>

        <p className="text-xs text-[#E0E4EC] leading-relaxed mb-4">
          分镜 <strong>#EP03-SC03-SH02 (密室阴影逆光)</strong> 经格物·宗师面部特征比对，得分为
          <strong> 74.8%</strong>，未通过 {GATES.CONSISTENCY}% 工业化交付门禁。系统已自动启动 ReAct-C 第 7
          步红色回环复检机制！
        </p>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs text-[#9BA3B4] hover:text-white bg-white/5 transition-all cursor-pointer"
          >
            忽略测试
          </button>
          {onNavigateToP5 && (
            <button
              onClick={() => {
                onClose();
                onNavigateToP5();
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#FF006E] to-[#BF00FF] shadow-[0_0_12px_rgba(255,0,110,0.6)] transition-all cursor-pointer flex items-center space-x-1"
            >
              <span>前往 P5 质检中心排查</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
