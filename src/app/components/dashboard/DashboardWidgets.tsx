"use client";

import React from "react";
import { formatCOP } from "@/lib/metrics";
import { formatTime12h, formatTimeRange12h } from "@/lib/dateFormat";

// ========== TIPOS ==========
export type TrendDirection = "up" | "down" | "stable";

// ========== ICONOS SVG REUTILIZABLES ==========
const Icons = {
    calendar: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    ),
    clock: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    chart: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
    ),
    money: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    users: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
    ),
    star: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
    ),
    warning: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
    ),
    sparkles: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
    ),
    checkCircle: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    xCircle: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    trendUp: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
    ),
    trendDown: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
        </svg>
    ),
};

// ========== BASE WIDGET CARD ==========
type WidgetCardProps = {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
};

export function WidgetCard({ title, subtitle, icon, children, className = "", action }: WidgetCardProps) {
    return (
        <div className={`rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 ${className}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                            {icon}
                        </div>
                    )}
                    <div>
                        <h3 className="text-sm font-semibold text-white">{title}</h3>
                        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
                    </div>
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

// ========== STAT CARD SIMPLE ==========
type StatCardSimpleProps = {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    tone?: "default" | "emerald" | "amber" | "rose" | "indigo" | "purple";
    description?: string;
};

export function StatCardSimple({ label, value, icon, tone = "default", description }: StatCardSimpleProps) {
    const toneClasses = {
        default: "bg-white/5 border-white/10 text-white",
        emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
        amber: "bg-amber-500/10 border-amber-500/20 text-amber-300",
        rose: "bg-rose-500/10 border-rose-500/20 text-rose-300",
        indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-300",
        purple: "bg-purple-500/10 border-purple-500/20 text-purple-300",
    };

    const iconColors = {
        default: "text-slate-400",
        emerald: "text-emerald-400",
        amber: "text-amber-400",
        rose: "text-rose-400",
        indigo: "text-indigo-400",
        purple: "text-purple-400",
    };

    return (
        <div className={`rounded-xl border p-4 ${toneClasses[tone]}`}>
            <div className="flex items-start gap-3">
                {icon && <div className={`shrink-0 ${iconColors[tone]}`}>{icon}</div>}
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="text-2xl font-bold mt-0.5">{value}</p>
                    {description && <p className="text-[10px] text-slate-500 mt-1">{description}</p>}
                </div>
            </div>
        </div>
    );
}

// ========== QUICK STATS ROW (DASHBOARD) ==========
type QuickStatsData = {
    total: number;
    confirmed: number;
    pending?: number; // Optional - no logic for this yet
    canceled: number;
    next24h: number;
    thisWeek: number;
};

type QuickStatsRowProps = {
    data: QuickStatsData;
    className?: string;
};

export function QuickStatsRow({ data, className = "" }: QuickStatsRowProps) {
    return (
        <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 ${className}`}>
            <StatCardSimple
                label="Total reservas"
                value={data.total}
                tone="default"
                icon={Icons.calendar}
                description="Todas las reservas"
            />
            <StatCardSimple
                label="✅ Confirmadas"
                value={data.confirmed}
                tone="emerald"
                icon={Icons.checkCircle}
                description="Listas para atender"
            />
            <StatCardSimple
                label="⏳ Pendientes"
                value={data.pending || 0}
                tone="amber"
                icon={Icons.clock}
                description="Por confirmar"
            />
            <StatCardSimple
                label="❌ Canceladas"
                value={data.canceled}
                tone="rose"
                icon={Icons.xCircle}
                description="No se realizaron"
            />
            <StatCardSimple
                label="🕐 Próximas 24h"
                value={data.next24h}
                tone="indigo"
                description="En las próximas horas"
            />
            <StatCardSimple
                label="📅 Esta semana"
                value={data.thisWeek}
                tone="purple"
                description="Lunes a domingo"
            />
        </div>
    );
}

// ========== TODAY SUMMARY WIDGET (DASHBOARD) ==========
type TodaySummaryData = {
    todayReservations: number;
    confirmedToday: number;
    pendingToday: number;
    expectedRevenue: number;
    nextReservation?: { name: string; time: string; service: string };
};

type TodaySummaryWidgetProps = {
    data: TodaySummaryData;
    className?: string;
};

export function TodaySummaryWidget({ data, className = "" }: TodaySummaryWidgetProps) {
    const today = new Date();
    const dayName = new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(today);
    const dateStr = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(today);

    return (
        <WidgetCard
            title={`Hoy, ${dayName}`}
            subtitle={dateStr}
            icon={Icons.calendar}
            className={className}
            action={
                <span className="text-xs text-indigo-400 font-semibold px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30">
                    {data.todayReservations} citas
                </span>
            }
        >
            <div className="space-y-4">
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <p className="text-3xl font-bold text-emerald-400">{data.confirmedToday}</p>
                        <p className="text-[10px] text-emerald-300/70 uppercase">Citas confirmadas</p>
                    </div>
                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                        <p className="text-xl font-bold text-indigo-400">{formatCOP(data.expectedRevenue)}</p>
                        <p className="text-[10px] text-indigo-300/70 uppercase">Ingresos esperados</p>
                    </div>
                </div>

                {/* Next Reservation */}
                {data.nextReservation ? (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-indigo-400">{Icons.clock}</span>
                            <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-medium">Próxima cita</p>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-base font-semibold text-white">{data.nextReservation.name}</p>
                                <p className="text-xs text-slate-400">{data.nextReservation.service}</p>
                            </div>
                            <span className="text-2xl font-bold text-indigo-300">{formatTime12h(data.nextReservation.time)}</span>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 rounded-xl bg-slate-500/10 border border-slate-500/20 text-center">
                        <p className="text-sm text-slate-400">🎉 No hay más citas pendientes hoy</p>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}

// ========== UPCOMING RESERVATIONS WIDGET (DASHBOARD) ==========
type UpcomingReservation = {
    id: string;
    name: string;
    time: string;
    service: string;
    status: string;
};

type UpcomingReservationsWidgetProps = {
    data: UpcomingReservation[];
    className?: string;
};

export function UpcomingReservationsWidget({ data, className = "" }: UpcomingReservationsWidgetProps) {
    const statusColors: Record<string, string> = {
        Confirmada: "bg-emerald-500",
        Pendiente: "bg-amber-500",
        Cancelada: "bg-rose-500",
    };

    return (
        <WidgetCard
            title="Próximas Citas"
            subtitle="Las siguientes 5 reservas"
            icon={Icons.users}
            className={className}
        >
            {data.length > 0 ? (
                <div className="space-y-2">
                    {data.slice(0, 5).map((res, i) => (
                        <div
                            key={res.id || i}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                        >
                            <span className={`h-2.5 w-2.5 rounded-full ${statusColors[res.status] || "bg-slate-500"} shrink-0`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{res.name}</p>
                                <p className="text-[10px] text-slate-400">{res.service}</p>
                            </div>
                            <span className="text-base font-bold text-indigo-300">{formatTime12h(res.time)}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6">
                    <span className="text-3xl">📭</span>
                    <p className="text-sm text-slate-400 mt-2">No hay reservas próximas</p>
                </div>
            )}
        </WidgetCard>
    );
}

// ========== PERIOD COMPARISON CARD (BALANCE) ==========
type PeriodComparisonProps = {
    title: string;
    periodLabel: string;
    value: number;
    change: number;
    reservationCount: number;
    icon?: React.ReactNode;
    className?: string;
};

export function PeriodComparisonCard({
    title,
    periodLabel,
    value,
    change,
    reservationCount,
    icon,
    className = "",
}: PeriodComparisonProps) {
    const isPositive = change >= 0;
    const changeColor = isPositive ? "text-emerald-400" : "text-rose-400";
    const changeBg = isPositive ? "bg-emerald-500/20" : "bg-rose-500/20";

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 ${className}`}>
            <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                    {icon || Icons.chart}
                </div>
                <div>
                    <p className="text-xs font-medium text-white">{title}</p>
                    <p className="text-[10px] text-slate-400">{periodLabel}</p>
                </div>
            </div>

            <div className="flex items-baseline justify-between">
                <div>
                    <p className="text-2xl font-bold text-white">{formatCOP(value)}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{reservationCount} reservas</p>
                </div>
                {change !== 0 && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${changeBg}`}>
                        {isPositive ? Icons.trendUp : Icons.trendDown}
                        <span className={`text-sm font-bold ${changeColor}`}>{Math.abs(change)}%</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Alias for backwards compatibility
export const MetricComparisonCard = PeriodComparisonCard;

// ========== REVENUE FORECAST WIDGET (BALANCE) ==========
type ForecastData = {
    expectedDailyRevenue: number;
    expectedWeeklyRevenue: number;
    expectedMonthlyRevenue: number;
    trend: TrendDirection;
    basedOnDays: number;
};

type RevenueForecastWidgetProps = {
    data: ForecastData;
    className?: string;
};

export function RevenueForecastWidget({ data, className = "" }: RevenueForecastWidgetProps) {
    const trendConfig = {
        up: { icon: "📈", text: "En crecimiento", color: "text-emerald-400", bg: "bg-emerald-500/20" },
        down: { icon: "📉", text: "En descenso", color: "text-rose-400", bg: "bg-rose-500/20" },
        stable: { icon: "📊", text: "Estable", color: "text-slate-400", bg: "bg-slate-500/20" },
    };
    const trend = trendConfig[data.trend];

    return (
        <WidgetCard
            title="💰 Pronóstico de Ingresos"
            subtitle={`Basado en los últimos ${data.basedOnDays} días`}
            icon={Icons.sparkles}
            className={className}
        >
            <div className="space-y-4">
                {/* Trend Indicator */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${trend.bg}`}>
                    <span className="text-lg">{trend.icon}</span>
                    <span className={`text-sm font-medium ${trend.color}`}>{trend.text}</span>
                </div>

                {/* Forecasts */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                        <p className="text-[10px] text-slate-400 uppercase mb-1">Diario</p>
                        <p className="text-sm font-bold text-white">{formatCOP(data.expectedDailyRevenue)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                        <p className="text-[10px] text-indigo-300 uppercase mb-1">Semanal</p>
                        <p className="text-sm font-bold text-indigo-300">{formatCOP(data.expectedWeeklyRevenue)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <p className="text-[10px] text-emerald-300 uppercase mb-1">Mensual</p>
                        <p className="text-sm font-bold text-emerald-300">{formatCOP(data.expectedMonthlyRevenue)}</p>
                    </div>
                </div>
            </div>
        </WidgetCard>
    );
}

// ========== PEAK HOUR WIDGET (BALANCE) ==========
type PeakHourData = { hour: number; label: string; count: number; revenue: number };

type PeakHourWidgetProps = {
    data: PeakHourData[];
    className?: string;
};

export function PeakHourWidget({ data, className = "" }: PeakHourWidgetProps) {
    const validData = data.filter((d) => d.count > 0);
    const maxCount = Math.max(...validData.map((d) => d.count), 1);
    const topHour = validData[0];

    return (
        <WidgetCard
            title="🕐 Hora Pico"
            subtitle="¿Cuándo tienes más clientes?"
            icon={Icons.clock}
            className={className}
        >
            {topHour ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                            {Icons.clock}
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{topHour.label}</p>
                            <p className="text-sm text-amber-300">{topHour.count} reservas • {formatCOP(topHour.revenue)}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Distribución por hora</p>
                        {validData.slice(0, 5).map((hour) => (
                            <div key={hour.hour} className="flex items-center gap-3">
                                <span className="text-xs text-slate-400 w-12 font-mono">{hour.label}</span>
                                <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                                        style={{ width: `${(hour.count / maxCount) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-300 w-6 text-right font-semibold">{hour.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-6">
                    <span className="text-3xl">🕐</span>
                    <p className="text-sm text-slate-400 mt-2">Sin datos de horarios aún</p>
                </div>
            )}
        </WidgetCard>
    );
}

// ========== CANCELLATION WIDGET (BALANCE) ==========
type CancellationData = {
    cancellationRate: number;
    cancelledReservations: number;
    lostRevenue: number;
    topCancelReasons: { reason: string; count: number }[];
};

type CancellationWidgetProps = {
    data: CancellationData;
    className?: string;
};

export function CancellationWidget({ data, className = "" }: CancellationWidgetProps) {
    const rateStatus = data.cancellationRate < 10
        ? { label: "¡Excelente!", color: "text-emerald-400", bg: "bg-emerald-500/20", icon: "✅" }
        : data.cancellationRate < 25
            ? { label: "Normal", color: "text-amber-400", bg: "bg-amber-500/20", icon: "⚠️" }
            : { label: "Alta", color: "text-rose-400", bg: "bg-rose-500/20", icon: "🚨" };

    return (
        <WidgetCard
            title="❌ Cancelaciones"
            subtitle="¿Cuántas reservas se cancelan?"
            icon={Icons.xCircle}
            className={className}
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className={`p-4 rounded-xl ${rateStatus.bg} border border-white/10`}>
                        <p className="text-[10px] text-slate-400 uppercase mb-1">Tasa de cancelación</p>
                        <div className="flex items-baseline gap-2">
                            <p className={`text-3xl font-bold ${rateStatus.color}`}>{data.cancellationRate}%</p>
                            <span className="text-lg">{rateStatus.icon}</span>
                        </div>
                        <p className={`text-[10px] ${rateStatus.color} mt-1`}>{rateStatus.label}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <p className="text-[10px] text-slate-400 uppercase mb-1">Dinero perdido</p>
                        <p className="text-xl font-bold text-rose-400">{formatCOP(data.lostRevenue)}</p>
                        <p className="text-[10px] text-rose-300/70 mt-1">{data.cancelledReservations} canceladas</p>
                    </div>
                </div>

                {data.topCancelReasons.length > 0 && (
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Razones principales</p>
                        <div className="space-y-1.5">
                            {data.topCancelReasons.slice(0, 3).map((reason, i) => (
                                <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/5">
                                    <span className="text-slate-300 truncate">{reason.reason}</span>
                                    <span className="text-rose-400 font-semibold ml-2">{reason.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}

// ========== STAFF PERFORMANCE WIDGET (BALANCE) ==========
type StaffPerformanceData = {
    staffId: string;
    name: string;
    role?: string;
    totalReservations: number;
    totalRevenue: number;
    averagePerReservation: number;
    cancellationRate: number;
};

type StaffPerformanceWidgetProps = {
    data: StaffPerformanceData[];
    className?: string;
};

export function StaffPerformanceWidget({ data, className = "" }: StaffPerformanceWidgetProps) {
    const maxRevenue = Math.max(...data.map((s) => s.totalRevenue), 1);
    const medals = ["🥇", "🥈", "🥉"];

    return (
        <WidgetCard
            title="👥 Rendimiento del Equipo"
            subtitle="¿Quién genera más ingresos?"
            icon={Icons.users}
            className={className}
        >
            {data.length > 0 ? (
                <div className="space-y-3">
                    {data.slice(0, 5).map((staff, i) => (
                        <div key={staff.staffId} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-lg">
                                {medals[i] || `${i + 1}`}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-medium text-white truncate">{staff.name}</p>
                                    <p className="text-sm font-bold text-emerald-400">{formatCOP(staff.totalRevenue)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                                            style={{ width: `${(staff.totalRevenue / maxRevenue) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-400">{staff.totalReservations} citas</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6">
                    <span className="text-3xl">👥</span>
                    <p className="text-sm text-slate-400 mt-2">No hay datos de empleados</p>
                </div>
            )}
        </WidgetCard>
    );
}

// ========== TOP CLIENTS WIDGET (BALANCE) ==========
type ClientData = {
    phone: string;
    name: string;
    totalReservations: number;
    totalSpent: number;
    daysSinceLastVisit: number;
};

type TopClientsWidgetProps = {
    data: ClientData[];
    className?: string;
};

export function TopClientsWidget({ data, className = "" }: TopClientsWidgetProps) {
    return (
        <WidgetCard
            title="⭐ Mejores Clientes"
            subtitle="Quienes más gastan en tu negocio"
            icon={Icons.star}
            className={className}
        >
            {data.length > 0 ? (
                <div className="space-y-2">
                    {data.slice(0, 5).map((client, i) => (
                        <div key={client.phone} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold
                ${i === 0 ? "bg-amber-500/30 text-amber-300" : "bg-indigo-500/20 text-indigo-300"}`}
                            >
                                {i === 0 ? "⭐" : i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{client.name}</p>
                                <p className="text-[10px] text-slate-400">{client.totalReservations} visitas</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-emerald-400">{formatCOP(client.totalSpent)}</p>
                                {client.daysSinceLastVisit > 30 && (
                                    <p className="text-[10px] text-amber-400">Hace {client.daysSinceLastVisit}d</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6">
                    <span className="text-3xl">⭐</span>
                    <p className="text-sm text-slate-400 mt-2">Aún no hay datos de clientes</p>
                </div>
            )}
        </WidgetCard>
    );
}

// ========== SERVICE POPULARITY WIDGET ==========
type ServiceData = { name: string; count: number; revenue: number };

type ServicePopularityWidgetProps = {
    data: ServiceData[];
    className?: string;
};

export function ServicePopularityWidget({ data, className = "" }: ServicePopularityWidgetProps) {
    const totalCount = data.reduce((acc, s) => acc + s.count, 0);
    const colors = [
        { dot: "bg-indigo-500", text: "text-indigo-400" },
        { dot: "bg-purple-500", text: "text-purple-400" },
        { dot: "bg-pink-500", text: "text-pink-400" },
        { dot: "bg-amber-500", text: "text-amber-400" },
        { dot: "bg-emerald-500", text: "text-emerald-400" },
    ];

    return (
        <WidgetCard
            title="💈 Servicios Populares"
            subtitle="¿Qué te piden más?"
            icon={Icons.sparkles}
            className={className}
        >
            {data.length > 0 ? (
                <div className="flex items-center gap-6">
                    {/* Donut Chart */}
                    <div className="relative h-24 w-24 shrink-0">
                        <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                            {data.slice(0, 5).map((service, i) => {
                                const percent = totalCount > 0 ? (service.count / totalCount) * 100 : 0;
                                const offset = data.slice(0, i).reduce((acc, s) =>
                                    acc + (totalCount > 0 ? (s.count / totalCount) * 100 : 0), 0);

                                return (
                                    <circle
                                        key={i}
                                        cx="18"
                                        cy="18"
                                        r="14"
                                        fill="none"
                                        stroke={`url(#service-gradient-${i})`}
                                        strokeWidth="4"
                                        strokeDasharray={`${percent} ${100 - percent}`}
                                        strokeDashoffset={-offset}
                                        className="transition-all duration-500"
                                    />
                                );
                            })}
                            <defs>
                                <linearGradient id="service-gradient-0"><stop stopColor="#6366f1" /></linearGradient>
                                <linearGradient id="service-gradient-1"><stop stopColor="#a855f7" /></linearGradient>
                                <linearGradient id="service-gradient-2"><stop stopColor="#ec4899" /></linearGradient>
                                <linearGradient id="service-gradient-3"><stop stopColor="#f59e0b" /></linearGradient>
                                <linearGradient id="service-gradient-4"><stop stopColor="#10b981" /></linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-white">{totalCount}</span>
                            <span className="text-[9px] text-slate-400">TOTAL</span>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex-1 space-y-2">
                        {data.slice(0, 5).map((service, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${colors[i]?.dot || "bg-slate-500"}`} />
                                <span className="text-xs text-slate-300 flex-1 truncate">{service.name}</span>
                                <span className={`text-xs font-semibold ${colors[i]?.text || "text-slate-400"}`}>{service.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-6">
                    <span className="text-3xl">💈</span>
                    <p className="text-sm text-slate-400 mt-2">No hay datos de servicios</p>
                </div>
            )}
        </WidgetCard>
    );
}

// ========== WEEKDAY DISTRIBUTION WIDGET ==========
type WeekdayData = { weekday: number; label: string; total: number };

type WeekdayDistributionWidgetProps = {
    data: WeekdayData[];
    className?: string;
    compact?: boolean;
};

export function WeekdayDistributionWidget({ data, className = "", compact = false }: WeekdayDistributionWidgetProps) {
    const maxTotal = Math.max(...data.map((d) => d.total), 1);
    const dayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const totalReservations = data.reduce((acc, d) => acc + d.total, 0);
    const topDay = data.reduce((max, d) => d.total > max.total ? d : max, data[0]);

    return (
        <WidgetCard
            title="📅 Días más Activos"
            subtitle="¿Cuándo vienen más clientes?"
            icon={Icons.calendar}
            className={className}
            action={totalReservations > 0 && (
                <span className="text-xs text-emerald-400 font-medium">
                    {totalReservations} citas
                </span>
            )}
        >
            {totalReservations > 0 ? (
                <div className={`flex items-end justify-between gap-1 ${compact ? "h-16" : "h-20"}`}>
                    {data.map((day, i) => {
                        const height = maxTotal > 0 ? (day.total / maxTotal) * 100 : 0;
                        const isTop = day.total === maxTotal && day.total > 0;

                        return (
                            <div key={day.weekday} className="flex-1 flex flex-col items-center gap-1">
                                <span className={`text-[10px] font-semibold ${isTop ? "text-amber-400" : "text-slate-500"}`}>
                                    {day.total > 0 ? day.total : ""}
                                </span>
                                <div className="w-full flex justify-center">
                                    <div
                                        className={`w-full max-w-6 rounded-t transition-all duration-300 ${isTop
                                            ? "bg-gradient-to-t from-amber-500 to-amber-400"
                                            : day.total > 0
                                                ? "bg-gradient-to-t from-indigo-600 to-indigo-400"
                                                : "bg-slate-700"
                                            }`}
                                        style={{ height: `${Math.max(height, 10)}%`, minHeight: "4px" }}
                                    />
                                </div>
                                <span className={`text-[9px] font-medium ${isTop ? "text-amber-400" : "text-slate-500"}`}>
                                    {dayLabels[i]}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-4">
                    <span className="text-2xl">📅</span>
                    <p className="text-xs text-slate-400 mt-1">Sin datos aún</p>
                </div>
            )}
        </WidgetCard>
    );
}

// ========== AT-RISK CLIENTS WIDGET (BALANCE) ==========
type AtRiskClient = {
    name: string;
    phone: string;
    daysSinceLastVisit: number;
    totalSpent: number;
};

type AtRiskClientsWidgetProps = {
    data: AtRiskClient[];
    className?: string;
};

export function AtRiskClientsWidget({ data, className = "" }: AtRiskClientsWidgetProps) {
    return (
        <WidgetCard
            title="⚠️ Clientes que no han vuelto"
            subtitle="Más de 30 días sin visitarte"
            icon={Icons.warning}
            className={className}
            action={data.length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
                    {data.length} clientes
                </span>
            )}
        >
            {data.length > 0 ? (
                <div className="space-y-2">
                    {data.slice(0, 4).map((client, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-lg">
                                ⚠️
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{client.name}</p>
                                <p className="text-[10px] text-amber-400">Última visita hace {client.daysSinceLastVisit} días</p>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">{formatCOP(client.totalSpent)}</p>
                        </div>
                    ))}
                    {data.length > 4 && (
                        <p className="text-xs text-slate-400 text-center pt-2">
                            +{data.length - 4} clientes más
                        </p>
                    )}
                </div>
            ) : (
                <div className="text-center py-6">
                    <span className="text-3xl">🎉</span>
                    <p className="text-sm text-emerald-400 font-medium mt-2">¡Todos tus clientes están activos!</p>
                    <p className="text-xs text-slate-400 mt-1">No hay clientes en riesgo</p>
                </div>
            )}
        </WidgetCard>
    );
}

// ========== REVENUE SUMMARY WIDGET (BALANCE) ==========
type RevenueSummaryData = {
    totalRevenue: number;
    monthRevenue: number;
    weekRevenue: number;
    averageTicket: number;
    paidReservations: number;
};

type RevenueSummaryWidgetProps = {
    data: RevenueSummaryData;
    className?: string;
};

export function RevenueSummaryWidget({ data, className = "" }: RevenueSummaryWidgetProps) {
    return (
        <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 ${className}`}>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-400">{Icons.money}</span>
                    <p className="text-[10px] text-emerald-300 uppercase tracking-wide font-medium">Ingresos Totales</p>
                </div>
                <p className="text-2xl font-bold text-emerald-300">{formatCOP(data.totalRevenue)}</p>
                <p className="text-[10px] text-emerald-400/70 mt-1">Todo el historial</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-400">{Icons.calendar}</span>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Este Mes</p>
                </div>
                <p className="text-2xl font-bold text-white">{formatCOP(data.monthRevenue)}</p>
                <p className="text-[10px] text-slate-500 mt-1">Mes actual</p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-400">{Icons.clock}</span>
                    <p className="text-[10px] text-amber-300 uppercase tracking-wide font-medium">Esta Semana</p>
                </div>
                <p className="text-2xl font-bold text-amber-300">{formatCOP(data.weekRevenue)}</p>
                <p className="text-[10px] text-amber-400/70 mt-1">Últimos 7 días</p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/30">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-indigo-400">{Icons.checkCircle}</span>
                    <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-medium">Citas Pagadas</p>
                </div>
                <p className="text-2xl font-bold text-indigo-300">{data.paidReservations}</p>
                <p className="text-[10px] text-indigo-400/70 mt-1">Confirmadas</p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-purple-400">{Icons.chart}</span>
                    <p className="text-[10px] text-purple-300 uppercase tracking-wide font-medium">Ticket Promedio</p>
                </div>
                <p className="text-2xl font-bold text-purple-300">{formatCOP(data.averageTicket)}</p>
                <p className="text-[10px] text-purple-400/70 mt-1">Por reserva</p>
            </div>
        </div>
    );
}

// ========== BUSINESS INFO WIDGET ==========
type BusinessInfoWidgetProps = {
    businessName: string;
    stats: {
        total: number;
        next24h: number;
        thisWeek: number;
    };
    nextWorkingDate?: string;
    error?: string | null;
    loading?: boolean;
    className?: string;
};

export function BusinessInfoWidget({
    businessName,
    stats,
    nextWorkingDate,
    error,
    loading = false,
    className = "",
}: BusinessInfoWidgetProps) {
    return (
        <div className={`rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 ${className}`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                    {Icons.star}
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Negocio</p>
                    <h3 className="text-lg font-semibold text-white">{businessName}</h3>
                </div>
            </div>

            {error && <p className="mb-3 text-xs text-rose-300">{error}</p>}

            {loading ? (
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Reservas Totales</p>
                        <p className="text-xl font-bold text-white">{stats.total}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20">
                        <p className="text-[10px] text-emerald-400/80 uppercase tracking-wide mb-1">Próximas 24h</p>
                        <p className="text-xl font-bold text-emerald-400">{stats.next24h}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/20">
                        <p className="text-[10px] text-amber-400/80 uppercase tracking-wide mb-1">Esta semana</p>
                        <p className="text-xl font-bold text-amber-400">{stats.thisWeek}</p>
                    </div>
                </div>
            )}

            {nextWorkingDate && (
                <p className="mt-4 text-xs text-slate-400">
                    Próxima fecha hábil: <span className="font-medium text-white">{nextWorkingDate}</span>
                </p>
            )}
        </div>
    );
}

// ========== SCHEDULE INFO WIDGET ==========
type ScheduleInfoWidgetProps = {
    openTime: string;
    closeTime: string;
    slotMinutes: number;
    isClosed?: boolean;
    className?: string;
};

export function ScheduleInfoWidget({
    openTime,
    closeTime,
    slotMinutes,
    isClosed = false,
    className = "",
}: ScheduleInfoWidgetProps) {
    return (
        <div className={`rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 ${className}`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                    {Icons.clock}
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Horario</p>
                    <h3 className="text-lg font-semibold text-white">Disponibilidad</h3>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Apertura</p>
                    <p className="text-lg font-bold text-indigo-300">{formatTime12h(openTime)}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Cierre</p>
                    <p className="text-lg font-bold text-indigo-300">{formatTime12h(closeTime)}</p>
                </div>
            </div>

            {isClosed && (
                <p className="mt-3 text-xs text-rose-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Cerrado en el día seleccionado
                </p>
            )}
        </div>
    );
}

// ========== DAY AGENDA WIDGET ==========
type AgendaSlot = {
    time: string;
    reservations: Array<{
        _id: string;
        name: string;
        serviceName?: string;
        staffName?: string;
        status?: string;
        time: string;
        endTime?: string;
    }>;
};

type DayAgendaWidgetProps = {
    dateFormatted: string;
    dayName: string;
    slots: AgendaSlot[];
    isClosed?: boolean;
    error?: string | null;
    onReservationClick?: (reservation: AgendaSlot["reservations"][0]) => void;
    className?: string;
};

export function DayAgendaWidget({
    dateFormatted,
    dayName,
    slots,
    isClosed = false,
    error,
    onReservationClick,
    className = "",
}: DayAgendaWidgetProps) {
    const totalReservations = slots.reduce((acc, s) => acc + s.reservations.length, 0);

    return (
        <div className={`rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                        {Icons.calendar}
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Agenda del día</p>
                        <h3 className="text-base font-semibold text-white">{dayName}, {dateFormatted}</h3>
                    </div>
                </div>
                <div className="text-center px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <p className="text-xl font-bold text-purple-300">{isClosed ? 0 : totalReservations}</p>
                    <p className="text-[9px] text-purple-400 uppercase tracking-wide">Turnos</p>
                </div>
            </div>

            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
                {error ? (
                    <p className="text-xs text-rose-300 py-4 text-center">{error}</p>
                ) : isClosed ? (
                    <div className="text-center py-8">
                        <span className="text-3xl opacity-50">🚫</span>
                        <p className="text-sm text-slate-400 mt-2">Cerrado hoy</p>
                    </div>
                ) : slots.length === 0 ? (
                    <div className="text-center py-8">
                        <span className="text-3xl opacity-50">📅</span>
                        <p className="text-sm text-slate-400 mt-2">Sin horarios</p>
                    </div>
                ) : (
                    slots.map((slot) => (
                        <div key={slot.time} className="rounded-xl border border-white/5 overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-white/5">
                                <p className="text-sm font-bold text-white">{formatTime12h(slot.time)}</p>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                                    {slot.reservations.length > 0 ? `${slot.reservations.length} turno(s)` : "Disponible"}
                                </span>
                            </div>
                            {slot.reservations.length > 0 && (
                                <div className="px-2 py-2 space-y-1.5">
                                    {slot.reservations.map((res) => (
                                        <button
                                            key={res._id}
                                            onClick={() => onReservationClick?.(res)}
                                            className="w-full text-left p-2.5 rounded-lg bg-gradient-to-r from-white/5 to-transparent border-l-4 hover:from-white/10 transition-all"
                                            style={{
                                                borderLeftColor: res.status === "Confirmada" ? "rgb(16, 185, 129)"
                                                    : res.status === "Pendiente" ? "rgb(245, 158, 11)"
                                                        : "rgb(244, 63, 94)"
                                            }}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-white truncate">{res.name}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{res.serviceName || "Sin servicio"}</p>
                                                </div>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 shrink-0">
                                                    {res.endTime ? formatTimeRange12h(res.time, res.endTime) : formatTime12h(res.time)}
                                                </span>
                                            </div>
                                            {res.staffName && (
                                                <p className="text-[10px] text-indigo-300 mt-1">{res.staffName}</p>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// ========== RESERVATION LOG WIDGET (BITÁCORA) ==========
type ReservationLogItem = {
    _id: string;
    name: string;
    phone: string;
    serviceName?: string;
    staffName?: string;
    time: string;
    dateId: string;
    status?: string;
    createdAt?: string;
};

type ReservationLogWidgetProps = {
    reservations: ReservationLogItem[];
    loading?: boolean;
    error?: string | null;
    onViewDetail?: (reservation: ReservationLogItem) => void;
    className?: string;
};

export function ReservationLogWidget({
    reservations,
    loading = false,
    error,
    onViewDetail,
    className = "",
}: ReservationLogWidgetProps) {
    const statusConfig: Record<string, { bg: string; border: string; text: string; dot: string }> = {
        Confirmada: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300", dot: "bg-emerald-500" },
        Pendiente: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-300", dot: "bg-amber-500" },
        Cancelada: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-300", dot: "bg-rose-500" },
    };

    const formatDate = (dateId: string) => {
        const [year, month, day] = dateId.split("-");
        return `${day}/${month}/${year}`;
    };

    const sortedReservations = [...reservations].sort(
        (a, b) => ((a.createdAt ?? "") < (b.createdAt ?? "") ? 1 : -1)
    );

    return (
        <div className={`rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
                        {Icons.chart}
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Bitácora</p>
                        <h3 className="text-lg font-semibold text-white">Últimas reservas</h3>
                    </div>
                </div>
                <span className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-300">
                    {reservations.length} registros
                </span>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 max-h-[500px] overflow-y-auto pr-1">
                {loading ? (
                    <div className="col-span-full py-8 text-center">
                        <div className="w-8 h-8 mx-auto rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
                        <p className="text-sm text-slate-400 mt-3">Cargando reservas...</p>
                    </div>
                ) : error ? (
                    <div className="col-span-full py-8 text-center">
                        <span className="text-3xl opacity-50">⚠️</span>
                        <p className="text-sm text-rose-300 mt-2">{error}</p>
                    </div>
                ) : reservations.length === 0 ? (
                    <div className="col-span-full py-8 text-center">
                        <span className="text-3xl opacity-50">📋</span>
                        <p className="text-sm text-slate-400 mt-2">Sin registros aún</p>
                        <p className="text-xs text-slate-500 mt-1">Las reservas aparecerán aquí cuando se creen</p>
                    </div>
                ) : (
                    sortedReservations.map((reservation) => {
                        const status = reservation.status || "Confirmada";
                        const config = statusConfig[status] || statusConfig.Confirmada;

                        return (
                            <article
                                key={reservation._id}
                                className={`rounded-xl border p-4 transition-all hover:bg-white/5 ${config.border} bg-gradient-to-r from-white/5 to-transparent`}
                                style={{ borderLeftWidth: "4px" }}
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">
                                            {reservation.serviceName || "Sin servicio"} - {formatTime12h(reservation.time)}
                                        </p>
                                        <p className="text-[11px] text-slate-400 truncate">
                                            {reservation.staffName || "Cualquier profesional disponible"}
                                        </p>
                                    </div>
                                    <span className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${config.bg} ${config.text} border ${config.border}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                                        {status}
                                    </span>
                                </div>

                                <p className="text-xs text-slate-300 mb-3">
                                    {reservation.name} | {reservation.phone} | {formatDate(reservation.dateId)}
                                </p>

                                <button
                                    onClick={() => onViewDetail?.(reservation)}
                                    className="w-full py-1.5 rounded-lg bg-white/10 border border-white/10 text-xs text-white hover:bg-white/15 transition-colors"
                                >
                                    Ver detalle
                                </button>
                            </article>
                        );
                    })
                )}
            </div>
        </div>
    );
}
