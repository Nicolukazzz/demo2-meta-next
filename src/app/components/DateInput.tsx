"use client";

import React from "react";

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
      d="M8 7V4m8 3V4m-9 8h10m-10 4h10M5 8h14c1.1 0 2 .9 2 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z"
    />
  </svg>
);

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  helper?: string;
};

export default function DateInput({ label, value, onChange, disabled, helper }: Props) {
  return (
    <label className="block text-sm font-semibold text-slate-100">
      {label}
      <div className="relative mt-2">
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="date-input w-full rounded-xl border border-white/10 bg-slate-800/70 pr-10 px-3 py-2.5 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-indigo-200">
          <CalendarIcon />
        </span>
      </div>
      {helper ? <p className="mt-1 text-xs text-slate-400">{helper}</p> : null}
    </label>
  );
}
