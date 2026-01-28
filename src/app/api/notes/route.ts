
import { NextResponse } from 'next/server';
import {
    createNote,
    NoteData,
    getFinanceProjections,
    updateFinanceStatus,
    createLedgerEntry
} from '@/lib/coda';
import OpenAI from 'openai';
import { SYSTEM_PROMPT_PM } from '@/lib/prompts';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // Support both 'text' and 'Text' because iOS Shortcuts can be inconsistent
        let { text, Text, type, title, summary, category, project, receiptUrl } = body;
        const finalWeightText = text || Text;

        if (!finalWeightText) {
            return NextResponse.json({
                error: 'Missing "text" field',
                receivedBody: body,
                hint: "Asegúrate de que el Atajo pase la variable 'Texto transcrito' al campo 'text' del JSON."
            }, { status: 400 });
        }

        const rawTextToProcess = finalWeightText;

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
                    await updateFinanceStatus(target.id, "✅ Pagado", { receiptUrl, notes: "⌛ Generando resumen IA...", title: rawTextToProcess });
                    rowIdToEnrich = target.id;
                    tableName = "Finance_Projection";
                }
            }

            if (!rowIdToEnrich) {
                const newRowId = await createLedgerEntry({
                    concept: rawTextToProcess,
                    amount: amount,
                    category: "Inversión Personal Presencia", // Default
                    paymentMethod: "Voz / Zenith AI",
                    receiptUrl: receiptUrl,
                    notes: "⌛ Analizando ticket con IA..."
                });
                if (newRowId) {
                    rowIdToEnrich = newRowId as string;
                    tableName = "Finance_Ledger";
                }
            }

            // --- STEP 3: ASYNC ENRICHMENT (Fire and Forget) ---
            if (rowIdToEnrich) {
                // Return response immediately
                NextResponse.json({ success: true, message: `✅ Recibido: ${rawTextToProcess.substring(0, 20)}...` });

                // Keep processing in background (Node.js magic)
                (async () => {
                    try {
                        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                        const userContent: any[] = [{ type: "text", text: `Analiza esta transacción financiera. Voz: "${rawTextToProcess}".` }];
                        if (receiptUrl) {
                            const directImageUrl = receiptUrl.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
                            userContent.push({ type: "image_url", image_url: { url: directImageUrl } });
                            userContent[0].text += " También lee el ticket (OCR).";
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
                        const finalCategory = aiResponse.finance_details?.category || "General";

                        // Update the row with final AI details
                        await updateFinanceStatus(rowIdToEnrich, tableName === "Finance_Projection" ? "✅ Pagado" : undefined, {
                            notes: finalSummary,
                            title: rawTextToProcess // Keep raw dictation as concept
                        }, undefined, undefined, tableName);
                        // Note: updateFinanceStatus currently hardcoded to Finance_Projection, 
                        // but we'll fix it in coda.ts to be generic or create updateFinanceRow.
                    } catch (e) {
                        console.error("Background Enrichment Error:", e);
                    }
                })();
            }

            return NextResponse.json({
                success: true,
                message: `✅ Gasto registrado: ${rawTextToProcess.substring(0, 30)} ($${amount})`
            });
        }

        // --- Fallback ---
        return NextResponse.json({
            success: false,
            message: `⚠️ Zenith no pudo procesar esto. Recibí: "${rawTextToProcess}"`,
            action: "none"
        }, { status: 200 });

    } catch (error) {
        console.error("API Global Error:", error);
        return NextResponse.json({ error: 'Error Interno: ' + (error as any).message }, { status: 500 });
    }
}
