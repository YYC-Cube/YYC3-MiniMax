/**
 * file: BrandMark.tsx
 * description: 全局品牌标识 · 言语云³ 透明底 logo 统一引用（多端单一真源）
 *
 * brief: Header / W1 浮窗 / 移动端 / PWA 内一律使用此组件，
 *        图源 public/yyc3-icons/brand/logo-transparent-256.png（青色云形标）
 */

import React from "react"

export const BRAND_LOGO_SRC = "/yyc3-icons/brand/logo-transparent-256.png"

interface BrandMarkProps {
  /** 渲染边长 px（正方形） */
  size?: number
  className?: string
  /** 无光晕（用于小尺寸/密集场景） */
  quiet?: boolean
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  size = 28,
  className = "",
  quiet = false,
}) => (
  <img
    src={BRAND_LOGO_SRC}
    width={size}
    height={size}
    alt="YYC³ 言语云"
    draggable={false}
    decoding="async"
    className={`object-contain select-none ${
      quiet ? "" : "drop-shadow-[0_0_6px_rgba(0,240,255,0.45)]"
    } ${className}`}
    style={{ width: size, height: size }}
  />
)
