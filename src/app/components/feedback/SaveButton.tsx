import React, { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "../animation/usePrefersReducedMotion";

type Status = "idle" | "loading" | "success" | "error";

type Props = {
  onClick: () => Promise<void>;
  labelIdle: string;
  labelLoading?: string;
  labelSuccess?: string;
  className?: string;
  disabled?: boolean;
};

export default function SaveButton({
  onClick,
  labelIdle,
  labelLoading = "Guardando...",
  labelSuccess = "Guardado ✓",
  className,
  disabled,
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (status === "success") {
      t = setTimeout(() => setStatus("idle"), 1800);
    }
    return () => clearTimeout(t);
  }, [status]);

  const handleClick = async () => {
    if (disabled || status === "loading") return;
    try {
      setStatus("loading");
      await onClick();
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1500);
    }
  };

  const isLoading = status === "loading";
  const isSuccess = status === "success";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={[
        "relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold",
        "border border-indigo-300/50 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 text-slate-950",
        "shadow-[0_10px_40px_-20px_rgba(59,130,246,0.9)] transition",
        !reduce && "animate-button-fade",
        disabled || isLoading ? "cursor-not-allowed opacity-70" : "hover:translate-y-[-1px]",
        isSuccess ? "ring-2 ring-emerald-300/50" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isLoading ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
      ) : isSuccess ? (
        <span className="text-emerald-900">✓</span>
      ) : null}
      <span>
        {isLoading ? labelLoading : isSuccess ? labelSuccess : status === "error" ? "Error" : labelIdle}
      </span>
    </button>
  );
}

