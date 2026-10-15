/**
 * file: PwaInstallButton.tsx
 * description: PWA 安装按钮 · beforeinstallprompt 可用时出现（桌面/移动通用）
 */

import { Download } from 'lucide-react';
import React from 'react';
import { usePwaInstall } from '../hooks/usePwaInstall';

interface PwaInstallButtonProps {
  variant?: 'header' | 'mobile';
}

export const PwaInstallButton: React.FC<PwaInstallButtonProps> = ({ variant = 'header' }) => {
  const { canInstall, promptInstall } = usePwaInstall();
  if (!canInstall) return null;

  const isMobile = variant === 'mobile';

  return (
    <button
      onClick={() => void promptInstall()}
      title="安装到桌面/主屏幕（PWA 离线可用）"
      className={`flex items-center gap-1 rounded-md border border-[#00FF88]/40 bg-[#00FF88]/15 text-[#00FF88] font-bold hover:bg-[#00FF88]/25 transition-colors cursor-pointer ${
        isMobile ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'
      }`}
    >
      <Download size={isMobile ? 10 : 12} />
      <span>{isMobile ? '安装' : '安装应用'}</span>
    </button>
  );
};
