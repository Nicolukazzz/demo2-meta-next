"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useCustomers } from "@/app/hooks/dataHooks";
import { useSaveStatus } from "@/app/hooks/useSaveStatus";
import ConfirmDeleteDialog from "@/app/components/ConfirmDeleteDialog";
import NeonCard from "@/app/components/NeonCard";
import { formatDateDisplay } from "@/lib/dateFormat";
import { uiText } from "@/lib/uiText";
import { FormSection, FormField, Input, Button } from "../ui/FormLayout";
import { ListItem, ListHeader } from "../ui/ListLayout";
import { Toast } from "../ui/Toast";

type Props = {
    clientId: string;
};

type Customer = {
    _id: string;
    clientId: string;
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
    lastReservationAt?: string;
};

export default function ClientsModule({ clientId }: Props) {
    const [customerSearch, setCustomerSearch] = useState("");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customersLoading, setCustomersLoading] = useState(false);
    const [customersError, setCustomersError] = useState<string | null>(null);

    const { data: customersData, loading: customersHookLoading, error: customersHookError, refetch: refetchCustomers } =
        useCustomers(clientId, customerSearch, 45000);

    const [customerForm, setCustomerForm] = useState({
        name: "",
        phone: "",
        email: "",
        notes: "",
    });
    const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
    const [customerFormError, setCustomerFormError] = useState<string | null>(null);

    const customerSave = useSaveStatus();
    const deleteStatus = useSaveStatus();

    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        title: string;
        description: string;
        detail?: React.ReactNode;
        onConfirm?: () => Promise<void> | void;
        loading?: boolean;
    }>({ open: false, title: "", description: "" });

    useEffect(() => {
        if (customersData) {
            setCustomers(customersData as any);
            setCustomersError(null);
            setCustomersLoading(false);
        }
        if (customersHookError) {
            setCustomersError(customersHookError);
            setCustomersLoading(false);
        }
        if (customersHookLoading) setCustomersLoading(true);
    }, [customersData, customersHookError, customersHookLoading]);

    const fetchCustomers = useCallback(
        async (search?: string) => {
            if (search !== undefined) setCustomerSearch(search);
            setCustomersLoading(true);
            setCustomersError(null);
            await refetchCustomers();
            setCustomersLoading(false);
        },
        [refetchCustomers],
    );

    const handleCreateCustomer = useCallback(async () => {
        if (!clientId) return;
        if (!customerForm.name.trim() || !customerForm.phone.trim()) {
            setCustomerFormError("Nombre y teléfono son obligatorios.");
            return;
        }
        setCustomerFormError(null);
        customerSave.start();
        try {
            const payload = {
                clientId,
                name: customerForm.name.trim(),
                phone: customerForm.phone.trim(),
                email: customerForm.email.trim(),
                notes: customerForm.notes.trim(),
            };
            const res = await fetch("/api/customers", {
                method: editingCustomerId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    editingCustomerId
                        ? {
                            id: editingCustomerId,
                            ...payload,
                        }
                        : payload,
                ),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                throw new Error(body?.error ?? uiText.customers.saveError);
            }
            customerSave.success();
            setCustomerForm({ name: "", phone: "", email: "", notes: "" });
            setEditingCustomerId(null);
            fetchCustomers(customerSearch);
        } catch (err: any) {
            customerSave.error();
            setCustomerFormError(err?.message ?? uiText.customers.saveError);
        }
    }, [customerForm, customerSearch, customerSave, editingCustomerId, fetchCustomers, clientId]);

    const handleDeleteCustomer = useCallback(
        (cust: Customer) => {
            if (!clientId || !cust?._id) return;
            setDeleteDialog({
                open: true,
                title: "Eliminar cliente",
                description: `¿Quieres eliminar a ${cust.name} de tu base de datos? Esta acción no elimina reservas históricas.`,
                detail: (
                    <p className="text-xs text-slate-200">
                        Tel: {cust.phone} {cust.email ? `· ${cust.email}` : ""}
                    </p>
                ),
                onConfirm: async () => {
                    setDeleteDialog((prev) => ({ ...prev, loading: true }));
                    deleteStatus.start();
                    try {
                        await fetch(
                            `/api/customers?id=${encodeURIComponent(cust._id)}&clientId=${encodeURIComponent(clientId)}`,
                            { method: "DELETE" },
                        );
                        await fetchCustomers(customerSearch);
                        if (editingCustomerId === cust._id) {
                            setEditingCustomerId(null);
                            setCustomerForm({ name: "", phone: "", email: "", notes: "" });
                        }
                        deleteStatus.success();
                    } catch (err) {
                        deleteStatus.error();
                    } finally {
                        setDeleteDialog({ open: false, title: "", description: "" });
                    }
                },
                loading: false,
            });
        },
        [customerSearch, deleteStatus, editingCustomerId, fetchCustomers, clientId],
    );

    return (
        <>
            <NeonCard className="p-6 space-y-6">
                <ListHeader
                    title="Base de datos de clientes"
                    description="Personas que han reservado o han sido ingresadas manualmente."
                    action={
                        <div className="flex items-center gap-2">
                            <Input
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                placeholder="Buscar por nombre o teléfono"
                                className="w-64 text-xs py-1.5"
                            />
                            <Button variant="secondary" onClick={() => fetchCustomers(customerSearch)} className="text-xs px-3 py-1.5">
                                Actualizar
                            </Button>
                        </div>
                    }
                />

                <div className="grid gap-6 md:grid-cols-[2fr_1fr] items-start">
                    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
                        {customersLoading ? (
                            <p className="text-sm text-slate-400 text-center py-8">Cargando clientes...</p>
                        ) : customersError ? (
                            <p className="text-sm text-rose-300 text-center py-8">{customersError}</p>
                        ) : customers.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">Aún no hay clientes registrados.</p>
                        ) : (
                            customers.map((cust) => (
                                <ListItem
                                    key={cust._id}
                                    actions={
                                        <div className="flex gap-2">
                                            <Button
                                                variant="secondary"
                                                className="text-xs px-2 py-1 h-7"
                                                onClick={() => {
                                                    setEditingCustomerId(cust._id);
                                                    setCustomerForm({
                                                        name: cust.name ?? "",
                                                        phone: cust.phone ?? "",
                                                        email: cust.email ?? "",
                                                        notes: cust.notes ?? "",
                                                    });
                                                }}
                                            >
                                                Editar
                                            </Button>
                                            <Button
                                                variant="danger"
                                                className="text-xs px-2 py-1 h-7"
                                                onClick={() => handleDeleteCustomer(cust)}
                                            >
                                                Eliminar
                                            </Button>
                                        </div>
                                    }
                                >
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-white">{cust.name}</p>
                                        <p className="text-xs text-slate-300">{cust.phone}</p>
                                        {cust.email && <p className="text-[11px] text-slate-400">Email: {cust.email}</p>}
                                        {cust.lastReservationAt && (
                                            <p className="text-[11px] text-slate-400">
                                                Última reserva: {formatDateDisplay(cust.lastReservationAt)}
                                            </p>
                                        )}
                                        {cust.notes && <p className="text-[11px] text-slate-400 line-clamp-2">{cust.notes}</p>}
                                    </div>
                                </ListItem>
                            ))
                        )}
                    </div>

                    <FormSection
                        title={editingCustomerId ? "Editar cliente" : "Nuevo cliente"}
                        description="Agrega clientes manualmente sin crear reserva."
                        className="sticky top-4 h-fit"
                    >
                        <FormField label="Nombre">
                            <Input
                                value={customerForm.name}
                                onChange={(e) => setCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Nombre completo"
                            />
                        </FormField>
                        <FormField label="Teléfono">
                            <Input
                                type="tel"
                                value={customerForm.phone}
                                onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
                                placeholder="57..."
                            />
                        </FormField>
                        <FormField label="Email (opcional)">
                            <Input
                                type="email"
                                value={customerForm.email}
                                onChange={(e) => setCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
                                placeholder="cliente@correo.com"
                            />
                        </FormField>
                        <FormField label="Notas (opcional)">
                            <textarea
                                value={customerForm.notes}
                                onChange={(e) => setCustomerForm((prev) => ({ ...prev, notes: e.target.value }))}
                                className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                rows={3}
                                placeholder="Preferencias, servicio favorito..."
                            />
                        </FormField>

                        {customerFormError && <p className="text-xs text-rose-300 animate-pulse">{customerFormError}</p>}

                        <div className="flex flex-col gap-3 pt-2">
                            <Button
                                onClick={handleCreateCustomer}
                                isLoading={customerSave.isSaving}
                                disabled={customerSave.isSaving}
                                className="w-full"
                            >
                                {editingCustomerId ? "Actualizar cliente" : "Guardar cliente"}
                            </Button>

                            {editingCustomerId && (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setEditingCustomerId(null);
                                        setCustomerForm({ name: "", phone: "", email: "", notes: "" });
                                        customerSave.reset();
                                        setCustomerFormError(null);
                                    }}
                                    className="w-full"
                                >
                                    Cancelar edición
                                </Button>
                            )}
                        </div>
                        <Toast status={customerSave.status} />
                    </FormSection>
                </div>
            </NeonCard>

            <ConfirmDeleteDialog
                open={deleteDialog.open}
                title={deleteDialog.title}
                description={deleteDialog.description}
                detail={deleteDialog.detail}
                loading={deleteDialog.loading}
                onClose={() => setDeleteDialog({ open: false, title: "", description: "" })}
                onConfirm={async () => {
                    setDeleteDialog((prev) => ({ ...prev, loading: true }));
                    await deleteDialog.onConfirm?.();
                }}
            />
        </>
    );
}
