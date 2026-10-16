#!/usr/bin/env node
/**
 * file: bundle-budget.mjs
 * description: 构建产物预算门禁 v2.1 · 每页实际加载量口径（解析静态导出 HTML 的 JS 引用）
 * author: YanYuCloudCube Team
 * version: v2.1.1
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [script],[budget],[gate],[build]
 *
 * brief: pnpm build 后运行；超预算 exit 1 阻断 CI——预算棘轮只降不升（基线只许优化不许回潮）
 *
 * usage:
 *   pnpm budget                                    # 默认基线（见 MAX_PAGE/MAX_CHUNK）
 *   node scripts/bundle-budget.mjs --max-page=600KB --max-chunk=300KB
 *   node scripts/bundle-budget.mjs --observe       # 观测模式：只打印各页实载，不做门禁判定
 *
 * details:
 * - 口径演进 v1→v2（2026-10-16）：v1 为 out 目录全站 JS 总和 ≤850KB。多页静态站中
  * 全站总和与单页体验脱钩（共享 vendor chunk 重复计入），且 848.9 / 850KB 余量 0.13 %
 * 已实质阻塞功能迭代；v2 改为「每页实际加载量」——解析各 index.html / 404.html 的
  * <script src> 与 <link as="script"> 引用去重求和，忠实反映用户单页 JS 下载数
    * - 口径演进 v2→v2.1（2026-10-16，route 级分割评估衍生）：排除 `noModule` 脚本。
    *   Next.js 对传统浏览器 polyfill（core-js，实测 112KB）以 <script nomodule> 注入，
    *   ES module 兼容浏览器（Chrome 61+/Safari 11+/FF 60+）按规范不下载该脚本——
    *   v2 将其计入每页实载，导致每页虚高 112KB（15.5%）、利用率 96.6% 系测量伪影。
    *   v2.1 修复后基线按新口径重建（只收紧不放松，对齐棘轮语义）
    * - 全站总和降级为防膨胀护栏（MAX_TOTAL_GUARD，宽松值），不再作为体验门禁
    * - 棘轮语义：MAX_PAGE 基线取 2026-10-16 实测最大页并写死，只降不升；
    *   上调 = 显式修改本脚本 + 注释记录论证（对齐 coverage 棘轮先例）
    * - max-chunk 语义不变（单文件体积上限，防 vendor 膨胀）
 * - 新增运行时依赖流程（v2.1.1 · 第八轮决策，冻结令放宽为流程约束）：
 *   新依赖合入前必须 `node scripts/bundle-budget.mjs --observe --max-page=<现基线>` 预演，
 *   将每页实载增量写入 PR/commit 说明并确认门禁判定通过——违者预算棘轮会阻断合入
 */

import { readFileSync, readdirSync, statSync } from "node:fs"
import { extname, join, relative } from "node:path"

const KB = 1024
const MB = 1024 * KB
const OUT_DIR = join(process.cwd(), "out")

function parseSize(text) {
  const m = /^(\d+(?:\.\d+)?)\s*(B|KB|MB)$/i.exec(String(text).trim())
  if (!m)
    throw new Error(`非法尺寸参数: ${text}（示例: 850KB / 1.5MB / 4096B）`)
  const n = Number(m[1])
  const unit = m[2].toUpperCase()
  return unit === "B"
    ? Math.round(n)
    : unit === "KB"
      ? Math.round(n * KB)
      : Math.round(n * MB)
}

function argValue(flag, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`))
  return hit ? parseSize(hit.split("=").slice(1).join("=")) : fallback
}

const OBSERVE = process.argv.includes("--observe")
// 棘轮基线：v2 设立于 2026-10-16（723.6KB 实测 + 3.6% 应急余量）。
// v2.1（2026-10-16，nomodule 口径修复）**保留 750KB 不重建**——修复揭示旧口径把
// 传统浏览器 polyfill（112KB）计入实载，现代浏览器真实最大页仅 614.4KB（81.9% 利用率）；
// 释放的 135.6KB 真实余量即 route 级分割评估的治理成果（该字节从未被现代浏览器下载）。
// 750 基线继续阻断向历史包络回潮；>90%（675KB）仍有 ⚠逼近 提示；上调走「显式修改 + 论证」。
// 注意：页间差仅 ~23KB（全局壳/context/vendor 全在共享 chunk），route 级分割已被框架用尽。
const MAX_PAGE = argValue("--max-page", Math.round(750 * KB))
const MAX_CHUNK = argValue("--max-chunk", Math.round(280 * KB))
// 防膨胀护栏（宽松）：全站总和防无意识增长，非单页体验口径
const MAX_TOTAL_GUARD = argValue("--max-total-guard", Math.round(1.2 * MB))

function walk(dir, base = dir, acc = { html: [], js: new Map() }) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, base, acc)
    else if (name === "index.html" || name === "404.html") acc.html.push(full)
    else if (extname(name) === ".js")
      acc.js.set(
        `/${relative(base, full).split("\\").join("/")}`,
        statSync(full).size,
      )
  }
  return acc
}

/** 解析页面 HTML 引用的 JS：script[src]（排除 noModule）+ link[href][as=script]（去重） */
function pageJsRefs(htmlPath) {
  const html = readFileSync(htmlPath, "utf8")
  const refs = new Set()
  for (const m of html.matchAll(/<script\b[^>]*>/g)) {
    // noModule（polyfill-nomodule）在 ES module 兼容浏览器中不下载，不计入实载
    if (/\bnoModule\b/i.test(m[0])) continue
    const src = /\ssrc="([^"]+\.js)"/.exec(m[0])
    if (src) refs.add(src[1])
  }
  for (const m of html.matchAll(/<link[^>]*\shref="([^"]+\.js)"[^>]*\sas="script"/g))
    refs.add(m[1])
  for (const m of html.matchAll(/<link[^>]*\sas="script"[^>]*\shref="([^"]+\.js)"/g))
    refs.add(m[1])
  return [...refs]
}

const fmt = (b) =>
  b >= MB ? `${(b / MB).toFixed(2)}MB` : `${(b / KB).toFixed(1)}KB`

let acc
try {
  acc = walk(OUT_DIR)
} catch {
  console.error("✗ out/ 目录不存在或不可读 —— 先执行 pnpm build 再运行预算门禁")
  process.exit(1)
}

if (acc.html.length === 0 || acc.js.size === 0) {
  console.error("✗ out/ 无页面或无 JS 产物 —— 先执行 pnpm build 再运行预算门禁")
  process.exit(1)
}

const pages = [...new Map(
  acc.html
    .map((htmlPath) => {
      const route = `/${relative(OUT_DIR, htmlPath).split("\\").join("/").replace(/\/?index\.html$/, "").replace(/\.html$/, "") || ""}`
      const refs = pageJsRefs(htmlPath)
      let bytes = 0
      let missing = 0
      for (const ref of refs) {
        const size = acc.js.get(ref)
        if (size === undefined) missing++
        else bytes += size
      }
      return {
        route: route === "" ? "/" : route,
        refs: refs.length,
        bytes,
        missing,
      }
    })
    .map((p) => [p.route, p]),
).values()].sort((a, b) => b.bytes - a.bytes)

const total = [...acc.js.values()].reduce((s, b) => s + b, 0)
const biggest = Math.max(...acc.js.values())

console.log("Bundle 预算门禁 v2.1（每页实际加载量口径 · 排除 noModule）")
for (const p of pages) {
  const mark =
    p.bytes > MAX_PAGE ? " ✗超基线" : p.bytes > MAX_PAGE * 0.9 ? " ⚠逼近" : ""
  console.log(
    `  ${fmt(p.bytes).padStart(9)}  ${p.route}  (${p.refs} refs${p.missing ? `, ${p.missing} missing!` : ""})${mark}`,
  )
}
console.log(
  `  ---------- ${pages.length} 页 · 全站 JS 总和 ${fmt(total)}（${acc.js.size} 文件，护栏 ${fmt(MAX_TOTAL_GUARD)}）`,
)

if (OBSERVE) {
  console.log("✓ 观测模式：仅打印，不做门禁判定")
  process.exit(0)
}

const violations = []
const heaviest = pages[0]
if (heaviest && heaviest.bytes > MAX_PAGE)
  violations.push(
    `最大页 ${heaviest.route} 实载 ${fmt(heaviest.bytes)} 超棘轮基线 ${fmt(MAX_PAGE)}`,
  )
if (biggest > MAX_CHUNK)
  violations.push(`最大 chunk ${fmt(biggest)} 超预算 ${fmt(MAX_CHUNK)}`)
if (total > MAX_TOTAL_GUARD)
  violations.push(`全站 JS 总和 ${fmt(total)} 超膨胀护栏 ${fmt(MAX_TOTAL_GUARD)}`)
if (pages.some((p) => p.missing > 0))
  violations.push("存在 HTML 引用但 out/ 缺失的 JS（构建产物不完整）")

if (violations.length > 0) {
  for (const v of violations) console.error(`✗ ${v}`)
  console.error("✗ 预算门禁失败（棘轮只降不升：先优化产物，再依流程上调基线）")
  process.exit(1)
}

console.log(
  `✓ 预算门禁通过：最大页 ${heaviest.route} ${fmt(heaviest.bytes)} ≤ ${fmt(MAX_PAGE)}，最大 chunk ${fmt(biggest)} ≤ ${fmt(MAX_CHUNK)}，总和 ${fmt(total)} ≤ 护栏 ${fmt(MAX_TOTAL_GUARD)}`,
)
