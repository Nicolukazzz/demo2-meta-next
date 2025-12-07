"use client";

import { useMemo } from "react";
import { useReservations, useServices } from "./dataHooks";
import { computeFinanceMetrics, FinanceMetrics } from "@/lib/metrics";

export function useFinanceMetrics(clientId?: string) {
  const { data: reservationsData, loading: loadingReservations, error: errorReservations } = useReservations(clientId, 30000);
  const { data: servicesData, loading: loadingServices, error: errorServices } = useServices(clientId, 60000);

  const metrics: FinanceMetrics | null = useMemo(() => {
    if (!reservationsData) return null;
    return computeFinanceMetrics(reservationsData as any, servicesData as any);
  }, [reservationsData, servicesData]);

  return {
    data: metrics,
    loading: loadingReservations || loadingServices,
    error: errorReservations || errorServices,
  };
}
