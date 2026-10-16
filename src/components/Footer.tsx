/**
 * file: Footer.tsx
 * description: 底部状态栏 · NAS 存储/任务队列/在线率遥测摘要 + 路由 CTA
 * author: YanYuCloudCube Team
 * version: v2.0.0
 * created: 2026-10-11
 * updated: 2026-10-15
 * status: active
 * tags: [component],[ui],[status]
 *
 * brief: 指挥舱底栏：存储健康度、队列深度、家族在线率与视图快捷跳转
 *
 * details:
 * - Next.js 16 迁移：onNavigate 回调 → CommandCenterContext.navigate（编程式路由）
 * - currentView props → usePathname 派生
 *
 * dependencies: react, next/navigation, lucide-react, context/navigation
 * exports: Footer
 */

import { useNavigation, VIEW_PATHS, type ViewId } from "@/context/navigation"
import { ArrowRight, HardDrive, Server, ShieldCheck, Zap } from "lucide-react"
import { usePathname } from "next/navigation"
import React from "react"

export const Footer: React.FC = () => {
  const pathname = usePathname()
  const { navigate } = useNavigation()

  /** pathname → ViewId（视图 CTA 依赖，反查 navigation 单一事实源） */
  const currentView = (Object.entries(VIEW_PATHS).find(
    ([, p]) => p === pathname,
  )?.[0] ?? "P1") as ViewId

  return (
    <footer className="h-9 px-6 border-t border-[#00F0FF]/20 bg-[#0E1018]/90 backdrop-blur-md flex items-center justify-between select-none relative z-30 text-xs">
      {/* Left: NAS path /mnt/nas */}
      <div className="flex items-center space-x-3 text-[#9BA3B4]">
        <div className="flex items-center space-x-1.5 bg-[#0A1628]/60 px-2 py-0.5 rounded border border-white/10">
          <HardDrive size={12} className="text-[#00F0FF]" />
          <span className="font-mono-num text-[11px] text-white">
            /mnt/nas/yyc3_pipeline
          </span>
          <span className="text-[10px] text-[#00FF88] flex items-center space-x-1 pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" />
            <span>万兆 NFSv4.2 挂载</span>
          </span>
        </div>
        <span className="text-[11px] text-[#9BA3B4]/60">|</span>
        <span className="text-[11px] text-[#9BA3B4]">
          单一事实源集群: TrueNAS Enterprise
        </span>
      </div>

      {/* Middle: Task Queue Count */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Server size={12} className="text-[#BF00FF]" />
          <span className="text-[#9BA3B4] text-[11px]">全流程活跃任务:</span>
          <span className="font-mono-num font-bold text-white bg-[#BF00FF]/20 px-2 py-0.5 rounded text-[11px] border border-[#BF00FF]/40 text-glow-purple">
            42 Active
          </span>
          <span className="text-[11px] text-[#9BA3B4] font-mono-num">
            (流水线并行: 6 / 积压: 6)
          </span>
        </div>

        {/* Quick jump CTA based on current view */}
        {currentView === "P1" && (
          <button
            onClick={() => navigate("P2")}
            className="flex items-center space-x-1 text-[11px] text-[#00F0FF] hover:text-white bg-[#00F0FF]/15 hover:bg-[#00F0FF]/30 px-2.5 py-0.5 rounded transition-all border border-[#00F0FF]/40 cursor-pointer"
          >
            <span>进入 P2 漫剧生产台</span>
            <ArrowRight size={11} />
          </button>
        )}
        {currentView === "P2" && (
          <button
            onClick={() => navigate("P3")}
            className="flex items-center space-x-1 text-[11px] text-[#BF00FF] hover:text-white bg-[#BF00FF]/15 hover:bg-[#BF00FF]/30 px-2.5 py-0.5 rounded transition-all border border-[#BF00FF]/40 cursor-pointer"
          >
            <span>查看 ReAct-C 九步编排视图</span>
            <ArrowRight size={11} />
          </button>
        )}
      </div>

      {/* Right: 8 Agent Online Rate */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 bg-[#00FF88]/10 px-2 py-0.5 rounded border border-[#00FF88]/30">
          <Zap size={11} className="text-[#00FF88]" />
          <span className="text-[#9BA3B4] text-[11px]">8 Agent 在线率:</span>
          <span className="font-mono-num font-bold text-[#00FF88] text-[11px]">
            100% (8/8 在线)
          </span>
        </div>
        <div className="flex items-center space-x-1 text-[11px] text-[#9BA3B4]">
          <ShieldCheck size={12} className="text-[#00F0FF]" />
          <span>合规校验: PASS</span>
        </div>
      </div>
    </footer>
  )
}
