/**
 * Tipos Centralizados - ÚNICA FUENTE DE VERDAD
 * 
 * Este archivo contiene todas las interfaces y tipos compartidos
 * entre el Frontend y Backend. Importar siempre desde aquí.
 * 
 * @module types/models
 */

// ============================================================================
// ESTADOS Y ENUMS
// ============================================================================

export type ReservationStatus = "Pendiente" | "Confirmada" | "Cancelada";

export type BusinessType = "reservas" | "ventas" | "mixto";

// ============================================================================
// RESERVACIONES
// ============================================================================

/**
 * Reserva base (como viene de MongoDB)
 */
export interface Reservation {
    _id: string;
    clientId: string;
    dateId: string;           // "YYYY-MM-DD"
    time: string;             // "HH:MM"
    endTime?: string;
    durationMinutes?: number;
    name: string;
    phone: string;
    serviceName: string;
    serviceId?: string;
    servicePrice?: number;
    confirmedPrice?: number;  // Precio real cobrado (puede incluir extras/descuentos)
    status: ReservationStatus;
    staffId?: string;
    staffName?: string;
    createdAt?: string;
    updatedAt?: string;
    // Cancelación
    cancelledAt?: string;
    cancelReason?: string;
    // Reprogramación
    rescheduledFrom?: {
        dateId: string;
        time: string;
        rescheduledAt: string;
    };
}

/**
 * Versión ligera para listados y calendarios (sin campos pesados)
 */
export interface ReservationLite {
    _id: string;
    dateId: string;
    time: string;
    endTime?: string;
    name: string;
    serviceName: string;
    status: ReservationStatus;
    staffId?: string;
    staffName?: string;
}

/**
 * Para crear una nueva reserva (sin _id)
 */
export interface CreateReservationInput {
    clientId: string;
    dateId: string;
    time: string;
    name: string;
    phone: string;
    serviceId?: string;
    serviceName?: string;
    servicePrice?: number;
    staffId?: string;
    staffName?: string;
    durationMinutes?: number;
}

// ============================================================================
// CLIENTES / CUSTOMERS
// ============================================================================

export interface Customer {
    _id: string;
    clientId: string;
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
    lastReservationAt?: string;
    totalReservations?: number;
    totalSpent?: number;
}

// ============================================================================
// SERVICIOS
// ============================================================================

export interface Service {
    id: string;
    name: string;
    price?: number;
    durationMinutes?: number;
    description?: string;
    active?: boolean;
    staffIds?: string[];  // IDs de staff que pueden hacer este servicio
}

// ============================================================================
// STAFF
// ============================================================================

export interface StaffMember {
    id: string;
    name: string;
    role?: string;
    phone?: string;
    email?: string;
    active?: boolean;
    workDays?: number[];  // 0=Lunes, 6=Domingo
    color?: string;
}

// ============================================================================
// MÉTRICAS Y ANALYTICS
// ============================================================================

/**
 * Resumen de balance calculado en el servidor
 * (resultado de agregaciones MongoDB)
 */
export interface BalanceSummary {
    // Ingresos reales (solo confirmadas)
    totalRevenue: number;
    monthRevenue: number;
    weekRevenue: number;
    todayRevenue: number;
    // Conteos
    totalReservations: number;
    confirmedCount: number;
    pendingCount: number;
    cancelledCount: number;
    // Promedios
    averageTicket: number;
    // Ingresos esperados (pendientes)
    expectedRevenue: number;
}

/**
 * Métricas por servicio
 */
export interface ServiceMetrics {
    serviceId: string;
    name: string;
    count: number;
    revenue: number;
    averagePrice?: number;
}

/**
 * Métricas por staff
 */
export interface StaffMetrics {
    staffId: string;
    name: string;
    totalReservations: number;
    confirmedReservations: number;
    totalRevenue: number;
    cancellationRate: number;
}

// ============================================================================
// FILTROS Y QUERIES
// ============================================================================

/**
 * Parámetros para consultar reservaciones
 */
export interface ReservationQueryParams {
    clientId: string;
    startDate?: string;    // "YYYY-MM-DD"
    endDate?: string;      // "YYYY-MM-DD"
    status?: ReservationStatus;
    staffId?: string;
    serviceId?: string;
    limit?: number;
    skip?: number;
}

/**
 * Parámetros para analytics
 */
export interface AnalyticsQueryParams {
    clientId: string;
    startDate?: string;
    endDate?: string;
    groupBy?: "day" | "week" | "month" | "service" | "staff";
}

// ============================================================================
// RESPUESTAS API
// ============================================================================

export interface ApiResponse<T> {
    ok: boolean;
    data?: T;
    error?: string;
    meta?: {
        total?: number;
        limit?: number;
        skip?: number;
    };
}

// ============================================================================
// BUSINESS / NEGOCIO
// ============================================================================

export interface BusinessHours {
    open: string;          // "09:00"
    close: string;         // "18:00"
    slotMinutes: number;   // 30, 60, etc.
}

export interface BusinessDaySchedule extends BusinessHours {
    closed?: boolean;
}

export interface BusinessBranding {
    name: string;
    tagline?: string;
    logoUrl?: string;
    primaryColor?: string;
    customBookingUrl?: string;
}

export interface BusinessFeatures {
    reservations: boolean;
    customers: boolean;
    whatsappReminders?: boolean;
    onlineBooking?: boolean;
}

export interface BusinessProfile {
    clientId: string;
    email: string;
    businessType: BusinessType;
    branding: BusinessBranding;
    features: BusinessFeatures;
    hours?: BusinessHours;
    daySchedules?: Record<number, BusinessDaySchedule>;  // 0-6 (Lun-Dom)
    staff: StaffMember[];
    services: Service[];
    createdAt?: string;
    updatedAt?: string;
}
