/**
 * file: lighthouserc.cjs
 * description: Lighthouse CI 体检配置（评分卡 P0-1）· 静态导出产物运行时预算
 * author: YanYuCloudCube Team
 * version: v1.1.0
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
 *   - LCP ≤ 2500ms（desktop 模拟档 Good 阈值）
 *   - CLS ≤ 0.1（视觉稳定）
 *   - TBT ≤ 300ms（长任务 <50ms 的实验室代理）
 *
 * v1.1.0（2026-10-16 CI 修复）：
 *   - preset: "desktop"——本产品为 1980×1020 桌面指挥舱（移动为降级分支），
 *     desktop 模拟档贴近真实主场景；默认 mobile 档在 2 核 CI runner 上
 *     simulated 节流基线失真（LCP 实测 8758ms，本地同产物 ~2s），预算恒红不可达
 *   - numberOfRuns: 1→3——LHCI assert 默认 median 聚合，消除单次 Chrome 冷启动噪声
 *   - 移动端加载健康由 bundle 预算门禁（scripts/bundle-budget.mjs，750KB 棘轮）代理守护
 */

module.exports = {
  ci: {
    collect: {
      staticDistDir: "out",
      numberOfRuns: 3,
      settings: {
        // 桌面指挥舱主场景（v1.1.0）；五路由逐一采样（P1-P5 全链路体检）
        preset: "desktop",
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
