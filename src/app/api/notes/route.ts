import { NextRequest, NextResponse } from 'next/server';
import {
    getFinanceProjections,
    updateFinanceStatus,
    createLedgerEntry
} from '@/lib/coda';
import OpenAI from 'openai';
import { SYSTEM_PROMPT_PM } from '@/lib/prompts';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, Text, receiptUrl } = body;
        const rawTextToProcess = text || Text;

        if (!rawTextToProcess) {
            return NextResponse.json({
                error: 'Missing "text" field',
                hint: "Asegúrate de que el Atajo pase la variable 'Texto transcrito' al campo 'text' del JSON."
            }, { status: 400 });
        }

        // --- STEP 1: FAST HARD DETECTION ---
        const normalizedText = rawTextToProcess.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const hasAmount = /\d+/.test(rawTextToProcess);
        const financialKeywords = ["$", "pesos", "gaste", "pague", "compre", "ticket", "pago", "compra", "registrar", "renta", "colegiatura", "pension"];
        const isFinanceDetection = hasAmount || financialKeywords.some(k => normalizedText.includes(k));

        if (isFinanceDetection) {
            const rawAmount = rawTextToProcess.replace(/,/g, '').match(/\d+(\.\d+)?/)?.[0] || "0";
            const amount = parseFloat(rawAmount);
            const isFixed = normalizedText.includes("renta") || normalizedText.includes("pago") || normalizedText.includes("colegiatura");

            let rowIdToEnrich = "";
            let tableName = "Finance_Ledger";

            // --- STEP 2: IMMEDIATE CODA RECORD ---
            if (isFixed) {
                const projections = await getFinanceProjections();
                const pending = projections.filter(p => !p.status.includes("✅"));
                const target = pending.find(p => {
                    const conceptLower = p.concept.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return normalizedText.includes(conceptLower) || conceptLower.includes(normalizedText);
                });

                if (target) {
                    await updateFinanceStatus(target.id, "✅ Pagado", { receiptUrl, notes: "⌛ Procesando...", title: rawTextToProcess });
                    rowIdToEnrich = target.id;
                    tableName = "Finance_Projection";
                }
            }

            if (!rowIdToEnrich) {
                const newRowId = await createLedgerEntry({
                    concept: rawTextToProcess,
                    amount: amount,
                    category: "Imprevistos",
                    paymentMethod: "Voz / Zenith AI",
                    receiptUrl: receiptUrl,
                    notes: "⌛ Procesando..."
                });
                if (newRowId) {
                    rowIdToEnrich = newRowId as string;
                    tableName = "Finance_Ledger";
                }
            }

            // --- STEP 3: SYNC ENRICHMENT ---
            if (rowIdToEnrich) {
                try {
                    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                    const userContent: any[] = [{ type: "text", text: `Analiza: "${rawTextToProcess}".` }];
                    if (receiptUrl) {
                        const directImageUrl = receiptUrl.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
                        userContent.push({ type: "image_url", image_url: { url: directImageUrl } });
                    }

                    const completion = await openai.chat.completions.create({
                        messages: [
                            { role: "system", content: SYSTEM_PROMPT_PM },
                            { role: "user", content: userContent }
                        ],
                        model: "gpt-4o",
                        response_format: { type: "json_object" }
                    });

                    const aiResponse = JSON.parse(completion.choices[0].message.content || "{}");
                    const finalSummary = aiResponse.summary_content || "Procesado con éxito.";

                    await updateFinanceStatus(
                        rowIdToEnrich,
                        tableName === "Finance_Projection" ? "✅ Pagado" : "Regular",
                        { notes: finalSummary, title: rawTextToProcess },
                        undefined, undefined, tableName
                    );
                } catch (e) {
                    console.error("Enrichment Error:", e);
                }

                return NextResponse.json({
                    success: true,
                    message: `✅ Gasto ok: ${rawTextToProcess.substring(0, 30)}... ($${amount})`
                });
            }
        }

        return NextResponse.json({
            success: false,
            message: `⚠️ Zenith no detectó esto como un gasto.`,
            action: "none"
        }, { status: 200 });

    } catch (error) {
        console.error("API Global Error:", error);
        return NextResponse.json({ error: 'Error Interno' }, { status: 500 });
    }
}
