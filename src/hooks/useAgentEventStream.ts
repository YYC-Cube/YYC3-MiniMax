/**
 * file: useAgentEventStream.ts
 * description: Agent 事件流 Hook · 连接生命周期/logs 状态/模式三合一封装
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [hook],[event-stream],[realtime]
 *
 * brief: UI 层与 WebSocket 服务解耦：视图只消费 logs/streamMode，不再直连 service
 *
 * details:
 * - 挂载时建立 LIVE/SIM 双模事件流，卸载时自动 close
 * - prependLog 供本地指令日志插入（如 P2 快捷指令）
 * - 日志上限 31 条（新事件 + 原有 30 条截断），防长时运行内存膨胀
 *
 * dependencies: react, services/eventStream, data/logs, types
 * exports: useAgentEventStream, EVENT_STREAM_MAX_LOGS
 */

import { useCallback, useEffect, useState } from "react"
import { INITIAL_LOGS } from "../data/logs"
import {
  createEventStream,
  type EventStreamMode,
} from "../services/eventStream"
import type { LogItem } from "../types"
import { useLocalStorage } from "./useLocalStorage"

/** 事件流保留的最大实时条数（不含初始日志之外的历史） */
export const EVENT_STREAM_MAX_LOGS = 30

/** 事件流持久化键：刷新/断网后恢复最近事件（诊断 #15 离线恢复） */
export const EVENT_STREAM_STORAGE_KEY = "yyc3.p2.eventLogs"

interface UseAgentEventStreamOptions {
  /** WebSocket 网关地址（如 process.env.NEXT_PUBLIC_EVENT_STREAM_URL），缺省走模拟流 */
  url?: string
  /** 模拟流节拍（ms） */
  intervalMs?: number
}

export function useAgentEventStream({
  url,
  intervalMs = 9000,
}: UseAgentEventStreamOptions = {}) {
  // 日志持久化：localStorage 写穿，刷新后恢复最近事件
  const [logs, setLogs] = useLocalStorage<LogItem[]>(
    EVENT_STREAM_STORAGE_KEY,
    INITIAL_LOGS,
  )
  const [streamMode, setStreamMode] = useState<EventStreamMode>("simulated")

  useEffect(() => {
    const handle = createEventStream({
      url,
      onEvent: (log) =>
        setLogs((prev) => [log, ...prev.slice(0, EVENT_STREAM_MAX_LOGS)]),
      onModeChange: setStreamMode,
      intervalMs,
    })
    return () => handle.close()
  }, [url, intervalMs, setLogs])

  /** 本地插入一条日志（头部），如控制台快捷指令回显 */
  const prependLog = useCallback(
    (log: LogItem) => {
      setLogs((prev) => [log, ...prev])
    },
    [setLogs],
  )

  return { logs, streamMode, prependLog }
}
