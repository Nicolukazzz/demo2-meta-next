import { NextResponse } from "next/server";
import { getBusinessUsersCollection } from "@/lib/mongodb";
import { normalizeBusinessProfile } from "@/lib/businessProfile";

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
    const { clientId, businessName, businessType, hours, branding, nav, features } = body ?? {};

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: "clientId es requerido" },
        { status: 400 },
      );
    }

    const usersCol = await getBusinessUsersCollection();
    const now = new Date().toISOString();

    const updateDoc: any = {
      ...(businessName ? { businessName } : {}),
      ...(businessType ? { businessType } : {}),
      ...(hours ? { hours } : {}),
      ...(branding ? { branding } : {}),
      ...(Array.isArray(nav) ? { nav } : {}),
      ...(features ? { features } : {}),
      updatedAt: now,
    };

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
