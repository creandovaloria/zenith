import { NextRequest, NextResponse } from "next/server";
import { createLedgerEntry } from "@/lib/coda";
import { FINANCE_CATEGORIES } from "@/lib/prompts";
import OpenAI from "openai";

/**
 * POST /api/finance/scan-ticket
 * Escanea un ticket con IA y separa por categorías
 * 
 * Body:
 * - imageUrl: string (URL de la imagen del ticket - Dropbox/Cloudinary)
 * - confirm?: boolean (si true, guarda los items; si false/undefined, solo devuelve preview)
 * - items?: Array (si confirm=true, los items a guardar)
 */

const TICKET_PROMPT = `Eres un asistente experto en analizar tickets de compra.

Analiza la imagen del ticket y extrae TODOS los artículos con sus precios.
Clasifica cada artículo en UNA de estas categorías EXACTAS:

CATEGORÍAS DISPONIBLES:
${FINANCE_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join("\n")}

REGLAS DE CLASIFICACIÓN:
- Frutas, verduras, carnes, lácteos, comida → "Biocombustible (Alimentos, Suplementos)"
- Papel, jabón, shampoo, limpiadores, detergente → "Consumibles (Despensa, Aseo)"
- Refrescos, dulces, botanas → "Biocombustible (Alimentos, Suplementos)"
- Productos de bebé/niños → "Infancia Plena (Pensión, Colegiaturas, Kumon, Gimnasia)"
- Alcohol, cigarros → "Ocio y Estilo de vida (Diversion, salidas, experiencias)"

Responde SOLO en formato JSON:
{
    "store": "Nombre de la tienda",
    "date": "YYYY-MM-DD",
    "total": 0.00,
    "items": [
        {
            "concept": "Nombre del producto",
            "amount": 0.00,
            "category": "Categoría EXACTA de la lista",
            "quantity": 1
        }
    ],
    "summary": {
        "Biocombustible (Alimentos, Suplementos)": 0.00,
        "Consumibles (Despensa, Aseo)": 0.00
    }
}`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { imageUrl, confirm, items } = body;

        // MODO CONFIRMAR: Guardar items previamente analizados
        if (confirm && items && Array.isArray(items)) {
            const results = [];
            for (const item of items) {
                const rowId = await createLedgerEntry({
                    concept: item.concept,
                    amount: item.amount,
                    category: item.category,
                    paymentMethod: "Tarjeta",
                    notes: `Ticket escaneado - ${item.store || "Tienda"}`
                });
                results.push({ concept: item.concept, success: !!rowId });
            }

            const successCount = results.filter(r => r.success).length;
            return NextResponse.json({
                success: true,
                message: `✅ Guardados ${successCount} de ${items.length} artículos`,
                results
            });
        }

        // MODO ANALIZAR: Procesar imagen con IA
        if (!imageUrl) {
            return NextResponse.json({
                error: "Falta URL de imagen",
                hint: "Envía imageUrl con la URL de la foto del ticket"
            }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Convertir Dropbox URL a URL directa
        const directImageUrl = imageUrl
            .replace("www.dropbox.com", "dl.dropboxusercontent.com")
            .replace(/\?dl=\d+/, "")
            .replace(/&dl=\d+/, "");

        console.log("📸 Analizando ticket:", directImageUrl);

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: TICKET_PROMPT },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Analiza este ticket y extrae todos los productos con sus categorías:" },
                        { type: "image_url", image_url: { url: directImageUrl } }
                    ]
                }
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" },
            max_tokens: 2000
        }, { timeout: 30000 });

        const analysis = JSON.parse(completion.choices[0].message.content || "{}");

        console.log("🧾 Ticket analizado:", analysis);

        return NextResponse.json({
            success: true,
            message: `📊 Encontrados ${analysis.items?.length || 0} artículos`,
            analysis,
            // Para que el atajo pueda confirmar después
            confirmEndpoint: "/api/finance/scan-ticket",
            confirmBody: { confirm: true, items: analysis.items }
        });

    } catch (error: any) {
        console.error("API Scan Ticket Error:", error);
        return NextResponse.json({
            error: "Error analizando ticket",
            details: error.message
        }, { status: 500 });
    }
}
