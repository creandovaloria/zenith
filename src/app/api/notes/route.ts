
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
        let { text, type, title, summary, category, project, receiptUrl } = body;

        if (!text) return NextResponse.json({ error: 'Missing "text" field' }, { status: 400 });

        // --- AI INTELIGENCE LAYER (Zenith Brain) ---
        let aiFinanceDetails = null;

        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: SYSTEM_PROMPT_PM },
                    { role: "user", content: `Transcripción: ${text}` }
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
                const normalizedText = text.toLowerCase();
                const hasAmount = /\d+/.test(text);
                const hasKeywords = normalizedText.includes("$") || normalizedText.includes("pesos") || normalizedText.includes("gaste") || normalizedText.includes("pague") || normalizedText.includes("compre") || normalizedText.includes("ticket");

                if (aiResponse.finance_details?.is_finance || hasKeywords || (type === "Expense" && hasAmount)) {
                    aiFinanceDetails = aiResponse.finance_details || {
                        is_finance: true,
                        amount: parseFloat(text.match(/\d+(\.\d+)?/)?.[0] || "0"),
                        concept: title || "Gasto Detectado",
                        category: "Imprevistos",
                        action: "new_expense"
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
                const target = pending.find(p => p.concept.toLowerCase().includes(concept.toLowerCase()) || concept.toLowerCase().includes(p.concept.toLowerCase()));

                if (target) {
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
                notes: summary || text
            });

            if (ok) {
                return NextResponse.json({ success: true, message: `🧾 Gasto registrado: ${concept || title} ($${amount})`, action: "new_expense" });
            } else {
                return NextResponse.json({ error: "Coda Error: No se pudo escribir en Finance_Ledger. Verifica columnas y Doc ID." }, { status: 500 });
            }
        }

        // --- Standard Note Fallback (Only if no finance detected) ---
        const success = await createNote({
            title: title || `Nota ${new Date().toLocaleDateString()}`,
            type: type || 'Idea',
            project, rawText: text, summary: summary || text, tags: "Voice"
        }, 'Personal_Inbox');

        return success
            ? NextResponse.json({ success: true, message: "Nota guardada." })
            : NextResponse.json({ error: "No se reconoció como gasto y falló el guardado como nota." }, { status: 500 });

    } catch (error) {
        console.error("API Global Error:", error);
        return NextResponse.json({ error: 'Error Interno: ' + (error as any).message }, { status: 500 });
    }
}
