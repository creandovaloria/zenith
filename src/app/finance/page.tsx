
import React from "react";
import { format, addMonths, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
    CreditCard,
    ArrowLeft,
    Calendar,
    Wallet,
    PieChart,
    ListTodo,
    TrendingDown,
    ChevronRight,
    Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFinanceProjections, getFinanceRules, getFinanceBudgets, getFinanceLedger, LedgerEntry } from "@/lib/coda";
import { MarkPaidButton } from "@/components/MarkPaidButton";

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
    const currentDate = new Date();
    const currentMonthName = format(currentDate, "MMMM", { locale: es });

    const [projections, rules, budgets, ledger] = await Promise.all([
        getFinanceProjections(),
        getFinanceRules(),
        getFinanceBudgets(),
        getFinanceLedger()
    ]);

    const currentMonthItems = projections.filter(item => {
        const d = new Date(item.date);
        return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });

    const totalMonthly = currentMonthItems.reduce((acc, item) => acc + item.amount, 0);
    const paidMonthly = currentMonthItems
        .filter(item => item.status === "✅ Pagado" || item.status === "Pagado")
        .reduce((acc, item) => acc + item.amount, 0);
    const pendingMonthly = totalMonthly - paidMonthly;
    const progressPercent = totalMonthly > 0 ? (paidMonthly / totalMonthly) * 100 : 0;

    // Categorization logic for the chart
    const categoryTotals: Record<string, number> = {};
    rules.forEach(r => {
        if (!r.active) return;
        const cat = r.category || "General";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + r.amount;
    });

    const sortedCategories = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5); // Top 5

    const totalRulesAmount = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    const chartData = sortedCategories.map(([label, val], idx) => {
        const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-orange-500', 'bg-violet-500', 'bg-pink-500'];
        return {
            label,
            val: totalRulesAmount > 0 ? Math.round((val / totalRulesAmount) * 100) : 0,
            color: colors[idx % colors.length]
        };
    });

    // --- HYBRID LOGIC: FIXED VS VARIABLE ---
    const fixedKeywords = [
        "Infancia Plena",
        "Logística de Vida",
        "Fondo de Libertad",
        "Donación / Legacy"
    ];

    const currentMonthLedger = ledger.filter((l: LedgerEntry) => {
        const d = new Date(l.date || "");
        return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });

    const budgetStatus = budgets.map(b => {
        const isFixed = fixedKeywords.some(kw => b.category.includes(kw));

        let spent = 0;
        let limit = b.monthlyBudget;
        let percent = 0;
        let color = 'bg-emerald-500';

        if (isFixed) {
            // FIXED LOGIC: Base on Projections
            const catItems = currentMonthItems.filter(item => item.category === b.category);
            const totalCat = catItems.reduce((acc, item) => acc + item.amount, 0);
            const paidCat = catItems
                .filter(item => item.status === "✅ Pagado" || item.status === "Pagado")
                .reduce((acc, item) => acc + item.amount, 0);

            spent = paidCat;
            limit = totalCat || b.monthlyBudget;
            percent = limit > 0 ? (spent / limit) * 100 : 0;
            color = percent === 100 ? 'bg-emerald-500' : 'bg-primary/60';
        } else {
            // VARIABLE LOGIC: Base on Ledger vs Budget Table
            spent = currentMonthLedger
                .filter((l: LedgerEntry) => l.category === b.category)
                .reduce((acc: number, l: LedgerEntry) => acc + l.amount, 0);

            percent = limit > 0 ? (spent / limit) * 100 : 0;
            color = percent > 95 ? 'bg-red-500' : percent > 75 ? 'bg-orange-500' : 'bg-emerald-500';
        }

        return {
            category: b.category,
            limit,
            spent,
            percent: Math.min(percent, 100),
            color,
            isFixed
        };
    });

    // --- RADAR: 12-MONTH FORECAST LOGIC ---
    const forecast = Array.from({ length: 12 }).map((_, i) => {
        const targetMonthDate = addMonths(startOfMonth(currentDate), i);
        const m = targetMonthDate.getMonth() + 1;
        const monthName = format(targetMonthDate, "MMM", { locale: es });

        const monthlyTotal = rules.reduce((acc, rule) => {
            if (!rule.active) return acc;

            // Strict Month Validation
            if (rule.startMonth && m < rule.startMonth) return acc;
            if (rule.endMonth && m > rule.endMonth) return acc;

            // Recurrence Logic (Normalized)
            let applies = false;
            const rec = (rule.recurrence || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

            if (rec.includes("mensual") || rec.includes("cada mes") || rec.includes("monthly") || rec === "si") applies = true;
            else if (rec.includes("bimestral par")) applies = (m % 2 === 0);
            else if (rec.includes("bimestral non") || rec.includes("bimestral impar")) applies = (m % 2 !== 0);
            else if (rec.includes("rango") || rec.includes("periodo")) applies = true;
            else if (rec.includes("unico") || rec.includes("one time")) applies = (m === rule.startMonth);

            return applies ? acc + rule.amount : acc;
        }, 0);

        return { monthName, total: monthlyTotal };
    });

    const maxForecast = Math.max(...forecast.map(f => f.total), 1);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            {/* Header */}
            <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-background/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <a href="/" className="p-2 rounded-xl hover:bg-muted transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </a>
                    <div>
                        <h1 className="font-bold text-xl tracking-tight">Cerebro Financiero</h1>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Zenith Economics</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <a href="/api/cron/finance-projections?force=true" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary hover:text-white transition-all">
                        Generar proyecciones
                    </a>
                    <span className="text-xs font-mono bg-muted px-3 py-1.5 rounded-full border border-border capitalize">
                        {format(currentDate, "MMMM yyyy", { locale: es })}
                    </span>
                </div>
            </header>

            <main className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10 pb-24">

                {/* Top Stats Dashboard */}
                <section className="grid md:grid-cols-3 gap-6">
                    <div className="glass-panel p-6 rounded-3xl border-white/5 bg-emerald-500/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 bg-emerald-500/10 blur-3xl rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="flex items-center gap-3 text-emerald-400 mb-4">
                            <Wallet className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-wider">Total del Mes</span>
                        </div>
                        <div className="space-y-1 relative z-10">
                            <h2 className="text-3xl font-bold">${totalMonthly.toLocaleString('es-MX')}</h2>
                            <p className="text-sm text-muted-foreground">Compromisos programados</p>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-3xl border-white/5 bg-blue-500/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 bg-blue-500/10 blur-3xl rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="flex items-center gap-3 text-blue-400 mb-4">
                            <TrendingDown className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-wider">Pagado</span>
                        </div>
                        <div className="space-y-1 relative z-10">
                            <h2 className="text-3xl font-bold">${paidMonthly.toLocaleString('es-MX')}</h2>
                            <p className="text-sm text-muted-foreground">{progressPercent.toFixed(0)}% del total liberado</p>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-3xl border-white/5 bg-orange-500/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 bg-orange-500/10 blur-3xl rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="flex items-center gap-3 text-orange-400 mb-4">
                            <Calendar className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-wider">Pendiente</span>
                        </div>
                        <div className="space-y-1 relative z-10">
                            <h2 className="text-3xl font-bold text-orange-500">${pendingMonthly.toLocaleString('es-MX')}</h2>
                            <p className="text-sm text-muted-foreground">Flujo necesario para cubrir</p>
                        </div>
                    </div>
                </section>

                {/* Radar Area: Long-term Forecast */}
                <section className="glass-panel p-8 rounded-[2.5rem] border-white/5 bg-card/50 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-20 bg-primary/5 blur-[100px] rounded-full -mr-10 -mt-10"></div>

                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <PieChart className="w-5 h-5 text-primary" />
                                Radar de Proyección (12 Meses)
                            </h3>
                            <p className="text-sm text-muted-foreground">Flujos futuros basados en tus reglas maestras</p>
                        </div>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase text-muted-foreground">Vista estratégica</span>
                        </div>
                    </div>

                    <div className="h-48 flex items-end justify-between gap-2 relative z-10 px-4">
                        {forecast.map((f, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center group">
                                <div className="hidden group-hover:flex absolute -top-10 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl transition-all">
                                    ${f.total.toLocaleString()}
                                </div>
                                <div
                                    className={cn(
                                        "w-full rounded-t-lg transition-all duration-700 bg-primary/20 group-hover:bg-primary/50",
                                        i === 0 && "bg-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                                    )}
                                    style={{ height: `${(f.total / maxForecast) * 100}%` }}
                                ></div>
                                <span className={cn(
                                    "text-[10px] font-bold uppercase mt-4",
                                    i === 0 ? "text-primary font-black" : "text-muted-foreground"
                                )}>
                                    {f.monthName}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="grid lg:grid-cols-3 gap-10">
                    {/* Left Column: Rules & Configuration */}
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <ListTodo className="w-5 h-5 text-primary" />
                                Reglas Maestras
                            </h3>
                            <div className="space-y-3">
                                {rules.filter(r => r.active).map(rule => (
                                    <div key={rule.id} className="p-4 rounded-2xl border border-border bg-card/50 hover:border-primary/30 transition-all group">
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate">{rule.name}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                                    {rule.category || "General"} • {rule.recurrence} • Día {rule.day}
                                                </p>
                                            </div>
                                            <span className="text-sm font-mono font-bold text-foreground/80 group-hover:text-primary transition-colors">
                                                ${rule.amount.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <button className="w-full py-4 rounded-2xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary group">
                                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                    Añadir Regla de Gasto
                                </button>
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl border border-border bg-gradient-to-br from-card to-muted/30">
                            <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                                <PieChart className="w-4 h-4 text-violet-500" />
                                Presupuestos Variables
                            </h4>
                            <div className="space-y-5">
                                {budgetStatus.length > 0 ? budgetStatus.map(item => (
                                    <div key={item.category} className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                            <span className="truncate pr-2 max-w-[150px]">
                                                {item.category}
                                                {item.isFixed && <span className="ml-2 text-[8px] bg-primary/20 text-primary px-1 rounded">Fijo</span>}
                                            </span>
                                            <span>${item.spent.toLocaleString()} / ${item.limit.toLocaleString()}</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-1000", item.color)}
                                                style={{ width: `${item.percent}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-xs text-muted-foreground italic text-center py-4">Sin presupuestos activos</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right/Main Column: Projections List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-primary" />
                                Proyecciones de {currentMonthName}
                            </h3>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase text-muted-foreground">
                                    {currentMonthItems.length} transacciones
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {currentMonthItems
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                .map((item) => (
                                    <div key={item.id} className={cn(
                                        "group p-5 rounded-3xl border transition-all duration-300 flex items-center justify-between",
                                        item.status === '✅ Pagado' || item.status === 'Pagado'
                                            ? "bg-muted/20 border-border opacity-60"
                                            : "bg-card border-border hover:border-primary/40 shadow-sm hover:shadow-md"
                                    )}>
                                        <div className="flex items-center gap-5 min-w-0">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors",
                                                item.status === '✅ Pagado' || item.status === 'Pagado'
                                                    ? "bg-muted border-border text-muted-foreground"
                                                    : "bg-primary/10 border-primary/20 text-primary group-hover:bg-primary group-hover:text-white"
                                            )}>
                                                <CreditCard className="w-6 h-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-base truncate pr-4">{item.concept}</h4>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {format(new Date(item.date), "EEEE d 'de' MMMM", { locale: es })}
                                                    </span>
                                                    {new Date(item.date) < currentDate && (item.status !== "✅ Pagado" && item.status !== "Pagado") && (
                                                        <span className="text-red-500 font-bold uppercase tracking-tighter">Vencido</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 shrink-0">
                                            <div className="text-right">
                                                <p className="text-xl font-mono font-bold tracking-tight">
                                                    ${item.amount.toLocaleString()}
                                                </p>
                                                <p className={cn(
                                                    "text-[10px] font-black uppercase tracking-widest",
                                                    item.status === '✅ Pagado' || item.status === 'Pagado' ? "text-emerald-500" : "text-orange-500"
                                                )}>
                                                    {item.status}
                                                </p>
                                            </div>
                                            {!(item.status === '✅ Pagado' || item.status === 'Pagado') && (
                                                <MarkPaidButton rowId={item.id} concept={item.concept} />
                                            )}
                                        </div>
                                    </div>
                                ))}

                            {currentMonthItems.length === 0 && (
                                <div className="py-20 text-center glass-panel rounded-3xl border-dashed border-2">
                                    <PieChart className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                                    <p className="text-muted-foreground font-medium">No hay proyecciones generadas para este mes.</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">Usa el botón de "Generar Mes" en Coda para empezar.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Persistent Action Bar */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
                <div className="glass-panel p-3 rounded-full border-white/10 shadow-2xl flex items-center gap-2 bg-black/40 backdrop-blur-2xl">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                        <Plus className="w-6 h-6" />
                    </div>
                    <input
                        type="text"
                        placeholder="¿Pagué algo hoy? (Ej: Pagué luz)"
                        className="bg-transparent border-none focus:ring-0 text-sm flex-1 placeholder:text-muted-foreground/50 h-full"
                    />
                    <button className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors uppercase tracking-widest">
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
}
