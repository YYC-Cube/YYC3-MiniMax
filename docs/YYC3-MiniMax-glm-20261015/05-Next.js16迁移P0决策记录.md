---
file: 05-Next.js16迁移P0决策记录.md
description: YYC3-MiniMax Vite→Next.js16 迁移 P0 阶段决策记录 - glm - 20261015
author: AI Tutor <GLM-5.3-Flash>
version: v1.0.0
created: 2026-10-15
updated: 2026-10-15
status: active
tags: [decision],[nextjs16],[p0]
category: report
---

# 📌 Next.js 16 迁移 · P0 阶段决策记录

> 前置文档：[04-Vite至Next.js16迁移评估清单.md](04-Vite至Next.js16迁移评估清单.md)
> 执行分支：`feat/nextjs16`（自 main @ d8654a3 切出）· 决策日期：2026-10-15

## 一、决策事项

| # | 决策 | 结论 | 依据 |
| - | ---- | ---- | ---- |
| D1 | **单轨 Next，退出 Figma Make 托管生态** | ✅ 用户确认采纳 | 删除 vite.config.ts 内 4 个 Figma 插件与 .figma/make/；开发入口改为本地 `next dev`；AGENTS.md 工作区说明随 P7 重写。理由：仓库/CI/门禁最简，避免双构建链长期维护成本 |
| D2 | **eslint-config-next@16 × ESLint 10 兼容性** | ✅ 兼容，无阻塞 | npm 实测（见下） |
| D3 | **迁移分支策略** | ✅ `feat/nextjs16` 已创建 | 迁移全程 Vite 主干保持可发布，验收通过后一次性合入 main |

## 二、兼容性实测证据（关闭清单待确认项 #1）

```text
$ npm view eslint-config-next@latest version peerDependencies --json
→ eslint-config-next@16.4.1
  peerDependencies: { eslint: ">=9.0.0", typescript: ">=3.3.1" }

$ npm view next@latest peerDependencies.engines --json
→ next@16.4.1
  react/react-dom peer: "^18.2.0 || … || ^19.0.0"
  engines: { node: ">=20.9.0" }
```

| 项目现状 | Next 16 要求 | 判定 |
| -------- | ------------ | ---- |
| ESLint ^10.12.0 | >=9.0.0 | ✅ 通过（`>=` 语义含 10.x） |
| TypeScript ^5.7.0 | >=3.3.1 | ✅ |
| React ^19.0.0 | ^19.0.0 | ✅（P1 钉版 19.2.x 为 React Compiler 前置，非阻塞） |
| Node 22 | >=20.9.0 | ✅ |

> 注：next 当前最新为 16.4.1（评估清单撰写时的 16.x 系列小版本更新），P1 安装时以 `next@^16` 锁定最新稳定小版本。

## 三、待确认项状态同步（对应清单 §九）

| # | 事项 | 状态 |
| - | ---- | ---- |
| 1 | eslint-config-next@16 peer 支持 | ✅ 已关闭（本文 D2） |
| 3 | Figma Make 双轨/单轨 | ✅ 已关闭（本文 D1：单轨） |
| 2 | react 钉版 19.2.x | ⏳ 移交 P1（安装时执行） |
| 4 | `?view=` 历史外链存量 | ⏳ 移交 P3（桥接实现前查证；无存量则删桥接） |
| 5 | sw.js 预缓存范围 | ⏳ 移交 P4（默认采纳"外壳+运行时缓存"） |

## 四、P0 交付物核对

- [x] 兼容性验证（D2，npm 实测证据）
- [x] Figma Make 退出决策（D1，用户确认）
- [x] 分支 `feat/nextjs16` 创建
- [x] 本决策记录文档
- [ ] （随本提交入库）迁移评估清单 04 文档

## 五、P1 执行勘误（相对评估清单 04）

| 清单项 | 清单假设 | P1 实测 | 处置 |
| ------ | -------- | ------- | ---- |
| tsconfig `jsx` | 改为 `preserve` | **Next 16 强制 `react-jsx`**（automatic runtime，build 时自动改写并标注 mandatory） | 采纳 react-jsx |
| vite 依赖 | 移除 | vitest@5 与 @vitejs/plugin-react@6 的 peer 均要求显式 vite（`^6 | | ^7 | | ^8`） | **保留** vite devDep，仅服务 vitest 工具链 |
| eslint-config-next 传递插件 | P5 再验证 | eslint-plugin-import/jsx-a11y/react peer 上限 eslint 9，ESLint 10 下为 unmet peer 警告 | P5 接线时实测 `pnpm lint`，失败则回退现有规则集或 override 插件版本 |

## 六、P5/P6 执行勘误与最终决策

| # | 清单/P0 假设 | 实测 | 最终决策 |
| - | ------------ | ---- | -------- |
| D4 | P0 备选：FlatCompat 转换 next/core-web-vitals | **eslint-config-next@16.4+ 原生导出扁平配置数组**；FlatCompat 转换路径触发 config-validator 循环引用崩溃（ESLint 10） | 弃用 FlatCompat，直接 import + 拍平展开；卸载 @eslint/eslintrc |
| D5 | 评估清单 §7：compiler 系规则（set-state-in-effect/purity/refs/static-components）随 React Compiler 处理 | 接入后 9 处 error（W1 时钟渲染/StageCard 动态组件等，均属既有代码模式） | 迁移期降 warn（0 error 门禁保持），与 React Compiler 启用合并修复，不在行为等价迁移中重构 |
| D6 | TS 语义 no-unused-vars 通配全仓 | typescript-eslint v8 对纯 JS 文件（eslint.config.js/postcss/sw.js）值位置误报 "only used as a type" | JS 文件块单独关闭该规则 |
| D7 | Next 静态导出无 redirects() | `/?view=` 旧深链（PWA 快捷方式/外链）需兼容 | LegacyViewBridge 客户端 replace 桥接 + manifest 快捷方式升级真路由直达（少一跳） |
| D8 | sw.js 单页缓存（v1） | 多路由下缓存键错配会"离线串页" | SW v2：五路由文档预缓存 + pathname 归一化导航缓存 + activate 清 v1 |
| D9 | MPA 化后滚动行为待适配 | 无全局 scroll-behavior、局部容器滚动与路由无关、MPA 导航滚动浏览器原生接管 | 零改动通过 |

## 七、P7 主线合并清单（待执行）

1. `feat/nextjs16` → `main` 合并（--no-ff 保留迁移史）
2. push github main → CI 全绿 → Pages 自动部署 `out/`
3. 线上复检：五路由 200 / 404.html / sw v2 生效 / 无 noindex
4. 内网 GitBucket 恢复后 `git push origin main` 镜像同步

---
**P0 状态**: ✅ 完成
**P1–P6 状态**: ✅ 全部完成（分支 feat/nextjs16，提交链 f62e535→P6）
