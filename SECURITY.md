---
file: SECURITY.md
description: 安全政策 · 漏洞上报通道/分级处置/安全编码基线
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-10-11
updated: 2026-10-11
status: active
tags: [policy],[security],[reporting]
category: policy
language: zh-CN
license: MIT
---

# 安全政策 / Security Policy

> 「**YanYuCloudCube**」言启象限 | 语枢未来
> 安全理念：**三级过滤安全防线 · PII 零泄漏 · 密钥零入库**（智云·守护 Guardline）

## 支持版本 / Supported Versions

| 版本 | 分支 | 状态 |
| ---- | ---- | ---- |
| 1.0.x | `main` | ✅ 接收安全修复 |
| < 1.0 | - | ❌ 不再维护 |

## 报告漏洞 / Reporting a Vulnerability

**请勿通过公开 Issue 披露安全漏洞。**

1. 邮件上报：**[admin@0379.email](mailto:admin@0379.email)**
   - 标题前缀：`[SECURITY]`
   - 内容请含：影响面、复现步骤/POC、严重性自评（CVSS 3.1 更佳）、修复建议
2. 响应时限（Asia/Shanghai 工作日）：
   - **确认回执**：≤ 48 小时
   - **初步评估**：≤ 5 个工作日
   - **修复发布**：高危 ≤ 14 天，中低危随下个迭代
3. 我们将在修复发布后公开致谢（除非你希望匿名），并遵循负责任披露（Responsible Disclosure, 90 天窗口）。

## 漏洞分级与处置 / Severity & Handling

| 级别 | 判定示例 | 处置 |
| ---- | -------- | ---- |
| Critical | RCE、密钥/凭据泄漏、供应链投毒 | 立即熔断 + 热修复发布 |
| High | XSS 存储型、越权访问、SSRF | ≤ 14 天修复 |
| Medium | CSRF、信息泄露（非敏感） | 随下个迭代 |
| Low | 架构性加固建议 | Roadmap 跟踪 |

## 项目内建安全基线 / Built-in Security Baseline

本项目虽为前端指挥舱原型，仍严格执行以下规范（对应 P5 质检与安全视图的四道门禁演示）：

- ✅ **密钥零入库**：所有凭据走环境变量（`${ENV_VAR}`），`.env*` 已入 `.gitignore`；AST 静态阻断演示见「门禁 4」
- ✅ **PII 零泄漏**：示例数据全部为虚构脱敏样例；三级过滤（识别 → 脱敏 → 审计）演示见「门禁 3」
- ✅ **依赖安全**：使用 pnpm 严格依赖策略；升级依赖前核对 `pnpm audit`
- ✅ **最小权限**：无任何后端凭据；纯静态构建产物可直接托管
- ✅ **数字水印**：成片交付阶段演示盲水印注入（版权溯源）

## 安全编码要求（贡献者必读）

1. 禁止硬编码 API Key / Token / 密码 —— 一经发现按 Critical 处置并强制轮换
2. 所有外部输入（含 W1 聊天输入）渲染前必须视为不可信文本，禁止 `dangerouslySetInnerHTML`
3. 新增第三方依赖须在 PR 中说明来源与必要性，锁定精确版本
4. 错误信息不得泄露内部路径、栈细节至用户界面

---

## 变更历史

| 版本   | 日期       | 变更内容                                                 | 作者                |
| ------ | ---------- | -------------------------------------------------------- | ------------------- |
| v1.0.0 | 2026-10-11 | 初始版本：上报通道/分级处置/内建安全基线/编码要求         | YanYuCloudCube Team |

---

**© 2025-2026 YanYuCloudCube Team. All Rights Reserved.**

> 「_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_」
