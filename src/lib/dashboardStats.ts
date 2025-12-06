import { getEffectiveBusinessHoursForDate } from "./businessProfile";
import { getReservationsCollection } from "./mongodb";

export type DashboardStats = {
  totalReservations: number;
  confirmedReservations: number;
  pendingReservations: number;
  next24hReservations: number;
  thisWeekReservations: number;
  nextDate?: string;
};

type ReservationLite = {
  dateId: string;
  time?: string;
  status?: string;
};

function toDateTime(dateId: string, time?: string) {
  const [h = "00", m = "00"] = (time ?? "00:00").split(":");
  return new Date(`${dateId}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`);
}

export function computeDashboardStats(reservations: ReservationLite[]): DashboardStats {
  const now = new Date();
  const weekStart = new Date(now);
  const day = (weekStart.getDay() + 6) % 7; // lunes=0
  weekStart.setDate(weekStart.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const next24Limit = new Date(now);
  next24Limit.setHours(now.getHours() + 24, now.getMinutes(), 0, 0);

  let confirmedReservations = 0;
  let pendingReservations = 0;
  let next24hReservations = 0;
  let thisWeekReservations = 0;
  let nextDate: string | undefined;

  for (const it of reservations) {
    if (!it.dateId) continue;
    const dt = toDateTime(it.dateId, it.time);
    if (it.status === "Confirmada") confirmedReservations += 1;
    if (it.status === "Pendiente") pendingReservations += 1;
    if (dt >= now) {
      if (dt <= next24Limit) next24hReservations += 1;
      if (dt >= weekStart && dt < weekEnd) thisWeekReservations += 1;
      if (it.status === "Confirmada") {
        if (!nextDate || dt < toDateTime(nextDate)) {
          nextDate = it.dateId;
        }
      }
    }
  }

  if (!nextDate) {
    const future = reservations
      .filter((it) => toDateTime(it.dateId, it.time) >= now)
      .sort((a, b) => (toDateTime(a.dateId, a.time) as any) - (toDateTime(b.dateId, b.time) as any));
    nextDate = future[0]?.dateId;
  }

  return {
    totalReservations: reservations.length,
    confirmedReservations,
    pendingReservations,
    next24hReservations,
    thisWeekReservations,
    nextDate,
  };
}

export async function getDashboardStats(clientId: string): Promise<DashboardStats> {
  const col = await getReservationsCollection();
  const items = await col
    .find({ clientId })
    .project({
      dateId: 1,
      time: 1,
      status: 1,
    })
    .toArray();
  return computeDashboardStats(items as ReservationLite[]);
}
