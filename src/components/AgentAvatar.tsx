/**
 * file: AgentAvatar.tsx
 * description: Agent 头像 · 徽记网格/光环/脉冲环/状态 LED
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[ui],[avatar]
 *
 * brief: 按成员档案渲染 SVG 头像，支持状态覆盖与点击回调
 *
 * dependencies: react, types, data/agents
 * exports: AgentAvatar
 */

import React from 'react';
import { AgentId } from '../types';
import { AGENTS } from '../data/agents';
import { 
  Crown, 
  ShieldCheck, 
  Scale, 
  Wand2, 
  ScrollText, 
  Cpu, 
  Eye, 
  Target 
} from 'lucide-react';

interface AgentAvatarProps {
  agentId: AgentId;
  size?: number; // 80 for P1, 32 for cards/tabs, 40 for chats
  showPulseRing?: boolean; // 20px white pulse breathing circle below avatar
  showLed?: boolean; // 8x8 LED speaking / status light
  overrideStatus?: 'online' | 'speaking' | 'idle' | 'offline';
  className?: string;
  onClick?: () => void;
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agentId,
  size = 80,
  showPulseRing = false,
  showLed = false,
  overrideStatus,
  className = '',
  onClick,
}) => {
  const agent = AGENTS[agentId] || AGENTS.tianshu;
  const status = overrideStatus || agent.status;

  // Icon symbol based on agent persona
  const renderAgentSymbol = () => {
    const iconSize = Math.max(14, Math.round(size * 0.44));
    switch (agentId) {
      case 'tianshu':
        return <Crown size={iconSize} className="text-white drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" />;
      case 'shouhu':
        return <ShieldCheck size={iconSize} className="text-white drop-shadow-[0_0_8px_rgba(0,255,136,0.8)]" />;
      case 'zongshi':
        return <Scale size={iconSize} className="text-white drop-shadow-[0_0_8px_rgba(192,192,192,0.8)]" />;
      case 'lingyun':
        return <Wand2 size={iconSize} className="text-white drop-shadow-[0_0_8px_rgba(191,0,255,0.8)]" />;
      case 'qianxing':
        return <ScrollText size={iconSize} className="text-white drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />;
      case 'wanwu':
        return <Cpu size={iconSize} className="text-white drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]" />;
      case 'xianzhi':
        return <Eye size={iconSize} className="text-white drop-shadow-[0_0_8px_rgba(0,191,255,0.8)]" />;
      case 'bole':
        return <Target size={iconSize} className="text-white drop-shadow-[0_0_8px_rgba(255,0,110,0.8)]" />;
      default:
        return <Crown size={iconSize} className="text-white" />;
    }
  };

  // Status LED color
  const getLedColor = () => {
    if (status === 'speaking') return '#FF006E'; // 粉色发言中
    if (status === 'online') return '#00FF88'; // 在线绿
    if (status === 'idle') return '#00F0FF'; // 待命蓝
    return '#666666'; // 离线灰
  };

  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {/* 20px White pulse breathing circle underneath avatar (when enabled) */}
      {showPulseRing && (
        <div 
          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-2 rounded-full pointer-events-none animate-pulse-breath"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)',
            boxShadow: '0 0 10px rgba(255,255,255,0.6)',
          }}
        />
      )}

      {/* Outer Halo matching agent's unique token color */}
      <div 
        className="absolute inset-0 rounded-full transition-all duration-300 pointer-events-none"
        style={{
          boxShadow: status === 'speaking' 
            ? `0 0 16px ${agent.color}, inset 0 0 8px ${agent.color}`
            : `0 0 10px ${agent.color}88, inset 0 0 4px ${agent.color}44`,
          border: `1.5px solid ${agent.color}`,
        }}
      />

      {/* Inner Avatar Graphic */}
      <div 
        className="w-full h-full rounded-full flex items-center justify-center overflow-hidden transition-transform duration-200"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${agent.color}33 0%, rgba(10,12,20,0.95) 75%)`,
        }}
      >
        {/* Subtle cyber grid pattern in avatar */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`pat-${agentId}-${size}`} width="6" height="6" patternUnits="userSpaceOnUse">
                <path d="M 6 0 L 0 0 0 6" fill="none" stroke={agent.color} strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#pat-${agentId}-${size})`} />
          </svg>
        </div>

        {/* Center Agent Icon */}
        <div className="relative z-10 flex items-center justify-center">
          {renderAgentSymbol()}
        </div>
      </div>

      {/* 8x8 LED Speaking/Status Light on outer ring */}
      {showLed && (
        <div 
          className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full z-20 border border-black/80 transition-all duration-300"
          style={{
            backgroundColor: getLedColor(),
            boxShadow: `0 0 8px ${getLedColor()}`,
            animation: status === 'speaking' ? 'pulse-breath 0.6s infinite' : 'none',
          }}
          title={`状态: ${status === 'speaking' ? '发言中' : status === 'online' ? '在线' : '离线'}`}
        />
      )}
    </div>
  );
};
