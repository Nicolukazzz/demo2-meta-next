"use client";

import React, { useState } from "react";
import { Plan, PlanFeature } from "@/app/hooks/useAdmin";
import NeonCard from "@/app/components/NeonCard";
import { Button, Input, FormField } from "@/app/components/ui/FormLayout";
import ConfirmDeleteDialog from "@/app/components/ConfirmDeleteDialog";

// ============================================================================
// PLAN CARD
// ============================================================================
type PlanCardProps = {
    plan: Plan;
    onEdit: () => void;
    onToggleVisibility: () => void;
    onDelete: () => void;
};

export function PlanCard({ plan, onEdit, onToggleVisibility, onDelete }: PlanCardProps) {
    const formatPrice = (price: number) =>
        new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: plan.currency,
            maximumFractionDigits: 0,
        }).format(price);

    return (
        <NeonCard
            className={`p-5 relative ${plan.highlighted ? "ring-2 ring-indigo-500/50" : ""} ${!plan.isVisible ? "opacity-50" : ""
                }`}
        >
            {plan.highlighted && plan.highlightLabel && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white">
                    {plan.highlightLabel}
                </span>
            )}

            <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-sm text-slate-400">{plan.subtitle}</p>
                <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
            </div>

            <div className="text-center mb-4">
                <span className="text-3xl font-bold text-white">{formatPrice(plan.price)}</span>
                <span className="text-slate-400">{plan.period}</span>
            </div>

            <div className="mb-4 space-y-2">
                <p className="text-xs text-slate-400 uppercase">Empleados: {plan.minEmployees}-{plan.maxEmployees}</p>
                <p className="text-xs text-slate-400 uppercase">Orden: {plan.order}</p>
                <p className="text-xs text-slate-400 uppercase">Slug: {plan.slug}</p>
            </div>

            <div className="mb-4">
                <p className="text-xs text-slate-400 uppercase mb-2">Features ({plan.features.length})</p>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs">
                            <span className={f.included ? "text-emerald-400" : "text-rose-400"}>
                                {f.included ? "✓" : "✗"}
                            </span>
                            <span className="text-slate-300">{f.text}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 text-xs" onClick={onEdit}>
                    Editar
                </Button>
                <Button
                    variant="ghost"
                    className="text-xs"
                    onClick={onToggleVisibility}
                >
                    {plan.isVisible ? "Ocultar" : "Mostrar"}
                </Button>
                <button
                    onClick={onDelete}
                    className="rounded-lg bg-rose-500/20 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/30 transition"
                >
                    🗑
                </button>
            </div>
        </NeonCard>
    );
}

// ============================================================================
// EDIT PLAN MODAL
// ============================================================================
type EditPlanModalProps = {
    plan?: Plan;
    isNew?: boolean;
    onClose: () => void;
    onSave: (data: Partial<Plan>) => Promise<{ ok: boolean; error?: string }>;
};

export function EditPlanModal({ plan, isNew, onClose, onSave }: EditPlanModalProps) {
    const [form, setForm] = useState({
        slug: plan?.slug || "",
        name: plan?.name || "",
        subtitle: plan?.subtitle || "",
        description: plan?.description || "",
        price: plan?.price || 0,
        currency: plan?.currency || "COP",
        period: plan?.period || "/mes",
        minEmployees: plan?.minEmployees || 1,
        maxEmployees: plan?.maxEmployees || 1,
        features: plan?.features || [] as PlanFeature[],
        highlighted: plan?.highlighted || false,
        highlightLabel: plan?.highlightLabel || "",
        ctaText: plan?.ctaText || "Comenzar ahora",
        isVisible: plan?.isVisible !== false,
        order: plan?.order || 99,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newFeature, setNewFeature] = useState("");

    const handleSave = async () => {
        if (!form.slug || !form.name) {
            setError("slug y name son requeridos");
            return;
        }

        setLoading(true);
        setError(null);
        const result = await onSave(form);
        setLoading(false);
        if (result.ok) {
            onClose();
        } else {
            setError(result.error || "Error al guardar");
        }
    };

    const addFeature = () => {
        if (!newFeature.trim()) return;
        setForm({
            ...form,
            features: [...form.features, { text: newFeature.trim(), included: true }],
        });
        setNewFeature("");
    };

    const removeFeature = (index: number) => {
        setForm({
            ...form,
            features: form.features.filter((_, i) => i !== index),
        });
    };

    const toggleFeature = (index: number) => {
        setForm({
            ...form,
            features: form.features.map((f, i) =>
                i === index ? { ...f, included: !f.included } : f
            ),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-semibold text-white">
                    {isNew ? "➕ Crear nuevo plan" : `✏️ Editar plan: ${plan?.name}`}
                </h2>

                {error && <p className="my-4 text-sm text-rose-300">{error}</p>}

                <div className="grid grid-cols-2 gap-4 mt-4">
                    <FormField label="Slug (identificador único)">
                        <Input
                            value={form.slug}
                            onChange={(e) => setForm({ ...form, slug: e.target.value })}
                            placeholder="ejemplo: profesional"
                            disabled={!isNew}
                        />
                    </FormField>

                    <FormField label="Nombre">
                        <Input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Plan Profesional"
                        />
                    </FormField>

                    <FormField label="Subtítulo">
                        <Input
                            value={form.subtitle}
                            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                            placeholder="2-5 empleados"
                        />
                    </FormField>

                    <FormField label="Descripción">
                        <Input
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Ideal para equipos pequeños"
                        />
                    </FormField>

                    <FormField label="Precio">
                        <Input
                            type="number"
                            value={form.price}
                            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                        />
                    </FormField>

                    <FormField label="Moneda">
                        <select
                            value={form.currency}
                            onChange={(e) => setForm({ ...form, currency: e.target.value })}
                            className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-white"
                        >
                            <option value="COP">COP</option>
                            <option value="USD">USD</option>
                        </select>
                    </FormField>

                    <FormField label="Min. empleados">
                        <Input
                            type="number"
                            value={form.minEmployees}
                            onChange={(e) => setForm({ ...form, minEmployees: Number(e.target.value) })}
                        />
                    </FormField>

                    <FormField label="Max. empleados">
                        <Input
                            type="number"
                            value={form.maxEmployees}
                            onChange={(e) => setForm({ ...form, maxEmployees: Number(e.target.value) })}
                        />
                    </FormField>

                    <FormField label="Orden (1 = primero)">
                        <Input
                            type="number"
                            value={form.order}
                            onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                        />
                    </FormField>

                    <FormField label="Texto del CTA">
                        <Input
                            value={form.ctaText}
                            onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                        />
                    </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                    <label className="flex items-center gap-2 text-sm text-white">
                        <input
                            type="checkbox"
                            checked={form.highlighted}
                            onChange={(e) => setForm({ ...form, highlighted: e.target.checked })}
                            className="rounded"
                        />
                        Destacar plan
                    </label>

                    <label className="flex items-center gap-2 text-sm text-white">
                        <input
                            type="checkbox"
                            checked={form.isVisible}
                            onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
                            className="rounded"
                        />
                        Visible en landing
                    </label>
                </div>

                {form.highlighted && (
                    <FormField label="Etiqueta de destacado" className="mt-4">
                        <Input
                            value={form.highlightLabel}
                            onChange={(e) => setForm({ ...form, highlightLabel: e.target.value })}
                            placeholder="Más popular"
                        />
                    </FormField>
                )}

                <div className="mt-6 border-t border-white/10 pt-4">
                    <p className="text-sm font-semibold text-white mb-3">Features</p>
                    <div className="flex gap-2 mb-3">
                        <Input
                            value={newFeature}
                            onChange={(e) => setNewFeature(e.target.value)}
                            placeholder="Nueva feature..."
                            onKeyDown={(e) => e.key === "Enter" && addFeature()}
                        />
                        <Button variant="secondary" onClick={addFeature}>
                            Agregar
                        </Button>
                    </div>
                    <ul className="space-y-2 max-h-40 overflow-y-auto">
                        {form.features.map((f, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm bg-white/5 rounded-lg p-2">
                                <button
                                    onClick={() => toggleFeature(i)}
                                    className={`text-lg ${f.included ? "text-emerald-400" : "text-rose-400"}`}
                                >
                                    {f.included ? "✓" : "✗"}
                                </button>
                                <span className="flex-1 text-white">{f.text}</span>
                                <button
                                    onClick={() => removeFeature(i)}
                                    className="text-rose-400 hover:text-rose-300"
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} isLoading={loading}>
                        {isNew ? "Crear plan" : "Guardar cambios"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// PLANS GRID
// ============================================================================
type PlansGridProps = {
    plans: Plan[];
    loading: boolean;
    error: string | null;
    onEdit: (plan: Plan) => void;
    onToggleVisibility: (plan: Plan) => void;
    onDelete: (plan: Plan) => void;
    onCreateNew: () => void;
};

export function PlansGrid({ plans, loading, error, onEdit, onToggleVisibility, onDelete, onCreateNew }: PlansGridProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                    Planes de suscripción ({plans.length})
                </h2>
                <Button onClick={onCreateNew}>+ Crear plan</Button>
            </div>

            {loading ? (
                <div className="text-center text-slate-400 py-8">Cargando planes...</div>
            ) : error ? (
                <div className="text-center text-rose-300 py-8">{error}</div>
            ) : plans.length === 0 ? (
                <div className="text-center text-slate-400 py-8">No hay planes configurados</div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <PlanCard
                            key={plan._id}
                            plan={plan}
                            onEdit={() => onEdit(plan)}
                            onToggleVisibility={() => onToggleVisibility(plan)}
                            onDelete={() => onDelete(plan)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
