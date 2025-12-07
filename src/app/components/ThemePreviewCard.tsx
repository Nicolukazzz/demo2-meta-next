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
    <NeonCard className="relative overflow-hidden p-4">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(circle at 10% 10%, ${theme.primarySoft}, transparent 50%), radial-gradient(circle at 80% 30%, ${theme.secondarySoft}, transparent 40%)`,
        }}
      />
      <div className="relative space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/70">Preview</p>
        <h3 className="text-lg font-semibold text-white">Tarjeta de ejemplo</h3>
        <p className="text-sm text-slate-200">
          Así se verán tus cards, botones y badges con los colores que elijas.
        </p>
        <div
          className="rounded-2xl border px-4 py-3 text-sm font-semibold shadow-inner"
          style={{
            borderColor: theme.primaryHover,
            background: `linear-gradient(135deg, ${theme.primarySoft}, rgba(15, 23, 42, 0.6))`,
          }}
        >
          <p className="text-white/80">Acción destacada</p>
          <button
            type="button"
            className="mt-2 rounded-full px-4 py-2 text-xs font-semibold text-slate-950"
            style={{
              background: theme.primary,
              color: textColor,
              boxShadow: `0 8px 25px -12px ${theme.primary}`,
            }}
          >
            Botón principal
          </button>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span
            className="rounded-full px-3 py-1 uppercase tracking-wide"
            style={{
              background: theme.secondary,
              color: getReadableTextColor(theme.secondary),
            }}
          >
            Badge activo
          </span>
          <span
            className="rounded-full px-3 py-1 uppercase tracking-wide text-white/80"
            style={{
              border: `1px solid ${theme.tertiary}`,
              background: theme.tertiarySoft,
            }}
          >
            Estado informativo
          </span>
        </div>
      </div>
    </NeonCard>
  );
}
