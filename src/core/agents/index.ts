/**
 * file: index.ts（src/core/agents）
 * description: 8 Agent 行为核（PR2）· defineAgent 工厂 + 规格 + 注册表 + 步映射
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [core],[agents],[port],[orchestration]
 *
 * brief: 全部 Agent 实现 types/agent 的 AgentPort 六元组契约；模型访问经注入的
 *        ModelPort（local/vLLM/Registry/mock 适配器可替换），工具经 ToolRegistry 注入
 *
 * details:
 * - defineAgent(spec, model)：闭包绑定模型端口；run() 内完成 step 分发、
 *   模型/工具双路径、trace 组装（traceId/taskId/step/attempt/model/provider/
 *   latencyMs/tokens/riskTags）与错误码映射
 * - 模型抛错统一映射 MODEL_TIMEOUT（retryable）——细化分类（4xx 不可重试等）
 *   由 PR5 适配器在抛错前完成
 * - S7 格物·宗师输出 JSON score 供状态机门禁评估；解析失败降级为原文包裹
 *   （score 缺失 = 门禁不可评估，状态机按通过处理，由 PR7 遥测核对）
 * - STEP_AGENT_MAP 与 data/reactSteps.ts 的 agentId 由契约测试互锁
 * - 展示元数据（色彩/时钟位）仍在 data/agents.ts，行为核不复制 UI 属性
 *
 * dependencies: types/agent, types/ports（仅类型 + 注入端口）
 * exports: STEP_AGENT_MAP, createAgentRegistry, StepParse, AgentStepSpec, AgentSpec
 */

import type {
  AgentError,
  AgentErrorCode,
  AgentInvocation,
  AgentPort,
  AgentResult,
  AgentTrace,
  ReActStepId,
  RiskTag,
} from "../../types/agent"
import { AGENT_ERROR_CODES } from "../../types/agent"
import type { AgentId, PipelineStageId } from "../../types/index"
import type { ModelPort, ModelResponse } from "../../types/ports"

// ---------- 规格 ----------

/** 步级产物解析结果（S7 的 score 为门禁评估输入） */
export interface StepParse {
  payload: Record<string, unknown>
  score?: number
}

/** 步级规格：system 提示词 + 可选工具名 + 可选产物解析器 */
export interface AgentStepSpec {
  system: string
  /** 工具名（存在则走工具路径，不经模型） */
  tool?: string
  /** 从模型文本解析产物与门禁分；缺省将原文包裹为 { text } */
  parse?: (text: string) => StepParse
}

/** Agent 规格：身份 + 主责阶段 + 模型 + 风险策略 + 可执行步 */
export interface AgentSpec {
  id: AgentId
  primaryStages: ReadonlyArray<PipelineStageId>
  model: string
  riskPolicy: ReadonlyArray<RiskTag>
  steps: Partial<Record<ReActStepId, AgentStepSpec>>
}

/** 九步 → 主责 Agent 映射（运行时按步取 Agent；与 data/reactSteps.ts 互锁） */
export const STEP_AGENT_MAP: Readonly<Record<ReActStepId, AgentId>> = {
  1: "shouhu",
  2: "qianxing",
  3: "qianxing",
  4: "wanwu",
  5: "lingyun",
  6: "tianshu",
  7: "zongshi",
  8: "shouhu",
  9: "bole",
}

// ---------- 工厂 ----------

/**
 * 定义一个 Agent（闭包绑定模型端口）
 * - 工具步：tools.get(tool) 缺失 → TOOL_ERROR 不可重试；工具 ok:false → 透传其错误或默认可重试
 * - 模型步：complete 抛错 → MODEL_TIMEOUT 可重试；正常返回经 parse 组装 output
 * - 无论成败，trace 必带（六元组铁律）
 */
function defineAgent(spec: AgentSpec, model: ModelPort): AgentPort {
  return {
    id: spec.id,
    primaryStages: spec.primaryStages,
    async run(invocation: AgentInvocation): Promise<AgentResult> {
      const { input, context, tools } = invocation
      const startedAt = new Date().toISOString()
      const startedTs = Date.now()
      const trace = (tokensIn: number, tokensOut: number): AgentTrace => ({
        traceId: input.traceId,
        taskId: input.taskId,
        agentId: spec.id,
        step: input.step,
        attempt: input.attempt,
        model: spec.model,
        provider: model.provider,
        latencyMs: Date.now() - startedTs,
        tokensIn,
        tokensOut,
        riskTags: [...spec.riskPolicy],
        startedAt,
        endedAt: new Date().toISOString(),
      })

      const stepSpec = spec.steps[input.step]
      if (!stepSpec) {
        return {
          trace: trace(0, 0),
          error: {
            code: "TOOL_ERROR",
            message: `Agent ${spec.id} 未注册步骤 ${input.step}`,
            retryable: false,
          },
        }
      }

      // 工具路径（如 S3 Milvus RAG 检索）
      if (stepSpec.tool) {
        const tool = tools.get(stepSpec.tool)
        if (!tool) {
          return {
            trace: trace(0, 0),
            error: {
              code: "TOOL_ERROR",
              message: `工具未注册: ${stepSpec.tool}`,
              retryable: false,
            },
          }
        }
        const toolResult = await tool.call(input.payload)
        if (!toolResult.ok) {
          const fallback: AgentError = {
            code: "TOOL_ERROR",
            message: "工具执行失败",
            retryable: true,
          }
          return { trace: trace(0, 0), error: toolResult.error ?? fallback }
        }
        return {
          trace: trace(0, 0),
          output: {
            ok: true,
            payload: { tool: stepSpec.tool, data: toolResult.data },
            tokensIn: 0,
            tokensOut: 0,
          },
        }
      }

      // 模型路径
      let response: ModelResponse
      try {
        response = await model.complete({
          traceId: input.traceId,
          model: spec.model,
          system: stepSpec.system,
          messages: [{ role: "user", content: JSON.stringify(input.payload) }],
          maxTokens: context.budget.maxTokens,
        })
      } catch (error) {
        // 适配器结构化分类（PR5 ModelError 携带 code/retryable）优先；缺省回退 MODEL_TIMEOUT 可重试
        const candidate = error as { code?: unknown; retryable?: unknown }
        const code =
          typeof candidate.code === "string" &&
            (AGENT_ERROR_CODES as readonly string[]).includes(candidate.code)
            ? (candidate.code as AgentErrorCode)
            : "MODEL_TIMEOUT"
        const retryable = typeof candidate.retryable === "boolean" ? candidate.retryable : true
        return {
          trace: trace(0, 0),
          error: {
            code,
            message: error instanceof Error ? error.message : String(error),
            retryable,
          },
        }
      }
      const parsed = stepSpec.parse?.(response.text) ?? { payload: { text: response.text } }
      return {
        trace: trace(response.tokensIn, response.tokensOut),
        output: {
          ok: true,
          payload: parsed.payload,
          score: parsed.score,
          tokensIn: response.tokensIn,
          tokensOut: response.tokensOut,
        },
      }
    },
  }
}

/** 构建模型 JSON 门禁产物解析（S7）：有效 score 提取，否则原文降级 */
function parseVerify(text: string): StepParse {
  try {
    const parsed = JSON.parse(text) as { score?: unknown }
    if (typeof parsed.score === "number") {
      return { payload: parsed as Record<string, unknown>, score: parsed.score }
    }
    return { payload: parsed as Record<string, unknown> }
  } catch {
    return { payload: { text } }
  }
}

// ---------- 8 Agent 规格（模型/阶段/风险策略与档案单一事实源对齐） ----------

const SPECS: ReadonlyArray<AgentSpec> = [
  {
    id: "qianxing",
    primaryStages: ["novel"],
    model: "deepseek-v4-pro",
    riskPolicy: ["intent-spoof"],
    steps: {
      2: { system: "你是言启·千行，解析用户创意意图为生产工单，抽取镜头数、情感基调与目标风格槽位。" },
      3: {
        system: "RAG 知识注入经 Milvus 混合检索工具执行。",
        tool: "milvus.hybrid_search",
      },
    },
  },
  {
    id: "wanwu",
    primaryStages: ["storyboard", "video"],
    model: "claude-3.7-sonnet",
    riskPolicy: ["schema-drift"],
    steps: {
      4: { system: "你是语枢·万物，生成 12 字段标准化分镜骨架，并预评口型 SyncNet 难度。" },
    },
  },
  {
    id: "xianzhi",
    primaryStages: ["video", "ops"],
    model: "nemotron-4-340b",
    riskPolicy: ["syncnet", "budget"],
    steps: {},
  },
  {
    id: "bole",
    primaryStages: ["ops"],
    model: "deepseek-v4-recommender",
    riskPolicy: ["feedback-poison"],
    steps: {
      9: { system: "你是知遇·伯乐，将分镜节奏与受众反馈更新至画像特征库，输出画像增量。" },
    },
  },
  {
    id: "tianshu",
    primaryStages: ["novel"],
    model: "nemotron-super-120b",
    riskPolicy: ["budget"],
    steps: {
      6: { system: "你是元启·天枢，汇总多智能体产物，核验算力与预算约束，裁决是否进入渲染。" },
    },
  },
  {
    id: "shouhu",
    primaryStages: ["render"],
    model: "deepseek-v4-guard",
    riskPolicy: ["pii", "jailbreak", "politic"],
    steps: {
      1: { system: "你是智云·守护，执行输入安全过滤：识别越狱、敏感词、涉政涉暴与 PII 实体，输出过滤结论。" },
      8: { system: "你是智云·守护，执行输出审计脱敏：水印签名、PII 残留清洗与版权盲水印嵌入结论。" },
    },
  },
  {
    id: "zongshi",
    primaryStages: ["image"],
    model: "qwen-2.5-max-eval",
    riskPolicy: ["consistency"],
    steps: {
      7: {
        system: '你是格物·宗师，严格比对面部特征一致性，仅输出 JSON：{"score": <0-100 数字>}。',
        parse: parseVerify,
      },
    },
  },
  {
    id: "lingyun",
    primaryStages: ["storyboard", "image"],
    model: "flux-pro-cinema",
    riskPolicy: ["copyright"],
    steps: {
      5: { system: "你是创想·灵韵，丰富场景视效修饰词，重构光影色温与微表情动态描写。" },
    },
  },
]

/**
 * 构建 8 Agent 注册表（注入模型端口；适配器可替换为 local/vLLM/Registry）
 * 运行时按 STEP_AGENT_MAP[step] 取 Agent 执行
 */
export function createAgentRegistry(model: ModelPort): Record<AgentId, AgentPort> {
  const entries = SPECS.map((spec) => [spec.id, defineAgent(spec, model)] as const)
  return Object.fromEntries(entries) as Record<AgentId, AgentPort>
}
