
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
        let aiFinanceDetails = null;

        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: SYSTEM_PROMPT_PM },
                    { role: "user", content: `Transcripción: ${rawTextToProcess}` }
                ],
                model: "gpt-4o",
                response_format: { type: "json_object" },
            });

            const aiContent = completion.choices[0].message.content;
            if (aiContent) {
                const aiResponse = JSON.parse(aiContent);
                console.log("🧠 Zenith AI Thought:", JSON.stringify(aiResponse, null, 2));

                if (aiResponse.suggested_title) title = aiResponse.suggested_title;
                if (aiResponse.final_type) type = aiResponse.final_type;
                if (aiResponse.summary_content) summary = aiResponse.summary_content;

                // --- SUPER FORCE FINANCE DETECTION ---
                const normalizedText = rawTextToProcess.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const hasAmount = /\d+/.test(rawTextToProcess);
                const financialKeywords = ["$", "pesos", "gaste", "pague", "compre", "ticket", "pago", "compra", "registrar", "renta", "colegiatura", "pension"];
                const hasKeywords = financialKeywords.some(k => normalizedText.includes(k));

                if (aiResponse.finance_details?.is_finance || hasKeywords || hasAmount) {
                    // Cleaner number extraction (handles 12,000 -> 12000)
                    const rawAmount = rawTextToProcess.replace(/,/g, '').match(/\d+(\.\d+)?/)?.[0] || "0";

                    aiFinanceDetails = aiResponse.finance_details || {
                        is_finance: true,
                        amount: parseFloat(rawAmount),
                        concept: title || "Gasto Detectado",
                        category: "Logística de Vida", // Default to Life Logistics if it's renta/pago
                        action: normalizedText.includes("renta") || normalizedText.includes("pago") ? "mark_paid" : "new_expense"
                    };
                }
            }
        } catch (aiError) {
            console.error("AI Error:", aiError);
        }

        // --- FINANCE LOGIC ---
        if (aiFinanceDetails) {
            const { action, amount, concept, category: financeCategory } = aiFinanceDetails;

            // 1. Try to Mark as Paid (Projections)
            if (action === "mark_paid") {
                const projections = await getFinanceProjections();
                const pending = projections.filter(p => !p.status.includes("✅"));

                // ULTRA FUZZY MATCH
                const searchLower = concept.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const target = pending.find(p => {
                    const conceptLower = p.concept.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return conceptLower.includes(searchLower) || searchLower.includes(conceptLower);
                });

                if (target) {
                    console.log(`🎯 Ultra-Match: ${target.concept}`);
                    const success = await updateFinanceStatus(target.id, "✅ Pagado", { receiptUrl, notes: summary, title });
                    if (success) return NextResponse.json({ success: true, message: `✅ Pagado: ${target.concept}`, action: "mark_paid" });
                }
            }

            // 2. Register in Ledger (Standard/Fallback)
            const ok = await createLedgerEntry({
                concept: concept || title || "Gasto",
                amount: amount,
                category: financeCategory || "Imprevistos",
                paymentMethod: "Voz / Zenith AI",
                receiptUrl: receiptUrl,
                notes: summary || rawTextToProcess
            });

            if (ok) {
                return NextResponse.json({ success: true, message: `🧾 Gasto registrado: ${concept || title} ($${amount})`, action: "new_expense" });
            } else {
                return NextResponse.json({ error: "Coda Error: No se pudo escribir en Finance_Ledger. Verifica columnas y Doc ID." }, { status: 500 });
            }
        }

        // --- Fallback if no finance detected ---
        return NextResponse.json({
            success: false,
            message: `⚠️ Zenith no detectó esto como un gasto. ¿Olvidaste mencionar el monto? Recibí: "${rawTextToProcess}"`,
            action: "none"
        }, { status: 200 }); // Return 200 so Shortcut doesn't crash

    } catch (error) {
        console.error("API Global Error:", error);
        return NextResponse.json({ error: 'Error Interno: ' + (error as any).message }, { status: 500 });
    }
}
