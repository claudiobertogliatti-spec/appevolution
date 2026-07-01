import React, { useState } from "react";
import { getPhasePresentation } from "./phases";
import {
  FileText, PlayCircle, Contact, Palette, Target, Mic, ListChecks,
  Video, Film, LayoutGrid, Hammer, CalendarDays, Tag, Rocket,
  BookOpen, ArrowRight, Check, Lock,
} from "lucide-react";

/**
 * Vista-mappa del percorso operativo, ottimizzata per il target poco digitale.
 *
 * Principio: NON un muro di card identiche. Si vede prima il progresso e la
 * mappa in tessere compatte con icone (fatti piccoli, corrente evidenziato,
 * futuri bloccati col lucchetto). In fondo "Prossimo passo": l'unico passo che
 * conta ora, in evidenza, con foto agente e CTA.
 */
const STEP_COPY = {
  "01-contratto": { title: "Il tuo contratto", desc: "Hai firmato. Si parte da qui." },
  "02-discovery-video": { title: "Benvenuto/a", desc: "Come funziona il percorso e chi ti accompagna." },
  "burocrazia": { title: "I tuoi dati", desc: "Dati personali, contratto firmato e distinta. Una volta sola." },
  "03-brand-kit": { title: "Il tuo Brand", desc: "Logo, foto, colori e la tua voce." },
  "la-tua-storia": { title: "La tua storia", desc: "I momenti veri che rendono il tuo racconto credibile." },
  "04-posizionamento": { title: "Il tuo posizionamento", desc: "Poche domande per mettere a fuoco il tuo messaggio." },
  "05-script-masterclass": { title: "Lo script della masterclass", desc: "Ti prepariamo la traccia: tu la validi e la porti con la tua voce." },
  "06-outline-lezioni": { title: "La scaletta delle lezioni", desc: "Ti proponiamo l'indice del corso: tu controlli che rispecchi il tuo metodo." },
  "07-registra-masterclass": { title: "Registra la masterclass", desc: "La tua lezione gratuita: il primo assaggio." },
  "08-registra-lezioni": { title: "Registra le lezioni", desc: "Il cuore del corso che venderai." },
  "09-funnel-asset": { title: "Direzione pagine", desc: "Confermi promessa, marchio e contesto: al copy finale pensiamo noi." },
  "10-funnel-team-work": { title: "Systeme.io in lavorazione", desc: "Pagine, collegamenti e automazioni li montiamo noi nel tuo subaccount." },
  "11-calendario-30gg": { title: "Il piano 30 giorni", desc: "Cosa pubblicare, giorno per giorno." },
  "12-prezzo-webinar": { title: "Prezzo e diretta", desc: "Quanto vendi e come lo presenti." },
  "13-lancio": { title: "Il lancio", desc: "Online e pronto a vendere. Ce l'hai fatta." },
};

const STEP_ICON = {
  "01-contratto": FileText,
  "02-discovery-video": PlayCircle,
  "burocrazia": Contact,
  "03-brand-kit": Palette,
  "la-tua-storia": BookOpen,
  "04-posizionamento": Target,
  "05-script-masterclass": Mic,
  "06-outline-lezioni": ListChecks,
  "07-registra-masterclass": Video,
  "08-registra-lezioni": Film,
  "09-funnel-asset": LayoutGrid,
  "10-funnel-team-work": Hammer,
  "11-calendario-30gg": CalendarDays,
  "12-prezzo-webinar": Tag,
  "13-lancio": Rocket,
};

function PhaseAvatar({ agent, size = 40 }) {
  const [broken, setBroken] = useState(false);
  const s = { width: size, height: size };
  if (broken || !agent?.avatar) {
    return (
      <div style={s} className="rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center font-bold flex-shrink-0">
        {agent?.initial || agent?.name?.[0] || "?"}
      </div>
    );
  }
  return (
    <img src={agent.avatar} alt={agent.name} onError={() => setBroken(true)} style={s} className="rounded-full object-cover bg-slate-900 flex-shrink-0" />
  );
}

// Tessera compatta: icona + titolo + stato. Niente descrizione/bottone = niente muro.
function StepTile({ status, num, title, icon: Icon, inReview, onOpen }) {
  const clickable = status !== "locked";
  const base = "relative rounded-xl p-3 text-center flex flex-col items-center gap-2 transition border";
  let cls, iconColor, titleColor;
  if (status === "current") {
    cls = "bg-slate-900 border-2 border-yellow-400 shadow-md shadow-yellow-400/20";
    iconColor = "text-yellow-400"; titleColor = "text-yellow-400 font-semibold";
  } else if (status === "done") {
    cls = "bg-green-50 border-green-200 hover:border-green-300";
    iconColor = "text-green-600"; titleColor = "text-green-800";
  } else if (status === "rejected") {
    cls = "bg-red-50 border-red-200 hover:border-red-300";
    iconColor = "text-red-500"; titleColor = "text-red-700 font-semibold";
  } else {
    cls = "bg-slate-50 border-gray-200";
    iconColor = "text-slate-300"; titleColor = "text-slate-400";
  }
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={clickable ? onOpen : undefined}
      className={`${base} ${cls} ${clickable ? "cursor-pointer" : "cursor-default"}`}
    >
      {num && <span className={`absolute top-2 left-2 text-[10px] font-bold ${status === "current" ? "text-slate-500" : "text-slate-300"}`}>{num}</span>}
      {status === "done" && (
        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center"><Check className="w-2.5 h-2.5" /></span>
      )}
      {status === "locked" && <Lock className="absolute top-2 right-2 w-3 h-3 text-slate-300" />}
      <div className="mt-2">{Icon ? <Icon className={`w-7 h-7 ${iconColor}`} /> : <span className={iconColor}>★</span>}</div>
      <span className={`text-[12px] leading-tight ${titleColor}`}>{title}</span>
      {inReview && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">In revisione</span>}
    </button>
  );
}

export default function JourneyMap({ state, partnerName, onOpenStep }) {
  const macroPhases = state?.macro_phases || [];
  const steps = state?.steps || [];
  const currentStepId = state?.current_step?.step_id;
  const currentMacroId = state?.current_step?.macro_phase;

  const globalOrder = macroPhases.flatMap((mp) => mp.step_ids || []);
  const currentIndex = globalOrder.indexOf(currentStepId);
  const nome = (partnerName || "").split(" ")[0] || "";
  const stepById = (id) => steps.find((s) => s.step_id === id);

  function statusOf(step) {
    if (!step) return "locked";
    if (step.approval_status === "rejected") return "rejected";
    if (step.step_id === currentStepId) return "current";
    const gi = globalOrder.indexOf(step.step_id);
    if (gi > -1 && currentIndex > -1 && gi < currentIndex) return "done";
    if (step.completed_at) return "done";
    return "locked";
  }

  const visibleTotal = globalOrder.length;
  const visibleDone = globalOrder.filter((sid) => {
    const st = stepById(sid);
    return st && statusOf(st) === "done";
  }).length;
  const overallPct = visibleTotal > 0 ? Math.round((visibleDone / visibleTotal) * 100) : 0;

  // ── Prossimo passo (mostrato in fondo) ──
  const currentStep = stepById(currentStepId);
  const { agent: currentAgent } = getPhasePresentation(currentMacroId) || {};
  const currentCopy = STEP_COPY[currentStepId] || { title: currentStep?.label || "", desc: "" };
  const currentNum = currentIndex > -1 ? currentIndex + 1 : null;
  const currentPhaseLabel = macroPhases.find((mp) => mp.id === currentMacroId)?.label || "";

  return (
    <div>
      {/* Barra di avanzamento snella */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-lg font-bold text-slate-900">{nome ? `Il tuo percorso, ${nome}` : "Il tuo percorso"}</h1>
          <span className="text-xs text-slate-500">Fase: {currentPhaseLabel || "—"}</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
        </div>
        <div className="text-xs text-slate-500 mt-2">{visibleDone} di {visibleTotal} passi completati</div>
      </div>

      {/* Percorso in tessere compatte */}
      {macroPhases.map((mp) => {
        const { agent } = getPhasePresentation(mp.id);
        const isDone = mp.status === "done";
        const isCurrent = mp.id === currentMacroId;
        let tag = mp.id === "ottimizza" ? "Dopo il go-live" : "Più avanti";
        if (isDone) tag = "Completata";
        else if (isCurrent) tag = "In corso";

        const stepIds = mp.step_ids || [];
        const isOttimizzaTeaser = mp.id === "ottimizza" && stepIds.length === 0;

        return (
          <div key={mp.id} className="mt-7">
            <div className="flex items-center gap-3 mb-3">
              <PhaseAvatar agent={agent} size={36} />
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-slate-900 leading-tight">{mp.label}</div>
                <div className="text-[12px] text-slate-500">
                  {agent ? `Con ${agent.name}` : ""}{agent && mp.tagline ? " · " : ""}{mp.tagline || ""}
                </div>
              </div>
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-white border border-gray-200 px-2.5 py-1 rounded-full whitespace-nowrap">{tag}</span>
            </div>

            {isOttimizzaTeaser ? (
              <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 text-[12.5px] text-slate-500">
                Questa parte si apre dopo che sei online: è il lavoro dei prossimi 12 mesi (autorevolezza, community, dati).
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                {stepIds.map((sid) => {
                  const step = stepById(sid);
                  if (!step) return null;
                  const st = statusOf(step);
                  const copy = STEP_COPY[sid] || { title: step.label };
                  const gi = globalOrder.indexOf(sid);
                  return (
                    <StepTile
                      key={sid}
                      status={st}
                      num={gi > -1 ? gi + 1 : null}
                      title={copy.title}
                      icon={STEP_ICON[sid]}
                      inReview={st === "done" && step.approval_status === "pending_review"}
                      onOpen={() => onOpenStep(sid)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Prossimo passo — ultimo blocco, in evidenza */}
      {currentStep && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="text-[11px] font-semibold text-slate-500 tracking-widest mb-2">PROSSIMO PASSO</div>
          <button
            type="button"
            onClick={() => onOpenStep(currentStepId)}
            className="w-full text-left bg-white border-2 border-yellow-400 rounded-2xl p-5 shadow-lg shadow-yellow-400/15 hover:shadow-yellow-400/25 transition"
          >
            <div className="flex items-center gap-3">
              <PhaseAvatar agent={currentAgent} size={52} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-yellow-700">
                  {currentPhaseLabel?.toUpperCase()}{currentNum ? ` · PASSO ${currentNum} DI ${visibleTotal}` : ""}{currentAgent ? ` · con ${currentAgent.name}` : ""}
                </div>
                <div className="text-lg font-bold text-slate-900 leading-tight mt-0.5">{currentCopy.title}</div>
                {currentCopy.desc && <div className="text-[13px] text-slate-500 mt-0.5">{currentCopy.desc}</div>}
              </div>
            </div>
            <div className="mt-4 w-full bg-yellow-400 text-slate-900 font-bold rounded-xl py-3 text-center inline-flex items-center justify-center gap-2">
              Continua <ArrowRight className="w-5 h-5" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
