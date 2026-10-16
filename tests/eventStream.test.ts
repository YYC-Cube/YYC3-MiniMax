/**
 * file: eventStream.test.ts
 * description: 事件流服务单测 · 消息规范化/降级模拟/WS 接驳
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [test],[unit],[websocket]
 *
 * brief: normalizeIncomingEvent 规范化 + createEventStream 双模 16 用例
 *
 * test-target: src/services/eventStream.ts
 * notes: MockWebSocket 桩 + vi.stubGlobal + fake timers
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AGENTS } from "../src/data/agents"
import {
  createEventStream,
  normalizeIncomingEvent,
  type EventStreamMode,
} from "../src/services/eventStream"
import {
  addTelemetrySink,
  type TelemetryEvent,
} from "../src/services/telemetry"
import type { LogItem } from "../src/types"

describe("normalizeIncomingEvent", () => {
  it("规范化完整消息", () => {
    const log = normalizeIncomingEvent({
      agentId: "tianshu",
      message: "  全局编排指令下发  ",
      level: "SUCCESS",
      tag: "ROUTE",
      timestamp: "12:00:00",
      id: "fixed-id",
    })
    expect(log).not.toBeNull()
    expect(log!.id).toBe("fixed-id")
    expect(log!.timestamp).toBe("12:00:00")
    expect(log!.agentId).toBe("tianshu")
    expect(log!.agentName).toBe(AGENTS.tianshu.name)
    expect(log!.level).toBe("SUCCESS")
    expect(log!.message).toBe("全局编排指令下发")
    expect(log!.tag).toBe("ROUTE")
  })

  it("缺省字段自动回填（level=INFO / agentName / timestamp / id）", () => {
    const log = normalizeIncomingEvent({
      agentId: "wanwu",
      message: "合成任务入队",
    })
    expect(log).not.toBeNull()
    expect(log!.level).toBe("INFO")
    expect(log!.agentName).toBe(AGENTS.wanwu.name)
    expect(log!.timestamp).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(log!.id).toMatch(/^evt-\d+-[a-z0-9]+$/)
    expect(log!.tag).toBeUndefined()
  })

  it("非法 agentId / 空消息 / 非对象输入一律丢弃", () => {
    expect(
      normalizeIncomingEvent({ agentId: "intruder", message: "x" }),
    ).toBeNull()
    expect(
      normalizeIncomingEvent({ agentId: "tianshu", message: "   " }),
    ).toBeNull()
    expect(normalizeIncomingEvent({ message: "no agent" })).toBeNull()
    expect(normalizeIncomingEvent(null)).toBeNull()
    expect(normalizeIncomingEvent("raw-string")).toBeNull()
  })
})

describe("createEventStream 降级模拟流", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("无 url 时以 simulated 模式按节拍产生事件，close 后停止", () => {
    const onModeChange = vi.fn()
    const onEvent = vi.fn()
    const handle = createEventStream({ onEvent, onModeChange, intervalMs: 50 })

    expect(onModeChange).toHaveBeenCalledWith("simulated")

    vi.advanceTimersByTime(155)
    expect(onEvent).toHaveBeenCalledTimes(3)

    handle.close()
    vi.advanceTimersByTime(500)
    expect(onEvent).toHaveBeenCalledTimes(3)
  })

  it("模拟事件均为合法 LogItem", () => {
    const onEvent = vi.fn()
    const handle = createEventStream({ onEvent, intervalMs: 10 })
    vi.advanceTimersByTime(35)
    handle.close()

    for (const call of onEvent.mock.calls) {
      const log = call[0] as LogItem
      expect(AGENTS[log.agentId]).toBeDefined()
      expect(typeof log.message).toBe("string")
      expect(log.message.length).toBeGreaterThan(0)
      expect(typeof log.id).toBe("string")
    }
  })
})

// ---------------------------------------------------------------------------
// WebSocket 接驳（LIVE 模式）
// ---------------------------------------------------------------------------

/** 可控的 WebSocket 桩：记录全部实例，测试手动触发 open/message/close/error */
class MockWebSocket {
  static instances: MockWebSocket[] = []
  static shouldThrow = false

  url: string
  closedByClient = false
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null

  constructor(url: string | URL) {
    if (MockWebSocket.shouldThrow) throw new Error("mock: connection refused")
    this.url = String(url)
    MockWebSocket.instances.push(this)
  }

  close(): void {
    this.closedByClient = true
  }
}

describe("createEventStream WebSocket 接驳（LIVE 模式）", () => {
  const WS_URL = "wss://gateway.yyc3.test/agent-events"

  beforeEach(() => {
    vi.useFakeTimers()
    MockWebSocket.instances = []
    MockWebSocket.shouldThrow = false
    vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("配置 url 后立即以指定地址发起连接", () => {
    const onEvent = vi.fn()
    const handle = createEventStream({ url: WS_URL, onEvent, intervalMs: 1e9 })

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toBe(WS_URL)
    handle.close()
  })

  it("onopen 切换 LIVE 模式并停用模拟流", () => {
    let mode: EventStreamMode | null = null
    const onEvent = vi.fn()
    const handle = createEventStream({
      url: WS_URL,
      onEvent,
      onModeChange: (m) => {
        mode = m
      },
      intervalMs: 50,
    })

    // 创建即通知 SIM 模式，且模拟流先产生事件
    expect(mode).toBe("simulated")
    vi.advanceTimersByTime(60)
    const simCount = onEvent.mock.calls.length
    expect(simCount).toBeGreaterThan(0)

    MockWebSocket.instances[0].onopen?.()
    expect(mode).toBe("live")

    // LIVE 后模拟流停止，不再注入事件
    vi.advanceTimersByTime(500)
    expect(onEvent.mock.calls.length).toBe(simCount)
    handle.close()
  })

  it("onmessage 有效消息规范化后进入 onEvent", () => {
    const onEvent = vi.fn()
    const handle = createEventStream({ url: WS_URL, onEvent, intervalMs: 1e9 })
    const ws = MockWebSocket.instances[0]
    ws.onopen?.()

    ws.onmessage?.({
      data: JSON.stringify({
        agentId: "zongshi",
        message: "分镜 S09 门禁通过",
        level: "SUCCESS",
        tag: "GATE",
        id: "fixed-1",
        timestamp: "12:00:00",
      }),
    })

    expect(onEvent).toHaveBeenCalledTimes(1)
    const log = onEvent.mock.calls[0][0]
    expect(log.id).toBe("fixed-1")
    expect(log.agentId).toBe("zongshi")
    expect(log.agentName).toBe(AGENTS.zongshi.name)
    expect(log.level).toBe("SUCCESS")
    expect(log.tag).toBe("GATE")
    handle.close()
  })

  it("onmessage 兼容 {type, data} 包装协议自动解包", () => {
    const onEvent = vi.fn()
    const handle = createEventStream({ url: WS_URL, onEvent, intervalMs: 1e9 })
    const ws = MockWebSocket.instances[0]
    ws.onopen?.()

    ws.onmessage?.({
      data: JSON.stringify({
        type: "log",
        data: { agentId: "wanwu", message: "合成任务入队" },
      }),
    })

    expect(onEvent).toHaveBeenCalledTimes(1)
    expect(onEvent.mock.calls[0][0].agentId).toBe("wanwu")
    expect(onEvent.mock.calls[0][0].agentName).toBe(AGENTS.wanwu.name)
    handle.close()
  })

  it("onmessage 支持 data 为对象的通道消息（非字符串 data）", () => {
    const onEvent = vi.fn()
    const handle = createEventStream({ url: WS_URL, onEvent, intervalMs: 1e9 })
    const ws = MockWebSocket.instances[0]
    ws.onopen?.()

    ws.onmessage?.({
      data: { agentId: "tianshu", message: "对象通道消息", level: "INFO" },
    })

    expect(onEvent).toHaveBeenCalledTimes(1)
    expect(onEvent.mock.calls[0][0].agentId).toBe("tianshu")
    expect(onEvent.mock.calls[0][0].message).toBe("对象通道消息")
    handle.close()
  })

  it("非法入站消息告警携带 traceId（结构化一致）", () => {
    const captured: TelemetryEvent[] = []
    const off = addTelemetrySink((e) => captured.push(e))
    const onEvent = vi.fn()
    const handle = createEventStream({ url: WS_URL, onEvent, intervalMs: 1e9 })
    const ws = MockWebSocket.instances[0]
    ws.onopen?.()

    ws.onmessage?.({ data: JSON.stringify({ agentId: "tianshu" }) })

    off()
    handle.close()
    const invalid = captured.find(
      (e) => e.event === "event_stream.invalid_message",
    )
    expect(invalid?.traceId).toBeTruthy()
  })

  it("非法消息静默丢弃且不中断链路", () => {
    const onEvent = vi.fn()
    const handle = createEventStream({ url: WS_URL, onEvent, intervalMs: 1e9 })
    const ws = MockWebSocket.instances[0]
    ws.onopen?.()

    // 依次：非法 agentId / 非 JSON 字符串 / 缺 message / 空白 message
    ws.onmessage?.({
      data: JSON.stringify({ agentId: "intruder", message: "x" }),
    })
    ws.onmessage?.({ data: "not-json{{" })
    ws.onmessage?.({ data: JSON.stringify({ agentId: "tianshu" }) })
    ws.onmessage?.({
      data: JSON.stringify({ agentId: "bole", message: "   " }),
    })

    expect(onEvent).not.toHaveBeenCalled()

    // 链路仍存活：合法消息继续入队
    ws.onmessage?.({
      data: JSON.stringify({ agentId: "bole", message: "恢复入队" }),
    })
    expect(onEvent).toHaveBeenCalledTimes(1)
    handle.close()
  })

  it("onerror 立即降级 SIM，模拟流恢复注入", () => {
    let mode: EventStreamMode | null = null
    const onEvent = vi.fn()
    const handle = createEventStream({
      url: WS_URL,
      onEvent,
      onModeChange: (m) => {
        mode = m
      },
      intervalMs: 20,
    })
    const ws = MockWebSocket.instances[0]
    ws.onopen?.()
    expect(mode).toBe("live")

    ws.onerror?.()
    expect(mode).toBe("simulated")

    vi.advanceTimersByTime(45)
    expect(onEvent.mock.calls.length).toBeGreaterThan(0)
    handle.close()
  })

  it("onclose 降级 SIM 并按 1s 退避重连，重连成功回到 LIVE", () => {
    let mode: EventStreamMode | null = null
    const onEvent = vi.fn()
    const handle = createEventStream({
      url: WS_URL,
      onEvent,
      onModeChange: (m) => {
        mode = m
      },
      intervalMs: 1e9,
    })
    const ws0 = MockWebSocket.instances[0]
    ws0.onopen?.()
    ws0.onclose?.()

    expect(mode).toBe("simulated")
    expect(MockWebSocket.instances).toHaveLength(1)

    vi.advanceTimersByTime(1000)
    expect(MockWebSocket.instances).toHaveLength(2)

    MockWebSocket.instances[1].onopen?.()
    expect(mode).toBe("live")
    handle.close()
  })

  it("连续断开按指数退避（1s→16s），5 次后停止重连", () => {
    const onEvent = vi.fn()
    const handle = createEventStream({ url: WS_URL, onEvent, intervalMs: 1e9 })

    let expected = 1
    for (let backoff = 1000; backoff <= 16000; backoff *= 2) {
      MockWebSocket.instances[MockWebSocket.instances.length - 1].onclose?.()
      vi.advanceTimersByTime(backoff)
      expected += 1
      expect(MockWebSocket.instances).toHaveLength(expected)
    }

    // 已达 maxReconnects=5（1 初始 + 5 重连），第 6 次断开不再重连
    MockWebSocket.instances[5].onclose?.()
    vi.advanceTimersByTime(60_000)
    expect(MockWebSocket.instances).toHaveLength(6)
    handle.close()
  })

  it("构造抛异常时降级模拟流并保持链路可用", () => {
    MockWebSocket.shouldThrow = true
    let mode: EventStreamMode | null = null
    const onEvent = vi.fn()
    const handle = createEventStream({
      url: WS_URL,
      onEvent,
      onModeChange: (m) => {
        mode = m
      },
      intervalMs: 20,
    })

    expect(MockWebSocket.instances).toHaveLength(0)
    expect(mode).toBe("simulated")

    // 模拟流照常注入，链路不中断
    vi.advanceTimersByTime(45)
    expect(onEvent.mock.calls.length).toBeGreaterThan(0)
    handle.close()
  })

  it("close() 后迟到的 onclose 不会复活模拟流或触发重连", () => {
    const onEvent = vi.fn()
    const handle = createEventStream({ url: WS_URL, onEvent, intervalMs: 50 })
    const ws0 = MockWebSocket.instances[0]
    ws0.onopen?.()

    const lateOnClose = ws0.onclose
    handle.close()
    expect(ws0.closedByClient).toBe(true)

    const callsAtClose = onEvent.mock.calls.length
    lateOnClose?.()
    vi.advanceTimersByTime(500)

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(onEvent.mock.calls.length).toBe(callsAtClose)
  })
})
