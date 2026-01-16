
import { NextResponse } from 'next/server';
import { createNote, NoteData } from '@/lib/coda';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { text, type, title, summary, category, project } = body;

        if (!text) {
            return NextResponse.json({ error: 'Missing "text" field' }, { status: 400 });
        }

        // Default Values
        const noteType = type || 'Meeting';
        const noteTitle = title || `Note - ${new Date().toLocaleDateString()}`;

        // If the user sends a pre-calculated summary (e.g. from Perplexity via the Shortcut), use it.
        // Otherwise, use the text itself or a placeholder.
        const noteSummary = summary || "Pending AI Summary...";





        // Determine Table Name & Doc based on Category
        // Categories: 'Business', 'Personal' (Default: Personal)
        let tableName = 'Personal_Inbox';
        let docId = undefined;
        let apiToken = undefined;

        // Spanish Column Mapping (Used for both Business and Personal now)
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
            tableName = 'business_inbox'; // Lowercase as per user's table

            // Option to use a separate Doc for Business
            if (process.env.CODA_DOC_ID_BUSINESS) {
                docId = process.env.CODA_DOC_ID_BUSINESS;
            }
            // Option to use a separate Token for Business (different user)
            if (process.env.CODA_API_TOKEN_BUSINESS) {
                apiToken = process.env.CODA_API_TOKEN_BUSINESS;
            }
        } else {
            // Personal
            tableName = 'Personal_Inbox'; // Matches image

            // Option to use a separate Doc for Personal (Second Brain)
            if (process.env.CODA_DOC_ID_PERSONAL) {
                docId = process.env.CODA_DOC_ID_PERSONAL;
            }
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
            return NextResponse.json({ success: true, message: `Note saved to ${tableName}` });
        } else {
            return NextResponse.json({ error: 'Failed to save to Coda' }, { status: 500 });
        }

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
