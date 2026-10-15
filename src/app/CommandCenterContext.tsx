/**
 * file: app/CommandCenterContext.tsx
 * description: 指挥舱全局上下文 · 跨路由共享状态与 W1 指令路由（迁移自 App.tsx 编排层）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-15
 * updated: 2026-10-15
 * status: active
 * tags: [context],[orchestration],[app-router]
 *
 * brief: activeAgentId/isWidgetOpen/externalCommand/highlightedStageId/scaleMode 五态合一；
 *        navigate() 以 App Router 编程式跳转替代原 setCurrentView，跨视图指挥链保持闭环
 *
 * details:
 * - P1 成员唤起 W1 / P2 指令直通 / P2·P3·P4·P5 视图跳转 / W1 引用卡回跳（P3 路由迁移重点，见清单 §5.3）
 * - externalCommand 保留 { id, text } 自增对象语义（诊断 #13：同文本二次派发必达）
 *
 * dependencies: react, next/navigation, types
 * exports: CommandCenterProvider, useCommandCenter, VIEW_PATHS
 */

'use client'

import type { AgentId, PipelineStageId } from '@/types'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

export type ViewId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5'
export const VIEW_IDS: ViewId[] = ['P1', 'P2', 'P3', 'P4', 'P5']

/** 视图 → 静态导出路由（trailingSlash 目录形态，与 next.config.ts 对齐） */
export const VIEW_PATHS: Record<ViewId, `/${string}`> = {
  P1: '/',
  P2: '/p2/',
  P3: '/p3/',
  P4: '/p4/',
  P5: '/p5/',
}

interface ExternalCommand {
  id: number
  text: string
}

interface CommandCenterValue {
  activeAgentId: AgentId
  setActiveAgentId: (id: AgentId) => void
  isWidgetOpen: boolean
  setIsWidgetOpen: (open: boolean) => void
  externalCommand: ExternalCommand | null
  clearExternalCommand: () => void
  sendCommandToWidget: (text: string) => void
  highlightedStageId: PipelineStageId | null
  navigate: (view: ViewId) => void
  navigateToStage: (stageId: string) => void
  scaleMode: 'fit' | '1080p'
  toggleScaleMode: () => void
}

const CommandCenterContext = createContext<CommandCenterValue | null>(null)

export function CommandCenterProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [activeAgentId, setActiveAgentId] = useState<AgentId>('tianshu')
  const [isWidgetOpen, setIsWidgetOpen] = useState(false)
  const [externalCommand, setExternalCommand] = useState<ExternalCommand | null>(null)
  const [highlightedStageId, setHighlightedStageId] = useState<PipelineStageId | null>(null)
  const [scaleMode, setScaleMode] = useState<'fit' | '1080p'>('fit')
  const commandSeqRef = useRef(0)

  /** W1 引用卡 → 指定路由并高亮流水线阶段卡 */
  const navigateToStage = useCallback(
    (stageId: string) => {
      router.push(VIEW_PATHS.P2)
      setHighlightedStageId(stageId as PipelineStageId)
    },
    [router],
  )

  /** 通用视图跳转（Header/Footer/各视图 CTA 统一入口） */
  const navigate = useCallback(
    (view: ViewId) => {
      router.push(VIEW_PATHS[view])
    },
    [router],
  )

  const value: CommandCenterValue = {
    activeAgentId,
    setActiveAgentId,
    isWidgetOpen,
    setIsWidgetOpen,
    externalCommand,
    clearExternalCommand: () => setExternalCommand(null),
    sendCommandToWidget: (text: string) => {
      commandSeqRef.current += 1
      setExternalCommand({ id: commandSeqRef.current, text })
      setIsWidgetOpen(true)
    },
    highlightedStageId,
    navigate,
    navigateToStage,
    scaleMode,
    toggleScaleMode: () => setScaleMode((m) => (m === 'fit' ? '1080p' : 'fit')),
  }

  return <CommandCenterContext.Provider value={value}>{children}</CommandCenterContext.Provider>
}

export function useCommandCenter(): CommandCenterValue {
  const ctx = useContext(CommandCenterContext)
  if (!ctx) throw new Error('useCommandCenter 必须在 CommandCenterProvider 内使用')
  return ctx
}
