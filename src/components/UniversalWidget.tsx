/**
 * file: UniversalWidget.tsx
 * description: W1 全局 AI 浮窗 · 8 Agent 秒切/语义路由/引用卡跳转（响应式）
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [component],[widget],[ai]
 *
 * brief: 跨视图常驻对话浮窗，支持外部指令注入与阶段引用跳转
 *
 * dependencies: react, lucide-react, types, data/agents
 * exports: UniversalWidget
 */

import {
  ArrowUpRight,
  Layers,
  Minimize2,
  Paperclip,
  Send,
  Sparkles,
  X
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AGENTS, AGENT_LIST } from '../data/agents';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { resolveAgentReply } from '../services/agentReply';
import { AgentId, ChatMessage } from '../types';
import { AgentAvatar } from './AgentAvatar';
import { BrandMark } from './BrandMark';

interface UniversalWidgetProps {
  activeAgentId: AgentId;
  onSelectAgent: (id: AgentId) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onNavigateToTask?: (stageId: string) => void;
  /** 外部指令对象（诊断 #13）：自增 id 保证同一文本重复发送也可触发 */
  externalCommand?: { id: number; text: string } | null;
  onClearExternalCommand?: () => void;
}

/** 会话持久化键与容量上限（诊断 #15：刷新/断网恢复聊天记录） */
const W1_MESSAGES_STORAGE_KEY = 'yyc3.w1.messages';
const W1_MESSAGES_MAX = 50;

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'agent',
    agentId: 'tianshu',
    timestamp: '14:20:00',
    text: '指挥官您好，我是 **元启·天枢**。当前 YYC³ 漫剧工业化生产台各系统运行平稳，今日已完成 28 集成片交付。ReAct-C 九步流水线当前正执行第 3 集镜头扩散与音视频合成，请下达生产决策。',
    referenceCard: {
      type: 'task',
      targetId: 'image',
      title: '任务 #TASK-STORY-108',
      desc: '《暗夜决弈》EP03 脸部一致性审查中 (当前 92.4%)',
    },
  },
  {
    id: 'msg-2',
    sender: 'agent',
    agentId: 'lingyun',
    timestamp: '14:24:12',
    text: '我是 **创想·灵韵**，第3集雨夜天台对峙分镜已输出完成！采用 12 字段严谨 Schema 规范，正向提示词已注入电影级暗调蓝紫冷光质感。',
    referenceCard: {
      type: 'stage',
      targetId: 'storyboard',
      title: '分镜资产已锁定',
      desc: '包含 12 字段标准 Schema 与 LoRA 权重',
    },
  },
];

export const UniversalWidget: React.FC<UniversalWidgetProps> = ({
  activeAgentId,
  onSelectAgent,
  isOpen,
  onToggleOpen,
  onNavigateToTask,
  externalCommand,
  onClearExternalCommand,
}) => {
  // 会话持久化：localStorage 写穿 + 50 条环形截断（诊断 #15）
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>(W1_MESSAGES_STORAGE_KEY, INITIAL_MESSAGES);

  const appendMessage = useCallback(
    (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-(W1_MESSAGES_MAX - 1)), msg]);
    },
    [setMessages],
  );

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const [isMergedMode, setIsMergedMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedAgent = AGENTS[activeAgentId] || AGENTS.tianshu;

  const handleSendRef = useRef<(text?: string) => void>(() => undefined);

  // Handle external command from P2 log stream or other pages
  // latest-ref 模式：effect 只依赖 externalCommand（对象身份每次派发必变），无闭包陷阱
  useEffect(() => {
    if (externalCommand) {
      handleSendRef.current(externalCommand.text);
      if (onClearExternalCommand) {
        onClearExternalCommand();
      }
    }
  }, [externalCommand, onClearExternalCommand]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // 卸载清理：思考中回复定时器（防止卸载后 setState/泄漏）
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      text,
    };

    appendMessage(userMsg);
    if (!textToSend) setInputText('');
    setIsThinking(true);

    // Simulate Agent ReAct-C response（语义路由已抽至 services/agentReply）
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    replyTimerRef.current = setTimeout(() => {
      const reply = resolveAgentReply(text, { activeAgentName: selectedAgent.name });

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        agentId: isMergedMode ? 'tianshu' : activeAgentId,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        text: reply.text,
        referenceCard: reply.referenceCard,
      };

      appendMessage(agentMsg);
      setIsThinking(false);
      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }
    }, 700);
  };

  // 保持 latest-ref 指向最新闭包（inputText/selectedAgent/isMergedMode 等状态）
  handleSendRef.current = handleSend;

  const handleChipClick = (chipText: string) => {
    handleSend(chipText);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      {/* Collapsed State: 56x56 Pulsing Sphere */}
      {!isOpen && (
        <div
          onClick={onToggleOpen}
          className="relative w-14 h-14 rounded-full cursor-pointer group flex items-center justify-center transition-transform hover:scale-105 active:scale-95 animate-bounce-subtle"
          title="展开 Universal Agent AI 浮窗"
        >
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-full bg-[#00F0FF]/30 animate-ping opacity-50" />

          {/* Main sphere body */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00F0FF] via-[#BF00FF] to-[#0A0A0A] p-[2px] shadow-[0_0_20px_rgba(0,240,255,0.6)]">
            <div className="w-full h-full rounded-full bg-[#0A0A0A] flex items-center justify-center relative overflow-hidden">
              <BrandMark size={34} quiet />
              <div className="absolute inset-0 bg-radial from-transparent via-[#00F0FF]/10 to-transparent" />
            </div>
          </div>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FF006E] border-2 border-[#0A0A0A] text-[10px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_#FF006E]">
              {unreadCount}
            </div>
          )}
        </div>
      )}

      {/* Expanded State: 400x600 Glass Panel */}
      {isOpen && (
        <div
          className="w-[min(410px,calc(100vw-2rem))] h-[min(610px,calc(100dvh-8rem))] rounded-2xl glass-panel flex flex-col overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.8),0_0_24px_rgba(191,0,255,0.3)] border border-[#00F0FF]/40 transition-all duration-240"
          style={{
            animation: 'float-widget 3s ease-in-out infinite alternate',
          }}
        >
          {/* 1. Header with Title & Controls */}
          <div className="h-12 px-4 bg-[#0E1018]/95 border-b border-white/10 flex items-center justify-between cursor-move">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#00F0FF] to-[#BF00FF] p-[1px]">
                <div className="w-full h-full bg-[#0A0A0A] rounded-[5px] flex items-center justify-center p-[1px]">
                  <BrandMark size={20} quiet />
                </div>
              </div>
              <span className="font-mono-num font-bold text-xs text-white tracking-wide">
                UNIVERSAL AGENT WIDGET (W1)
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Merged mode toggle */}
              <button
                onClick={() => setIsMergedMode(!isMergedMode)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${isMergedMode
                  ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                  : 'text-[#9BA3B4] hover:text-white bg-white/5 border border-transparent'
                  }`}
                title="天枢总调度合并模式：汇总所有智能体意见"
              >
                <span className="flex items-center space-x-1">
                  <Layers size={10} />
                  <span>天枢总调度</span>
                </span>
              </button>

              {/* Minimize/Close button */}
              <button
                onClick={onToggleOpen}
                className="p-1 rounded text-[#9BA3B4] hover:text-white hover:bg-white/10 transition-colors"
                title="收起浮窗"
              >
                <Minimize2 size={13} />
              </button>
              <button
                onClick={onToggleOpen}
                className="p-1 rounded text-[#9BA3B4] hover:text-[#FF006E] hover:bg-white/10 transition-colors"
                title="关闭"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* 2. Top Agent Switcher: 8 Members Circle Avatars (32px) */}
          <div className="px-3 py-2 bg-[#0A0C14]/90 border-b border-white/10">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] text-[#9BA3B4] font-medium">
                8 拟人化 Agent 切换:
              </span>
              <span className="text-[10px] text-[#00F0FF] font-mono-num">
                {selectedAgent.nick} ({selectedAgent.clockPosition})
              </span>
            </div>
            <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 px-1">
              {AGENT_LIST.map((agent) => {
                const isSelected = activeAgentId === agent.id;
                return (
                  <div
                    key={agent.id}
                    onClick={() => onSelectAgent(agent.id)}
                    className="flex flex-col items-center group cursor-pointer"
                    title={`${agent.name} (${agent.title})`}
                  >
                    <div className={`relative transition-all duration-200 ${isSelected ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}>
                      <AgentAvatar
                        agentId={agent.id}
                        size={32}
                        showLed={true}
                        overrideStatus={isSelected ? 'speaking' : agent.status}
                      />
                    </div>
                    <span
                      className={`text-[9px] mt-1 transition-colors whitespace-nowrap ${isSelected ? 'text-[#00F0FF] font-bold' : 'text-[#9BA3B4]'
                        }`}
                    >
                      {agent.nick}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Chat Messages Stream Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#0A0A0A]/40">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const senderAgent = msg.agentId ? AGENTS[msg.agentId] : selectedAgent;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all`}
                  style={{ animation: 'fade-in-up 0.2s ease-out' }}
                >
                  <div className="flex items-center space-x-1.5 mb-1 px-1">
                    {!isUser && (
                      <span
                        className="text-[10px] font-bold font-mono-num"
                        style={{ color: senderAgent?.color || '#00F0FF' }}
                      >
                        {senderAgent?.name || 'Agent'}
                      </span>
                    )}
                    <span className="text-[9px] text-[#9BA3B4]/60 font-mono-num">
                      {msg.timestamp}
                    </span>
                  </div>

                  <div
                    className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed select-text ${isUser
                      ? 'bg-gradient-to-r from-[#00F0FF]/25 to-[#BF00FF]/30 text-white border border-[#00F0FF]/40 rounded-br-sm'
                      : 'bg-[#101320] text-[#E0E4EC] border border-white/10 rounded-bl-sm shadow-md'
                      }`}
                    style={{
                      borderLeft: !isUser ? `3px solid ${senderAgent?.color || '#00F0FF'}` : undefined,
                    }}
                  >
                    {/* Render message with bold parsing */}
                    <div className="whitespace-pre-wrap">
                      {msg.text.split('**').map((chunk, i) =>
                        i % 2 === 1 ? (
                          <strong key={i} className="text-white font-semibold">
                            {chunk}
                          </strong>
                        ) : (
                          <span key={i}>{chunk}</span>
                        )
                      )}
                    </div>

                    {/* Reference Card Jump Link */}
                    {msg.referenceCard && (
                      <div
                        onClick={() => {
                          if (onNavigateToTask) {
                            onNavigateToTask(msg.referenceCard?.targetId || 'image');
                          }
                        }}
                        className="mt-2 p-2 rounded-lg bg-black/40 border border-[#00F0FF]/30 hover:border-[#00F0FF] transition-all cursor-pointer group flex items-center justify-between"
                      >
                        <div className="flex flex-col pr-2">
                          <div className="flex items-center space-x-1 text-[10px] text-[#00F0FF] font-bold">
                            <Sparkles size={10} />
                            <span>{msg.referenceCard.title}</span>
                          </div>
                          <span className="text-[10px] text-[#9BA3B4] truncate">
                            {msg.referenceCard.desc}
                          </span>
                        </div>
                        <ArrowUpRight size={13} className="text-[#00F0FF] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking indicator */}
            {isThinking && (
              <div className="flex items-center space-x-2 text-xs text-[#00F0FF] bg-[#101320] px-3 py-1.5 rounded-lg border border-[#00F0FF]/30 w-fit">
                <div className="w-2 h-2 rounded-full bg-[#00F0FF] animate-ping" />
                <span className="text-[11px] font-mono-num">{selectedAgent.name} 思考中...</span>
                <span className="animate-cursor">|</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 4. Quick Command Chips */}
          <div className="px-3 py-1.5 bg-[#0D0F1A] border-t border-white/10 flex items-center gap-1.5 overflow-x-auto">
            {[
              '继续生产',
              '查看质检',
              '下一阶段',
              '成本报告',
              '异常诊断',
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                className="px-2.5 py-1 rounded-full text-[10px] bg-white/5 hover:bg-[#00F0FF]/20 text-[#9BA3B4] hover:text-white border border-white/10 hover:border-[#00F0FF]/50 transition-all whitespace-nowrap cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* 5. Input Box & Action Buttons */}
          <div className="p-3 bg-[#0A0C14] border-t border-white/10">
            <div className="flex items-center space-x-2 bg-[#121524] rounded-xl px-3 py-2 border border-white/15 focus-within:border-[#00F0FF]/70 transition-colors">
              <button
                className="text-[#9BA3B4] hover:text-[#00F0FF] transition-colors p-0.5"
                title="上传剧本/参考图 (附件)"
                onClick={() => handleChipClick('上传剧本附件：EP04-SC01.docx')}
              >
                <Paperclip size={14} />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSend();
                  }
                }}
                placeholder={`@${selectedAgent.nick} 输入指令或提问...`}
                className="flex-1 bg-transparent text-xs text-white placeholder-[#9BA3B4]/60 focus:outline-none"
              />

              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim()}
                className={`p-1.5 rounded-lg transition-all ${inputText.trim()
                  ? 'bg-gradient-to-r from-[#00F0FF] to-[#BF00FF] text-white shadow-[0_0_10px_rgba(0,240,255,0.5)] cursor-pointer'
                  : 'text-[#9BA3B4]/40 cursor-not-allowed'
                  }`}
              >
                <Send size={13} />
              </button>
            </div>

            {/* Bottom subtitle attribution: 当前由 [Agent名] 响应 · ReAct-C 九步模式 */}
            <div className="mt-1.5 px-1 flex items-center justify-between text-[10px] text-[#9BA3B4]">
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedAgent.color }} />
                <span>当前由 <strong className="text-white">{selectedAgent.name}</strong> 响应</span>
              </span>
              <span className="text-[#00F0FF] font-mono-num">ReAct-C 九步模式</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
