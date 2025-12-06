type ReservationLite = {
  dateId: string;
  time: string;
  status?: string;
  serviceId?: string;
  serviceName?: string;
  servicePrice?: number;
};

export type FinanceMetrics = {
  totalRevenue: number;
  monthRevenue: number;
  weekRevenue: number;
  paidReservations: number;
  averageTicket: number;
  topServices: { name: string; revenue: number }[];
  topDays: { dateId: string; revenue: number }[];
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

export function computeFinanceMetrics(
  reservations: ReservationLite[],
  services: { id: string; name: string; price?: number; durationMinutes?: number; active?: boolean }[] = [],
): FinanceMetrics {
  const serviceMap = new Map<string, { name: string; price?: number }>();
  services.forEach((s) => serviceMap.set(s.id, { name: s.name, price: s.price }));

  const confirmed = reservations.filter((r) => r.status === "Confirmada");

  const totalRevenue = confirmed.reduce((acc, r) => {
    const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
    const price = svc?.price ?? 0;
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
    const price = svc?.price ?? 0;
    return acc + price;
  }, 0);

  const weekRevenue = inWeek.reduce((acc, r) => {
    const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
    const price = svc?.price ?? 0;
    return acc + price;
  }, 0);

  const paidReservations = confirmed.length;
  const averageTicket = paidReservations > 0 ? Math.round(totalRevenue / paidReservations) : 0;

  const serviceTotals: Record<string, { name: string; revenue: number }> = {};
  confirmed.forEach((r) => {
    const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
    const price = svc?.price ?? 0;
    const key = svc?.name ?? r.serviceName ?? "Servicio";
    if (!serviceTotals[key]) serviceTotals[key] = { name: key, revenue: 0 };
    serviceTotals[key].revenue += price;
  });
  const topServices = Object.values(serviceTotals)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  const dayTotals: Record<string, number> = {};
  confirmed.forEach((r) => {
    const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
    const price = svc?.price ?? 0;
    dayTotals[r.dateId] = (dayTotals[r.dateId] ?? 0) + price;
  });
  const topDays = Object.entries(dayTotals)
    .map(([dateId, revenue]) => ({ dateId, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  return {
    totalRevenue,
    monthRevenue,
    weekRevenue,
    paidReservations,
    averageTicket,
    topServices,
    topDays,
  };
}
