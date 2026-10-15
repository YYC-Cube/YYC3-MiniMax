/**
 * file: context/navigation.tsx
 * description: 导航域上下文 · 视图跳转 / 阶段高亮 / 缩放模式（自 CommandCenterContext 分域）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [context],[orchestration],[navigation]
 *
 * brief: navigate()/navigateToStage() 以 App Router 编程式跳转替代原 setCurrentView；
 *        highlightedStageId 供 P2 阶段卡高亮，scaleMode 驱动 1980×1020 缩放
 *
 * dependencies: react, next/navigation, types
 * exports: NavigationProvider, useNavigation, ViewId, VIEW_IDS, VIEW_PATHS
 */

'use client'

import type { PipelineStageId } from '@/types'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

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

interface NavigationValue {
  highlightedStageId: PipelineStageId | null
  navigate: (view: ViewId) => void
  navigateToStage: (stageId: string) => void
  scaleMode: 'fit' | '1080p'
  toggleScaleMode: () => void
}

const NavigationContext = createContext<NavigationValue | null>(null)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [highlightedStageId, setHighlightedStageId] = useState<PipelineStageId | null>(null)
  const [scaleMode, setScaleMode] = useState<'fit' | '1080p'>('fit')

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

  const toggleScaleMode = useCallback(() => {
    setScaleMode((m) => (m === 'fit' ? '1080p' : 'fit'))
  }, [])

  const value = useMemo<NavigationValue>(
    () => ({ highlightedStageId, navigate, navigateToStage, scaleMode, toggleScaleMode }),
    [highlightedStageId, navigate, navigateToStage, scaleMode, toggleScaleMode],
  )

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useNavigation(): NavigationValue {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('useNavigation 必须在 NavigationProvider 内使用')
  return ctx
}
