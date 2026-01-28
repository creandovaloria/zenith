import { getFinanceRules } from './src/lib/coda';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debug() {
    const rules = await getFinanceRules();
    console.log("RULES FETCHED:", rules.length);
    if (rules.length > 0) {
        console.log("FIRST RULE:", JSON.stringify(rules[0], null, 2));
        const activeCount = rules.filter(r => r.active).length;
        console.log("ACTIVE RULES:", activeCount);

        const recurrences = Array.from(new Set(rules.map(r => r.recurrence)));
        console.log("RECURRENCE TYPES FOUND:", recurrences);

        const statuses = Array.from(new Set(rules.map(r => r.active)));
        console.log("ACTIVE STATUSES:", statuses);
    }
}

debug();
