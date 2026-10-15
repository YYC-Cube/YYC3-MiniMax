---
file: 04-Vite至Next.js16迁移评估清单.md
description: YYC3-MiniMax Vite→Next.js 16 全量架构级迁移评估清单 - glm - 20261015
author: AI Tutor <GLM-5.3-Flash>
version: v1.0.0
created: 2026-10-15
updated: 2026-10-15
status: active
tags: [migration],[nextjs16],[app-router],[assessment]
category: analysis
---

# 📋 Vite → Next.js 16 迁移评估清单

> 评估基线：main @ d8654a3（v1.2.1）· src 全量 6,704 行 · React 19 + Vite 8 + Tailwind v4 + TS 5.9 + pnpm 10.34
> 目标形态：Next.js 16（App Router + Turbopack + `output: 'export'` 静态导出）· 部署目标不变（GitHub Pages · minimax.yyc3.top）
> 处置图例：✅ 直接保留复用　♻️ 需要针对性改写　❌ 必须删除废弃
> 风险等级：🟢 低 / 🟡 中 / 🔴 高　　工作量单位：人日（含验证）

## 〇、总评与迁移判定

| 判定项 | 结论 |
| ------ | ---- |
| **迁移可行性** | ✅ 可行，条件有利。纯前端 SPA、无后端 API、无客户端路由库、无 `import.meta.glob`、无 webpack 专属插件、无顶层 window 副作用（已扫描验证） |
| **核心改造面** | 仅 1 个文件是"真路由"（[App.tsx](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/App.tsx)，215 行，`?view=P1..P5` 状态切换）；其余 90% 业务代码（views/components/data/hooks/services）与打包器解耦，可平移 |
| **最大风险** | ① App.tsx 跨视图通信（`externalCommand`/`activeAgentId`）在路由拆分后需 Context 桥接；② Figma Make 托管平台运行时被放弃（vite.config 内 4 个 Figma 插件废弃，开发入口改为 `next dev`）；③ PWA Service Worker 缓存策略需适配多路由产物 |
| **净收益** | 路由级代码分割（P3 536 行/P1 512 行等按路由懒加载，替代无懒加载现状）· Metadata API 声明式 SEO · RSC 静态壳 + 客户端岛（首屏 TTFB 优化）· 生态对齐（五化·标准化） |
| **总工作量** | **约 7–10 人日**（7 阶段，详见第五章行动路线） |

## 一、目录级处置总览

```text
YYC3-MiniMax/
├── index.html                    ❌ 废弃（→ app/layout.tsx Metadata API，§5.2）
├── vite.config.ts                ❌ 废弃（含 4 个 Figma 插件，无 Next 等价物）
├── vitest.config.ts              ♻️ 改写（去 Vite 插件耦合/别名/覆盖率口径，§4.5）
├── tsconfig.json                 ♻️ 改写（jsx: preserve、next 插件、include 扩充，§4.3）
├── eslint.config.js              ♻️ 改写（追加 eslint-config-next，§4.6）
├── next.config.ts                ✨ 新增（output:'export'/trailingSlash/images，§4.2）
├── postcss.config.mjs            ✨ 新增（@tailwindcss/postcss 替代 Vite 插件，§4.4）
├── package.json                  ♻️ 改写（scripts/依赖换血，§3.1）
├── .github/workflows/ci.yml      ♻️ 改写（dist→out、gitleaks 等门禁保留，§6.1）
├── .figma/make/                  ❌ 废弃（site.json → Metadata API；kit/插件体系随平台退出）
├── public/                       ✅ 全量保留（CNAME/manifest/sw.js/图标源；sw.js 见 §5.4）
├── docs/                         ✅ 保留（纯仓库文档，不参与构建）
└── src/
    ├── main.tsx                  ❌ 废弃（职责拆入 layout.tsx + Bootstrap 客户端组件，§5.1）
    ├── App.tsx                   ♻️ 改写→拆解（215 行编排壳 → layout + 5 路由页 + Provider，§5.3）
    ├── vite-env.d.ts             ♻️ 改写（→ next-env.d.ts 自动生成 + ProcessEnv 类型声明迁移）
    ├── index.css                 ✅ 平移改名 app/globals.css（301 行：@fontsource/@theme/霓虹色板原样）
    ├── app/                      ✨ 新增（layout/page×5/error/not-found，§5）
    ├── views/（6 视图 2,481 行）  ✅ 组件体保留（P1–P5 + MobileFallback；仅 env 引用改写）
    ├── components/（14 文件）     ✅ 保留（Header 导航引用改写，其余零改动）
    ├── hooks/（4 文件）           ✅ 保留（SSR 安全已验证：localStorage 访问均在客户端副作用内）
    ├── services/（5 文件）        ♻️ 轻改（import.meta.env ×3 → process.env.NEXT_PUBLIC_*）
    ├── data/（5 文件）            ✅ 保留（纯静态数据模块，构建器无关）
    ├── types/ + domain/          ✅ 保留
    └── tests/（vitest 130 例）    ♻️ 改写（路径/mocking 适配，§4.5）
```

## 二、逐文件评估明细（核心对象）

### 2.1 入口与编排层

| 对象 | 行数 | 处置 | 风险 | 工作量 | 说明 |
| ---- | ---- | ---- | ---- | ------ | ---- |
| [src/main.tsx](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/main.tsx) | 37 | ❌ 废弃 | 🟡 | — | 三项职责全部迁走：错误钩子+SW 注册 → 新增 `app/Bootstrap.tsx`（'use client'，useEffect 内调用）；`createRoot` → App Router 接管；`ErrorBoundary` 包裹 → `app/error.tsx` + `global-error.tsx` |
| [src/App.tsx](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/App.tsx) | 215 | ♻️ 改写→拆解 | 🔴 | 2.0–2.5 | 全项目唯一"路由层"。拆解方案见 §5.3：`?view=` 条件渲染 → 5 个文件路由；`activeAgentId`/`externalCommand`/`isWidgetOpen` → 客户端 Context Provider；移动端 `useMediaQuery` 分支 → 客户端包装组件 + 挂载守卫 |
| [src/components/Header.tsx](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/components/Header.tsx) | 159 | ♻️ 改写 | 🟡 | 0.5 | 视图切换回调 props → `<Link href>` + `usePathname` 高亮；依赖 next/navigation，vitest 需 mock |
| [src/components/ErrorBoundary.tsx](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/components/ErrorBoundary.tsx) | ~60 | ✅ 保留 | 🟢 | 0 | 类组件错误边界在客户端树内继续有效；外层补 `app/error.tsx` 形成双兜底 |
| [src/components/UniversalWidget.tsx](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/components/UniversalWidget.tsx) | 456 | ✅ 保留 | 🟡 | 0.25 | 挂载点从 App 树 → `app/layout.tsx`（跨路由全局浮窗）；`externalCommand` 派发改走 Context |

### 2.2 视图层（全部平移，组件体零重构）

| 对象 | 行数 | 处置 | 风险 | 工作量 | 说明 |
| ---- | ---- | ---- | ---- | ------ | ---- |
| [P1FamilyCenter.tsx](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/views/P1FamilyCenter.tsx) | 512 | ✅ 保留 | 🟢 | 0 | `app/page.tsx`（Server）内 `<P1FamilyCenter/>`（Client）包裹即可 |
| [P2ProductionDesk.tsx](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/views/P2ProductionDesk.tsx) | 201 | ♻️ 轻改 | 🟢 | 0.1 | L57 `import.meta.env.VITE_EVENT_STREAM_URL` → `process.env.NEXT_PUBLIC_EVENT_STREAM_URL` |
| [P3ReActWorkflow.tsx](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/views/P3ReActWorkflow.tsx) | 536 | ✅ 保留 | 🟢 | 0 | ResizeObserver 自适应算法为纯客户端逻辑，原样平移 |
| [P4OpsMonitoring.tsx](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/views/P4OpsMonitoring.tsx) | 432 | ✅ 保留 | 🟢 | 0 | — |
| [P5QualitySecurity.tsx](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/views/P5QualitySecurity.tsx) | 480 | ✅ 保留 | 🟢 | 0 | — |
| [MobileFallback.tsx](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/views/MobileFallback.tsx) | 320 | ✅ 保留 | 🟡 | 0.25 | 由 App 分支改为 per-route 客户端 `<ResponsiveGate>` 内部分支；**必须加 mounted 守卫防 hydration mismatch**（SSR 首帧按桌面渲染，`matchMedia` 仅客户端可判） |
| components/p2/*（6 文件） | ~830 | ✅ 保留 | 🟢 | 0 | 纯展示/交互组件 |
| BrandMark/AgentAvatar/Footer/PwaInstallButton | ~450 | ✅ 保留 | 🟢 | 0 | — |

### 2.3 数据/领域/服务/Hook 层

| 对象 | 处置 | 风险 | 工作量 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| src/data/（agents/pipeline/reactSteps/opsData/qualityData/logs） | ✅ 保留 | 🟢 | 0 | 静态数据，天然可被 RSC 引用（未来服务端直出优化点） |
| [src/domain/constants.ts](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/domain/constants.ts) + types/ | ✅ 保留 | 🟢 | 0 | — |
| [services/eventStream.ts](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/services/eventStream.ts)（205 行） | ✅ 保留 | 🟢 | 0 | WebSocket 客户端，调用点全部在用户交互/副作用内，SSR 安全 |
| [services/telemetry.ts](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/services/telemetry.ts)（143 行） | ✅ 保留 | 🟡 | 0.1 | `installGlobalErrorHooks()` 调用时机从模块顶层 → Bootstrap 组件 `useEffect`（保持"先装钩子再挂载"语义由 layout 渲染顺序保证） |
| [services/pwa.ts](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/services/pwa.ts) | ♻️ 轻改 | 🟢 | 0.1 | L7 `import.meta.env.PROD` → `process.env.NODE_ENV === 'production'`（客户端组件内被内联替换，tree-shake 掉 dev 分支） |
| [services/piiReveal.ts](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/services/piiReveal.ts) | ♻️ 轻改 | 🟢 | 0.1 | L40 `VITE_PII_REVEAL_API` → `NEXT_PUBLIC_PII_REVEAL_API` |
| [hooks/useLocalStorage.ts](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/hooks/useLocalStorage.ts) | ✅ 保留 | 🟢 | 0 | 已有 SSR 安全注释与内存降级 |
| hooks/useAgentEventStream.ts / useMediaQuery.ts | ✅ 保留 | 🟢 | 0 | — |
| [src/vite-env.d.ts](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/src/vite-env.d.ts) | ♻️ 改写 | 🟢 | 0.1 | 删除 `ImportMetaEnv` 声明；改为扩展 `ProcessEnv`（`NEXT_PUBLIC_*` 字段）；`next-env.d.ts` 由 Next 自动生成 |

### 2.4 公共资源与站点元信息

| 对象 | 处置 | 风险 | 工作量 | 说明 |
| ---- | ---- | ---- | ------ | ---- |
| [public/CNAME](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/public/CNAME) | ✅ 保留 | 🟢 | 0 | `output:'export'` 自动复制 public/ → out/，Pages 自定义域不受影响 |
| [public/manifest.webmanifest](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/public/manifest.webmanifest) | ✅ 保留 | 🟢 | 0 | 通过 `metadata.manifest` 引用 |
| public/yyc3-icons/**（54 文件） | ✅ 保留 | 🟢 | 0 | 品牌单一真源原样；`<img>` 引用无需 next/image（见 §4.2 images.unoptimized） |
| [index.html](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/index.html) | ❌ 废弃 | 🟡 | — | 全部 `<head>` 声明迁移映射见 §5.2（viewport-fit/theme-color/apple-*/图标/description 共 12 项，Metadata API 全覆盖，无能力缺失） |
| [.figma/make/site.json](file:///Users/yanyu/YYC-Cube/YYC3-MiniMax/.figma/make/site.json) | ❌ 废弃 | 🟡 | — | title/description/lang/robots/icons → `layout.tsx` metadata；**注意保留 robots.index:true 的成果** |
| public/sw.js | ♻️ 改写 | 🟡 | 0.5 | 见 §5.4 |

## 三、维度一：依赖包迁移评估

### 3.1 依赖处置清单

| 包 | 当前版本 | 处置 | Next 16 对齐动作 | 风险 |
| -- | -------- | ---- | ---------------- | ---- |
| react / react-dom | ^19.0.0 | ♻️ 升级 | 钉到 **19.2.x**（Next 16 要求 19.2+，React Compiler/Cache Components 前置） | 🟢 |
| next | — | ✨ 新增 | `next@^16`（App Router 默认、Turbopack 默认 dev+build） | — |
| vite | ^8.3.4 | ❌ 移除 | 构建职责由 next build 接管 | — |
| @vitejs/plugin-react | ^6.0.0 | ♻️ 降级保留 | **从构建链移除，仅保留给 vitest 使用**（vitest 独立 Vite 实例仍需 React 快速刷新插件） | 🟡 |
| @tailwindcss/vite | ^4.0.0 | ❌ 移除 | 换 `@tailwindcss/postcss@^4` + postcss.config.mjs（Tailwind v4 官方 Next 路径） | 🟢 |
| tailwindcss | ^4.0.0 | ✅ 保留 | v4 与 Next 16 兼容；`index.css` 的 `@import 'tailwindcss'` 原样 | 🟢 |
| @fontsource-variable/*（3 包） | ^5.3.x | ✅ 保留 | CSS+woff2 导入在 layout.tsx 顶部 `import './globals.css'` 即生效；可选增强：改 next/font 自托管优化（非必须） | 🟢 |
| lucide-react | ^1.55.0 | ✅ 保留 | 纯组件库，RSC/客户端两侧均可用 | 🟢 |
| typescript | ^5.7.0 | ✅ 保留 | Next 16 支持 TS 5.x；tsconfig 按 §4.3 调整 | 🟢 |
| vitest / @vitest/coverage-v8 / @testing-library/* | 5.x / 10.x | ✅ 保留 | Next 官方推荐的测试方案即 Vitest；配置适配见 §4.5 | 🟡 |
| happy-dom | ^20.x | ✅ 保留 | — | 🟢 |
| eslint / typescript-eslint / eslint-plugin-react-hooks | 10.x / 8.x / 7.x | ♻️ 扩展 | 追加 `eslint-config-next@16`（含 next/core-web-vitals 规则）；⚠️ **待确认**：eslint-config-next 16 的 peer 是否接受 eslint 10，若仅支持 9 需评估降级或延后接入 | 🟡 |
| knip / madge / oxfmt | 6.x / 8.x / 0.2 | ✅ 保留 | knip 增补 entry（`app/**/{page,layout}.tsx`）与 ignore（`.next/** out/** next-env.d.ts`）；madge 扫描范围不变 | 🟢 |
| pnpm + overrides | 10.34.3 | ✅ 保留 | `packageManager` 字段、source-map-js override 均与 Next 无冲突 | 🟢 |

### 3.2 环境变量迁移映射

| 现值（Vite） | 目标（Next） | 引用位置 |
| ------------ | ------------ | -------- |
| `import.meta.env.VITE_EVENT_STREAM_URL` | `process.env.NEXT_PUBLIC_EVENT_STREAM_URL` | P2ProductionDesk.tsx:57、useAgentEventStream.ts:35（注释） |
| `import.meta.env.VITE_PII_REVEAL_API` | `process.env.NEXT_PUBLIC_PII_REVEAL_API` | piiReveal.ts:40 |
| `import.meta.env.PROD` | `process.env.NODE_ENV === 'production'` | pwa.ts:7 |
| `.env*` 文件 | 文件名不变（Next 原生加载 `.env.local` 等），**前缀必须带 `NEXT_PUBLIC_`** 才会内联进客户端包 | — |

> 注意：静态导出模式下所有公开配置必须是 `NEXT_PUBLIC_*` 构建期内联；密钥类变量在纯静态站上无服务端可藏，保持现有"公钥直配"现状即可。

## 四、维度二：构建流程适配评估

### 4.1 构建链映射

| 环节 | Vite 现状 | Next 16 目标 |
| ---- | --------- | ------------ |
| 开发 | `vite`（PORT 8443，Figma Make 托管） | `next dev`（Turbopack；HMR 行为差异：Figma 自研 error-overlay-replay 等插件消失，改用 Next 内建 overlay） |
| 构建 | `vite build` → dist/ | `next build`（Turbopack）→ out/（`output:'export'`） |
| 预览 | `vite preview` | `npx serve out` 或直接部署 Pages |
| 路径别名 | vite.config `@` → ./src | tsconfig paths 原样，Turbopack 自动读取 tsconfig paths ✅ |
| 产物 | 单页 index.html + hash 资源 | 多路由 HTML（/、/p2/…/p5/）+ 分路由 chunk |

### 4.2 next.config.ts 目标配置（新增）

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // GitHub Pages 静态托管：纯导出，无服务端运行时
  output: 'export',
  // Pages 无 URL 重写能力：/p2 必须以 /p2/ 目录形式存在（p2/index.html）
  trailingSlash: true,
  images: {
    // next/image 优化器需要服务端，静态导出必须关闭；现有 <img> 引用不受影响
    unoptimized: true,
  },
  // 深链兼容：/?view=P3 → /p3/（导出模式不支持 redirects()，由客户端桥接实现，见 §5.3）
}

export default nextConfig
```

### 4.3 tsconfig.json 改写要点

| 项 | 现值 | 目标 | 原因 |
| -- | ---- | ---- | ---- |
| `jsx` | react-jsx | **preserve** | Next 要求由编译器接管 JSX 转换 |
| `moduleResolution` | bundler | bundler（不变） | 已兼容 ✅ |
| `include` | src/tests/vite*.ts | 增 `next-env.d.ts`、`.next/types/**/*.ts`；移除 vite.config.ts | Next 类型体系 |
| `plugins` | 无 | `[{ "name": "next" }]` | 编辑器集成 |
| `target` | ES2020 | ES2020（不变） | ≥ Next 默认 ES2017 ✅ |

### 4.4 样式构建

- `index.css` → `src/app/globals.css`：`@import 'tailwindcss'`、三组 @fontsource 导入、`@theme` 霓虹色板、自定义 keyframes **全部原样保留**（Tailwind v4 经 PostCSS 插件处理，与 Vite 插件产出等价）。
- 新增 `postcss.config.mjs`：`{ plugins: { '@tailwindcss/postcss': {} } }`。
- 组件层无 CSS Modules / styled-components，无需改造。

### 4.5 测试体系适配（vitest 130 例全绿基线）

| 项 | 动作 |
| -- | ---- |
| plugins | 保留 `@vitejs/plugin-react`（vitest 自用）；不引入 next 相关插件 |
| include | `tests/**/*.test.{ts,tsx}` 不变；若测试 import `@/app/*` 新路径需同步 |
| next/navigation mock | Header 改用 `usePathname`/`<Link>` 后，相关测试需 `vi.mock('next/navigation', …)`；`<Link>` 渲染在 happy-dom 正常（无需 Next 运行时） |
| coverage.exclude | `src/main.tsx` → 移除；新增 `src/app/**/layout.tsx`、`app/Bootstrap.tsx`（同类引导胶水口径）、`next-env.d.ts` |
| 阈值棘轮 | 94.1/89.6/92.9/95.2 基线保持"仅升不降"；路由拆分后统计面变化，迁移 PR 允许一次性重置基线并记录 |
| CI | `pnpm test:coverage` 命令不变 |

### 4.6 ESLint / 质量门禁

- eslint.config.js：追加 `eslint-config-next`（flat config 经 FlatCompat 接入），ignores 增 `.next/** out/** next-env.d.ts`；现 tseslint + react-hooks 规则原样。
- knip：`entry` 增 `src/app/**/{page,layout,not-found,error,global-error}.tsx`；ignore 增 `next-env.d.ts`、`.next/**`、`out/**`。
- madge：`--extensions ts,tsx src` 范围不变（app/ 在 src 下自然纳入环检测）。
- CI 其余门禁（gitleaks 直装全量扫描/lint/typecheck/knip/madge）**全部原样保留**。

### 4.7 GitHub Actions 适配（ci.yml）

| 步骤 | 改动 |
| ---- | ---- |
| Setup pnpm/Node 22/gitleaks/knip/madge/lint/typecheck | 不变 |
| `pnpm build` | 脚本内变为 `next build`，产物目录 dist/ → **out/** |
| 产物检测 | 路径改 `out/`；检测清单更新：`CNAME / index.html / p2/index.html / manifest.webmanifest / sw.js / favicon-32.png` + 无 noindex（防 site.json 废弃后回归） |
| upload-pages-artifact | `path: dist` → `path: out` |
| deploy-pages / configure-pages | 不变 |

## 五、维度三：运行时特性适配评估

### 5.1 启动引导链（保持"可观测性优先"语义）

```text
Vite:  main.tsx → installGlobalErrorHooks() → registerServiceWorker() → createRoot(<ErrorBoundary><App/></ErrorBoundary>)
Next:  app/layout.tsx（RSC：metadata/字体/全局壳）
         └─ <Bootstrap/>            ('use client'：useEffect 内 installGlobalErrorHooks + registerServiceWorker)
         └─ <CommandCenterProvider> ('use client'：activeAgentId/externalCommand/isWidgetOpen)
             └─ {children}（路由页）
         └─ <UniversalWidget/>      (跨路由全局浮窗)
       app/error.tsx + app/global-error.tsx（对应原 ErrorBoundary 兜底，组件体复用）
```

### 5.2 index.html → Metadata API 逐项映射（12 项，能力无损）

| index.html 声明 | Next 16 目标写法 |
| --------------- | ---------------- |
| `<html lang>` | layout.tsx `<html lang="zh-CN">`（site.json language 字段落定） |
| viewport + viewport-fit=cover | `export const viewport: Viewport = { viewportFit: 'cover' }` |
| title / description | `export const metadata: Metadata = { title, description }`（title 建议配 `template` 供各路由扩展） |
| theme-color #0A0A0A | `viewport.themeColor` |
| manifest.webmanifest | `metadata.manifest: '/manifest.webmanifest'` |
| favicon-32/16 + apple-touch-icon | `metadata.icons`（沿用 yyc3-icons/brand 路径） |
| apple-mobile-web-app-capable/title/status-bar-style | `metadata.appleWebApp = { capable: true, title: 'YYC³ 指挥舱', statusBarStyle: 'black-translucent' }` |
| mobile-web-app-capable | `appleWebApp.capable` 覆盖 +（如需）custom meta |
| og:title/description（vite 插件注入） | `metadata.openGraph` |
| robots.index | `metadata.robots: { index: true, follow: true }`（默认已收录，显式声明固化成果） |
| #root 挂载点 | App Router 接管，无需挂载点 |
| /src/main.tsx module 引入 | 无（layout 体系替代） |

### 5.3 路由体系迁移（本项目唯一"重度改造区"）

**现状**：App.tsx L39 以 `window.location.search` 读 `?view=P1..P5`，L118–181 条件渲染五视图；无懒加载、无路由库；移动端 `<768px` 整体切换 MobileFallback。

**目标路由表**：

| 现视图 | 新路由 | 文件 |
| ------ | ------ | ---- |
| P1（默认） | `/` | `src/app/page.tsx` |
| P2 | `/p2/` | `src/app/p2/page.tsx` |
| P3 | `/p3/` | `src/app/p3/page.tsx` |
| P4 | `/p4/` | `src/app/p4/page.tsx` |
| P5 | `/p5/` | `src/app/p5/page.tsx` |
| 未知视图 | 404 | `src/app/not-found.tsx`（导出后生成 404.html，补齐 GitHub Pages 缺失能力） |

**改写要点与注意事项**：

1. **页面文件形态**：每个 `page.tsx` 为 Server Component 薄壳，仅 `import 视图组件` 渲染（视图组件标注 `'use client'` 或其文件头已有客户端语义自动下沉）。收益：五视图按路由自动代码分割，替代现状全量单包。
2. **跨视图状态桥接**：`activeAgentId` / `externalCommand`（UniversalWidget → 各视图的指挥指令）/ `isWidgetOpen` 上移至 `app/CommandCenterContext.tsx`（'use client' Provider 挂 layout）。⚠️ 这是迁移后行为等价性的**验收重点**：浮窗指派 Agent → 目标视图响应 的链路必须回归测试。
3. **旧深链兼容**：静态导出不支持 next.config `redirects()`。在根 `page.tsx` 的客户端桥接组件内读取 `useSearchParams()`（须包 `<Suspense>`）：检测 `?view=P2..P5` 后 `router.replace('/p2/')`；同时 Header 全量改 `<Link href="/p3/">` + `usePathname()` 高亮。外部分享的历史 `?view=` 链接不 404。
4. **移动端分支**：`useMediaQuery('(max-width: 767px)')` 首帧在服务端恒为 false → 桌面壳，客户端挂载后切 MobileFallback，产生布局闪跳与 hydration 警告。方案：`ResponsiveGate` 客户端组件内 `useSyncExternalStore`/mounted 守卫 + 首帧 CSS（`hidden md:block` / `md:hidden`）配合，避免任何 `matchMedia` 直接参与首帧渲染分支。
5. **`useSearchParams`/`usePathname` 均为客户端 Hook**：涉及组件必须在 'use client' 树内；静态导出下 `useSearchParams` 所在子树必须有 Suspense 边界，否则构建报错（Next 明确约束）。
6. **scaleMode/scaleFactor**（App L46–57 全局缩放态）：随 CommandCenterContext 迁移，属客户端纯态，无 SSR 语义。

### 5.4 PWA / Service Worker 适配

| 项 | 现状 | 迁移动作 |
| -- | ---- | -------- |
| 预缓存列表 | 硬编码 `/`、`/index.html`、manifest、5 个品牌图标（sw.js L12–22） | 保留结构；`/index.html` 语义改为根路由外壳；**建议**增补 `/p2/…/p5/` 或改为"仅外壳 + 运行时缓存"两级策略，避免预缓存清单随路由膨胀失维 |
| 导航请求 | network-first → 失败回退 `caches.put('/index.html')`（L53–60 固定写入键） | 改为按 `new URL(req.url).pathname` 动态缓存 + 回退 `/`；配合 trailingSlash:true 路由形态 |
| SW_VERSION | `yyc3-v1` | 迁移上线时必须 bump（旧缓存外壳指向 Vite 产物，不清版本会出现"离线旧站"） |
| 注册时机 | main.tsx 顶层直调 | Bootstrap 组件 useEffect（等价）；`process.env.NODE_ENV` 内联后 dev 不注册，语义保持 |
| manifest/icons | public/ 原样 | 不动 |
| 安装引导 | PwaInstallButton + usePwaInstall | 不动（browserBeforeInstallprompt 纯客户端） |

### 5.5 SSR/Hydration 语义扫描结论（已验证）

- 全 src **无模块顶层** `window/document/navigator/localStorage` 直接访问（Grep `^(window|document|navigator|localStorage)\.` 零命中）→ 无 SSR 不安全模块，**无需为 RSC 化重构任何 service/data 层**。
- 浏览器 API 访问集中在 hooks 副作用、事件回调、'use client' 组件内 → 迁移后整树可先以"根 layout 以下全客户端"保守策略落地（保真优先），再渐进下沉静态部分为 RSC（收益优化，非阻塞项）。
- WebSocket（eventStream.ts）与 fetch（piiReveal.ts）均为运行时按需调用，无构建期行为。

## 六、维度四：路由体系 & 维度五：功能兼容性专项核对表

| # | 现有功能 | 兼容性 | 验证方式 |
| - | -------- | ------ | -------- |
| 1 | 五视图切换 + 视图级 URL | ✅ 增强为真路由 | 手动逐路由 + Header 高亮 |
| 2 | `?view=` 历史深链 | ♻️ 客户端桥接重定向 | 带 `?view=P3` 访问 `/` → 落地 `/p3/` |
| 3 | UniversalWidget 全局浮窗/50 条会话写穿 | ✅ 挂 layout 后跨路由保持 | 路由间浮窗状态不丢失 |
| 4 | externalCommand 指挥链 | ♻️ Context 桥接 | 浮窗指派 → P1/P2 联动回归 |
| 5 | 移动端 <768px 降级 + PWA 五 Tab | ♻️ 挂载守卫 | DevTools 移动仿真 + 首帧无闪跳 |
| 6 | P1 三针真实时钟/慢旋环/自适应 | ✅ 纯客户端组件原样 | 现有单测 + 视检 |
| 7 | P3 九步环 ResizeObserver 缩放 | ✅ 同上 | 现有单测 + 多分辨率视检 |
| 8 | P2 WebSocket 事件流（缺省模拟流） | ✅ env 换名后行为不变 | 配置/不配置两种 env 场景 |
| 9 | P5 PII 揭示（VITE_PII_REVEAL_API 可选） | ✅ 同上 | 未配置 env 时静默降级验证 |
| 10 | PWA 离线开屏/安装 | ♻️ sw.js 改写 | Lighthouse PWA 项 + 离线断网验收 |
| 11 | GitHub Pages 自定义域/HTTPS | ✅ CNAME 随导出复制 | 部署后 curl 验证 |
| 12 | SEO 收录（robots index:true 成果） | ✅ metadata 显式固化 | `curl` 检查无 noindex |
| 13 | 130 项单测 + 覆盖率棘轮 | ♻️ §4.5 适配 | 全量跑绿 |
| 14 | Figma Make 托管开发（PORT 8443 预览） | ❌ 放弃 | 生态决策：开发入口改为本地 `next dev`；AGENTS.md 工作区说明需同步更新 |

## 七、维度六：Next.js 16 特性机会（迁移后增量，非阻塞）

| 特性 | 落地建议 |
| ---- | -------- |
| Turbopack（dev+build 默认） | 零配置直接受益；若遇个别 PostCSS 插件兼容问题，短期可回退 webpack（`--webpack`）过渡，再排查 |
| Cache Components / `use cache`（实验） | 纯静态站暂无服务端缓存需求；保持关闭，待有服务端化部署再启用 |
| React Compiler（稳定，需 react 19.2） | 二阶段开启 `experimental.reactCompiler`，替代手工 useMemo/useCallback 优化（P3 大画布渲染收益可观），开启后跑全量测试回归 |
| not-found.tsx → 404.html | 静态导出自动生成，补齐 GH Pages 404 能力（现状缺失） |
| Metadata `metadataBase` | 建议设 `https://minimax.yyc3.top`，og:image 绝对化 |
| 代理层 proxy.ts | 静态导出不支持（本项目本就无中间件，无影响） |

## 八、分阶段行动路线（可直接执行）

| 阶段 | 内容 | 交付物 | 工作量 | 风险 |
| ---- | ---- | ------ | ------ | ---- |
| **P0 决策准备** | 确认退出 Figma Make 托管生态；eslint-config-next×eslint10 兼容性验证（待确认项）；新分支 `feat/nextjs16` | 决策记录 | 0.5 | 🟢 |
| **P1 脚手架与配置** | 安装 next@16/react@19.2、新增 next.config.ts/postcss.config.mjs、tsconfig 改写、package.json scripts（dev/build/typecheck 门禁口径不变）、移除 vite/@tailwindcss/vite | `next build` 产出 out/ | 1.0 | 🟡 |
| **P2 布局与元信息** | app/layout.tsx（metadata 12 项映射）、globals.css 平移、Bootstrap.tsx（错误钩子+SW）、error/global-error/not-found | 首页可渲染、head 无缺失项 | 1.0 | 🟡 |
| **P3 路由拆分** | 5 个 page.tsx + CommandCenterContext + Header Link 化 + `?view=` 桥接 + ResponsiveGate 挂载守卫；**删除 main.tsx/App.tsx** | 五路由全功能等价 | 2.0–2.5 | 🔴 |
| **P4 服务层与 PWA** | env 三处改名、vite-env.d.ts→ProcessEnv 声明、sw.js 策略改写 + 版本 bump | 离线/安装/事件流回归 | 0.5–1.0 | 🟡 |
| **P5 测试适配** | vitest 配置、next/navigation mock、覆盖率口径重置与基线复验 | 130+ 例全绿 | 1.0 | 🟡 |
| **P6 CI 与部署** | ci.yml out/ 适配 + 产物检测清单扩展 + Pages 部署联调 + 线上 curl 验收 | minimax.yyc3.top 灰度切流 | 0.5–1.0 | 🟢 |
| **P7 收尾固化** | README/CHANGELOG/knip/madge/eslint ignores 更新、AGENTS.md 开发说明重写、全门禁复跑、归档 | 全绿 + 文档同步 | 0.5 | 🟢 |

**回滚策略**：迁移全程 Vite 主干保持可发布；`feat/nextjs16` 分支独立 CI 预览（Pages 部署改用 preview 环境或临时域名验证），验收通过后一次性切 main。旧产物 dist 流水线保留至新链路稳定一个迭代后移除。

## 九、待确认项（不盲猜清单）

| # | 事项 | 影响 | 状态 |
| - | ---- | ---- | ---- |
| 1 | eslint-config-next@16 对 ESLint 10 的 peer 支持 | lint 门禁方案 | ✅ 已验证兼容（peer >=9.0.0，见 [05 决策记录](05-Next.js16迁移P0决策记录.md)） |
| 2 | react 精确钉版 19.2.x 与现有 ^19.0.0 语义化兼容 | 依赖锁 | ⏳ P1 钉死并锁 pnpm-lock |
| 3 | Figma Make 平台是否仍需双轨维护（Vite 预览 + Next 主干并存） | 仓库结构与 CI 复杂度 | ✅ 已决策：单轨 Next（见 [05 决策记录](05-Next.js16迁移P0决策记录.md)） |
| 4 | `?view=` 历史外链的实际存量（是否有外部分享） | 桥接方案是否必要 | 查访问日志/使用方；无则删桥接 |
| 5 | sw.js 预缓存是否需要覆盖全部 5 路由（离线完整度 vs 缓存体积） | PWA 体验 | 建议外壳+运行时缓存（现网行为最接近） |

---
**评估结论**：✅ **可执行**——迁移为"轻壳重平移"型：6,704 行中约 6,100 行（views/components/data/hooks/services）原样或轻改复用，重度改造集中在 App.tsx（215 行）单一文件与配置层；总工作量 7–10 人日，最大风险点为跨视图状态桥接与 Figma Make 生态退出决策。
