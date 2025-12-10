import { NextResponse } from "next/server";
import { getReservationsCollection } from "@/lib/mongodb";
import { upsertCustomerFromReservation } from "@/lib/customers";
import { ObjectId } from "mongodb";
import { isOverlapping, addMinutesToTime } from "@/lib/availability";

export const dynamic = "force-dynamic";

const DEFAULT_DURATION = 60;

/**
 * Normaliza un número de teléfono colombiano al formato de WhatsApp (57XXXXXXXXXX)
 */
function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");

  // Si tiene 10 dígitos y empieza con 3 (colombiano), agregar 57
  if (digits.length === 10 && digits.startsWith("3")) {
    return `57${digits}`;
  }

  // Si ya tiene formato correcto (12 dígitos, empieza con 57)
  if (digits.length === 12 && digits.startsWith("57")) {
    return digits;
  }

  return digits;
}

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
    const phone = searchParams.get("phone");
    const status = searchParams.get("status"); // Confirmada, Cancelada, all
    const upcoming = searchParams.get("upcoming"); // true = only future reservations
    const cancelled = searchParams.get("cancelled"); // true = only cancelled

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: "clientId es requerido" },
        { status: 400 },
      );
    }

    // Build filter with optional parameters
    const filter: any = { clientId };

    if (dateId) {
      filter.dateId = dateId;
    }
    if (staffId) {
      filter.staffId = staffId;
    }

    // Phone search - normalize and search
    if (phone) {
      const normalizedPhone = normalizePhoneNumber(phone);
      // Search by exact match or contains the last digits
      filter.$or = [
        { phone: normalizedPhone },
        { phone: { $regex: phone.replace(/\D/g, "").slice(-10), $options: "i" } },
      ];
    }

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }
    if (cancelled === "true") {
      filter.status = "Cancelada";
    }

    // Only upcoming (future) reservations
    if (upcoming === "true") {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      filter.dateId = { $gte: todayStr };
      filter.status = { $ne: "Cancelada" }; // Exclude cancelled
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
      cancelledAt: item.cancelledAt,
      cancelReason: item.cancelReason,
      rescheduledFrom: item.rescheduledFrom,
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

    // Validate that reservation is not in the past
    const [year, month, day] = dateId.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    const reservationDateTime = new Date(year, month - 1, day, hour, minute);
    const currentTime = new Date();
    // Allow a small buffer (5 minutes) for processing time
    const minBookingTime = new Date(currentTime.getTime() - 5 * 60 * 1000);

    if (reservationDateTime < minBookingTime) {
      return NextResponse.json(
        { ok: false, error: "No se pueden crear reservas para fechas u horas pasadas", code: "PAST_TIME" },
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
    const normalizedPhone = normalizePhoneNumber(phone);
    const doc = {
      clientId,
      dateId,
      time,
      endTime: calculatedEndTime,
      durationMinutes: duration,
      name,
      phone: normalizedPhone,
      serviceName: serviceName ?? "",
      serviceId: serviceId ?? "",
      servicePrice: servicePrice ?? undefined,
      // ALWAYS set status to "Pendiente" for new reservations
      // Only the business owner can confirm from the dashboard
      status: "Pendiente",
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
        phone: normalizedPhone,
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
      durationMinutes, endTime,
      // New fields for cancel/reschedule
      action, // 'cancel' | 'reschedule' | undefined
      cancelReason,
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

    // Handle cancellation
    if (action === "cancel" || status === "Cancelada") {
      const updateDoc = {
        status: "Cancelada",
        cancelledAt: new Date().toISOString(),
        cancelReason: cancelReason || "Cancelado por el cliente",
        updatedAt: new Date().toISOString(),
      };

      await collection.updateOne({ _id: new ObjectId(id), clientId }, { $set: updateDoc });
      const updated = await collection.findOne({ _id: new ObjectId(id), clientId });

      return NextResponse.json({
        ok: true,
        message: "Reserva cancelada exitosamente",
        data: {
          _id: updated?._id?.toString(),
          dateId: updated?.dateId,
          time: updated?.time,
          name: updated?.name,
          status: updated?.status,
          cancelledAt: updated?.cancelledAt,
          cancelReason: updated?.cancelReason,
        },
      });
    }

    // Handle reschedule - store original date/time
    let rescheduledFrom = current.rescheduledFrom;
    if (action === "reschedule" && (dateId !== current.dateId || time !== current.time)) {
      rescheduledFrom = {
        dateId: current.dateId,
        time: current.time,
        rescheduledAt: new Date().toISOString(),
      };
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
      ...(rescheduledFrom ? { rescheduledFrom } : {}),
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
