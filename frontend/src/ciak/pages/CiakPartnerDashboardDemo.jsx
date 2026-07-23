/**
 * Anteprima Interattiva dal Vivo: Home Area Partner CIAK.
 * Layout su Sfondo Bianco Puro (#FFFFFF), focalizzato al 100% solo sull'Azione da Fare,
 * senza sezioni "Percorso Guidato" o "Protocollo EVO".
 */
import React, { useState } from "react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { PartnerSidebar } from "../partner/PartnerSidebar";
import { PianoOperativoWidget } from "../partner/components/PianoOperativoWidget";
import {
  ArrowRight, Clock, Sparkles, ShieldCheck, MessageCircle,
  FileText, Cog, UserCheck, CheckCircle2, Home, Map, FolderOpen, Users, RefreshCw
} from "lucide-react";

export function CiakPartnerDashboardDemo() {
  // Simulatore di stato per la demo: "user_action" vs "team_working" vs "launched"
  const [demoState, setDemoState] = useState("user_action");

  return (
    <>
      <CiakHeader />

      <main className="bg-white min-h-screen py-8 px-4 font-[Poppins,system-ui,sans-serif] text-slate-900 border-t border-slate-100">
        
        {/* BARRA SELETTORE DEMO */}
        <div className="max-w-6xl mx-auto mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold">
          <span className="text-slate-700 font-bold">Simulatore Stato Partner (Demo UX):</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setDemoState("user_action")}
              className={`px-3.5 py-2 rounded-xl border transition ${
                demoState === "user_action"
                  ? "bg-slate-950 text-yellow-400 border-slate-950 font-bold shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              👤 Azione Utente (Tua Approvazione)
            </button>
            <button
              onClick={() => setDemoState("team_working")}
              className={`px-3.5 py-2 rounded-xl border transition ${
                demoState === "team_working"
                  ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              ⚙️ Team CIAK at Work (Al Lavoro)
            </button>
            <button
              onClick={() => setDemoState("launched")}
              className={`px-3.5 py-2 rounded-xl border transition ${
                demoState === "launched"
                  ? "bg-amber-400 text-slate-950 border-amber-400 font-extrabold shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              🚀 Lancio Avvenuto (Online)
            </button>
          </div>
        </div>

        {/* CONTAINER DASHBOARD SFONDO BIANCO */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8">
          
          {/* SIDEBAR CON LE 2 SEZIONI ESATTE DI CLAUDIO */}
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

            {/* TUTOR CARD BIANCA */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-yellow-400 text-slate-950 font-extrabold flex items-center justify-center text-xs border border-yellow-300">
                  CB
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Claudio Bertogliatti</span>
                  <span className="text-[10px] text-slate-500">Tutor Umano Assegnato</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                "Hai dubbi sulle risposte da approvare? Sono qui per affiancarti."
              </p>
              <button 
                onClick={() => alert("Chat live con Claudio Bertogliatti aperta!")}
                className="w-full py-2.5 bg-slate-950 text-white font-extrabold rounded-xl text-xs hover:bg-slate-800 transition"
              >
                Parla col Tutor →
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT: SOLO L'AZIONE DA FARE SU SFONDO BIANCO */}
          <div className="space-y-8">

            {/* 1. SCHERMATA AZIONE UTENTE (PURA SU BIANCO) */}
            {demoState === "user_action" && (
              <div className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-slate-200 shadow-lg space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 bg-yellow-100 border border-yellow-300 text-slate-950 px-4 py-1.5 rounded-full text-xs font-extrabold w-max">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" /> FASE 06 · POSIZIONAMENTO STRATEGICO
                  </span>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-600" /> Tempo stimato: 3 min
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 inline-flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Tua approvazione
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 leading-tight">
                    Conferma il tuo Posizionamento Strategico
                  </h1>
                  <p className="text-slate-600 text-base leading-relaxed max-w-3xl">
                    Abbiamo definito il tuo target ideale (<strong className="text-slate-950 font-bold">lavoratori d'ufficio con mal di schiena da scrivania</strong>) e la tua promessa unica. Ti bastano 3 minuti per leggere e confermare la bozza strategica prodotta da Valentina.
                  </p>
                </div>

                {/* SCHEDA SINTESI STRATEGICA APPROVAZIONE */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Sintesi Strategica di Mario Rossi</span>
                    <span className="text-xs font-bold text-amber-600">Pronta da Approvare</span>
                  </div>
                  
                  <div className="grid gap-3 text-xs text-slate-700">
                    <p><strong>🎯 Target Ideale (ICP):</strong> Professionisti 35-55 anni affetti da dolori posturali cronici da scrivania.</p>
                    <p><strong>✨ Promessa Unica:</strong> <em>"Elimina il mal di schiena da scrivania e ritrova la tua postura corretta in 90 giorni, senza farmaci."</em></p>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                  <button 
                    onClick={() => alert("Posizionamento confermato ed approvato con successo!")}
                    className="w-full sm:w-auto px-8 py-4 bg-yellow-400 text-slate-950 rounded-2xl font-extrabold text-sm shadow-md hover:bg-yellow-300 transition flex items-center justify-center gap-2"
                  >
                    CONFERMA E APPROVA QUESTO STEP <ArrowRight className="h-4 w-4 text-slate-950" />
                  </button>
                  <span className="text-xs font-medium text-slate-500">
                    💡 Appena confermi, il Team CIAK inizierà a scrivere lo script della tua Masterclass.
                  </span>
                </div>

              </div>
            )}

            {/* 2. SCHERMATA "TEAM CIAK AL LAVORO" (SU BIANCO) */}
            {demoState === "team_working" && (
              <div className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-emerald-300 shadow-lg space-y-6">
                
                <div className="flex items-center gap-3">
                  <span className="px-3.5 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-full font-extrabold text-xs inline-flex items-center gap-2">
                    <Cog className="h-4 w-4 text-emerald-700 animate-spin" /> TEAM CIAK AL LAVORO
                  </span>
                  <span className="text-xs font-bold text-slate-500">FASE 10 · SISTEMA DI VENDITA</span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-extrabold text-slate-950">
                    Stiamo configurando la tua piattaforma di vendita
                  </h1>
                  <p className="text-slate-600 text-base leading-relaxed max-w-2xl">
                    I nostri tecnici stanno montando le lezioni del tuo videocorso e configurando la pagina di cassa Stripe. <strong className="text-slate-950">Non devi fare nulla</strong>: ti avviseremo appena la bozza sarà pronta per il tuo collaudo.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900 font-bold">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>Nessuna azione richiesta a te al momento · Lavoro 100% in carico al Team CIAK</span>
                </div>

              </div>
            )}

            {/* 3. SCHERMATA "LANCIO AVVENUTO" (SU BIANCO) */}
            {demoState === "launched" && (
              <div className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-yellow-400 shadow-lg space-y-6">
                <span className="px-3.5 py-1.5 bg-yellow-100 border border-yellow-300 text-slate-950 rounded-full font-extrabold text-xs inline-flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-600" /> CONGRATULAZIONI!
                </span>

                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950">
                    La tua Accademia Digitale è ONLINE 🚀
                  </h1>
                  <p className="text-slate-600 text-base leading-relaxed max-w-2xl">
                    Tutti i 14 step del Protocollo EVO sono stati completati con successo. Il tuo Piano Operativo Strategico completo è ora sbloccato e scaricabile in formato PDF Master.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-yellow-50 border border-yellow-300 flex items-center gap-3 text-xs text-slate-950 font-bold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>Piattaforma di Vendita & Videocorsi Attivi e Pronti a Ricevere Studenti</span>
                </div>
              </div>
            )}

            {/* WIDGET PIANO OPERATIVO MASTER */}
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
