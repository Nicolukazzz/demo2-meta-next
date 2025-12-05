export type BusinessType = "reservas" | "ventas" | "info" | "mixto";

export type Hours = {
  open: string;
  close: string;
  slotMinutes: number;
};

export type BusinessFeatures = {
  reservations: boolean;
  catalog: boolean;
  info: boolean;
  leads: boolean;
};

export type NavItem = { label: string; key: string; active?: boolean };

export type Branding = {
  logoUrl?: string;
  coverUrl?: string;
  colors?: {
    primary?: string;
    accent?: string;
    background?: string;
  };
  font?: string;
};

export type BusinessProfile = {
  clientId: string;
  email?: string;
  businessName: string;
  businessType: BusinessType;
  hours: Hours;
  features: BusinessFeatures;
  nav: NavItem[];
  branding?: Branding;
  hero?: {
    title?: string;
    subtitle?: string;
    ctaLabel?: string;
    ctaLink?: string;
  };
  sections?: any[];
};

export const DEFAULT_HOURS: Hours = { open: "09:00", close: "18:00", slotMinutes: 60 };

export const DEFAULT_NAV: NavItem[] = [
  { label: "Dashboard", key: "dashboard", active: true },
  { label: "Guia", key: "guia" },
  { label: "Reservas", key: "reservas" },
  { label: "Ventas", key: "ventas" },
  { label: "Reportes", key: "reportes" },
];

export const DEFAULT_FEATURES: BusinessFeatures = {
  reservations: true,
  catalog: false,
  info: true,
  leads: false,
};

export const DEFAULT_PROFILE: BusinessProfile = {
  clientId: "demo",
  businessName: "Tu negocio",
  businessType: "reservas",
  hours: DEFAULT_HOURS,
  features: DEFAULT_FEATURES,
  nav: DEFAULT_NAV,
  branding: {},
};

function deriveFeaturesFromType(businessType: BusinessType): BusinessFeatures {
  switch (businessType) {
    case "reservas":
      return { reservations: true, catalog: false, info: true, leads: false };
    case "ventas":
      return { reservations: false, catalog: true, info: true, leads: true };
    case "info":
      return { reservations: false, catalog: false, info: true, leads: false };
    case "mixto":
    default:
      return { reservations: true, catalog: true, info: true, leads: true };
  }
}

export function normalizeBusinessProfile(doc: any): BusinessProfile {
  const businessType: BusinessType = doc?.businessType ?? "mixto";
  const hours =
    doc?.hours && doc.hours.open && doc.hours.close && doc.hours.slotMinutes
      ? doc.hours
      : DEFAULT_HOURS;

  const profile: BusinessProfile = {
    clientId: doc?.clientId ?? doc?._id?.toString() ?? "unknown",
    email: doc?.email,
    businessName: doc?.businessName ?? "Tu negocio",
    businessType,
    hours,
    features: doc?.features ?? deriveFeaturesFromType(businessType),
    nav: Array.isArray(doc?.nav) && doc.nav.length > 0 ? doc.nav : DEFAULT_NAV,
    branding: doc?.branding ?? {},
    hero: doc?.hero,
    sections: doc?.sections ?? [],
  };

  return profile;
}
