export type BrandTheme = {
  primary?: string;
  secondary?: string;
  tertiary?: string;
};

export type AppTheme = {
  primary: string;
  secondary: string;
  tertiary: string;
  primarySoft: string;
  secondarySoft: string;
  tertiarySoft: string;
  primaryHover: string;
  secondaryHover: string;
  tertiaryHover: string;
};

export const DEFAULT_BRAND_THEME: BrandTheme = {
  primary: "#7c3aed",
  secondary: "#0ea5e9",
  tertiary: "#22c55e",
};

const HEX_SHORT = /^#([0-9a-f]{3})$/i;
const HEX_FULL = /^#([0-9a-f]{6})$/i;

export function normalizeHexColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (HEX_FULL.test(trimmed)) return trimmed.toLowerCase();
  if (HEX_SHORT.test(trimmed)) {
    const digits = trimmed.slice(1).split("");
    return `#${digits.map((d) => d + d).join("")}`.toLowerCase();
  }
  return fallback;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex, "#000000");
  const [, hexValue] = normalized.match(HEX_FULL)!;
  const r = parseInt(hexValue.slice(0, 2), 16);
  const g = parseInt(hexValue.slice(2, 4), 16);
  const b = parseInt(hexValue.slice(4, 6), 16);
  return { r, g, b };
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function adjustBrightness(hex: string, factor: number) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (value: number) => Math.max(0, Math.min(255, value));
  return `rgb(${clamp(Math.round(r * factor))}, ${clamp(Math.round(g * factor))}, ${clamp(
    Math.round(b * factor),
  )})`;
}

export function buildThemeFromBranding(theme?: BrandTheme): AppTheme {
  const primary = normalizeHexColor(theme?.primary, DEFAULT_BRAND_THEME.primary ?? "#7c3aed");
  const secondary = normalizeHexColor(theme?.secondary, DEFAULT_BRAND_THEME.secondary ?? "#0ea5e9");
  const tertiary = normalizeHexColor(theme?.tertiary, DEFAULT_BRAND_THEME.tertiary ?? "#22c55e");
  return {
    primary,
    secondary,
    tertiary,
    primarySoft: rgba(primary, 0.25),
    secondarySoft: rgba(secondary, 0.25),
    tertiarySoft: rgba(tertiary, 0.25),
    primaryHover: adjustBrightness(primary, 0.9),
    secondaryHover: adjustBrightness(secondary, 0.9),
    tertiaryHover: adjustBrightness(tertiary, 0.9),
  };
}

export function isHexColor(value: string) {
  return HEX_FULL.test(value) || HEX_SHORT.test(value);
}

export function getReadableTextColor(background: string) {
  const { r, g, b } = hexToRgb(background);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.5 ? "#0f172a" : "#ffffff";
}
