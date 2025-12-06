import React from "react";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function FormSection({ title, description, children, className }: Props) {
  return (
    <section className={["space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5", className].filter(Boolean).join(" ")}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
        {description ? <p className="text-sm text-slate-300">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

