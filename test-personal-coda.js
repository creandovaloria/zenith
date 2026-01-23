const https = require('https');
const fs = require('fs');
const path = require('path');

// 1. Load env vars manually since we are in a standalone script
const envPath = path.resolve(__dirname, '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) env[key.trim()] = val.trim();
    });
}

const TOKEN = env.CODA_API_TOKEN;
const DOC_ID = env.CODA_DOC_ID_SUBSCRIPTIONS || 'jqPGM2Nybv'; // Fallback to known ID

console.log("--- Test de Conexión Personal ---");
console.log(`Token detectado: ${TOKEN ? 'SÍ (Empieza con ' + TOKEN.substring(0, 4) + '...)' : 'NO'}`);
console.log(`Doc ID: ${DOC_ID}`);

if (!TOKEN) {
    console.error("❌ No se encontró CODA_API_TOKEN en .env.local");
    process.exit(1);
}

const url = `https://coda.io/apis/v1/docs/${DOC_ID}/tables`;

const options = {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
};

https.get(url, options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log("✅ Conexión EXITOSA con Coda Personal.");
            const json = JSON.parse(data);
            console.log("Tablas encontradas:", json.items.map(t => t.name).join(', '));
        } else {
            console.error(`❌ Error ${res.statusCode}: ${res.statusMessage}`);
            console.error("Posible causa: El token es inválido o el Doc ID cambió/no tienes permiso.");
        }
    });
}).on('error', e => console.error(e));
