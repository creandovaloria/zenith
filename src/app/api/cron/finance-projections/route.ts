
import { NextRequest, NextResponse } from "next/server";
import { getFinanceRules, getFinanceProjections, createBulkProjections } from "@/lib/coda";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
    try {
        // Basic auth check for Cron
        const authHeader = req.headers.get('authorization');
        const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
        const isManual = req.nextUrl.searchParams.get("force") === "true";

        if (!isCron && !isManual) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const today = new Date();
        const currentMonth = today.getMonth() + 1; // 1-12
        const currentYear = today.getFullYear();
        const monthLabel = format(today, "yyyy-MM");

        console.log(`🤖 Starting Finance Projection Generation for ${monthLabel}...`);

        // 1. Fetch Rules & Existing Projections
        const [rules, projections] = await Promise.all([
            getFinanceRules(),
            getFinanceProjections()
        ]);

        if (rules.length === 0) {
            return NextResponse.json({ message: "No active rules found" });
        }

        // 2. Identify which rows already exist for this month to avoid duplicates
        const existingIds = new Set(projections.map(p => p.concept));

        // 3. Filter rules that apply to this month
        const newProjections = rules.filter(rule => {
            if (!rule.active) return false;

            // --- STRICT MONTH VALIDATION ---
            // If rule has a start month, it MUST be current month or earlier
            if (rule.startMonth && currentMonth < rule.startMonth) return false;
            // If rule has an end month, it MUST be current month or later
            if (rule.endMonth && currentMonth > rule.endMonth) return false;

            // Recurrence Logic
            const rec = rule.recurrence;
            let applies = false;

            if (rec === "Mensual") {
                applies = true;
            } else if (rec === "Bimestral Par") {
                applies = (currentMonth % 2 === 0);
            } else if (rec === "Bimestral Non") {
                applies = (currentMonth % 2 !== 0);
            } else if (rec === "Rango Definido") {
                applies = true; // Already covered by start/end month checks above
            } else if (rec === "Único") {
                applies = (currentMonth === rule.startMonth);
            }

            if (!applies) return false;

            // ID Generation (Constraint: Name-YYYY-MM)
            const conceptId = `${rule.name}-${monthLabel}`;

            // Check if already exists
            if (existingIds.has(conceptId)) return false;

            return true;
        }).map(rule => ({
            conceptId: `${rule.name}-${monthLabel}`,
            name: rule.name,
            date: new Date(currentYear, currentMonth - 1, rule.day).toISOString(),
            amount: rule.amount,
            category: rule.category
        }));

        console.log(`📈 Generated ${newProjections.length} new projections.`);

        if (newProjections.length > 0) {
            const success = await createBulkProjections(newProjections);
            if (!success) {
                return NextResponse.json({ error: "Failed to create projections in Coda" }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            month: monthLabel,
            created: newProjections.length,
            items: newProjections.map(p => p.name)
        });

    } catch (error) {
        console.error("Cron Finance Projections Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
