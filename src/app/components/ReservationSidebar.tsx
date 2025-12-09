"use client";

import React from "react";
import { MiniCalendar } from "./MiniCalendar";

// ============================================================================
// TYPES
// ============================================================================

interface ReservationSidebarProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    onCreateTurn: () => void;
    canCreateTurn: boolean;
    primaryColor?: string;
    isCurrentWeek?: boolean;
    onGoToToday?: () => void;
    websiteUrl?: string;
    businessName?: string;
}

// ============================================================================
// RESERVATION SIDEBAR COMPONENT
// ============================================================================

export function ReservationSidebar({
    selectedDate,
    onSelectDate,
    onCreateTurn,
    canCreateTurn,
    primaryColor = "#7c3aed",
    isCurrentWeek = true,
    onGoToToday,
    websiteUrl,
    businessName,
}: ReservationSidebarProps) {
    return (
        <div className="space-y-4">
            {/* Create Turn Button - PROMINENT */}
            <button
                className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${!canCreateTurn
                        ? "cursor-not-allowed bg-slate-700/50 opacity-60"
                        : "bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 hover:from-indigo-600 hover:via-violet-600 hover:to-purple-600 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:translate-y-[-1px]"
                    }`}
                disabled={!canCreateTurn}
                type="button"
                onClick={onCreateTurn}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Crear turno
            </button>

            {/* Mini Calendar - Shows 2 months like AgendaPro */}
            <MiniCalendar
                selectedDate={selectedDate}
                onSelectDate={onSelectDate}
                months={2}
                primaryColor={primaryColor}
            />

            {/* Today button */}
            {!isCurrentWeek && onGoToToday && (
                <button
                    className="w-full py-2.5 px-4 rounded-xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-300 font-medium text-sm hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2"
                    type="button"
                    onClick={onGoToToday}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Volver a hoy
                </button>
            )}

            {/* Website Link Widget */}
            {websiteUrl && (
                <div className="bg-white/5 rounded-xl border border-white/10 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Sitio Web</div>
                    <div className="flex items-center gap-2 text-xs text-slate-300 mb-3 overflow-hidden">
                        <span className="truncate">{websiteUrl}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="flex-1 py-1.5 px-3 rounded-lg border border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
                            onClick={() => {
                                navigator.clipboard.writeText(websiteUrl);
                            }}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copiar
                        </button>
                        <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1.5 px-3 rounded-lg border border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Ver
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReservationSidebar;
