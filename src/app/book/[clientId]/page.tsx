"use client";

import React, { useState, useEffect, useMemo, use } from "react";

// ============================================================================
// TYPES
// ============================================================================

interface Service {
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
    description?: string;
    active?: boolean;
}

interface StaffMember {
    id: string;
    name: string;
    role?: string;
    active?: boolean;
    schedule?: {
        useBusinessHours?: boolean;
        days?: Array<{
            day: number;
            open: string;
            close: string;
            slotMinutes?: number;
        }>;
    };
    serviceIds?: string[];
}

interface BusinessHours {
    open: string;
    close: string;
    slotMinutes: number;
    days?: Array<{
        day: number;
        open: string;
        close: string;
        active?: boolean;
    }>;
}

interface Branding {
    businessName?: string;
    logoUrl?: string;
    primaryColor?: string;
    theme?: {
        primary?: string;
        secondary?: string;
        tertiary?: string;
    };
}

interface BusinessProfile {
    clientId: string;
    businessName?: string;
    branding?: Branding;
    hours?: BusinessHours;
    services?: Service[];
    staff?: StaffMember[];
}

// ============================================================================
// HELPERS
// ============================================================================

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function formatDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
    }).format(price);
}

function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getNextDays(count: number, businessDays?: BusinessHours["days"]): Date[] {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let i = 0;
    let attempts = 0;
    while (days.length < count && attempts < 30) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);

        // Check if business is open this day
        const dayOfWeek = d.getDay();
        const dayConfig = businessDays?.find(bd => bd.day === dayOfWeek);
        const isOpen = dayConfig ? dayConfig.active !== false : true;

        if (isOpen) {
            days.push(d);
        }

        i++;
        attempts++;
    }

    return days;
}

function buildTimeSlots(open: string, close: string, slotMinutes: number): string[] {
    const toMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + (m || 0);
    };

    const start = toMinutes(open);
    const end = toMinutes(close);
    const slots: string[] = [];

    for (let t = start; t < end; t += slotMinutes) {
        const h = Math.floor(t / 60).toString().padStart(2, "0");
        const m = (t % 60).toString().padStart(2, "0");
        slots.push(`${h}:${m}`);
    }

    return slots;
}

// ============================================================================
// BOOKING PAGE COMPONENT
// ============================================================================

type BookingStep = "service" | "staff" | "date" | "time" | "info" | "confirm" | "success";

export default function BookingPage({ params }: { params: Promise<{ clientId: string }> }) {
    // Unwrap params Promise for Next.js 15+
    const { clientId } = use(params);

    // Business data
    const [profile, setProfile] = useState<BusinessProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Booking state
    const [step, setStep] = useState<BookingStep>("service");
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Occupied hours for selected date - now stores full reservation data for overlap detection
    interface OccupiedSlot {
        time: string;
        durationMinutes: number;
    }
    const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([]);
    const [loadingHours, setLoadingHours] = useState(false);

    // Load business profile
    useEffect(() => {
        async function loadProfile() {
            try {
                setLoading(true);
                const res = await fetch(`/api/profile?clientId=${clientId}`);
                const json = await res.json();
                if (!res.ok || !json.ok) {
                    throw new Error(json.error || "Negocio no encontrado");
                }
                // The API returns { ok: true, data: profile }
                setProfile(json.data);
            } catch (err: any) {
                setError(err.message || "Error cargando información del negocio");
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, [clientId]);

    // Load occupied slots when date or staff changes - filter by staff
    useEffect(() => {
        if (!selectedDate || !profile) return;

        async function loadOccupied() {
            setLoadingHours(true);
            try {
                const dateId = formatDateKey(selectedDate!);
                // Build query with optional staffId filter
                let url = `/api/reservations?clientId=${clientId}&dateId=${dateId}`;
                if (selectedStaff?.id) {
                    url += `&staffId=${selectedStaff.id}`;
                }
                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    // Store full reservation data for overlap detection
                    const slots: OccupiedSlot[] = (json.data || [])
                        .filter((r: any) => r.status !== "Cancelada")
                        .map((r: any) => ({
                            time: r.time,
                            durationMinutes: r.durationMinutes || 60, // default 60 min
                        }));
                    setOccupiedSlots(slots);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingHours(false);
            }
        }
        loadOccupied();
    }, [selectedDate, selectedStaff, clientId, profile]);

    // Available services
    const services = useMemo(() => {
        return (profile?.services || []).filter(s => s.active !== false);
    }, [profile]);

    // Available staff
    const availableStaff = useMemo(() => {
        if (!profile?.staff) return [];
        return profile.staff.filter(s => s.active !== false);
    }, [profile]);

    // Available dates - filter by selected staff's working days if applicable
    const availableDates = useMemo(() => {
        // If staff selected and has custom schedule, filter by their working days
        if (selectedStaff?.schedule?.days && selectedStaff.schedule.days.length > 0 && !selectedStaff.schedule.useBusinessHours) {
            const staffDays = selectedStaff.schedule.days.map(d => d.day);
            const days: Date[] = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let i = 0;
            let attempts = 0;
            while (days.length < 7 && attempts < 30) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                const dayOfWeek = d.getDay();

                // Check if staff works this day
                if (staffDays.includes(dayOfWeek)) {
                    days.push(d);
                }

                i++;
                attempts++;
            }
            return days;
        }

        // Otherwise use business days
        return getNextDays(7, profile?.hours?.days);
    }, [profile, selectedStaff]);

    // Available time slots for selected date - filter by staff schedule
    const availableSlots = useMemo(() => {
        if (!selectedDate || !profile?.hours) return [];

        const dayOfWeek = selectedDate.getDay();

        // Helper to convert time to minutes
        const toMinutes = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + (m || 0);
        };

        // Check if two time ranges overlap
        const rangesOverlap = (start1: number, end1: number, start2: number, end2: number): boolean => {
            return start1 < end2 && end1 > start2;
        };

        // Get hours based on staff schedule or business hours
        let open: string;
        let close: string;
        let intervalMinutes: number;

        if (selectedStaff?.schedule?.days && selectedStaff.schedule.days.length > 0 && !selectedStaff.schedule.useBusinessHours) {
            // Use staff's custom schedule for this day
            const staffDay = selectedStaff.schedule.days.find(d => d.day === dayOfWeek);
            if (!staffDay) return []; // Staff doesn't work this day
            open = staffDay.open;
            close = staffDay.close;
            // Use staff's slotMinutes if defined, otherwise 30 min default
            intervalMinutes = staffDay.slotMinutes || 30;
        } else {
            // Use business hours
            const dayConfig = profile.hours.days?.find(d => d.day === dayOfWeek);
            open = dayConfig?.open || profile.hours.open;
            close = dayConfig?.close || profile.hours.close;
            // Use 30 min intervals for flexible booking, or business slotMinutes if configured
            intervalMinutes = profile.hours.slotMinutes && profile.hours.slotMinutes < 60
                ? profile.hours.slotMinutes
                : 30;
        }

        // Generate slots at regular intervals (every 30min: 10:00, 10:30, 11:00...)
        const allSlots = buildTimeSlots(open, close, intervalMinutes);

        // Service duration (for closing time and overlap validation)
        const serviceDuration = selectedService?.durationMinutes || 60;
        const closeMinutes = toMinutes(close);

        // Filter out: 1) overlapping slots, 2) slots where service would end after closing
        return allSlots.filter(slot => {
            const slotStart = toMinutes(slot);
            const slotEnd = slotStart + serviceDuration;

            // Check if service would end after closing
            if (slotEnd > closeMinutes) return false;

            // Check if this slot overlaps with any existing reservation
            for (const occupied of occupiedSlots) {
                const occupiedStart = toMinutes(occupied.time);
                const occupiedEnd = occupiedStart + occupied.durationMinutes;

                if (rangesOverlap(slotStart, slotEnd, occupiedStart, occupiedEnd)) {
                    return false; // Overlaps with existing reservation
                }
            }

            return true;
        });
    }, [selectedDate, profile, selectedService, selectedStaff, occupiedSlots]);

    // Theme colors
    const primaryColor = profile?.branding?.theme?.primary || profile?.branding?.primaryColor || "#7c3aed";
    const secondaryColor = profile?.branding?.theme?.secondary || "#0ea5e9";

    // Handle service selection - go to staff if multiple, else to date
    const handleServiceSelect = (service: Service) => {
        setSelectedService(service);
        if (availableStaff.length > 1) {
            setStep("staff");
        } else if (availableStaff.length === 1) {
            setSelectedStaff(availableStaff[0]);
            setStep("date");
        } else {
            setStep("date");
        }
    };

    // Handle staff selection - go to date
    const handleStaffSelect = (staff: StaffMember | null) => {
        setSelectedStaff(staff);
        setSelectedDate(null);
        setSelectedTime(null);
        setStep("date");
    };

    // Handle date selection - go to time
    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        setSelectedTime(null);
        setStep("time");
    };

    // Handle time selection - go to info
    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
        setStep("info");
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName.trim() || !customerPhone.trim()) {
            setSubmitError("Por favor completa todos los campos");
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            const res = await fetch("/api/reservations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId,
                    name: customerName.trim(),
                    phone: customerPhone.trim(),
                    dateId: formatDateKey(selectedDate!),
                    time: selectedTime,
                    serviceName: selectedService?.name,
                    serviceId: selectedService?.id,
                    servicePrice: selectedService?.price,
                    durationMinutes: selectedService?.durationMinutes,
                    staffId: selectedStaff?.id,
                    staffName: selectedStaff?.name,
                    status: "Confirmada",
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                throw new Error(data.error || "Error al crear la reserva");
            }

            setStep("success");
        } catch (err: any) {
            setSubmitError(err.message || "Error al enviar la reserva");
        } finally {
            setSubmitting(false);
        }
    };

    // Go back - flow: service → staff → date → time → info
    const goBack = () => {
        switch (step) {
            case "staff": setStep("service"); break;
            case "date": setStep(availableStaff.length > 1 ? "staff" : "service"); break;
            case "time": setStep("date"); break;
            case "info": setStep("time"); break;
            case "confirm": setStep("info"); break;
        }
    };

    // Reset
    const reset = () => {
        setStep("service");
        setSelectedService(null);
        setSelectedStaff(null);
        setSelectedDate(null);
        setSelectedTime(null);
        setCustomerName("");
        setCustomerPhone("");
        setSubmitError(null);
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-slate-300">Cargando...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !profile) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-6xl mb-4">😕</div>
                    <h1 className="text-2xl font-bold text-white mb-2">Negocio no encontrado</h1>
                    <p className="text-slate-400">{error || "El enlace puede ser incorrecto"}</p>
                </div>
            </div>
        );
    }

    const businessName = profile.branding?.businessName || profile.businessName || "Negocio";
    const logoUrl = profile.branding?.logoUrl;

    return (
        <div
            className="min-h-screen bg-slate-900"
            style={{
                background: `radial-gradient(circle at 20% 20%, ${primaryColor}15, transparent 40%), 
                     radial-gradient(circle at 80% 80%, ${secondaryColor}10, transparent 40%), 
                     #0f172a`
            }}
        >
            {/* Header */}
            <header className="sticky top-0 z-10 backdrop-blur-xl bg-slate-900/80 border-b border-white/10">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
                    {logoUrl ? (
                        <img src={logoUrl} alt={businessName} className="h-10 w-10 rounded-xl object-cover" />
                    ) : (
                        <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {businessName[0]?.toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h1 className="text-lg font-semibold text-white">{businessName}</h1>
                        <p className="text-xs text-slate-400">Reserva tu cita</p>
                    </div>
                </div>
            </header>

            {/* Progress - flow: service → staff → date → time → info */}
            {step !== "success" && (
                <div className="max-w-lg mx-auto px-4 pt-4">
                    <div className="flex gap-1">
                        {["service", "staff", "date", "time", "info"].map((s) => {
                            const steps = availableStaff.length > 1
                                ? ["service", "staff", "date", "time", "info"]
                                : ["service", "date", "time", "info"];
                            const idx = steps.indexOf(s);
                            const currentIdx = steps.indexOf(step);
                            if (idx === -1) return null;

                            return (
                                <div
                                    key={s}
                                    className="flex-1 h-1 rounded-full transition-colors"
                                    style={{
                                        backgroundColor: idx <= currentIdx ? primaryColor : "rgba(255,255,255,0.1)"
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Content */}
            <main className="max-w-lg mx-auto px-4 py-6">

                {/* Step: Service Selection */}
                {step === "service" && (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-xl font-semibold text-white">¿Qué servicio deseas?</h2>
                            <p className="text-sm text-slate-400 mt-1">Selecciona el servicio que deseas reservar</p>
                        </div>

                        <div className="space-y-3">
                            {services.map(service => (
                                <button
                                    key={service.id}
                                    onClick={() => handleServiceSelect(service)}
                                    className="w-full text-left p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                                                {service.name}
                                            </h3>
                                            {service.description && (
                                                <p className="text-sm text-slate-400 mt-1">{service.description}</p>
                                            )}
                                            <p className="text-xs text-slate-500 mt-2">
                                                ⏱️ {formatDuration(service.durationMinutes)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span
                                                className="text-lg font-bold"
                                                style={{ color: primaryColor }}
                                            >
                                                {formatPrice(service.price)}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step: Staff Selection - comes after service */}
                {step === "staff" && (
                    <div className="space-y-4">
                        <button onClick={goBack} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
                            ← Volver
                        </button>

                        <div>
                            <h2 className="text-xl font-semibold text-white">¿Con qué especialista?</h2>
                            <p className="text-sm text-slate-400 mt-1">
                                Elige un profesional para tu {selectedService?.name}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleStaffSelect(null)}
                                className="w-full text-left p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                            >
                                <h3 className="font-semibold text-white">✨ Sin preferencia</h3>
                                <p className="text-sm text-slate-400 mt-1">El primer disponible</p>
                            </button>

                            {availableStaff.map(staff => (
                                <button
                                    key={staff.id}
                                    onClick={() => handleStaffSelect(staff)}
                                    className="w-full text-left p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                                >
                                    <h3 className="font-semibold text-white">{staff.name}</h3>
                                    {staff.role && (
                                        <p className="text-sm text-slate-400 mt-1">{staff.role}</p>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step: Date Selection */}
                {step === "date" && (
                    <div className="space-y-4">
                        <button onClick={goBack} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
                            ← Volver
                        </button>

                        <div>
                            <h2 className="text-xl font-semibold text-white">¿Qué día te queda bien?</h2>
                            <p className="text-sm text-slate-400 mt-1">Selecciona una fecha</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {availableDates.map(date => {
                                const isToday = formatDateKey(date) === formatDateKey(new Date());
                                return (
                                    <button
                                        key={formatDateKey(date)}
                                        onClick={() => handleDateSelect(date)}
                                        className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-center"
                                    >
                                        <p className="text-xs text-slate-400 uppercase">
                                            {isToday ? "Hoy" : WEEKDAYS[date.getDay()]}
                                        </p>
                                        <p className="text-2xl font-bold text-white mt-1">{date.getDate()}</p>
                                        <p className="text-sm text-slate-300">{MONTHS[date.getMonth()]}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step: Time Selection */}
                {step === "time" && (
                    <div className="space-y-4">
                        <button onClick={goBack} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
                            ← Volver
                        </button>

                        <div>
                            <h2 className="text-xl font-semibold text-white">¿A qué hora?</h2>
                            <p className="text-sm text-slate-400 mt-1">
                                {selectedDate && `${WEEKDAYS[selectedDate.getDay()]} ${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()]}`}
                            </p>
                        </div>

                        {loadingHours ? (
                            <div className="text-center py-8">
                                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                                <p className="mt-4 text-slate-400">Verificando disponibilidad...</p>
                            </div>
                        ) : availableSlots.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-slate-400">No hay horarios disponibles para este día.</p>
                                <button
                                    onClick={goBack}
                                    className="mt-4 text-indigo-400 hover:text-indigo-300"
                                >
                                    Elegir otra fecha
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {availableSlots.map(time => (
                                    <button
                                        key={time}
                                        onClick={() => handleTimeSelect(time)}
                                        className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-center"
                                    >
                                        <span className="text-white font-medium">{time}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step: Customer Info */}
                {step === "info" && (
                    <div className="space-y-4">
                        <button onClick={goBack} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
                            ← Volver
                        </button>

                        <div>
                            <h2 className="text-xl font-semibold text-white">Tus datos</h2>
                            <p className="text-sm text-slate-400 mt-1">Para confirmar tu reserva</p>
                        </div>

                        {/* Summary */}
                        <div className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Servicio:</span>
                                <span className="text-white font-medium">{selectedService?.name}</span>
                            </div>
                            {selectedStaff && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Profesional:</span>
                                    <span className="text-white font-medium">{selectedStaff.name}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-slate-400">Fecha:</span>
                                <span className="text-white font-medium">
                                    {selectedDate && `${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]}`}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Hora:</span>
                                <span className="text-white font-medium">{selectedTime}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-white/10">
                                <span className="text-slate-400">Total:</span>
                                <span className="text-xl font-bold" style={{ color: primaryColor }}>
                                    {selectedService && formatPrice(selectedService.price)}
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Tu nombre
                                </label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    placeholder="Ej: María García"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Tu teléfono
                                </label>
                                <input
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    placeholder="Ej: 3001234567"
                                    required
                                />
                            </div>

                            {submitError && (
                                <p className="text-sm text-rose-400">{submitError}</p>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {submitting ? "Reservando..." : "Confirmar Reserva"}
                            </button>
                        </form>
                    </div>
                )}

                {/* Step: Success */}
                {step === "success" && (
                    <div className="text-center py-8 space-y-6">
                        <div
                            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                            style={{ backgroundColor: `${primaryColor}20` }}
                        >
                            <svg className="w-10 h-10" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-white">¡Reserva confirmada!</h2>
                            <p className="text-slate-400 mt-2">Te esperamos en {businessName}</p>
                        </div>

                        <div className="p-4 rounded-2xl border border-white/10 bg-white/5 text-left space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Servicio:</span>
                                <span className="text-white">{selectedService?.name}</span>
                            </div>
                            {selectedStaff && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Con:</span>
                                    <span className="text-white">{selectedStaff.name}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-slate-400">Fecha:</span>
                                <span className="text-white">
                                    {selectedDate && `${WEEKDAYS[selectedDate.getDay()]} ${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()]}`}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Hora:</span>
                                <span className="text-white">{selectedTime}</span>
                            </div>
                        </div>

                        <button
                            onClick={reset}
                            className="px-6 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors"
                        >
                            Hacer otra reserva
                        </button>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="max-w-lg mx-auto px-4 py-6 text-center">
                <p className="text-xs text-slate-500">
                    Powered by ReservaSaaS
                </p>
            </footer>
        </div>
    );
}
