/**
 * file: useLocalStorage.ts
 * description: localStorage 持久化 Hook · JSON 序列化/配额容错/SSR 安全
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-10-11
 * updated: 2026-10-11
 * status: active
 * tags: [hook],[persistence],[offline]
 *
 * brief: 状态写穿 localStorage，刷新/断网后可恢复；存储故障静默降级为内存态
 *
 * details:
 * - 懒初始化：首渲染读一次，异常（禁用/配额/坏 JSON）回退 initialValue
 * - setValue 支持 updater 函数，与 useState 语义一致
 * - 写失败（隐私模式配额耗尽）不阻断业务，仅放弃持久化
 *
 * dependencies: react
 * exports: useLocalStorage
 */

import { useCallback, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      // 坏 JSON / 存储禁用：回退初始值
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // 配额耗尽/隐私模式：放弃持久化，内存态继续工作
        }
        return next;
      });
    },
    [key],
  );

  return [stored, setValue] as const;
}
