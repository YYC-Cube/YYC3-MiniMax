/**
 * file: agentReply.test.ts
 * description: W1 语义路由单测 · 四类意图解析/引用卡契约/优先级
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [test],[unit],[nlu]
 *
 * test-target: src/services/agentReply.ts
 */

import { describe, expect, it } from "vitest"
import { resolveAgentReply } from "../src/services/agentReply"

describe("resolveAgentReply 语义路由", () => {
  const opts = { activeAgentName: "元启·天枢" }

  it("质检/门禁关键词 → quality 意图 + 审计引用卡（targetId=image）", () => {
    for (const text of ["查看质检", "门禁状态如何", "质检报告"]) {
      const reply = resolveAgentReply(text, opts)
      expect(reply.intent).toBe("quality")
      expect(reply.text).toContain("格物·宗师")
      expect(reply.text).toContain("91.4%")
      expect(reply.referenceCard).toEqual({
        type: "audit",
        targetId: "image",
        title: "质检门禁实时看板",
        desc: "点击直达 P2 图像生成一致性门禁卡片",
      })
    }
  })

  it("下一集/生产/继续 → production 意图 + 任务引用卡（targetId=novel）", () => {
    for (const text of ["继续生产", "开始下一集", "继续", "生产进度"]) {
      const reply = resolveAgentReply(text, opts)
      expect(reply.intent).toBe("production")
      expect(reply.text).toContain("元启·天枢")
      expect(reply.referenceCard?.targetId).toBe("novel")
      expect(reply.referenceCard?.type).toBe("task")
    }
  })

  it("成本 → cost 意图 + 无引用卡", () => {
    const reply = resolveAgentReply("成本报告", opts)
    expect(reply.intent).toBe("cost")
    expect(reply.text).toContain("预见·先知")
    expect(reply.text).toContain("¥1.42")
    expect(reply.referenceCard).toBeUndefined()
  })

  it("未命中关键词 → fallback 回显当前 Agent 名", () => {
    const reply = resolveAgentReply("今天天气怎么样", opts)
    expect(reply.intent).toBe("fallback")
    expect(reply.text).toContain("元启·天枢")
    expect(reply.text).toContain("今天天气怎么样")
    expect(reply.referenceCard).toBeUndefined()
  })

  it('意图优先级：质检优先于生产（"质检合格后继续生产"命中 quality）', () => {
    const reply = resolveAgentReply("质检合格后继续生产", opts)
    expect(reply.intent).toBe("quality")
  })

  it("空串与纯空格按兜底处理", () => {
    expect(resolveAgentReply("", opts).intent).toBe("fallback")
    expect(resolveAgentReply("  ", opts).intent).toBe("fallback")
  })
})
