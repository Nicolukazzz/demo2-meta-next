import React from "react";
import NeonCard from "./NeonCard";

type Props = {
  count: number;
  className?: string;
  muted?: boolean;
};

/**
 * Burbuja reutilizable para mostrar el conteo de turnos en las tarjetas.
 */
export function TurnCountPill({ count, className, muted }: Props) {
  const label = `turno${count === 1 ? "" : "s"}`;
  return (
    <NeonCard
      className={[
        "px-3 py-2 text-right",
        "border-white/10 shadow-indigo-500/10",
        muted ? "bg-white/5 text-slate-200" : "bg-indigo-500/20 text-white",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="leading-tight">
        <p className="text-lg font-semibold">{count}</p>
        <p className="text-[11px] uppercase tracking-wide text-slate-200">{label}</p>
      </div>
    </NeonCard>
  );
}

