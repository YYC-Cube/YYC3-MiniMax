/**
 * file: components/p1/OnboardingCoach.tsx
 * description: P1 首访三步引导卡（IA 审计建议 #4 · onboarding 补位）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p1],[onboarding]
 *
 * brief: 新用户首访展示三步核心路径（唤起 W1 → 进 P2 生产台 → 派发指令），
 *        关闭后由调用方经 useLocalStorage 持久化，本机不再显示
 *
 * details:
 * - 纯展示组件：开合状态由 P1FamilyCenter 持有（SSR 安全，无内部副作用）
 * - 桌面大屏专用（MobileFallback 分支不含 P1），hidden md:block
 *
 * dependencies: react, lucide-react
 * exports: OnboardingCoach
 */

import { Cpu, MessagesSquare, Sparkles } from "lucide-react"
import React from "react"

/** 三步核心路径（与 P1/P2 实际交互一一对应） */
const ONBOARDING_STEPS = [
  {
    icon: Sparkles,
    title: "唤起 W1 对话",
    desc: "点击任一 Agent 头像，唤起全局 AI 浮窗",
  },
  {
    icon: Cpu,
    title: "进入生产台",
    desc: "点击时钟中心 Logo，直达 P2 漫剧生产台",
  },
  {
    icon: MessagesSquare,
    title: "派发生产指令",
    desc: "P2 事件流输入框回车，直通 W1 调度内核",
  },
] as const

interface OnboardingCoachProps {
  /** 关闭引导（调用方负责持久化，本机不再显示） */
  onDismiss: () => void
}

export function OnboardingCoach({ onDismiss }: OnboardingCoachProps) {
  return (
    <aside
      aria-label="新手引导"
      className="hidden md:block absolute top-5 right-6 z-40 w-[280px] rounded-2xl glass-panel border border-[#BF00FF]/40 p-4 shadow-[0_0_24px_rgba(191,0,255,0.25)] select-none"
    >
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <span className="text-xs font-bold text-white tracking-wider">
          三步开启指挥
        </span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="关闭新手引导"
          title="关闭新手引导（本机不再显示）"
          className="text-[10px] text-[#9BA3B4] hover:text-white px-1.5 py-0.5 rounded border border-white/10 hover:border-white/30 transition-colors cursor-pointer"
        >
          知道了
        </button>
      </div>

      <ol className="mt-3 space-y-2.5">
        {ONBOARDING_STEPS.map((step, idx) => {
          const Icon = step.icon
          return (
            <li key={step.title} className="flex items-start space-x-2.5">
              <span
                aria-hidden="true"
                className="w-6 h-6 shrink-0 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/40 flex items-center justify-center text-[10px] font-mono-num font-bold text-[#00F0FF]"
              >
                {idx + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white flex items-center space-x-1">
                  <Icon
                    size={11}
                    className="text-[#00F0FF] shrink-0"
                    aria-hidden="true"
                  />
                  <span>{step.title}</span>
                </p>
                <p className="text-[10px] text-[#9BA3B4] leading-snug">
                  {step.desc}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
