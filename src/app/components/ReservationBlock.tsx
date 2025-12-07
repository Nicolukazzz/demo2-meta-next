"use client";

import React from "react";
import { formatDuration } from "@/lib/schedulingUtils";

export interface ReservationBlockProps {
    reservation: {
        _id: string;
        name: string;
        time: string;
        endTime?: string;
        durationMinutes?: number;
        serviceName?: string;
        serviceId?: string;
        staffName?: string;
        staffId?: string;
        status?: string;
    };
    slotMinutes: number;
    pixelsPerSlot?: number;
    statusColor?: string;
    servicesMap?: Map<string, { durationMinutes?: number; price?: number }>;
    onClickReservation?: (reservation: ReservationBlockProps["reservation"]) => void;
}

/**
 * Status color mappings for reservation blocks.
 * Same colors as TimeGridCalendar for consistency.
 */
export const statusColors: Record<string, string> = {
    Confirmada: "bg-emerald-500/30 border-emerald-400/50",
    Pendiente: "bg-amber-500/30 border-amber-400/50",
    Cancelada: "bg-rose-500/30 border-rose-400/50",
};

/**
 * Get status color class for a reservation.
 */
export function getStatusColor(status?: string): string {
    return statusColors[status ?? ""] || "bg-indigo-500/30 border-indigo-400/50";
}

/**
 * Calculate effective duration considering service info.
 */
function getEffectiveDuration(
    reservation: ReservationBlockProps["reservation"],
    servicesMap?: ReservationBlockProps["servicesMap"],
    fallback: number = 60
): number {
    // Priority: explicit durationMinutes > endTime calculation > service duration > fallback
    if (reservation.durationMinutes && reservation.durationMinutes > 0) {
        return reservation.durationMinutes;
    }

    if (reservation.time && reservation.endTime) {
        const timeToMins = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + (m || 0);
        };
        const diff = timeToMins(reservation.endTime) - timeToMins(reservation.time);
        if (diff > 0) return diff;
    }

    if (reservation.serviceId && servicesMap) {
        const service = servicesMap.get(reservation.serviceId);
        if (service?.durationMinutes) {
            return service.durationMinutes;
        }
    }

    return fallback;
}

/**
 * Calculate end time from start and duration.
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
    const [h, m] = startTime.split(":").map(Number);
    const totalMins = h * 60 + (m || 0) + durationMinutes;
    const endH = Math.floor(totalMins / 60).toString().padStart(2, "0");
    const endM = (totalMins % 60).toString().padStart(2, "0");
    return `${endH}:${endM}`;
}

/**
 * Visual block for displaying a reservation in the calendar.
 * Height is proportional to the reservation's duration.
 */
export function ReservationBlock({
    reservation,
    slotMinutes,
    pixelsPerSlot = 60,
    statusColor,
    servicesMap,
    onClickReservation,
}: ReservationBlockProps) {
    const duration = getEffectiveDuration(reservation, servicesMap, slotMinutes);
    const endTime = reservation.endTime || calculateEndTime(reservation.time, duration);

    // Calculate height based on duration
    const slots = duration / slotMinutes;
    const height = Math.max(slots * pixelsPerSlot, 56); // Minimum 56px

    const colorClass = statusColor || getStatusColor(reservation.status);

    return (
        <div
            className={`relative rounded-lg border p-2 text-sm cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${colorClass} text-white overflow-hidden`}
            style={{ minHeight: `${height}px` }}
            onClick={() => onClickReservation?.(reservation)}
        >
            <div className="flex flex-col h-full justify-between gap-1">
                {/* Time Range - Prominent  */}
                <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs">
                        {reservation.time} - {endTime}
                    </span>
                    <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {formatDuration(duration)}
                    </span>
                </div>

                {/* Client Name */}
                <p className="font-semibold truncate leading-tight">{reservation.name}</p>

                {/* Service Name */}
                {reservation.serviceName && (
                    <p className="text-xs opacity-90 truncate">{reservation.serviceName}</p>
                )}

                {/* Staff Name (if assigned) */}
                {reservation.staffName && (
                    <p className="text-[10px] opacity-70 truncate mt-auto">
                        {reservation.staffName}
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * Compact version of ReservationBlock for dense views.
 */
export function ReservationBlockCompact({
    reservation,
    statusColor,
    servicesMap,
    onClickReservation,
}: Omit<ReservationBlockProps, "slotMinutes" | "pixelsPerSlot">) {
    const duration = getEffectiveDuration(reservation, servicesMap, 60);
    const endTime = reservation.endTime || calculateEndTime(reservation.time, duration);
    const colorClass = statusColor || getStatusColor(reservation.status);

    return (
        <button
            type="button"
            className={`w-full text-left rounded-lg border px-3 py-2 text-xs shadow-sm transition hover:opacity-90 ${colorClass} text-white`}
            onClick={() => onClickReservation?.(reservation)}
        >
            <p className="text-sm font-semibold line-clamp-1 break-words">{reservation.name}</p>
            <p className="text-[11px] opacity-90 line-clamp-1 break-words">
                {reservation.time} - {endTime}
                {reservation.serviceName ? ` · ${reservation.serviceName}` : ""}
            </p>
            {reservation.staffName && (
                <p className="text-[10px] opacity-70 line-clamp-1 break-words mt-0.5">
                    {reservation.staffName}
                </p>
            )}
        </button>
    );
}
