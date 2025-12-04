import { NextResponse } from "next/server";
import { getBusinessUsersCollection } from "@/lib/mongodb";

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

    if (!user || user.password !== password) {
      return NextResponse.json({ ok: false, error: "Credenciales invalidas" }, { status: 401 });
    }

    const hours =
      user.hours && user.hours.open && user.hours.close && user.hours.slotMinutes
        ? user.hours
        : { open: "09:00", close: "18:00", slotMinutes: 60 };

    const session = {
      email: user.email,
      clientId: user.clientId,
      businessName: user.businessName,
      businessType: user.businessType,
      hours,
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
