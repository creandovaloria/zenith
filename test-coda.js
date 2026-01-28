
require('dotenv').config({ path: '.env.local' });

async function testCoda() {
    const token = process.env.CODA_API_TOKEN;
    const docId = process.env.CODA_DOC_ID_FINANCE_CORE;
    const tableName = "Finance_Projection";

    if (!token || !docId) {
        console.error("Missing ENV vars");
        return;
    }

    try {
        const url = `https://coda.io/apis/v1/docs/${docId}/tables/${tableName}/rows?useColumnNames=true&limit=2`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Status:", res.status);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
            console.log("Column Names found in first row:", Object.keys(data.items[0].values));
            console.log("Values in first row:", JSON.stringify(data.items[0].values, null, 2));
        } else {
            console.log("No items found in table.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testCoda();
