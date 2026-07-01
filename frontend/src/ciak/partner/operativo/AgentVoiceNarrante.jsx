import React from "react";
import { getAgentForStep } from "./agents";

const DEFAULT_BRIEFING = {
  "01-contratto":            "Iniziamo. Carica contratto firmato + distinta di pagamento. Te li archiviamo noi.",
  "02-discovery-video":      "Bene. Adesso guardiamo insieme un video di 15 minuti sul percorso.",
  "03-brand-kit":            "Ora servono logo + 1 foto + 3 colori del tuo brand. Per costruire il funnel coerente.",
  "04-posizionamento":       "Risposta a 8 domande su nicchia e promessa. Sono le fondamenta del tuo messaggio.",
  "05-script-masterclass":   "Adesso prepariamo lo script della masterclass. Tu controlli direzione e tono, poi lo porti con la tua voce.",
  "06-outline-lezioni":      "Creiamo titoli e descrizioni delle lezioni del corso.",
  "07-registra-masterclass": "Registra la masterclass e caricala qui. Te la sistemiamo noi.",
  "08-registra-lezioni":     "Registra le lezioni una a una e caricale qui.",
  "09-funnel-asset":         "Confermiamo brand e direzione della promessa. Il copy finale lo rifiniamo noi.",
  "10-funnel-team-work":     "Ora tocca a noi. Costruiamo pagine, collegamenti e automazioni nel tuo subaccount Systeme.io.",
  "11-calendario-30gg":      "Creiamo il calendario editoriale per i 30 giorni di pre-lancio.",
  "12-prezzo-webinar":       "Definiamo prezzo di lancio + strategia webinar live.",
  "13-lancio":               "Ultima checklist prima del lancio: data, webinar setup, pubblicazione.",
};

/**
 * Banda orizzontale dell'agente attivo per lo step.
 * Avatar + nome + briefing + CTA "Chiedi a {Nome} →" che apre il drawer chat.
 */
export default function AgentVoiceNarrante({ currentStepId, stepLabel, stepNumber, totalSteps, onAsk }) {
  const agent = getAgentForStep(currentStepId);
  const message = DEFAULT_BRIEFING[currentStepId] || `Siamo allo step ${stepNumber || "?"}: ${stepLabel || ""}.`;

  return (
    <div className="bg-white border border-gray-200 rounded-md p-3 flex items-center gap-3 mt-3">
      <img
        src={agent.avatar}
        alt={agent.name}
        className="w-11 h-11 rounded-full flex-shrink-0 bg-slate-900"
      />
      <div className="flex-1 text-sm text-slate-900 leading-relaxed">
        <div className="text-xs text-slate-500 font-medium mb-0.5">
          {agent.name} · {agent.role}
        </div>
        <div>
          <strong className="font-semibold">Step {stepNumber || "?"}/{totalSteps || 13}: {stepLabel || "..."}.</strong>{" "}
          {message}
        </div>
      </div>
      <button
        type="button"
        onClick={onAsk}
        className="text-xs font-semibold text-slate-900 bg-yellow-400 hover:bg-yellow-500 px-3 py-2 rounded transition flex-shrink-0 whitespace-nowrap"
      >
        Chiedi a {agent.name} →
      </button>
    </div>
  );
}
