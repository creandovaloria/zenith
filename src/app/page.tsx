"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Brain,
  Hammer,
  Network,
  BarChart3,
  BookOpen,
  Compass,
  Shield,
  Calendar as CalendarIcon,
  LayoutDashboard,
  Settings,
  Zap,
  Target,
  Battery,
  Flame,
  Focus,
  Dumbbell,
  CheckSquare,
  Clock,
  ArrowRight,
  Sunrise,
  Sunset,
  Coffee
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
type Role = {
  id: string;
  name: string;
  focus: string; // e.g. "Profundidad Extrema"
  icon: React.ReactNode;
  color: string;
  hex: string;
  question: string;
  description: string;
};

// --- Data: Roles & Rules (Updated with Optimized Agenda) ---
const ROLES: Record<string, Role> = {
  Monday: {
    id: "architect",
    name: "Arquitecto",
    focus: "Profundidad Extrema",
    icon: <Brain className="w-6 h-6" />,
    color: "text-amber-500",
    hex: "#F59E0B",
    question: "¿Qué sistemas diseñaré hoy para el futuro?",
    description: "MVP activo, trabajo duro analítico y de ejecución.",
  },
  Tuesday: {
    id: "sculptor",
    name: "Escultor",
    focus: "Ejecución Acelerada",
    icon: <Hammer className="w-6 h-6" />,
    color: "text-blue-500",
    hex: "#3B82F6",
    question: "¿Qué obra maestra ejecutaré hoy con excelencia?",
    description: "Integración, performance y creatividad técnica.",
  },
  Wednesday: {
    id: "integrator",
    name: "Integrador",
    focus: "Sinergias & Watercooler",
    icon: <Network className="w-6 h-6" />,
    color: "text-emerald-500",
    hex: "#10B981",
    question: "¿Cómo se conecta esto con aquello?",
    description: "Creación profunda matutina + creatividad abierta vespertina.",
  },
  Thursday: {
    id: "analyst",
    name: "Analista",
    focus: "Admin & Métricas",
    icon: <BarChart3 className="w-6 h-6" />,
    color: "text-red-500",
    hex: "#EF4444",
    question: "¿Qué dicen realmente los datos?",
    description: "Finanzas, correos, dashboards y decisiones de portafolio.",
  },
  Friday: {
    id: "philosopher",
    name: "Filósofo",
    focus: "Revisión & Planificación",
    icon: <BookOpen className="w-6 h-6" />,
    color: "text-violet-500",
    hex: "#8B5CF6",
    question: "¿Por qué esto importa realmente?",
    description: "Weekly Review GTD, Post-mortem y Planificación.",
  },
  Saturday: {
    id: "explorer",
    name: "Explorador",
    focus: "Descanso Activo",
    icon: <Compass className="w-6 h-6" />,
    color: "text-cyan-500",
    hex: "#06B6D4",
    question: "¿Qué territorio nuevo descubriré hoy?",
    description: "Consumo dirigido, naturaleza y hobbies.",
  },
  Sunday: {
    id: "guardian",
    name: "Guardián",
    focus: "Reflexión & Preparación",
    icon: <Shield className="w-6 h-6" />,
    color: "text-gray-500",
    hex: "#6B7280",
    question: "¿Qué necesito proteger para mantener el equilibrio?",
    description: "Journaling, objetivos mensuales y logística.",
  },
};

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [activeRole, setActiveRole] = useState<Role | null>(null);

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    const dayNameEn = format(now, "EEEE");
    setActiveRole(ROLES[dayNameEn] || ROLES["Monday"]);
  }, []);

  if (!currentDate || !activeRole) return <div className="min-h-screen flex items-center justify-center text-muted-foreground bg-black">Inicializando Zenith OS...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary/30">
      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col fixed h-full z-20 transition-all duration-300">
        <div className="p-6 border-b border-border flex items-center gap-3 justify-center lg:justify-start">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <span className="font-bold text-white text-xl">Z</span>
          </div>
          <div className="hidden lg:block">
            <span className="font-bold text-xl tracking-tight block">ZENITH</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">OS 2026</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem icon={<LayoutDashboard />} label="Mission Control" active />
          <NavItem icon={<CheckSquare />} label="Daily Logs" />
          <NavItem icon={<Zap />} label="Automatizaciones" />
          <NavItem icon={<BarChart3 />} label="Métricas" />
          <NavItem icon={<BookOpen />} label="Biblioteca" />
        </nav>

        <div className="p-4 border-t border-border">
          <NavItem icon={<Settings />} label="Configuración" />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-20 lg:ml-64 transition-all duration-300">

        {/* Header containing Date and Context */}
        <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-background/80 backdrop-blur-md sticky top-0 z-10 supports-[backdrop-filter]:bg-background/60">
          <div>
            <h1 className="font-semibold text-lg flex items-center gap-2">
              Mission Control
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground border border-border">V1.2</span>
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              {format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              <span className="w-1 h-1 rounded-full bg-muted-foreground"></span>
              <span className="uppercase tracking-wider font-medium text-primary">{activeRole.focus}</span>
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 text-xs font-medium text-muted-foreground">
              {/* Simulated Biometrics from Apple Watch */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10" title="Datos sincronizados de Apple Health">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-foreground">HRV: 92ms</span>
                <span className="text-muted-foreground/50">|</span>
                <span className="text-foreground">Sleep: 7h 45m</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-white/10 ring-2 ring-transparent hover:ring-primary/50 transition-all cursor-pointer"></div>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10 pb-20">

          {/* SECTION 1: IDENTITY & ROLE (Hero) */}
          <section className="relative group">
            <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-r blur-3xl rounded-3xl -z-10 transition-all duration-1000", `from-${activeRole.color.split('-')[1]}-900/50 to-transparent`)}></div>

            <div className="glass-panel rounded-3xl p-8 lg:p-10 border-white/5 relative overflow-hidden">
              {/* Ambient Glow */}
              <div className={cn("absolute top-0 right-0 w-96 h-96 bg-gradient-to-br opacity-10 blur-[100px] rounded-full pointer-events-none", `from-${activeRole.color.split('-')[1]}-500`)}></div>

              <div className="grid md:grid-cols-3 gap-8 relative z-10">

                {/* Left: Role Info */}
                <div className="md:col-span-2 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium uppercase tracking-wider mb-2">
                    <span className={cn("w-1.5 h-1.5 rounded-full", activeRole.color.replace('text-', 'bg-'))}></span>
                    Identidad del Día
                  </div>

                  <div className="flex items-start gap-6">
                    <div className={cn("p-4 rounded-2xl bg-white/5 border border-white/10 shadow-2xl", activeRole.color)}>
                      {React.cloneElement(activeRole.icon as React.ReactElement<{ className?: string }>, { className: "w-8 h-8" })}
                    </div>
                    <div>
                      <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-2 text-white">{activeRole.name}</h2>
                      <div className="flex flex-col gap-1">
                        <span className="text-lg font-medium text-white/90">{activeRole.focus}</span>
                        <p className="text-sm text-muted-foreground font-light">{activeRole.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden group/quote hover:bg-white/10 transition-colors cursor-default">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/50"></div>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Compass className="w-4 h-4" /> Pregunta Guía
                    </p>
                    <p className="text-xl md:text-2xl font-light italic text-white/90 leading-relaxed">"{activeRole.question}"</p>
                  </div>
                </div>

                {/* Right: Morning State (Inputs from Template) */}
                <div className="flex flex-col justify-center space-y-6 p-6 rounded-2xl bg-black/20 border border-white/5 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Battery className="w-4 h-4" /> Estado Matutino
                  </h3>

                  <div className="space-y-5">
                    <SliderInput label="Energía Biológica" icon={<Zap className="w-4 h-4 text-yellow-500" />} defaultValue={9} />
                    <SliderInput label="Enfoque Mental" icon={<Focus className="w-4 h-4 text-blue-500" />} defaultValue={8} />
                    <SliderInput label="Motivación Emocional" icon={<Flame className="w-4 h-4 text-red-500" />} defaultValue={9} />
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                      <span>Readiness Score</span>
                      <span className="text-green-400 font-bold">OPTIMAL</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-[95%] rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>

          <div className="grid lg:grid-cols-3 gap-8">

            {/* SECTION 2: CRITICAL OBJECTIVES & CIRCADIAN AGENDA */}
            <div className="lg:col-span-2 space-y-8">

              {/* 3 Critical Objectives */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-red-500" />
                    3 Objetivos Críticos
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">Prioridad Absoluta</span>
                </div>

                <div className="space-y-3">
                  <ObjectiveItem text="Bloque 1: Desarrollo MVP (Tarea Compleja)" completed={false} />
                  <ObjectiveItem text="Bloque 2: Testing & QA (Sin context switching)" completed={false} />
                  <ObjectiveItem text="Validación: 2 Entrevistas de usuario" completed={false} />
                </div>
              </div>

              {/* Circadian Agenda - Optimized for Rhythms */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2 px-1">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Agenda Circadiana
                </h3>

                {/* Morning Ritual Phase */}
                <PhaseCard
                  title="Ritual Matutino (Cimiento)"
                  time="05:00 - 07:50"
                  icon={<Sunrise className="w-5 h-5 text-orange-400" />}
                  intent="Preparación Física, Mental y Espiritual"
                  items={[
                    "5:00 - Despertar + Agua con Limón",
                    "5:15 - Meditación Vipassana (15m)",
                    "5:45 - HIIT + Caminata con Liz",
                    "7:40 - Ducha Fría Tim Ferriss"
                  ]}
                  isActive={false}
                />

                {/* Deep Work Phase (Peak) */}
                <PhaseCard
                  title="Bloque de Creación Profunda (PICO)"
                  time="07:50 - 12:50"
                  icon={<Brain className="w-5 h-5 text-indigo-400" />}
                  intent="Máxima Alerta Analítica - Modo Avión"
                  items={[
                    "7:50 - Daily Standup Personal",
                    "8:05 - Bloque #1: Desarrollo MVP (90m)",
                    "9:45 - Break Estratégico (Caminata/Sol)",
                    "10:00 - Bloque #2: Desarrollo MVP (110m)"
                  ]}
                  variant="peak"
                  isActive={true} // Putting this active for demo purposes
                />

                {/* Admin/Recovery Phase (Trough/Recovery) */}
                <PhaseCard
                  title="Almuerzo & Validación (VALLE/RECUPERACIÓN)"
                  time="12:50 - 17:00"
                  icon={<Coffee className="w-5 h-5 text-emerald-400" />}
                  intent="Nutrición, Siesta y Tareas Sociales"
                  items={[
                    "12:50 - Almuerzo Consciente + 20m Siesta",
                    "14:00 - Validación & Networking",
                    "15:00 - Aprendizaje Dirigido",
                    "16:00 - Entrevistas Usuarios"
                  ]}
                  isActive={false}
                />

                {/* Evening Ritual Phase */}
                <PhaseCard
                  title="Cierre & Vida (Desconexión)"
                  time="17:00 - 22:00"
                  icon={<Sunset className="w-5 h-5 text-slate-400" />}
                  intent="Revisión, Familia y Descanso"
                  items={[
                    "17:00 - Revisión Diaria & Planificación Mañana",
                    "18:00 - Vida: Familia, Hobbies (Modo Off)",
                    "22:00 - Dormir (7-8h)"
                  ]}
                  isActive={false}
                />
              </div>
            </div>

            {/* SECTION 3: ANTIFRAGILE & TRACKING */}
            <div className="space-y-6">

              {/* Antifragile Challenge */}
              <div className="p-6 rounded-2xl border border-border bg-gradient-to-br from-card to-card/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-20 bg-orange-500/5 blur-3xl rounded-full pointer-events-none"></div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 relative z-10">
                  <Dumbbell className="w-5 h-5 text-orange-500" />
                  Desafío Antifrágil
                </h3>

                <div className="space-y-4 relative z-10">
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Tipo: Incomodidad Social</span>
                    <p className="font-medium text-sm">"Contactar a un potencial cliente por LinkedIn sin dudar."</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>Dificultad Percibida</span>
                      <span>7/10</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 w-[70%] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flow Tracking Table */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                  <ArrowRight className="w-5 h-5 text-indigo-500" />
                  Flow Tracking
                </h3>

                <div className="space-y-3">
                  <FlowBlock id={1} label="Bloque 1 (MVP)" time="08:05" score={null} />
                  <FlowBlock id={2} label="Bloque 2 (MVP)" time="10:00" score={null} />
                  <FlowBlock id={3} label="Validación" time="14:00" score={null} />
                  <FlowBlock id={4} label="Aprendizaje" time="15:00" score={null} />
                </div>
              </div>

              {/* Metrics Mini-Dashboard */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Métricas en Tiempo Real</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">MVP Cycle Time</div>
                    <div className="font-mono text-lg font-bold">12d</div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">Deep Work (Semana)</div>
                    <div className="font-mono text-lg font-bold">18h</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// --- Sub-Components ---

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      className={cn(
        "hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
        active
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <div className={cn("transition-transform group-hover:scale-110", active ? "" : "opacity-70")}>
        {React.cloneElement(icon as React.ReactElement<{ size?: number; className?: string }>, { size: 18 })}
      </div>
      <span>{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-50"></div>}
    </button>
  );
}

function SliderInput({ label, icon, defaultValue }: { label: string; icon: React.ReactNode; defaultValue: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">{icon} {label}</span>
        <span className="font-mono font-bold">{defaultValue}/10</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden relative group cursor-pointer">
        <div
          className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full relative"
          style={{ width: `${defaultValue * 10}%` }}
        ></div>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 transition-opacity"></div>
      </div>
    </div>
  );
}

function ObjectiveItem({ text, completed }: { text: string; completed: boolean }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group cursor-pointer border border-transparent hover:border-border/50">
      <div className={cn(
        "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
        completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 group-hover:border-primary/50"
      )}>
        {completed && <CheckSquare className="w-3.5 h-3.5" />}
      </div>
      <p className={cn("text-sm leading-relaxed", completed && "text-muted-foreground line-through")}>{text}</p>
    </div>
  );
}

function PhaseCard({ title, time, icon, intent, items, variant = "neural", isActive = false }: { title: string; time: string; icon: React.ReactNode; intent: string; items: string[]; variant?: "neural" | "peak"; isActive: boolean }) {
  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-300 relative overflow-hidden",
      isActive
        ? "bg-card border-primary/50 ring-1 ring-primary/20 shadow-lg"
        : "bg-card/50 border-border hover:bg-card hover:border-border/80 opacity-70 hover:opacity-100"
    )}>
      {isActive && <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>}

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-muted", isActive && "bg-primary/10 text-primary")}>
              {icon}
            </div>
            <div>
              <h4 className={cn("font-semibold text-sm", isActive && "text-primary")}>{title}</h4>
              <span className="text-xs font-mono text-muted-foreground">{time}</span>
            </div>
          </div>
          {isActive && <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary px-2 py-1 rounded-full animate-pulse">En Curso</span>}
        </div>

        <p className="text-xs text-muted-foreground italic mb-4 border-l-2 border-border pl-2">"{intent}"</p>

        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm flex items-start gap-2 text-foreground/80">
              <span className="w-1.5 h-1.5 rounded-full bg-border mt-1.5 shrink-0"></span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FlowBlock({ id, label, time, score }: { id: number; label: string; time: string; score: number | null }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
          {id}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs font-mono text-muted-foreground">{time}</span>
        </div>
      </div>

      {score ? (
        <span className="font-bold text-green-500">{score}/10</span>
      ) : (
        <button className="text-xs px-2 py-1 bg-muted rounded border border-white/5 hover:bg-white/10 transition-colors">
          Registrar
        </button>
      )}
    </div>
  );
}
