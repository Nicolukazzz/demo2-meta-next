"use client";

import React, { useEffect, useMemo, useState } from "react";
import NeonCard from "../components/NeonCard";
import MetricCard from "../components/MetricCard";
import { useFinanceMetrics } from "../hooks/useFinanceMetrics";
import { formatCOP } from "@/lib/metrics";
import { formatDateDisplay } from "@/lib/dateFormat";

type LocalSession = { clientId: string; branding?: { businessName?: string } };

export default function BalancePage() {
  const [session, setSession] = useState<LocalSession | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("session");
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        setSession(null);
      }
    }
  }, []);

  const { data: finance, loading, error } = useFinanceMetrics(session?.clientId);

  const title = useMemo(
    () => session?.branding?.businessName ?? "Balance del negocio",
    [session?.branding?.businessName],
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Finanzas</p>
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Ingresos totales" value={finance ? formatCOP(finance.totalRevenue) : "—"} accent="emerald" />
          <MetricCard label="Ingresos mes" value={finance ? formatCOP(finance.monthRevenue) : "—"} />
          <MetricCard label="Ingresos semana" value={finance ? formatCOP(finance.weekRevenue) : "—"} accent="amber" />
          <MetricCard label="Reservas pagadas" value={finance ? `${finance.paidReservations}` : "—"} accent="emerald" />
          <MetricCard label="Canceladas" value={finance ? `${finance.reservationCounts?.canceled || 0}` : "—"} accent="rose" />
          <MetricCard label="Ticket promedio" value={finance ? formatCOP(finance.averageTicket) : "—"} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <NeonCard className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Servicios más vendidos</p>
                <h3 className="text-lg font-semibold text-white">Top servicios</h3>
              </div>
            </div>
            {loading ? (
              <p className="text-sm text-slate-400">Cargando finanzas...</p>
            ) : error ? (
              <p className="text-sm text-rose-200">{error}</p>
            ) : finance?.topServicesByRevenue?.length ? (
              <ul className="space-y-2">
                {finance.topServicesByRevenue.map((svc: any) => (
                  <li
                    key={svc.name}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <span className="text-sm text-white">{svc.name}</span>
                    <span className="text-sm font-semibold text-emerald-200">{formatCOP(svc.revenue)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">Sin datos de servicios aún.</p>
            )}
          </NeonCard>

          <NeonCard className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Días con más ventas</p>
                <h3 className="text-lg font-semibold text-white">Top días</h3>
              </div>
            </div>
            {loading ? (
              <p className="text-sm text-slate-400">Cargando finanzas...</p>
            ) : error ? (
              <p className="text-sm text-rose-200">{error}</p>
            ) : finance?.topDays?.length ? (
              <ul className="space-y-2">
                {finance.topDays.map((day) => (
                  <li
                    key={day.dateId}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <span className="text-sm text-white">{formatDateDisplay(day.dateId)}</span>
                    <span className="text-sm font-semibold text-emerald-200">{formatCOP(day.revenue)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">Sin datos de días aún.</p>
            )}
          </NeonCard>
        </div>
      </div>
    </div>
  );
}
