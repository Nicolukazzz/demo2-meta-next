import React from "react";
import NeonCard from "../NeonCard";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function BaseChartCard({ title, description, children }: Props) {
  return (
    <NeonCard className="p-4 space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
        {description ? <p className="text-sm text-slate-300">{description}</p> : null}
      </div>
      {children}
    </NeonCard>
  );
}

