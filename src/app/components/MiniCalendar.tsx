"use client";

import React, { useState, useMemo } from "react";

// ============================================================================
// TYPES
// ============================================================================

interface MiniCalendarProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    months?: number; // How many months to show
    primaryColor?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const MONTHS_ES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function getMonthDays(year: number, month: number): (Date | null)[] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Get day of week for the first day (0 = Sunday, adjust for Monday start)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push(null);
    }

    // Add all days of the month
    for (let d = 1; d <= daysInMonth; d++) {
        days.push(new Date(year, month, d));
    }

    return days;
}

// ============================================================================
// MINI CALENDAR COMPONENT
// ============================================================================

export function MiniCalendar({
    selectedDate,
    onSelectDate,
    months = 2,
    primaryColor = "#7c3aed",
}: MiniCalendarProps) {
    const today = useMemo(() => new Date(), []);
    const todayKey = formatDateKey(today);
    const selectedKey = formatDateKey(selectedDate);

    // Generate the months to display
    const monthsToShow = useMemo(() => {
        const result: { year: number; month: number }[] = [];
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);

        for (let i = 0; i < months; i++) {
            const d = new Date(startDate);
            d.setMonth(startDate.getMonth() + i);
            result.push({ year: d.getFullYear(), month: d.getMonth() });
        }

        return result;
    }, [today, months]);

    return (
        <div className="space-y-3">
            {monthsToShow.map(({ year, month }) => {
                const days = getMonthDays(year, month);
                const monthName = MONTHS_ES[month];

                return (
                    <div key={`${year}-${month}`} className="bg-white/5 rounded-lg border border-white/10 p-2.5">
                        {/* Month Header */}
                        <div className="flex items-center justify-between mb-1.5">
                            <h4 className="text-xs font-semibold text-white">
                                {monthName} {year}
                            </h4>
                        </div>

                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 gap-0 mb-1">
                            {WEEKDAYS.map((day) => (
                                <div
                                    key={day}
                                    className="text-[9px] font-medium text-slate-500 text-center py-0.5"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-0">
                            {days.map((date, idx) => {
                                if (!date) {
                                    return <div key={`empty-${idx}`} className="h-6" />;
                                }

                                const dateKey = formatDateKey(date);
                                const isToday = dateKey === todayKey;
                                const isSelected = dateKey === selectedKey;
                                const isPast = date < today && !isToday;

                                return (
                                    <button
                                        key={dateKey}
                                        type="button"
                                        onClick={() => onSelectDate(date)}
                                        disabled={isPast}
                                        className={`
                                            h-6 w-full rounded text-xs font-medium transition-all
                                            flex items-center justify-center
                                            ${isPast
                                                ? "text-slate-600 cursor-not-allowed"
                                                : "hover:bg-white/10 cursor-pointer"
                                            }
                                            ${isSelected
                                                ? "text-white font-bold"
                                                : isToday
                                                    ? "text-indigo-400 font-bold"
                                                    : "text-slate-300"
                                            }
                                        `}
                                        style={{
                                            backgroundColor: isSelected ? primaryColor : undefined,
                                        }}
                                    >
                                        {date.getDate()}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================================
// MINI CALENDAR WITH NAVIGATION (scrollable months)
// ============================================================================

interface MiniCalendarNavigableProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    primaryColor?: string;
}

export function MiniCalendarNavigable({
    selectedDate,
    onSelectDate,
    primaryColor = "#7c3aed",
}: MiniCalendarNavigableProps) {
    const today = useMemo(() => new Date(), []);
    const todayKey = formatDateKey(today);
    const selectedKey = formatDateKey(selectedDate);

    // Track which month we're viewing
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const viewDate = new Date(viewYear, viewMonth, 1);
    const monthName = MONTHS_ES[viewMonth];

    const goToPrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const days = getMonthDays(viewYear, viewMonth);

    // Check if we can go back (don't go before current month)
    const canGoPrev = viewYear > today.getFullYear() ||
        (viewYear === today.getFullYear() && viewMonth > today.getMonth());

    return (
        <div className="bg-white/5 rounded-xl border border-white/10 p-3">
            {/* Month Navigation Header */}
            <div className="flex items-center justify-between mb-3">
                <button
                    type="button"
                    onClick={goToPrevMonth}
                    disabled={!canGoPrev}
                    className={`p-1 rounded-lg transition-colors ${canGoPrev
                        ? "hover:bg-white/10 text-slate-300"
                        : "text-slate-600 cursor-not-allowed"
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h4 className="text-sm font-semibold text-white">
                    {monthName} {viewYear}
                </h4>
                <button
                    type="button"
                    onClick={goToNextMonth}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
                {WEEKDAYS.map((day) => (
                    <div
                        key={day}
                        className="text-[10px] font-medium text-slate-500 text-center py-1"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-0.5">
                {days.map((date, idx) => {
                    if (!date) {
                        return <div key={`empty-${idx}`} className="h-7" />;
                    }

                    const dateKey = formatDateKey(date);
                    const isToday = dateKey === todayKey;
                    const isSelected = dateKey === selectedKey;
                    const isPast = date < today && !isToday;

                    return (
                        <button
                            key={dateKey}
                            type="button"
                            onClick={() => onSelectDate(date)}
                            disabled={isPast}
                            className={`
                                h-7 w-full rounded-md text-xs font-medium transition-all
                                flex items-center justify-center
                                ${isPast
                                    ? "text-slate-600 cursor-not-allowed"
                                    : "hover:bg-white/10 cursor-pointer"
                                }
                                ${isSelected
                                    ? "text-white font-bold"
                                    : isToday
                                        ? "text-indigo-400 font-bold ring-1 ring-indigo-400/50"
                                        : "text-slate-300"
                                }
                            `}
                            style={{
                                backgroundColor: isSelected ? primaryColor : undefined,
                            }}
                        >
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default MiniCalendar;
