/**
 * RefreshButton - Botón de actualización manual
 * 
 * Componente modular para refrescar datos bajo demanda.
 * Incluye animación de rotación durante el refresh y 
 * feedback visual de éxito/error.
 */

"use client";

import React, { useState, useCallback } from "react";

interface RefreshButtonProps {
    /** Función async que se ejecuta al hacer click */
    onRefresh: () => Promise<void> | void;
    /** Texto tooltip */
    tooltip?: string;
    /** Tamaño del botón */
    size?: "sm" | "md" | "lg";
    /** Mostrar solo icono (sin texto) */
    iconOnly?: boolean;
    /** Texto del botón (cuando no es iconOnly) */
    label?: string;
    /** Clases adicionales */
    className?: string;
    /** Variante visual */
    variant?: "default" | "subtle" | "ghost";
}

export function RefreshButton({
    onRefresh,
    tooltip = "Actualizar datos",
    size = "md",
    iconOnly = true,
    label = "Actualizar",
    className = "",
    variant = "default",
}: RefreshButtonProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    const handleClick = useCallback(async () => {
        if (isRefreshing) return;

        setIsRefreshing(true);
        setStatus("idle");

        try {
            await onRefresh();
            setStatus("success");
            // Reset success state after 2s
            setTimeout(() => setStatus("idle"), 2000);
        } catch (err) {
            setStatus("error");
            setTimeout(() => setStatus("idle"), 3000);
        } finally {
            setIsRefreshing(false);
        }
    }, [onRefresh, isRefreshing]);

    // Size classes
    const sizeClasses = {
        sm: "p-1.5 text-xs",
        md: "p-2 text-sm",
        lg: "p-2.5 text-base",
    };

    const iconSizes = {
        sm: "w-3.5 h-3.5",
        md: "w-4 h-4",
        lg: "w-5 h-5",
    };

    // Variant classes
    const variantClasses = {
        default: "bg-white/10 border border-white/10 hover:bg-white/15 hover:border-white/20",
        subtle: "bg-transparent hover:bg-white/10",
        ghost: "bg-transparent hover:bg-white/5",
    };

    // Status colors
    const statusColors = {
        idle: "text-white",
        success: "text-emerald-400",
        error: "text-rose-400",
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isRefreshing}
            title={tooltip}
            className={`
                inline-flex items-center justify-center gap-2 rounded-lg
                font-medium transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${sizeClasses[size]}
                ${variantClasses[variant]}
                ${statusColors[status]}
                ${className}
            `}
        >
            {/* Icon - Cambia a checkmark en éxito */}
            {status === "success" ? (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className={iconSizes[size]}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                    />
                </svg>
            ) : (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className={`
                        ${iconSizes[size]}
                        transition-transform duration-500
                        ${isRefreshing ? "animate-spin" : ""}
                    `}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                </svg>
            )}

            {/* Label (optional) */}
            {!iconOnly && <span>{label}</span>}
        </button>
    );
}

/**
 * Hook para usar con RefreshButton
 * Permite agrupar múltiples funciones de refetch
 */
export function useRefreshAll(refreshFunctions: (() => Promise<void> | void)[]) {
    return useCallback(async () => {
        await Promise.all(refreshFunctions.map(fn => fn()));
    }, [refreshFunctions]);
}

export default RefreshButton;
