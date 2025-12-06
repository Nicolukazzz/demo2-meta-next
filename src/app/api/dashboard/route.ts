import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/dashboardStats";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ ok: false, error: "clientId es requerido" }, { status: 400 });
    }

    const stats = await getDashboardStats(clientId);
    return NextResponse.json({ ok: true, data: stats });
  } catch (err) {
    console.error("Error obteniendo dashboard stats", err);
    return NextResponse.json(
      { ok: false, error: "No se pudieron obtener las métricas del dashboard" },
      { status: 500 },
    );
  }
}

