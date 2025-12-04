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
        { ok: false, error: "Email y contraseña son requeridos" },
        { status: 400 },
      );
    }

    const usersCol = await getBusinessUsersCollection();
    const user = await usersCol.findOne({ email });

    if (!user || user.password !== password) {
      return NextResponse.json(
        { ok: false, error: "Credenciales inválidas" },
        { status: 401 },
      );
    }

    const session = {
      email: user.email,
      clientId: user.clientId,
      businessName: user.businessName,
      businessType: user.businessType,
      hours: user.hours,
    };

    // TODO: Reemplazar password en claro por hash + token/JWT/cookie de sesión en producción.
    return NextResponse.json({ ok: true, session });
  } catch (err) {
    console.error("Error en login", err);
    return NextResponse.json(
      { ok: false, error: "Error al procesar login" },
      { status: 500 },
    );
  }
}
