/**
 * file: useWidgetChat.ts
 * description: W1 浮窗会话状态 Hook · 持久化/环形截断/语义路由回复/外部指令/未读
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-16
 * updated: 2026-10-16
 * status: active
 * tags: [hook],[widget],[chat]
 *
 * brief: 会话消息、输入态、思考态、未读与合并模式的状态与副作用编排（与渲染解耦）
 *
 * dependencies: react, data/agents, services/agentReply, hooks/useLocalStorage, types
 * exports: useWidgetChat
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AGENTS } from '../data/agents';
import { resolveAgentReply } from '../services/agentReply';
import type { AgentId, ChatMessage } from '../types';
import { useLocalStorage } from './useLocalStorage';

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

/** 构造用户消息（模块域：Date.now/new Date 为非纯调用，禁止出现在组件渲染域内） */
function createUserMessage(text: string): ChatMessage {
  return {
    id: `usr-${Date.now()}`,
    sender: 'user',
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    text,
  };
}

interface UseWidgetChatParams {
  activeAgentId: AgentId;
  isOpen: boolean;
  /** 外部指令对象（诊断 #13）：自增 id 保证同一文本重复发送也可触发 */
  externalCommand?: { id: number; text: string } | null;
  onClearExternalCommand?: () => void;
  onToggleOpen: () => void;
}

export function useWidgetChat({
  activeAgentId,
  isOpen,
  externalCommand,
  onClearExternalCommand,
  onToggleOpen,
}: UseWidgetChatParams) {
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

    appendMessage(createUserMessage(text));
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

  // 保持 latest-ref 指向最新闭包（inputText/selectedAgent/isMergedMode 等状态）。
  // ref 写入放 effect（Compiler 规则禁 render 期写 ref）；本 effect 声明在外部指令 effect
  // 之前，同一 commit 内先赋值后消费——挂载即派发的外部指令也能拿到新鲜闭包
  useEffect(() => {
    handleSendRef.current = handleSend;
  });

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
    }
  }, [messages, isOpen]);

  // 开箱即清未读（事件语义：随开箱动作清零，取代原 effect 内同步 setState——Compiler 规则合规）
  const handleToggleOpen = () => {
    if (!isOpen) setUnreadCount(0);
    onToggleOpen();
  };

  const handleChipClick = (chipText: string) => {
    handleSend(chipText);
  };

  return {
    messages,
    inputText,
    setInputText,
    isThinking,
    unreadCount,
    isMergedMode,
    setIsMergedMode,
    messagesEndRef,
    selectedAgent,
    handleSend,
    handleToggleOpen,
    handleChipClick,
  };
}
