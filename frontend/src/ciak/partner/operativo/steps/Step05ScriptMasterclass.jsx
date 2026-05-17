import React, { useState } from "react";
import StepBase from "./StepBase";

export default function Step05ScriptMasterclass({ step, onComplete, onSaveDraft }) {
  const [text, setText] = useState(step?.data?.script || "");
  return (
    <StepBase
      eyebrow="Step 5 — Script masterclass"
      title="Scrivi lo script della masterclass (60 min)"
      ctaDisabled={text.trim().length < 100}
      onCta={() => onComplete({ script: text })}
      secondaryNote="🚧 Il generatore AI arriva nei prossimi giorni (sub-progetto B). Per ora scrivi tu liberamente — Stefania ti aiuta con bullet point e suggerimenti: basta cliccare 'Chiedi →' in cima."
    >
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onSaveDraft({ script: e.target.value });
        }}
        rows={14}
        placeholder="Apri con un gancio forte (1 min). Spiega il problema (5 min). Mostra il metodo (40 min). Chiudi con call to action (5 min)..."
        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 font-mono resize-y"
      />
      <div className="text-xs text-slate-500 mt-2">{text.trim().length} caratteri (min 100)</div>
    </StepBase>
  );
}
