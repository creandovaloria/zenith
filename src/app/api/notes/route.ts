
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

        // --- PHASE 2: AI ENRICHMENT (OPTIONAL) ---
        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: SYSTEM_PROMPT_PM },
                    { role: "user", content: `Transcripción: ${rawTextToProcess}` }
                ],
                model: "gpt-4o",
                response_format: { type: "json_object" }
            }, { timeout: 8000 });

            const aiContent = completion.choices[0].message.content;
            if (aiContent) {
                const aiResponse = JSON.parse(aiContent);
                console.log("🧠 Zenith AI Thought:", JSON.stringify(aiResponse, null, 2));

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
            console.error("AI Enrichment failed, but we have hard detection:", aiError);
        }

        // --- PHASE 3: FINANCE EXECUTION ---
        if (aiFinanceDetails) {
            const { action, amount, concept, category: financeCategory } = aiFinanceDetails;
            const finalConcept = concept && concept !== "Gasto en proceso..." ? concept : (title || "Gasto Detectado");

            // 1. Mark as Paid (Fuzzy Search)
            if (action === "mark_paid") {
                const projections = await getFinanceProjections();
                const pending = projections.filter(p => !p.status.includes("✅"));

                const searchLower = finalConcept.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const target = pending.find(p => {
                    const conceptLower = p.concept.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return conceptLower.includes(searchLower) || searchLower.includes(conceptLower) || normalizedText.includes(conceptLower);
                });

                if (target) {
                    const ok = await updateFinanceStatus(target.id, "✅ Pagado", { receiptUrl, notes: summary || rawTextToProcess, title: finalConcept });
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
                notes: summary || rawTextToProcess
            });

            if (ok) return NextResponse.json({ success: true, message: `🧾 Registrado: ${finalConcept} ($${amount})`, action: "new_expense" });
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
