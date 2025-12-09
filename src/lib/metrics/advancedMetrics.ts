/**
 * Advanced Metrics Module
 * 
 * Métricas avanzadas para análisis profundo del negocio:
 * - Tasa de ocupación por día/staff
 * - Hora pico del día
 * - Tasa de cancelación y tendencias
 * - Ingresos perdidos por cancelaciones
 * - Comparación mes a mes / semana a semana
 * - Tendencias de demanda
 * - Valor de vida del cliente (LTV)
 * - Pronóstico de ingresos
 */

export type ReservationData = {
    _id?: string;
    dateId: string;
    time: string;
    endTime?: string;
    durationMinutes?: number;
    status?: string;
    serviceId?: string;
    serviceName?: string;
    servicePrice?: number;
    staffId?: string;
    staffName?: string;
    createdAt?: string;
    updatedAt?: string;
    cancelledAt?: string;
    cancelReason?: string;
    phone?: string;
    name?: string;
};

export type ServiceData = {
    id: string;
    name: string;
    price?: number;
    durationMinutes?: number;
    active?: boolean;
};

export type StaffData = {
    id: string;
    name: string;
    role?: string;
    active?: boolean;
};

export type CustomerData = {
    _id?: string;
    phone: string;
    name: string;
    createdAt?: string;
    lastReservationAt?: string;
};

// ========== HORA PICO ==========
export type PeakHour = {
    hour: number;
    label: string;
    count: number;
    revenue: number;
};

export function getPeakHours(
    reservations: ReservationData[],
    services: ServiceData[] = []
): PeakHour[] {
    const serviceMap = new Map<string, ServiceData>();
    services.forEach((s) => serviceMap.set(s.id, s));

    const hourCounts: Record<number, { count: number; revenue: number }> = {};

    // Initialize all hours
    for (let h = 0; h < 24; h++) {
        hourCounts[h] = { count: 0, revenue: 0 };
    }

    reservations
        .filter((r) => r.status !== "Cancelada")
        .forEach((r) => {
            const hour = parseInt(r.time?.split(":")[0] ?? "0", 10);
            const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
            const price = svc?.price ?? r.servicePrice ?? 0;

            hourCounts[hour].count += 1;
            hourCounts[hour].revenue += price;
        });

    return Object.entries(hourCounts)
        .map(([hour, data]) => ({
            hour: Number(hour),
            label: `${hour.toString().padStart(2, "0")}:00`,
            count: data.count,
            revenue: data.revenue,
        }))
        .sort((a, b) => b.count - a.count);
}

export function getTopPeakHour(reservations: ReservationData[]): PeakHour | null {
    const peaks = getPeakHours(reservations);
    return peaks.length > 0 ? peaks[0] : null;
}

// ========== TASA DE OCUPACIÓN ==========
export type OccupancyRate = {
    date: string;
    occupiedSlots: number;
    totalSlots: number;
    rate: number; // 0-100%
};

export function getOccupancyRate(
    reservations: ReservationData[],
    dateId: string,
    businessHours: { open: string; close: string; slotMinutes: number }
): OccupancyRate {
    const openHour = parseInt(businessHours.open.split(":")[0], 10);
    const closeHour = parseInt(businessHours.close.split(":")[0], 10);
    const slotsPerHour = 60 / businessHours.slotMinutes;
    const totalSlots = (closeHour - openHour) * slotsPerHour;

    const occupiedSlots = reservations.filter(
        (r) => r.dateId === dateId && r.status !== "Cancelada"
    ).length;

    const rate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

    return { date: dateId, occupiedSlots, totalSlots, rate };
}

// ========== TASA DE CANCELACIÓN ==========
export type CancellationMetrics = {
    totalReservations: number;
    cancelledReservations: number;
    cancellationRate: number; // 0-100%
    lostRevenue: number;
    topCancelReasons: { reason: string; count: number }[];
    cancellationsByDay: { date: string; count: number }[];
};

export function getCancellationMetrics(
    reservations: ReservationData[],
    services: ServiceData[] = []
): CancellationMetrics {
    const serviceMap = new Map<string, ServiceData>();
    services.forEach((s) => serviceMap.set(s.id, s));

    const cancelled = reservations.filter((r) => r.status === "Cancelada");
    const total = reservations.length;
    const cancellationRate = total > 0 ? Math.round((cancelled.length / total) * 100) : 0;

    // Lost revenue
    const lostRevenue = cancelled.reduce((acc, r) => {
        const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
        return acc + (svc?.price ?? r.servicePrice ?? 0);
    }, 0);

    // Top cancel reasons
    const reasonCounts: Record<string, number> = {};
    cancelled.forEach((r) => {
        const reason = r.cancelReason || "Sin especificar";
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    const topCancelReasons = Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Cancellations by day (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const byDay: Record<string, number> = {};
    cancelled.forEach((r) => {
        const cancelDate = r.cancelledAt ? r.cancelledAt.split("T")[0] : r.dateId;
        if (cancelDate >= thirtyDaysAgo.toISOString().split("T")[0]) {
            byDay[cancelDate] = (byDay[cancelDate] || 0) + 1;
        }
    });
    const cancellationsByDay = Object.entries(byDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => (a.date > b.date ? 1 : -1));

    return {
        totalReservations: total,
        cancelledReservations: cancelled.length,
        cancellationRate,
        lostRevenue,
        topCancelReasons,
        cancellationsByDay,
    };
}

// ========== COMPARACIÓN PERIÓDICA ==========
export type PeriodComparison = {
    currentPeriod: { revenue: number; reservations: number; clients: number };
    previousPeriod: { revenue: number; reservations: number; clients: number };
    revenueChange: number; // percentage
    reservationsChange: number;
    clientsChange: number;
};

export function getWeekOverWeekComparison(
    reservations: ReservationData[],
    services: ServiceData[] = []
): PeriodComparison {
    const serviceMap = new Map<string, ServiceData>();
    services.forEach((s) => serviceMap.set(s.id, s));

    const now = new Date();
    const startOfThisWeek = new Date(now);
    const dayOfWeek = (now.getDay() + 6) % 7;
    startOfThisWeek.setDate(now.getDate() - dayOfWeek);
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfThisWeek);

    const calculatePeriodMetrics = (from: Date, to: Date) => {
        const fromStr = from.toISOString().split("T")[0];
        const toStr = to.toISOString().split("T")[0];

        const periodRes = reservations.filter((r) => {
            return r.dateId >= fromStr && r.dateId < toStr && r.status === "Confirmada";
        });

        const revenue = periodRes.reduce((acc, r) => {
            const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
            return acc + (svc?.price ?? r.servicePrice ?? 0);
        }, 0);

        const uniqueClients = new Set(periodRes.map((r) => r.phone || r.name)).size;

        return { revenue, reservations: periodRes.length, clients: uniqueClients };
    };

    const currentPeriod = calculatePeriodMetrics(startOfThisWeek, now);
    const previousPeriod = calculatePeriodMetrics(startOfLastWeek, endOfLastWeek);

    const calcChange = (current: number, previous: number) =>
        previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;

    return {
        currentPeriod,
        previousPeriod,
        revenueChange: calcChange(currentPeriod.revenue, previousPeriod.revenue),
        reservationsChange: calcChange(currentPeriod.reservations, previousPeriod.reservations),
        clientsChange: calcChange(currentPeriod.clients, previousPeriod.clients),
    };
}

export function getMonthOverMonthComparison(
    reservations: ReservationData[],
    services: ServiceData[] = []
): PeriodComparison {
    const serviceMap = new Map<string, ServiceData>();
    services.forEach((s) => serviceMap.set(s.id, s));

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const calculatePeriodMetrics = (from: Date, to: Date) => {
        const fromStr = from.toISOString().split("T")[0];
        const toStr = to.toISOString().split("T")[0];

        const periodRes = reservations.filter((r) => {
            return r.dateId >= fromStr && r.dateId <= toStr && r.status === "Confirmada";
        });

        const revenue = periodRes.reduce((acc, r) => {
            const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
            return acc + (svc?.price ?? r.servicePrice ?? 0);
        }, 0);

        const uniqueClients = new Set(periodRes.map((r) => r.phone || r.name)).size;

        return { revenue, reservations: periodRes.length, clients: uniqueClients };
    };

    const currentPeriod = calculatePeriodMetrics(startOfThisMonth, now);
    const previousPeriod = calculatePeriodMetrics(startOfLastMonth, endOfLastMonth);

    const calcChange = (current: number, previous: number) =>
        previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;

    return {
        currentPeriod,
        previousPeriod,
        revenueChange: calcChange(currentPeriod.revenue, previousPeriod.revenue),
        reservationsChange: calcChange(currentPeriod.reservations, previousPeriod.reservations),
        clientsChange: calcChange(currentPeriod.clients, previousPeriod.clients),
    };
}

// ========== RENDIMIENTO POR STAFF ==========
export type StaffPerformanceAdvanced = {
    staffId: string;
    name: string;
    role?: string;
    totalReservations: number;
    confirmedReservations: number;
    cancelledReservations: number;
    totalRevenue: number;
    averagePerReservation: number;
    cancellationRate: number;
    occupancyTrend: "up" | "down" | "stable";
};

export function getStaffAdvancedMetrics(
    reservations: ReservationData[],
    staff: StaffData[],
    services: ServiceData[] = []
): StaffPerformanceAdvanced[] {
    const staffMap = new Map<string, StaffData>();
    staff.forEach((s) => staffMap.set(s.id, s));
    const serviceMap = new Map<string, ServiceData>();
    services.forEach((s) => serviceMap.set(s.id, s));

    const acc: Record<string, StaffPerformanceAdvanced> = {};

    reservations.forEach((r) => {
        const staffId = r.staffId || "sin-staff";
        const staffInfo = staffMap.get(r.staffId || "");
        const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
        const price = svc?.price ?? r.servicePrice ?? 0;

        if (!acc[staffId]) {
            acc[staffId] = {
                staffId,
                name: staffInfo?.name || r.staffName || "Sin asignar",
                role: staffInfo?.role,
                totalReservations: 0,
                confirmedReservations: 0,
                cancelledReservations: 0,
                totalRevenue: 0,
                averagePerReservation: 0,
                cancellationRate: 0,
                occupancyTrend: "stable",
            };
        }

        acc[staffId].totalReservations += 1;
        if (r.status === "Confirmada") {
            acc[staffId].confirmedReservations += 1;
            acc[staffId].totalRevenue += price;
        }
        if (r.status === "Cancelada") {
            acc[staffId].cancelledReservations += 1;
        }
    });

    // Calculate derived metrics
    Object.values(acc).forEach((s) => {
        s.averagePerReservation =
            s.confirmedReservations > 0 ? Math.round(s.totalRevenue / s.confirmedReservations) : 0;
        s.cancellationRate =
            s.totalReservations > 0 ? Math.round((s.cancelledReservations / s.totalReservations) * 100) : 0;
    });

    return Object.values(acc).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// ========== VALOR DE VIDA DEL CLIENTE (LTV) ==========
export type ClientLTV = {
    phone: string;
    name: string;
    totalReservations: number;
    totalSpent: number;
    averagePerVisit: number;
    firstVisit: string;
    lastVisit: string;
    daysSinceLastVisit: number;
    visitFrequencyDays: number; // Average days between visits
};

export function getClientLTV(
    reservations: ReservationData[],
    services: ServiceData[] = []
): ClientLTV[] {
    const serviceMap = new Map<string, ServiceData>();
    services.forEach((s) => serviceMap.set(s.id, s));

    const clientMap: Record<string, {
        phone: string;
        name: string;
        reservations: number;
        spent: number;
        visits: string[];
    }> = {};

    reservations
        .filter((r) => r.status === "Confirmada" && r.phone)
        .forEach((r) => {
            const key = r.phone!;
            const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
            const price = svc?.price ?? r.servicePrice ?? 0;

            if (!clientMap[key]) {
                clientMap[key] = {
                    phone: r.phone!,
                    name: r.name || "Cliente",
                    reservations: 0,
                    spent: 0,
                    visits: [],
                };
            }

            clientMap[key].reservations += 1;
            clientMap[key].spent += price;
            clientMap[key].visits.push(r.dateId);
        });

    const now = new Date();

    return Object.values(clientMap)
        .map((c) => {
            const sortedVisits = c.visits.sort();
            const firstVisit = sortedVisits[0] || "";
            const lastVisit = sortedVisits[sortedVisits.length - 1] || "";
            const daysSinceLastVisit = lastVisit
                ? Math.floor((now.getTime() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
                : 0;

            // Calculate average days between visits
            let visitFrequencyDays = 0;
            if (sortedVisits.length > 1) {
                const firstDate = new Date(firstVisit);
                const lastDate = new Date(lastVisit);
                const totalDays = Math.floor(
                    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                visitFrequencyDays = Math.round(totalDays / (sortedVisits.length - 1));
            }

            return {
                phone: c.phone,
                name: c.name,
                totalReservations: c.reservations,
                totalSpent: c.spent,
                averagePerVisit: c.reservations > 0 ? Math.round(c.spent / c.reservations) : 0,
                firstVisit,
                lastVisit,
                daysSinceLastVisit,
                visitFrequencyDays,
            };
        })
        .sort((a, b) => b.totalSpent - a.totalSpent);
}

// ========== TOP CLIENTES ==========
export function getTopClients(
    reservations: ReservationData[],
    services: ServiceData[] = [],
    limit = 5
): ClientLTV[] {
    return getClientLTV(reservations, services).slice(0, limit);
}

// ========== CLIENTES EN RIESGO (No han regresado) ==========
export function getAtRiskClients(
    reservations: ReservationData[],
    services: ServiceData[] = [],
    daysThreshold = 30
): ClientLTV[] {
    return getClientLTV(reservations, services).filter(
        (c) => c.totalReservations > 1 && c.daysSinceLastVisit > daysThreshold
    );
}

// ========== PRONÓSTICO DE INGRESOS ==========
export type RevenueForecast = {
    expectedDailyRevenue: number;
    expectedWeeklyRevenue: number;
    expectedMonthlyRevenue: number;
    basedOnDays: number;
    trend: "up" | "down" | "stable";
};

export function getRevenueForecast(
    reservations: ReservationData[],
    services: ServiceData[] = []
): RevenueForecast {
    const serviceMap = new Map<string, ServiceData>();
    services.forEach((s) => serviceMap.set(s.id, s));

    // Use last 30 days data for forecast
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const recentReservations = reservations.filter(
        (r) => r.dateId >= thirtyDaysAgoStr && r.status === "Confirmada"
    );

    const totalRevenue = recentReservations.reduce((acc, r) => {
        const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
        return acc + (svc?.price ?? r.servicePrice ?? 0);
    }, 0);

    // Calculate unique days with reservations
    const uniqueDays = new Set(recentReservations.map((r) => r.dateId)).size;
    const basedOnDays = Math.min(uniqueDays, 30);

    const expectedDailyRevenue =
        basedOnDays > 0 ? Math.round(totalRevenue / basedOnDays) : 0;
    const expectedWeeklyRevenue = expectedDailyRevenue * 7;
    const expectedMonthlyRevenue = expectedDailyRevenue * 30;

    // Compare first 15 days vs last 15 days to determine trend
    const midPoint = new Date(now);
    midPoint.setDate(now.getDate() - 15);
    const midPointStr = midPoint.toISOString().split("T")[0];

    const firstHalf = recentReservations.filter((r) => r.dateId < midPointStr);
    const secondHalf = recentReservations.filter((r) => r.dateId >= midPointStr);

    const firstHalfRevenue = firstHalf.reduce((acc, r) => {
        const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
        return acc + (svc?.price ?? r.servicePrice ?? 0);
    }, 0);

    const secondHalfRevenue = secondHalf.reduce((acc, r) => {
        const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
        return acc + (svc?.price ?? r.servicePrice ?? 0);
    }, 0);

    let trend: "up" | "down" | "stable" = "stable";
    if (secondHalfRevenue > firstHalfRevenue * 1.1) trend = "up";
    else if (secondHalfRevenue < firstHalfRevenue * 0.9) trend = "down";

    return {
        expectedDailyRevenue,
        expectedWeeklyRevenue,
        expectedMonthlyRevenue,
        basedOnDays,
        trend,
    };
}

// ========== DURACION PROMEDIO POR SERVICIO ==========
export type ServiceDurationMetric = {
    serviceId: string;
    name: string;
    averageDuration: number;
    count: number;
};

export function getServiceDurationMetrics(
    reservations: ReservationData[],
    services: ServiceData[] = []
): ServiceDurationMetric[] {
    const serviceMap = new Map<string, ServiceData>();
    services.forEach((s) => serviceMap.set(s.id, s));

    const acc: Record<string, { name: string; totalDuration: number; count: number }> = {};

    reservations
        .filter((r) => r.status === "Confirmada" && r.durationMinutes)
        .forEach((r) => {
            const key = r.serviceId || r.serviceName || "sin-servicio";
            const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
            const name = svc?.name || r.serviceName || "Servicio";

            if (!acc[key]) {
                acc[key] = { name, totalDuration: 0, count: 0 };
            }

            acc[key].totalDuration += r.durationMinutes || 0;
            acc[key].count += 1;
        });

    return Object.entries(acc)
        .map(([serviceId, data]) => ({
            serviceId,
            name: data.name,
            averageDuration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
            count: data.count,
        }))
        .sort((a, b) => b.count - a.count);
}

// ========== MÉTRICAS DE HOY (DASHBOARD) ==========
export type TodaySummary = {
    todayReservations: number;
    confirmedToday: number;
    pendingToday: number;
    cancelledToday: number;
    expectedRevenue: number;
    nextReservation?: { name: string; time: string; service: string };
};

export function getTodaySummary(
    reservations: ReservationData[],
    services: ServiceData[] = []
): TodaySummary {
    const serviceMap = new Map<string, ServiceData>();
    services.forEach((s) => serviceMap.set(s.id, s));

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const todayReservations = reservations.filter((r) => r.dateId === todayStr);
    const confirmedToday = todayReservations.filter((r) => r.status === "Confirmada").length;
    const pendingToday = todayReservations.filter((r) => r.status === "Pendiente").length;
    const cancelledToday = todayReservations.filter((r) => r.status === "Cancelada").length;

    // Expected revenue (confirmed + pending)
    const expectedRevenue = todayReservations
        .filter((r) => r.status === "Confirmada" || r.status === "Pendiente")
        .reduce((acc, r) => {
            const svc = r.serviceId ? serviceMap.get(r.serviceId) : undefined;
            return acc + (svc?.price ?? r.servicePrice ?? 0);
        }, 0);

    // Next upcoming reservation
    const upcoming = todayReservations
        .filter((r) => r.time >= currentTime && r.status !== "Cancelada")
        .sort((a, b) => (a.time > b.time ? 1 : -1));

    const next = upcoming[0];
    const nextReservation = next
        ? { name: next.name || "Cliente", time: next.time, service: next.serviceName || "Servicio" }
        : undefined;

    return {
        todayReservations: todayReservations.filter((r) => r.status !== "Cancelada").length,
        confirmedToday,
        pendingToday,
        cancelledToday,
        expectedRevenue,
        nextReservation,
    };
}

// ========== PRÓXIMAS RESERVAS (DASHBOARD) ==========
export type UpcomingReservation = {
    id: string;
    name: string;
    time: string;
    dateId: string;
    service: string;
    status: string;
};

export function getUpcomingReservations(
    reservations: ReservationData[],
    limit = 5
): UpcomingReservation[] {
    const now = new Date();
    const currentDateStr = now.toISOString().split("T")[0];
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    return reservations
        .filter((r) => {
            if (r.status === "Cancelada") return false;
            if (r.dateId > currentDateStr) return true;
            if (r.dateId === currentDateStr && r.time >= currentTime) return true;
            return false;
        })
        .sort((a, b) => {
            if (a.dateId !== b.dateId) return a.dateId > b.dateId ? 1 : -1;
            return a.time > b.time ? 1 : -1;
        })
        .slice(0, limit)
        .map((r) => ({
            id: r._id || "",
            name: r.name || "Cliente",
            time: r.time,
            dateId: r.dateId,
            service: r.serviceName || "Servicio",
            status: r.status || "Pendiente",
        }));
}

// ========== QUICK STATS (DASHBOARD) ==========
export type QuickStats = {
    total: number;
    confirmed: number;
    pending: number;
    canceled: number;
    next24h: number;
    thisWeek: number;
};

export function getQuickStats(reservations: ReservationData[]): QuickStats {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const next24hStr = next24h.toISOString().split("T")[0];
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const todayStr = now.toISOString().split("T")[0];

    // Week range
    const weekStart = new Date(now);
    const dayOfWeek = (now.getDay() + 6) % 7;
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const total = reservations.length;
    const confirmed = reservations.filter((r) => r.status === "Confirmada").length;
    const pending = reservations.filter((r) => r.status === "Pendiente").length;
    const canceled = reservations.filter((r) => r.status === "Cancelada").length;

    // Next 24 hours
    const next24hCount = reservations.filter((r) => {
        if (r.status === "Cancelada") return false;
        if (r.dateId === todayStr && r.time >= currentTime) return true;
        if (r.dateId === next24hStr && r.time <= currentTime) return true;
        return false;
    }).length;

    // This week
    const thisWeek = reservations.filter((r) => {
        if (r.status === "Cancelada") return false;
        return r.dateId >= weekStartStr && r.dateId < weekEndStr;
    }).length;

    return { total, confirmed, pending, canceled, next24h: next24hCount, thisWeek };
}

