/**
 * file: context/agent.tsx
 * description: Agent 域上下文 · 当前激活 Agent（供 Avatar/家族视图高亮与 W1 唤起对齐）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [context],[orchestration],[agent]
 *
 * brief: activeAgentId 单域状态，独立订阅避免无关变更触发重渲染
 *
 * dependencies: react, types
 * exports: AgentProvider, useActiveAgent
 */

'use client'

import type { AgentId } from '@/types'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface AgentValue {
  activeAgentId: AgentId
  setActiveAgentId: (id: AgentId) => void
}

const AgentContext = createContext<AgentValue | null>(null)

export function AgentProvider({ children }: { children: ReactNode }) {
  const [activeAgentId, setActiveAgentId] = useState<AgentId>('tianshu')

  const value = useMemo<AgentValue>(
    () => ({ activeAgentId, setActiveAgentId }),
    [activeAgentId, setActiveAgentId],
  )

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
}

export function useActiveAgent(): AgentValue {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error('useActiveAgent 必须在 AgentProvider 内使用')
  return ctx
}
