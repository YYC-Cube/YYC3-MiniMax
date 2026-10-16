#!/usr/bin/env node
/**
 * file: bundle-budget.mjs
 * description: 构建产物预算门禁（评分卡 P1-2）· out/ JS 总量与单 chunk 预算棘轮
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [script],[budget],[gate],[build]
 *
 * brief: pnpm build 后运行；超预算 exit 1 阻断 CI——预算棘轮只升不降，禁止放宽预算绕过
 *
 * usage:
 *   pnpm budget                          # 默认预算：总量 ≤850KB，单 chunk ≤280KB
 *   node scripts/bundle-budget.mjs --max-total=900KB --max-chunk=300KB
 */

import { readdirSync, statSync } from "node:fs"
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

const MAX_TOTAL = argValue("--max-total", Math.round(850 * KB))
const MAX_CHUNK = argValue("--max-chunk", Math.round(280 * KB))

function walkJsFiles(dir, base = dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walkJsFiles(full, base, acc)
    else if (extname(name) === ".js") {
      acc.push({
        path: relative(base, full).split("\\").join("/"),
        bytes: st.size,
      })
    }
  }
  return acc
}

const fmt = (b) =>
  b >= MB ? `${(b / MB).toFixed(2)}MB` : `${(b / KB).toFixed(1)}KB`

let files
try {
  files = walkJsFiles(OUT_DIR)
} catch {
  console.error("✗ out/ 目录不存在或不可读 —— 先执行 pnpm build 再运行预算门禁")
  process.exit(1)
}

if (files.length === 0) {
  console.error("✗ out/ 无 JS 产物 —— 先执行 pnpm build 再运行预算门禁")
  process.exit(1)
}

const total = files.reduce((sum, f) => sum + f.bytes, 0)
const biggest = Math.max(...files.map((f) => f.bytes))

console.log("Bundle 预算门禁（out/**/*.js）")
for (const f of [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 5)) {
  console.log(`  ${fmt(f.bytes).padStart(9)}  ${f.path}`)
}
console.log(`  ---------- 共 ${files.length} 个 JS 文件，总量 ${fmt(total)}`)

const violations = []
if (total > MAX_TOTAL)
  violations.push(`JS 总量 ${fmt(total)} 超预算 ${fmt(MAX_TOTAL)}`)
if (biggest > MAX_CHUNK)
  violations.push(`最大 chunk ${fmt(biggest)} 超预算 ${fmt(MAX_CHUNK)}`)

if (violations.length > 0) {
  for (const v of violations) console.error(`✗ ${v}`)
  console.error("✗ 预算门禁失败（棘轮只升不降：先优化产物，再上调预算）")
  process.exit(1)
}

console.log(
  `✓ 预算门禁通过：总量 ${fmt(total)} ≤ ${fmt(MAX_TOTAL)}，最大 chunk ${fmt(biggest)} ≤ ${fmt(MAX_CHUNK)}`,
)
