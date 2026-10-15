/**
 * file: usePwaInstall.ts
 * description: PWA 安装能力 hook · beforeinstallprompt 捕获/触发/已安装态
 *
 * brief:
 * - Chromium：缓存 beforeinstallprompt 事件，暴露 canInstall + promptInstall
 * - iOS Safari / 已 standalone：canInstall=false（iOS 用「分享→添加到主屏幕」引导）
 * - 已安装（standalone）或安装完成后隐藏入口
 */

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'accepted') {
      setInstalled(true);
      return true;
    }
    return false;
  };

  return { canInstall: !installed && deferred !== null, installed, promptInstall };
}
