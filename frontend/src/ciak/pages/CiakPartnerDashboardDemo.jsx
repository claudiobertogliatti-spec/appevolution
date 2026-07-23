/**
 * Anteprima Interattiva dal Vivo: Nuovo Command Center Area Partner CIAK (Protocollo EVO).
 * Visualizzazione a 3 Macro-Fasi, Card Focus "Azione di Oggi", Badge "Team CIAK at Work"
 * e Widget Piano Operativo Master.
 */
import React, { useState } from "react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { PianoOperativoWidget } from "../partner/components/PianoOperativoWidget";
import {
  ArrowRight, CheckCircle2, Clock, Sparkles, ShieldCheck, MessageCircle,
  FileText, Award, Lock, Cog, LayoutDashboard, UserCheck, Layers, ChevronRight,
  Home, Map, FolderOpen, Users, RefreshCw
} from "lucide-react";

export function CiakPartnerDashboardDemo() {
  // Simulatore di stato per la demo: "user_action" vs "team_working" vs "launched"
  const [demoState, setDemoState] = useState("user_action");

  return (
    <>
      <CiakHeader />

      <main className="bg-slate-100 min-h-screen py-8 px-4 font-[Poppins,system-ui,sans-serif] text-slate-900">
        
        {/* BARRA SELETTORE DEMO */}
        <div className="max-w-6xl mx-auto mb-6 bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold">
          <span className="text-slate-700 font-bold">Simulatore Stato Partner (Demo UX):</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setDemoState("user_action")}
              className={`px-3.5 py-2 rounded-xl border transition ${
                demoState === "user_action"
                  ? "bg-slate-950 text-yellow-400 border-slate-950 font-bold shadow-md"
                  : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
              }`}
            >
              👤 Azione Utente (Tua Approvazione)
            </button>
            <button
              onClick={() => setDemoState("team_working")}
              className={`px-3.5 py-2 rounded-xl border transition ${
                demoState === "team_working"
                  ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-md"
                  : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
              }`}
            >
              ⚙️ Team CIAK at Work (Al Lavoro)
            </button>
            <button
              onClick={() => setDemoState("launched")}
              className={`px-3.5 py-2 rounded-xl border transition ${
                demoState === "launched"
                  ? "bg-blue-600 text-white border-blue-600 font-bold shadow-md"
                  : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
              }`}
            >
              🚀 Lancio Avvenuto (Master Plan Sbloccato)
            </button>
          </div>
        </div>

        {/* CONTAINER DASHBOARD COMMAND CENTER */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          
          {/* SIDEBAR STRUTTURATA SECONDO SPECIFICA CLAUDIO */}
          <aside className="space-y-4 font-[Poppins,system-ui,sans-serif]">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 block mb-3">
                  Navigazione Principale
                </span>
                <nav className="space-y-1.5">
                  <a href="#home" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-950 text-yellow-400 font-extrabold text-xs shadow-sm">
                    <Home className="h-4 w-4 text-yellow-400" />
                    <span>Home</span>
                  </a>
                  <a href="#percorso" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-xs transition">
                    <Map className="h-4 w-4 text-slate-500" />
                    <span>Percorso</span>
                  </a>
                  <a href="#materiali" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-xs transition">
                    <FolderOpen className="h-4 w-4 text-slate-500" />
                    <span>Materiali</span>
                  </a>
                  <a href="#team" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-xs transition">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span>Team</span>
                  </a>
                </nav>
              </div>

              <div className="pt-5 border-t border-slate-200">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-3">
                  Crescita & Rinnovo
                </span>
                <nav className="space-y-1.5">
                  <a href="#extra" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs shadow-sm">
                    <Sparkles className="h-4 w-4 text-slate-950" />
                    <span>Servizi Extra</span>
                  </a>
                  <a href="#rinnovo" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition">
                    <RefreshCw className="h-4 w-4 text-slate-500" />
                    <span>Rinnovo</span>
                  </a>
                </nav>
              </div>

              {/* PROFILE CARD */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-900 text-yellow-400 font-extrabold flex items-center justify-center text-xs shrink-0">
                  MR
                </div>
                <div className="overflow-hidden">
                  <span className="font-extrabold text-xs text-slate-900 block truncate">Dott. Mario Rossi</span>
                  <span className="text-[11px] text-slate-500 block truncate">Posturologia Integrata</span>
                </div>
              </div>
            </div>

            {/* TUTOR CARD */}
            <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-yellow-400 text-slate-950 font-extrabold flex items-center justify-center text-xs">
                  CB
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Claudio Bertogliatti</span>
                  <span className="text-[10px] text-slate-400">Tutor Umano Assegnato</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                "Hai dubbi sulle risposte da approvare? Sono qui per affiancarti."
              </p>
              <button 
                onClick={() => alert("Chat live con Claudio Bertogliatti aperta!")}
                className="w-full py-2 bg-yellow-400 text-slate-950 font-extrabold rounded-xl text-xs hover:bg-yellow-300 transition"
              >
                Parla col Tutor →
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <div className="space-y-6">

            {/* 1. HERO FOCUS CARD ("L'AZIONE DI OGGI") */}
            {demoState === "user_action" && (
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <span className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400 text-yellow-300 px-3.5 py-1.5 rounded-full text-xs font-extrabold">
                    <Sparkles className="h-3.5 w-3.5 text-yellow-400" /> FASE 06 · POSIZIONAMENTO STRATEGICO
                  </span>
                  <div className="flex items-center gap-4 text-xs text-slate-300">
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-yellow-400" /> ⏱️ Tempo: 3 min</span>
                    <span className="flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5 text-emerald-400" /> 👤 Azione: Tua approvazione</span>
                  </div>
                </div>

                <div className="max-w-2xl space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                    Conferma il tuo Posizionamento Strategico
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Abbiamo definito il tuo target ideale (<span className="text-yellow-300 font-semibold">lavoratori con mal di schiena da scrivania</span>) e la tua promessa unica. Ti bastano 3 minuti per leggere e confermare la bozza.
                  </p>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-white/10">
                  <button 
                    onClick={() => alert("Apertura scheda approvazione Posizionamento!")}
                    className="w-full sm:w-auto px-8 py-4 bg-yellow-400 text-slate-950 rounded-2xl font-extrabold text-sm shadow-xl hover:bg-yellow-300 transition flex items-center justify-center gap-2"
                  >
                    APRI L'AZIONE DI OGGI <ArrowRight className="h-4 w-4 text-slate-950" />
                  </button>
                  <span className="text-xs text-slate-400">
                    💡 Al tuo ok, il Team CIAK inizierà a scrivere lo script della Masterclass.
                  </span>
                </div>
              </div>
            )}

            {/* 2. STATUS BANNER "TEAM CIAK AT WORK" */}
            {demoState === "team_working" && (
              <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-700/50 relative">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400 text-emerald-300 rounded-full font-extrabold text-xs inline-flex items-center gap-2">
                    <Cog className="h-3.5 w-3.5 text-emerald-400 animate-spin" /> TEAM CIAK AL LAVORO
                  </span>
                  <span className="text-xs text-slate-300">FASE 10 · SISTEMA DI VENDITA</span>
                </div>

                <h2 className="text-2xl font-extrabold text-white">
                  Stiamo configurando la tua piattaforma di vendita
                </h2>
                <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  I nostri tecnici stanno montando le lezioni del tuo videocorso e configurando la pagina di cassa Stripe. Non devi fare nulla: ti avviseremo appena la bozza sarà pronta per il collaudo.
                </p>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-3 text-xs text-emerald-300 font-semibold">
                  <ShieldCheck className="h-4 w-4" /> Nessuna azione richiesta al momento · Lavoro in carico al Team CIAK
                </div>
              </div>
            )}

            {/* 3. STATUS LANCIO AVVENUTO */}
            {demoState === "launched" && (
              <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-700/50">
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs mb-2">
                  <Sparkles className="h-4 w-4" /> CONGRATULAZIONI!
                </div>
                <h2 className="text-3xl font-extrabold text-white">
                  La tua Accademia Digitale è Ufficialmente ONLINE 🚀
                </h2>
                <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  Tutti i 14 step del Protocollo EVO sono stati completati con successo. Il tuo Piano Operativo Strategico completo è ora sbloccato e scaricabile in formato PDF Master.
                </p>
              </div>
            )}

            {/* MAPPA VISIVA A 3 MACRO-FASI */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">
                    Percorso Guidato
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-950 mt-0.5">
                    Le 3 Macro-Fasi del Protocollo EVO
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Avanzamento Globale: {demoState === "launched" ? "14/14 (100%)" : "6/14 Step"}
                </span>
              </div>

              {/* GRIGLIA A 3 MACRO-FASI */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* MACRO FASE 1: ESAMINA */}
                <div className="p-5 rounded-2xl border border-emerald-300 bg-gradient-to-b from-emerald-50/60 to-white relative flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">🎯</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                        ✓ Completata (6/6)
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-950 text-base">1. ESAMINA</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Chi sei, a chi parli e la tua offerta unica scolpita nel Brand Kit.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-emerald-700">
                    <span>Certificato Rilasciato</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>

                {/* MACRO FASE 2: VALIDA */}
                <div className={`p-5 rounded-2xl border relative flex flex-col justify-between ${
                  demoState === "launched"
                    ? "border-emerald-300 bg-gradient-to-b from-emerald-50/60 to-white"
                    : "border-amber-300 bg-gradient-to-b from-yellow-50/60 to-white"
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">🚀</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] ${
                        demoState === "launched" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900 animate-pulse"
                      }`}>
                        {demoState === "launched" ? "✓ Completata (7/7)" : "▶ In Corso (1/7)"}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-950 text-base">2. VALIDA</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Masterclass, videocorsi, checkout e sistema di vendita pronti.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>{demoState === "launched" ? "Pronto al 100%" : "In Lavorazione"}</span>
                    <ChevronRight className="h-4 w-4 text-amber-600" />
                  </div>
                </div>

                {/* MACRO FASE 3: OTTIMIZZA */}
                <div className={`p-5 rounded-2xl border relative flex flex-col justify-between ${
                  demoState === "launched"
                    ? "border-blue-300 bg-gradient-to-b from-blue-50/60 to-white"
                    : "border-slate-200 bg-slate-50 opacity-70"
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">📈</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-extrabold text-[11px]">
                        {demoState === "launched" ? "▶ Attiva su Dati Reali" : "🔒 Post-Lancio"}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-950 text-base">3. OTTIMIZZA</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Miglioriamo su dati reali di vendita e creiamo il tuo Caso Studio.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>{demoState === "launched" ? "Tracciamento Attivo" : "Sblocco al Lancio"}</span>
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

              </div>
            </div>

            {/* WIDGET PIANO OPERATIVO MASTER & CERTIFICATI */}
            <div id="piano-master">
              <PianoOperativoWidget 
                partnerId="demo_mario_rossi" 
                partnerName="Dott. Mario Rossi" 
              />
            </div>

          </div>

        </div>

      </main>

      <CiakFooter />
    </>
  );
}
