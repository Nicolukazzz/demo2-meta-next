import { Hours, StaffMember, getEffectiveStaffHours, DayOfWeek } from "./businessProfile";

/**
 * Convert time string "HH:MM" to minutes since midnight.
 */
export function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + (m || 0);
}

/**
 * Convert minutes since midnight to "HH:MM" format.
 */
export function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Add minutes to a time string and return the new time string.
 */
export function addMinutesToTime(time: string, minutesToAdd: number): string {
    const totalMinutes = timeToMinutes(time) + minutesToAdd;
    return minutesToTime(totalMinutes);
}

/**
 * Check if two time ranges overlap.
 * Ranges are [start, end) - inclusive start, exclusive end.
 */
export function isOverlapping(
    start1: string,
    end1: string,
    start2: string,
    end2: string
): boolean {
    const s1 = timeToMinutes(start1);
    const e1 = timeToMinutes(end1);
    const s2 = timeToMinutes(start2);
    const e2 = timeToMinutes(end2);

    // Two ranges overlap if one starts before the other ends
    return s1 < e2 && s2 < e1;
}

/**
 * Check if a time range fits within business/staff hours.
 */
export function isWithinSchedule(
    startTime: string,
    endTime: string,
    scheduleOpen: string,
    scheduleClose: string
): boolean {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const open = timeToMinutes(scheduleOpen);
    const close = timeToMinutes(scheduleClose);

    return start >= open && end <= close;
}

/**
 * Check if a staff member is capable of performing a specific service.
 * If staff has no serviceIds defined, they can perform all services.
 */
export function isStaffCapable(staff: StaffMember, serviceId: string): boolean {
    // If no serviceIds defined, staff can do all services
    if (!staff.serviceIds || staff.serviceIds.length === 0) {
        return true;
    }
    return staff.serviceIds.includes(serviceId);
}

/**
 * Get all staff members capable of performing a specific service.
 */
export function getCapableStaff(staff: StaffMember[], serviceId: string): StaffMember[] {
    return staff.filter(s => s.active !== false && isStaffCapable(s, serviceId));
}

export type Reservation = {
    _id: string;
    dateId: string;
    time: string;
    endTime?: string;
    durationMinutes?: number;
    staffId?: string;
    serviceId?: string;
};

/**
 * Check if a staff member has a conflicting reservation in the given time range.
 */
export function hasStaffConflict(
    staffId: string,
    dateId: string,
    startTime: string,
    endTime: string,
    reservations: Reservation[],
    excludeReservationId?: string
): boolean {
    return reservations.some((r) => {
        // Skip if different staff or different date
        if (r.staffId !== staffId || r.dateId !== dateId) return false;
        // Skip the reservation we're editing
        if (excludeReservationId && r._id === excludeReservationId) return false;

        // Calculate reservation end time
        const resEndTime = r.endTime || (r.durationMinutes
            ? addMinutesToTime(r.time, r.durationMinutes)
            : addMinutesToTime(r.time, 60)); // Default 60 min

        return isOverlapping(startTime, endTime, r.time, resEndTime);
    });
}

/**
 * Check if a booking can be made for a staff member at a specific time.
 * Returns { canBook: boolean, reason?: string }
 */
export function canBookSlot(
    staff: StaffMember,
    date: Date,
    startTime: string,
    durationMinutes: number,
    businessHours: Hours,
    reservations: Reservation[],
    serviceId?: string,
    excludeReservationId?: string
): { canBook: boolean; reason?: string } {
    // Check if staff is active
    if (staff.active === false) {
        return { canBook: false, reason: "El empleado no está activo" };
    }

    // Check if staff can perform the service
    if (serviceId && !isStaffCapable(staff, serviceId)) {
        return { canBook: false, reason: "El empleado no puede realizar este servicio" };
    }

    // Get effective hours for this day
    const dayOfWeek = ((date.getDay() + 6) % 7) as DayOfWeek;
    const effectiveHours = getEffectiveStaffHours(staff, businessHours, dayOfWeek);

    if (!effectiveHours) {
        return { canBook: false, reason: "El empleado no trabaja este día" };
    }

    // Calculate end time
    const endTime = addMinutesToTime(startTime, durationMinutes);

    // Check if within schedule
    if (!isWithinSchedule(startTime, endTime, effectiveHours.open, effectiveHours.close)) {
        return {
            canBook: false,
            reason: `Fuera del horario del empleado (${effectiveHours.open} - ${effectiveHours.close})`
        };
    }

    // Check for conflicts with other reservations
    const dateId = formatDateKey(date);
    if (hasStaffConflict(staff.id, dateId, startTime, endTime, reservations, excludeReservationId)) {
        return { canBook: false, reason: "El empleado ya tiene una reserva en ese horario" };
    }

    return { canBook: true };
}

/**
 * Find all available staff for a given time slot and service.
 */
export function findAvailableStaff(
    staff: StaffMember[],
    date: Date,
    startTime: string,
    durationMinutes: number,
    businessHours: Hours,
    reservations: Reservation[],
    serviceId?: string
): StaffMember[] {
    return staff.filter(s => {
        const result = canBookSlot(s, date, startTime, durationMinutes, businessHours, reservations, serviceId);
        return result.canBook;
    });
}

/**
 * Auto-select an available staff member for a booking.
 * Prioritizes staff that can perform the service and has the least bookings.
 */
export function autoSelectStaff(
    staff: StaffMember[],
    date: Date,
    startTime: string,
    durationMinutes: number,
    businessHours: Hours,
    reservations: Reservation[],
    serviceId?: string
): StaffMember | null {
    const available = findAvailableStaff(
        staff, date, startTime, durationMinutes, businessHours, reservations, serviceId
    );

    if (available.length === 0) return null;

    // Count existing reservations for each staff member on this day
    const dateId = formatDateKey(date);
    const bookingCounts = available.map(s => ({
        staff: s,
        count: reservations.filter(r => r.staffId === s.id && r.dateId === dateId).length
    }));

    // Return the one with fewest bookings
    bookingCounts.sort((a, b) => a.count - b.count);
    return bookingCounts[0].staff;
}

function formatDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}

/**
 * Generate time slots for a day based on hours configuration.
 */
export function generateTimeSlots(hours: Hours): string[] {
    const slots: string[] = [];
    const start = timeToMinutes(hours.open);
    const end = timeToMinutes(hours.close);
    const step = hours.slotMinutes || 60;

    for (let t = start; t < end; t += step) {
        slots.push(minutesToTime(t));
    }

    return slots;
}
