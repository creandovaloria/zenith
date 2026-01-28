import { NextRequest, NextResponse } from "next/server";
import { createLedgerEntry } from "@/lib/coda";
import { FINANCE_CATEGORIES } from "@/lib/prompts";

/**
 * POST /api/finance/quick
 * Registro rápido de gasto variable (sin IA)
 * 
 * Body:
 * - category: string (nombre de categoría, puede ser corto o completo)
 * - amount: number
 * - concept: string (descripción corta)
 * - paymentMethod?: string (default: "Efectivo")
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { category, amount, concept, paymentMethod } = body;

        // Validaciones
        if (!category || !amount || !concept) {
            return NextResponse.json({
                error: "Faltan campos requeridos",
                hint: "Necesito: category, amount, concept"
            }, { status: 400 });
        }

        // Normalizar categoría al nombre completo de Coda
        const normalizedInput = category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

        const fullCategory = FINANCE_CATEGORIES.find(fullCat => {
            const normalizedFull = fullCat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const shortName = fullCat.split("(")[0].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return normalizedFull === normalizedInput ||
                shortName === normalizedInput ||
                normalizedInput.includes(shortName) ||
                shortName.includes(normalizedInput);
        }) || "Imprevistos (Emergencias, reparaciones)";

        // Crear entrada en Ledger
        const rowId = await createLedgerEntry({
            concept: concept.substring(0, 100),
            amount: parseFloat(amount),
            category: fullCategory,
            paymentMethod: paymentMethod || "Efectivo",
            notes: `Registro rápido vía Zenith`
        });

        if (rowId) {
            return NextResponse.json({
                success: true,
                message: `✅ Registrado: ${concept.substring(0, 20)}... ($${amount})`,
                category: fullCategory,
                rowId
            });
        } else {
            return NextResponse.json({ error: "Error al guardar en Coda" }, { status: 500 });
        }

    } catch (error) {
        console.error("API Finance Quick Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
