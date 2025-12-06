import React from "react";
import NeonCard from "./NeonCard";

type Props = {
  label: string;
  value: string;
  accent?: "emerald" | "indigo" | "amber";
};

export function MetricCard({ label, value, accent = "indigo" }: Props) {
  const accents: Record<string, string> = {
    emerald: "border-emerald-300/30 bg-emerald-500/10 text-emerald-50 shadow-emerald-500/20",
    indigo: "border-indigo-300/30 bg-indigo-500/10 text-indigo-50 shadow-indigo-500/20",
    amber: "border-amber-300/30 bg-amber-500/10 text-amber-50 shadow-amber-500/20",
  };
  return (
    <NeonCard className={`p-4 ${accents[accent] ?? accents.indigo}`}>
      <p className="text-xs uppercase tracking-wide text-slate-300">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </NeonCard>
  );
}

