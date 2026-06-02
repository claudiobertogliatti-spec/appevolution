import React, { useState } from "react";
import { getPhasePresentation } from "./phases";

/**
 * Vista-mappa del percorso operativo: le fasi EVO come righe di "finestre" (card)
 * che accompagnano il partner verso lo step successivo.
 *
 * Pensata per il target poco digitalizzato: una card per step con stato chiaro
 * (Fatto / Tocca a te / Più avanti), titolo in lingua semplice e una riga di
 * spiegazione. La card corrente è evidenziata in giallo con "Continua qui →".
 * Gli step futuri sono bloccati (lucchetto) per non generare ansia.
 *
 * Data-driven da state.macro_phases + state.steps (vedi useJourneyState).
 */

// Titoli e descrizioni in lingua semplice, per step_id. Fallback: step.label.
const STEP_COPY = {
  "01-contratto": { title: "Il tuo contratto", desc: "Hai firmato. Si parte da qui." },
  "02-discovery-video": { title: "Conosciamoci", desc: "Un breve video che ti spiega come funziona tutto." },
  "burocrazia": { title: "I tuoi dati", desc: "I dati per la fatturazione. Li inserisci una volta sola." },
  "03-brand-kit": { title: "Il tuo brand", desc: "Logo, foto e colori del tuo marchio." },
  "04-posizionamento": { title: "Il tuo posizionamento", desc: "12 domande per mettere a fuoco il tuo messaggio." },
  "05-script-masterclass": { title: "Lo script della masterclass", desc: "Scriviamo insieme cosa dirai nella tua lezione gratuita." },
  "06-outline-lezioni": { title: "La scaletta delle lezioni", desc: "L'indice del tuo corso, lezione per lezione." },
  "07-registra-masterclass": { title: "Registra la masterclass", desc: "La tua lezione gratuita: il primo assaggio." },
  "08-registra-lezioni": { title: "Registra le lezioni", desc: "Il cuore del corso che venderai." },
  "09-funnel-asset": { title: "I materiali del funnel", desc: "Le pagine e le email pronte per vendere." },
  "10-funnel-team-work": { title: "Il funnel col team", desc: "Lo montiamo noi per te, pezzo per pezzo." },
  "11-calendario-30gg": { title: "Il calendario 30 giorni", desc: "Cosa pubblicare, giorno per giorno." },
  "12-prezzo-webinar": { title: "Prezzo e webinar", desc: "Quanto vendi e come lo presenti." },
  "13-lancio": { title: "Il lancio", desc: "Online e pronto a vendere. Ce l'hai fatta." },
};

// Anteprima della fase Ottimizza (cantieri post go-live, non ancora step reali).
const OTTIMIZZA_TEASER = [
  { title: "Autorevolezza", desc: "Prove, framework e presenza costante: diventi un riferimento." },
  { title: "Community", desc: "Il gruppo che fa restare le persone nel tempo." },
  { title: "Dati", desc: "Leggiamo i numeri e miglioriamo ciò che converte." },
  { title: "Moltiplicatori", desc: "Certificazioni, ambassador, partnership: scali." },
];

function PhaseAvatar({ agent }) {
  const [broken, setBroken] = useState(false);
  if (broken || !agent?.avatar) {
    return (
      <div className="w-10 h-10 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center font-bold flex-shrink-0">
        {agent?.initial || agent?.name?.[0] || "?"}
      </div>
    );
  }
  return (
    <img
      src={agent.avatar}
      alt={agent.name}
      onError={() => setBroken(true)}
      className="w-10 h-10 rounded-full object-cover bg-slate-900 flex-shrink-0"
    />
  );
}

const THUMB = {
  done: "bg-gradient-to-br from-green-100 to-green-50 text-green-600",
  current: "bg-gradient-to-br from-slate-900 to-slate-700 text-yellow-400",
  rejected: "bg-gradient-to-br from-red-100 to-red-50 text-red-500",
  locked: "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-300",
};

function StepCard({ status, num, title, desc, inReview, onOpen }) {
  const isCurrent = status === "current";
  let badge;
  if (status === "done") badge = <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-green-100 text-green-700">✓ Fatto</span>;
  else if (status === "current") badge = <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-yellow-400 text-slate-900">Tocca a te</span>;
  else if (status === "rejected") badge = <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-red-100 text-red-700">Da rivedere</span>;
  else badge = <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Più avanti</span>;

  const glyph = status === "done" ? "✓" : status === "locked" ? "🔒" : num || "★";

  let footer;
  if (status === "current") {
    footer = (
      <button onClick={onOpen} className="block w-full text-center font-bold text-[13.5px] bg-yellow-400 text-slate-900 rounded-lg py-2.5 hover:bg-yellow-500 transition">
        Continua qui →
      </button>
    );
  } else if (status === "rejected") {
    footer = (
      <button onClick={onOpen} className="block w-full text-center font-bold text-[13.5px] bg-red-500 text-white rounded-lg py-2.5 hover:bg-red-600 transition">
        Correggi →
      </button>
    );
  } else if (status === "done") {
    footer = (
      <button onClick={onOpen} className="block w-full text-center font-semibold text-[13px] text-slate-500 border border-slate-200 rounded-lg py-2.5 hover:bg-slate-50 transition">
        Rivedi
      </button>
    );
  } else {
    footer = (
      <span className="block w-full text-center text-[12.5px] text-slate-400 py-2.5">🔒 Si apre quando arrivi qui</span>
    );
  }

  return (
    <div className={`bg-white rounded-2xl overflow-hidden flex flex-col shadow-sm transition ${isCurrent ? "border-2 border-yellow-400 shadow-lg shadow-yellow-400/20" : "border border-gray-200"}`}>
      <div className="flex items-center justify-between px-3.5 pt-3">
        {badge}
        {num && <span className="text-xs font-bold text-slate-400">#{num}</span>}
      </div>
      <div className={`h-20 mx-3.5 mt-3 rounded-xl flex items-center justify-center text-3xl font-extrabold ${THUMB[status]}`}>
        {glyph}
      </div>
      <div className="px-3.5 pt-3 pb-3.5 flex-1 flex flex-col">
        <h3 className="text-[15px] font-bold leading-tight text-slate-900">{title}</h3>
        {inReview && (
          <span className="mt-1.5 self-start text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">In revisione</span>
        )}
        <p className="text-[12.5px] text-slate-500 leading-snug mt-1.5 flex-1">{desc}</p>
        <div className="mt-3">{footer}</div>
      </div>
    </div>
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

  const overallPct =
    state?.total_steps > 0 ? Math.round((state.completed_count / state.total_steps) * 100) : 0;

  return (
    <div>
      {/* Hero */}
      <div className="bg-slate-900 text-white rounded-2xl p-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {nome ? `Il tuo percorso, ${nome}` : "Il tuo percorso"}
        </h1>
        <p className="text-[13.5px] text-slate-300 mt-1">
          <b className="text-yellow-400 font-semibold">Online in 21 giorni</b> · il riferimento del
          tuo mercato in 12 mesi
        </p>
        <div className="h-2.5 bg-white/15 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>
            {state?.completed_count || 0} step completati su {state?.total_steps || 0}
          </span>
          <span>
            Fase: {macroPhases.find((mp) => mp.id === currentMacroId)?.label || "—"}
          </span>
        </div>
      </div>

      {/* Fasi */}
      {macroPhases.map((mp) => {
        const { cfg, agent } = getPhasePresentation(mp.id);
        const isDone = mp.status === "done";
        const isCurrent = mp.id === currentMacroId;
        let tag = mp.id === "ottimizza" ? "Dopo il go-live" : "Più avanti";
        if (isDone) tag = "Completata";
        else if (isCurrent) tag = "In corso";

        const stepIds = mp.step_ids || [];
        const isOttimizzaTeaser = mp.id === "ottimizza" && stepIds.length === 0;

        return (
          <div key={mp.id} className="mt-7">
            <div className="flex items-center gap-3 mb-3.5">
              <PhaseAvatar agent={agent} />
              <div className="min-w-0">
                <div className="text-[17px] font-bold text-slate-900 leading-tight">
                  {cfg?.label || mp.label}
                </div>
                <div className="text-[12.5px] text-slate-500">
                  {agent ? `Con ${agent.name}` : ""}
                  {agent && cfg ? " · " : ""}
                  {mp.tagline || ""}
                </div>
              </div>
              <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-white border border-gray-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                {tag}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {isOttimizzaTeaser
                ? OTTIMIZZA_TEASER.map((t) => (
                    <StepCard key={t.title} status="locked" title={t.title} desc={t.desc} />
                  ))
                : stepIds.map((sid) => {
                    const step = stepById(sid);
                    if (!step) return null;
                    const st = statusOf(step);
                    const copy = STEP_COPY[sid] || { title: step.label, desc: "" };
                    const gi = globalOrder.indexOf(sid);
                    return (
                      <StepCard
                        key={sid}
                        status={st}
                        num={gi > -1 ? gi + 1 : null}
                        title={copy.title}
                        desc={copy.desc}
                        inReview={st === "done" && step.approval_status === "pending_review"}
                        onOpen={() => onOpenStep(sid)}
                      />
                    );
                  })}
            </div>

            {isOttimizzaTeaser && (
              <p className="text-[12.5px] text-slate-500 mt-3">
                Questa parte si apre dopo che sei online. È il lavoro dei prossimi 12 mesi.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
