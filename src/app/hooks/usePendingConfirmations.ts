"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ============================================================================
// TYPES
// ============================================================================

export type ReservationStatus = "Pendiente" | "Confirmada" | "Cancelada" | "NoShow";

export interface PendingConfirmation {
    _id: string;
    dateId: string;
    time: string;
    endTime: string;
    name: string;
    phone?: string;
    serviceName: string;
    servicePrice?: number;
    staffName?: string;
    staffId?: string;
    status: ReservationStatus;
    createdAt: string;
    // Calculated fields
    isOverdue: boolean;      // Service time has passed
    minutesOverdue: number;  // How many minutes since service ended
    priority: "urgent" | "normal" | "low";
}

export interface ConfirmationStats {
    totalPending: number;
    overdue: number;
    todayPending: number;
    expectedRevenue: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function parseDateTime(dateId: string, time: string): Date {
    const [year, month, day] = dateId.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute);
}

function getMinutesDiff(date1: Date, date2: Date): number {
    return Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60));
}

function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// ============================================================================
// HOOK: usePendingConfirmations
// Tracks reservations that need owner confirmation
// ============================================================================

interface UsePendingConfirmationsOptions {
    clientId: string;
    autoRefreshMs?: number;
    onNewOverdue?: (reservation: PendingConfirmation) => void;
}

export function usePendingConfirmations({
    clientId,
    autoRefreshMs = 30000, // Check every 30 seconds for faster updates
    onNewOverdue,
}: UsePendingConfirmationsOptions) {
    const [reservations, setReservations] = useState<PendingConfirmation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const lastCheckedRef = useRef<Date | null>(null);
    const onNewOverdueRef = useRef(onNewOverdue);

    // Keep ref updated
    useEffect(() => {
        onNewOverdueRef.current = onNewOverdue;
    }, [onNewOverdue]);

    // Fetch pending reservations
    const fetchPending = useCallback(async () => {
        if (!clientId) return;

        try {
            const res = await fetch(`/api/reservations?clientId=${clientId}&status=Pendiente`);
            const body = await res.json();

            if (!res.ok || !body.ok) {
                throw new Error(body.error || "Error fetching reservations");
            }

            const now = new Date();

            // Process reservations to determine overdue status
            const processed: PendingConfirmation[] = body.data.map((r: any) => {
                const endDateTime = parseDateTime(r.dateId, r.endTime || r.time);
                const isOverdue = now > endDateTime;
                const minutesOverdue = isOverdue ? getMinutesDiff(now, endDateTime) : 0;

                // Priority based on how overdue
                let priority: "urgent" | "normal" | "low" = "low";
                if (isOverdue) {
                    if (minutesOverdue > 60) priority = "urgent"; // More than 1 hour
                    else priority = "normal";
                }

                return {
                    _id: r._id,
                    dateId: r.dateId,
                    time: r.time,
                    endTime: r.endTime || r.time,
                    name: r.name,
                    phone: r.phone,
                    serviceName: r.serviceName,
                    servicePrice: r.servicePrice,
                    staffName: r.staffName,
                    staffId: r.staffId,
                    status: r.status,
                    createdAt: r.createdAt,
                    isOverdue,
                    minutesOverdue,
                    priority,
                };
            });

            // Sort: overdue first, then by priority, then by time
            processed.sort((a, b) => {
                if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
                if (a.priority !== b.priority) {
                    const priorityOrder = { urgent: 0, normal: 1, low: 2 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                }
                return parseDateTime(a.dateId, a.time).getTime() - parseDateTime(b.dateId, b.time).getTime();
            });

            // Check for newly overdue reservations
            if (onNewOverdueRef.current && lastCheckedRef.current) {
                const newlyOverdue = processed.filter(r => {
                    const endDateTime = parseDateTime(r.dateId, r.endTime);
                    return endDateTime > lastCheckedRef.current! && now > endDateTime;
                });
                newlyOverdue.forEach(r => onNewOverdueRef.current?.(r));
            }

            setReservations(processed);
            lastCheckedRef.current = now;
            setError(null);
        } catch (err: any) {
            setError(err?.message || "Error cargando reservas pendientes");
        } finally {
            setLoading(false);
        }
    }, [clientId]); // Only clientId as dependency to avoid loops

    // Initial fetch
    useEffect(() => {
        fetchPending();
    }, [fetchPending]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefreshMs) return;

        const interval = setInterval(fetchPending, autoRefreshMs);
        return () => clearInterval(interval);
    }, [autoRefreshMs, fetchPending]);

    // Calculate stats
    const stats: ConfirmationStats = useMemo(() => {
        const now = new Date();
        const todayKey = formatDateKey(now);

        return {
            totalPending: reservations.length,
            overdue: reservations.filter(r => r.isOverdue).length,
            todayPending: reservations.filter(r => r.dateId === todayKey).length,
            expectedRevenue: reservations
                .filter(r => r.servicePrice)
                .reduce((sum, r) => sum + (r.servicePrice || 0), 0),
        };
    }, [reservations]);

    // Overdue reservations (services already happened)
    const overdueReservations = useMemo(() =>
        reservations.filter(r => r.isOverdue),
        [reservations]);

    // Upcoming reservations (services not yet happened)
    const upcomingReservations = useMemo(() =>
        reservations.filter(r => !r.isOverdue),
        [reservations]);

    // Confirm a reservation with optional final price adjustment
    const confirmReservation = useCallback(async (id: string, confirmedPrice?: number) => {
        try {
            const res = await fetch("/api/reservations", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    clientId,
                    status: "Confirmada",
                    // If confirmedPrice is provided, update the service price
                    ...(confirmedPrice !== undefined && { confirmedPrice }),
                }),
            });
            const body = await res.json();

            if (!res.ok || !body.ok) {
                throw new Error(body.error || "Error confirmando reserva");
            }

            // Update local state
            setReservations(prev => prev.filter(r => r._id !== id));
            return { ok: true, data: body.data };
        } catch (err: any) {
            return { ok: false, error: err?.message };
        }
    }, [clientId]);

    // Mark as no-show (client didn't come)
    const markNoShow = useCallback(async (id: string, reason?: string) => {
        try {
            const res = await fetch("/api/reservations", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    clientId,
                    status: "Cancelada",
                    action: "cancel",
                    cancelReason: reason || "No se presentó el cliente",
                }),
            });
            const body = await res.json();

            if (!res.ok || !body.ok) {
                throw new Error(body.error || "Error marcando no-show");
            }

            // Update local state
            setReservations(prev => prev.filter(r => r._id !== id));
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err?.message };
        }
    }, [clientId]);

    return {
        reservations,
        overdueReservations,
        upcomingReservations,
        stats,
        loading,
        error,
        refresh: fetchPending,
        confirmReservation,
        markNoShow,
    };
}

// ============================================================================
// HOOK: useServiceEndNotification
// Triggers notifications when a service ends
// ============================================================================

interface UseServiceEndNotificationOptions {
    clientId: string;
    checkIntervalMs?: number;
    onServiceEnd?: (reservation: PendingConfirmation) => void;
}

export function useServiceEndNotification({
    clientId,
    checkIntervalMs = 30000, // Check every 30 seconds
    onServiceEnd,
}: UseServiceEndNotificationOptions) {
    const [activeNotification, setActiveNotification] = useState<PendingConfirmation | null>(null);
    const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());

    const { overdueReservations, confirmReservation, markNoShow, refresh } = usePendingConfirmations({
        clientId,
        autoRefreshMs: checkIntervalMs,
    });

    // Check for newly ended services
    useEffect(() => {
        const now = new Date();

        for (const reservation of overdueReservations) {
            // Only notify if not already notified and service just ended (within last 5 min)
            if (!notifiedIds.has(reservation._id) && reservation.minutesOverdue <= 5) {
                setNotifiedIds(prev => new Set([...prev, reservation._id]));
                setActiveNotification(reservation);
                onServiceEnd?.(reservation);
                break; // Only show one notification at a time
            }
        }
    }, [overdueReservations, notifiedIds, onServiceEnd]);

    // Handle confirmation with optional price adjustment
    const handleConfirm = useCallback(async (confirmedPrice?: number) => {
        if (!activeNotification) return { ok: false };

        const result = await confirmReservation(activeNotification._id, confirmedPrice);
        if (result.ok) {
            setActiveNotification(null);
            refresh();
        }
        return result;
    }, [activeNotification, confirmReservation, refresh]);

    // Handle no-show
    const handleNoShow = useCallback(async (reason?: string) => {
        if (!activeNotification) return { ok: false };

        const result = await markNoShow(activeNotification._id, reason);
        if (result.ok) {
            setActiveNotification(null);
            refresh();
        }
        return result;
    }, [activeNotification, markNoShow, refresh]);

    // Dismiss notification (will stay as pending)
    const dismissNotification = useCallback(() => {
        setActiveNotification(null);
    }, []);

    return {
        activeNotification,
        handleConfirm,
        handleNoShow,
        dismissNotification,
        overdueReservations,
    };
}
