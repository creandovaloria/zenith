
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
        // Remove commas and try parsing
        const clean = val.replace(/,/g, '').trim();
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
