/**
 * file: .dependency-cruiser.cjs
 * description: 依赖边界守卫 · 循环 / 分层 / UI↔编排层直连（五高架构 · 高可扩展）
 * author: YanYuCloudCube Team
 * version: v1.0.0
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
 * run: pnpm depcruise
 */

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: '禁止任何层级出现循环依赖',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-purity',
      comment: 'domain / types 为纯核：不得依赖其它 src 层',
      severity: 'error',
      from: { path: '^src/(domain|types)/' },
      to: { path: '^src/', pathNot: '^src/(domain|types)/' },
    },
    {
      name: 'core-no-framework',
      comment: 'domain / types 不得依赖 react / next（保持可移植纯逻辑）',
      severity: 'error',
      from: { path: '^src/(domain|types)/' },
      to: { dependencyTypes: ['npm'], path: '^(react|react-dom|next)(/|$)' },
    },
    {
      name: 'services-no-ui',
      comment: 'services 为无 UI 层：仅可依赖 services / data / domain / types',
      severity: 'error',
      from: { path: '^src/services/' },
      to: { path: '^src/', pathNot: '^src/(services|data|domain|types)/' },
    },
    {
      name: 'services-no-framework',
      comment: 'services 不得依赖 react / next（无 UI 服务边界）',
      severity: 'error',
      from: { path: '^src/services/' },
      to: { dependencyTypes: ['npm'], path: '^(react|react-dom|next)(/|$)' },
    },
    {
      name: 'data-no-upper-layers',
      comment: 'data 仅可依赖 data / domain / types：不得依赖 services / hooks / components / views / app',
      severity: 'error',
      from: { path: '^src/data/' },
      to: { path: '^src/', pathNot: '^src/(data|domain|types)/' },
    },
    {
      name: 'ui-no-app-internals',
      comment: 'components / hooks / views 不得反向依赖 app 编排层（路由与布局私有实现）',
      severity: 'error',
      from: { path: '^src/(components|hooks|views)/' },
      to: { path: '^src/app/' },
    },
    {
      name: 'components-no-views',
      comment: 'components 不得依赖 views（可复用组件不得依赖页面视图）',
      severity: 'error',
      from: { path: '^src/components/' },
      to: { path: '^src/views/' },
    },
    {
      name: 'context-no-ui',
      comment: 'context 为状态编排层：不得依赖 components / views / app',
      severity: 'error',
      from: { path: '^src/context/' },
      to: { path: '^src/', pathNot: '^src/(context|services|data|domain|types)/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/[^/]+' },
    },
  },
};
