"use client";

import React, { useState, useRef, useEffect } from "react";
import { addMinutesToTime } from "@/lib/availability";

export interface CalendarReservation {
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
    phone?: string;
    servicePrice?: number;
}

export interface ServiceInfo {
    id: string;
    name: string;
    durationMinutes?: number;
    price?: number;
}

export interface CalendarReservationBlockProps {
    reservation: CalendarReservation;
    slotMinutes: number;
    defaultDuration?: number;
    servicesMap?: Map<string, ServiceInfo>;
    onClick?: (reservation: CalendarReservation) => void;
}

/**
 * Status styles for reservation blocks
 */
const statusStyles: Record<string, string> = {
    Confirmada: "border-emerald-400/40 bg-emerald-500/20 text-emerald-100",
    Pendiente: "border-amber-400/40 bg-amber-500/20 text-amber-100",
    Cancelada: "border-rose-400/40 bg-rose-500/20 text-rose-100",
};

const statusColors: Record<string, string> = {
    Confirmada: "text-emerald-400",
    Pendiente: "text-amber-400",
    Cancelada: "text-rose-400",
};

/**
 * Format duration as human readable string
 */
function formatDurationText(minutes: number): string {
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
}

/**
 * Calculate the height of the block based on duration
 */
function calculateBlockHeight(durationMinutes: number, slotMinutes: number): number {
    const baseHeightPerSlot = 56; // pixels per time slot
    const slotsSpanned = durationMinutes / slotMinutes;
    return Math.max(Math.round(slotsSpanned * baseHeightPerSlot), 48);
}

/**
 * Get duration from reservation, service lookup, or default
 */
function getEffectiveDuration(
    reservation: CalendarReservation,
    servicesMap?: Map<string, ServiceInfo>,
    defaultDuration = 60
): number {
    // First priority: use reservation's durationMinutes
    if (reservation.durationMinutes && reservation.durationMinutes > 0) {
        return reservation.durationMinutes;
    }

    // Second priority: lookup from services map
    if (reservation.serviceId && servicesMap) {
        const service = servicesMap.get(reservation.serviceId);
        if (service?.durationMinutes && service.durationMinutes > 0) {
            return service.durationMinutes;
        }
    }

    // Fallback: default duration
    return defaultDuration;
}

/**
 * CalendarReservationBlock - A modular component for displaying reservations
 * in the calendar grid with proportional height and hover tooltip.
 */
export function CalendarReservationBlock({
    reservation,
    slotMinutes,
    defaultDuration = 60,
    servicesMap,
    onClick,
}: CalendarReservationBlockProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<"top" | "bottom">("bottom");
    const blockRef = useRef<HTMLDivElement>(null);

    // Calculate duration using effective duration (from reservation, service, or default)
    const duration = getEffectiveDuration(reservation, servicesMap, defaultDuration);
    const endTime = reservation.endTime || addMinutesToTime(reservation.time, duration);
    const blockHeight = calculateBlockHeight(duration, slotMinutes);
    const durationText = formatDurationText(duration);

    // Determine tooltip position based on available space
    useEffect(() => {
        if (showTooltip && blockRef.current) {
            const rect = blockRef.current.getBoundingClientRect();
            const spaceAbove = rect.top;
            const tooltipHeight = 180; // approximate tooltip height

            if (spaceAbove < tooltipHeight) {
                setTooltipPosition("bottom");
            } else {
                setTooltipPosition("top");
            }
        }
    }, [showTooltip]);

    const statusStyle = statusStyles[reservation.status ?? ""] ?? "border-white/10 bg-white/10 text-slate-100";
    const statusColor = statusColors[reservation.status ?? ""] ?? "text-slate-300";

    return (
        <div
            ref={blockRef}
            className="relative flex-1 min-w-0"
            style={{ height: `${blockHeight}px` }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <button
                type="button"
                className={`w-full h-full text-left rounded-lg border px-2 py-1.5 text-xs shadow-sm transition 
          hover:ring-2 hover:ring-white/30 hover:shadow-lg overflow-hidden ${statusStyle}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(reservation);
                }}
            >
                <p className="text-sm font-semibold text-white line-clamp-1 break-words">
                    {reservation.name}
                </p>
                <p className="text-[11px] text-slate-200 line-clamp-1 break-words">
                    {reservation.serviceName || "Sin servicio"}
                </p>
                <p className="text-[10px] text-slate-300 mt-0.5">
                    {reservation.time} - {endTime}
                </p>
                {reservation.staffName && blockHeight > 80 && (
                    <p className="text-[10px] text-slate-400 line-clamp-1 break-words mt-0.5">
                        {reservation.staffName}
                    </p>
                )}
            </button>

            {/* Hover Tooltip */}
            {showTooltip && (
                <div
                    className={`absolute z-[100] left-1/2 -translate-x-1/2 transition-all duration-200 pointer-events-none
            ${tooltipPosition === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}
                >
                    <div className="bg-slate-900 border border-slate-600 rounded-xl shadow-2xl p-3 min-w-[220px] max-w-[280px]">
                        <p className="text-sm font-bold text-white">{reservation.name}</p>
                        <p className="text-xs text-indigo-300 mt-1">
                            {reservation.serviceName || "Sin servicio"}
                        </p>

                        <div className="mt-2 space-y-1.5 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Horario:</span>
                                <span className="font-medium text-white">
                                    {reservation.time} - {endTime}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Duración:</span>
                                <span className="font-medium text-emerald-400">{durationText}</span>
                            </div>
                            {reservation.staffName && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Empleado:</span>
                                    <span className="font-medium text-slate-200">{reservation.staffName}</span>
                                </div>
                            )}
                            {reservation.phone && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Teléfono:</span>
                                    <span className="font-medium text-slate-200">{reservation.phone}</span>
                                </div>
                            )}
                            {reservation.servicePrice && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Precio:</span>
                                    <span className="font-medium text-amber-400">
                                        ${reservation.servicePrice.toLocaleString("es-CO")}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-1 border-t border-slate-700">
                                <span className="text-slate-400">Estado:</span>
                                <span className={`font-medium ${statusColor}`}>
                                    {reservation.status || "Sin estado"}
                                </span>
                            </div>
                        </div>

                        {/* Tooltip arrow */}
                        <div
                            className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 
                border-l-8 border-r-8 border-l-transparent border-r-transparent
                ${tooltipPosition === "top"
                                    ? "top-full border-t-8 border-t-slate-600"
                                    : "bottom-full border-b-8 border-b-slate-600"
                                }`}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export interface CalendarSlotCellProps {
    reservations: CalendarReservation[];
    slotMinutes: number;
    defaultDuration?: number;
    servicesMap?: Map<string, ServiceInfo>;
    onClickReservation?: (reservation: CalendarReservation) => void;
    onClickEmpty?: () => void;
}

/**
 * CalendarSlotCell - Container for multiple reservations in a single time slot
 */
export function CalendarSlotCell({
    reservations,
    slotMinutes,
    defaultDuration = 60,
    servicesMap,
    onClickReservation,
    onClickEmpty,
}: CalendarSlotCellProps) {
    if (reservations.length === 0) {
        return (
            <button
                type="button"
                className="group relative flex h-full w-full items-center justify-center rounded-lg 
          border border-dashed border-white/10 bg-transparent px-2 py-3 text-[11px] text-slate-400 
          hover:border-white/20 hover:bg-white/5 transition"
                onClick={(e) => {
                    e.stopPropagation();
                    onClickEmpty?.();
                }}
            >
                <span className="opacity-0 transition-opacity group-hover:opacity-100 text-indigo-100">
                    + Crear turno
                </span>
            </button>
        );
    }

    return (
        <div className="flex gap-1 items-start">
            {reservations.map((res) => (
                <CalendarReservationBlock
                    key={res._id}
                    reservation={res}
                    slotMinutes={slotMinutes}
                    defaultDuration={defaultDuration}
                    servicesMap={servicesMap}
                    onClick={onClickReservation}
                />
            ))}
        </div>
    );
}

export default CalendarReservationBlock;

