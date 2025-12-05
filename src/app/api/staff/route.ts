import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getStaffCollection } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ ok: false, error: "clientId es requerido" }, { status: 400 });
    }
    const col = await getStaffCollection();
    const items = await col.find({ clientId }).sort({ createdAt: -1 }).toArray();
    const data = items.map((item) => ({
      _id: item._id?.toString(),
      clientId: item.clientId,
      name: item.name,
      role: item.role,
      phone: item.phone,
      services: item.services ?? [],
      status: item.status ?? "activo",
      createdAt: item.createdAt,
    }));
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("Error obteniendo staff", err);
    return NextResponse.json({ ok: false, error: "No se pudo obtener staff" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, name, role, phone, services } = body ?? {};
    if (!clientId || !name) {
      return NextResponse.json(
        { ok: false, error: "clientId y nombre son requeridos" },
        { status: 400 },
      );
    }
    const col = await getStaffCollection();
    const doc = {
      clientId,
      name,
      role: role ?? "staff",
      phone: phone ?? "",
      services: Array.isArray(services) ? services : [],
      status: "activo",
      createdAt: new Date().toISOString(),
    };
    const res = await col.insertOne(doc as any);
    return NextResponse.json({ ok: true, data: { ...doc, _id: res.insertedId.toString() } });
  } catch (err) {
    console.error("Error creando staff", err);
    return NextResponse.json({ ok: false, error: "No se pudo crear staff" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const clientId = searchParams.get("clientId");
    if (!id || !clientId) {
      return NextResponse.json(
        { ok: false, error: "id y clientId son requeridos" },
        { status: 400 },
      );
    }
    const col = await getStaffCollection();
    const res = await col.deleteOne({ _id: new ObjectId(id), clientId });
    if (res.deletedCount === 0) {
      return NextResponse.json({ ok: false, error: "Staff no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error eliminando staff", err);
    return NextResponse.json({ ok: false, error: "No se pudo eliminar staff" }, { status: 500 });
  }
}
