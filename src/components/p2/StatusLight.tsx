/**
 * file: StatusLight.tsx
 * description: 阶段状态指示灯 · completed/running/blocked/ready 四态
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[p2],[visual]
 *
 * brief: StageTabs 与 StageCard 共用的状态灯组件
 *
 * dependencies: lucide-react, types
 * exports: StatusLight
 */

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { PipelineStage } from '../../types';

interface StatusLightProps {
  status: PipelineStage['status'];
}

export function StatusLight({ status }: StatusLightProps) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={13} className="text-[#00FF88]" />;
    case 'running':
      return <span className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_6px_#00F0FF] animate-pulse" />;
    case 'blocked':
      return <AlertCircle size={13} className="text-[#FF006E] animate-bounce" />;
    default:
      return <span className="w-2 h-2 rounded-full bg-gray-500" />;
  }
}
