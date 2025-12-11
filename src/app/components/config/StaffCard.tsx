/**
 * StaffCard - Tarjeta de empleado simplificada
 * 
 * Solo muestra información visual. El toggle de activo
 * está en el panel de detalles para evitar duplicación.
 */

"use client";

import React from "react";
import type { StaffMember } from "@/lib/businessProfile";


interface StaffCardProps {
    staff: StaffMember;
    isSelected?: boolean;
    onClick: () => void;
    className?: string;
}

export function StaffCard({
    staff,
    isSelected = false,
    onClick,
    className = "",
}: StaffCardProps) {
    const isActive = staff.active !== false;

    return (
        <div
            onClick={onClick}
            className={`
                relative rounded-xl border p-3 transition-all duration-200 cursor-pointer
                ${isSelected
                    ? "border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500/30"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                }
                ${!isActive ? "opacity-50" : ""}
                ${className}
            `}
        >
            {/* Contenido principal */}
            <div className="flex items-center gap-3">
                {/* Avatar / Indicador de estado */}
                <div className={`
                    relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                    ${isActive
                        ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                        : "bg-slate-700 text-slate-400"
                    }
                `}>
                    {staff.name ? staff.name.charAt(0).toUpperCase() : "?"}
                    {/* Punto de estado */}
                    <span className={`
                        absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900
                        ${isActive ? "bg-emerald-400" : "bg-slate-500"}
                    `} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                        {staff.name || "Sin nombre"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                        {staff.role || "Sin rol"}
                    </p>
                </div>

                {/* Badge de estado - Solo visual, no interactivo */}
                <span className={`
                    px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0
                    ${isActive
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-slate-600/50 text-slate-400"
                    }
                `}>
                    {isActive ? "Activo" : "Inactivo"}
                </span>
            </div>

            {/* Indicador de selección */}
            {isSelected && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
            )}
        </div>
    );
}

/**
 * StaffList - Lista de empleados
 */
interface StaffListProps {
    staff: StaffMember[];
    selectedId?: string | null;
    onSelect: (id: string) => void;
    onAdd?: () => void;
    className?: string;
}

export function StaffList({
    staff,
    selectedId,
    onSelect,
    onAdd,
    className = "",
}: StaffListProps) {
    if (staff.length === 0) {
        return (
            <div className={`flex flex-col items-center justify-center py-8 text-center ${className}`}>
                <div className="w-14 h-14 rounded-full bg-slate-800/80 flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <p className="text-sm text-slate-300 font-medium mb-1">Sin empleados</p>
                <p className="text-xs text-slate-500 mb-4 max-w-[200px]">
                    Agrega tu primer empleado para asignar reservas
                </p>
                {onAdd && (
                    <button
                        type="button"
                        onClick={onAdd}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Agregar
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {staff.map((member) => (
                <StaffCard
                    key={member.id}
                    staff={member}
                    isSelected={selectedId === member.id}
                    onClick={() => onSelect(member.id)}
                />
            ))}
        </div>
    );
}

export default StaffCard;
