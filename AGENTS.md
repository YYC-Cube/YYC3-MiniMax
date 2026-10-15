# nextjs-app

Next.js 16 App Router + React 19 + Tailwind CSS v4 静态导出应用（自 Figma Make/Vite 迁移，2026-10-15）。

## Development Server

本地开发需手动启动：

```bash
pnpm dev   # next dev，默认 http://localhost:3030
```

- Hot reload: 修改源文件即时生效
- 无 Figma Make 托管运行时（迁移决策 D1，见 docs/YYC3-MiniMax-glm-20261015/05）

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/app/layout.tsx` - 根布局：Metadata/Viewport API（12 项 head）+ CommandCenterProvider + CommandShell 全局壳
- `src/app/page.tsx` - 根路由 P1（时钟环）；`p2/ p3/ p4/ p5/` 同构薄壳 page
- `src/app/CommandCenterContext.tsx` - 跨路由共享状态（activeAgentId/W1/externalCommand/高亮/scaleMode）+ navigate 编程式路由
- `src/app/CommandShell.tsx` - 全局壳：Header/Footer/W1 浮窗/1980×1020 缩放/移动降级分支
- `src/app/error.tsx` `global-error.tsx` `not-found.tsx` - 错误边界与 404（静态导出 404.html）
- `src/app/globals.css` - 全局样式与 Tailwind v4 入口（原 src/index.css）
- `src/views/` - 五大业务视图（P1-P5），由各 page 挂载
- `src/components/` - 业务组件（Header/Footer/UniversalWidget/p2 子件等）
- `src/services/` - telemetry/pwa/eventStream/piiReveal 等无 UI 服务
- `next.config.ts` - output:'export' 静态导出 + trailingSlash + images.unoptimized
- `postcss.config.mjs` - Tailwind CSS v4 PostCSS 插件（@tailwindcss/postcss）
- `package.json` - 依赖与 dev/build/lint/typecheck/test 脚本
- `.mise.toml` - Node.js 与 pnpm 工具链版本

## Dependencies

- Framework: Next.js 16（App Router，静态导出 SSG）
- Runtime: React 19 / React DOM 19（精确钉版，与 next peer 对齐）
- Styling: Tailwind CSS v4（@tailwindcss/postcss）
- Build tooling: TypeScript 5.7, Vitest 5（显式依赖 vite 仅服务测试工具链）
- Formatting: oxfmt

## Styling

Tailwind CSS v4 通过 **@tailwindcss/postcss**（postcss.config.mjs）接入。`src/app/globals.css` 以 `@import 'tailwindcss';` 为入口，由 `layout.tsx` 导入。全局 CSS / @font-face / 主题定制一律写在 globals.css，保持 @import 在文件首位。无 Tailwind/PostCSS 旧式 config 文件。

## Routing & Metadata

- 五路由静态导出：`/` `/p2/` `/p3/` `/p4/` `/p5/`（trailingSlash 目录形态，GitHub Pages 兼容）
- head 元信息走 **Metadata/Viewport API**（layout.tsx 声明式），禁止手写 index.html
- 跨视图跳转用 `useCommandCenter().navigate()`（内含 router.push），勿直接操作视图状态

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- 页面组件在 page.tsx 中默认导出；业务组件用具名导出。
- 门禁：`pnpm typecheck && pnpm lint && pnpm knip && pnpm test:coverage && pnpm build`（0 error 0 warning，覆盖率棘轮 ≥93%）
- React Compiler 已启用（next.config `reactCompiler: true`），compiler 系规则（set-state-in-effect/purity/refs/static-components）为 error 门禁——新增代码必须符合 Rules of React，禁止 render 期写 ref / effect 内同步 setState / render 期创建组件。
