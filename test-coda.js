
const https = require('https');

// Configuración de Prueba
const TOKEN = '13f2aaa7-7205-4fee-ac48-c47087498ebc'; // Token usado previamente
const DOC_ID = 'BT9_NIJO55'; // ID del Doc de Suscripciones (Nuevo)

// Funciones de ayuda
function fetchCoda(url, label) {
    const options = {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    };

    console.log(`\n--- Probando: ${label} ---`);
    console.log(`URL: ${url}`);

    https.get(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.error(`❌ Error ${res.statusCode}: ${res.statusMessage}`);
                // console.error(data); // Uncomment for full error
                return;
            }
            try {
                const json = JSON.parse(data);
                console.log(`✅ Éxito. Items encontrados: ${json.items ? json.items.length : 0}`);
                if (json.items && json.items.length > 0) {
                    console.log("Documentos (ID - Nombre):", JSON.stringify(json.items.map(i => `${i.id} - ${i.name}`), null, 2));
                } else {
                    console.log("⚠️ La lista está vacía.");
                }
            } catch (e) {
                console.error("Error parseando JSON:", e.message);
            }
        });
    }).on('error', e => console.error("Error de Red:", e.message));
}

// 1. Ver qué documentos podemos ver con este Token
fetchCoda(`https://coda.io/apis/v1/docs`, "Listado de Documentos Accesibles");

// 2. Intentar leer Suscripciones_Personal
// fetchCoda(`https://coda.io/apis/v1/docs/${DOC_ID}/tables/Suscripciones_Personal/rows?limit=1`, "Lectura Tabla Personal");

// 3. Intentar leer Suscripciones_Negocio
// fetchCoda(`https://coda.io/apis/v1/docs/${DOC_ID}/tables/Suscripciones_Negocio/rows?limit=1`, "Lectura Tabla Negocio");
