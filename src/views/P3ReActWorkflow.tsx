/**
 * file: P3ReActWorkflow.tsx
 * description: P3 ReAct-C 编排 · 九步闭环环/Step7 回环/遥测自动轮播
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-16
 * status: active
 * tags: [component],[view],[p3],[react-loop]
 *
 * brief: ReAct-C 九步闭环可视化与回环演示视图
 *
 * dependencies: react, lucide-react, types, domain/constants, data/reactSteps, hooks/useReActGeometry, components/p3/*
 * exports: P3ReActWorkflow
 */

import {
  ArrowRight,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import React, { useEffect, useRef, useState } from "react"
import { RequestSummaryCard } from "../components/p3/RequestSummaryCard"
import { StepDetailPanel } from "../components/p3/StepDetailPanel"
import { StepNode } from "../components/p3/StepNode"
import { WorkflowDiagram } from "../components/p3/WorkflowDiagram"
import { REACT_STEPS } from "../data/reactSteps"
import { GATES } from "../domain/constants"
import { useReActGeometry } from "../hooks/useReActGeometry"
import { useReActSnapshot } from "../hooks/useReActSnapshot"
import { AgentId, ReActStep } from "../types"

interface P3ReActWorkflowProps {
  onSelectAgent: (id: AgentId) => void
  onNavigate: (view: "P1" | "P2" | "P3" | "P4" | "P5") => void
}

export const P3ReActWorkflow: React.FC<P3ReActWorkflowProps> = ({
  onSelectAgent,
  onNavigate,
}) => {
  const [steps] = useState<ReActStep[]>(REACT_STEPS)
  const [activeStepIndex, setActiveStepIndex] = useState<number>(3) // Step 4 running by default
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false)
  const [isLoopingBack, setIsLoopingBack] = useState<boolean>(false)
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(3)

  // PR6：订阅编排实时快照——live 任务驱动九步环（回环红弧/活跃步真实反映
  // 状态机事件流）；无 live 任务时保持本地演示动画（测试/演示行为不变）。
  // render 期派生同步（与下方 activeStepIndex 同款官方模式，Compiler 合规）
  const snapshot = useReActSnapshot()
  const [prevLiveKey, setPrevLiveKey] = useState<string | null>(null)
  const liveKey = snapshot.hasLiveTask
    ? `${snapshot.activeStep ?? "x"}-${snapshot.isLoopingBack ? "L" : "n"}`
    : null
  if (liveKey !== null && liveKey !== prevLiveKey) {
    setPrevLiveKey(liveKey)
    if (snapshot.activeStep !== null) setActiveStepIndex(snapshot.activeStep - 1)
    setIsLoopingBack(snapshot.isLoopingBack)
  }

  // Auto progression timer（updater 纯函数化：副作用移出 setState，规避 StrictMode 双触发）
  useEffect(() => {
    if (!isAutoPlaying) return
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % 9)
    }, 1800)
    return () => clearInterval(interval)
  }, [isAutoPlaying])

  // 选中态跟随活跃步：render 期派生（React 官方 prop→state 同步模式，取代 effect 内同步
  // setState）；手动点选/下一步后，下一次活跃步推进仍会覆盖选中——与原 effect 行为一致
  const [prevActiveIndex, setPrevActiveIndex] = useState<number | null>(null)
  if (activeStepIndex !== prevActiveIndex) {
    setPrevActiveIndex(activeStepIndex)
    setSelectedStepIndex(activeStepIndex)
  }

  // 回环演示定时器：卸载清理 + 重复触发防叠（诊断 #7）
  const loopbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => {
    const timers = loopbackTimersRef.current
    return () => timers.forEach(clearTimeout)
  }, [])

  // 自适应舞台：实测容器短边，九步环 760 viewBox 整体等比缩放（矮屏/窄屏均完整可见）
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState<number>(720)
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => {
      setStageSize(
        Math.max(260, Math.floor(Math.min(el.clientWidth, el.clientHeight))),
      )
    }
    measure()
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      return () => ro.disconnect()
    }
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])
  // HTML 节点层相对 760 设计稿的缩放因子
  const stageScale = stageSize / 760

  // 九步环纯几何（760 viewBox 设计坐标）
  const {
    cx,
    cy,
    radius,
    nodePositions,
    step5Pos,
    loopbackPath,
    loopbackControlX,
    loopbackControlY,
  } = useReActGeometry(steps.length)

  const currentStep = steps[selectedStepIndex]

  // Trigger manual loopback demo（定时器入 ref：可清理、可防叠）
  const triggerLoopbackDemo = () => {
    loopbackTimersRef.current.forEach(clearTimeout)
    loopbackTimersRef.current = []
    setActiveStepIndex(6) // Go to Step 7
    setIsLoopingBack(true)
    const t1: ReturnType<typeof setTimeout> = setTimeout(() => {
      setActiveStepIndex(4) // Jump back to Step 5
      const t2: ReturnType<typeof setTimeout> = setTimeout(() => {
        setIsLoopingBack(false)
      }, 1500)
      loopbackTimersRef.current.push(t2)
    }, 1200)
    loopbackTimersRef.current.push(t1)
  }

  return (
    <div className="w-full h-full flex flex-col lg:flex-row p-3 lg:p-6 gap-3 lg:gap-6 overflow-y-auto lg:overflow-hidden select-none">
      {/* Left 8.5 Cols: 9-Step Circular Workflow Diagram + Controls */}
      <div className="flex-1 min-h-0 flex flex-col justify-between rounded-2xl glass-panel border border-[#00F0FF]/30 p-4 lg:p-5 relative overflow-hidden">
        {/* Top Header of Diagram */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10 z-20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#BF00FF]/20 border border-[#BF00FF]/50 flex items-center justify-center text-[#D26BFF]">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>ReAct-C 九步闭环编排流程视图</span>
                <span className="text-[10px] text-[#00F0FF] font-mono-num px-2 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/30">
                  REASONING + ACTING + CALIBRATION
                </span>
                {snapshot.hasLiveTask && (
                  <span className="text-[10px] text-[#FF006E] font-mono-num px-2 py-0.5 rounded bg-[#FF006E]/15 border border-[#FF006E]/50 animate-pulse">
                    LIVE · S{snapshot.activeStep ?? "-"}
                    {snapshot.isLoopingBack ? " ⟲回环" : ""}
                  </span>
                )}
                {snapshot.takeoverStep !== null && (
                  <span className="text-[10px] text-[#FFD700] font-mono-num px-2 py-0.5 rounded bg-[#FFD700]/15 border border-[#FFD700]/50">
                    人工接管 S{snapshot.takeoverStep}
                  </span>
                )}
              </h2>
              <span className="text-[11px] text-[#9BA3B4]">
                {`顺时针九步闭环执行 · Step 7 质量校验不达标则触发红色回环（≤${GATES.MAX_REVIEW_ROUNDS}轮）`}
              </span>
            </div>
          </div>

          {/* 数值锚点：当前活跃步 / 9（live 快照优先，本地演示回退轮转态）—— H2 18px */}
          <div className="flex items-baseline space-x-1.5">
            <span className="font-mono-num font-black text-lg leading-none text-[#00F0FF]">
              {snapshot.hasLiveTask ? (snapshot.activeStep ?? 1) : activeStepIndex + 1}
            </span>
            <span className="text-[11px] text-[#9BA3B4] font-mono-num">/ 9 步</span>
          </div>

          {/* Player controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${isAutoPlaying
                ? "bg-[#FF006E]/20 text-[#FF006E] border border-[#FF006E]/50 shadow-[0_0_10px_rgba(255,0,110,0.4)]"
                : "bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/50 hover:bg-[#00FF88]/30"
                }`}
            >
              {isAutoPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isAutoPlaying ? "暂停轮转" : "自动轮播"}</span>
            </button>

            <button
              onClick={() => {
                setActiveStepIndex((prev) => (prev + 1) % 9)
                setSelectedStepIndex((prev) => (prev + 1) % 9)
              }}
              className="px-3 py-1.5 rounded-lg text-xs text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center space-x-1 cursor-pointer"
            >
              <span>单步推进</span>
              <ChevronRight size={13} />
            </button>

            <button
              onClick={triggerLoopbackDemo}
              className="px-3 py-1.5 rounded-lg text-xs text-[#FF006E] bg-[#FF006E]/15 hover:bg-[#FF006E]/30 border border-[#FF006E]/50 transition-all flex items-center space-x-1 cursor-pointer"
              title="模拟 Step 7 质检未过触发红色虚线回环"
            >
              <RotateCcw size={13} />
              <span>模拟 Step7 回环</span>
            </button>
          </div>
        </div>

        {/* Center SVG Circle Stage（实测短边正方形，760 viewBox 等比缩放） */}
        <div
          ref={stageRef}
          className="relative flex-1 min-h-[260px] flex items-center justify-center my-2"
        >
          <div
            className="relative"
            style={{ width: stageSize, height: stageSize }}
          >
            {/* SVG Canvas for Connectors, Arrows, Particles & Loopback */}
            <WorkflowDiagram
              cx={cx}
              cy={cy}
              radius={radius}
              nodePositions={nodePositions}
              activeStepIndex={activeStepIndex}
              isLoopingBack={isLoopingBack}
              loopbackPath={loopbackPath}
              step5Pos={step5Pos}
              loopbackControlX={loopbackControlX}
              loopbackControlY={loopbackControlY}
            />

            {/* Central Request Summary Card:
              用户 query + 置信度 % + 风险标签（随舞台等比缩放）
          */}
            <RequestSummaryCard
              activeStepIndex={activeStepIndex}
              stageScale={stageScale}
            />

            {/* 9 Circular Nodes (64px) */}
            {nodePositions.map((pos, idx) => {
              const step = steps[idx]

              return (
                <StepNode
                  key={step.step}
                  step={step}
                  pos={pos}
                  isActive={idx === activeStepIndex}
                  isSelected={idx === selectedStepIndex}
                  stageScale={stageScale}
                  onSelect={() => setSelectedStepIndex(idx)}
                />
              )
            })}
          </div>
        </div>

        {/* Bottom Flow Meta */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 z-20 text-xs text-[#9BA3B4]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="w-2 h-2 rounded-full bg-[#00FF88]" />
            <span>Milvus 知识库连接正常</span>
            <span className="text-white/20">|</span>
            <span className="hidden md:inline">
              深度推理引擎: deepseek-v4 + nemotron
            </span>
          </div>

          <button
            onClick={() => onNavigate("P2")}
            className="flex items-center space-x-1 text-[#00F0FF] hover:underline cursor-pointer"
          >
            <span>返回生产台实时流水线</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Right Drawer/Panel: Selected Step Details (Tokens, Duration, Model, Payload) */}
      <StepDetailPanel
        currentStep={currentStep}
        selectedStepIndex={selectedStepIndex}
        activeStepIndex={activeStepIndex}
        onSelectAgent={onSelectAgent}
      />
    </div>
  )
}
