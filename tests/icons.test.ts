/**
 * file: icons.test.ts
 * description: S13 图标链路专项门禁 · 5 平台 PNG 尺寸矩阵 + manifest 对齐 + 安装性断言
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [test],[unit],[icons],[pwa],[s13]
 *
 * brief: 零依赖解析 PNG IHDR 头核验 public/yyc3-icons/ 全量尺寸单一真源，
 *        并断言 manifest.webmanifest icons/shortcuts 与物理文件逐一吻合
 *
 * test-target: public/yyc3-icons/**, public/manifest.webmanifest
 * notes: 新增/删除图标必须同步 ICON_MATRIX（矩阵与目录严格双向对齐，防漂移）
 */

import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const PUBLIC = join(process.cwd(), "public")
const ICONS_ROOT = join(PUBLIC, "yyc3-icons")
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** 解析 PNG IHDR 物理尺寸（字节 16-19 宽 / 20-23 高，大端序），非 PNG 直接失败 */
function pngSize(rel: string): { width: number; height: number } {
  const buf = readFileSync(join(ICONS_ROOT, rel))
  expect(
    buf.length > 24 && buf.subarray(0, 8).equals(PNG_MAGIC),
    `${rel} 不是有效 PNG 文件`,
  ).toBe(true)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

/** 递归枚举 yyc3-icons 下全部 PNG（相对路径，POSIX 分隔符） */
function listPngs(dir: string, prefix = ""): string[] {
  const out: string[] = []
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) out.push(...listPngs(dir, rel))
    else if (entry.name.toLowerCase().endsWith(".png")) out.push(rel)
  }
  return out
}

/**
 * 5 平台全量尺寸矩阵（单一事实源，S13 sips 审计基线固化）。
 * brand/logo-transparent-* 为非方形字标（256x176 / 408x281），按实绩记录。
 */
const ICON_MATRIX: Record<string, [number, number]> = {
  // Android 密度阶梯（mdpi → xxxhdpi）+ Play Store
  "Android/mdpi.png": [48, 48],
  "Android/hdpi.png": [72, 72],
  "Android/xhdpi.png": [96, 96],
  "Android/xxhdpi.png": [144, 144],
  "Android/xxxhdpi.png": [192, 192],
  "Android/Play Store.png": [512, 512],
  // brand 品牌套件（favicon/apple-touch/maskable/字标）
  "brand/favicon-16.png": [16, 16],
  "brand/favicon-32.png": [32, 32],
  "brand/apple-touch-icon-180.png": [180, 180],
  "brand/icon-192.png": [192, 192],
  "brand/icon-512.png": [512, 512],
  "brand/icon-maskable-512.png": [512, 512],
  "brand/logo-transparent-256.png": [256, 176],
  "brand/logo-transparent-512.png": [408, 281],
  // iOS 全规格（iPhone 2x/3x × App/Settings/Notification/Spotlight + iPad + App Store）
  "iOS/iPhone App 2x.png": [120, 120],
  "iOS/iPhone App 3x.png": [180, 180],
  "iOS/iPhone Settings 2x.png": [58, 58],
  "iOS/iPhone Settings 3x.png": [87, 87],
  "iOS/iPhone Notification 2x.png": [40, 40],
  "iOS/iPhone Notification 3x.png": [60, 60],
  "iOS/iPhone Spotlight 2x.png": [80, 80],
  "iOS/iPhone Spotlight 3x.png": [120, 120],
  "iOS/iPad App.png": [76, 76],
  "iOS/iPad Pro App 2x.png": [167, 167],
  "iOS/iPad Settings.png": [29, 29],
  "iOS/iPad Notification.png": [20, 20],
  "iOS/iPad Spotlight.png": [40, 40],
  "iOS/App Store.png": [1024, 1024],
  // macOS 尺寸阶梯
  "macOS/16.png": [16, 16],
  "macOS/32.png": [32, 32],
  "macOS/64.png": [64, 64],
  "macOS/128.png": [128, 128],
  "macOS/256.png": [256, 256],
  "macOS/512.png": [512, 512],
  "macOS/1024.png": [1024, 1024],
  // watchOS（Notification / Home Screen / Short Look / App Store）
  "watchOS/Notification.png": [48, 48],
  "watchOS/Home Screen.png": [80, 80],
  "watchOS/Short Look.png": [172, 172],
  "watchOS/App Store.png": [1024, 1024],
  // Web App（favicon/apple-touch/android-chrome）
  "Web App/favicon-16.png": [16, 16],
  "Web App/favicon-32.png": [32, 32],
  "Web App/apple-touch-icon.png": [180, 180],
  "Web App/android-chrome-192.png": [192, 192],
  "Web App/android-chrome-512.png": [512, 512],
}

/** manifest icon 条目 src（"/yyc3-icons/..."）→ 相对 ICONS_ROOT 路径 */
function iconSrcToRel(src: string): string {
  expect(src.startsWith("/yyc3-icons/"), `manifest icon src 越界: ${src}`).toBe(true)
  return src.slice("/yyc3-icons/".length)
}

/** 断言单个 manifest 图标条目与物理 PNG 对齐（存在/sizes/type 一致） */
function expectManifestIconAligned(icon: { src: string; sizes: string; type?: string }): void {
  const rel = iconSrcToRel(icon.src)
  expect(existsSync(join(ICONS_ROOT, rel)), `manifest 引用的图标缺失: ${rel}`).toBe(true)
  const { width, height } = pngSize(rel)
  expect(`${width}x${height}`).toBe(icon.sizes)
  expect(icon.type).toBe("image/png")
}

describe("S13 图标链路 · 5 平台 PNG 尺寸矩阵", () => {
  it("矩阵与目录严格双向对齐（零缺失 / 零多余 / 44 枚）", () => {
    const actual = listPngs(ICONS_ROOT).sort()
    expect(actual).toEqual(Object.keys(ICON_MATRIX).sort())
    expect(actual.length).toBe(44)
  })

  it("每枚图标物理尺寸与矩阵逐一吻合（PNG 签名 + IHDR 实测）", () => {
    for (const [rel, [w, h]] of Object.entries(ICON_MATRIX)) {
      expect(pngSize(rel), `尺寸失配: ${rel}`).toEqual({ width: w, height: h })
    }
  })

  it("5 平台目录全部在位", () => {
    for (const platform of ["Web App", "Android", "iOS", "macOS", "watchOS"]) {
      expect(existsSync(join(ICONS_ROOT, platform)), `平台目录缺失: ${platform}`).toBe(true)
    }
  })
})

describe("S13 图标链路 · manifest.webmanifest 对齐", () => {
  const manifest = JSON.parse(
    readFileSync(join(PUBLIC, "manifest.webmanifest"), "utf8"),
  ) as {
    name?: string
    short_name?: string
    start_url?: string
    display?: string
    theme_color?: string
    icons?: Array<{ src: string; sizes: string; type?: string; purpose?: string }>
    shortcuts?: Array<{ name: string; url: string; icons?: Array<{ src: string; sizes: string }> }>
  }

  it("必填字段完整（name / short_name / icons / start_url / display / theme_color）", () => {
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.start_url).toBe("/")
    expect(manifest.display).toBe("standalone")
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(manifest.icons?.length).toBeGreaterThan(0)
  })

  it("icons 条目与 public/yyc3-icons/ 物理对齐（src 存在 / sizes / type）", () => {
    expect(manifest.icons).toBeDefined()
    for (const icon of manifest.icons!) expectManifestIconAligned(icon)
  })

  it("安装性：512 主图标 + maskable 图标齐备", () => {
    const icons = manifest.icons ?? []
    expect(icons.some((i) => i.sizes === "512x512" && i.purpose !== "maskable")).toBe(true)
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true)
  })

  it("shortcuts 图标与物理文件对齐（三快捷方式路由可达入口）", () => {
    expect(manifest.shortcuts?.length).toBeGreaterThan(0)
    for (const shortcut of manifest.shortcuts ?? []) {
      expect(shortcut.url).toMatch(/^\//)
      for (const icon of shortcut.icons ?? []) {
        const rel = iconSrcToRel(icon.src)
        const { width, height } = pngSize(rel)
        expect(`${width}x${height}`).toBe(icon.sizes)
      }
    }
  })
})
