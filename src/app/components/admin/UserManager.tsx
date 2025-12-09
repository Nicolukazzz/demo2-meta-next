"use client";

import React, { useState } from "react";
import { AdminUser } from "@/app/hooks/useAdmin";
import NeonCard from "@/app/components/NeonCard";
import { Button, Input, FormField } from "@/app/components/ui/FormLayout";
import { PLANS, formatPlanPrice } from "@/lib/plans";

// ============================================================================
// CREATE USER MODAL
// ============================================================================
type CreateUserModalProps = {
    onClose: () => void;
    onCreate: (userData: any) => Promise<{ ok: boolean; error?: string; data?: any }>;
};

export function CreateUserModal({ onClose, onCreate }: CreateUserModalProps) {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        // Step 1: Basic info
        email: "",
        password: "",
        clientId: "",
        businessName: "",
        businessType: "reservas",
        planSlug: "profesional",
        // Step 2: Branding (optional)
        primaryColor: "#7c3aed",
        accentColor: "#0ea5e9",
        // Step 3: Hours (optional - use defaults)
        useDefaultHours: true,
        openTime: "09:00",
        closeTime: "18:00",
        slotMinutes: 60,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateClientId = () => {
        const base = form.businessName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, "")
            .replace(/\s+/g, "_")
            .slice(0, 20);
        const suffix = Math.random().toString(36).slice(2, 6);
        setForm({ ...form, clientId: `${base}_${suffix}` });
    };

    const handleCreate = async () => {
        if (!form.email || !form.password || !form.clientId || !form.businessName) {
            setError("Todos los campos obligatorios deben estar llenos");
            return;
        }

        setLoading(true);
        setError(null);

        const userData: any = {
            email: form.email,
            password: form.password,
            clientId: form.clientId,
            businessName: form.businessName,
            businessType: form.businessType,
            planSlug: form.planSlug,
            primaryColor: form.primaryColor,
            accentColor: form.accentColor,
        };

        if (!form.useDefaultHours) {
            userData.hours = {
                open: form.openTime,
                close: form.closeTime,
                slotMinutes: form.slotMinutes,
                days: [
                    { day: 1, open: form.openTime, close: form.closeTime, active: true },
                    { day: 2, open: form.openTime, close: form.closeTime, active: true },
                    { day: 3, open: form.openTime, close: form.closeTime, active: true },
                    { day: 4, open: form.openTime, close: form.closeTime, active: true },
                    { day: 5, open: form.openTime, close: form.closeTime, active: true },
                    { day: 6, open: form.openTime, close: form.closeTime, active: false },
                    { day: 0, open: form.openTime, close: form.closeTime, active: false },
                ],
            };
        }

        const result = await onCreate(userData);
        setLoading(false);

        if (result.ok) {
            onClose();
        } else {
            setError(result.error || "Error al crear usuario");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-semibold text-white">➕ Crear nueva cuenta de negocio</h2>
                <p className="text-sm text-slate-400 mb-4">Paso {step} de 3</p>

                {/* Progress bar */}
                <div className="flex gap-2 mb-6">
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            className={`flex-1 h-1 rounded-full ${s <= step ? "bg-indigo-500" : "bg-white/10"
                                }`}
                        />
                    ))}
                </div>

                {error && <p className="mb-4 text-sm text-rose-300 bg-rose-500/10 p-3 rounded-lg">{error}</p>}

                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className="space-y-4">
                        <h3 className="text-white font-medium">Información básica</h3>

                        <FormField label="Nombre del negocio *">
                            <Input
                                value={form.businessName}
                                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                                placeholder="Peluquería Glamour"
                            />
                        </FormField>

                        <FormField label="Client ID (URL única) *">
                            <div className="flex gap-2">
                                <Input
                                    value={form.clientId}
                                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                                    placeholder="peluqueria_glamour"
                                    className="flex-1"
                                />
                                <Button
                                    variant="secondary"
                                    onClick={generateClientId}
                                    disabled={!form.businessName}
                                >
                                    Generar
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                URL: /book/{form.clientId || "..."}
                            </p>
                        </FormField>

                        <FormField label="Email del negocio *">
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="negocio@email.com"
                            />
                        </FormField>

                        <FormField label="Contraseña *">
                            <Input
                                type="text"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                placeholder="Contraseña inicial"
                            />
                        </FormField>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Tipo de negocio">
                                <select
                                    value={form.businessType}
                                    onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                                    className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-white"
                                >
                                    <option value="reservas">Reservas</option>
                                    <option value="barberia">Barbería</option>
                                    <option value="peluqueria">Peluquería</option>
                                    <option value="spa">Spa</option>
                                    <option value="clinica">Clínica</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </FormField>

                            <FormField label="Plan">
                                <select
                                    value={form.planSlug}
                                    onChange={(e) => setForm({ ...form, planSlug: e.target.value })}
                                    className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-white"
                                >
                                    {PLANS.map((plan) => (
                                        <option key={plan.slug} value={plan.slug}>
                                            {plan.name} - {formatPlanPrice(plan)}
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                        </div>
                    </div>
                )}

                {/* Step 2: Branding */}
                {step === 2 && (
                    <div className="space-y-4">
                        <h3 className="text-white font-medium">Personalización</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Color primario">
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        value={form.primaryColor}
                                        onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                                        className="w-12 h-10 rounded-lg cursor-pointer border-none"
                                    />
                                    <Input
                                        value={form.primaryColor}
                                        onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                                        className="flex-1"
                                    />
                                </div>
                            </FormField>

                            <FormField label="Color secundario">
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        value={form.accentColor}
                                        onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                                        className="w-12 h-10 rounded-lg cursor-pointer border-none"
                                    />
                                    <Input
                                        value={form.accentColor}
                                        onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                                        className="flex-1"
                                    />
                                </div>
                            </FormField>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-sm text-slate-400">Vista previa</p>
                            <div className="mt-2 flex gap-2">
                                <div
                                    className="w-10 h-10 rounded-full"
                                    style={{ backgroundColor: form.primaryColor }}
                                />
                                <div
                                    className="w-10 h-10 rounded-full"
                                    style={{ backgroundColor: form.accentColor }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Hours */}
                {step === 3 && (
                    <div className="space-y-4">
                        <h3 className="text-white font-medium">Horarios</h3>

                        <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.useDefaultHours}
                                onChange={(e) => setForm({ ...form, useDefaultHours: e.target.checked })}
                                className="rounded"
                            />
                            <div>
                                <p className="text-white font-medium">Usar horarios por defecto</p>
                                <p className="text-xs text-slate-400">Lun-Vie 09:00-18:00, Sáb-Dom cerrado</p>
                            </div>
                        </label>

                        {!form.useDefaultHours && (
                            <div className="grid grid-cols-3 gap-4">
                                <FormField label="Hora apertura">
                                    <Input
                                        type="time"
                                        value={form.openTime}
                                        onChange={(e) => setForm({ ...form, openTime: e.target.value })}
                                    />
                                </FormField>
                                <FormField label="Hora cierre">
                                    <Input
                                        type="time"
                                        value={form.closeTime}
                                        onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
                                    />
                                </FormField>
                                <FormField label="Duración cita (min)">
                                    <Input
                                        type="number"
                                        value={form.slotMinutes}
                                        onChange={(e) => setForm({ ...form, slotMinutes: Number(e.target.value) })}
                                    />
                                </FormField>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                            <p className="text-sm font-semibold text-indigo-300 mb-2">📋 Resumen</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-slate-400">Negocio:</span>{" "}
                                    <span className="text-white">{form.businessName || "-"}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Email:</span>{" "}
                                    <span className="text-white">{form.email || "-"}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Client ID:</span>{" "}
                                    <span className="text-white">{form.clientId || "-"}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Plan:</span>{" "}
                                    <span className="text-white">{form.planSlug}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex gap-3 justify-between">
                    <div>
                        {step > 1 && (
                            <Button variant="ghost" onClick={() => setStep(step - 1)}>
                                ← Anterior
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose}>
                            Cancelar
                        </Button>
                        {step < 3 ? (
                            <Button
                                onClick={() => setStep(step + 1)}
                                disabled={step === 1 && (!form.businessName || !form.email || !form.password || !form.clientId)}
                            >
                                Siguiente →
                            </Button>
                        ) : (
                            <Button onClick={handleCreate} isLoading={loading}>
                                ✓ Crear cuenta
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// CONFIRMATION DIALOG
// ============================================================================
type ConfirmDialogProps = {
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void;
    onCancel: () => void;
};

export function ConfirmDialog({
    open,
    title,
    description,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "warning",
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!open) return null;

    const variantStyles = {
        danger: { icon: "🚨", bg: "bg-rose-500/20", border: "border-rose-500/30", btn: "bg-rose-500 hover:bg-rose-600" },
        warning: { icon: "⚠️", bg: "bg-amber-500/20", border: "border-amber-500/30", btn: "bg-amber-500 hover:bg-amber-600" },
        info: { icon: "ℹ️", bg: "bg-indigo-500/20", border: "border-indigo-500/30", btn: "bg-indigo-500 hover:bg-indigo-600" },
    };

    const style = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-2xl border ${style.border} ${style.bg} p-6 shadow-2xl`}>
                <div className="text-center mb-4">
                    <span className="text-4xl">{style.icon}</span>
                    <h2 className="text-lg font-semibold text-white mt-2">{title}</h2>
                    <p className="text-sm text-slate-300 mt-2">{description}</p>
                </div>
                <div className="flex gap-3 justify-center mt-6">
                    <Button variant="ghost" onClick={onCancel}>
                        {cancelText}
                    </Button>
                    <button
                        onClick={onConfirm}
                        className={`rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-colors ${style.btn}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
