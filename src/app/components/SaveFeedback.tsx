import React from "react";
import { SaveStatus } from "../hooks/useSaveStatus";

type Status = SaveStatus;

export function SaveFeedback({
  status,
  successText = "Guardado",
  errorText = "Error al guardar cambios. Intenta de nuevo.",
}: {
  status: Status;
  successText?: string;
  errorText?: string;
}) {
  if (status === "idle" || status === "saving") return null;
  const isSuccess = status === "success";
  const base = "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold";
  return (
    <span
      className={`${base} ${
        isSuccess
          ? "bg-emerald-400/15 text-emerald-100 border border-emerald-300/40 animate-[pulse_1.4s_ease-out_1]"
          : "bg-rose-400/15 text-rose-100 border border-rose-300/40"
      }`}
    >
      <span className="text-lg" aria-hidden>
        {isSuccess ? "✓" : "!"}
      </span>
      {isSuccess ? successText : errorText}
    </span>
  );
}

export function SaveStatusBadge({
  status,
  successText = "Guardado",
  errorText = "Error al guardar",
}: {
  status: Status;
  successText?: string;
  errorText?: string;
}) {
  return <SaveFeedback status={status} successText={successText} errorText={errorText} />;
}

export default SaveFeedback;
