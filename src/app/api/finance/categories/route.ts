import { NextResponse } from "next/server";
import { FINANCE_CATEGORIES, FINANCE_CATEGORY_NAMES } from "@/lib/prompts";

/**
 * GET /api/finance/categories
 * Devuelve lista de categorías para el menú del atajo
 */
export async function GET() {
    // Devolver versión corta y larga de cada categoría
    const categories = FINANCE_CATEGORY_NAMES.map((shortName, index) => ({
        id: index + 1,
        short: shortName,
        full: FINANCE_CATEGORIES[index],
        emoji: getEmoji(shortName)
    }));

    return NextResponse.json({
        success: true,
        count: categories.length,
        categories,
        // Lista simple para el menú de Atajos
        menuItems: categories.map(c => `${c.emoji} ${c.short}`)
    });
}

function getEmoji(category: string): string {
    const emojiMap: Record<string, string> = {
        "Infancia Plena": "👶",
        "Logística de Vida": "🏠",
        "Sistemas y suscripciones": "💻",
        "Apalancamiento": "🤝",
        "Biocombustible": "🍎",
        "Consumibles": "🧻",
        "Ocio y Estilo de vida": "🎮",
        "Expansión": "✈️",
        "Social": "🎁",
        "Imprevistos": "⚠️",
        "Movilidad": "🚗",
        "Inversión Personal Presencia": "📚",
        "Inversión Personal Visible": "👔",
        "Fondo de Libertad": "💰",
        "Donación / Legacy": "❤️"
    };
    return emojiMap[category] || "📋";
}
