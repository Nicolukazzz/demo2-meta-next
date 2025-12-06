import { useMemo } from "react";
import { useReservations, useServices, useCustomers } from "./dataHooks";
import { computeFinanceMetrics } from "@/lib/metrics";

export function useBalanceData(clientId?: string) {
  const { data: reservations, loading: loadingRes, error: errorRes } = useReservations(clientId, 30000);
  const { data: services, loading: loadingSvc, error: errorSvc } = useServices(clientId, 60000);
  const { data: customers, loading: loadingCus, error: errorCus } = useCustomers(clientId, undefined, 60000);

  const metrics = useMemo(() => {
    return computeFinanceMetrics(reservations ?? [], services ?? [], customers ?? []);
  }, [reservations, services, customers]);

  return {
    data: metrics,
    loading: loadingRes || loadingSvc || loadingCus,
    error: errorRes || errorSvc || errorCus,
  };
}

