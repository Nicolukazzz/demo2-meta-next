import { useState, useEffect, useCallback } from "react";

// Admin secret - in production, use proper auth
const ADMIN_SECRET = "admin_dev_secret_2024";

export type AdminUser = {
    _id: string;
    clientId: string;
    email: string;
    businessName: string;
    businessType: string;
    planSlug: string;
    status: "active" | "paused" | "deleted";
    staffCount: number;
    servicesCount: number;
    createdAt: string;
    updatedAt: string;
};

export type AdminStats = {
    users: {
        total: number;
        active: number;
        paused: number;
        recentSignups: number;
        withoutPlan: number;
    };
    plans: {
        emprendedor: number;
        profesional: number;
        negocio: number;
    };
    reservations: {
        total: number;
        lastWeek: number;
    };
    revenue: {
        mrr: number;
        currency: string;
    };
};

export type AdminFilters = {
    search?: string;
    status?: "active" | "paused" | "deleted" | "all";
    planSlug?: string;
    limit?: number;
    skip?: number;
};

const headers = { "x-admin-secret": ADMIN_SECRET };

/**
 * Hook to fetch admin stats
 */
export function useAdminStats() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/stats", { headers });
            const body = await res.json();
            if (!res.ok || !body.ok) throw new Error(body.error || "Error");
            setStats(body.data);
        } catch (err: any) {
            setError(err?.message || "Error al cargar estadísticas");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { stats, loading, error, refresh };
}

/**
 * Hook to fetch and manage admin users
 */
export function useAdminUsers(initialFilters?: AdminFilters) {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0, hasMore: false });
    const [filters, setFilters] = useState<AdminFilters>(initialFilters || {});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async (f: AdminFilters = filters) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (f.search) params.set("search", f.search);
            if (f.status) params.set("status", f.status);
            if (f.planSlug) params.set("planSlug", f.planSlug);
            if (f.limit) params.set("limit", f.limit.toString());
            if (f.skip) params.set("skip", f.skip.toString());

            const res = await fetch(`/api/admin/users?${params}`, { headers });
            const body = await res.json();
            if (!res.ok || !body.ok) throw new Error(body.error || "Error");
            setUsers(body.data);
            setPagination(body.pagination);
        } catch (err: any) {
            setError(err?.message || "Error al cargar usuarios");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchUsers(filters);
    }, [filters, fetchUsers]);

    const updateUser = useCallback(async (clientId: string, updates: Partial<AdminUser & { password?: string }>) => {
        try {
            const res = await fetch("/api/admin/users", {
                method: "PUT",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ clientId, ...updates }),
            });
            const body = await res.json();
            if (!res.ok || !body.ok) throw new Error(body.error || "Error");

            // Update local state
            setUsers((prev) =>
                prev.map((u) => (u.clientId === clientId ? { ...u, ...body.data } : u))
            );
            return { ok: true, data: body.data };
        } catch (err: any) {
            return { ok: false, error: err?.message || "Error al actualizar" };
        }
    }, []);

    const deleteUser = useCallback(async (clientId: string, permanent = false) => {
        try {
            const params = new URLSearchParams({ clientId });
            if (permanent) params.set("permanent", "true");

            const res = await fetch(`/api/admin/users?${params}`, {
                method: "DELETE",
                headers,
            });
            const body = await res.json();
            if (!res.ok || !body.ok) throw new Error(body.error || "Error");

            // Remove from local state or update status
            if (permanent) {
                setUsers((prev) => prev.filter((u) => u.clientId !== clientId));
            } else {
                setUsers((prev) =>
                    prev.map((u) => (u.clientId === clientId ? { ...u, status: "deleted" } : u))
                );
            }
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err?.message || "Error al eliminar" };
        }
    }, []);

    const pauseUser = useCallback(async (clientId: string) => {
        return updateUser(clientId, { status: "paused" });
    }, [updateUser]);

    const activateUser = useCallback(async (clientId: string) => {
        return updateUser(clientId, { status: "active" });
    }, [updateUser]);

    const changePlan = useCallback(async (clientId: string, planSlug: string) => {
        return updateUser(clientId, { planSlug });
    }, [updateUser]);

    const createUser = useCallback(async (userData: {
        email: string;
        password: string;
        clientId: string;
        businessName: string;
        businessType?: string;
        planSlug?: string;
        logoUrl?: string;
        primaryColor?: string;
        accentColor?: string;
        hours?: any;
        features?: any;
        staff?: any[];
        services?: any[];
    }) => {
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(userData),
            });
            const body = await res.json();
            if (!res.ok || !body.ok) throw new Error(body.error || "Error");

            // Add to local state
            setUsers((prev) => [body.data, ...prev]);
            return { ok: true, data: body.data };
        } catch (err: any) {
            return { ok: false, error: err?.message || "Error al crear usuario" };
        }
    }, []);

    return {
        users,
        pagination,
        filters,
        setFilters,
        loading,
        error,
        refresh: () => fetchUsers(filters),
        createUser,
        updateUser,
        deleteUser,
        pauseUser,
        activateUser,
        changePlan,
    };
}

// ============================================================================
// LEADS MANAGEMENT
// ============================================================================

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "rejected";

export type Lead = {
    _id: string;
    name: string;
    email: string;
    phone: string;
    businessName: string;
    industry: string;
    employeeCount: string;
    city: string;
    plan: string;
    howFound: string;
    message: string;
    status: LeadStatus;
    notes?: string;
    createdAt: string;
    updatedAt?: string;
    contactedAt?: string;
    convertedAt?: string;
};

export type LeadFilters = {
    search?: string;
    status?: LeadStatus | "all";
    limit?: number;
    skip?: number;
};

export type LeadStats = {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
    rejected: number;
};

export function useAdminLeads(initialFilters?: LeadFilters) {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [stats, setStats] = useState<LeadStats | null>(null);
    const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0, hasMore: false });
    const [filters, setFilters] = useState<LeadFilters>(initialFilters || {});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLeads = useCallback(async (f: LeadFilters = filters) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (f.search) params.set("search", f.search);
            if (f.status) params.set("status", f.status);
            if (f.limit) params.set("limit", f.limit.toString());
            if (f.skip) params.set("skip", f.skip.toString());

            const res = await fetch(`/api/admin/leads?${params}`, { headers });
            const body = await res.json();
            if (!res.ok || !body.ok) throw new Error(body.error || "Error");
            setLeads(body.data);
            setStats(body.stats);
            setPagination(body.pagination);
        } catch (err: any) {
            setError(err?.message || "Error al cargar leads");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchLeads(filters);
    }, [filters, fetchLeads]);

    const updateLead = useCallback(async (_id: string, updates: Partial<Lead>) => {
        try {
            const res = await fetch("/api/admin/leads", {
                method: "PUT",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ _id, ...updates }),
            });
            const body = await res.json();
            if (!res.ok || !body.ok) throw new Error(body.error || "Error");

            // Update local state
            setLeads((prev) =>
                prev.map((l) => (l._id === _id ? { ...l, ...updates } : l))
            );
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err?.message || "Error al actualizar" };
        }
    }, []);

    const deleteLead = useCallback(async (_id: string) => {
        try {
            const params = new URLSearchParams({ _id });
            const res = await fetch(`/api/admin/leads?${params}`, {
                method: "DELETE",
                headers,
            });
            const body = await res.json();
            if (!res.ok || !body.ok) throw new Error(body.error || "Error");

            // Remove from local state
            setLeads((prev) => prev.filter((l) => l._id !== _id));
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err?.message || "Error al eliminar" };
        }
    }, []);

    return {
        leads,
        stats,
        pagination,
        filters,
        setFilters,
        loading,
        error,
        refresh: () => fetchLeads(filters),
        updateLead,
        deleteLead,
    };
}

// ============================================================================
// PLANS MANAGEMENT
// ============================================================================

export type PlanFeature = {
    text: string;
    included: boolean;
};

export type Plan = {
    _id: string;
    slug: string;
    name: string;
    subtitle: string;
    description: string;
    price: number;
    currency: string;
    period: string;
    minEmployees: number;
    maxEmployees: number;
    features: PlanFeature[];
    highlighted: boolean;
    highlightLabel?: string;
    ctaText: string;
    isVisible: boolean;
    order: number;
    createdAt?: string;
    updatedAt?: string;
};

export function useAdminPlans() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/plans", { headers });
            const body = await res.json();
            if (!res.ok || !body.ok) throw new Error(body.error || "Error");
            setPlans(body.data);
        } catch (err: any) {
            setError(err?.message || "Error al cargar planes");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    const createPlan = useCallback(async (planData: Omit<Plan, "_id" | "createdAt" | "updatedAt">) => {
        try {
            const res = await fetch("/api/admin/plans", {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(planData),
            });
            const body = await res.json();
            if (!res.ok || !body.ok) throw new Error(body.error || "Error");

            setPlans((prev) => [...prev, body.data].sort((a, b) => a.order - b.order));
            return { ok: true, data: body.data };
        } catch (err: any) {
            return { ok: false, error: err?.message || "Error al crear plan" };
        }
    }, []);

    const updatePlan = useCallback(async (_id: string, updates: Partial<Plan>) => {
        try {
            const res = await fetch("/api/admin/plans", {
                method: "PUT",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ _id, ...updates }),
            });
            const body = await res.json();
            if (!res.ok || !body.ok) throw new Error(body.error || "Error");

            setPlans((prev) =>
                prev.map((p) => (p._id === _id ? { ...p, ...body.data } : p)).sort((a, b) => a.order - b.order)
            );
            return { ok: true, data: body.data };
        } catch (err: any) {
            return { ok: false, error: err?.message || "Error al actualizar" };
        }
    }, []);

    const deletePlan = useCallback(async (_id: string) => {
        try {
            const params = new URLSearchParams({ _id });
            const res = await fetch(`/api/admin/plans?${params}`, {
                method: "DELETE",
                headers,
            });
            const body = await res.json();
            if (!res.ok || !body.ok) throw new Error(body.error || "Error");

            setPlans((prev) => prev.filter((p) => p._id !== _id));
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err?.message || "Error al eliminar" };
        }
    }, []);

    return {
        plans,
        loading,
        error,
        refresh: fetchPlans,
        createPlan,
        updatePlan,
        deletePlan,
    };
}
