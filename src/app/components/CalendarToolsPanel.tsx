"use client";

import React, { useState } from "react";
import { MiniCalendar } from "./MiniCalendar";

// ============================================================================
// TYPES
// ============================================================================

interface CalendarToolsPanelProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    onCreateTurn: () => void;
    canCreateTurn: boolean;
    primaryColor?: string;
    isCurrentWeek?: boolean;
    onGoToToday?: () => void;
}

// ============================================================================
// COMPACT CALENDAR TOOLS PANEL (for right sidebar)
// Ultra-compact design to maximize main calendar space
// ============================================================================

export function CalendarToolsPanel({
    selectedDate,
    onSelectDate,
    onCreateTurn,
    canCreateTurn,
    primaryColor = "#7c3aed",
    isCurrentWeek = true,
    onGoToToday,
}: CalendarToolsPanelProps) {
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);

    return (
        <div className="space-y-2">
            {/* Create Turn Button - PROMINENT */}
            <button
                className={`w-full py-2.5 px-3 rounded-lg font-semibold text-white text-sm transition-all flex items-center justify-center gap-2 ${!canCreateTurn
                        ? "cursor-not-allowed bg-slate-700/50 opacity-60"
                        : "bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 hover:from-indigo-600 hover:via-violet-600 hover:to-purple-600 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                    }`}
                disabled={!canCreateTurn}
                type="button"
                onClick={onCreateTurn}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Nuevo turno
            </button>

            {/* Collapsible Mini Calendar Section */}
            <div className="bg-white/5 rounded-lg border border-white/10">
                <button
                    type="button"
                    onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                    className="w-full flex items-center justify-between p-2 text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors rounded-lg"
                >
                    <span>Calendario</span>
                    <svg
                        className={`w-4 h-4 transition-transform ${isCalendarExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isCalendarExpanded && (
                    <div className="px-2 pb-2">
                        <MiniCalendar
                            selectedDate={selectedDate}
                            onSelectDate={onSelectDate}
                            months={2}
                            primaryColor={primaryColor}
                        />
                    </div>
                )}
            </div>

            {/* Today button */}
            {!isCurrentWeek && onGoToToday && (
                <button
                    className="w-full py-2 px-3 rounded-lg border border-indigo-400/30 bg-indigo-500/10 text-indigo-300 font-medium text-xs hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-1.5"
                    type="button"
                    onClick={onGoToToday}
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Ir a hoy
                </button>
            )}
        </div>
    );
}

export default CalendarToolsPanel;
