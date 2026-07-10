import React, { useState } from "react";
import StepBase from "./StepBase";

const BLOCKS = [
  {
    title: "Subaccount Systeme",
    body: "Evolution abilita il subaccount partner collegato all'ecosistema Evolution PRO.",
  },
  {
    title: "Dominio",
    body: "Scegliamo dominio, sottodominio o nuovo dominio. Poi configuriamo DNS, SSL e verifica.",
  },
  {
    title: "Legal pages",
    body: "Prepariamo Privacy, Cookie, Termini, disclaimer se serve, contatti e consensi dei form.",
  },
  {
    title: "Funnel e checkout",
    body: "Adattiamo il template Evolution: opt-in, pagina masterclass, vendita, checkout, thank you, email, tag e tracking.",
  },
];

export default function Step10SistemaVendita({ step, onComplete, onSaveDraft }) {
  const [approved, setApproved] = useState(step?.data?.sistema_vendita_approved ?? false);
  const [note, setNote] = useState(step?.data?.note_sistema_vendita || "");

  const save = (next) => {
    if (next.approved !== undefined) setApproved(next.approved);
    if (next.note !== undefined) setNote(next.note);
    onSaveDraft?.({
      sistema_vendita_approved: next.approved ?? approved,
      note_sistema_vendita: next.note ?? note,
    });
  };

  return (
    <StepBase
      step={step}
      title="Subaccount, dominio, legal e funnel"
      ctaDisabled={!approved}
      onCta={() => onComplete?.({ sistema_vendita_approved: true, note_sistema_vendita: note })}
      secondaryNote="Qui non devi costruire la parte tecnica. Gaia e il team Evolution preparano il sistema nel subaccount Systeme collegato a Evolution PRO; tu controlli direzione, dati e approvazione finale."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {BLOCKS.map((block, index) => (
          <div key={block.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-yellow-400 flex items-center justify-center font-bold text-sm mb-3">
              {index + 1}
            </div>
            <h3 className="text-sm font-semibold text-slate-900">{block.title}</h3>
            <p className="text-[12.5px] text-slate-600 leading-relaxed mt-1">{block.body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 mb-5">
        <p className="text-sm font-semibold text-slate-900">CTA servizi extra, senza pressione</p>
        <p className="text-[13px] text-slate-700 leading-relaxed mt-1">
          Se vuoi fare da solo, ti guidiamo. Se ti blocchi su dominio, pagine, copy, setup tecnico
          o vuoi una versione piu' avanzata, il team Evolution puo' occuparsene come servizio extra.
        </p>
      </div>

      <label className="block mb-4">
        <span className="block text-sm font-medium text-slate-900 mb-1.5">Note per il team</span>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => save({ note: e.target.value })}
          placeholder="Dominio preferito, dati legali, dubbi sul checkout o richieste specifiche."
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 resize-y"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-slate-900 cursor-pointer">
        <input
          type="checkbox"
          checked={approved}
          onChange={(e) => save({ approved: e.target.checked })}
          className="mt-1"
        />
        <span>Ho letto i blocchi del sistema di vendita e confermo che il team puo' procedere.</span>
      </label>
    </StepBase>
  );
}
