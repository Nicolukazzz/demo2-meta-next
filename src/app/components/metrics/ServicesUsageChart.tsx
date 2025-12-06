import React from "react";
import { BaseChartCard } from "./BaseChartCard";
import { ServiceUsage } from "@/lib/metrics/dashboardMetrics";

type Props = {
  data: ServiceUsage[];
};

export function ServicesUsageChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <BaseChartCard
      title="Servicios más vendidos"
      description="Ranking por número de reservas e ingresos."
    >
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos de servicios.</p>
      ) : (
        <div className="space-y-2">
          {data.slice(0, 5).map((svc) => (
            <div key={svc.serviceId} className="space-y-1">
              <div className="flex items-center justify-between text-sm text-white">
                <span className="truncate">{svc.name}</span>
                <span className="text-xs text-slate-300">{svc.count} reservas</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400"
                  style={{ width: `${(svc.count / max) * 100}%` }}
                />
              </div>
              <p className="text-xs text-emerald-200">Ingresos: ${svc.revenue.toLocaleString("es-CO")}</p>
            </div>
          ))}
        </div>
      )}
    </BaseChartCard>
  );
}

