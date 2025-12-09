"use client";

import React, { useState } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface Reservation {
    _id: string;
    dateId: string;
    time: string;
    endTime?: string;
    durationMinutes?: number;
    name: string;
    phone: string;
    serviceName: string;
    servicePrice?: number;
    staffName?: string;
    status: string;
    cancelledAt?: string;
    cancelReason?: string;
    rescheduledFrom?: {
        dateId: string;
        time: string;
        rescheduledAt: string;
    };
}

// ============================================================================
// HELPERS
// ============================================================================

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function formatDate(dateId: string): string {
    const [year, month, day] = dateId.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekday = WEEKDAYS[date.getDay()];
    return `${weekday} ${day} de ${MONTHS[month - 1]}`;
}

function formatTime(time: string): string {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
    }).format(price);
}

function isPastReservation(dateId: string, time: string): boolean {
    const [year, month, day] = dateId.split("-").map(Number);
    const [h, m] = time.split(":").map(Number);
    const reservationDate = new Date(year, month - 1, day, h, m);
    return reservationDate < new Date();
}

// ============================================================================
// RESERVATION CARD COMPONENT - Mobile Optimized
// ============================================================================

function ReservationCard({
    reservation,
    primaryColor,
    onCancel,
    onReschedule,
}: {
    reservation: Reservation;
    primaryColor: string;
    onCancel: (r: Reservation) => void;
    onReschedule: (r: Reservation) => void;
}) {
    const isPast = isPastReservation(reservation.dateId, reservation.time);
    const isCancelled = reservation.status === "Cancelada";
    const showActions = !isPast && !isCancelled;

    return (
        <div className={`rounded-2xl border transition-all ${isCancelled
                ? "border-rose-500/30 bg-rose-500/5"
                : isPast
                    ? "border-white/5 bg-white/5 opacity-60"
                    : "border-white/10 bg-white/5"
            }`}>
            {/* Main Content */}
            <div className="p-4">
                {/* Date & Time - Prominent */}
                <div className="flex items-center gap-3 mb-3">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{ backgroundColor: `${primaryColor}20` }}
                    >
                        📅
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-base sm:text-lg truncate">
                            {formatDate(reservation.dateId)}
                        </p>
                        <p className="text-base font-medium" style={{ color: primaryColor }}>
                            {formatTime(reservation.time)}
                        </p>
                    </div>
                </div>

                {/* Service & Staff Info */}
                <div className="pl-15 space-y-1">
                    <p className="font-semibold text-white text-sm sm:text-base">
                        {reservation.serviceName || "Servicio"}
                    </p>
                    {reservation.servicePrice && (
                        <p className="text-sm text-slate-400">{formatPrice(reservation.servicePrice)}</p>
                    )}
                    {reservation.staffName && (
                        <p className="text-sm text-slate-400">con {reservation.staffName}</p>
                    )}
                </div>

                {/* Status Badge */}
                <div className="mt-3">
                    {isCancelled ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-sm font-medium text-rose-300">
                            ✕ Cancelada
                        </span>
                    ) : isPast ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/20 px-3 py-1 text-sm font-medium text-slate-400">
                            ✓ Completada
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-300">
                            ✓ Confirmada
                        </span>
                    )}
                </div>

                {/* Rescheduled info */}
                {reservation.rescheduledFrom && (
                    <p className="text-xs text-amber-300/70 mt-2 bg-amber-500/10 rounded-lg px-2 py-1">
                        📅 Reprogramada desde {formatDate(reservation.rescheduledFrom.dateId)}
                    </p>
                )}
            </div>

            {/* Action Buttons - Full Width, Stacked on Mobile */}
            {showActions && (
                <div className="border-t border-white/10 p-3 grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onReschedule(reservation)}
                        className="flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm sm:text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <span>🔄</span>
                        <span>Reprogramar</span>
                    </button>
                    <button
                        onClick={() => onCancel(reservation)}
                        className="flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm sm:text-base font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all hover:bg-rose-500/30 active:scale-[0.98]"
                    >
                        <span>❌</span>
                        <span>Cancelar</span>
                    </button>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// CANCEL MODAL - Mobile Optimized
// ============================================================================

function CancelModal({
    reservation,
    primaryColor,
    onClose,
    onConfirm,
    loading,
}: {
    reservation: Reservation;
    primaryColor: string;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    loading: boolean;
}) {
    const [reason, setReason] = useState("");

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border-t sm:border border-white/10 bg-slate-900 p-6 animate-slide-up sm:animate-none">
                {/* Handle for mobile */}
                <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-4 sm:hidden" />

                {/* Warning Icon */}
                <div className="text-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-3">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-bold text-white">¿Cancelar esta cita?</h2>
                </div>

                {/* Reservation Info */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-4">
                    <p className="font-semibold text-white">{reservation.serviceName}</p>
                    <p className="text-sm text-slate-400 mt-1">
                        {formatDate(reservation.dateId)} a las {formatTime(reservation.time)}
                    </p>
                </div>

                {/* Reason Input */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Razón de cancelación (opcional)
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-rose-500/50 focus:outline-none resize-none"
                        rows={3}
                        placeholder="Cuéntanos por qué cancelas..."
                    />
                </div>

                {/* Action Buttons - Stacked on Mobile */}
                <div className="space-y-3">
                    <button
                        onClick={() => onConfirm(reason)}
                        disabled={loading}
                        className="w-full rounded-xl bg-rose-500 py-4 text-base font-bold text-white transition-all hover:bg-rose-600 disabled:opacity-50 active:scale-[0.98]"
                    >
                        {loading ? "Cancelando..." : "Sí, cancelar cita"}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-full rounded-xl bg-white/10 py-4 text-base font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
                    >
                        No, mantener mi cita
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT: MANAGE RESERVATIONS
// ============================================================================

export default function ManageReservations({
    clientId,
    primaryColor = "#7c3aed",
    onBack,
    onReschedule,
}: {
    clientId: string;
    primaryColor?: string;
    onBack?: () => void;
    onReschedule?: (reservation: Reservation) => void;
}) {
    const [phone, setPhone] = useState("");
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cancelModal, setCancelModal] = useState<Reservation | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!phone || phone.replace(/\D/g, "").length < 10) {
            setError("Ingresa un número de teléfono válido");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const params = new URLSearchParams({
                clientId,
                phone: phone.replace(/\D/g, ""),
            });

            const res = await fetch(`/api/reservations?${params}`);
            const json = await res.json();

            if (!res.ok || !json.ok) {
                throw new Error(json.error || "Error al buscar reservas");
            }

            // Sort: upcoming first, then past, cancelled at the end
            const sorted = (json.data as Reservation[]).sort((a, b) => {
                if (a.status === "Cancelada" && b.status !== "Cancelada") return 1;
                if (a.status !== "Cancelada" && b.status === "Cancelada") return -1;
                return `${a.dateId}${a.time}`.localeCompare(`${b.dateId}${b.time}`);
            });

            setReservations(sorted);
            setSearched(true);
        } catch (err: any) {
            setError(err.message || "Error al buscar");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (reason: string) => {
        if (!cancelModal) return;

        setCancelling(true);
        try {
            const res = await fetch("/api/reservations", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: cancelModal._id,
                    clientId,
                    action: "cancel",
                    cancelReason: reason || "Cancelado por el cliente desde la web",
                }),
            });

            const json = await res.json();
            if (!res.ok || !json.ok) {
                throw new Error(json.error || "Error al cancelar");
            }

            // Update local state
            setReservations((prev) =>
                prev.map((r) =>
                    r._id === cancelModal._id
                        ? { ...r, status: "Cancelada", cancelledAt: new Date().toISOString(), cancelReason: reason }
                        : r
                )
            );

            setSuccessMessage("✅ Cita cancelada exitosamente");
            setCancelModal(null);
        } catch (err: any) {
            setError(err.message || "Error al cancelar");
        } finally {
            setCancelling(false);
        }
    };

    const upcomingReservations = reservations.filter(
        (r) => r.status !== "Cancelada" && !isPastReservation(r.dateId, r.time)
    );
    const pastReservations = reservations.filter(
        (r) => r.status !== "Cancelada" && isPastReservation(r.dateId, r.time)
    );
    const cancelledReservations = reservations.filter((r) => r.status === "Cancelada");

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Gestiona tus citas</h2>
                <p className="text-sm sm:text-base text-slate-400 mt-2">
                    Busca tus reservas con tu número de teléfono
                </p>
            </div>

            {/* Search Form - Mobile Optimized */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
                <label className="block text-sm sm:text-base font-medium text-slate-300 mb-3">
                    📱 Tu número de teléfono
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="300 123 4567"
                        className="flex-1 rounded-xl border border-white/10 bg-slate-800 px-4 py-4 text-base sm:text-lg text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:outline-none"
                        inputMode="numeric"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="rounded-xl px-8 py-4 font-bold text-base sm:text-lg text-white transition-all disabled:opacity-50 active:scale-[0.98] shrink-0"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {loading ? "Buscando..." : "🔍 Buscar"}
                    </button>
                </div>

                {/* Messages */}
                {error && (
                    <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3">
                        <p className="text-sm text-rose-300">❌ {error}</p>
                    </div>
                )}
                {successMessage && (
                    <div className="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
                        <p className="text-sm text-emerald-300">{successMessage}</p>
                    </div>
                )}
            </div>

            {/* Results */}
            {searched && (
                <>
                    {reservations.length === 0 ? (
                        <div className="text-center py-12 rounded-2xl border border-white/10 bg-white/5">
                            <p className="text-5xl mb-4">🔍</p>
                            <p className="text-lg text-white font-medium">No encontramos reservas</p>
                            <p className="text-sm text-slate-400 mt-1">Verifica el número e intenta de nuevo</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Upcoming - Highlighted */}
                            {upcomingReservations.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-lg">📋</span>
                                        <h3 className="text-base sm:text-lg font-bold text-white">
                                            Próximas citas ({upcomingReservations.length})
                                        </h3>
                                    </div>
                                    <div className="space-y-4">
                                        {upcomingReservations.map((r) => (
                                            <ReservationCard
                                                key={r._id}
                                                reservation={r}
                                                primaryColor={primaryColor}
                                                onCancel={(res) => setCancelModal(res)}
                                                onReschedule={(res) => onReschedule?.(res)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Past */}
                            {pastReservations.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-lg">✓</span>
                                        <h3 className="text-base font-semibold text-slate-400">
                                            Citas anteriores ({pastReservations.length})
                                        </h3>
                                    </div>
                                    <div className="space-y-3">
                                        {pastReservations.slice(0, 3).map((r) => (
                                            <ReservationCard
                                                key={r._id}
                                                reservation={r}
                                                primaryColor={primaryColor}
                                                onCancel={() => { }}
                                                onReschedule={() => { }}
                                            />
                                        ))}
                                        {pastReservations.length > 3 && (
                                            <p className="text-sm text-slate-500 text-center py-2">
                                                +{pastReservations.length - 3} citas anteriores más
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Cancelled */}
                            {cancelledReservations.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-lg">❌</span>
                                        <h3 className="text-base font-semibold text-slate-400">
                                            Canceladas ({cancelledReservations.length})
                                        </h3>
                                    </div>
                                    <div className="space-y-3">
                                        {cancelledReservations.slice(0, 3).map((r) => (
                                            <ReservationCard
                                                key={r._id}
                                                reservation={r}
                                                primaryColor={primaryColor}
                                                onCancel={() => { }}
                                                onReschedule={() => { }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Cancel Modal */}
            {cancelModal && (
                <CancelModal
                    reservation={cancelModal}
                    primaryColor={primaryColor}
                    onClose={() => setCancelModal(null)}
                    onConfirm={handleCancel}
                    loading={cancelling}
                />
            )}
        </div>
    );
}
