/**
 * file: i18n.test.ts
 * description: S13 i18n 链路专项门禁 · 键一致 / 切换无残留 / 插值 / 复数 / 嵌套 / 回退 / 日期本地化
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[unit],[i18n],[s13]
 *
 * brief: 自研 i18n 核（src/services/i18n）键一致性强制门禁 + 核能力行为断言
 *
 * test-target: src/services/i18n/**
 * notes: 新增文案必须 zh-CN/en 成对入典，本测试对缺失/多余键零容忍
 */

import { describe, expect, it } from "vitest"
import type { Dictionary } from "../src/services/i18n"
import {
  createI18n,
  DEFAULT_LOCALE,
  DICTIONARIES,
  formatWeekdayLabel,
  getI18n,
} from "../src/services/i18n"

/** 键树展平为点路径数组（叶子为字符串） */
function flattenKeys(dict: Dictionary, prefix = ""): string[] {
  return Object.entries(dict).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === "string" ? [path] : flattenKeys(value as Dictionary, path)
  })
}

/** 核能力演示词典（插值/复数/嵌套行为断言用，与产品词典解耦） */
const DEMO = {
  "zh-CN": {
    greet: "你好，{name}",
    items: "{count} 项",
    deep: { nested: { key: "深层取词" } },
    onlyZh: "仅缺省语言",
  },
  en: {
    greet: "Hello, {name}",
    items: "{count} item|{count} items",
    deep: { nested: { key: "deep lookup" } },
  },
} as const

describe("S13 i18n · 键一致（zh-CN ⇄ en 全量镜像）", () => {
  it("两语言键集合深度相等（无缺失 / 无多余 / 无空串叶子）", () => {
    const zhKeys = flattenKeys(DICTIONARIES[DEFAULT_LOCALE]).sort()
    const enKeys = flattenKeys(DICTIONARIES.en).sort()
    expect(zhKeys).toEqual(enKeys)
    expect(zhKeys.length).toBeGreaterThan(0)
    for (const key of zhKeys) {
      expect(key, "空串叶子禁止").not.toMatch(/\.$/)
    }
  })

  it("缺省语言为 zh-CN 且单例已装配", () => {
    const i18n = getI18n()
    expect(i18n.locale).toBe("zh-CN")
    expect(i18n.locales).toContain("en")
  })
})

describe("S13 i18n · 语言切换无残留", () => {
  it("双语言全键可解析（withLocale 派生后 t(key) 不落回键名 → 无漏翻残留）", () => {
    const base = createI18n(DICTIONARIES, DEFAULT_LOCALE)
    for (const locale of ["zh-CN", "en"] as const) {
      const i18n = base.withLocale(locale)
      expect(i18n.locale).toBe(locale)
      for (const key of flattenKeys(DICTIONARIES[locale])) {
        const rendered = i18n.t(key)
        expect(rendered, `${locale}:${key} 解析失败`).not.toBe(key)
        expect(rendered.length).toBeGreaterThan(0)
      }
    }
  })

  it("切换语言后取词结果随 locale 变化（zh/install.title ≠ en/install.title）", () => {
    const base = createI18n(DICTIONARIES, DEFAULT_LOCALE)
    expect(base.t("install.title")).not.toBe(base.withLocale("en").t("install.title"))
    expect(base.t("install.labelDesktop")).toBe("安装应用")
    expect(base.withLocale("en").t("install.labelDesktop")).toBe("Install App")
  })
})

describe("S13 i18n · 插值 {param}", () => {
  const zh = createI18n(DEMO, "zh-CN")
  const en = zh.withLocale("en")

  it("双语言插值替换且无占位符残留", () => {
    expect(zh.t("greet", { name: "YYC³" })).toBe("你好，YYC³")
    expect(en.t("greet", { name: "YYC³" })).toBe("Hello, YYC³")
    expect(zh.t("greet", { name: "YYC³" })).not.toMatch(/\{\w+\}/)
  })

  it("缺失参数保留占位符原样（显式暴露漏参）", () => {
    expect(zh.t("greet")).toBe("你好，{name}")
  })
})

describe("S13 i18n · 复数 one|other", () => {
  const zh = createI18n(DEMO, "zh-CN")
  const en = zh.withLocale("en")

  it("en 按 count 选形（1 → one，其余 → other）", () => {
    expect(en.t("items", { count: 1 })).toBe("1 item")
    expect(en.t("items", { count: 5 })).toBe("5 items")
  })

  it("zh 单态叶子（无 |）插值不受复数机制影响", () => {
    expect(zh.t("items", { count: 1 })).toBe("1 项")
    expect(zh.t("items", { count: 5 })).toBe("5 项")
  })
})

describe("S13 i18n · 嵌套键", () => {
  it("点路径深层取词双语言一致", () => {
    const zh = createI18n(DEMO, "zh-CN")
    const en = zh.withLocale("en")
    expect(zh.t("deep.nested.key")).toBe("深层取词")
    expect(en.t("deep.nested.key")).toBe("deep lookup")
  })
})

describe("S13 i18n · 回退策略", () => {
  const zh = createI18n(DEMO, "zh-CN")
  const en = zh.withLocale("en")

  it("当前语言缺键回退缺省语言（en 缺 onlyZh → 取 zh-CN）", () => {
    expect(en.t("onlyZh")).toBe("仅缺省语言")
  })

  it("全语言未知的键原样返回键名（显式可见，防静默空文案）", () => {
    expect(en.t("totally.unknown.key")).toBe("totally.unknown.key")
  })
})

describe("S13 i18n · 日期本地化（Intl，P1 ClockCenter 消费形态）", () => {
  it("工作日：zh-CN narrow 单字（五）与历史版式逐字一致，en short（Fri）", () => {
    const friday = new Date(2026, 9, 16) // 2026-10-16 周五
    expect(formatWeekdayLabel(friday, "zh-CN")).toBe("五")
    expect(formatWeekdayLabel(friday, "en")).toBe("Fri")
  })

  it("周末：zh-CN narrow（六），周末着色判定仍由组件 getDay 驱动", () => {
    const saturday = new Date(2026, 9, 17) // 2026-10-17 周六
    expect(formatWeekdayLabel(saturday, "zh-CN")).toBe("六")
    expect(saturday.getDay()).toBe(6)
  })
})
