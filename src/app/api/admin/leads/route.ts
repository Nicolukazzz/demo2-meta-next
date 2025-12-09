import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// Admin check
const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin_dev_secret_2024";

function isAuthorized(request: Request): boolean {
    const authHeader = request.headers.get("x-admin-secret");
    return authHeader === ADMIN_SECRET;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "rejected";

export type Lead = {
    _id?: string;
    name: string;
    email: string;
    phone: string;
    businessName: string;
    industry: string;
    employeeCount: string;
    city: string;
    plan: string;
    howFound: string;
    message: string;
    status: LeadStatus;
    notes?: string;
    createdAt: string;
    updatedAt?: string;
    contactedAt?: string;
    convertedAt?: string;
};

/**
 * GET /api/admin/leads - List all leads
 */
export async function GET(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const search = searchParams.get("search") || "";
        const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));
        const skip = parseInt(searchParams.get("skip") || "0", 10);

        const db = await getDb();
        const leadsCol = db.collection("leads");

        // Build query
        const query: any = {};
        if (status && status !== "all") {
            query.status = status;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
                { businessName: { $regex: search, $options: "i" } },
            ];
        }

        const [leads, total] = await Promise.all([
            leadsCol.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
            leadsCol.countDocuments(query),
        ]);

        const normalized = leads.map((lead: any) => ({
            _id: lead._id?.toString(),
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            businessName: lead.businessName,
            industry: lead.industry,
            employeeCount: lead.employeeCount,
            city: lead.city,
            plan: lead.plan,
            howFound: lead.howFound,
            message: lead.message,
            status: lead.status || "new",
            notes: lead.notes,
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
            contactedAt: lead.contactedAt,
            convertedAt: lead.convertedAt,
        }));

        // Get stats
        const stats = await leadsCol.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]).toArray();

        const statsSummary = {
            total,
            new: 0,
            contacted: 0,
            qualified: 0,
            converted: 0,
            rejected: 0,
        };

        stats.forEach((s: any) => {
            if (s._id && s._id in statsSummary) {
                (statsSummary as any)[s._id] = s.count;
            } else if (!s._id) {
                statsSummary.new += s.count;
            }
        });

        return NextResponse.json({
            ok: true,
            data: normalized,
            stats: statsSummary,
            pagination: { total, limit, skip, hasMore: skip + leads.length < total },
        });
    } catch (err) {
        console.error("Error listing leads", err);
        return NextResponse.json({ ok: false, error: "Error al listar leads" }, { status: 500 });
    }
}

/**
 * PUT /api/admin/leads - Update a lead
 */
export async function PUT(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { _id, ...updates } = body;

        if (!_id) {
            return NextResponse.json({ ok: false, error: "_id es requerido" }, { status: 400 });
        }

        const db = await getDb();
        const leadsCol = db.collection("leads");
        const { ObjectId } = await import("mongodb");

        const now = new Date().toISOString();
        const updateDoc: any = { updatedAt: now };

        // Update allowed fields
        if (updates.status !== undefined) {
            updateDoc.status = updates.status;
            if (updates.status === "contacted" && !updates.contactedAt) {
                updateDoc.contactedAt = now;
            }
            if (updates.status === "converted" && !updates.convertedAt) {
                updateDoc.convertedAt = now;
            }
        }
        if (updates.notes !== undefined) updateDoc.notes = updates.notes;
        if (updates.name !== undefined) updateDoc.name = updates.name;
        if (updates.email !== undefined) updateDoc.email = updates.email;
        if (updates.phone !== undefined) updateDoc.phone = updates.phone;

        const result = await leadsCol.updateOne(
            { _id: new ObjectId(_id) },
            { $set: updateDoc }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ ok: false, error: "Lead no encontrado" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, message: "Lead actualizado" });
    } catch (err) {
        console.error("Error updating lead", err);
        return NextResponse.json({ ok: false, error: "Error al actualizar lead" }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/leads - Delete a lead
 */
export async function DELETE(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const _id = searchParams.get("_id");

        if (!_id) {
            return NextResponse.json({ ok: false, error: "_id es requerido" }, { status: 400 });
        }

        const db = await getDb();
        const leadsCol = db.collection("leads");
        const { ObjectId } = await import("mongodb");

        const result = await leadsCol.deleteOne({ _id: new ObjectId(_id) });

        if (result.deletedCount === 0) {
            return NextResponse.json({ ok: false, error: "Lead no encontrado" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, message: "Lead eliminado" });
    } catch (err) {
        console.error("Error deleting lead", err);
        return NextResponse.json({ ok: false, error: "Error al eliminar lead" }, { status: 500 });
    }
}
