
// Puedes editar esta lista para agregar nuevos tipos de eventos
export const VALID_TYPES = [
    "Meeting (Reuniones normales)",
    "Webinar (Clases/Eventos online)",
    "Idea (Chispazos creativos)",
    "Workshop (Trabajo colaborativo/Taller)",
    "Interview (Entrevistas/1 a 1)",
    "Journal (Personal/Diario)",
    "Expense (Gasto/Compra)",
    "Payment (Pago de Obligación/Deuda)",
    "Other"
];

// Lista Maestra de Categorías para Finanzas (Zenith OS 2026 - Final Sync)
export const FINANCE_CATEGORIES = [
    "Infancia Plena (Pensión, Colegiaturas, Kumon, Gimnasia)",
    "Logística de Vida (Renta, Hipote-ca, Luz, Agua, Préstamos, Internet, Celular)",
    "Sistemas y suscripciones (IA, Operatividad Digital)",
    "Apalancamiento (Asistentes, Limpieza, servicios que ahorran tiempo)",
    "Biocombustible (Alimentos, Suplementos)",
    "Consumibles (Despensa, Aseo)",
    "Ocio y Estilo de vida (Diversion, salidas, experiencias)",
    "Expansión (Viajes, actividades fuera de lo cotidiano)",
    "Social (Regalos para compromisos, eventos)",
    "Imprevistos (Emergencias, reparaciones)",
    "Movilidad (Gasolina, Uber, Mantenimiento del auto)",
    "Inversión Personal Presencia (Cursos, Mentoría, Salud)",
    "Inversión Personal Visible (Ropa, estética)",
    "Fondo de Libertad (Ahorro, Inversión Patrimonial, págate a ti mismo primero)",
    "Donación / Legacy (Filantropía, apoyo a otros, impacto externo)"
];

export const FINANCE_CATEGORY_NAMES = [
    "Infancia Plena",
    "Logística de Vida",
    "Sistemas y suscripciones",
    "Apalancamiento",
    "Biocombustible",
    "Consumibles",
    "Ocio y Estilo de vida",
    "Expansión",
    "Social",
    "Imprevistos",
    "Movilidad",
    "Inversión Personal Presencia",
    "Inversión Personal Visible",
    "Fondo de Libertad",
    "Donación / Legacy"
];

export const SYSTEM_PROMPT_PM = `Actúa como un Project Manager y CFO Estratega (Zenith).
Tu objetivo es analizar transcripciones para extraer valor financiero o notas de negocio.

CRÍTICO: Si el texto contiene números (como "$350", "200 pesos") o palabras como "compré", "gasté", "pagué", "pago", "registrar pago", "compra", "ticket", "depósito", "invertí", DEBES marcar 'is_finance': true.

Responde SOLAMENTE en formato JSON:
{
    "suggested_title": "Título corto",
    "final_type": "Expense" (Si es un gasto) o "Meeting, Webinar, Idea, Workshop, Interview, Journal, Payment, Other",
    "summary_content": "Resumen limpio",
    "finance_details": {
        "is_finance": true,
        "amount": monto numérico,
        "concept": "Nombre corto del gasto",
        "category": "ELEGIR UNA DE ESTA LISTA EXACTA: ${FINANCE_CATEGORY_NAMES.join(' | ')}",
        "action": "mark_paid" (CONFIRMACIÓN DE PAGO FIJO como Renta, Colegiatura, Internet, Servicios) o "new_expense" (COMPRA VARIABLE como Super, Comida, Tacos, Café, Gasolina),
        "is_business": true/false
    }
}

GUÍA DE CATEGORÍAS:
- Infancia Plena: Colegio, Kumon, Niños.
- Logística de Vida: Renta, hipoteca, agua, luz, internet, celular, préstamos.
- Biocombustible: Comida, suplementos, restaurante.
- Consumibles: Súper, despensa, artículos de aseo.
- Movilidad: Gasolina, Uber, taller.
- Inversión Personal: Cursos, salud, ropa.
`;
