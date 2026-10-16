/**
 * file: rum.ts
 * description: RUM 实时用户监控 · web-vitals 采样/长任务观测/内存采样/错误计数（评分卡 P0-1）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [service],[rum],[observability],[web-vitals]
 *
 * brief: 客户端运行时指标统一经 telemetry.metric 结构化上报：错误率/p95/长任务/内存四维可度量
 *
 * details:
 * - vitals：LCP/INP/CLS/FCP/TTFB 经 web-vitals 采集，超预算发 rum.budget_exceeded 结构化告警
 * - 长任务：PerformanceObserver(longtask) 采样，仅上报超 budgets.longTaskMs 的任务（评分卡目标 <50ms）
 * - 内存：周期读取 performance.memory（Chrome），8h soak 数据源（评分卡目标：内存平稳）
 * - 错误计数：遥测 sink 计数 level=error 事件，周期冲刷 metric.rum.errors（错误率分子）
 * - 会话计数：安装即发 metric.rum.session=1（错误率分母）
 * - 采样故障绝不中断业务：注册/观测全程 try/catch，与 telemetry 同一降级哲学
 * - 预算棘轮：DEFAULT_RUM_BUDGETS 只升不降，禁止放宽预算替代修复
 *
 * dependencies: web-vitals, telemetry
 * exports: RumBudgets, DEFAULT_RUM_BUDGETS, RumVitalsApi, MemoryReader, LongTaskObserverFactory,
 *          RumSamplingOptions, installRumSampling, reportVitalMetric, defaultMemoryReader, defaultLongTaskFactory
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals"
import { addTelemetrySink, telemetry } from "./telemetry"

export interface RumBudgets {
  lcpMs: number
  inpMs: number
  cls: number
  fcpMs: number
  ttfbMs: number
  /** 超过该时长（ms）的长任务才采样上报（评分卡目标：长任务 <50ms） */
  longTaskMs: number
}

/** 评分卡运行时预算（棘轮只升不降） */
export const DEFAULT_RUM_BUDGETS: RumBudgets = {
  lcpMs: 2000,
  inpMs: 200,
  cls: 0.1,
  fcpMs: 1800,
  ttfbMs: 800,
  longTaskMs: 50,
}

type VitalReporter = (onReport: (metric: Metric) => void) => void

export interface RumVitalsApi {
  onLCP: VitalReporter
  onINP: VitalReporter
  onCLS: VitalReporter
  onFCP: VitalReporter
  onTTFB: VitalReporter
}

const defaultVitalsApi: RumVitalsApi = { onLCP, onINP, onCLS, onFCP, onTTFB }

/** 读取 JS 堆已用内存（MB）；不可用环境返回 null */
export type MemoryReader = () => number | null

/** 注册 longtask 观测，回调只收超预算任务时长；返回卸载函数 */
export type LongTaskObserverFactory = (
  onLongTask: (durationMs: number) => void,
) => () => void

export interface RumSamplingOptions {
  budgets?: Partial<RumBudgets>
  /** 周期采样间隔（内存 + 错误计数冲刷，ms）；0 关闭周期采样。缺省 60000 */
  samplingIntervalMs?: number
  /** 覆盖默认 vitals 绑定；null 关闭 vitals 采样（测试注入用）。缺省内置 web-vitals */
  vitalsApi?: RumVitalsApi | null
  /** 覆盖默认 longtask 观测工厂（测试注入用）。缺省内置 PerformanceObserver */
  longTaskObserverFactory?: LongTaskObserverFactory
  /** 覆盖内存读取器（测试注入用）。缺省 performance.memory */
  memoryReader?: MemoryReader
}

interface PerformanceMemoryLegacy {
  usedJSHeapSize: number
}

export function defaultMemoryReader(): number | null {
  const perf = performance as Performance & { memory?: PerformanceMemoryLegacy }
  const mem = perf.memory
  if (!mem || typeof mem.usedJSHeapSize !== "number") return null
  return Math.round((mem.usedJSHeapSize / 1048576) * 100) / 100
}

/** Chrome/Chromium 堆上限约 4GB，用于过滤异常脏数据 */
const MAX_PLAUSIBLE_HEAP_MB = 4096

export function defaultLongTaskFactory(
  budgetMs: number,
): LongTaskObserverFactory {
  return (onLongTask) => {
    if (typeof PerformanceObserver === "undefined") return () => undefined
    const supported = (PerformanceObserver as typeof PerformanceObserver & {
      supportedEntryTypes?: string[]
    }).supportedEntryTypes
    if (Array.isArray(supported) && !supported.includes("longtask"))
      return () => undefined
    let observer: PerformanceObserver | null = null
    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > budgetMs) onLongTask(entry.duration)
        }
      })
      observer.observe({ type: "longtask", buffered: true })
    } catch {
      return () => undefined
    }
    return () => {
      observer?.disconnect()
    }
  }
}

const VITAL_UNITS: Record<Metric["name"], string> = {
  LCP: "ms",
  INP: "ms",
  FCP: "ms",
  TTFB: "ms",
  CLS: "score",
}

const VITAL_BUDGET_KEYS: Record<Metric["name"], keyof RumBudgets> = {
  LCP: "lcpMs",
  INP: "inpMs",
  FCP: "fcpMs",
  TTFB: "ttfbMs",
  CLS: "cls",
}

/**
 * 单个 vital 指标上报：metric 事件 + 超预算结构化告警（installRumSampling 与测试共用）
 */
export function reportVitalMetric(
  metric: Metric,
  budgets: RumBudgets = DEFAULT_RUM_BUDGETS,
): void {
  telemetry.metric(`rum.${metric.name.toLowerCase()}`, metric.value, {
    unit: VITAL_UNITS[metric.name],
    tags: { rating: metric.rating },
  })
  const budget = budgets[VITAL_BUDGET_KEYS[metric.name]]
  if (metric.value > budget) {
    telemetry.warn("rum.budget_exceeded", {
      message: `${metric.name} 超预算: ${metric.value} > ${budget}`,
      data: {
        vital: metric.name,
        value: metric.value,
        budget,
        rating: metric.rating,
      },
    })
  }
}

/**
 * 安装 RUM 采样（客户端一次性安装，返回卸载函数）：
 * 会话计数 → vitals 绑定 → longtask 观测 → 错误计数 sink → 周期采样（内存/错误冲刷）
 */
export function installRumSampling(
  options: RumSamplingOptions = {},
): () => void {
  const budgets: RumBudgets = { ...DEFAULT_RUM_BUDGETS, ...options.budgets }
  const disposables: Array<() => void> = []

  // 错误率分母：会话开始即计数
  telemetry.metric("rum.session", 1, { unit: "count" })

  // vitals：注册失败静默跳过（遥测绝不中断业务）
  const api =
    options.vitalsApi === undefined ? defaultVitalsApi : options.vitalsApi
  if (api) {
    const report = (metric: Metric): void => reportVitalMetric(metric, budgets)
    for (const register of [
      api.onLCP,
      api.onINP,
      api.onCLS,
      api.onFCP,
      api.onTTFB,
    ]) {
      try {
        register(report)
      } catch {
        // 环境不支持（如无 PerformanceObserver）：跳过该指标
      }
    }
  }

  // 长任务：仅上报超预算任务
  const longTaskFactory =
    options.longTaskObserverFactory ??
    defaultLongTaskFactory(budgets.longTaskMs)
  disposables.push(
    longTaskFactory((durationMs) => {
      telemetry.metric("rum.longtask", Math.round(durationMs), { unit: "ms" })
    }),
  )

  // 错误计数（错误率分子）：经遥测 sink 计数，周期冲刷
  let errorCount = 0
  disposables.push(
    addTelemetrySink((event) => {
      if (event.level === "error") errorCount += 1
    }),
  )

  // 周期采样：内存 + 错误计数冲刷
  const memoryReader = options.memoryReader ?? defaultMemoryReader
  if (options.samplingIntervalMs !== 0) {
    const timer = setInterval(() => {
      const usedMb = memoryReader()
      if (usedMb !== null && usedMb <= MAX_PLAUSIBLE_HEAP_MB) {
        telemetry.metric("rum.memory_used_mb", usedMb, { unit: "mb" })
      }
      telemetry.metric("rum.errors", errorCount, { unit: "count" })
    }, options.samplingIntervalMs ?? 60_000)
    disposables.push(() => {
      clearInterval(timer)
    })
  }

  return () => {
    for (const dispose of disposables.splice(0).reverse()) dispose()
  }
}
