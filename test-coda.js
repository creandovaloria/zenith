
const https = require('https');

// Hardcoded for this test to avoid env loading issues in standalone script
const TOKEN = '13f2aaa7-7205-4fee-ac48-c47087498ebc';
const DOC_ID = 'obyq0e-fOD';
const TABLE_NAME = 'Biometrics';

const url = `https://coda.io/apis/v1/docs/${DOC_ID}/tables/${TABLE_NAME}/rows?useColumnNames=true&limit=5`;

console.log(`Fetching from: ${url}`);

const options = {
    headers: {
        'Authorization': `Bearer ${TOKEN}`
    }
};

https.get(url, options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode !== 200) {
            console.error(`Error: Status Code ${res.statusCode}`);
            console.error(data);
            return;
        }

        try {
            const json = JSON.parse(data);
            console.log("--- API RESPONSE SAMPLE (Last Item) ---");
            if (json.items && json.items.length > 0) {
                const lastItem = json.items[json.items.length - 1];
                console.log(JSON.stringify(lastItem.values, null, 2));
            } else {
                console.log("No items found!");
            }
            console.log("---------------------------------------");
        } catch (e) {
            console.error("Error parsing JSON:", e.message);
            console.log("Raw Data:", data);
        }
    });

}).on('error', (e) => {
    console.error("Network Error:", e);
});
