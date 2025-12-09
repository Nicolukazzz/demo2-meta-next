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
 * POST /api/admin/users - Create a new business user
 */
export async function POST(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            email,
            password,
            clientId,
            businessName,
            businessType = "reservas",
            planSlug = "emprendedor",
            // Branding
            logoUrl,
            primaryColor = "#7c3aed",
            accentColor = "#0ea5e9",
            // Hours
            hours,
            // Features
            features,
            // Staff & Services (optional)
            staff = [],
            services = [],
            // Nav
            nav,
        } = body;

        // Validate required fields
        if (!email || !password || !clientId || !businessName) {
            return NextResponse.json(
                { ok: false, error: "email, password, clientId y businessName son requeridos" },
                { status: 400 }
            );
        }

        const usersCol = await getBusinessUsersCollection();

        // Check if clientId already exists
        const existingClientId = await usersCol.findOne({ clientId });
        if (existingClientId) {
            return NextResponse.json(
                { ok: false, error: "Ya existe un negocio con ese clientId" },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingEmail = await usersCol.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return NextResponse.json(
                { ok: false, error: "Ya existe un negocio con ese email" },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();

        // Default hours if not provided
        const defaultHours = hours || {
            open: "09:00",
            close: "18:00",
            slotMinutes: 60,
            days: [
                { day: 1, open: "09:00", close: "18:00", active: true },
                { day: 2, open: "09:00", close: "18:00", active: true },
                { day: 3, open: "09:00", close: "18:00", active: true },
                { day: 4, open: "09:00", close: "18:00", active: true },
                { day: 5, open: "09:00", close: "18:00", active: true },
                { day: 6, open: "09:00", close: "14:00", active: false },
                { day: 0, open: "09:00", close: "14:00", active: false },
            ],
        };

        // Default features if not provided
        const defaultFeatures = features || {
            reservations: true,
            catalog: false,
            info: true,
            leads: false,
        };

        // Default nav if not provided
        const defaultNav = nav || [
            { label: "Dashboard", key: "dashboard", active: true },
            { label: "Reservas", key: "reservas" },
            { label: "Balance", key: "balance" },
            { label: "Negocio", key: "negocio" },
        ];

        const newUser = {
            email: email.toLowerCase(),
            password,
            clientId,
            businessName,
            businessType,
            planSlug,
            status: "active",
            branding: {
                businessName,
                logoUrl: logoUrl || `https://dummyimage.com/120x120/7c3aed/fff&text=${encodeURIComponent(businessName.charAt(0))}`,
                primaryColor,
                accentColor,
                theme: {
                    primary: primaryColor,
                    secondary: accentColor,
                    tertiary: "#22c55e",
                    cardMirrorEnabled: false,
                    cardMirrorIntensity: 50,
                },
            },
            hours: defaultHours,
            features: defaultFeatures,
            nav: defaultNav,
            staff,
            services,
            createdAt: now,
            updatedAt: now,
        };

        const result = await usersCol.insertOne(newUser);

        return NextResponse.json({
            ok: true,
            data: {
                _id: result.insertedId.toString(),
                clientId,
                email: email.toLowerCase(),
                businessName,
                businessType,
                planSlug,
                status: "active",
                staffCount: staff.length,
                servicesCount: services.length,
                createdAt: now,
            },
        });
    } catch (err) {
        console.error("Error creating user", err);
        return NextResponse.json({ ok: false, error: "Error al crear usuario" }, { status: 500 });
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
