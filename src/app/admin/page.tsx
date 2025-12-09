"use client";

import React, { useState, useEffect } from "react";
import {
    useAdminStats,
    useAdminUsers,
    useAdminLeads,
    useAdminPlans,
    AdminUser,
    Lead,
    LeadStatus,
    Plan,
} from "../hooks/useAdmin";
import NeonCard from "../components/NeonCard";
import { Button, Input, FormField } from "../components/ui/FormLayout";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import { formatPlanPrice, getPlanBySlug, PLANS } from "@/lib/plans";

// Admin Components
import {
    LeadStatsCards,
    LeadsTable,
    LeadDetailModal,
    PlansGrid,
    EditPlanModal,
    CreateUserModal,
    ConfirmDialog,
} from "../components/admin";

// Admin credentials - in production, use env variables
const ADMIN_PASSWORD = "reserbox_admin";
const ADMIN_SESSION_KEY = "1234";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000;

type AdminTab = "dashboard" | "users" | "leads" | "plans";

function useAdminAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [attempts, setAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

    useEffect(() => {
        const session = localStorage.getItem(ADMIN_SESSION_KEY);
        setIsAuthenticated(session === "authenticated");

        const storedLockout = localStorage.getItem("admin_lockout");
        if (storedLockout) {
            const lockoutTime = parseInt(storedLockout, 10);
            if (Date.now() < lockoutTime) {
                setLockoutUntil(lockoutTime);
            } else {
                localStorage.removeItem("admin_lockout");
            }
        }
    }, []);

    const login = (password: string): { success: boolean; locked?: boolean; remainingTime?: number } => {
        if (lockoutUntil && Date.now() < lockoutUntil) {
            return { success: false, locked: true, remainingTime: Math.ceil((lockoutUntil - Date.now()) / 1000) };
        }

        if (password === ADMIN_PASSWORD) {
            localStorage.setItem(ADMIN_SESSION_KEY, "authenticated");
            localStorage.removeItem("admin_lockout");
            setIsAuthenticated(true);
            setAttempts(0);
            return { success: true };
        }

        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            const lockTime = Date.now() + LOCKOUT_DURATION_MS;
            setLockoutUntil(lockTime);
            localStorage.setItem("admin_lockout", lockTime.toString());
            return { success: false, locked: true, remainingTime: LOCKOUT_DURATION_MS / 1000 };
        }

        return { success: false };
    };

    const logout = () => {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        setIsAuthenticated(false);
    };

    const remainingAttempts = MAX_LOGIN_ATTEMPTS - attempts;

    return { isAuthenticated, login, logout, lockoutUntil, remainingAttempts };
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================
function StatCard({
    label,
    value,
    subvalue,
    color = "indigo",
}: {
    label: string;
    value: string | number;
    subvalue?: string;
    color?: "indigo" | "emerald" | "amber" | "rose";
}) {
    const colors = {
        indigo: "from-indigo-500/20 to-purple-500/20 border-indigo-500/30",
        emerald: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
        amber: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
        rose: "from-rose-500/20 to-pink-500/20 border-rose-500/30",
    };

    return (
        <div className={`rounded-xl border bg-gradient-to-br p-4 ${colors[color]}`}>
            <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{value}</p>
            {subvalue && <p className="mt-0.5 text-xs text-slate-400">{subvalue}</p>}
        </div>
    );
}

// ============================================================================
// USER ROW COMPONENT
// ============================================================================
function UserRow({
    user,
    onEdit,
    onPause,
    onActivate,
    onDelete,
}: {
    user: AdminUser;
    onEdit: () => void;
    onPause: () => void;
    onActivate: () => void;
    onDelete: () => void;
}) {
    const plan = getPlanBySlug(user.planSlug);
    const statusColors = {
        active: "bg-emerald-500/20 text-emerald-300",
        paused: "bg-amber-500/20 text-amber-300",
        deleted: "bg-rose-500/20 text-rose-300",
    };

    return (
        <tr className="border-b border-white/5 hover:bg-white/5 transition">
            <td className="px-4 py-3">
                <div>
                    <p className="font-medium text-white">{user.businessName || "Sin nombre"}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                </div>
            </td>
            <td className="px-4 py-3 text-sm text-slate-300">{user.clientId}</td>
            <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[user.status] || statusColors.active}`}>
                    {user.status || "active"}
                </span>
            </td>
            <td className="px-4 py-3">
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300">
                    {plan?.name || user.planSlug}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-slate-300">{user.staffCount}</td>
            <td className="px-4 py-3 text-sm text-slate-300">{user.servicesCount}</td>
            <td className="px-4 py-3 text-xs text-slate-400">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString("es-CO") : "-"}
            </td>
            <td className="px-4 py-3">
                <div className="flex gap-2">
                    <button
                        onClick={onEdit}
                        className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 transition"
                    >
                        Editar
                    </button>
                    {user.status === "paused" ? (
                        <button
                            onClick={onActivate}
                            className="rounded-lg bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/30 transition"
                        >
                            Activar
                        </button>
                    ) : (
                        <button
                            onClick={onPause}
                            className="rounded-lg bg-amber-500/20 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/30 transition"
                        >
                            Pausar
                        </button>
                    )}
                    <button
                        onClick={onDelete}
                        className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/30 transition"
                    >
                        Eliminar
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ============================================================================
// EDIT USER MODAL
// ============================================================================
function EditUserModal({
    user,
    onClose,
    onSave,
}: {
    user: AdminUser;
    onClose: () => void;
    onSave: (updates: Partial<AdminUser & { password?: string }>) => Promise<{ ok: boolean; error?: string }>;
}) {
    const [form, setForm] = useState({
        businessName: user.businessName || "",
        email: user.email || "",
        planSlug: user.planSlug || "emprendedor",
        status: user.status || "active",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingUpdates, setPendingUpdates] = useState<any>(null);

    const handleSave = async () => {
        const updates: any = {
            businessName: form.businessName,
            email: form.email,
            planSlug: form.planSlug,
            status: form.status,
        };
        if (form.password) updates.password = form.password;

        // Show confirmation dialog
        setPendingUpdates(updates);
        setShowConfirm(true);
    };

    const confirmSave = async () => {
        setShowConfirm(false);
        setLoading(true);
        setError(null);

        const result = await onSave(pendingUpdates);
        setLoading(false);
        if (result.ok) {
            onClose();
        } else {
            setError(result.error || "Error al guardar");
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
                    <h2 className="text-lg font-semibold text-white">✏️ Editar cuenta</h2>
                    <p className="text-sm text-slate-400 mb-4">clientId: {user.clientId}</p>

                    {error && <p className="mb-4 text-sm text-rose-300 bg-rose-500/10 p-3 rounded-lg">{error}</p>}

                    <div className="space-y-4">
                        <FormField label="Nombre del negocio">
                            <Input
                                value={form.businessName}
                                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                            />
                        </FormField>

                        <FormField label="Email">
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                        </FormField>

                        <FormField label="Plan">
                            <select
                                value={form.planSlug}
                                onChange={(e) => setForm({ ...form, planSlug: e.target.value })}
                                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                            >
                                {PLANS.map((plan) => (
                                    <option key={plan.slug} value={plan.slug}>
                                        {plan.name} - {formatPlanPrice(plan)} ({plan.maxEmployees} empleados)
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Estado">
                            <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                            >
                                <option value="active">Activo</option>
                                <option value="paused">Pausado</option>
                                <option value="deleted">Eliminado</option>
                            </select>
                        </FormField>

                        <FormField label="Nueva contraseña (dejar vacío para no cambiar)">
                            <Input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                placeholder="••••••••"
                            />
                        </FormField>
                    </div>

                    <div className="mt-6 flex gap-3 justify-end">
                        <Button variant="ghost" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} isLoading={loading}>
                            Guardar cambios
                        </Button>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={showConfirm}
                title="Confirmar cambios"
                description="¿Estás seguro de guardar estos cambios en la cuenta del negocio?"
                variant="info"
                confirmText="Sí, guardar"
                onConfirm={confirmSave}
                onCancel={() => setShowConfirm(false)}
            />
        </>
    );
}

// ============================================================================
// LOGIN SCREEN
// ============================================================================
function AdminLogin({
    onLogin,
    remainingAttempts,
    lockoutUntil
}: {
    onLogin: (password: string) => { success: boolean; locked?: boolean; remainingTime?: number };
    remainingAttempts: number;
    lockoutUntil: number | null;
}) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [lockSeconds, setLockSeconds] = useState(0);

    useEffect(() => {
        if (!lockoutUntil) return;

        const updateTimer = () => {
            const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
            setLockSeconds(remaining);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [lockoutUntil]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const result = onLogin(password);
        if (result.locked) {
            setError(`Demasiados intentos. Espera ${result.remainingTime} segundos.`);
            setPassword("");
        } else if (!result.success) {
            setError(`Contraseña incorrecta. ${remainingAttempts - 1} intento(s) restante(s).`);
            setPassword("");
        }
    };

    const isLocked = lockoutUntil && Date.now() < lockoutUntil;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
            <div className="w-full max-w-md">
                <NeonCard className="p-8">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-white">🔐 Admin Panel</h1>
                        <p className="text-sm text-slate-400 mt-2">Ingresa la contraseña de administrador</p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FormField label="Contraseña">
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError(null);
                                }}
                                placeholder="••••••••••••"
                                autoFocus
                                disabled={!!isLocked}
                            />
                        </FormField>
                        {error && (
                            <p className="text-sm text-rose-300">{error}</p>
                        )}
                        {isLocked && lockSeconds > 0 && (
                            <p className="text-sm text-amber-300">
                                Bloqueado. Espera {lockSeconds} segundo(s)...
                            </p>
                        )}
                        <Button type="submit" className="w-full" disabled={!!isLocked}>
                            {isLocked ? `Espera ${lockSeconds}s` : "Ingresar"}
                        </Button>
                    </form>
                    <p className="text-xs text-slate-500 text-center mt-6">
                        Panel restringido solo para administradores
                    </p>
                </NeonCard>
            </div>
        </div>
    );
}

// ============================================================================
// ADMIN TABS
// ============================================================================
function AdminTabs({ activeTab, onTabChange }: { activeTab: AdminTab; onTabChange: (tab: AdminTab) => void }) {
    const tabs: { key: AdminTab; label: string; icon: string }[] = [
        { key: "dashboard", label: "Dashboard", icon: "📊" },
        { key: "users", label: "Usuarios", icon: "👥" },
        { key: "leads", label: "Leads", icon: "📋" },
        { key: "plans", label: "Planes", icon: "💎" },
    ];

    return (
        <div className="flex gap-2 border-b border-white/10 pb-4 mb-6">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => onTabChange(tab.key)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === tab.key
                            ? "bg-indigo-500 text-white"
                            : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                        }`}
                >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>
    );
}

// ============================================================================
// MAIN ADMIN PAGE
// ============================================================================
export default function AdminPage() {
    const { isAuthenticated, login, logout, remainingAttempts, lockoutUntil } = useAdminAuth();
    const { stats, loading: statsLoading, refresh: refreshStats } = useAdminStats();
    const {
        users,
        pagination,
        filters,
        setFilters,
        loading: usersLoading,
        error,
        refresh: refreshUsers,
        createUser,
        updateUser,
        deleteUser,
        pauseUser,
        activateUser,
    } = useAdminUsers();
    const {
        leads,
        stats: leadStats,
        filters: leadFilters,
        setFilters: setLeadFilters,
        loading: leadsLoading,
        error: leadsError,
        refresh: refreshLeads,
        updateLead,
        deleteLead,
    } = useAdminLeads();
    const {
        plans,
        loading: plansLoading,
        error: plansError,
        refresh: refreshPlans,
        createPlan,
        updatePlan,
        deletePlan,
    } = useAdminPlans();

    const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [creatingUser, setCreatingUser] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: AdminUser | null }>({
        open: false,
        user: null,
    });
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [searchInput, setSearchInput] = useState("");

    // Leads state
    const [viewingLead, setViewingLead] = useState<Lead | null>(null);
    const [deleteLeadDialog, setDeleteLeadDialog] = useState<{ open: boolean; lead: Lead | null }>({
        open: false,
        lead: null,
    });

    // Plans state
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [creatingPlan, setCreatingPlan] = useState(false);
    const [deletePlanDialog, setDeletePlanDialog] = useState<{ open: boolean; plan: Plan | null }>({
        open: false,
        plan: null,
    });

    // Confirmation dialogs for status changes
    const [confirmAction, setConfirmAction] = useState<{
        open: boolean;
        title: string;
        description: string;
        action: () => Promise<void>;
        variant: "danger" | "warning" | "info";
    }>({ open: false, title: "", description: "", action: async () => { }, variant: "warning" });

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <p className="text-slate-400">Cargando...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <AdminLogin
                onLogin={login}
                remainingAttempts={remainingAttempts}
                lockoutUntil={lockoutUntil}
            />
        );
    }

    const handleSearch = () => {
        setFilters({ ...filters, search: searchInput, skip: 0 });
    };

    const handleConfirmedAction = async (
        title: string,
        description: string,
        action: () => Promise<void>,
        variant: "danger" | "warning" | "info" = "warning"
    ) => {
        setConfirmAction({ open: true, title, description, action, variant });
    };

    const handlePause = (user: AdminUser) => {
        handleConfirmedAction(
            "Pausar cuenta",
            `¿Estás seguro de pausar la cuenta de ${user.businessName}? El negocio no podrá acceder al sistema.`,
            async () => {
                const result = await pauseUser(user.clientId);
                if (result.ok) {
                    setToast({ type: "success", message: `Cuenta ${user.businessName} pausada` });
                    refreshStats();
                } else {
                    setToast({ type: "error", message: result.error || "Error" });
                }
            },
            "warning"
        );
    };

    const handleActivate = (user: AdminUser) => {
        handleConfirmedAction(
            "Activar cuenta",
            `¿Activar la cuenta de ${user.businessName}?`,
            async () => {
                const result = await activateUser(user.clientId);
                if (result.ok) {
                    setToast({ type: "success", message: `Cuenta ${user.businessName} activada` });
                    refreshStats();
                } else {
                    setToast({ type: "error", message: result.error || "Error" });
                }
            },
            "info"
        );
    };

    const handleDelete = async () => {
        if (!deleteDialog.user) return;
        const result = await deleteUser(deleteDialog.user.clientId, false);
        if (result.ok) {
            setToast({ type: "success", message: `Cuenta eliminada` });
            refreshStats();
        } else {
            setToast({ type: "error", message: result.error || "Error" });
        }
        setDeleteDialog({ open: false, user: null });
    };

    const handleSaveUser = async (updates: Partial<AdminUser & { password?: string }>) => {
        if (!editingUser) return { ok: false, error: "No user selected" };
        const result = await updateUser(editingUser.clientId, updates);
        if (result.ok) {
            setToast({ type: "success", message: "Cuenta actualizada" });
            refreshStats();
        }
        return result;
    };

    const handleCreateUser = async (userData: any) => {
        const result = await createUser(userData);
        if (result.ok) {
            setToast({ type: "success", message: `Cuenta ${userData.businessName} creada` });
            refreshStats();
            refreshUsers();
        }
        return result;
    };

    // Lead handlers
    const handleLeadStatusChange = (lead: Lead, status: LeadStatus) => {
        handleConfirmedAction(
            "Cambiar estado",
            `¿Cambiar el estado de este lead a "${status}"?`,
            async () => {
                const result = await updateLead(lead._id, { status });
                if (result.ok) {
                    setToast({ type: "success", message: "Estado actualizado" });
                    refreshLeads();
                } else {
                    setToast({ type: "error", message: result.error || "Error" });
                }
            },
            "info"
        );
    };

    const handleDeleteLead = async () => {
        if (!deleteLeadDialog.lead) return;
        const result = await deleteLead(deleteLeadDialog.lead._id);
        if (result.ok) {
            setToast({ type: "success", message: "Lead eliminado" });
            refreshLeads();
        } else {
            setToast({ type: "error", message: result.error || "Error" });
        }
        setDeleteLeadDialog({ open: false, lead: null });
    };

    // Plan handlers
    const handleSavePlan = async (data: Partial<Plan>) => {
        if (creatingPlan) {
            const result = await createPlan(data as any);
            if (result.ok) {
                setToast({ type: "success", message: "Plan creado" });
            }
            return result;
        } else if (editingPlan) {
            const result = await updatePlan(editingPlan._id, data);
            if (result.ok) {
                setToast({ type: "success", message: "Plan actualizado" });
            }
            return result;
        }
        return { ok: false, error: "No plan selected" };
    };

    const handleTogglePlanVisibility = (plan: Plan) => {
        handleConfirmedAction(
            plan.isVisible ? "Ocultar plan" : "Mostrar plan",
            `¿${plan.isVisible ? "Ocultar" : "Mostrar"} el plan ${plan.name} en la landing page?`,
            async () => {
                const result = await updatePlan(plan._id, { isVisible: !plan.isVisible });
                if (result.ok) {
                    setToast({ type: "success", message: `Plan ${plan.isVisible ? "ocultado" : "visible"}` });
                } else {
                    setToast({ type: "error", message: result.error || "Error" });
                }
            },
            "info"
        );
    };

    const handleDeletePlan = async () => {
        if (!deletePlanDialog.plan) return;
        const result = await deletePlan(deletePlanDialog.plan._id);
        if (result.ok) {
            setToast({ type: "success", message: "Plan eliminado" });
        } else {
            setToast({ type: "error", message: result.error || "Error" });
        }
        setDeletePlanDialog({ open: false, plan: null });
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
            {/* Header */}
            <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div>
                        <p className="text-xs text-indigo-300 uppercase tracking-wide">Panel de Administración</p>
                        <h1 className="text-xl font-bold text-white">Reserbox Admin</h1>
                    </div>
                    <button
                        onClick={logout}
                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
                {/* Tabs */}
                <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

                {/* Dashboard Tab */}
                {activeTab === "dashboard" && (
                    <>
                        {/* Stats Section */}
                        <section>
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                                Estadísticas generales
                            </h2>
                            {statsLoading ? (
                                <p className="text-slate-400">Cargando...</p>
                            ) : stats ? (
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                                    <StatCard label="Total cuentas" value={stats.users.total} color="indigo" />
                                    <StatCard label="Activas" value={stats.users.active} color="emerald" />
                                    <StatCard label="Pausadas" value={stats.users.paused} color="amber" />
                                    <StatCard label="Nuevas (30d)" value={stats.users.recentSignups} color="indigo" />
                                    <StatCard
                                        label="MRR"
                                        value={formatCurrency(stats.revenue.mrr)}
                                        subvalue="Ingresos mensuales"
                                        color="emerald"
                                    />
                                    <StatCard label="Reservaciones" value={stats.reservations.total} subvalue={`${stats.reservations.lastWeek} esta semana`} color="indigo" />
                                </div>
                            ) : null}
                        </section>

                        {/* Plans breakdown */}
                        {stats && (
                            <section>
                                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                                    Distribución por plan
                                </h2>
                                <div className="grid grid-cols-3 gap-4">
                                    <NeonCard className="p-4 text-center">
                                        <p className="text-2xl font-bold text-white">{stats.plans.emprendedor}</p>
                                        <p className="text-sm text-slate-400">Emprendedor</p>
                                    </NeonCard>
                                    <NeonCard className="p-4 text-center border-indigo-500/30">
                                        <p className="text-2xl font-bold text-white">{stats.plans.profesional}</p>
                                        <p className="text-sm text-slate-400">Profesional</p>
                                    </NeonCard>
                                    <NeonCard className="p-4 text-center">
                                        <p className="text-2xl font-bold text-white">{stats.plans.negocio}</p>
                                        <p className="text-sm text-slate-400">Negocio</p>
                                    </NeonCard>
                                </div>
                            </section>
                        )}

                        {/* Leads summary */}
                        {leadStats && (
                            <section>
                                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                                    Leads recientes
                                </h2>
                                <LeadStatsCards
                                    stats={leadStats}
                                    onFilterChange={(status) => {
                                        setLeadFilters({ ...leadFilters, status });
                                        setActiveTab("leads");
                                    }}
                                    selectedStatus={undefined}
                                />
                            </section>
                        )}
                    </>
                )}

                {/* Users Tab */}
                {activeTab === "users" && (
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                                Cuentas de negocio ({pagination.total})
                            </h2>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Buscar por email, nombre o clientId..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    className="w-64"
                                />
                                <Button onClick={handleSearch} variant="secondary">
                                    Buscar
                                </Button>
                                <select
                                    value={filters.status || "all"}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value as any, skip: 0 })}
                                    className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
                                >
                                    <option value="all">Todos</option>
                                    <option value="active">Activos</option>
                                    <option value="paused">Pausados</option>
                                </select>
                                <select
                                    value={filters.planSlug || ""}
                                    onChange={(e) => setFilters({ ...filters, planSlug: e.target.value || undefined, skip: 0 })}
                                    className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
                                >
                                    <option value="">Todos los planes</option>
                                    {PLANS.map((p) => (
                                        <option key={p.slug} value={p.slug}>{p.name}</option>
                                    ))}
                                </select>
                                <Button onClick={() => setCreatingUser(true)}>+ Nueva cuenta</Button>
                            </div>
                        </div>

                        {error && <p className="mb-4 text-sm text-rose-300">{error}</p>}

                        <NeonCard className="overflow-hidden">
                            {usersLoading ? (
                                <div className="p-8 text-center text-slate-400">Cargando usuarios...</div>
                            ) : users.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">No se encontraron usuarios</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="border-b border-white/10 bg-white/5">
                                            <tr>
                                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Negocio</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Client ID</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Estado</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Plan</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Staff</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Servicios</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Creado</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => (
                                                <UserRow
                                                    key={user.clientId}
                                                    user={user}
                                                    onEdit={() => setEditingUser(user)}
                                                    onPause={() => handlePause(user)}
                                                    onActivate={() => handleActivate(user)}
                                                    onDelete={() => setDeleteDialog({ open: true, user })}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination */}
                            {pagination.total > pagination.limit && (
                                <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                                    <p className="text-sm text-slate-400">
                                        Mostrando {pagination.skip + 1}-{Math.min(pagination.skip + users.length, pagination.total)} de {pagination.total}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            disabled={pagination.skip === 0}
                                            onClick={() => setFilters({ ...filters, skip: Math.max(0, pagination.skip - pagination.limit) })}
                                        >
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            disabled={!pagination.hasMore}
                                            onClick={() => setFilters({ ...filters, skip: pagination.skip + pagination.limit })}
                                        >
                                            Siguiente
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </NeonCard>
                    </section>
                )}

                {/* Leads Tab */}
                {activeTab === "leads" && (
                    <section className="space-y-6">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                            Leads del formulario de contacto
                        </h2>

                        {leadStats && (
                            <LeadStatsCards
                                stats={leadStats}
                                onFilterChange={(status) => setLeadFilters({ ...leadFilters, status, skip: 0 })}
                                selectedStatus={leadFilters.status}
                            />
                        )}

                        <LeadsTable
                            leads={leads}
                            loading={leadsLoading}
                            error={leadsError}
                            onViewLead={(lead) => setViewingLead(lead)}
                            onStatusChange={handleLeadStatusChange}
                            onDeleteLead={(lead) => setDeleteLeadDialog({ open: true, lead })}
                        />
                    </section>
                )}

                {/* Plans Tab */}
                {activeTab === "plans" && (
                    <PlansGrid
                        plans={plans}
                        loading={plansLoading}
                        error={plansError}
                        onEdit={(plan) => {
                            setEditingPlan(plan);
                            setCreatingPlan(false);
                        }}
                        onToggleVisibility={handleTogglePlanVisibility}
                        onDelete={(plan) => setDeletePlanDialog({ open: true, plan })}
                        onCreateNew={() => {
                            setCreatingPlan(true);
                            setEditingPlan(null);
                        }}
                    />
                )}
            </main>

            {/* Modals */}
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={handleSaveUser}
                />
            )}

            {creatingUser && (
                <CreateUserModal
                    onClose={() => setCreatingUser(false)}
                    onCreate={handleCreateUser}
                />
            )}

            {viewingLead && (
                <LeadDetailModal
                    lead={viewingLead}
                    onClose={() => setViewingLead(null)}
                    onSave={(updates) => updateLead(viewingLead._id, updates)}
                />
            )}

            {(editingPlan || creatingPlan) && (
                <EditPlanModal
                    plan={editingPlan || undefined}
                    isNew={creatingPlan}
                    onClose={() => {
                        setEditingPlan(null);
                        setCreatingPlan(false);
                    }}
                    onSave={handleSavePlan}
                />
            )}

            {/* Delete Dialog */}
            <ConfirmDeleteDialog
                open={deleteDialog.open}
                title="Eliminar cuenta"
                description={`¿Estás seguro de eliminar la cuenta ${deleteDialog.user?.businessName}? La cuenta se marcará como eliminada pero no se borrará permanentemente.`}
                onClose={() => setDeleteDialog({ open: false, user: null })}
                onConfirm={handleDelete}
            />

            <ConfirmDeleteDialog
                open={deleteLeadDialog.open}
                title="Eliminar lead"
                description={`¿Estás seguro de eliminar el lead de ${deleteLeadDialog.lead?.name}? Esta acción no se puede deshacer.`}
                onClose={() => setDeleteLeadDialog({ open: false, lead: null })}
                onConfirm={handleDeleteLead}
            />

            <ConfirmDeleteDialog
                open={deletePlanDialog.open}
                title="Eliminar plan"
                description={`¿Estás seguro de eliminar el plan ${deletePlanDialog.plan?.name}? Los usuarios con este plan podrían verse afectados.`}
                onClose={() => setDeletePlanDialog({ open: false, plan: null })}
                onConfirm={handleDeletePlan}
            />

            {/* Confirm Action Dialog */}
            <ConfirmDialog
                open={confirmAction.open}
                title={confirmAction.title}
                description={confirmAction.description}
                variant={confirmAction.variant}
                confirmText="Confirmar"
                onConfirm={async () => {
                    await confirmAction.action();
                    setConfirmAction({ ...confirmAction, open: false });
                }}
                onCancel={() => setConfirmAction({ ...confirmAction, open: false })}
            />

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50">
                    <div
                        className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${toast.type === "success"
                                ? "bg-emerald-500 text-white"
                                : "bg-rose-500 text-white"
                            }`}
                    >
                        {toast.message}
                        <button
                            onClick={() => setToast(null)}
                            className="ml-3 opacity-70 hover:opacity-100"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
