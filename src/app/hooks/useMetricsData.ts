import { useMemo } from "react";
import { useReservations, useServices } from "./dataHooks";
import {
  getReservationCounts,
  getServiceUsageMetrics,
  getStaffPerformanceMetrics,
  getReservationsByDay,
  getReservationsByWeekday,
} from "@/lib/metrics/dashboardMetrics";

import { StaffMember } from "@/lib/businessProfile";

export function useMetricsData(clientId?: string, staff: StaffMember[] = []) {
  const { data: reservations, loading: loadingRes, error: errorRes } = useReservations(clientId, 30000);
  const { data: services, loading: loadingSvc, error: errorSvc } = useServices(clientId, 60000);

  const summary = useMemo(() => getReservationCounts(reservations ?? []), [reservations]);
  const servicesUsage = useMemo(
    () => getServiceUsageMetrics(reservations ?? [], services ?? []),
    [reservations, services],
  );
  const staffPerformance = useMemo(
    () => getStaffPerformanceMetrics(reservations ?? [], staff ?? [], services ?? []),
    [reservations, services, staff],
  );
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - 30);
  const reservationsByDay = useMemo(
    () => getReservationsByDay(reservations ?? [], { from, to: today }),
    [reservations, today],
  );
  const reservationsWeekday = useMemo(() => getReservationsByWeekday(reservations ?? []), [reservations]);

  return {
    loading: loadingRes || loadingSvc,
    error: errorRes || errorSvc,
    summary,
    servicesUsage,
    staffPerformance,
    reservationsByDay,
    reservationsWeekday,
  };
}
