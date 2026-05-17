import React, { useState } from "react";
import StepBase from "./StepBase";

export default function Step09FunnelAsset({ step, onComplete, onSaveDraft }) {
  const [promessa, setPromessa] = useState(step?.data?.promessa_hero || "");
  const [subPromessa, setSubPromessa] = useState(step?.data?.sub_promessa || "");
  const [conferma, setConferma] = useState(step?.data?.conferma_brand_kit ?? false);

  const update = (k, v) => {
    onSaveDraft({ [k]: v });
  };

  const canComplete = promessa.trim().length > 10 && subPromessa.trim().length > 10 && conferma;

  return (
    <StepBase
      eyebrow="Step 9 — Funnel asset"
      title="Conferma brand + scrivi la promessa hero"
      ctaDisabled={!canComplete}
      onCta={() => onComplete({ promessa_hero: promessa, sub_promessa: subPromessa, conferma_brand_kit: true })}
      secondaryNote="Con questi dati Antonella costruisce le pagine del funnel su Systeme nei prossimi giorni lavorativi."
    >
      <label className="block mb-4">
        <span className="block text-sm font-medium text-slate-900 mb-1.5">Promessa hero (1 frase forte)</span>
        <textarea
          rows={2}
          value={promessa}
          onChange={(e) => {
            setPromessa(e.target.value);
            update("promessa_hero", e.target.value);
          }}
          placeholder="Esempio: Trasforma la tua professione in un modello digitale in 90 giorni — senza imparare a fare marketing."
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 resize-y"
        />
      </label>
      <label className="block mb-4">
        <span className="block text-sm font-medium text-slate-900 mb-1.5">Sub-promessa (1-2 righe a supporto)</span>
        <textarea
          rows={2}
          value={subPromessa}
          onChange={(e) => {
            setSubPromessa(e.target.value);
            update("sub_promessa", e.target.value);
          }}
          placeholder="Esempio: Sistema chiavi in mano — masterclass, corso, funnel di vendita, calendario lancio. Il tutto pronto in 3 mesi."
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 resize-y"
        />
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-900 cursor-pointer">
        <input
          type="checkbox"
          checked={conferma}
          onChange={(e) => {
            setConferma(e.target.checked);
            update("conferma_brand_kit", e.target.checked);
          }}
          className="mt-1"
        />
        <span>Confermo che il brand kit caricato allo step 3 (logo + foto + colori) è quello da usare per il funnel.</span>
      </label>
    </StepBase>
  );
}
