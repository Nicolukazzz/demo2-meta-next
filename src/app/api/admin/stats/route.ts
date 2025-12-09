import { NextResponse } from "next/server";
import { getBusinessUsersCollection, getReservationsCollection } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin_dev_secret_2024";

function isAuthorized(request: Request): boolean {
    const authHeader = request.headers.get("x-admin-secret");
    return authHeader === ADMIN_SECRET;
}

/**
 * GET /api/admin/stats - Get admin dashboard statistics
 */
export async function GET(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const usersCol = await getBusinessUsersCollection();
        const reservationsCol = await getReservationsCollection();

        // Get user stats
        const [
            totalUsers,
            activeUsers,
            pausedUsers,
            emprendedorUsers,
            profesionalUsers,
            negocioUsers,
            totalReservations,
            recentReservations,
        ] = await Promise.all([
            usersCol.countDocuments({}),
            usersCol.countDocuments({ $or: [{ status: "active" }, { status: { $exists: false } }] }),
            usersCol.countDocuments({ status: "paused" }),
            usersCol.countDocuments({ planSlug: "emprendedor" }),
            usersCol.countDocuments({ planSlug: "profesional" }),
            usersCol.countDocuments({ planSlug: "negocio" }),
            reservationsCol.countDocuments({}),
            reservationsCol.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
            }),
        ]);

        // Get users without planSlug (need migration)
        const usersWithoutPlan = await usersCol.countDocuments({
            planSlug: { $exists: false },
        });

        // Calculate MRR (Monthly Recurring Revenue)
        const planPrices: Record<string, number> = {
            emprendedor: 49000,
            profesional: 69000,
            negocio: 99000,
        };
        const mrr =
            emprendedorUsers * planPrices.emprendedor +
            profesionalUsers * planPrices.profesional +
            negocioUsers * planPrices.negocio;

        // Get recent signups (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const recentSignups = await usersCol.countDocuments({
            createdAt: { $gte: thirtyDaysAgo },
        });

        return NextResponse.json({
            ok: true,
            data: {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    paused: pausedUsers,
                    recentSignups,
                    withoutPlan: usersWithoutPlan,
                },
                plans: {
                    emprendedor: emprendedorUsers,
                    profesional: profesionalUsers,
                    negocio: negocioUsers,
                },
                reservations: {
                    total: totalReservations,
                    lastWeek: recentReservations,
                },
                revenue: {
                    mrr,
                    currency: "COP",
                },
            },
        });
    } catch (err) {
        console.error("Error getting admin stats", err);
        return NextResponse.json({ ok: false, error: "Error al obtener estadísticas" }, { status: 500 });
    }
}
