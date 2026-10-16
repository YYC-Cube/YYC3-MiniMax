/**
 * file: rum.test.ts
 * description: RUM 采样服务测试（评分卡 P0-1）· vitals/长任务/内存/错误计数/预算告警全链路
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[rum],[observability]
 *
 * test-target: services/rum
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import type { Metric } from "web-vitals"
import {
  DEFAULT_RUM_BUDGETS,
  defaultLongTaskFactory,
  defaultMemoryReader,
  installRumSampling,
  reportVitalMetric,
  type MemoryReader,
  type RumVitalsApi,
} from "../src/services/rum"
import {
  addTelemetrySink,
  telemetry,
  type TelemetryEvent,
} from "../src/services/telemetry"

function makeMetric(
  name: Metric["name"],
  value: number,
  rating: Metric["rating"] = "good",
): Metric {
  return {
    name,
    value,
    rating,
    delta: value,
    id: `v1-${name.toLowerCase()}`,
    entries: [],
    navigationType: "navigate",
    navigationId: 1,
  }
}

function captureSink(): { events: TelemetryEvent[]; uninstall: () => void } {
  const events: TelemetryEvent[] = []
  const uninstall = addTelemetrySink((event) => {
    events.push(event)
  })
  return { events, uninstall }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe("reportVitalMetric（单指标上报）", () => {
  it("LCP 上报为 metric.rum.lcp，单位 ms，携带 rating 标签", () => {
    const { events, uninstall } = captureSink()
    reportVitalMetric(makeMetric("LCP", 1200))
    const event = events.find((e) => e.event === "metric.rum.lcp")
    expect(event).toBeTruthy()
    expect(event?.data).toMatchObject({
      name: "rum.lcp",
      value: 1200,
      unit: "ms",
      rating: "good",
    })
    uninstall()
  })

  it("CLS 上报单位为 score", () => {
    const { events, uninstall } = captureSink()
    reportVitalMetric(makeMetric("CLS", 0.02))
    expect(
      events.find((e) => e.event === "metric.rum.cls")?.data,
    ).toMatchObject({ unit: "score" })
    uninstall()
  })

  it("超预算发 rum.budget_exceeded 结构化告警", () => {
    const { events, uninstall } = captureSink()
    reportVitalMetric(makeMetric("LCP", 3000, "poor"))
    const warn = events.find((e) => e.event === "rum.budget_exceeded")
    expect(warn?.level).toBe("warn")
    expect(warn?.data).toMatchObject({
      vital: "LCP",
      value: 3000,
      budget: DEFAULT_RUM_BUDGETS.lcpMs,
    })
    uninstall()
  })

  it("未超预算不发告警", () => {
    const { events, uninstall } = captureSink()
    reportVitalMetric(makeMetric("INP", 100))
    expect(events.some((e) => e.event === "rum.budget_exceeded")).toBe(false)
    uninstall()
  })

  it("自定义预算可覆盖默认值（棘轮收紧）", () => {
    const { events, uninstall } = captureSink()
    reportVitalMetric(makeMetric("CLS", 0.12), {
      ...DEFAULT_RUM_BUDGETS,
      cls: 0.05,
    })
    expect(events.some((e) => e.event === "rum.budget_exceeded")).toBe(true)
    uninstall()
  })
})

describe("defaultMemoryReader（内存读取）", () => {
  it("无 performance.memory 返回 null", () => {
    vi.stubGlobal("performance", {})
    expect(defaultMemoryReader()).toBeNull()
  })

  it("usedJSHeapSize 非数值返回 null", () => {
    vi.stubGlobal("performance", { memory: { usedJSHeapSize: "bad" } })
    expect(defaultMemoryReader()).toBeNull()
  })

  it("正常读取并四舍五入到两位小数（MB）", () => {
    vi.stubGlobal("performance", {
      memory: { usedJSHeapSize: 123.456 * 1048576 },
    })
    expect(defaultMemoryReader()).toBe(123.46)
  })
})

describe("defaultLongTaskFactory（长任务观测）", () => {
  interface FakePOInstance {
    callback: PerformanceObserverCallback
    disconnected: boolean
    observed: PerformanceObserverInit | null
  }

  function stubPerformanceObserver(options: {
    supportedEntryTypes?: string[]
    observeThrows?: boolean
  }): FakePOInstance[] {
    const instances: FakePOInstance[] = []
    class FakePerformanceObserver {
      static supportedEntryTypes = options.supportedEntryTypes
      callback: PerformanceObserverCallback
      disconnected = false
      observed: PerformanceObserverInit | null = null
      constructor(cb: PerformanceObserverCallback) {
        this.callback = cb
        instances.push(this)
      }
      observe(init: PerformanceObserverInit): void {
        if (options.observeThrows) throw new Error("observe unsupported")
        this.observed = init
      }
      disconnect(): void {
        this.disconnected = true
      }
    }
    vi.stubGlobal("PerformanceObserver", FakePerformanceObserver)
    return instances
  }

  it("PerformanceObserver 不可用返回 no-op", () => {
    vi.stubGlobal("PerformanceObserver", undefined)
    const stop = defaultLongTaskFactory(50)(() => undefined)
    expect(typeof stop).toBe("function")
    expect(() => stop()).not.toThrow()
  })

  it("supportedEntryTypes 不含 longtask 返回 no-op", () => {
    stubPerformanceObserver({ supportedEntryTypes: ["click"] })
    const stop = defaultLongTaskFactory(50)(() => undefined)
    expect(() => stop()).not.toThrow()
  })

  it("observe 抛错返回 no-op 不外溢", () => {
    stubPerformanceObserver({
      supportedEntryTypes: ["longtask"],
      observeThrows: true,
    })
    const stop = defaultLongTaskFactory(50)(() => undefined)
    expect(() => stop()).not.toThrow()
  })

  it("超预算任务回调并携带时长，清理时 disconnect", () => {
    const instances = stubPerformanceObserver({
      supportedEntryTypes: ["longtask"],
    })
    const durations: number[] = []
    const stop = defaultLongTaskFactory(50)((ms) => durations.push(ms))
    const po = instances[0]
    expect(po?.observed).toMatchObject({ type: "longtask", buffered: true })
    const longEntry = { duration: 120 } as PerformanceEntry
    const shortEntry = { duration: 30 } as PerformanceEntry
    po?.callback(
      {
        getEntries: () => [longEntry, shortEntry],
      } as unknown as PerformanceObserverEntryList,
      po as unknown as PerformanceObserver,
    )
    expect(durations).toEqual([120])
    stop()
    expect(po?.disconnected).toBe(true)
  })
})

describe("installRumSampling（安装与卸载）", () => {
  it("安装即发会话计数（错误率分母），注入 vitals 触发上报", () => {
    const { events, uninstall } = captureSink()
    let lcpReport: ((m: Metric) => void) | undefined
    const api: RumVitalsApi = {
      onLCP: (cb) => {
        lcpReport = cb
      },
      onINP: () => undefined,
      onCLS: () => undefined,
      onFCP: () => undefined,
      onTTFB: () => undefined,
    }
    const cleanup = installRumSampling({
      vitalsApi: api,
      samplingIntervalMs: 0,
    })
    expect(events.some((e) => e.event === "metric.rum.session")).toBe(true)
    lcpReport?.(makeMetric("LCP", 1500))
    expect(
      events.some(
        (e) => e.event === "metric.rum.lcp" && e.data?.value === 1500,
      ),
    ).toBe(true)
    cleanup()
    uninstall()
  })

  it("vitals 注册抛错被吞掉不中断安装", () => {
    const { uninstall } = captureSink()
    const api: RumVitalsApi = {
      onLCP: () => {
        throw new Error("no PerformanceObserver")
      },
      onINP: () => undefined,
      onCLS: () => undefined,
      onFCP: () => undefined,
      onTTFB: () => undefined,
    }
    expect(() =>
      installRumSampling({ vitalsApi: api, samplingIntervalMs: 0 }),
    ).not.toThrow()
    uninstall()
  })

  it("vitalsApi: null 关闭 vitals 采样", () => {
    const { events, uninstall } = captureSink()
    installRumSampling({ vitalsApi: null, samplingIntervalMs: 0 })
    expect(events.every((e) => !e.event.startsWith("metric.rum.l"))).toBe(true)
    uninstall()
  })

  it("注入 longtask 工厂：超预算任务上报 metric.rum.longtask，卸载调用工厂清理", () => {
    const { events, uninstall } = captureSink()
    let onLongTask: ((ms: number) => void) | undefined
    let disposed = false
    const cleanup = installRumSampling({
      vitalsApi: null,
      samplingIntervalMs: 0,
      longTaskObserverFactory: (cb) => {
        onLongTask = cb
        return () => {
          disposed = true
        }
      },
    })
    onLongTask?.(120.4)
    expect(
      events.find((e) => e.event === "metric.rum.longtask")?.data,
    ).toMatchObject({
      value: 120,
      unit: "ms",
    })
    cleanup()
    expect(disposed).toBe(true)
    uninstall()
  })

  it("周期采样：内存读数 + 错误计数冲刷（错误率分子）", () => {
    vi.useFakeTimers()
    const { events, uninstall } = captureSink()
    const memoryReader: MemoryReader = () => 123.456
    const cleanup = installRumSampling({
      vitalsApi: null,
      samplingIntervalMs: 1000,
      memoryReader,
    })
    telemetry.error("runtime.probe", { message: "x" })
    vi.advanceTimersByTime(1000)
    expect(
      events.find((e) => e.event === "metric.rum.memory_used_mb")?.data,
    ).toMatchObject({
      value: 123.456,
      unit: "mb",
    })
    expect(
      events.find((e) => e.event === "metric.rum.errors")?.data,
    ).toMatchObject({
      value: 1,
      unit: "count",
    })
    cleanup()
    uninstall()
  })

  it("内存不可用仍冲刷错误计数", () => {
    vi.useFakeTimers()
    const { events, uninstall } = captureSink()
    const memoryReader: MemoryReader = () => null
    const cleanup = installRumSampling({
      vitalsApi: null,
      samplingIntervalMs: 1000,
      memoryReader,
    })
    telemetry.error("runtime.probe", { message: "x" })
    vi.advanceTimersByTime(1000)
    expect(events.some((e) => e.event === "metric.rum.memory_used_mb")).toBe(
      false,
    )
    expect(
      events.find((e) => e.event === "metric.rum.errors")?.data?.value,
    ).toBe(1)
    cleanup()
    uninstall()
  })

  it("异常内存读数（>4GB）被过滤不误报", () => {
    vi.useFakeTimers()
    const { events, uninstall } = captureSink()
    const cleanup = installRumSampling({
      vitalsApi: null,
      samplingIntervalMs: 1000,
      memoryReader: () => 5000,
    })
    vi.advanceTimersByTime(1000)
    expect(events.some((e) => e.event === "metric.rum.memory_used_mb")).toBe(
      false,
    )
    cleanup()
    uninstall()
  })

  it("samplingIntervalMs 缺省走 60s（?? 分支），0 关闭周期采样", () => {
    vi.useFakeTimers()
    const { events, uninstall } = captureSink()
    const cleanupDefault = installRumSampling({
      vitalsApi: null,
      memoryReader: () => 10,
    })
    vi.advanceTimersByTime(60_000)
    expect(events.some((e) => e.event === "metric.rum.errors")).toBe(true)
    cleanupDefault()

    const cleanupOff = installRumSampling({
      vitalsApi: null,
      samplingIntervalMs: 0,
    })
    const eventsAfter = events.length
    vi.advanceTimersByTime(600_000)
    expect(events.length).toBe(eventsAfter)
    cleanupOff()
    uninstall()
  })

  it("cleanup 幂等：重复调用不抛错", () => {
    const { uninstall } = captureSink()
    const cleanup = installRumSampling({
      vitalsApi: null,
      samplingIntervalMs: 1000,
      memoryReader: () => null,
    })
    cleanup()
    expect(() => cleanup()).not.toThrow()
    uninstall()
  })
})
