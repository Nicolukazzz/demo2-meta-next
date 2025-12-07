import { useEffect, useRef } from "react";

export interface UseAutoRefreshOptions {
  intervalMs?: number;
  enabled?: boolean;
  onTick: () => void | Promise<void>;
}

export function useAutoRefresh({ intervalMs = 60000, enabled = true, onTick }: UseAutoRefreshOptions) {
  const saved = useRef(onTick);
  saved.current = onTick;

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const tick = () => {
      if (document.hidden) return;
      const result = saved.current();
      if (result instanceof Promise) {
        result.catch(() => undefined);
      }
    };
    tick();
    const id = setInterval(() => {
      if (!active) return;
      tick();
    }, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [intervalMs, enabled]);
}
