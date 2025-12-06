import { useCallback, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "success" | "error";

export function useSaveStatus(autoResetMs = 2500) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const start = useCallback(() => {
    clearTimer();
    setStatus("saving");
  }, []);

  const success = useCallback(() => {
    clearTimer();
    setStatus("success");
    timeoutRef.current = setTimeout(() => setStatus("idle"), autoResetMs);
  }, [autoResetMs]);

  const error = useCallback(() => {
    clearTimer();
    setStatus("error");
    timeoutRef.current = setTimeout(() => setStatus("idle"), autoResetMs);
  }, [autoResetMs]);

  const reset = useCallback(() => {
    clearTimer();
    setStatus("idle");
  }, []);

  return {
    status,
    isSaving: status === "saving",
    isSuccess: status === "success",
    isError: status === "error",
    start,
    success,
    error,
    reset,
  };
}

