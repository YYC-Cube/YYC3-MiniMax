/**
 * file: P4OpsMonitoring.tsx
 * description: P4 算力监控台 · 4 节点拓扑/四象限遥测/告警事件队列
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[view],[p4],[ops]
 *
 * brief: 混合算力拓扑监控视图：DGX×2/Mac/NAS 节点遥测与告警
 *
 * dependencies: react, lucide-react, data/opsData, components/AgentAvatar, domain/opsView
 * exports: P4OpsMonitoring
 */

import {
  Activity,
  ArrowUpRight,
  Cpu,
  HardDrive,
  Radio,
  Server,
  ShieldAlert,
  Zap,
} from "lucide-react"
import React, { useState } from "react"
import { StatusPill } from "../components/StatusPill"
import { OPS_NODES, SYSTEM_ALERTS, SystemAlert } from "../data/opsData"
import {
  memUsagePct,
  OPS_STATUS_LABEL,
  OPS_STATUS_TONE,
} from "../domain/opsView"

interface P4OpsMonitoringProps {
  onNavigateToP5: () => void
  onNavigateToP2: () => void
  onNavigateToP3: () => void
}

export const P4OpsMonitoring: React.FC<P4OpsMonitoringProps> = ({
  onNavigateToP5,
  onNavigateToP2,
  onNavigateToP3,
}) => {
  const [alerts] = useState<SystemAlert[]>(SYSTEM_ALERTS)

  const handleAlertAction = (alert: SystemAlert) => {
    if (alert.targetPage === "P5") onNavigateToP5()
    else if (alert.targetPage === "P2") onNavigateToP2()
    else if (alert.targetPage === "P3") onNavigateToP3()
  }

  return (
    <div className="w-full h-full p-6 grid grid-cols-12 gap-6 overflow-hidden select-none">
      {/* LEFT COLUMN (5 Cols · 主焦): Node Topology (Dual DGX + Mac + NAS) */}
      <div className="col-span-5 flex flex-col justify-between rounded-2xl glass-panel border border-[#00F0FF]/30 p-4 overflow-hidden">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
            <div className="flex items-center space-x-2">
              <Server size={16} className="text-[#00F0FF]" />
              <h2 className="text-sm font-bold text-white tracking-wider">
                集群节点拓扑 (Node Topology)
              </h2>
            </div>
            <span className="text-[10px] text-[#00FF88] font-mono-num flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-ping" />
              <span>4/4 在线</span>
            </span>
          </div>

          {/* Hero: 集群健康度 —— 页面唯一排版锚点（H1 32px + 金色副锚点） */}
          <div className="flex items-baseline space-x-2 mb-3">
            <span className="font-mono-num font-black text-[32px] leading-9 text-[#00FF88]">
              98.6
            </span>
            <span className="text-xs text-[#9BA3B4]">集群健康度 / 100</span>
            <span className="ml-auto font-mono-num font-bold text-lg text-[#FFD700]">
              SLA 99.98%
            </span>
          </div>

          {/* Network Interconnect Badge */}
          <div className="mb-3 p-2 rounded-lg bg-[#0A1628]/40 border border-white/10 flex items-center justify-between text-[10px] text-[#9BA3B4]">
            <span className="flex items-center space-x-1">
              <Radio size={12} className="text-[#BF00FF]" />
              <span>拓扑互联链路:</span>
            </span>
            <span className="font-mono-num text-white">
              2.5G SSH · 万兆 NFSv4.2 · RoCE 200Gbps
            </span>
          </div>

          {/* 4 Nodes Cards */}
          <div className="space-y-2.5">
            {OPS_NODES.map((node) => {
              const isWarning = node.status === "warn"
              const memPct = memUsagePct(node.memUsed, node.memTotal)

              return (
                <div
                  key={node.id}
                  className={`p-3 rounded-xl bg-[#0D1B30]/90 border transition-all ${isWarning
                    ? "border-[#FF006E]/60 shadow-[0_0_12px_rgba(255,0,110,0.25)]"
                    : "border-white/10 hover:border-[#00F0FF]/40"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: isWarning ? "#FF006E" : "#00FF88",
                          boxShadow: `0 0 6px ${isWarning ? "#FF006E" : "#00FF88"
                            }`,
                        }}
                        aria-hidden="true"
                      />
                      <span className="font-bold text-xs text-white truncate">
                        {node.name}
                      </span>
                      {/* 状态三重提示（审计 P1-#3）：颜色+文字胶囊，非仅色点 */}
                      <StatusPill
                        label={OPS_STATUS_LABEL[node.status]}
                        tone={OPS_STATUS_TONE[node.status]}
                      />
                    </div>
                    <span className="text-[9px] font-mono-num text-[#9BA3B4] bg-white/5 px-1.5 py-0.2 rounded">
                      {node.ip}
                    </span>
                  </div>

                  <p className="text-[10px] text-[#9BA3B4] mb-2 truncate">
                    {node.role} ·{" "}
                    <span className="text-white/60">{node.hardware}</span>
                  </p>

                  {/* Dual Radial/Bar Gauges: GPU & VRAM */}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-[#0A1628]/40 p-2 rounded-lg border border-white/5">
                      <div className="flex justify-between text-[#9BA3B4] mb-1">
                        <span>GPU 算力利用率</span>
                        <span className="font-mono-num font-bold text-sm text-[#00F0FF]">
                          {node.gpuUtil}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#0A1628]/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#00F0FF] to-[#BF00FF] rounded-full"
                          style={{ width: `${node.gpuUtil}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-[#0A1628]/40 p-2 rounded-lg border border-white/5">
                      <div className="flex justify-between text-[#9BA3B4] mb-1">
                        <span>
                          {node.memKind === "storage"
                            ? "存储容量池"
                            : "显存占用"}
                        </span>
                        <span
                          className={`font-mono-num font-bold text-sm ${memPct > 90 ? "text-[#FF006E]" : "text-[#BF00FF]"
                            }`}
                        >
                          {node.memUsed} / {node.memTotal} {node.memUnit}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#0A1628]/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${memPct > 90 ? "bg-[#FF006E]" : "bg-[#BF00FF]"
                            }`}
                          style={{ width: `${memPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom Node Meta */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[#9BA3B4]">
          <span>总聚合算力: 16× H100 + M4 Max</span>
          <span className="text-[#FFD700] font-mono-num">RoCE 200G 互联</span>
        </div>
      </div>

      {/* MIDDLE COLUMN (4 Cols): 2x2 Telemetry Charts */}
      <div className="col-span-4 flex flex-col justify-between space-y-3">
        {/* Row 1: Chart 1 (GPU Utilization Timelines) + Chart 2 (VRAM Bar Allocation) */}
        <div className="flex-1 grid grid-cols-2 gap-3 min-h-[240px]">
          {/* Chart 1: Dual DGX GPU Util Timelines */}
          <div className="rounded-xl glass-panel border border-[#00F0FF]/25 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10 text-sm">
              <span className="font-bold text-white flex items-center space-x-1">
                <Activity size={13} className="text-[#00F0FF]" />
                <span>双 DGX GPU 利用率曲线</span>
              </span>
              <span className="text-[10px] text-[#9BA3B4] font-mono-num">
                10s 采样
              </span>
            </div>

            {/* SVG Timelines */}
            <div className="flex-1 py-1 relative">
              <svg
                viewBox="0 0 200 100"
                className="w-full h-full overflow-visible"
              >
                {/* 10% Opacity Grid lines */}
                <line
                  x1="0"
                  y1="20"
                  x2="200"
                  y2="20"
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="3 3"
                />
                <line
                  x1="0"
                  y1="50"
                  x2="200"
                  y2="50"
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="3 3"
                />
                <line
                  x1="0"
                  y1="80"
                  x2="200"
                  y2="80"
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="3 3"
                />

                {/* Line 1 (yyc3-101 Cyan) */}
                <polyline
                  fill="none"
                  stroke="#00F0FF"
                  strokeWidth="2"
                  points="0,45 30,35 60,70 90,30 120,40 150,22 180,26 200,24"
                />
                {/* Line 2 (yyc3-102 Purple) */}
                <polyline
                  fill="none"
                  stroke="#BF00FF"
                  strokeWidth="2"
                  points="0,65 30,55 60,60 90,45 120,50 150,48 180,42 200,44"
                />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[9px] pt-1 border-t border-white/5 font-mono-num">
              <span className="text-[#00F0FF]">● DGX-101: 84% (vLLM)</span>
              <span className="text-[#BF00FF]">● DGX-102: 58% (Guard)</span>
            </div>
          </div>

          {/* Chart 2: VRAM Allocation Bar Chart */}
          <div className="rounded-xl glass-panel border border-[#00F0FF]/25 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10 text-sm">
              <span className="font-bold text-white flex items-center space-x-1">
                <Cpu size={13} className="text-[#BF00FF]" />
                <span>显存驻留池分布 (GB)</span>
              </span>
              <span className="text-[10px] text-[#9BA3B4] font-mono-num">
                Alloc / Resv
              </span>
            </div>

            {/* Custom Bar Graph */}
            <div className="flex-1 flex items-end justify-between px-2 py-2 space-x-2">
              <div className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-[#FF006E] rounded-t shadow-[0_0_8px_#FF006E]"
                  style={{ height: "92%" }}
                />
                <span className="text-[9px] text-[#9BA3B4] mt-1 font-mono-num">
                  DGX-1
                </span>
                <span className="text-[9px] text-[#FF006E] font-bold font-mono-num">
                  76G
                </span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-[#BF00FF] rounded-t"
                  style={{ height: "62%" }}
                />
                <span className="text-[9px] text-[#9BA3B4] mt-1 font-mono-num">
                  DGX-2
                </span>
                <span className="text-[9px] text-[#BF00FF] font-bold font-mono-num">
                  49G
                </span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-[#00F0FF] rounded-t"
                  style={{ height: "54%" }}
                />
                <span className="text-[9px] text-[#9BA3B4] mt-1 font-mono-num">
                  Mac-M4
                </span>
                <span className="text-[9px] text-[#00F0FF] font-bold font-mono-num">
                  68G
                </span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-[#00FF88] rounded-t"
                  style={{ height: "35%" }}
                />
                <span className="text-[9px] text-[#9BA3B4] mt-1 font-mono-num">
                  Buffer
                </span>
                <span className="text-[9px] text-[#00FF88] font-bold font-mono-num">
                  28G
                </span>
              </div>
            </div>

            <div className="text-[9px] text-[#9BA3B4] pt-1 border-t border-white/5 flex justify-between">
              <span>警戒阈值: 95%</span>
              <span className="text-[#FF006E]">DGX-1 需关注</span>
            </div>
          </div>
        </div>

        {/* Row 2: Chart 3 (RoCE 200Gbps Throughput) + Chart 4 (NAS IOPS & Capacity Pie) */}
        <div className="flex-1 grid grid-cols-2 gap-3 min-h-[240px]">
          {/* Chart 3: RoCE 200Gbps Network Throughput */}
          <div className="rounded-xl glass-panel border border-[#00F0FF]/25 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10 text-sm">
              <span className="font-bold text-white flex items-center space-x-1">
                <Zap size={13} className="text-[#00FF88]" />
                <span>RoCE 200Gbps 网络吞吐</span>
              </span>
              <span className="text-[10px] text-[#00FF88] font-mono-num">
                164.2 Gbps
              </span>
            </div>

            <div className="flex-1 py-1 relative">
              <svg
                viewBox="0 0 200 100"
                className="w-full h-full overflow-visible"
              >
                <line
                  x1="0"
                  y1="25"
                  x2="200"
                  y2="25"
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="3 3"
                />
                <line
                  x1="0"
                  y1="60"
                  x2="200"
                  y2="60"
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="3 3"
                />

                <polygon
                  points="0,85 25,60 55,40 85,65 115,25 145,35 175,20 200,30 200,100 0,100"
                  fill="url(#roceGrad)"
                  opacity="0.2"
                />
                <polyline
                  fill="none"
                  stroke="#00FF88"
                  strokeWidth="2"
                  points="0,85 25,60 55,40 85,65 115,25 145,35 175,20 200,30"
                />
                <defs>
                  <linearGradient id="roceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00FF88" />
                    <stop offset="100%" stopColor="#00FF88" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="flex justify-between text-[9px] pt-1 border-t border-white/5 font-mono-num text-[#9BA3B4]">
              <span>零丢包率: 0.000%</span>
              <span className="text-white">RDMA 直连已加速</span>
            </div>
          </div>

          {/* Chart 4: NAS IOPS + Capacity Ring */}
          <div className="rounded-xl glass-panel border border-[#00F0FF]/25 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10 text-sm">
              <span className="font-bold text-white flex items-center space-x-1">
                <HardDrive size={13} className="text-[#FFD700]" />
                <span>NAS IOPS 与存储池 (RAID1/6)</span>
              </span>
              <span className="text-[10px] text-[#FFD700] font-mono-num">
                48,200 IOPS
              </span>
            </div>

            <div className="flex-1 flex items-center justify-around py-1">
              {/* Radial donut gauge for capacity */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg
                  viewBox="0 0 36 36"
                  className="w-full h-full transform -rotate-90"
                >
                  <path
                    className="text-white/10"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    stroke="#FFD700"
                    strokeWidth="3.8"
                    strokeDasharray="78.4, 100"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center flex flex-col">
                  <span className="font-mono-num font-extrabold text-xs text-white">
                    78.4%
                  </span>
                  <span className="text-[9px] text-[#9BA3B4]">已用</span>
                </div>
              </div>

              <div className="text-[10px] space-y-1.5 font-mono-num">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded bg-[#FFD700]" />
                  <span className="text-[#9BA3B4]">RAID6: 78.4TB</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded bg-[#00FF88]" />
                  <span className="text-[#9BA3B4]">剩余可用: 21.6TB</span>
                </div>
                <div className="text-[9px] text-[#00F0FF] pt-1">
                  读写延迟: 0.42ms
                </div>
              </div>
            </div>

            <div className="text-[9px] text-[#9BA3B4] pt-1 border-t border-white/5 flex justify-between">
              <span>挂载点: /mnt/nas</span>
              <span className="text-[#00FF88]">单一事实源同步中</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN (3 Cols): Alerts & System Event Queue */}
      <div className="col-span-3 flex flex-col justify-between rounded-2xl glass-panel border border-[#00F0FF]/30 p-4 overflow-hidden">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
            <div className="flex items-center space-x-2">
              <ShieldAlert size={16} className="text-[#FF006E]" />
              <h2 className="text-sm font-bold text-white tracking-wider">
                告警与事件队列
              </h2>
            </div>
            <span className="text-[10px] text-[#FF006E] font-bold font-mono-num">
              2 高危待排查
            </span>
          </div>

          {/* Alert Queue Items */}
          <div className="space-y-2.5 overflow-y-auto max-h-[72vh] pr-1">
            {alerts.map((alt) => {
              const isCrit = alt.level === "CRITICAL"
              const isEvt = alt.level === "EVENT"

              return (
                <div
                  key={alt.id}
                  className={`p-3 rounded-xl border text-xs transition-all ${isCrit
                    ? "bg-[#FF006E]/10 border-[#FF006E]/60 shadow-[0_0_12px_rgba(255,0,110,0.25)]"
                    : isEvt
                      ? "bg-[#00F0FF]/10 border-[#00F0FF]/30"
                      : "bg-[#00FF88]/10 border-[#00FF88]/30"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`font-mono-num text-[9px] font-bold px-1.5 py-0.2 rounded ${isCrit
                          ? "bg-[#FF006E] text-white"
                          : isEvt
                            ? "bg-[#00F0FF]/30 text-[#00F0FF]"
                            : "bg-[#00FF88]/30 text-[#00FF88]"
                          }`}
                      >
                        {alt.level}
                      </span>
                      <span className="text-[9px] text-[#9BA3B4] font-mono-num">
                        {alt.time}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-white/80">
                      {alt.source}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#E0E4EC] leading-relaxed mb-2.5">
                    {alt.message}
                  </p>

                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => handleAlertAction(alt)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-all ${isCrit
                        ? "bg-[#FF006E] hover:bg-[#FF006E]/80 text-white shadow-[0_0_8px_#FF006E]"
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                        }`}
                    >
                      <span>{alt.actionText}</span>
                      <ArrowUpRight size={11} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[#9BA3B4]">
          <span>全网安全网关: 智云·守护</span>
          <span className="text-[#00FF88]">每日自动巡检: 04:00</span>
        </div>
      </div>
    </div>
  )
}
