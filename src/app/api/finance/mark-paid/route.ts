
import { NextRequest, NextResponse } from "next/server";
import { updateFinanceStatus } from "@/lib/coda";

/**
 * POST /api/finance/mark-paid
 * Marca un pago fijo como pagado
 * 
 * Body:
 * - rowId: string (ID de la fila en Coda)
 * - status?: string (default: "✅ Pagado")
 * - receiptUrl?: string (URL del comprobante en Dropbox)
 * - notes?: string (notas adicionales)
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { rowId, status, receiptUrl, notes } = body;

        if (!rowId) {
            return NextResponse.json({ error: "Missing rowId" }, { status: 400 });
        }

        const success = await updateFinanceStatus(
            rowId,
            status || "✅ Pagado",
            {
                receiptUrl,
                notes: notes || (receiptUrl ? "Comprobante adjunto" : undefined)
            }
        );

        if (success) {
            return NextResponse.json({
                success: true,
                message: receiptUrl
                    ? "✅ Pagado y comprobante guardado"
                    : "✅ Marcado como pagado"
            });
        } else {
            return NextResponse.json({ error: "Failed to update Coda" }, { status: 500 });
        }
    } catch (error) {
        console.error("API Finance Mark-Paid Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
