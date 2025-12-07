import { Service } from "./businessProfile";
import { timeToMinutes, minutesToTime, addMinutesToTime } from "./availability";

/**
 * Default service duration in minutes if not specified.
 */
export const DEFAULT_SERVICE_DURATION = 60;

/**
 * Get the duration of a service in minutes.
 * Returns the service's durationMinutes or DEFAULT_SERVICE_DURATION if not specified.
 */
export function getServiceDuration(service: Service | undefined | null): number {
    return service?.durationMinutes ?? DEFAULT_SERVICE_DURATION;
}

/**
 * Calculate the end time for a reservation based on start time and service.
 */
export function calculateEndTime(startTime: string, service: Service | undefined | null): string {
    const duration = getServiceDuration(service);
    return addMinutesToTime(startTime, duration);
}

/**
 * Calculate the end time from start time and explicit duration.
 */
export function calculateEndTimeFromDuration(startTime: string, durationMinutes: number): string {
    return addMinutesToTime(startTime, durationMinutes);
}

/**
 * Get the duration of a reservation in minutes.
 * Priority: explicit durationMinutes > calculated from times > default.
 */
export function getReservationDuration(reservation: {
    time: string;
    endTime?: string;
    durationMinutes?: number;
}): number {
    if (reservation.durationMinutes && reservation.durationMinutes > 0) {
        return reservation.durationMinutes;
    }

    if (reservation.time && reservation.endTime) {
        const start = timeToMinutes(reservation.time);
        const end = timeToMinutes(reservation.endTime);
        if (end > start) {
            return end - start;
        }
    }

    return DEFAULT_SERVICE_DURATION;
}

/**
 * Get the end time of a reservation.
 * Calculates from duration if endTime is not explicitly set.
 */
export function getReservationEndTime(reservation: {
    time: string;
    endTime?: string;
    durationMinutes?: number;
}): string {
    if (reservation.endTime) {
        return reservation.endTime;
    }

    const duration = getReservationDuration(reservation);
    return addMinutesToTime(reservation.time, duration);
}

/**
 * Format a time range for display (e.g., "09:00 - 10:30")
 */
export function formatTimeRange(startTime: string, endTime: string): string {
    return `${startTime} - ${endTime}`;
}

/**
 * Calculate how many time slots a reservation occupies.
 */
export function getSlotSpan(durationMinutes: number, slotMinutes: number): number {
    return Math.ceil(durationMinutes / slotMinutes);
}

/**
 * Calculate the pixel height for a reservation block based on duration.
 * @param durationMinutes - Duration of the reservation
 * @param slotMinutes - Duration of each slot in the calendar
 * @param pixelsPerSlot - Height in pixels for each slot
 */
export function calculateBlockHeight(
    durationMinutes: number,
    slotMinutes: number,
    pixelsPerSlot: number = 60
): number {
    const slots = durationMinutes / slotMinutes;
    return Math.max(slots * pixelsPerSlot, pixelsPerSlot); // Minimum one slot height
}

/**
 * Calculate the top offset for a reservation in a time-grid layout.
 * @param startTime - Start time of the reservation
 * @param scheduleOpen - Opening time of the schedule
 * @param slotMinutes - Duration of each slot
 * @param pixelsPerSlot - Height in pixels for each slot
 */
export function calculateBlockTop(
    startTime: string,
    scheduleOpen: string,
    slotMinutes: number,
    pixelsPerSlot: number = 60
): number {
    const startMinutes = timeToMinutes(startTime);
    const openMinutes = timeToMinutes(scheduleOpen);
    const minutesFromOpen = startMinutes - openMinutes;
    const slots = minutesFromOpen / slotMinutes;
    return slots * pixelsPerSlot;
}

/**
 * Prepare reservation data for API submission.
 * Ensures all time-related fields are properly calculated and included.
 */
export function prepareReservationPayload(
    startTime: string,
    service: Service | undefined | null,
    overrideDuration?: number
): {
    time: string;
    endTime: string;
    durationMinutes: number;
} {
    const duration = overrideDuration ?? getServiceDuration(service);
    const endTime = addMinutesToTime(startTime, duration);

    return {
        time: startTime,
        endTime,
        durationMinutes: duration,
    };
}

/**
 * Validate that a time range is valid (end > start).
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
    return timeToMinutes(endTime) > timeToMinutes(startTime);
}

/**
 * Parse a duration string (e.g., "1h 30m", "90m", "1.5h") to minutes.
 */
export function parseDurationToMinutes(duration: string): number | null {
    const normalized = duration.toLowerCase().trim();

    // Try "Xh Ym" format
    const hhmm = normalized.match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/);
    if (hhmm) {
        const hours = parseInt(hhmm[1], 10);
        const mins = hhmm[2] ? parseInt(hhmm[2], 10) : 0;
        return hours * 60 + mins;
    }

    // Try "Xm" format
    const minsOnly = normalized.match(/^(\d+)\s*m$/);
    if (minsOnly) {
        return parseInt(minsOnly[1], 10);
    }

    // Try decimal hours "X.Yh"
    const decimalHours = normalized.match(/^(\d+\.?\d*)\s*h$/);
    if (decimalHours) {
        return Math.round(parseFloat(decimalHours[1]) * 60);
    }

    // Try plain number (assume minutes)
    const plainNum = parseInt(normalized, 10);
    if (!isNaN(plainNum)) {
        return plainNum;
    }

    return null;
}

/**
 * Format minutes as a human-readable duration string.
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${mins}m`;
}
