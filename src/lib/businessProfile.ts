export type BusinessType = "reservas" | "ventas" | "mixto";
export type BusinessStatus = "active" | "paused";

export type Hours = {
  open: string;
  close: string;
  slotMinutes: number;
  days?: BusinessDaySchedule[];
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

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type StaffDaySchedule = {
  day: DayOfWeek;
  open: string;
  close: string;
  slotMinutes?: number;
};

export type BusinessDaySchedule = {
  day: DayOfWeek;
  open: string;
  close: string;
  active?: boolean;
};

export type StaffSchedule = {
  useBusinessHours?: boolean;
  useStaffHours?: boolean;
  days?: StaffDaySchedule[];
};

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  phone: string;
  active: boolean;
  hours?: StaffHours;
  schedule?: StaffSchedule;
};

export type Service = {
  id: string;
  name: string;
  price: number;
  durationMinutes?: number;
  description?: string;
  active: boolean;
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
  services?: Service[];
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
  services?: Service[];
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
  services: [],
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
  day?: DayOfWeek,
): StaffHours | null {
  if (staff.active === false) return null;
  // Prioridad:
  // 1) Si usa horario del negocio, siempre negocio (y respeta days activos si existen).
  if (staff.schedule?.useBusinessHours === true) {
    if (typeof day === "number" && Array.isArray(businessHours.days) && businessHours.days.length) {
      const d = businessHours.days.find((it) => it.day === day);
      if (d && d.active !== false) {
        return { open: d.open, close: d.close, slotMinutes: businessHours.slotMinutes };
      }
      return null; // negocio cerrado ese dia
    }
    return { ...businessHours };
  }

  const scheduleDays = staff.schedule?.days ?? [];
  const dayOverride =
    typeof day === "number" && scheduleDays.length > 0
      ? scheduleDays.find((d) => d.day === day)
      : undefined;

  if (dayOverride && dayOverride.open && dayOverride.close) {
    return {
      open: dayOverride.open,
      close: dayOverride.close,
      slotMinutes: dayOverride.slotMinutes ?? staff.hours?.slotMinutes ?? businessHours.slotMinutes,
      daysOfWeek: typeof day === "number" ? [day as DayOfWeek] : undefined,
    };
  }

  if (
    typeof day === "number" &&
    staff.hours?.daysOfWeek &&
    Array.isArray(staff.hours.daysOfWeek) &&
    staff.hours.daysOfWeek.length > 0 &&
    !staff.hours.daysOfWeek.includes(day)
  ) {
    return null;
  }

  if (staff.schedule?.useStaffHours !== false && staff.hours?.open && staff.hours?.close) {
    return {
      open: staff.hours.open,
      close: staff.hours.close,
      slotMinutes: staff.hours.slotMinutes ?? businessHours.slotMinutes,
      daysOfWeek: staff.hours.daysOfWeek,
    };
  }

  if (staff.schedule?.useStaffHours === false && staff.schedule?.useBusinessHours === false) {
    return null;
  }

  if (staff.hours?.open && staff.hours?.close) {
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
      ? {
          open: doc.hours.open,
          close: doc.hours.close,
          slotMinutes: doc.hours.slotMinutes,
          days:
            Array.isArray(doc.hours.days) && doc.hours.days.length > 0
              ? doc.hours.days
                  .map((d: any) => ({
                    day: d?.day as DayOfWeek,
                    open: d?.open,
                    close: d?.close,
                    active: d?.active !== false,
                  }))
                  .filter(
                    (d: BusinessDaySchedule) =>
                      typeof d.day === "number" &&
                      d.day >= 0 &&
                      d.day <= 6 &&
                      typeof d.open === "string" &&
                      typeof d.close === "string",
                  )
              : undefined,
        }
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
    const scheduleDays: StaffDaySchedule[] =
      Array.isArray(member?.schedule?.days) && member.schedule.days.length > 0
        ? member.schedule.days
            .map((d: any) => ({
              day: d?.day as DayOfWeek,
              open: d?.open,
              close: d?.close,
              slotMinutes: typeof d?.slotMinutes === "number" ? d.slotMinutes : undefined,
            }))
            .filter(
              (d: StaffDaySchedule) =>
                typeof d.day === "number" &&
                d.day >= 0 &&
                d.day <= 6 &&
                typeof d.open === "string" &&
                typeof d.close === "string",
            )
        : [];

    return {
      id,
      name: member?.name ?? "",
      role: member?.role ?? "",
      phone: member?.phone ?? "",
      active: member?.active !== false,
      hours: memberHours,
      schedule:
        scheduleDays.length > 0 || member?.schedule
          ? {
              useBusinessHours:
                typeof member?.schedule?.useBusinessHours === "boolean"
                  ? member.schedule.useBusinessHours
                  : undefined,
              useStaffHours:
                typeof member?.schedule?.useStaffHours === "boolean"
                  ? member.schedule.useStaffHours
                  : undefined,
              days: scheduleDays,
            }
          : undefined,
    };
  });

  const rawServices: any[] = Array.isArray(doc?.services) ? doc.services : [];
  const services: Service[] = rawServices
    .map((service: any, idx: number) => {
      const id =
        service?.id ??
        service?._id?.toString?.() ??
        `${doc?.clientId ?? "client"}-service-${idx}-${generateId()}`;
      const price =
        typeof service?.price === "number"
          ? service.price
          : Number.isNaN(Number(service?.price))
            ? 0
            : Number(service.price);
      return {
        id,
        name: service?.name ?? "",
        price: price >= 0 ? price : 0,
        durationMinutes:
          typeof service?.durationMinutes === "number" ? service.durationMinutes : undefined,
        description: typeof service?.description === "string" ? service.description : undefined,
        active: service?.active !== false,
      };
    })
    .filter((service: Service) => Boolean(service.name));

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
    services,
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
    services: Array.isArray(normalized.services) ? normalized.services : [],
    hero: doc?.hero,
    sections: doc?.sections ?? [],
  };
}

export function getBusinessWeekSchedule(hours?: Hours): BusinessDaySchedule[] {
  const base: BusinessDaySchedule = {
    day: 0,
    open: hours?.open ?? DEFAULT_HOURS.open,
    close: hours?.close ?? DEFAULT_HOURS.close,
    active: true,
  };
  if (!hours) return Array.from({ length: 7 }).map((_, idx) => ({ ...base, day: idx as DayOfWeek }));
  if (hours.days && hours.days.length > 0) {
    return Array.from({ length: 7 }).map((_, idx) => {
      const existing = hours.days?.find((d) => d.day === idx);
      return {
        day: idx as DayOfWeek,
        open: existing?.open ?? hours.open,
        close: existing?.close ?? hours.close,
        active: existing?.active !== false,
      };
    });
  }
  return Array.from({ length: 7 }).map((_, idx) => ({
    day: idx as DayOfWeek,
    open: hours.open,
    close: hours.close,
    active: true,
  }));
}

export function getEffectiveBusinessHoursForDate(date: Date, hours?: Hours): Hours | null {
  if (!hours) return null;
  const day = ((date.getDay() + 6) % 7) as DayOfWeek;
  if (hours.days && hours.days.length > 0) {
    const match = hours.days.find((d) => d.day === day);
    if (match && match.active !== false) {
      return { open: match.open, close: match.close, slotMinutes: hours.slotMinutes };
    }
    if (match && match.active === false) return null;
  }
  return hours;
}


