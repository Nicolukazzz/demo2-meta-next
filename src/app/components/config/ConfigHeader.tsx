/**
 * ConfigHeader - Header de configuración mejorado
 * 
 * Incluye:
 * - Logo y nombre del negocio
 * - Botón de refresh
 * - Navegación de vuelta al dashboard
 * - Responsive para tablets
 */

"use client";

import React from "react";
import Link from "next/link";
import { BusinessLogo } from "../BusinessLogo";
import { RefreshButton } from "../ui/RefreshButton";

interface ConfigHeaderProps {
    logoUrl?: string;
    businessName: string;
    primaryColor?: string;
    onRefresh?: () => Promise<void> | void;
    className?: string;
}

export function ConfigHeader({
    logoUrl,
    businessName,
    primaryColor,
    onRefresh,
    className = "",
}: ConfigHeaderProps) {
    return (
        <header className={`
            flex items-center justify-between gap-4
            border-b border-white/10 bg-slate-950/80 backdrop-blur
            px-4 sm:px-6 py-3 sm:py-4
            ${className}
        `}>
            {/* Left: Logo + Business Name */}
            <div className="flex items-center gap-3 min-w-0">
                <BusinessLogo
                    logoUrl={logoUrl}
                    businessName={businessName}
                    primaryColor={primaryColor}
                    size="md"
                />
                <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wide">
                        Configuración
                    </p>
                    <h1 className="text-base sm:text-lg font-semibold text-white truncate">
                        {businessName || "Tu negocio"}
                    </h1>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {/* Refresh Button */}
                {onRefresh && (
                    <RefreshButton
                        onRefresh={onRefresh}
                        tooltip="Recargar datos"
                        size="md"
                        variant="default"
                    />
                )}

                {/* Back to Dashboard */}
                <Link
                    href="/"
                    className="
                        inline-flex items-center gap-2
                        rounded-lg border border-white/10 bg-white/10 
                        px-3 py-2 text-xs font-semibold text-white 
                        transition hover:bg-white/15
                    "
                >
                    <svg className="w-4 h-4 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="hidden sm:inline">Volver al dashboard</span>
                    <span className="sm:hidden">Dashboard</span>
                </Link>
            </div>
        </header>
    );
}

export default ConfigHeader;
