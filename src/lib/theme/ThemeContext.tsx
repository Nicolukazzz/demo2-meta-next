"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BrandTheme, buildThemeFromBranding, DEFAULT_BRAND_THEME, normalizeHexColor } from "@/lib/theme";

export type ThemeColors = {
  primary: string;
  secondary: string;
  tertiary: string;
  cardMirrorEnabled: boolean;
  cardMirrorIntensity: number;
};

export interface ThemeContextValue {
  colors: ThemeColors;
  setColors: (partial: Partial<ThemeColors>) => void;
  resetToDefault: () => void;
}

const defaultColors: ThemeColors = {
  primary: DEFAULT_BRAND_THEME.primary ?? "#7c3aed",
  secondary: DEFAULT_BRAND_THEME.secondary ?? "#0ea5e9",
  tertiary: DEFAULT_BRAND_THEME.tertiary ?? "#22c55e",
  cardMirrorEnabled: DEFAULT_BRAND_THEME.cardMirrorEnabled ?? true,
  cardMirrorIntensity: DEFAULT_BRAND_THEME.cardMirrorIntensity ?? 50,
};

const STORAGE_KEY = "reserva-saas-theme";

function readStoredColors(): ThemeColors | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return {
      primary: normalizeHexColor(parsed.primary, defaultColors.primary),
      secondary: normalizeHexColor(parsed.secondary, defaultColors.secondary),
      tertiary: normalizeHexColor(parsed.tertiary, defaultColors.tertiary),
      cardMirrorEnabled: parsed.cardMirrorEnabled ?? defaultColors.cardMirrorEnabled,
      cardMirrorIntensity: parsed.cardMirrorIntensity ?? defaultColors.cardMirrorIntensity,
    };
  } catch {
    return null;
  }
}

export function deriveThemeColors(
  branding?: { theme?: BrandTheme; primaryColor?: string; accentColor?: string },
): ThemeColors {
  return {
    primary: branding?.theme?.primary ?? branding?.primaryColor ?? defaultColors.primary,
    secondary: branding?.theme?.secondary ?? branding?.accentColor ?? defaultColors.secondary,
    tertiary: branding?.theme?.tertiary ?? defaultColors.tertiary,
    cardMirrorEnabled: branding?.theme?.cardMirrorEnabled ?? defaultColors.cardMirrorEnabled,
    cardMirrorIntensity: branding?.theme?.cardMirrorIntensity ?? defaultColors.cardMirrorIntensity,
  };
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type Props = {
  children: React.ReactNode;
  initialColors?: ThemeColors;
};

function ThemeProvider({ children, initialColors }: Props) {
  const [colors, setColorsState] = useState<ThemeColors>(() => {
    // Always start with defaults (or initial props) to match server rendering
    return {
      ...defaultColors,
      ...initialColors,
    };
  });

  // Sync with localStorage on mount
  useEffect(() => {
    const stored = readStoredColors();
    if (stored) {
      setColorsState(prev => {
        // Only update if different to avoid unnecessary re-renders
        if (JSON.stringify(prev) === JSON.stringify(stored)) return prev;
        return stored;
      });
    }
  }, []);

  const setColors = useCallback((partial: Partial<ThemeColors>) => {
    setColorsState((prev) => {
      const next = { ...prev, ...partial };
      const normalized: ThemeColors = {
        primary: normalizeHexColor(next.primary, defaultColors.primary),
        secondary: normalizeHexColor(next.secondary, defaultColors.secondary),
        tertiary: normalizeHexColor(next.tertiary, defaultColors.tertiary),
        cardMirrorEnabled: next.cardMirrorEnabled ?? defaultColors.cardMirrorEnabled,
        cardMirrorIntensity: next.cardMirrorIntensity ?? defaultColors.cardMirrorIntensity,
      };
      if (
        normalized.primary === prev.primary &&
        normalized.secondary === prev.secondary &&
        normalized.tertiary === prev.tertiary &&
        normalized.cardMirrorEnabled === prev.cardMirrorEnabled &&
        normalized.cardMirrorIntensity === prev.cardMirrorIntensity
      ) {
        return prev;
      }
      return normalized;
    });
  }, []);

  const resetToDefault = useCallback(() => setColorsState(defaultColors), []);

  useEffect(() => {
    const root = document.documentElement;
    const theme = buildThemeFromBranding(colors);
    root.style.setProperty("--brand-primary", theme.primary);
    root.style.setProperty("--brand-secondary", theme.secondary);
    root.style.setProperty("--brand-tertiary", theme.tertiary);
    root.style.setProperty("--brand-primary-soft", theme.primarySoft);
    root.style.setProperty("--brand-secondary-soft", theme.secondarySoft);
    root.style.setProperty("--brand-tertiary-soft", theme.tertiarySoft);
    root.style.setProperty("--brand-primary-hover", theme.primaryHover);
    root.style.setProperty("--brand-secondary-hover", theme.secondaryHover);
    root.style.setProperty("--brand-tertiary-hover", theme.tertiaryHover);
    root.style.setProperty(
      "--brand-gradient",
      `linear-gradient(135deg, ${theme.primary}, ${theme.secondary}, ${theme.tertiary})`,
    );
  }, [colors]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }, [colors]);

  const value = useMemo(
    () => ({
      colors,
      setColors,
      resetToDefault,
    }),
    [colors, setColors, resetToDefault],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export default ThemeProvider;
