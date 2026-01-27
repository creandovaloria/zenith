
import { NextRequest, NextResponse } from "next/server";
import { updateFinanceStatus } from "@/lib/coda";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { rowId, status } = body;

        if (!rowId) {
            return NextResponse.json({ error: "Missing rowId" }, { status: 400 });
        }

        const success = await updateFinanceStatus(rowId, status || "✅ Pagado");

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Failed to update Coda" }, { status: 500 });
        }
    } catch (error) {
        console.error("API Finance Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
