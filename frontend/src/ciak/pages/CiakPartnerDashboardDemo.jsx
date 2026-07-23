/**
 * Anteprima Interattiva dal Vivo: Home Page Area Partner CIAK.
 *
 * 1) PRIMO ACCESSO (1° Accesso Neo-Partner):
 *    - Simona si presenta, spiega il suo ruolo di Coordinatrice e cosa realizziamo grazie a CIAK.io.
 *    - Invita l'utente a guardare il Video di Benvenuto di Claudio Bertogliatti.
 *
 * 2) DAL SECONDO ACCESSO IN poi (2° Accesso e successivi):
 *    - La Home si allinea al Percorso del Partner con il cambio dinamico dell'Agente Assegnato in base alla Fase (Valentina, Andrea, Gaia, Marco, Carlo).
 *    - Scheda dell'Azione Focalizzata (Modifica, Note ed Approvazione).
 */
import React, { useState } from "react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { PianoOperativoWidget } from "../partner/components/PianoOperativoWidget";
import {
  ArrowRight, Clock, Sparkles, ShieldCheck, MessageCircle, PlayCircle,
  FileText, CheckCircle2, Home, Map, FolderOpen, Users, RefreshCw,
  Pencil, PlusCircle, Check, RotateCcw, Video, UserCheck, Bot, Star
} from "lucide-react";

export function CiakPartnerDashboardDemo() {
  // Stato simulatore accesso: "first_access" (1° Accesso) vs "returning" (Dal 2° Accesso in poi)
  const [accessMode, setAccessMode] = useState("first_access");

  // Selettore della Fase del Partner nel 2° Accesso
  const [currentPhase, setCurrentPhase] = useState("posizionamento"); // "posizionamento" | "video" | "funnel" | "lancio"

  // Stato interattivo per l'Azione Focalizzata
  const [isEditing, setIsEditing] = useState(false);
  const [targetValue, setTargetValue] = useState("Professionisti e lavoratori d'ufficio (35-55 anni) affetti da dolori posturali cronici da scrivania.");
  const [promessaValue, setPromessaValue] = useState('"Elimina il mal di schiena da scrivania e ritrova la tua postura corretta in 90 giorni, senza farmaci."');
  const [noteValue, setNoteValue] = useState("");
  const [isApproved, setIsApproved] = useState(false);

  // Mappa Agenti per le Fasi del 2° Accesso
  const PHASE_AGENTS = {
    posizionamento: {
      name: "Valentina",
      role: "Senior Brand & Posizionamento",
      avatar: "/agents/valentina.jpg",
      badge: "🤖 Agente Assegnato · Fase 01",
      stepTitle: "Fase 01 · Definizione Promessa Unica & Nicchia Target",
      message: "In questa fase ti seguo direttamente io per definire la promessa differenziante della tua Accademia. Revisiona la bozza preparata e dammi la tua approvazione.",
    },
    video: {
      name: "Andrea",
      role: "Coach Video & Teleprompter",
      avatar: "/agents/andrea.jpg",
      badge: "🤖 Agente Assegnato · Fase 02",
      stepTitle: "Fase 02 · Script Masterclass & Registrazione Video",
      message: "Ora che il posizionamento è approvato, ti guido nella registrazione della Masterclass. Ho preparato la scaletta degli script pronta per il teleprompter.",
    },
    funnel: {
      name: "Gaia",
      role: "Tech Lead & Funnel Stripe",
      avatar: "/agents/gaia.jpg",
      badge: "🤖 Agente Assegnato · Fase 03",
      stepTitle: "Fase 03 · Configurazione Funnel Web & Cassa Stripe",
      message: "Sto configurando la struttura tecnologica della tua pagina di vendita ed il collegamento automatico incassi su Stripe.",
    },
    lancio: {
      name: "Marco",
      role: "Launch Manager & Strategy",
      avatar: "/agents/marco.jpg",
      badge: "🤖 Agente Assegnato · Fase 04",
      stepTitle: "Fase 04 · Calendario di Lancio & Webinar Live",
      message: "Siamo pronti per andare online! Ho impostato il calendario delle dirette a 30 giorni ed il piano di acquisizione contatti.",
    },
  };

  const activeAgent = PHASE_AGENTS[currentPhase];

  return (
    <>
      <CiakHeader />

      <main className="bg-white min-h-screen py-8 px-4 sm:px-8 font-[Poppins,system-ui,sans-serif] text-slate-900 border-t border-slate-100">
        
        {/* BARRA SELETTORE ACCESSO PER LA DEMO */}
        <div className="w-full max-w-[1400px] mx-auto mb-8 bg-slate-50 p-4 sm:p-5 rounded-3xl border-2 border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 font-mono font-bold uppercase tracking-wider">Simulatore Accesso Partner:</span>
            <span className="text-slate-500 font-medium hidden sm:inline">(Testa la differenza tra il 1° Accesso e i successivi)</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setAccessMode("first_access")}
              className={`px-4 py-2.5 rounded-2xl border-2 transition ${
                accessMode === "first_access"
                  ? "bg-slate-950 text-yellow-400 border-slate-950 font-extrabold shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 font-bold"
              }`}
            >
              🌟 1° ACCESSO (Presentazione Simona & Video Claudio)
            </button>
            <button
              onClick={() => setAccessMode("returning")}
              className={`px-4 py-2.5 rounded-2xl border-2 transition ${
                accessMode === "returning"
                  ? "bg-amber-400 text-slate-950 border-amber-400 font-extrabold shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 font-bold"
              }`}
            >
              🔄 DAL 2° ACCESSO IN POI (Percorso Dinamico & Cambio Agente)
            </button>
          </div>
        </div>

        {/* CONTAINER PRINCIPALE HOME PAGE AD AMPIA VISIBILITÀ */}
        <div className="w-full max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8">
          
          {/* SIDEBAR CON NAVIGAZIONE */}
          <aside className="space-y-4 font-[Poppins,system-ui,sans-serif]">
            <div className="bg-white rounded-3xl border-2 border-slate-200/80 p-5 shadow-sm space-y-6">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 block mb-3">
                  Navigazione Principale
                </span>
                <nav className="space-y-1.5">
                  <a href="/partner-demo" className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-slate-950 text-yellow-400 font-extrabold text-xs shadow-sm">
                    <Home className="h-4 w-4 text-yellow-400" />
                    <span>Home</span>
                  </a>
                  <a href="/percorso-demo" className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-slate-700 hover:bg-slate-50 font-bold text-xs transition">
                    <Map className="h-4 w-4 text-slate-500" />
                    <span>Percorso</span>
                  </a>
                  <a href="/materiali-demo" className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-slate-700 hover:bg-slate-50 font-bold text-xs transition">
                    <FolderOpen className="h-4 w-4 text-slate-500" />
                    <span>Materiali</span>
                  </a>
                  <a href="/team-demo" className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-slate-700 hover:bg-slate-50 font-bold text-xs transition">
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
                  <a href="/servizi-extra-demo" className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-slate-700 hover:bg-slate-50 font-bold text-xs transition">
                    <Sparkles className="h-4 w-4 text-slate-500" />
                    <span>Servizi Extra</span>
                  </a>
                  <a href="/rinnovo-demo" className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition">
                    <RefreshCw className="h-4 w-4 text-slate-500" />
                    <span>Rinnovo</span>
                  </a>
                </nav>
              </div>

              {/* CARD PROFILO PARTNER */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-950 text-yellow-400 font-extrabold flex items-center justify-center text-xs shrink-0 border-2 border-yellow-400">
                  MR
                </div>
                <div className="overflow-hidden">
                  <span className="font-extrabold text-xs text-slate-900 block truncate">Dott. Mario Rossi</span>
                  <span className="text-[11px] text-slate-500 block truncate">Posturologia Integrata</span>
                </div>
              </div>
            </div>
          </aside>

          {/* VISTA CONTENUTO HOME PAGE */}
          <div className="min-w-0 space-y-8">
            
            {/* ========================================================================= */}
            {/* VISTA 1: PRIMO ACCESSO (SIMONA SI PRESENTA + VIDEO BENVENUTO DI CLAUDIO) */}
            {/* ========================================================================= */}
            {accessMode === "first_access" ? (
              <div className="space-y-8">
                
                {/* 1. RIQUADRO PRESENTAZIONE DI SIMONA */}
                <section className="bg-white border-2 border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-[140px_1fr] gap-6 items-start">
                    
                    {/* FOTO AVATAR SIMONA */}
                    <div className="space-y-2 text-center sm:text-left">
                      <img
                        src="/agents/stefania.jpg"
                        alt="Simona - Coordinatrice del percorso"
                        className="w-32 h-32 rounded-3xl object-cover bg-slate-950 border-4 border-yellow-400 shadow-md mx-auto sm:mx-0"
                      />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 inline-block">
                        Coordinatrice CIAK
                      </span>
                    </div>

                    {/* MESSAGGIO DI BENVENUTO E RUOLO SIMONA */}
                    <div className="space-y-4">
                      <div>
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600 block mb-1">
                          👋 Benvenuto nella tua nuova Area Partner CIAK.io
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 leading-tight">
                          Ciao Mario! Sono Simona, la tua Coordinatrice di Percorso.
                        </h1>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                        Il mio ruolo è guidarti giorno per giorno lungo le <strong>14 Fasi del Protocollo EVO</strong>. Non dovrai mai preoccuparti degli aspetti tecnici o organizzativi: sarò io ad assegnarti la prossima azione esatta da compiere e a coordinare il lavoro del team specialistico per te.
                      </p>

                      <div className="bg-amber-50/80 border-2 border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-2">
                        <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wide">
                          💡 Cosa andremo a realizzare insieme grazie a CIAK.io:
                        </h3>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 font-medium pt-1">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Posizionamento unico & Nicchia ICP</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Script Masterclass & Teleprompter</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Pagine Web Funnel & Cassa Stripe</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Lancio Ufficiale & Acquisizione Clienti</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. RIQUADRO VIDEO BENVENUTO DI CLAUDIO (RIDOTTO DELLA METÀ + TESTO MOTIVANTE E CTA A DESTRA) */}
                <section className="bg-slate-950 text-white rounded-3xl overflow-hidden shadow-xl border border-slate-800">
                  <div className="p-6 sm:p-8 space-y-6">
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 block mb-1">
                          Primo Passo Obbligatorio
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                          Video di Benvenuto di Claudio Bertogliatti
                        </h2>
                      </div>
                      <span className="px-3.5 py-1.5 rounded-full bg-yellow-400 text-slate-950 font-extrabold text-xs shrink-0 self-start sm:self-auto">
                        🎬 5 Minuti di Benvenuto Completo
                      </span>
                    </div>

                    {/* GRIGLIA 50% VIDEO / 50% TESTO MOTIVANTE & CTA */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-center">
                      
                      {/* COLONNA SINISTRA: VIDEO PLAYER RIDOTTO DELLA METÀ CON COPERTINA */}
                      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-800 aspect-video shadow-lg group">
                        <video
                          controls
                          poster="/founder/claudio-video-poster.jpg"
                          className="w-full h-full object-cover rounded-2xl"
                        >
                          <source src="/video/claudio-benvenuto-completo.mp4" type="video/mp4" />
                          <source src="/video/come-funziona-evolution-pro.mp4" type="video/mp4" />
                          Il tuo browser non supporta la riproduzione del video.
                        </video>
                      </div>

                      {/* COLONNA DESTRA: RIQUADRO CON TESTO MOTIVANTE + CTA PULSANTE */}
                      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-5 flex flex-col justify-between h-full">
                        <div className="space-y-3">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20 inline-block">
                            🚀 Il tuo percorso comincia qui
                          </span>
                          <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                            Trasforma le tue competenze in un'Accademia Digitale
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                            In questo video di 5 minuti, Claudio ti mostra la visione ed il metodo esatto per portare online il tuo corso velocemente.
                          </p>
                          <p className="text-xs sm:text-sm font-semibold text-yellow-300/90 leading-relaxed">
                            ⚡ Il ritmo nei primi giorni fa tutta la differenza: guarda il messaggio di Claudio e dai subito il via alla tua prima azione pratica!
                          </p>
                        </div>

                        {/* CTA PULSANTE PER INIZIARE SUBITO */}
                        <div className="pt-2">
                          <button
                            onClick={() => setAccessMode("returning")}
                            className="w-full py-4 px-6 bg-yellow-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl hover:bg-yellow-300 transition shadow-md flex items-center justify-center gap-2.5 group"
                          >
                            <span>Inizia Subito la Fase 01 del Percorso</span>
                            <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition" />
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                </section>

              </div>
            ) : (
              /* ========================================================================= */
              /* VISTA 2: DAL SECONDO ACCESSO IN POI (PERCORSO DINAMICO + CAMBIO AGENTE) */
              /* ========================================================================= */
              <div className="space-y-8">
                
                {/* BARRA DI TEST PER CAMBIARE LA FASE ED OSSERVARE IL CAMBIO AGENTE */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold">
                  <span className="text-slate-700 font-bold">Simula Progresso Partner (Cambio Agente di Fase):</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setCurrentPhase("posizionamento")}
                      className={`px-3 py-1.5 rounded-xl border transition ${
                        currentPhase === "posizionamento"
                          ? "bg-slate-950 text-yellow-400 font-bold border-slate-950"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      Fase 1: Valentina (Brand)
                    </button>
                    <button
                      onClick={() => setCurrentPhase("video")}
                      className={`px-3 py-1.5 rounded-xl border transition ${
                        currentPhase === "video"
                          ? "bg-slate-950 text-yellow-400 font-bold border-slate-950"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      Fase 2: Andrea (Video)
                    </button>
                    <button
                      onClick={() => setCurrentPhase("funnel")}
                      className={`px-3 py-1.5 rounded-xl border transition ${
                        currentPhase === "funnel"
                          ? "bg-slate-950 text-yellow-400 font-bold border-slate-950"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      Fase 3: Gaia (Tech)
                    </button>
                    <button
                      onClick={() => setCurrentPhase("lancio")}
                      className={`px-3 py-1.5 rounded-xl border transition ${
                        currentPhase === "lancio"
                          ? "bg-slate-950 text-yellow-400 font-bold border-slate-950"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      Fase 4: Marco (Lancio)
                    </button>
                  </div>
                </div>

                {/* 1. HEADER AGENTE ASSEGNATO ALLA FASE ATTUALE */}
                <section className="bg-white border-2 border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    
                    <div className="flex items-center gap-4">
                      <img
                        src={activeAgent.avatar}
                        alt={activeAgent.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover bg-slate-950 border-2 border-yellow-400 shadow-sm shrink-0"
                      />
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 inline-block">
                          {activeAgent.badge}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950">
                          {activeAgent.name} · <span className="text-amber-600">{activeAgent.role}</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                          {activeAgent.message}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => alert(`Apertura chat in corso con ${activeAgent.name}...`)}
                      className="w-full md:w-auto px-5 py-3 bg-slate-950 text-yellow-400 font-extrabold text-xs rounded-2xl hover:bg-slate-800 transition shadow-sm inline-flex items-center justify-center gap-2 shrink-0"
                    >
                      <MessageCircle className="w-4 h-4 text-yellow-400" />
                      <span>Parla con {activeAgent.name}</span>
                    </button>

                  </div>
                </section>

                {/* 2. SCHEDA AZIONE FOCALIZZATA DI FASE (MODIFICA, NOTE ED APPROVAZIONE) */}
                <section className="bg-white border-2 border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950">
                        {activeAgent.stepTitle}
                      </h2>
                    </div>

                    <span className={`px-3.5 py-1 rounded-full font-bold text-xs inline-flex items-center gap-1.5 shrink-0 ${
                      isApproved ? "bg-emerald-100 text-emerald-950 border border-emerald-300" : "bg-amber-100 text-amber-950 border border-amber-300"
                    }`}>
                      {isApproved ? <Check className="w-3.5 h-3.5 text-emerald-800 font-extrabold" /> : <Clock className="w-3.5 h-3.5 text-amber-800" />}
                      <span>{isApproved ? "Approvato da Te" : "Bozza in Attesa di Tua Approvazione"}</span>
                    </span>
                  </div>

                  {/* CONTENUTO SCHEDA AZIONE CON EDITING & NOTE */}
                  <div className="space-y-5">
                    
                    {/* TARGET ICP */}
                    <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base font-bold text-slate-700">Target individuato</span>
                        {!isEditing && (
                          <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1">
                            <Pencil className="w-3 h-3" /> Modifica
                          </button>
                        )}
                      </div>
                      {isEditing ? (
                        <textarea
                          value={targetValue}
                          onChange={(e) => setTargetValue(e.target.value)}
                          className="w-full p-3 rounded-xl border border-amber-300 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                          rows={2}
                        />
                      ) : (
                        <p className="text-xs sm:text-sm font-normal text-slate-900">{targetValue}</p>
                      )}
                    </div>

                    {/* PROMESSA UNICA */}
                    <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base font-bold text-slate-700">Promessa di Trasformazione differenziante</span>
                        {!isEditing && (
                          <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1">
                            <Pencil className="w-3 h-3" /> Modifica
                          </button>
                        )}
                      </div>
                      {isEditing ? (
                        <textarea
                          value={promessaValue}
                          onChange={(e) => setPromessaValue(e.target.value)}
                          className="w-full p-3 rounded-xl border border-amber-300 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                          rows={2}
                        />
                      ) : (
                        <p className="text-xs sm:text-sm font-normal text-amber-700">{promessaValue}</p>
                      )}
                    </div>

                    {/* SEZIONE NOTE DEL PARTNER */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                        Aggiungi indicazioni o note per {activeAgent.name}:
                      </label>
                      <input
                        type="text"
                        value={noteValue}
                        onChange={(e) => setNoteValue(e.target.value)}
                        placeholder="Es: Vorrei porre maggiore enfasi sul programma di 90 giorni..."
                        className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>

                  </div>

                  {/* BARRA PULSANTI DI APPROVAZIONE */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-slate-500 font-medium">
                      Approvando questo passaggio, consentirai al team di passare alla fase successiva.
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {isApproved ? (
                        <button
                          onClick={() => setIsApproved(false)}
                          className="w-full sm:w-auto px-5 py-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-2xl hover:bg-slate-200 transition inline-flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Modifica Approvazione
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsApproved(true)}
                          className="w-full sm:w-auto px-7 py-3.5 bg-amber-400 text-slate-950 font-extrabold text-xs rounded-2xl hover:bg-amber-300 transition shadow-md inline-flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4 text-slate-950" />
                          Approva e Procedi con {activeAgent.name}
                        </button>
                      )}
                    </div>
                  </div>

                </section>

              </div>
            )}

          </div>

        </div>
      </main>

      <CiakFooter />
    </>
  );
}

export default CiakPartnerDashboardDemo;
