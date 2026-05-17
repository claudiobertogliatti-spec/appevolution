import React, { useState } from "react";
import StepBase from "./StepBase";

export default function Step06OutlineLezioni({ step, onComplete, onSaveDraft }) {
  const [text, setText] = useState(step?.data?.outline || "");
  return (
    <StepBase
      eyebrow="Step 6 — Outline lezioni"
      title="Crea titoli + descrizioni delle lezioni del corso"
      ctaDisabled={text.trim().length < 100}
      onCta={() => onComplete({ outline: text })}
      secondaryNote="🚧 Il generatore AI arriva nei prossimi giorni (sub-progetto B). Per ora scrivi tu — Stefania ti aiuta cliccando 'Chiedi →'."
    >
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onSaveDraft({ outline: e.target.value });
        }}
        rows={14}
        placeholder={`Modulo 1 — Titolo:\nDescrizione persuasiva (2-3 righe)\n\nLezione 1.1 — Titolo:\nDescrizione (1-2 righe)\n\nLezione 1.2 — Titolo:\nDescrizione...`}
        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 font-mono resize-y"
      />
      <div className="text-xs text-slate-500 mt-2">{text.trim().length} caratteri (min 100)</div>
    </StepBase>
  );
}
