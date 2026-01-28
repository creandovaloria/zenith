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
        const fixedKeywords = ["renta", "pago", "colegiatura", "celular", "internet", "luz", "agua", "gas", "netflix", "spotify", "suscripcion", "pension", "hipoteca"];
        const isFixed = fixedKeywords.some(keyword => normalizedText.includes(keyword));

        let aiDetails: any = {
            amount: parseFloat(rawTextToProcess.replace(/,/g, '').match(/\d+(\.\d+)?/)?.[0] || "0"),
            summary: "Procesado sin resumen IA",
            category: "Imprevistos (Emergencias, reparaciones)", // Full Coda Name
            isFixed: isFixed
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

            // Aliases/sinónimos para conceptos comunes de gastos fijos
            const conceptAliases: Record<string, string[]> = {
                "celular": ["celular", "telefono", "tel", "movil", "telcel", "att", "at&t", "movistar"],
                "internet": ["internet", "izzi", "telmex", "totalplay", "megacable", "wifi"],
                "luz": ["luz", "cfe", "electrica", "electricidad"],
                "agua": ["agua", "sapal", "aguascalientes", "hidraulico"],
                "gas": ["gas", "natural", "lp"],
                "renta": ["renta", "alquiler", "arrendamiento"],
                "hipoteca": ["hipoteca", "credito hipotecario", "infonavit", "fovissste"],
                "colegiatura": ["colegiatura", "colegio", "escuela", "mensualidad escolar"],
                "pension": ["pension", "alimenticia"],
                "kumon": ["kumon"],
                "gimnasia": ["gimnasia", "gym", "gimnasio"]
            };

            // Palabras comunes a ignorar en el matching
            const stopWords = ["pago", "pague", "pagar", "registrar", "de", "el", "la", "los", "las", "un", "una", "del", "al", "ya", "hoy", "ayer", "por"];

            // Extraer palabras clave significativas del dictado
            const dictationWords = normalizedDictation.split(/\s+/).filter(word =>
                word.length > 2 && !stopWords.includes(word)
            );

            console.log(`🔍 [MATCHING] Dictado: "${normalizedDictation}"`);
            console.log(`🔍 [MATCHING] Palabras clave: [${dictationWords.join(", ")}]`);
            console.log(`🔍 [MATCHING] Proyecciones pendientes: ${projections.filter(p => !p.status.includes("✅")).length}`);

            // Buscar qué alias matchea el dictado
            let matchedAliasKey: string | null = null;
            for (const [key, aliases] of Object.entries(conceptAliases)) {
                if (aliases.some(alias => normalizedDictation.includes(alias) || dictationWords.includes(alias))) {
                    matchedAliasKey = key;
                    console.log(`🔍 [MATCHING] Alias detectado: "${key}" (via aliases)`);
                    break;
                }
            }

            // Función para calcular score de coincidencia
            const calculateMatchScore = (concept: string): number => {
                const normalizedConcept = normalize(concept);
                const conceptWords = normalizedConcept.split(/\s+/);
                let score = 0;

                // Match exacto = 100 puntos
                if (normalizedDictation.includes(normalizedConcept) || normalizedConcept.includes(normalizedDictation)) {
                    score += 100;
                }

                // Match por palabras clave = 10 puntos por palabra
                for (const word of dictationWords) {
                    if (normalizedConcept.includes(word)) score += 10;
                }
                for (const cWord of conceptWords) {
                    if (dictationWords.includes(cWord)) score += 10;
                }

                // Match por alias = 50 puntos
                if (matchedAliasKey) {
                    const aliases = conceptAliases[matchedAliasKey];
                    if (aliases.some(alias => normalizedConcept.includes(alias))) {
                        score += 50;
                    }
                }

                return score;
            };

            // Filtrar proyecciones pendientes y calcular scores
            const today = new Date();
            const pendingProjections = projections
                .filter(p => !p.status.includes("✅"))
                .map(p => ({
                    ...p,
                    score: calculateMatchScore(p.concept),
                    daysFromToday: Math.abs(Math.floor((new Date(p.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
                }))
                .filter(p => p.score > 0) // Solo proyecciones con algún match
                .sort((a, b) => {
                    // Primero por score (mayor es mejor), luego por cercanía a hoy
                    if (b.score !== a.score) return b.score - a.score;
                    return a.daysFromToday - b.daysFromToday;
                });

            console.log(`🔍 [MATCHING] Candidatos con score > 0:`);
            pendingProjections.slice(0, 5).forEach(p => {
                console.log(`   - "${p.concept}" (Score: ${p.score}, Días: ${p.daysFromToday})`);
            });

            const target = pendingProjections[0]; // Mejor match

            if (target) {
                console.log(`✅ [MATCHING] Target encontrado: "${target.concept}" (ID: ${target.id})`);
                success = await updateFinanceStatus(target.id, "✅ Pagado", {
                    receiptUrl,
                    notes: aiDetails.summary,
                    title: rawTextToProcess.substring(0, 100)
                });
                message = `✅ Pagado: ${target.concept}`;
            } else {
                console.log(`❌ [MATCHING] No se encontró proyección coincidente para: "${normalizedDictation}"`);
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
