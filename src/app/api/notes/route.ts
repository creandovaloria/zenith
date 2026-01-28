
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
        let aiFinanceDetails: any = null;

        // --- PHASE 1: HARD DETECTORS (100% RELIABLE) ---
        const normalizedText = rawTextToProcess.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const hasAmount = /\d+/.test(rawTextToProcess);
        const financialKeywords = ["$", "pesos", "gaste", "pague", "compre", "ticket", "pago", "compra", "registrar", "renta", "colegiatura", "pension"];
        const hasFinanceKeywords = financialKeywords.some(k => normalizedText.includes(k));

        if (hasAmount || hasFinanceKeywords) {
            const rawAmount = rawTextToProcess.replace(/,/g, '').match(/\d+(\.\d+)?/)?.[0] || "0";
            aiFinanceDetails = {
                is_finance: true,
                amount: parseFloat(rawAmount),
                concept: "Gasto en proceso...",
                category: "Logística de Vida",
                action: normalizedText.includes("renta") || normalizedText.includes("pago") || normalizedText.includes("colegiatura") ? "mark_paid" : "new_expense"
            };
        }

        // --- PHASE 2: AI ENRICHMENT (Vision + Text) ---
        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            // Prepare messages for Vision if there's an image
            const userContent: any[] = [{ type: "text", text: `Transcripción del usuario: "${rawTextToProcess}"` }];

            if (receiptUrl) {
                // Prepare Dropbox link for direct access by OpenAI Vision
                const directImageUrl = receiptUrl.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
                userContent.push({
                    type: "image_url",
                    image_url: { url: directImageUrl }
                });
                userContent[0].text += " | IMPORTANTE: También tienes una foto del ticket. Analízala (OCR) y combina la información con el audio en el resumen.";
            }

            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: SYSTEM_PROMPT_PM },
                    { role: "user", content: userContent }
                ],
                model: "gpt-4o",
                response_format: { type: "json_object" }
            }, { timeout: 12000 });

            const aiContent = completion.choices[0].message.content;
            if (aiContent) {
                const aiResponse = JSON.parse(aiContent);
                console.log("🧠 Zenith Vision/AI Thought:", JSON.stringify(aiResponse, null, 2));

                if (aiResponse.suggested_title) title = aiResponse.suggested_title;
                if (aiResponse.summary_content) summary = aiResponse.summary_content;

                if (aiResponse.finance_details?.is_finance) {
                    // Update enriched details from AI
                    aiFinanceDetails = {
                        ...aiFinanceDetails,
                        ...aiResponse.finance_details,
                        is_finance: true
                    };
                }
            }
        } catch (aiError) {
            console.error("AI Enrichment failed:", aiError);
        }

        // --- PHASE 3: FINANCE EXECUTION ---
        if (aiFinanceDetails) {
            const { action, amount, concept, category: financeCategory } = aiFinanceDetails;

            // USER WISH: Concepto carries the raw dictation
            const finalConcept = rawTextToProcess;

            // 1. Mark as Paid (Fuzzy Search)
            if (action === "mark_paid") {
                const projections = await getFinanceProjections();
                const pending = projections.filter(p => !p.status.includes("✅"));

                // Use transcription to match if concept is too generic
                const target = pending.find(p => {
                    const conceptLower = p.concept.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const dictationLower = rawTextToProcess.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return dictationLower.includes(conceptLower) || conceptLower.includes(dictationLower);
                });

                if (target) {
                    const ok = await updateFinanceStatus(target.id, "✅ Pagado", { receiptUrl, notes: summary || "Procesado por IA", title: finalConcept });
                    if (ok) return NextResponse.json({ success: true, message: `✅ Pagado: ${target.concept} ($${amount})`, action: "mark_paid" });
                }
            }

            // 2. Register in Ledger (Standard/Fallback)
            const ok = await createLedgerEntry({
                concept: finalConcept,
                amount: amount,
                category: financeCategory || "Imprevistos",
                paymentMethod: "Voz / Zenith AI",
                receiptUrl: receiptUrl,
                notes: summary || "Registrado sin resumen"
            });

            if (ok) return NextResponse.json({ success: true, message: `🧾 Registrado: ${finalConcept.substring(0, 30)}... ($${amount})`, action: "new_expense" });
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
