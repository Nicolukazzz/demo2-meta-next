import { NextResponse } from "next/server";
import { getBusinessUsersCollection } from "@/lib/mongodb";
import { DEFAULT_HOURS, normalizeBusinessProfile, StaffMember } from "@/lib/businessProfile";

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
    } = body ?? {};

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: "clientId es requerido" },
        { status: 400 },
      );
    }

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
            };
          })
      : undefined;

    const normalizedBranding = branding || businessName
      ? {
          businessName: branding?.businessName ?? businessName ?? "Tu negocio",
          logoUrl: branding?.logoUrl,
          primaryColor: branding?.primaryColor,
          accentColor: branding?.accentColor,
        }
      : undefined;

    const normalizedFeatures = features
      ? {
          reservations: Boolean(features.reservations),
          catalogo: Boolean(features.catalogo ?? features.catalog),
          info: Boolean(features.info),
          leads: Boolean(features.leads),
        }
      : undefined;

    const updateDoc: any = {
      ...(businessType ? { businessType } : {}),
      ...(hours ? { hours } : {}),
      ...(normalizedBranding ? { branding: normalizedBranding, businessName: normalizedBranding.businessName } : {}),
      ...(Array.isArray(nav) ? { nav } : {}),
      ...(normalizedFeatures ? { features: normalizedFeatures } : {}),
      ...(modules ? { modules } : {}),
      ...(custom ? { custom } : {}),
      ...(normalizedStaff ? { staff: normalizedStaff } : {}),
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
