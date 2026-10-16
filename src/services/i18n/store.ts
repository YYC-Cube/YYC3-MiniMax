/**
 * file: store.ts
 * description: i18n locale 外部 Store · 模块级 observable + localStorage 持久化 + 跨 Tab 同步
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [i18n],[store],[persistence]
 *
 * brief: useSyncExternalStore 三件套（snapshot/serverSnapshot/subscribe）+ setLocale 命令；
 *        水合安全——SSR/预渲染恒为缺省语言，挂载后订阅时机从持久化层水合并通知重渲染
 *
 * details:
 * - 持久化键 yyc3.locale；非法/缺失值静默回退缺省语言（存储不可信原则）
 * - hydrate 在 subscribe 首次调用时执行（useSyncExternalStore 的 subscribe 为挂载后 effect 时机，副作用合法）
 * - storage 事件跨 Tab 同步；<html lang> 随语言联动（a11y）
 * - localStorage 读写全部 try/catch（隐私模式等场景降级为会话内切换，不阻断）
 *
 * dependencies: ./core（类型）, ./locales
 * exports: getLocaleSnapshot, getServerLocaleSnapshot, subscribeLocale, setLocale
 */

import type { Locale } from "./core"
import { DEFAULT_LOCALE, DICTIONARIES } from "./locales"

const STORAGE_KEY = "yyc3.locale"

type Listener = () => void

const listeners = new Set<Listener>()

let currentLocale: Locale = DEFAULT_LOCALE
let hydrated = false

function isSupported(locale: string): locale is Locale {
  return locale in DICTIONARIES
}

function readStoredLocale(): Locale | null {
  if (typeof localStorage === "undefined") return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored !== null && isSupported(stored) ? stored : null
  } catch {
    return null
  }
}

function syncDocumentLang(locale: Locale): void {
  if (typeof document !== "undefined") document.documentElement.lang = locale
}

function applyLocale(locale: Locale): void {
  currentLocale = locale
  syncDocumentLang(locale)
  for (const listener of listeners) listener()
}

/** 当前语言快照（纯读；React 渲染期多次调用值稳定） */
export function getLocaleSnapshot(): Locale {
  return currentLocale
}

/** 服务端/水合期快照：恒为缺省语言（水合安全，避免 prerender HTML 不匹配） */
export function getServerLocaleSnapshot(): Locale {
  return DEFAULT_LOCALE
}

/**
 * 订阅语言变更（useSyncExternalStore 协议）。
 * 首次订阅时自 localStorage 水合（存有合法语言且异于当前 → 应用并通知）；
 * 同时监听 storage 事件实现跨 Tab 同步。
 */
export function subscribeLocale(listener: Listener): () => void {
  listeners.add(listener)

  if (!hydrated) {
    hydrated = true
    const stored = readStoredLocale()
    if (stored !== null && stored !== currentLocale) applyLocale(stored)
  }

  const onStorage = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEY) return
    const next = event.newValue
    if (next !== null && isSupported(next) && next !== currentLocale) {
      applyLocale(next)
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage)
  }

  return () => {
    listeners.delete(listener)
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage)
    }
  }
}

/** 切换语言：校验支持 → 更新 → 持久化 → 联动 html lang → 通知订阅者；不支持或同值 no-op */
export function setLocale(locale: Locale): void {
  if (!isSupported(locale) || locale === currentLocale) return
  try {
    localStorage?.setItem(STORAGE_KEY, locale)
  } catch {
    // 持久化失败（隐私模式等）降级为会话内切换
  }
  applyLocale(locale)
}
