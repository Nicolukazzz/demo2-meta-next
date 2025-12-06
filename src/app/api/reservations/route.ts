import { NextResponse } from "next/server";
import { getReservationsCollection } from "@/lib/mongodb";
import { upsertCustomerFromReservation } from "@/lib/customers";
import { ObjectId } from "mongodb";

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

    const collection = await getReservationsCollection();
    const items = await collection
      .find({ clientId })
      .sort({ dateId: 1, time: 1 })
      .toArray();

    const normalized = items.map((item) => ({
      _id: item._id?.toString(),
      dateId: item.dateId,
      time: item.time,
      name: item.name,
      phone: item.phone,
      serviceName: item.serviceName,
      status: item.status,
      serviceId: item.serviceId,
      staffId: item.staffId,
      staffName: item.staffName,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return NextResponse.json({ ok: true, data: normalized });
  } catch (err) {
    console.error("Error fetching reservations", err);
    return NextResponse.json(
      { ok: false, error: "No se pudieron obtener las reservas" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, dateId, time, name, phone, serviceName, serviceId, status, staffId, staffName } = body ?? {};

    if (!clientId || !dateId || !time || !name) {
      return NextResponse.json(
        { ok: false, error: "clientId, dateId, time y name son requeridos" },
        { status: 400 },
      );
    }

    const collection = await getReservationsCollection();

    const exists = await collection.findOne({ clientId, dateId, time });
    if (exists) {
      return NextResponse.json(
        { ok: false, error: "Ya existe una reserva para ese horario" },
        { status: 409 },
      );
    }

    const now = new Date();
    const doc = {
      clientId,
      dateId,
      time,
      name,
      phone: phone ?? "",
      serviceName: serviceName ?? "",
      serviceId: serviceId ?? "",
      status: status ?? "Confirmada",
      staffId: staffId ?? "",
      staffName: staffName ?? "",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const insert = await collection.insertOne(doc as any);
    try {
      await upsertCustomerFromReservation({
        clientId,
        name,
        phone,
        date: `${dateId}T${time ?? "00:00"}:00`,
      });
    } catch (err) {
      console.error("No se pudo sincronizar cliente", err);
    }
    return NextResponse.json({
      ok: true,
      data: { ...doc, _id: insert.insertedId.toString() },
    });
  } catch (err) {
    console.error("Error creando reserva", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo crear la reserva" },
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

    const collection = await getReservationsCollection();

    const result = await collection.deleteOne({ _id: new ObjectId(id), clientId });
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { ok: false, error: "Reserva no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error eliminando reserva", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo eliminar la reserva" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, clientId, dateId, time, name, phone, serviceName, serviceId, status, staffId, staffName } =
      body ?? {};

    if (!id || !clientId) {
      return NextResponse.json(
        { ok: false, error: "id y clientId son requeridos" },
        { status: 400 },
      );
    }

    const collection = await getReservationsCollection();
    const current = await collection.findOne({ _id: new ObjectId(id), clientId });
    if (!current) {
      return NextResponse.json({ ok: false, error: "Reserva no encontrada" }, { status: 404 });
    }

    if (dateId && time) {
      const conflict = await collection.findOne({
        clientId,
        dateId,
        time,
        _id: { $ne: new ObjectId(id) },
      });
      if (conflict) {
        return NextResponse.json(
          { ok: false, error: "Ya existe una reserva para ese horario" },
          { status: 409 },
        );
      }
    }

    const updateDoc: any = {
      ...(dateId ? { dateId } : {}),
      ...(time ? { time } : {}),
      ...(name ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(serviceName !== undefined ? { serviceName } : {}),
      ...(status ? { status } : {}),
      ...(staffId !== undefined ? { staffId } : {}),
      ...(staffName !== undefined ? { staffName } : {}),
      ...(serviceId !== undefined ? { serviceId } : {}),
      updatedAt: new Date().toISOString(),
    };

    await collection.updateOne({ _id: new ObjectId(id), clientId }, { $set: updateDoc });
    const updated = await collection.findOne({ _id: new ObjectId(id), clientId });

    try {
      await upsertCustomerFromReservation({
        clientId,
        name: updated?.name ?? name,
        phone: updated?.phone ?? phone,
        date: `${updated?.dateId ?? dateId ?? ""}T${updated?.time ?? time ?? "00:00"}:00`,
      });
    } catch (err) {
      console.error("No se pudo sincronizar cliente", err);
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...updated,
        _id: updated?._id?.toString(),
      },
    });
  } catch (err) {
    console.error("Error actualizando reserva", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo actualizar la reserva" },
      { status: 500 },
    );
  }
}
