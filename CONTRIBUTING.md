---
file: CONTRIBUTING.md
description: 贡献指南 · 工作流/质量门禁/代码规范/AI 协同约定
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-10-11
updated: 2026-10-11
status: active
tags: [guide],[contributing],[workflow]
category: policy
language: zh-CN
license: MIT
---

# 贡献指南 / Contributing to YYC³ AI FAMILY

首先，感谢你考虑为「**YanYuCloudCube** · 言启象限 | 语枢未来」贡献代码！
本指南帮助你在 **五维驱动五高五标五化** 的工程理念下高效协作。

## 行为准则

参与贡献即表示你同意遵守 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。

## 环境准备

```bash
# Node ≥ 22 + pnpm ≥ 10（推荐经 .mise.toml 管理）
mise install          # 可选：按仓库声明安装工具链
pnpm install          # 沙箱受限环境: pnpm install --store-dir .pnpm-store
PORT=3032 pnpm dev    # 团队规范：开发服务器端口 3030 起，被占用则顺延
```

## 开发工作流（PDCA+ 闭环）

1. **Plan**：在 Issue 中描述动机、方案与验收标准
2. **Branch**：从最新主干拉取特性分支

   ```bash
   git checkout -b feat/<模块>-<简述>     # feat/fix/docs/refactor/test
   ```

3. **Do**：小步提交，遵循 Conventional Commits

   ```bash
   git commit -m "fix(p2): close AudioContext after gate-failure beep"
   # type(scope): subject — type ∈ feat|fix|docs|style|refactor|perf|test|chore
   ```

4. **Check（质量门禁，全部必过）**

   | 门禁 | 命令 | 通过标准 |
   | ---- | ---- | -------- |
   | 类型检查 | `npx tsc --noEmit` | 0 errors |
   | 生产构建 | `pnpm build` | 构建成功 |
   | 格式化 | `pnpm format` | 无 diff |
   | 安全自查 | 无硬编码密钥 / `.env*` 不入库 | 0 违规 |

5. **Act / Archive**：提交 PR，并按团队文档闭环规范在 `docs/` 沉淀变更记录

## 代码规范要点

- **组件**：默认导出 + `React.FC<Props>`；视图命名 `P1..P5`，组件 PascalCase
- **样式**：Tailwind v4 原子类优先；全局主题/动效 keyframes 统一写入 `src/index.css`
- **引号**：含撇号字符串一律用双引号，或在单引号中转义（防止构建失败）
- **数据**：模拟数据集中于 `src/data/*`，类型定义于 `src/types/index.ts`，禁止在视图内散落魔法数据
- **可访问性**：交互元素保留 `title`/`aria` 提示；禁用态使用 `cursor-not-allowed`
- **动画**：新增动画必须在 `index.css` 中声明对应 `@keyframes`（禁止引用未定义的动画名）

## PR 提交清单

- [ ] 门禁三项（tsc / build / format）全绿
- [ ] UI 变更附截图或预览录屏
- [ ] 涉及数据结构时已同步 `src/types` 与相关文档
- [ ] 新增依赖已在 PR 描述中说明必要性
- [ ] 无硬编码密钥、无 PII、无 `console.log` 残留

## Issue 规范

标题格式：`[类型] 简述`，如 `[Bug] P3 回环演示按钮连点导致动画错乱`。
正文请包含：复现步骤 / 期望行为 / 实际行为 / 环境信息（Node、pnpm、浏览器）。

## AI 协同贡献者（AI Co-Creator）附加约定

- AI 生成代码须可追溯：PR 描述注明生成模型与会话文档路径
- 遵循「不盲猜、不盲测、不盲从」：改动前先读代码，改动后有门禁验证
- 敏感信息一律使用 `${ENV_VAR}` 占位，绝不提交真实凭据

---

## 变更历史

| 版本   | 日期       | 变更内容                                             | 作者                |
| ------ | ---------- | ---------------------------------------------------- | ------------------- |
| v1.0.0 | 2026-10-11 | 初始版本：PDCA 工作流/门禁表/代码规范/AI 协同约定     | YanYuCloudCube Team |

---

**© 2025-2026 YanYuCloudCube Team. All Rights Reserved.**

> 「_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_」
