"use client";

import React from "react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { buildThemeFromBranding } from "@/lib/theme";

type Props = {
  label: string;
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
};

export default function SidebarItem({ label, active, onClick, icon, badge, className }: Props) {
  const { colors } = useTheme();
  const theme = buildThemeFromBranding(colors);
  const baseClasses =
    "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold leading-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0";
  const activeClasses = active ? "text-white" : "text-slate-200 hover:text-white hover:bg-white/5";
  const style: React.CSSProperties = {
    height: 46,
    minHeight: 46,
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${activeClasses} ${className ?? ""} ${
        active ? "bg-white/10 border border-white/30" : "border border-transparent"
      }`}
      style={style}
    >
      {icon ? <span className="flex items-center">{icon}</span> : null}
      <span className="flex-1 text-left">{label}</span>
      {badge ? <span className="ml-auto">{badge}</span> : null}
    </button>
  );
}
