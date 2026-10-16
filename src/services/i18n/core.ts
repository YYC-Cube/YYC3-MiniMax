/**
 * file: core.ts
 * description: YYC³ 自研轻量 i18n 核 · 嵌套键解析 / {param} 插值 / one|other 复数 / 缺省语言回退
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [i18n],[core],[pure]
 *
 * brief: 零依赖纯模块（无 react/next/浏览器 API），键一致性与回退行为由 tests/i18n.test.ts 门禁
 *
 * dependencies: 无
 * exports: createI18n
 */

export type Locale = string

/** 嵌套键树，叶子为字符串（叶子可用 "one|other" 双态语法，配 {count} 插值启用复数） */
export type Dictionary = Record<string, unknown>

export type InterpolationParams = Record<string, string | number>

export interface I18n {
  /** 当前语言标签（BCP 47，如 zh-CN / en） */
  readonly locale: Locale
  /** 已装配的全部语言标签 */
  readonly locales: readonly Locale[]
  /** 派生指定语言的取词器（键缺失时仍回退缺省语言） */
  withLocale(locale: Locale): I18n
  /**
   * 取词：点路径嵌套 → 当前语言 → 缺省语言回退 → 键原样兜底（显式可见，防静默漏翻）
   * 插值 {name}；叶子含 "|" 且参数含 count 时按 count===1 选前态（复数）
   */
  t(key: string, params?: InterpolationParams): string
}

const INTERPOLATION = /\{(\w+)\}/g

/** 点路径取叶子字符串；对象/缺失视为未命中 */
function lookup(dictionary: Dictionary, key: string): string | undefined {
  let node: unknown = dictionary
  for (const segment of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined
    node = (node as Record<string, unknown>)[segment]
  }
  return typeof node === "string" ? node : undefined
}

/** 单复数选形：约定 "one|other" 两态；无 "|" 视为单态原文（zh 类语言天然单态） */
function selectPlural(template: string, params: InterpolationParams | undefined): string {
  const count = params?.count
  if (typeof count !== "number" || !template.includes("|")) return template
  const separator = template.indexOf("|")
  return count === 1 ? template.slice(0, separator) : template.slice(separator + 1)
}

/** {name} 插值；缺失参数保留占位符原样（显式暴露漏参，不静默吞错） */
function interpolate(template: string, params: InterpolationParams | undefined): string {
  if (!params) return template
  return template.replace(INTERPOLATION, (token, name: string) => {
    const value = params[name]
    return value === undefined ? token : String(value)
  })
}

export function createI18n(
  dictionaries: Record<Locale, Dictionary>,
  defaultLocale: Locale,
): I18n {
  if (!(defaultLocale in dictionaries)) {
    throw new Error(`[i18n] 缺省语言字典缺失: ${defaultLocale}`)
  }
  const locales = Object.keys(dictionaries)
  const resolve = (locale: Locale): I18n => ({
    locale,
    locales,
    withLocale: (target) => resolve(target),
    t(key, params) {
      const template =
        lookup(dictionaries[locale] ?? {}, key) ??
        lookup(dictionaries[defaultLocale], key) ??
        key
      return interpolate(selectPlural(template, params), params)
    },
  })
  return resolve(defaultLocale)
}
