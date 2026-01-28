
const CODA_API_TOKEN = process.env.CODA_API_TOKEN;
const CODA_DOC_ID = process.env.CODA_DOC_ID; // Notes Inbox
const CODA_DOC_ID_PERSONAL_FINANCE = process.env.CODA_DOC_ID_PERSONAL_FINANCE; // Financial Projection Doc

// Define the shape of our Biometrics data
export interface BiometricsData {
    date: string;
    hrv: number;
    sleepSeconds: number;
    sleepHours: number;
}

// Helper to safely parse numbers that might come as strings with commas (e.g. "60,000")
const safeNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        // Handle duration strings like "29 days" or "1 day"
        if (val.includes('day')) {
            const days = parseInt(val);
            return isNaN(days) ? 0 : days;
        }
        // Handle currency strings like "$123.00", remove '$' and ','
        const clean = val.replace(/[$,]/g, '').trim();
        const num = Number(clean);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

export async function getLatestBiometrics(): Promise<BiometricsData | null> {
    if (!CODA_API_TOKEN || !CODA_DOC_ID) {
        console.error("Missing Coda Env Variables");
        return null;
    }

    try {
        // 1. Fetch rows from the 'Biometrics' table
        // We limit to 1 row/page but we need to ensure we get the *latest*. 
        // Coda returns rows in order. Usually appending creates new rows at the end.
        // We can use query parameters to sort if needed, but for now let's just fetch recent ones.
        const tableName = "Biometrics";
        // We use useColumnNames=true to access values by their header name instead of ID
        const url = `https://coda.io/apis/v1/docs/${CODA_DOC_ID}/tables/${tableName}/rows?useColumnNames=true&limit=5`;

        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${CODA_API_TOKEN}`,
            },
            // Cache for 10 minutes so we don't hit Coda too hard, but see updates reasonably fast
            next: { revalidate: 600 },
        });

        if (!res.ok) {
            console.error("Failed to fetch Coda data:", res.status, res.statusText);
            return null;
        }

        const data = await res.json();
        const rows = data.items;

        if (!rows || rows.length === 0) {
            return null;
        }

        // 2. Find the most recent row that actually has data (HRV is not empty)
        // We reverse the array to search from newest to oldest
        const validRows = rows.slice().reverse().filter((r: any) => r.values && (r.values["HRV"] || r.values["hrv"]));

        if (validRows.length === 0) {
            console.log("No valid rows found (all empty)");
            return null;
        }

        const latestRow = validRows[0];
        const values = latestRow.values;

        // DEBUG: Print what we got from Coda to server terminal
        console.log("--- CODA DEBUG ---");
        console.log("Raw Row Values:", JSON.stringify(values, null, 2));
        console.log("------------------");


        // 3. Map Coda columns to our interface
        return {
            date: values["Date"] || new Date().toISOString(),
            hrv: safeNumber(values["HRV"]),
            sleepSeconds: safeNumber(values["Sleep_Seconds"]),
            sleepHours: safeNumber(values["Sleep_Hours"]),
        };

    } catch (error) {
        console.error("Error fetching biometrics:", error);
        return null;
    }
}

// --- Notes Integration ---


export interface NoteData {
    title: string;
    type: string;
    rawText: string;
    summary: string;
    project?: string; // New Project field
    tags?: string;
    url?: string; // e.g. Perplexity link if available
    image_url?: string; // New field for Dropbox/Cloudinary link
    finance?: { // New field for Financial Transactions
        amount: number;
        currency: string;
        concept: string;
        category: string;
        is_business: boolean;
        is_finance: boolean;
    };
}


export async function createNote(
    note: NoteData,
    table: string = "Notes_Inbox",
    targetDocId?: string,
    targetApiToken?: string,
    columnMapping?: Record<string, string>
): Promise<boolean> {
    const docId = targetDocId || CODA_DOC_ID;
    const token = targetApiToken || CODA_API_TOKEN;

    if (!token || !docId) {
        console.error("Missing Coda Env Variables");
        return false;
    }

    // --- LOGIC: REROUTE TO FINANCE TABLE IF IT IS A GASTO ---
    if (note.finance && note.finance.is_finance) {
        // Use Finance Projection Doc ID if available, otherwise fallback to the passed docId
        const targetFinanceDoc = CODA_DOC_ID_PERSONAL_FINANCE || docId;
        const financeTable = "Finance_Projection";
        const financeUrl = `https://coda.io/apis/v1/docs/${targetFinanceDoc}/tables/${financeTable}/rows`;

        // Payload for Finance
        const financePayload = {
            rows: [ // Array of rows
                {
                    cells: [
                        { column: "Concepto", value: note.finance.concept || note.title },
                        { column: "Monto", value: note.finance.amount },
                        { column: "Categoría", value: note.finance.category },
                        { column: "Fecha de Pago", value: new Date().toLocaleDateString('en-CA') }, // YYYY-MM-DD
                        { column: "Estado", value: "✅ Pagado" }, // Auto-mark as paid
                        { column: "Comprobante", value: note.image_url || "" }, // Link to Dropbox
                        { column: "Notas", value: note.summary || note.rawText || "" }
                    ]
                }
            ]
        };

        try {
            console.log(`💸 Routing Financial Note to Table: ${financeTable}`);
            const res = await fetch(financeUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(financePayload),
            });

            if (!res.ok) {
                const errText = await res.text();
                // If Finance table doesn't exist, we fallback to normal Note creation
                console.error(`Failed to save to Finance Table: ${res.status} - ${errText}. Falling back to Note.`);
            } else {
                console.log("✅ Finance Row Created Successfully!");
                return true; // Stop here, don't create a duplicate Note
            }
        } catch (e) {
            console.error("Error creating Finance Row:", e);
        }
    }
    // -------------------------------------------------------

    // Default Mapping (English)
    const map = {
        "Title": "Title",
        "Type": "Type",
        "Project": "Project",
        "Raw Text": "Raw Text",
        "Summary": "Summary",
        "Tags": "Tags",
        "Date": "Date",
        ...columnMapping // Override with custom mapping if provided
    };

    try {
        const url = `https://coda.io/apis/v1/docs/${docId}/tables/${table}/rows`;

        const payload = {
            rows: [
                {
                    cells: [
                        { column: map["Title"], value: note.title },
                        { column: map["Type"], value: note.type },
                        { column: map["Project"], value: note.project || "" },
                        { column: map["Raw Text"], value: note.rawText },
                        { column: map["Summary"], value: note.summary },
                        { column: map["Tags"], value: note.tags || "" },
                        { column: map["Date"], value: new Date().toISOString() } // Auto-add date
                    ]
                }
            ]
        };


        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Failed to create note in Coda table '${table}' (Doc: ${docId}, Token: ...${token.slice(-4)}):`, res.status, errorText);
            return false;
        }

        console.log(`Successfully created note in Coda table '${table}' (Doc: ${docId})`);
        return true;




    } catch (error) {
        console.error("Error creating note:", error);
        return false;
    }
}

// --- Subscriptions System ---

export interface Subscription {
    id: string; // Row ID
    name: string;
    status: string; // 'Trial Activo', 'Activa', etc.
    action: string;
    renewalDate: string | null; // ISO Date String
    daysRemaining: number;
    alert: boolean;
    cost: number;
    email: string;
    paymentMethod: string;
    notes: string;
}

export async function getSubscriptions(tableName: string, docId?: string, apiToken?: string): Promise<Subscription[]> {
    const targetDocId = docId || process.env.CODA_DOC_ID_SUBSCRIPTIONS || process.env.CODA_DOC_ID_BUSINESS_SUBSCRIPTIONS || process.env.CODA_DOC_ID;
    const token = apiToken || CODA_API_TOKEN;

    if (!token || !targetDocId) {
        console.error("Missing Coda Env Variables for Subscriptions");
        return [];
    }

    try {
        const url = `https://coda.io/apis/v1/docs/${targetDocId}/tables/${tableName}/rows?useColumnNames=true&limit=100`;

        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            next: { revalidate: 0 }, // Always fetch fresh
        });

        if (!res.ok) {
            console.error(`Failed to fetch subscriptions from table '${tableName}':`, res.status, res.statusText);
            return [];
        }

        const data = await res.json();
        const rows = data.items;

        if (!rows || rows.length === 0) return [];

        return rows.map((row: any) => {
            const val = row.values;
            // Helper to get value ignoring accents/case if possible, but for now strict mapping based on user plan
            return {
                id: row.id,
                name: val["Suscripción"] || "Unknown",
                status: val["Estado"] || "",
                action: val["Acción"] || "",
                renewalDate: val["Renovación"] ? val["Renovación"] : null, // Coda API usually returns ISO strings for dates
                daysRemaining: safeNumber(val["Dias Restantes"] || val["Días Restantes"]),
                alert: val["Alertar"] === true,
                cost: safeNumber(val["Costo (MXN)"] || val["Costo"]),
                email: val["Email"] || "",
                paymentMethod: val["Método de Pago"] || "",
                notes: val["Notas"] || ""
            };
        });

    } catch (error) {
        console.error("Error fetching subscriptions:", error);
        return [];
    }
}

export interface FinanceItem {
    id: string;
    concept: string;
    date: string; // ISO
    amount: number;
    status: string; // '⏳ Pendiente', '✅ Pagado', '❌ Vencido'
    receipt: string;
    category?: string;
}

export async function getFinanceProjections(docId?: string, apiToken?: string): Promise<FinanceItem[]> {
    // Priority: Argument > Finance Core > Personal Subs > Business Subs > Personal Finance (Legacy) > Notes
    const targetDocId = docId || process.env.CODA_DOC_ID_FINANCE_CORE || process.env.CODA_DOC_ID_SUBSCRIPTIONS || process.env.CODA_DOC_ID_BUSINESS_SUBSCRIPTIONS || process.env.CODA_DOC_ID_PERSONAL_FINANCE || process.env.CODA_DOC_ID;
    const token = apiToken || CODA_API_TOKEN;

    if (!token || !targetDocId) {
        console.error("Missing Coda Env Variables for Finance");
        return [];
    }

    try {
        // Must use correct table name, from setup doc it is 'Finance_Projection'
        const tableName = "Finance_Projection";
        // Fetch rows
        const url = `https://coda.io/apis/v1/docs/${targetDocId}/tables/${tableName}/rows?useColumnNames=true&limit=100`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            next: { revalidate: 0 }, // Force fresh data
        });

        if (!res.ok) {
            console.error(`Failed to fetch finance projections from table '${tableName}':`, res.status, res.statusText);
            return [];
        }

        const data = await res.json();
        const rows = data.items;

        if (!rows || rows.length === 0) return [];

        return rows.map((row: any) => {
            const val = row.values;

            // Helper to extract string from potential Coda relation objects
            const resolveV = (v: any) => {
                if (!v) return null;
                if (typeof v === 'string') return v;
                if (typeof v === 'object') return v.name || v.id || JSON.stringify(v);
                return String(v);
            };

            const keys = Object.keys(val);
            // Search for a key that matches and HAS a value
            const conceptKey = keys.find(k => {
                const n = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                const isMatch = n === "concepto" || n === "nombre" || n === "name" || n === "id gasto" || n === "regla vinculada";
                return isMatch && val[k] && resolveV(val[k]) !== "";
            });

            const conceptValue = resolveV(conceptKey ? val[conceptKey] : null);

            return {
                id: row.id,
                concept: conceptValue || row.name || "Sin Concepto",
                date: val["Fecha de Pago"] || new Date().toISOString(),
                amount: safeNumber(val["Monto"]),
                status: val["Estado"] || "⏳ Pendiente",
                receipt: val["Comprobante"] || "",
                category: val["Categoría"] || ""
            };
        });

    } catch (error) {
        console.error("Error fetching finance projections:", error);
        return [];
    }
}

export interface FinanceRule {
    id: string;
    name: string;
    amount: number;
    recurrence: string; // 'Mensual', 'Bimestral', etc.
    day: number;
    active: boolean;
    category?: string;
    startMonth?: number;
    endMonth?: number;
}

export async function getFinanceRules(docId?: string, apiToken?: string): Promise<FinanceRule[]> {
    const targetDocId = docId || process.env.CODA_DOC_ID_FINANCE_CORE || process.env.CODA_DOC_ID_SUBSCRIPTIONS || process.env.CODA_DOC_ID_BUSINESS_SUBSCRIPTIONS || process.env.CODA_DOC_ID;
    const token = apiToken || CODA_API_TOKEN;

    if (!token || !targetDocId) return [];

    try {
        const tableName = "Finance_Rules";
        const url = `https://coda.io/apis/v1/docs/${targetDocId}/tables/${tableName}/rows?useColumnNames=true&limit=100`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!res.ok) return [];

        const data = await res.json();
        const rows = data.items || [];

        return rows.map((row: any) => {
            const val = row.values;
            const resolveV = (v: any) => {
                if (!v) return null;
                if (typeof v === 'string') return v;
                if (typeof v === 'object') return v.name || v.id || JSON.stringify(v);
                return String(v);
            };
            const keys = Object.keys(val);
            const conceptKey = keys.find(k => {
                const n = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                return n === "concepto" || n === "nombre" || n === "name";
            });

            const conceptValue = resolveV(conceptKey ? val[conceptKey] : null);

            return {
                id: row.id,
                name: row.name || conceptValue || "Sin Nombre",
                amount: safeNumber(val["Monto Base"] || val["Monto"]),
                recurrence: val["Tipo Recurrencia"] || "Unknown",
                day: safeNumber(val["Día de Corte"] || val["Día"] || val["Day"]),
                active: val["Estado"] === "Activo",
                category: val["Categoría"] || "",
                startMonth: safeNumber(val["Mes Inicio"]),
                endMonth: safeNumber(val["Mes Fin"])
            };
        });
    } catch (error) {
        console.error("Error fetching finance rules:", error);
        return [];
    }
}

export async function updateFinanceStatus(rowId: string, status: string = "✅ Pagado", docId?: string, apiToken?: string): Promise<boolean> {
    const targetDocId = docId || process.env.CODA_DOC_ID_FINANCE_CORE || process.env.CODA_DOC_ID_SUBSCRIPTIONS || process.env.CODA_DOC_ID;
    const token = apiToken || CODA_API_TOKEN;

    if (!token || !targetDocId) return false;

    try {
        const tableName = "Finance_Projection";
        const url = `https://coda.io/apis/v1/docs/${targetDocId}/tables/${tableName}/rows/${rowId}`;

        const payload = {
            row: {
                cells: [
                    { column: "Estado", value: status }
                ]
            }
        };

        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("Error updating Coda row:", res.status, err);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error in updateFinanceStatus:", error);
        return false;
    }
}

export interface LedgerEntry {
    concept: string;
    amount: number;
    category: string;
    date?: string; // ISO
    paymentMethod?: string;
    receiptUrl?: string;
}

export async function createLedgerEntry(entry: LedgerEntry, docId?: string, apiToken?: string) {
    const targetDocId = docId || process.env.CODA_DOC_ID_FINANCE_CORE || process.env.CODA_DOC_ID_SUBSCRIPTIONS || process.env.CODA_DOC_ID;
    const token = apiToken || CODA_API_TOKEN;

    if (!token || !targetDocId) return false;

    try {
        const tableName = "Finance_Ledger";
        const url = `https://coda.io/apis/v1/docs/${targetDocId}/tables/${tableName}/rows`;

        const payload = {
            rows: [
                {
                    cells: [
                        { column: "Concepto", value: entry.concept },
                        { column: "Monto", value: entry.amount },
                        { column: "Categoría", value: entry.category },
                        { column: "Fecha", value: entry.date || new Date().toISOString() },
                        { column: "Método de Pago", value: entry.paymentMethod || "Efectivo" },
                        { column: "Comprobante", value: entry.receiptUrl || "" }
                    ]
                }
            ]
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("Error creating Ledger row:", res.status, err);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error in createLedgerEntry:", error);
        return false;
    }
}

export interface FinanceBudget {
    category: string;
    monthlyBudget: number;
}

export async function getFinanceBudgets(docId?: string, apiToken?: string): Promise<FinanceBudget[]> {
    const targetDocId = docId || process.env.CODA_DOC_ID_FINANCE_CORE;
    if (!CODA_API_TOKEN || !targetDocId) return [];

    try {
        const tableName = "Finance_Budgets";
        const url = `https://coda.io/apis/v1/docs/${targetDocId}/tables/${tableName}/rows?useColumnNames=true&limit=100`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${CODA_API_TOKEN}` },
            next: { revalidate: 3600 },
        });

        if (!res.ok) return [];

        const data = await res.json();
        return (data.items || []).map((row: any) => {
            const val = row.values;
            const keys = Object.keys(val);
            const catKey = keys.find(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === "categoria");

            return {
                category: (catKey ? val[catKey] : null) || row.name,
                monthlyBudget: safeNumber(val["Presupuesto Mensual"])
            };
        });
    } catch (error) {
        console.error("Error fetching budgets:", error);
        return [];
    }
}

export async function getFinanceLedger(docId?: string, apiToken?: string) {
    const targetDocId = docId || process.env.CODA_DOC_ID_FINANCE_CORE;
    if (!CODA_API_TOKEN || !targetDocId) return [];

    try {
        const tableName = "Finance_Ledger";
        const url = `https://coda.io/apis/v1/docs/${targetDocId}/tables/${tableName}/rows?useColumnNames=true&limit=500`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${CODA_API_TOKEN}` },
            next: { revalidate: 300 }, // 5 min cache
        });

        if (!res.ok) return [];

        const data = await res.json();
        return (data.items || []).map((row: any) => {
            const val = row.values;
            const resolveV = (v: any) => {
                if (!v) return null;
                if (typeof v === 'string') return v;
                if (typeof v === 'object') return v.name || v.id || JSON.stringify(v);
                return String(v);
            };
            const keys = Object.keys(val);
            const conceptKey = keys.find(k => {
                const n = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                return n === "concepto" || n === "nombre" || n === "name";
            });

            const conceptValue = resolveV(conceptKey ? val[conceptKey] : null);

            return {
                id: row.id,
                concept: row.name || conceptValue || "Sin Concepto",
                amount: safeNumber(val["Monto"]),
                category: val["Categoría"] || "",
                date: val["Fecha"] || new Date().toISOString()
            };
        });
    } catch (error) {
        console.error("Error fetching ledger:", error);
        return [];
    }
}

export async function createBulkProjections(rows: any[], docId?: string, apiToken?: string) {
    const targetDocId = docId || process.env.CODA_DOC_ID_FINANCE_CORE;
    const token = apiToken || CODA_API_TOKEN;

    if (!token || !targetDocId || rows.length === 0) return false;

    try {
        const tableName = "Finance_Projection";
        const url = `https://coda.io/apis/v1/docs/${targetDocId}/tables/${tableName}/rows`;

        const payload = {
            rows: rows.map(r => ({
                cells: [
                    { column: "ID Gasto", value: r.conceptId },
                    { column: "Concepto", value: r.name },
                    { column: "Fecha de Pago", value: r.date },
                    { column: "Monto", value: r.amount },
                    { column: "Estado", value: "⏳ Pendiente" },
                    { column: "Categoría", value: r.category }
                ]
            }))
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        return res.ok;
    } catch (error) {
        console.error("Error in createBulkProjections:", error);
        return false;
    }
}





