"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import { PhoneInput } from "@/app/components/PhoneInput";
import ManageReservations, { Reservation } from "@/app/components/ManageReservations";

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
    status?: "active" | "paused" | "deleted";
}

interface OccupiedSlot {
    time: string;
    durationMinutes: number;
    staffId?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WEEKDAYS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
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

function formatTime12h(time: string): string {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
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
        // Convert JS getDay() (Sunday=0) to business format (Monday=0)
        const dayOfWeek = (d.getDay() + 6) % 7;
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
// SERVICE ICON COMPONENT
// ============================================================================

function ServiceIcon({ name, className = "" }: { name: string; className?: string }) {
    const iconMap: Record<string, string> = {
        "corte": "✂️",
        "cabello": "✂️",
        "tinte": "🎨",
        "color": "🎨",
        "manicure": "💅",
        "pedicure": "🦶",
        "tratamiento": "✨",
        "maquillaje": "💄",
        "facial": "🧖",
        "masaje": "💆",
        "depilación": "🪒",
        "barba": "🧔",
    };
    const lowerName = name.toLowerCase();
    for (const [key, emoji] of Object.entries(iconMap)) {
        if (lowerName.includes(key)) {
            return <span className={className}>{emoji}</span>;
        }
    }
    return <span className={className}>💇</span>;
}

// ============================================================================
// STEP INDICATOR COMPONENT
// ============================================================================

function StepIndicator({ currentStep, totalSteps, primaryColor }: { currentStep: number; totalSteps: number; primaryColor: string }) {
    return (
        <div className="flex items-center justify-center gap-2 py-4">
            {Array.from({ length: totalSteps }).map((_, idx) => {
                const stepNum = idx + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;
                return (
                    <React.Fragment key={idx}>
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${isActive
                                ? "text-white shadow-lg"
                                : isCompleted
                                    ? "text-white"
                                    : "bg-slate-700/50 text-slate-400"
                                }`}
                            style={{
                                backgroundColor: isActive || isCompleted ? primaryColor : undefined,
                                boxShadow: isActive ? `0 0 20px ${primaryColor}50` : undefined,
                            }}
                        >
                            {stepNum}
                        </div>
                        {idx < totalSteps - 1 && (
                            <div
                                className="h-0.5 w-16 rounded-full transition-all"
                                style={{
                                    backgroundColor: isCompleted ? primaryColor : "rgba(255,255,255,0.1)",
                                }}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ============================================================================
// BOOKING PAGE COMPONENT
// ============================================================================

type BookingStep = 1 | 2 | 3 | 4;
type ViewMode = "booking" | "manage";

export default function BookingPage({ params }: { params: Promise<{ clientId: string }> }) {
    const { clientId } = use(params);

    // View mode: booking (default) or manage (view/cancel/reschedule)
    const [viewMode, setViewMode] = useState<ViewMode>("booking");
    const [rescheduleReservation, setRescheduleReservation] = useState<Reservation | null>(null);

    // Business data
    const [profile, setProfile] = useState<BusinessProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Booking state - SINGLE SERVICE
    const [step, setStep] = useState<BookingStep>(1);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Occupied slots data
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
                setProfile(json.data);
            } catch (err: any) {
                setError(err.message || "Error cargando información del negocio");
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, [clientId]);

    // Load ALL occupied slots when date changes
    useEffect(() => {
        if (!selectedDate || !profile) return;

        async function loadOccupied() {
            setLoadingHours(true);
            try {
                const dateId = formatDateKey(selectedDate!);
                const url = `/api/reservations?clientId=${clientId}&dateId=${dateId}`;
                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    const slots: OccupiedSlot[] = (json.data || [])
                        .filter((r: any) => r.status !== "Cancelada")
                        .map((r: any) => ({
                            time: r.time,
                            durationMinutes: r.durationMinutes || 60,
                            staffId: r.staffId || undefined,
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
    }, [selectedDate, clientId, profile]);

    // Available services
    const services = useMemo(() => {
        return (profile?.services || []).filter(s => s.active !== false);
    }, [profile]);

    // Available staff - filter by selected service capability
    const availableStaff = useMemo(() => {
        if (!profile?.staff) return [];
        const activeStaff = profile.staff.filter(s => s.active !== false);

        if (!selectedService) return activeStaff;

        return activeStaff.filter(staff => {
            if (!staff.serviceIds || staff.serviceIds.length === 0) return true;
            return staff.serviceIds.includes(selectedService.id);
        });
    }, [profile, selectedService]);

    // Available dates
    const availableDates = useMemo(() => {
        if (selectedStaff?.schedule?.days && selectedStaff.schedule.days.length > 0 && !selectedStaff.schedule.useBusinessHours) {
            const staffDays = selectedStaff.schedule.days.map(d => d.day);
            const days: Date[] = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let i = 0;
            let attempts = 0;
            while (days.length < 5 && attempts < 30) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                // Convert JS getDay() (Sunday=0) to business format (Monday=0)
                const dayOfWeek = (d.getDay() + 6) % 7;
                if (staffDays.includes(dayOfWeek)) {
                    days.push(d);
                }
                i++;
                attempts++;
            }
            return days;
        }
        return getNextDays(5, profile?.hours?.days);
    }, [profile, selectedStaff]);

    // Service duration
    const serviceDuration = useMemo(() => {
        return selectedService?.durationMinutes || 60;
    }, [selectedService]);

    // Service price
    const servicePrice = useMemo(() => {
        return selectedService?.price || 0;
    }, [selectedService]);

    // Available time slots - filtered by staff and past times
    const availableSlots = useMemo(() => {
        if (!selectedDate || !profile?.hours) return [];

        // Convert JS getDay() (Sunday=0) to business format (Monday=0)
        const dayOfWeek = (selectedDate.getDay() + 6) % 7;
        const toMinutes = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + (m || 0);
        };

        const rangesOverlap = (start1: number, end1: number, start2: number, end2: number): boolean => {
            return start1 < end2 && end1 > start2;
        };

        // Check if selected date is today (comparing only year/month/day)
        const now = new Date();
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth();
        const selectedDay = selectedDate.getDate();
        const isToday = selectedYear === now.getFullYear()
            && selectedMonth === now.getMonth()
            && selectedDay === now.getDate();

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        // Add buffer time (30 min minimum before appointment can be booked)
        const minBookingMinutes = currentMinutes + 30;

        let open: string;
        let close: string;
        let intervalMinutes: number;

        if (selectedStaff?.schedule?.days && selectedStaff.schedule.days.length > 0 && !selectedStaff.schedule.useBusinessHours) {
            const staffDay = selectedStaff.schedule.days.find(d => d.day === dayOfWeek);
            if (!staffDay) return [];
            open = staffDay.open;
            close = staffDay.close;
            intervalMinutes = staffDay.slotMinutes || 30;
        } else {
            const dayConfig = profile.hours.days?.find(d => d.day === dayOfWeek);
            open = dayConfig?.open || profile.hours.open;
            close = dayConfig?.close || profile.hours.close;
            intervalMinutes = profile.hours.slotMinutes && profile.hours.slotMinutes < 60 ? profile.hours.slotMinutes : 30;
        }

        const allSlots = buildTimeSlots(open, close, intervalMinutes);
        const closeMinutes = toMinutes(close);

        // If a specific staff is selected, filter by their occupied slots
        if (selectedStaff) {
            const staffOccupied = occupiedSlots.filter(slot => slot.staffId === selectedStaff.id);

            return allSlots.filter(slot => {
                const slotStart = toMinutes(slot);
                const slotEnd = slotStart + serviceDuration;

                // Filter out past slots ONLY if selected date is today
                if (isToday && slotStart < minBookingMinutes) {
                    return false;
                }

                if (slotEnd > closeMinutes) return false;

                for (const occupied of staffOccupied) {
                    const occupiedStart = toMinutes(occupied.time);
                    const occupiedEnd = occupiedStart + occupied.durationMinutes;
                    if (rangesOverlap(slotStart, slotEnd, occupiedStart, occupiedEnd)) {
                        return false;
                    }
                }
                return true;
            });
        }

        // "Sin preferencia" - Show slots where AT LEAST ONE staff member is available
        return allSlots.filter(slot => {
            const slotStart = toMinutes(slot);
            const slotEnd = slotStart + serviceDuration;

            // Filter out past slots ONLY if selected date is today
            if (isToday && slotStart < minBookingMinutes) {
                return false;
            }

            if (slotEnd > closeMinutes) return false;

            // Check if at least one staff member is available for this slot
            for (const staff of availableStaff) {
                const staffOccupied = occupiedSlots.filter(occ => occ.staffId === staff.id);
                let isStaffAvailable = true;

                for (const occupied of staffOccupied) {
                    const occupiedStart = toMinutes(occupied.time);
                    const occupiedEnd = occupiedStart + occupied.durationMinutes;
                    if (rangesOverlap(slotStart, slotEnd, occupiedStart, occupiedEnd)) {
                        isStaffAvailable = false;
                        break;
                    }
                }

                if (isStaffAvailable) {
                    return true; // At least one staff is available
                }
            }

            return false; // No staff available for this slot
        });
    }, [selectedDate, profile, selectedStaff, occupiedSlots, serviceDuration, availableStaff]);

    // Count available slots per staff member (excluding past times)
    const staffAvailability = useMemo(() => {
        if (!selectedDate || !profile?.hours) return {};

        // Convert JS getDay() (Sunday=0) to business format (Monday=0)
        const dayOfWeek = (selectedDate.getDay() + 6) % 7;
        const toMinutes = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + (m || 0);
        };
        const rangesOverlap = (s1: number, e1: number, s2: number, e2: number) => s1 < e2 && e1 > s2;

        // Check if selected date is today (comparing only year/month/day)
        const now = new Date();
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth();
        const selectedDay = selectedDate.getDate();
        const isToday = selectedYear === now.getFullYear()
            && selectedMonth === now.getMonth()
            && selectedDay === now.getDate();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const minBookingMinutes = currentMinutes + 30;

        const availability: Record<string, number> = {};

        for (const staff of availableStaff) {
            let open: string;
            let close: string;
            let intervalMinutes: number;

            if (staff.schedule?.days && staff.schedule.days.length > 0 && !staff.schedule.useBusinessHours) {
                const staffDay = staff.schedule.days.find(d => d.day === dayOfWeek);
                if (!staffDay) {
                    availability[staff.id] = 0;
                    continue;
                }
                open = staffDay.open;
                close = staffDay.close;
                intervalMinutes = staffDay.slotMinutes || 30;
            } else {
                const dayConfig = profile.hours!.days?.find(d => d.day === dayOfWeek);
                open = dayConfig?.open || profile.hours!.open;
                close = dayConfig?.close || profile.hours!.close;
                intervalMinutes = 30;
            }

            const allSlots = buildTimeSlots(open, close, intervalMinutes);
            const closeMinutes = toMinutes(close);
            const staffOccupied = occupiedSlots.filter(s => s.staffId === staff.id);

            let count = 0;
            for (const slot of allSlots) {
                const slotStart = toMinutes(slot);
                const slotEnd = slotStart + serviceDuration;

                // Skip past slots if today
                if (isToday && slotStart < minBookingMinutes) continue;

                if (slotEnd > closeMinutes) continue;

                let isOccupied = false;
                for (const occ of staffOccupied) {
                    const occStart = toMinutes(occ.time);
                    const occEnd = occStart + occ.durationMinutes;
                    if (rangesOverlap(slotStart, slotEnd, occStart, occEnd)) {
                        isOccupied = true;
                        break;
                    }
                }
                if (!isOccupied) count++;
            }
            availability[staff.id] = count;
        }

        return availability;
    }, [selectedDate, profile, availableStaff, occupiedSlots, serviceDuration]);

    // Theme colors
    const primaryColor = profile?.branding?.theme?.primary || profile?.branding?.primaryColor || "#7c3aed";
    const secondaryColor = profile?.branding?.theme?.secondary || "#0ea5e9";

    // Select service and go to step 2
    const handleServiceSelect = (service: Service) => {
        setSelectedService(service);
        setStep(2);
    };

    // Handle submission (create new or reschedule existing)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName.trim() || !customerPhone.trim()) {
            setSubmitError("Por favor completa todos los campos");
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            // If rescheduling, UPDATE the existing reservation
            if (rescheduleReservation) {
                const res = await fetch("/api/reservations", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: rescheduleReservation._id,
                        clientId,
                        action: "reschedule",
                        dateId: formatDateKey(selectedDate!),
                        time: selectedTime,
                        staffId: selectedStaff?.id || "",
                        staffName: selectedStaff?.name || "Cualquier profesional disponible",
                        // Keep original service or use new one
                        serviceName: selectedService?.name || rescheduleReservation.serviceName,
                        serviceId: selectedService?.id,
                        servicePrice: servicePrice,
                        durationMinutes: serviceDuration,
                    }),
                });

                const data = await res.json();
                if (!res.ok || !data.ok) {
                    throw new Error(data.error || "Error al reprogramar la cita");
                }

                // Clear reschedule state
                setRescheduleReservation(null);
                setStep(4);
            } else {
                // Create NEW reservation
                const res = await fetch("/api/reservations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        clientId,
                        name: customerName.trim(),
                        phone: customerPhone,
                        dateId: formatDateKey(selectedDate!),
                        time: selectedTime,
                        serviceName: selectedService?.name,
                        serviceId: selectedService?.id,
                        servicePrice: servicePrice,
                        durationMinutes: serviceDuration,
                        staffId: selectedStaff?.id || "",
                        staffName: selectedStaff?.name || "Cualquier profesional disponible",
                        // No enviamos status para que use el default "Pendiente" de la API
                    }),
                });

                const data = await res.json();
                if (!res.ok || !data.ok) {
                    throw new Error(data.error || "Error al crear la reserva");
                }
                setStep(4);
            }
        } catch (err: any) {
            setSubmitError(err.message || "Error al enviar la reserva");
        } finally {
            setSubmitting(false);
        }
    };

    // Reset booking
    const reset = () => {
        setStep(1);
        setSelectedService(null);
        setSelectedStaff(null);
        setSelectedDate(null);
        setSelectedTime(null);
        setCustomerName("");
        setCustomerPhone("");
        setSubmitError(null);
        setRescheduleReservation(null); // Clear reschedule state
    };

    // Set initial date when entering step 2
    useEffect(() => {
        if (step === 2 && !selectedDate && availableDates.length > 0) {
            setSelectedDate(availableDates[0]);
        }
    }, [step, selectedDate, availableDates]);

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

    // Account paused/deleted state
    if (profile.status === "paused" || profile.status === "deleted") {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">🚧</div>
                    <h1 className="text-2xl font-bold text-white mb-2">Servicio temporalmente no disponible</h1>
                    <p className="text-slate-400">
                        El sistema de reservas de este negocio no está disponible en este momento.
                        Por favor intenta más tarde o contacta directamente al negocio.
                    </p>
                </div>
            </div>
        );
    }

    const businessName = profile.branding?.businessName || profile.businessName || "Negocio";
    const logoUrl = profile.branding?.logoUrl;

    // Handle reschedule from manage view
    const handleReschedule = (reservation: Reservation) => {
        // Pre-fill the booking with rescheduling info
        setRescheduleReservation(reservation);
        setCustomerName(reservation.name);
        setCustomerPhone(reservation.phone);
        // Find the service
        const service = services.find(s => s.name === reservation.serviceName);
        if (service) {
            setSelectedService(service);
        }
        // Find the staff
        if (reservation.staffName && profile?.staff) {
            const staffMember = profile.staff.find((s: StaffMember) => s.name === reservation.staffName);
            if (staffMember) {
                setSelectedStaff(staffMember);
            }
        }
        setViewMode("booking");
        setStep(2); // Go to date/time selection
    };

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
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
                    {logoUrl ? (
                        <img src={logoUrl} alt={businessName} className="h-9 w-9 rounded-xl object-cover" />
                    ) : (
                        <div
                            className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {businessName[0]?.toUpperCase()}
                        </div>
                    )}
                    <div className="text-center">
                        <h1 className="text-base font-semibold text-white">{businessName}</h1>
                        <p className="text-[10px] text-slate-400">Tu destino de belleza integral</p>
                    </div>
                </div>

                {/* View Mode Tabs - Mobile Optimized */}
                <div className="max-w-4xl mx-auto px-4 pb-3">
                    <div className="flex w-full rounded-2xl bg-slate-800/50 p-1.5 border border-white/10 shadow-lg">
                        <button
                            onClick={() => {
                                setViewMode("booking");
                                setRescheduleReservation(null);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 ${viewMode === "booking"
                                ? "text-white shadow-md"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                            style={viewMode === "booking" ? { backgroundColor: primaryColor } : undefined}
                        >
                            <span className="text-lg">✨</span>
                            <span>Nueva reserva</span>
                        </button>
                        <button
                            onClick={() => setViewMode("manage")}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 ${viewMode === "manage"
                                ? "text-white shadow-md"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                            style={viewMode === "manage" ? { backgroundColor: primaryColor } : undefined}
                        >
                            <span className="text-lg">📋</span>
                            <span>Mis citas</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* MANAGE VIEW */}
            {viewMode === "manage" && (
                <main className="max-w-4xl mx-auto px-4 py-8">
                    <ManageReservations
                        clientId={clientId}
                        primaryColor={primaryColor}
                        onBack={() => setViewMode("booking")}
                        onReschedule={handleReschedule}
                    />
                </main>
            )}

            {/* BOOKING VIEW */}
            {viewMode === "booking" && (
                <>
                    {/* Reschedule Notice */}
                    {rescheduleReservation && (
                        <div className="max-w-4xl mx-auto px-4 pt-4">
                            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-center justify-between">
                                <p className="text-sm text-amber-200">
                                    📅 Reprogramando cita de {rescheduleReservation.serviceName}
                                </p>
                                <button
                                    onClick={() => {
                                        setRescheduleReservation(null);
                                        setStep(1);
                                        setSelectedService(null);
                                        setSelectedStaff(null);
                                        setSelectedDate(null);
                                        setSelectedTime(null);
                                    }}
                                    className="text-xs text-amber-200 hover:text-white"
                                >
                                    Cancelar ✕
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step Indicator */}
                    {step !== 4 && (
                        <StepIndicator currentStep={step} totalSteps={3} primaryColor={primaryColor} />
                    )}

                    {/* Content */}
                    <main className="max-w-4xl mx-auto px-4 pb-8">

                        {/* ==================== STEP 1: SERVICE SELECTION ==================== */}
                        {step === 1 && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <h2 className="text-xl font-bold text-white">Selecciona tu servicio</h2>
                                    <p className="text-sm text-slate-400 mt-1">Elige el servicio que deseas reservar</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {services.map(service => (
                                        <button
                                            key={service.id}
                                            onClick={() => handleServiceSelect(service)}
                                            className="text-left p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-indigo-500/50 transition-all group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="text-2xl">
                                                    <ServiceIcon name={service.name} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{service.name}</h3>
                                                            <p className="text-xs text-slate-400 mt-0.5">{formatDuration(service.durationMinutes)}</p>
                                                        </div>
                                                        <span className="text-sm font-bold" style={{ color: primaryColor }}>
                                                            {formatPrice(service.price)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ==================== STEP 2: STAFF + DATE + TIME (REACTIVE) ==================== */}
                        {step === 2 && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Elige fecha, hora y profesional</h2>
                                    <p className="text-sm text-slate-400 mt-1">Los horarios se actualizan según el profesional que elijas</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* LEFT COLUMN: Staff Selection */}
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-medium text-slate-300">¿Con quién deseas tu cita?</h3>

                                        {/* Sin preferencia option */}
                                        <button
                                            onClick={() => { setSelectedStaff(null); setSelectedTime(null); }}
                                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${selectedStaff === null
                                                ? "border-indigo-500 bg-indigo-500/10"
                                                : "border-white/10 bg-white/5 hover:bg-white/10"
                                                }`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                                <span className="text-white text-lg">✨</span>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-white">Sin preferencia</h4>
                                                <p className="text-xs text-slate-400">Cualquier profesional disponible</p>
                                            </div>
                                            {selectedStaff === null && (
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>

                                        {/* Staff list */}
                                        {availableStaff.map(staff => {
                                            const slotsCount = staffAvailability[staff.id] || 0;
                                            const isSelected = selectedStaff?.id === staff.id;
                                            return (
                                                <button
                                                    key={staff.id}
                                                    onClick={() => { setSelectedStaff(staff); setSelectedTime(null); }}
                                                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${isSelected
                                                        ? "border-indigo-500 bg-indigo-500/10"
                                                        : "border-white/10 bg-white/5 hover:bg-white/10"
                                                        }`}
                                                >
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                                                        style={{ backgroundColor: `${primaryColor}30`, color: primaryColor }}
                                                    >
                                                        {staff.name[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-white">{staff.name}</h4>
                                                        {staff.role && <p className="text-xs text-slate-400">{staff.role}</p>}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                                                            {slotsCount} horarios
                                                        </span>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* RIGHT COLUMN: Date + Time Selection */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium text-slate-300">Elige fecha y hora</h3>

                                        {/* Date picker - horizontal scroll */}
                                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                                            {availableDates.map(date => {
                                                const isToday = formatDateKey(date) === formatDateKey(new Date());
                                                const isTomorrow = formatDateKey(date) === formatDateKey(new Date(Date.now() + 86400000));
                                                const isSelected = selectedDate && formatDateKey(date) === formatDateKey(selectedDate);
                                                const dayName = WEEKDAYS[date.getDay()];
                                                return (
                                                    <button
                                                        key={formatDateKey(date)}
                                                        onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                                                        className={`flex-shrink-0 px-3 py-2 rounded-xl border transition-all text-center min-w-[70px] ${isSelected
                                                            ? "border-indigo-500 bg-indigo-500/20 text-white"
                                                            : "border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
                                                            }`}
                                                    >
                                                        {/* Day name - small on top */}
                                                        <p className={`text-[10px] uppercase ${isToday || isTomorrow ? "text-indigo-400 font-semibold" : "text-slate-500"}`}>
                                                            {isToday ? "Hoy" : isTomorrow ? "Mañana" : dayName}
                                                        </p>
                                                        {/* Date number */}
                                                        <p className="text-base font-bold leading-tight">{date.getDate()}</p>
                                                        {/* Month abbreviation */}
                                                        <p className="text-[10px] text-slate-400">{MONTHS[date.getMonth()].slice(0, 3)}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Time grid */}
                                        <div className="min-h-[200px]">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-slate-400">Horarios disponibles:</span>
                                                {!loadingHours && (
                                                    <span className="text-xs" style={{ color: primaryColor }}>
                                                        {availableSlots.length} disponibles
                                                    </span>
                                                )}
                                            </div>

                                            {loadingHours ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                                                </div>
                                            ) : availableSlots.length === 0 ? (
                                                <div className="text-center py-8 text-slate-400">
                                                    <p>No hay horarios disponibles para este día.</p>
                                                    <p className="text-xs mt-1">Intenta con otra fecha o profesional</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-4 gap-2 max-h-[280px] overflow-y-auto pr-1">
                                                    {availableSlots.map(time => {
                                                        const isSelected = selectedTime === time;
                                                        return (
                                                            <button
                                                                key={time}
                                                                onClick={() => setSelectedTime(time)}
                                                                className={`py-2.5 px-2 rounded-lg border text-center transition-all text-sm ${isSelected
                                                                    ? "border-indigo-500 bg-indigo-500/20 text-white font-medium"
                                                                    : "border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
                                                                    }`}
                                                            >
                                                                {formatTime12h(time)}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Navigation */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="px-6 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors"
                                    >
                                        ← Volver
                                    </button>
                                    <button
                                        onClick={() => selectedTime && setStep(3)}
                                        disabled={!selectedTime}
                                        className="flex-1 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{ backgroundColor: selectedTime ? primaryColor : "#374151" }}
                                    >
                                        Continuar →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ==================== STEP 3: CONFIRMATION ==================== */}
                        {step === 3 && (
                            <div className="space-y-6 max-w-lg mx-auto">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Confirma tu reserva</h2>
                                    <p className="text-sm text-slate-400 mt-1">Revisa los detalles y confirma</p>
                                </div>

                                <button
                                    onClick={() => setStep(2)}
                                    className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
                                >
                                    ← Volver
                                </button>

                                {/* Booking Summary */}
                                <div className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-4">
                                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Resumen de tu reserva</div>

                                    <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                            <span className="text-lg">📅</span>
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">
                                                {selectedDate && `${WEEKDAYS_FULL[selectedDate.getDay()]}, ${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()].toLowerCase()}`}
                                            </p>
                                            <p style={{ color: primaryColor }} className="text-sm font-medium">
                                                {selectedTime && formatTime12h(selectedTime)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-[10px] uppercase tracking-wider text-slate-400">Servicio</div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-white flex items-center gap-2">
                                                <ServiceIcon name={selectedService?.name || ""} className="text-sm" /> {selectedService?.name}
                                            </span>
                                            <span className="text-slate-300">{formatPrice(servicePrice)}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-white/10">
                                        <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Profesional</div>
                                        <p className="text-white flex items-center gap-2">
                                            ✨ {selectedStaff?.name || "Cualquier profesional disponible"}
                                        </p>
                                    </div>

                                    <div className="flex justify-between items-center pt-3 border-t border-white/10">
                                        <span className="text-white font-semibold">Total <span className="text-xs text-slate-400">({formatDuration(serviceDuration)})</span></span>
                                        <span className="text-xl font-bold" style={{ color: primaryColor }}>{formatPrice(servicePrice)}</span>
                                    </div>
                                </div>

                                {/* Customer Form */}
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="text-sm text-slate-300 font-medium">Tus datos para confirmar</div>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1.5">Tu nombre</label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="Ej. María García"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1.5">Tu WhatsApp</label>
                                        <PhoneInput
                                            value={customerPhone}
                                            onChange={setCustomerPhone}
                                            defaultCountry="CO"
                                            placeholder="300 123 4567"
                                            required
                                            size="lg"
                                        />
                                    </div>

                                    {submitError && (
                                        <p className="text-sm text-rose-400">{submitError}</p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                {rescheduleReservation ? "Reprogramando..." : "Reservando..."}
                                            </>
                                        ) : (
                                            <>{rescheduleReservation ? "Confirmar reprogramación 🔄" : "Confirmar reserva ✓"}</>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ==================== STEP 4: SUCCESS ==================== */}
                        {step === 4 && (
                            <div className="text-center py-8 space-y-6 max-w-md mx-auto">
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                                    style={{ backgroundColor: "#10b98130" }}
                                >
                                    <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-white">¡Reserva confirmada!</h2>
                                    <p className="text-slate-400 mt-2">Te enviamos un mensaje de confirmación por WhatsApp con los detalles de tu cita.</p>
                                </div>

                                <div className="p-5 rounded-2xl border border-white/10 bg-white/5 text-left space-y-3">
                                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Resumen</div>
                                    <div>
                                        <p className="text-white font-semibold">
                                            {selectedDate && `${WEEKDAYS_FULL[selectedDate.getDay()]}, ${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()].toLowerCase()}`}
                                        </p>
                                        <p style={{ color: primaryColor }} className="text-sm">{selectedTime && formatTime12h(selectedTime)}</p>
                                    </div>
                                    <p className="text-slate-300">{selectedService?.name}</p>
                                </div>

                                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-sm text-emerald-300">
                                    ✅ Recibirás un recordatorio por WhatsApp 24 horas antes de tu cita
                                </div>

                                <button
                                    onClick={reset}
                                    className="px-8 py-3 rounded-xl font-semibold text-white transition-all"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    Volver al inicio
                                </button>
                            </div>
                        )}
                    </main>

                    {/* Footer */}
                    <footer className="max-w-4xl mx-auto px-4 py-6 text-center border-t border-white/5">
                        <p className="text-xs text-slate-500">
                            Funciona con <span className="font-semibold text-indigo-400">Reserbox</span>
                        </p>
                    </footer>
                </>
            )}
        </div>
    );
}
