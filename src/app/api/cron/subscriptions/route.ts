import { NextResponse } from 'next/server';
import { getSubscriptions, Subscription } from '@/lib/coda';
import { Resend } from 'resend';

// Environment variables
const CODA_DOC_ID_PERSONAL = process.env.CODA_DOC_ID_SUBSCRIPTIONS || process.env.CODA_DOC_ID; // Fallback
const CODA_DOC_ID_BUSINESS = process.env.CODA_DOC_ID_BUSINESS_SUBSCRIPTIONS || process.env.CODA_DOC_ID_BUSINESS;

const CODA_API_TOKEN_BUSINESS = process.env.CODA_API_TOKEN_BUSINESS;

const YOUR_EMAIL = process.env.YOUR_EMAIL || "creandovalor.ia@gmail.com";

export async function GET(request: Request) {
    // ... (Resend init same as before ... )
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        console.error("Missing RESEND_API_KEY");
        return NextResponse.json({ error: 'Missing Email Config' }, { status: 500 });
    }
    const resend = new Resend(resendApiKey);

    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log("--- Starting Subscriptions Cron (Multi-Account) ---");

        // 1. Fetch Data - PERSONAL (Uses Default Token in lib if not provided, but we pass Doc ID explicit)
        console.log("Fetching Personal Subscriptions...");
        let personalSubs: Subscription[] = [];
        if (CODA_DOC_ID_PERSONAL) {
            personalSubs = await getSubscriptions("Suscripciones_Personal", CODA_DOC_ID_PERSONAL);
        } else {
            console.warn("Skipping Personal: Missing CODA_DOC_ID_SUBSCRIPTIONS");
        }

        // 2. Fetch Data - BUSINESS (Uses Explicit Token and Doc ID)
        console.log("Fetching Business Subscriptions...");
        let businessSubs: Subscription[] = [];
        if (CODA_DOC_ID_BUSINESS && CODA_API_TOKEN_BUSINESS) {
            businessSubs = await getSubscriptions("Suscripciones_Negocio", CODA_DOC_ID_BUSINESS, CODA_API_TOKEN_BUSINESS);
        } else {
            console.warn("Skipping Business: Missing CODA_DOC_ID_BUSINESS or CODA_API_TOKEN_BUSINESS");
        }

        const allSubs = [...personalSubs, ...businessSubs];
        console.log(`Found ${allSubs.length} total subscriptions.`);

        // 2. Logic: Priority Alerts (Trials ending soon)
        const alerts: Subscription[] = [];
        const warningDays = 3;

        for (const sub of allSubs) {
            // Check for Active Trials
            if (sub.status.toLowerCase().includes('trial') && sub.status.toLowerCase().includes('activo')) {
                // If it has days remaining and they are low
                if (sub.daysRemaining <= warningDays && sub.daysRemaining >= 0) {
                    alerts.push(sub);
                }
            }
            // Check for "Cancelar" action that is impending
            if (sub.action.toLowerCase() === 'cancelar' && sub.daysRemaining <= warningDays && sub.daysRemaining >= 0 && sub.status !== 'Cancelada') {
                // Avoid duplicates if already caught
                if (!alerts.some(a => a.id === sub.id)) alerts.push(sub);
            }
        }

        // 3. Logic: Monthly Report (If today is the 1st of the month OR forced via URL)
        // Check URL params for ?forceReport=true
        const { searchParams } = new URL(request.url);
        const forceReport = searchParams.get('forceReport') === 'true';

        const today = new Date();
        const isFirstOfMonth = today.getDate() === 1;

        let sentEmail = false;

        // SEND ALERT EMAIL
        if (alerts.length > 0) {
            console.log(`Sending alerts for ${alerts.length} items.`);
            const emailHtml = generateAlertHtml(alerts);

            await resend.emails.send({
                from: 'Zenith <onboarding@resend.dev>', // Update this if you have a custom domain
                to: YOUR_EMAIL,
                subject: `⚠️ ALERTA SUSCRIPCIONES: ${alerts.length} Acciones Requeridas`,
                html: emailHtml
            });
            sentEmail = true;
        }

        // SEND MONTHLY REPORT
        if (isFirstOfMonth || forceReport) {
            console.log("Generating Executive Summary (Scheduled or Forced).");
            const reportHtml = generateMonthlyReportHtml(personalSubs, businessSubs);

            await resend.emails.send({
                from: 'Zenith <onboarding@resend.dev>',
                to: YOUR_EMAIL,
                subject: `📊 Reporte Mensual de Suscripciones - ${today.toLocaleString('default', { month: 'long' })}`,
                html: reportHtml
            });
            sentEmail = true;
        }

        return NextResponse.json({
            success: true,
            processed: allSubs.length,
            alertsSent: alerts.length,
            monthlyReportSent: isFirstOfMonth
        });

    } catch (error) {
        console.error("Cron Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// --- HTML Generators ---

function generateAlertHtml(subs: Subscription[]) {
    const listItems = subs.map(sub => `
        <div style="border: 1px solid #ffccc7; background-color: #fff1f0; padding: 15px; margin-bottom: 10px; border-radius: 8px;">
            <h3 style="margin: 0; color: #cf1322;">${sub.name}</h3>
            <p style="margin: 5px 0;"><strong>Estado:</strong> ${sub.status}</p>
            <p style="margin: 5px 0;"><strong>Acción:</strong> ${sub.action}</p>
            <p style="margin: 5px 0;"><strong>Vence en:</strong> ${sub.daysRemaining} días (${new Date(sub.renewalDate!).toLocaleDateString()})</p>
            <p style="margin: 5px 0;"><strong>Costo:</strong> $${sub.cost}</p>
            ${sub.notes ? `<p style="margin: 5px 0; font-style: italic;">"${sub.notes}"</p>` : ''}
        </div>
    `).join('');

    return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>⚠️ Alerta de Suscripciones</h2>
            <p>Las siguientes suscripciones requieren tu atención inmediata (Trials por vencer o cancelaciones programadas):</p>
            ${listItems}
            <a href="https://coda.io" style="display: block; text-align: center; background: #000; color: #fff; padding: 10px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Ir a Coda</a>
        </div>
    `;
}

function generateMonthlyReportHtml(personal: Subscription[], business: Subscription[]) {
    const calcTotal = (subs: Subscription[]) => subs.reduce((sum, s) => {
        // Simple logic: If it's active and monthly, add cost. If annual, divide by 12? 
        // For simplicity, let's just sum the 'Cost' field assuming it represents the recurring payment.
        // Ideally we check 'Periodo' column but we didn't map it deeply yet. 
        // Let's assume 'Cost' is the monthly impact for now or just raw cost.
        if (s.status.toLowerCase().includes('activa') || s.status.toLowerCase().includes('trial')) {
            return sum + s.cost;
        }
        return sum;
    }, 0);

    const personalTotal = calcTotal(personal);
    const businessTotal = calcTotal(business);
    const total = personalTotal + businessTotal;

    return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f1f1f;">
            <h1 style="text-align: center;">Resumen Ejecutivo Mensual</h1>
            <p style="text-align: center; color: #666;">Control de Gastos Operativos y Personales</p>
            
            <div style="background: #f0f2f5; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Suscripciones Activas:</span>
                    <strong>${personal.length + business.length}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 1.2em; border-top: 1px solid #ccc; padding-top: 10px;">
                    <span>Total Mensual Estimado:</span>
                    <strong>$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
            </div>

            <div style="display: flex; gap: 10px;">
                <div style="flex: 1; background: #e6f7ff; padding: 15px; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #0050b3;">Negocios</h3>
                    <p style="font-size: 1.5em; font-weight: bold; margin: 0;">$${businessTotal.toLocaleString('es-MX')}</p>
                </div>
                <div style="flex: 1; background: #f9f0ff; padding: 15px; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #531dab;">Personal</h3>
                    <p style="font-size: 1.5em; font-weight: bold; margin: 0;">$${personalTotal.toLocaleString('es-MX')}</p>
                </div>
            </div>

            <p style="margin-top: 30px; font-size: 0.8em; color: #888; text-align: center;">Generado automáticamente por Zenith AI</p>
        </div>
    `;
}
