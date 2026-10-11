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
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.{ts,tsx}'],
    // globals 开启后 @testing-library/react 自动注册 afterEach cleanup，
    // 防止组件测试间 DOM 累积导致 getBy* 多元素冲突
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // src/main.tsx 为 DOM 挂载入口（createRoot + 全局钩子安装），排除出统计口径
      exclude: ['src/vite-env.d.ts', 'src/index.css', 'src/main.tsx'],
      reporter: ['text', 'html'],
      // 覆盖率棘轮：App 编排层集成测试后基线上调（94.1/89.6/92.9/95.2），仅升不降
      thresholds: {
        lines: 92,
        branches: 87,
        functions: 90,
        statements: 93,
      },
    },
  },
});
