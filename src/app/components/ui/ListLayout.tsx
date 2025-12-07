import React from "react";

export function ListCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={["space-y-3", className].filter(Boolean).join(" ")}>
            {children}
        </div>
    );
}

export function ListItem({
    children,
    className,
    actions,
    onClick,
}: {
    children: React.ReactNode;
    className?: string;
    actions?: React.ReactNode;
    onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className={[
                "group relative flex flex-col gap-4 rounded-xl border border-white/5 bg-white/5 p-4 transition-all duration-200",
                "hover:border-white/10 hover:bg-white/[0.07]",
                onClick ? "cursor-pointer" : "",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">{children}</div>
                {actions && <div className="flex items-center gap-2 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity self-end sm:self-auto">{actions}</div>}
            </div>
        </div>
    );
}

export function ListHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                {description && <p className="text-sm text-slate-400">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
