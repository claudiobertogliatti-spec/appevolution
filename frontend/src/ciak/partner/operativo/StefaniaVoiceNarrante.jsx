import React from "react";

const DEFAULT_BRIEFING = {
  "01-contratto":            "Iniziamo. Carica contratto firmato + distinta di pagamento. Te li archiviamo noi.",
  "02-discovery-video":      "Bene. Adesso guardiamo insieme un video di 15 minuti sul percorso.",
  "03-brand-kit":            "Ora servono logo + 1 foto + 3 colori del tuo brand. Per costruire il funnel coerente.",
  "04-posizionamento":       "Risposta a 8 domande su nicchia e promessa. Sono le fondamenta del tuo messaggio.",
  "05-script-masterclass":   "Adesso scriviamo lo script della masterclass. Posso aiutarti — basta chiedere.",
  "06-outline-lezioni":      "Creiamo titoli e descrizioni delle lezioni del corso.",
  "07-registra-masterclass": "Registra la masterclass e caricala qui. Te la sistemiamo noi.",
  "08-registra-lezioni":     "Registra le lezioni una a una e caricale qui.",
  "09-funnel-asset":         "Confermiamo brand + scrivi la promessa hero del funnel.",
  "10-funnel-team-work":     "Ora tocca a noi. Antonella costruisce le pagine Systeme. Ti avvisiamo quando è pronto.",
  "11-calendario-30gg":      "Creiamo il calendario editoriale per i 30 giorni di pre-lancio.",
  "12-prezzo-webinar":       "Definiamo prezzo di lancio + strategia webinar live.",
  "13-lancio":               "Ultima checklist prima del lancio: data, webinar setup, pubblicazione.",
};

/**
 * Banda orizzontale Stefania come voce narrante.
 * In cima all'azione corrente, con avatar + messaggio + CTA "Chiedi" che apre il drawer chat.
 */
export default function StefaniaVoiceNarrante({ currentStepId, stepLabel, stepNumber, totalSteps, onAsk }) {
  const message = DEFAULT_BRIEFING[currentStepId] || `Siamo allo step ${stepNumber || "?"}: ${stepLabel || ""}.`;

  return (
    <div className="bg-white border border-gray-200 rounded-md p-3 flex items-center gap-3 mt-3">
      <div className="w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center font-semibold flex-shrink-0">
        S
      </div>
      <div className="flex-1 text-sm text-slate-900 leading-relaxed">
        <strong className="font-semibold">Step {stepNumber || "?"}/{totalSteps || 13}: {stepLabel || "..."}.</strong>{" "}
        {message}
      </div>
      <button
        type="button"
        onClick={onAsk}
        className="text-xs font-semibold text-slate-900 bg-yellow-400 hover:bg-yellow-500 px-3 py-2 rounded transition flex-shrink-0"
      >
        Chiedi →
      </button>
    </div>
  );
}
