import React, { useState } from "react";
import StepBase from "./StepBase";

const CHECKLIST = [
  "I miei video (lezione gratuita e corso) sono pronti e approvati",
  "Ho visto le mie pagine di vendita online",
  "Ho fissato il giorno e l'ora della mia diretta di vendita",
  "Sono pronto a pubblicare e a rispondere a chi mi scrive",
];

export default function Step13Lancio({ step, onComplete, onSaveDraft }) {
  const [checked, setChecked] = useState(step?.data?.checklist || {});

  const toggle = (i) => {
    const next = { ...checked, [i]: !checked[i] };
    setChecked(next);
    onSaveDraft({ checklist: next });
  };

  const allDone = CHECKLIST.every((_, i) => checked[i]);

  return (
    <StepBase
      step={step}
      title="Pronti a partire"
      ctaLabel="Si parte! 🚀"
      ctaDisabled={!allDone}
      onCta={() => onComplete({ checklist: checked, launched_at: new Date().toISOString() })}
      secondaryNote="Alla parte tecnica (pagamenti, tracciamenti, invii) pensiamo noi. Quando confermi, il tuo percorso di costruzione è chiuso: da qui in poi ci concentriamo sulle vendite."
    >
      <p className="text-sm text-slate-600 mb-3">Un ultimo sguardo insieme. Spunta quello che è a posto:</p>
      <ul className="space-y-1">
        {CHECKLIST.map((label, i) => (
          <li key={i}>
            <label className="flex items-start gap-3 text-sm text-slate-900 cursor-pointer hover:bg-slate-50 px-2 py-2 rounded">
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={() => toggle(i)}
                className="mt-0.5 w-4 h-4 accent-yellow-400 cursor-pointer"
              />
              <span className={checked[i] ? "line-through text-slate-400" : ""}>{label}</span>
            </label>
          </li>
        ))}
      </ul>
    </StepBase>
  );
}
