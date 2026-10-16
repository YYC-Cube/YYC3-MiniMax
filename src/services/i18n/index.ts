/**
 * file: index.ts
 * description: i18n 服务门面 · 应用单例 + 星期标签本地化（Intl，S13 日期本地化锚点）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [i18n],[service]
 *
 * brief: 无 UI 服务层模块（零 react/next 依赖）；运行时语言切换 UI 为后续特性，
 *        当前缺省 zh-CN，双语就绪由 tests/i18n.test.ts 键一致性门禁保障
 *
 * dependencies: ./core, ./locales
 * exports: createI18n, DICTIONARIES, DEFAULT_LOCALE, getI18n, formatWeekdayLabel
 */

import type { I18n, Locale } from "./core"
import { createI18n } from "./core"
import { DEFAULT_LOCALE, DICTIONARIES } from "./locales"

export { createI18n } from "./core"
export type { Dictionary, I18n, Locale } from "./core"
export { DEFAULT_LOCALE, DICTIONARIES } from "./locales"

let singleton: I18n | null = null

/** 应用单例（模块级缓存，缺省 zh-CN；组件内直接取 t/locale，纯读取无状态） */
export function getI18n(): I18n {
  singleton ??= createI18n(DICTIONARIES, DEFAULT_LOCALE)
  return singleton
}

/**
 * 星期标签本地化（S13「日期本地化」真实接线点，P1 ClockCenter 消费）：
 * zh 系走 narrow（日/一/…/六，与现行版式逐字一致），其余走 short（Sun/Mon/…）
 */
export function formatWeekdayLabel(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  const style = locale.startsWith("zh") ? ("narrow" as const) : ("short" as const)
  return new Intl.DateTimeFormat(locale, { weekday: style }).format(date)
}
