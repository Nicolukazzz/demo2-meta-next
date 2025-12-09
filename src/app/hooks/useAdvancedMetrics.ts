"use client";

import { useMemo } from "react";
import {
    // Balance metrics
    getPeakHours,
    getCancellationMetrics,
    getWeekOverWeekComparison,
    getMonthOverMonthComparison,
    getStaffAdvancedMetrics,
    getTopClients,
    getAtRiskClients,
    getRevenueForecast,
    // Dashboard metrics
    getTodaySummary,
    getUpcomingReservations,
    getQuickStats,
    type ReservationData,
    type ServiceData,
    type StaffData,
} from "@/lib/metrics/advancedMetrics";

import {
    getServiceUsageMetrics,
    getReservationsByWeekday,
    type ReservationMetric,
    type ServiceMetric,
} from "@/lib/metrics/dashboardMetrics";

type UseAdvancedMetricsInput = {
    reservations: ReservationData[];
    services?: ServiceData[];
    staff?: StaffData[];
};

export function useAdvancedMetrics({ reservations, services = [], staff = [] }: UseAdvancedMetricsInput) {
    // Dashboard Metrics (operational, day-to-day)
    const dashboardMetrics = useMemo(() => {
        const todaySummary = getTodaySummary(reservations, services);
        const upcomingReservations = getUpcomingReservations(reservations, 5);
        const quickStats = getQuickStats(reservations);

        return {
            todaySummary,
            upcomingReservations,
            quickStats,
        };
    }, [reservations, services]);

    // Balance Metrics (financial, analytical)
    const balanceMetrics = useMemo(() => {
        // Peak Hours
        const peakHours = getPeakHours(reservations, services);

        // Cancellation Metrics
        const cancellationMetrics = getCancellationMetrics(reservations, services);

        // Week over Week Comparison
        const weekComparison = getWeekOverWeekComparison(reservations, services);

        // Month over Month Comparison
        const monthComparison = getMonthOverMonthComparison(reservations, services);

        // Staff Performance
        const staffPerformance = getStaffAdvancedMetrics(reservations, staff, services);

        // Top Clients
        const topClients = getTopClients(reservations, services, 10);

        // At-Risk Clients (haven't visited in 30+ days)
        const atRiskClients = getAtRiskClients(reservations, services, 30);

        // Revenue Forecast
        const revenueForecast = getRevenueForecast(reservations, services);

        // Service Usage (from dashboardMetrics)
        const serviceUsage = getServiceUsageMetrics(
            reservations as ReservationMetric[],
            services as ServiceMetric[]
        );

        // Weekday Distribution
        const weekdayDistribution = getReservationsByWeekday(reservations as ReservationMetric[]);

        return {
            peakHours,
            cancellationMetrics,
            weekComparison,
            monthComparison,
            staffPerformance,
            topClients,
            atRiskClients,
            revenueForecast,
            serviceUsage,
            weekdayDistribution,
        };
    }, [reservations, services, staff]);

    return {
        // Dashboard section
        dashboard: dashboardMetrics,
        // Balance section
        balance: balanceMetrics,
        // Legacy direct access (for compatibility)
        ...balanceMetrics,
    };
}

export type AdvancedMetricsResult = ReturnType<typeof useAdvancedMetrics>;
