import React from "react";

export function FormContainer({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <div className={["space-y-8 lg:space-y-10", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function FormSection({
    title,
    description,
    children,
    className,
    actions,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
    actions?: React.ReactNode;
}) {
    return (
        <section className={["space-y-6 rounded-2xl border border-white/5 bg-white/5 p-6 sm:p-8", className].filter(Boolean).join(" ")}>
            {(title || description || actions) && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
                    <div className="space-y-1">
                        {title && <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">{title}</h3>}
                        {description && <p className="text-sm text-slate-400">{description}</p>}
                    </div>
                    {actions && <div className="shrink-0">{actions}</div>}
                </div>
            )}
            <div className="space-y-6">{children}</div>
        </section>
    );
}

export function FormRow({
    children,
    className,
    cols = 2,
}: {
    children: React.ReactNode;
    className?: string;
    cols?: 1 | 2 | 3 | 4;
}) {
    const gridCols = {
        1: "grid-cols-1",
        2: "grid-cols-1 md:grid-cols-2",
        3: "grid-cols-1 md:grid-cols-3",
        4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    };

    return <div className={["grid gap-5", gridCols[cols], className].filter(Boolean).join(" ")}>{children}</div>;
}

export function FormField({
    label,
    hint,
    error,
    children,
    className,
    required,
}: {
    label?: string;
    hint?: string;
    error?: string | null;
    children: React.ReactNode;
    className?: string;
    required?: boolean;
}) {
    return (
        <div className={["space-y-2", className].filter(Boolean).join(" ")}>
            {label && (
                <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium text-slate-200">
                        {label} {required && <span className="text-rose-400">*</span>}
                    </label>
                    {hint && <span className="text-xs text-slate-400">{hint}</span>}
                </div>
            )}
            {children}
            {error && <p className="text-xs text-rose-300 animate-pulse">{error}</p>}
        </div>
    );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={[
                "w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-500",
                "focus:border-indigo-500/50 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                "disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            {...props}
        />
    );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className="relative">
            <select
                className={[
                    "w-full appearance-none rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-white",
                    "focus:border-indigo-500/50 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                    "disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",
                    className,
                ]
                    .filter(Boolean)
                    .join(" ")}
                {...props}
            >
                {children}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </div>
        </div>
    );
}

export function Button({
    variant = "primary",
    className,
    children,
    isLoading,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; isLoading?: boolean }) {
    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-500 border-transparent shadow-lg shadow-indigo-500/20",
        secondary: "bg-white/5 text-slate-200 hover:bg-white/10 border-white/10",
        danger: "bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 border-rose-500/20",
        ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-white/5 border-transparent",
    };

    return (
        <button
            className={[
                "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 border",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                variants[variant],
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {children}
        </button>
    );
}

const ClockIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={className}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

type TimeInputProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    size?: "sm" | "md";
};

export function TimeInput({ label, value, onChange, disabled, size = "md" }: TimeInputProps) {
    return (
        <FormField label={label} className={size === "sm" ? "text-xs" : ""}>
            <div className="relative">
                <Input
                    type="time"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={[
                        size === "sm" ? "px-3 py-2 text-xs" : "",
                        "[&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-0",
                    ].filter(Boolean).join(" ")}
                />
                <ClockIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-200" />
            </div>
        </FormField>
    );
}

const CalendarIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={className}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M4.5 9.75h15M4.5 9.75v11.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V9.75M4.5 9.75l15 0"
        />
    </svg>
);

type DateInputProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    size?: "sm" | "md";
};

export function DateInput({ label, value, onChange, disabled, size = "md" }: DateInputProps) {
    return (
        <FormField label={label} className={size === "sm" ? "text-xs" : ""}>
            <div className="relative">
                <Input
                    type="date"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={[
                        size === "sm" ? "px-3 py-2 text-xs" : "",
                        "[&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-0",
                    ].filter(Boolean).join(" ")}
                />
                <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-200" />
            </div>
        </FormField>
    );
}
