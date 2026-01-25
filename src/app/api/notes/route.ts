import { NextResponse } from 'next/server';
import { createNote, NoteData } from '@/lib/coda';
import OpenAI from 'openai';
import { SYSTEM_PROMPT_PM } from '@/lib/prompts';



export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { text, type, title, summary, category, project } = body;

        // Basic Validation
        if (!text) {
            return NextResponse.json({ error: 'Missing "text" field' }, { status: 400 });
        }

        // --- AI INTELIGENCE LAYER (Zenith Brain) ---
        // If the shortcut sends raw text without a proper summary, we generate it here.
        const needsAI = !summary || summary === "Pending AI Summary..." || summary === "Respuesta" || summary === "ResumenIA" || summary === "";

        if (needsAI) {
            console.log("Invoking Zenith Brain for analysis...");
            try {
                // Formatting Date for the Title
                const today = new Date();
                const dateStr = today.getFullYear().toString().slice(-2) +
                    (today.getMonth() + 1).toString().padStart(2, '0') +
                    today.getDate().toString().padStart(2, '0'); // YYMMDD

                const openai = new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY,
                });

                const completion = await openai.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: SYSTEM_PROMPT_PM
                        },
                        {
                            role: "user",
                            content: `Contexto: ${category || 'General'} / Proyecto: ${project || 'N/A'} / Tipo Manual: ${type || 'Definir'}
                            
                            Analiza esta Transcripción:
                            ${text.substring(0, 10000)}`
                        }
                    ],
                    model: "gpt-4o",
                    response_format: { type: "json_object" },
                });

                const aiContent = completion.choices[0].message.content;
                if (aiContent) {
                    const aiResponse = JSON.parse(aiContent);

                    // Update fields with AI wisdom
                    if (aiResponse.suggested_title) title = aiResponse.suggested_title;
                    if (aiResponse.final_type) type = aiResponse.final_type;
                    if (aiResponse.summary_content) summary = aiResponse.summary_content;

                    // New: Handle Financial Data
                    if (aiResponse.finance_details && aiResponse.finance_details.amount > 0) {
                        // It's a financial transaction!
                        // We will append this data to the JSON body so we can pass it to Coda
                        body.finance = aiResponse.finance_details;
                    }
                }

            } catch (aiError) {
                console.error("OpenAI Error:", aiError);
                summary = "Error en análisis IA. Texto crudo guardado.";
            }
        }
        // -------------------------------------------

        // Defaults Handling
        const noteType = type || 'Meeting';
        const noteTitle = title || `Nota - ${new Date().toLocaleDateString()}`;
        const noteSummary = summary || "Sin resumen";

        // Determine Table Name & Doc based on Category
        let tableName = 'Personal_Inbox';
        let docId = undefined;
        let apiToken = undefined;

        const spanishMapping = {
            "Title": "Título nota",
            "Type": "Tipo evento",
            "Project": "Proyecto linked",
            "Raw Text": "Transcripción completa original",
            "Summary": "Resumen estrategico por ia",
            "Tags": "Etiquetas",
            "Date": "Fecha y hora de creación automatica"
        };
        let columnMapping = spanishMapping;

        if (category === 'Business') {
            tableName = 'business_inbox';
            if (process.env.CODA_DOC_ID_BUSINESS) docId = process.env.CODA_DOC_ID_BUSINESS;
            if (process.env.CODA_API_TOKEN_BUSINESS) apiToken = process.env.CODA_API_TOKEN_BUSINESS;
        } else {
            tableName = 'Personal_Inbox'; // Update this if your personal table name is different
            if (process.env.CODA_DOC_ID_PERSONAL) docId = process.env.CODA_DOC_ID_PERSONAL;
        }

        const newNote: NoteData = {
            title: noteTitle,
            type: noteType,
            project: project,
            rawText: text,
            summary: noteSummary,
            tags: "Mobile Upload"
        };

        const success = await createNote(newNote, tableName, docId, apiToken, columnMapping);

        if (success) {
            return NextResponse.json({ success: true, message: `Note saved to ${tableName} as '${noteTitle}'` });
        } else {
            return NextResponse.json({ error: 'Failed to save to Coda' }, { status: 500 });
        }

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
