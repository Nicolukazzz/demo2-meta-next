import { NextResponse } from "next/server";
import { getBusinessUsersCollection } from "@/lib/mongodb";
import { normalizeBusinessUser } from "@/lib/businessProfile";

export const dynamic = "force-dynamic";

// Simple admin check - in production, use proper authentication
const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin_dev_secret_2024";

function isAuthorized(request: Request): boolean {
    const authHeader = request.headers.get("x-admin-secret");
    return authHeader === ADMIN_SECRET;
}

/**
 * GET /api/admin/users - List all business users
 */
export async function GET(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const status = searchParams.get("status"); // active, paused, all
        const planSlug = searchParams.get("planSlug");
        const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));
        const skip = parseInt(searchParams.get("skip") || "0", 10);

        const usersCol = await getBusinessUsersCollection();

        // Build query
        const query: any = {};
        if (search) {
            query.$or = [
                { email: { $regex: search, $options: "i" } },
                { clientId: { $regex: search, $options: "i" } },
                { "branding.businessName": { $regex: search, $options: "i" } },
                { businessName: { $regex: search, $options: "i" } },
            ];
        }
        if (status && status !== "all") {
            query.status = status;
        }
        if (planSlug) {
            query.planSlug = planSlug;
        }

        const [users, total] = await Promise.all([
            usersCol.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
            usersCol.countDocuments(query),
        ]);

        const normalized = users.map((user) => {
            const n = normalizeBusinessUser(user);
            return {
                _id: user._id?.toString(),
                clientId: n.clientId,
                email: n.email,
                businessName: n.branding?.businessName,
                businessType: n.businessType,
                planSlug: n.planSlug ?? "emprendedor",
                status: n.status ?? "active",
                staffCount: n.staff?.length ?? 0,
                servicesCount: n.services?.length ?? 0,
                createdAt: n.createdAt,
                updatedAt: n.updatedAt,
            };
        });

        return NextResponse.json({
            ok: true,
            data: normalized,
            pagination: { total, limit, skip, hasMore: skip + users.length < total },
        });
    } catch (err) {
        console.error("Error listing users", err);
        return NextResponse.json({ ok: false, error: "Error al listar usuarios" }, { status: 500 });
    }
}

/**
 * PUT /api/admin/users - Update a business user
 */
export async function PUT(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { clientId, ...updates } = body;

        if (!clientId) {
            return NextResponse.json({ ok: false, error: "clientId es requerido" }, { status: 400 });
        }

        const usersCol = await getBusinessUsersCollection();
        const now = new Date().toISOString();

        // Build update document
        const updateDoc: any = { updatedAt: now };

        // Allowed fields to update
        if (updates.email !== undefined) updateDoc.email = updates.email;
        if (updates.status !== undefined) updateDoc.status = updates.status;
        if (updates.planSlug !== undefined) updateDoc.planSlug = updates.planSlug;
        if (updates.businessType !== undefined) updateDoc.businessType = updates.businessType;
        if (updates.password !== undefined) updateDoc.password = updates.password;

        // Branding updates
        if (updates.businessName !== undefined) {
            updateDoc["branding.businessName"] = updates.businessName;
            updateDoc.businessName = updates.businessName;
        }
        if (updates.logoUrl !== undefined) {
            updateDoc["branding.logoUrl"] = updates.logoUrl;
        }

        // Hours updates
        if (updates.hours !== undefined) {
            updateDoc.hours = updates.hours;
        }

        const result = await usersCol.updateOne({ clientId }, { $set: updateDoc });

        if (result.matchedCount === 0) {
            return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
        }

        // Return updated user
        const updated = await usersCol.findOne({ clientId });
        const normalized = normalizeBusinessUser(updated);

        return NextResponse.json({
            ok: true,
            data: {
                clientId: normalized.clientId,
                email: normalized.email,
                businessName: normalized.branding?.businessName,
                businessType: normalized.businessType,
                planSlug: normalized.planSlug,
                status: normalized.status,
                staffCount: normalized.staff?.length ?? 0,
                servicesCount: normalized.services?.length ?? 0,
                updatedAt: normalized.updatedAt,
            },
        });
    } catch (err) {
        console.error("Error updating user", err);
        return NextResponse.json({ ok: false, error: "Error al actualizar usuario" }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/users - Delete a business user (soft delete by setting status)
 */
export async function DELETE(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get("clientId");
        const permanent = searchParams.get("permanent") === "true";

        if (!clientId) {
            return NextResponse.json({ ok: false, error: "clientId es requerido" }, { status: 400 });
        }

        const usersCol = await getBusinessUsersCollection();

        if (permanent) {
            // Hard delete - use with caution
            const result = await usersCol.deleteOne({ clientId });
            if (result.deletedCount === 0) {
                return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
            }
            return NextResponse.json({ ok: true, message: "Usuario eliminado permanentemente" });
        } else {
            // Soft delete - just mark as deleted
            const result = await usersCol.updateOne(
                { clientId },
                { $set: { status: "deleted", updatedAt: new Date().toISOString() } }
            );
            if (result.matchedCount === 0) {
                return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
            }
            return NextResponse.json({ ok: true, message: "Usuario marcado como eliminado" });
        }
    } catch (err) {
        console.error("Error deleting user", err);
        return NextResponse.json({ ok: false, error: "Error al eliminar usuario" }, { status: 500 });
    }
}
