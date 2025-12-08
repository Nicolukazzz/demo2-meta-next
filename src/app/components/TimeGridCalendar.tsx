"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { addMinutesToTime } from "@/lib/availability";

// ============================================================================
// TYPES
// ============================================================================

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

export interface TimeGridDayProps {
    date: Date;
    reservations: CalendarReservation[];
    scheduleOpen: string;
    scheduleClose: string;
    slotMinutes: number;
    servicesMap?: Map<string, ServiceInfo>;
    pixelsPerMinute?: number;
    onClickReservation?: (reservation: CalendarReservation) => void;
    onClickSlot?: (time: string) => void;
}

interface PositionedReservation extends CalendarReservation {
    startMinutes: number;
    endMinutes: number;
    durationMins: number;
    column: number;
    totalColumns: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_STYLES: Record<string, string> = {
    Confirmada: "border-emerald-400/50 bg-emerald-500/30 hover:bg-emerald-500/40",
    Pendiente: "border-amber-400/50 bg-amber-500/30 hover:bg-amber-500/40",
    Cancelada: "border-rose-400/50 bg-rose-500/30 hover:bg-rose-500/40",
};

const STATUS_COLORS: Record<string, string> = {
    Confirmada: "text-emerald-400",
    Pendiente: "text-amber-400",
    Cancelada: "text-rose-400",
};

const DEFAULT_PIXELS_PER_MINUTE = 1.5;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + (m || 0);
}

function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60).toString().padStart(2, "0");
    const m = (minutes % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
}

function formatDurationText(minutes: number): string {
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
}

function getEffectiveDuration(
    reservation: CalendarReservation,
    servicesMap?: Map<string, ServiceInfo>,
    defaultDuration = 60
): number {
    if (reservation.durationMinutes && reservation.durationMinutes > 0) {
        return reservation.durationMinutes;
    }
    if (reservation.serviceId && servicesMap) {
        const service = servicesMap.get(reservation.serviceId);
        if (service?.durationMinutes && service.durationMinutes > 0) {
            return service.durationMinutes;
        }
    }
    return defaultDuration;
}

/**
 * Calculate column assignments for overlapping reservations
 * Returns reservations with column and totalColumns properties
 */
function calculateColumns(reservations: PositionedReservation[]): PositionedReservation[] {
    if (reservations.length === 0) return [];

    // Sort by start time, then by duration (longer first)
    const sorted = [...reservations].sort((a, b) => {
        if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
        return b.durationMins - a.durationMins;
    });

    // Find overlapping groups
    const groups: PositionedReservation[][] = [];
    let currentGroup: PositionedReservation[] = [];
    let groupEnd = 0;

    for (const res of sorted) {
        if (currentGroup.length === 0 || res.startMinutes < groupEnd) {
            // Add to current group
            currentGroup.push(res);
            groupEnd = Math.max(groupEnd, res.endMinutes);
        } else {
            // Start new group
            if (currentGroup.length > 0) groups.push(currentGroup);
            currentGroup = [res];
            groupEnd = res.endMinutes;
        }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    // Assign columns within each group
    const result: PositionedReservation[] = [];

    for (const group of groups) {
        const columns: PositionedReservation[][] = [];

        for (const res of group) {
            // Find first column where this reservation fits
            let placed = false;
            for (let col = 0; col < columns.length; col++) {
                const lastInCol = columns[col][columns[col].length - 1];
                if (res.startMinutes >= lastInCol.endMinutes) {
                    columns[col].push(res);
                    res.column = col;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                res.column = columns.length;
                columns.push([res]);
            }
        }

        // Set total columns for all in group
        const totalCols = columns.length;
        for (const col of columns) {
            for (const res of col) {
                res.totalColumns = totalCols;
                result.push(res);
            }
        }
    }

    return result;
}

// ============================================================================
// TOOLTIP COMPONENT (Fixed Position)
// ============================================================================

interface TooltipCoords {
    x: number;
    y: number;
    position: "top" | "bottom" | "left" | "right";
}

interface ReservationTooltipProps {
    reservation: CalendarReservation;
    endTime: string;
    durationText: string;
    coords: TooltipCoords;
}

function ReservationTooltip({ reservation, endTime, durationText, coords }: ReservationTooltipProps) {
    const statusColor = STATUS_COLORS[reservation.status ?? ""] ?? "text-slate-300";

    // Calculate transform based on position
    const getTransform = () => {
        switch (coords.position) {
            case "top":
                return "translate(-50%, -100%) translateY(-8px)";
            case "bottom":
                return "translate(-50%, 0) translateY(8px)";
            case "left":
                return "translate(-100%, -50%) translateX(-8px)";
            case "right":
                return "translate(0, -50%) translateX(8px)";
        }
    };

    return (
        <div
            className="fixed z-[9999] pointer-events-none"
            style={{
                left: coords.x,
                top: coords.y,
                transform: getTransform(),
            }}
        >
            <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-3 min-w-[220px] max-w-[300px]">
                <p className="text-sm font-bold text-white">{reservation.name}</p>
                <p className="text-xs text-indigo-300 mt-1">{reservation.serviceName || "Sin servicio"}</p>

                <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-400">Horario:</span>
                        <span className="font-medium text-white">{reservation.time} - {endTime}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-400">Duración:</span>
                        <span className="font-medium text-emerald-400">{durationText}</span>
                    </div>
                    {reservation.staffName && (
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-slate-400">Empleado:</span>
                            <span className="font-medium text-slate-200">{reservation.staffName}</span>
                        </div>
                    )}
                    {reservation.phone && (
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-slate-400">Teléfono:</span>
                            <span className="font-medium text-slate-200">{reservation.phone}</span>
                        </div>
                    )}
                    {reservation.servicePrice && (
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-slate-400">Precio:</span>
                            <span className="font-medium text-amber-400">
                                ${reservation.servicePrice.toLocaleString("es-CO")}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-1 border-t border-slate-700 gap-4">
                        <span className="text-slate-400">Estado:</span>
                        <span className={`font-medium ${statusColor}`}>
                            {reservation.status || "Sin estado"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// RESERVATION BLOCK COMPONENT
// ============================================================================

interface TimeGridReservationBlockProps {
    reservation: PositionedReservation;
    pixelsPerMinute: number;
    scheduleStartMinutes: number;
    servicesMap?: Map<string, ServiceInfo>;
    onClick?: (reservation: CalendarReservation) => void;
}

function TimeGridReservationBlock({
    reservation,
    pixelsPerMinute,
    scheduleStartMinutes,
    servicesMap,
    onClick,
}: TimeGridReservationBlockProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipCoords, setTooltipCoords] = useState<TooltipCoords>({ x: 0, y: 0, position: "right" });
    const blockRef = useRef<HTMLButtonElement>(null);

    const duration = getEffectiveDuration(reservation, servicesMap, 60);
    const endTime = reservation.endTime || addMinutesToTime(reservation.time, duration);
    const durationText = formatDurationText(duration);

    // Calculate position and size
    const top = (reservation.startMinutes - scheduleStartMinutes) * pixelsPerMinute;
    const height = Math.max(reservation.durationMins * pixelsPerMinute, 24);
    const widthPercent = 100 / reservation.totalColumns;
    const leftPercent = reservation.column * widthPercent;

    // Calculate tooltip coordinates on mouse enter
    const handleMouseEnter = () => {
        if (blockRef.current) {
            const rect = blockRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let position: "top" | "bottom" | "left" | "right" = "right";
            let x = rect.right;
            let y = rect.top + rect.height / 2;

            // Prefer right, then left, then bottom, then top
            if (rect.right + 260 < viewportWidth) {
                position = "right";
                x = rect.right;
                y = rect.top + rect.height / 2;
            } else if (rect.left > 260) {
                position = "left";
                x = rect.left;
                y = rect.top + rect.height / 2;
            } else if (rect.bottom + 220 < viewportHeight) {
                position = "bottom";
                x = rect.left + rect.width / 2;
                y = rect.bottom;
            } else {
                position = "top";
                x = rect.left + rect.width / 2;
                y = rect.top;
            }

            setTooltipCoords({ x, y, position });
        }
        setShowTooltip(true);
    };

    const statusStyle = STATUS_STYLES[reservation.status ?? ""] ?? "border-white/20 bg-white/10";
    const isCompact = height < 60;

    return (
        <>
            <button
                ref={blockRef}
                type="button"
                className={`absolute rounded-lg border-l-4 px-2 py-1 text-left transition-all shadow-md
          cursor-pointer overflow-hidden ${statusStyle}`}
                style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    left: `calc(${leftPercent}% + 2px)`,
                    width: `calc(${widthPercent}% - 4px)`,
                    minHeight: "24px",
                    zIndex: 10,
                }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(reservation);
                }}
            >
                {isCompact ? (
                    <p className="text-xs font-semibold text-white truncate">{reservation.name}</p>
                ) : (
                    <>
                        <p className="text-sm font-semibold text-white truncate">{reservation.name}</p>
                        <p className="text-[11px] text-slate-200 truncate">{reservation.serviceName}</p>
                        <p className="text-[10px] text-slate-300">{reservation.time} - {endTime}</p>
                        {height > 80 && reservation.staffName && (
                            <p className="text-[10px] text-slate-400 truncate">{reservation.staffName}</p>
                        )}
                    </>
                )}
            </button>

            {showTooltip && typeof document !== "undefined" && createPortal(
                <ReservationTooltip
                    reservation={reservation}
                    endTime={endTime}
                    durationText={durationText}
                    coords={tooltipCoords}
                />,
                document.body
            )}
        </>
    );
}

// ============================================================================
// TIME GRID DAY COMPONENT
// ============================================================================

export function TimeGridDay({
    date,
    reservations,
    scheduleOpen,
    scheduleClose,
    slotMinutes,
    servicesMap,
    pixelsPerMinute = DEFAULT_PIXELS_PER_MINUTE,
    onClickReservation,
    onClickSlot,
}: TimeGridDayProps) {
    const scheduleStartMinutes = timeToMinutes(scheduleOpen);
    const scheduleEndMinutes = timeToMinutes(scheduleClose);
    const totalMinutes = scheduleEndMinutes - scheduleStartMinutes;
    const containerHeight = totalMinutes * pixelsPerMinute;

    // Generate time slots for labels
    const timeSlots = useMemo(() => {
        const slots: string[] = [];
        for (let t = scheduleStartMinutes; t <= scheduleEndMinutes; t += slotMinutes) {
            slots.push(minutesToTime(t));
        }
        return slots;
    }, [scheduleStartMinutes, scheduleEndMinutes, slotMinutes]);

    // Process reservations with positions and columns
    const positionedReservations = useMemo(() => {
        const processed: PositionedReservation[] = reservations.map((res) => {
            const duration = getEffectiveDuration(res, servicesMap, slotMinutes);
            const startMins = timeToMinutes(res.time);
            const endMins = res.endTime ? timeToMinutes(res.endTime) : startMins + duration;

            return {
                ...res,
                startMinutes: startMins,
                endMinutes: endMins,
                durationMins: endMins - startMins,
                column: 0,
                totalColumns: 1,
            };
        });

        return calculateColumns(processed);
    }, [reservations, servicesMap, slotMinutes]);

    const handleSlotClick = (time: string) => {
        onClickSlot?.(time);
    };

    return (
        <div className="flex relative">
            {/* Time labels column */}
            <div className="w-16 flex-shrink-0 border-r border-white/10">
                {timeSlots.map((time, idx) => (
                    <div
                        key={time}
                        className="text-[11px] text-slate-400 text-right pr-2 font-medium"
                        style={{ height: `${slotMinutes * pixelsPerMinute}px` }}
                    >
                        {time}
                    </div>
                ))}
            </div>

            {/* Reservations area */}
            <div
                className="flex-1 relative"
                style={{ height: `${containerHeight}px` }}
            >
                {/* Grid lines */}
                {timeSlots.map((time, idx) => (
                    <div
                        key={time}
                        className="absolute left-0 right-0 border-t border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                        style={{
                            top: `${idx * slotMinutes * pixelsPerMinute}px`,
                            height: `${slotMinutes * pixelsPerMinute}px`,
                        }}
                        onClick={() => handleSlotClick(time)}
                    />
                ))}

                {/* Reservation blocks */}
                {positionedReservations.map((res) => (
                    <TimeGridReservationBlock
                        key={res._id}
                        reservation={res}
                        pixelsPerMinute={pixelsPerMinute}
                        scheduleStartMinutes={scheduleStartMinutes}
                        servicesMap={servicesMap}
                        onClick={onClickReservation}
                    />
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// TIME GRID CALENDAR (WEEKLY VIEW) 
// ============================================================================

export interface TimeGridCalendarProps {
    weekDays: Date[];
    reservationsByDate: Record<string, CalendarReservation[]>;
    scheduleOpen: string;
    scheduleClose: string;
    slotMinutes: number;
    servicesMap?: Map<string, ServiceInfo>;
    selectedDate?: Date;
    pixelsPerMinute?: number;
    closedDays?: Set<string>; // Set of dateKeys (YYYY-MM-DD) that are closed
    onClickReservation?: (reservation: CalendarReservation) => void;
    onClickSlot?: (date: Date, time: string) => void;
    onClickDay?: (date: Date) => void;
}

function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function TimeGridCalendar({
    weekDays,
    reservationsByDate,
    scheduleOpen,
    scheduleClose,
    slotMinutes,
    servicesMap,
    selectedDate,
    pixelsPerMinute = DEFAULT_PIXELS_PER_MINUTE,
    closedDays,
    onClickReservation,
    onClickSlot,
    onClickDay,
}: TimeGridCalendarProps) {
    const scheduleStartMinutes = timeToMinutes(scheduleOpen);
    const scheduleEndMinutes = timeToMinutes(scheduleClose);
    const totalMinutes = scheduleEndMinutes - scheduleStartMinutes;
    const containerHeight = totalMinutes * pixelsPerMinute;

    // Generate time slots (up to but NOT including closing time - last slot is the last bookable hour)
    const timeSlots = useMemo(() => {
        const slots: string[] = [];
        for (let t = scheduleStartMinutes; t < scheduleEndMinutes; t += slotMinutes) {
            slots.push(minutesToTime(t));
        }
        return slots;
    }, [scheduleStartMinutes, scheduleEndMinutes, slotMinutes]);

    const selectedKey = selectedDate ? formatDateKey(selectedDate) : "";
    const todayKey = formatDateKey(new Date());

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            {/* Header with day names */}
            <div className="grid border-b border-white/10 bg-white/5"
                style={{ gridTemplateColumns: `4rem repeat(${weekDays.length}, 1fr)` }}>
                <div className="px-2 py-3 text-xs font-semibold text-slate-400 text-center">Hora</div>
                {weekDays.map((day) => {
                    const key = formatDateKey(day);
                    const isSelected = key === selectedKey;
                    return (
                        <button
                            key={key}
                            type="button"
                            className={`px-2 py-3 text-center transition-colors ${isSelected ? "bg-indigo-500/20" : "hover:bg-white/5"
                                }`}
                            onClick={() => onClickDay?.(day)}
                        >
                            <span className={`block text-xs font-semibold uppercase ${isSelected ? "text-indigo-300" : "text-slate-300"
                                }`}>
                                {day.toLocaleDateString("es-ES", { weekday: "short" })}
                            </span>
                            <span className={`block text-[11px] ${isSelected ? "text-indigo-200" : "text-slate-400"
                                }`}>
                                {day.getDate()}/{day.getMonth() + 1}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Time grid body */}
            <div className="flex overflow-x-auto overflow-y-visible">
                {/* Time labels */}
                <div className="w-16 flex-shrink-0 border-r border-white/10">
                    {timeSlots.map((time) => (
                        <div
                            key={time}
                            className="text-[11px] text-slate-400 text-right pr-2 font-medium border-b border-white/5"
                            style={{ height: `${slotMinutes * pixelsPerMinute}px` }}
                        >
                            {time}
                        </div>
                    ))}
                </div>

                {/* Day columns */}
                {weekDays.map((day) => {
                    const key = formatDateKey(day);
                    const dayReservations = reservationsByDate[key] ?? [];
                    const isToday = key === todayKey;
                    const isClosed = closedDays?.has(key) ?? false;

                    // Process reservations with positions
                    const positioned: PositionedReservation[] = dayReservations.map((res) => {
                        const duration = getEffectiveDuration(res, servicesMap, slotMinutes);
                        const startMins = timeToMinutes(res.time);
                        const endMins = res.endTime ? timeToMinutes(res.endTime) : startMins + duration;

                        return {
                            ...res,
                            startMinutes: startMins,
                            endMinutes: endMins,
                            durationMins: endMins - startMins,
                            column: 0,
                            totalColumns: 1,
                        };
                    });

                    const withColumns = calculateColumns(positioned);

                    return (
                        <div
                            key={key}
                            className={`flex-1 min-w-[120px] border-r border-white/10 relative ${isClosed ? "bg-slate-900/50" : ""}`}
                            style={{ height: `${containerHeight}px` }}
                            onClick={() => !isClosed && onClickDay?.(day)}
                        >
                            {/* Today highlight - rendered behind everything */}
                            {isToday && !isClosed && (
                                <div
                                    className="absolute left-0 right-0 top-0 bg-indigo-500/[0.04] pointer-events-none"
                                    style={{ zIndex: 0, height: `${containerHeight}px` }}
                                />
                            )}

                            {/* Closed day overlay */}
                            {isClosed && (
                                <div
                                    className="absolute inset-0 flex items-center justify-center bg-slate-900/60 pointer-events-none"
                                    style={{ zIndex: 10 }}
                                >
                                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                                        Cerrado
                                    </span>
                                </div>
                            )}

                            {/* Grid lines for each slot - only if not closed */}
                            {!isClosed && timeSlots.map((time, idx) => (
                                <div
                                    key={time}
                                    className="absolute left-0 right-0 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                                    style={{
                                        top: `${idx * slotMinutes * pixelsPerMinute}px`,
                                        height: `${slotMinutes * pixelsPerMinute}px`,
                                        zIndex: 1,
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClickSlot?.(day, time);
                                    }}
                                />
                            ))}

                            {/* Reservation blocks - only if not closed */}
                            {!isClosed && withColumns.map((res) => (
                                <TimeGridReservationBlock
                                    key={res._id}
                                    reservation={res}
                                    pixelsPerMinute={pixelsPerMinute}
                                    scheduleStartMinutes={scheduleStartMinutes}
                                    servicesMap={servicesMap}
                                    onClick={onClickReservation}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default TimeGridCalendar;
