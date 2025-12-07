import React from "react";

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHexInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("#")) return trimmed.toUpperCase();
  return `#${trimmed}`.toUpperCase();
}

function isValidHex(value: string) {
  return HEX_PATTERN.test(value);
}

type Props = {
  label: string;
  value?: string;
  description?: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

export default function ColorInput({ label, value = "", description, onChange, disabled }: Props) {
  const normalized = normalizeHexInput(value);
  const colorValue = isValidHex(normalized) ? normalized : "#000000";
  return (
    <label className="block text-sm font-semibold text-slate-100">
      {label}
      <div className="mt-2 flex items-center gap-3">
        <input
          type="color"
          disabled={disabled}
          value={colorValue}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-10 w-10 rounded-xl border border-white/10 bg-slate-900/60 p-0"
        />
        <input
          type="text"
          disabled={disabled}
          value={normalized}
          onChange={(event) => onChange(normalizeHexInput(event.target.value))}
          className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
          placeholder="#7C3AED"
        />
      </div>
      {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
    </label>
  );
}
