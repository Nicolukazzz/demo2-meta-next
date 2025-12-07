"use client";

import React from "react";
import NeonCard from "./NeonCard";
import { useTheme } from "@/lib/theme/ThemeContext";
import { buildThemeFromBranding, getReadableTextColor } from "@/lib/theme";

export default function ThemePreviewCard() {
  const { colors } = useTheme();
  const theme = buildThemeFromBranding(colors);
  const textColor = getReadableTextColor(theme.primary);

  return (
    <NeonCard className="p-5">
      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">Preview</p>
          <div className="flex items-center gap-2">
            <div
              className="h-5 w-9 rounded-full relative transition-colors"
              style={{ background: theme.secondary }}
            >
              <div className="absolute right-1 top-1 h-3 w-3 rounded-full bg-white shadow-sm" />
            </div>
            <span className="text-[10px] text-slate-300">Toggle</span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-white">Tarjeta de ejemplo</h3>
        <p className="text-sm text-slate-200">
          Así se verán tus cards, botones y badges.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
            style={{
              background: theme.primary,
              color: textColor,
              boxShadow: `0 8px 25px -12px ${theme.primary}`,
            }}
          >
            Botón Primario
          </button>

          <span
            className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{
              background: theme.tertiarySoft,
              color: theme.tertiary,
              border: `1px solid ${theme.tertiary}40`,
            }}
          >
            Badge Info
          </span>
        </div>
      </div>
    </NeonCard>
  );
}
