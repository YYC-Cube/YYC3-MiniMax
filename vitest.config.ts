/**
 * file: vitest.config.ts
 * description: Vitest 配置 · happy-dom 环境/测试目录/覆盖率阈值门禁
 * author: YanYuCloudCube Team
 * version: v1.1.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [config],[test],[vitest],[coverage]
 *
 * brief: 单测/集成测试运行配置 + v8 覆盖率（阈值随视图层测试补齐逐步上调）
 *
 * dependencies: vitest, @vitejs/plugin-react, happy-dom, @vitest/coverage-v8
 */

import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // 与 tsconfig paths / Next 默认对齐：src/app 等源码使用 @/ 别名导入（Next.js 16 迁移）
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.{ts,tsx}'],
    // globals 开启后 @testing-library/react 自动注册 afterEach cleanup，
    // 防止组件测试间 DOM 累积导致 getBy* 多元素冲突
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // 引导胶水排除出统计口径：main.tsx 为 DOM 挂载入口（createRoot + 全局钩子安装），
      // services/pwa.ts 为仅生产环境的 SW 注册（navigator.serviceWorker 在 happy-dom 不可测）。
      // src/app/** 整体为 Next 约定层（layout/page/error/not-found/Bootstrap 均为框架胶水，
      // 且 coverage-v8 rolldown 对未导入 JSX 文件 remap 会 PARSE_ERROR，见 P2 验收），业务视图不受影响
      exclude: [
        'src/env.d.ts',
        'src/services/pwa.ts',
        'src/app/**',
        'src/**/.DS_Store',
      ],
      reporter: ['text', 'html'],
      // 覆盖率棘轮：观测闭环批次（metric/降级快照）后基线上调（实测 94.69/87.91/93.43/96.58），仅升不降
      thresholds: {
        lines: 96,
        branches: 87,
        functions: 93,
        statements: 94,
      },
    },
  },
});
