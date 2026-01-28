
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

        if (!text) {
            return NextResponse.json({ error: 'Missing "text" field' }, { status: 400 });
        }

        // --- AI INTELIGENCE LAYER (Zenith Brain) ---
        let aiFinanceDetails = null;

        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: SYSTEM_PROMPT_PM },
                    { role: "user", content: `Analiza esta Transcripción: ${text}` }
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

                // Force finance if keywords are present even if AI is unsure
                const lowerText = text.toLowerCase();
                const hasFinanceKeywords = lowerText.includes("$") || lowerText.includes("pesos") || lowerText.includes("gaste") || lowerText.includes("pague");

                if (aiResponse.finance_details?.is_finance || hasFinanceKeywords) {
                    aiFinanceDetails = aiResponse.finance_details || {
                        is_finance: true,
                        amount: parseFloat(text.match(/\d+/)?.[0] || "0"),
                        concept: title || "Gasto detectado",
                        category: "Imprevistos",
                        action: "new_expense"
                    };
                }
            }
        } catch (aiError) {
            console.error("OpenAI Error:", aiError);
        }

        // --- FINANCE LOGIC (The CFO Brain) ---
        if (aiFinanceDetails) {
            const { action, amount, concept, category: financeCategory } = aiFinanceDetails;

            if (action === "mark_paid") {
                const projections = await getFinanceProjections();
                const pending = projections.filter(p => p.status !== "✅ Pagado" && p.status !== "Pagado");

                const target = pending.find(p =>
                    p.concept.toLowerCase().includes(concept.toLowerCase()) ||
                    concept.toLowerCase().includes(p.concept.toLowerCase())
                );

                if (target) {
                    console.log(`🎯 Smart Match Found: ${target.concept}. Updating in Coda...`);
                    const ok = await updateFinanceStatus(target.id, "✅ Pagado", { receiptUrl, notes: summary, title });
                    if (ok) {
                        return NextResponse.json({
                            success: true,
                            message: `✅ Marcado como pagado: ${target.concept}`,
                            action: "mark_paid"
                        });
                    }
                }
            }

            // Create Ledger Entry
            console.log(`🧾 Creating Ledger Entry: ${concept} ($${amount})`);
            const ok = await createLedgerEntry({
                concept: concept || title,
                amount: amount,
                category: financeCategory || "Imprevistos",
                paymentMethod: "Voz / Zenith AI",
                receiptUrl: receiptUrl,
                notes: summary
            });

            if (ok) {
                return NextResponse.json({
                    success: true,
                    message: `🧾 Gasto registrado en Ledger: ${concept} ($${amount})`,
                    action: "new_expense"
                });
            } else {
                return NextResponse.json({
                    error: "Coda Reject: Verifica que el Doc ID y el Token sean correctos y que las columnas existan."
                }, { status: 500 });
            }
        }

        // --- Standard Note Logic (Fallback) ---
        const noteType = type || 'Meeting';
        const noteTitle = title || `Nota - ${new Date().toLocaleDateString()}`;
        const noteSummary = summary || text.substring(0, 100);

        const newNote: NoteData = {
            title: noteTitle,
            type: noteType,
            project: project,
            rawText: text,
            summary: noteSummary,
            tags: "Voice Upload"
        };

        const success = await createNote(newNote, 'Personal_Inbox');

        if (success) {
            return NextResponse.json({ success: true, message: `Nota guardada como '${noteTitle}'` });
        } else {
            return NextResponse.json({ error: 'Failed to save to Coda' }, { status: 500 });
        }

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
