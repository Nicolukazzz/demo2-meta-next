"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

async function fetchJson<T>(url: string) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.error ?? `Error al cargar ${url}`);
  }
  return (body?.data ?? body) as T;
}

function useAutoFetch<T>(url: string | null, intervalMs = 30000, enabled = true): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async () => {
    if (!url || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<T>(url);
      setData(result);
    } catch (err: any) {
      setError(err?.message ?? "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    load();
    if (!url || !enabled) return;
    if (intervalMs <= 0) return;
    timer.current && clearInterval(timer.current);
    timer.current = setInterval(() => {
      load();
    }, intervalMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [url, enabled, intervalMs, load]);

  return { data, loading, error, refetch: load };
}

export function useReservations(clientId?: string, intervalMs = 30000) {
  const url = clientId ? `/api/reservations?clientId=${encodeURIComponent(clientId)}` : null;
  return useAutoFetch<Array<any>>(url, intervalMs, Boolean(clientId));
}

export function useCustomers(clientId?: string, search?: string, intervalMs = 45000) {
  const query = search ? `&q=${encodeURIComponent(search)}` : "";
  const url = clientId ? `/api/customers?clientId=${encodeURIComponent(clientId)}${query}` : null;
  return useAutoFetch<Array<any>>(url, intervalMs, Boolean(clientId));
}

export function useServices(clientId?: string, intervalMs = 60000) {
  const url = clientId ? `/api/profile?clientId=${encodeURIComponent(clientId)}` : null;
  const state = useAutoFetch<any>(url, intervalMs, Boolean(clientId));
  return {
    ...state,
    data: state.data?.services
      ? (state.data.services as any[]).filter((s) => s?.active !== false).sort((a, b) => a.name.localeCompare(b.name))
      : [],
  };
}


