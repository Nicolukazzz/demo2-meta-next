export type BusinessType = "reservas" | "ventas" | "mixto";
export type BusinessStatus = "active" | "paused";

export type Hours = {
  open: string;
  close: string;
  slotMinutes: number;
};

export type StaffHours = {
  open: string;
  close: string;
  slotMinutes?: number;
  /**
   * 0-6 empezando lunes. Si no viene, se asume todos los dias del negocio.
   */
  daysOfWeek?: number[];
};

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  phone: string;
  active: boolean;
  hours?: StaffHours;
};

export type BusinessFeatures = {
  reservations: boolean;
  catalogo: boolean;
  info: boolean;
  leads: boolean;
};

export type NavItem = { label: string; key: string; active?: boolean };

export type Branding = {
  businessName: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
};

export type BusinessModules = {
  reservations?: {
    allowOverlaps?: boolean;
    notifyWhatsApp?: boolean;
  };
  catalogo?: {
    currency?: string;
    showStock?: boolean;
  };
  info?: {
    customDomain?: string;
  };
};

export type BusinessUser = {
  email: string;
  passwordHash?: string;
  password?: string;
  clientId: string;
  status?: BusinessStatus;
  branding: Branding;
  businessType: BusinessType;
  features: BusinessFeatures;
  hours?: Hours;
  modules?: BusinessModules;
  custom?: Record<string, any>;
  /** @deprecated la navegacion se construira en el front a partir de features */
  nav?: NavItem[];
  staff?: StaffMember[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type BusinessProfile = {
  clientId: string;
  email?: string;
  branding: Branding;
  businessType: BusinessType;
  features: BusinessFeatures;
  hours?: Hours;
  modules?: BusinessModules;
  custom?: Record<string, any>;
  /** @deprecated se mantendra hasta migrar la UI a nav dinamico */
  nav?: NavItem[];
  staff?: StaffMember[];
  hero?: {
    title?: string;
    subtitle?: string;
    ctaLabel?: string;
    ctaLink?: string;
  };
  sections?: any[];
};

export const DEFAULT_HOURS: Hours = { open: "09:00", close: "18:00", slotMinutes: 60 };

export const DEFAULT_BRANDING: Branding = {
  businessName: "Tu negocio",
};

export const DEFAULT_NAV: NavItem[] = [{ label: "Dashboard", key: "dashboard", active: true }];

export const DEFAULT_FEATURES: BusinessFeatures = {
  reservations: true,
  catalogo: false,
  info: true,
  leads: false,
};

export const DEFAULT_PROFILE: BusinessProfile = {
  clientId: "demo",
  branding: DEFAULT_BRANDING,
  businessType: "reservas",
  features: DEFAULT_FEATURES,
  hours: DEFAULT_HOURS,
  nav: DEFAULT_NAV,
  staff: [],
};

export function deriveFeaturesFromType(businessType: BusinessType): BusinessFeatures {
  switch (businessType) {
    case "reservas":
      return { reservations: true, catalogo: false, info: true, leads: false };
    case "ventas":
      return { reservations: false, catalogo: true, info: true, leads: true };
    case "mixto":
    default:
      return { reservations: true, catalogo: true, info: true, leads: true };
  }
}

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export function getEffectiveStaffHours(
  staff: StaffMember,
  businessHours: Hours,
): StaffHours {
  if (staff.hours && staff.hours.open && staff.hours.close) {
    return {
      open: staff.hours.open,
      close: staff.hours.close,
      slotMinutes: staff.hours.slotMinutes ?? businessHours.slotMinutes,
      daysOfWeek: staff.hours.daysOfWeek,
    };
  }
  return { ...businessHours };
}

export function normalizeBusinessUser(doc: any): BusinessUser {
  const rawType = doc?.businessType;
  const businessType: BusinessType =
    rawType === "reservas" || rawType === "ventas" || rawType === "mixto" ? rawType : "mixto";

  const derivedFeatures = deriveFeaturesFromType(businessType);
  const rawFeatures = doc?.features ?? {};
  const features: BusinessFeatures = {
    reservations: Boolean(
      rawFeatures?.reservations ?? derivedFeatures.reservations,
    ),
    catalogo: Boolean(
      rawFeatures?.catalogo ??
        rawFeatures?.catalog ??
        rawFeatures?.catalogue ??
        derivedFeatures.catalogo,
    ),
    info: Boolean(rawFeatures?.info ?? derivedFeatures.info),
    leads: Boolean(rawFeatures?.leads ?? derivedFeatures.leads),
  };

  const hours =
    doc?.hours && doc.hours.open && doc.hours.close && doc.hours.slotMinutes
      ? doc.hours
      : features.reservations
        ? DEFAULT_HOURS
        : undefined;

  const branding: Branding = {
    businessName:
      doc?.branding?.businessName ??
      doc?.businessName ??
      doc?.branding?.businessName ??
      DEFAULT_BRANDING.businessName,
    logoUrl: doc?.branding?.logoUrl ?? doc?.logoUrl,
    primaryColor: doc?.branding?.primaryColor ?? doc?.branding?.colors?.primary,
    accentColor: doc?.branding?.accentColor ?? doc?.branding?.colors?.accent,
  };

  const rawStaff: any[] = Array.isArray(doc?.staff) ? doc.staff : [];
  const staff: StaffMember[] = rawStaff.map((member: any, idx: number) => {
    const id =
      member?.id ??
      member?._id?.toString?.() ??
      `${doc?.clientId ?? "client"}-staff-${idx}-${generateId()}`;
    const memberHours =
      member?.hours && member.hours.open && member.hours.close
        ? {
            open: member.hours.open,
            close: member.hours.close,
            slotMinutes: member.hours.slotMinutes,
            daysOfWeek: Array.isArray(member.hours.daysOfWeek) ? member.hours.daysOfWeek : undefined,
          }
        : undefined;
    return {
      id,
      name: member?.name ?? "",
      role: member?.role ?? "",
      phone: member?.phone ?? "",
      active: member?.active !== false,
      hours: memberHours,
    };
  });

  return {
    email: doc?.email ?? "",
    passwordHash: doc?.passwordHash ?? doc?.password,
    password: doc?.password,
    clientId: doc?.clientId ?? doc?._id?.toString() ?? "unknown",
    status: doc?.status === "active" || doc?.status === "paused" ? doc.status : undefined,
    branding,
    businessType,
    features,
    hours,
    modules: doc?.modules,
    custom: doc?.custom,
    nav: Array.isArray(doc?.nav) && doc.nav.length > 0 ? doc.nav : undefined,
    staff,
    createdAt: doc?.createdAt,
    updatedAt: doc?.updatedAt,
  };
}

export function normalizeBusinessProfile(doc: any): BusinessProfile {
  const normalized = normalizeBusinessUser(doc);

  return {
    clientId: normalized.clientId,
    email: normalized.email,
    branding: normalized.branding ?? DEFAULT_BRANDING,
    businessType: normalized.businessType ?? "mixto",
    features: normalized.features ?? DEFAULT_FEATURES,
    hours: normalized.hours ?? (normalized.features.reservations ? DEFAULT_HOURS : undefined),
    modules: normalized.modules,
    custom: normalized.custom,
    nav: normalized.nav ?? DEFAULT_NAV,
    staff: Array.isArray(normalized.staff) ? normalized.staff : [],
    hero: doc?.hero,
    sections: doc?.sections ?? [],
  };
}


