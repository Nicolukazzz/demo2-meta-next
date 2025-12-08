import { NextResponse } from "next/server";
import { getReservationsCollection } from "@/lib/mongodb";
import { upsertCustomerFromReservation } from "@/lib/customers";
import { ObjectId } from "mongodb";
import { isOverlapping, addMinutesToTime } from "@/lib/availability";

export const dynamic = "force-dynamic";

const DEFAULT_DURATION = 60;

/**
 * Check if a new reservation overlaps with existing reservations for the same staff.
 */
function hasStaffConflict(
  existingReservations: any[],
  staffId: string,
  dateId: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): boolean {
  if (!staffId) return false; // No staff assigned = no conflict check

  return existingReservations.some((r) => {
    if (r.staffId !== staffId || r.dateId !== dateId) return false;
    if (excludeId && r._id?.toString() === excludeId) return false;

    const resEndTime = r.endTime || addMinutesToTime(r.time, r.durationMinutes || DEFAULT_DURATION);
    return isOverlapping(startTime, endTime, r.time, resEndTime);
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const dateId = searchParams.get("dateId");
    const staffId = searchParams.get("staffId");

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: "clientId es requerido" },
        { status: 400 },
      );
    }

    // Build filter with optional dateId and staffId
    const filter: any = { clientId };
    if (dateId) {
      filter.dateId = dateId;
    }
    if (staffId) {
      filter.staffId = staffId;
    }

    const collection = await getReservationsCollection();
    const items = await collection
      .find(filter)
      .sort({ dateId: 1, time: 1 })
      .toArray();

    const normalized = items.map((item) => ({
      _id: item._id?.toString(),
      dateId: item.dateId,
      time: item.time,
      endTime: item.endTime,
      durationMinutes: item.durationMinutes,
      name: item.name,
      phone: item.phone,
      serviceName: item.serviceName,
      status: item.status,
      serviceId: item.serviceId,
      servicePrice: item.servicePrice,
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
    const {
      clientId, dateId, time, name, phone,
      serviceName, serviceId, servicePrice,
      status, staffId, staffName,
      durationMinutes, endTime
    } = body ?? {};

    if (!clientId || !dateId || !time || !name) {
      return NextResponse.json(
        { ok: false, error: "clientId, dateId, time y name son requeridos" },
        { status: 400 },
      );
    }

    const collection = await getReservationsCollection();

    // Calculate duration and end time
    const duration = durationMinutes || DEFAULT_DURATION;
    const calculatedEndTime = endTime || addMinutesToTime(time, duration);

    // Check for staff conflicts (if staff is assigned)
    if (staffId) {
      const existingReservations = await collection
        .find({ clientId, dateId })
        .toArray();

      if (hasStaffConflict(existingReservations, staffId, dateId, time, calculatedEndTime)) {
        return NextResponse.json(
          { ok: false, error: "El empleado ya tiene una reserva en ese horario" },
          { status: 409 },
        );
      }
    }

    const now = new Date();
    const doc = {
      clientId,
      dateId,
      time,
      endTime: calculatedEndTime,
      durationMinutes: duration,
      name,
      phone: phone ?? "",
      serviceName: serviceName ?? "",
      serviceId: serviceId ?? "",
      servicePrice: servicePrice ?? undefined,
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
    const {
      id, clientId, dateId, time, name, phone,
      serviceName, serviceId, servicePrice,
      status, staffId, staffName,
      durationMinutes, endTime
    } = body ?? {};

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

    // Calculate duration and end time
    const duration = durationMinutes || current.durationMinutes || DEFAULT_DURATION;
    const newTime = time || current.time;
    const calculatedEndTime = endTime || addMinutesToTime(newTime, duration);
    const newDateId = dateId || current.dateId;
    const newStaffId = staffId !== undefined ? staffId : current.staffId;

    // Check for staff conflicts (if staff is assigned)
    if (newStaffId) {
      const existingReservations = await collection
        .find({ clientId, dateId: newDateId })
        .toArray();

      if (hasStaffConflict(existingReservations, newStaffId, newDateId, newTime, calculatedEndTime, id)) {
        return NextResponse.json(
          { ok: false, error: "El empleado ya tiene una reserva en ese horario" },
          { status: 409 },
        );
      }
    }

    const updateDoc: any = {
      ...(dateId ? { dateId } : {}),
      ...(time ? { time } : {}),
      endTime: calculatedEndTime,
      durationMinutes: duration,
      ...(name ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(serviceName !== undefined ? { serviceName } : {}),
      ...(serviceId !== undefined ? { serviceId } : {}),
      ...(servicePrice !== undefined ? { servicePrice } : {}),
      ...(status ? { status } : {}),
      ...(staffId !== undefined ? { staffId } : {}),
      ...(staffName !== undefined ? { staffName } : {}),
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
        _id: updated?._id?.toString(),
        dateId: updated?.dateId,
        time: updated?.time,
        endTime: updated?.endTime,
        durationMinutes: updated?.durationMinutes,
        name: updated?.name,
        phone: updated?.phone,
        serviceName: updated?.serviceName,
        serviceId: updated?.serviceId,
        servicePrice: updated?.servicePrice,
        status: updated?.status,
        staffId: updated?.staffId,
        staffName: updated?.staffName,
        createdAt: updated?.createdAt,
        updatedAt: updated?.updatedAt,
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
