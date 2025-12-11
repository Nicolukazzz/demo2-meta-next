/**
 * Icons - Biblioteca de iconos SVG centralizados
 * 
 * Este archivo centraliza todos los iconos usados en la aplicación
 * para evitar duplicación y facilitar el mantenimiento.
 * 
 * Los iconos son funciones que devuelven JSX para permitir
 * personalización de className.
 */

import React from "react";

// ============================================================================
// TIPOS
// ============================================================================

type IconProps = {
    className?: string;
    strokeWidth?: number;
};

// ============================================================================
// ICONOS DE NAVEGACIÓN
// ============================================================================

export const RefreshIcon = ({ className = "h-5 w-5", strokeWidth = 2 }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={strokeWidth}
        stroke="currentColor"
        className={className}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
        />
    </svg>
);

export const CheckIcon = ({ className = "h-5 w-5", strokeWidth = 2.5 }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={strokeWidth}
        stroke="currentColor"
        className={className}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

export const ArrowLeftIcon = ({ className = "h-5 w-5", strokeWidth = 2 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

// ============================================================================
// ICONOS DE ESTADO
// ============================================================================

export const CalendarIcon = ({ className = "h-5 w-5", strokeWidth = 1.5 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        />
    </svg>
);

export const ClockIcon = ({ className = "h-5 w-5", strokeWidth = 1.5 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

export const CheckCircleIcon = ({ className = "h-5 w-5", strokeWidth = 1.5 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

export const XCircleIcon = ({ className = "h-5 w-5", strokeWidth = 1.5 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

export const MoneyIcon = ({ className = "h-5 w-5", strokeWidth = 1.5 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

// ============================================================================
// ICONOS DE ACCIONES
// ============================================================================

export const TrashIcon = ({ className = "h-5 w-5", strokeWidth = 2 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
    </svg>
);

export const PlusIcon = ({ className = "h-5 w-5", strokeWidth = 2 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

export const PencilIcon = ({ className = "h-5 w-5", strokeWidth = 2 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
    </svg>
);

export const PhoneIcon = ({ className = "h-5 w-5", strokeWidth = 2 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
    </svg>
);

export const UsersIcon = ({ className = "h-5 w-5", strokeWidth = 1.5 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
    </svg>
);

export const CogIcon = ({ className = "h-5 w-5", strokeWidth = 1.5 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

// ============================================================================
// ICONOS DE TENDENCIA
// ============================================================================

export const TrendUpIcon = ({ className = "h-4 w-4", strokeWidth = 2 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
        />
    </svg>
);

export const TrendDownIcon = ({ className = "h-4 w-4", strokeWidth = 2 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181"
        />
    </svg>
);

// ============================================================================
// ICONOS DE UI
// ============================================================================

export const ChevronLeftIcon = ({ className = "h-5 w-5", strokeWidth = 2 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

export const ChevronRightIcon = ({ className = "h-5 w-5", strokeWidth = 2 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

export const MenuIcon = ({ className = "h-5 w-5", strokeWidth = 2 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

export const XIcon = ({ className = "h-5 w-5", strokeWidth = 2 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const ExternalLinkIcon = ({ className = "h-5 w-5", strokeWidth = 2 }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
    </svg>
);

// ============================================================================
// OBJETO DE ICONOS (para compatibilidad con código existente)
// ============================================================================

export const Icons = {
    refresh: <RefreshIcon />,
    check: <CheckIcon />,
    arrowLeft: <ArrowLeftIcon />,
    calendar: <CalendarIcon />,
    clock: <ClockIcon />,
    checkCircle: <CheckCircleIcon />,
    xCircle: <XCircleIcon />,
    money: <MoneyIcon />,
    trash: <TrashIcon />,
    plus: <PlusIcon />,
    pencil: <PencilIcon />,
    phone: <PhoneIcon />,
    users: <UsersIcon />,
    cog: <CogIcon />,
    trendUp: <TrendUpIcon />,
    trendDown: <TrendDownIcon />,
    chevronLeft: <ChevronLeftIcon />,
    chevronRight: <ChevronRightIcon />,
    menu: <MenuIcon />,
    x: <XIcon />,
    externalLink: <ExternalLinkIcon />,
};

export default Icons;
