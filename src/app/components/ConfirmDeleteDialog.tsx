import React, { useEffect, useRef } from "react";
import NeonCard from "./NeonCard";

type ConfirmDeleteDialogProps = {
  open: boolean;
  title: string;
  description: string;
  detail?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export default function ConfirmDeleteDialog({
  open,
  title,
  description,
  detail,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  loading,
  onConfirm,
  onClose,
}: ConfirmDeleteDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (!loading) onClose();
      }
      if (e.key === "Enter" && !loading) {
        onConfirm();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, loading, onClose, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-description"
        ref={dialogRef}
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <NeonCard className="p-5 shadow-[0_24px_80px_-35px_rgba(59,130,246,0.9)] border border-indigo-500/30 bg-slate-950/90">
          <div className="space-y-2">
            <h3 id="confirm-delete-title" className="text-lg font-semibold text-white">
              {title}
            </h3>
            <p id="confirm-delete-description" className="text-sm text-slate-300">
              {description}
            </p>
            {detail ? <div className="text-sm text-slate-200">{detail}</div> : null}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="rounded-lg border border-rose-300/50 bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Eliminando..." : confirmLabel}
            </button>
          </div>
        </NeonCard>
      </div>
    </div>
  );
}
