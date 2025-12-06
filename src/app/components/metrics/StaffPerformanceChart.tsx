import React from "react";
import { BaseChartCard } from "./BaseChartCard";
import { StaffPerformance } from "@/lib/metrics/dashboardMetrics";
import { formatCOP } from "@/lib/metrics";

type Props = {
  data: StaffPerformance[];
};

export function StaffPerformanceChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.totalReservations), 1);
  return (
    <BaseChartCard title="Desempeño del staff" description="Servicios realizados e ingresos estimados.">
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos de staff.</p>
      ) : (
        <div className="space-y-2">
          {data.slice(0, 5).map((s) => (
            <div key={s.staffId} className="space-y-1">
              <div className="flex items-center justify-between text-sm text-white">
                <span className="truncate">
                  {s.name} {s.role ? `· ${s.role}` : ""}
                </span>
                <span className="text-xs text-slate-300">{s.totalReservations} reservas</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400"
                  style={{ width: `${(s.totalReservations / max) * 100}%` }}
                />
              </div>
              <p className="text-xs text-emerald-200">Ingresos: {formatCOP(s.totalRevenue)}</p>
            </div>
          ))}
        </div>
      )}
    </BaseChartCard>
  );
}

