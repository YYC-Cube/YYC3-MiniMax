/**
 * file: eslint.config.js
 * description: ESLint 扁平配置 · typescript-eslint + react-hooks + next/core-web-vitals
 * author: YanYuCloudCube Team
 * version: v2.1.0
 * created: 2026-10-11
 * updated: 2026-10-15
 * status: active
 * tags: [config],[lint],[eslint],[nextjs]
 *
 * brief: 质量门禁 · Lint 层（0 error 通过，warning 放行）
 *
 * details:
 * - Next.js 16 迁移：eslint-config-next@16.4+ 原生导出扁平配置数组（无需 FlatCompat），
 *   core-web-vitals 提供 @next/next、import、jsx-a11y、react 规则集
 * - ESM 下 import CJS 命名空间：取 .default（tseslint.config 接收展开后的扁平数组）
 * - ES10 下 eslint-plugin-* 传递插件 peer 上限 9：unmet peer 为警告级，运行时实测兼容
 *
 * dependencies: typescript-eslint, eslint-plugin-react-hooks, eslint-config-next
 */

import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/** CJS interop：原生扁平配置数组（外层可能再包一层数组，统一拍平） */
const raw = Array.isArray(nextCoreWebVitals) ? nextCoreWebVitals : (nextCoreWebVitals?.default ?? []);
const nextConfigs = raw.flat();

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'out/**',
      '.next/**',
      'next-env.d.ts',
      'node_modules/**',
      '.pnpm-store/**',
      '.figma/**',
      'docs/**',
      'coverage/**',
    ],
  },
  ...tseslint.configs.recommended,
  // Next.js 官方规则集（原生扁平配置；置于自定义规则前，后者优先）
  ...nextConfigs,
  // 静态导出（images.unoptimized=true）下 next/image 无优化收益；全站唯一 <img> 为品牌
  // 固定资产（BrandMark，显式宽高 + decoding），规则前提不成立——关闭并注明依据
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
  // 纯 JS 文件不适用 TS 语义规则（v8 no-unused-vars 对 JS 值位置误报 "only used as a type"）
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // compiler 系规则已全量修复且 React Compiler 已启用（next.config reactCompiler:true）
      // ——升回 error 门禁，新增代码必须符合 Rules of React
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/purity': 'error',
      'react-hooks/refs': 'error',
      'react-hooks/static-components': 'error',
      // 未使用变量以 TS 语义为准：前缀 _ 视为有意保留
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
