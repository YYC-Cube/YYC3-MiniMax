/**
 * file: data-integrity.test.ts
 * description: 数据层完整性单测 · 档案/流水线/Schema 一致性门禁
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [test],[unit],[data]
 *
 * brief: 单一事实源一致性校验（8 Agent/六阶段/12 字段/九步闭环）
 *
 * test-target: src/data 目录
 * notes: 使用 Vitest
 */

import { describe, expect, it } from 'vitest';
import { AGENTS, AGENT_LIST } from '../src/data/agents';
import { KPI_METRICS, PIPELINE_STAGES, STORYBOARD_12_FIELDS } from '../src/data/pipeline';
import { REACT_STEPS } from '../src/data/reactSteps';
import { INITIAL_LOGS } from '../src/data/logs';
import { OPS_NODES } from '../src/data/opsData';
import { AUDIT_STORYBOARDS, PII_AUDIT_LOGS } from '../src/data/qualityData';

/** 数据层完整性门禁：单一事实源一致性校验（五标 · 规范化） */
describe('data layer integrity', () => {
  it('AGENT_LIST 含 8 位成员且档案字段完整', () => {
    expect(AGENT_LIST).toHaveLength(8);
    const ids = AGENT_LIST.map((a) => a.id);
    expect(new Set(ids).size).toBe(8);
    for (const agent of AGENT_LIST) {
      expect(agent.name).toBeTruthy();
      expect(agent.nick).toBeTruthy();
      expect(agent.title).toBeTruthy();
      expect(agent.model).toBeTruthy();
      expect(agent.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('时钟位角度唯一且为 45° 等分', () => {
    const angles = AGENT_LIST.map((a) => a.angleDeg);
    expect(new Set(angles).size).toBe(8);
    for (const angle of angles) {
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThan(360);
      expect(angle % 45).toBe(0);
    }
  });

  it('AGENTS 映射与 AGENT_LIST 档案一致', () => {
    expect(Object.keys(AGENTS)).toHaveLength(8);
    for (const agent of AGENT_LIST) {
      expect(AGENTS[agent.id]).toEqual(agent);
    }
  });

  it('流水线六阶段编号连续且 leadAgents 均为合法成员', () => {
    expect(PIPELINE_STAGES).toHaveLength(6);
    PIPELINE_STAGES.forEach((stage, index) => {
      expect(stage.stepNum).toBe(index + 1);
      expect(stage.progress).toBeGreaterThanOrEqual(0);
      expect(stage.progress).toBeLessThanOrEqual(100);
      expect(stage.leadAgents.length).toBeGreaterThan(0);
      for (const lead of stage.leadAgents) {
        expect(AGENTS[lead]).toBeDefined();
      }
    });
  });

  it('分镜 Schema 严格 12 字段且无重复', () => {
    expect(STORYBOARD_12_FIELDS).toHaveLength(12);
    const fields = STORYBOARD_12_FIELDS.map((f) => f.field);
    expect(new Set(fields).size).toBe(12);
    for (const f of STORYBOARD_12_FIELDS) {
      expect(f.example).toBeTruthy();
    }
  });

  it('ReAct-C 九步闭环定义完整', () => {
    expect(REACT_STEPS).toHaveLength(9);
    REACT_STEPS.forEach((step, index) => {
      expect(step.step).toBe(index + 1);
      expect(AGENTS[step.agentId]).toBeDefined();
      expect(['pending', 'running', 'completed', 'loopback']).toContain(step.status);
    });
  });

  it('KPI 指标含 7 日趋势与双硬门禁指标', () => {
    expect(KPI_METRICS.length).toBeGreaterThanOrEqual(5);
    const ids = KPI_METRICS.map((k) => k.id);
    expect(ids).toContain('consistency_score');
    expect(ids).toContain('syncnet_score');
    for (const kpi of KPI_METRICS) {
      expect(kpi.trend).toHaveLength(7);
    }
  });

  it('事件流初始日志的成员均合法', () => {
    expect(INITIAL_LOGS.length).toBeGreaterThan(0);
    for (const log of INITIAL_LOGS) {
      expect(AGENTS[log.agentId]).toBeDefined();
      expect(log.message).toBeTruthy();
    }
  });

  it('算力节点遥测值域合法', () => {
    expect(OPS_NODES.length).toBeGreaterThanOrEqual(4);
    for (const node of OPS_NODES) {
      expect(node.gpuUtil).toBeGreaterThanOrEqual(0);
      expect(node.gpuUtil).toBeLessThanOrEqual(100);
      expect(node.vramUsed).toBeLessThanOrEqual(node.vramTotal);
    }
  });

  it('质检队列一致性分数与 PII 审计记录合法', () => {
    expect(AUDIT_STORYBOARDS.length).toBeGreaterThanOrEqual(3);
    for (const sb of AUDIT_STORYBOARDS) {
      expect(sb.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(sb.consistencyScore).toBeLessThanOrEqual(100);
    }
    expect(PII_AUDIT_LOGS.length).toBeGreaterThanOrEqual(3);
  });
});
