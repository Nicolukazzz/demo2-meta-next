export type ReservationLite = {
  dateId: string;
  time: string;
  status?: string;
  serviceId?: string;
  serviceName?: string;
  servicePrice?: number;
  staffId?: string;
  staffName?: string;
};

export type ServiceLite = {
  id: string;
  name: string;
  price?: number;
  durationMinutes?: number;
  active?: boolean;
};

export type CustomerLite = {
  _id?: string;
  name: string;
  phone: string;
  createdAt?: string;
};

export type FinanceMetrics = {
  totalRevenue: number;
  monthRevenue: number;
  weekRevenue: number;
  paidReservations: number;
  averageTicket: number;
  reservationCounts: {
    total: number;
    confirmed: number;
    pending: number;
    canceled: number;
  };
  topServicesByRevenue: { name: string; revenue: number; count: number }[];
  topServicesByCount: { name: string; revenue: number; count: number }[];
  topDays: { dateId: string; revenue: number; count: number }[];
  reservationsByWeekday: { weekday: number; count: number }[];
  clients: {
    total: number;
    newThisMonth: number;
    returning: number;
    returningRate: number;
  };
};

const toCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

export function formatCOP(value: number) {
  return toCOP(value);
}

function getWeekRange(date = new Date()) {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

export function getReservationCounts(reservations: ReservationLite[]) {
  const total = reservations.length;
  const confirmed = reservations.filter((r) => r.status === "Confirmada").length;
  const pending = reservations.filter((r) => r.status === "Pendiente").length;
  const canceled = reservations.filter((r) => r.status === "Cancelada").length;
  return { total, confirmed, pending, canceled };
}

export function getTopServicesByCount(reservations: ReservationLite[], services: ServiceLite[] = [], limit = 3) {
  const serviceMap = new Map<string, ServiceLite>();
  services.forEach((s) => serviceMap.set(s.id, s));
  const counters: Record<string, { name: string; revenue: number; count: number }> = {};
  reservations.forEach((r) => {
    const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
    const key = svc?.name ?? r.serviceName ?? "Servicio";
    if (!counters[key]) counters[key] = { name: key, revenue: 0, count: 0 };
    counters[key].count += 1;
    counters[key].revenue += svc?.price ?? r.servicePrice ?? 0;
  });
  return Object.values(counters).sort((a, b) => b.count - a.count).slice(0, limit);
}

export function getTopServicesByRevenue(reservations: ReservationLite[], services: ServiceLite[] = [], limit = 3) {
  const serviceMap = new Map<string, ServiceLite>();
  services.forEach((s) => serviceMap.set(s.id, s));
  const totals: Record<string, { name: string; revenue: number; count: number }> = {};
  reservations.forEach((r) => {
    const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
    const key = svc?.name ?? r.serviceName ?? "Servicio";
    if (!totals[key]) totals[key] = { name: key, revenue: 0, count: 0 };
    const price = svc?.price ?? r.servicePrice ?? 0;
    totals[key].revenue += price;
    totals[key].count += 1;
  });
  return Object.values(totals).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function getTopDays(reservations: ReservationLite[], services: ServiceLite[] = [], limit = 3) {
  const serviceMap = new Map<string, ServiceLite>();
  services.forEach((s) => serviceMap.set(s.id, s));
  const totals: Record<string, { revenue: number; count: number }> = {};
  reservations.forEach((r) => {
    const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
    const price = svc?.price ?? r.servicePrice ?? 0;
    totals[r.dateId] = {
      revenue: (totals[r.dateId]?.revenue ?? 0) + price,
      count: (totals[r.dateId]?.count ?? 0) + 1,
    };
  });
  return Object.entries(totals)
    .map(([dateId, val]) => ({ dateId, revenue: val.revenue, count: val.count }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function getReservationsByWeekday(reservations: ReservationLite[]) {
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  reservations.forEach((r) => {
    const dt = new Date(`${r.dateId}T${r.time ?? "00:00"}`);
    const weekday = (dt.getDay() + 6) % 7; // lunes=0
    counts[weekday] = (counts[weekday] ?? 0) + 1;
  });
  return Object.entries(counts).map(([weekday, count]) => ({ weekday: Number(weekday), count }));
}

export function getCustomerRetentionMetrics(customers: CustomerLite[] = [], reservations: ReservationLite[] = []) {
  const total = customers.length;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const newThisMonth = customers.filter((c) => {
    if (!c.createdAt) return false;
    const dt = new Date(c.createdAt);
    return dt.getFullYear() === currentYear && dt.getMonth() === currentMonth;
  }).length;

  const reservationsByClient: Record<string, number> = {};
  reservations.forEach((r) => {
    // no client id in type; skip for now
  });
  const returning = Object.values(reservationsByClient).filter((cnt) => cnt > 1).length;
  const returningRate = total > 0 ? returning / total : 0;

  return { total, newThisMonth, returning, returningRate };
}

export function computeFinanceMetrics(
  reservations: ReservationLite[],
  services: ServiceLite[] = [],
  customers: CustomerLite[] = [],
): FinanceMetrics {
  const serviceMap = new Map<string, ServiceLite>();
  services.forEach((s) => serviceMap.set(s.id, s));

  const confirmed = reservations.filter((r) => r.status === "Confirmada");

  const totalRevenue = confirmed.reduce((acc, r) => {
    const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
    const price = svc?.price ?? r.servicePrice ?? 0;
    return acc + price;
  }, 0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const { start: weekStart, end: weekEnd } = getWeekRange(now);

  const inMonth = confirmed.filter((r) => {
    const dt = new Date(`${r.dateId}T${r.time ?? "00:00"}`);
    return dt.getFullYear() === currentYear && dt.getMonth() === currentMonth;
  });

  const inWeek = confirmed.filter((r) => {
    const dt = new Date(`${r.dateId}T${r.time ?? "00:00"}`);
    return dt >= weekStart && dt < weekEnd;
  });

  const monthRevenue = inMonth.reduce((acc, r) => {
    const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
    const price = svc?.price ?? r.servicePrice ?? 0;
    return acc + price;
  }, 0);

  const weekRevenue = inWeek.reduce((acc, r) => {
    const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
    const price = svc?.price ?? r.servicePrice ?? 0;
    return acc + price;
  }, 0);

  const paidReservations = confirmed.length;
  const averageTicket = paidReservations > 0 ? Math.round(totalRevenue / paidReservations) : 0;

  return {
    totalRevenue,
    monthRevenue,
    weekRevenue,
    paidReservations,
    averageTicket,
    reservationCounts: getReservationCounts(reservations),
    topServicesByRevenue: getTopServicesByRevenue(confirmed, services),
    topServicesByCount: getTopServicesByCount(confirmed, services),
    topDays: getTopDays(confirmed, services),
    reservationsByWeekday: getReservationsByWeekday(reservations),
    clients: getCustomerRetentionMetrics(customers, reservations),
  };
}
