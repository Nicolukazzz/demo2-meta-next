import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { PLANS, type SubscriptionPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

// Admin check
const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin_dev_secret_2024";

function isAuthorized(request: Request): boolean {
    const authHeader = request.headers.get("x-admin-secret");
    return authHeader === ADMIN_SECRET;
}

/**
 * GET /api/admin/plans - List all plans from DB or fallback to defaults
 */
export async function GET(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const db = await getDb();
        const plansCol = db.collection("plans");

        const plans = await plansCol.find({}).sort({ order: 1 }).toArray();

        if (plans.length === 0) {
            // Return default plans if none exist in DB
            return NextResponse.json({
                ok: true,
                data: PLANS.map((p, i) => ({ ...p, _id: `default_${i}` })),
                fromDefaults: true,
            });
        }

        const normalized = plans.map((plan) => ({
            _id: plan._id?.toString(),
            slug: plan.slug,
            name: plan.name,
            subtitle: plan.subtitle,
            description: plan.description,
            price: plan.price,
            currency: plan.currency,
            period: plan.period,
            minEmployees: plan.minEmployees,
            maxEmployees: plan.maxEmployees,
            features: plan.features || [],
            highlighted: plan.highlighted || false,
            highlightLabel: plan.highlightLabel,
            ctaText: plan.ctaText,
            isVisible: plan.isVisible !== false,
            order: plan.order ?? 0,
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt,
        }));

        return NextResponse.json({ ok: true, data: normalized });
    } catch (err) {
        console.error("Error listing plans", err);
        return NextResponse.json({ ok: false, error: "Error al listar planes" }, { status: 500 });
    }
}

/**
 * POST /api/admin/plans - Create a new plan
 */
export async function POST(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            slug,
            name,
            subtitle,
            description,
            price,
            currency = "COP",
            period = "/mes",
            minEmployees,
            maxEmployees,
            features,
            highlighted,
            highlightLabel,
            ctaText,
            isVisible,
            order,
        } = body;

        // Validate required fields
        if (!slug || !name || price === undefined) {
            return NextResponse.json(
                { ok: false, error: "slug, name y price son requeridos" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const plansCol = db.collection("plans");

        // Check if slug already exists
        const existing = await plansCol.findOne({ slug });
        if (existing) {
            return NextResponse.json(
                { ok: false, error: "Ya existe un plan con ese slug" },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();
        const newPlan = {
            slug,
            name,
            subtitle: subtitle || "",
            description: description || "",
            price: Number(price),
            currency,
            period,
            minEmployees: Number(minEmployees) || 1,
            maxEmployees: Number(maxEmployees) || 1,
            features: features || [],
            highlighted: highlighted || false,
            highlightLabel: highlightLabel || "",
            ctaText: ctaText || "Comenzar ahora",
            isVisible: isVisible !== false,
            order: order ?? 99,
            createdAt: now,
            updatedAt: now,
        };

        const result = await plansCol.insertOne(newPlan);

        return NextResponse.json({
            ok: true,
            data: { ...newPlan, _id: result.insertedId.toString() },
        });
    } catch (err) {
        console.error("Error creating plan", err);
        return NextResponse.json({ ok: false, error: "Error al crear plan" }, { status: 500 });
    }
}

/**
 * PUT /api/admin/plans - Update a plan
 */
export async function PUT(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { _id, slug, ...updates } = body;

        // Need either _id or slug to identify the plan
        if (!_id && !slug) {
            return NextResponse.json(
                { ok: false, error: "_id o slug es requerido" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const plansCol = db.collection("plans");
        const { ObjectId } = await import("mongodb");

        const query = _id ? { _id: new ObjectId(_id) } : { slug };

        const now = new Date().toISOString();
        const updateDoc: any = { updatedAt: now };

        // Update allowed fields
        if (updates.name !== undefined) updateDoc.name = updates.name;
        if (updates.subtitle !== undefined) updateDoc.subtitle = updates.subtitle;
        if (updates.description !== undefined) updateDoc.description = updates.description;
        if (updates.price !== undefined) updateDoc.price = Number(updates.price);
        if (updates.currency !== undefined) updateDoc.currency = updates.currency;
        if (updates.period !== undefined) updateDoc.period = updates.period;
        if (updates.minEmployees !== undefined) updateDoc.minEmployees = Number(updates.minEmployees);
        if (updates.maxEmployees !== undefined) updateDoc.maxEmployees = Number(updates.maxEmployees);
        if (updates.features !== undefined) updateDoc.features = updates.features;
        if (updates.highlighted !== undefined) updateDoc.highlighted = updates.highlighted;
        if (updates.highlightLabel !== undefined) updateDoc.highlightLabel = updates.highlightLabel;
        if (updates.ctaText !== undefined) updateDoc.ctaText = updates.ctaText;
        if (updates.isVisible !== undefined) updateDoc.isVisible = updates.isVisible;
        if (updates.order !== undefined) updateDoc.order = Number(updates.order);

        const result = await plansCol.updateOne(query, { $set: updateDoc });

        if (result.matchedCount === 0) {
            return NextResponse.json({ ok: false, error: "Plan no encontrado" }, { status: 404 });
        }

        // Return updated plan
        const updated = await plansCol.findOne(query);

        return NextResponse.json({
            ok: true,
            data: { ...updated, _id: updated?._id?.toString() },
        });
    } catch (err) {
        console.error("Error updating plan", err);
        return NextResponse.json({ ok: false, error: "Error al actualizar plan" }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/plans - Delete a plan
 */
export async function DELETE(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const _id = searchParams.get("_id");
        const slug = searchParams.get("slug");

        if (!_id && !slug) {
            return NextResponse.json(
                { ok: false, error: "_id o slug es requerido" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const plansCol = db.collection("plans");
        const { ObjectId } = await import("mongodb");

        const query = _id ? { _id: new ObjectId(_id) } : { slug };
        const result = await plansCol.deleteOne(query);

        if (result.deletedCount === 0) {
            return NextResponse.json({ ok: false, error: "Plan no encontrado" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, message: "Plan eliminado" });
    } catch (err) {
        console.error("Error deleting plan", err);
        return NextResponse.json({ ok: false, error: "Error al eliminar plan" }, { status: 500 });
    }
}
