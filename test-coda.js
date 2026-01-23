
const https = require('https');

// Configuración de Prueba
const TOKEN = '9a6dfada-4161-41c5-9c5e-6ddd8487b9bd'; // Token Negocios
const DOC_ID = 'BT9_NIJO55'; // ID del Doc de la URL (Probablemente el correcto)

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

// 1. Listar tablas del Doc de Negocios
fetchCoda(`https://coda.io/apis/v1/docs/${DOC_ID}/tables`, "Listado de Tablas en el Doc");

// 2. Intentar leer Suscripciones_Negocio (Comentado hasta saber el nombre)
// fetchCoda(`https://coda.io/apis/v1/docs/${DOC_ID}/tables/Suscripciones_Negocio/rows?limit=1`, "Lectura Tabla Negocio");

// 3. Intentar leer Suscripciones_Negocio
// fetchCoda(`https://coda.io/apis/v1/docs/${DOC_ID}/tables/Suscripciones_Negocio/rows?limit=1`, "Lectura Tabla Negocio");
