
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
                if (aiResponse.suggested_title) title = aiResponse.suggested_title;
                if (aiResponse.final_type) type = aiResponse.final_type;
                if (aiResponse.summary_content) summary = aiResponse.summary_content;
                if (aiResponse.finance_details?.is_finance) {
                    aiFinanceDetails = aiResponse.finance_details;
                }
            }
        } catch (aiError) {
            console.error("OpenAI Error:", aiError);
        }

        // --- FINANCE LOGIC (The CFO Brain) ---
        if (aiFinanceDetails) {
            const { action, amount, concept, category: financeCategory } = aiFinanceDetails;

            if (action === "mark_paid") {
                // Smart Matcher for Projections
                const projections = await getFinanceProjections();
                const pending = projections.filter(p => p.status !== "✅ Pagado" && p.status !== "Pagado");

                // Simple search for concept in name
                const target = pending.find(p =>
                    p.concept.toLowerCase().includes(concept.toLowerCase()) ||
                    concept.toLowerCase().includes(p.concept.toLowerCase())
                );

                if (target) {
                    console.log(`🎯 Smart Match Found: ${target.concept}. Updating in Coda...`);
                    await updateFinanceStatus(target.id, "✅ Pagado", { receiptUrl, notes: summary, title });
                    return NextResponse.json({
                        success: true,
                        message: `Marcado como pagado: ${target.concept}`,
                        action: "mark_paid"
                    });
                } else {
                    console.log("⚠️ No pending projection match found. Falling back to Ledger.");
                    // If no projection found, treat as new variable expense
                }
            }

            // Create Ledger Entry for any expense or failed mark_paid
            if (action === "new_expense" || action === "mark_paid") {
                console.log(`🧾 Creating Ledger Entry: ${concept} ($${amount})`);
                await createLedgerEntry({
                    concept: concept || title,
                    amount: amount,
                    category: financeCategory,
                    paymentMethod: "Voz / Zenith AI",
                    receiptUrl: receiptUrl,
                    notes: summary
                });

                return NextResponse.json({
                    success: true,
                    message: `Gasto registrado en Ledger: ${concept}`,
                    action: "new_expense"
                });
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
