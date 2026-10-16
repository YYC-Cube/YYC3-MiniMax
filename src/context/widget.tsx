/**
 * file: context/widget.tsx
 * description: W1 浮窗域上下文 · 开合状态与外部指令派发（P1/P2 → UniversalWidget）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [context],[orchestration],[widget]
 *
 * brief: externalCommand 保留 { id, text } 自增对象语义（诊断 #13：同文本二次派发必达）
 *
 * dependencies: react
 * exports: WidgetProvider, useWidgetCommand, ExternalCommand
 */

"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

export interface ExternalCommand {
  id: number
  text: string
}

interface WidgetValue {
  isWidgetOpen: boolean
  setIsWidgetOpen: (open: boolean) => void
  externalCommand: ExternalCommand | null
  clearExternalCommand: () => void
  sendCommandToWidget: (text: string) => void
}

const WidgetContext = createContext<WidgetValue | null>(null)

export function WidgetProvider({ children }: { children: ReactNode }) {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false)
  const [externalCommand, setExternalCommand] =
    useState<ExternalCommand | null>(null)
  const commandSeqRef = useRef(0)

  const clearExternalCommand = useCallback(() => setExternalCommand(null), [])

  const sendCommandToWidget = useCallback((text: string) => {
    commandSeqRef.current += 1
    setExternalCommand({ id: commandSeqRef.current, text })
    setIsWidgetOpen(true)
  }, [])

  const value = useMemo<WidgetValue>(
    () => ({
      isWidgetOpen,
      setIsWidgetOpen,
      externalCommand,
      clearExternalCommand,
      sendCommandToWidget,
    }),
    [isWidgetOpen, externalCommand, clearExternalCommand, sendCommandToWidget],
  )

  return (
    <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>
  )
}

export function useWidgetCommand(): WidgetValue {
  const ctx = useContext(WidgetContext)
  if (!ctx) throw new Error("useWidgetCommand 必须在 WidgetProvider 内使用")
  return ctx
}
