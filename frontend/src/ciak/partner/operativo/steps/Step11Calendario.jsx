import React, { useState } from "react";
import StepBase from "./StepBase";

export default function Step11Calendario({ step, onComplete, onSaveDraft }) {
  const [text, setText] = useState(step?.data?.calendario || "");
  return (
    <StepBase
      eyebrow="Step 11 — Calendario"
      title="Calendario editoriale 30 giorni pre-lancio"
      ctaDisabled={text.trim().length < 100}
      onCta={() => onComplete({ calendario: text })}
      secondaryNote="🚧 Il generatore AI arriva nei prossimi giorni (sub-progetto B). Per ora scrivi tu — Stefania ti aiuta cliccando 'Chiedi →'."
    >
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onSaveDraft({ calendario: e.target.value });
        }}
        rows={14}
        placeholder={`Giorno 1 (lun) — LinkedIn: post problema cliente ideale\nGiorno 2 (mar) — Instagram: reel "errore comune"\nGiorno 3 (mer) — Email: invito webinar\n...\n(continua per 30 giorni)`}
        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 font-mono resize-y"
      />
      <div className="text-xs text-slate-500 mt-2">{text.trim().length} caratteri (min 100)</div>
    </StepBase>
  );
}
