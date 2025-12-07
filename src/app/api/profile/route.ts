import { NextResponse } from "next/server";
import { getBusinessUsersCollection } from "@/lib/mongodb";
import {
  DEFAULT_HOURS,
  normalizeBusinessProfile,
  Service,
  StaffMember,
  DayOfWeek,
} from "@/lib/businessProfile";
import { BrandTheme, DEFAULT_BRAND_THEME, isHexColor, normalizeHexColor } from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: "clientId es requerido" },
        { status: 400 },
      );
    }

    const usersCol = await getBusinessUsersCollection();
    const doc = await usersCol.findOne({ clientId });
    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "Perfil no encontrado" },
        { status: 404 },
      );
    }

    const profile = normalizeBusinessProfile(doc);
    return NextResponse.json({ ok: true, data: profile });
  } catch (err) {
    console.error("Error obteniendo perfil", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo obtener el perfil" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      clientId,
      businessName,
      businessType,
      hours,
      branding,
      nav,
      features,
      modules,
      custom,
      staff,
      services,
    } = body ?? {};

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: "clientId es requerido" },
        { status: 400 },
      );
    }

    const parseHexColor = (value: any, label: string, fallback: string) => {
      if (!value) return fallback;
      if (typeof value !== "string") {
        throw new Error(`El color ${label} debe ser un hexadecimal válido (#RGB o #RRGGBB).`);
      }
      const trimmed = value.trim();
      if (!isHexColor(trimmed)) {
        throw new Error(`El color ${label} debe ser un hexadecimal válido (#RGB o #RRGGBB).`);
      }
      return normalizeHexColor(trimmed, fallback);
    };

    const normalizeTheme = (raw?: any): BrandTheme => ({
      primary: parseHexColor(
        raw?.primary ?? raw?.primaryColor,
        "primario",
        DEFAULT_BRAND_THEME.primary ?? "#7c3aed",
      ),
      secondary: parseHexColor(
        raw?.secondary ?? raw?.accent ?? raw?.accentColor,
        "secundario",
        DEFAULT_BRAND_THEME.secondary ?? "#0ea5e9",
      ),
      tertiary: parseHexColor(
        raw?.tertiary ?? raw?.tertiaryColor,
        "terciario",
        DEFAULT_BRAND_THEME.tertiary ?? "#22c55e",
      ),
    });

    const normalizeHours = (raw: any) => {
      if (!raw?.open || !raw?.close || typeof raw?.slotMinutes === "undefined") {
        return undefined;
      }
      const slotMinutes = Number.isNaN(Number(raw.slotMinutes))
        ? DEFAULT_HOURS.slotMinutes
        : Number(raw.slotMinutes);
      const normalizedDays =
        Array.isArray(raw?.days) && raw.days.length > 0
          ? raw.days
              .map((d: any, idx: number) => ({
                day: typeof d?.day === "number" ? (d.day as DayOfWeek) : (idx as DayOfWeek),
                open: d?.open ?? raw.open,
                close: d?.close ?? raw.close,
                active: d?.active !== false,
              }))
              .filter(
                (d: any) =>
                  typeof d.day === "number" &&
                  d.day >= 0 &&
                  d.day <= 6 &&
                  typeof d.open === "string" &&
                  typeof d.close === "string",
              )
          : undefined;

      return {
        open: raw.open,
        close: raw.close,
        slotMinutes,
        ...(normalizedDays ? { days: normalizedDays } : {}),
      };
    };

    const usersCol = await getBusinessUsersCollection();
    const now = new Date().toISOString();

    const normalizedStaff: StaffMember[] | undefined = Array.isArray(staff)
      ? staff
          .filter((member: any) => Boolean(member?.name))
          .map((member: any, idx: number) => {
            const id =
              member?.id ??
              member?._id?.toString?.() ??
              (typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `staff-${idx}-${Math.random().toString(36).slice(2)}`);

            const scheduleDays =
              Array.isArray(member?.schedule?.days) && member.schedule.days.length > 0
                ? member.schedule.days
                    .map((d: any) => ({
                      day: d?.day,
                      open: d?.open,
                      close: d?.close,
                      slotMinutes: typeof d?.slotMinutes === "number" ? d.slotMinutes : undefined,
                    }))
                    .filter(
                      (d: any) =>
                        typeof d?.day === "number" &&
                        d.day >= 0 &&
                        d.day <= 6 &&
                        typeof d.open === "string" &&
                        typeof d.close === "string",
                    )
                : [];

            return {
              id,
              name: member.name ?? "",
              role: member.role ?? "",
              phone: member.phone ?? "",
              active: member?.active !== false,
              hours:
                member?.hours && member.hours.open && member.hours.close
                  ? {
                      open: member.hours.open,
                      close: member.hours.close,
                      slotMinutes: member.hours.slotMinutes ?? DEFAULT_HOURS.slotMinutes,
                      daysOfWeek: Array.isArray(member.hours.daysOfWeek)
                        ? member.hours.daysOfWeek
                        : undefined,
                    }
                  : undefined,
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
          })
      : undefined;

    const normalizedTheme = normalizeTheme(branding?.theme ?? branding);
    const normalizedBranding = branding || businessName
      ? {
          businessName: branding?.businessName ?? businessName ?? "Tu negocio",
          logoUrl: branding?.logoUrl,
          primaryColor: normalizedTheme.primary,
          accentColor: normalizedTheme.secondary,
          theme: normalizedTheme,
        }
      : undefined;

    const normalizedServices: Service[] | undefined = Array.isArray(services)
      ? services
          .filter((service: any) => Boolean(service?.name))
          .map((service: any, idx: number) => {
            const id =
              service?.id ??
              service?._id?.toString?.() ??
              (typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `service-${idx}-${Math.random().toString(36).slice(2)}`);
            const price =
              typeof service?.price === "number"
                ? service.price
                : Number.isNaN(Number(service?.price))
                  ? 0
                  : Number(service.price);
            return {
              id,
              name: service.name ?? "",
              price: price >= 0 ? price : 0,
              durationMinutes:
                typeof service?.durationMinutes === "number" ? service.durationMinutes : undefined,
              description: typeof service?.description === "string" ? service.description : undefined,
              active: service?.active !== false,
            };
          })
      : undefined;

    const normalizedFeatures = features
      ? {
          reservations: Boolean(features.reservations),
          catalogo: Boolean(features.catalogo ?? features.catalog),
          info: Boolean(features.info),
          leads: Boolean(features.leads),
        }
      : undefined;

    const normalizedHours = normalizeHours(hours);

    const updateDoc: any = {
      ...(businessType ? { businessType } : {}),
      ...(normalizedHours ? { hours: normalizedHours } : {}),
      ...(normalizedBranding ? { branding: normalizedBranding, businessName: normalizedBranding.businessName } : {}),
      ...(Array.isArray(nav) ? { nav } : {}),
      ...(normalizedFeatures ? { features: normalizedFeatures } : {}),
      ...(modules ? { modules } : {}),
      ...(custom ? { custom } : {}),
      ...(normalizedStaff ? { staff: normalizedStaff } : {}),
      ...(normalizedServices ? { services: normalizedServices } : {}),
      updatedAt: now,
    };

    if (businessName && !normalizedBranding) {
      updateDoc.businessName = businessName;
    }

    await usersCol.updateOne(
      { clientId },
      {
        $set: updateDoc,
        $setOnInsert: { clientId, createdAt: now },
      },
      { upsert: true },
    );

    const updated = await usersCol.findOne({ clientId });
    const normalized = normalizeBusinessProfile(updated);
    return NextResponse.json({ ok: true, data: normalized });
  } catch (err) {
    console.error("Error actualizando perfil", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo actualizar el perfil" },
      { status: 500 },
    );
  }
}
