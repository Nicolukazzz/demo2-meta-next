import React from "react";
import { BaseChartCard } from "./BaseChartCard";
import { WeekdayMetric } from "@/lib/metrics/dashboardMetrics";

type Props = {
  data: WeekdayMetric[];
};

export function ReservationsByWeekdayChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <BaseChartCard title="Reservas por día de la semana" description="Actividad por día (lun-dom)">
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data.map((d) => (
            <div key={d.weekday} className="space-y-1">
              <div className="flex items-center justify-between text-sm text-white">
                <span>{d.label}</span>
                <span className="text-xs text-slate-300">{d.total}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-400"
                  style={{ width: `${(d.total / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </BaseChartCard>
  );
}

