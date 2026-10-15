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

## 五、下一步（P1 脚手架与配置）

1. `pnpm add next@^16` + react/react-dom 钉 19.2.x；移除 vite/@tailwindcss/vite
2. 新增 next.config.ts（output:'export'/trailingSlash/images.unoptimized）
3. tsconfig.json 改写（jsx: preserve、next 插件、include 扩充）
4. postcss.config.mjs（@tailwindcss/postcss）
5. package.json scripts 切换（dev/build/test/typecheck 口径不变）
6. 验收：`next build` 产出 out/

---
**P0 状态**: ✅ 完成
