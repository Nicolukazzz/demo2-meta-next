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
    onConfirm: (confirmedPrice: number) => Promise<{ ok: boolean; error?: string }>;
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
    // Price confirmation state - starts with the service price
    const [confirmedPrice, setConfirmedPrice] = useState<number>(reservation.servicePrice || 0);
    const [priceModified, setPriceModified] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        setAction("confirm");
        setError(null);

        const result = await onConfirm(confirmedPrice);
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

    const handlePriceChange = (value: string) => {
        const numValue = parseFloat(value.replace(/[^0-9]/g, "")) || 0;
        setConfirmedPrice(numValue);
        setPriceModified(numValue !== (reservation.servicePrice || 0));
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
                                <div className="col-span-2">
                                    <p className="text-slate-400">Empleado</p>
                                    <p className="text-white font-medium">{reservation.staffName}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Price Confirmation Section */}
                    <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-sm font-medium text-white">💰 Confirmar valor cobrado</p>
                                <p className="text-xs text-slate-400">
                                    {reservation.servicePrice
                                        ? `Precio base: ${formatPrice(reservation.servicePrice)}`
                                        : "Sin precio registrado"}
                                </p>
                            </div>
                            {priceModified && (
                                <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-medium">
                                    Modificado
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-emerald-400">$</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={confirmedPrice.toLocaleString("es-CO")}
                                onChange={(e) => handlePriceChange(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 text-2xl font-bold text-white bg-white/5 border border-white/10 rounded-xl focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-right"
                                placeholder="0"
                            />
                        </div>
                        <p className="mt-2 text-xs text-slate-400 text-center">
                            Ajusta el precio si hubo extras, descuentos o cambios
                        </p>
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
                            ✓ Confirmar servicio por {formatPrice(confirmedPrice)}
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
            <div className="flex items-start gap-3">
                {/* Info Column */}
                <div className="flex-1 min-w-0 space-y-1">
                    {/* Row 1: Name + Badge */}
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-white truncate max-w-[120px]">
                            {reservation.name}
                        </p>
                        {reservation.isOverdue && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/30 text-rose-300 whitespace-nowrap">
                                {formatTimeAgo(reservation.minutesOverdue)}
                            </span>
                        )}
                    </div>
                    {/* Row 2: Service + Time + Price */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className="text-slate-300 truncate max-w-[80px]">{reservation.serviceName}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">{formatTime12h(reservation.time)}</span>
                        {(reservation.servicePrice || 0) > 0 && (
                            <>
                                <span className="text-slate-500">•</span>
                                <span className="text-emerald-400 font-medium">
                                    {formatPrice(reservation.servicePrice || 0)}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Actions Column */}
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={onConfirm}
                        className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors flex items-center justify-center text-sm"
                        title="Confirmar servicio"
                    >
                        ✓
                    </button>
                    <button
                        onClick={onNoShow}
                        className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors flex items-center justify-center text-sm"
                        title="No se presentó"
                    >
                        ✗
                    </button>
                    <button
                        onClick={onView}
                        className="w-8 h-8 rounded-lg bg-white/10 text-slate-400 hover:bg-white/20 transition-colors flex items-center justify-center text-sm"
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
    /** Called after a successful confirm/no-show to sync with parent */
    onConfirmSuccess?: () => void;
    className?: string;
}

export function PendingConfirmationsWidget({
    clientId,
    maxItems = 5,
    onViewReservation,
    onConfirmSuccess,
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
    } = usePendingConfirmations({ clientId, autoRefreshMs: 20000 }); // Faster refresh

    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Price confirmation modal state
    const [priceModal, setPriceModal] = useState<{
        open: boolean;
        reservation: PendingConfirmation | null;
        price: number;
    }>({ open: false, reservation: null, price: 0 });

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Open price confirmation modal
    const handleOpenPriceModal = (reservation: PendingConfirmation) => {
        setPriceModal({
            open: true,
            reservation,
            price: reservation.servicePrice || 0,
        });
    };

    // Confirm with price
    const handleConfirmWithPrice = async () => {
        if (!priceModal.reservation) return;

        setConfirmingId(priceModal.reservation._id);
        const result = await confirmReservation(priceModal.reservation._id, priceModal.price);
        setConfirmingId(null);

        if (result.ok) {
            setPriceModal({ open: false, reservation: null, price: 0 });
            setToast({ type: "success", message: "Servicio confirmado ✓" });
            // Notify parent for immediate sync
            onConfirmSuccess?.();
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
            // Notify parent for immediate sync
            onConfirmSuccess?.();
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
        <>
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
                        <div className="animate-spin w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-sm">Cargando...</p>
                    </div>
                ) : error ? (
                    <div className="py-8 text-center text-rose-300">
                        <p>{error}</p>
                    </div>
                ) : reservations.length === 0 ? (
                    <div className="py-6 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <span className="text-2xl text-emerald-400">✓</span>
                        </div>
                        <p className="text-sm font-medium text-slate-300">Todo al día</p>
                        <p className="text-xs text-slate-500 mt-1">No hay reservas pendientes de confirmar</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {displayedReservations.map((res) => (
                            <PendingConfirmationRow
                                key={res._id}
                                reservation={res}
                                onConfirm={() => handleOpenPriceModal(res)}
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

            {/* Price Confirmation Modal */}
            {priceModal.open && priceModal.reservation && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setPriceModal({ open: false, reservation: null, price: 0 })}
                >
                    <div
                        className="w-full max-w-md mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <NeonCard className="p-6">
                            {/* Header */}
                            <div className="text-center mb-5">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 mb-3">
                                    <span className="text-2xl">💰</span>
                                </div>
                                <h3 className="text-lg font-semibold text-white">Confirmar valor cobrado</h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    {priceModal.reservation.name} • {priceModal.reservation.serviceName}
                                </p>
                            </div>

                            {/* Price Input */}
                            <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-xs text-slate-400">Precio base</p>
                                        <p className="text-base font-semibold text-white">
                                            {formatCurrency(priceModal.reservation.servicePrice || 0)}
                                        </p>
                                    </div>
                                    {priceModal.price !== (priceModal.reservation.servicePrice || 0) && (
                                        <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-medium">
                                            Modificado
                                        </span>
                                    )}
                                </div>

                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-emerald-400">$</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={priceModal.price.toLocaleString("es-CO")}
                                        onChange={(e) => {
                                            const numValue = parseFloat(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                            setPriceModal({ ...priceModal, price: numValue });
                                        }}
                                        className="w-full pl-10 pr-4 py-3 text-2xl font-bold text-white bg-white/5 border border-white/10 rounded-xl focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-right"
                                        placeholder="0"
                                        autoFocus
                                    />
                                </div>
                                <p className="mt-2 text-xs text-slate-400 text-center">
                                    Ajusta si hubo extras o descuentos
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3">
                                <button
                                    onClick={handleConfirmWithPrice}
                                    disabled={confirmingId === priceModal.reservation._id}
                                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                                >
                                    {confirmingId === priceModal.reservation._id
                                        ? "Confirmando..."
                                        : `✓ Confirmar por ${formatCurrency(priceModal.price)}`
                                    }
                                </button>
                                <button
                                    onClick={() => setPriceModal({ open: false, reservation: null, price: 0 })}
                                    className="w-full text-sm text-slate-400 hover:text-white py-2 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </NeonCard>
                    </div>
                </div>
            )}
        </>
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
