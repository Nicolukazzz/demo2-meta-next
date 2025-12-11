"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// Tipos genéricos para compatibilidad con el código existente
// (El código usa tipos de @/lib/businessProfile para Service)


// ============================================================================
// TIPOS
// ============================================================================

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

interface ReservationQueryOptions {
  startDate?: string;  // "YYYY-MM-DD"
  endDate?: string;    // "YYYY-MM-DD"
  status?: "Pendiente" | "Confirmada" | "Cancelada";
  staffId?: string;
}

// ============================================================================
// UTILS
// ============================================================================

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.error ?? `Error al cargar ${url}`);
  }
  return (body?.data ?? body) as T;
}

/**
 * Genera un rango de fechas por defecto (±30 días desde hoy)
 * para evitar cargar todo el historial.
 */
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const now = new Date();

  // 30 días atrás
  const start = new Date(now);
  start.setDate(now.getDate() - 30);

  // 30 días adelante
  const end = new Date(now);
  end.setDate(now.getDate() + 30);

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

// ============================================================================
// HOOK GENÉRICO CON AUTO-REFRESH
// ============================================================================

function useAutoFetch<T>(
  url: string | null,
  intervalMs = 30000,
  enabled = true
): FetchState<T> {
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

// ============================================================================
// HOOK: RESERVACIONES (OPTIMIZADO CON RANGOS)
// ============================================================================

/**
 * Hook para cargar reservaciones con soporte para rangos de fechas.
 * 
 * @param clientId - ID del negocio
 * @param intervalMs - Intervalo de auto-refresh en ms (default: 30000)
 * @param options - Opciones de filtro (startDate, endDate, status, staffId)
 * 
 * @example
 * // Cargar solo reservas de la semana actual
 * const { data } = useReservations(clientId, 30000, {
 *   startDate: "2024-12-09",
 *   endDate: "2024-12-15"
 * });
 * 
 * // Cargar con rango por defecto (±30 días)
 * const { data } = useReservations(clientId);
 */
export function useReservations(
  clientId?: string,
  intervalMs = 30000,
  options?: ReservationQueryOptions
): FetchState<any[]> {
  // Construir URL con parámetros de query
  let url: string | null = null;

  if (clientId) {
    const params = new URLSearchParams({ clientId });

    // Usar rango por defecto si no se especifica
    if (!options?.startDate && !options?.endDate) {
      const { startDate, endDate } = getDefaultDateRange();
      params.set("startDate", startDate);
      params.set("endDate", endDate);
    } else {
      if (options?.startDate) params.set("startDate", options.startDate);
      if (options?.endDate) params.set("endDate", options.endDate);
    }

    if (options?.status) params.set("status", options.status);
    if (options?.staffId) params.set("staffId", options.staffId);

    url = `/api/reservations?${params.toString()}`;
  }

  return useAutoFetch<any[]>(url, intervalMs, Boolean(clientId));
}

/**
 * Hook para cargar TODAS las reservaciones (sin rango).
 * ⚠️ Usar con precaución - puede ser lento con muchos datos.
 * Solo para casos específicos como reportes anuales.
 */
export function useAllReservations(
  clientId?: string,
  intervalMs = 60000
): FetchState<any[]> {
  const url = clientId
    ? `/api/reservations?clientId=${encodeURIComponent(clientId)}`
    : null;
  return useAutoFetch<any[]>(url, intervalMs, Boolean(clientId));
}

// ============================================================================
// HOOK: CLIENTES
// ============================================================================

export function useCustomers(
  clientId?: string,
  search?: string,
  intervalMs = 45000
): FetchState<any[]> {
  const query = search ? `&q=${encodeURIComponent(search)}` : "";
  const url = clientId
    ? `/api/customers?clientId=${encodeURIComponent(clientId)}${query}`
    : null;
  return useAutoFetch<any[]>(url, intervalMs, Boolean(clientId));
}

// ============================================================================
// HOOK: SERVICIOS
// ============================================================================

export function useServices(
  clientId?: string,
  intervalMs = 60000
): FetchState<any[]> {
  const url = clientId
    ? `/api/profile?clientId=${encodeURIComponent(clientId)}`
    : null;
  const state = useAutoFetch<any>(url, intervalMs, Boolean(clientId));

  return {
    ...state,
    data: state.data?.services
      ? (state.data.services as any[])
        .filter((s) => s?.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name))
      : [],
  };
}
