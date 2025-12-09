"use client";

import React from "react";
import { usePlanLimits } from "../hooks/usePlanLimits";
import { formatPlanPrice, getVisiblePlans } from "@/lib/plans";

type PlanBadgeProps = {
    planSlug?: string;
    staffCount?: number;
    showUpgrade?: boolean;
    onUpgradeClick?: () => void;
    className?: string;
};

/**
 * Badge showing current plan and staff usage
 */
export function PlanBadge({
    planSlug,
    staffCount = 0,
    showUpgrade = true,
    onUpgradeClick,
    className = "",
}: PlanBadgeProps) {
    const { plan, maxStaff, remainingSlots, isAtLimit, usagePercent } = usePlanLimits(
        planSlug,
        staffCount,
    );

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
                            Plan {plan.name}
                        </span>
                        {plan.highlighted && (
                            <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-200">
                                {plan.highlightLabel ?? "Popular"}
                            </span>
                        )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-400">{plan.subtitle}</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-white">{formatPlanPrice(plan)}</p>
                    <p className="text-xs text-slate-400">{plan.period}</p>
                </div>
            </div>

            {/* Staff usage bar */}
            <div className="mt-4">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Empleados</span>
                    <span className={isAtLimit ? "text-amber-300" : "text-slate-300"}>
                        {staffCount} / {maxStaff}
                    </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-slate-700/50 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${isAtLimit
                                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                                : usagePercent > 75
                                    ? "bg-gradient-to-r from-amber-400 to-yellow-400"
                                    : "bg-gradient-to-r from-indigo-500 to-sky-500"
                            }`}
                        style={{ width: `${usagePercent}%` }}
                    />
                </div>
                {isAtLimit ? (
                    <p className="mt-2 text-xs text-amber-300">
                        Has alcanzado el límite de empleados de tu plan.
                    </p>
                ) : remainingSlots <= 1 ? (
                    <p className="mt-2 text-xs text-slate-400">
                        Puedes agregar {remainingSlots} empleado(s) más.
                    </p>
                ) : null}
            </div>

            {/* Upgrade button */}
            {showUpgrade && isAtLimit && onUpgradeClick && (
                <button
                    type="button"
                    onClick={onUpgradeClick}
                    className="mt-4 w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-indigo-600 hover:to-purple-600"
                >
                    Actualizar plan
                </button>
            )}
        </div>
    );
}

type PlanSelectorProps = {
    currentPlanSlug?: string;
    onSelectPlan?: (planSlug: string) => void;
    className?: string;
};

/**
 * Grid of plans for selection/upgrade
 */
export function PlanSelector({ currentPlanSlug, onSelectPlan, className = "" }: PlanSelectorProps) {
    const plans = getVisiblePlans();

    return (
        <div className={`grid grid-cols-1 gap-4 md:grid-cols-3 ${className}`}>
            {plans.map((plan) => {
                const isCurrent = plan.slug === currentPlanSlug;
                return (
                    <div
                        key={plan.slug}
                        className={`relative rounded-2xl border p-6 transition ${plan.highlighted
                                ? "border-indigo-500/50 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                                : "border-white/10 bg-white/5"
                            } ${isCurrent ? "ring-2 ring-indigo-500" : ""}`}
                    >
                        {plan.highlighted && plan.highlightLabel && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 text-xs font-semibold text-white">
                                {plan.highlightLabel}
                            </div>
                        )}

                        <div className="text-center">
                            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                            <p className="mt-1 text-sm text-slate-400">{plan.subtitle}</p>
                            <div className="mt-4">
                                <span className="text-3xl font-bold text-white">{formatPlanPrice(plan)}</span>
                                <span className="text-sm text-slate-400">{plan.period}</span>
                            </div>
                            <p className="mt-2 text-xs text-slate-400">{plan.description}</p>
                        </div>

                        <ul className="mt-6 space-y-2">
                            {plan.features.map((feature, idx) => (
                                <li
                                    key={idx}
                                    className={`flex items-center gap-2 text-sm ${feature.included ? "text-slate-200" : "text-slate-500 line-through"
                                        }`}
                                >
                                    <span
                                        className={`flex h-4 w-4 items-center justify-center rounded-full ${feature.included ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700"
                                            }`}
                                    >
                                        {feature.included ? "✓" : "–"}
                                    </span>
                                    {feature.text}
                                </li>
                            ))}
                        </ul>

                        <button
                            type="button"
                            onClick={() => onSelectPlan?.(plan.slug)}
                            disabled={isCurrent}
                            className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${isCurrent
                                    ? "cursor-default bg-slate-700 text-slate-400"
                                    : plan.highlighted
                                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600"
                                        : "bg-white/10 text-white hover:bg-white/20"
                                }`}
                        >
                            {isCurrent ? "Plan actual" : plan.ctaText}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Compact plan info for sidebar/header
 */
export function PlanInfoCompact({
    planSlug,
    staffCount = 0,
    className = "",
}: {
    planSlug?: string;
    staffCount?: number;
    className?: string;
}) {
    const { plan, maxStaff, isAtLimit } = usePlanLimits(planSlug, staffCount);

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${isAtLimit
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-indigo-500/20 text-indigo-300"
                    }`}
            >
                {plan.name}
            </span>
            <span className="text-xs text-slate-400">
                {staffCount}/{maxStaff} empleados
            </span>
        </div>
    );
}
