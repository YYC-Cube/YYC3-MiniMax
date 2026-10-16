/**
 * file: context/gate.tsx
 * description: 门禁模拟域上下文 · GATE-FAIL 演示事故跨视图共享（P2 触发 → P5 判定消费）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [context],[gate],[simulation]
 *
 * brief: 激活态由 P5 门禁判定消费（一致性注入 GATE_SIM_SAMPLE_SCORE），
 *        打通 P2 门禁测试 → P5 总览/中卡真实降级的演示闭环；
 *        复位入口为 GateFailureModal「忽略测试」
 *
 * details:
 * - 上下文带默认值：单测直渲染视图无需包 Provider（缺省即"无演示事故"无害语义）
 * - 单域消费者用 useGate 缩窄订阅；跨域经 useCommandCenter
 *
 * dependencies: react
 * exports: GateProvider, useGate
 */

"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

interface GateValue {
  /** GATE-FAIL 演示事故是否处于激活态（P5 门禁一致性判定消费） */
  gateFailSimulated: boolean
  /** P2 门禁测试触发：激活演示事故（遥测/审计链路照常上报） */
  simulateGateFail: () => void
  /** 演示事故复位（模态「忽略测试」语义：不采纳此次模拟） */
  clearGateFail: () => void
}

const DEFAULT_VALUE: GateValue = {
  gateFailSimulated: false,
  simulateGateFail: () => {},
  clearGateFail: () => {},
}

const GateContext = createContext<GateValue>(DEFAULT_VALUE)

export function GateProvider({ children }: { children: ReactNode }) {
  const [gateFailSimulated, setGateFailSimulated] = useState(false)
  const simulateGateFail = useCallback(() => setGateFailSimulated(true), [])
  const clearGateFail = useCallback(() => setGateFailSimulated(false), [])
  const value = useMemo(
    () => ({ gateFailSimulated, simulateGateFail, clearGateFail }),
    [gateFailSimulated, simulateGateFail, clearGateFail],
  )
  return (
    <GateContext.Provider value={value}>{children}</GateContext.Provider>
  )
}

export function useGate(): GateValue {
  return useContext(GateContext)
}
