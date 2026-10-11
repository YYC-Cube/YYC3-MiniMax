/**
 * file: App.tsx
 * description: 应用根组件 · 五大视图路由/移动端分支/跨页交互与 W1 编排
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [app],[router],[orchestration]
 *
 * brief: 指挥舱视图编排与全局交互闭环中枢
 *
 * details:
 * - P1-P5 视图切换（scaleMode 1980×1020 等比缩放）
 * - <768px 自动切换 MobileFallback 移动视图
 * - W1 浮窗跨页指令路由与引用卡跳转
 *
 * dependencies: react, lucide-react, components/*, views/*, hooks/useMediaQuery
 * exports: App（default）
 */

import { useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { UniversalWidget } from './components/UniversalWidget';
import { useMediaQuery } from './hooks/useMediaQuery';
import { AgentId, PipelineStageId } from './types';
import { MobileFallback } from './views/MobileFallback';
import { P1FamilyCenter } from './views/P1FamilyCenter';
import { P2ProductionDesk } from './views/P2ProductionDesk';
import { P3ReActWorkflow } from './views/P3ReActWorkflow';
import { P4OpsMonitoring } from './views/P4OpsMonitoring';
import { P5QualitySecurity } from './views/P5QualitySecurity';

export default function App() {
  const [currentView, setCurrentView] = useState<'P1' | 'P2' | 'P3' | 'P4' | 'P5'>('P1');
  const [activeAgentId, setActiveAgentId] = useState<AgentId>('tianshu');
  const [isWidgetOpen, setIsWidgetOpen] = useState<boolean>(false);
  const [highlightedStageId, setHighlightedStageId] = useState<PipelineStageId | null>(null);
  // W1 外部指令对象化（诊断 #13）：{ id, text } 自增序号保证同一文本二次发送仍触发 effect
  const [externalCommand, setExternalCommand] = useState<{ id: number; text: string } | null>(null);
  const commandSeqRef = useRef(0);
  const [scaleMode, setScaleMode] = useState<'fit' | '1080p'>('fit');
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  // 移动端降级：< 768px 自动切换精简视图，交互闭环（W1 浮窗）保持可用
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Compute scale factor if 1080p fixed mode is selected
  useEffect(() => {
    const handleResize = () => {
      if (scaleMode === '1080p') {
        const scaleX = window.innerWidth / 1980;
        const scaleY = window.innerHeight / 1020;
        setScaleFactor(Math.min(scaleX, scaleY));
      } else {
        setScaleFactor(1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scaleMode]);

  // Prototype Interaction: Clicking member on P1 opens W1 widget switched to that Agent
  const handleSelectAgentFromP1 = (agentId: AgentId) => {
    setActiveAgentId(agentId);
    setIsWidgetOpen(true);
  };

  // Prototype Interaction: Send command from P2 log stream to W1
  const handleSendToWidget = (cmd: string) => {
    commandSeqRef.current += 1;
    setExternalCommand({ id: commandSeqRef.current, text: cmd });
    setIsWidgetOpen(true);
  };

  // Prototype Interaction: Reference card in W1 jumps to P2 stage card
  const handleNavigateToTask = (stageId: string) => {
    setCurrentView('P2');
    setHighlightedStageId(stageId as PipelineStageId);
  };

  // Mobile fallback layout: stacked mobile view + permanent W1 widget
  if (isMobile) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-[#0A0A0A] relative">
        <div className="noise-overlay" />
        <div className="relative z-10 w-full h-full">
          <ErrorBoundary key="mobile" label="移动视图">
            <MobileFallback onSelectAgent={handleSelectAgentFromP1} />
          </ErrorBoundary>
        </div>
        <UniversalWidget
          activeAgentId={activeAgentId}
          onSelectAgent={setActiveAgentId}
          isOpen={isWidgetOpen}
          onToggleOpen={() => setIsWidgetOpen(!isWidgetOpen)}
          onNavigateToTask={handleNavigateToTask}
          externalCommand={externalCommand}
          onClearExternalCommand={() => setExternalCommand(null)}
        />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0A0A0A] command-bg relative flex flex-col justify-between">
      {/* 5% Noise Texture Overlay */}
      <div className="noise-overlay" />

      {/* Main Container with optional 1980x1020 fixed scale */}
      <div
        className={`w-full h-full flex flex-col justify-between relative z-10 ${scaleMode === '1080p' ? 'origin-top-left' : ''
          }`}
        style={
          scaleMode === '1080p'
            ? {
              width: 1980,
              height: 1020,
              transform: `scale(${scaleFactor})`,
            }
            : undefined
        }
      >
        {/* Top Header: 56px */}
        <Header
          currentView={currentView}
          onViewChange={setCurrentView}
          scaleMode={scaleMode}
          onToggleScaleMode={() => setScaleMode((m) => (m === 'fit' ? '1080p' : 'fit'))}
        />

        {/* Main Display Stage: P1 - P5 Views (视图级错误边界：单视图故障不扩散全站) */}
        <main className="flex-1 w-full h-[calc(100%-92px)] relative overflow-hidden">
          <ErrorBoundary key={currentView} label={`${currentView} 视图`}>
            <div className="w-full h-full animate-[fadeIn_0.24s_ease-out]">
              {currentView === 'P1' && (
                <P1FamilyCenter
                  onSelectAgent={handleSelectAgentFromP1}
                  onNavigate={setCurrentView}
                />
              )}

              {currentView === 'P2' && (
                <P2ProductionDesk
                  onSelectAgent={(id) => {
                    setActiveAgentId(id);
                    setIsWidgetOpen(true);
                  }}
                  onSendToWidget={handleSendToWidget}
                  onNavigateToP5={() => setCurrentView('P5')}
                  highlightedStageId={highlightedStageId}
                />
              )}

              {currentView === 'P3' && (
                <P3ReActWorkflow
                  onSelectAgent={(id) => {
                    setActiveAgentId(id);
                    setIsWidgetOpen(true);
                  }}
                  onNavigate={setCurrentView}
                />
              )}

              {currentView === 'P4' && (
                <P4OpsMonitoring
                  onNavigateToP5={() => setCurrentView('P5')}
                  onNavigateToP2={() => setCurrentView('P2')}
                  onNavigateToP3={() => setCurrentView('P3')}
                />
              )}

              {currentView === 'P5' && (
                <P5QualitySecurity
                  onNavigateToP2={() => setCurrentView('P2')}
                  onNavigateToP3={() => setCurrentView('P3')}
                />
              )}
            </div>
          </ErrorBoundary>
        </main>

        {/* Bottom Status Bar: 36px */}
        <Footer
          currentView={currentView}
          onNavigate={setCurrentView}
        />
      </div>

      {/* W1 Universal Agent Floating Widget (Permanent across all pages) */}
      <UniversalWidget
        activeAgentId={activeAgentId}
        onSelectAgent={setActiveAgentId}
        isOpen={isWidgetOpen}
        onToggleOpen={() => setIsWidgetOpen(!isWidgetOpen)}
        onNavigateToTask={handleNavigateToTask}
        externalCommand={externalCommand}
        onClearExternalCommand={() => setExternalCommand(null)}
      />
    </div>
  );
}
