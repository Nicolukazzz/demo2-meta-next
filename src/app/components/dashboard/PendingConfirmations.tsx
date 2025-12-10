"use client";

import React, { useState, useEffect } from "react";
import NeonCard from "@/app/components/NeonCard";
import { Button } from "@/app/components/ui/FormLayout";
import { formatTime12h, formatTimeRange12h } from "@/lib/dateFormat";
import {
    PendingConfirmation,
    ConfirmationStats,
    usePendingConfirmations,
    useServiceEndNotification
} from "@/app/hooks/usePendingConfirmations";

// ============================================================================
// SERVICE CONFIRMATION MODAL
// Popup that appears when a service ends
// ============================================================================

interface ServiceConfirmationModalProps {
    reservation: PendingConfirmation;
    onConfirm: () => Promise<{ ok: boolean; error?: string }>;
    onNoShow: (reason?: string) => Promise<{ ok: boolean; error?: string }>;
    onDismiss: () => void;
}

export function ServiceConfirmationModal({
    reservation,
    onConfirm,
    onNoShow,
    onDismiss,
}: ServiceConfirmationModalProps) {
    const [loading, setLoading] = useState(false);
    const [action, setAction] = useState<"confirm" | "noshow" | null>(null);
    const [noShowReason, setNoShowReason] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setLoading(true);
        setAction("confirm");
        setError(null);

        const result = await onConfirm();
        setLoading(false);

        if (!result.ok) {
            setError(result.error || "Error al confirmar");
        }
    };

    const handleNoShow = async () => {
        setLoading(true);
        setAction("noshow");
        setError(null);

        const result = await onNoShow(noShowReason || "No se presentó el cliente");
        setLoading(false);

        if (!result.ok) {
            setError(result.error || "Error al marcar no-show");
        }
    };

    const formatPrice = (price: number) =>
        new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
        }).format(price);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md mx-4 animate-slideUp">
                <NeonCard className="p-6 border-indigo-500/30">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
                            <span className="text-3xl">⏰</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">¿Servicio completado?</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            El horario de este servicio ha terminado
                        </p>
                    </div>

                    {/* Reservation details */}
                    <div className="bg-white/5 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/30 flex items-center justify-center">
                                <span className="text-lg font-bold text-white">
                                    {reservation.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <p className="font-semibold text-white">{reservation.name}</p>
                                <p className="text-xs text-slate-400">{reservation.phone}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-slate-400">Servicio</p>
                                <p className="text-white font-medium">{reservation.serviceName}</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Horario</p>
                                <p className="text-white font-medium">
                                    {formatTimeRange12h(reservation.time, reservation.endTime)}
                                </p>
                            </div>
                            {reservation.staffName && (
                                <div>
                                    <p className="text-slate-400">Empleado</p>
                                    <p className="text-white font-medium">{reservation.staffName}</p>
                                </div>
                            )}
                            {reservation.servicePrice && (
                                <div>
                                    <p className="text-slate-400">Precio</p>
                                    <p className="text-emerald-400 font-bold">
                                        {formatPrice(reservation.servicePrice)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/30">
                            <p className="text-sm text-rose-300">{error}</p>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="space-y-3">
                        <Button
                            onClick={handleConfirm}
                            isLoading={loading && action === "confirm"}
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-600"
                        >
                            ✓ Sí, servicio completado
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={handleNoShow}
                            isLoading={loading && action === "noshow"}
                            disabled={loading}
                            className="w-full bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/30 text-rose-300"
                        >
                            ✗ No se presentó el cliente
                        </Button>

                        <button
                            onClick={onDismiss}
                            disabled={loading}
                            className="w-full text-sm text-slate-400 hover:text-white py-2 transition-colors"
                        >
                            Decidir después
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 text-center mt-4">
                        Si no confirmas, quedará como pendiente para revisar después
                    </p>
                </NeonCard>
            </div>
        </div>
    );
}

// ============================================================================
// PENDING CONFIRMATION ROW
// Individual row in the pending list
// ============================================================================

interface PendingConfirmationRowProps {
    reservation: PendingConfirmation;
    onConfirm: () => void;
    onNoShow: () => void;
    onView: () => void;
}

function PendingConfirmationRow({
    reservation,
    onConfirm,
    onNoShow,
    onView,
}: PendingConfirmationRowProps) {
    const priorityStyles = {
        urgent: "border-l-rose-500 bg-rose-500/10",
        normal: "border-l-amber-500 bg-amber-500/10",
        low: "border-l-slate-500 bg-white/5",
    };

    const formatTimeAgo = (minutes: number) => {
        if (minutes < 60) return `hace ${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours}h`;
        const days = Math.floor(hours / 24);
        return `hace ${days}d`;
    };

    const formatPrice = (price: number) =>
        new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
        }).format(price);

    return (
        <div
            className={`border-l-4 rounded-r-lg p-3 transition-all hover:bg-white/5 ${priorityStyles[reservation.priority]}`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-white truncate">{reservation.name}</p>
                        {reservation.isOverdue && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/30 text-rose-300">
                                {formatTimeAgo(reservation.minutesOverdue)}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                        {reservation.serviceName} • {formatTime12h(reservation.time)}
                    </p>
                    {reservation.servicePrice && (
                        <p className="text-xs text-emerald-400 font-medium">
                            {formatPrice(reservation.servicePrice)}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onConfirm}
                        className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                        title="Confirmar servicio"
                    >
                        ✓
                    </button>
                    <button
                        onClick={onNoShow}
                        className="p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                        title="No se presentó"
                    >
                        ✗
                    </button>
                    <button
                        onClick={onView}
                        className="p-2 rounded-lg bg-white/10 text-slate-400 hover:bg-white/20 transition-colors"
                        title="Ver detalles"
                    >
                        →
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// PENDING CONFIRMATIONS WIDGET
// Shows all reservations awaiting confirmation
// ============================================================================

interface PendingConfirmationsWidgetProps {
    clientId: string;
    maxItems?: number;
    onViewReservation?: (reservation: PendingConfirmation) => void;
    className?: string;
}

export function PendingConfirmationsWidget({
    clientId,
    maxItems = 5,
    onViewReservation,
    className = "",
}: PendingConfirmationsWidgetProps) {
    const {
        reservations,
        stats,
        loading,
        error,
        confirmReservation,
        markNoShow,
        refresh,
    } = usePendingConfirmations({ clientId });

    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleQuickConfirm = async (id: string) => {
        setConfirmingId(id);
        const result = await confirmReservation(id);
        setConfirmingId(null);

        if (result.ok) {
            setToast({ type: "success", message: "Servicio confirmado ✓" });
        } else {
            setToast({ type: "error", message: result.error || "Error" });
        }
    };

    const handleQuickNoShow = async (id: string) => {
        setConfirmingId(id);
        const result = await markNoShow(id);
        setConfirmingId(null);

        if (result.ok) {
            setToast({ type: "success", message: "Marcado como no-show" });
        } else {
            setToast({ type: "error", message: result.error || "Error" });
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
        }).format(value);

    const displayedReservations = reservations.slice(0, maxItems);
    const hasMore = reservations.length > maxItems;

    return (
        <NeonCard className={`p-5 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        ⏳ Pendientes de confirmar
                        {stats.overdue > 0 && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500 text-white animate-pulse">
                                {stats.overdue} vencidos
                            </span>
                        )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {stats.totalPending} reservas por confirmar
                        {stats.expectedRevenue > 0 && (
                            <span className="text-emerald-400 ml-2">
                                • {formatCurrency(stats.expectedRevenue)} esperado
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={refresh}
                    className="p-2 rounded-lg bg-white/10 text-slate-400 hover:bg-white/20 transition-colors"
                    title="Actualizar"
                >
                    ↻
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="py-8 text-center text-slate-400">
                    <p>Cargando...</p>
                </div>
            ) : error ? (
                <div className="py-8 text-center text-rose-300">
                    <p>{error}</p>
                </div>
            ) : reservations.length === 0 ? (
                <div className="py-8 text-center">
                    <span className="text-4xl opacity-50">✓</span>
                    <p className="text-slate-400 mt-2">Todo al día</p>
                    <p className="text-xs text-slate-500">No hay reservas pendientes de confirmar</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {displayedReservations.map((res) => (
                        <PendingConfirmationRow
                            key={res._id}
                            reservation={res}
                            onConfirm={() => handleQuickConfirm(res._id)}
                            onNoShow={() => handleQuickNoShow(res._id)}
                            onView={() => onViewReservation?.(res)}
                        />
                    ))}

                    {hasMore && (
                        <button
                            className="w-full py-2 text-sm text-indigo-300 hover:text-indigo-200 transition-colors"
                            onClick={() => {/* Navigate to full list */ }}
                        >
                            Ver {reservations.length - maxItems} más →
                        </button>
                    )}
                </div>
            )}

            {/* Stats footer */}
            {stats.totalPending > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                        {stats.todayPending} de hoy
                    </span>
                    <span className="text-emerald-400 font-medium">
                        {formatCurrency(stats.expectedRevenue)} por cobrar
                    </span>
                </div>
            )}

            {/* Toast notification */}
            {toast && (
                <div
                    className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-slideUp ${toast.type === "success"
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                        }`}
                >
                    {toast.message}
                </div>
            )}
        </NeonCard>
    );
}

// ============================================================================
// SERVICE END NOTIFICATION WRAPPER
// Wraps the app and shows modals when services end
// ============================================================================

interface ServiceEndNotificationProviderProps {
    clientId: string;
    children: React.ReactNode;
}

export function ServiceEndNotificationProvider({
    clientId,
    children,
}: ServiceEndNotificationProviderProps) {
    const {
        activeNotification,
        handleConfirm,
        handleNoShow,
        dismissNotification,
    } = useServiceEndNotification({ clientId });

    return (
        <>
            {children}

            {activeNotification && (
                <ServiceConfirmationModal
                    reservation={activeNotification}
                    onConfirm={handleConfirm}
                    onNoShow={handleNoShow}
                    onDismiss={dismissNotification}
                />
            )}
        </>
    );
}

// ============================================================================
// COMPACT STATS CARD
// Small card showing pending confirmation stats
// ============================================================================

interface PendingStatsCardProps {
    stats: ConfirmationStats;
    onClick?: () => void;
}

export function PendingStatsCard({ stats, onClick }: PendingStatsCardProps) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
        }).format(value);

    return (
        <button
            onClick={onClick}
            className={`w-full p-4 rounded-xl text-left transition-all ${stats.overdue > 0
                ? "bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/30 hover:border-rose-400/50"
                : "bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 hover:border-amber-400/50"
                }`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Pendientes</p>
                    <p className="text-2xl font-bold text-white mt-1">{stats.totalPending}</p>
                    {stats.overdue > 0 && (
                        <p className="text-xs text-rose-300 mt-0.5">
                            ⚠️ {stats.overdue} vencidos
                        </p>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400">Por cobrar</p>
                    <p className="text-lg font-semibold text-emerald-400">
                        {formatCurrency(stats.expectedRevenue)}
                    </p>
                </div>
            </div>
        </button>
    );
}
