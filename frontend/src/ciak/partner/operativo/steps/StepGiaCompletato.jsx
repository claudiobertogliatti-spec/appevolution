import React from "react";
import StepBase from "./StepBase";

/**
 * Passo già "Fatto" ma senza contenuto generato nel passo (documenti consegnati dal team,
 * migrazione): invece di invitare a generare da zero e sostituire ciò che esiste, rimanda
 * all'archivio. Chi vuole davvero rifarlo ha un pulsante discreto.
 */
export function isDoneWithoutContent(step, hasContent) {
  return step?.status === "done" && !hasContent;
}

export default function StepGiaCompletato({ step, title, onRedo }) {
  return (
    <StepBase step={step} title={title} secondaryNote="">
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="font-semibold text-slate-900 mb-1">✓ Passo completato</div>
        <p className="text-sm text-slate-600">
          Il materiale di questo passo è già pronto. Lo trovi nell’archivio: apri il tuo percorso e premi{" "}
          <strong>Consulta materiali</strong> su questo passo.
        </p>
      </div>
      <button type="button" onClick={onRedo} className="mt-4 text-xs text-slate-500 underline hover:text-slate-700">
        Voglio rifarlo da capo
      </button>
    </StepBase>
  );
}
