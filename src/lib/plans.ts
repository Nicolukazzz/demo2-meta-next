// ============================================================================
// SUBSCRIPTION PLANS SYSTEM
// ============================================================================

export type PlanSlug = "emprendedor" | "profesional" | "negocio";

export type PlanFeature = {
    text: string;
    included: boolean;
};

export type SubscriptionPlan = {
    slug: PlanSlug;
    name: string;
    subtitle: string;
    description: string;
    price: number;
    currency: string;
    period: string;
    minEmployees: number;
    maxEmployees: number;
    features: PlanFeature[];
    highlighted?: boolean;
    highlightLabel?: string;
    ctaText: string;
    isVisible: boolean;
    order: number;
};

// ============================================================================
// DEFAULT PLANS (fallback if DB unavailable)
// ============================================================================

export const PLANS: SubscriptionPlan[] = [
    {
        slug: "emprendedor",
        name: "Emprendedor",
        subtitle: "1 empleado",
        description: "Perfecto para profesionales independientes",
        price: 49000,
        currency: "COP",
        period: "/mes",
        minEmployees: 1,
        maxEmployees: 1,
        features: [
            { text: "Tablero de gestión completo", included: true },
            { text: "Página de reservas online", included: true },
            { text: "Calendario de citas", included: true },
            { text: "Gestión de servicios", included: true },
            { text: "Gestión de clientes", included: true },
            { text: "Recordatorios por WhatsApp", included: true },
            { text: "Métricas básicas", included: true },
        ],
        highlighted: false,
        ctaText: "Comenzar ahora",
        isVisible: true,
        order: 1,
    },
    {
        slug: "profesional",
        name: "Profesional",
        subtitle: "2-5 empleados",
        description: "Ideal para equipos pequeños",
        price: 69000,
        currency: "COP",
        period: "/mes",
        minEmployees: 2,
        maxEmployees: 5,
        features: [
            { text: "Todo del plan Emprendedor", included: true },
            { text: "Hasta 5 empleados", included: true },
            { text: "Horarios por empleado", included: true },
            { text: "Asignación de servicios", included: true },
            { text: "Recordatorios ilimitados", included: true },
            { text: "Reportes detallados", included: true },
            { text: "Soporte prioritario", included: true },
        ],
        highlighted: true,
        highlightLabel: "Más popular",
        ctaText: "Comenzar ahora",
        isVisible: true,
        order: 2,
    },
    {
        slug: "negocio",
        name: "Negocio",
        subtitle: "6-15 empleados",
        description: "Para negocios en crecimiento",
        price: 99000,
        currency: "COP",
        period: "/mes",
        minEmployees: 6,
        maxEmployees: 15,
        features: [
            { text: "Todo del plan Profesional", included: true },
            { text: "Hasta 15 empleados", included: true },
            { text: "Múltiples sucursales", included: true },
            { text: "Reportes avanzados", included: true },
            { text: "Exportación de datos", included: true },
            { text: "Soporte VIP", included: true },
            { text: "Capacitación incluida", included: true },
        ],
        highlighted: false,
        ctaText: "Comenzar ahora",
        isVisible: true,
        order: 3,
    },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get plan by slug
 */
export function getPlanBySlug(slug: PlanSlug | string): SubscriptionPlan | undefined {
    return PLANS.find((p) => p.slug === slug);
}

/**
 * Get default plan for new users
 */
export function getDefaultPlan(): SubscriptionPlan {
    return PLANS[0];
}

/**
 * Check if a user can add more employees based on their plan
 */
export function canAddEmployee(currentCount: number, planSlug: PlanSlug | string): boolean {
    const plan = getPlanBySlug(planSlug);
    if (!plan) return false;
    return currentCount < plan.maxEmployees;
}

/**
 * Get remaining employee slots
 */
export function getRemainingEmployeeSlots(currentCount: number, planSlug: PlanSlug | string): number {
    const plan = getPlanBySlug(planSlug);
    if (!plan) return 0;
    return Math.max(0, plan.maxEmployees - currentCount);
}

/**
 * Check if current plan is sufficient for employee count
 */
export function isPlanSufficient(employeeCount: number, planSlug: PlanSlug | string): boolean {
    const plan = getPlanBySlug(planSlug);
    if (!plan) return false;
    return employeeCount <= plan.maxEmployees;
}

/**
 * Get recommended plan for a given employee count
 */
export function getRecommendedPlan(employeeCount: number): SubscriptionPlan {
    const suitable = PLANS.filter((p) => p.maxEmployees >= employeeCount).sort((a, b) => a.order - b.order);
    return suitable[0] ?? PLANS[PLANS.length - 1];
}

/**
 * Format plan price for display
 */
export function formatPlanPrice(plan: SubscriptionPlan): string {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: plan.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(plan.price);
}

/**
 * Get all visible plans sorted by order
 */
export function getVisiblePlans(): SubscriptionPlan[] {
    return PLANS.filter((p) => p.isVisible).sort((a, b) => a.order - b.order);
}
