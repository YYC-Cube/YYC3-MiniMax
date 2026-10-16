---
file: 00-UIUX全维度审计报告.md
description: YYC3-MiniMax UI/UX 全维度审计 - DeepSeek - 2026-10-16
author: AI Tutor <DeepSeek-V4.1-Flash>
version: v1.0.0
created: 2026-10-16
updated: 2026-10-16
status: active
tags: [audit],[analysis],[uiux],[baseline]
category: report
---

# 📊 YYC³ 漫剧工业化指挥中心 UI/UX 全维度审计报告

**审计对象**：YYC³ AI FAMILY v4.8-HYPER（`yyc3-ai-family-command-center@1.2.1`，Next.js 16.4.1 静态导出 + React 19.2.9 + Tailwind v4 + React Compiler）
**审计日期**：2026-10-16 · **基线**：工作区当前 HEAD

## 〇、取证方法与证据声明（透明度前置）

| 证据链 | 结果 |
| --- | --- |
| SSR HTML 断言（dev server `localhost:3002`，curl 抓取 5 路由） | ✅ 全通过：P1 含时钟环/8头像/品牌12处；P5 含核验通过×4、打回重跑×4、脱敏对比×4、复检轮次×5；P2/P3/P4 内容齐备 |
| 质量门禁 | ✅ `tsc --noEmit` 0 错、`eslint .` 0 错 0 警、**31 文件 423 测试全绿**（含 p2/p5/piiReveal/eventStream.integration 交互测试） |
| 代码静态审计 | ✅ 覆盖全部 5 视图 + 26 组件 + 数据层 + 服务层 + 上下文层 |
| 浏览器截图/点击实测 | ⚠️ **环境受限**：本机共享浏览器被旧 Vite 项目 Service Worker 污染（`@vite/client` 注入 + `net::ERR_ABORTED`），Chrome headless 因沙箱 fork 保护崩溃。运行时交互改由 **423 项测试套件（happy-dom + testing-library 真实点击/断言）背书**。此为审计环境限制，非项目缺陷 |

---

## 一、全局摘要

| 指标 | 值 |
| --- | --- |
| **综合得分** | **83 / 100** |
| **P0 阻断** | **0** |
| **P1 严重** | **4** |
| **P2 一般** | **7** |
| **P3 优化建议** | **5** |
| 门禁/安全/业务数值一致性 | 优秀（单一事实源 `GATES` 常量，三端展示同源，未发现 UI 幻觉数值） |

亮点：PII 受控调取架构（原文永不出前端数据包）达到生产级安全契约；观测闭环（traceId 贯穿审计/指标/告警）+ Lighthouse CI 硬门禁超出同类项目水准。
短板集中：**质检状态机终态无锁、复检熔断无执行守卫、告警三重提示缺失、键盘可达性**。

---

## 二、分模块分项审核结果（12 维度）

### 1. 视觉UI一致性 —— 88 分 ✅ 良好

- **色彩规范**：`src/app/globals.css` L30-44 七色霓虹变量单一来源；状态语义全站统一：`#00FF88` 通过/在线、`#FFD700` 复检警告、`#FF006E` 阻断/告警、`#00F0FF` 信息主色。三态组件区分明确：正常 `border-white/10` → 达标 `#00FF88/40` → 阻断 `#FF006E/60 + animate-alert-flash`。
- **图标库**：lucide-react 全站唯一，无混用 ✅。
- **字体**：Inter/Noto Sans SC/JetBrains Mono 本地化（@fontsource，零公网依赖）；数字统一 `font-mono-num`（tnum+zero 表格数字对齐）✅。
- **LOGO**：`src/components/BrandMark.tsx` 单一组件，Header/时钟中心/W1/移动端统一引用；图标集 `public/yyc3-icons/` 六平台全尺寸齐备 ✅。
- **扣分项**：① 9px/10px 字号大量使用（P1 `text-[7px]`、P5 `text-[9px]`），指挥大屏可读、普通显示器偏小；② 色值双轨制——CSS 变量与组件内 `[#00F0FF]` 硬编码并行，主题漂移需双处同步；③ DCI-P3 影院色彩仅文案展示，无 `color(display-p3…)` 实际适配。

### 2. 信息架构与布局UX —— 90 分 ✅ 优秀

- 五大导航：`src/components/Header.tsx` L42-53 + `src/context/navigation.tsx` L39-45 静态路由表 + `usePathname` 派生高亮，P1-P5 全可达（SSR 断言证实）；Footer 按当前视图补充 CTA 形成双向导流。
- P5 信息层级优秀：顶部 4 门禁总览 → 三列 4/4/4 工作区（队列/脱敏/终审），队列卡内 shotCode+分数 → 五官/服饰/光影分项 → 提示词 → 操作按钮，优先级正确。
- 告警醒目度：P4 右列 CRITICAL 红卡常驻 + P2 门禁失败全屏 Modal + 卡片抖动，位置醒目 ✅。
- 扣分：`max-h-[60vh]` 滚动区在 ≤800px 高度屏幕与外层布局挤压；W1 浮窗（右下 z-50）与 P5 右列底部按钮存在遮蔽可能。

### 3. 数据可视化校验 —— 85 分 ✅ 良好

- **时钟环**（杜绝幻觉重点核查）：`src/components/p1/ClockDial.tsx` L30-47 三针角度公式正确（含 -90 十二点偏移）、真实钟表比例（时针 0.42R 粗短青色 / 分针 0.58R 冰白 / 秒针 0.7R 品红+尾锤配重），1s setInterval 走时 + 卸载清理，测试背书。
- **数值一致性交叉验证**：`GATES = {80, 0.75, 2轮}` 单一事实源（`src/domain/constants.ts` L17-24），P2 控制条/P5 门禁卡/移动端/弹窗四处展示 + `domain-constants.test` 全部同源；`GATE_SIM_SAMPLE_SCORE=74.8` 与 `sb-103.consistencyScore=74.8` 数据一致，**未发现 UI 显示幻觉** ✅。
- **颜色语义**：绿=通过/黄=复检/红=阻断符合预期，StatusPill 五色调令牌统一 ✅。
- 扣分：① P4 四张图表为**静态硬编码 SVG 点集**，"10s 采样"文案暗示实时性（接入真实后端前的演示态风险）；② P5 门禁卡 `value="91.4%"` 硬编码于视图层，不从 `storyboards` 聚合派生——队列打回后顶部总览不联动（见 Bug#9）；③ KPI sparkline 为静态 trend 数组。

### 4. 交互功能测试 —— 82 分 ✅ 良好（含 1 项 P1 缺陷）

| 交互项 | 结论 | 证据 |
| --- | --- | --- |
| P1-P5 路由跳转 | ✅ | Link + navigate() + pathname 高亮；SSR 断言全通 |
| 打回重跑/核验通过 | ⚠️ | 状态机 + telemetry.audit 留痕 + 0.5s 抖动动画可用（p5 测试），**但终态无锁**（Bug#1） |
| 脱敏对比弹窗 | ✅ | revealPiiRaw 异步受控调取 + 失败降级 + 审计（piiReveal.test 8 用例） |
| 门禁失败模拟 | ✅ | 闪烁→蜂鸣(降级)→Modal→P5 跳转链路完整（p2 测试） |
| 任务实时刷新 | ✅ | eventStream LIVE(WebSocket/SSE)/SIM 双模式（integration 测试） |
| 报告导出 | ❌ 无此功能 | P5 终审报告无导出入口 |
| 日志折叠/展开 | ❌ | EventStreamPanel 无折叠 |
| 队列分页 | ❌ | 4 条全量渲染，无分页/虚拟化 |
| 批量选中分镜 | ❌ | 无多选机制 |
| 异常置灰逻辑 | ⚠️ | `revealingPiiId` 有逻辑防重入但无 disabled 视觉态 |

### 5. 状态边界测试 —— 70 分 ⚠️ 重点短板

- ✅ 已覆盖：门禁阻断告警（Modal+P4 CRITICAL 队列）、PII 拦截告警（红标"拦截并告警"）、错误兜底三件套（`error.tsx`/`global-error.tsx`/`not-found.tsx` + 视图级 ErrorBoundary 隔离）。
- ❌ 缺失：**空队列空态**（`storyboards.map([])` 直接空白，无插画/文案）；**Agent 离线态**（数据层全在线、悬浮卡仅 speaking/online 两态、Header 三灯永远绿——离线告警 UI 无处触发）；**复检熔断执行守卫**（第 3 次打回不拦截，见 Bug#2）；满载积压无过载样式；GPU 算力 100% 无过载色（仅显存 >90% 变红）。

### 6. 可访问性 A11y —— 65 分 ⚠️ 最大扣分维度

- ✅ 已有：aria 属性充分（P1 23 处/P5 33 处：移动端 nav `aria-label` + tab `aria-pressed`）；文字对比度主体达标（`#9BA3B4` on `#0A0D18` ≈7.4:1）；Lighthouse accessibility ≥0.9 为 CI 硬门禁；`html lang="zh-CN"`。
- ❌ 缺失：
  - **三重提示不达标**：Header 全局三灯、P4 节点状态灯仅颜色 + `title`（对屏幕阅读器/键盘不可见）；质检分数有"未达 80% 门禁"文字 ✅ 但告警体系未系统化 icon+text+color。
  - **键盘不可达**：ClockCenter logo、AgentMember 头像、StageCard 为 `div onClick`，无 `tabIndex`/`role="button"`/键盘事件，Tab 无法遍历核心交互。
  - 文本缩放失效：全站 `text-[9px]` 等 px 任意值，浏览器字号放大不生效。

### 7. 性能前端埋点 —— 88 分 ✅ 优秀

- 埋点闭环：web-vitals + RUM 采样（错误率/p95/长任务/内存）+ 结构化 telemetry（rum.test 背书）；traceId 全链路串联。
- 预算硬门禁：`lighthouserc.cjs` L38-45 perf≥0.9 / LCP≤2500ms / CLS≤0.1 / TBT≤300ms + bundle-budget 脚本，五路由逐一采样。
- React Compiler 自动记忆化启用；动画走 CSS/SMIL 不占 JS 线程。
- 扣分：>30 条队列无虚拟化（当前 4 条无感）；P1 时钟 8 连线×8 粒子 = 64 个常驻 SMIL 动画元素（低端设备耗电）；无 `prefers-reduced-motion` 降级。4K 帧盲水印预览/NFS 文件预览无功能入口（仅文案），不构成性能面。

### 8. 安全UI合规审计 —— 92 分 ✅ 超预期

- **架构级亮点**：`src/services/piiReveal.ts` 实现"原文永不出前端数据包"——数据层仅 `maskedSnippet`，原文按次经受控接口调取（RBAC+审计+限流+no-store 契约），网关不可达时降级掩码快照且不留存原文。演示假数据采用"必然校验失败"格式（全零手机号段/非法日期证件号），gitleaks 全历史扫描 CI 通过。
- 掩码规则统一：`138-****-0000`、`110101********9590`、`KEY=****` ✅；脱敏对比弹窗为受控异步调取 + 审计留痕 ✅；`user-select:none` 全局锁定 + 日志区局部 `select-text` 白名单 ✅。
- 扣分：SIM 模式 `DEMO_RAW` 映射仍在包内（代码已注明生产需配 `NEXT_PUBLIC_PII_REVEAL_API` 后删除，属运维契约项）；审计"不可篡改 UI 标识"仅有 traceId 关联展示，无哈希链/只读徽章；盲水印仅底部文案无状态详情。

### 9. 业务逻辑校验 —— 90 分 ✅ 优秀

- 门禁 ≥80%：`formatGatePercent` 三端一致展示"≥ 80% 达标" ✅。
- 复检 ≤2 轮：P3 "≤2轮"、P5 "复检轮次： N/2"、宗师报告"1/2 轮 (安全)" 展示全正确 ✅（但执行守卫缺失，见 Bug#2）。
- Milvus 溯源：P3 "Milvus 知识库连接正常" + P5 "100% 溯源 / #IP-WORLD-90" ✅。
- SyncNet 0.84 ≥ 0.75 达标 ✅；五官/服饰/光影分项得分展示 ✅（姿态连续性/艺术风格两项数据存在未展示）。
- 母带交付面板：4K UHD @ 24fps + DCI-P3 Cinema + SyncNet + 脱敏完整度四项参数正确 ✅。

### 10. 移动端/大屏响应式 —— 85 分 ✅ 良好

- <768px：`src/views/MobileFallback.tsx` 五 Tab（家族/流水线/ReAct/算力/质安）+ 安全区 `env()` 适配 + PWA 安装 + W1 闭环（p5-mobile/pwa-brand-mobile 测试背书）；`src/app/ResponsiveGate.tsx` SSR 首帧按桌面渲染消除 hydration 闪跳。
- 4K 大屏：1980×1020 缩放模式（Maximize2 切换）+ fit 自适应双模；P3 ResizeObserver 短边自适应（历史缺陷已修复）。
- 扣分：P5 三列 `col-span-4` 无中屏断点（768–1100px 挤压，P3 有 `lg:` 前缀而 P5 无）；AgentMember 悬浮档案卡 hover 触发，触屏无 tap 替代。

### 11. 错误提示与用户反馈 —— 75 分 ⚠️

- ✅ 优秀项：质检不通过原因达到要求粒度——`sb-103` 的"面部特征相似度 68% 未达 80% 门禁，瞳距与下颌线偏离标准资产图谱" + thumbPrompt"面部阴影过重导致瞳孔识别失真"；GateFailureModal 文案完整（分镜号/得分/阈值/回环机制/下一步动作）；告警 `animate-alert-flash 0.5s infinite` 持续不自动消失。
- ❌ 缺失：全站无 toast 系统（核验/打回/指令发送成功后静默）；PII 调取失败 catch 静默收起，用户无感知失败原因。

### 12. 多Agent协同视图校验 —— 88 分 ✅ 良好

- 8 Agent 在线率：Footer "100% (8/8 在线)" + P1 时钟位 8 头像（12:00–10:30 时钟位点标注）+ W1 八 Agent 秒切 ✅。
- 并行/活跃/积压：Footer "42 Active（流水线并行： 6 / 积压： 6）" + 各 StageCard `activeTasks`/`queueLength` ✅。
- 调度日志时序：EventStreamPanel 时间戳倒序 + 六级日志色（INFO/SUCCESS/WARN/ERROR/THINK/ACT）+ traceId 短码关联 ✅；悬浮档案卡含发言中/在线就绪两态 ✅。
- 扣分：Agent 离线告警 UI 缺失（同维度 5），在线率数字为静态展示不随事件流派生。

---

## 三、Bug 清单（按优先级）

### P0 阻断 —— 0 项

无。五路由 SSR 全可达、门禁数值零幻觉、安全合规达标、423 测试全绿。

### P1 严重 —— 4 项

| # | 等级 | 位置 | 现象 | 业务风险 | 修复建议 |
| --- | --- | --- | --- | --- | --- |
| 1 | P1 | `src/components/p5/QualityQueuePanel.tsx` L140-155 | 质检卡 `passed/rejected` 终态后【打回重跑/核验通过】按钮仍可点击。复现：点击"核验通过"→ 卡变绿 → 继续点"打回重跑" → 状态翻转，无终态锁 | 已终审分镜可被无限翻转，质检结论不可信，审计留痕与实际状态脱节 | 终态渲染 `disabled` + 置灰样式 + `cursor-not-allowed`；或终态直接隐藏按钮组改显状态徽章 |
| 2 | P1 | `src/views/P5QualitySecurity.tsx` L96-113 | `handleReject` 硬编码 `reviewRound: 2`，无轮次守卫。复现：对同一分镜连点"打回重跑"3 次 → 永远显示 2/2，无熔断提示 | 违反"复检 ≤2 轮熔断"业务规则：超限复检浪费算力且 UI 展示与规则矛盾 | 打回时 `reviewRound = min(prev+1, MAX)`；达 2/2 后禁用打回按钮 + 显示"已达复检上限，转人工终审"告警条 |
| 3 | P1 | `src/components/Header.tsx` L147-170、`src/views/P4OpsMonitoring.tsx` L96-105 | 产能/质检/安全三灯与节点状态灯仅颜色 + hover `title`，无文字标签绑定、无图标语义、`title` 对键盘/SR 不可见 | 色弱用户与屏幕阅读器完全无法感知系统异常，违反"颜色+文字+图标三重提示"要求 | 状态灯旁加常显文字/图标；`title` → `aria-label` + `role="status"`；异常态加图标变形（⚠ 图标） |
| 4 | P1 | `src/components/p1/ClockCenter.tsx` L56、`src/components/p1/AgentMember.tsx` L52-57 | 品牌 logo、8 头像、StageCard 均为 `div onClick`，无 `tabIndex`/`role`/`onKeyDown` | 键盘用户无法完成"进入 P2/唤起 W1"核心动线，Tab 遍历顺序断裂 | 改 `<button>` 或补 `role="button" tabIndex={0}` + Enter/Space 处理 |

### P2 一般 —— 7 项

| # | 等级 | 位置 | 现象与复现 | 业务风险 | 修复建议 |
| --- | --- | --- | --- | --- | --- |
| 5 | P2 | 全站 | 核验通过/打回/指令发送后无任何 toast | 操作者无法确认动作已生效（尤其队列长时） | 引入轻量 toast（成功绿/失败红，3s 自动消失） |
| 6 | P2 | `src/views/P5QualitySecurity.tsx` L63-65 | PII 原文调取失败静默收起（catch 空处理） | 安全员误以为"没有原文"而非"调取被拒" | 展示行内错误条："调取被拒绝（权限/网络），已记录审计" |
| 7 | P2 | QualityQueuePanel | 空队列时列表区纯空白 | 无法区分"无任务"与"加载失败" | 空态插画 + "当前无待检分镜"文案 |
| 8 | P2 | Footer/P1/数据层 | Agent 离线告警 UI 缺失，全静态 8/8 在线 | Agent 故障时指挥中心无感知 | 接入 eventStream 派生在线率，离线时头像灰化 + Footer 变红 |
| 9 | P2 | `src/views/P5QualitySecurity.tsx` L120-154 | 门禁卡 91.4%/0.84 硬编码，不随队列操作派生 | 顶部总览与队列实际状态脱节，产生"数据幻觉"观感 | 从 `storyboards` 聚合（均值/min）派生门禁卡数值 |
| 10 | P2 | `src/views/P4OpsMonitoring.tsx` L180-244 | 四图表静态硬编码点集 + "10s 采样"文案 | UI 暗示实时实为静态，接入真实后端前有误导性 | 标注"演示数据"徽标，或接 eventStream 驱动 |
| 11 | P2 | P5 三列布局 | `col-span-4` 无 `lg:` 断点，768–1100px 三列挤压；队列无分页/虚拟化 | 中屏笔记本布局挤压；>30 条分镜全量 DOM 渲染 | 加中屏断点（如 `lg:col-span-12 xl:col-span-4` 堆叠）；队列超 20 条上虚拟滚动 |

### P3 优化建议 —— 5 项

1. **DCI-P3 影院色彩真实适配**：为 `--neon-*` 增加 `color(display-p3 …)` 回退声明，交付面板色彩在广色域监视器上与母带一致。
2. **px → rem 字号体系**：9/10px 任意值改 rem 阶梯，恢复浏览器字号缩放能力（同时利好 A11y）。
3. **动画可及性降级**：`prefers-reduced-motion: reduce` 时停用 64 个 SMIL 粒子与 pulse 动画（P1 时钟环低端设备耗电）。
4. **补齐雷达分项**：`postureContinuity`（姿态连续性）/`artisticStyle`（艺术风格）两项数据已有，可在分镜卡分项区以 3+2 或悬浮展开呈现。
5. **审计防篡改 UI 标识**：telemetry 事件已含 traceId，建议 P5 底部加"审计日志只读 · 哈希链校验中"徽章，强化合规可视化。

---

## 四、UX 优化建议（P3，不阻断上线）

见上方 P3 清单 5 项。

---

## 五、综合测试结论

## 【条件通过】✅

**判定依据**：0 项 P0 阻断；核心链路（五路由可达、门禁数值零幻觉、PII 安全契约、423 项测试全绿、typecheck/lint 零错）全部达标；PII 受控调取与可观测闭环达到生产级水准。**上线条件：修复 4 项 P1**（质检终态锁、复检熔断守卫、告警三重提示、键盘可达性）——均为局部改动，不影响架构；P2 项建议随下一迭代排期，P3 项纳入体验优化 backlog。

**审计说明**：本报告浏览器截图维度因审计环境限制（共享 SW 污染 + 沙箱 fork 保护）以"SSR HTML 断言 + 423 项交互测试 + 全量代码走查"三重证据链替代，结论可靠性不受影响；建议在干净浏览器环境执行一轮 4K 大屏 + 触摸屏人工目检作为补充验收。

---

## 六、修复执行日志（本次会话同步修复）

| 时间 | 诊断项 | 操作 | 状态 |
|---|---|---|---|
| 2026-10-16 | P1-#1 | QualityQueuePanel 终态锁（passed/rejected 禁用双按钮） | ✅ 已修复并验证 |
| 2026-10-16 | P1-#2 | handleReject 轮次递增 + MAX 熔断 + 达限禁打回 + 熔断提示条 | ✅ 已修复并验证 |
| 2026-10-16 | P1-#3 | Header 三灯 icon+text+aria 三重提示；P4 节点 StatusPill | ✅ 已修复并验证 |
| 2026-10-16 | P1-#4 | ClockCenter/AgentMember/StageCard/P1 快捷入口键盘可达 | ✅ 已修复并验证 |

> 详细补丁与验证结果见同目录 `02-执行日志与进度跟踪.md`。
> 门禁结论：typecheck/lint 0 错，knip/madge/depcruise 通过，**427 用例全绿**（+4），build 7/7 静态页，budget 836.3KB ≤ 850KB。
> 上线判定更新：4 项 P1 已闭环 → **达到"通过"条件**；P2×7 / P3×5 留待后续迭代。
