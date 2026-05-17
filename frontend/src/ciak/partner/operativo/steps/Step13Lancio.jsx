import React, { useState } from "react";
import StepBase from "./StepBase";

const CHECKLIST = [
  "Data di lancio fissata (giorno + ora)",
  "Webinar live programmato (Zoom / WebinarJam / altro)",
  "Email di invito al webinar pronta su Systeme",
  "Pagine funnel pubblicate e testate",
  "Stripe checkout testato con pagamento reale (poi rimborsato)",
  "Pixel + analytics installati su tutte le pagine",
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
      eyebrow="Step 13 — Lancio"
      title="Ultima checklist prima del go-live"
      ctaLabel="Lancio! 🚀"
      ctaDisabled={!allDone}
      onCta={() => onComplete({ checklist: checked, launched_at: new Date().toISOString() })}
      secondaryNote="Quando spunti tutto e clicchi 'Lancio!', il tuo journey di setup è chiuso. Da lì in poi ci concentriamo sulle vendite."
    >
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
