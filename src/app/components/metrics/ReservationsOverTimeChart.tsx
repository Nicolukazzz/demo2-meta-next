import React from "react";
import { BaseChartCard } from "./BaseChartCard";
import { TimeSeriesPoint } from "@/lib/metrics/dashboardMetrics";
import { formatDateDisplay } from "@/lib/dateFormat";

type Props = {
  data: TimeSeriesPoint[];
};

export function ReservationsOverTimeChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <BaseChartCard title="Reservas por día" description="Últimos 30 días">
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos en el rango.</p>
      ) : (
        <div className="space-y-2">
          {data.map((p) => (
            <div key={p.date} className="space-y-1">
              <div className="flex items-center justify-between text-sm text-white">
                <span>{formatDateDisplay(p.date)}</span>
                <span className="text-xs text-slate-300">{p.total} reservas</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400"
                  style={{ width: `${(p.total / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </BaseChartCard>
  );
}

