/**
 * file: PwaInstallButton.tsx
 * description: PWA 安装按钮 · beforeinstallprompt 可用时出现（桌面/移动通用）
 */

import { Download } from "lucide-react"
import React from "react"
import { useI18nLocale } from "../hooks/useI18nLocale"
import { usePwaInstall } from "../hooks/usePwaInstall"

interface PwaInstallButtonProps {
  variant?: "header" | "mobile"
}

export const PwaInstallButton: React.FC<PwaInstallButtonProps> = ({
  variant = "header",
}) => {
  const { canInstall, promptInstall } = usePwaInstall()
  const { t } = useI18nLocale()
  if (!canInstall) return null

  const isMobile = variant === "mobile"

  return (
    <button
      onClick={() => void promptInstall()}
      title={t("install.title")}
      className={`flex items-center gap-1 rounded-md border border-[#00FF88]/40 bg-[#00FF88]/15 text-[#00FF88] font-bold hover:bg-[#00FF88]/25 transition-colors cursor-pointer ${isMobile ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"
        }`}
    >
      <Download size={isMobile ? 10 : 12} />
      <span>{isMobile ? t("install.labelMobile") : t("install.labelDesktop")}</span>
    </button>
  )
}
