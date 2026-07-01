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
      step={step}
      title="Le pagine che venderanno il tuo corso"
      ctaDisabled={!canComplete}
      onCta={() => onComplete({ promessa_hero: promessa, sub_promessa: subPromessa, conferma_brand_kit: true })}
      secondaryNote="Qui non devi scrivere il copy definitivo. Confermi la direzione commerciale e il marchio: poi il team Evolution trasforma tutto in pagine, testi e funnel nel tuo subaccount Systeme.io."
    >
      <label className="block mb-4">
        <span className="block text-sm font-medium text-slate-900 mb-1.5">Direzione della promessa</span>
        <textarea
          rows={2}
          value={promessa}
          onChange={(e) => {
            setPromessa(e.target.value);
            update("promessa_hero", e.target.value);
          }}
          placeholder="Esempio: Aiuto [target] a ottenere [risultato] senza [ostacolo principale]."
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 resize-y"
        />
      </label>
      <label className="block mb-4">
        <span className="block text-sm font-medium text-slate-900 mb-1.5">Contesto utile al team</span>
        <textarea
          rows={2}
          value={subPromessa}
          onChange={(e) => {
            setSubPromessa(e.target.value);
            update("sub_promessa", e.target.value);
          }}
          placeholder="Scrivi cosa vuoi che il mercato capisca subito. Noi lo trasformiamo in copy di pagina."
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
        <span>Confermo che il marchio caricato prima (logo, foto e colori) è quello da usare per le pagine.</span>
      </label>
    </StepBase>
  );
}
