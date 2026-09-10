/**
 * Ciak Admin — Trattative (audit #7).
 *
 * Blueprint / Call / In trattativa / OK erano quattro voci separate sullo stesso
 * endpoint /pipeline-blueprint (stesso componente PipelineList con lockedStages
 * diversi). Qui diventano TAB di un'unica pagina, con lo stadio persistito in URL
 * (?stadio=), conteggi e scheda contatto comune (PipelineList apre /admin/leads/:email).
 *
 * Riusa PipelineList senza modificarlo. Unico <h1> = quello di PipelineList.
 * I vecchi URL (/admin/pipeline-blueprint, /admin/vendite-call, /admin/vendite-trattativa,
 * /admin/vendite-ok) restano registrati e validi.
 */
import { useSearchParams } from "react-router-dom";
import { PipelineList } from "./PipelineList";

// Mappa tab → stadi del funnel post-€27 (id colonne backend _BLUEPRINT_COLUMNS).
export const STADI_TRATTATIVE = [
  { id: "tutte", label: "Tutte", subtitle: "Tutte le trattative post-€27, dal Blueprint alla firma" },
  { id: "blueprint", label: "Blueprint", lockedStages: ["acquistato"], subtitle: "Ha pagato i €27 — analisi acquistata" },
  { id: "call", label: "Call", lockedStages: ["call_prenotata", "call_fatta"], subtitle: "Call prenotata e call fatta" },
  { id: "trattativa", label: "In trattativa", lockedStages: ["in_trattativa"], subtitle: "Proposte inviate, viste, accettate o firmate in attesa di pagamento" },
  { id: "ok", label: "OK", lockedStages: ["contratto_pagato"], subtitle: "Contratto firmato + pagato — diventa partner" },
];

export function TrattativePipeline({ onAuthExpired }) {
  const [params, setParams] = useSearchParams();
  const active = STADI_TRATTATIVE.find((s) => s.id === params.get("stadio")) || STADI_TRATTATIVE[0];
  return (
    <div>
      <div className="px-8 pt-8">
        <div role="tablist" aria-label="Stadio trattativa" className="flex flex-wrap gap-2">
          {STADI_TRATTATIVE.map((s) => {
            const on = s.id === active.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setParams(s.id === "tutte" ? {} : { stadio: s.id }, { replace: true })}
                className={`text-sm font-semibold px-3 py-1.5 rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400 ${
                  on ? "bg-slate-900 text-yellow-400 border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
      <PipelineList
        key={active.id}
        endpoint="/pipeline-blueprint"
        title="Trattative"
        subtitle={active.subtitle}
        lockedStages={active.lockedStages}
        onAuthExpired={onAuthExpired}
      />
    </div>
  );
}

export default TrattativePipeline;
