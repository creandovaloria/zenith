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
                hint: "Asegúrate de que el Atajo pase la variable 'Texto transcrito'."
            }, { status: 400 });
        }

        // --- STEP 1: FAST DETECTION ---
        const normalizedText = rawTextToProcess.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const hasAmount = /\d+/.test(rawTextToProcess);
        const financialKeywords = ["$", "pesos", "gaste", "pague", "compre", "ticket", "pago", "compra", "registrar", "renta", "colegiatura", "pension"];
        const isFinanceDetection = hasAmount || financialKeywords.some(k => normalizedText.includes(k));

        if (!isFinanceDetection) {
            return NextResponse.json({ success: false, message: "⚠️ No detectado como gasto." });
        }

        // --- STEP 2: AI ENRICHMENT (SYNC) ---
        let aiDetails: any = {
            amount: parseFloat(rawTextToProcess.replace(/,/g, '').match(/\d+(\.\d+)?/)?.[0] || "0"),
            summary: "Procesado sin resumen IA",
            category: "Imprevistos (Emergencias, reparaciones)", // Full Coda Name
            isFixed: normalizedText.includes("renta") || normalizedText.includes("pago") || normalizedText.includes("colegiatura")
        };

        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const userContent: any[] = [{ type: "text", text: `Analiza: "${rawTextToProcess}".` }];
            if (receiptUrl) {
                // The cleanest way to get a direct image from Dropbox for AI Vision
                const directImageUrl = receiptUrl
                    .replace("www.dropbox.com", "dl.dropboxusercontent.com")
                    .replace(/\?dl=\d+/, "")
                    .replace(/&dl=\d+/, "");

                userContent.push({ type: "image_url", image_url: { url: directImageUrl } });
            }

            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: SYSTEM_PROMPT_PM },
                    { role: "user", content: userContent }
                ],
                model: receiptUrl ? "gpt-4o" : "gpt-4o-mini",
                response_format: { type: "json_object" }
            }, { timeout: receiptUrl ? 20000 : 10000 });

            const aiRes = JSON.parse(completion.choices[0].message.content || "{}");
            aiDetails.summary = aiRes.summary_content || aiDetails.summary;

            if (aiRes.finance_details) {
                if (aiRes.finance_details.amount) aiDetails.amount = aiRes.finance_details.amount;
                if (aiRes.finance_details.category) aiDetails.category = aiRes.finance_details.category;
            }
        } catch (e: any) {
            console.error("AI Error (Falling back to raw data):", e);
            aiDetails.summary = `⚠️ Error IA: ${e.message || 'Fallo de conexión'}. | Dictado original: ${rawTextToProcess}`;
        }

        // --- STEP 3: SINGLE CODA RECORD ---
        const finalConcept = rawTextToProcess.substring(0, 100);
        let success = false;
        let message = "";

        if (aiDetails.isFixed) {
            const projections = await getFinanceProjections();
            const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const normalizedDictation = normalize(rawTextToProcess);

            const target = projections.find(p => {
                if (p.status.includes("✅")) return false;
                const concept = normalize(p.concept);
                return normalizedDictation.includes(concept) || concept.includes(normalizedDictation);
            });

            if (target) {
                success = await updateFinanceStatus(target.id, "✅ Pagado", {
                    receiptUrl,
                    notes: aiDetails.summary,
                    title: rawTextToProcess.substring(0, 100)
                });
                message = `✅ Pagado: ${target.concept}`;
            }
        }

        if (!success) {
            const rowId = await createLedgerEntry({
                concept: finalConcept,
                amount: aiDetails.amount,
                category: aiDetails.category,
                paymentMethod: "Voz / Zenith AI",
                receiptUrl,
                notes: aiDetails.summary
            });
            success = !!rowId;
            message = `🧾 Registrado: ${finalConcept.substring(0, 20)}... ($${aiDetails.amount})`;
        }

        return NextResponse.json({ success, message: success ? message : "❌ Error en Coda" });

    } catch (error) {
        console.error("Critical API Error:", error);
        return NextResponse.json({ error: 'Error Interno' }, { status: 500 });
    }
}
