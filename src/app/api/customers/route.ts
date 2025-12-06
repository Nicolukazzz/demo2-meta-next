import { NextResponse } from "next/server";
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from "@/lib/customers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const q = searchParams.get("q") ?? undefined;

  if (!clientId) {
    return NextResponse.json({ ok: false, error: "clientId es requerido" }, { status: 400 });
  }

  const customers = await listCustomers(clientId, q);
  const data = customers.map((c) => ({
    ...c,
    _id: c._id.toString(),
    lastReservationAt: c.lastReservationAt?.toISOString(),
    createdAt: c.createdAt?.toISOString(),
    updatedAt: c.updatedAt?.toISOString(),
  }));

  return NextResponse.json({ ok: true, data });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, name, phone, email, notes, lastReservationAt } = body ?? {};
    if (!clientId || !name || !phone) {
      return NextResponse.json(
        { ok: false, error: "clientId, name y phone son requeridos" },
        { status: 400 },
      );
    }
    const now = new Date();
    const doc = {
      clientId,
      name,
      phone,
      email: email ?? "",
      notes: notes ?? "",
      createdAt: now,
      updatedAt: now,
      lastReservationAt: lastReservationAt ? new Date(lastReservationAt) : now,
    };
    const id = await createCustomer(doc as any);
    return NextResponse.json({ ok: true, data: { ...doc, _id: id.toString() } });
  } catch (err) {
    console.error("Error creando cliente", err);
    return NextResponse.json({ ok: false, error: "No se pudo crear el cliente" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, clientId, ...rest } = body ?? {};
    if (!id || !clientId) {
      return NextResponse.json(
        { ok: false, error: "id y clientId son requeridos" },
        { status: 400 },
      );
    }
    await updateCustomer(id, clientId, rest);
    const updated = await listCustomers(clientId);
    return NextResponse.json({ ok: true, data: updated.map((c) => ({ ...c, _id: c._id.toString() })) });
  } catch (err) {
    console.error("Error actualizando cliente", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo actualizar el cliente" },
      { status: 500 },
    );
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
    await deleteCustomer(id, clientId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error eliminando cliente", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo eliminar el cliente" },
      { status: 500 },
    );
  }
}
