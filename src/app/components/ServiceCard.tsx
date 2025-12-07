import React from "react";
import { Button } from "./ui/FormLayout";
import ToggleChip from "./ToggleChip";

type Service = {
    id: string;
    name: string;
    price: number;
    durationMinutes?: number;
    description?: string;
    active?: boolean;
};

type ServiceCardProps = {
    service: Service;
    onEdit: () => void;
    onDelete: () => void;
    onToggleActive: (active: boolean) => void;
};

const currency = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
});

export default function ServiceCard({ service, onEdit, onDelete, onToggleActive }: ServiceCardProps) {
    return (
        <div className="group flex flex-col gap-3 rounded-xl border border-white/5 bg-white/5 p-4 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.07]">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white leading-tight break-words">{service.name}</p>
                    <p className="text-xs text-slate-300 mt-1">
                        {currency.format(Number.isNaN(Number(service.price)) ? 0 : Number(service.price))}
                        {service.durationMinutes ? ` · ${service.durationMinutes} min` : ""}
                    </p>
                </div>
                <div className="shrink-0">
                    <ToggleChip
                        checked={service.active !== false}
                        onChange={onToggleActive}
                        label="Activo"
                        compact
                    />
                </div>
            </div>

            <div className="flex items-end justify-between gap-4 pt-3 border-t border-white/5 mt-1">
                <p className="text-xs text-slate-400 line-clamp-2 flex-1 mr-2">
                    {service.description || "Sin descripción"}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="secondary" className="text-xs px-3 py-1.5 h-8" onClick={onEdit}>
                        Editar
                    </Button>
                    <Button variant="danger" className="text-xs px-3 py-1.5 h-8" onClick={onDelete}>
                        Eliminar
                    </Button>
                </div>
            </div>
        </div>
    );
}
