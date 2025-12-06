import React from "react";

type Props = {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
};

export function FormField({ label, hint, error, children, className }: Props) {
  return (
    <div className={["space-y-1", className].filter(Boolean).join(" ")}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-slate-100">{label}</label>
        {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="text-xs text-rose-200">{error}</p> : null}
    </div>
  );
}

