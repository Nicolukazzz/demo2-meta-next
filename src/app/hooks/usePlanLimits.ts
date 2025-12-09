import { useMemo } from "react";
import { getPlanBySlug, getDefaultPlan, type SubscriptionPlan } from "@/lib/plans";

export type PlanInfo = {
    plan: SubscriptionPlan;
    staffCount: number;
    maxStaff: number;
    remainingSlots: number;
    canAddStaff: boolean;
    isAtLimit: boolean;
    usagePercent: number;
};

/**
 * Hook to get plan info and limits
 */
export function usePlanLimits(planSlug?: string, currentStaffCount: number = 0): PlanInfo {
    return useMemo(() => {
        const plan = getPlanBySlug(planSlug ?? "emprendedor") ?? getDefaultPlan();
        const maxStaff = plan.maxEmployees;
        const remainingSlots = Math.max(0, maxStaff - currentStaffCount);
        const canAddStaff = currentStaffCount < maxStaff;
        const isAtLimit = currentStaffCount >= maxStaff;
        const usagePercent = Math.min(100, Math.round((currentStaffCount / maxStaff) * 100));

        return {
            plan,
            staffCount: currentStaffCount,
            maxStaff,
            remainingSlots,
            canAddStaff,
            isAtLimit,
            usagePercent,
        };
    }, [planSlug, currentStaffCount]);
}
