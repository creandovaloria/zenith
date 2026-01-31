import { NextResponse } from "next/server";
import { getFinanceProjections } from "@/lib/coda";

/**
 * GET /api/finance/pending
 * Obtiene lista de pagos fijos pendientes para el menú del atajo iOS
 * 
 * Response:
 * - menuItems: Array de strings para "Elegir de lista" en iOS (formato: "Concepto - $Monto")
 * - items: Objeto mapeando cada menuItem a sus datos completos (para lookup por label)
 */
export async function GET() {
    try {
        const projections = await getFinanceProjections();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filtrar solo pendientes y vencidos (no pagados)
        const pendingList = projections
            .filter(p => !p.status.includes("✅"))
            .map(p => {
                const dueDate = new Date(p.date);
                dueDate.setHours(0, 0, 0, 0);
                const isOverdue = dueDate < today;
                const statusEmoji = isOverdue ? "❌" : "⏳";

                return {
                    id: p.id,
                    label: `${statusEmoji} ${p.concept} - $${p.amount.toLocaleString()}`,
                    concept: p.concept,
                    amount: p.amount,
                    dueDate: p.date,
                    isOverdue,
                    status: isOverdue ? "❌ Vencido" : "⏳ Pendiente"
                };
            })
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        // Crear array de strings para el menú de iOS
        const menuItems = pendingList.map(p => p.label);

        // Crear objeto de lookup por label
        const items: Record<string, typeof pendingList[0]> = {};
        pendingList.forEach(p => {
            items[p.label] = p;
        });

        return NextResponse.json({
            success: true,
            count: pendingList.length,
            menuItems,  // Array de strings para "Elegir de lista"
            items       // Objeto para lookup: items["❌ Préstamo 50K - $5,000"].id
        });

    } catch (error) {
        console.error("API Finance Pending Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
