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

    return {
        users,
        pagination,
        filters,
        setFilters,
        loading,
        error,
        refresh: () => fetchUsers(filters),
        updateUser,
        deleteUser,
        pauseUser,
        activateUser,
        changePlan,
    };
}
