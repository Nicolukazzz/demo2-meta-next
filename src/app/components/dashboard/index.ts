// Dashboard Widgets - Barrel Export
// Modular, component-based, and scalable dashboard widgets

// Base Components
export { WidgetCard, StatCardSimple } from "./DashboardWidgets";

// Dashboard Section Widgets (Operativo/Día a día)
export {
    TodaySummaryWidget,
    UpcomingReservationsWidget,
    QuickStatsRow,
} from "./DashboardWidgets";

// Balance Section Widgets (Financiero/Analítico)
export {
    PeriodComparisonCard,
    MetricComparisonCard, // Alias for backwards compatibility
    RevenueSummaryWidget,
    RevenueForecastWidget,
    PeakHourWidget,
    CancellationWidget,
    ServicePopularityWidget,
    WeekdayDistributionWidget,
    StaffPerformanceWidget,
    TopClientsWidget,
    AtRiskClientsWidget,
} from "./DashboardWidgets";

// Info Widgets (Unified style)
export {
    BusinessInfoWidget,
    ScheduleInfoWidget,
    DayAgendaWidget,
    ReservationLogWidget,
} from "./DashboardWidgets";

export type { TrendDirection } from "./DashboardWidgets";

// Pending Confirmations (Reservation Status Workflow)
export {
    ServiceConfirmationModal,
    PendingConfirmationsWidget,
    ServiceEndNotificationProvider,
    PendingStatsCard,
} from "./PendingConfirmations";
