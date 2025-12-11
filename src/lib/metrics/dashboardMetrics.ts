/**
 * Plan de métricas (qué calculamos y para qué sirve):
 * - Conteos generales de reservas: total, confirmadas, pendientes, canceladas.
 * - Reservas por rango (ej. últimos 7 días / últimos 30 días).
 * - Servicios:
 *    * Top servicios por cantidad de reservas.
 *    * Top servicios por ingresos (usando precio de servicio cuando existe).
 * - Staff:
 *    * Reservas por miembro de staff.
 *    * Ingresos por miembro de staff (si el servicio tiene precio).
 *    * Última y primera reserva para ver actividad reciente.
 * - Tiempo:
 *    * Serie temporal de reservas por día (para gráficas de evolución).
 *    * Reservas por día de la semana (para detectar días fuertes).
 * - Clientes:
 *    * Total clientes únicos (por nombre+tel).
 *    * Clientes nuevos este mes vs. recurrentes (más de una reserva).
 */

export type ReservationMetric = {
  _id?: string;
  dateId: string;
  time: string;
  status?: string;
  serviceId?: string;
  serviceName?: string;
  servicePrice?: number;
  confirmedPrice?: number; // Actual amount charged (may include extras/discounts)
  staffId?: string;
  staffName?: string;
  createdAt?: string;
  phone?: string;
  name?: string;
};

export type ServiceMetric = {
  id: string;
  name: string;
  price?: number;
  durationMinutes?: number;
  active?: boolean;
};

export type StaffMetric = {
  id: string;
  name: string;
  role?: string;
  active?: boolean;
};

export type ServiceUsage = { serviceId: string; name: string; count: number; revenue: number };
export type StaffPerformance = {
  staffId: string;
  name: string;
  role?: string;
  totalReservations: number;
  totalRevenue: number;
  firstReservationAt?: string;
  lastReservationAt?: string;
};
export type TimeSeriesPoint = { date: string; total: number };
export type WeekdayMetric = { weekday: number; label: string; total: number };

const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/**
 * Gets the effective price for a reservation.
 * Priority: confirmedPrice > servicePrice > service catalog price > 0
 * This ensures metrics use the actual amount charged, not just listed prices.
 */
export function getEffectivePrice(
  reservation: ReservationMetric,
  serviceMap?: Map<string, ServiceMetric>
): number {
  // 1. Use confirmed price if owner has verified the final amount
  if (reservation.confirmedPrice !== undefined && reservation.confirmedPrice !== null) {
    return reservation.confirmedPrice;
  }
  // 2. Use the reservation's service price
  if (reservation.servicePrice !== undefined && reservation.servicePrice !== null) {
    return reservation.servicePrice;
  }
  // 3. Look up price from service catalog
  if (reservation.serviceId && serviceMap) {
    const svc = serviceMap.get(reservation.serviceId);
    if (svc?.price) return svc.price;
  }
  // 4. No price available
  return 0;
}

export function getReservationCounts(reservations: ReservationMetric[]) {
  return {
    total: reservations.length,
    confirmed: reservations.filter((r) => r.status === "Confirmada").length,
    pending: reservations.filter((r) => r.status === "Pendiente").length,
    canceled: reservations.filter((r) => r.status === "Cancelada").length,
  };
}

export function getServiceUsageMetrics(
  reservations: ReservationMetric[],
  services: ServiceMetric[],
): ServiceUsage[] {
  const map = new Map<string, ServiceMetric>();
  services.forEach((s) => map.set(s.id, s));

  const acc: Record<string, ServiceUsage> = {};
  reservations.forEach((r) => {
    const svc = r.serviceId ? map.get(r.serviceId) : undefined;
    const key = r.serviceId ?? r.serviceName ?? "sin-id";
    const name = svc?.name ?? r.serviceName ?? "Servicio";

    if (!acc[key]) acc[key] = { serviceId: key, name, count: 0, revenue: 0 };
    acc[key].count += 1;

    // IMPORTANTE: Solo sumar ingresos de reservas CONFIRMADAS (pagadas)
    if (r.status === "Confirmada") {
      const price = getEffectivePrice(r, map);
      acc[key].revenue += price;
    }
  });
  return Object.values(acc).sort((a, b) => b.count - a.count);
}

export function getTopServicesByRevenue(reservations: ReservationMetric[], services: ServiceMetric[], limit = 3) {
  return getServiceUsageMetrics(reservations, services)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function getStaffPerformanceMetrics(
  reservations: ReservationMetric[],
  staff: StaffMetric[],
  services: ServiceMetric[],
): StaffPerformance[] {
  const staffMap = new Map<string, StaffMetric>();
  staff.forEach((s) => staffMap.set(s.id, s));
  const serviceMap = new Map<string, ServiceMetric>();
  services.forEach((s) => serviceMap.set(s.id, s));

  const acc: Record<string, StaffPerformance> = {};
  reservations.forEach((r) => {
    const staffKey = r.staffId ?? "sin-staff";
    const staffName = staffMap.get(r.staffId ?? "")?.name ?? r.staffName ?? "Sin asignar";
    const staffRole = staffMap.get(r.staffId ?? "")?.role;

    if (!acc[staffKey]) {
      acc[staffKey] = {
        staffId: staffKey,
        name: staffName,
        role: staffRole,
        totalReservations: 0,
        totalRevenue: 0,
        firstReservationAt: r.dateId,
        lastReservationAt: r.dateId,
      };
    }
    acc[staffKey].totalReservations += 1;

    // IMPORTANTE: Solo sumar ingresos de reservas CONFIRMADAS (pagadas)
    if (r.status === "Confirmada") {
      const price = getEffectivePrice(r, serviceMap);
      acc[staffKey].totalRevenue += price;
    }

    acc[staffKey].firstReservationAt = acc[staffKey].firstReservationAt
      ? acc[staffKey].firstReservationAt < r.dateId
        ? acc[staffKey].firstReservationAt
        : r.dateId
      : r.dateId;
    acc[staffKey].lastReservationAt = acc[staffKey].lastReservationAt
      ? acc[staffKey].lastReservationAt > r.dateId
        ? acc[staffKey].lastReservationAt
        : r.dateId
      : r.dateId;
  });

  return Object.values(acc).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export function getReservationsByDay(
  reservations: ReservationMetric[],
  range: { from: Date; to: Date },
): TimeSeriesPoint[] {
  const from = new Date(range.from);
  const to = new Date(range.to);
  const totals: Record<string, number> = {};
  reservations.forEach((r) => {
    const dt = new Date(`${r.dateId}T${r.time ?? "00:00"}`);
    if (dt >= from && dt <= to) {
      totals[r.dateId] = (totals[r.dateId] ?? 0) + 1;
    }
  });
  return Object.entries(totals)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));
}

export function getReservationsByWeekday(reservations: ReservationMetric[]): WeekdayMetric[] {
  const counters: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  reservations.forEach((r) => {
    const dt = new Date(`${r.dateId}T${r.time ?? "00:00"}`);
    const weekday = (dt.getDay() + 6) % 7; // lunes=0
    counters[weekday] = (counters[weekday] ?? 0) + 1;
  });
  return Object.entries(counters).map(([weekday, total]) => ({
    weekday: Number(weekday),
    label: WEEKDAY_LABELS[Number(weekday)],
    total,
  }));
}

export function getClientMetrics(reservations: ReservationMetric[]) {
  const byClient: Record<string, number> = {};
  reservations.forEach((r) => {
    const key = (r.phone ?? "").trim() || r.name || "";
    if (!key) return;
    byClient[key] = (byClient[key] ?? 0) + 1;
  });
  const totalClients = Object.keys(byClient).length;
  const returning = Object.values(byClient).filter((c) => c > 1).length;
  const returningRate = totalClients > 0 ? returning / totalClients : 0;
  return { totalClients, returning, returningRate };
}
