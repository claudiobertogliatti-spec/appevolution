/**
 * Anteprima Interattiva dal Vivo: Home Area Partner CIAK.
 * Sfondo Bianco Puro (#FFFFFF) con scheda Azione Interattiva:
 * Il partner può Modificare, Aggiungere note/dettagli e poi Approvare.
 */
import React, { useState } from "react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { PianoOperativoWidget } from "../partner/components/PianoOperativoWidget";
import {
  ArrowRight, Clock, Sparkles, ShieldCheck, MessageCircle,
  FileText, Cog, UserCheck, CheckCircle2, Home, Map, FolderOpen, Users, RefreshCw,
  Pencil, PlusCircle, Check, RotateCcw
} from "lucide-react";

export function CiakPartnerDashboardDemo() {
  // Simulatore di stato per la demo: "user_action" vs "team_working" vs "launched"
  const [demoState, setDemoState] = useState("user_action");

  // Stato interattivo per la modifica, aggiunta ed approvazione
  const [isEditing, setIsEditing] = useState(false);
  const [targetValue, setTargetValue] = useState("Professionisti e lavoratori d'ufficio (35-55 anni) affetti da dolori posturali cronici da scrivania.");
  const [promessaValue, setPromessaValue] = useState('"Elimina il mal di schiena da scrivania e ritrova la tua postura corretta in 90 giorni, senza farmaci."');
  const [noteValue, setNoteValue] = useState("");
  const [isApproved, setIsApproved] = useState(false);

  const handleApprove = () => {
    setIsApproved(true);
    setIsEditing(false);
  };

  const handleResetApproval = () => {
    setIsApproved(false);
  };

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
              👤 Azione Utente (Modifica & Approva)
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
        <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8">
          
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
                "Hai dubbi sulle risposte da approvare o vuoi personalizzare la tua offerta? Sono qui per affiancarti."
              </p>
              <button 
                onClick={() => alert("Chat live con Claudio Bertogliatti aperta!")}
                className="w-full py-2.5 bg-slate-950 text-white font-extrabold rounded-xl text-xs hover:bg-slate-800 transition"
              >
                Parla col Tutor →
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT: AZIONE INTERATTIVA (MODIFICA, AGGIUNGI & APPROVA SU SFONDO BIANCO) */}
          <div className="space-y-8">

            {/* 1. SCHERMATA AZIONE UTENTE INTERATTIVA */}
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
                    <span className={`px-3 py-1.5 rounded-xl font-bold border inline-flex items-center gap-1.5 ${
                      isApproved 
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : "bg-amber-50 text-amber-900 border-amber-300"
                    }`}>
                      {isApproved ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <UserCheck className="h-3.5 w-3.5 text-amber-600" />}
                      {isApproved ? "Step Approvato" : "Tua approvazione richiesta"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 leading-tight">
                    {isApproved ? "Posizionamento Strategico Approvato ✓" : "Verifica, Personalizza ed Approva la tua Strategia"}
                  </h1>
                  <p className="text-slate-600 text-base leading-relaxed max-w-3xl">
                    Controlla i dati definiti da Valentina e Claudio per la tua Accademia. Puoi <strong className="text-slate-950 font-bold">modificare i campi</strong>, <strong className="text-slate-950 font-bold">aggiungere dettagli o note personali</strong> e infine confermare.
                  </p>
                </div>

                {/* SCHEDA SINTESI STRATEGICA MODIFICABILE */}
                <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
                        Sintesi Strategica dell'Accademia
                      </span>
                      <h3 className="text-lg font-bold text-slate-950 mt-0.5">Dott. Mario Rossi</h3>
                    </div>

                    {!isApproved && (
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-950 font-bold text-xs hover:bg-slate-100 transition inline-flex items-center gap-2 shadow-sm"
                      >
                        {isEditing ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Pencil className="h-3.5 w-3.5 text-amber-600" />}
                        {isEditing ? "Visualizza Anteprima" : "✏️ Modifica o Aggiungi Dettagli"}
                      </button>
                    )}
                  </div>
                  
                  {/* MODALITÀ LETTURA / ANTEPRIMA */}
                  {!isEditing ? (
                    <div className="space-y-4 text-sm text-slate-800">
                      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">🎯 Target Ideale (ICP)</span>
                        <p className="font-semibold text-slate-900">{targetValue}</p>
                      </div>

                      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">✨ Promessa Unica in 1 Frase</span>
                        <p className="font-medium text-slate-900 italic">{promessaValue}</p>
                      </div>

                      {noteValue && (
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                          <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">📌 Tua Note / Precisazione Aggiunta:</span>
                          <p className="text-xs text-amber-950 font-medium">{noteValue}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* MODALITÀ MODIFICA ED AGGIUNTA CAMPI INLINE */
                    <div className="space-y-5 text-xs">
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-900 block text-xs">
                          🎯 Target Ideale (ICP) — Chi è il tuo studente prioritario?
                        </label>
                        <textarea
                          rows={2}
                          value={targetValue}
                          onChange={(e) => setTargetValue(e.target.value)}
                          className="w-full p-3 rounded-xl bg-white border border-slate-300 text-slate-950 font-medium text-xs focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-900 block text-xs">
                          ✨ Promessa Unica in 1 Frase — Quale risultato garantisci?
                        </label>
                        <textarea
                          rows={2}
                          value={promessaValue}
                          onChange={(e) => setPromessaValue(e.target.value)}
                          className="w-full p-3 rounded-xl bg-white border border-slate-300 text-slate-950 font-medium text-xs focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-200">
                        <label className="font-bold text-amber-800 flex items-center gap-1.5 text-xs">
                          <PlusCircle className="h-4 w-4 text-amber-600" /> Aggiungi una nota o precisazione per il Team CIAK:
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Es. Vorrei enfatizzare che il corso include anche schede d'esercizio stampabili..."
                          value={noteValue}
                          onChange={(e) => setNoteValue(e.target.value)}
                          className="w-full p-3 rounded-xl bg-white border border-amber-300 text-slate-950 font-medium text-xs focus:ring-2 focus:ring-amber-400 outline-none placeholder-slate-400"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* BOTTONI AZIONE APPROVAZIONE */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                  {!isApproved ? (
                    <>
                      <button 
                        onClick={handleApprove}
                        className="w-full sm:w-auto px-8 py-4 bg-yellow-400 text-slate-950 rounded-2xl font-extrabold text-sm shadow-md hover:bg-yellow-300 transition flex items-center justify-center gap-2"
                      >
                        <Check className="h-4 w-4 text-slate-950" />
                        {isEditing || noteValue ? "SALVA MODIFICHE E APPROVA STEP" : "CONFERMA E APPROVA QUESTO STEP"}
                      </button>

                      <span className="text-xs font-medium text-slate-500">
                        💡 Puoi modificare le risposte in qualsiasi momento prima che il team avvii la produzione video.
                      </span>
                    </>
                  ) : (
                    <div className="w-full bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-xs text-emerald-900 font-bold">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <span>Step Approvato con successo! Il Team CIAK sta avviando la Fase 07 (Script Masterclass).</span>
                      </div>
                      <button
                        onClick={handleResetApproval}
                        className="px-4 py-2 bg-white border border-emerald-300 text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-50 transition shrink-0 inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-slate-500" /> Modifica di nuovo
                      </button>
                    </div>
                  )}
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

          </div>

        </div>

      </main>

      <CiakFooter />
    </>
  );
}
