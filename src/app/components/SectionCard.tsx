import React from "react";
import NeonCard from "./NeonCard";

type Props = {
  title?: string;
  subtitle?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * SectionCard envuelve contenido con el estilo neón/base y provee un header consistente
 * (titulo + descripción + acciones). Úsalo para cualquier widget/panel nuevo.
 */
export default function SectionCard({
  title,
  subtitle,
  description,
  actions,
  children,
  className,
}: Props) {
  const cx = (...classes: Array<string | undefined | null | false>) =>
    classes.filter(Boolean).join(" ");
  return (
    <NeonCard className={cx("p-4 sm:p-5 space-y-3", className)}>
      {(title || subtitle || description || actions) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            {subtitle ? (
              <p className="text-[11px] uppercase tracking-wide text-slate-400">{subtitle}</p>
            ) : null}
            {title ? <h3 className="text-lg font-semibold text-white">{title}</h3> : null}
            {description ? <p className="text-xs text-slate-300">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </NeonCard>
  );
}
