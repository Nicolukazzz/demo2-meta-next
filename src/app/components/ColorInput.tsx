import React, { useRef } from "react";

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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className="block">
      <p className="text-sm font-semibold text-slate-100 mb-2">{label}</p>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="group flex items-center gap-3 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 transition hover:border-white/20 hover:bg-slate-800/70 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {/* Circular color preview */}
        <div
          className="h-8 w-8 rounded-full border-2 border-white/20 shadow-lg flex-shrink-0 transition group-hover:scale-105"
          style={{ backgroundColor: colorValue }}
        />
        {/* Color value and action */}
        <div className="flex-1 text-left">
          <span className="text-sm font-medium text-white">{colorValue}</span>
          <span className="ml-2 text-xs text-slate-400 group-hover:text-indigo-300 transition">
            Elegir color
          </span>
        </div>
        {/* Hidden color input */}
        <input
          ref={inputRef}
          type="color"
          disabled={disabled}
          value={colorValue}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="sr-only"
        />
      </button>
      {description ? <p className="mt-1.5 text-xs text-slate-400">{description}</p> : null}
    </div>
  );
}

