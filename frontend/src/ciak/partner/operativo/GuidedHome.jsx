import React, { useState, useEffect } from "react";
import {
  ArrowRight, Clock, Sparkles, ShieldCheck, MessageCircle, PlayCircle,
  FileText, CheckCircle2, Home, Map, FolderOpen, Users, RefreshCw,
  Pencil, PlusCircle, Check, RotateCcw, Video, UserCheck, Bot, Star
} from "lucide-react";
import { Link } from "react-router-dom";
import { activeAgentForStep } from "./journeyPresentation";
import ProjectBookCard from "../rewards/ProjectBookCard";
import { authHeaders, getPartnerUser } from "../api";

function firstName(name) {
  return (name || "").split(" ")[0] || "Partner";
}

export default function GuidedHome({
  state,
  partnerId,
  partnerName,
  onOpenStep,
  onAsk,
  onReplayWelcome,
}) {
  const completed = state?.completed_count || 0;
  const current = state?.current_step || state?.steps?.find((s) => !s.completed) || state?.steps?.[0];
  const nome = firstName(partnerName);

  // Determina modalità d'accesso: 1° Accesso (se completed === 0 o step Benvenuto) vs Dal 2° Accesso in Poi
  const [forcedAccessMode, setForcedAccessMode] = useState(null);
  const accessMode = forcedAccessMode || (completed === 0 || !current || current.step_id === "esamina_1" || current.title === "Benvenuto" ? "first_access" : "returning");

  const currentAgent = activeAgentForStep(current);
  const activeAgent = {
    ...currentAgent,
    badge: `🤖 Agente assegnato · ${current?.code || "percorso EVO"}`,
    stepTitle: `${current?.code || "Prossimo passo"} · ${current?.label || "Continua il percorso"}`,
    message: current?.label
      ? `Ti accompagno nel passaggio “${current.label}”. Qui trovi ciò che serve e la prossima azione da completare.`
      : currentAgent.description,
  };

  // Stato interattivo scheda azione
  const [isEditing, setIsEditing] = useState(false);
  // NON precompilare con testo d'esempio: questo componente e' l'area partner REALE.
  // Fino al 03/08/2026 qui c'erano il target e la promessa del seed demo (Mario Rossi,
  // "mal di schiena da scrivania") e ogni partner vedeva il progetto di un altro
  // presentato come la propria bozza da approvare. Campi vuoti = "non ancora fatto";
  // campi col progetto sbagliato = "non hanno neanche guardato il mio".
  const [targetValue, setTargetValue] = useState("");
  const [promessaValue, setPromessaValue] = useState("");
  const [isApproved, setIsApproved] = useState(false);
  const [salvato, setSalvato] = useState(false);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);

  // Il posizionamento del partner esiste gia' in `partner_posizionamento` (spesso
  // compilato in fase di migrazione dal Drive) ma questa schermata non lo leggeva:
  // mostrava due valori d'esempio hardcoded. Qui lo carichiamo davvero.
  // inputs.target    -> "Target individuato"
  // inputs.risultato -> "Promessa di Trasformazione differenziante"
  useEffect(() => {
    if (!partnerId) return undefined;
    let annullato = false;
    (async () => {
      try {
        const r = await fetch(`/api/partner-journey/posizionamento/${partnerId}`, {
          headers: authHeaders(),
        });
        if (!r.ok) return;
        const d = await r.json();
        const inputs = (d && d.posizionamento && d.posizionamento.inputs) || {};
        if (annullato) return;
        if (inputs.target) setTargetValue(inputs.target);
        if (inputs.risultato) setPromessaValue(inputs.risultato);
        if (d?.posizionamento?.approvato_dal_partner) setIsApproved(true);
      } catch {
        // Nessun dato o rete assente: i campi restano vuoti col loro placeholder
      }
    })();
    return () => {
      annullato = true;
    };
  }, [partnerId]);

  const partnerUser = getPartnerUser();
  const isAdminView = Boolean(
    localStorage.getItem("ciak_admin_token") ||
    partnerUser?.role === "admin" ||
    partnerUser?.role === "superadmin" ||
    partnerUser?.is_admin
  );

  // Tre azioni distinte sullo stesso endpoint, e vanno tenute distinte:
  //   approvazione === undefined -> salva soltanto i campi (l'admin puo' farlo: serve
  //                                 per la migrazione dei partner dal Drive)
  //   approvazione === true      -> il partner approva
  //   approvazione === false     -> il partner revoca l'approvazione
  // `undefined` NON viene serializzato da JSON.stringify: e' cosi' che il salvataggio
  // semplice lascia intatto lo stato di approvazione sul server, mentre `false` viaggia
  // e revoca davvero (il backend distingue None da False).
  const handleSalvaPosizionamento = async (approvazione) => {
    if (isAdminView && approvazione !== undefined) {
      alert("L'approvazione è riservata al partner.");
      return;
    }
    setSalvataggioInCorso(true);
    try {
      const res = await fetch(`/api/partner-journey/posizionamento/${partnerId}/inputs`, {
        method: "PATCH",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: {
            target: targetValue,
            risultato: promessaValue,
          },
          ...(approvazione === undefined ? {} : { approvato_dal_partner: approvazione }),
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        alert(`Impossibile salvare il posizionamento: ${errText}`);
        return;
      }
      if (approvazione !== undefined) {
        setIsApproved(approvazione);
      }
      // Il partner deve vedere che il salvataggio e' avvenuto: un salvataggio muto e'
      // indistinguibile da un salvataggio fallito, ed e' l'equivoco che questa
      // schermata ha gia' prodotto una volta.
      setIsEditing(false);
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2500);
    } catch (err) {
      alert(`Errore durante il salvataggio: ${err.message}`);
    } finally {
      setSalvataggioInCorso(false);
    }
  };

  return (
    <div className="space-y-6 font-[Poppins,system-ui,sans-serif] text-slate-900">
      
      {/* BARRA SIMULATORE PER CAMBIARE VISTA (1° ACCESSO VS 2° ACCESSO) */}
      <div className="w-full bg-slate-50 p-4 rounded-3xl border-2 border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-amber-600 font-mono font-bold uppercase tracking-wider">Selettore Accesso Partner:</span>
          <span className="text-slate-500 font-medium hidden sm:inline">(Testa la differenza tra 1° Accesso e successivi)</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setForcedAccessMode("first_access")}
            className={`px-4 py-2.5 rounded-2xl border-2 transition ${
              accessMode === "first_access"
                ? "bg-slate-950 text-yellow-400 border-slate-950 font-extrabold shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 font-bold"
            }`}
          >
            🌟 1° ACCESSO (Presentazione Simona & Video Claudio)
          </button>
          <button
            onClick={() => setForcedAccessMode("returning")}
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

      {/* VISTA 1: PRIMO ACCESSO (SIMONA SI PRESENTA + VIDEO BENVENUTO DI CLAUDIO 50/50 GRID) */}
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
                    Ciao {nome}! Sono Simona, la tua Coordinatrice di Percorso.
                  </h1>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  Il mio ruolo è guidarti giorno per giorno lungo i <strong>20 passaggi del Protocollo EVO</strong>. Non dovrai mai preoccuparti degli aspetti tecnici o organizzativi: sarò io ad assegnarti la prossima azione esatta da compiere e a coordinare il lavoro del team specialistico per te.
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

          {/* 2. RIQUADRO VIDEO BENVENUTO DI CLAUDIO (50/50 GRID CON COPERTINA HD E CTA DESTRA) */}
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
                      onClick={() => setForcedAccessMode("returning")}
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
        /* VISTA 2: DAL SECONDO ACCESSO IN POI (PERCORSO DINAMICO + CAMBIO AGENTE IN CARTELLA ORIZZONTALE) */
        <div className="space-y-8">
          
          {/* 1. HEADER ORIZZONTALE AGENTE ASSEGNATO ALLA FASE ATTUALE */}
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
                onClick={onAsk}
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
                    placeholder="Chi è il tuo studente ideale: chi è, cosa fa, cosa sta cercando."
                    className="w-full p-3 rounded-xl border border-amber-300 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    rows={2}
                  />
                ) : (
                  <p className={`text-xs sm:text-sm font-normal ${targetValue ? "text-slate-900" : "text-slate-400 italic"}`}>
                    {targetValue || "Da definire insieme al tuo agente di fase."}
                  </p>
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
                    placeholder="La trasformazione che prometti, in una frase."
                    className="w-full p-3 rounded-xl border border-amber-300 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    rows={2}
                  />
                ) : (
                  <p className={`text-xs sm:text-sm font-normal ${promessaValue ? "text-amber-700" : "text-slate-400 italic"}`}>
                    {promessaValue || "Da definire insieme al tuo agente di fase."}
                  </p>
                )}
              </div>

            </div>

            {/* BARRA PULSANTI DI APPROVAZIONE */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium">
                Approvando questo passaggio, consentirai al team di registrare l'avvenuta validazione del posizionamento.
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {salvato && (
                  <span className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1.5 shrink-0">
                    <Check className="w-3.5 h-3.5" />
                    Salvato
                  </span>
                )}

                {/* Salvare NON e' approvare: senza questo bottone il partner che scrive
                    la sua promessa e non approva perde tutto al refresh, che era il bug
                    di partenza. L'admin puo' salvare (serve alla migrazione), non approvare. */}
                <button
                  onClick={() => handleSalvaPosizionamento(undefined)}
                  disabled={salvataggioInCorso}
                  className="w-full sm:w-auto px-5 py-3 text-xs font-bold rounded-2xl transition inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Check className="w-3.5 h-3.5" />
                  {salvataggioInCorso ? "Salvataggio…" : "Salva"}
                </button>

                {isApproved ? (
                  <button
                    onClick={() => handleSalvaPosizionamento(false)}
                    disabled={isAdminView || salvataggioInCorso}
                    title={isAdminView ? "L'approvazione è riservata al partner" : ""}
                    className={`w-full sm:w-auto px-5 py-3 text-xs font-bold rounded-2xl transition inline-flex items-center justify-center gap-2 ${
                      isAdminView ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Revoca Approvazione
                  </button>
                ) : (
                  <button
                    onClick={() => handleSalvaPosizionamento(true)}
                    disabled={isAdminView || salvataggioInCorso}
                    title={isAdminView ? "L'approvazione è riservata al partner" : ""}
                    className={`w-full sm:w-auto px-7 py-3.5 text-xs font-extrabold rounded-2xl transition shadow-md inline-flex items-center justify-center gap-2 ${
                      isAdminView ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none" : "bg-amber-400 text-slate-950 hover:bg-amber-300"
                    }`}
                  >
                    <Check className="w-4 h-4 text-slate-950" />
                    Approva Posizionamento
                  </button>
                )}
              </div>
            </div>

          </section>

        </div>
      )}

      <ProjectBookCard partnerId={partnerId} state={state} />
    </div>
  );
}
