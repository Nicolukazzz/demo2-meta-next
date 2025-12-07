import { Hours, StaffMember, getEffectiveBusinessHoursForDate } from "./businessProfile";

export type AgendaSlot = {
  time: string;
  reservations: Array<{
    _id: string;
    name: string;
    time: string;
    phone?: string;
    serviceName?: string;
    serviceId?: string;
    status?: string;
    staffName?: string;
    staffId?: string;
    endTime?: string;
    durationMinutes?: number;
  }>;
};

export type DayAgenda = {
  slots: AgendaSlot[];
  closed: boolean;
  hours?: Hours;
};

export type ReservationLite = {
  _id: string;
  dateId: string;
  time: string;
  endTime?: string;
  durationMinutes?: number;
  name: string;
  phone?: string;
  serviceName?: string;
  serviceId?: string;
  status?: string;
  staffId?: string;
  staffName?: string;
};

export function buildDayAgenda(
  date: Date,
  businessHours: Hours | undefined,
  reservations: ReservationLite[],
  staff?: StaffMember[],
): DayAgenda {
  if (!businessHours) return { slots: [], closed: true };

  const hours = getEffectiveBusinessHoursForDate(date, businessHours);
  if (!hours) return { slots: [], closed: true, hours: undefined };

  const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + (m || 0);
  };

  const start = toMinutes(hours.open);
  const end = toMinutes(hours.close);
  const step = hours.slotMinutes || 60;
  const slots: AgendaSlot[] = [];

  for (let t = start; t <= end; t += step) {
    const hh = Math.floor(t / 60)
      .toString()
      .padStart(2, "0");
    const mm = (t % 60).toString().padStart(2, "0");
    const label = `${hh}:${mm}`;

    // Find all reservations that START at this slot time
    const slotReservations = reservations
      .filter((r) => r.time?.startsWith(label))
      .map((reservation) => {
        const staffName =
          reservation.staffName ||
          (reservation.staffId ? staff?.find((s) => s.id === reservation.staffId)?.name : undefined);
        return {
          ...reservation,
          staffName,
        };
      });

    slots.push({
      time: label,
      reservations: slotReservations,
    });
  }

  return {
    slots,
    closed: false,
    hours,
  };
}

