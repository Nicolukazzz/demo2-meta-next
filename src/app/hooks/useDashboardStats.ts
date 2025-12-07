"use client";

import { useEffect, useState } from "react";
import { DashboardStats } from "@/lib/dashboardStats";

export function useDashboardStats(clientId?: string) {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/dashboard?clientId=${encodeURIComponent(clientId)}`);
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.ok) throw new Error(body?.error ?? "No se pudieron cargar las métricas");
        if (active) setData(body.data as DashboardStats);
      } catch (err: any) {
        if (active) setError(err?.message ?? "Error cargando métricas");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [clientId]);

  return { data, loading, error };
}
