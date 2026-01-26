const https = require('https');
const fs = require('fs');
const path = require('path');

// Test Config
const DOC_ID = 'EV4QzWWaWT'; // Extracted from provided URL
// We need to fetch the Personal Token from .env.local to test
const envPath = path.resolve(__dirname, '.env.local');
let token = '';

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/CODA_API_TOKEN=([^\r\n]+)/);
    if (match) token = match[1].trim();
}

console.log("--- Test Zenith Finance Connection ---");
console.log(`Doc ID: ${DOC_ID}`);
console.log(`Token Found: ${token ? 'YES' : 'NO'}`);

if (!token) {
    console.error("❌ Error: CODA_API_TOKEN not found in .env.local");
    process.exit(1);
}

// Check Finance_Projection Table
const url = `https://coda.io/apis/v1/docs/${DOC_ID}/tables/Finance_Projection/rows?limit=1`;

const options = {
    headers: { 'Authorization': `Bearer ${token}` }
};

https.get(url, options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log("✅ SUCCESS: Found 'Finance_Projection' table!");
            const json = JSON.parse(data);
            console.log(`Rows found: ${json.items ? json.items.length : 0}`);
            if (json.items && json.items.length > 0) {
                console.log("Sample Row:", JSON.stringify(json.items[0].values, null, 2));
            }
        } else {
            console.error(`❌ ERROR ${res.statusCode}: Could not access table.`);
            console.error("Possible reasons: Wrong Doc ID or Table Name mismatch.");
        }
    });
}).on('error', e => console.error(e));
