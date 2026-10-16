/**
 * file: ClockCenter.tsx
 * description: P1 时钟环中心 · YYC³ 品牌核心 + 真实走时数字时间/日期星期
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[p1],[clock]
 *
 * brief: 中心 150px 慢旋环 + 102px 品牌核心（点击进 P2），下方 HH:MM:SS + yy/mm/dd 星期
 *
 * dependencies: react
 * exports: ClockCenter
 */

const DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"] as const

/** yy/mm/dd + 星期（周末粉色） */
function formatDateInfo(
  date: Date,
): { dateStr: string; dayLabel: string; isWeekend: boolean } {
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const dayIdx = date.getDay() // 0=日, 6=六
  return {
    dateStr: `${yy}/${mm}/${dd}`,
    dayLabel: DAY_LABELS[dayIdx],
    isWeekend: dayIdx === 0 || dayIdx === 6,
  }
}

interface ClockCenterProps {
  /** 当前真实时间（1s 走时由父层驱动） */
  time: Date
  /** 舞台缩放因子：900 viewBox 设计稿 → 实际渲染尺寸，用于字号自适应 */
  scale: number
  onNavigateToP2: () => void
}

export function ClockCenter({ time, scale, onNavigateToP2 }: ClockCenterProps) {
  const timeStr = time.toLocaleTimeString("zh-CN", { hour12: false })
  const { dateStr, dayLabel, isWeekend } = formatDateInfo(time)

  return (
    <div className="absolute z-20 flex flex-col items-center pointer-events-none">
      <div className="relative" style={{ width: 150, height: 150 }}>
        {/* 60s Slow Rotating Outer Indicator Ring */}
        <div className="absolute inset-0 rounded-full border border-[#00F0FF]/30 border-t-[#BF00FF] border-r-transparent animate-slow-rotate flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] absolute -top-1.5 shadow-[0_0_10px_#00F0FF]" />
          <div className="w-2 h-2 rounded-full bg-[#BF00FF] absolute -bottom-1 shadow-[0_0_10px_#BF00FF]" />
        </div>

        {/* 124x124 Core Logo */}
        <div
          onClick={onNavigateToP2}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[102px] h-[102px] rounded-xl p-[2px] bg-gradient-to-br from-[#00F0FF] via-[#BF00FF] to-[#FF006E] shadow-[0_0_20px_rgba(0,240,255,0.5),0_0_32px_rgba(191,0,255,0.3)] animate-pulse-breath cursor-pointer pointer-events-auto group hover:scale-105 transition-all"
          title="点击快速进入漫剧生产指挥台"
        >
          <div className="w-full h-full bg-[#0A0A0A] rounded-[10px] flex flex-col items-center justify-center relative overflow-hidden border border-white/10">
            <span className="font-mono-num font-black text-xl tracking-tighter bg-gradient-to-r from-[#00F0FF] via-[#BF00FF] to-white bg-clip-text text-transparent">
              YYC³
            </span>
            <span className="text-[8px] text-[#9BA3B4] font-medium tracking-widest mt-0.5">
              AI FAMILY
            </span>
            <div className="flex items-center space-x-1 mt-0.5 text-[7px] text-[#00FF88] font-mono-num">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-ping" />
              <span>ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* 数字时间 HH:MM:SS（1s ticking，字号随舞台缩放自适应） */}
      <span
        className="font-mono-num font-bold text-center whitespace-nowrap"
        style={{
          fontSize: Math.max(11, Math.round(18 * scale)),
          color: "#00F0FF",
          textShadow: "0 0 10px rgba(0,240,255,0.4)",
          letterSpacing: "2px",
        }}
      >
        {timeStr}
      </span>

      {/* yy/mm/dd + 星期（周末粉色霓虹） */}
      <div
        className="font-mono-num flex items-center justify-center gap-1 whitespace-nowrap"
        style={{ marginTop: "3px" }}
      >
        <span
          style={{
            fontSize: Math.max(9, Math.round(12 * scale)),
            color: "rgba(0,240,255,0.4)",
            letterSpacing: "1px",
          }}
        >
          {dateStr}
        </span>
        <span
          style={{
            fontSize: Math.max(9, Math.round(12 * scale)),
            color: isWeekend ? "#FF006E" : "rgba(0,240,255,0.4)",
            textShadow: isWeekend ? "0 0 6px rgba(255,0,110,0.4)" : "none",
            letterSpacing: "1px",
          }}
        >
          {dayLabel}
        </span>
      </div>
    </div>
  )
}
