import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, Clock, Sparkles, ShieldCheck,
  FileText, Award, Lock, Eye, Pencil, ChevronRight, Layers, Check
} from "lucide-react";
import { PianoOperativoWidget } from "../components/PianoOperativoWidget";
import { useJourneyState } from "../operativo/hooks/useJourneyState";

// Definizione completa dei 14 Step EVO raggruppati nelle 3 Macro-Fasi
const PERCORSO_MACRO_PHASES = [
  {
    id: "esamina",
    number: "1",
    label: "ESAMINA",
    icon: "🎯",
    headline: "Identità, Posizionamento & Brand Kit",
    description: "Chi sei, a chi ti rivolgi e la tua promessa unica sul mercato.",
    certificateKey: "esamina",
    steps: [
      { id: "01-contratto", code: "STEP 01", title: "Contratto & Distinta d'Ingresso", desc: "Attivazione partnership e dati iniziali.", status: "done" },
      { id: "02-discovery-video", code: "STEP 02", title: "Video di Benvenuto & Visione", desc: "Introduzione operativa con Claudio Bertogliatti.", status: "done" },
      { id: "burocrazia", code: "STEP 03", title: "Dati Burocratici & Aziendali", desc: "Anagrafica fiscale e diciture di fatturazione.", status: "done" },
      { id: "03-brand-kit", code: "STEP 04", title: "Brand Kit & Identità Visiva", desc: "Colori ufficiali, logo e font dell'Accademia.", status: "done" },
      { id: "la-tua-storia", code: "STEP 05", title: "La Tua Storia & Mission", desc: "Il tuo percorso personale come leva di fiducia.", status: "done" },
      { id: "04-posizionamento", code: "STEP 06", title: "Posizionamento Strategico", desc: "Target ideale (ICP), promessa e angoli d'attacco.", status: "in_progress" },
    ]
  },
  {
    id: "valida",
    number: "2",
    label: "VALIDA",
    icon: "🚀",
    headline: "Produzione Masterclass, Videocorsi & Funnel",
    description: "Creazione degli script, registrazione lezioni e setup del sistema di vendita.",
    certificateKey: "valida",
    steps: [
      { id: "05-script-masterclass", code: "STEP 07", title: "Script Masterclass Strategica", desc: "Copywriting persuasivo per la tua lezione di vendita.", status: "todo" },
      { id: "06-outline-lezioni", code: "STEP 08", title: "Outline Lezioni Videocorso", desc: "Struttura modulare dei contenuti dell'Accademia.", status: "todo" },
      { id: "07-script-videolezioni", code: "STEP 09", title: "Script & Teleprompter Videolezioni", desc: "Tracce guida per la registrazione dei moduli.", status: "todo" },
      { id: "08-registra-masterclass", code: "STEP 10", title: "Registrazione Masterclass", desc: "Ripresa o registrazione guidata con teleprompter.", status: "todo" },
      { id: "09-registra-lezioni", code: "STEP 11", title: "Registrazione Moduli Corso", desc: "Caricamento lezioni video nella tua accademia.", status: "todo" },
      { id: "10-sistema-vendita", code: "STEP 12", title: "Funnel, Subaccount & Cassa Stripe", desc: "Pagine web, checkout e automazione accessi.", status: "todo" },
      { id: "11-calendario-30gg", code: "STEP 13", title: "Calendario Lancio 30 Giorni", desc: "Strategia di acquisizione lead ed e-mail sequence.", status: "todo" },
    ]
  },
  {
    id: "ottimizza",
    number: "3",
    label: "OTTIMIZZA",
    icon: "📈",
    headline: "Lancio Ufficiale, Scaling & Caso Studio",
    description: "Analisi dati di conversione, ottimizzazione campagne ed espansione.",
    certificateKey: null,
    steps: [
      { id: "13-lancio", code: "STEP 14", title: "Lancio Ufficiale & Vendite Live", desc: "Apertura carrello ed affiancamento post-lancio.", status: "todo" },
    ]
  }
];

export function MetodoEvoPage({ partnerId }) {
  const { state } = useJourneyState(partnerId);
  const [selectedStepModal, setSelectedStepModal] = useState(null);

  // Calcolo avanzamento
  const completedCount = state?.completed_count || 5;
  const totalSteps = 14;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-white font-[Poppins,system-ui,sans-serif] text-slate-900 pb-16">
      
      {/* HEADER PAGINA PERCORSO */}
      <header className="border-b border-slate-200 bg-white py-10 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">
                Protocollo EVO™ · Mappa Completa
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-1">
                Il Tuo Percorso Strategico
              </h1>
            </div>

            {/* AVANZAMENTO GLOBALE BAR */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-[240px]">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span>Avanzamento Globale</span>
                <span className="text-amber-600 font-extrabold">{completedCount}/{totalSteps} Step ({progressPercent}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
            In questa sezione trovi l'intera architettura del tuo progetto lungo le 14 Fasi. Puoi ispezionare le informazioni già approvate, rivedere i tuoi materiali o scaricare il Master Plan ed i Certificati di Fase.
          </p>
        </div>
      </header>

      {/* BODY CONTENT */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-10">

        {/* 3 BANNER PANORAMICI SOVRAPPOSTI PER SPIEGARE LA LOGICA DI COSTRUZIONE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">
              Logica di Costruzione del Protocollo EVO™
            </span>
            <span className="text-xs font-semibold text-slate-500">Panoramica a 3 Fasi</span>
          </div>

          {/* BANNER 1: ESAMINA */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="px-3.5 py-1 rounded-full bg-yellow-100 text-slate-950 font-extrabold text-xs border border-yellow-300 w-max inline-flex items-center gap-1.5">
                <span>🎯</span> 1. ESAMINA · ARCHITETTURA & STRATEGIA
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">Step 01 - 06</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-950">
              1. Definizione dell'Offerta, del Target e del Posizionamento Unico
            </h3>

            <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
              In questa prima fase poniamo le fondamenta del tuo progetto. Con l'affiancamento del team, definiamo esattamente chi è il tuo studente ideale, qual è la tua promessa differenziante sul mercato e strutturiamo il tuo Brand Kit ufficiale.
            </p>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
              <span className="px-3 py-1 bg-slate-100 rounded-lg">✓ Posizionamento Strategico Validato</span>
              <span className="px-3 py-1 bg-slate-100 rounded-lg">✓ Brand Kit & Colori Ufficiali</span>
              <span className="px-3 py-1 bg-slate-100 rounded-lg">✓ Messaggio Differenziante</span>
            </div>
          </div>

          {/* BANNER 2: VALIDA */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-950 font-extrabold text-xs border border-emerald-300 w-max inline-flex items-center gap-1.5">
                <span>🚀</span> 2. VALIDA · PRODUZIONE & STRUTTURA
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">Step 07 - 13</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-950">
              2. Costruzione della Masterclass, del Videocorso e del Sistema di Vendita
            </h3>

            <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
              Trasformiamo la tua competenza in prodotti digitali ad alto valore. Il Team CIAK redige gli script della Masterclass e delle lezioni, ti supporta durante le registrazioni e configura l'intera infrastruttura web (funnel, checkout Stripe e automazioni accessi).
            </p>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
              <span className="px-3 py-1 bg-slate-100 rounded-lg">✓ Script Masterclass & Teleprompter</span>
              <span className="px-3 py-1 bg-slate-100 rounded-lg">✓ Videocorso & Piattaforma Moduli</span>
              <span className="px-3 py-1 bg-slate-100 rounded-lg">✓ Funnel & Pagina di Cassa Stripe</span>
            </div>
          </div>

          {/* BANNER 3: OTTIMIZZA */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="px-3.5 py-1 rounded-full bg-blue-100 text-blue-950 font-extrabold text-xs border border-blue-300 w-max inline-flex items-center gap-1.5">
                <span>📈</span> 3. OTTIMIZZA · SCALING & CASO STUDIO
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">Step 14+</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-950">
              3. Lancio Ufficialmente Online, Raccolta Dati e Scaling delle Vendite
            </h3>

            <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
              Apriamo le vendite sul mercato e tracciiamo il comportamento dei primi clienti reali. Sulla base dei numeri prodotti, ottimizziamo continuamente i flussi di conversione e documentiamo l'evoluzione del tuo progetto all'interno del tuo Caso Studio ufficiale.
            </p>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
              <span className="px-3 py-1 bg-slate-100 rounded-lg">✓ Carrello & Vendite Attive</span>
              <span className="px-3 py-1 bg-slate-100 rounded-lg">✓ Ottimizzazione Tassi di Conversione</span>
              <span className="px-3 py-1 bg-slate-100 rounded-lg">✓ Caso Studio Ufficiale Partner</span>
            </div>
          </div>
        </div>

        {/* 1. WIDGET MASTER PLAN & CERTIFICATI */}
        <PianoOperativoWidget partnerId={partnerId} partnerName={state?.partner_name || "Partner CIAK"} />

        {/* 2. LE 3 MACRO-FASI DETTAGLIATE */}
        <div className="space-y-10">
          {PERCORSO_MACRO_PHASES.map((macro) => (
            <section key={macro.id} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              
              {/* TESTATA MACRO FASE */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{macro.icon}</span>
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600 block">
                      MACRO-FASE {macro.number}
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-950 mt-0.5">
                      {macro.label} — {macro.headline}
                    </h2>
                  </div>
                </div>

                <p className="text-xs text-slate-500 max-w-sm">
                  {macro.description}
                </p>
              </div>

              {/* LISTA STEP NELLA MACRO FASE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {macro.steps.map((step) => {
                  const isDone = step.status === "done";
                  const isInProgress = step.status === "in_progress";

                  return (
                    <div 
                      key={step.id} 
                      className={`p-5 rounded-2xl border transition flex flex-col justify-between space-y-4 ${
                        isDone
                          ? "bg-slate-50/80 border-slate-200"
                          : isInProgress
                          ? "bg-white border-2 border-yellow-400 shadow-sm"
                          : "bg-slate-50/40 border-slate-200 opacity-60"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-mono font-bold text-slate-400">
                            {step.code}
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isDone
                              ? "bg-emerald-100 text-emerald-900"
                              : isInProgress
                              ? "bg-yellow-100 text-slate-950 font-extrabold border border-yellow-300"
                              : "bg-slate-200 text-slate-600"
                          }`}>
                            {isDone ? "✓ Completato" : isInProgress ? "▶ In Corso" : "🔒 In Coda"}
                          </span>
                        </div>

                        <h3 className="text-base font-extrabold text-slate-950">
                          {step.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>

                      {/* TASTI AZIONE STEP */}
                      <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                        {isDone ? (
                          <button
                            onClick={() => setSelectedStepModal(step)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 hover:bg-slate-100 transition inline-flex items-center gap-1.5 shadow-sm"
                          >
                            <Eye className="h-3.5 w-3.5 text-amber-600" /> Rivedi / Modifica Dati
                          </button>
                        ) : isInProgress ? (
                          <Link
                            to="/partner"
                            className="px-4 py-2 bg-yellow-400 text-slate-950 font-extrabold rounded-xl hover:bg-yellow-300 transition inline-flex items-center gap-1.5 shadow-sm"
                          >
                            Vai all'azione →
                          </Link>
                        ) : (
                          <span className="text-slate-400 font-semibold flex items-center gap-1">
                            <Lock className="h-3.5 w-3.5" /> Sblocco automatico
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </section>
          ))}
        </div>

      </div>

      {/* MODAL ISPEZIONE / REVISIONE DATI STEP */}
      {selectedStepModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">
                  {selectedStepModal.code} · Dati Approvati
                </span>
                <h3 className="text-xl font-extrabold text-slate-950 mt-0.5">
                  {selectedStepModal.title}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs">
                ✓ Completato
              </span>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">Sintesi delle informazioni registrate:</span>
                <p className="text-slate-600 leading-relaxed">
                  Le informazioni relative a {selectedStepModal.title.toLowerCase()} sono state confermate e salvate nel tuo Piano Operativo Strategico.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setSelectedStepModal(null)}
                className="px-5 py-2.5 bg-slate-950 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition"
              >
                Chiudi Ispezione
              </button>
              <button
                onClick={() => {
                  alert("Richiesta modifica inviata al Tutor Claudio!");
                  setSelectedStepModal(null);
                }}
                className="px-4 py-2.5 bg-amber-100 border border-amber-300 text-amber-950 rounded-xl font-bold text-xs hover:bg-amber-200 transition inline-flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5 text-amber-700" /> Richiedi Modifica al Tutor
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default MetodoEvoPage;
