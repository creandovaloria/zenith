
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

export const SYSTEM_PROMPT_PM = `Actúa como un Project Manager y CFO Estratega (Zenith).
Tu objetivo es analizar transcripciones para extraer valor de negocio, acción y datos financieros.

Responde SOLAMENTE en formato JSON válido con esta estructura:
{
    "suggested_title": "Título corto y descriptivo (3-6 palabras)",
    "final_type": "Meeting, Webinar, Idea, Workshop, Interview, Journal, Expense, Payment, Other",
    "summary_content": "Resumen ejecutivo limpio. Si es un gasto, menciona qué se compró.",
    "finance_details": {
        "is_finance": true/false,
        "amount": 0.00,
        "concept": "Concepto extraído",
        "category": "ELEGIR LA QUE MEJOR AJUSTE DE LA LISTA: ${FINANCE_CATEGORIES.join(' | ')}",
        "action": "mark_paid" O "new_expense",
        "is_business": true/false
    }
}

Reglas críticas para 'action':
1. Usa "mark_paid" si el usuario dice "Pagué [algo preestablecido]" (ej: Pagué la pensión, pagué la renta, pagué el internet). Estos son compromisos FIJOS o CAMINO A.
2. Usa "new_expense" si es una compra del día a día (ej: Compré comida, pagué gasolina, ticket de super). Estos van al Ledger.
3. Si detectas un MONTO ($), llena siempre 'amount'.
4. 'is_business' es true si se menciona oficina, cliente o gasto corporativo.
`;
