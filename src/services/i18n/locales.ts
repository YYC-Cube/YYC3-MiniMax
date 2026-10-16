/**
 * file: locales.ts
 * description: i18n 词典单一事实源 · zh-CN 缺省 + en 全量键镜像（tests/i18n.test.ts 强制键一致）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [i18n],[locales]
 *
 * brief: 新增文案必须 zh/en 同步成对入典，键一致性由专项测试门禁（无缺失/无多余）
 *
 * dependencies: core（仅类型）
 * exports: DEFAULT_LOCALE, DICTIONARIES
 */

import type { Dictionary, Locale } from "./core"

export const DEFAULT_LOCALE: Locale = "zh-CN"

export const DICTIONARIES: Record<Locale, Dictionary> = {
  "zh-CN": {
    install: {
      title: "安装到桌面/主屏幕（PWA 离线可用）",
      labelMobile: "安装",
      labelDesktop: "安装应用",
    },
    locale: {
      switchTitle: "切换界面语言至 English",
      switchLabel: "EN",
    },
  },
  en: {
    install: {
      title: "Install to desktop / home screen (offline-ready PWA)",
      labelMobile: "Install",
      labelDesktop: "Install App",
    },
    locale: {
      switchTitle: "Switch interface language to 中文",
      switchLabel: "中文",
    },
  },
}
