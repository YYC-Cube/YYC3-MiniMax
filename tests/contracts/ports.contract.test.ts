/**
 * file: ports.contract.test.ts
 * description: 端口契约测试（评分卡 P0-2）· 结构适配断言 + 行为契约断言双保险
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[contract],[port],[hexagonal]
 *
 * test-target: types/ports × services/{eventStream,telemetry,piiReveal,agentReply}
 * notes: 结构断言（端口 ← 适配器赋值）保证类型兼容；行为断言保证语义契约
 *        （高可用降级/审计留痕/资源释放/意图路由四条铁律）
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { resolveAgentReply } from "../../src/services/agentReply"
import { createEventStream } from "../../src/services/eventStream"
import { revealPiiRaw } from "../../src/services/piiReveal"
import {
  addTelemetrySink,
  telemetry,
  type TelemetryEvent,
} from "../../src/services/telemetry"
import type {
  AgentReplyPort,
  EventStreamPort,
  PiiGatewayPort,
  TelemetryPortEvent,
  TelemetrySinkPort,
} from "../../src/types/ports"

function captureSink(): { events: TelemetryEvent[]; uninstall: () => void } {
  const events: TelemetryEvent[] = []
  const uninstall = addTelemetrySink((event) => {
    events.push(event)
  })
  return { events, uninstall }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

// 结构契约：端口 ← 适配器（编译期锁死，适配器 drift 时此处首先失败）
const eventStreamAdapter: EventStreamPort = createEventStream
const piiAdapter: PiiGatewayPort = revealPiiRaw
const agentAdapter: AgentReplyPort = resolveAgentReply

describe("Port: EventStream（实时事件流）", () => {
  it("结构契约：createEventStream 满足 EventStreamPort", () => {
    expect(typeof eventStreamAdapter).toBe("function")
  })

  it("行为契约：模拟流按节拍产出规范 LogItem（含 traceId），close 后静默", () => {
    vi.useFakeTimers()
    const events: unknown[] = []
    const modes: string[] = []
    const handle = createEventStream({
      onEvent: (log) => events.push(log),
      onModeChange: (mode) => modes.push(mode),
      intervalMs: 5,
    })
    // 降级契约：无网关时必须进入 simulated 并通知消费方
    expect(modes).toEqual(["simulated"])
    vi.advanceTimersByTime(12)
    expect(events.length).toBeGreaterThanOrEqual(2)
    const log = events[0] as Record<string, unknown>
    expect(typeof log["agentId"]).toBe("string")
    expect(typeof log["message"]).toBe("string")
    expect(typeof log["traceId"]).toBe("string")
    handle.close()
    const count = events.length
    vi.advanceTimersByTime(50)
    expect(events.length).toBe(count)
  })
})

describe("Port: TelemetrySink（遥测汇点）", () => {
  it("结构契约：端口类型函数可直接注入服务 SPI，卸载后停止接收", () => {
    const received: TelemetryPortEvent[] = []
    const sink: TelemetrySinkPort = (event) => {
      received.push(event)
    }
    const uninstall = addTelemetrySink(sink)
    telemetry.info("contract.probe", {
      message: "hello",
      traceId: "t-contract-1",
    })
    expect(received[0]).toMatchObject({
      level: "info",
      event: "contract.probe",
      message: "hello",
      traceId: "t-contract-1",
    })
    expect(typeof received[0]?.timestamp).toBe("string")
    uninstall()
    telemetry.info("contract.probe.after_uninstall")
    expect(received.length).toBe(1)
  })
})

describe("Port: PiiGateway（PII 受控网关）", () => {
  it("结构契约：revealPiiRaw 满足 PiiGatewayPort", () => {
    expect(typeof piiAdapter).toBe("function")
  })

  it("行为契约：SIM 模式返回显式标注原文，且调取即审计（含 traceId）", async () => {
    const { events, uninstall } = captureSink()
    const payload = await piiAdapter("pii-2")
    expect(payload.raw).toContain("SIM 演示原文")
    const audit = events.find((e) => e.event === "audit.pii.reveal.request")
    expect(audit?.data).toMatchObject({
      action: "pii.reveal.request",
      target: "pii-2",
    })
    expect(typeof audit?.traceId).toBe("string")
    uninstall()
  })

  it("行为契约：未知 logId 必须拒绝（禁止静默空原文）", async () => {
    await expect(piiAdapter("pii-unknown")).rejects.toThrow("未知 PII 审计记录")
  })

  it("行为契约：网关不可达回退掩码快照并降级告警 + 可用性指标=0", async () => {
    vi.stubEnv("NEXT_PUBLIC_PII_REVEAL_API", "https://gw.test/pii")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network unreachable")
      }),
    )
    const { events, uninstall } = captureSink()
    const payload = await piiAdapter("pii-1")
    expect(payload.raw).toContain("离线降级快照")
    expect(
      events.some(
        (e) =>
          e.event === "pii.reveal.gateway_unreachable" && e.level === "warn",
      ),
    ).toBe(true)
    expect(
      events.some(
        (e) => e.event === "metric.pii.reveal.available" && e.data?.value === 0,
      ),
    ).toBe(true)
    uninstall()
  })

  it("行为契约：网关 403 拒绝必须显式抛错", async () => {
    vi.stubEnv("NEXT_PUBLIC_PII_REVEAL_API", "https://gw.test/pii")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 403 })),
    )
    await expect(piiAdapter("pii-1")).rejects.toThrow("HTTP 403")
  })

  it("行为契约：网关成功下发原文 + 可用性指标=1 + 延迟指标", async () => {
    vi.stubEnv("NEXT_PUBLIC_PII_REVEAL_API", "https://gw.test/pii")
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ raw: "受控原文" }), { status: 200 }),
      ),
    )
    const { events, uninstall } = captureSink()
    const payload = await piiAdapter("pii-3")
    expect(payload.raw).toBe("受控原文")
    expect(
      events.some(
        (e) => e.event === "metric.pii.reveal.available" && e.data?.value === 1,
      ),
    ).toBe(true)
    expect(events.some((e) => e.event === "metric.pii.reveal.latency_ms")).toBe(
      true,
    )
    uninstall()
  })
})

describe("Port: AgentReply（语义路由）", () => {
  it("结构契约：resolveAgentReply 满足 AgentReplyPort", () => {
    expect(typeof agentAdapter).toBe("function")
  })

  it("行为契约：四意图路由优先级 质检 > 生产 > 成本 > 兜底", () => {
    const opts = { activeAgentName: "元启·天枢" }
    expect(agentAdapter("查看质检报告", opts).intent).toBe("quality")
    expect(agentAdapter("继续生产", opts).intent).toBe("production")
    expect(agentAdapter("成本多少", opts).intent).toBe("cost")
    const fallback = agentAdapter("hello world", opts)
    expect(fallback.intent).toBe("fallback")
    expect(fallback.text).toContain("元启·天枢")
    expect(fallback.text).toContain("hello world")
  })
})
