/**
 * file: useI18nLocale.ts
 * description: i18n locale Hook · useSyncExternalStore 订阅外部 Store（水合安全 + 切换重渲染）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [hook],[i18n]
 *
 * brief: 返回 { locale, setLocale, t }；t 已按当前 locale 派生，语言切换自动重渲染消费组件。
 *        相比 getI18n() 静态单例，本 Hook 是运行时切换的唯一响应式入口
 *
 * dependencies: react, services/i18n/store, services/i18n
 * exports: useI18nLocale
 */

import { useSyncExternalStore } from "react"
import { getI18n } from "../services/i18n"
import type { InterpolationParams } from "../services/i18n/core"
import {
  getLocaleSnapshot,
  getServerLocaleSnapshot,
  setLocale,
  subscribeLocale,
} from "../services/i18n/store"

export function useI18nLocale(): {
  locale: string
  setLocale: (locale: string) => void
  t: (key: string, params?: InterpolationParams) => string
} {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getServerLocaleSnapshot,
  )
  const { t } = getI18n().withLocale(locale)
  return { locale, setLocale, t }
}
