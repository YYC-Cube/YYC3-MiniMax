/**
 * file: LocaleToggle.tsx
 * description: 语言切换按钮 · zh-CN ⇄ en（外部 Store 订阅 + localStorage 持久化 + 跨 Tab 同步）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [component],[i18n],[ui]
 *
 * brief: 显示目标语言标签（zh 站显示 EN，en 站显示 中文）；点击即切，持久化由 store 层承担
 *
 * dependencies: react, lucide-react, hooks/useI18nLocale
 * exports: LocaleToggle
 */

import { Languages } from "lucide-react"
import React from "react"
import { useI18nLocale } from "../hooks/useI18nLocale"

interface LocaleToggleProps {
  variant?: "header" | "mobile"
}

export const LocaleToggle: React.FC<LocaleToggleProps> = ({
  variant = "header",
}) => {
  const { locale, setLocale, t } = useI18nLocale()
  const isMobile = variant === "mobile"

  return (
    <button
      onClick={() => setLocale(locale === "zh-CN" ? "en" : "zh-CN")}
      title={t("locale.switchTitle")}
      aria-label={t("locale.switchTitle")}
      className={`flex items-center gap-1 rounded-md border border-[#BF00FF]/40 bg-[#BF00FF]/15 text-[#BF00FF] font-bold hover:bg-[#BF00FF]/25 transition-colors cursor-pointer ${
        isMobile ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"
      }`}
    >
      <Languages size={isMobile ? 10 : 12} />
      <span>{t("locale.switchLabel")}</span>
    </button>
  )
}
