/**
 * file: .dependency-cruiser.cjs
 * description: 依赖边界守卫 · 循环 / 分层 / UI↔编排层直连（五高架构 · 高可扩展）
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [architecture],[boundary],[dependency-cruiser]
 *
 * brief: 以 forbidden 规则固化分层契约 —— domain/types 为纯核；services/data 不依赖 UI；
 *        components/hooks/views 不得反向依赖 app 编排层；components 不得依赖 views
 *
 * 分层（自下而上，只允许向下依赖）：
 *   types / domain  →  data  →  services  →  context  →  components / hooks / views  →  app
 *
 * PR1 架构解耦插层（agent-orchestrator 不依赖 UI / Next.js）：
 *   core（编排核：agents/machine/queue/runtime）
 *     └─ 只依赖 core / types / domain —— Agent 调用模型走 ModelPort（types/ports），
 *        DOM/存储/网络实现一律沉在 services 适配器，core 物理不可达
 *   workers（桥接层：core ↔ UI 消息边界）
 *     └─ 依赖 core / services / types / domain —— 禁止反向依赖 UI 与 app 路由层
 *
 * 循环依赖检测：no-circular 全层级 error（含 core 子目录间，PR2 起 agents/machine/queue 互引频增）
 *
 * run: pnpm depcruise
 */

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "禁止任何层级出现循环依赖",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "orchestrator-core-purity",
      comment:
        "core 编排核（agents/machine/queue/runtime）只依赖 core/types/domain：禁止 services/data/hooks/components/context/views/app",
      severity: "error",
      from: { path: "^src/core/" },
      to: { path: "^src/", pathNot: "^src/(core|types|domain)/" },
    },
    {
      name: "orchestrator-core-no-framework",
      comment: "core 不得依赖 react/next（无 UI、可移植到 Worker/Node 运行时）",
      severity: "error",
      from: { path: "^src/core/" },
      to: { dependencyTypes: ["npm"], path: "^(react|react-dom|next)(/|$)" },
    },
    {
      name: "workers-bridge-no-ui",
      comment:
        "workers 为桥接层（core ↔ UI）：可依赖 core/services/types/domain，禁止反向依赖 UI 与 app 路由层",
      severity: "error",
      from: { path: "^src/workers/" },
      to: { path: "^src/(components|views|hooks|context|app)/" },
    },
    {
      name: "ui-only-orchestrator-client",
      comment:
        "UI 只经唯一应用门面 orchestratorClient 发命令/收事件（目标架构 UI → application）；worker 桥/入口/可观测实现为 apps/worker 私有件，UI 物理不可达",
      severity: "error",
      from: { path: "^src/(components|views|hooks|context|app)/" },
      to: { path: "^src/workers/", pathNot: "^src/workers/orchestratorClient\\.ts$" },
    },
    {
      name: "core-purity",
      comment: "domain / types 为纯核：不得依赖其它 src 层",
      severity: "error",
      from: { path: "^src/(domain|types)/" },
      to: { path: "^src/", pathNot: "^src/(domain|types)/" },
    },
    {
      name: "core-no-framework",
      comment: "domain / types 不得依赖 react / next（保持可移植纯逻辑）",
      severity: "error",
      from: { path: "^src/(domain|types)/" },
      to: { dependencyTypes: ["npm"], path: "^(react|react-dom|next)(/|$)" },
    },
    {
      name: "services-no-ui",
      comment: "services 为无 UI 层：仅可依赖 services / data / domain / types",
      severity: "error",
      from: { path: "^src/services/" },
      to: { path: "^src/", pathNot: "^src/(services|data|domain|types)/" },
    },
    {
      name: "services-no-framework",
      comment: "services 不得依赖 react / next（无 UI 服务边界）",
      severity: "error",
      from: { path: "^src/services/" },
      to: { dependencyTypes: ["npm"], path: "^(react|react-dom|next)(/|$)" },
    },
    {
      name: "data-no-upper-layers",
      comment:
        "data 仅可依赖 data / domain / types：不得依赖 services / hooks / components / views / app",
      severity: "error",
      from: { path: "^src/data/" },
      to: { path: "^src/", pathNot: "^src/(data|domain|types)/" },
    },
    {
      name: "ui-no-app-internals",
      comment:
        "components / hooks / views 不得反向依赖 app 编排层（路由与布局私有实现）",
      severity: "error",
      from: { path: "^src/(components|hooks|views)/" },
      to: { path: "^src/app/" },
    },
    {
      name: "components-no-views",
      comment: "components 不得依赖 views（可复用组件不得依赖页面视图）",
      severity: "error",
      from: { path: "^src/components/" },
      to: { path: "^src/views/" },
    },
    {
      name: "context-no-ui",
      comment: "context 为状态编排层：不得依赖 components / views / app",
      severity: "error",
      from: { path: "^src/context/" },
      to: {
        path: "^src/",
        pathNot: "^src/(context|services|data|domain|types)/",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    reporterOptions: {
      dot: { collapsePattern: "node_modules/[^/]+" },
    },
  },
}
