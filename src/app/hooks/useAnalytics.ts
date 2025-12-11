/**
 * Hook de Analytics - Usa agregaciones de MongoDB
 * 
 * Este hook reemplaza el cálculo en frontend de métricas financieras.
 * Los datos vienen pre-calculados del servidor.
 * 
 * @module hooks/useAnalytics
 */

"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { BalanceSummary, ServiceMetrics, StaffMetrics } from "@/types/models";

// ============================================================================
// TIPOS
// ============================================================================

interface DailyMetric {
    date: string;
    totalReservations: number;
    confirmedCount: number;
    revenue: number;
}

interface UseAnalyticsOptions {
    clientId?: string;
    autoRefreshMs?: number;
    enabled?: boolean;
}

interface UseAnalyticsReturn<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

// ============================================================================
// HOOK GENÉRICO
// ============================================================================

function useAnalyticsQuery<T>(
    type: "balance" | "services" | "daily" | "staff",
    options: UseAnalyticsOptions & {
        startDate?: string;
        endDate?: string;
    }
): UseAnalyticsReturn<T> {
    const { clientId, autoRefreshMs = 60000, enabled = true, startDate, endDate } = options;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchData = useCallback(async () => {
        if (!clientId || !enabled) return;

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({ clientId, type });
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);

            const res = await fetch(`/api/analytics?${params.toString()}`);
            const body = await res.json();

            if (!res.ok || !body.ok) {
                throw new Error(body?.error || "Error cargando analytics");
            }

            setData(body.data as T);
        } catch (err: any) {
            setError(err?.message || "Error desconocido");
        } finally {
            setLoading(false);
        }
    }, [clientId, type, enabled, startDate, endDate]);

    // Fetch inicial y auto-refresh
    useEffect(() => {
        fetchData();

        if (!clientId || !enabled || autoRefreshMs <= 0) return;

        timerRef.current = setInterval(fetchData, autoRefreshMs);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [fetchData, clientId, enabled, autoRefreshMs]);

    return {
        data,
        loading,
        error,
        refresh: fetchData,
    };
}

// ============================================================================
// HOOKS ESPECÍFICOS
// ============================================================================

/**
 * Hook para obtener el resumen de balance financiero.
 * Calculado en el servidor vía agregaciones MongoDB.
 * 
 * @example
 * const { data, loading } = useBalanceAnalytics({ clientId: "xxx" });
 * // data.totalRevenue, data.monthRevenue, etc.
 */
export function useBalanceAnalytics(options: UseAnalyticsOptions): UseAnalyticsReturn<BalanceSummary> {
    return useAnalyticsQuery<BalanceSummary>("balance", {
        ...options,
        // Balance siempre debe refrescar cada minuto
        autoRefreshMs: options.autoRefreshMs ?? 60000,
    });
}

/**
 * Hook para obtener métricas de servicios.
 * 
 * @example
 * const { data } = useServiceAnalytics({ clientId: "xxx", startDate: "2024-01-01" });
 */
export function useServiceAnalytics(
    options: UseAnalyticsOptions & { startDate?: string; endDate?: string }
): UseAnalyticsReturn<ServiceMetrics[]> {
    return useAnalyticsQuery<ServiceMetrics[]>("services", options);
}

/**
 * Hook para obtener métricas diarias (para gráficas).
 * 
 * @example
 * const { data } = useDailyAnalytics({ clientId: "xxx" });
 * // data = [{ date: "2024-12-01", revenue: 50000, ... }, ...]
 */
export function useDailyAnalytics(
    options: UseAnalyticsOptions & { startDate?: string; endDate?: string }
): UseAnalyticsReturn<DailyMetric[]> {
    return useAnalyticsQuery<DailyMetric[]>("daily", options);
}

/**
 * Hook para obtener métricas de staff.
 * 
 * @example
 * const { data } = useStaffAnalytics({ clientId: "xxx" });
 */
export function useStaffAnalytics(
    options: UseAnalyticsOptions & { startDate?: string; endDate?: string }
): UseAnalyticsReturn<StaffMetrics[]> {
    return useAnalyticsQuery<StaffMetrics[]>("staff", options);
}

// ============================================================================
// HOOK COMBINADO (Todo a la vez)
// ============================================================================

interface FullAnalytics {
    balance: BalanceSummary | null;
    services: ServiceMetrics[] | null;
    staff: StaffMetrics[] | null;
    daily: DailyMetric[] | null;
}

/**
 * Hook que carga todas las métricas necesarias para el dashboard de balance.
 * Hace múltiples llamadas en paralelo para optimizar el tiempo de carga.
 */
export function useFullAnalytics(options: UseAnalyticsOptions): {
    data: FullAnalytics;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
} {
    const { clientId, autoRefreshMs = 120000, enabled = true } = options;

    const [data, setData] = useState<FullAnalytics>({
        balance: null,
        services: null,
        staff: null,
        daily: null,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchAll = useCallback(async () => {
        if (!clientId || !enabled) return;

        setLoading(true);
        setError(null);

        try {
            // Hacer todas las llamadas en paralelo
            const [balanceRes, servicesRes, staffRes, dailyRes] = await Promise.all([
                fetch(`/api/analytics?clientId=${clientId}&type=balance`),
                fetch(`/api/analytics?clientId=${clientId}&type=services`),
                fetch(`/api/analytics?clientId=${clientId}&type=staff`),
                fetch(`/api/analytics?clientId=${clientId}&type=daily`),
            ]);

            const [balanceBody, servicesBody, staffBody, dailyBody] = await Promise.all([
                balanceRes.json(),
                servicesRes.json(),
                staffRes.json(),
                dailyRes.json(),
            ]);

            setData({
                balance: balanceBody.ok ? balanceBody.data : null,
                services: servicesBody.ok ? servicesBody.data : null,
                staff: staffBody.ok ? staffBody.data : null,
                daily: dailyBody.ok ? dailyBody.data : null,
            });
        } catch (err: any) {
            setError(err?.message || "Error cargando analytics");
        } finally {
            setLoading(false);
        }
    }, [clientId, enabled]);

    useEffect(() => {
        fetchAll();

        if (!clientId || !enabled || autoRefreshMs <= 0) return;

        timerRef.current = setInterval(fetchAll, autoRefreshMs);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [fetchAll, clientId, enabled, autoRefreshMs]);

    return {
        data,
        loading,
        error,
        refresh: fetchAll,
    };
}
