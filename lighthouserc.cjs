/**
 * file: lighthouserc.cjs
 * description: Lighthouse CI 体检配置（评分卡 P0-1）· 静态导出产物运行时预算
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [config],[lighthouse],[performance],[budget]
 *
 * brief: pnpm build 后运行 pnpm audit:lighthouse（@lhci/cli autorun），
 *        断言失败 exit 非零阻断 CI；报告落 .lighthouseci/ 供 CI 归档
 *
 * budgets（对齐评分卡运行时健康目标）：
 *   - 性能得分 ≥ 0.9（聚合代理指标）
 *   - LCP ≤ 2500ms（p95 <2s 的 CI 侧代理上限）
 *   - CLS ≤ 0.1（视觉稳定）
 *   - TBT ≤ 300ms（长任务 <50ms 的实验室代理）
 */

module.exports = {
  ci: {
    collect: {
      staticDistDir: "out",
      numberOfRuns: 1,
      settings: {
        // 五路由逐一采样（P1-P5 全链路体检）
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
        ],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["error", { maxNumericValue: 300 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 2000 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
      reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%",
    },
  },
}
