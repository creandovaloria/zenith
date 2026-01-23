
const CODA_API_TOKEN = process.env.CODA_API_TOKEN;
const CODA_DOC_ID = process.env.CODA_DOC_ID;

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
    type: 'Meeting' | 'Webinar' | 'Idea' | 'Other';
    rawText: string;
    summary: string;
    project?: string; // New Project field
    tags?: string;
    url?: string; // e.g. Perplexity link if available
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
    const targetDocId = docId || process.env.CODA_DOC_ID;
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
