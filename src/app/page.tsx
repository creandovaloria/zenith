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
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
type Role = {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  hex: string;
  question: string;
  description: string;
};

// --- Data: Roles & Rules ---
const ROLES: Record<string, Role> = {
  Monday: {
    id: "architect",
    name: "Arquitecto",
    icon: <Brain className="w-6 h-6" />,
    color: "text-amber-500",
    hex: "#F59E0B",
    question: "¿Qué sistemas diseñaré hoy para el futuro?",
    description: "Diseño de sistemas, planeación táctica y estructuración.",
  },
  Tuesday: {
    id: "sculptor",
    name: "Escultor",
    icon: <Hammer className="w-6 h-6" />,
    color: "text-blue-500",
    hex: "#3B82F6",
    question: "¿Qué obra mestra ejecutaré hoy con excelencia?",
    description: "Ejecución profunda, creación de valor tangible.",
  },
  Wednesday: {
    id: "integrator",
    name: "Integrador",
    icon: <Network className="w-6 h-6" />,
    color: "text-emerald-500",
    hex: "#10B981",
    question: "¿Cómo se conecta esto con aquello?",
    description: "Conexiones, reuniones estratégicas y sinergias.",
  },
  Thursday: {
    id: "analyst",
    name: "Analista",
    icon: <BarChart3 className="w-6 h-6" />,
    color: "text-red-500",
    hex: "#EF4444",
    question: "¿Qué dicen realmente los datos?",
    description: "Revisión de métricas, KPIs y decisiones basadas en datos.",
  },
  Friday: {
    id: "philosopher",
    name: "Filósofo",
    icon: <BookOpen className="w-6 h-6" />,
    color: "text-violet-500",
    hex: "#8B5CF6",
    question: "¿Por qué esto importa realmente?",
    description: "Reflexión profunda, escritura y cuestionamiento.",
  },
  Saturday: {
    id: "explorer",
    name: "Explorador",
    icon: <Compass className="w-6 h-6" />,
    color: "text-cyan-500",
    hex: "#06B6D4",
    question: "¿Qué territorio nuevo descubriré hoy?",
    description: "Aprendizaje, curiosidad y salir de la zona de confort.",
  },
  Sunday: {
    id: "guardian",
    name: "Guardián",
    icon: <Shield className="w-6 h-6" />,
    color: "text-gray-500",
    hex: "#6B7280",
    question: "¿Qué necesito proteger para mantener el equilibrio?",
    description: "Integración, recuperación y protección del sistema.",
  },
};

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [activeRole, setActiveRole] = useState<Role | null>(null);

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    const dayNameEn = format(now, "EEEE"); // "Monday", "Tuesday"...
    setActiveRole(ROLES[dayNameEn] || ROLES["Monday"]);
  }, []);

  if (!currentDate || !activeRole) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Inicializando Zenith OS...</div>;

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
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground border border-border">V1.0</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              {format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>

          <div className="flex items-center gap-6">
            {/* Quick Stats in Header */}
            <div className="hidden md:flex items-center gap-4 text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Systems Online
              </div>
              <div className="h-4 w-px bg-border"></div>
              <span>MVP: FocusFlow</span>
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
                      {React.cloneElement(activeRole.icon as React.ReactElement, { className: "w-8 h-8" })}
                    </div>
                    <div>
                      <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-2 text-white">{activeRole.name}</h2>
                      <p className="text-lg text-muted-foreground font-light">{activeRole.description}</p>
                    </div>
                  </div>

                  <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/50"></div>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Compass className="w-4 h-4" /> Pregunta Guía
                    </p>
                    <p className="text-2xl font-light italic text-white/90 leading-relaxed">"{activeRole.question}"</p>
                  </div>
                </div>

                {/* Right: Morning State (Inputs from Template) */}
                <div className="flex flex-col justify-center space-y-6 p-6 rounded-2xl bg-black/20 border border-white/5 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Battery className="w-4 h-4" /> Estado Matutino
                  </h3>

                  <div className="space-y-5">
                    <SliderInput label="Energía" icon={<Zap className="w-4 h-4 text-yellow-500" />} defaultValue={8} />
                    <SliderInput label="Enfoque" icon={<Focus className="w-4 h-4 text-blue-500" />} defaultValue={7} />
                    <SliderInput label="Motivación" icon={<Flame className="w-4 h-4 text-red-500" />} defaultValue={9} />
                  </div>
                </div>

              </div>
            </div>
          </section>

          <div className="grid lg:grid-cols-3 gap-8">

            {/* SECTION 2: CRITICAL OBJECTIVES & AGENDA */}
            <div className="lg:col-span-2 space-y-6">

              {/* 3 Critical Objectives */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-red-500" />
                    3 Objetivos Críticos
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">1/3 Completado</span>
                </div>

                <div className="space-y-3">
                  <ObjectiveItem text="Definir arquitectura MVP FocusFlow" completed={true} />
                  <ObjectiveItem text="Configurar automatización Coda (Daily Logs)" completed={false} />
                  <ObjectiveItem text="Reunión estratégica con equipo de diseño" completed={false} />
                </div>
              </div>

              {/* Agenda (Simulated from Calendar) */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-500" />
                    Agenda del Día
                  </h3>
                  <button className="text-xs text-primary hover:underline">Sincronizar</button>
                </div>

                <div className="space-y-4 relative">
                  {/* Timeline line */}
                  <div className="absolute left-[5.5rem] top-2 bottom-2 w-px bg-border"></div>

                  <AgendaItem time="06:00" title="Rutina Matutina" duration="1h" type="ritual" />
                  <AgendaItem time="08:00" title="Bloque de Creación: Mission Control UI" duration="2h" type="work" />
                  <AgendaItem time="10:20" title="Revisión de Métricas" duration="1h" type="work" />
                  <AgendaItem time="13:30" title="Almuerzo & Desconexión" duration="1h" type="personal" />
                  <AgendaItem time="16:00" title="Llamada de Validación MVP" duration="30m" type="meeting" />
                </div>
              </div>

            </div>

            {/* SECTION 3: ANTIFRAGILE & FLOW */}
            <div className="space-y-6">

              {/* Antifragile Challenge */}
              <div className="p-6 rounded-2xl border border-border bg-gradient-to-br from-card to-card/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-20 bg-red-500/5 blur-3xl rounded-full pointer-events-none"></div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 relative z-10">
                  <Dumbbell className="w-5 h-5 text-orange-500" />
                  Desafío Antifrágil
                </h3>

                <div className="space-y-4 relative z-10">
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Tipo: Incomodidad Social</span>
                    <p className="font-medium">"Contactar a un potencial cliente por LinkedIn sin dudar."</p>
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

              {/* Flow Tracking Table Mockup */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                  <ArrowRight className="w-5 h-5 text-indigo-500" />
                  Flow Tracking
                </h3>

                <div className="space-y-3">
                  <FlowBlock id={1} time="08:00 - 10:00" score={9} />
                  <FlowBlock id={2} time="10:20 - 12:00" score={null} />
                  <FlowBlock id={3} time="13:30 - 16:00" score={null} />
                  <FlowBlock id={4} time="16:00 - 18:00" score={null} />
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
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
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
        {/* Hover effect mock */}
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

function AgendaItem({ time, title, duration, type }: { time: string; title: string; duration: string; type: "ritual" | "work" | "meeting" | "personal" }) {

  const typeStyles = {
    ritual: "border-l-indigo-500 bg-indigo-500/5",
    work: "border-l-emerald-500 bg-emerald-500/5",
    meeting: "border-l-amber-500 bg-amber-500/5",
    personal: "border-l-rose-500 bg-rose-500/5",
  };

  return (
    <div className="flex gap-6 group">
      <div className="w-16 shrink-0 text-right flex flex-col items-end pt-1">
        <span className="font-mono font-bold text-sm block">{time}</span>
        <span className="text-[10px] text-muted-foreground">{duration}</span>
      </div>

      <div className={cn(
        "flex-1 p-3 rounded-r-lg border-l-2 text-sm transition-all hover:bg-muted/50",
        typeStyles[type]
      )}>
        <p className="font-medium">{title}</p>
      </div>
    </div>
  );
}

function FlowBlock({ id, time, score }: { id: number; time: string; score: number | null }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
          {id}
        </div>
        <span className="text-sm font-mono text-muted-foreground">{time}</span>
      </div>

      {score ? (
        <span className="font-bold text-green-500">{score}/10</span>
      ) : (
        <span className="text-xs text-muted-foreground italic">Pendiente</span>
      )}
    </div>
  );
}
