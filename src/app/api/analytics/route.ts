/**
 * API: Analytics con Agregaciones MongoDB
 * 
 * Este endpoint usa el pipeline de agregación de MongoDB para calcular
 * métricas directamente en la base de datos, en lugar de traer todos
 * los documentos y procesarlos en JavaScript.
 * 
 * BENEFICIOS:
 * - 10x más rápido que procesar en el cliente
 * - Menos uso de memoria RAM
 * - Menos datos transferidos por la red
 * 
 * @route GET /api/analytics/balance
 * @route GET /api/analytics/services
 * @route GET /api/analytics/daily
 */

import { NextResponse } from "next/server";
import { getReservationsCollection } from "@/lib/mongodb";
import type { BalanceSummary, ServiceMetrics } from "@/types/models";

export const dynamic = "force-dynamic";

// Helpers para fechas
function getDateRanges() {
    const now = new Date();

    // Hoy
    const todayStr = now.toISOString().split("T")[0];

    // Esta semana (Lunes a Domingo)
    const dayOfWeek = (now.getDay() + 6) % 7; // Lunes = 0
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    // Este mes
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split("T")[0];

    return {
        today: todayStr,
        weekStart: weekStartStr,
        monthStart: monthStartStr,
    };
}

/**
 * GET /api/analytics?clientId=xxx&type=balance|services|daily
 * 
 * Tipos de analytics:
 * - balance: Resumen financiero general
 * - services: Métricas por servicio
 * - daily: Ingresos por día (para gráficas)
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get("clientId");
        const type = searchParams.get("type") || "balance";
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (!clientId) {
            return NextResponse.json(
                { ok: false, error: "clientId es requerido" },
                { status: 400 }
            );
        }

        const collection = await getReservationsCollection();
        const { today, weekStart, monthStart } = getDateRanges();

        // ============================================================
        // BALANCE SUMMARY
        // ============================================================
        if (type === "balance") {
            // Pipeline de agregación para calcular todo de una vez
            const pipeline = [
                // 1. Filtrar por cliente
                { $match: { clientId } },

                // 2. Agrupar y calcular métricas
                {
                    $group: {
                        _id: null,

                        // Conteos
                        totalReservations: { $sum: 1 },
                        confirmedCount: {
                            $sum: { $cond: [{ $eq: ["$status", "Confirmada"] }, 1, 0] }
                        },
                        pendingCount: {
                            $sum: { $cond: [{ $eq: ["$status", "Pendiente"] }, 1, 0] }
                        },
                        cancelledCount: {
                            $sum: { $cond: [{ $eq: ["$status", "Cancelada"] }, 1, 0] }
                        },

                        // Ingresos CONFIRMADOS (solo lo que ya se cobró)
                        totalRevenue: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$status", "Confirmada"] },
                                    { $ifNull: ["$confirmedPrice", { $ifNull: ["$servicePrice", 0] }] },
                                    0
                                ]
                            }
                        },

                        // Ingresos del mes (confirmados)
                        monthRevenue: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$status", "Confirmada"] },
                                            { $gte: ["$dateId", monthStart] }
                                        ]
                                    },
                                    { $ifNull: ["$confirmedPrice", { $ifNull: ["$servicePrice", 0] }] },
                                    0
                                ]
                            }
                        },

                        // Ingresos de la semana (confirmados)
                        weekRevenue: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$status", "Confirmada"] },
                                            { $gte: ["$dateId", weekStart] }
                                        ]
                                    },
                                    { $ifNull: ["$confirmedPrice", { $ifNull: ["$servicePrice", 0] }] },
                                    0
                                ]
                            }
                        },

                        // Ingresos de hoy (confirmados)
                        todayRevenue: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$status", "Confirmada"] },
                                            { $eq: ["$dateId", today] }
                                        ]
                                    },
                                    { $ifNull: ["$confirmedPrice", { $ifNull: ["$servicePrice", 0] }] },
                                    0
                                ]
                            }
                        },

                        // Ingresos ESPERADOS (pendientes - aún no cobrados)
                        expectedRevenue: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$status", "Pendiente"] },
                                    { $ifNull: ["$servicePrice", 0] },
                                    0
                                ]
                            }
                        }
                    }
                }
            ];

            const result = await collection.aggregate(pipeline).toArray();
            const data = result[0] || {
                totalReservations: 0,
                confirmedCount: 0,
                pendingCount: 0,
                cancelledCount: 0,
                totalRevenue: 0,
                monthRevenue: 0,
                weekRevenue: 0,
                todayRevenue: 0,
                expectedRevenue: 0
            };

            // Calcular ticket promedio
            const averageTicket = data.confirmedCount > 0
                ? Math.round(data.totalRevenue / data.confirmedCount)
                : 0;

            // Construir respuesta con todos los campos
            const balance = {
                totalRevenue: data.totalRevenue || 0,
                monthRevenue: data.monthRevenue || 0,
                weekRevenue: data.weekRevenue || 0,
                todayRevenue: data.todayRevenue || 0,
                totalReservations: data.totalReservations || 0,
                confirmedCount: data.confirmedCount || 0,
                pendingCount: data.pendingCount || 0,
                cancelledCount: data.cancelledCount || 0,
                averageTicket,
                expectedRevenue: data.expectedRevenue || 0,
            };

            return NextResponse.json({ ok: true, data: balance });
        }

        // ============================================================
        // SERVICES METRICS (Ingresos por servicio)
        // ============================================================
        if (type === "services") {
            const matchStage: any = { clientId };

            if (startDate) matchStage.dateId = { $gte: startDate };
            if (endDate) matchStage.dateId = { ...matchStage.dateId, $lte: endDate };

            const pipeline = [
                { $match: matchStage },
                {
                    $group: {
                        _id: { $ifNull: ["$serviceId", "$serviceName"] },
                        name: { $first: { $ifNull: ["$serviceName", "Sin nombre"] } },
                        count: { $sum: 1 },
                        // Solo sumar revenue de confirmadas
                        revenue: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$status", "Confirmada"] },
                                    { $ifNull: ["$confirmedPrice", { $ifNull: ["$servicePrice", 0] }] },
                                    0
                                ]
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        serviceId: "$_id",
                        name: 1,
                        count: 1,
                        revenue: 1,
                        averagePrice: {
                            $cond: [
                                { $gt: ["$count", 0] },
                                { $divide: ["$revenue", "$count"] },
                                0
                            ]
                        }
                    }
                },
                { $sort: { revenue: -1 } }
            ];

            const data = await collection.aggregate(pipeline).toArray();
            return NextResponse.json({ ok: true, data });
        }

        // ============================================================
        // DAILY METRICS (Ingresos por día - para gráficas)
        // ============================================================
        if (type === "daily") {
            const matchStage: any = { clientId };

            // Default: últimos 30 días
            if (!startDate && !endDate) {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                matchStage.dateId = { $gte: thirtyDaysAgo.toISOString().split("T")[0] };
            } else {
                if (startDate) matchStage.dateId = { $gte: startDate };
                if (endDate) matchStage.dateId = { ...matchStage.dateId, $lte: endDate };
            }

            const pipeline = [
                { $match: matchStage },
                {
                    $group: {
                        _id: "$dateId",
                        totalReservations: { $sum: 1 },
                        confirmedCount: {
                            $sum: { $cond: [{ $eq: ["$status", "Confirmada"] }, 1, 0] }
                        },
                        revenue: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$status", "Confirmada"] },
                                    { $ifNull: ["$confirmedPrice", { $ifNull: ["$servicePrice", 0] }] },
                                    0
                                ]
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        date: "$_id",
                        totalReservations: 1,
                        confirmedCount: 1,
                        revenue: 1
                    }
                },
                { $sort: { date: 1 } }
            ];

            const data = await collection.aggregate(pipeline).toArray();
            return NextResponse.json({ ok: true, data });
        }

        // ============================================================
        // STAFF METRICS (Rendimiento por empleado)
        // ============================================================
        if (type === "staff") {
            const matchStage: any = { clientId };

            if (startDate) matchStage.dateId = { $gte: startDate };
            if (endDate) matchStage.dateId = { ...matchStage.dateId, $lte: endDate };

            const pipeline = [
                { $match: matchStage },
                {
                    $group: {
                        _id: { $ifNull: ["$staffId", "sin-staff"] },
                        name: { $first: { $ifNull: ["$staffName", "Sin asignar"] } },
                        totalReservations: { $sum: 1 },
                        confirmedReservations: {
                            $sum: { $cond: [{ $eq: ["$status", "Confirmada"] }, 1, 0] }
                        },
                        cancelledReservations: {
                            $sum: { $cond: [{ $eq: ["$status", "Cancelada"] }, 1, 0] }
                        },
                        totalRevenue: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$status", "Confirmada"] },
                                    { $ifNull: ["$confirmedPrice", { $ifNull: ["$servicePrice", 0] }] },
                                    0
                                ]
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        staffId: "$_id",
                        name: 1,
                        totalReservations: 1,
                        confirmedReservations: 1,
                        totalRevenue: 1,
                        cancellationRate: {
                            $cond: [
                                { $gt: ["$totalReservations", 0] },
                                {
                                    $multiply: [
                                        { $divide: ["$cancelledReservations", "$totalReservations"] },
                                        100
                                    ]
                                },
                                0
                            ]
                        }
                    }
                },
                { $sort: { totalRevenue: -1 } }
            ];

            const data = await collection.aggregate(pipeline).toArray();
            return NextResponse.json({ ok: true, data });
        }

        return NextResponse.json(
            { ok: false, error: `Tipo de analytics no soportado: ${type}` },
            { status: 400 }
        );

    } catch (err) {
        console.error("Error en analytics:", err);
        return NextResponse.json(
            { ok: false, error: "Error calculando analytics" },
            { status: 500 }
        );
    }
}
