import { NextResponse } from "next/server";
import { getFinanceProjections } from "@/lib/coda";

/**
 * GET /api/finance/pending
 * Obtiene lista de pagos fijos pendientes para el menú del atajo
 * 
 * Response:
 * - items: Array de { id, label, amount, dueDate, isOverdue }
 */
export async function GET() {
    try {
        const projections = await getFinanceProjections();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filtrar solo pendientes y vencidos (no pagados)
        const pending = projections
            .filter(p => !p.status.includes("✅"))
            .map(p => {
                const dueDate = new Date(p.date);
                dueDate.setHours(0, 0, 0, 0);
                const isOverdue = dueDate < today;

                return {
                    id: p.id,
                    label: `${p.concept} - $${p.amount.toLocaleString()}`,
                    concept: p.concept,
                    amount: p.amount,
                    dueDate: p.date,
                    isOverdue,
                    status: isOverdue ? "❌ Vencido" : "⏳ Pendiente"
                };
            })
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        return NextResponse.json({
            success: true,
            count: pending.length,
            items: pending
        });

    } catch (error) {
        console.error("API Finance Pending Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
