import React from "react";

type ToggleChipProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
};

export function ToggleChip({
  checked,
  onChange,
  label,
  className = "",
  compact,
  disabled,
}: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        onChange(!checked);
      }}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-400/50 ${
        checked
          ? "border-indigo-300/70 bg-indigo-500/20 text-indigo-50"
          : "border-white/15 bg-white/5 text-slate-200 hover:border-white/25"
      } ${compact ? "px-2 py-1 text-[11px]" : ""} ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""} ${className}`}
      aria-pressed={checked}
    >
      <span
        className={`h-3 w-3 rounded-full border transition ${
          checked ? "border-indigo-200 bg-indigo-400" : "border-white/30 bg-slate-800"
        }`}
      />
      {label ? <span>{label}</span> : null}
    </button>
  );
}

export default ToggleChip;
