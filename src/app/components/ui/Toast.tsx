import React, { useEffect, useState } from "react";
import { SaveStatus } from "../../hooks/useSaveStatus";

export function Toast({
    status,
    successText = "Cambios guardados",
    errorText = "Error al guardar",
    onDismiss,
}: {
    status: SaveStatus;
    successText?: string;
    errorText?: string;
    onDismiss?: () => void;
}) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (status === "success" || status === "error") {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                onDismiss?.();
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [status, onDismiss]);

    if (!visible && status !== "saving") return null;

    // We show a spinner for saving state, but maybe we only want toast for result?
    // Let's stick to result for the toast to avoid flickering during quick saves.
    if (status === "saving") return null;

    const isSuccess = status === "success";

    return (
        <div
            className={[
                "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl transition-all duration-300 transform",
                visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none",
                isSuccess
                    ? "border-emerald-400/30 bg-emerald-600 text-white"
                    : "border-rose-400/30 bg-rose-600 text-white",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <div
                className={`flex h-6 w-6 items-center justify-center rounded-full ${isSuccess ? "bg-white/20" : "bg-white/20"
                    }`}
            >
                {isSuccess ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                )}
            </div>
            <p className="text-sm font-medium">{isSuccess ? successText : errorText}</p>
        </div>
    );
}
