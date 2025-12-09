import { NextResponse } from "next/server";
import { getBusinessUsersCollection } from "@/lib/mongodb";
import { DEFAULT_HOURS, normalizeBusinessUser } from "@/lib/businessProfile";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body: LoginBody = await request.json();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email y contrasena son requeridos" },
        { status: 400 },
      );
    }

    const usersCol = await getBusinessUsersCollection();
    const user = await usersCol.findOne({ email });

    if (!user) {
      return NextResponse.json({ ok: false, error: "Credenciales invalidas" }, { status: 401 });
    }

    const normalized = normalizeBusinessUser(user);
    const storedPassword = normalized.passwordHash ?? normalized.password;
    if (!storedPassword || storedPassword !== password) {
      return NextResponse.json({ ok: false, error: "Credenciales invalidas" }, { status: 401 });
    }

    // Check if account is paused or deleted
    if (normalized.status === "paused") {
      return NextResponse.json(
        { ok: false, error: "Tu cuenta está suspendida. Contacta al administrador para más información.", code: "ACCOUNT_PAUSED" },
        { status: 403 },
      );
    }
    if (normalized.status === "deleted") {
      return NextResponse.json(
        { ok: false, error: "Esta cuenta ha sido desactivada.", code: "ACCOUNT_DELETED" },
        { status: 403 },
      );
    }

    const hours =
      normalized.features.reservations && normalized.hours
        ? normalized.hours
        : normalized.features.reservations
          ? DEFAULT_HOURS
          : undefined;

    const session = {
      email: normalized.email,
      clientId: normalized.clientId,
      branding: normalized.branding,
      businessType: normalized.businessType,
      features: normalized.features,
      staff: normalized.staff ?? [],
      hours,
      planSlug: normalized.planSlug ?? "emprendedor",
      status: normalized.status ?? "active",
    };

    // TODO: Reemplazar password en claro por hash + token/JWT/cookie de sesion en produccion.
    return NextResponse.json({ ok: true, session });
  } catch (err) {
    console.error("Error en login", err);
    return NextResponse.json(
      { ok: false, error: "Error al procesar login" },
      { status: 500 },
    );
  }
}
