"use client";

import React, { useState } from "react";
import { Lead, LeadStatus, LeadStats } from "@/app/hooks/useAdmin";
import NeonCard from "@/app/components/NeonCard";
import { Button, Input, FormField } from "@/app/components/ui/FormLayout";
import ConfirmDeleteDialog from "@/app/components/ConfirmDeleteDialog";

// ============================================================================
// LEAD STATUS CONFIG
// ============================================================================
const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
    new: { label: "Nuevo", color: "text-blue-300", bg: "bg-blue-500/20" },
    contacted: { label: "Contactado", color: "text-amber-300", bg: "bg-amber-500/20" },
    qualified: { label: "Calificado", color: "text-purple-300", bg: "bg-purple-500/20" },
    converted: { label: "Convertido", color: "text-emerald-300", bg: "bg-emerald-500/20" },
    rejected: { label: "Rechazado", color: "text-rose-300", bg: "bg-rose-500/20" },
};

// ============================================================================
// LEAD STATS CARDS
// ============================================================================
type LeadStatsCardsProps = {
    stats: LeadStats;
    onFilterChange: (status: LeadStatus | "all") => void;
    selectedStatus: LeadStatus | "all" | undefined;
};

export function LeadStatsCards({ stats, onFilterChange, selectedStatus }: LeadStatsCardsProps) {
    const cards = [
        { key: "all" as const, label: "Total", value: stats.total, color: "from-slate-500/20 to-slate-600/20 border-slate-500/30" },
        { key: "new" as const, label: "Nuevos", value: stats.new, color: "from-blue-500/20 to-blue-600/20 border-blue-500/30" },
        { key: "contacted" as const, label: "Contactados", value: stats.contacted, color: "from-amber-500/20 to-amber-600/20 border-amber-500/30" },
        { key: "qualified" as const, label: "Calificados", value: stats.qualified, color: "from-purple-500/20 to-purple-600/20 border-purple-500/30" },
        { key: "converted" as const, label: "Convertidos", value: stats.converted, color: "from-emerald-500/20 to-emerald-600/20 border-emerald-500/30" },
        { key: "rejected" as const, label: "Rechazados", value: stats.rejected, color: "from-rose-500/20 to-rose-600/20 border-rose-500/30" },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {cards.map((card) => (
                <button
                    key={card.key}
                    onClick={() => onFilterChange(card.key)}
                    className={`rounded-xl border bg-gradient-to-br p-4 text-left transition-all hover:scale-105 ${card.color} ${selectedStatus === card.key ? "ring-2 ring-white/30" : ""
                        }`}
                >
                    <p className="text-xs text-slate-400 uppercase tracking-wide">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold text-white">{card.value}</p>
                </button>
            ))}
        </div>
    );
}

// ============================================================================
// LEAD ROW
// ============================================================================
type LeadRowProps = {
    lead: Lead;
    onView: () => void;
    onStatusChange: (status: LeadStatus) => void;
    onDelete: () => void;
};

export function LeadRow({ lead, onView, onStatusChange, onDelete }: LeadRowProps) {
    const status = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;

    return (
        <tr className="border-b border-white/5 hover:bg-white/5 transition">
            <td className="px-4 py-3">
                <div>
                    <p className="font-medium text-white">{lead.name}</p>
                    <p className="text-xs text-slate-400">{lead.email}</p>
                </div>
            </td>
            <td className="px-4 py-3 text-sm text-slate-300">{lead.businessName}</td>
            <td className="px-4 py-3 text-sm text-slate-300">{lead.phone}</td>
            <td className="px-4 py-3 text-sm text-slate-300">{lead.industry}</td>
            <td className="px-4 py-3 text-sm text-slate-300">{lead.plan}</td>
            <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.bg} ${status.color}`}>
                    {status.label}
                </span>
            </td>
            <td className="px-4 py-3 text-xs text-slate-400">
                {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("es-CO") : "-"}
            </td>
            <td className="px-4 py-3">
                <div className="flex gap-2">
                    <button
                        onClick={onView}
                        className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 transition"
                    >
                        Ver
                    </button>
                    <select
                        value={lead.status}
                        onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
                        className="rounded-lg bg-slate-800 border border-white/10 px-2 py-1 text-xs text-white"
                    >
                        <option value="new">Nuevo</option>
                        <option value="contacted">Contactado</option>
                        <option value="qualified">Calificado</option>
                        <option value="converted">Convertido</option>
                        <option value="rejected">Rechazado</option>
                    </select>
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
// LEAD DETAIL MODAL
// ============================================================================
type LeadDetailModalProps = {
    lead: Lead;
    onClose: () => void;
    onSave: (updates: Partial<Lead>) => Promise<{ ok: boolean; error?: string }>;
};

export function LeadDetailModal({ lead, onClose, onSave }: LeadDetailModalProps) {
    const [form, setForm] = useState({
        status: lead.status,
        notes: lead.notes || "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        const result = await onSave({ status: form.status, notes: form.notes });
        setLoading(false);
        if (result.ok) {
            onClose();
        } else {
            setError(result.error || "Error al guardar");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-semibold text-white">📋 Detalle del Lead</h2>
                <p className="text-sm text-slate-400 mb-4">Creado el {new Date(lead.createdAt).toLocaleString("es-CO")}</p>

                {error && <p className="mb-4 text-sm text-rose-300">{error}</p>}

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p className="text-xs text-slate-400 uppercase">Nombre</p>
                        <p className="text-white font-medium">{lead.name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase">Email</p>
                        <p className="text-white">{lead.email}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase">Teléfono</p>
                        <p className="text-white">{lead.phone}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase">Negocio</p>
                        <p className="text-white">{lead.businessName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase">Industria</p>
                        <p className="text-white">{lead.industry}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase">Empleados</p>
                        <p className="text-white">{lead.employeeCount}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase">Ciudad</p>
                        <p className="text-white">{lead.city}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase">Plan interesado</p>
                        <p className="text-indigo-300 font-medium">{lead.plan}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs text-slate-400 uppercase">Cómo nos encontró</p>
                        <p className="text-white">{lead.howFound}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs text-slate-400 uppercase">Mensaje</p>
                        <p className="text-white bg-white/5 rounded-lg p-3 text-sm">{lead.message || "Sin mensaje"}</p>
                    </div>
                </div>

                <div className="space-y-4 border-t border-white/10 pt-4">
                    <FormField label="Estado">
                        <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
                            className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-white"
                        >
                            <option value="new">Nuevo</option>
                            <option value="contacted">Contactado</option>
                            <option value="qualified">Calificado</option>
                            <option value="converted">Convertido</option>
                            <option value="rejected">Rechazado</option>
                        </select>
                    </FormField>

                    <FormField label="Notas internas">
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-white min-h-[100px]"
                            placeholder="Agregar notas sobre este lead..."
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
    );
}

// ============================================================================
// LEADS TABLE
// ============================================================================
type LeadsTableProps = {
    leads: Lead[];
    loading: boolean;
    error: string | null;
    onViewLead: (lead: Lead) => void;
    onStatusChange: (lead: Lead, status: LeadStatus) => void;
    onDeleteLead: (lead: Lead) => void;
};

export function LeadsTable({ leads, loading, error, onViewLead, onStatusChange, onDeleteLead }: LeadsTableProps) {
    return (
        <NeonCard className="overflow-hidden">
            {loading ? (
                <div className="p-8 text-center text-slate-400">Cargando leads...</div>
            ) : error ? (
                <div className="p-8 text-center text-rose-300">{error}</div>
            ) : leads.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No se encontraron leads</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-white/10 bg-white/5">
                            <tr>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Contacto</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Negocio</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Teléfono</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Industria</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Plan</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Estado</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Fecha</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map((lead) => (
                                <LeadRow
                                    key={lead._id}
                                    lead={lead}
                                    onView={() => onViewLead(lead)}
                                    onStatusChange={(status) => onStatusChange(lead, status)}
                                    onDelete={() => onDeleteLead(lead)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </NeonCard>
    );
}
